import { Suspense, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { Link } from "react-router-dom";
import { ArrowLeft, Info, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useAudio } from "@/lib/stores/useAudio";
import * as THREE from "three";

enum Controls {
  left = "left",
  right = "right",
  jump = "jump",
}

const keyMap = [
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
  { name: Controls.jump, keys: ["ArrowUp", "KeyW", "Space"] },
];

interface Platform {
  id: number;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}

interface Coin {
  id: number;
  position: [number, number, number];
  collected: boolean;
}

const GRAVITY = -0.015;
const JUMP_FORCE = 0.25;
const MOVE_SPEED = 0.12;
const PLAYER_SIZE = 0.5;

function Player({ 
  onCoinCollect, 
  coins, 
  platforms, 
  onGameOver, 
  onWin,
  gameActive,
  playHit,
  playSuccess
}: { 
  onCoinCollect: (id: number) => void;
  coins: Coin[];
  platforms: Platform[];
  onGameOver: () => void;
  onWin: () => void;
  gameActive: boolean;
  playHit: () => void;
  playSuccess: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const velocity = useRef({ x: 0, y: 0 });
  const isGrounded = useRef(false);
  const [, getKeys] = useKeyboardControls<Controls>();
  const hasWon = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(0, 1, 0);
      velocity.current = { x: 0, y: 0 };
      isGrounded.current = false;
      hasWon.current = false;
    }
  }, [coins]);

  useFrame(() => {
    if (!ref.current || !gameActive) return;

    const keys = getKeys();
    const pos = ref.current.position;

    if (keys.left) velocity.current.x = -MOVE_SPEED;
    else if (keys.right) velocity.current.x = MOVE_SPEED;
    else velocity.current.x *= 0.8;

    if (keys.jump && isGrounded.current) {
      velocity.current.y = JUMP_FORCE;
      isGrounded.current = false;
    }

    velocity.current.y += GRAVITY;

    const newX = pos.x + velocity.current.x;
    const newY = pos.y + velocity.current.y;

    isGrounded.current = false;

    for (const platform of platforms) {
      const [px, py] = platform.position;
      const [sw, sh] = platform.size;

      const playerBottom = newY - PLAYER_SIZE / 2;
      const playerLeft = newX - PLAYER_SIZE / 2;
      const playerRight = newX + PLAYER_SIZE / 2;

      const platTop = py + sh / 2;
      const platBottom = py - sh / 2;
      const platLeft = px - sw / 2;
      const platRight = px + sw / 2;

      if (
        playerRight > platLeft &&
        playerLeft < platRight &&
        playerBottom <= platTop &&
        playerBottom >= platBottom - 0.1 &&
        velocity.current.y <= 0
      ) {
        pos.y = platTop + PLAYER_SIZE / 2;
        velocity.current.y = 0;
        isGrounded.current = true;
      }
    }

    if (!isGrounded.current) {
      pos.y = newY;
    }

    pos.x = Math.max(-8, Math.min(8, newX));

    if (pos.y < -5) {
      playHit();
      onGameOver();
    }

    for (const coin of coins) {
      if (coin.collected) continue;
      const [cx, cy] = coin.position;
      const dist = Math.sqrt(
        Math.pow(pos.x - cx, 2) + Math.pow(pos.y - cy, 2)
      );
      if (dist < 0.7) {
        playSuccess();
        onCoinCollect(coin.id);
      }
    }

    const uncollected = coins.filter((c) => !c.collected);
    if (uncollected.length === 0 && coins.length > 0 && !hasWon.current) {
      hasWon.current = true;
      onWin();
    }
  });

  return (
    <mesh ref={ref} position={[0, 1, 0]}>
      <boxGeometry args={[PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE]} />
      <meshStandardMaterial color="#3b82f6" />
    </mesh>
  );
}

function Platform({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Coin({ position, collected }: { position: [number, number, number]; collected: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current && !collected) {
      ref.current.rotation.y = state.clock.elapsedTime * 2;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  if (collected) return null;

  return (
    <mesh ref={ref} position={position}>
      <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
    </mesh>
  );
}

function GameScene({ 
  onCoinCollect, 
  coins, 
  platforms, 
  onGameOver, 
  onWin,
  gameActive,
  playHit,
  playSuccess
}: { 
  onCoinCollect: (id: number) => void;
  coins: Coin[];
  platforms: Platform[];
  onGameOver: () => void;
  onWin: () => void;
  gameActive: boolean;
  playHit: () => void;
  playSuccess: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      
      <color attach="background" args={["#1a1a2e"]} />

      <Player 
        onCoinCollect={onCoinCollect} 
        coins={coins} 
        platforms={platforms}
        onGameOver={onGameOver}
        onWin={onWin}
        gameActive={gameActive}
        playHit={playHit}
        playSuccess={playSuccess}
      />

      {platforms.map((platform) => (
        <Platform
          key={platform.id}
          position={platform.position}
          size={platform.size}
          color={platform.color}
        />
      ))}

      {coins.map((coin) => (
        <Coin key={coin.id} position={coin.position} collected={coin.collected} />
      ))}
    </>
  );
}

function Game3DCanvas({
  onCoinCollect,
  coins,
  platforms,
  onGameOver,
  onWin,
  gameActive,
  playHit,
  playSuccess
}: {
  onCoinCollect: (id: number) => void;
  coins: Coin[];
  platforms: Platform[];
  onGameOver: () => void;
  onWin: () => void;
  gameActive: boolean;
  playHit: () => void;
  playSuccess: () => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 3, 12], fov: 50 }}
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <GameScene
          onCoinCollect={onCoinCollect}
          coins={coins}
          platforms={platforms}
          onGameOver={onGameOver}
          onWin={onWin}
          gameActive={gameActive}
          playHit={playHit}
          playSuccess={playSuccess}
        />
      </Suspense>
    </Canvas>
  );
}

