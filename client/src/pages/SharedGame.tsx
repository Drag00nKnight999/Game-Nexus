import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Lock, Crown, Code2, Shield, Zap, Layers, Box } from "lucide-react";

interface UserGame {
  id: string;
  title: string;
  description: string;
  engineType: "2d" | "2.5d" | "3d";
  isPublic: boolean;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
  code: string;
}

const ENGINE_LABELS: Record<string, string> = {
  "2d": "2D Canvas",
  "2.5d": "2.5D Isometric",
  "3d": "3D (Three.js)",
};

const RANK_BADGE: Record<string, { label: string; bg: string; text: string; icon: JSX.Element }> = {
  owner: { label: "OWNER", bg: "bg-yellow-500/20", text: "text-yellow-300", icon: <Crown size={11} /> },
  developer: { label: "DEV", bg: "bg-purple-600/20", text: "text-purple-300", icon: <Code2 size={11} /> },
  admin: { label: "ADMIN", bg: "bg-orange-500/20", text: "text-orange-300", icon: <Shield size={11} /> },
};

export default function SharedGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const [game, setGame] = useState<UserGame | null>(null);
  const [authorRank, setAuthorRank] = useState<string>("user");
  const [authorPremium, setAuthorPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/games/${gameId}`)
      .then((r) => r.ok ? r.json() : r.json().then((d: any) => Promise.reject(d.error || "Not found")))
      .then((d) => {
        setGame(d.game);
        // Load author profile
        return fetch(`/api/profile/${d.game.authorUsername}`);
      })
      .then((r) => r.ok ? r.json() : null)
      .then((p) => {
        if (p) { setAuthorRank(p.rank || "user"); setAuthorPremium(p.isPremium || false); }
      })
      .catch((e) => setError(typeof e === "string" ? e : "Game not found"))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading game...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">{error || "Game not found"}</p>
        <Link to="/" className="text-purple-400 hover:underline">Return home</Link>
      </div>
    );
  }

  const badge = RANK_BADGE[authorRank];
  const engineIcon = game.engineType === "3d" ? <Box size={13} /> : game.engineType === "2.5d" ? <Code2 size={13} /> : <Layers size={13} />;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
          <span className="text-white font-semibold">{game.title}</span>
          <button onClick={() => setFullscreen(false)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm">
            Exit Fullscreen
          </button>
        </div>
        <iframe
          className="flex-1 w-full"
          srcDoc={game.code}
          sandbox="allow-scripts"
          title={game.title}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">{game.title}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-gray-400 text-xs">by</span>
              <Link to={`/profile/${game.authorUsername}`} className="text-purple-400 hover:underline text-sm font-medium">
                {game.authorUsername}
              </Link>
              {badge && (
                <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ${badge.bg} ${badge.text}`}>
                  {badge.icon}
                  {badge.label}
                </span>
              )}
              {authorPremium && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-xs font-semibold border border-yellow-500/30">
                  <Zap size={10} />
                  Premium
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {engineIcon}
                {ENGINE_LABELS[game.engineType]}
              </span>
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Globe size={10} />
                Public
              </span>
            </div>
          </div>
          <button
            onClick={() => setFullscreen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Fullscreen
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {game.description && (
          <p className="text-gray-300 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">{game.description}</p>
        )}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden" style={{ height: "70vh" }}>
          <iframe
            className="w-full h-full"
            srcDoc={game.code}
            sandbox="allow-scripts"
            title={game.title}
          />
        </div>
        <p className="text-gray-600 text-xs text-center">Published {new Date(game.updatedAt).toLocaleDateString()}</p>
      </main>
    </div>
  );
}
