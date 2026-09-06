import { useState, useEffect } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, RotateCcw, Crown } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';

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

    // Level progression state with localStorage persistence
    const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(`studyasan_chess_unlocked_${activity.id}`);
            return saved ? Math.max(1, parseInt(saved, 10) || 1) : 1;
        } catch {
            return 1;
        }
    });
    const [currentLevel, setCurrentLevel] = useState<number>(() => {
        try {
            const saved = localStorage.getItem(`studyasan_chess_level_${activity.id}`);
            return saved ? Math.max(1, parseInt(saved, 10) || 1) : 1;
        } catch {
            return 1;
        }
    });
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [levelUpCountdown, setLevelUpCountdown] = useState<number>(5);

    // Get game settings from activity
    const chessConfig = activity.items?.[0]?.content || {};
    const vsComputer = chessConfig.vsComputer !== false; // Default to true if not specified
    const isInfiniteLevels = chessConfig.isInfiniteLevels !== false;
    const totalLevels = isInfiniteLevels ? null : (chessConfig.totalLevels || 10);
    const pointsPerLevel = chessConfig.pointsPerLevel || 100;

    const { playSound, stopSound, stopAll } = useSound();

    // Winning graphics stay on screen for 5s countdown, then auto-advances to the next level
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
            playSound('bg-music-zen', { loop: true, volume: 0.15 });
        } else {
            stopSound('bg-music-zen');
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

    const findKing = (currentBoard: Board, color: PieceColor): [number, number] | null => {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = currentBoard[r][c];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return [r, c];
                }
            }
        }
        return null;
    };

    const isSquareUnderAttack = (boardToTest: Board, targetRow: number, targetCol: number, attackerColor: PieceColor): boolean => {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardToTest[r][c];
                if (piece && piece.color === attackerColor) {
                    if (piece.type === 'pawn') {
                        const direction = attackerColor === 'white' ? -1 : 1;
                        if (targetRow === r + direction && Math.abs(targetCol - c) === 1) {
                            return true;
                        }
                    } else {
                        if (isValidMove(r, c, targetRow, targetCol, boardToTest, attackerColor)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    };

    const isKingInCheck = (boardToTest: Board, kingColor: PieceColor): boolean => {
        const kingPos = findKing(boardToTest, kingColor);
        if (!kingPos) return true; // Missing king is considered checked/lost
        const opponentColor: PieceColor = kingColor === 'white' ? 'black' : 'white';
        return isSquareUnderAttack(boardToTest, kingPos[0], kingPos[1], opponentColor);
    };

    const isLegalMove = (fromRow: number, fromCol: number, toRow: number, toCol: number, currentBoard = board, player = currentPlayer): boolean => {
        if (!isValidMove(fromRow, fromCol, toRow, toCol, currentBoard, player)) return false;

        // Simulate move on a temporary board
        const tempBoard: Board = currentBoard.map(row => row.map(cell => cell ? { ...cell } : null));
        tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = null;

        // Player cannot make a move that leaves their own king in check
        return !isKingInCheck(tempBoard, player);
    };

    const getAllLegalMoves = (currentBoard: Board, color: PieceColor) => {
        const moves: { from: [number, number], to: [number, number], score: number }[] = [];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = currentBoard[r][c];
                if (piece && piece.color === color) {
                    for (let tr = 0; tr < 8; tr++) {
                        for (let tc = 0; tc < 8; tc++) {
                            if (isLegalMove(r, c, tr, tc, currentBoard, color)) {
                                let moveScore = 0;
                                const targetPiece = currentBoard[tr][tc];

                                // Capture score
                                if (targetPiece) {
                                    moveScore += getPieceValue(targetPiece.type);
                                }

                                // Center control bonus
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

    const isCheckmate = (currentBoard: Board, color: PieceColor): boolean => {
        if (!isKingInCheck(currentBoard, color)) return false;
        return getAllLegalMoves(currentBoard, color).length === 0;
    };

    const executeMove = (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
        const newBoard: Board = board.map(r => r.map(cell => cell ? { ...cell } : null));
        const movingPiece = newBoard[fromRow][fromCol];
        const capturedPiece = newBoard[toRow][toCol];

        if (!movingPiece) return;

        // Pawn promotion to Queen
        if (movingPiece.type === 'pawn') {
            if (movingPiece.color === 'white' && toRow === 0) {
                movingPiece.type = 'queen';
            } else if (movingPiece.color === 'black' && toRow === 7) {
                movingPiece.type = 'queen';
            }
        }

        newBoard[toRow][toCol] = movingPiece;
        newBoard[fromRow][fromCol] = null;

        // Handle captured pieces
        if (capturedPiece) {
            const newCaptured = { ...capturedPieces };
            newCaptured[movingPiece.color] = [...newCaptured[movingPiece.color], capturedPiece];
            setCapturedPieces(newCaptured);

            if (movingPiece.color === 'white') {
                const points = getPieceValue(capturedPiece.type);
                setScore(prev => prev + points);
                playSound('correct');
                confetti({
                    particleCount: 25,
                    spread: 45,
                    origin: { y: 0.6 }
                });
            }
        } else {
            if (movingPiece.color === 'white') playSound('click');
        }

        setBoard(newBoard);
        setMoveCount(prev => prev + 1);
        setSelectedSquare(null);

        // Submit move
        submitResponse({ from: [fromRow, fromCol], to: [toRow, toCol] }, true);

        // AUTO-DETECT CHECKMATE AFTER MOVE!
        if (movingPiece.color === 'white') {
            const blackKingMissing = !findKing(newBoard, 'black');
            const blackInCheck = isKingInCheck(newBoard, 'black');
            const blackLegalMoves = getAllLegalMoves(newBoard, 'black');
            const blackNoMoves = blackLegalMoves.length === 0;
            const blackKingCaptured = capturedPiece?.type === 'king' && capturedPiece?.color === 'black';

            if (blackKingMissing || (blackInCheck && blackNoMoves) || blackNoMoves || blackKingCaptured) {
                // AUTO-DETECTED CHECKMATE / VICTORY!
                handleLevelClear(getPieceValue('king'));
                return;
            }

            setCurrentPlayer('black');
        } else {
            const whiteKingMissing = !findKing(newBoard, 'white');
            const whiteInCheck = isKingInCheck(newBoard, 'white');
            const whiteLegalMoves = getAllLegalMoves(newBoard, 'white');
            const whiteNoMoves = whiteLegalMoves.length === 0;
            const whiteKingCaptured = capturedPiece?.type === 'king' && capturedPiece?.color === 'white';

            if (whiteKingMissing || (whiteInCheck && whiteNoMoves) || whiteNoMoves || whiteKingCaptured) {
                // CPU checkmated White
                playSound('game-over');
                onComplete(score, Math.floor((Date.now() - startTime) / 1000));
                return;
            }

            setCurrentPlayer('white');
        }
    };

    const handleLevelClear = (extraPoints = 0) => {
        playSound('game-over');
        confetti({
            particleCount: 160,
            spread: 90,
            origin: { y: 0.5 }
        });

        const bonus = pointsPerLevel + extraPoints;
        const newScore = score + bonus;
        setScore(newScore);

        const nextLvl = currentLevel + 1;
        setUnlockedLevel(prev => {
            const updated = Math.max(prev, nextLvl);
            try {
                localStorage.setItem(`studyasan_chess_unlocked_${activity.id}`, String(updated));
            } catch { }
            return updated;
        });
        try {
            localStorage.setItem(`studyasan_chess_level_${activity.id}`, String(nextLvl));
        } catch { }

        submitResponse({ level: currentLevel, cleared: true, totalScore: newScore }, true);

        const isFinalLevel = !isInfiniteLevels && totalLevels !== null && currentLevel >= totalLevels;
        if (isFinalLevel) {
            handleComplete(newScore);
        } else {
            setShowLevelUp(true);
            setLevelUpCountdown(5); // Winning graphics appear for 5s then auto-advance to Level 2
        }
    };

    const handleNextLevel = () => {
        setShowLevelUp(false);
        const nextLvl = currentLevel + 1;
        setCurrentLevel(nextLvl);
        try {
            localStorage.setItem(`studyasan_chess_level_${activity.id}`, String(nextLvl));
        } catch { }

        // Reset board for next level cleanly
        setBoard(initializeBoard());
        setSelectedSquare(null);
        setCurrentPlayer('white');
        setMoveCount(0);
        setCapturedPieces({ white: [], black: [] });
    };

    const switchLevel = (targetLevel: number) => {
        if (targetLevel > unlockedLevel) return;
        setShowLevelUp(false);
        if (targetLevel === currentLevel) return;
        setCurrentLevel(targetLevel);
        try {
            localStorage.setItem(`studyasan_chess_level_${activity.id}`, String(targetLevel));
        } catch { }
        setBoard(initializeBoard());
        setSelectedSquare(null);
        setCurrentPlayer('white');
        setMoveCount(0);
        setCapturedPieces({ white: [], black: [] });
        playSound('click');
    };

    const makeComputerMove = () => {
        const possibleMoves = getAllLegalMoves(board, 'black');
        if (possibleMoves.length === 0) {
            // Checkmate or Stalemate: Black has no legal moves! White wins!
            handleLevelClear(getPieceValue('king'));
            return;
        }

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

            if (isLegalMove(fromRow, fromCol, row, col, board, currentPlayer)) {
                executeMove(fromRow, fromCol, row, col);
            } else if (board[row][col]?.color === currentPlayer) {
                setSelectedSquare([row, col]);
                playSound('click');
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
            <VictoryCelebrationModal
                title="Checkmate!"
                activityTitle={activity.title || 'Chess Master Challenge'}
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
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white">
                <div className="flex items-center gap-4">
                    <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-8 object-contain" />
                    <div className="h-6 w-px bg-white/25 hidden sm:block" />
                    {vsComputer ? (
                        <span className="text-[10px] bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20 font-bold uppercase tracking-wider">
                            Level {currentLevel}{totalLevels ? ` / ${totalLevels}` : ''}
                        </span>
                    ) : (
                        <span className="text-[10px] bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20 font-bold uppercase tracking-wider">
                            Pass & Play (vs Teacher)
                        </span>
                    )}
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
                    <Button variant="ghost" onClick={resetGame} className="hover:bg-white/10 text-white/80 hover:text-white p-2 rounded-xl transition-colors">
                        <RotateCcw className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            if (score > 0 || currentLevel > 1) {
                                handleComplete(score);
                            } else {
                                onCancel();
                            }
                        }}
                        className="hover:bg-white/10 text-white/80 hover:text-white p-2 rounded-xl transition-colors"
                        title={score > 0 ? "Save & Exit" : "Exit"}
                    >
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
                                {board.length > 0 && isKingInCheck(board, 'white') && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                                        CHECK!
                                    </span>
                                )}
                                {board.length > 0 && isKingInCheck(board, 'black') && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                                        OPPONENT CHECKED!
                                    </span>
                                )}
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
                                                const isLegalDestination = selectedSquare && isLegalMove(selectedSquare[0], selectedSquare[1], rowIndex, colIndex);
                                                const isKingChecked = piece?.type === 'king' && isKingInCheck(board, piece.color);

                                                return (
                                                    <div
                                                        key={`${rowIndex}-${colIndex}`}
                                                        className={`
                                                            relative w-8 h-8 xs:w-9 xs:h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 flex items-center justify-center
                                                            cursor-pointer transition-all duration-200 text-xl xs:text-2xl sm:text-3xl md:text-4xl select-none
                                                            ${isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'}
                                                            ${isSelected ? 'ring-4 ring-saBlue ring-inset z-10' : ''}
                                                            ${isKingChecked ? 'ring-4 ring-rose-500 ring-inset bg-rose-500/25 animate-pulse z-10' : ''}
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
                                                        {/* Legal move indicator dot or capture ring */}
                                                        {isLegalDestination && !piece && (
                                                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-saBlue/50 pointer-events-none" />
                                                        )}
                                                        {isLegalDestination && piece && (
                                                            <div className="absolute inset-0.5 rounded-sm border-2 border-rose-500/80 pointer-events-none animate-pulse" />
                                                        )}
                                                        {piece && (
                                                            <span className={`
                                                                select-none relative z-10
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
                                        {[...Array(Math.max(totalLevels || 8, unlockedLevel))].map((_, i) => {
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
                                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all text-left ${isActive
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

            {/* Level Cleared Transition Overlay - Placed at root end of JSX with fixed high z-index */}
            {showLevelUp && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="gamified-card p-8 sm:p-10 text-center relative overflow-hidden max-w-sm mx-4 bg-white border border-slate-200 shadow-2xl rounded-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-saBlue/5 to-saVividOrange/5 pointer-events-none" />
                        
                        <div className="relative z-10">
                            <Trophy className="w-20 h-20 mx-auto text-saVividOrange mb-3 animate-bounce" />
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-black text-xs uppercase tracking-wider mb-2">
                                <Crown className="w-4 h-4" /> Checkmate Detected!
                            </div>
                            <h2 className="text-3xl font-black mb-1 text-slate-800">Level {currentLevel} Cleared!</h2>
                            <p className="text-xs text-slate-400 mb-5 font-bold uppercase tracking-wider">Opponent King Defeated</p>
                            
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6 space-y-2">
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-500">Level Clear Bonus:</span>
                                    <span className="text-saVividOrange font-bold">+{pointsPerLevel} EXP</span>
                                </div>
                                <div className="h-px bg-slate-200/60" />
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-700 font-bold">Total Score:</span>
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
