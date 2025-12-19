import { Link } from "react-router-dom";
import { Gamepad2, Brain, Box, Blocks } from "lucide-react";

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
      description: "Build, mine, and explore in this blocky world adventure!",
      icon: <Blocks size={48} />,
      link: "/games/bloxd",
      color: "bg-gradient-to-br from-cyan-500 to-blue-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Game<span className="text-purple-400">Hub</span>
          </h1>
          <p className="text-gray-400 text-lg">Your destination for fun browser games</p>
        </div>
      </header>

      <main className="px-4 pb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-6">Featured Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <GameCard key={game.title} {...game} />
            ))}
          </div>
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
          GameHub - Play, Have Fun, Repeat
        </div>
      </footer>
    </div>
  );
}
