import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { injectGameCSP } from "../lib/gameCSP";
import {
  ArrowLeft, Save, Globe, Lock, Play, Bot, Send, X, Code2, Layers, Box,
  Zap, Share2, History, Clock, RotateCcw, Tag, CheckCircle2
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

type EngineType = "2d" | "2.5d" | "3d";

const DEFAULT_CODE: Record<EngineType, string> = {
  "2d": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>My 2D Game</title>
<style>
  body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; }
  canvas { border: 2px solid #334155; border-radius: 8px; }
</style>
</head>
<body>
<canvas id="c" width="640" height="480"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const player = { x: 300, y: 400, w: 32, h: 32, speed: 4, color: '#818cf8' };
  const keys = {};
  let score = 0;
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup',  e => { keys[e.code] = false; });
  function update() {
    if (keys['ArrowLeft']  || keys['KeyA']) player.x -= player.speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += player.speed;
    if (keys['ArrowUp']    || keys['KeyW']) player.y -= player.speed;
    if (keys['ArrowDown']  || keys['KeyS']) player.y += player.speed;
    player.x = Math.max(0, Math.min(canvas.width  - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
    score++;
  }
  function draw() {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('Score: ' + score, 10, 28);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px monospace';
    ctx.fillText('WASD / Arrow keys to move', 10, canvas.height - 14);
  }
  function loop() { update(); draw(); requestAnimationFrame(loop); }
  loop();
</script>
</body>
</html>`,

  "2.5d": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>My 2.5D Game</title>
<style>
  body { margin: 0; background: #0f172a; display: flex; align-items: center; justify-content: center; height: 100vh; }
  canvas { border: 2px solid #334155; border-radius: 8px; }
</style>
</head>
<body>
<canvas id="c" width="640" height="480"></canvas>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  function toIso(x, y) { return { x: (x - y) * 32 + canvas.width / 2, y: (x + y) * 16 + 80 }; }
  const map = [];
  for (let r = 0; r < 8; r++) { map[r] = []; for (let c = 0; c < 8; c++) map[r][c] = 1; }
  function drawTile(row, col) {
    const { x, y } = toIso(col, row);
    ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(x + 32, y); ctx.lineTo(x, y + 16); ctx.lineTo(x - 32, y); ctx.closePath();
    ctx.fillStyle = '#1e3a5f'; ctx.fill(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 1; ctx.stroke();
  }
  const player = { row: 3, col: 3 };
  document.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft'  || e.code === 'KeyA') player.col = Math.max(0, player.col - 1);
    if (e.code === 'ArrowRight' || e.code === 'KeyD') player.col = Math.min(7, player.col + 1);
    if (e.code === 'ArrowUp'    || e.code === 'KeyW') player.row = Math.max(0, player.row - 1);
    if (e.code === 'ArrowDown'  || e.code === 'KeyS') player.row = Math.min(7, player.row + 1);
  });
  function drawPlayer() {
    const { x, y } = toIso(player.col, player.row);
    ctx.fillStyle = '#818cf8'; ctx.beginPath(); ctx.arc(x, y - 24, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c7d2fe'; ctx.lineWidth = 2; ctx.stroke();
  }
  function loop() {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) drawTile(r, c);
    drawPlayer();
    ctx.fillStyle = '#94a3b8'; ctx.font = '13px monospace'; ctx.fillText('WASD / Arrow keys to move', 10, canvas.height - 14);
    requestAnimationFrame(loop);
  }
  loop();
</script>
</body>
</html>`,

  "3d": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>My 3D Game</title>
<style>body { margin: 0; overflow: hidden; background: #0f172a; }</style>
<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>
</head>
<body>
<script>
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);
  scene.fog = new THREE.Fog(0x0f172a, 20, 60);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 8, 16); camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0x334155, 1));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(10, 20, 10); sun.castShadow = true; scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshLambertMaterial({ color: 0x1e293b }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const player = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x818cf8 }));
  player.position.set(0, 0.5, 0); player.castShadow = true; scene.add(player);
  const keys = {};
  document.addEventListener('keydown', e => keys[e.code] = true);
  document.addEventListener('keyup',   e => keys[e.code] = false);
  const speed = 0.08;
  function animate() {
    requestAnimationFrame(animate);
    if (keys['ArrowLeft']  || keys['KeyA']) player.position.x -= speed;
    if (keys['ArrowRight'] || keys['KeyD']) player.position.x += speed;
    if (keys['ArrowUp']    || keys['KeyW']) player.position.z -= speed;
    if (keys['ArrowDown']  || keys['KeyS']) player.position.z += speed;
    camera.position.set(player.position.x, player.position.y + 8, player.position.z + 16);
    camera.lookAt(player.position);
    renderer.render(scene, camera);
  }
  animate();
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  });
</script>
</body>
</html>`,
};

interface ChatMsg { role: "user" | "ai"; content: string; }
interface GameVersion { id: number; title: string; description: string; savedAt: string; }

export default function GameEditor() {
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();
  const { username, isPremium } = useAuth();

  const [title, setTitle] = useState("Untitled Game");
  const [description, setDescription] = useState("");
  const [engineType, setEngineType] = useState<EngineType>("2d");
  const [code, setCode] = useState(DEFAULT_CODE["2d"]);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedGameId, setLoadedGameId] = useState<string | null>(gameId || null);
  const [previewKey, setPreviewKey] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Autosave
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const lastSavedCode = useRef(code);
  const lastSavedTitle = useRef(title);

  // Version history
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<GameVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // AI
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<ChatMsg[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ usage: number; limit: number; isPremium: boolean } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setAiStatus(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/games/${gameId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.game) return;
        const g = d.game;
        setTitle(g.title);
        setDescription(g.description || "");
        setEngineType(g.engineType);
        setCode(g.code || DEFAULT_CODE[g.engineType as EngineType]);
        setIsPublic(g.isPublic);
        setLoadedGameId(g.id);
        setTags(g.tags || []);
        lastSavedCode.current = g.code || "";
        lastSavedTitle.current = g.title;
      })
      .catch(() => {});
  }, [gameId]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Track dirty state
  useEffect(() => {
    const dirty = code !== lastSavedCode.current || title !== lastSavedTitle.current;
    setIsDirty(dirty);
    if (dirty) setAutoSaveStatus("idle");
  }, [code, title]);

  // Autosave every 2 minutes
  useEffect(() => {
    if (!loadedGameId) return;
    const interval = setInterval(() => {
      if (isDirty) {
        performSave(true);
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadedGameId, isDirty, code, title, description, tags]);

  const handleEngineChange = (e: EngineType) => {
    setEngineType(e);
    if (!loadedGameId) setCode(DEFAULT_CODE[e]);
  };

  const performSave = useCallback(async (isAutosave = false) => {
    if (!isAutosave) setSaving(true);
    else setAutoSaveStatus("saving");
    try {
      if (loadedGameId) {
        const res = await fetch(`/api/games/${loadedGameId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, code, tags }),
        });
        if (res.ok) {
          // Save a version snapshot
          await fetch(`/api/games/${loadedGameId}/versions`, { method: "POST" });
          lastSavedCode.current = code;
          lastSavedTitle.current = title;
          setIsDirty(false);
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 3000);
        } else if (!isAutosave) {
          const d = await res.json();
          alert(d.error || "Save failed");
        }
      } else {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, engineType, code, tags }),
        });
        if (res.ok) {
          const d = await res.json();
          setLoadedGameId(d.game.id);
          lastSavedCode.current = code;
          lastSavedTitle.current = title;
          setIsDirty(false);
          navigate(`/editor/${d.game.id}`, { replace: true });
        } else {
          const d = await res.json();
          if (!isAutosave) alert(d.error || "Create failed");
        }
      }
    } finally {
      if (!isAutosave) setSaving(false);
    }
  }, [loadedGameId, title, description, code, tags, engineType, navigate]);

  const handleSave = () => performSave(false);

  const handlePublishToggle = async () => {
    if (!loadedGameId) { alert("Save your game first!"); return; }
    const res = await fetch(`/api/games/${loadedGameId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !isPublic }),
    });
    if (res.ok) {
      const d = await res.json();
      setIsPublic(d.game.isPublic);
      if (d.premiumGranted) alert("🎉 You've unlocked Premium by publishing your first game!");
    }
  };

  const loadVersionHistory = async () => {
    if (!loadedGameId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/games/${loadedGameId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    loadVersionHistory();
  };

  const handleRestoreVersion = async (versionId: number) => {
    if (!loadedGameId) return;
    if (!confirm("Restore this version? Your current code will be replaced.")) return;
    const res = await fetch(`/api/games/${loadedGameId}/versions/${versionId}/restore`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setCode(data.game.code);
      setTitle(data.game.title);
      setDescription(data.game.description || "");
      lastSavedCode.current = data.game.code;
      lastSavedTitle.current = data.game.title;
      setIsDirty(false);
      setShowHistory(false);
      alert("Version restored!");
    } else {
      alert("Failed to restore version.");
    }
  };

  const handleAiSend = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const prompt = aiInput.trim();
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, code, engineType }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setAiMessages((prev) => [...prev, { role: "ai", content: data.error || "Daily limit reached." }]);
      } else if (res.ok) {
        const reply: string = data.reply || "";
        setAiMessages((prev) => [...prev, { role: "ai", content: reply }]);
        if (reply.includes("<!DOCTYPE html") || reply.includes("<html")) {
          const cleaned = reply.replace(/```html\s*/gi, "").replace(/```\s*/gi, "").trim();
          setCode(cleaned);
        }
        setAiStatus((prev) => prev ? { ...prev, usage: prev.usage + 1 } : prev);
      }
    } catch {
      setAiMessages((prev) => [...prev, { role: "ai", content: "Network error. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (tag && tags.length < 5 && !tags.includes(tag)) {
        setTags([...tags, tag]);
        setIsDirty(true);
      }
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
      setIsDirty(true);
    }
  };

  const removeTag = (tag: string) => { setTags(tags.filter((t) => t !== tag)); setIsDirty(true); };

  const engineIcons: Record<EngineType, JSX.Element> = {
    "2d": <Layers size={14} />,
    "2.5d": <Code2 size={14} />,
    "3d": <Box size={14} />,
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-white font-semibold text-base focus:outline-none border-b border-transparent focus:border-gray-500 transition-colors"
          placeholder="Game title..."
        />

        {/* Autosave indicator */}
        {loadedGameId && (
          <span className={`text-xs flex items-center gap-1 ${autoSaveStatus === "saved" ? "text-green-400" : autoSaveStatus === "saving" ? "text-yellow-400" : isDirty ? "text-gray-500" : "text-gray-600"}`}>
            {autoSaveStatus === "saved" ? <><CheckCircle2 size={11} />Saved</> :
             autoSaveStatus === "saving" ? <><Clock size={11} className="animate-spin" />Saving...</> :
             isDirty ? "Unsaved changes" : ""}
          </span>
        )}

        {/* Engine selector */}
        <div className="flex gap-1 bg-gray-700 rounded-lg p-1">
          {(["2d", "2.5d", "3d"] as EngineType[]).map((e) => (
            <button
              key={e}
              onClick={() => handleEngineChange(e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${engineType === e ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {engineIcons[e]}{e.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          onClick={() => { setPreviewKey((k) => k + 1); setShowPreview(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-green-400 rounded-lg text-sm transition-colors"
        >
          <Play size={15} />Run
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save size={15} />{saving ? "Saving..." : "Save"}
        </button>
        {loadedGameId && (
          <>
            <button
              onClick={handlePublishToggle}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${isPublic ? "bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600" : "bg-green-600/20 text-green-300 border-green-600/40 hover:bg-green-600/40"}`}
            >
              {isPublic ? <Lock size={15} /> : <Globe size={15} />}
              {isPublic ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={handleShowHistory}
              title="Version history"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
            >
              <History size={15} />
            </button>
          </>
        )}
        {isPublic && loadedGameId && (
          <Link to={`/play/${loadedGameId}`} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 text-blue-300 border border-blue-600/40 rounded-lg text-sm hover:bg-blue-600/40 transition-colors">
            <Share2 size={15} />
          </Link>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code editor */}
        <div className="flex flex-col flex-1 min-w-0">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 bg-gray-900 text-gray-200 font-mono text-sm p-4 resize-none focus:outline-none border-r border-gray-700"
            style={{ tabSize: 2 }}
            placeholder="Write your game code here..."
          />
          {/* Bottom bar: description + tags */}
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 space-y-2">
            <input
              type="text"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
              placeholder="Short description (shown publicly)..."
              className="w-full bg-transparent text-gray-400 text-sm focus:outline-none placeholder-gray-600"
              maxLength={300}
            />
            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <Tag size={13} className="text-gray-500 flex-shrink-0" />
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 border border-purple-500/30 rounded text-purple-300 text-xs">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-white ml-0.5"><X size={10} /></button>
                </span>
              ))}
              {tags.length < 5 && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={tags.length === 0 ? "Add tags (comma/Enter)..." : "Add tag..."}
                  className="bg-transparent text-gray-400 text-xs focus:outline-none placeholder-gray-600 min-w-24"
                  maxLength={20}
                />
              )}
              <span className="text-gray-600 text-xs ml-auto">{tags.length}/5 tags</span>
            </div>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="w-1/2 flex flex-col border-l border-gray-700 bg-gray-900">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
              <span className="text-gray-400 text-xs font-medium">Preview</span>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <iframe key={previewKey} className="flex-1 w-full" srcDoc={injectGameCSP(code)} sandbox="allow-scripts" title="Game Preview" />
          </div>
        )}

        {/* Version history panel */}
        {showHistory && (
          <div className="w-72 flex flex-col border-l border-gray-700 bg-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <span className="text-white font-medium text-sm flex items-center gap-2"><History size={15} />Version History</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {historyLoading ? (
                <p className="text-gray-500 text-sm text-center py-6">Loading...</p>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Clock size={32} className="text-gray-600 mx-auto" />
                  <p className="text-gray-500 text-sm">No saved versions yet.</p>
                  <p className="text-gray-600 text-xs">Versions are saved automatically when you save your game.</p>
                </div>
              ) : (
                versions.map((v) => (
                  <div key={v.id} className="bg-gray-700/60 border border-gray-600 rounded-xl p-3 space-y-2">
                    <div>
                      <p className="text-white text-sm font-medium truncate">{v.title}</p>
                      <p className="text-gray-500 text-xs">{new Date(v.savedAt).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(v.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 rounded-lg text-xs w-full justify-center transition-colors"
                    >
                      <RotateCcw size={12} />Restore this version
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant button */}
      <button
        onClick={() => setAiOpen((v) => !v)}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg font-medium transition-colors z-50"
      >
        <Bot size={18} />
        AI Help
        {aiStatus && <span className="text-xs opacity-70">{aiStatus.usage}/{aiStatus.limit}</span>}
      </button>

      {/* AI Chat Drawer */}
      {aiOpen && (
        <div className="fixed bottom-0 right-0 w-96 h-2/3 bg-gray-800 border border-gray-700 rounded-tl-2xl shadow-2xl flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-purple-400" />
              <span className="text-white font-semibold text-sm">AI Game Assistant</span>
              {aiStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${aiStatus.isPremium ? "bg-yellow-500/20 text-yellow-300" : "bg-gray-700 text-gray-400"}`}>
                  {aiStatus.usage}/{aiStatus.limit}/day
                  {aiStatus.isPremium && <Zap size={10} className="inline ml-0.5" />}
                </span>
              )}
            </div>
            <button onClick={() => setAiOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {aiMessages.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-8">
                Ask the AI to add features, fix bugs, or explain concepts.<br />
                <span className="text-gray-600 text-xs mt-2 block">Try: "Add an enemy", "Add a score system", "Make the background dark blue"</span>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words ${msg.role === "user" ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-200"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-gray-400 px-3 py-2 rounded-xl text-sm animate-pulse">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-gray-700 p-3 flex gap-2">
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAiSend(); } }}
              placeholder="Ask the AI for help..."
              className="flex-1 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
            />
            <button
              onClick={handleAiSend}
              disabled={aiLoading || !aiInput.trim()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
