import bcrypt from "bcryptjs";
import { type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserJoinDate(id: number): string;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private joinDates: Map<number, string>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.joinDates = new Map();
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
}

export const storage = new MemStorage();
