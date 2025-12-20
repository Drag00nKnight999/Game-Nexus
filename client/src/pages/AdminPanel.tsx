import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, BarChart3, Gamepad2, Shield, Upload, Trash2, Users, AlertCircle } from "lucide-react";

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

interface BannedUser {
  id: string;
  username: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
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
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [banUsername, setBanUsername] = useState("");
  const [banReason, setBanReason] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    if (activeTab === "games") {
      fetchGames();
    }
    if (activeTab === "users") {
      fetchBannedUsers();
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

  const fetchBannedUsers = async () => {
    try {
      const response = await fetch("/api/admin/banned-users");
      if (response.ok) {
        const data = await response.json();
        setBannedUsers(data.bannedUsers || []);
      } else if (response.status === 401) {
        navigate("/admin/login");
      }
    } catch (err) {
      console.error("Failed to fetch banned users:", err);
    }
  };

  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banUsername || !banReason) return;

    try {
      const response = await fetch("/api/admin/ban-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: banUsername, reason: banReason }),
      });
      if (response.ok) {
        const data = await response.json();
        setBannedUsers([...bannedUsers, data.bannedUser]);
        setBanUsername("");
        setBanReason("");
      }
    } catch (err) {
      console.error("Failed to ban user:", err);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!confirm("Are you sure you want to unban this user?")) return;

    try {
      const response = await fetch(`/api/admin/unban-user/${userId}`, {
        method: "POST",
      });
      if (response.ok) {
        setBannedUsers(bannedUsers.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error("Failed to unban user:", err);
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
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Users size={20} />
              Banned Users
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

            {activeTab === "users" && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-400" />
                    Ban a User
                  </h3>
                  <form onSubmit={handleBanUser} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                      <input
                        type="text"
                        value={banUsername}
                        onChange={(e) => setBanUsername(e.target.value)}
                        placeholder="Enter username to ban"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                      <textarea
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Reason for ban (e.g., hacking, cheating)"
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                        rows={3}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
                    >
                      Ban User
                    </button>
                  </form>
                </div>

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Banned Users ({bannedUsers.length})</h3>
                  {bannedUsers.length > 0 ? (
                    <div className="space-y-3">
                      {bannedUsers.map((user) => (
                        <div key={user.id} className="bg-gray-700/50 rounded-lg p-4 border border-red-500/20">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{user.username}</h4>
                              <p className="text-gray-400 text-sm mt-1"><strong>Reason:</strong> {user.reason}</p>
                              <p className="text-gray-500 text-xs mt-2">Banned {new Date(user.bannedAt).toLocaleDateString()} by {user.bannedBy}</p>
                            </div>
                            <button
                              onClick={() => handleUnbanUser(user.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors text-sm"
                            >
                              Unban
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No banned users</p>
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
