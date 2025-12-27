import { useState, useEffect, useRef } from 'react';
import { X, Users, Play, ArrowRight, Trophy } from 'lucide-react';
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

    const bottomRef = useRef<HTMLDivElement>(null);
    const sessionInitialized = useRef(false);

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
            const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace('/api', '');
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
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col text-white">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold">{activity.title}</h2>
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-mono">
                        Code: {session.join_code}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-400" />
                        <span className="text-xl font-bold">{students.length}</span>
                    </div>
                    {status === 'IN_PROGRESS' && (
                        <Button variant="destructive" onClick={handleEnd}>
                            End Session
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center p-8 bg-[url('/grid.svg')]">

                {/* Lobby State */}
                {status === 'LOBBY' && (
                    <div className="text-center w-full max-w-4xl">
                        <h1 className="text-6xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            Join via Code: {session.join_code}
                        </h1>

                        <div className="flex flex-wrap gap-4 justify-center mb-12 min-h-[200px]">
                            {students.map((student) => (
                                <div key={student.student_id} className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-3 flex items-center gap-3 animate-in zoom-in duration-300">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold">
                                        {student.name[0]}
                                    </div>
                                    <span className="font-semibold text-lg">{student.name}</span>
                                </div>
                            ))}
                            {students.length === 0 && (
                                <div className="flex flex-col items-center justify-center w-full text-slate-500 animate-pulse">
                                    <p>Waiting for players to join...</p>
                                </div>
                            )}
                        </div>

                        <Button
                            size="lg"
                            className="text-xl px-12 py-8 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105"
                            onClick={handleStart}
                            disabled={students.length === 0}
                        >
                            <Play className="w-8 h-8 mr-3 fill-current" />
                            Start Game
                        </Button>
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