export default function PlatformerGame() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [gameState, setGameState] = useState<"playing" | "gameover" | "win">("playing");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("platformer-highscore");
    return saved ? parseInt(saved) : 0;
  });
  const [gameKey, setGameKey] = useState(0);

  const { isMuted, toggleMute, playHit, playSuccess, setHitSound, setSuccessSound } = useAudio();

  useEffect(() => {
    const hit = new Audio("/sounds/hit.mp3");
    const success = new Audio("/sounds/success.mp3");
    setHitSound(hit);
    setSuccessSound(success);
  }, [setHitSound, setSuccessSound]);

  const platforms: Platform[] = useMemo(() => [
    { id: 1, position: [0, -0.5, 0], size: [4, 0.5, 2], color: "#22c55e" },
    { id: 2, position: [-3, 0.5, 0], size: [2, 0.5, 2], color: "#16a34a" },
    { id: 3, position: [3, 1.5, 0], size: [2, 0.5, 2], color: "#16a34a" },
    { id: 4, position: [-1, 2.5, 0], size: [3, 0.5, 2], color: "#15803d" },
    { id: 5, position: [4, 3.5, 0], size: [2, 0.5, 2], color: "#15803d" },
    { id: 6, position: [-4, 4, 0], size: [2, 0.5, 2], color: "#166534" },
    { id: 7, position: [1, 5, 0], size: [3, 0.5, 2], color: "#166534" },
  ], []);

  const initialCoins: Coin[] = useMemo(() => [
    { id: 1, position: [-3, 1.5, 0], collected: false },
    { id: 2, position: [3, 2.5, 0], collected: false },
    { id: 3, position: [-1, 3.5, 0], collected: false },
    { id: 4, position: [4, 4.5, 0], collected: false },
    { id: 5, position: [-4, 5, 0], collected: false },
    { id: 6, position: [1, 6, 0], collected: false },
  ], []);

  const [coins, setCoins] = useState<Coin[]>(initialCoins);

  const handleCoinCollect = useCallback((id: number) => {
    setCoins((prev) =>
      prev.map((c) => (c.id === id ? { ...c, collected: true } : c))
    );
    setScore((s) => s + 100);
  }, []);

  const handleGameOver = useCallback(() => {
    setGameState("gameover");
  }, []);

  const handleWin = useCallback(() => {
    setGameState("win");
    setScore((currentScore) => {
      if (currentScore > highScore) {
        setHighScore(currentScore);
        localStorage.setItem("platformer-highscore", currentScore.toString());
      }
      return currentScore;
    });
  }, [highScore]);

  const resetGame = useCallback(() => {
    setCoins(initialCoins.map((c) => ({ ...c, collected: false })));
    setScore(0);
    setGameState("playing");
    setGameKey((k) => k + 1);
  }, [initialCoins]);

  return (
    <KeyboardControls map={keyMap}>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <header className="p-4 flex items-center justify-between z-10 relative">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Games</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={resetGame}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Restart Game"
            >
              <RotateCcw size={24} />
            </button>
            <button
              onClick={() => setShowInstructions(true)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Info size={24} />
            </button>
            <button
              onClick={toggleMute}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>
        </header>

        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 flex gap-8">
          <div className="text-center bg-black/50 px-4 py-2 rounded-lg">
            <div className="text-gray-400 text-sm">Score</div>
            <div className="text-2xl font-bold text-white">{score}</div>
          </div>
          <div className="text-center bg-black/50 px-4 py-2 rounded-lg">
            <div className="text-gray-400 text-sm">Coins</div>
            <div className="text-2xl font-bold text-yellow-400">
              {coins.filter((c) => c.collected).length}/{coins.length}
            </div>
          </div>
          <div className="text-center bg-black/50 px-4 py-2 rounded-lg">
            <div className="text-gray-400 text-sm">High Score</div>
            <div className="text-2xl font-bold text-green-400">{highScore}</div>
          </div>
        </div>

        <main className="flex-1 relative">
          <Game3DCanvas
            key={gameKey}
            onCoinCollect={handleCoinCollect}
            coins={coins}
            platforms={platforms}
            onGameOver={handleGameOver}
            onWin={handleWin}
            gameActive={gameState === "playing"}
            playHit={playHit}
            playSuccess={playSuccess}
          />

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm bg-black/50 px-4 py-2 rounded-lg">
            Arrow Keys / WASD to move - Space / W / Up to jump
          </div>
        </main>

        {gameState === "gameover" && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full text-center">
              <div className="text-4xl mb-4">💀</div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">Game Over!</h2>
              <p className="text-gray-300 mb-4">You fell off the platforms!</p>
              <p className="text-white mb-4">Final Score: {score}</p>
              <button
                onClick={resetGame}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {gameState === "win" && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full text-center">
              <div className="text-4xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold text-yellow-400 mb-2">You Win!</h2>
              <p className="text-gray-300 mb-2">All coins collected!</p>
              <p className="text-white mb-4">Final Score: {score}</p>
              {score >= highScore && (
                <p className="text-green-400 mb-4">New High Score!</p>
              )}
              <button
                onClick={resetGame}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {showInstructions && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-4">How to Play Platformer</h2>
              <ul className="text-gray-300 space-y-2 mb-6">
                <li>Use Arrow Keys or A/D to move left/right</li>
                <li>Press Space, W, or Up Arrow to jump</li>
                <li>Collect all the golden coins to win</li>
                <li>Don't fall off the platforms!</li>
              </ul>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>
    </KeyboardControls>
  );
}
