import { useState, useEffect } from 'react';
import type { Activity, WordSearchContent } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, CheckCircle } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';

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
      playSound('bg-music-playful', { loop: true, volume: 0.15 });
    } else {
      stopSound('bg-music-playful');
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
    if (!cell || !cell.isPartOfWord || cell.wordId === undefined) return false;

    const word = words[cell.wordId];
    return word ? foundWords.has(word) : false;
  };

  if (showCelebration) {
    return (
      <VictoryCelebrationModal
        title="All Words Found!"
        activityTitle={activity.title || 'Word Search'}
        score={Math.round(score)}
        timeTaken={timeElapsed}
        totalQuestions={words.length}
        correctAnswers={foundWords.size}
        onContinue={() => onComplete(score, timeElapsed)}
        continueText="Finish & Claim Rewards"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
      
      {/* Background Shapes & Grid */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-25px) rotate(180deg); }
          }
          @keyframes float-medium {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-40px) rotate(-90deg) scale(1.08); }
          }
          @keyframes float-fast {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-18px) rotate(120deg) scale(0.92); }
          }
          .animate-float-slow {
            animation: float-slow 16s ease-in-out infinite;
          }
          .animate-float-medium {
            animation: float-medium 22s ease-in-out infinite;
          }
          .animate-float-fast {
            animation: float-fast 13s ease-in-out infinite;
          }
        `}</style>

        {/* Soft Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
        
        {/* Colorful Blurred Glowing Blobs */}
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[50%] w-[35%] h-[35%] rounded-full bg-blue-300/10 blur-[100px]" />

        {/* Floating Geometric Shapes */}
        {/* Circles */}
        <div className="absolute w-12 h-12 rounded-full border-2 border-saBlue/15 animate-float-slow" style={{ top: '15%', left: '8%' }} />
        <div className="absolute w-8 h-8 rounded-full border-2 border-blue-400/20 animate-float-fast" style={{ top: '55%', left: '4%' }} />
        
        {/* Squares */}
        <div className="absolute w-10 h-10 border-2 border-blue-400/20 rounded-lg animate-float-fast" style={{ top: '12%', right: '12%' }} />
        <div className="absolute w-14 h-14 border-2 border-saVividOrange/15 rounded-xl animate-float-medium" style={{ top: '48%', left: '88%' }} />
        
        {/* Triangles */}
        <svg className="absolute w-14 h-14 text-saVividOrange/15 animate-float-medium" style={{ top: '75%', left: '12%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 22 2 22" />
        </svg>
        <svg className="absolute w-11 h-11 text-saBlue/15 animate-float-slow" style={{ top: '78%', right: '16%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 22 2 22" />
        </svg>
      </div>

      {/* Header */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white">
        <div className="flex items-center gap-4">
          <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-8 object-contain" />
          <div className="h-6 w-px bg-white/25 hidden sm:block" />
          <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            Word Search
            {activity.items && activity.items.length > 1 && (
              <span className="text-[10px] bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20 font-bold uppercase tracking-wider">
                Grid {currentItem + 1} of {activity.items.length}
              </span>
            )}
          </h2>
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center bg-white/15 px-4 py-2 rounded-xl text-white border border-white/20 font-bold text-sm sm:text-base">
            <Star className="w-4 h-4 mr-2 fill-current" />
            <span>{Math.round(score)} EXP</span>
          </div>
          <div className="flex items-center bg-white/15 px-4 py-2 rounded-xl text-white border border-white/20 font-bold text-sm sm:text-base font-mono">
            <Clock className="w-4 h-4 mr-2" />
            <span>{timeElapsed}s</span>
          </div>
          <Button variant="ghost" onClick={onCancel} className="hover:bg-white/10 text-white/80 hover:text-white p-2 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-200">
        <div
          className="h-full bg-saBlue transition-all duration-500"
          style={{ width: `${words.length > 0 ? (foundWords.size / words.length) * 100 : 0}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10 w-full max-w-7xl mx-auto flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 items-start">
          
          {/* Left Column: Instructions */}
          <div className="lg:col-span-1 order-1 lg:order-1 flex flex-col gap-4 self-stretch">
            <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
              <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider">Instructions</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                {activity.instructions || "Find all hidden words in the grid. Click and drag across adjacent letters horizontally, vertically, or diagonally to select and match the words listed on the right!"}
              </p>
            </Card>
          </div>

          {/* Center Column: Word Search Grid */}
          <div className="lg:col-span-2 order-2 flex flex-col items-center">
            <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs w-full flex flex-col">
              <div className="flex-1 flex items-center justify-center overflow-auto py-2">
                <div
                  className="inline-block"
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div
                    className="grid gap-1 md:gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    }}
                  >
                    {grid.map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`
                            w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center
                            border font-bold text-xs xs:text-sm sm:text-base md:text-lg cursor-pointer
                            transition-all duration-200 select-none rounded-xl
                            ${
                              isCellInFoundWord(rowIndex, colIndex)
                                ? 'bg-emerald-50 border-emerald-350 text-emerald-700 font-extrabold'
                                : isCellSelected(rowIndex, colIndex)
                                  ? 'bg-blue-50 border-saBlue text-saBlue font-extrabold scale-[1.02]'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-350 hover:scale-[1.01]'
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
              <p className="text-[10px] text-slate-400 mt-3 text-center font-bold uppercase tracking-wider">
                Click and drag to select words
              </p>
            </Card>
          </div>

          {/* Right Column: Words List */}
          <div className="lg:col-span-1 order-3 flex flex-col self-stretch">
            <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
              <h3 className="text-sm font-black text-center text-saBlue uppercase tracking-wider border-b border-slate-100 pb-3 mb-4">
                Find These Words
              </h3>
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[280px] lg:max-h-[350px] pr-1">
                {words.map((word, index) => {
                  const isFound = foundWords.has(word);
                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl transition-all duration-200 border flex items-center justify-between font-bold ${
                        isFound
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 line-through opacity-75'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <span className="text-sm md:text-base">{word}</span>
                      {isFound && (
                        <div className="text-emerald-600">
                          <CheckCircle className="w-5 h-5 fill-current" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
