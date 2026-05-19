import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Crown, Code2, Shield, Zap, User, Mail, MessageSquare } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const AVATAR_COLORS = [
  "#818cf8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa",
  "#fb923c", "#a78bfa", "#4ade80", "#f87171", "#38bdf8",
];

export default function AccountSettings() {
  const { username, rank, isPremium, refreshAuth, unreadDMs } = useAuth();
  const [bio, setBio] = useState("");
  const [avatarColor, setAvatarColor] = useState("#818cf8");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        setBio(d.bio || "");
        setAvatarColor(d.avatarColor || "#818cf8");
        setEmail(d.email || "");
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setEmailError("");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Invalid email address");
      return;
    }
    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, avatarColor, email }),
      });
      if (res.ok) {
        setSuccess(true);
        await refreshAuth();
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const rankBadge =
    rank === "owner" ? { label: "OWNER", bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-300", Icon: Crown } :
    rank === "developer" ? { label: "DEV", bg: "bg-purple-600/20 border-purple-600/40", text: "text-purple-300", Icon: Code2 } :
    rank === "admin" ? { label: "ADMIN", bg: "bg-orange-500/20 border-orange-500/40", text: "text-orange-300", Icon: Shield } :
    null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-white font-bold text-xl">Account Settings</h1>
          {unreadDMs > 0 && (
            <Link to="/messages" className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded-lg text-sm hover:bg-purple-600/30 transition-colors">
              <MessageSquare size={14} />
              {unreadDMs} new DM{unreadDMs !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile preview */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-4">Profile Preview</h2>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
              style={{ backgroundColor: avatarColor }}
            >
              {username?.[0]?.toUpperCase() || <User size={24} />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-lg">{username}</span>
                {rankBadge && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${rankBadge.bg} ${rankBadge.text}`}>
                    <rankBadge.Icon size={11} />{rankBadge.label}
                  </span>
                )}
                {isPremium && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-semibold">
                    <Zap size={10} />Premium
                  </span>
                )}
              </div>
              {bio && <p className="text-gray-400 text-sm">{bio}</p>}
            </div>
          </div>
        </div>

        {/* Avatar color */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold">Avatar Color</h2>
          <div className="flex gap-3 flex-wrap">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setAvatarColor(c)}
                className={`w-9 h-9 rounded-full transition-transform hover:scale-110 ${avatarColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-110" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={avatarColor}
              onChange={(e) => setAvatarColor(e.target.value)}
              className="w-9 h-9 rounded-full cursor-pointer border-0 bg-transparent"
              title="Custom color"
            />
          </div>
        </div>

        {/* Bio */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-3">
          <h2 className="text-white font-semibold">Bio</h2>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={4}
            placeholder="Tell the community about yourself..."
            className="w-full bg-gray-700 text-white text-sm px-4 py-3 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
          />
          <p className="text-gray-500 text-xs text-right">{bio.length}/300</p>
        </div>

        {/* Email */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Mail size={16} className="text-purple-400" />
            Email Address
            <span className="text-gray-500 text-xs font-normal">(private — never shown publicly)</span>
          </h2>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
            placeholder="you@example.com"
            className="w-full bg-gray-700 text-white text-sm px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-gray-500"
          />
          {emailError && <p className="text-red-400 text-sm">{emailError}</p>}
          <p className="text-gray-500 text-xs">Optional. Used for account recovery only.</p>
        </div>

        {/* Account status */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-2">
          <h2 className="text-white font-semibold">Account Status</h2>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-400 text-sm">Membership</span>
            <span className={`flex items-center gap-1.5 text-sm font-semibold ${isPremium ? "text-yellow-300" : "text-gray-400"}`}>
              {isPremium ? <><Zap size={14} />Premium</> : "Free"}
            </span>
          </div>
          {!isPremium && (
            <p className="text-gray-500 text-xs">Publish your first public game to unlock Premium — 50 AI requests/day, premium badge, and more.</p>
          )}
          {rankBadge && (
            <div className="flex items-center justify-between py-2 border-t border-gray-700">
              <span className="text-gray-400 text-sm">Rank</span>
              <span className={`flex items-center gap-1.5 text-sm font-bold ${rankBadge.text}`}>
                <rankBadge.Icon size={14} />{rankBadge.label}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-2 border-t border-gray-700">
            <span className="text-gray-400 text-sm">Messages</span>
            <Link to="/messages" className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <MessageSquare size={14} />
              {unreadDMs > 0 ? `${unreadDMs} unread` : "View inbox"}
            </Link>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {success && <span className="text-green-400 text-sm font-medium">Saved!</span>}
        </div>
      </main>
    </div>
  );
}
