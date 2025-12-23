import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }
    if (username.length > 20) {
      setError("Username must be 20 characters or less");
      return;
    }
    localStorage.setItem("gameNexusUsername", username);
    navigate("/chat");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Home
        </Link>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
          <h1 className="text-3xl font-bold text-white mb-2">GameNexus</h1>
          <p className="text-gray-400 mb-6">Sign in to access chat and features</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Enter your username"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                maxLength={20}
              />
              <p className="text-xs text-gray-500 mt-1">{username.length}/20 characters</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
            >
              Sign In
            </button>
          </form>
          <p className="text-gray-400 text-sm mt-6">
            By signing in, you agree to our community guidelines and terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
