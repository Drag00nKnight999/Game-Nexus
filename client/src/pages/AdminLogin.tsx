import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, AlertCircle } from "lucide-react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        navigate("/admin");
      } else {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-500/20 p-4 rounded-lg">
              <Lock className="text-purple-400" size={32} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Admin Access
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Enter admin password to continue
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? "Logging in..." : "Enter Admin Panel"}
            </button>
          </form>

          <p className="text-gray-500 text-xs text-center mt-6">
            GameNexus Admin System
          </p>
        </div>
      </div>
    </div>
  );
}
