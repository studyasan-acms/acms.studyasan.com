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

    // Get game settings from activity
    const vsComputer = activity.items?.[0]?.content?.vsComputer !== false; // Default to true if not specified
    const difficulty = activity.items?.[0]?.content?.difficulty || 'medium';

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
                if (movingPiece.color === 'white') {
                    handleComplete(score + getPieceValue('king') + 100);
                } else {
                    playSound('game-over');
                    onComplete(score, Math.floor((Date.now() - startTime) / 1000));
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

        if (difficulty === 'easy') {
            // Random move
            selectedMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } else {
            // Sort by score (descending)
            possibleMoves.sort((a, b) => b.score - a.score);

            // Add some randomness among top moves for 'medium', strict for 'hard'
            if (difficulty === 'medium') {
                // Pick from top 3 moves randomly
                const topMoves = possibleMoves.slice(0, 3);
                selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
            } else {
                // Hard: Pick best move
                selectedMove = possibleMoves[0];
            }
        }

        // Fallback if no move selected (so safety)
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a3a] text-white">
                <Card className="gamified-card p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-saBlue/10 to-saVividOrange/10" />
                    <Trophy className="w-32 h-32 mx-auto text-saVividOrange mb-8 animate-bounce relative z-10" />
                    <h2 className="text-5xl font-black mb-4 relative z-10">Checkmate!</h2>
                    <p className="text-3xl text-saBlueLight mb-8 font-bold relative z-10">Score: {Math.round(score)}</p>
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
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
                <div className="flex items-center gap-4 sm:gap-6">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-saVividOrange">
                        Chess Battle
                    </h2>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>
                </div>

                <div className="flex items-center gap-4 sm:gap-8">
                    <div className="flex items-center bg-saVividOrange/10 px-4 sm:px-6 py-2 rounded-full text-saVividOrange border border-saVividOrange/25">
                        <Star className="w-5 h-5 sm:w-6 sm:h-6 mr-2 fill-current" />
                        <span className="font-bold text-lg sm:text-xl">{Math.round(score)}</span>
                    </div>
                    <div className="flex items-center bg-saBlueLight/10 px-4 sm:px-6 py-2 rounded-full text-saBlueLight border border-saBlueLight/20">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                        <span className="font-bold text-lg sm:text-xl font-mono">{timeElapsed}s</span>
                    </div>
                    <Button variant="ghost" onClick={resetGame} className="hover:bg-saBlueLight/20 hover:text-saBlueLight transition-colors">
                        <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
                    </Button>
                    <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
                        <X className="w-6 h-6 sm:w-8 sm:h-8" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10 w-full max-w-7xl mx-auto flex flex-col">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
                    {/* Captured Pieces - Black */}
                    <div className="lg:col-span-1 order-1 lg:order-1">
                        <Card className="gamified-card p-4 bg-slate-800/50 backdrop-blur-md border-slate-700">
                            <h3 className="text-sm sm:text-base font-black mb-4 text-center text-gray-400">Black Captured</h3>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {capturedPieces.white.map((piece, i) => (
                                    <span key={i} className="text-2xl sm:text-3xl text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                                        {pieceSymbols[piece.color][piece.type]}
                                    </span>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Chess Board */}
                    <div className="lg:col-span-2 order-2 flex flex-col">
                        <div className="mb-4 text-center">
                            <p className="text-base sm:text-lg font-bold">
                                Current Turn: <span className={currentPlayer === 'white' ? 'text-white' : 'text-gray-400'}>
                                    {currentPlayer === 'white' ? 'WHITE (YOU)' : 'BLACK (CPU)'}
                                </span>
                                {isComputerThinking && <span className="ml-2 text-sm text-saVividOrange animate-pulse">Thinking...</span>}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-400">Moves: {moveCount}</p>
                        </div>
                        <Card className="gamified-card p-2 sm:p-6 flex-1 flex items-center justify-center bg-slate-800/50 backdrop-blur-md border-slate-700">
                            <div className="inline-block">
                                <div className="grid gap-0 border-4 border-amber-700 rounded-lg overflow-hidden shadow-2xl">
                                    {board.map((row, rowIndex) => (
                                        <div key={rowIndex} className="flex">
                                            {row.map((piece, colIndex) => {
                                                const isLight = (rowIndex + colIndex) % 2 === 0;
                                                const isSelected = selectedSquare && selectedSquare[0] === rowIndex && selectedSquare[1] === colIndex;

                                                return (
                                                    <div
                                                        key={`${rowIndex}-${colIndex}`}
                                                        className={`
                                                            w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center
                                                            cursor-pointer transition-all duration-200 text-2xl xs:text-3xl sm:text-4xl md:text-5xl
                                                            ${isLight ? 'bg-amber-100' : 'bg-amber-800'}
                                                            ${isSelected ? 'ring-4 ring-saBlueLight ring-inset' : ''}
                                                            hover:brightness-110
                                                        `}
                                                        onClick={() => currentPlayer === 'white' && handleSquareClick(rowIndex, colIndex)}
                                                    >
                                                        {piece && (
                                                            <span className={`
                                                                ${piece.color === 'white'
                                                                    ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] filter brightness-125'
                                                                    : 'text-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'}
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

                    {/* Captured Pieces - White */}
                    <div className="lg:col-span-1 order-3">
                        <Card className="gamified-card p-4 bg-slate-800/50 backdrop-blur-md border-slate-700">
                            <h3 className="text-sm sm:text-base font-black mb-4 text-center text-white">White Captured</h3>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {capturedPieces.black.map((piece, i) => (
                                    <span key={i} className="text-2xl sm:text-3xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                        {pieceSymbols[piece.color][piece.type]}
                                    </span>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
