import bcrypt from "bcryptjs";
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

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser, joinedAt?: string): Promise<User>;
  getUserJoinDate(id: number): string;
  getUserCount(): number;

  // Games
  createGame(game: Omit<UserGame, "id" | "createdAt" | "updatedAt">): UserGame;
  getGame(id: string): UserGame | undefined;
  updateGame(id: string, updates: Partial<UserGame>): UserGame | undefined;
  deleteGame(id: string): boolean;
  getGamesByUser(authorId: number): UserGame[];
  getPublicGames(): UserGame[];

  getAllUsers(): User[];

  // Profiles
  getProfile(userId: number): UserProfile;
  updateProfile(userId: number, updates: Partial<UserProfile>): UserProfile;
  grantPremium(userId: number): UserProfile;
  incrementAiUsage(userId: number): boolean; // returns false if limit hit
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private joinDates: Map<number, string>;
  private games: Map<string, UserGame>;
  private profiles: Map<number, UserProfile>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.joinDates = new Map();
    this.games = new Map();
    this.profiles = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const lower = username.toLowerCase();
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === lower,
    );
  }

  async createUser(insertUser: InsertUser, joinedAt?: string): Promise<User> {
    const id = this.currentId++;
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = { ...insertUser, password: hashedPassword, id };
    this.users.set(id, user);
    this.joinDates.set(id, joinedAt || new Date().toISOString());
    return user;
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

  getUserJoinDate(id: number): string {
    return this.joinDates.get(id) || new Date().toISOString();
  }

  getUserCount(): number {
    return this.users.size;
  }

  // Games
  createGame(game: Omit<UserGame, "id" | "createdAt" | "updatedAt">): UserGame {
    const id = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newGame: UserGame = { ...game, id, createdAt: now, updatedAt: now };
    this.games.set(id, newGame);
    return newGame;
  }

  getGame(id: string): UserGame | undefined {
    return this.games.get(id);
  }

  updateGame(id: string, updates: Partial<UserGame>): UserGame | undefined {
    const game = this.games.get(id);
    if (!game) return undefined;
    const updated = { ...game, ...updates, updatedAt: new Date().toISOString() };
    this.games.set(id, updated);
    return updated;
  }

  deleteGame(id: string): boolean {
    return this.games.delete(id);
  }

  getGamesByUser(authorId: number): UserGame[] {
    return Array.from(this.games.values()).filter((g) => g.authorId === authorId);
  }

  getPublicGames(): UserGame[] {
    return Array.from(this.games.values()).filter((g) => g.isPublic);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Profiles
  getProfile(userId: number): UserProfile {
    if (!this.profiles.has(userId)) {
      const user = this.users.get(userId);
      const profile: UserProfile = {
        userId,
        username: user?.username || "",
        bio: "",
        avatarColor: "#7c3aed",
        isPremium: false,
        aiUsageToday: 0,
        aiUsageDate: new Date().toDateString(),
      };
      this.profiles.set(userId, profile);
    }
    return this.profiles.get(userId)!;
  }

  updateProfile(userId: number, updates: Partial<UserProfile>): UserProfile {
    const profile = this.getProfile(userId);
    const updated = { ...profile, ...updates };
    this.profiles.set(userId, updated);
    return updated;
  }

  grantPremium(userId: number): UserProfile {
    return this.updateProfile(userId, {
      isPremium: true,
      premiumGrantedAt: new Date().toISOString(),
    });
  }

  incrementAiUsage(userId: number): boolean {
    const profile = this.getProfile(userId);
    const today = new Date().toDateString();
    const dailyLimit = profile.isPremium ? 50 : 5;

    if (profile.aiUsageDate !== today) {
      this.updateProfile(userId, { aiUsageToday: 1, aiUsageDate: today });
      return true;
    }

    if (profile.aiUsageToday >= dailyLimit) return false;

    this.updateProfile(userId, { aiUsageToday: profile.aiUsageToday + 1 });
    return true;
  }
}

export const storage = new MemStorage();
