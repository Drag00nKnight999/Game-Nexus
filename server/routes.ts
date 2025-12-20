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

  return httpServer;
}
