import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
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
  limits: { fileSize: 500 * 1024 * 1024 },
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_TIMEOUT = 30 * 60 * 1000;
const sessions = new Map<string, { createdAt: number }>();
const USER_SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000;
const userSessions = new Map<string, { userId: number; username: string; createdAt: number }>();

const adminRateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_MINUTE = 10;
const auditLog: any[] = [];

// Login brute-force protection: max 10 attempts per 15 minutes per IP
const loginAttempts = new Map<string, number[]>();
const LOGIN_WINDOW = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 10;
function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = (loginAttempts.get(ip) || []).filter(t => now - t < LOGIN_WINDOW);
  if (attempts.length >= MAX_LOGIN_ATTEMPTS) return false;
  attempts.push(now);
  loginAttempts.set(ip, attempts);
  return true;
}

// Play-count rate limit: max 1 increment per gameId per IP per hour
const playCountLog = new Map<string, number>();
function checkPlayRateLimit(gameId: string, ip: string): boolean {
  const key = `${gameId}::${ip}`;
  const last = playCountLog.get(key) || 0;
  if (Date.now() - last < 60 * 60 * 1000) return false;
  playCountLog.set(key, Date.now());
  return true;
}

// DM rate limit: max 20 messages per user per minute
const dmRateLimit = new Map<number, number[]>();
function checkDMRateLimit(userId: number): boolean {
  const now = Date.now();
  const times = (dmRateLimit.get(userId) || []).filter(t => now - t < 60 * 1000);
  if (times.length >= 20) return false;
  times.push(now);
  dmRateLimit.set(userId, times);
  return true;
}

// Periodic cleanup of all in-memory rate-limit Maps to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [k, times] of loginAttempts) {
    if (times.every(t => now - t > LOGIN_WINDOW)) loginAttempts.delete(k);
  }
  for (const [k, ts] of adminRateLimit) {
    if (ts.every(t => now - t > RATE_LIMIT_WINDOW)) adminRateLimit.delete(k);
  }
  for (const [k, ts] of playCountLog) {
    if (now - ts > 2 * 60 * 60 * 1000) playCountLog.delete(k);
  }
  for (const [k, times] of dmRateLimit) {
    if (times.every(t => now - t > 60 * 1000)) dmRateLimit.delete(k);
  }
  for (const [sid, s] of userSessions) {
    if (now - s.createdAt > USER_SESSION_TIMEOUT) userSessions.delete(sid);
  }
}, 30 * 60 * 1000); // run every 30 minutes

function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}
function generateUserSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getUserSession(req: Request): { userId: number; username: string } | null {
  const sid = req.cookies?.userSessionId;
  if (!sid || !userSessions.has(sid)) return null;
  const session = userSessions.get(sid)!;
  if (Date.now() - session.createdAt > USER_SESSION_TIMEOUT) { userSessions.delete(sid); return null; }
  return { userId: session.userId, username: session.username };
}

function isAuthenticated(req: Request): boolean {
  const sessionId = req.cookies?.sessionId;
  if (!sessionId || !sessions.has(sessionId)) return false;
  const session = sessions.get(sessionId);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TIMEOUT) { sessions.delete(sessionId); return false; }
  return true;
}

// Rank helpers — owner always hardcoded; rest from DB
async function getUserRank(username: string): Promise<string> {
  if (username.toLowerCase() === "drag00nknightofficial") return "owner";
  return storage.getUserRankFromDB(username);
}
async function isAdmin(username: string): Promise<boolean> {
  const rank = await getUserRank(username);
  return rank === "owner" || rank === "developer" || rank === "admin";
}
async function isOwner(username: string): Promise<boolean> {
  return username.toLowerCase() === "drag00nknightofficial";
}
async function isDeveloperOrAbove(username: string): Promise<boolean> {
  const rank = await getUserRank(username);
  return rank === "owner" || rank === "developer";
}

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  if (!adminRateLimit.has(identifier)) adminRateLimit.set(identifier, []);
  const timestamps = (adminRateLimit.get(identifier) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW);
  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) return false;
  timestamps.push(now);
  adminRateLimit.set(identifier, timestamps);
  return true;
}

function logAuditAction(action: string, details: any): void {
  auditLog.push({ timestamp: new Date().toISOString(), action, details });
}

