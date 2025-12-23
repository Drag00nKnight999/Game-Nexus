import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import "@fontsource/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "./hooks/useAuth";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import SnakeGame from "./pages/games/SnakeGame";
import MemoryGame from "./pages/games/MemoryGame";
import PlatformerGame from "./pages/games/PlatformerGame";
import BloxdGame from "./pages/games/BloxdGame";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/not-found";

function ProtectedRoute({ isLoggedIn, children }: { isLoggedIn: boolean; children: React.ReactNode }) {
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/games/snake" element={<SnakeGame />} />
      <Route path="/games/memory" element={<MemoryGame />} />
      <Route path="/games/platformer" element={<PlatformerGame />} />
      <Route path="/games/bloxd" element={<BloxdGame />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <ChatRoom />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute isLoggedIn={isLoggedIn}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
