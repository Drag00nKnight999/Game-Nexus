import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Globe, Lock, Pencil, Trash2, Crown, Zap, Code2, Shield } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface UserGame {
  id: string;
  title: string;
  description: string;
  engineType: "2d" | "2.5d" | "3d";
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

const ENGINE_LABELS: Record<string, { label: string; color: string }> = {
  "2d": { label: "2D", color: "bg-emerald-600/30 text-emerald-300 border-emerald-600/40" },
  "2.5d": { label: "2.5D", color: "bg-blue-600/30 text-blue-300 border-blue-600/40" },
  "3d": { label: "3D", color: "bg-purple-600/30 text-purple-300 border-purple-600/40" },
};

export default function Dashboard() {
  const { username, rank, isPremium, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);

  const rankIcon = rank === "owner"
    ? <Crown size={13} className="text-yellow-300" />
    : rank === "developer"
    ? <Code2 size={13} className="text-purple-300" />
    : rank === "admin"
    ? <Shield size={13} className="text-orange-300" />
    : null;

  useEffect(() => {
    fetch("/api/games/my")
      .then((r) => r.ok ? r.json() : { games: [] })
      .then((d) => setGames(d.games || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (gameId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/games/${gameId}`, { method: "DELETE" });
    if (res.ok) setGames((prev) => prev.filter((g) => g.id !== gameId));
  };

  const handleTogglePublic = async (game: UserGame) => {
    const res = await fetch(`/api/games/${game.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !game.isPublic }),
    });
    if (res.ok) {
      const data = await res.json();
      setGames((prev) => prev.map((g) => (g.id === game.id ? data.game : g)));
      if (data.premiumGranted) {
        await refreshAuth();
        alert("🎉 Congratulations! You've published your first game and unlocked Premium!");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">My Dashboard</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-gray-400 text-sm">{username}</span>
                {rankIcon && (
                  <span className="flex items-center gap-1 text-xs capitalize" style={{ color: "inherit" }}>
                    {rankIcon}
                  </span>
                )}
                {isPremium && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold">
                    <Zap size={10} />
                    Premium
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/settings"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={() => navigate("/editor")}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New Game
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {!isPremium && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-yellow-300 font-semibold flex items-center gap-2">
                <Zap size={16} />
                Unlock Premium for free!
              </p>
              <p className="text-gray-400 text-sm mt-0.5">
                Publish your first game to get 50 AI requests/day, premium badge, and more.
              </p>
            </div>
            <button
              onClick={() => navigate("/editor")}
              className="shrink-0 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg text-sm font-semibold transition-colors"
            >
              Create a Game
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">My Games ({games.length})</h2>
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">Loading...</p>
        ) : games.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto">
              <Plus size={32} className="text-gray-500" />
            </div>
            <h3 className="text-white font-semibold text-lg">No games yet</h3>
            <p className="text-gray-400">Create your first game with one of the three built-in game engines.</p>
            <button
              onClick={() => navigate("/editor")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={18} />
              Create My First Game
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {games.map((game) => {
              const eng = ENGINE_LABELS[game.engineType] || ENGINE_LABELS["2d"];
              return (
                <div key={game.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold truncate">{game.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded border ${eng.color}`}>{eng.label}</span>
                        {game.isPublic
                          ? <span className="flex items-center gap-1 text-xs text-green-400"><Globe size={11} />Public</span>
                          : <span className="flex items-center gap-1 text-xs text-gray-500"><Lock size={11} />Private</span>
                        }
                      </div>
                      {game.description && <p className="text-gray-400 text-sm mt-1 line-clamp-2">{game.description}</p>}
                      <p className="text-gray-600 text-xs mt-2">Updated {new Date(game.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      to={`/editor/${game.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                    >
                      <Pencil size={14} />
                      Edit
                    </Link>
                    {game.isPublic && (
                      <Link
                        to={`/play/${game.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg text-sm border border-blue-600/30 transition-colors"
                      >
                        <Globe size={14} />
                        View
                      </Link>
                    )}
                    <button
                      onClick={() => handleTogglePublic(game)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        game.isPublic
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600"
                          : "bg-green-600/20 hover:bg-green-600/40 text-green-300 border-green-600/30"
                      }`}
                      title={game.isPublic ? "Make private" : "Publish"}
                    >
                      {game.isPublic ? <Lock size={14} /> : <Globe size={14} />}
                      {game.isPublic ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleDelete(game.id, game.title)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600/10 hover:bg-red-600/30 text-red-400 rounded-lg text-sm border border-red-600/20 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
