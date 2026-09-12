import { useState, useEffect, useRef } from 'react';
import type { Activity, WordSearchContent } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, CheckCircle } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';
import { toast } from 'sonner';

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
  const [tapStartCell, setTapStartCell] = useState<[number, number] | null>(null);

  const startCellRef = useRef<[number, number] | null>(null);
  const selectedCellsRef = useRef<[number, number][]>([]);
  const isDraggingRef = useRef(false);

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
      setSelectedCells([]);
      selectedCellsRef.current = [];
      setTapStartCell(null);
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
      [0, -1],  // left
      [-1, 0],  // up
      [-1, -1], // diagonal up-left
      [1, -1],  // diagonal down-left
    ];

    // Place each word
    wordList.forEach((word, wordId) => {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!placed && attempts < maxAttempts) {
        attempts++;
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);

        if (canPlaceWord(grid, word, row, col, direction, size)) {
          placeWord(grid, word, row, col, direction, wordId);
          placed = true;
        }
      }
    });

    // Fill empty cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!grid[r][c].letter) {
          grid[r][c].letter = alphabet[Math.floor(Math.random() * alphabet.length)];
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
      const currentCell = grid[r][c];

      if (currentCell.letter && currentCell.letter !== word[i]) {
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

  const getCellSizeClass = (size: number) => {
    if (size <= 8) {
      return 'w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 text-sm sm:text-base md:text-lg rounded-xl';
    }
    if (size <= 10) {
      return 'w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 text-xs xs:text-sm sm:text-base rounded-lg sm:rounded-xl';
    }
    if (size <= 12) {
      return 'w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 text-[11px] xs:text-xs sm:text-sm rounded-md sm:rounded-lg';
    }
    if (size <= 15) {
      return 'w-6 h-6 xs:w-6.5 xs:h-6.5 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[10px] xs:text-[11px] sm:text-xs rounded-sm sm:rounded-md';
    }
    if (size <= 18) {
      return 'w-5 h-5 xs:w-5.5 xs:h-5.5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[9px] xs:text-[10px] sm:text-xs rounded-xs sm:rounded-sm';
    }
    return 'w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[8px] xs:text-[9px] sm:text-[10px] rounded-xs';
  };

  const getCellsInLine = (start: [number, number], end: [number, number]): [number, number][] => {
    const [r1, c1] = start;
    const [r2, c2] = end;

    if (r1 === r2 && c1 === c2) {
      return [[r1, c1]];
    }

    const dr = r2 - r1;
    const dc = c2 - c1;
    const absDr = Math.abs(dr);
    const absDc = Math.abs(dc);

    // Direction must be horizontal, vertical, or 45-degree diagonal
    const isHorizontal = dr === 0 && dc !== 0;
    const isVertical = dc === 0 && dr !== 0;
    const isDiagonal = absDr === absDc;

    if (!isHorizontal && !isVertical && !isDiagonal) {
      return [];
    }

    const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    const steps = Math.max(absDr, absDc);

    const result: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      result.push([r1 + stepR * i, c1 + stepC * i]);
    }
    return result;
  };

  const checkWord = (cells: [number, number][] = selectedCellsRef.current) => {
    if (cells.length < 2) {
      setSelectedCells([]);
      selectedCellsRef.current = [];
      return;
    }

    const selectedWord = cells
      .map(([row, col]) => grid[row]?.[col]?.letter || '')
      .join('');

    const reversedWord = selectedWord.split('').reverse().join('');

    const matchedWord = words.find(
      word => word.toUpperCase() === selectedWord.toUpperCase() || word.toUpperCase() === reversedWord.toUpperCase()
    );

    if (matchedWord && !foundWords.has(matchedWord)) {
      // In live mode, students can find ANY word. If it matches targetWord, give bonus!
      const isTarget = Boolean(isLive && targetWord && matchedWord.toUpperCase() === targetWord.toUpperCase());

      const newFoundWords = new Set(foundWords);
      newFoundWords.add(matchedWord);
      setFoundWords(newFoundWords);

      const basePoints = activity.items?.[currentItem]?.points || 10;
      const points = isTarget ? basePoints * 2 : basePoints;
      const newScore = score + points;
      setScore(newScore);

      const timeTaken = Math.floor((Date.now() - startTime) / 1000);

      if (onWordFound) {
        onWordFound(matchedWord, timeTaken);
      }

      // Submit response
      submitResponse(matchedWord, true);

      playSound('correct');
      toast.success(`Found word: "${matchedWord}"! +${points} EXP`);
      confetti({
        particleCount: isTarget ? 100 : 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Check if all words are found in current item
      if (newFoundWords.size === words.length) {
        if (currentItem < (activity.items?.length || 1) - 1) {
          // More items to go
          toast.success(`Grid ${currentItem + 1} completed! Loading next grid...`);
          setTimeout(() => {
            setCurrentItem(currentItem + 1);
          }, 1500);
        } else {
          // All items completed
          toast.success('🎉 Congratulations! All words found!');
          setTimeout(() => {
            handleComplete(newScore);
          }, 800);
        }
      }
    } else if (matchedWord) {
      // Word already found
      playSound('incorrect');
      toast.info(`"${matchedWord}" was already found!`);
    }

    setSelectedCells([]);
    selectedCellsRef.current = [];
    setTapStartCell(null);
  };

  const handleMouseDown = (row: number, col: number) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    setTapStartCell(null);
    startCellRef.current = [row, col];
    setSelectedCells([[row, col]]);
    selectedCellsRef.current = [[row, col]];
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDraggingRef.current && startCellRef.current) {
      const line = getCellsInLine(startCellRef.current, [row, col]);
      if (line.length > 0) {
        setSelectedCells(line);
        selectedCellsRef.current = line;
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      const cells = selectedCellsRef.current;
      startCellRef.current = null;
      if (cells.length > 1) {
        checkWord(cells);
      }
    }
  };

  const handleTouchStart = (_e: React.TouchEvent, row: number, col: number) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    setTapStartCell(null);
    startCellRef.current = [row, col];
    setSelectedCells([[row, col]]);
    selectedCellsRef.current = [[row, col]];
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !startCellRef.current) return;
    if (e.cancelable) {
      e.preventDefault();
    }
    const touch = e.touches[0];
    if (!touch) return;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!target) return;
    const cellEl = target.closest('[data-cell-row]');
    if (cellEl) {
      const r = parseInt(cellEl.getAttribute('data-cell-row') || '-1', 10);
      const c = parseInt(cellEl.getAttribute('data-cell-col') || '-1', 10);
      if (r >= 0 && c >= 0) {
        const line = getCellsInLine(startCellRef.current, [r, c]);
        if (line.length > 0) {
          setSelectedCells(line);
          selectedCellsRef.current = line;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      const cells = selectedCellsRef.current;
      startCellRef.current = null;
      if (cells.length > 1) {
        checkWord(cells);
      } else if (cells.length === 1) {
        // Enable tap-to-select mode on phone
        setTapStartCell(cells[0]);
      }
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (isDraggingRef.current) return;
    if (!tapStartCell) {
      setTapStartCell([row, col]);
      setSelectedCells([[row, col]]);
      selectedCellsRef.current = [[row, col]];
    } else {
      if (tapStartCell[0] === row && tapStartCell[1] === col) {
        setTapStartCell(null);
        setSelectedCells([]);
        selectedCellsRef.current = [];
      } else {
        const line = getCellsInLine(tapStartCell, [row, col]);
        if (line.length > 1) {
          setSelectedCells(line);
          selectedCellsRef.current = line;
          checkWord(line);
          setTapStartCell(null);
        } else {
          setTapStartCell([row, col]);
          setSelectedCells([[row, col]]);
          selectedCellsRef.current = [[row, col]];
        }
      }
    }
  };

  const resetGame = () => {
    setShowCelebration(false);
    setFoundWords(new Set());
    setSelectedCells([]);
    selectedCellsRef.current = [];
    setTapStartCell(null);
    startCellRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
    setScore(0);
    setTimeElapsed(0);
    if (words.length > 0 && gridSize > 0) {
      setGrid(generateGrid(words, gridSize));
    }
  };

  const handleComplete = (finalScore: number) => {
    setScore(finalScore);
    setShowCelebration(true);
    stopAll();
    playSound('game-over');

    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
    });
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
    const cell = grid[row]?.[col];
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
        onPlayAgain={resetGame}
        playAgainText="Play Again"
        onContinue={() => onComplete(score, timeElapsed)}
        continueText="Back to Activities"
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
            animation: float-slow 7s ease-in-out infinite;
          }
          .animate-float-medium {
            animation: float-medium 5s ease-in-out infinite;
          }
          .animate-float-fast {
            animation: float-fast 3.5s ease-in-out infinite;
          }
        `}</style>

        {/* Blueprint background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

        {/* Floating background ambient colors */}
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />

        {/* Circles */}
        <div className="absolute w-12 h-12 border-2 border-saBlue/20 rounded-full animate-float-slow" style={{ top: '15%', left: '8%' }} />
        <div className="absolute w-8 h-8 border-2 border-saVividOrange/20 rounded-full animate-float-fast" style={{ top: '65%', right: '10%' }} />
        <div className="absolute w-16 h-16 border-2 border-saBlue/15 rounded-full animate-float-medium" style={{ top: '35%', right: '5%' }} />
        
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
      <div className="px-4 py-3 sm:px-6 sm:py-3.5 flex flex-row justify-between items-center gap-3 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center shrink-0">
            <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-6 sm:h-7 w-auto object-contain" />
          </div>
          <div className="h-5 sm:h-6 w-px bg-white/25 hidden sm:block" />
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            Word Search
            {activity.items && activity.items.length > 1 && (
              <span className="text-[10px] bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20 font-bold uppercase tracking-wider">
                Grid {currentItem + 1} of {activity.items.length}
              </span>
            )}
          </h2>
          <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 sm:p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center bg-white/15 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-white border border-white/20 font-bold text-xs sm:text-base">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 fill-current" />
            <span>{Math.round(score)} EXP</span>
          </div>
          <div className="flex items-center bg-white/15 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-white border border-white/20 font-bold text-xs sm:text-base font-mono">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span>{timeElapsed}s</span>
          </div>
          <Button variant="ghost" onClick={onCancel} className="hover:bg-white/10 text-white/80 hover:text-white p-1.5 sm:p-2 rounded-xl transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-200 shrink-0">
        <div
          className="h-full bg-saBlue transition-all duration-500"
          style={{ width: `${words.length > 0 ? (foundWords.size / words.length) * 100 : 0}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative z-10 w-full">
        <div className="w-full max-w-7xl mx-auto py-2 sm:py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
              
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
                  className="inline-block touch-none select-none"
                  style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                >
                  <div
                    className={`grid ${gridSize > 12 ? 'gap-0.5 sm:gap-1' : 'gap-1 md:gap-1.5'}`}
                    style={{
                      gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                      touchAction: 'none',
                    }}
                  >
                    {grid.map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          data-cell-row={rowIndex}
                          data-cell-col={colIndex}
                          style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                          className={`
                            ${getCellSizeClass(gridSize)} flex items-center justify-center
                            border font-bold cursor-pointer
                            transition-all duration-150 select-none
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
                          onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                        >
                          {cell.letter}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-3 text-center font-bold uppercase tracking-wider">
                Drag or tap first & last letter to select words
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
    </div>
  );
}
