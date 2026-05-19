import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Gamepad2, Brain, Box, Blocks, Search, X, LogOut, Code2, Shield, Crown, LayoutDashboard, Plus, Globe, Layers, Zap, Heart, Eye, Tag, MessageSquare } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  color: string;
}

function GameCard({ title, description, icon, link, color }: GameCardProps) {
  return (
    <Link to={link} className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${color}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="mb-4 text-white/90">{icon}</div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/80 text-sm">{description}</p>
        <div className="mt-4 inline-flex items-center text-white font-medium">
          Play Now
          <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

interface CommunityGame {
  id: string;
  title: string;
  description: string;
  engineType: string;
  authorUsername: string;
  updatedAt: string;
  tags: string[];
  likeCount: number;
  playCount: number;
  thumbnail?: string;
}

const ALL_TAGS = ["action", "puzzle", "platformer", "shooter", "rpg", "arcade", "racing", "strategy", "horror", "casual"];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { isLoggedIn, username, logout, rank, isPremium, unreadDMs } = useAuth();
  const navigate = useNavigate();
  const [communityGames, setCommunityGames] = useState<CommunityGame[]>([]);

  useEffect(() => {
    fetch("/api/games/public")
      .then((r) => r.ok ? r.json() : { games: [] })
      .then((d) => setCommunityGames(d.games || []))
      .catch(() => {});
  }, []);

  const handleLogout = async () => { await logout(); navigate("/"); };

  const isAdmin = rank === "owner" || rank === "developer" || rank === "admin";

  const games = [
    { title: "Snake", description: "Classic arcade game. Eat food, grow longer, and don't hit the walls!", icon: <Gamepad2 size={48} />, link: "/games/snake", color: "bg-gradient-to-br from-green-500 to-emerald-700" },
    { title: "Memory Match", description: "Test your memory by matching pairs of cards. Find them all to win!", icon: <Brain size={48} />, link: "/games/memory", color: "bg-gradient-to-br from-purple-500 to-indigo-700" },
    { title: "Platformer", description: "Jump, collect coins, and reach the goal in this 3D platforming adventure!", icon: <Box size={48} />, link: "/games/platformer", color: "bg-gradient-to-br from-orange-500 to-red-700" },
    { title: "Bloxd.io (Scratch Edition)", description: "A knockoff of the real Bloxd.io made with ScratchBlocks technology and Turbowarp Packager.", icon: <Blocks size={48} />, link: "/games/bloxd", color: "bg-gradient-to-br from-cyan-500 to-blue-700" },
  ];

  const filteredFeatured = games.filter((g) => {
    const query = searchQuery.toLowerCase();
    return g.title.toLowerCase().includes(query) || g.description.toLowerCase().includes(query);
  });

  const filteredCommunity = communityGames.filter((g) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || g.title.toLowerCase().includes(query) || g.description.toLowerCase().includes(query) || g.authorUsername.toLowerCase().includes(query);
    const matchesTag = !selectedTag || (g.tags || []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="py-8 px-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center mb-6">
          <div className="text-center flex-1">
            <h1 className="text-5xl font-bold text-white mb-4">
              Game<span className="text-purple-400">Nexus</span>
            </h1>
            <p className="text-gray-400 text-lg">Your destination for fun browser games</p>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <span className="text-gray-400 text-sm flex items-center gap-2 flex-wrap">
                  Welcome,{" "}
                  <Link to={`/profile/${encodeURIComponent(username || "")}`} className="inline-flex items-center gap-1.5 hover:underline">
                    <span className={rank === "owner" ? "text-yellow-300 font-medium" : rank === "developer" ? "text-purple-400 font-medium" : rank === "admin" ? "text-orange-400 font-medium" : "text-white font-medium"}>
                      {username}
                    </span>
                    {rank === "owner" && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold"><Crown size={10} />OWNER</span>}
                    {rank === "developer" && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold"><Code2 size={10} />DEV</span>}
                    {rank === "admin" && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold"><Shield size={10} />ADMIN</span>}
                    {isPremium && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold"><Zap size={10} />Premium</span>}
                  </Link>
                </span>
                {unreadDMs > 0 && (
                  <Link to="/messages" className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded-lg transition-colors hover:bg-purple-600/30 text-sm relative">
                    <MessageSquare size={16} />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full text-white text-xs flex items-center justify-center">{unreadDMs}</span>
                  </Link>
                )}
                <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm">
                  <LayoutDashboard size={16} />Dashboard
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">
                  <LogOut size={18} />Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 pb-12">
        <div className="max-w-6xl mx-auto mb-8 flex gap-3 flex-wrap">
          <Link to="/chat" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg">
            💬 Join Community Chat
          </Link>
          {isLoggedIn && (
            <>
              <Link to="/editor" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-purple-500 to-indigo-700 hover:from-purple-400 hover:to-indigo-600 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg">
                <Plus size={18} />Create a Game
              </Link>
              <Link to="/messages" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg">
                <MessageSquare size={18} />Messages{unreadDMs > 0 && <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unreadDMs}</span>}
              </Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg">
              ⚙️ Admin Panel
            </Link>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-6">
            {searchQuery ? `Results for "${searchQuery}"` : "Featured Games"}
          </h2>

          {filteredFeatured.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFeatured.map((game) => <GameCard key={game.title} {...game} />)}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No featured games found for "{searchQuery}"</p>
            </div>
          ) : null}
        </div>

        {/* Community Games */}
        <div className="max-w-6xl mx-auto mt-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
              <Globe size={22} className="text-purple-400" />
              Community Games
              {communityGames.length > 0 && <span className="text-gray-500 text-base font-normal">({communityGames.length})</span>}
            </h2>
            {isLoggedIn && (
              <Link to="/editor" className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
                <Plus size={16} />Create yours
              </Link>
            )}
          </div>

          {/* Tag filter */}
          {communityGames.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-5">
              <button
                onClick={() => setSelectedTag(null)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!selectedTag ? "bg-purple-600 border-purple-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500/50 hover:text-purple-300"}`}
              >
                All
              </button>
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedTag === tag ? "bg-purple-600 border-purple-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-purple-500/50 hover:text-purple-300"}`}
                >
                  <Tag size={9} />{tag}
                </button>
              ))}
            </div>
          )}

          {filteredCommunity.length === 0 && communityGames.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-10 text-center space-y-3">
              <p className="text-gray-400 font-medium">No community games yet.</p>
              {isLoggedIn
                ? <p className="text-gray-500 text-sm">Be the first to create and publish a game!</p>
                : <p className="text-gray-500 text-sm"><Link to="/login" className="text-purple-400 hover:underline">Log in</Link> to create and share games.</p>}
            </div>
          ) : filteredCommunity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No games match your search{selectedTag ? ` in "${selectedTag}"` : ""}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommunity.slice(0, 12).map((game) => (
                <Link
                  key={game.id}
                  to={`/play/${game.id}`}
                  className="group bg-gray-800 border border-gray-700 hover:border-purple-500/50 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg"
                >
                  {/* Thumbnail */}
                  {game.thumbnail ? (
                    <div className="w-full h-32 bg-gray-900 overflow-hidden">
                      <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className={`w-full h-20 flex items-center justify-center bg-gradient-to-br ${
                      game.engineType === "3d" ? "from-blue-900/60 to-indigo-900/60" :
                      game.engineType === "2.5d" ? "from-emerald-900/60 to-teal-900/60" :
                      "from-purple-900/60 to-violet-900/60"
                    }`}>
                      {game.engineType === "3d" ? <Box size={28} className="text-white/30" /> : <Layers size={28} className="text-white/30" />}
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold truncate group-hover:text-purple-300 transition-colors flex-1">{game.title}</span>
                    </div>
                    {game.description && <p className="text-gray-400 text-sm line-clamp-2">{game.description}</p>}
                    {game.tags && game.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {game.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-purple-600/20 border border-purple-500/20 rounded text-purple-300 text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>by {game.authorUsername}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Heart size={11} />{game.likeCount}</span>
                        <span className="flex items-center gap-1"><Eye size={11} />{game.playCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-3">
          <p className="text-gray-500 text-sm">GameNexus - Play, Have Fun, Repeat</p>
          <div className="flex flex-wrap justify-center gap-4 text-gray-600 text-xs">
            <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms of Use</Link>
            <span>·</span>
            <Link to="/guidelines" className="hover:text-gray-400 transition-colors">Community Guidelines</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
