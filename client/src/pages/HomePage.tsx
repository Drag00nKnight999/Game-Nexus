import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Gamepad2, Brain, Box, Blocks, Search, X, LogOut } from "lucide-react";
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
    <Link
      to={link}
      className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${color}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="mb-4 text-white/90">{icon}</div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-white/80 text-sm">{description}</p>
        <div className="mt-4 inline-flex items-center text-white font-medium">
          Play Now
          <svg
            className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isLoggedIn, username, logout, rank } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isAdmin = rank === "developer" || rank === "admin";

  const games = [
    {
      title: "Snake",
      description: "Classic arcade game. Eat food, grow longer, and don't hit the walls!",
      icon: <Gamepad2 size={48} />,
      link: "/games/snake",
      color: "bg-gradient-to-br from-green-500 to-emerald-700",
    },
    {
      title: "Memory Match",
      description: "Test your memory by matching pairs of cards. Find them all to win!",
      icon: <Brain size={48} />,
      link: "/games/memory",
      color: "bg-gradient-to-br from-purple-500 to-indigo-700",
    },
    {
      title: "Platformer",
      description: "Jump, collect coins, and reach the goal in this 3D platforming adventure!",
      icon: <Box size={48} />,
      link: "/games/platformer",
      color: "bg-gradient-to-br from-orange-500 to-red-700",
    },
    {
      title: "Bloxd.io (Scratch Edition)",
      description: "A knockoff of the real Bloxd.io that was made with ScratchBlocks technology and Turbowarp Packager.",
      icon: <Blocks size={48} />,
      link: "/games/bloxd",
      color: "bg-gradient-to-br from-cyan-500 to-blue-700",
    },
  ];

  const filteredGames = games.filter((game) => {
    const query = searchQuery.toLowerCase();
    return (
      game.title.toLowerCase().includes(query) ||
      game.description.toLowerCase().includes(query)
    );
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
                <span className="text-gray-300 text-sm">
                  Welcome, <span className="text-purple-400 font-medium">{username}</span>
                  {rank !== "user" && <span className="ml-2 text-yellow-400 text-xs">({rank === "developer" ? "🧑‍💻 Developer 🧑‍💻" : rank === "admin" ? "Admin" : rank})</span>}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 pb-12">
        <div className="max-w-6xl mx-auto mb-8 flex gap-4">
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💬 Join Community Chat
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-lg font-medium transition-all duration-300 hover:shadow-lg"
            >
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
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-6">
            {searchQuery ? `Results for "${searchQuery}"` : "Featured Games"}
          </h2>
          
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGames.map((game) => (
                <GameCard key={game.title} {...game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No games found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        <div className="max-w-6xl mx-auto mt-12">
          <div className="bg-gray-800/50 rounded-2xl p-8 text-center border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-2">More Games Coming Soon!</h3>
            <p className="text-gray-400">
              We're working on adding more exciting games. Stay tuned for updates!
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          GameNexus - Play, Have Fun, Repeat
        </div>
      </footer>
    </div>
  );
}
