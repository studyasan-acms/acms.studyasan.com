import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Play, ArrowRight, Trophy, Copy, Check, Wifi, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react';
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

interface StudentResponse {
    student_id: number;
    student_name: string;
    question_index: number;
    is_correct: boolean;
    score_added: number;
    total_score?: number;
    time_taken: number;
}

export default function TeacherQuizHost({ activity, onClose }: Props) {
    const [session, setSession] = useState<any>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [status, setStatus] = useState<'LOBBY' | 'IN_PROGRESS' | 'FINISHED'>('LOBBY');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [studentResponses, setStudentResponses] = useState<Record<number, StudentResponse>>({});
    const [copied, setCopied] = useState(false);
    const [mobileTab, setMobileTab] = useState<'question' | 'progress'>('question');

    const sessionInitialized = useRef(false);

    const handleCopyCode = () => {
        if (!session?.join_code) return;
        navigator.clipboard.writeText(session.join_code);
        setCopied(true);
        toast.success('Join code copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const getAvatarGradient = (name: string) => {
        if (!name) return 'from-blue-500 to-indigo-600';
        const code = name.charCodeAt(0) % 5;
        const gradients = [
            'from-blue-600 to-indigo-600',
            'from-saBlue to-cyan-600',
            'from-emerald-600 to-teal-600',
            'from-saVividOrange to-amber-600',
            'from-purple-600 to-pink-600'
        ];
        return gradients[code];
    };

    useEffect(() => {
        if (!sessionInitialized.current) {
            sessionInitialized.current = true;
            initializeSession();
        }
    }, []);

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

            const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
            const newSocket = io(baseUrl);
            setSocket(newSocket);

            newSocket.on('connect', () => {
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
                setStudentResponses({});
            });

            newSocket.on('next_question', (data: { index: number }) => {
                setCurrentQuestionIndex(data.index);
                setStudentResponses({}); // Reset attempts for new question
            });

            newSocket.on('leaderboard_update', (data: any[]) => {
                setLeaderboard(data);
            });

            // Live updates for student responses (both correct and incorrect)
            newSocket.on('student_response_update', (data: StudentResponse) => {
                setStudentResponses((prev) => ({
                    ...prev,
                    [data.student_id]: data
                }));
                if (data.is_correct) {
                    toast.success(`${data.student_name} answered correctly! (+${data.score_added})`);
                } else {
                    toast.error(`${data.student_name} answered incorrectly.`);
                }
            });

            newSocket.on('student_word_success', (data: any) => {
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
        } catch (error) {
            toast.error('Failed to start game');
        }
    };

    const handleNext = async () => {
        if (!session) return;
        try {
            const totalItems = (session.activity?.items || activity.items)?.length || 0;
            if (currentQuestionIndex >= totalItems - 1) {
                await quizSessionAPI.end(session.id);
            } else {
                await quizSessionAPI.nextQuestion(session.id);
                setStudentResponses({});
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

    const parseContent = (content: any) => {
        if (!content) return {};
        if (typeof content === 'string') {
            try {
                return JSON.parse(content);
            } catch (e) {
                return {};
            }
        }
        return content;
    };

    const normalizeBoolean = (val: any): boolean => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
            const trimmed = val.trim().toLowerCase();
            return trimmed === 'true' || trimmed === '1' || trimmed === 'yes';
        }
        if (typeof val === 'number') return val === 1;
        return Boolean(val);
    };

    if (!session) {
        return createPortal(
            <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[9999]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saBlue mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Initializing Session...</p>
            </div>,
            document.body
        );
    }

    const currentActivity = session.activity || activity;
    const items = currentActivity.items || [];
    const currentItem = items[currentQuestionIndex] || items[0];
    const content = parseContent(currentItem?.content);

    // Calculate response counts for current question
    const responseList = Object.values(studentResponses);
    const correctCount = responseList.filter(r => r.is_correct).length;
    const incorrectCount = responseList.filter(r => !r.is_correct).length;

    return createPortal(
        <div className="fixed inset-0 bg-slate-50 z-[9999] flex flex-col font-sans text-slate-800 select-none overflow-hidden">
            {/* StudyAsan Brand Header */}
            <div className="p-4 sm:p-5 px-6 flex justify-between items-center bg-saBlue text-white border-b border-saBlue/80 z-20 shadow-xs shrink-0">
                <div className="flex items-center gap-4">
                    <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-8 object-contain" />
                    <div className="h-6 w-px bg-white/25 hidden sm:block" />
                    <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                        {activity.title}
                    </h2>
                    <span className="px-3 py-1 bg-white/15 border border-white/25 text-white rounded-full text-xs font-bold uppercase tracking-wider">
                        {status === 'LOBBY' ? 'Lobby' : status === 'IN_PROGRESS' ? 'Live Session' : 'Ended'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {status === 'IN_PROGRESS' && (
                        <Button variant="destructive" size="sm" onClick={handleEnd} className="rounded-xl font-bold h-9 bg-rose-600 hover:bg-rose-700 text-white">
                            End Session
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={onClose} 
                        className="h-9 w-9 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">

                {/* 1. LOBBY STATE */}
                {status === 'LOBBY' && (
                    <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6 items-stretch py-2 sm:py-4">
                        
                        {/* Left Card: Join Details & Instructions */}
                        <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm">
                            <div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold w-fit border border-emerald-200">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    Lobby Active
                                </div>

                                <div className="my-6">
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Room Join Code</p>
                                    <button 
                                        onClick={handleCopyCode}
                                        className="group relative flex items-center justify-between w-full p-4 bg-slate-50 border-2 border-slate-200 hover:border-saBlue rounded-2xl transition-all"
                                        title="Click to copy join code"
                                    >
                                        <span className="text-4xl md:text-5xl font-black tracking-widest text-saBlue font-mono">
                                            {session.join_code}
                                        </span>
                                        <div className="flex items-center gap-1.5 bg-white group-hover:bg-blue-50 text-slate-600 group-hover:text-saBlue px-3 py-2 rounded-xl transition-all text-xs font-bold border border-slate-200">
                                            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </div>
                                    </button>
                                </div>

                                <div className="space-y-3.5 pt-4 border-t border-slate-100">
                                    <h3 className="text-xs font-black text-saBlue uppercase tracking-wider">How students join:</h3>
                                    <div className="space-y-2.5">
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xs text-saBlue shrink-0">1</div>
                                            <p className="text-slate-600 text-xs sm:text-sm font-medium">Open student dashboard and click <b>Join Live Game</b></p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="h-6 w-6 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center font-bold text-xs text-saVividOrange shrink-0">2</div>
                                            <p className="text-slate-600 text-xs sm:text-sm font-medium">Enter code <span className="font-mono font-bold text-saBlue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{session.join_code}</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Card: Lobby Players Listing */}
                        <div className="flex-[1.2] bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-sm h-full">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                                <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-saBlue" />
                                    Connected Students
                                </h2>
                                <span className="bg-blue-50 text-saBlue px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                                    {students.length} Ready
                                </span>
                            </div>

                            {/* Player Scroll Grid */}
                            <div className="flex-1 overflow-y-auto my-6 pr-1">
                                {students.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-saBlue animate-pulse">
                                            <Wifi className="h-6 w-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-slate-700 text-sm">Waiting for students to join...</p>
                                            <p className="text-xs text-slate-400 mt-1">Students will appear here as soon as they enter the code.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {students.map((student) => (
                                            <div 
                                                key={student.student_id} 
                                                className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 animate-in zoom-in duration-200 hover:border-saBlue/40 transition-all"
                                            >
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center font-bold text-white shadow-xs`}>
                                                    {student.name[0]}
                                                </div>
                                                <span className="font-bold text-slate-800 truncate text-sm">{student.name}</span>
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
                                        className="w-full text-sm py-5 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center gap-2 font-bold"
                                        disabled
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Start Session
                                    </Button>
                                    <p className="text-[10px] text-center text-slate-400 font-medium">Wait for at least one student to join before starting.</p>
                                </div>
                            ) : (
                                <div className="shrink-0">
                                    <Button
                                        size="lg"
                                        className="w-full text-sm py-5 rounded-2xl bg-saVividOrange hover:bg-orange-600 text-white transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-[0.99] font-black uppercase tracking-wider"
                                        onClick={handleStart}
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Start Live Session Now
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. IN PROGRESS STATE */}
                {status === 'IN_PROGRESS' && (
                    <div className="w-full max-w-7xl mx-auto flex flex-col py-2 sm:py-4">
                        
                        {/* Mobile Screen Tab Switcher */}
                        <div className="lg:hidden flex items-center gap-2 mb-4 bg-slate-100 p-1 rounded-2xl shrink-0">
                            <button
                                type="button"
                                onClick={() => setMobileTab('question')}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    mobileTab === 'question'
                                        ? 'bg-white text-saBlue shadow-xs font-black'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <span>Question {currentQuestionIndex + 1}/{items.length || 1}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileTab('progress')}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    mobileTab === 'progress'
                                        ? 'bg-white text-saBlue shadow-xs font-black'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>Student Progress ({responseList.length}/{students.length})</span>
                            </button>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-6 items-start">

                            {/* Main Question & Activity Preview (Left 2/3) */}
                            <div className={`flex-1 w-full min-w-0 ${mobileTab === 'question' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
                                <Card className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 flex flex-col shadow-sm">
                                    
                                    {/* Question Index Indicator */}
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 shrink-0">
                                        <span className="text-xs font-black uppercase tracking-wider text-saBlue">
                                            Question {currentQuestionIndex + 1} of {items.length || 1}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                            Type: {activity.activity_type.replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* PREVIEW 1: WORD SEARCH */}
                                    {activity.activity_type === 'WORD_SEARCH' ? (
                                        <div className="flex-1 flex flex-col">
                                            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
                                                <Play className="w-5 h-5 text-saBlue" />
                                                Active Word Missions
                                            </h3>
                                            <p className="text-xs text-slate-500 mb-6">
                                                Click any word below to broadcast it as the featured mission target to all student screens:
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {(content?.words || []).map((word: string, idx: number) => {
                                                    const isActive = currentQuestionIndex === idx;
                                                    return (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                if (socket) {
                                                                    socket.emit('teacher_select_word', { join_code: session.join_code, word });
                                                                    setCurrentQuestionIndex(idx);
                                                                    toast.success(`Active Word: ${word}`);
                                                                }
                                                            }}
                                                            className={`p-4 rounded-2xl text-base font-bold transition-all border-2 text-center flex flex-col items-center justify-center ${
                                                                isActive
                                                                    ? 'bg-blue-50 border-saBlue text-saBlue shadow-sm scale-105'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <span>{word}</span>
                                                            {isActive && (
                                                                <span className="text-[10px] font-black uppercase tracking-wider text-saBlue mt-1">
                                                                    ★ Active Mission
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : activity.activity_type === 'MATCH_PAIRS' ? (
                                        /* PREVIEW 2: MATCH PAIRS */
                                        <div className="flex-1 flex flex-col">
                                            <h3 className="text-lg font-black text-slate-800 mb-2">
                                                Match Pairs Activity
                                            </h3>
                                            <p className="text-xs text-slate-500 mb-6">
                                                Pairs that students must connect on their screens:
                                            </p>
                                            <div className="space-y-3">
                                                {((content?.pairs || currentItem?.content?.pairs || [])).map((pair: any, pIdx: number) => (
                                                    <div key={pIdx} className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                                                        <div className="flex-1 flex items-center gap-3">
                                                            {pair.leftImage && (
                                                                <img src={pair.leftImage} alt="Left" className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1" />
                                                            )}
                                                            <span className="font-bold text-slate-800 text-sm">{pair.leftText || pair.left || `Item ${pIdx + 1}`}</span>
                                                        </div>
                                                        <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs font-bold text-saBlue">
                                                            ⟷ Matches With
                                                        </div>
                                                        <div className="flex-1 flex items-center justify-end gap-3 text-right">
                                                            <span className="font-bold text-slate-800 text-sm">{pair.rightText || pair.right || `Match ${pIdx + 1}`}</span>
                                                            {pair.rightImage && (
                                                                <img src={pair.rightImage} alt="Right" className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!content?.pairs && !currentItem?.content?.pairs) && (
                                                    <div className="text-center py-10 text-slate-400 text-xs">No pair data found</div>
                                                )}
                                            </div>
                                        </div>
                                    ) : activity.activity_type === 'TRUE_FALSE' ? (
                                        /* PREVIEW 3: TRUE / FALSE */
                                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                                            {content?.statementMedia && (
                                                <div className="mb-4 w-full max-w-lg aspect-video max-h-[200px] overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                                    <img src={content.statementMedia} alt="Visual" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 leading-relaxed mb-6 max-w-xl">
                                                &ldquo;{content?.statement || currentItem?.content?.statement || 'True/False Statement'}&rdquo;
                                            </h3>
                                            <div className="inline-flex items-center gap-3 p-4 px-6 rounded-2xl bg-slate-50 border border-slate-200">
                                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Correct Answer:</span>
                                                <span className={`px-4 py-1.5 rounded-xl font-black text-sm uppercase tracking-wider text-white ${
                                                    normalizeBoolean(content?.correctAnswer) ? 'bg-emerald-600' : 'bg-rose-600'
                                                }`}>
                                                    {normalizeBoolean(content?.correctAnswer) ? '✓ TRUE' : '✗ FALSE'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : activity.activity_type === 'HANGMAN' ? (
                                        /* PREVIEW 4: HANGMAN */
                                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Secret Word</span>
                                            <div className="flex flex-wrap gap-2 justify-center mb-6">
                                                {(content?.word || 'HANGMAN').split('').map((char: string, i: number) => (
                                                    <div key={i} className="w-11 h-12 rounded-xl bg-blue-50 border-2 border-saBlue text-saBlue font-black text-xl flex items-center justify-center">
                                                        {char.toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>
                                            {content?.hint && (
                                                <p className="text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl">
                                                    Hint: {content.hint}
                                                </p>
                                            )}
                                        </div>
                                    ) : activity.activity_type === 'ABACUS' ? (
                                        /* PREVIEW 5: ABACUS */
                                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Target Number</span>
                                            <div className="text-5xl font-black text-saBlue font-mono mb-4">
                                                {content?.targetNumber ?? currentItem?.points ?? 10}
                                            </div>
                                            <p className="text-xs text-slate-500">Students adjust the abacus beads to represent this value.</p>
                                        </div>
                                    ) : (
                                        /* PREVIEW 6: QUIZ GAME (DEFAULT) */
                                        <div className="flex-1 flex flex-col items-center justify-center">
                                            {content?.questionMedia && (
                                                <div className="mb-4 w-full max-w-lg aspect-video max-h-[200px] overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                                                    <img src={content.questionMedia} alt="Visual" className="w-full h-full object-contain" />
                                                </div>
                                            )}
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-800 text-center mb-6 leading-relaxed">
                                                {content?.question || "Question content loading..."}
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                                                {(content?.options || []).map((opt: string, idx: number) => {
                                                    const isCorrect = idx === Number(content?.correctAnswer);
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            className={`p-4 rounded-xl border-2 flex items-center justify-between text-sm font-bold ${
                                                                isCorrect 
                                                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-800' 
                                                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                                            }`}
                                                        >
                                                            <span>{String.fromCharCode(65 + idx)}. {opt}</span>
                                                            {isCorrect && (
                                                                <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                                    Correct
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom Host Actions */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 mt-6 shrink-0">
                                        <div className="flex items-center gap-2 lg:hidden w-full sm:w-auto justify-center">
                                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> {correctCount} Correct
                                            </span>
                                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                <XCircle className="w-3.5 h-3.5" /> {incorrectCount} Incorrect
                                            </span>
                                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> {Math.max(0, students.length - responseList.length)} Thinking
                                            </span>
                                        </div>
                                        <Button
                                            size="lg"
                                            onClick={handleNext}
                                            className="h-12 px-8 bg-saBlue hover:bg-saBlueDarkHover text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 w-full sm:w-auto sm:ml-auto"
                                        >
                                            <span>{currentQuestionIndex >= items.length - 1 ? 'Finish Session' : 'Next Question'}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </Card>
                            </div>

                            {/* Right Sidebar: Real-Time Attempts & Leaderboard (Right 1/3) */}
                            <div className={`w-full lg:w-96 shrink-0 ${mobileTab === 'progress' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}>
                                <Card className="w-full bg-white border border-slate-200 rounded-3xl p-5 flex flex-col shadow-sm">
                                    
                                    {/* Summary Attempt Stats */}
                                    <div className="border-b border-slate-100 pb-4 mb-4 shrink-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                                <Users className="w-4 h-4 text-saBlue" />
                                                Student Progress
                                            </h3>
                                            <span className="text-xs font-bold text-slate-500">
                                                {responseList.length}/{students.length} Answered
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> {correctCount} Correct
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> {incorrectCount} Incorrect
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {Math.max(0, students.length - responseList.length)} Thinking
                                            </span>
                                        </div>
                                    </div>

                                    {/* Student List with Real-time Status Badges */}
                                    <div className="space-y-2 pr-1 max-h-[500px] overflow-y-auto">
                                        {students.length === 0 ? (
                                            <div className="text-slate-400 text-center py-8 text-xs italic">No students in room</div>
                                        ) : (
                                            students.map((student) => {
                                                const response = studentResponses[student.student_id];
                                                const boardEntry = leaderboard.find(l => l.student_id === student.student_id);
                                                const totalScore = boardEntry?.score ?? 0;

                                                return (
                                                    <div 
                                                        key={student.student_id} 
                                                        className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${getAvatarGradient(student.name)} flex items-center justify-center font-bold text-white text-xs shrink-0`}>
                                                                {student.name[0]}
                                                            </div>
                                                            <div className="truncate">
                                                                <div className="font-bold text-slate-800 text-xs truncate">{student.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono">{totalScore} pts</div>
                                                            </div>
                                                        </div>

                                                        {/* Real-time Status Indicator */}
                                                        <div>
                                                            {response ? (
                                                                response.is_correct ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        +{response.score_added}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                                                                        <XCircle className="w-3.5 h-3.5" />
                                                                        Incorrect
                                                                    </span>
                                                                )
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-400 animate-pulse">
                                                                    <Clock className="w-3 h-3" />
                                                                    Thinking
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </Card>
                            </div>

                        </div>
                    </div>
                )}

                {/* 3. FINISHED STATE */}
                {status === 'FINISHED' && (
                    <div className="text-center w-full max-w-3xl mx-auto p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                        <Trophy className="w-20 h-20 mx-auto text-amber-500 mb-4 animate-bounce" />
                        <h1 className="text-3xl font-black text-slate-800 mb-2">Session Completed!</h1>
                        <p className="text-xs text-slate-500 mb-6">Here is the final score tally for all participating students.</p>

                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-6 text-left max-h-[350px] overflow-y-auto">
                            <h2 className="text-xs font-black uppercase tracking-wider text-saBlue mb-4 text-center border-b pb-2">
                                Final Leaderboard
                            </h2>
                            <div className="space-y-2.5">
                                {leaderboard.map((s, i) => (
                                    <div 
                                        key={s.student_id || i} 
                                        className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                            i === 0 
                                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-black' 
                                                : 'bg-white border-slate-200 text-slate-700 font-bold'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                                                i === 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                #{i + 1}
                                            </div>
                                            <span className="text-sm">{s.name}</span>
                                        </div>
                                        <span className="text-saBlue font-black text-sm">{s.score} EXP</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button onClick={onClose} className="h-12 px-8 bg-saBlue hover:bg-saBlueDarkHover text-white font-bold rounded-xl">
                            Close Session
                        </Button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
