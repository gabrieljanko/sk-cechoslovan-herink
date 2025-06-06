import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  Player,
  players,
  games,
  gameResults,
  insertPlayerSchema, 
  updatePlayerSchema, 
  insertGameSchema, 
  updateGameSchema,
  insertRegistrationSchema
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // API prefix
  const apiRouter = app.route("/api");

  // Player routes
  app.get("/api/players", async (req, res) => {
    const players = await storage.getPlayers();
    res.json(players);
  });
  
  // Get all players with their updated statistics
  app.get("/api/players/stats", async (req, res) => {
    try {
      const playersWithStats = await storage.getAllPlayerStats();
      res.json(playersWithStats);
    } catch (error) {
      console.error("Error fetching player statistics:", error);
      res.status(500).json({ message: "Failed to fetch player statistics" });
    }
  });

  app.get("/api/players/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid player ID" });
    }

    const player = await storage.getPlayer(id);
    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(player);
  });

  app.post("/api/players", async (req, res) => {
    try {
      const playerData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(playerData);
      res.status(201).json(player);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid player data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.patch("/api/players/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid player ID" });
    }

    try {
      const playerData = updatePlayerSchema.parse(req.body);
      const player = await storage.updatePlayer(id, playerData);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid player data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update player" });
    }
  });
  
  // Delete a player
  app.delete("/api/players/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid player ID" });
    }
    
    try {
      const confirmationCode = req.query.confirmationCode;
      if (confirmationCode !== "SKCechoslovan") {
        return res.status(400).json({ 
          message: "Invalid confirmation code. Player deletion requires the exact confirmation code."
        });
      }
      
      const success = await storage.deletePlayer(id);
      if (!success) {
        return res.status(404).json({ message: "Player not found or could not be deleted" });
      }
      
      res.status(200).json({ message: "Player deleted successfully" });
    } catch (error) {
      console.error("Error deleting player:", error);
      res.status(500).json({ message: "Failed to delete player" });
    }
  });

  // Game routes
  app.get("/api/games", async (req, res) => {
    const games = await storage.getGames();
    res.json(games);
  });
  
  app.get("/api/games/active", async (req, res) => {
    const games = await storage.getActiveGames();
    res.json(games);
  });
  
  app.get("/api/games/archived", async (req, res) => {
    const games = await storage.getArchivedGames();
    res.json(games);
  });

  app.get("/api/games/upcoming", async (req, res) => {
    const game = await storage.getUpcomingGame();
    if (!game) {
      return res.status(404).json({ message: "No upcoming games found" });
    }
    res.json(game);
  });

  app.get("/api/games/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const game = await storage.getGame(id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    res.json(game);
  });

  app.post("/api/games", async (req, res) => {
    try {
      // Ensure date is a Date object
      if (req.body.date && typeof req.body.date === 'string') {
        req.body.date = new Date(req.body.date);
      }

      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid game data", errors: error.errors });
      }
      console.error("Game creation error:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.patch("/api/games/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    try {
      // Ensure date is a Date object if provided
      if (req.body.date && typeof req.body.date === 'string') {
        req.body.date = new Date(req.body.date);
      }

      const gameData = updateGameSchema.parse(req.body);
      const game = await storage.updateGame(id, gameData);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // If the game is being marked as played, record game results
      if (gameData.wasPlayed === true && 
          gameData.whiteTeamScore !== null && 
          gameData.blackTeamScore !== null) {
        await storage.recordGameResults(id);
      }
      
      res.json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid game data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update game" });
    }
  });
  
  app.delete("/api/games/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }
    
    try {
      // Get the game details before deleting to check if it was played
      const game = await storage.getGame(id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Delete the game and its associated data
      const success = await storage.deleteGame(id);
      if (!success) {
        return res.status(404).json({ message: "Game could not be deleted" });
      }
      
      // For played games, make sure player statistics are properly updated
      if (game.wasPlayed) {
        console.log(`Game ${id} was played - triggering stats recalculation`);
        try {
          // Recalculate player statistics by calling the recalculate endpoint
          // This will ensure all player statistics are up-to-date after game deletion
          const { gameResults: gameResultsTable } = await import("@shared/schema");
          
          // First delete all existing game results
          await db.delete(gameResultsTable).execute();
          console.log("All game results deleted for recalculation");
          
          // Get all remaining games that have been played
          const remainingPlayedGames = await db
            .select()
            .from(games)
            .where(eq(games.wasPlayed, true));
          
          console.log(`Found ${remainingPlayedGames.length} remaining games to reprocess for statistics`);
          
          // Process each remaining game to record its results
          let processedGames = 0;
          for (const remainingGame of remainingPlayedGames) {
            if (remainingGame.whiteTeamScore !== null && remainingGame.blackTeamScore !== null) {
              console.log(`Re-recording results for game ${remainingGame.id}`);
              await storage.recordGameResults(remainingGame.id);
              processedGames++;
            }
          }
          
          console.log(`Stats recalculation complete: processed ${processedGames} games`);
        } catch (error) {
          console.error("Error recalculating player statistics after game deletion:", error);
          // Continue with the response even if recalculation had issues
        }
      }
      
      res.status(200).json({ message: "Game deleted successfully" });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(500).json({ message: "Failed to delete game" });
    }
  });

  // Registration routes
  app.get("/api/games/:id/players", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const players = await storage.getRegisteredPlayers(id);
    res.json(players);
  });
  
  // Get registrations including timestamp and status for a game
  app.get("/api/games/:id/registrations", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }
    
    const registrations = await storage.getRegistrations(id);
    
    // Get player details for each registration
    const players = await storage.getPlayers();
    const playerMap = new Map(players.map(p => [p.id, p]));
    
    // Join registration data with player data
    const registrationsWithPlayerInfo = registrations.map(reg => ({
      ...reg,
      player: playerMap.get(reg.playerId)
    }));
    
    res.json(registrationsWithPlayerInfo);
  });

  app.post("/api/registrations", async (req, res) => {
    try {
      // Extend the schema to include status
      const registrationSchema = insertRegistrationSchema.extend({
        status: z.enum(["going", "not_going"]).optional()
      });
      
      const regData = registrationSchema.parse(req.body);
      const registration = await storage.registerPlayer(regData);
      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register player" });
    }
  });

  app.delete("/api/games/:gameId/players/:playerId", async (req, res) => {
    const gameId = parseInt(req.params.gameId);
    const playerId = parseInt(req.params.playerId);
    
    if (isNaN(gameId) || isNaN(playerId)) {
      return res.status(400).json({ message: "Invalid game or player ID" });
    }

    const success = await storage.unregisterPlayer(gameId, playerId);
    if (!success) {
      return res.status(404).json({ message: "Game or player not found" });
    }

    res.status(204).send();
  });

  // Team generation
  app.post("/api/games/:id/generate-teams", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const game = await storage.getGame(id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    try {
      // Generate teams
      const teams = await storage.generateTeams(id);
      
      // Extract player IDs for storing in the database
      const whiteTeamIds = teams.whiteTeam.map(p => p.id);
      const blackTeamIds = teams.blackTeam.map(p => p.id);
      const benchPlayerIds = teams.benchPlayers ? teams.benchPlayers.map(p => p.id) : [];
      
      // Automatically save generated teams to the database
      console.log(`Storing teams for game ${id}:`, {
        whiteTeam: whiteTeamIds,
        blackTeam: blackTeamIds,
        benchPlayers: benchPlayerIds
      });
      
      await storage.updateGame(id, {
        whiteTeam: whiteTeamIds,
        blackTeam: blackTeamIds,
        benchPlayers: benchPlayerIds
      } as any);
      
      res.json(teams);
    } catch (error) {
      console.error(`Error generating teams for game ${id}:`, error);
      res.status(500).json({ message: "Failed to generate teams" });
    }
  });
  
  // New endpoint to recalculate player statistics
  app.post("/api/stats/recalculate", async (req, res) => {
    try {
      console.log("Starting recalculation of player statistics");
      
      // First, delete all existing game results
      try {
        await db.delete(gameResults);
        console.log("All game results deleted");
      } catch (error) {
        console.error("Error deleting game results:", error);
        return res.status(500).json({ message: "Failed to delete existing game results" });
      }
      
      // Get all games that have been played
      const playedGames = await db
        .select()
        .from(games)
        .where(eq(games.wasPlayed, true));
      
      console.log(`Found ${playedGames.length} games to process for statistics`);
      
      // Process each game to record its results
      let processedGames = 0;
      for (const game of playedGames) {
        if (game.whiteTeamScore !== null && game.blackTeamScore !== null) {
          console.log(`Recording results for game ${game.id}`);
          await storage.recordGameResults(game.id);
          processedGames++;
        }
      }
      
      // Get all players with their updated stats
      const updatedPlayers = await storage.getAllPlayerStats();
      
      res.json({ 
        message: "Player statistics recalculated successfully", 
        gamesProcessed: processedGames,
        players: updatedPlayers.length
      });
    } catch (error) {
      console.error("Error recalculating player statistics:", error);
      res.status(500).json({ message: "Failed to recalculate player statistics" });
    }
  });
  
  // Get the current teams for a game
  app.get("/api/games/:id/teams", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid game ID" });
    }

    const game = await storage.getGame(id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    try {
      // Get all players
      const allPlayers = await storage.getPlayers();
      
      // For debugging
      console.log(`Getting teams for game ${id}:`, {
        whiteTeam: game.whiteTeam,
        blackTeam: game.blackTeam,
        benchPlayers: game.benchPlayers,
        isArchived: game.isArchived,
        wasPlayed: game.wasPlayed
      });
      
      // Enhanced function to handle team data in various formats and ensure we always get valid number arrays
      const processTeamIds = (teamData: any): number[] => {
        console.log("Processing team data:", teamData, "type:", typeof teamData);
        
        if (!teamData) return [];
        
        // Handle array case directly
        if (Array.isArray(teamData)) {
          console.log("Processing as array");
          return teamData.map(item => typeof item === 'number' ? item : parseInt(String(item)))
            .filter(id => !isNaN(id));
        }
        
        // Handle JSON string
        if (typeof teamData === 'string') {
          console.log("Processing as string");
          try {
            const parsed = JSON.parse(teamData);
            if (Array.isArray(parsed)) {
              return parsed.map(item => typeof item === 'number' ? item : parseInt(String(item)))
                .filter(id => !isNaN(id));
            }
            return [];
          } catch (e) {
            console.log("JSON parse error:", e);
            // If it's not valid JSON but contains commas, try parsing as CSV
            if (teamData.includes(',')) {
              return teamData.split(',')
                .map(id => parseInt(id.trim()))
                .filter(id => !isNaN(id));
            }
            // If it's a single number as string
            const singleId = parseInt(teamData.trim());
            return !isNaN(singleId) ? [singleId] : [];
          }
        }
        
        // Handle object case (PostgreSQL JSONB)
        if (typeof teamData === 'object') {
          console.log("Processing as object");
          try {
            // Try converting to an array if it has numeric keys
            const values = Object.values(teamData);
            if (values.length > 0) {
              return values.map(item => typeof item === 'number' ? item : parseInt(String(item)))
                .filter(id => !isNaN(id));
            }
          } catch (e) {
            console.log("Object processing error:", e);
          }
        }
        
        console.log("Could not process team data, returning empty array");
        return [];
      };
      
      const whiteTeamIds = processTeamIds(game.whiteTeam);
      const blackTeamIds = processTeamIds(game.blackTeam);
      const benchPlayerIds = processTeamIds(game.benchPlayers);
      
      console.log(`Processed team IDs for game ${id}:`, {
        whiteTeamIds,
        blackTeamIds,
        benchPlayerIds
      });
      
      // Map the team player IDs to actual player objects
      const whiteTeam = whiteTeamIds
        .map(id => allPlayers.find(p => p.id === id))
        .filter(player => player !== undefined) as Player[];
        
      const blackTeam = blackTeamIds
        .map(id => allPlayers.find(p => p.id === id))
        .filter(player => player !== undefined) as Player[];
      
      // Include bench players if available  
      const benchPlayers = benchPlayerIds
        .map(id => allPlayers.find(p => p.id === id))
        .filter(player => player !== undefined) as Player[];
      
      console.log(`Mapped to player objects:`, {
        whiteTeamCount: whiteTeam.length,
        blackTeamCount: blackTeam.length,
        benchPlayersCount: benchPlayers.length
      });
      
      // If we don't have team data for a game that was played and is archived,
      // try to recreate it from game results
      if ((whiteTeam.length === 0 || blackTeam.length === 0) && game.isArchived && game.wasPlayed) {
        console.log(`Attempting to reconstruct teams for archived game ${id}`);
        
        // Get all players who participated in this game
        try {
          // Import gameResults table from schema
          const { gameResults: gameResultsTable } = await import("@shared/schema");
          
          // Get game results for this game
          const results = await db
            .select()
            .from(gameResultsTable)
            .where(eq(gameResultsTable.gameId, id));
            
          console.log(`Found ${results.length} game result records for game ${id}`);
          
          // Separate players by teams based on win/loss
          if (results.length > 0 && game.whiteTeamScore !== null && game.blackTeamScore !== null) {
            const whiteWon = game.whiteTeamScore > game.blackTeamScore;
            const whitePlayers: Player[] = [];
            const blackPlayers: Player[] = [];
            
            for (const result of results) {
              const player = allPlayers.find(p => p.id === result.playerId);
              if (player) {
                // If this player was on the winning team
                if ((result.won && whiteWon) || (!result.won && !whiteWon)) {
                  whitePlayers.push(player);
                } else {
                  blackPlayers.push(player);
                }
              }
            }
            
            // Update the team data with the reconstructed teams
            if (whitePlayers.length > 0) {
              console.log(`Reconstructed white team with ${whitePlayers.length} players`);
              whiteTeam.push(...whitePlayers);
            }
            
            if (blackPlayers.length > 0) {
              console.log(`Reconstructed black team with ${blackPlayers.length} players`);
              blackTeam.push(...blackPlayers);
            }
          }
        } catch (error) {
          console.error(`Error reconstructing teams from game results for game ${id}:`, error);
        }
      }
      
      res.json({ whiteTeam, blackTeam, benchPlayers });
    } catch (error) {
      console.error(`Error retrieving teams for game ${id}:`, error);
      res.status(500).json({ message: "Failed to retrieve teams" });
    }
  });

  // Penalty routes
  app.post("/api/penalties", async (req, res) => {
    try {
      const penaltyData = req.body;
      const penalty = await storage.createPenalty(penaltyData);
      res.json(penalty);
    } catch (error) {
      console.error("Error creating penalty:", error);
      res.status(500).json({ message: "Failed to create penalty" });
    }
  });

  app.get("/api/penalties", async (req, res) => {
    try {
      const playerId = req.query.playerId ? parseInt(req.query.playerId as string) : undefined;
      const gameId = req.query.gameId ? parseInt(req.query.gameId as string) : undefined;
      
      const penalties = await storage.getPenalties(playerId, gameId);
      res.json(penalties);
    } catch (error) {
      console.error("Error fetching penalties:", error);
      res.status(500).json({ message: "Failed to fetch penalties" });
    }
  });

  app.patch("/api/penalties/:id/paid", async (req, res) => {
    try {
      const penaltyId = parseInt(req.params.id);
      if (isNaN(penaltyId)) {
        return res.status(400).json({ message: "Invalid penalty ID" });
      }

      const success = await storage.markPenaltyPaid(penaltyId);
      if (success) {
        res.json({ message: "Penalty marked as paid" });
      } else {
        res.status(500).json({ message: "Failed to mark penalty as paid" });
      }
    } catch (error) {
      console.error("Error marking penalty as paid:", error);
      res.status(500).json({ message: "Failed to mark penalty as paid" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
