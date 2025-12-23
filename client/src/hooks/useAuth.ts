import { useState, useEffect } from "react";

export function useAuth() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem("gameNexusUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setIsLoggedIn(true);
    }
  }, []);

  const login = (newUsername: string) => {
    localStorage.setItem("gameNexusUsername", newUsername);
    setUsername(newUsername);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("gameNexusUsername");
    localStorage.removeItem("chatUsername");
    setUsername(null);
    setIsLoggedIn(false);
  };

  return { username, isLoggedIn, login, logout };
}
