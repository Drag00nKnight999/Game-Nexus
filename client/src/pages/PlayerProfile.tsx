import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, User, Calendar, Shield, Code2, Crown, Zap, Globe, UserPlus, UserMinus, MessageSquare, Heart, Eye, Box, Layers } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface PublicGame {
  id: string;
  title: string;
  description: string;
  engineType: string;
  likeCount: number;
  playCount: number;
  tags: string[];
}

interface Achievement {
  type: string;
  label: string;
  description: string;
  icon: string;
  grantedAt: string;
}

interface ProfileData {
  username: string;
  rank: string;
  joinedAt: string;
  bio?: string;
  avatarColor?: string;
  isPremium?: boolean;
  publicGameCount?: number;
  publicGames?: PublicGame[];
  achievements?: Achievement[];
  followerCount?: number;
  followingCount?: number;
}

function RankBadge({ rank }: { rank: string }) {
  if (rank === "owner") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-sm font-medium">
      <Crown size={14} />Owner
    </span>
  );
  if (rank === "developer") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/50 text-purple-300 text-sm font-medium">
      <Code2 size={14} />Developer
    </span>
  );
  if (rank === "admin") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-medium">
      <Shield size={14} />Admin
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-600/40 border border-gray-600 text-gray-300 text-sm font-medium">
      <User size={14} />Member
    </span>
  );
}

