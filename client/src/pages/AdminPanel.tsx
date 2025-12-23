import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, BarChart3, Gamepad2, Shield, Upload, Trash2, Users, AlertCircle, ChevronDown, Flag, Search } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

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

interface GameVersion {
  versionNumber: string;
  uploadedAt: string;
  size: number;
  isActive: boolean;
}

interface GameFile {
  id: string;
  title: string;
  currentVersion: string;
  uploadedAt: string;
  size: number;
  versions: GameVersion[];
}

interface BannedUser {
  id: string;
  username: string;
  reason: string;
  bannedAt: string;
  bannedBy: string;
}

interface ChatReport {
  id: string;
  messageId: string;
  reason: string;
  reportedBy: string;
  timestamp: string;
  status: string;
  message?: {
    text: string;
    username: string;
  };
}

interface ChatUser {
  username: string;
  messageCount: number;
  lastMessageAt: string;
  isBanned: boolean;
}

export default function AdminPanel() {
  const { rank } = useAuth();
  const navigate = useNavigate();
  
  // Check if user has admin or developer rank
  const isAdmin = rank === "developer" || rank === "admin";

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">
              You don't have permission to access the admin panel. Only developers and admins can access this area.
            </p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

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
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [newVersionGame, setNewVersionGame] = useState<string | null>(null);
  const [newVersionNum, setNewVersionNum] = useState("");
  const [chatReports, setChatReports] = useState<ChatReport[]>([]);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchStats();
    if (activeTab === "games") {
      fetchGames();
    }
    if (activeTab === "users") {
      fetchBannedUsers();
    }
    if (activeTab === "all-users") {
      fetchChatUsers();
    }
    if (activeTab === "reports") {
      fetchChatReports();
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

  const handleAddVersion = async (gameId: string) => {
    if (!newVersionNum) return;

    try {
      const response = await fetch(`/api/admin/games/${gameId}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber: newVersionNum }),
      });
      if (response.ok) {
        const updated = await response.json();
        setGameFiles(gameFiles.map(g => g.id === gameId ? updated.game : g));
        setNewVersionNum("");
        setNewVersionGame(null);
      }
    } catch (err) {
      console.error("Failed to add version:", err);
    }
  };

  const handleRollbackVersion = async (gameId: string, versionNumber: string) => {
    if (!confirm(`Rollback to version ${versionNumber}?`)) return;

    try {
      const response = await fetch(`/api/admin/games/${gameId}/version/${versionNumber}/activate`, {
        method: "POST",
      });
      if (response.ok) {
        const updated = await response.json();
        setGameFiles(gameFiles.map(g => g.id === gameId ? updated.game : g));
      }
    } catch (err) {
      console.error("Failed to rollback version:", err);
    }
  };

  const fetchChatReports = async () => {
    try {
      const response = await fetch("/api/chat/reports");
      if (response.ok) {
        const data = await response.json();
        setChatReports(data.reports || []);
      } else if (response.status === 401) {
        navigate("/admin/login");
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    }
  };

  const handleReportAction = async (reportId: string, action: string, banUser: boolean = false) => {
    try {
      const response = await fetch(`/api/admin/chat/reports/${reportId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, banUser }),
      });
      if (response.ok) {
        setChatReports(chatReports.map(r => r.id === reportId ? { ...r, status: action } : r));
      }
    } catch (err) {
      console.error("Failed to handle report:", err);
    }
  };

  const fetchChatUsers = async () => {
    try {
      const response = await fetch("/api/admin/chat/users");
      if (response.ok) {
        const data = await response.json();
        setChatUsers(data.users || []);
      } else if (response.status === 401) {
        navigate("/admin/login");
      }
    } catch (err) {
      console.error("Failed to fetch chat users:", err);
    }
  };

  const filteredUsers = chatUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <button
              onClick={() => setActiveTab("all-users")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === "all-users"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Users size={20} />
              All Users
            </button>
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === "reports"
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Flag size={20} />
              Chat Reports
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
                      <div className="space-y-2">
                        {gameFiles.map((game) => (
                          <div key={game.id} className="border border-gray-600 rounded-lg overflow-hidden">
                            <div className="bg-gray-700 px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-650 transition-colors" onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}>
                              <div className="flex-1">
                                <h4 className="text-white font-medium">{game.title}</h4>
                                <p className="text-gray-400 text-sm">Current: v{game.currentVersion} • {(game.size / 1024 / 1024).toFixed(2)}MB</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteGame(game.id);
                                  }}
                                  className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                  title="Delete game"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <ChevronDown size={20} className={`transition-transform ${expandedGame === game.id ? 'rotate-180' : ''}`} />
                              </div>
                            </div>
                            
                            {expandedGame === game.id && (
                              <div className="bg-gray-800 px-4 py-4 space-y-4">
                                <div>
                                  <h5 className="text-sm font-medium text-gray-300 mb-2">Version History</h5>
                                  <div className="space-y-2">
                                    {game.versions.map((v) => (
                                      <div key={v.versionNumber} className="flex justify-between items-center bg-gray-700 px-3 py-2 rounded text-sm">
                                        <div>
                                          <span className="text-white font-medium">v{v.versionNumber}</span>
                                          {v.isActive && <span className="ml-2 px-2 py-1 bg-green-600/30 text-green-300 rounded text-xs">Active</span>}
                                          <p className="text-gray-400 text-xs mt-1">{new Date(v.uploadedAt).toLocaleDateString()}</p>
                                        </div>
                                        {!v.isActive && (
                                          <button
                                            onClick={() => handleRollbackVersion(game.id, v.versionNumber)}
                                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs transition-colors"
                                          >
                                            Activate
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <h5 className="text-sm font-medium text-gray-300 mb-2">Add New Version</h5>
                                  {newVersionGame === game.id ? (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={newVersionNum}
                                        onChange={(e) => setNewVersionNum(e.target.value)}
                                        placeholder="e.g., 1.0.1"
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAddVersion(game.id)}
                                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                                        >
                                          Create Version
                                        </button>
                                        <button
                                          onClick={() => setNewVersionGame(null)}
                                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setNewVersionGame(game.id)}
                                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm flex items-center justify-center gap-2 transition-colors"
                                    >
                                      <Upload size={16} />
                                      Upload New Version
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
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

            {activeTab === "all-users" && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users size={20} className="text-blue-400" />
                    Chat Users ({chatUsers.length})
                  </h3>
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by username..."
                        className="w-full pl-12 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                  </div>
                  {filteredUsers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-600 text-gray-400">
                            <th className="px-4 py-2 text-left">Username</th>
                            <th className="px-4 py-2 text-center">Messages</th>
                            <th className="px-4 py-2 text-left">Last Active</th>
                            <th className="px-4 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((user) => (
                            <tr key={user.username} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                              <td className="px-4 py-3 text-white font-medium">{user.username}</td>
                              <td className="px-4 py-3 text-center text-gray-300">{user.messageCount}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.lastMessageAt).toLocaleDateString()} {new Date(user.lastMessageAt).toLocaleTimeString()}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${user.isBanned ? "bg-red-600/30 text-red-300" : "bg-green-600/30 text-green-300"}`}>
                                  {user.isBanned ? "Banned" : "Active"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">
                      {searchQuery ? "No users found matching your search" : "No chat users yet"}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Flag size={20} className="text-orange-400" />
                    Chat Reports ({chatReports.length})
                  </h3>
                  {chatReports.length > 0 ? (
                    <div className="space-y-4">
                      {chatReports.map((report) => (
                        <div key={report.id} className={`rounded-lg p-4 border ${report.status === "pending" ? "border-orange-500/30 bg-orange-500/10" : "border-gray-600 bg-gray-700/50"}`}>
                          <div className="mb-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="text-white font-medium">Message from <span className="text-orange-400">{report.message?.username}</span></h4>
                                <p className="text-gray-400 text-sm mt-1">{report.message?.text}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${report.status === "pending" ? "bg-orange-600 text-white" : "bg-gray-600 text-gray-300"}`}>
                                {report.status}
                              </span>
                            </div>
                            <p className="text-gray-500 text-xs">Reported by <strong>{report.reportedBy}</strong> for: <strong>{report.reason}</strong></p>
                            <p className="text-gray-600 text-xs mt-1">{new Date(report.timestamp).toLocaleString()}</p>
                          </div>
                          
                          {report.status === "pending" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReportAction(report.id, "dismiss")}
                                className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                              >
                                Dismiss
                              </button>
                              <button
                                onClick={() => handleReportAction(report.id, "delete_message")}
                                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                              >
                                Delete Message
                              </button>
                              <button
                                onClick={() => handleReportAction(report.id, "delete_message", true)}
                                className="flex-1 px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-sm transition-colors"
                              >
                                Delete & Ban User
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No reports yet</p>
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
