import { pgTable, text, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  bio: text("bio").default(""),
  avatarColor: text("avatar_color").default("#7c3aed"),
  isPremium: boolean("is_premium").default(false),
  premiumGrantedAt: timestamp("premium_granted_at"),
  aiUsageToday: integer("ai_usage_today").default(0),
  aiUsageDate: text("ai_usage_date").default(""),
});

export const userGames = pgTable("user_games", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").default(""),
  engineType: text("engine_type").notNull(),
  code: text("code").default(""),
  isPublic: boolean("is_public").default(false),
  authorId: integer("author_id").references(() => users.id),
  authorUsername: text("author_username").notNull(),
  tags: text("tags").array().default([]),
  thumbnail: text("thumbnail"),
  likeCount: integer("like_count").default(0),
  playCount: integer("play_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gameLikes = pgTable("game_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  gameId: text("game_id").references(() => userGames.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("game_likes_user_game_idx").on(t.userId, t.gameId)]);

export const gameComments = pgTable("game_comments", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").references(() => userGames.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  username: text("username").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameVersions = pgTable("game_versions", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").references(() => userGames.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  savedAt: timestamp("saved_at").defaultNow(),
});

export const gameReports = pgTable("game_reports", {
  id: serial("id").primaryKey(),
  gameId: text("game_id").references(() => userGames.id, { onDelete: "cascade" }),
  reportedBy: text("reported_by").notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id),
  followingId: integer("following_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [uniqueIndex("follows_unique_idx").on(t.followerId, t.followingId)]);

export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(),
  grantedAt: timestamp("granted_at").defaultNow(),
}, (t) => [uniqueIndex("achievements_unique_idx").on(t.userId, t.type)]);

export const bannedUsers = pgTable("banned_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  reason: text("reason").notNull(),
  bannedBy: text("banned_by").notNull(),
  bannedAt: timestamp("banned_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  rank: text("rank").default("user"),
  text: text("text").notNull(),
  flagged: boolean("flagged").default(false),
  reportCount: integer("report_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatReports = pgTable("chat_reports", {
  id: text("id").primaryKey(),
  messageId: text("message_id"),
  reason: text("reason").notNull(),
  reportedBy: text("reported_by").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => users.id),
  toUserId: integer("to_user_id").references(() => users.id),
  fromUsername: text("from_username").notNull(),
  toUsername: text("to_username").notNull(),
  text: text("text").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userRanks = pgTable("user_ranks", {
  username: text("username").primaryKey(),
  rank: text("rank").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
