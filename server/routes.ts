import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const sessions = new Set<string>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(7);
}

function isAuthenticated(req: Request): boolean {
  const sessionId = req.cookies?.sessionId;
  return sessionId && sessions.has(sessionId) ? true : false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
      const sessionId = generateSessionId();
      sessions.add(sessionId);
      res.cookie("sessionId", sessionId, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.clearCookie("sessionId");
    res.json({ success: true });
  });

  app.get("/api/admin/stats", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const stats = {
      totalUsers: 0,
      totalGames: 4,
      totalPlays: 0,
    };

    const gameStats = [
      { title: "Snake", plays: 0, averageTime: 0 },
      { title: "Memory Match", plays: 0, averageTime: 0 },
      { title: "Platformer", plays: 0, averageTime: 0 },
      { title: "Bloxd.io (Scratch Edition)", plays: 0, averageTime: 0 },
    ];

    res.json({ stats, gameStats });
  });

  const games: Map<string, any> = new Map([
    ["snake", { id: "snake", title: "Snake", currentVersion: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 50, versions: [{ versionNumber: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 50, isActive: true }] }],
    ["memory", { id: "memory", title: "Memory Match", currentVersion: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 40, versions: [{ versionNumber: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 40, isActive: true }] }],
    ["platformer", { id: "platformer", title: "Platformer", currentVersion: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 80, versions: [{ versionNumber: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 80, isActive: true }] }],
    ["bloxd", { id: "bloxd", title: "Bloxd.io (Scratch Edition)", currentVersion: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 1024 * 50, versions: [{ versionNumber: "1.0.0", uploadedAt: new Date().toISOString(), size: 1024 * 1024 * 50, isActive: true }] }],
  ]);

  const bannedUsers: Map<string, any> = new Map();
  const chatMessages: any[] = [];
  const chatReports: any[] = [];
  
  const swearWords = new Set([
    "damn", "hell", "crap", "piss", "bastard", "bitch", "ass", "asshole",
    "shit", "fuck", "fucked", "fucking", "cunt", "cock", "dick", "pussy",
    "whore", "slut", "motherfucker", "goddamn", "jackass", "dipshit",
    "arsehole", "bollocks", "bugger", "arse", "twat", "wanker",
  ]);

  const containsSwearWords = (text: string): boolean => {
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => {
      const cleanWord = word.replace(/[^a-z]/g, "");
      return swearWords.has(cleanWord);
    });
  };

  app.get("/api/admin/games", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({ games: Array.from(games.values()) });
  });

  app.delete("/api/admin/games/:gameId", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { gameId } = req.params;
    if (games.has(gameId)) {
      games.delete(gameId);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Game not found" });
    }
  });

  app.get("/api/admin/banned-users", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({ bannedUsers: Array.from(bannedUsers.values()) });
  });

  app.post("/api/admin/ban-user", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { username, reason } = req.body;
    if (!username || !reason) {
      return res.status(400).json({ error: "Username and reason required" });
    }

    const normalizedUsername = username.toLowerCase();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const bannedUser = {
      id: userId,
      username,
      reason,
      bannedAt: new Date().toISOString(),
      bannedBy: "admin",
    };

    bannedUsers.set(normalizedUsername, bannedUser);
    res.json({ bannedUser });
  });

  app.post("/api/admin/unban-user/:userId", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { userId } = req.params;
    const userToUnban = Array.from(bannedUsers.values()).find(u => u.id === userId);
    if (userToUnban) {
      const normalizedUsername = userToUnban.username.toLowerCase();
      bannedUsers.delete(normalizedUsername);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/admin/games/:gameId/version", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { gameId } = req.params;
    const { versionNumber } = req.body;

    if (!versionNumber) {
      return res.status(400).json({ error: "Version number required" });
    }

    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const newVersion = {
      versionNumber,
      uploadedAt: new Date().toISOString(),
      size: Math.floor(Math.random() * 100000000),
      isActive: false,
    };

    game.versions.push(newVersion);
    res.json({ game });
  });

  app.post("/api/admin/games/:gameId/version/:versionNumber/activate", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { gameId, versionNumber } = req.params;

    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    game.versions.forEach((v: any) => {
      v.isActive = v.versionNumber === versionNumber;
    });

    game.currentVersion = versionNumber;
    res.json({ game });
  });

  app.get("/api/chat/messages", (req: Request, res: Response) => {
    res.json({ messages: chatMessages });
  });

  app.post("/api/chat/messages", (req: Request, res: Response) => {
    const { username, text } = req.body;

    if (!username || !text) {
      return res.status(400).json({ error: "Username and text required" });
    }

    const normalizedUsername = username.toLowerCase();
    if (bannedUsers.has(normalizedUsername)) {
      return res.status(403).json({ error: "User is banned" });
    }

    const flagged = containsSwearWords(text);

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      username,
      text,
      timestamp: new Date().toISOString(),
      flagged,
    };

    chatMessages.push(message);
    res.json({ message });
  });

  app.get("/api/chat/reports", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const reportsWithMessages = chatReports.map((report) => ({
      ...report,
      message: chatMessages.find((msg) => msg.id === report.messageId),
    }));

    res.json({ reports: reportsWithMessages });
  });

  app.post("/api/chat/reports", (req: Request, res: Response) => {
    const { messageId, reason, reportedBy } = req.body;

    if (!messageId || !reason || !reportedBy) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const message = chatMessages.find((msg) => msg.id === messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      messageId,
      reason,
      reportedBy,
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    chatReports.push(report);

    message.reported = true;
    message.reportCount = (message.reportCount || 0) + 1;

    res.json({ report });
  });

  app.post("/api/admin/chat/reports/:reportId/action", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { reportId } = req.params;
    const { action, banUser } = req.body;

    const report = chatReports.find((r) => r.id === reportId);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    report.status = action;

    if (action === "delete_message") {
      const messageIndex = chatMessages.findIndex((msg) => msg.id === report.messageId);
      if (messageIndex !== -1) {
        chatMessages.splice(messageIndex, 1);
      }
    }

    if (banUser) {
      const message = chatMessages.find((msg) => msg.id === report.messageId);
      if (message) {
        const normalizedUsername = message.username.toLowerCase();
        bannedUsers.set(normalizedUsername, { 
          id: `user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          username: message.username,
          bannedAt: new Date().toISOString() 
        });
      }
    }

    res.json({ report });
  });

  return httpServer;
}
