import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Info, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { useAudio } from "@/lib/stores/useAudio";

const CARD_SYMBOLS = ["🎮", "🎲", "🎯", "🎪", "🎨", "🎭", "🎵", "🎸"];

interface Card {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [bestScore, setBestScore] = useState(() => {
    const saved = localStorage.getItem("memory-bestscore");
    return saved ? parseInt(saved) : Infinity;
  });

  const { isMuted, toggleMute, playHit, playSuccess, setHitSound, setSuccessSound } = useAudio();

  useEffect(() => {
    const hit = new Audio("/sounds/hit.mp3");
    const success = new Audio("/sounds/success.mp3");
    setHitSound(hit);
    setSuccessSound(success);
  }, [setHitSound, setSuccessSound]);

  const initializeGame = useCallback(() => {
    const cardPairs = [...CARD_SYMBOLS, ...CARD_SYMBOLS];
    const shuffledCards = shuffleArray(cardPairs).map((symbol, index) => ({
      id: index,
      symbol,
      isFlipped: false,
      isMatched: false,
    }));
    setCards(shuffledCards);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setIsLocked(false);
    setGameWon(false);
  }, []);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const handleCardClick = (cardId: number) => {
    if (isLocked) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const newCards = cards.map((c) =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(newCards);

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      setMoves((m) => m + 1);
      setIsLocked(true);

      const [firstId, secondId] = newFlippedCards;
      const firstCard = newCards.find((c) => c.id === firstId)!;
      const secondCard = newCards.find((c) => c.id === secondId)!;

      if (firstCard.symbol === secondCard.symbol) {
        playSuccess();
        const matchedCards = newCards.map((c) =>
          c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
        );
        setCards(matchedCards);
        setFlippedCards([]);
        setIsLocked(false);
        
        const newMatches = matches + 1;
        setMatches(newMatches);

        if (newMatches === CARD_SYMBOLS.length) {
          setGameWon(true);
          const finalMoves = moves + 1;
          if (finalMoves < bestScore) {
            setBestScore(finalMoves);
            localStorage.setItem("memory-bestscore", finalMoves.toString());
          }
        }
      } else {
        playHit();
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((c) =>
              c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
            )
          );
          setFlippedCards([]);
          setIsLocked(false);
        }, 1000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col">
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
            onClick={initializeGame}
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

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-6 flex gap-8">
          <div className="text-center">
            <div className="text-gray-400 text-sm">Moves</div>
            <div className="text-3xl font-bold text-white">{moves}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">Matches</div>
            <div className="text-3xl font-bold text-purple-400">{matches}/{CARD_SYMBOLS.length}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400 text-sm">Best</div>
            <div className="text-3xl font-bold text-green-400">
              {bestScore === Infinity ? "-" : bestScore}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 max-w-md">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl text-3xl sm:text-4xl flex items-center justify-center transition-all duration-300 transform ${
                card.isFlipped || card.isMatched
                  ? "bg-purple-600 rotate-0"
                  : "bg-gray-700 hover:bg-gray-600 cursor-pointer"
              } ${card.isMatched ? "opacity-70" : ""}`}
              style={{
                transformStyle: "preserve-3d",
              }}
              disabled={card.isFlipped || card.isMatched || isLocked}
            >
              {card.isFlipped || card.isMatched ? card.symbol : "?"}
            </button>
          ))}
        </div>
      </main>

      {gameWon && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Congratulations!</h2>
            <p className="text-gray-300 mb-4">
              You won in {moves} moves!
              {moves === bestScore && (
                <span className="block text-green-400 mt-2">New Best Score!</span>
              )}
            </p>
            <button
              onClick={initializeGame}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">How to Play Memory</h2>
            <ul className="text-gray-300 space-y-2 mb-6">
              <li>Click on a card to flip it over</li>
              <li>Find and match pairs of identical symbols</li>
              <li>Remember where each symbol is located</li>
              <li>Match all pairs with the fewest moves possible</li>
            </ul>
            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
