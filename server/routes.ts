import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { storage } from "./storage";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "games");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const gameId = (req.params as any).gameId || "unknown";
      const ext = path.extname(file.originalname);
      cb(null, `${gameId}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const sessions = new Map<string, { createdAt: number }>();

// User auth sessions (separate from admin sessions)
const USER_SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
const userSessions = new Map<string, { userId: number; username: string; createdAt: number }>();

function generateUserSessionId(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

function getUserSession(req: Request): { userId: number; username: string } | null {
  const sid = req.cookies?.userSessionId;
  if (!sid || !userSessions.has(sid)) return null;
  const session = userSessions.get(sid)!;
  if (Date.now() - session.createdAt > USER_SESSION_TIMEOUT) {
    userSessions.delete(sid);
    return null;
  }
  return { userId: session.userId, username: session.username };
}

// Rank system: "owner" > "developer" > "admin" > "user"
const userRanks: Map<string, string> = new Map([
  ["drag00nknightofficial", "owner"], // Owner rank for the site creator
]);

// Rate limiting for sensitive operations
const adminRateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

// Audit log for admin actions
const auditLog: any[] = [];

function generateSessionId(): string {
  return Math.random().toString(36).substring(7);
}

function isAuthenticated(req: Request): boolean {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId || !sessions.has(sessionId)) return false;
  
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  // Check if session has expired
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) {
    sessions.delete(sessionId);
    return false;
  }
  
  return true;
}

function getUserRank(username: string): string {
  const normalizedUsername = username.toLowerCase();
  return userRanks.get(normalizedUsername) || "user";
}

function isAdmin(username: string): boolean {
  const rank = getUserRank(username);
  return rank === "owner" || rank === "developer" || rank === "admin";
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  if (!adminRateLimit.has(identifier)) {
    adminRateLimit.set(identifier, []);
  }
  
  const timestamps = adminRateLimit.get(identifier) || [];
  // Remove timestamps outside the window
  const validTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  validTimestamps.push(now);
  adminRateLimit.set(identifier, validTimestamps);
  return true;
}

function logAuditAction(action: string, details: any): void {
  auditLog.push({
    timestamp: new Date().toISOString(),
    action,
    details,
  });
}

function requireAdminRank(req: Request, res: Response, username: string): boolean {
  if (!isAdmin(username)) {
    res.status(403).json({ error: "Unauthorized: Admin access required" });
    return false;
  }
  return true;
}

function getTemplateResponse(prompt: string, engineType: string, _code: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("enemy") || p.includes("npc")) {
    return `To add an enemy, create an object with position and movement logic:\n\n\`\`\`js\nconst enemy = { x: 100, y: 100, w: 30, h: 30, speed: 2, color: '#ef4444' };\nfunction updateEnemy() {\n  // Move toward player\n  const dx = player.x - enemy.x;\n  const dy = player.y - enemy.y;\n  const dist = Math.sqrt(dx*dx + dy*dy);\n  enemy.x += (dx/dist) * enemy.speed;\n  enemy.y += (dy/dist) * enemy.speed;\n}\n\`\`\`\nCall \`updateEnemy()\` in your update loop.`;
  }
  if (p.includes("score") || p.includes("point")) {
    return `Add a score system:\n\n\`\`\`js\nlet score = 0;\n// Draw score\nctx.fillStyle = '#fff';\nctx.font = 'bold 20px monospace';\nctx.fillText('Score: ' + score, 10, 30);\n// Increase score on collision\nscore += 10;\n\`\`\``;
  }
  if (p.includes("jump") || p.includes("gravity")) {
    return `Add jumping with gravity:\n\n\`\`\`js\nlet vy = 0;\nconst gravity = 0.5;\nconst jumpForce = -12;\nconst ground = canvas.height - 60;\n// In update:\nvy += gravity;\nplayer.y += vy;\nif (player.y >= ground) { player.y = ground; vy = 0; }\nif (keys['Space'] && player.y === ground) vy = jumpForce;\n\`\`\``;
  }
  if (p.includes("color") || p.includes("background")) {
    return `Change colors by editing the fill style values:\n\n\`\`\`js\nctx.fillStyle = '#1e1b4b'; // Dark indigo background\nctx.fillRect(0, 0, canvas.width, canvas.height);\nplayer.color = '#22d3ee'; // Cyan player\n\`\`\`\nUse hex codes like #ff0000 for red, #00ff00 for green.`;
  }
  if (p.includes("bullet") || p.includes("shoot")) {
    return `Add a shooting mechanic:\n\n\`\`\`js\nconst bullets = [];\ndocument.addEventListener('keydown', e => {\n  if (e.code === 'Space') {\n    bullets.push({ x: player.x + player.w/2, y: player.y, speed: 8 });\n  }\n});\nfunction updateBullets() {\n  bullets.forEach(b => b.y -= b.speed);\n  bullets.filter(b => b.y > 0); // Remove off-screen\n}\nfunction drawBullets() {\n  bullets.forEach(b => {\n    ctx.fillStyle = '#fbbf24';\n    ctx.fillRect(b.x - 3, b.y, 6, 12);\n  });\n}\n\`\`\``;
  }
  if (engineType === "3d" && (p.includes("light") || p.includes("shadow"))) {
    return `Add lighting to your Three.js scene:\n\n\`\`\`js\n// Ambient light (global illumination)\nconst ambient = new THREE.AmbientLight(0x404040, 0.5);\nscene.add(ambient);\n// Directional light (like sunlight)\nconst sun = new THREE.DirectionalLight(0xffffff, 1);\nsun.position.set(10, 20, 10);\nsun.castShadow = true;\nscene.add(sun);\n// Enable shadows on renderer\nrenderer.shadowMap.enabled = true;\n\`\`\``;
  }
  return `To help with "${prompt}", try breaking it down:\n1. Define the game object (position, size, color)\n2. Add update logic in your game loop\n3. Draw it in your render function\n\nFor more specific help, describe exactly what behavior you want, e.g. "make the player stop at the edges" or "add a red enemy that moves left and right".`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  // Seed the developer account on startup with a fixed join date so it never changes
  await storage.seedUser("Drag00nKnightOFFICIAL", "bloxdhop2025", "2025-01-01T00:00:00.000Z");

  // User auth endpoints
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    if (username.length < 2 || username.length > 25) {
      return res.status(400).json({ error: "Username must be between 2 and 25 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: "Username already taken" });
    }
    const user = await storage.createUser({ username, password });
    const sid = generateUserSessionId();
    userSessions.set(sid, { userId: user.id, username: user.username, createdAt: Date.now() });
    res.cookie("userSessionId", sid, { httpOnly: true, sameSite: "strict", maxAge: USER_SESSION_TIMEOUT });
    return res.json({ username: user.username, rank: getUserRank(user.username) });
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const valid = await storage.validatePassword(user, password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    const sid = generateUserSessionId();
    userSessions.set(sid, { userId: user.id, username: user.username, createdAt: Date.now() });
    res.cookie("userSessionId", sid, { httpOnly: true, sameSite: "strict", maxAge: USER_SESSION_TIMEOUT });
    return res.json({ username: user.username, rank: getUserRank(user.username) });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const sid = req.cookies?.userSessionId;
    if (sid) userSessions.delete(sid);
    res.clearCookie("userSessionId");
    return res.json({ success: true });
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const profile = storage.getProfile(session.userId);
    return res.json({ username: session.username, rank: getUserRank(session.username), isPremium: profile.isPremium });
  });

  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
      const sessionId = generateSessionId();
      sessions.set(sessionId, { createdAt: Date.now() });
      // Set cookie without expiration to avoid session loss on browser close
      res.cookie("sessionId", sessionId, { httpOnly: true, secure: true, sameSite: "strict" });
      logAuditAction("admin_login", { timestamp: new Date().toISOString() });
      res.json({ success: true });
    } else {
      logAuditAction("admin_login_failed", { timestamp: new Date().toISOString() });
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
      logAuditAction("admin_logout", { timestamp: new Date().toISOString() });
    }
    res.clearCookie("sessionId");
    res.json({ success: true });
  });

  app.get("/api/user/rank/:username", (req: Request, res: Response) => {
    const { username } = req.params;
    const rank = getUserRank(username);
    res.json({ username, rank });
  });

  app.get("/api/profile/:username", async (req: Request, res: Response) => {
    const { username } = req.params;
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(404).json({ error: "User not found" });
    const rank = getUserRank(user.username);
    const joinedAt = storage.getUserJoinDate(user.id);
    const profile = storage.getProfile(user.id);
    const publicGames = storage.getGamesByUser(user.id).filter((g) => g.isPublic);
    return res.json({
      username: user.username,
      rank,
      joinedAt,
      bio: profile.bio,
      avatarColor: profile.avatarColor,
      isPremium: profile.isPremium,
      publicGameCount: publicGames.length,
    });
  });

  app.get("/api/user/banned/:username", (req: Request, res: Response) => {
    const { username } = req.params;
    const normalizedUsername = username.toLowerCase();
    const isBanned = bannedUsers.has(normalizedUsername);
    res.json({ username, isBanned });
  });

  app.get("/api/admin/stats", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const stats = {
      totalUsers: storage.getUserCount(),
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

    const { adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: "Invalid admin password. Sensitive actions require password confirmation." });
    }

    const { gameId } = req.params;
    const game = games.get(gameId);
    if (game) {
      games.delete(gameId);
      logAuditAction("delete_game", { gameId, title: game.title });
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

    const sessionId = req.cookies?.sessionId || "";
    if (!checkRateLimit(`ban-user-${sessionId}`)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const { username, reason, adminPassword } = req.body;
    if (!username || !reason) {
      return res.status(400).json({ error: "Username and reason required" });
    }

    // Verify admin password for sensitive action
    if (adminPassword !== ADMIN_PASSWORD) {
      logAuditAction("ban_user_unauthorized_attempt", { targetUser: username });
      return res.status(403).json({ error: "Invalid admin password. Sensitive actions require password confirmation." });
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
    logAuditAction("ban_user", { targetUser: username, reason });
    res.json({ bannedUser });
  });

  app.post("/api/admin/unban-user/:userId", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const sessionId = req.cookies?.sessionId || "";
    if (!checkRateLimit(`unban-user-${sessionId}`)) {
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    const { adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) {
      return res.status(403).json({ error: "Invalid admin password. Sensitive actions require password confirmation." });
    }

    const { userId } = req.params;
    const userToUnban = Array.from(bannedUsers.values()).find(u => u.id === userId);
    if (userToUnban) {
      const normalizedUsername = userToUnban.username.toLowerCase();
      bannedUsers.delete(normalizedUsername);
      logAuditAction("unban_user", { targetUser: userToUnban.username });
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

  // Serve uploaded game files for download
  app.get("/api/admin/games/:gameId/download/:filename", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, path.basename(filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    res.download(filePath);
  });

  // Upload a real game file and register it as a new version
  app.post("/api/admin/games/:gameId/upload", upload.single("file"), (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });

    const { gameId } = req.params;
    const { versionNumber } = req.body as { versionNumber?: string };

    if (!versionNumber) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Version number required" });
    }

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const game = games.get(gameId);
    if (!game) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: "Game not found" });
    }

    const newVersion = {
      versionNumber,
      uploadedAt: new Date().toISOString(),
      size: req.file.size,
      isActive: false,
      filename: req.file.filename,
      originalName: req.file.originalname,
    };

    game.versions.push(newVersion);
    logAuditAction("upload_game_file", { gameId, versionNumber, filename: req.file.filename, size: req.file.size });
    return res.json({ game });
  });

  app.get("/api/chat/messages", (req: Request, res: Response) => {
    res.json({ messages: chatMessages });
  });

  app.delete("/api/chat/messages/:messageId", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    if (!isAdmin(session.username)) return res.status(403).json({ error: "Developer or admin access required" });
    const { messageId } = req.params;
    const idx = chatMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) return res.status(404).json({ error: "Message not found" });
    chatMessages.splice(idx, 1);
    logAuditAction("delete_chat_message", { messageId, deletedBy: session.username });
    return res.json({ success: true });
  });

  app.get("/api/admin/chat/users", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const users = new Map<string, any>();
    chatMessages.forEach((msg) => {
      const normalizedUsername = msg.username.toLowerCase();
      if (!users.has(normalizedUsername)) {
        users.set(normalizedUsername, {
          username: msg.username,
          messageCount: 0,
          lastMessageAt: msg.timestamp,
          isBanned: bannedUsers.has(normalizedUsername),
        });
      }
      const user = users.get(normalizedUsername);
      user.messageCount += 1;
      user.lastMessageAt = msg.timestamp;
    });

    res.json({ users: Array.from(users.values()) });
  });

  app.post("/api/chat/messages", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) {
      return res.status(401).json({ error: "You must be logged in to send messages" });
    }

    const { text } = req.body;
    const username = session.username;

    if (!text) {
      return res.status(400).json({ error: "Message text required" });
    }

    const normalizedUsername = username.toLowerCase();
    if (bannedUsers.has(normalizedUsername)) {
      return res.status(403).json({ error: "User is banned" });
    }

    const flagged = containsSwearWords(text);

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      username,
      rank: getUserRank(username),
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

  // ── Profile / Settings ────────────────────────────────────────────────
  app.get("/api/settings", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const profile = storage.getProfile(session.userId);
    return res.json(profile);
  });

  app.put("/api/settings", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const { bio, avatarColor } = req.body;
    const updates: any = {};
    if (typeof bio === "string") updates.bio = bio.slice(0, 300);
    if (typeof avatarColor === "string" && /^#[0-9a-fA-F]{6}$/.test(avatarColor)) updates.avatarColor = avatarColor;
    const profile = storage.updateProfile(session.userId, updates);
    return res.json(profile);
  });

  // ── User-created Games ─────────────────────────────────────────────────
  app.post("/api/games", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const { title, description, engineType, code } = req.body;
    if (!title || !engineType) return res.status(400).json({ error: "Title and engine type required" });
    if (!["2d", "2.5d", "3d"].includes(engineType)) return res.status(400).json({ error: "Invalid engine type" });
    const game = storage.createGame({
      title: String(title).slice(0, 60),
      description: String(description || "").slice(0, 300),
      engineType,
      code: String(code || ""),
      isPublic: false,
      authorId: session.userId,
      authorUsername: session.username,
    });
    logAuditAction("create_game", { gameId: game.id, title: game.title, author: session.username });
    return res.json({ game });
  });

  app.get("/api/games/public", (_req: Request, res: Response) => {
    const games = storage.getPublicGames().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json({ games });
  });

  app.get("/api/games/my", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const games = storage.getGamesByUser(session.userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return res.json({ games });
  });

  app.get("/api/games/:gameId", (req: Request, res: Response) => {
    const game = storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    const session = getUserSession(req);
    if (!game.isPublic && (!session || session.userId !== game.authorId) && !isAdmin(session?.username || "")) {
      return res.status(403).json({ error: "Game is private" });
    }
    return res.json({ game });
  });

  app.put("/api/games/:gameId", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.authorId !== session.userId && !isAdmin(session.username)) {
      return res.status(403).json({ error: "Not your game" });
    }
    const { title, description, code } = req.body;
    const updates: any = {};
    if (typeof title === "string") updates.title = title.slice(0, 60);
    if (typeof description === "string") updates.description = description.slice(0, 300);
    if (typeof code === "string") updates.code = code;
    const updated = storage.updateGame(req.params.gameId, updates);
    return res.json({ game: updated });
  });

  app.post("/api/games/:gameId/publish", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.authorId !== session.userId && !isAdmin(session.username)) {
      return res.status(403).json({ error: "Not your game" });
    }
    const isPublic = req.body.isPublic !== false;
    const updated = storage.updateGame(req.params.gameId, { isPublic });
    // Grant premium on first publish
    let premiumGranted = false;
    if (isPublic) {
      const profile = storage.getProfile(session.userId);
      if (!profile.isPremium) {
        storage.grantPremium(session.userId);
        premiumGranted = true;
        logAuditAction("premium_granted", { username: session.username, reason: "first_publish" });
      }
    }
    return res.json({ game: updated, premiumGranted });
  });

  app.delete("/api/games/:gameId", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.authorId !== session.userId && !isAdmin(session.username)) {
      return res.status(403).json({ error: "Not your game" });
    }
    storage.deleteGame(req.params.gameId);
    logAuditAction("delete_user_game", { gameId: req.params.gameId, title: game.title, by: session.username });
    return res.json({ success: true });
  });

  // ── AI Game Assistant ─────────────────────────────────────────────────
  const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

  app.post("/api/ai/assist", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });

    const allowed = storage.incrementAiUsage(session.userId);
    if (!allowed) {
      const profile = storage.getProfile(session.userId);
      const limit = profile.isPremium ? 50 : 5;
      return res.status(429).json({ error: `Daily AI limit reached (${limit}/day). ${!profile.isPremium ? "Publish a game to unlock Premium and get 50 requests/day!" : ""}` });
    }

    const { prompt, code, engineType } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });

    if (openai) {
      try {
        const systemPrompt = `You are a game development assistant for the GameNexus platform. You help users write HTML5 game code.
The game engine is "${engineType}" (${engineType === "3d" ? "Three.js based" : engineType === "2.5d" ? "isometric canvas" : "2D canvas"}).
The game code is a complete standalone HTML file. Keep responses concise and focused.
When asked to add or modify code, return ONLY the complete updated HTML, no explanations.
When asked a question, answer briefly and helpfully.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Current code:\n\`\`\`html\n${code || "(no code yet)"}\n\`\`\`\n\nRequest: ${prompt}` },
          ],
          max_tokens: 2000,
        });
        const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";
        return res.json({ reply, usedAI: true });
      } catch (err: any) {
        console.error("OpenAI error:", err.message);
        // Fall through to template response
      }
    }

    // Template-based fallback
    const reply = getTemplateResponse(prompt, engineType, code);
    return res.json({ reply, usedAI: false });
  });

  app.get("/api/ai/status", (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const profile = storage.getProfile(session.userId);
    const today = new Date().toDateString();
    const usage = profile.aiUsageDate === today ? profile.aiUsageToday : 0;
    const limit = profile.isPremium ? 50 : 5;
    return res.json({ usage, limit, isPremium: profile.isPremium, hasOpenAI: !!openai });
  });

  app.get("/api/admin/audit-log", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    res.json({ auditLog: auditLog.slice(-100) }); // Return last 100 actions
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
