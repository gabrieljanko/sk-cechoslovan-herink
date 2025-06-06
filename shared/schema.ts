import { pgTable, text, serial, integer, boolean, timestamp, real, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Player table and schemas
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  offenseSkill: real("offense_skill").notNull().default(5),
  defenseSkill: real("defense_skill").notNull().default(5),
  ballHandlingSkill: real("ball_handling_skill").notNull().default(5),
  overallSkill: real("overall_skill").notNull().default(5),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  plusMinus: integer("plus_minus").notNull().default(0),
  joinedDate: timestamp("joined_date").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  gamesPlayed: true,
  wins: true, 
  plusMinus: true,
  joinedDate: true
});

export const updatePlayerSchema = createInsertSchema(players).omit({
  id: true,
  joinedDate: true
});

// Game table and schemas
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  whiteTeamScore: integer("white_team_score"),
  blackTeamScore: integer("black_team_score"),
  wasPlayed: boolean("was_played").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  whiteTeam: json("white_team").$type<number[]>(),
  blackTeam: json("black_team").$type<number[]>(),
  benchPlayers: json("bench_players").$type<number[]>().default([]),
  registeredPlayers: json("registered_players").$type<number[]>().notNull().default([]),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true
}).transform((data) => {
  // Ensure date is properly converted to Date object
  if (typeof data.date === 'string') {
    return {
      ...data,
      date: new Date(data.date)
    };
  }
  return data;
});

export const updateGameSchema = createInsertSchema(games).pick({
  date: true,
  whiteTeamScore: true,
  blackTeamScore: true,
  wasPlayed: true,
  isArchived: true,
  whiteTeam: true,
  blackTeam: true,
  benchPlayers: true,
}).partial().transform((data) => {
  // Ensure date is properly converted to Date object
  if (data.date && typeof data.date === 'string') {
    return {
      ...data,
      date: new Date(data.date)
    };
  }
  return data;
});

// Registrations for upcoming games
export const registrations = pgTable("registrations", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  gameId: integer("game_id").notNull(),
  status: text("status").notNull().default("going"),  // "going" or "not_going"
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
  fine: boolean("fine").notNull().default(false),
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  registeredAt: true,
  fine: true
});

// Game results table to track statistics properly
export const gameResults = pgTable("game_results", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  playerId: integer("player_id").notNull(),
  team: text("team").notNull(), // "white", "black", or "bench"
  won: boolean("won").notNull().default(false),
  scoreDifference: integer("score_difference").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGameResultSchema = createInsertSchema(gameResults).omit({
  id: true,
  createdAt: true
});

// Penalties table to track withdrawal fines
export const penalties = pgTable("penalties", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  gameId: integer("game_id").notNull(),
  amount: integer("amount").notNull(), // 50, 100, or 200 CZK
  reason: text("reason").notNull(), // "late_withdrawal_day_before", "late_withdrawal_day_of_morning", "late_withdrawal_day_of_afternoon"
  isPaid: boolean("is_paid").notNull().default(false),
  withdrawalTime: timestamp("withdrawal_time").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const insertPenaltySchema = createInsertSchema(penalties).omit({
  id: true,
  withdrawalTime: true,
  paidAt: true
});

// Define relations after all tables are created
export const playersRelations = relations(players, ({ many }: { many: any }) => ({
  registrations: many(registrations),
  gameResults: many(gameResults),
  penalties: many(penalties)
}));

export const gamesRelations = relations(games, ({ many }: { many: any }) => ({
  registrations: many(registrations),
  gameResults: many(gameResults),
  penalties: many(penalties)
}));

export const registrationsRelations = relations(registrations, ({ one }: { one: any }) => ({
  player: one(players, {
    fields: [registrations.playerId],
    references: [players.id]
  }),
  game: one(games, {
    fields: [registrations.gameId],
    references: [games.id]
  })
}));

export const gameResultsRelations = relations(gameResults, ({ one }: { one: any }) => ({
  player: one(players, {
    fields: [gameResults.playerId],
    references: [players.id]
  }),
  game: one(games, {
    fields: [gameResults.gameId],
    references: [games.id]
  })
}));

export const penaltiesRelations = relations(penalties, ({ one }: { one: any }) => ({
  player: one(players, {
    fields: [penalties.playerId],
    references: [players.id]
  }),
  game: one(games, {
    fields: [penalties.gameId],
    references: [games.id]
  })
}));

// Types
export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type UpdatePlayer = z.infer<typeof updatePlayerSchema>;

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type UpdateGame = z.infer<typeof updateGameSchema>;

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;

export type GameResult = typeof gameResults.$inferSelect;
export type InsertGameResult = z.infer<typeof insertGameResultSchema>;

export type Penalty = typeof penalties.$inferSelect;
export type InsertPenalty = z.infer<typeof insertPenaltySchema>;

// Additional types for the application
export type Team = {
  players: Player[];
  averageRating: number;
};