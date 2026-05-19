import bcrypt from "bcryptjs";
import { pool } from "./db";
import { type User, type InsertUser } from "@shared/schema";

export interface UserGame {
  id: string;
  title: string;
  description: string;
  engineType: "2d" | "2.5d" | "3d";
  code: string;
  isPublic: boolean;
  authorId: number;
  authorUsername: string;
  tags: string[];
  thumbnail: string | null;
  likeCount: number;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  userId: number;
  username: string;
  bio: string;
  avatarColor: string;
  isPremium: boolean;
  premiumGrantedAt?: string;
  aiUsageToday: number;
  aiUsageDate: string;
}

function gameRow(r: any): UserGame {
  return {
    id: r.id,
    title: r.title,
    description: r.description || "",
    engineType: r.engine_type,
    code: r.code || "",
    isPublic: r.is_public,
    authorId: r.author_id,
    authorUsername: r.author_username,
    tags: r.tags || [],
    thumbnail: r.thumbnail || null,
    likeCount: r.like_count || 0,
    playCount: r.play_count || 0,
    createdAt: r.created_at?.toISOString?.() ?? r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at?.toISOString?.() ?? r.updated_at ?? new Date().toISOString(),
  };
}

function profileRow(r: any, userId: number, username: string): UserProfile {
  return {
    userId,
    username,
    bio: r?.bio || "",
    avatarColor: r?.avatar_color || "#7c3aed",
    isPremium: r?.is_premium || false,
    premiumGrantedAt: r?.premium_granted_at?.toISOString?.() ?? r?.premium_granted_at ?? undefined,
    aiUsageToday: r?.ai_usage_today || 0,
    aiUsageDate: r?.ai_usage_date || "",
  };
}

export class PgStorage {
  // ── Users ─────────────────────────────────────────────────────────────

  async getUser(id: number): Promise<User | undefined> {
    const { rows } = await pool.query("SELECT id, username, password, email FROM users WHERE id = $1", [id]);
    return rows[0] as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { rows } = await pool.query("SELECT id, username, password, email FROM users WHERE LOWER(username) = LOWER($1)", [username]);
    return rows[0] as User | undefined;
  }

  async createUser(insertUser: InsertUser & { email?: string }, joinedAt?: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const createdAt = joinedAt ? new Date(joinedAt) : new Date();
    const { rows } = await pool.query(
      "INSERT INTO users (username, password, email, created_at) VALUES ($1, $2, $3, $4) RETURNING id, username, password, email",
      [insertUser.username, hashedPassword, insertUser.email || null, createdAt]
    );
    return rows[0] as User;
  }

