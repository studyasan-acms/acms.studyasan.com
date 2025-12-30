import { useState, useEffect, useRef } from 'react';
import type { Activity, WordSearchContent } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, Search } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';

interface Props {
  activity: Activity;
  attemptId: number | null;
  onComplete: (score: number, timeTaken: number) => void;
  onCancel: () => void;
  // Live mode props
  isLive?: boolean;
  targetWord?: string; // If set, only this word can be found
  onWordFound?: (word: string, timeTaken: number) => void;
}

type Direction = [number, number];
type GridCell = {
  letter: string;
  isPartOfWord: boolean;
  wordId?: number;
};

export default function WordSearchGame({ activity, attemptId, onComplete, onCancel, isLive, targetWord, onWordFound }: Props) {
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [startTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [gridSize, setGridSize] = useState(10);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentItem, setCurrentItem] = useState(0);

  const { playSound, stopSound, stopAll } = useSound();

  useEffect(() => {
    const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music', { loop: true, volume: 0.3 });
    } else {
      stopSound('bg-music');
    }
    return () => stopAll();
  }, [isMuted]);

  useEffect(() => {
    if (activity.items && activity.items.length > 0 && activity.items[currentItem]) {
      const content = activity.items[currentItem].content as WordSearchContent;
      const wordList = content.words || [];
      const size = content.gridSize || 10;

      setWords(wordList);
      setGridSize(size);
      setGrid(generateGrid(wordList, size));
      setFoundWords(new Set()); // Reset found words for new grid
    }
  }, [activity, currentItem]);

  const generateGrid = (wordList: string[], size: number): GridCell[][] => {
    const grid: GridCell[][] = Array(size).fill(null).map(() =>
      Array(size).fill(null).map(() => ({ letter: '', isPartOfWord: false }))
    );

    const directions: Direction[] = [
      [0, 1],   // right
      [1, 0],   // down
      [1, 1],   // diagonal down-right
      [-1, 1],  // diagonal up-right
    ];

    // Place each word
    wordList.forEach((word, wordId) => {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);

        if (canPlaceWord(grid, word, row, col, direction, size)) {
          placeWord(grid, word, row, col, direction, wordId);
          placed = true;
        }
        attempts++;
      }
    });

    // Fill empty cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (!grid[i][j].letter) {
          grid[i][j].letter = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    return grid;
  };

  const canPlaceWord = (
    grid: GridCell[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
    size: number
  ): boolean => {
    const [dx, dy] = direction;
    const endRow = row + dx * (word.length - 1);
    const endCol = col + dy * (word.length - 1);

    if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) {
      return false;
    }

    for (let i = 0; i < word.length; i++) {
      const r = row + dx * i;
      const c = col + dy * i;
      if (grid[r][c].letter && grid[r][c].letter !== word[i]) {
        return false;
      }
    }

    return true;
  };

  const placeWord = (
    grid: GridCell[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
    wordId: number
  ): void => {
    const [dx, dy] = direction;
    for (let i = 0; i < word.length; i++) {
      const r = row + dx * i;
      const c = col + dy * i;
      grid[r][c] = {
        letter: word[i],
        isPartOfWord: true,
        wordId,
      };
    }
  };

  const handleMouseDown = (row: number, col: number) => {
    setIsDragging(true);
    setSelectedCells([[row, col]]);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging) {
      setSelectedCells(prev => {
        const newCells = [...prev];
        const last = newCells[newCells.length - 1];

        // Only add if it's in a straight line from the first cell
        if (newCells.length === 1 || isInLine(newCells[0], last, [row, col])) {
          newCells.push([row, col]);
        }

        return newCells;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    checkWord();
  };

  const isInLine = (
    start: [number, number],
    prev: [number, number],
    current: [number, number]
  ): boolean => {
    const [r1, c1] = start;
    const [r2, c2] = prev;
    const [r3, c3] = current;

    if (start === prev) return true;

    const dx1 = r2 - r1;
    const dy1 = c2 - c1;
    const dx2 = r3 - r2;
    const dy2 = c3 - c2;

    // Check if direction is the same
    if (dx1 === 0 && dx2 === 0) return true; // vertical
    if (dy1 === 0 && dy2 === 0) return true; // horizontal
    if (dx1 !== 0 && dy1 !== 0 && dx2 !== 0 && dy2 !== 0) {
      return (dx1 * dy2 === dx2 * dy1); // diagonal
    }

    return false;
  };

  const checkWord = () => {
    if (selectedCells.length < 2) {
      setSelectedCells([]);
      return;
    }

    const selectedWord = selectedCells
      .map(([row, col]) => grid[row][col].letter)
      .join('');

    const reversedWord = selectedWord.split('').reverse().join('');

    const matchedWord = words.find(
      word => word === selectedWord || word === reversedWord
    );

    if (matchedWord && !foundWords.has(matchedWord)) {
      // In live mode, only allow the target word if set
      if (isLive && targetWord && matchedWord !== targetWord) {
        setSelectedCells([]);
        return;
      }

      const newFoundWords = new Set(foundWords);
      newFoundWords.add(matchedWord);
      setFoundWords(newFoundWords);

      const points = activity.items?.[currentItem]?.points || 10;
      const newScore = score + points;
      setScore(newScore);

      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      if (onWordFound) {
        onWordFound(matchedWord, timeTaken);
      }

      // Submit response
      submitResponse(matchedWord, true);

      playSound('correct');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Check if all words are found in current item
      if (newFoundWords.size === words.length) {
        if (currentItem < (activity.items?.length || 1) - 1) {
          // More items to go
          setTimeout(() => {
            setCurrentItem(currentItem + 1);
          }, 2000); // Show celebration then advance
        } else {
          // All items completed
          setTimeout(() => {
            handleComplete(newScore);
          }, 1000);
        }
      }
    } else if (matchedWord) {
      // Word already found
      playSound('incorrect');
    }

    setSelectedCells([]);
  };

  const handleComplete = (finalScore: number) => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    setShowCelebration(true);
    stopAll();
    playSound('game-over');

    // Big celebration
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      onComplete(finalScore, timeTaken);
    }, 4000);
  };

  const submitResponse = async (word: string, isCorrect: boolean) => {
    if (!attemptId) return; // Skip submission for preview mode
    try {
      await activityAttemptAPI.submitResponse({
        attempt_id: attemptId,
        item_id: activity.items![currentItem].id,
        response: { word },
        is_correct: isCorrect,
      });
    } catch (error) {
      console.error('Failed to submit response', error);
    }
  };

  const isCellSelected = (row: number, col: number): boolean => {
    return selectedCells.some(([r, c]) => r === row && c === col);
  };

  const isCellInFoundWord = (row: number, col: number): boolean => {
    const cell = grid[row][col];
    if (!cell.isPartOfWord || cell.wordId === undefined) return false;

    const word = words[cell.wordId];
    return word ? foundWords.has(word) : false;
  };

  if (showCelebration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a] text-white">
        <Card className="gamified-card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10" />
          <Trophy className="w-32 h-32 mx-auto text-yellow-500 mb-8 animate-bounce relative z-10" />
          <h2 className="text-5xl font-black mb-4 relative z-10">Word Search Complete!</h2>
          <p className="text-3xl text-blue-300 mb-8 font-bold relative z-10">Score: {Math.round(score)}</p>
          <div className="flex justify-center gap-4">
            {[...Array(3)].map((_, i) => (
              <Star key={i} className="w-12 h-12 text-yellow-400 fill-current animate-spin-slow" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <div className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            {activity.title}
          </h2>
          {activity.items && activity.items.length > 1 && (
            <div className="text-sm text-gray-400">
              Grid {currentItem + 1} of {activity.items.length}
            </div>
          )}
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center bg-yellow-400/10 px-6 py-2 rounded-full text-yellow-400 border border-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
            <Star className="w-6 h-6 mr-3 fill-current animate-pulse" />
            <span className="font-bold text-xl">{Math.round(score)}</span>
          </div>
          <div className="flex items-center bg-blue-400/10 px-6 py-2 rounded-full text-blue-400 border border-blue-400/20">
            <Clock className="w-6 h-6 mr-3" />
            <span className="font-bold text-xl font-mono">{timeElapsed}s</span>
          </div>
          <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <X className="w-8 h-8" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${words.length > 0 ? (foundWords.size / words.length) * 100 : 0}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10 w-full max-w-7xl mx-auto flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* Word Search Grid */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="gamified-card p-6 flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center overflow-auto">
                <div
                  className="inline-block"
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    className="grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    }}
                  >
                    {grid.map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`
                            w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center
                            border-2 font-bold text-xs xs:text-sm sm:text-base md:text-lg cursor-pointer
                            transition-all duration-200
                            select-none rounded-lg
                            ${isCellInFoundWord(rowIndex, colIndex)
                              ? 'bg-green-500/20 border-green-400 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                              : isCellSelected(rowIndex, colIndex)
                                ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                                : 'bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500'
                            }
                          `}
                          onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                          onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                        >
                          {cell.letter}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-4 text-center">
                Click and drag to select words
              </p>
            </Card>
          </div>

          {/* Words List */}
          <div className="flex flex-col">
            <Card className="gamified-card p-6 flex-1">
              <h3 className="text-xl font-black mb-6 text-center text-blue-300 uppercase tracking-widest border-b border-blue-500/30 pb-2">
                Find These Words
              </h3>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {words.map((word, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl transition-all duration-300 border ${
                      foundWords.has(word)
                        ? 'bg-green-500/20 text-green-300 border-green-500/50 line-through shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                        : 'bg-slate-800/50 text-slate-200 border-slate-600/50 hover:bg-slate-700/50'
                    }`}
                  >
                    <p className="font-bold text-lg">{word}</p>
                    {foundWords.has(word) && <div className="mt-2 text-green-400"><Star className="w-4 h-4 fill-current inline" /> Found!</div>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