function getTemplateResponse(prompt: string, engineType: string, _code: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("enemy") || p.includes("npc")) return `To add an enemy, create an object with position and movement logic:\n\`\`\`js\nconst enemy = { x: 100, y: 100, w: 30, h: 30, speed: 2, color: '#ef4444' };\nfunction updateEnemy() {\n  const dx = player.x - enemy.x;\n  const dy = player.y - enemy.y;\n  const dist = Math.sqrt(dx*dx + dy*dy);\n  enemy.x += (dx/dist) * enemy.speed;\n  enemy.y += (dy/dist) * enemy.speed;\n}\n\`\`\`\nCall updateEnemy() in your update loop.`;
  if (p.includes("score") || p.includes("point")) return `Add a score system:\n\`\`\`js\nlet score = 0;\nctx.fillStyle = '#fff';\nctx.font = 'bold 20px monospace';\nctx.fillText('Score: ' + score, 10, 30);\nscore += 10;\n\`\`\``;
  if (p.includes("jump") || p.includes("gravity")) return `Add jumping with gravity:\n\`\`\`js\nlet vy = 0;\nconst gravity = 0.5;\nconst jumpForce = -12;\nconst ground = canvas.height - 60;\nvy += gravity;\nplayer.y += vy;\nif (player.y >= ground) { player.y = ground; vy = 0; }\nif (keys['Space'] && player.y === ground) vy = jumpForce;\n\`\`\``;
  return `To help with "${prompt}", try breaking it down:\n1. Define the game object (position, size, color)\n2. Add update logic in your game loop\n3. Draw it in your render function`;
}

const swearWords = new Set(["damn","hell","crap","piss","bastard","bitch","ass","asshole","shit","fuck","fucked","fucking","cunt","cock","dick","pussy","whore","slut","motherfucker","goddamn","jackass","dipshit","arsehole","bollocks","bugger","arse","twat","wanker"]);
const containsSwearWords = (text: string): boolean => text.toLowerCase().split(/\s+/).some(word => swearWords.has(word.replace(/[^a-z]/g, "")));

const ACHIEVEMENT_DEFS: Record<string, { label: string; description: string; icon: string }> = {
  first_game:  { label: "Game Creator",   description: "Created your first game",       icon: "🎮" },
  publisher:   { label: "Publisher",       description: "Published your first game",     icon: "🌍" },
  popular:     { label: "Fan Favorite",    description: "Received 10+ likes on a game",  icon: "⭐" },
  veteran:     { label: "Veteran",         description: "Member for 30+ days",           icon: "🏅" },
  social:      { label: "Influencer",      description: "Gained 10+ followers",          icon: "👥" },
  commenter:   { label: "Commentator",     description: "Left your first comment",       icon: "💬" },
};

