import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, BarChart3, Gamepad2, Shield, Upload, Trash2 } from "lucide-react";

interface GameStats {
  title: string;
  plays: number;
  averageTime: number;
}

interface UserStats {
  totalUsers: number;
  totalGames: number;
  totalPlays: number;
}

interface GameFile {
  id: string;
  title: string;
  version: string;
  uploadedAt: string;
  size: number;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("stats");
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalGames: 0,
    totalPlays: 0,
  });
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [gameFiles, setGameFiles] = useState<GameFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    if (activeTab === "games") {
      fetchGames();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setGameStats(data.gameStats || []);
      } else if (response.status === 401) {
        navigate("/admin/login");
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await fetch("/api/admin/games");
      if (response.ok) {
        const data = await response.json();
        setGameFiles(data.games || []);
      } else if (response.status === 401) {
        navigate("/admin/login");
      }
    } catch (err) {
      console.error("Failed to fetch games:", err);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm("Are you sure you want to delete this game?")) return;
    
    try {
      const response = await fetch(`/api/admin/games/${gameId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setGameFiles(gameFiles.filter(g => g.id !== gameId));
      }
    } catch (err) {
      console.error("Failed to delete game:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <Shield className="text-purple-400" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white">GameNexus Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex gap-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab("stats")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === "stats"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <BarChart3 size={20} />
              Stats
            </button>
            <button
              onClick={() => setActiveTab("games")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === "games"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Gamepad2 size={20} />
              Manage Games
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === "stats" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Total Users</p>
                  <p className="text-4xl font-bold text-white">{stats.totalUsers}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Total Games</p>
                  <p className="text-4xl font-bold text-white">{stats.totalGames}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Total Plays</p>
                  <p className="text-4xl font-bold text-white">{stats.totalPlays}</p>
                </div>
              </div>
            )}

            {activeTab === "games" && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Game Files</h3>
                  {gameFiles.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Title</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Version</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Size</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Uploaded</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameFiles.map((game) => (
                            <tr
                              key={game.id}
                              className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                            >
                              <td className="px-4 py-3 text-white">{game.title}</td>
                              <td className="px-4 py-3 text-gray-300">{game.version}</td>
                              <td className="px-4 py-3 text-gray-300">{(game.size / 1024 / 1024).toFixed(2)}MB</td>
                              <td className="px-4 py-3 text-gray-300 text-sm">{new Date(game.uploadedAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteGame(game.id)}
                                  className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                  title="Delete game"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No game files uploaded yet</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
