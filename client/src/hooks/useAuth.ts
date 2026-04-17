import { useState, useEffect, useContext, createContext, useRef } from "react";

interface AuthState {
  username: string | null;
  isLoggedIn: boolean;
  rank: string;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  register: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  username: null,
  isLoggedIn: false,
  rank: "user",
  loading: true,
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider(): AuthState {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rank, setRank] = useState<string>("user");
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
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
