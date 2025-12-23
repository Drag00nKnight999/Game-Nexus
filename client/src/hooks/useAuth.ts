import { useState, useEffect } from "react";

export function useAuth() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rank, setRank] = useState<string>("user");
  const [loadingRank, setLoadingRank] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem("gameNexusUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setIsLoggedIn(true);
      fetchUserRank(savedUsername);
    }
  }, []);

  const fetchUserRank = async (username: string) => {
    setLoadingRank(true);
    try {
      const response = await fetch(`/api/user/rank/${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        setRank(data.rank);
      }
    } catch (err) {
      console.error("Failed to fetch user rank:", err);
    } finally {
      setLoadingRank(false);
    }
  };

  const login = (newUsername: string) => {
    localStorage.setItem("gameNexusUsername", newUsername);
    setUsername(newUsername);
    setIsLoggedIn(true);
    fetchUserRank(newUsername);
  };

  const logout = () => {
    localStorage.removeItem("gameNexusUsername");
    localStorage.removeItem("chatUsername");
    setUsername(null);
    setIsLoggedIn(false);
    setRank("user");
  };

  return { username, isLoggedIn, rank, loadingRank, login, logout };
}
