import { db } from "./db";
import {
  players, 
  games, 
  registrations,
  gameResults,
  penalties,
  type Player, 
  type InsertPlayer, 
  type UpdatePlayer,
  type Game,
  type InsertGame,
  type UpdateGame,
  type Registration,
  type InsertRegistration,
  type GameResult,
  type InsertGameResult,
  type Penalty,
  type InsertPenalty
} from "@shared/schema";
import { eq, and, or, desc, gte, isNull, inArray, sql, count } from "drizzle-orm";

export interface IStorage {
  // Player methods
  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: UpdatePlayer): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<boolean>;
  
  // Game methods
  getGames(): Promise<Game[]>;
  getActiveGames(): Promise<Game[]>;
  getArchivedGames(): Promise<Game[]>;
  getGame(id: number): Promise<Game | undefined>;
  getUpcomingGame(): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: number, game: UpdateGame): Promise<Game | undefined>;
  deleteGame(id: number): Promise<boolean>;
  
  // Registration methods
  getRegistrations(gameId: number): Promise<Registration[]>;
  getRegisteredPlayers(gameId: number): Promise<Player[]>;
  registerPlayer(registration: InsertRegistration): Promise<Registration>;
  unregisterPlayer(gameId: number, playerId: number): Promise<boolean>;
  
  // Team generation and stats
  generateTeams(gameId: number): Promise<{ whiteTeam: Player[], blackTeam: Player[], benchPlayers: Player[] }>;
  
  // Game results and statistics
  recordGameResults(gameId: number): Promise<void>;
  getPlayerStats(playerId: number): Promise<{gamesPlayed: number, wins: number, plusMinus: number}>;
  getAllPlayerStats(): Promise<Player[]>;
  deleteGameResults(gameId: number): Promise<boolean>;
  
  // Penalty methods
  createPenalty(penalty: InsertPenalty): Promise<Penalty>;
  getPenalties(playerId?: number, gameId?: number): Promise<Penalty[]>;
  markPenaltyPaid(penaltyId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Player methods
  async getPlayers(): Promise<Player[]> {
    return await db.select().from(players).orderBy(players.name);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.id, id));
    return result[0];
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }

  async updatePlayer(id: number, playerData: UpdatePlayer): Promise<Player | undefined> {
    const [updatedPlayer] = await db
      .update(players)
      .set(playerData)
      .where(eq(players.id, id))
      .returning();
    
    return updatedPlayer;
  }
  
  async deletePlayer(id: number): Promise<boolean> {
    try {
      // First, delete all registrations for this player
      await db
        .delete(registrations)
        .where(eq(registrations.playerId, id));
      
      // Then delete the player
      const result = await db
        .delete(players)
        .where(eq(players.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting player:", error);
      return false;
    }
  }

  // Game methods
  async getGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(desc(games.date));
  }
  
  async getActiveGames(): Promise<Game[]> {
    // Return all non-archived games, regardless of date
    return await db
      .select()
      .from(games)
      .where(eq(games.isArchived, false))
      .orderBy(desc(games.date));
  }
  
  async getArchivedGames(): Promise<Game[]> {
    return await db
      .select()
      .from(games)
      .where(eq(games.isArchived, true))
      .orderBy(desc(games.date));
  }

  async getGame(id: number): Promise<Game | undefined> {
    const result = await db.select().from(games).where(eq(games.id, id));
    return result[0];
  }

  async getUpcomingGame(): Promise<Game | undefined> {
    const now = new Date();
    console.log("Looking for upcoming games after:", now.toISOString());
    
    try {
      // Query the database for upcoming games
      const upcomingGames = await db
        .select()
        .from(games)
        .where(and(
          eq(games.isArchived, false),
          gte(games.date, now)
        ))
        .orderBy(games.date)
        .limit(5);
      
      console.log("Found upcoming games:", upcomingGames.length, upcomingGames.map(g => g.date));
      
      if (upcomingGames.length > 0) {
        return upcomingGames[0];
      }
      
      // If no future games found, get the latest created game regardless of date
      const [latestGame] = await db
        .select()
        .from(games)
        .where(eq(games.isArchived, false))
        .orderBy(desc(games.id))
        .limit(1);
      
      console.log("Latest game found:", latestGame?.id);
      return latestGame;
    } catch (error) {
      console.error("Error getting upcoming game:", error);
      return undefined;
    }
  }

  async createGame(game: InsertGame): Promise<Game> {
    console.log("Creating new game:", game);
    
    // Create properly typed object for insertion
    const preparedGame = {
      date: game.date,
      whiteTeamScore: game.whiteTeamScore,
      blackTeamScore: game.blackTeamScore,
      wasPlayed: game.wasPlayed ?? false,
      isArchived: game.isArchived ?? false,
      whiteTeam: Array.isArray(game.whiteTeam) ? game.whiteTeam as number[] : [],
      blackTeam: Array.isArray(game.blackTeam) ? game.blackTeam as number[] : [],
      benchPlayers: Array.isArray(game.benchPlayers) ? game.benchPlayers as number[] : [],
      registeredPlayers: Array.isArray(game.registeredPlayers) ? game.registeredPlayers as number[] : []
    };
    
    try {
      const [newGame] = await db.insert(games).values([preparedGame]).returning();
      console.log("Successfully created game:", newGame.id);
      return newGame;
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  }

  async updateGame(id: number, gameData: UpdateGame): Promise<Game | undefined> {
    // Check if the game exists first
    const existingGame = await this.getGame(id);
    if (!existingGame) {
      console.log(`Game ${id} not found for update`);
      return undefined;
    }
    
    console.log(`Updating game ${id} with data:`, gameData);
    
    // Create a properly typed update object
    const updateObj: Partial<{
      date: Date;
      whiteTeamScore: number | null;
      blackTeamScore: number | null;
      wasPlayed: boolean;
      isArchived: boolean;
      whiteTeam: number[];
      blackTeam: number[];
      benchPlayers: number[];
      registeredPlayers: number[];
    }> = {};
    
    // Only add properties that exist in gameData
    if ('date' in gameData && gameData.date !== undefined) updateObj.date = gameData.date;
    if ('whiteTeamScore' in gameData && gameData.whiteTeamScore !== undefined) updateObj.whiteTeamScore = gameData.whiteTeamScore;
    if ('blackTeamScore' in gameData && gameData.blackTeamScore !== undefined) updateObj.blackTeamScore = gameData.blackTeamScore;
    if ('wasPlayed' in gameData && gameData.wasPlayed !== undefined) updateObj.wasPlayed = gameData.wasPlayed;
    if ('isArchived' in gameData && gameData.isArchived !== undefined) updateObj.isArchived = gameData.isArchived;
    
    // Handle arrays properly
    if ('whiteTeam' in gameData && gameData.whiteTeam !== undefined) {
      updateObj.whiteTeam = Array.isArray(gameData.whiteTeam) 
        ? gameData.whiteTeam as number[]
        : [];
    }
    
    if ('blackTeam' in gameData && gameData.blackTeam !== undefined) {
      updateObj.blackTeam = Array.isArray(gameData.blackTeam) 
        ? gameData.blackTeam as number[]
        : [];
    }
    
    if ('benchPlayers' in gameData && gameData.benchPlayers !== undefined) {
      updateObj.benchPlayers = Array.isArray(gameData.benchPlayers) 
        ? gameData.benchPlayers as number[]
        : [];
    }
    
    // Determine if this update is marking the game as complete
    const isCompletingGame = 
      'wasPlayed' in gameData && gameData.wasPlayed === true && 
      'whiteTeamScore' in gameData && gameData.whiteTeamScore !== undefined && 
      'blackTeamScore' in gameData && gameData.blackTeamScore !== undefined &&
      (existingGame.wasPlayed === false || 
       existingGame.whiteTeamScore !== gameData.whiteTeamScore || 
       existingGame.blackTeamScore !== gameData.blackTeamScore);
    
    console.log(`Is this update completing game ${id}? ${isCompletingGame}`);
    
    // Update the game in the database
    const [updatedGame] = await db
      .update(games)
      .set(updateObj)
      .where(eq(games.id, id))
      .returning();
    
    // If game is being marked as complete, record game results
    if (isCompletingGame) {
      console.log(`Game ${id} completed - recording game results`);
      try {
        await this.recordGameResults(id);
      } catch (error) {
        console.error(`Error recording game results for game ${id}:`, error);
      }
    }
    
    return updatedGame;
  }
  
  async deleteGame(id: number): Promise<boolean> {
    try {
      // First, delete all registrations for this game
      await db
        .delete(registrations)
        .where(eq(registrations.gameId, id));
      
      // Delete any game results to ensure player stats are updated
      await this.deleteGameResults(id);
      
      // Then delete the game itself
      const result = await db
        .delete(games)
        .where(eq(games.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting game:", error);
      return false;
    }
  }

  // Registration methods
  async getRegistrations(gameId: number): Promise<Registration[]> {
    return await db
      .select()
      .from(registrations)
      .where(eq(registrations.gameId, gameId))
      .orderBy(desc(registrations.registeredAt));
  }

  async getRegisteredPlayers(gameId: number): Promise<Player[]> {
    const result = await db
      .select({
        player: players
      })
      .from(registrations)
      .innerJoin(players, eq(registrations.playerId, players.id))
      .where(and(
        eq(registrations.gameId, gameId),
        eq(registrations.status, "going")
      ));
    
    return result.map(r => r.player);
  }

  async registerPlayer(registration: InsertRegistration): Promise<Registration> {
    // Check if the player is already registered for this game
    const existingReg = await db
      .select()
      .from(registrations)
      .where(and(
        eq(registrations.gameId, registration.gameId),
        eq(registrations.playerId, registration.playerId)
      ));
    
    // If already registered, delete the old registration
    if (existingReg.length > 0) {
      await db
        .delete(registrations)
        .where(eq(registrations.id, existingReg[0].id));
    }
    
    // Insert new registration
    const [newRegistration] = await db
      .insert(registrations)
      .values(registration)
      .returning();
    
    return newRegistration;
  }

  async unregisterPlayer(gameId: number, playerId: number): Promise<boolean> {
    const result = await db
      .delete(registrations)
      .where(and(
        eq(registrations.gameId, gameId),
        eq(registrations.playerId, playerId)
      ))
      .returning({ id: registrations.id });
    
    return result.length > 0;
  }

  // Team generation and stats
  async generateTeams(gameId: number): Promise<{ whiteTeam: Player[], blackTeam: Player[], benchPlayers: Player[] }> {
    // Get all going registrations
    const gameRegistrations = await db
      .select()
      .from(registrations)
      .where(and(
        eq(registrations.gameId, gameId),
        eq(registrations.status, "going")
      ));
      
    // Get player ids from registrations
    const playerIds = gameRegistrations.map(reg => reg.playerId);
    
    // Check if we have at least 8 players registered (minimum required)
    if (playerIds.length < 8) {
      throw new Error("At least 8 players need to be registered to generate teams");
    }
    
    // Get the actual player objects
    const registeredPlayers = await this.getPlayers();
    const goingPlayers = registeredPlayers.filter(player => 
      playerIds.includes(player.id)
    );
    
    // Sort players by overall rating (highest to lowest)
    const sortedPlayers = [...goingPlayers].sort((a, b) => 
      b.overallSkill - a.overallSkill
    );
    
    // New algorithm for determining team sizes based on user requirements
    // - For even numbers, divide players evenly between teams
    // - For odd numbers, the difference should not be more than 1 player
    // - Always aim to balance team strength
    
    // Determine how many players should be active vs bench
    const totalPlayers = sortedPlayers.length;
    let playersPerTeam1: number; // Number of players on team 1
    let playersPerTeam2: number; // Number of players on team 2
    let benchCount: number = 0;  // Number of players on bench
    
    // Determine ideal team sizes based on total players available
    if (totalPlayers <= 10) {
      // With 10 or fewer players, everyone plays with balanced teams
      // For even numbers: equal split; for odd numbers: difference of 1
      playersPerTeam1 = Math.ceil(totalPlayers / 2);
      playersPerTeam2 = totalPlayers - playersPerTeam1;
      benchCount = 0;
    } else if (totalPlayers <= 12) {
      // With 11-12 players, aim for 5v5 or 6v6 with no bench
      playersPerTeam1 = Math.ceil(totalPlayers / 2);
      playersPerTeam2 = totalPlayers - playersPerTeam1;
      benchCount = 0;
    } else if (totalPlayers <= 14) {
      // 13-14 players: prefer 6v6 or 7v7 with small bench if needed
      const preferredTeamSize = 6; // Prefer 6v6
      // If 13 players, do 6v6 with 1 bench; if 14 players, do 7v7 with no bench
      if (totalPlayers === 14) {
        playersPerTeam1 = 7;
        playersPerTeam2 = 7;
        benchCount = 0;
      } else {
        playersPerTeam1 = preferredTeamSize;
        playersPerTeam2 = preferredTeamSize;
        benchCount = totalPlayers - (playersPerTeam1 + playersPerTeam2);
      }
    } else if (totalPlayers <= 17) {
      // 15-17 players: evenly distribute without bench
      // Use Math.floor and Math.ceil to ensure difference is at most 1
      if (totalPlayers % 2 === 0) {
        // Even number: equal split
        playersPerTeam1 = totalPlayers / 2;
        playersPerTeam2 = totalPlayers / 2;
      } else {
        // Odd number: difference of 1
        playersPerTeam1 = Math.floor(totalPlayers / 2);
        playersPerTeam2 = Math.ceil(totalPlayers / 2);
      }
      benchCount = 0;
    } else {
      // With 18+ players, evenly distribute between teams up to max of 9 per team
      // and put the rest on bench
      const maxTeamSize = 9; // Maximum reasonable team size
      if (totalPlayers <= maxTeamSize * 2) {
        // Can still fit all players with equal teams
        playersPerTeam1 = Math.floor(totalPlayers / 2);
        playersPerTeam2 = Math.ceil(totalPlayers / 2);
        benchCount = 0;
      } else {
        // Need bench players
        playersPerTeam1 = maxTeamSize;
        playersPerTeam2 = maxTeamSize;
        benchCount = totalPlayers - (playersPerTeam1 + playersPerTeam2);
      }
    }
    
    console.log(`Team generation for ${totalPlayers} players: Team 1: ${playersPerTeam1}, Team 2: ${playersPerTeam2}, Bench: ${benchCount}`);
    
    // Total active players (sum of both teams)
    const totalActivePlayers = playersPerTeam1 + playersPerTeam2;
    
    // Select the players who will play and those who will sit out
    const activePlayers = sortedPlayers.slice(0, totalActivePlayers);
    const benchPlayers = sortedPlayers.slice(totalActivePlayers);
    
    // Teams will be created by distributing players to balance skill levels
    // while maintaining the required team sizes
    const whiteTeam: Player[] = [];
    const blackTeam: Player[] = [];

    // Calculate overall team skill (sum of all player ratings)
    const calculateTeamSkill = (team: Player[]) => 
      team.reduce((sum, player) => sum + player.overallSkill, 0);
    
    // Calculate team skill per position (offensive, defensive, ball handling)
    const calculatePositionalSkill = (team: Player[]) => {
      return {
        offense: team.reduce((sum, player) => sum + player.offenseSkill, 0),
        defense: team.reduce((sum, player) => sum + player.defenseSkill, 0),
        ballHandling: team.reduce((sum, player) => sum + player.ballHandlingSkill, 0)
      };
    };
    
    // Log how many players we need to assign to each team
    console.log(`Distributing players: We need to assign ${playersPerTeam1} to Team 1 and ${playersPerTeam2} to Team 2`);
    
    // Make absolutely sure we have the right number of active players
    const actualActivePlayers = activePlayers.slice(0, playersPerTeam1 + playersPerTeam2);
    
    // Add first player (highest rated) to white team
    whiteTeam.push(actualActivePlayers[0]);
    
    // Add second player to black team
    blackTeam.push(actualActivePlayers[1]);
    
    // Create arrays of remaining players to assign
    const remainingPlayers = actualActivePlayers.slice(2);
    
    // Sort remaining players by skill to ensure we're balancing properly
    remainingPlayers.sort((a, b) => b.overallSkill - a.overallSkill);
    
    // Calculate team skills for balancing
    const calculateTeamBalance = (team: Player[]) => {
      const skill = calculateTeamSkill(team);
      const positional = calculatePositionalSkill(team);
      return {
        skill,
        positional,
        totalScore: skill + 
                   (positional.offense * 0.8) + 
                   (positional.defense * 0.8) + 
                   (positional.ballHandling * 0.6),
        normalizedScore: (skill + 
                         (positional.offense * 0.8) + 
                         (positional.defense * 0.8) + 
                         (positional.ballHandling * 0.6)) / Math.max(1, team.length)
      };
    };
    
    // Use a more sophisticated algorithm that considers both team sizes and skill balance
    
    // First attempt: Try to balance by assigning each player to the team with lower current strength
    // This phase focuses on skill balance rather than strict team size enforcement
    for (const player of remainingPlayers) {
      // Calculate current team skill total (not normalized by count yet)
      const whiteSkill = calculateTeamSkill(whiteTeam);
      const blackSkill = calculateTeamSkill(blackTeam);
      
      // Calculate positional skills for each team
      const whitePositional = calculatePositionalSkill(whiteTeam);
      const blackPositional = calculatePositionalSkill(blackTeam);
      
      // Calculate comprehensive team strength including all skills
      const whiteStrength = whiteSkill + 
                          (whitePositional.offense * 0.8) + 
                          (whitePositional.defense * 0.8) + 
                          (whitePositional.ballHandling * 0.6);
                         
      const blackStrength = blackSkill + 
                          (blackPositional.offense * 0.8) + 
                          (blackPositional.defense * 0.8) + 
                          (blackPositional.ballHandling * 0.6);
      
      // Adjust strength by team size to avoid unfairly favoring the team with fewer players
      // This gives us a more accurate measure of team strength for balancing
      const whiteSizeAdjusted = whiteStrength / Math.max(1, whiteTeam.length);
      const blackSizeAdjusted = blackStrength / Math.max(1, blackTeam.length);
      
      // Check if either team is full to capacity
      if (whiteTeam.length >= playersPerTeam1) {
        blackTeam.push(player);
        continue;
      }
      
      if (blackTeam.length >= playersPerTeam2) {
        whiteTeam.push(player);
        continue;
      }
      
      // If one team is getting too large compared to the other, consider size priority
      const sizeDifference = Math.abs(whiteTeam.length - blackTeam.length);
      
      // Only add to team that's significantly stronger if the other team is getting too large
      if (sizeDifference >= 2) {
        // Prioritize evening out team sizes
        if (whiteTeam.length < blackTeam.length) {
          whiteTeam.push(player);
        } else {
          blackTeam.push(player);
        }
      } else {
        // Normal case - add to the weaker team by skill
        if (whiteSizeAdjusted <= blackSizeAdjusted) {
          whiteTeam.push(player);
        } else {
          blackTeam.push(player);
        }
      }
    }
    
    // Second phase: Adjust teams to ensure we have correct team sizes while trying to maintain balance
    // Start by making sure no team is understaffed
    if (whiteTeam.length < playersPerTeam1 && blackTeam.length > playersPerTeam2) {
      // Move players from black to white team
      while (whiteTeam.length < playersPerTeam1 && blackTeam.length > playersPerTeam2) {
        // Find the player with the lowest skill from black team to move
        const playerIndex = blackTeam
          .map((p, i) => ({ index: i, skill: p.overallSkill }))
          .sort((a, b) => a.skill - b.skill)[0].index;
        
        // Move this player to white team
        whiteTeam.push(blackTeam.splice(playerIndex, 1)[0]);
      }
    }
    
    if (blackTeam.length < playersPerTeam2 && whiteTeam.length > playersPerTeam1) {
      // Move players from white to black team
      while (blackTeam.length < playersPerTeam2 && whiteTeam.length > playersPerTeam1) {
        // Find the player with the lowest skill from white team to move
        const playerIndex = whiteTeam
          .map((p, i) => ({ index: i, skill: p.overallSkill }))
          .sort((a, b) => a.skill - b.skill)[0].index;
        
        // Move this player to black team
        blackTeam.push(whiteTeam.splice(playerIndex, 1)[0]);
      }
    }
    
    // Final check - make sure we have exactly the right number of players on each team
    // This should rarely be needed if the above logic is working correctly
    if (whiteTeam.length > playersPerTeam1) {
      // Move excess players from white to black
      while (whiteTeam.length > playersPerTeam1) {
        // Find the player with the highest skill to maintain balance
        const playerIndex = whiteTeam
          .map((p, i) => ({ index: i, skill: p.overallSkill }))
          .sort((a, b) => b.skill - a.skill)[0].index;
          
        blackTeam.push(whiteTeam.splice(playerIndex, 1)[0]);
      }
    }
    
    if (blackTeam.length > playersPerTeam2) {
      // Move excess players from black to white
      while (blackTeam.length > playersPerTeam2) {
        // Find the player with the highest skill to maintain balance
        const playerIndex = blackTeam
          .map((p, i) => ({ index: i, skill: p.overallSkill }))
          .sort((a, b) => b.skill - a.skill)[0].index;
          
        whiteTeam.push(blackTeam.splice(playerIndex, 1)[0]);
      }
    }
    
    // Log the team details for debugging
    console.log(`Team balancing results - White team: ${whiteTeam.length} players (skill: ${calculateTeamSkill(whiteTeam)}), Black team: ${blackTeam.length} players (skill: ${calculateTeamSkill(blackTeam)})`);
    
    
    // Include the bench players in the data structure, but mark them
    // separately by adding them to the active rosters but in a way
    // the client can identify them
    
    // Update the game with team player IDs as number arrays
    // Remove duplicates by using a filter function
    const whiteTeamIds = removeDuplicateIds(whiteTeam.map(p => p.id));
    const blackTeamIds = removeDuplicateIds(blackTeam.map(p => p.id));
    const benchIds = removeDuplicateIds(benchPlayers.map(p => p.id));
    
    // Helper function to remove duplicate IDs
    function removeDuplicateIds(ids: number[]): number[] {
      return ids.filter((id, index) => ids.indexOf(id) === index);
    }
    
    console.log(`Storing teams for game ${gameId}:`, {
      whiteTeam: whiteTeamIds,
      blackTeam: blackTeamIds,
      benchPlayers: benchIds
    });
    
    // Update the teams in the database
    await db
      .update(games)
      .set({
        whiteTeam: whiteTeamIds,
        blackTeam: blackTeamIds,
        benchPlayers: benchIds
      })
      .where(eq(games.id, gameId));
    
    return { whiteTeam, blackTeam, benchPlayers };
  }

  // New game results and statistics methods
  async recordGameResults(gameId: number): Promise<void> {
    console.log(`Recording game results for game ${gameId}`);
    const game = await this.getGame(gameId);
    
    if (!game) {
      console.log(`Game ${gameId} not found`);
      return;
    }
    
    if (!game.wasPlayed || game.whiteTeamScore === null || game.blackTeamScore === null) {
      console.log(`Game ${gameId} has not been played or missing scores`);
      return;
    }
    
    // Process team data to get player IDs
    const processTeamIds = (teamData: any): number[] => {
      if (!teamData) return [];
      
      // Handle array case directly
      if (Array.isArray(teamData)) {
        return teamData.map(item => typeof item === 'number' ? item : parseInt(String(item)))
          .filter(id => !isNaN(id));
      }
      
      // Handle JSON string
      if (typeof teamData === 'string') {
        try {
          const parsed = JSON.parse(teamData);
          if (Array.isArray(parsed)) {
            return parsed.map(item => typeof item === 'number' ? item : parseInt(String(item)))
              .filter(id => !isNaN(id));
          }
          return [];
        } catch (e) {
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
      
      return [];
    };
    
    // Get the player IDs for each team
    const whiteTeamIds = processTeamIds(game.whiteTeam);
    const blackTeamIds = processTeamIds(game.blackTeam);
    const benchPlayerIds = processTeamIds(game.benchPlayers);
    
    // If no valid team data is found, try to generate teams
    if (whiteTeamIds.length === 0 && blackTeamIds.length === 0) {
      console.log(`No valid team data found for game ${gameId}`);
      
      try {
        if (game && !game.whiteTeam && !game.blackTeam) {
          console.log(`Attempting to generate teams for game ${gameId}`);
          await this.generateTeams(gameId);
          
          // Retry after generating teams
          return this.recordGameResults(gameId);
        }
      } catch (error) {
        console.error(`Error generating teams for game ${gameId}:`, error);
      }
      
      return;
    }
    
    // Determine the game result
    const isDraw = game.whiteTeamScore === game.blackTeamScore;
    const whiteTeamWon = game.whiteTeamScore > game.blackTeamScore;
    const scoreDiff = Math.abs(game.whiteTeamScore - game.blackTeamScore);
    
    console.log(`Game ${gameId} result: White ${game.whiteTeamScore} - ${game.blackTeamScore} Black`);
    console.log(`Result: ${isDraw ? 'Draw' : (whiteTeamWon ? 'White team won' : 'Black team won')}`);
    
    // First, delete any existing game results for this game
    await db.delete(gameResults).where(eq(gameResults.gameId, gameId));
    
    // Record results for white team players
    for (const playerId of whiteTeamIds) {
      await db.insert(gameResults).values({
        gameId,
        playerId,
        team: 'white',
        won: whiteTeamWon,
        scoreDifference: isDraw ? 0 : (whiteTeamWon ? scoreDiff : -scoreDiff)
      });
    }
    
    // Record results for black team players
    for (const playerId of blackTeamIds) {
      await db.insert(gameResults).values({
        gameId,
        playerId,
        team: 'black',
        won: !whiteTeamWon && !isDraw, // Black team won if white didn't win and it's not a draw
        scoreDifference: isDraw ? 0 : (!whiteTeamWon ? scoreDiff : -scoreDiff)
      });
    }
    
    // Record results for bench players (they participated but didn't play)
    // Bench players get a reduced +/- impact based on the game's outcome
    const benchScoreDifference = isDraw ? 0 : Math.round(scoreDiff * 0.5) * (whiteTeamWon ? 1 : -1);
    
    for (const playerId of benchPlayerIds) {
      await db.insert(gameResults).values({
        gameId,
        playerId,
        team: 'bench',
        won: false,
        scoreDifference: benchScoreDifference
      });
    }
    
    console.log(`Game results successfully recorded for game ${gameId}`);
  }
  
  async getPlayerStats(playerId: number): Promise<{gamesPlayed: number, wins: number, plusMinus: number}> {
    // Get total games played (including bench appearances)
    const gamesPlayedResult = await db
      .select({ count: count() })
      .from(gameResults)
      .where(eq(gameResults.playerId, playerId));
    
    const gamesPlayed = gamesPlayedResult[0]?.count || 0;
    
    // Get total wins
    const winsResult = await db
      .select({ count: count() })
      .from(gameResults)
      .where(and(
        eq(gameResults.playerId, playerId),
        eq(gameResults.won, true)
      ));
    
    const wins = winsResult[0]?.count || 0;
    
    // Calculate plus-minus
    const plusMinusResult = await db
      .select({ total: sql<number>`sum(${gameResults.scoreDifference})` })
      .from(gameResults)
      .where(eq(gameResults.playerId, playerId));
    
    const plusMinus = plusMinusResult[0]?.total || 0;
    
    return {
      gamesPlayed,
      wins,
      plusMinus
    };
  }
  
  async getAllPlayerStats(): Promise<Player[]> {
    // Get all players
    const allPlayers = await this.getPlayers();
    
    // For each player, calculate their stats
    const playersWithStats = await Promise.all(
      allPlayers.map(async (player) => {
        const stats = await this.getPlayerStats(player.id);
        return {
          ...player,
          gamesPlayed: stats.gamesPlayed,
          wins: stats.wins,
          plusMinus: stats.plusMinus
        };
      })
    );
    
    return playersWithStats;
  }
  
  async deleteGameResults(gameId: number): Promise<boolean> {
    try {
      await db.delete(gameResults).where(eq(gameResults.gameId, gameId));
      return true;
    } catch (error) {
      console.error(`Error deleting game results for game ${gameId}:`, error);
      return false;
    }
  }

  // Penalty methods
  async createPenalty(penaltyData: InsertPenalty): Promise<Penalty> {
    const [penalty] = await db
      .insert(penalties)
      .values(penaltyData)
      .returning();
    return penalty;
  }

  async getPenalties(playerId?: number, gameId?: number): Promise<Penalty[]> {
    let query = db.select().from(penalties);
    
    if (playerId && gameId) {
      query = query.where(and(eq(penalties.playerId, playerId), eq(penalties.gameId, gameId)));
    } else if (playerId) {
      query = query.where(eq(penalties.playerId, playerId));
    } else if (gameId) {
      query = query.where(eq(penalties.gameId, gameId));
    }
    
    return query.orderBy(desc(penalties.withdrawalTime));
  }

  async markPenaltyPaid(penaltyId: number): Promise<boolean> {
    try {
      await db
        .update(penalties)
        .set({ 
          isPaid: true, 
          paidAt: new Date() 
        })
        .where(eq(penalties.id, penaltyId));
      return true;
    } catch (error) {
      console.error(`Error marking penalty ${penaltyId} as paid:`, error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();