// Admin panel featured games (in-memory, static)
const adminGames: Map<string, any> = new Map([
  ["snake",    { id:"snake",    title:"Snake",                     currentVersion:"1.0.0", uploadedAt: new Date().toISOString(), size:1024*50,      versions:[{versionNumber:"1.0.0",uploadedAt:new Date().toISOString(),size:1024*50,      isActive:true}] }],
  ["memory",   { id:"memory",   title:"Memory Match",              currentVersion:"1.0.0", uploadedAt: new Date().toISOString(), size:1024*40,      versions:[{versionNumber:"1.0.0",uploadedAt:new Date().toISOString(),size:1024*40,      isActive:true}] }],
  ["platformer",{id:"platformer",title:"Platformer",               currentVersion:"1.0.0", uploadedAt: new Date().toISOString(), size:1024*80,      versions:[{versionNumber:"1.0.0",uploadedAt:new Date().toISOString(),size:1024*80,      isActive:true}] }],
  ["bloxd",    { id:"bloxd",    title:"Bloxd.io (Scratch Edition)",currentVersion:"1.0.0", uploadedAt: new Date().toISOString(), size:1024*1024*50, versions:[{versionNumber:"1.0.0",uploadedAt:new Date().toISOString(),size:1024*1024*50, isActive:true}] }],
]);

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use(cookieParser());

  // Seed owner account + rank (password from env, never hardcoded in production)
  const ownerPassword = process.env.OWNER_PASSWORD || "bloxdhop2025";
  await storage.seedUser("Drag00nKnightOFFICIAL", ownerPassword, "2025-01-01T00:00:00.000Z");
  await storage.setUserRankInDB("drag00nknightofficial", "owner");

  // ── WebSocket Chat ─────────────────────────────────────────────────────
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/chat" });
  const wsClients = new Set<WebSocket>();
  wss.on("connection", (ws) => {
    wsClients.add(ws);
    ws.on("close", () => wsClients.delete(ws));
    ws.on("error", () => wsClients.delete(ws));
  });
  const broadcast = (data: any) => {
    const str = JSON.stringify(data);
    wsClients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(str); });
  };

  // ── Auth ───────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    if (!checkLoginRateLimit(ip)) return res.status(429).json({ error: "Too many attempts. Please wait 15 minutes." });
    const { username, password, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    if (username.length < 2 || username.length > 25) return res.status(400).json({ error: "Username must be 2–25 characters" });
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: "Username may only contain letters, numbers, and underscores" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Invalid email address" });
    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Username already taken" });
    const user = await storage.createUser({ username, password, email: email || undefined });
    const rank = await getUserRank(user.username);
    const sid = generateUserSessionId();
    userSessions.set(sid, { userId: user.id, username: user.username, createdAt: Date.now() });
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("userSessionId", sid, { httpOnly: true, sameSite: "strict", secure: isProduction, maxAge: USER_SESSION_TIMEOUT });
    // Veteran achievement check handled on profile load
    return res.json({ username: user.username, rank });
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    if (!checkLoginRateLimit(ip)) return res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes." });
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ error: "Invalid username or password" });
    const valid = await storage.validatePassword(user, password);
    if (!valid) return res.status(401).json({ error: "Invalid username or password" });
    const rank = await getUserRank(user.username);
    const profile = await storage.getProfile(user.id);
    const sid = generateUserSessionId();
    userSessions.set(sid, { userId: user.id, username: user.username, createdAt: Date.now() });
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("userSessionId", sid, { httpOnly: true, sameSite: "strict", secure: isProd, maxAge: USER_SESSION_TIMEOUT });
    return res.json({ username: user.username, rank, isPremium: profile.isPremium });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const sid = req.cookies?.userSessionId;
    if (sid) userSessions.delete(sid);
    res.clearCookie("userSessionId");
    return res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const rank = await getUserRank(session.username);
    const profile = await storage.getProfile(session.userId);
    const unreadDMs = await storage.getUnreadDMCount(session.userId);
    return res.json({ username: session.username, rank, isPremium: profile.isPremium, unreadDMs });
  });

  // ── Admin auth ─────────────────────────────────────────────────────────
  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body;
    if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
      const sessionId = generateSessionId();
      sessions.set(sessionId, { createdAt: Date.now() });
      res.cookie("sessionId", sessionId, { httpOnly: true, secure: true, sameSite: "strict" });
      logAuditAction("admin_login", { timestamp: new Date().toISOString() });
      return res.json({ success: true });
    }
    logAuditAction("admin_login_failed", { timestamp: new Date().toISOString() });
    return res.status(401).json({ error: "Invalid password" });
  });

  app.post("/api/admin/logout", (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) { sessions.delete(sessionId); logAuditAction("admin_logout", {}); }
    res.clearCookie("sessionId");
    return res.json({ success: true });
  });

  // ── Profile & Settings ─────────────────────────────────────────────────
  app.get("/api/profile/:username", async (req: Request, res: Response) => {
    const { username } = req.params;
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(404).json({ error: "User not found" });
    const rank = await getUserRank(user.username);
    const joinedAt = await storage.getUserJoinDate(user.id);
    const profile = await storage.getProfile(user.id);
    const publicGames = await storage.getGamesByUser(user.id);
    const achievements = await storage.getAchievements(user.id);
    const followerCount = await storage.getFollowerCount(user.id);
    const followingCount = await storage.getFollowingCount(user.id);
    // Check veteran achievement
    const joined = new Date(joinedAt);
    const daysSinceJoin = (Date.now() - joined.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceJoin >= 30) await storage.grantAchievement(user.id, "veteran");
    return res.json({
      username: user.username, rank, joinedAt, bio: profile.bio, avatarColor: profile.avatarColor,
      isPremium: profile.isPremium, publicGameCount: publicGames.filter(g => g.isPublic).length,
      publicGames: publicGames.filter(g => g.isPublic).slice(0, 12).map(({ code: _code, ...g }) => g),
      achievements: achievements.map(a => ({ ...a, ...(ACHIEVEMENT_DEFS[a.type] || { label: a.type, description: "", icon: "🏆" }) })),
      followerCount, followingCount,
    });
  });

  app.get("/api/settings", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const profile = await storage.getProfile(session.userId);
    const email = await storage.getUserEmail(session.userId);
    return res.json({ ...profile, email });
  });

  app.put("/api/settings", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const { bio, avatarColor, email } = req.body;
    const updates: any = {};
    if (typeof bio === "string") updates.bio = bio.slice(0, 300);
    if (typeof avatarColor === "string" && /^#[0-9a-fA-F]{6}$/.test(avatarColor)) updates.avatarColor = avatarColor;
    const profile = await storage.updateProfile(session.userId, updates);
    // Update email only if provided and valid (owner exempt from requirement)
    if (typeof email === "string") {
      if (email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await storage.setUserEmail(session.userId, email);
      }
    }
    return res.json(profile);
  });

  // ── User rank ──────────────────────────────────────────────────────────
  app.get("/api/user/rank/:username", async (req: Request, res: Response) => {
    const rank = await getUserRank(req.params.username);
    return res.json({ username: req.params.username, rank });
  });

  app.get("/api/user/banned/:username", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const isBanned = await storage.isBanned(req.params.username);
    return res.json({ username: req.params.username, isBanned });
  });

  // ── Follows ────────────────────────────────────────────────────────────
  app.post("/api/follow/:username", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const targetUser = await storage.getUserByUsername(req.params.username);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.id === session.userId) return res.status(400).json({ error: "Cannot follow yourself" });
    await storage.follow(session.userId, targetUser.id);
    // Social achievement
    const count = await storage.getFollowerCount(targetUser.id);
    if (count >= 10) await storage.grantAchievement(targetUser.id, "social");
    return res.json({ success: true, following: true });
  });

  app.delete("/api/follow/:username", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const targetUser = await storage.getUserByUsername(req.params.username);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    await storage.unfollow(session.userId, targetUser.id);
    return res.json({ success: true, following: false });
  });

  app.get("/api/follow/:username/status", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.json({ following: false });
    const targetUser = await storage.getUserByUsername(req.params.username);
    if (!targetUser) return res.json({ following: false });
    const following = await storage.isFollowing(session.userId, targetUser.id);
    return res.json({ following });
  });

  // ── Direct Messages ────────────────────────────────────────────────────
  app.get("/api/messages", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const inbox = await storage.getInbox(session.userId);
    return res.json({ inbox });
  });

  app.get("/api/messages/:username", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const other = await storage.getUserByUsername(req.params.username);
    if (!other) return res.status(404).json({ error: "User not found" });
    await storage.markDMsRead(other.id, session.userId);
    const messages = await storage.getDMConversation(session.userId, other.id);
    return res.json({ messages });
  });

  app.post("/api/messages/:username", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    if (!checkDMRateLimit(session.userId)) return res.status(429).json({ error: "Sending too fast. Please slow down." });
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Message text required" });
    const other = await storage.getUserByUsername(req.params.username);
    if (!other) return res.status(404).json({ error: "User not found" });
    if (other.id === session.userId) return res.status(400).json({ error: "Cannot message yourself" });
    const dm = await storage.sendDM(session.userId, other.id, session.username, other.username, text.trim().slice(0, 1000));
    return res.json({ message: dm });
  });

  app.get("/api/messages/unread/count", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const count = await storage.getUnreadDMCount(session.userId);
    return res.json({ count });
  });

  // ── Games ──────────────────────────────────────────────────────────────
  const MAX_CODE_SIZE = 2 * 1024 * 1024; // 2 MB

  app.post("/api/games", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const { title, description, engineType, code, tags, thumbnail } = req.body;
    if (!title || !engineType) return res.status(400).json({ error: "Title and engine type required" });
    if (!["2d", "2.5d", "3d"].includes(engineType)) return res.status(400).json({ error: "Invalid engine type" });
    if (typeof code === "string" && Buffer.byteLength(code, "utf8") > MAX_CODE_SIZE) {
      return res.status(400).json({ error: "Game code exceeds 2 MB limit" });
    }
    const parsedTags = Array.isArray(tags) ? tags.slice(0, 5).map((t: string) => String(t).slice(0, 20)) : [];
    const thumbUrl = typeof thumbnail === "string" && thumbnail && isValidHttpUrl(thumbnail) ? thumbnail : null;
    const game = await storage.createGame({
      title: String(title).slice(0, 60), description: String(description || "").slice(0, 300),
      engineType, code: String(code || ""), isPublic: false,
      authorId: session.userId, authorUsername: session.username,
      tags: parsedTags, thumbnail: thumbUrl,
      likeCount: 0, playCount: 0,
    });
    logAuditAction("create_game", { gameId: game.id, title: game.title, author: session.username });
    // First game achievement
    const myGames = await storage.getGamesByUser(session.userId);
    if (myGames.length === 1) await storage.grantAchievement(session.userId, "first_game");
    return res.json({ game });
  });

  app.get("/api/games/public", async (_req: Request, res: Response) => {
    const games = (await storage.getPublicGames()).map(({ code: _code, ...g }) => g);
    return res.json({ games });
  });

  app.get("/api/games/my", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const games = await storage.getGamesByUser(session.userId);
    return res.json({ games });
  });

  app.get("/api/games/:gameId", async (req: Request, res: Response) => {
    const game = await storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    const session = getUserSession(req);
    const adminCheck = session ? await isAdmin(session.username) : false;
    if (!game.isPublic && (!session || session.userId !== game.authorId) && !adminCheck) {
      return res.status(403).json({ error: "Game is private" });
    }
    return res.json({ game });
  });

  app.put("/api/games/:gameId", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = await storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    const adminCheck = await isAdmin(session.username);
    if (game.authorId !== session.userId && !adminCheck) return res.status(403).json({ error: "Not your game" });
    const { title, description, code, tags, thumbnail } = req.body;
    const updates: any = {};
    if (typeof title === "string") updates.title = title.slice(0, 60);
    if (typeof description === "string") updates.description = description.slice(0, 300);
    if (typeof code === "string") {
      if (Buffer.byteLength(code, "utf8") > MAX_CODE_SIZE) {
        return res.status(400).json({ error: "Game code exceeds 2 MB limit" });
      }
      updates.code = code;
    }
    if (Array.isArray(tags)) updates.tags = tags.slice(0, 5).map((t: string) => String(t).slice(0, 20));
    if (thumbnail !== undefined) {
      updates.thumbnail = typeof thumbnail === "string" && thumbnail && isValidHttpUrl(thumbnail) ? thumbnail : null;
    }
    const updated = await storage.updateGame(req.params.gameId, updates);
    return res.json({ game: updated });
  });

  app.post("/api/games/:gameId/publish", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = await storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    const adminCheck = await isAdmin(session.username);
    if (game.authorId !== session.userId && !adminCheck) return res.status(403).json({ error: "Not your game" });
    const isPublic = req.body.isPublic !== false;
    const updated = await storage.updateGame(req.params.gameId, { isPublic });
    let premiumGranted = false;
    if (isPublic) {
      const profile = await storage.getProfile(session.userId);
      if (!profile.isPremium) {
        await storage.grantPremium(session.userId);
        premiumGranted = true;
        logAuditAction("premium_granted", { username: session.username, reason: "first_publish" });
      }
      await storage.grantAchievement(session.userId, "publisher");
    }
    return res.json({ game: updated, premiumGranted });
  });

  app.delete("/api/games/:gameId", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = await storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    const adminCheck = await isAdmin(session.username);
    if (game.authorId !== session.userId && !adminCheck) return res.status(403).json({ error: "Not your game" });
    await storage.deleteGame(req.params.gameId);
    logAuditAction("delete_user_game", { gameId: req.params.gameId, title: game.title, by: session.username });
    return res.json({ success: true });
  });

  // ── Game Likes ─────────────────────────────────────────────────────────
  app.post("/api/games/:gameId/like", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = await storage.getGame(req.params.gameId);
    if (!game || !game.isPublic) return res.status(404).json({ error: "Game not found" });
    const alreadyLiked = await storage.hasLiked(session.userId, req.params.gameId);
    if (alreadyLiked) {
      await storage.unlikeGame(session.userId, req.params.gameId);
      const updated = await storage.getGame(req.params.gameId);
      return res.json({ liked: false, likeCount: updated?.likeCount || 0 });
    }
    await storage.likeGame(session.userId, req.params.gameId);
    const updated = await storage.getGame(req.params.gameId);
    // Popular achievement for author
    if ((updated?.likeCount || 0) >= 10) await storage.grantAchievement(game.authorId, "popular");
    return res.json({ liked: true, likeCount: updated?.likeCount || 0 });
  });

  app.get("/api/games/:gameId/like", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.json({ liked: false });
    const liked = await storage.hasLiked(session.userId, req.params.gameId);
    return res.json({ liked });
  });

  // ── Play Count ─────────────────────────────────────────────────────────
  app.post("/api/games/:gameId/play", async (req: Request, res: Response) => {
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
    if (checkPlayRateLimit(req.params.gameId, ip)) {
      await storage.incrementPlayCount(req.params.gameId).catch(() => {});
    }
    return res.json({ success: true });
  });

  // ── Comments ───────────────────────────────────────────────────────────
  app.get("/api/games/:gameId/comments", async (req: Request, res: Response) => {
    const comments = await storage.getComments(req.params.gameId);
    return res.json({ comments });
  });

  app.post("/api/games/:gameId/comments", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: "Comment text required" });
    const game = await storage.getGame(req.params.gameId);
    if (!game || !game.isPublic) return res.status(404).json({ error: "Game not found" });
    const comment = await storage.addComment(req.params.gameId, session.userId, session.username, text.trim().slice(0, 500));
    // Commentator achievement — grant on first-ever comment (across all games)
    const alreadyHas = await storage.hasAchievement(session.userId, "commenter");
    if (!alreadyHas) await storage.grantAchievement(session.userId, "commenter");
    return res.json({ comment });
  });

  app.delete("/api/games/:gameId/comments/:commentId", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const adminCheck = await isAdmin(session.username);
    const game = await storage.getGame(req.params.gameId);
    const isGameOwner = game && game.authorId === session.userId;
    if (!adminCheck && !isGameOwner) return res.status(403).json({ error: "Not authorized to delete this comment" });
    await storage.deleteComment(Number(req.params.commentId));
    return res.json({ success: true });
  });

  // ── Game Reports ───────────────────────────────────────────────────────
  app.post("/api/games/:gameId/report", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Reason required" });
    const report = await storage.reportGame(req.params.gameId, session.username, reason);
    return res.json({ report });
  });

  // ── Version History ────────────────────────────────────────────────────
  app.post("/api/games/:gameId/versions", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = await storage.getGame(req.params.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    if (game.authorId !== session.userId) return res.status(403).json({ error: "Not your game" });
    const version = await storage.saveGameVersion(req.params.gameId, game.code, game.title, game.description);
    return res.json({ version });
  });

  app.get("/api/games/:gameId/versions", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = await storage.getGame(req.params.gameId);
    if (!game || game.authorId !== session.userId) return res.status(403).json({ error: "Not your game" });
    const versions = await storage.getGameVersions(req.params.gameId);
    return res.json({ versions });
  });

  app.post("/api/games/:gameId/versions/:versionId/restore", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const game = await storage.getGame(req.params.gameId);
    if (!game || game.authorId !== session.userId) return res.status(403).json({ error: "Not your game" });
    const version = await storage.getGameVersion(Number(req.params.versionId));
    if (!version) return res.status(404).json({ error: "Version not found" });
    const updated = await storage.updateGame(req.params.gameId, { code: version.code, title: version.title, description: version.description });
    return res.json({ game: updated });
  });

  // ── Chat (REST fallback) ───────────────────────────────────────────────
  app.get("/api/chat/messages", async (_req: Request, res: Response) => {
    const messages = await storage.getChatMessages(100);
    return res.json({ messages });
  });

  app.post("/api/chat/messages", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "You must be logged in to send messages" });
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Message text required" });
    if (text.length > 500) return res.status(400).json({ error: "Message must be 500 characters or fewer" });
    if (await storage.isBanned(session.username)) return res.status(403).json({ error: "User is banned" });
    const flagged = containsSwearWords(text);
    const rank = await getUserRank(session.username);
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      username: session.username, rank, text, flagged,
    };
    await storage.saveChatMessage(message);
    const fullMsg = { ...message, timestamp: new Date().toISOString(), reportCount: 0 };
    broadcast({ type: "message", message: fullMsg });
    return res.json({ message: fullMsg });
  });

  app.delete("/api/chat/messages/:messageId", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    if (!(await isAdmin(session.username))) return res.status(403).json({ error: "Moderator access required" });
    const msg = await storage.getChatMessage(req.params.messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if ((await isOwner(msg.username)) && !(await isOwner(session.username))) {
      return res.status(403).json({ error: "Only the owner can delete the owner's messages." });
    }
    await storage.deleteChatMessage(req.params.messageId);
    broadcast({ type: "delete", messageId: req.params.messageId });
    logAuditAction("delete_chat_message", { messageId: req.params.messageId, deletedBy: session.username });
    return res.json({ success: true });
  });

  app.post("/api/chat/reports", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const { messageId, reason } = req.body;
    if (!messageId || !reason) return res.status(400).json({ error: "Missing required fields" });
    const msg = await storage.getChatMessage(messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    const id = `report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const report = await storage.addChatReport(id, messageId, reason, session.username);
    await storage.incrementChatReportCount(messageId);
    return res.json({ report });
  });

  app.get("/api/chat/reports", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const reports = await storage.getChatReports();
    return res.json({ reports });
  });

  app.get("/api/admin/chat/users", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const messages = await storage.getChatMessages(500);
    const userMap = new Map<string, any>();
    const bannedSet = new Set((await storage.getBannedUsers()).map((u: any) => u.username.toLowerCase()));
    for (const msg of messages) {
      const key = msg.username.toLowerCase();
      if (!userMap.has(key)) userMap.set(key, { username: msg.username, messageCount: 0, lastMessageAt: msg.timestamp, isBanned: bannedSet.has(key) });
      const u = userMap.get(key)!;
      u.messageCount++;
      u.lastMessageAt = msg.timestamp;
    }
    return res.json({ users: Array.from(userMap.values()) });
  });

  // ── Admin stats & games ────────────────────────────────────────────────
  app.get("/api/admin/stats", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const totalUsers = await storage.getUserCount();
    const publicGames = await storage.getPublicGames();
    const stats = { totalUsers, totalGames: 4 + publicGames.length, totalPlays: publicGames.reduce((s, g) => s + g.playCount, 0) };
    const gameStats = [
      { title: "Snake", plays: 0, averageTime: 0 }, { title: "Memory Match", plays: 0, averageTime: 0 },
      { title: "Platformer", plays: 0, averageTime: 0 }, { title: "Bloxd.io (Scratch Edition)", plays: 0, averageTime: 0 },
    ];
    return res.json({ stats, gameStats });
  });

  app.get("/api/admin/games", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    return res.json({ games: Array.from(adminGames.values()) });
  });

  app.delete("/api/admin/games/:gameId", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const { adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) return res.status(403).json({ error: "Invalid admin password." });
    const { gameId } = req.params;
    if (adminGames.has(gameId)) {
      adminGames.delete(gameId);
      logAuditAction("delete_game", { gameId });
      return res.json({ success: true });
    }
    // Try user games
    const userGame = await storage.getGame(gameId);
    if (userGame) {
      await storage.deleteGame(gameId);
      logAuditAction("delete_user_game_admin", { gameId });
      return res.json({ success: true });
    }
    return res.status(404).json({ error: "Game not found" });
  });

  app.post("/api/admin/games/:gameId/version", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const { gameId } = req.params;
    const { versionNumber } = req.body;
    if (!versionNumber) return res.status(400).json({ error: "Version number required" });
    const game = adminGames.get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    game.versions.push({ versionNumber, uploadedAt: new Date().toISOString(), size: 0, isActive: false });
    return res.json({ game });
  });

  app.post("/api/admin/games/:gameId/version/:versionNumber/activate", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const { gameId, versionNumber } = req.params;
    const game = adminGames.get(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    game.versions.forEach((v: any) => { v.isActive = v.versionNumber === versionNumber; });
    game.currentVersion = versionNumber;
    return res.json({ game });
  });

  app.post("/api/admin/games/:gameId/upload", upload.single("file"), (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const { gameId } = req.params;
    const { versionNumber } = req.body as { versionNumber?: string };
    if (!versionNumber) { if (req.file) fs.unlinkSync(req.file.path); return res.status(400).json({ error: "Version number required" }); }
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const game = adminGames.get(gameId);
    if (!game) { fs.unlinkSync(req.file.path); return res.status(404).json({ error: "Game not found" }); }
    game.versions.push({ versionNumber, uploadedAt: new Date().toISOString(), size: req.file.size, isActive: false, filename: req.file.filename, originalName: req.file.originalname });
    logAuditAction("upload_game_file", { gameId, versionNumber, size: req.file.size });
    return res.json({ game });
  });

  app.get("/api/admin/games/:gameId/download/:filename", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const filePath = path.join(UPLOADS_DIR, path.basename(req.params.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    return res.download(filePath);
  });

  // ── Admin: Bans ────────────────────────────────────────────────────────
  app.get("/api/admin/banned-users", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const bannedUsers = await storage.getBannedUsers();
    return res.json({ bannedUsers });
  });

  app.post("/api/admin/ban-user", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const sessionId = req.cookies?.sessionId || "";
    if (!checkRateLimit(`ban-user-${sessionId}`)) return res.status(429).json({ error: "Too many requests." });
    const { username, reason, adminPassword } = req.body;
    if (!username || !reason) return res.status(400).json({ error: "Username and reason required" });
    if (adminPassword !== ADMIN_PASSWORD) return res.status(403).json({ error: "Invalid admin password." });
    if (await isOwner(username)) return res.status(403).json({ error: "The owner account cannot be banned." });
    const session = getUserSession(req);
    const requesterRank = session ? await getUserRank(session.username) : "user";
    if ((await getUserRank(username)) === "developer" && requesterRank !== "owner") {
      return res.status(403).json({ error: "Only the owner can ban developer-ranked accounts." });
    }
    const id = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const bannedUser = await storage.banUser(id, username, reason, session?.username || "admin");
    logAuditAction("ban_user", { targetUser: username, reason, bannedBy: session?.username });
    return res.json({ bannedUser });
  });

  app.post("/api/admin/unban-user/:userId", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    if (!checkRateLimit(`unban-${req.cookies?.sessionId || ""}`)) return res.status(429).json({ error: "Too many requests." });
    const { adminPassword } = req.body;
    if (adminPassword !== ADMIN_PASSWORD) return res.status(403).json({ error: "Invalid admin password." });
    const ok = await storage.unbanById(req.params.userId);
    if (!ok) return res.status(404).json({ error: "User not found" });
    logAuditAction("unban_user", { userId: req.params.userId });
    return res.json({ success: true });
  });

  // ── Admin: Rank Management ─────────────────────────────────────────────
  app.get("/api/admin/ranked-users", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    if (!(await isOwner(session.username))) return res.status(403).json({ error: "Owner access required" });
    const allUsers = await storage.getAllUsers();
    const result = await Promise.all(allUsers.map(async (u: any) => ({
      id: u.id, username: u.username,
      rank: await getUserRank(u.username),
      joinedAt: await storage.getUserJoinDate(u.id),
    })));
    return res.json({ users: result });
  });

  app.post("/api/admin/set-rank", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    if (!(await isOwner(session.username))) return res.status(403).json({ error: "Only the owner can change developer ranks." });
    const { username, rank } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    if (!["developer", "admin", "user"].includes(rank)) return res.status(400).json({ error: "Invalid rank." });
    if (await isOwner(username)) return res.status(403).json({ error: "Cannot change the owner's rank." });
    await storage.setUserRankInDB(username.toLowerCase(), rank);
    logAuditAction("set_rank", { targetUser: username, newRank: rank, by: session.username });
    return res.json({ success: true, username, rank });
  });

  // ── Admin: Chat Reports ────────────────────────────────────────────────
  app.post("/api/admin/chat/reports/:reportId/action", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const { reportId } = req.params;
    const { action, banUser: shouldBan } = req.body;
    await storage.updateChatReport(reportId, action);
    if (action === "delete_message") {
      const reports = await storage.getChatReports();
      const report = reports.find((r: any) => r.id === reportId);
      if (report) {
        const msg = await storage.getChatMessage(report.messageId);
        if (msg) { await storage.deleteChatMessage(report.messageId); broadcast({ type: "delete", messageId: report.messageId }); }
      }
    }
    if (shouldBan) {
      const reports = await storage.getChatReports();
      const report = reports.find((r: any) => r.id === reportId);
      if (report) {
        const msg = await storage.getChatMessage(report.messageId);
        if (msg) await storage.banUser(`user_${Date.now()}`, msg.username, "Chat report", "admin");
      }
    }
    return res.json({ success: true });
  });

  // ── Admin: Game Reports ────────────────────────────────────────────────
  app.get("/api/admin/game-reports", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    const reports = await storage.getGameReports();
    return res.json({ reports });
  });

  app.post("/api/admin/game-reports/:id/resolve", async (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    await storage.resolveGameReport(Number(req.params.id), req.body.status || "resolved");
    return res.json({ success: true });
  });

  // ── Admin: Audit Log ───────────────────────────────────────────────────
  app.get("/api/admin/audit-log", (req: Request, res: Response) => {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Not authenticated" });
    return res.json({ auditLog: auditLog.slice(-100) });
  });

  // ── AI Assistant ───────────────────────────────────────────────────────
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  app.post("/api/ai/assist", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const allowed = await storage.incrementAiUsage(session.userId);
    if (!allowed) {
      const profile = await storage.getProfile(session.userId);
      const limit = profile.isPremium ? 50 : 5;
      return res.status(429).json({ error: `Daily AI limit reached (${limit}/day). ${!profile.isPremium ? "Publish a game to unlock Premium and get 50 requests/day!" : ""}` });
    }
    const { prompt, code, engineType } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt required" });
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are a game development assistant for GameNexus. You help users write HTML5 game code. Engine: "${engineType}". Return ONLY complete HTML when asked to modify code.` },
            { role: "user", content: `Current code:\n\`\`\`html\n${code || "(no code yet)"}\n\`\`\`\n\nRequest: ${prompt}` },
          ],
          max_tokens: 2000,
        });
        return res.json({ reply: completion.choices[0]?.message?.content || "No response.", usedAI: true });
      } catch (err: any) { console.error("OpenAI error:", err.message); }
    }
    return res.json({ reply: getTemplateResponse(prompt, engineType, code), usedAI: false });
  });

  app.get("/api/ai/status", async (req: Request, res: Response) => {
    const session = getUserSession(req);
    if (!session) return res.status(401).json({ error: "Not authenticated" });
    const profile = await storage.getProfile(session.userId);
    const today = new Date().toDateString();
    const usage = profile.aiUsageDate === today ? profile.aiUsageToday : 0;
    const limit = profile.isPremium ? 50 : 5;
    return res.json({ usage, limit, isPremium: profile.isPremium, hasOpenAI: !!openai });
  });

  return httpServer;
}
