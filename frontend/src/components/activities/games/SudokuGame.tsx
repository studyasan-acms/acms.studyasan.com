import { useState, useEffect } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, RotateCcw, Eraser } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';

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
        const newGrid = generateSudoku();
        const newSolution = JSON.parse(JSON.stringify(newGrid));
        const puzzleGrid = removeCells(newGrid, 40); // Remove 40 cells for medium difficulty

        setGrid(puzzleGrid);
        setSolution(newSolution);
        setInitialGrid(JSON.parse(JSON.stringify(puzzleGrid)));
    }, []);

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

        // Only allow correct entries - validate against solution
        if (solution[row][col] !== num) {
            playSound('incorrect');
            // Visual feedback that it's wrong, but don't place the number
            return;
        }

        const newGrid = grid.map(r => [...r]);
        newGrid[row][col] = num;
        setGrid(newGrid);

        playSound('correct');

        confetti({
            particleCount: 20,
            spread: 40,
            origin: { y: 0.6 }
        });

        // Check if puzzle is complete
        if (isPuzzleComplete(newGrid)) {
            handleComplete();
        }

        submitResponse({ row, col, value: num }, true);
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

    const isPuzzleComplete = (grid: SudokuGrid): boolean => {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === null || grid[row][col] !== solution[row][col]) {
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

    const handleComplete = () => {
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        
        // Calculate score based on time taken
        // Base score: 1000, reduced by time taken (max deduction 900)
        // Faster completion = higher score
        const timeBonus = Math.max(100, 1000 - timeTaken);
        const finalScore = Math.round(timeBonus);
        
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

    const submitResponse = async (response: any, isCorrect: boolean) => {
        if (!attemptId || !activity.items || !activity.items[0]) return;
        try {
            await activityAttemptAPI.submitResponse({
                attempt_id: attemptId,
                item_id: activity.items[0].id,
                response,
                is_correct: isCorrect,
            });
        } catch (error) {
            console.error('Failed to submit response', error);
        }
    };

    if (showCelebration) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a3a] text-white">
                <Card className="gamified-card p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-saBlue/10 to-saVividOrange/10" />
                    <Trophy className="w-32 h-32 mx-auto text-saVividOrange mb-8 animate-bounce relative z-10" />
                    <h2 className="text-5xl font-black mb-4 relative z-10">Sudoku Solved!</h2>
                    <p className="text-xl text-blue-200 mb-2 relative z-10">Time: {timeElapsed}s</p>
                    <p className="text-3xl text-saBlueLight mb-8 font-bold relative z-10">Score: {Math.max(100, 1000 - timeElapsed)}</p>
                    <div className="flex justify-center gap-4">
                        {[...Array(3)].map((_, i) => (
                            <Star key={i} className="w-12 h-12 text-saVividOrange fill-current animate-spin-slow" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#061a3a] text-white flex flex-col font-sans overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-saVividOrange/25 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-saBlue/40 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <div className="p-3 md:p-6 bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-6">
                        <h2 className="text-lg md:text-2xl font-black uppercase tracking-wider text-saVividOrange">
                            Sudoku
                        </h2>
                        <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors">
                            {isMuted ? <VolumeX className="w-4 h-4 md:w-6 md:h-6" /> : <Volume2 className="w-4 h-4 md:w-6 md:h-6" />}
                        </button>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 md:gap-4">
                        <div className="flex items-center bg-saBlueLight/10 px-2 md:px-4 py-1 md:py-2 rounded-full text-saBlueLight border border-saBlueLight/20">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 mr-1 md:mr-2" />
                            <span className="font-bold text-sm md:text-lg font-mono">{timeElapsed}s</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={resetPuzzle} className="hover:bg-saBlueLight/20 hover:text-saBlueLight transition-colors p-1.5 md:p-2">
                            <RotateCcw className="w-4 h-4 md:w-6 md:h-6" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 transition-colors p-1.5 md:p-2">
                            <X className="w-4 h-4 md:w-6 md:h-6" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10 w-full mx-auto flex flex-col items-center justify-start">
                <div className="w-full max-w-5xl my-auto py-4 flex flex-col md:flex-row md:items-center md:justify-center gap-6">
                    {/* Sudoku Grid */}
                    <Card className="gamified-card p-4 sm:p-6 bg-slate-800/50 backdrop-blur-md border-slate-700 shrink-0">
                        <div className="inline-block mx-auto">
                            <div className="grid grid-cols-9 gap-0 border-4 border-saBlueLight rounded-lg overflow-hidden">
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

                                        return (
                                            <div
                                                key={`${rowIndex}-${colIndex}`}
                                                className={`
                          w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 flex items-center justify-center
                          text-base xs:text-lg sm:text-xl font-bold cursor-pointer transition-all duration-200
                          ${isInitial ? 'bg-slate-900 text-saBlueLight' : 'bg-slate-800 text-white'}
                          ${isSelected ? 'bg-saBlue/50 ring-2 ring-saBlueLight ring-inset' : ''}
                          ${!isSelected && (isInSameRow || isInSameCol || isInSameBox) ? 'bg-slate-700' : ''}
                          ${thickBorderRight ? 'border-r-2 border-saBlueLight' : 'border-r border-slate-600'}
                          ${thickBorderBottom ? 'border-b-2 border-saBlueLight' : 'border-b border-slate-600'}
                          hover:bg-saBlueLight/30
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

                    {/* Number Pad */}
                    <Card className="gamified-card p-4 sm:p-6 bg-slate-800/50 backdrop-blur-md border-slate-700 md:w-56 shrink-0">
                        <div className="grid grid-cols-5 md:grid-cols-3 gap-2 sm:gap-3 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleNumberClick(num)}
                                    disabled={!selectedCell}
                                    className={`
                    aspect-square flex items-center justify-center rounded-lg font-bold text-xl sm:text-2xl
                    transition-all duration-200 border-2
                    ${selectedCell
                                            ? 'bg-saBlueLight/20 border-saBlueLight text-saBlueLight hover:bg-saBlueLight/30 cursor-pointer'
                                            : 'bg-slate-800/50 border-slate-600 text-slate-500 cursor-not-allowed'
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
                  aspect-square flex items-center justify-center rounded-lg font-bold
                  transition-all duration-200 border-2
                  ${selectedCell
                                        ? 'bg-red-500/20 border-red-400 text-red-300 hover:bg-red-500/30 cursor-pointer'
                                        : 'bg-slate-800/50 border-slate-600 text-slate-500 cursor-not-allowed'
                                    }
                `}
                            >
                                <Eraser className="w-6 h-6" />
                            </button>
                        </div>
                        <p className="text-xs sm:text-sm text-center text-gray-400">
                            Select a cell, then choose a number
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
