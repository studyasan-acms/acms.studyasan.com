import { useState, useEffect } from 'react';
import { X, Trophy, Clock, Star, Volume2, VolumeX, Gamepad2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { quizSessionAPI, activityAttemptAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';
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
            playSound('bg-music-playful', { loop: true, volume: 0.15 });
        } else {
            stopSound('bg-music-playful');
        }
    }, [isMuted, status]);

    useEffect(() => {
        if (status === 'IN_PROGRESS') {
            const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
            return () => clearInterval(timer);
        }
    }, [startTime, status]);

    const getStudentInfo = () => {
        let studentId = 0;
        let studentName = '';

        const rawSid = localStorage.getItem('student_id');
        if (rawSid) studentId = parseInt(rawSid, 10);

        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (!studentId) {
                    studentId = user.student?.id || user.student_id || user.id || 0;
                }
                if (!studentName) {
                    studentName = user.name || user.email || '';
                }
            }
        } catch (e) { }

        if (!studentName) {
            studentName = `Guest ${Math.floor(Math.random() * 1000)}`;
        }
        return { studentId, studentName };
    };

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

            const { studentId, studentName } = getStudentInfo();

            newSocket.on('connect', () => {
                newSocket.emit('join_session', {
                    join_code: joinCode,
                    student_id: studentId,
                    guest_name: studentName
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
        if (matched.has(`L${index}`)) return;
        setSelectedLeft(index);
        playSound('click');
        if (selectedRight !== null) {
            checkMatch(index, selectedRight);
        }
    };

    const handleRightClick = (index: number) => {
        if (matched.has(`R${index}`)) return;
        setSelectedRight(index);
        playSound('click');
        if (selectedLeft !== null) {
            checkMatch(selectedLeft, index);
        }
    };

    const checkMatch = (leftIndex: number, rightIndex: number) => {
        const left = leftItems[leftIndex];
        const right = rightItems[rightIndex];

        if (left.pairId === right.pairId) {
            const newMatched = new Set(matched);
            newMatched.add(`L${leftIndex}`);
            newMatched.add(`R${rightIndex}`);
            setMatched(newMatched);

            const points = (leftItems[leftIndex].points || 10);
            const newScore = score + points;
            setScore(newScore);
            playSound('correct');
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });

            submitMatch(leftIndex, rightIndex, true, points);
        } else {
            playSound('incorrect');
            submitMatch(leftIndex, rightIndex, false, 0);
        }

        setTimeout(() => {
            setSelectedLeft(null);
            setSelectedRight(null);
        }, 500);
    };

    const submitMatch = async (leftIndex: number, rightIndex: number, isCorrect: boolean, points: number) => {
        if (!attemptId || !session) return;
        const { studentId: sId } = getStudentInfo();

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

            if (socket) {
                socket.emit('submit_answer', {
                    attempt_id: attemptId,
                    score: points,
                    student_id: sId,
                    is_correct: isCorrect
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- RENDER ---

    if (status === 'LOBBY') {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto flex flex-col items-center justify-start bg-slate-50 text-slate-800 p-4 sm:p-6">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 -z-10" />
                <Card className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full shadow-xl relative overflow-hidden mx-4 animate-in zoom-in-95 duration-300 mt-6 sm:mt-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 text-saBlue rounded-3xl flex items-center justify-center animate-bounce border border-blue-100 shadow-sm">
                        <Gamepad2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Match Pairs Live!</h2>
                    <p className="text-sm text-slate-500 font-medium mb-6">Waiting for host to start the activity...</p>
                    <div className="flex justify-center gap-2">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-3 h-3 bg-saBlue rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                    <Button variant="ghost" className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700" onClick={onExit}>
                        <X className="w-5 h-5" />
                    </Button>
                </Card>
            </div>
        );
    }

    if (status === 'FINISHED') {
        return (
            <VictoryCelebrationModal
                title="Live Match Complete!"
                activityTitle="Live Match Pairs"
                score={Math.round(score)}
                onContinue={onExit}
                continueText="Exit Game"
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 -z-10" />
            <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px] -z-10" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px] -z-10" />

            {/* Header */}
            <div className="p-3 sm:p-5 flex justify-between items-center bg-saBlue text-white border-b border-saBlue/80 z-20 shadow-xs">
                <div className="flex items-center gap-3">
                    <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-7 sm:h-8 object-contain" />
                    <div className="h-5 sm:h-6 w-px bg-white/25 hidden sm:block" />
                    <span className="font-black text-sm sm:text-lg uppercase tracking-wider whitespace-nowrap">Live Match Pairs</span>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full">
                        {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs sm:text-sm">
                        <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 fill-current text-amber-300" />
                        <span>{Math.round(score)} EXP</span>
                    </div>
                    <div className="flex items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs sm:text-sm font-mono">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                        <span>{timeElapsed}s</span>
                    </div>
                    <Button variant="ghost" onClick={onExit} className="hover:bg-white/10 text-white p-2 rounded-xl"><X className="w-5 h-5" /></Button>
                </div>
            </div>

            {/* Game Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 relative z-10 w-full max-w-6xl mx-auto flex flex-col">
                <div className="flex-1 grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 h-full">
                    {/* Left: Terms */}
                    <div className="space-y-3">
                        <h3 className="text-xs sm:text-sm font-black text-center text-saBlue uppercase tracking-widest border-b border-slate-200 pb-2">Terms</h3>
                        <div className="grid gap-2.5 sm:gap-3">
                            {leftItems.map((pair, index) => {
                                const isSelected = selectedLeft === index;
                                const isMatched = matched.has(`L${index}`);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleLeftClick(index)}
                                        disabled={isMatched}
                                        className={`w-full min-h-[3.5rem] sm:min-h-[4.5rem] p-3 sm:p-4 text-left rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 ${
                                            isMatched
                                                ? 'opacity-40 grayscale cursor-not-allowed bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                                                : isSelected
                                                ? 'bg-blue-50 border-saBlue text-saBlue font-black shadow-md scale-[1.02]'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.01] shadow-xs'
                                        }`}
                                    >
                                        {pair.imageLeft && <img src={pair.imageLeft} alt="" className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded-xl bg-slate-100 shrink-0" />}
                                        <span className={`text-xs sm:text-sm font-bold leading-snug ${isMatched ? 'line-through text-emerald-700' : 'text-slate-800'}`}>{pair.left}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Definitions */}
                    <div className="space-y-3">
                        <h3 className="text-xs sm:text-sm font-black text-center text-saVividOrange uppercase tracking-widest border-b border-slate-200 pb-2">Definitions</h3>
                        <div className="grid gap-2.5 sm:gap-3">
                            {rightItems.map((pair, index) => {
                                const isSelected = selectedRight === index;
                                const isMatched = matched.has(`R${index}`);
                                const isVisible = selectedLeft !== null || isMatched;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleRightClick(index)}
                                        disabled={isMatched || !isVisible}
                                        className={`w-full min-h-[3.5rem] sm:min-h-[4.5rem] p-3 sm:p-4 text-left rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 ${
                                            isMatched
                                                ? 'opacity-40 grayscale cursor-not-allowed bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                                                : isSelected
                                                ? 'bg-amber-50 border-amber-500 text-amber-900 font-black shadow-md scale-[1.02]'
                                                : !isVisible
                                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.01] shadow-xs'
                                        }`}
                                    >
                                        {isVisible ? (
                                            <>
                                                {pair.imageRight && <img src={pair.imageRight} alt="" className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded-xl bg-slate-100 shrink-0" />}
                                                <span className={`text-xs sm:text-sm font-bold leading-snug ${isMatched ? 'line-through text-emerald-700' : 'text-slate-800'}`}>{pair.right}</span>
                                            </>
                                        ) : (
                                            <div className="w-full flex justify-center"><span className="text-base sm:text-xl font-black text-slate-300">?</span></div>
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
