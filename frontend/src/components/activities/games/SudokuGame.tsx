import { useState, useEffect } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, RotateCcw, Eraser } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';

interface Props {
    activity: Activity;
    attemptId: number | null;
    onComplete: (score: number, timeTaken: number) => void;
    onCancel: () => void;
}

type SudokuGrid = (number | null)[][];

export default function SudokuGame({ activity, attemptId, onComplete, onCancel }: Props) {
    const [grid, setGrid] = useState<SudokuGrid>([]);
    const [solution, setSolution] = useState<SudokuGrid>([]);
    const [initialGrid, setInitialGrid] = useState<SudokuGrid>([]);
    const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
    const [startTime] = useState(Date.now());
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    // Level progression & game settings from activity with persistence
    const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(`studyasan_sudoku_unlocked_${activity.id}`);
            return saved ? Math.max(1, parseInt(saved, 10) || 1) : 1;
        } catch {
            return 1;
        }
    });
    const [currentLevel, setCurrentLevel] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(`studyasan_sudoku_level_${activity.id}`);
            return saved ? Math.max(1, parseInt(saved, 10) || 1) : 1;
        } catch {
            return 1;
        }
    });
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [levelUpCountdown, setLevelUpCountdown] = useState<number>(5);
    const [hintsUsed, setHintsUsed] = useState(0);
    const [score, setScore] = useState(0);

    const sudokuConfig = activity.items?.[0]?.content || {};
    const isInfiniteLevels = sudokuConfig.isInfiniteLevels !== false;
    const totalLevels = isInfiniteLevels ? null : (sudokuConfig.totalLevels || 5);
    const pointsPerLevel = sudokuConfig.pointsPerLevel || 100;
    const highlightErrors = sudokuConfig.highlightErrors !== false;
    const allowHints = sudokuConfig.allowHints !== false;
    const maxHints = allowHints ? (sudokuConfig.maxHints || 3) : null;

    const { playSound, stopSound, stopAll } = useSound();

    // Winning graphics stay on screen for 5s countdown, then auto-advances
    useEffect(() => {
        if (!showLevelUp) {
            setLevelUpCountdown(5);
            return;
        }

        const timer = setInterval(() => {
            setLevelUpCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showLevelUp]);

    useEffect(() => {
        if (showLevelUp && levelUpCountdown === 0) {
            handleNextLevel();
        }
    }, [showLevelUp, levelUpCountdown]);

    useEffect(() => {
        const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    useEffect(() => {
        if (!isMuted) {
            playSound('bg-music-zen', { loop: true });
        } else {
            stopSound('bg-music-zen');
        }
        return () => stopAll();
    }, [isMuted]);

    // Initial Sudoku loading for level 1
    useEffect(() => {
        loadSudokuForLevel(currentLevel);
    }, []);

    // Get count of cells to remove based on active level (difficulty progression)
    const getCellsToRemoveForLevel = (lvl: number): number => {
        // Level 1: 25 cells removed (Very Easy)
        // Level 2: 32 cells removed (Easy)
        // Level 3: 40 cells removed (Medium)
        // Level 4: 48 cells removed (Hard)
        // Level 5+: 54 cells removed (Expert)
        return Math.min(55, 25 + (lvl - 1) * 7);
    };

    const loadSudokuForLevel = (lvl: number) => {
        const newGrid = generateSudoku();
        const newSolution = JSON.parse(JSON.stringify(newGrid));
        const cellsToRemove = getCellsToRemoveForLevel(lvl);
        const puzzleGrid = removeCells(newGrid, cellsToRemove);

        setGrid(puzzleGrid);
        setSolution(newSolution);
        setInitialGrid(JSON.parse(JSON.stringify(puzzleGrid)));
        setSelectedCell(null);
        setHintsUsed(0);
    };

    const generateSudoku = (): SudokuGrid => {
        const grid: SudokuGrid = Array(9).fill(null).map(() => Array(9).fill(null));
        fillGrid(grid);
        return grid;
    };

    const fillGrid = (grid: SudokuGrid): boolean => {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === null) {
                    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);

                    for (const num of numbers) {
                        if (isValidPlacement(grid, row, col, num)) {
                            grid[row][col] = num;

                            if (fillGrid(grid)) {
                                return true;
                            }

                            grid[row][col] = null;
                        }
                    }

                    return false;
                }
            }
        }
        return true;
    };

    const isValidPlacement = (grid: SudokuGrid, row: number, col: number, num: number): boolean => {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
        }

        // Check column
        for (let x = 0; x < 9; x++) {
            if (grid[x][col] === num) return false;
        }

        // Check 3x3 box
        const startRow = row - (row % 3);
        const startCol = col - (col % 3);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }

        return true;
    };

    const removeCells = (grid: SudokuGrid, count: number): SudokuGrid => {
        const newGrid = JSON.parse(JSON.stringify(grid));
        let removed = 0;

        while (removed < count) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);

            if (newGrid[row][col] !== null) {
                newGrid[row][col] = null;
                removed++;
            }
        }

        return newGrid;
    };

    const handleCellClick = (row: number, col: number) => {
        if (initialGrid[row][col] === null) {
            setSelectedCell([row, col]);
        }
    };

    const handleNumberClick = (num: number) => {
        if (!selectedCell) return;

        const [row, col] = selectedCell;
        if (initialGrid[row][col] !== null) return;

        // If strict immediate error check is enabled, validate and reject wrong placements
        if (highlightErrors && solution[row][col] !== num) {
            playSound('incorrect');
            return;
        }

        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = num;
        setGrid(newGrid);

        if (solution[row][col] === num) {
            playSound('correct');
            confetti({
                particleCount: 15,
                spread: 30,
                origin: { y: 0.6 }
            });

            // Check if level is complete
            if (isPuzzleComplete(newGrid)) {
                handleLevelClear();
            }
        } else {
            playSound('incorrect');
        }

        submitResponse({ row, col, value: num }, solution[row][col] === num);
    };

    const handleLevelClear = () => {
        playSound('correct');
        const newScore = score + pointsPerLevel;
        setScore(newScore);

        const nextLvl = currentLevel + 1;
        setUnlockedLevel(prev => {
            const updated = Math.max(prev, nextLvl);
            try {
                localStorage.setItem(`studyasan_sudoku_unlocked_${activity.id}`, String(updated));
            } catch {}
            return updated;
        });
        try {
            localStorage.setItem(`studyasan_sudoku_level_${activity.id}`, String(nextLvl));
        } catch {}

        submitResponse({ level: currentLevel, cleared: true, totalScore: newScore }, true);

        const isFinalLevel = !isInfiniteLevels && totalLevels !== null && currentLevel >= totalLevels;
        if (isFinalLevel) {
            handleComplete(newScore);
        } else {
            setShowLevelUp(true);
            setLevelUpCountdown(5);
        }
    };

    const handleRevealHint = () => {
        if (!allowHints || (maxHints !== null && hintsUsed >= maxHints)) return;

        // Find empty cells or cells with incorrect entries
        const targetCells: [number, number][] = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (initialGrid[r][c] === null && (grid[r][c] === null || grid[r][c] !== solution[r][c])) {
                    targetCells.push([r, c]);
                }
            }
        }

        if (targetCells.length === 0) return;

        // Pick random target cell
        const [row, col] = targetCells[Math.floor(Math.random() * targetCells.length)];
        const correctVal = solution[row][col];

        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = correctVal;
        setGrid(newGrid);

        // Make it permanent so student cannot modify or erase
        const newInitial = initialGrid.map(r => [...r]);
        newInitial[row][col] = correctVal;
        setInitialGrid(newInitial);

        setHintsUsed(prev => prev + 1);
        playSound('correct');
        confetti({
            particleCount: 20,
            spread: 40,
            origin: { y: 0.6 }
        });

        if (isPuzzleComplete(newGrid)) {
            handleLevelClear();
        }
    };

    const handleNextLevel = () => {
        const nextLvl = currentLevel + 1;
        setCurrentLevel(nextLvl);
        try {
            localStorage.setItem(`studyasan_sudoku_level_${activity.id}`, String(nextLvl));
        } catch {}
        loadSudokuForLevel(nextLvl);
        setShowLevelUp(false);
    };

    const switchLevel = (targetLevel: number) => {
        if (targetLevel > unlockedLevel) return;
        setShowLevelUp(false);
        if (targetLevel === currentLevel) return;
        setCurrentLevel(targetLevel);
        try {
            localStorage.setItem(`studyasan_sudoku_level_${activity.id}`, String(targetLevel));
        } catch {}
        loadSudokuForLevel(targetLevel);
        playSound('click');
    };

    const handleErase = () => {
        if (!selectedCell) return;

        const [row, col] = selectedCell;
        if (initialGrid[row][col] !== null) return;

        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = null;
        setGrid(newGrid);
        playSound('click');
    };

    const isPuzzleComplete = (currentGrid: SudokuGrid): boolean => {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (currentGrid[row][col] === null || currentGrid[row][col] !== solution[row][col]) {
                    return false;
                }
            }
        }
        return true;
    };

    const resetPuzzle = () => {
        setGrid(JSON.parse(JSON.stringify(initialGrid)));
        setSelectedCell(null);
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

    const submitResponse = async (resp: any, isCorrect: boolean) => {
        if (!attemptId || !activity.items || !activity.items[0]) return;
        try {
            await activityAttemptAPI.submitResponse({
                attempt_id: attemptId,
                item_id: activity.items[0].id,
                response: resp,
                is_correct: isCorrect,
            });
        } catch (error) {
            console.error('Failed to submit response', error);
        }
    };

    if (showCelebration) {
        return (
            <VictoryCelebrationModal
                title="Sudoku Solved!"
                activityTitle={activity.title || 'Sudoku Challenge'}
                score={Math.round(score)}
                timeTaken={timeElapsed}
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
            <div className="px-2.5 py-2 sm:px-6 sm:py-3 flex flex-row justify-between items-center gap-1.5 sm:gap-4 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                    <div className="flex items-center shrink-0">
                        <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-5 sm:h-7 w-auto object-contain" />
                    </div>
                    <div className="h-4 sm:h-6 w-px bg-white/25 hidden sm:block" />
                    <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate min-w-0">
                        Sudoku
                    </h2>
                    <span className="hidden xs:inline-block text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/20 font-bold uppercase tracking-wider shrink-0">
                        Lvl {currentLevel}{totalLevels ? `/${totalLevels}` : ''}
                    </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                    <button onClick={() => setIsMuted(!isMuted)} className="p-1 sm:p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-colors shrink-0" title={isMuted ? "Unmute" : "Mute"}>
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                    
                    <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm shrink-0 whitespace-nowrap">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 fill-current text-amber-300" />
                        <span>{Math.round(score)}<span className="hidden xs:inline ml-0.5">EXP</span></span>
                    </div>

                    <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm font-mono shrink-0 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                        <span>{timeElapsed}s</span>
                    </div>

                    <Button variant="ghost" size="icon" onClick={resetPuzzle} className="hover:bg-white/10 text-white/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg transition-colors shrink-0" title="Reset Puzzle">
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                            if (score > 0 || currentLevel > 1) {
                                handleComplete(score);
                            } else {
                                onCancel();
                            }
                        }} 
                        className="hover:bg-white/10 text-white/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg transition-colors shrink-0"
                        title={score > 0 ? "Save & Exit" : "Exit"}
                    >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative z-10 w-full">
                <div className="w-full max-w-7xl mx-auto py-2 sm:py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
                    
                    {/* Left Column: Instructions & Hints */}
                    <div className="lg:col-span-1 order-1 lg:order-1 flex flex-col gap-4 self-stretch justify-between">
                        {/* Instructions */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
                            <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider">Instructions</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                                {activity.instructions || "Fill the 9x9 grid so that every row, column, and 3x3 box contains all digits from 1 to 9 without repetition. Select an empty cell, then select a number from the keypad."}
                            </p>
                        </Card>

                        {/* Hints Control Card */}
                        {allowHints && (
                            <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                                <h3 className="text-xs font-black mb-3 text-saVividOrange uppercase tracking-wider">Hints Assistance</h3>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold text-slate-500">Hints Used:</span>
                                    <span className="text-sm font-extrabold text-slate-700">
                                        {hintsUsed} / {maxHints || '∞'}
                                    </span>
                                </div>
                                <Button 
                                    onClick={handleRevealHint}
                                    disabled={maxHints !== null && hintsUsed >= maxHints}
                                    className="w-full bg-orange-50 hover:bg-orange-100 text-saVividOrange border border-orange-200 font-bold rounded-xl h-10 transition-all text-xs"
                                >
                                    Reveal Hint
                                </Button>
                            </Card>
                        )}
                    </div>

                    {/* Center Column: Sudoku Grid */}
                    <div className="lg:col-span-2 order-2 flex flex-col items-center">
                        <div className="mb-3 text-center">
                            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-xs">
                                <span className="w-3 h-3 rounded-full border border-slate-400 bg-saBlue" />
                                <span className="text-xs font-bold text-slate-700">
                                    SUDOKU PLAYBOARD
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                                Level {currentLevel} · Auto Generated Grid
                            </p>
                        </div>

                        <Card className="p-3 flex items-center justify-center bg-white border border-slate-200 rounded-3xl shadow-sm">
                            <div className="inline-block">
                                <div className="grid grid-cols-9 gap-0 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-lg select-none">
                                    {grid.map((row, rowIndex) => (
                                        row.map((cell, colIndex) => {
                                            const isInitial = initialGrid[rowIndex][colIndex] !== null;
                                            const isSelected = selectedCell && selectedCell[0] === rowIndex && selectedCell[1] === colIndex;
                                            const isInSameRow = selectedCell && selectedCell[0] === rowIndex;
                                            const isInSameCol = selectedCell && selectedCell[1] === colIndex;
                                            const isInSameBox = selectedCell &&
                                                Math.floor(selectedCell[0] / 3) === Math.floor(rowIndex / 3) &&
                                                Math.floor(selectedCell[1] / 3) === Math.floor(colIndex / 3);

                                            const thickBorderRight = (colIndex + 1) % 3 === 0 && colIndex !== 8;
                                            const thickBorderBottom = (rowIndex + 1) % 3 === 0 && rowIndex !== 8;

                                            // Determine custom cell colors
                                            let cellBg = isInitial ? 'bg-slate-50/90' : 'bg-white';
                                            let cellText = isInitial ? 'text-saBlue font-extrabold' : 'text-slate-800';

                                            if (isSelected) {
                                                cellBg = 'bg-blue-50';
                                            } else if (!isSelected && (isInSameRow || isInSameCol || isInSameBox)) {
                                                cellBg = 'bg-slate-50/50';
                                            }

                                            // Highlight wrong entries in red if they've written anything
                                            const isWrong = cell !== null && cell !== solution[rowIndex][colIndex];
                                            if (isWrong && highlightErrors) {
                                                cellBg = 'bg-red-50/80';
                                                cellText = 'text-red-600 font-bold';
                                            }

                                            return (
                                                <div
                                                    key={`${rowIndex}-${colIndex}`}
                                                    className={`
                                                      w-8 h-8 xs:w-9 xs:h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center
                                                      text-sm sm:text-base md:text-lg cursor-pointer transition-all duration-150 select-none
                                                      ${cellBg} ${cellText}
                                                      ${isSelected ? 'ring-2 ring-saBlue ring-inset' : ''}
                                                      ${thickBorderRight ? 'border-r-2 border-slate-700' : 'border-r border-slate-200'}
                                                      ${thickBorderBottom ? 'border-b-2 border-slate-700' : 'border-b border-slate-200'}
                                                      hover:bg-blue-50/40
                                                    `}
                                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                                >
                                                    {cell || ''}
                                                </div>
                                            );
                                        })
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Keypad & Level Tracker */}
                    <div className="lg:col-span-1 order-3 lg:order-3 flex flex-col gap-4 self-stretch justify-between">
                        {/* Number Pad Card */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                            <div className="grid grid-cols-5 md:grid-cols-3 gap-2.5 mb-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button
                                        key={num}
                                        onClick={() => handleNumberClick(num)}
                                        disabled={!selectedCell}
                                        className={`
                                          aspect-square flex items-center justify-center rounded-xl font-extrabold text-lg sm:text-xl
                                          transition-all duration-200 border
                                          ${selectedCell
                                              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:scale-105 active:scale-95 cursor-pointer'
                                              : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                          }
                                        `}
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={handleErase}
                                    disabled={!selectedCell}
                                    className={`
                                      aspect-square flex items-center justify-center rounded-xl font-bold border
                                      transition-all duration-200
                                      ${selectedCell
                                          ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:scale-105 active:scale-95 cursor-pointer'
                                          : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                      }
                                    `}
                                >
                                    <Eraser className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider">
                                Select a cell, then choose a number
                            </p>
                        </Card>

                        {/* Level Tracker Card */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex-1 flex flex-col">
                            <h3 className="text-xs font-black mb-3 text-saBlue uppercase tracking-wider">Level Progression</h3>
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 flex-1">
                                {[...Array(Math.max(totalLevels || 5, unlockedLevel))].map((_, i) => {
                                    const lvlNum = i + 1;
                                    const isActive = lvlNum === currentLevel;
                                    const isCleared = lvlNum < currentLevel;
                                    const isUnlocked = lvlNum <= unlockedLevel;
                                    return (
                                        <button 
                                            key={lvlNum} 
                                            type="button"
                                            disabled={!isUnlocked}
                                            onClick={() => switchLevel(lvlNum)}
                                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all text-left ${
                                                isActive 
                                                    ? 'bg-blue-50 border-blue-200 text-saBlue ring-1 ring-saBlue/30' 
                                                    : isCleared
                                                    ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer'
                                                    : isUnlocked
                                                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50/50 cursor-pointer'
                                                    : 'bg-white border-slate-100 text-slate-300 cursor-not-allowed opacity-60'
                                            }`}
                                        >
                                            <span>Level {lvlNum}</span>
                                            <span className="text-[10px] font-black uppercase">
                                                {isActive ? 'Active' : isCleared ? 'Cleared' : isUnlocked ? 'Unlocked' : 'Locked'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>

            {/* Level Cleared Transition Overlay - Placed at root end of JSX with fixed high z-index */}
            {showLevelUp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="gamified-card p-8 sm:p-10 text-center relative overflow-hidden max-w-sm mx-4 bg-white border border-slate-200 shadow-2xl rounded-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-saBlue/5 to-saVividOrange/5 pointer-events-none" />
                        
                        <div className="relative z-10">
                            <Trophy className="w-20 h-20 mx-auto text-saVividOrange mb-3 animate-bounce" />
                            <h2 className="text-3xl font-black mb-1 text-slate-800">Level {currentLevel} Solved!</h2>
                            <p className="text-xs text-slate-400 mb-5 font-bold uppercase tracking-wider">Puzzle Completed Successfully</p>
                            
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-2">
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-500">Level Clear Bonus:</span>
                                    <span className="text-saVividOrange font-bold">+{pointsPerLevel} EXP</span>
                                </div>
                                <div className="h-px bg-slate-200/60" />
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-700 font-bold">Total EXP:</span>
                                    <span className="text-saBlue font-bold">{Math.round(score)} EXP</span>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <Button 
                                    onClick={handleNextLevel} 
                                    className="w-full h-11 bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Next Level (Level {currentLevel + 1})</span>
                                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-mono">{levelUpCountdown}s</span>
                                </Button>
                                <Button 
                                    onClick={() => {
                                        setShowLevelUp(false);
                                        handleComplete(score);
                                    }} 
                                    variant="outline"
                                    className="w-full h-11 border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-sm tracking-wide cursor-pointer"
                                >
                                    Finish & Save Score ({Math.round(score)} EXP)
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
