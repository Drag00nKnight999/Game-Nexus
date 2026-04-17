import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, User, Calendar, Shield, Code2, Crown } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface ProfileData {
  username: string;
  rank: string;
  joinedAt: string;
}

function RankBadge({ rank }: { rank: string }) {
  if (rank === "developer") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/50 text-purple-300 text-sm font-medium">
        <Code2 size={14} />
        Developer
      </span>
    );
  }
  if (rank === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-600/20 border border-yellow-500/50 text-yellow-300 text-sm font-medium">
        <Shield size={14} />
        Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-600/40 border border-gray-600 text-gray-300 text-sm font-medium">
      <User size={14} />
      Member
    </span>
  );
}

function AvatarPlaceholder({ username, rank }: { username: string; rank: string }) {
  const colors: Record<string, string> = {
    developer: "from-purple-600 to-indigo-700",
    admin: "from-yellow-600 to-orange-700",
    user: "from-gray-600 to-gray-700",
  };
  const color = colors[rank] || colors.user;
  return (
    <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-4xl font-bold shadow-xl`}>
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PlayerProfile() {
  const { username } = useParams<{ username: string }>();
  const { rank: myRank } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => { if (data) setProfile(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading profile...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <User size={64} className="text-gray-600 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Profile Not Found</h1>
          <p className="text-gray-400">The user "{username}" doesn't exist on GameNexus.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">
            <ArrowLeft size={18} />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const joinedDate = new Date(profile.joinedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isDeveloper = profile.rank === "developer";
  const isAdmin = profile.rank === "admin" || profile.rank === "developer";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <h1 className="text-xl font-bold text-white">Player Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <AvatarPlaceholder username={profile.username} rank={profile.rank} />
            <div className="text-center sm:text-left space-y-3 flex-1">
              <div>
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3">
                  <h2 className="text-3xl font-bold text-white">{profile.username}</h2>
                  {isDeveloper && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-600/30 border border-purple-500/40 rounded text-purple-300 text-xs font-semibold tracking-wide">
                      <Code2 size={11} />
                      DEVELOPER
                    </span>
                  )}
                </div>
              </div>
              <RankBadge rank={profile.rank} />
              <div className="flex items-center gap-2 text-gray-400 text-sm justify-center sm:justify-start">
                <Calendar size={15} />
                <span>Joined {joinedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {isDeveloper && (
          <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Code2 size={18} className="text-purple-400" />
              <h3 className="text-purple-300 font-semibold">Platform Developer</h3>
            </div>
            <p className="text-gray-400 text-sm">This user is one of the developers of GameNexus. They have full platform access, can moderate the community chat, and manage the admin panel.</p>
          </div>
        )}

        {isAdmin && !isDeveloper && (
          <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-yellow-400" />
              <h3 className="text-yellow-300 font-semibold">Platform Administrator</h3>
            </div>
            <p className="text-gray-400 text-sm">This user is a GameNexus administrator. They help moderate the community and keep the platform safe for all players.</p>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <Crown size={18} className="text-yellow-400" />
            Games
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Snake", color: "from-green-600 to-emerald-700", path: "/games/snake" },
              { name: "Memory Match", color: "from-purple-600 to-indigo-700", path: "/games/memory" },
              { name: "Platformer", color: "from-orange-600 to-red-700", path: "/games/platformer" },
              { name: "Bloxd.io", color: "from-cyan-600 to-blue-700", path: "/games/bloxd" },
            ].map((game) => (
              <Link
                key={game.name}
                to={game.path}
                className={`bg-gradient-to-br ${game.color} rounded-xl p-4 text-white font-medium text-sm hover:opacity-90 transition-opacity`}
              >
                {game.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold text-lg mb-3">Community</h3>
          <Link
            to="/chat"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm transition-colors"
          >
            💬 Join Community Chat
          </Link>
        </div>
      </main>

      <footer className="py-6 border-t border-gray-800 mt-8">
        <div className="max-w-3xl mx-auto px-4 flex flex-wrap gap-4 justify-center text-gray-500 text-sm">
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">Terms of Use</Link>
          <span>·</span>
          <Link to="/guidelines" className="hover:text-gray-300 transition-colors">Community Guidelines</Link>
          <span>·</span>
          <Link to="/" className="hover:text-gray-300 transition-colors">GameNexus</Link>
        </div>
      </footer>
    </div>
  );
}
