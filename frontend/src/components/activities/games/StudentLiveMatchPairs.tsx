import { useState, useEffect } from 'react';
import { X, Trophy, Clock, Star, Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { quizSessionAPI, activityAttemptAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import MatchPairsGame from '../games/MatchPairsGame'; // We might partially reuse or duplicate logic if props differ significantly
// Actually, better to duplicate the logic to wrap it in the lobby/socket flow, or wrap the component.
// Wrapping component is cleaner if MatchPairsGame accepts onComplete/onCancel and we just overlay the Lobby/Finished states?
// But MatchPairsGame handles its own API submissions. Live mode needs to emit socket events too.
// Let's duplicate and adapt for full control (Live version often differs).

interface Props {
    joinCode: string;
    onExit: () => void;
    initialSession?: any;
}

export default function StudentLiveMatchPairs({ joinCode, onExit, initialSession }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [session, setSession] = useState<any>(initialSession || null);
    const [status, setStatus] = useState<'LOBBY' | 'IN_PROGRESS' | 'FINISHED'>('LOBBY');
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [score, setScore] = useState(0);

    // Reuse sound logic
    const [isMuted, setIsMuted] = useState(false);
    const { playSound, stopSound, stopAll } = useSound();

    // Match Pairs State
    const [leftItems, setLeftItems] = useState<any[]>([]);
    const [rightItems, setRightItems] = useState<any[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
    const [selectedRight, setSelectedRight] = useState<number | null>(null);
    const [matched, setMatched] = useState<Set<string>>(new Set());
    const [startTime, setStartTime] = useState(Date.now());
    const [timeElapsed, setTimeElapsed] = useState(0);

    useEffect(() => {
        // Join logic
        joinSession();
        return () => {
            if (socket) socket.disconnect();
            stopAll();
        };
    }, []);

    useEffect(() => {
        if (!isMuted && status === 'IN_PROGRESS') {
            playSound('bg-music', { loop: true, volume: 0.2 });
        } else {
            stopSound('bg-music');
        }
    }, [isMuted, status]);

    useEffect(() => {
        if (status === 'IN_PROGRESS') {
            const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
            return () => clearInterval(timer);
        }
    }, [startTime, status]);

    const joinSession = async () => {
        try {
            let sessionData = session;
            if (!sessionData) {
                const response = await quizSessionAPI.join(joinCode);
                sessionData = response.data.data;
                setSession(sessionData);
            }

            setStatus(sessionData.status);

            // Connect socket
            const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
            const newSocket = io(baseUrl);
            setSocket(newSocket);

            const studentId = localStorage.getItem('student_id') || 0;
            let guestName = '';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    guestName = user.name || user.email || '';
                }
            } catch (e) { }
            if (!guestName) guestName = `Guest ${Math.floor(Math.random() * 1000)}`;

            newSocket.on('connect', () => {
                newSocket.emit('join_session', {
                    join_code: joinCode,
                    student_id: studentId,
                    guest_name: guestName
                });
            });

            newSocket.on('session_started', () => {
                setStatus('IN_PROGRESS');
                setStartTime(Date.now());
                prepareGame(sessionData.activity);
            });

            newSocket.on('session_ended', () => {
                setStatus('FINISHED');
                stopAll();
                playSound('game-over');
                confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
            });

            newSocket.on('leaderboard_update', (data: any[]) => {
                setLeaderboard(data);
            });

            // Start attempt
            try {
                const attemptRes = await activityAttemptAPI.start(sessionData.activity_id, sessionData.id);
                setAttemptId(attemptRes.data.data.id);
            } catch (e) {
                console.error("Failed to start attempt", e);
            }

            if (sessionData.status === 'IN_PROGRESS') {
                prepareGame(sessionData.activity);
            }

        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to join session');
            onExit();
        }
    };

    const prepareGame = (activity: any) => {
        if (activity.items && activity.items.length > 0) {
            const allPairs = activity.items.flatMap((item: any, itemIndex: number) =>
                item.content.pairs.map((pair: any, pairIndex: number) => ({
                    ...pair,
                    itemId: itemIndex,
                    pairId: `${itemIndex}-${pairIndex}`,
                    points: item.points / item.content.pairs.length,
                }))
            );
            setLeftItems(allPairs);
            setRightItems([...allPairs].sort(() => Math.random() - 0.5));
        }
    };

    const handleLeftClick = (index: number) => {
        const key = `L${index}`;
        if (matched.has(key)) return;
        setSelectedLeft(index);
        playSound('click');
    };

    const handleRightClick = (index: number) => {
        const key = `R${index}`;
        if (matched.has(key)) return;
        if (selectedLeft === null) return;

        setSelectedRight(index);

        const isCorrect = leftItems[selectedLeft].pairId === rightItems[index].pairId;

        if (isCorrect) {
            const newMatched = new Set(matched);
            newMatched.add(`L${selectedLeft}`);
            newMatched.add(`R${index}`);
            setMatched(newMatched);

            const points = (leftItems[selectedLeft].points || 10);
            const newScore = score + points;
            setScore(newScore);
            playSound('correct');
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });

            submitMatch(selectedLeft, index, true, points);

            if (newMatched.size === leftItems.length * 2) {
                // Game local complete, but we wait for teacher to end session usually?
                // Or we show a "Done!" state waiting for others?
            }
        } else {
            playSound('incorrect');
            submitMatch(selectedLeft, index, false, 0);
        }

        setTimeout(() => {
            setSelectedLeft(null);
            setSelectedRight(null);
        }, 500);
    };

    const submitMatch = async (leftIndex: number, rightIndex: number, isCorrect: boolean, points: number) => {
        if (!attemptId || !session) return;

        // Optimistic update for socket?
        if (isCorrect && socket) {
            socket.emit('submit_answer', {
                attempt_id: attemptId,
                score: points, // Incremental score? Or total?
                // The backend `submit_answer` handler in quizSocket.handler.ts currently expects 'score' and updates via DB query?
                // Actually the socket handler QUERIES the database for leaderboard.
                // It listens to 'submit_answer' mainly to trigger a leaderboard refresh for EVERYONE.
                // The payload `score` in `submit_answer` event might not be used if the handler re-queries.
                // Let's check socket handler logic.
                // It uses `attempt_id` to find session, then queries ALL attempts.
                // So we MUST submit to DB first to have accurate scores.
                student_id: 0,
                is_correct: isCorrect
            });
        }

        try {
            await activityAttemptAPI.submitResponse({
                attempt_id: attemptId,
                item_id: session.activity.items[leftItems[leftIndex].itemId].id,
                response: {
                    left: leftItems[leftIndex].left,
                    right: rightItems[rightIndex].right,
                },
                is_correct: isCorrect,
            });
            // After DB update, emit again to ensure fresh data?
            if (socket) {
                socket.emit('submit_answer', { attempt_id: attemptId, is_correct: isCorrect });
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- RENDER ---

    if (status === 'LOBBY') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a3a] text-white">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="mb-8 relative inline-block">
                        <div className="absolute inset-0 bg-saBlueLight/30 blur-3xl rounded-full animate-pulse"></div>
                        <Gamepad2 className="w-24 h-24 text-saVividOrange fill-current relative z-10 animate-bounce" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4">Match Pairs Live!</h2>
                    <p className="text-xl text-blue-200">Waiting for host to start...</p>
                    <div className="mt-8 flex justify-center gap-2">
                        {[0, 1, 2].map(i => <div key={i} className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                    </div>
                </div>
                <Button variant="ghost" className="absolute top-4 right-4" onClick={onExit}> <X /> </Button>
            </div>
        );
    }

    if (status === 'FINISHED') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a3a] text-white">
                <Card className="gamified-card p-8 md:p-12 text-center max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <Trophy className="w-24 h-24 mx-auto text-saVividOrange mb-6" />
                    <h2 className="text-4xl font-bold mb-2">Session Ended</h2>
                    <p className="text-xl text-saBlueLight mb-8">Your Final Score: {Math.round(score)}</p>

                    <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 text-left">
                        <h3 className="text-lg font-bold mb-4 text-center uppercase tracking-widest text-slate-400">Leaderboard</h3>
                        <div className="space-y-3">
                            {leaderboard.length === 0 ? (
                                <p className="text-center text-slate-500">Wait for final scores...</p>
                            ) : (
                                leaderboard.map((s, i) => (
                                    <div key={s.student_id} className={`p-3 rounded-lg flex items-center justify-between ${i === 0 ? 'bg-saVividOrange/20 border border-saVividOrange/50' : 'bg-slate-700/50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-saVividOrange text-slate-950' : 'bg-slate-600'}`}>#{i + 1}</div>
                                            <span className="font-semibold">{s.name}</span>
                                        </div>
                                        <span className="font-bold text-saBlueLight">{s.score}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <Button onClick={onExit} size="lg" className="btn-3d-primary w-full">Exit</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#061a3a] text-white flex flex-col font-sans overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[url('/grid.svg')] opacity-20" />
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-saVividOrange/25 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-saBlue/40 blur-[100px] rounded-full" />

            {/* Header */}
            <div className="p-3 sm:p-4 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/5 z-20 gap-2">
                <div className="flex items-center gap-2 sm:gap-4">
                    <span className="font-bold text-sm sm:text-lg text-saVividOrange whitespace-nowrap">Live Match</span>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full">
                        {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center bg-saVividOrange/10 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full text-saVividOrange border border-saVividOrange/25 text-xs sm:text-sm font-bold">
                        <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-1 sm:mr-2 fill-current" />
                        <span>{Math.round(score)}</span>
                    </div>
                    <div className="flex items-center bg-saBlueLight/10 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full text-saBlueLight border border-saBlueLight/20 text-xs sm:text-sm font-bold font-mono">
                        <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                        <span>{timeElapsed}s</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onExit} className="p-1.5 sm:p-2"><X className="w-4 h-4 sm:w-5 sm:h-5" /></Button>
                </div>
            </div>

            {/* Game Grid */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-8 relative z-10 w-full max-w-7xl mx-auto flex flex-col">
                <div className="flex-1 grid grid-cols-2 gap-2 sm:gap-4 md:gap-8 lg:gap-12 h-full">
                    {/* Left */}
                    <div className="space-y-2 sm:space-y-4">
                        <h3 className="text-xs sm:text-lg font-bold text-center text-saBlueLight uppercase tracking-widest border-b border-saBlueLight/30 pb-2">Terms</h3>
                        <div className="grid gap-2 sm:gap-4">
                            {leftItems.map((pair, index) => {
                                const isSelected = selectedLeft === index;
                                const isMatched = matched.has(`L${index}`);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleLeftClick(index)}
                                        disabled={isMatched}
                                        className={`btn-3d w-full min-h-[3rem] sm:min-h-[4rem] p-2 sm:p-4 text-left rounded-lg sm:rounded-xl transition-all duration-300 flex items-center gap-1.5 sm:gap-4 group 
                                        ${isMatched
                                                ? 'opacity-50 grayscale cursor-not-allowed bg-green-500/20 border-green-500/50'
                                                : isSelected
                                                    ? 'btn-3d-primary scale-[1.01] ring-2 sm:ring-4 ring-saBlueLight/30 z-10'
                                                    : 'btn-3d-neutral hover:scale-[1.01]'}`}
                                    >
                                        {pair.imageLeft && <img src={pair.imageLeft} alt="" className="w-7 h-7 sm:w-12 sm:h-12 object-cover rounded bg-black/30 shrink-0" />}
                                        <span className={`text-xs sm:text-base font-bold break-words leading-tight ${isMatched ? 'text-green-400 line-through' : 'text-white'}`}>{pair.left}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {/* Right */}
                    <div className="space-y-2 sm:space-y-4">
                        <h3 className="text-xs sm:text-lg font-bold text-center text-saVividOrange uppercase tracking-widest border-b border-saVividOrange/30 pb-2">Definitions</h3>
                        <div className="grid gap-2 sm:gap-4">
                            {rightItems.map((pair, index) => {
                                const isSelected = selectedRight === index;
                                const isMatched = matched.has(`R${index}`);
                                const isVisible = selectedLeft !== null || isMatched;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleRightClick(index)}
                                        disabled={isMatched || !isVisible}
                                        className={`btn-3d w-full min-h-[3rem] sm:min-h-[4rem] p-2 sm:p-4 text-left rounded-lg sm:rounded-xl transition-all duration-300 flex items-center gap-1.5 sm:gap-4 group 
                                        ${isMatched
                                                ? 'opacity-50 grayscale cursor-not-allowed bg-green-500/20 border-green-500/50'
                                                : isSelected
                                                    ? 'btn-3d-primary scale-[1.01] ring-2 sm:ring-4 ring-saVividOrange/30 z-10'
                                                    : !isVisible
                                                        ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
                                                        : 'bg-slate-700 border-b-4 border-slate-900 text-slate-100 hover:bg-slate-600 hover:scale-[1.01] shadow-lg'}`}
                                    >
                                        {isVisible ? (
                                            <>
                                                {pair.imageRight && <img src={pair.imageRight} alt="" className="w-7 h-7 sm:w-12 sm:h-12 object-cover rounded bg-black/30 shrink-0" />}
                                                <span className={`text-xs sm:text-base font-bold break-words leading-tight ${isMatched ? 'text-green-400 line-through' : 'text-white'}`}>{pair.right}</span>
                                            </>
                                        ) : (
                                            <div className="w-full flex justify-center"><span className="text-base sm:text-xl font-bold text-slate-600">?</span></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
