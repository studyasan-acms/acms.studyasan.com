import { useState, useEffect, useRef } from 'react';
import { X, Users, Play, ArrowRight, Trophy, Copy, Check, QrCode, Sparkles, Wifi, ArrowUpRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import type { Activity } from '../../../types/activity';
import { quizSessionAPI } from '../../../services/activity.service';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface Props {
    activity: Activity;
    onClose: () => void;
}

interface Student {
    student_id: number;
    name: string;
}

export default function TeacherQuizHost({ activity, onClose }: Props) {
    const [session, setSession] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'LOBBY' | 'IN_PROGRESS' | 'FINISHED'>('LOBBY');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const sessionInitialized = useRef(false);

    const handleCopyCode = () => {
        if (!session?.join_code) return;
        navigator.clipboard.writeText(session.join_code);
        setCopied(true);
        toast.success('Join code copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const getAvatarGradient = (name: string) => {
        if (!name) return 'from-purple-500 to-indigo-600';
        const code = name.charCodeAt(0) % 5;
        const gradients = [
            'from-purple-500 to-indigo-600',
            'from-blue-500 to-cyan-600',
            'from-emerald-500 to-teal-600',
            'from-pink-500 to-rose-600',
            'from-amber-500 to-orange-600'
        ];
        return gradients[code];
    };

    useEffect(() => {
        if (!sessionInitialized.current) {
            sessionInitialized.current = true;
            initializeSession();
        }
        return () => {
            // We don't disconnect here on unmount immediately to prevent flicker in StrictMode,
            // or we handle it carefully. But since we use sessionInitialized ref,
            // we ensure we only spin up ONE session/socket pair.
            // However, we should disconnect if component truly unmounts.
            // For now, let's keep the disconnect in the return, but store the socket instance in a ref too
            // or just rely on state cleanup if we were robust.
            // Actually, best practice for strict mode + async init is abort controller or ref tracking.
            // We will perform cleanup in the return.
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [socket]);

    const initializeSession = async () => {
        try {
            const response = await quizSessionAPI.create(activity.id);
            const newSession = response.data.data;
            setSession(newSession);

            // Connect to socket
            // Ensure we connect to root, strip /api if present in env
            const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
            const newSocket = io(baseUrl);
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('Host connected to socket:', newSocket.id);
                newSocket.emit('join_session', { join_code: newSession.join_code });
            });

            newSocket.on('student_joined', (student: Student) => {
                setStudents((prev) => {
                    if (prev.find(s => s.student_id === student.student_id)) return prev;
                    return [...prev, student];
                });
                toast.success(`${student.name} joined!`);
            });

            newSocket.on('session_started', () => {
                setStatus('IN_PROGRESS');
                setCurrentQuestionIndex(0);
            });

            newSocket.on('next_question', (data: { index: number }) => {
                setCurrentQuestionIndex(data.index);
            });

            newSocket.on('leaderboard_update', (data: any[]) => {
                console.log('Leaderboard update received:', data);
                setLeaderboard(data);
            });

            newSocket.on('student_word_success', (data: any) => {
                console.log('Student word success:', data);
                toast.success(`${data.student_name} found ${data.word}! (+${data.score_added})`);
            });

            newSocket.on('session_ended', () => {
                setStatus('FINISHED');
            });

        } catch (error: any) {
            toast.error('Failed to create session');
            onClose();
        }
    };

    const handleStart = async () => {
        if (!session) return;
        try {
            await quizSessionAPI.start(session.id);
            // Socket event 'session_started' will update state
        } catch (error) {
            toast.error('Failed to start game');
        }
    };

    const handleNext = async () => {
        if (!session) return;
        try {
            // Check if last question
            if (currentQuestionIndex >= (session.activity?.items?.length || 0) - 1) {
                await quizSessionAPI.end(session.id);
            } else {
                await quizSessionAPI.nextQuestion(session.id);
            }
        } catch (error) {
            toast.error('Failed to advance');
        }
    };

    const handleEnd = async () => {
        if (!session) return;
        try {
            await quizSessionAPI.end(session.id);
        } catch (error) {
            toast.error('Failed to end game');
        }
    };

    if (!session) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-950 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 z-50 flex flex-col text-white select-none overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Header */}
            <div className="p-4 px-6 flex justify-between items-center bg-slate-950/80 backdrop-blur-md border-b border-white/5 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        {activity.title}
                    </h2>
                    <span className="px-2.5 py-0.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full text-xs font-mono font-bold">
                        Lobby
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {status === 'IN_PROGRESS' && (
                        <Button variant="destructive" size="sm" onClick={handleEnd} className="rounded-xl font-bold h-9">
                            End Session
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center p-6 md:p-10">

                {/* Lobby State */}
                {status === 'LOBBY' && (
                    <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8 items-stretch justify-center h-full max-h-[80vh] z-10">
                        
                        {/* Left Card: Join Details & Instructions */}
                        <div className="flex-1 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl">
                            <div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold w-fit border border-emerald-500/20">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                    Lobby Active
                                </div>

                                <div className="my-6">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Join Code</p>
                                    <button 
                                        onClick={handleCopyCode}
                                        className="group relative flex items-center justify-between w-full p-4 bg-slate-950/60 border border-white/5 hover:border-purple-500/30 rounded-2xl transition-all"
                                        title="Click to copy join code"
                                    >
                                        <span className="text-4xl md:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 font-mono">
                                            {session.join_code}
                                        </span>
                                        <div className="flex items-center gap-1 bg-white/5 group-hover:bg-purple-500/10 text-slate-400 group-hover:text-purple-400 px-3 py-1.5 rounded-xl transition-all text-xs font-bold border border-white/5 group-hover:border-purple-500/20">
                                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </div>
                                    </button>
                                </div>

                                <div className="space-y-4 py-4 border-t border-b border-white/5">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">How to join:</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-bold text-xs text-purple-400 shrink-0">1</div>
                                            <p className="text-slate-300 text-sm leading-snug">Open your student dashboard</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center font-bold text-xs text-pink-400 shrink-0">2</div>
                                            <p className="text-slate-300 text-sm leading-snug">Go to the <b>Live Activities</b> tab</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-400 shrink-0">3</div>
                                            <p className="text-slate-300 text-sm leading-snug">Enter code <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">{session.join_code}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code Container */}
                            <div className="flex items-center gap-4 mt-6">
                                <div className="h-20 w-20 bg-white p-1.5 rounded-2xl shadow-lg shrink-0 flex items-center justify-center border border-white/10">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100&data=${encodeURIComponent(window.location.origin + '/dashboard/student-activities?code=' + session.join_code)}`} 
                                        alt="Join QR Code" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                                        <QrCode className="h-4 w-4 text-purple-400 animate-pulse" />
                                        QR Join
                                    </h4>
                                    <p className="text-xs text-slate-400 leading-normal mt-1">
                                        Scan with a camera to jump into the lobby instantly.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right Card: Lobby Players Listing */}
                        <div className="flex-[1.2] bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl h-full">
                            <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
                                <h2 className="text-md font-bold text-slate-200 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-400" />
                                    Active Players
                                </h2>
                                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30">
                                    {students.length} Connected
                                </span>
                            </div>

                            {/* Player Scroll Grid */}
                            <div className="flex-1 overflow-y-auto my-6 pr-1 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                                {students.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-16 text-slate-500 gap-4">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-center text-slate-400 animate-pulse">
                                            <Wifi className="h-6 w-6 text-purple-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-semibold text-slate-400 text-sm">Waiting for players to join...</p>
                                            <p className="text-xs text-slate-500 mt-1">The game will start as soon as students connect.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {students.map((student) => (
                                            <div 
                                                key={student.student_id} 
                                                className="bg-slate-950/40 border border-white/5 hover:border-purple-500/30 rounded-2xl p-3 flex items-center gap-3 animate-in zoom-in duration-300 transition-all hover:bg-slate-950/65 group"
                                            >
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center font-bold text-white shadow-md shadow-slate-950/20 group-hover:scale-105 transition-all`}>
                                                    {student.name[0]}
                                                </div>
                                                <span className="font-bold text-slate-200 truncate group-hover:text-white transition-all text-sm">{student.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Start Game Action Button */}
                            {students.length === 0 ? (
                                <div className="space-y-2 shrink-0">
                                    <Button
                                        size="lg"
                                        className="w-full text-sm py-6 rounded-2xl bg-slate-800/40 text-slate-600 border border-white/5 cursor-not-allowed flex items-center justify-center gap-2 font-bold"
                                        disabled
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Start Game
                                    </Button>
                                    <p className="text-[10px] text-center text-slate-500 font-medium">Please wait for at least one student to connect.</p>
                                </div>
                            ) : (
                                <div className="shrink-0">
                                    <Button
                                        size="lg"
                                        className="w-full text-sm py-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.99] font-bold"
                                        onClick={handleStart}
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Start Session Now
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* In Progress State */}
                {status === 'IN_PROGRESS' && (
                    <div className="w-full max-w-7xl flex gap-8 h-full">

                        {/* Check if Word Search */}
                        {activity.activity_type === 'WORD_SEARCH' || (activity as any).type === 'WORD_SEARCH' ? (
                            <div className="flex-1 flex flex-col gap-6">
                                <Card className="flex-1 bg-slate-800 border-slate-700 p-8 flex flex-col">
                                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                        <Play className="w-6 h-6 text-green-400" />
                                        Select Active Word
                                    </h2>
                                    {/* Use session.activity if available as it contains full items, fallback to prop activity */}
                                    {(() => {
                                        const currentActivity = session?.activity || activity;
                                        const item = currentActivity.items?.[0];
                                        if (!item) return <div>No items found</div>;

                                        let content = item.content;
                                        if (typeof content === 'string') {
                                            try {
                                                content = JSON.parse(content);
                                            } catch (e) {
                                                console.error('Failed to parse content', e);
                                            }
                                        }

                                        console.log('Parsed content:', content);
                                        const words = content?.words || [];

                                        return (
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {words.map((word: string, idx: number) => {
                                                    const isActive = currentQuestionIndex === idx; // Reuse index for active word tracking
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                if (socket) {
                                                                    console.log('Teacher selecting word:', word, 'Join Code:', session?.join_code);
                                                                    socket.emit('teacher_select_word', { join_code: session.join_code, word });
                                                                    setCurrentQuestionIndex(idx);
                                                                    toast.success(`Activated: ${word}`);
                                                                }
                                                            }}
                                                            className={`
                                                        p-6 rounded-xl text-xl font-bold transition-all border-2
                                                        ${isActive
                                                                    ? 'bg-blue-600 border-blue-400 text-white scale-105 shadow-lg shadow-blue-900/50'
                                                                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500 hover:scale-102'
                                                                }
                                                    `}
                                                        >
                                                            {word}
                                                            {isActive && <div className="text-xs font-normal mt-2 text-blue-200">Active Mission</div>}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        );
                                    })()}
                                </Card>
                            </div>
                        ) : (
                            /* Standard Quiz View */
                            <div className="flex-1 flex flex-col">
                                <Card className="flex-1 bg-slate-800 border-slate-700 p-8 flex flex-col items-center justify-center mb-6">
                                    <span className="text-slate-400 mb-4 uppercase tracking-widest font-bold">
                                        Question {currentQuestionIndex + 1} of {session.activity?.items?.length || '?'}
                                    </span>
                                    <h2 className="text-3xl font-bold text-center mb-8">
                                        {session.activity?.items?.[currentQuestionIndex]?.content?.question || "Question content loading..."}
                                    </h2>
                                    {/* Options preview (optional for host) */}
                                    <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
                                        {session.activity?.items?.[currentQuestionIndex]?.content?.options?.map((opt: string, idx: number) => (
                                            <div key={idx} className={`p-4 rounded-lg border ${idx === session.activity?.items?.[currentQuestionIndex]?.content?.correctAnswer ? 'bg-green-500/20 border-green-500' : 'bg-slate-700 border-slate-600'}`}>
                                                {opt} {idx === session.activity?.items?.[currentQuestionIndex]?.content?.correctAnswer && "(Correct)"}
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                <div className="flex justify-end">
                                    <Button
                                        size="lg"
                                        onClick={handleNext}
                                        className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700"
                                    >
                                        {currentQuestionIndex >= (session.activity?.items?.length || 0) - 1 ? 'Finish Game' : 'Next Question'}
                                        <ArrowRight className="w-6 h-6 ml-2" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Sidebar Leaderboard */}
                        <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 flex flex-col">
                            <h3 className="font-bold flex items-center gap-2 mb-4 text-yellow-400">
                                <Trophy className="w-5 h-5" />
                                Live Rankings
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {/* Mock Leaderboard for now, simpler list */}
                                <div className="flex-1 overflow-y-auto space-y-2">
                                    {leaderboard.length === 0 ? (
                                        <div className="text-slate-500 text-center py-4">No scores yet</div>
                                    ) : (
                                        leaderboard.map((s, i) => (
                                            <div key={s.student_id} className="bg-slate-700/50 p-3 rounded-lg flex items-center justify-between">
                                                <span className="font-mono text-slate-400">#{i + 1}</span>
                                                <span className="font-semibold">{s.name}</span>
                                                <span className="font-bold text-blue-400">{s.score}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Finished State */}
                {status === 'FINISHED' && (
                    <div className="text-center w-full max-w-4xl mx-auto">
                        <Trophy className="w-24 h-24 mx-auto text-yellow-500 mb-6 animate-bounce" />
                        <h1 className="text-4xl font-bold mb-8">Game Over!</h1>

                        <div className="bg-slate-800 rounded-2xl p-8 mb-8">
                            <h2 className="text-2xl font-bold mb-6 text-blue-300">Final Leaderboard</h2>
                            <div className="space-y-4">
                                {leaderboard.map((s, i) => (
                                    <div key={s.student_id} className={`p-4 rounded-xl flex items-center justify-between ${i === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-slate-700/50'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-600'}`}>
                                                #{i + 1}
                                            </div>
                                            <span className="font-bold text-lg">{s.name}</span>
                                        </div>
                                        <span className="font-black text-xl text-blue-400">{s.score} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button onClick={onClose} variant="outline" className="text-white border-white hover:bg-white/10 btn-3d">
                            Close Session
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
