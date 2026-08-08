import { useState, useEffect } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';

interface Props {
    activity: Activity;
    attemptId: number | null;
    onComplete: (score: number, timeTaken: number) => void;
    onCancel: () => void;
}

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPiece {
    type: PieceType;
    color: PieceColor;
}

type Board = (ChessPiece | null)[][];

const pieceSymbols: Record<PieceColor, Record<PieceType, string>> = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙',
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟',
    },
};

export default function ChessGame({ activity, attemptId, onComplete, onCancel }: Props) {
    const [board, setBoard] = useState<Board>([]);
    const [selectedSquare, setSelectedSquare] = useState<[number, number] | null>(null);
    const [currentPlayer, setCurrentPlayer] = useState<PieceColor>('white');
    const [startTime] = useState(Date.now());
    const [score, setScore] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [moveCount, setMoveCount] = useState(0);
    const [capturedPieces, setCapturedPieces] = useState<{ white: ChessPiece[], black: ChessPiece[] }>({ white: [], black: [] });
    const [isComputerThinking, setIsComputerThinking] = useState(false);

    // Level progression state
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showLevelUp, setShowLevelUp] = useState(false);

    // Get game settings from activity
    const chessConfig = activity.items?.[0]?.content || {};
    const vsComputer = chessConfig.vsComputer !== false; // Default to true if not specified
    const isInfiniteLevels = chessConfig.isInfiniteLevels !== false;
    const totalLevels = isInfiniteLevels ? null : (chessConfig.totalLevels || 10);
    const pointsPerLevel = chessConfig.pointsPerLevel || 100;

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
        if (vsComputer && currentPlayer === 'black' && !showCelebration) {
            setIsComputerThinking(true);
            const timeoutId = setTimeout(() => {
                makeComputerMove();
                setIsComputerThinking(false);
            }, 1000); // 1 second delay for realism
            return () => clearTimeout(timeoutId);
        }
    }, [currentPlayer, vsComputer, showCelebration]);

    useEffect(() => {
        setBoard(initializeBoard());
    }, []);

    const initializeBoard = (): Board => {
        const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));

        // Set up pawns
        for (let i = 0; i < 8; i++) {
            board[1][i] = { type: 'pawn', color: 'black' };
            board[6][i] = { type: 'pawn', color: 'white' };
        }

        // Set up other pieces
        const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: backRow[i], color: 'black' };
            board[7][i] = { type: backRow[i], color: 'white' };
        }

        return board;
    };

    const isPathClear = (fromRow: number, fromCol: number, toRow: number, toCol: number, currentBoard = board): boolean => {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;

        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;

        while (currentRow !== toRow || currentCol !== toCol) {
            if (currentBoard[currentRow][currentCol]) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }

        return true;
    };

    const isValidMove = (fromRow: number, fromCol: number, toRow: number, toCol: number, currentBoard = board, player = currentPlayer): boolean => {
        const piece = currentBoard[fromRow][fromCol];
        if (!piece || piece.color !== player) return false;

        const targetPiece = currentBoard[toRow][toCol];
        if (targetPiece && targetPiece.color === piece.color) return false;

        const rowDiff = Math.abs(toRow - fromRow);
        const colDiff = Math.abs(toCol - fromCol);

        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? -1 : 1;
                const startRow = piece.color === 'white' ? 6 : 1;

                // Move forward
                if (fromCol === toCol && !targetPiece) {
                    if (toRow === fromRow + direction) return true;
                    if (fromRow === startRow && toRow === fromRow + 2 * direction && !currentBoard[fromRow + direction][fromCol]) return true;
                }

                // Capture diagonally
                if (colDiff === 1 && toRow === fromRow + direction && targetPiece) return true;
                return false;

            case 'rook':
                return (fromRow === toRow || fromCol === toCol) && isPathClear(fromRow, fromCol, toRow, toCol, currentBoard);

            case 'knight':
                return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);

            case 'bishop':
                return rowDiff === colDiff && isPathClear(fromRow, fromCol, toRow, toCol, currentBoard);

            case 'queen':
                return (fromRow === toRow || fromCol === toCol || rowDiff === colDiff) && isPathClear(fromRow, fromCol, toRow, toCol, currentBoard);

            case 'king':
                return rowDiff <= 1 && colDiff <= 1;

            default:
                return false;
        }
    };

    const getPieceValue = (type: PieceType): number => {
        const values = { pawn: 10, knight: 30, bishop: 30, rook: 50, queen: 90, king: 1000 };
        return values[type];
    };

    const executeMove = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
        const newBoard = board.map(r => [...r]);
        const capturedPiece = newBoard[toRow][toCol];
        const movingPiece = newBoard[fromRow][fromCol];

        if (!movingPiece) return;

        newBoard[toRow][toCol] = movingPiece;
        newBoard[fromRow][fromCol] = null;

        // Handle captured pieces
        if (capturedPiece) {
            const newCaptured = { ...capturedPieces };
            // Add to the list of the player who CAPTURED the piece
            newCaptured[movingPiece.color].push(capturedPiece);
            setCapturedPieces(newCaptured);

            // Only add score if player captures
            if (movingPiece.color === 'white') {
                const points = getPieceValue(capturedPiece.type);
                setScore(score + points);
                playSound('correct');
                confetti({
                    particleCount: 30,
                    spread: 50,
                    origin: { y: 0.6 }
                });
            }

            // Check for checkmate (simplified - capture king)
            if (capturedPiece.type === 'king') {
                if (vsComputer) {
                    if (movingPiece.color === 'white') {
                        // White captured Black King: Level Cleared!
                        const isFinalLevel = !isInfiniteLevels && totalLevels !== null && currentLevel >= totalLevels;
                        
                        if (isFinalLevel) {
                            handleComplete(score + getPieceValue('king') + pointsPerLevel);
                        } else {
                            // Level cleared transition!
                            playSound('correct');
                            setShowLevelUp(true);
                        }
                    } else {
                        // CPU captured White King: Game Over!
                        playSound('game-over');
                        onComplete(score, Math.floor((Date.now() - startTime) / 1000));
                    }
                } else {
                    // Pass & Play (vs Teacher): Match completes immediately on king capture
                    playSound('game-over');
                    handleComplete(score + getPieceValue('king') + pointsPerLevel);
                }
                return;
            }
        } else {
            if (movingPiece.color === 'white') playSound('click');
        }

        setBoard(newBoard);
        setCurrentPlayer(movingPiece.color === 'white' ? 'black' : 'white');
        setMoveCount(prev => prev + 1);
        setSelectedSquare(null);

        // Submit move
        submitResponse({ from: [fromRow, fromCol], to: [toRow, toCol] }, true);
    };

    const handleNextLevel = () => {
        // Increment level and score
        setCurrentLevel(prev => prev + 1);
        setScore(prev => prev + pointsPerLevel);
        
        // Reset board for next level
        setBoard(initializeBoard());
        setSelectedSquare(null);
        setCurrentPlayer('white');
        setMoveCount(0);
        setCapturedPieces({ white: [], black: [] });
        setShowLevelUp(false);
    };

    const getAllValidMoves = (currentBoard: Board, color: PieceColor) => {
        const moves: { from: [number, number], to: [number, number], score: number }[] = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = currentBoard[r][c];
                if (piece && piece.color === color) {
                    // Check all possible squares
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (isValidMove(r, c, tr, tc, currentBoard, color)) {
                                let moveScore = 0;
                                const targetPiece = currentBoard[tr][tc];

                                // Capture score
                                if (targetPiece) {
                                    moveScore += getPieceValue(targetPiece.type);
                                }

                                // Center control bonus (very simple)
                                if ((tr === 3 || tr === 4) && (tc === 3 || tc === 4)) {
                                    moveScore += 5;
                                }

                                moves.push({
                                    from: [r, c],
                                    to: [tr, tc],
                                    score: moveScore
                                });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    };

    const makeComputerMove = () => {
        const possibleMoves = getAllValidMoves(board, 'black');
        if (possibleMoves.length === 0) return; // No moves (mate or stalemate)

        let selectedMove;
        const rand = Math.random();

        // Level-based difficulty scaling (infinite levels)
        if (currentLevel === 1) {
            // Level 1: 90% random moves
            if (rand < 0.9) {
                selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            } else {
                possibleMoves.sort((a, b) => b.score - a.score);
                selectedMove = possibleMoves[0];
            }
        } else if (currentLevel === 2) {
            // Level 2: 70% random, 30% best
            if (rand < 0.7) {
                selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            } else {
                possibleMoves.sort((a, b) => b.score - a.score);
                selectedMove = possibleMoves[0];
            }
        } else if (currentLevel === 3) {
            // Level 3: Top 4 moves randomly
            possibleMoves.sort((a, b) => b.score - a.score);
            const topMoves = possibleMoves.slice(0, 4);
            selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
        } else if (currentLevel === 4) {
            // Level 4: Top 3 moves randomly
            possibleMoves.sort((a, b) => b.score - a.score);
            const topMoves = possibleMoves.slice(0, 3);
            selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
        } else if (currentLevel === 5) {
            // Level 5: Top 2 moves randomly
            possibleMoves.sort((a, b) => b.score - a.score);
            const topMoves = possibleMoves.slice(0, 2);
            selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
        } else {
            // Level 6+: Strict best move (Hard)
            possibleMoves.sort((a, b) => b.score - a.score);
            selectedMove = possibleMoves[0];
        }

        // Fallback if no move selected
        if (!selectedMove) selectedMove = possibleMoves[0];

        executeMove(selectedMove.from[0], selectedMove.from[1], selectedMove.to[0], selectedMove.to[1]);
    };

    const handleSquareClick = (row: number, col: number) => {
        if (selectedSquare) {
            const [fromRow, fromCol] = selectedSquare;

            if (isValidMove(fromRow, fromCol, row, col)) {
                executeMove(fromRow, fromCol, row, col);
            } else {
                setSelectedSquare(null);
            }
        } else {
            // Cannot select opponent pieces in vsComputer mode
            if (vsComputer && board[row][col]?.color === 'black') return;

            const piece = board[row][col];
            if (piece && piece.color === currentPlayer) {
                setSelectedSquare([row, col]);
                playSound('click');
            }
        }
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

    const submitResponse = async (move: any, isCorrect: boolean) => {
        if (!attemptId || !activity.items || !activity.items[0]) return;
        try {
            await activityAttemptAPI.submitResponse({
                attempt_id: attemptId,
                item_id: activity.items[0].id,
                response: { move },
                is_correct: isCorrect,
            });
        } catch (error) {
            console.error('Failed to submit response', error);
        }
    };

    const resetGame = () => {
        setBoard(initializeBoard());
        setSelectedSquare(null);
        setCurrentPlayer('white');
        setScore(0);
        setMoveCount(0);
        setCapturedPieces({ white: [], black: [] });
    };

    if (showCelebration) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-800">
                <Card className="gamified-card p-12 text-center relative overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-md mx-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-saBlue/5 to-saVividOrange/5 animate-pulse" />
                    <Trophy className="w-32 h-32 mx-auto text-saVividOrange mb-8 animate-bounce relative z-10" />
                    <h2 className="text-5xl font-black mb-2 relative z-10 text-slate-800">Checkmate!</h2>
                    <p className="text-lg text-slate-500 mb-4 relative z-15 font-bold uppercase tracking-wider">Match Complete</p>
                    <p className="text-4xl text-saBlue mb-8 font-black relative z-10">Score: {Math.round(score)} EXP</p>
                    <div className="flex justify-center gap-4 relative z-10">
                        {[...Array(3)].map((_, i) => (
                            <Star key={i} className="w-12 h-12 text-saVividOrange fill-current animate-spin-slow" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
            
            {/* Level Cleared Transition Overlay */}
            {showLevelUp && (
                <div className="absolute inset-0 z-45 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <Card className="gamified-card p-10 text-center relative overflow-hidden max-w-sm mx-4 bg-white border border-slate-200 shadow-2xl rounded-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-saBlue/5 to-saVividOrange/5" />
                        <Trophy className="w-20 h-20 mx-auto text-saVividOrange mb-5 animate-bounce relative z-10" />
                        <h2 className="text-3xl font-black mb-1.5 relative z-10 text-slate-800">Level {currentLevel} Cleared!</h2>
                        <p className="text-xs text-slate-400 mb-5 relative z-10 font-bold uppercase tracking-wider">Enemy King Captured</p>
                        
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 relative z-10 space-y-2">
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-slate-505">Level Clear Bonus:</span>
                                <span className="text-saVividOrange font-bold">+{pointsPerLevel} EXP</span>
                            </div>
                            <div className="h-px bg-slate-200/60" />
                            <div className="flex justify-between items-center text-xs font-semibold">
                                <span className="text-slate-550 font-bold">Total EXP:</span>
                                <span className="text-saBlue font-bold">{Math.round(score + pointsPerLevel)} EXP</span>
                            </div>
                        </div>

                        <Button 
                            onClick={handleNextLevel} 
                            className="w-full h-11 bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl font-bold text-sm tracking-wide shadow-md shadow-blue-500/20 relative z-10"
                        >
                            Next Level (Level {currentLevel + 1})
                        </Button>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 border-b border-slate-800 z-20 shadow-xs text-white">
                <div className="flex items-center gap-4">
                    <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-8 object-contain" />
                    <div className="h-6 w-px bg-slate-800 hidden sm:block" />
                    {vsComputer ? (
                        <span className="text-[10px] bg-saBlue/20 text-saBlueLight px-2 py-0.5 rounded-full border border-saBlue/30 font-bold uppercase tracking-wider">
                            Level {currentLevel}{totalLevels ? ` / ${totalLevels}` : ''}
                        </span>
                    ) : (
                        <span className="text-[10px] bg-orange-500/10 text-saVividOrange px-2 py-0.5 rounded-full border border-orange-500/20 font-bold uppercase tracking-wider">
                            Pass & Play (vs Teacher)
                        </span>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex items-center bg-orange-500/10 px-4 py-2 rounded-xl text-saVividOrange border border-orange-500/20 font-bold text-sm sm:text-base">
                        <Star className="w-4 h-4 mr-2 fill-current" />
                        <span>{Math.round(score)} EXP</span>
                    </div>
                    <div className="flex items-center bg-saBlue/15 px-4 py-2 rounded-xl text-saBlueLight border border-saBlue/20 font-bold text-sm sm:text-base font-mono">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{timeElapsed}s</span>
                    </div>
                    <Button variant="ghost" onClick={resetGame} className="hover:bg-white/10 text-slate-400 hover:text-white p-2 rounded-xl transition-colors">
                        <RotateCcw className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/15 text-red-400 hover:text-red-500 p-2 rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10 w-full max-w-7xl mx-auto flex flex-col justify-center">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 items-start">
                    
                    {/* Left Column: Instructions & Black Captured */}
                    <div className="lg:col-span-1 order-1 lg:order-1 flex flex-col gap-4 self-stretch">
                        {/* Instructions Card */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex-1 flex flex-col">
                            <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider">Instructions</h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                                {activity.instructions || "Play a game of chess against the AI or local player. Alternate turns, move your pieces strategically, and capture the opponent's King to secure checkmate!"}
                            </p>
                        </Card>

                        {/* Captured pieces by Black (White pieces captured) */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                          <h3 className="text-xs font-black mb-3 text-slate-400 uppercase tracking-wider text-center">Black Captured</h3>
                          <div className="flex flex-wrap gap-1.5 justify-center min-h-[40px]">
                              {capturedPieces.white.map((piece, i) => (
                                  <span key={i} className="text-2xl text-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">
                                      {pieceSymbols[piece.color][piece.type]}
                                  </span>
                              ))}
                              {capturedPieces.white.length === 0 && (
                                  <span className="text-xs text-slate-350 italic self-center">None</span>
                              )}
                          </div>
                        </Card>
                    </div>

                    {/* Chess Board Container (Middle) */}
                    <div className="lg:col-span-2 order-2 flex flex-col items-center">
                        <div className="mb-3 text-center">
                            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-xs">
                                <span className={`w-3 h-3 rounded-full border border-slate-400 ${currentPlayer === 'white' ? 'bg-white' : 'bg-slate-800'}`} />
                                <span className="text-xs font-bold text-slate-700">
                                    {vsComputer 
                                      ? (currentPlayer === 'white' ? 'YOUR TURN' : 'COMPUTER THINKING...') 
                                      : `${currentPlayer.toUpperCase()}'s TURN`}
                                </span>
                                {isComputerThinking && vsComputer && <span className="w-1.5 h-1.5 bg-saVividOrange rounded-full animate-ping" />}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                                {vsComputer ? `Moves: ${moveCount} · Level ${currentLevel}` : `Moves: ${moveCount} · Face-to-Face Match`}
                            </p>
                        </div>

                        <Card className="p-3 flex items-center justify-center bg-white border border-slate-200 rounded-3xl shadow-sm">
                            <div className="inline-block">
                                <div className="grid gap-0 border-8 border-slate-850 rounded-2xl overflow-hidden shadow-lg select-none">
                                    {board.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex">
                                            {row.map((piece, colIndex) => {
                                                const isLight = (rowIndex + colIndex) % 2 === 0;
                                                const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;

                                                return (
                                                    <div
                                                        key={`${rowIndex}-${colIndex}`}
                                                        className={`
                                                            w-8 h-8 xs:w-9 xs:h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center
                                                            cursor-pointer transition-all duration-200 text-xl xs:text-2xl sm:text-3xl md:text-4xl select-none
                                                            ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                                                            ${isSelected ? 'ring-4 ring-saBlueLight ring-inset' : ''}
                                                            hover:brightness-105
                                                        `}
                                                        onClick={() => {
                                                            // Student can only move white pieces in vsComputer mode
                                                            if (vsComputer && currentPlayer !== 'white') return;
                                                            // Alternate moves in Pass & Play mode
                                                            if (vsComputer) {
                                                                currentPlayer === 'white' && handleSquareClick(rowIndex, colIndex);
                                                            } else {
                                                                handleSquareClick(rowIndex, colIndex);
                                                            }
                                                        }}
                                                    >
                                                        {piece && (
                                                            <span className={`
                                                                select-none
                                                                ${piece.color === 'white'
                                                                    ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)] filter brightness-125'
                                                                    : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]'}
                                                            `}>
                                                                {pieceSymbols[piece.color][piece.type]}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Levels/Match Stats & White Captured */}
                    <div className="lg:col-span-1 order-3 lg:order-3 flex flex-col gap-4 self-stretch justify-between">
                        {/* Level Progression / Match Info */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex-1 flex flex-col">
                            {vsComputer ? (
                                <>
                                    <h3 className="text-xs font-black mb-3 text-saVividOrange uppercase tracking-wider">Level Progression</h3>
                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 flex-1">
                                        {[...Array(totalLevels || 8)].map((_, i) => {
                                            const lvlNum = i + 1;
                                            const isActive = lvlNum === currentLevel;
                                            const isCleared = lvlNum < currentLevel;
                                            return (
                                                <div 
                                                    key={lvlNum} 
                                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                                        isActive 
                                                            ? 'bg-blue-50 border-blue-200 text-saBlue' 
                                                            : isCleared
                                                            ? 'bg-slate-50 border-slate-150 text-slate-400 line-through'
                                                            : 'bg-white border-slate-100 text-slate-400'
                                                    }`}
                                                >
                                                    <span>Level {lvlNum}</span>
                                                    <span className="text-[10px] font-black uppercase">
                                                        {isActive ? 'Active' : isCleared ? 'Cleared' : 'Locked'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {isInfiniteLevels && currentLevel > 8 && (
                                            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-blue-50 border-blue-200 text-saBlue">
                                                <span>Level {currentLevel}</span>
                                                <span className="text-[10px] font-black uppercase">Active</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xs font-black mb-3 text-saVividOrange uppercase tracking-wider">Match Stats</h3>
                                    <div className="space-y-1.5 text-xs text-slate-500 font-medium flex-1">
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span>Mode:</span>
                                            <span className="font-bold text-slate-700">Pass & Play</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 border-b border-slate-100">
                                            <span>Current Turn:</span>
                                            <span className="font-bold text-saBlue uppercase">{currentPlayer}</span>
                                        </div>
                                        <div className="flex justify-between py-1.5">
                                            <span>Win Reward:</span>
                                            <span className="font-bold text-saVividOrange">+{pointsPerLevel} EXP</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </Card>

                        {/* Captured pieces by White (Black pieces captured) */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                          <h3 className="text-xs font-black mb-3 text-slate-400 uppercase tracking-wider text-center">White Captured</h3>
                          <div className="flex flex-wrap gap-1.5 justify-center min-h-[40px]">
                              {capturedPieces.black.map((piece, i) => (
                                  <span key={i} className="text-2xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)] font-light">
                                      {pieceSymbols[piece.color][piece.type]}
                                  </span>
                              ))}
                              {capturedPieces.black.length === 0 && (
                                  <span className="text-xs text-slate-350 italic self-center">None</span>
                              )}
                          </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
