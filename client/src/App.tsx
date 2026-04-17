import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import "@fontsource/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthContext, useAuth, useAuthProvider } from "./hooks/useAuth";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import SnakeGame from "./pages/games/SnakeGame";
import MemoryGame from "./pages/games/MemoryGame";
import PlatformerGame from "./pages/games/PlatformerGame";
import BloxdGame from "./pages/games/BloxdGame";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import ChatRoom from "./pages/ChatRoom";
import PlayerProfile from "./pages/PlayerProfile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import NotFound from "./pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/games/snake" element={<SnakeGame />} />
      <Route path="/games/memory" element={<MemoryGame />} />
      <Route path="/games/platformer" element={<PlatformerGame />} />
      <Route path="/games/bloxd" element={<BloxdGame />} />
      <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<PlayerProfile />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfUse />} />
      <Route path="/guidelines" element={<CommunityGuidelines />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  const auth = useAuthProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <BrowserRouter>
          <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>}>
            <AppRoutes />
          </Suspense>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
