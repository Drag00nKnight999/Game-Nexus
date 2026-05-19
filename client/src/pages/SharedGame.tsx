import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Crown, Code2, Shield, Zap, Layers, Box, Heart, Eye, Flag, Send, Trash2, X, Tag } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

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
  tags: string[];
  likeCount: number;
  playCount: number;
  thumbnail?: string;
}

interface Comment {
  id: number;
  userId: number;
  username: string;
  text: string;
  createdAt: string;
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
  const { username, rank, isLoggedIn } = useAuth();

  const [game, setGame] = useState<UserGame | null>(null);
  const [authorRank, setAuthorRank] = useState<string>("user");
  const [authorPremium, setAuthorPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const playTracked = useRef(false);

  const canModerate = rank === "owner" || rank === "developer" || rank === "admin";

  useEffect(() => {
    if (!gameId) return;
    fetch(`/api/games/${gameId}`)
      .then((r) => r.ok ? r.json() : r.json().then((d: any) => Promise.reject(d.error || "Not found")))
      .then((d) => {
        setGame(d.game);
        setLikeCount(d.game.likeCount || 0);
        return Promise.all([
          fetch(`/api/profile/${d.game.authorUsername}`),
          fetch(`/api/games/${gameId}/comments`),
          isLoggedIn ? fetch(`/api/games/${gameId}/like`) : Promise.resolve(null),
        ]);
      })
      .then(([profileRes, commentsRes, likeRes]) => Promise.all([
        profileRes.ok ? profileRes.json() : null,
        commentsRes.ok ? commentsRes.json() : { comments: [] },
        likeRes ? (likeRes.ok ? likeRes.json() : { liked: false }) : { liked: false },
      ]))
      .then(([profile, commentsData, likeData]) => {
        if (profile) { setAuthorRank(profile.rank || "user"); setAuthorPremium(profile.isPremium || false); }
        setComments(commentsData.comments || []);
        setLiked(likeData.liked || false);
      })
      .catch((e) => setError(typeof e === "string" ? e : "Game not found"))
      .finally(() => setLoading(false));
  }, [gameId, isLoggedIn]);

  // Track play count once
  useEffect(() => {
    if (game && !playTracked.current) {
      playTracked.current = true;
      fetch(`/api/games/${gameId}/play`, { method: "POST" }).catch(() => {});
    }
  }, [game]);

  const handleLike = async () => {
    if (!isLoggedIn || liking) return;
    setLiking(true);
    try {
      const res = await fetch(`/api/games/${gameId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.likeCount);
      }
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/games/${gameId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setCommentText("");
      }
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    const res = await fetch(`/api/games/${gameId}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    const res = await fetch(`/api/games/${gameId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason }),
    });
    if (res.ok) { setReportSent(true); setShowReport(false); }
  };

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
  const engineIcon = game.engineType === "3d" ? <Box size={13} /> : <Layers size={13} />;

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
          <span className="text-white font-semibold">{game.title}</span>
          <button onClick={() => setFullscreen(false)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm">
            Exit Fullscreen
          </button>
        </div>
        <iframe className="flex-1 w-full" srcDoc={game.code} sandbox="allow-scripts" title={game.title} />
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
                  {badge.icon}{badge.label}
                </span>
              )}
              {authorPremium && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-xs font-semibold border border-yellow-500/30">
                  <Zap size={10} />Premium
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-gray-500">{engineIcon}{ENGINE_LABELS[game.engineType]}</span>
              <span className="flex items-center gap-1 text-xs text-green-400"><Globe size={10} />Public</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Like button */}
            <button
              onClick={handleLike}
              disabled={!isLoggedIn || liking}
              title={isLoggedIn ? (liked ? "Unlike" : "Like") : "Log in to like"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                liked
                  ? "bg-pink-600/20 border-pink-500/50 text-pink-400 hover:bg-pink-600/30"
                  : "bg-gray-700 border-gray-600 text-gray-400 hover:text-pink-400 hover:border-pink-500/50"
              } disabled:opacity-50`}
            >
              <Heart size={14} className={liked ? "fill-current" : ""} />
              {likeCount}
            </button>
            {/* Play count */}
            <span className="flex items-center gap-1.5 text-gray-500 text-sm">
              <Eye size={14} />{game.playCount}
            </span>
            {/* Report */}
            {isLoggedIn && !reportSent && (
              <button
                onClick={() => setShowReport(true)}
                title="Report game"
                className="p-1.5 text-gray-500 hover:text-orange-400 transition-colors"
              >
                <Flag size={15} />
              </button>
            )}
            {reportSent && <span className="text-green-400 text-xs">Reported</span>}
            <button
              onClick={() => setFullscreen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Fullscreen
            </button>
          </div>
        </div>
      </header>

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Report Game</h3>
              <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none"
            >
              <option value="">Select a reason...</option>
              <option value="inappropriate_content">Inappropriate content</option>
              <option value="spam">Spam / advertisement</option>
              <option value="malicious_code">Malicious or broken code</option>
              <option value="copyright">Copyright violation</option>
              <option value="other">Other</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowReport(false)} className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors">Cancel</button>
              <button
                onClick={handleReport}
                disabled={!reportReason}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {game.description && (
          <p className="text-gray-300 bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">{game.description}</p>
        )}

        {/* Tags */}
        {game.tags && game.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {game.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-purple-600/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-medium">
                <Tag size={10} />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Game iframe */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden" style={{ height: "70vh" }}>
          <iframe className="w-full h-full" srcDoc={game.code} sandbox="allow-scripts" title={game.title} />
        </div>

        <p className="text-gray-600 text-xs text-center">Published {new Date(game.updatedAt).toLocaleDateString()}</p>

        {/* Comments */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-white font-semibold text-base">Comments ({comments.length})</h3>
          {isLoggedIn && (
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
                placeholder="Add a comment..."
                maxLength={500}
                className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim() || postingComment}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          )}
          {!isLoggedIn && (
            <p className="text-gray-500 text-sm">
              <Link to="/login" className="text-purple-400 hover:underline">Log in</Link> to leave a comment.
            </p>
          )}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-sm">No comments yet. Be the first!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/profile/${c.username}`} className="text-sm font-medium text-white hover:text-purple-300 transition-colors">{c.username}</Link>
                      <span className="text-gray-600 text-xs">{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-0.5 break-words">{c.text}</p>
                  </div>
                  {canModerate && (
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all flex-shrink-0"
                      title="Delete comment"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