export default function PlayerProfile() {
  const { username } = useParams<{ username: string }>();
  const { username: myUsername, isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const isOwnProfile = myUsername && username && myUsername.toLowerCase() === username.toLowerCase();

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/profile/${encodeURIComponent(username)}`),
      isLoggedIn && !isOwnProfile ? fetch(`/api/follow/${encodeURIComponent(username)}/status`) : Promise.resolve(null),
    ])
      .then(([profileRes, followRes]) => Promise.all([
        profileRes.status === 404 ? Promise.reject("not_found") : profileRes.json(),
        followRes ? followRes.json() : { following: false },
      ]))
      .then(([data, followData]) => {
        setProfile(data);
        setFollowerCount(data.followerCount || 0);
        setFollowing(followData.following || false);
      })
      .catch((e) => { if (e === "not_found") setNotFound(true); })
      .finally(() => setLoading(false));
  }, [username, isLoggedIn]);

  const handleFollowToggle = async () => {
    if (!isLoggedIn || followLoading) return;
    setFollowLoading(true);
    try {
      const method = following ? "DELETE" : "POST";
      const res = await fetch(`/api/follow/${encodeURIComponent(username!)}`, { method });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setFollowerCount((prev) => data.following ? prev + 1 : Math.max(0, prev - 1));
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <p className="text-gray-400 text-lg">Loading profile...</p>
    </div>
  );

  if (notFound || !profile) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <User size={64} className="text-gray-600 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Profile Not Found</h1>
        <p className="text-gray-400">The user "{username}" doesn't exist on GameNexus.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">
          <ArrowLeft size={18} />Back to Home
        </Link>
      </div>
    </div>
  );

  const joinedDate = new Date(profile.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const avatarBg = profile.avatarColor || "#818cf8";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />Back to Home
          </Link>
          <h1 className="text-xl font-bold text-white">Player Profile</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Profile card */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-xl flex-shrink-0"
              style={{ backgroundColor: avatarBg }}
            >
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-center sm:text-left space-y-3 flex-1">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 flex-wrap">
                <h2 className="text-3xl font-bold text-white">{profile.username}</h2>
                {profile.rank === "owner" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-300 text-xs font-semibold"><Crown size={11} />OWNER</span>}
                {profile.rank === "developer" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-600/30 border border-purple-500/40 rounded text-purple-300 text-xs font-semibold"><Code2 size={11} />DEV</span>}
                {profile.rank === "admin" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 border border-orange-500/40 rounded text-orange-300 text-xs font-semibold"><Shield size={11} />ADMIN</span>}
                {profile.isPremium && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-300 text-xs font-semibold"><Zap size={10} />Premium</span>}
              </div>
              <RankBadge rank={profile.rank} />
              {profile.bio && <p className="text-gray-300 text-sm">{profile.bio}</p>}
              <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap justify-center sm:justify-start">
                <span className="flex items-center gap-1.5"><Calendar size={14} />Joined {joinedDate}</span>
                <span className="text-gray-600">·</span>
                <span className="font-medium text-white">{followerCount}</span>
                <span>followers</span>
                <span className="text-gray-600">·</span>
                <span className="font-medium text-white">{profile.followingCount || 0}</span>
                <span>following</span>
              </div>
              {/* Action buttons */}
              {isLoggedIn && !isOwnProfile && (
                <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      following
                        ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-red-600/20 hover:border-red-500/50 hover:text-red-400"
                        : "bg-purple-600 border-purple-500 text-white hover:bg-purple-500"
                    } disabled:opacity-50`}
                  >
                    {following ? <><UserMinus size={15} />Unfollow</> : <><UserPlus size={15} />Follow</>}
                  </button>
                  <Link
                    to={`/messages/${encodeURIComponent(profile.username)}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 hover:text-white hover:bg-gray-600 rounded-xl text-sm font-medium transition-colors"
                  >
                    <MessageSquare size={15} />Message
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Achievements */}
        {profile.achievements && profile.achievements.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-semibold text-lg">Achievements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.achievements.map((ach) => (
                <div key={ach.type} className="bg-gray-700/60 border border-gray-600 rounded-xl p-3 flex items-start gap-3" title={ach.description}>
                  <span className="text-2xl flex-shrink-0">{ach.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{ach.label}</p>
                    <p className="text-gray-400 text-xs">{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rank card */}
        {profile.rank === "owner" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2"><Crown size={18} className="text-yellow-400" /><h3 className="text-yellow-300 font-semibold">Platform Owner</h3></div>
            <p className="text-gray-400 text-sm">This user is the founder and owner of GameNexus. They have the highest level of platform access and built this community from the ground up.</p>
          </div>
        )}
        {profile.rank === "developer" && (
          <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2"><Code2 size={18} className="text-purple-400" /><h3 className="text-purple-300 font-semibold">Platform Developer</h3></div>
            <p className="text-gray-400 text-sm">This user is one of the developers of GameNexus. They have full platform access and can moderate the community and admin panel.</p>
          </div>
        )}
        {profile.rank === "admin" && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2"><Shield size={18} className="text-orange-400" /><h3 className="text-orange-300 font-semibold">Platform Administrator</h3></div>
            <p className="text-gray-400 text-sm">This user is a GameNexus administrator. They help moderate the community and keep the platform safe for all players.</p>
          </div>
        )}

        {/* Published games portfolio */}
        {profile.publicGames && profile.publicGames.length > 0 && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-lg">
                <Globe size={18} className="inline text-purple-400 mr-2" />
                Published Games ({profile.publicGames.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.publicGames.map((g) => (
                <Link
                  key={g.id}
                  to={`/play/${g.id}`}
                  className="group bg-gray-700/60 border border-gray-600 hover:border-purple-500/50 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate group-hover:text-purple-300 transition-colors">{g.title}</p>
                      {g.description && <p className="text-gray-400 text-xs mt-1 line-clamp-2">{g.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-gray-500 text-xs">
                        <span className="flex items-center gap-1"><Heart size={11} />{g.likeCount}</span>
                        <span className="flex items-center gap-1"><Eye size={11} />{g.playCount}</span>
                        <span className="flex items-center gap-1">
                          {g.engineType === "3d" ? <Box size={11} /> : <Layers size={11} />}
                          {g.engineType.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Platform games */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold text-lg mb-4">Platform Games</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Snake", color: "from-green-600 to-emerald-700", path: "/games/snake" },
              { name: "Memory Match", color: "from-purple-600 to-indigo-700", path: "/games/memory" },
              { name: "Platformer", color: "from-orange-600 to-red-700", path: "/games/platformer" },
              { name: "Bloxd.io", color: "from-cyan-600 to-blue-700", path: "/games/bloxd" },
            ].map((game) => (
              <Link key={game.name} to={game.path} className={`bg-gradient-to-br ${game.color} rounded-xl p-4 text-white font-medium text-sm hover:opacity-90 transition-opacity`}>
                {game.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h3 className="text-white font-semibold text-lg mb-3">Community</h3>
          <Link to="/chat" className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm transition-colors">
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