  async validatePassword(user: User, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.password);
  }

  async seedUser(username: string, plainPassword: string, joinedAt?: string): Promise<void> {
    const existing = await this.getUserByUsername(username);
    if (!existing) {
      await this.createUser({ username, password: plainPassword }, joinedAt);
    }
  }

  async getUserJoinDate(id: number): Promise<string> {
    const { rows } = await pool.query("SELECT created_at FROM users WHERE id = $1", [id]);
    return rows[0]?.created_at?.toISOString() ?? new Date().toISOString();
  }

  async getUserCount(): Promise<number> {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS cnt FROM users");
    return rows[0]?.cnt || 0;
  }

  async getAllUsers(): Promise<User[]> {
    const { rows } = await pool.query("SELECT id, username, password, email, created_at FROM users ORDER BY id");
    return rows as User[];
  }

  async setUserEmail(userId: number, email: string): Promise<void> {
    await pool.query("UPDATE users SET email = $1 WHERE id = $2", [email, userId]);
  }

  async getUserEmail(userId: number): Promise<string | null> {
    const { rows } = await pool.query("SELECT email FROM users WHERE id = $1", [userId]);
    return rows[0]?.email ?? null;
  }

  // ── Profiles ───────────────────────────────────────────────────────────

  async getProfile(userId: number): Promise<UserProfile> {
    const userRow = await this.getUser(userId);
    const { rows } = await pool.query("SELECT * FROM user_profiles WHERE user_id = $1", [userId]);
    if (rows.length === 0) {
      await pool.query(
        "INSERT INTO user_profiles (user_id, bio, avatar_color, is_premium, ai_usage_today, ai_usage_date) VALUES ($1, '', '#7c3aed', false, 0, '') ON CONFLICT DO NOTHING",
        [userId]
      );
      return profileRow(null, userId, userRow?.username || "");
    }
    return profileRow(rows[0], userId, userRow?.username || "");
  }

  async updateProfile(userId: number, updates: Partial<UserProfile>): Promise<UserProfile> {
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (typeof updates.bio === "string") { fields.push(`bio = $${i++}`); vals.push(updates.bio); }
    if (typeof updates.avatarColor === "string") { fields.push(`avatar_color = $${i++}`); vals.push(updates.avatarColor); }
    if (typeof updates.isPremium === "boolean") { fields.push(`is_premium = $${i++}`); vals.push(updates.isPremium); }
    if (updates.premiumGrantedAt !== undefined) { fields.push(`premium_granted_at = $${i++}`); vals.push(updates.premiumGrantedAt ? new Date(updates.premiumGrantedAt) : null); }
    if (typeof updates.aiUsageToday === "number") { fields.push(`ai_usage_today = $${i++}`); vals.push(updates.aiUsageToday); }
    if (typeof updates.aiUsageDate === "string") { fields.push(`ai_usage_date = $${i++}`); vals.push(updates.aiUsageDate); }
    if (fields.length > 0) {
      vals.push(userId);
      await pool.query(
        `INSERT INTO user_profiles (user_id) VALUES ($${i}) ON CONFLICT (user_id) DO UPDATE SET ${fields.join(", ")}`,
        vals
      );
    }
    return this.getProfile(userId);
  }

  async grantPremium(userId: number): Promise<UserProfile> {
    return this.updateProfile(userId, { isPremium: true, premiumGrantedAt: new Date().toISOString() });
  }

  async incrementAiUsage(userId: number): Promise<boolean> {
    const profile = await this.getProfile(userId);
    const today = new Date().toDateString();
    const dailyLimit = profile.isPremium ? 50 : 5;
    if (profile.aiUsageDate !== today) {
      await this.updateProfile(userId, { aiUsageToday: 1, aiUsageDate: today });
      return true;
    }
    if (profile.aiUsageToday >= dailyLimit) return false;
    await this.updateProfile(userId, { aiUsageToday: profile.aiUsageToday + 1 });
    return true;
  }

  // ── Games ──────────────────────────────────────────────────────────────

  async createGame(game: Omit<UserGame, "id" | "createdAt" | "updatedAt">): Promise<UserGame> {
    const id = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const { rows } = await pool.query(
      `INSERT INTO user_games (id, title, description, engine_type, code, is_public, author_id, author_username, tags, thumbnail, like_count, play_count, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,$11,$11) RETURNING *`,
      [id, game.title, game.description, game.engineType, game.code, game.isPublic, game.authorId, game.authorUsername, game.tags || [], game.thumbnail || null, now]
    );
    return gameRow(rows[0]);
  }

  async getGame(id: string): Promise<UserGame | undefined> {
    const { rows } = await pool.query("SELECT * FROM user_games WHERE id = $1", [id]);
    return rows[0] ? gameRow(rows[0]) : undefined;
  }

  async updateGame(id: string, updates: Partial<UserGame>): Promise<UserGame | undefined> {
    const fields: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (typeof updates.title === "string") { fields.push(`title = $${i++}`); vals.push(updates.title); }
    if (typeof updates.description === "string") { fields.push(`description = $${i++}`); vals.push(updates.description); }
    if (typeof updates.code === "string") { fields.push(`code = $${i++}`); vals.push(updates.code); }
    if (typeof updates.isPublic === "boolean") { fields.push(`is_public = $${i++}`); vals.push(updates.isPublic); }
    if (Array.isArray(updates.tags)) { fields.push(`tags = $${i++}`); vals.push(updates.tags); }
    if (updates.thumbnail !== undefined) { fields.push(`thumbnail = $${i++}`); vals.push(updates.thumbnail); }
    if (fields.length === 0) return this.getGame(id);
    fields.push(`updated_at = $${i++}`);
    vals.push(new Date());
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE user_games SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );
    return rows[0] ? gameRow(rows[0]) : undefined;
  }

  async deleteGame(id: string): Promise<boolean> {
    const { rowCount } = await pool.query("DELETE FROM user_games WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async getGamesByUser(authorId: number): Promise<UserGame[]> {
    const { rows } = await pool.query("SELECT * FROM user_games WHERE author_id = $1 ORDER BY updated_at DESC", [authorId]);
    return rows.map(gameRow);
  }

  async getPublicGames(): Promise<UserGame[]> {
    const { rows } = await pool.query("SELECT * FROM user_games WHERE is_public = true ORDER BY created_at DESC");
    return rows.map(gameRow);
  }

  // ── Likes ──────────────────────────────────────────────────────────────

  async likeGame(userId: number, gameId: string): Promise<void> {
    await pool.query(
      "INSERT INTO game_likes (user_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, gameId]
    );
    await pool.query("UPDATE user_games SET like_count = like_count + 1 WHERE id = $1", [gameId]);
  }

  async unlikeGame(userId: number, gameId: string): Promise<void> {
    const { rowCount } = await pool.query("DELETE FROM game_likes WHERE user_id = $1 AND game_id = $2", [userId, gameId]);
    if ((rowCount ?? 0) > 0) {
      await pool.query("UPDATE user_games SET like_count = GREATEST(0, like_count - 1) WHERE id = $1", [gameId]);
    }
  }

  async hasLiked(userId: number, gameId: string): Promise<boolean> {
    const { rows } = await pool.query("SELECT 1 FROM game_likes WHERE user_id = $1 AND game_id = $2", [userId, gameId]);
    return rows.length > 0;
  }

  async incrementPlayCount(gameId: string): Promise<void> {
    await pool.query("UPDATE user_games SET play_count = play_count + 1 WHERE id = $1", [gameId]);
  }

  // ── Comments ───────────────────────────────────────────────────────────

  async addComment(gameId: string, userId: number, username: string, text: string): Promise<any> {
    const { rows } = await pool.query(
      "INSERT INTO game_comments (game_id, user_id, username, text) VALUES ($1,$2,$3,$4) RETURNING *",
      [gameId, userId, username, text]
    );
    const r = rows[0];
    return { id: r.id, gameId: r.game_id, userId: r.user_id, username: r.username, text: r.text, createdAt: r.created_at?.toISOString() };
  }

  async getComments(gameId: string): Promise<any[]> {
    const { rows } = await pool.query("SELECT * FROM game_comments WHERE game_id = $1 ORDER BY created_at ASC", [gameId]);
    return rows.map((r) => ({ id: r.id, gameId: r.game_id, userId: r.user_id, username: r.username, text: r.text, createdAt: r.created_at?.toISOString() }));
  }

  async deleteComment(id: number): Promise<boolean> {
    const { rowCount } = await pool.query("DELETE FROM game_comments WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  // ── Version History ────────────────────────────────────────────────────

  async saveGameVersion(gameId: string, code: string, title: string, description: string): Promise<any> {
    const { rows } = await pool.query(
      "INSERT INTO game_versions (game_id, code, title, description) VALUES ($1,$2,$3,$4) RETURNING *",
      [gameId, code, title, description]
    );
    const r = rows[0];
    // Keep only last 20 versions
    await pool.query(
      "DELETE FROM game_versions WHERE game_id = $1 AND id NOT IN (SELECT id FROM game_versions WHERE game_id = $1 ORDER BY saved_at DESC LIMIT 20)",
      [gameId]
    );
    return { id: r.id, gameId, code: r.code, title: r.title, description: r.description, savedAt: r.saved_at?.toISOString() };
  }

  async getGameVersions(gameId: string): Promise<any[]> {
    const { rows } = await pool.query(
      "SELECT id, game_id, title, description, saved_at FROM game_versions WHERE game_id = $1 ORDER BY saved_at DESC LIMIT 20",
      [gameId]
    );
    return rows.map((r) => ({ id: r.id, gameId: r.game_id, title: r.title, description: r.description, savedAt: r.saved_at?.toISOString() }));
  }

  async getGameVersion(versionId: number): Promise<any | null> {
    const { rows } = await pool.query("SELECT * FROM game_versions WHERE id = $1", [versionId]);
    if (!rows[0]) return null;
    const r = rows[0];
    return { id: r.id, gameId: r.game_id, code: r.code, title: r.title, description: r.description, savedAt: r.saved_at?.toISOString() };
  }

  // ── Game Reports ───────────────────────────────────────────────────────

  async reportGame(gameId: string, reportedBy: string, reason: string): Promise<any> {
    const { rows } = await pool.query(
      "INSERT INTO game_reports (game_id, reported_by, reason, status) VALUES ($1,$2,$3,'pending') RETURNING *",
      [gameId, reportedBy, reason]
    );
    const r = rows[0];
    return { id: r.id, gameId: r.game_id, reportedBy: r.reported_by, reason: r.reason, status: r.status, createdAt: r.created_at?.toISOString() };
  }

  async getGameReports(): Promise<any[]> {
    const { rows } = await pool.query(
      "SELECT gr.*, ug.title AS game_title, ug.author_username FROM game_reports gr LEFT JOIN user_games ug ON ug.id = gr.game_id ORDER BY gr.created_at DESC"
    );
    return rows.map((r) => ({ id: r.id, gameId: r.game_id, gameTitle: r.game_title, gameAuthor: r.author_username, reportedBy: r.reported_by, reason: r.reason, status: r.status, createdAt: r.created_at?.toISOString() }));
  }

  async resolveGameReport(id: number, status: string): Promise<void> {
    await pool.query("UPDATE game_reports SET status = $1 WHERE id = $2", [status, id]);
  }

  // ── Follows ────────────────────────────────────────────────────────────

  async follow(followerId: number, followingId: number): Promise<void> {
    await pool.query("INSERT INTO follows (follower_id, following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [followerId, followingId]);
  }

  async unfollow(followerId: number, followingId: number): Promise<void> {
    await pool.query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2", [followerId, followingId]);
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const { rows } = await pool.query("SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2", [followerId, followingId]);
    return rows.length > 0;
  }

  async getFollowerCount(userId: number): Promise<number> {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS cnt FROM follows WHERE following_id = $1", [userId]);
    return rows[0]?.cnt || 0;
  }

  async getFollowingCount(userId: number): Promise<number> {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS cnt FROM follows WHERE follower_id = $1", [userId]);
    return rows[0]?.cnt || 0;
  }

  async getFollowers(userId: number): Promise<{ userId: number; username: string }[]> {
    const { rows } = await pool.query(
      "SELECT u.id AS user_id, u.username FROM follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = $1 ORDER BY f.created_at DESC",
      [userId]
    );
    return rows.map((r) => ({ userId: r.user_id, username: r.username }));
  }

  async getFollowing(userId: number): Promise<{ userId: number; username: string }[]> {
    const { rows } = await pool.query(
      "SELECT u.id AS user_id, u.username FROM follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = $1 ORDER BY f.created_at DESC",
      [userId]
    );
    return rows.map((r) => ({ userId: r.user_id, username: r.username }));
  }

  // ── Achievements ───────────────────────────────────────────────────────

  async grantAchievement(userId: number, type: string): Promise<void> {
    await pool.query("INSERT INTO achievements (user_id, type) VALUES ($1,$2) ON CONFLICT DO NOTHING", [userId, type]);
  }

  async hasAchievement(userId: number, type: string): Promise<boolean> {
    const { rows } = await pool.query("SELECT 1 FROM achievements WHERE user_id = $1 AND type = $2", [userId, type]);
    return rows.length > 0;
  }

  async getAchievements(userId: number): Promise<any[]> {
    const { rows } = await pool.query("SELECT type, granted_at FROM achievements WHERE user_id = $1 ORDER BY granted_at ASC", [userId]);
    return rows.map((r) => ({ type: r.type, grantedAt: r.granted_at?.toISOString() }));
  }

  // ── Bans ───────────────────────────────────────────────────────────────

  async banUser(id: string, username: string, reason: string, bannedBy: string): Promise<any> {
    await pool.query(
      "INSERT INTO banned_users (id, username, reason, banned_by) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO UPDATE SET reason = $3, banned_by = $4, banned_at = NOW()",
      [id, username, reason, bannedBy]
    );
    return { id, username, reason, bannedBy, bannedAt: new Date().toISOString() };
  }

  async unbanUser(username: string): Promise<void> {
    await pool.query("DELETE FROM banned_users WHERE LOWER(username) = LOWER($1)", [username]);
  }

  async isBanned(username: string): Promise<boolean> {
    const { rows } = await pool.query("SELECT 1 FROM banned_users WHERE LOWER(username) = LOWER($1)", [username]);
    return rows.length > 0;
  }

  async getBannedUsers(): Promise<any[]> {
    const { rows } = await pool.query("SELECT id, username, reason, banned_by, banned_at FROM banned_users ORDER BY banned_at DESC");
    return rows.map((r) => ({ id: r.id, username: r.username, reason: r.reason, bannedBy: r.banned_by, bannedAt: r.banned_at?.toISOString() }));
  }

  async unbanById(id: string): Promise<boolean> {
    const { rowCount } = await pool.query("DELETE FROM banned_users WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  // ── Chat ───────────────────────────────────────────────────────────────

  async saveChatMessage(msg: { id: string; username: string; rank: string; text: string; flagged: boolean }): Promise<any> {
    await pool.query(
      "INSERT INTO chat_messages (id, username, rank, text, flagged, report_count) VALUES ($1,$2,$3,$4,$5,0)",
      [msg.id, msg.username, msg.rank, msg.text, msg.flagged]
    );
    return msg;
  }

  async getChatMessages(limit = 100): Promise<any[]> {
    const { rows } = await pool.query(
      "SELECT id, username, rank, text, flagged, report_count, created_at FROM chat_messages ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return rows.reverse().map((r) => ({
      id: r.id, username: r.username, rank: r.rank, text: r.text, flagged: r.flagged,
      reportCount: r.report_count, timestamp: r.created_at?.toISOString(),
    }));
  }

  async getChatMessage(id: string): Promise<any | null> {
    const { rows } = await pool.query("SELECT * FROM chat_messages WHERE id = $1", [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return { id: r.id, username: r.username, rank: r.rank, text: r.text, flagged: r.flagged, reportCount: r.report_count, timestamp: r.created_at?.toISOString() };
  }

  async deleteChatMessage(id: string): Promise<boolean> {
    const { rowCount } = await pool.query("DELETE FROM chat_messages WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  }

  async incrementChatReportCount(messageId: string): Promise<void> {
    await pool.query("UPDATE chat_messages SET report_count = report_count + 1 WHERE id = $1", [messageId]);
  }

  // ── Chat Reports ───────────────────────────────────────────────────────

  async addChatReport(id: string, messageId: string, reason: string, reportedBy: string): Promise<any> {
    await pool.query(
      "INSERT INTO chat_reports (id, message_id, reason, reported_by, status) VALUES ($1,$2,$3,$4,'pending')",
      [id, messageId, reason, reportedBy]
    );
    return { id, messageId, reason, reportedBy, status: "pending", timestamp: new Date().toISOString() };
  }

  async getChatReports(): Promise<any[]> {
    const { rows } = await pool.query("SELECT * FROM chat_reports ORDER BY created_at DESC");
    return rows.map((r) => ({ id: r.id, messageId: r.message_id, reason: r.reason, reportedBy: r.reported_by, status: r.status, timestamp: r.created_at?.toISOString() }));
  }

  async updateChatReport(id: string, status: string): Promise<void> {
    await pool.query("UPDATE chat_reports SET status = $1 WHERE id = $2", [status, id]);
  }

  // ── Direct Messages ────────────────────────────────────────────────────

  async sendDM(fromUserId: number, toUserId: number, fromUsername: string, toUsername: string, text: string): Promise<any> {
    const { rows } = await pool.query(
      "INSERT INTO direct_messages (from_user_id, to_user_id, from_username, to_username, text) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [fromUserId, toUserId, fromUsername, toUsername, text]
    );
    const r = rows[0];
    return { id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id, fromUsername: r.from_username, toUsername: r.to_username, text: r.text, read: r.read, createdAt: r.created_at?.toISOString() };
  }

  async getDMConversation(userId1: number, userId2: number): Promise<any[]> {
    const { rows } = await pool.query(
      "SELECT * FROM direct_messages WHERE (from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1) ORDER BY created_at ASC",
      [userId1, userId2]
    );
    return rows.map((r) => ({ id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id, fromUsername: r.from_username, toUsername: r.to_username, text: r.text, read: r.read, createdAt: r.created_at?.toISOString() }));
  }

  async getInbox(userId: number): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id))
         id, from_user_id, to_user_id, from_username, to_username, text, read, created_at
       FROM direct_messages
       WHERE from_user_id = $1 OR to_user_id = $1
       ORDER BY LEAST(from_user_id, to_user_id), GREATEST(from_user_id, to_user_id), created_at DESC`,
      [userId]
    );
    return rows.map((r) => ({ id: r.id, fromUserId: r.from_user_id, toUserId: r.to_user_id, fromUsername: r.from_username, toUsername: r.to_username, text: r.text, read: r.read, createdAt: r.created_at?.toISOString() }));
  }

  async markDMsRead(fromUserId: number, toUserId: number): Promise<void> {
    await pool.query("UPDATE direct_messages SET read = true WHERE from_user_id = $1 AND to_user_id = $2", [fromUserId, toUserId]);
  }

  async getUnreadDMCount(userId: number): Promise<number> {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS cnt FROM direct_messages WHERE to_user_id = $1 AND read = false", [userId]);
    return rows[0]?.cnt || 0;
  }

  // ── Ranks (persistent) ─────────────────────────────────────────────────

  async setUserRankInDB(username: string, rank: string): Promise<void> {
    const key = username.toLowerCase();
    if (rank === "user") {
      await pool.query("DELETE FROM user_ranks WHERE username = $1", [key]);
    } else {
      await pool.query(
        "INSERT INTO user_ranks (username, rank) VALUES ($1,$2) ON CONFLICT (username) DO UPDATE SET rank = $2, updated_at = NOW()",
        [key, rank]
      );
    }
  }

  async getUserRankFromDB(username: string): Promise<string> {
    const { rows } = await pool.query("SELECT rank FROM user_ranks WHERE username = $1", [username.toLowerCase()]);
    return rows[0]?.rank || "user";
  }

  async getAllRankedUsers(): Promise<{ username: string; rank: string }[]> {
    const { rows } = await pool.query("SELECT username, rank FROM user_ranks ORDER BY updated_at DESC");
    return rows;
  }
}

export const storage = new PgStorage();
