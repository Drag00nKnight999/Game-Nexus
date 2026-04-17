import { useState, useEffect } from "react";

export function useAuth() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rank, setRank] = useState<string>("user");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.username) {
          setUsername(data.username);
          setIsLoggedIn(true);
          setRank(data.rank || "user");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (usernameInput: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      setUsername(data.username);
      setIsLoggedIn(true);
      setRank(data.rank || "user");
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  };

  const register = async (usernameInput: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Registration failed" };
      setUsername(data.username);
      setIsLoggedIn(true);
      setRank(data.rank || "user");
      return {};
    } catch {
      return { error: "Network error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setUsername(null);
    setIsLoggedIn(false);
    setRank("user");
  };

  return { username, isLoggedIn, rank, loading, login, register, logout };
}
