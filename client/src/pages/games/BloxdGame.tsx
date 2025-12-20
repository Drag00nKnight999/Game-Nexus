import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BloxdGame() {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Bloxd.io Scratch Edition</h1>
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Games
          </Link>
        </div>
      </header>

      <main className="w-full h-[calc(100vh-80px)]">
        <iframe
          src="/games/Bloxd.io_Scratch_Edition.html"
          title="Bloxd.io Scratch Edition"
          className="w-full h-full border-none"
          allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; execution-while-not-rendered; execution-while-out-of-viewport; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; navigation-override; payment; picture-in-picture; publickey-credentials-get; speaker-selection; sync-xhr; usb; vr; wake-lock; xr-spatial-tracking"
        />
      </main>
    </div>
  );
}
