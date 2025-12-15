import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Info, Volume2, VolumeX } from "lucide-react";
import { useAudio } from "@/lib/stores/useAudio";

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Position = { x: number; y: number };

export default function SnakeGame() {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("snake-highscore");
    return saved ? parseInt(saved) : 0;
  });
  const [isPaused, setIsPaused] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const { isMuted, toggleMute, playHit, playSuccess, setHitSound, setSuccessSound } = useAudio();
  const directionRef = useRef(direction);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hit = new Audio("/sounds/hit.mp3");
    const success = new Audio("/sounds/success.mp3");
    setHitSound(hit);
    setSuccessSound(success);
  }, [setHitSound, setSuccessSound]);

  const generateFood = useCallback((currentSnake: Position[]): Position => {
    let newFood: Position;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection("RIGHT");
    directionRef.current = "RIGHT";
    setGameOver(false);
    setScore(0);
    setIsPaused(true);
  }, [generateFood]);

  const moveSnake = useCallback(() => {
    setSnake((prevSnake) => {
      const head = { ...prevSnake[0] };
      const currentDirection = directionRef.current;

      switch (currentDirection) {
        case "UP":
          head.y -= 1;
          break;
        case "DOWN":
          head.y += 1;
          break;
        case "LEFT":
          head.x -= 1;
          break;
        case "RIGHT":
          head.x += 1;
          break;
      }

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        playHit();
        return prevSnake;
      }

      if (prevSnake.some((seg) => seg.x === head.x && seg.y === head.y)) {
        setGameOver(true);
        playHit();
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      if (head.x === food.x && head.y === food.y) {
        setScore((s) => {
          const newScore = s + 10;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("snake-highscore", newScore.toString());
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
        playSuccess();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [food, generateFood, highScore, playHit, playSuccess]);

  useEffect(() => {
    if (!isPaused && !gameOver) {
      gameLoopRef.current = setInterval(moveSnake, INITIAL_SPEED);
    }
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isPaused, gameOver, moveSnake]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (gameOver) {
          resetGame();
        } else {
          setIsPaused((p) => !p);
        }
        return;
      }

      if (isPaused || gameOver) return;

      const currentDir = directionRef.current;
      let newDirection: Direction | null = null;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (currentDir !== "DOWN") newDirection = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (currentDir !== "UP") newDirection = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (currentDir !== "RIGHT") newDirection = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (currentDir !== "LEFT") newDirection = "RIGHT";
          break;
      }

      if (newDirection) {
        directionRef.current = newDirection;
        setDirection(newDirection);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaused, gameOver, resetGame]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Games</span>
        </Link>
        <div className="flex items-center gap-4">
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

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-4 flex gap-8">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Score</div>
            <div className="text-3xl font-bold text-white">{score}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">High Score</div>
            <div className="text-3xl font-bold text-green-400">{highScore}</div>
          </div>
        </div>

        <div
          className="relative bg-gray-800 rounded-lg border-4 border-gray-700"
          style={{
            width: GRID_SIZE * CELL_SIZE,
            height: GRID_SIZE * CELL_SIZE,
          }}
        >
          {snake.map((segment, index) => (
            <div
              key={index}
              className={`absolute rounded-sm ${index === 0 ? "bg-green-400" : "bg-green-500"}`}
              style={{
                width: CELL_SIZE - 2,
                height: CELL_SIZE - 2,
                left: segment.x * CELL_SIZE + 1,
                top: segment.y * CELL_SIZE + 1,
              }}
            />
          ))}

          <div
            className="absolute bg-red-500 rounded-full"
            style={{
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              left: food.x * CELL_SIZE + 2,
              top: food.y * CELL_SIZE + 2,
            }}
          />

          {(isPaused || gameOver) && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg">
              {gameOver ? (
                <>
                  <div className="text-red-400 text-2xl font-bold mb-2">Game Over!</div>
                  <div className="text-white mb-4">Final Score: {score}</div>
                </>
              ) : (
                <div className="text-white text-2xl font-bold mb-2">Paused</div>
              )}
              <div className="text-gray-400 text-sm">Press SPACE to {gameOver ? "restart" : "play"}</div>
            </div>
          )}
        </div>

        <div className="mt-4 text-gray-400 text-sm">
          Use Arrow Keys or WASD to move
        </div>
      </main>

      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">How to Play Snake</h2>
            <ul className="text-gray-300 space-y-2 mb-6">
              <li>Use Arrow Keys or WASD to control the snake</li>
              <li>Eat the red food to grow and score points</li>
              <li>Don't hit the walls or your own tail</li>
              <li>Press SPACE to pause/resume the game</li>
            </ul>
            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
