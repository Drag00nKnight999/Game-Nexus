import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import "@fontsource/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import HomePage from "./pages/HomePage";
import SnakeGame from "./pages/games/SnakeGame";
import MemoryGame from "./pages/games/MemoryGame";
import PlatformerGame from "./pages/games/PlatformerGame";
import BloxdGame from "./pages/games/BloxdGame";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/games/snake" element={<SnakeGame />} />
            <Route path="/games/memory" element={<MemoryGame />} />
            <Route path="/games/platformer" element={<PlatformerGame />} />
            <Route path="/games/bloxd" element={<BloxdGame />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
