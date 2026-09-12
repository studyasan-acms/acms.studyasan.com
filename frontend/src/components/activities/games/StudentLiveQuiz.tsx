import { useState, useEffect } from 'react';
import { X, Trophy, Clock, Star, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { quizSessionAPI, activityAttemptAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Props {
    joinCode: string;
    initialSession?: any;
    onExit: () => void;
}

export default function StudentLiveQuiz({ joinCode, initialSession, onExit }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [session, setSession] = useState<any>(initialSession || null);
    const [status, setStatus] = useState<'LOBBY' | 'IN_PROGRESS' | 'FINISHED'>((initialSession?.status as any) || 'LOBBY');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialSession?.current_question_index ?? -1);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    // Reuse sound logic
    const [isMuted, setIsMuted] = useState(false);
    const { playSound, stopSound, stopAll } = useSound();

    const [timeLeft, setTimeLeft] = useState(30);
    const [questionStartTime, setQuestionStartTime] = useState(Date.now());

    useEffect(() => {
        // Join logic
        joinSession();
        return () => {
            if (socket) socket.disconnect();
            stopAll();
        };
    }, []);

    useEffect(() => {
        if (!isMuted) {
            playSound('bg-music-playful', { loop: true, volume: 0.15 });
        } else {
            stopSound('bg-music-playful');
        }
    }, [isMuted]);

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
        } catch (e) {
            console.error('Error parsing user from local storage', e);
        }

        if (!studentName) {
            studentName = `Student ${studentId || Math.floor(Math.random() * 1000)}`;
        }
        return { studentId, studentName };
    };

    // Timer logic (local countdown, synchronized roughly with steps)
    useEffect(() => {
        if (status === 'IN_PROGRESS' && !isSubmitted) {
            if (timeLeft > 0) {
                const timer = setTimeout(() => {
                    setTimeLeft(prev => prev - 1);
                    if (timeLeft <= 5 && timeLeft > 0) playSound('timer-tick', { volume: 0.4 });
                }, 1000);
                return () => clearTimeout(timer);
            } else if (timeLeft === 0) {
                handleTimeout();
            }
        }
    }, [timeLeft, status, isSubmitted]);

    const handleTimeout = async () => {
        if (isSubmitted || !session) return;
        setIsSubmitted(true);
        setIsCorrect(false);
        setShowResult(true);
        playSound('incorrect');

        const { studentId: sId } = getStudentInfo();
        const question = session.activity?.items?.[currentQuestionIndex];

        if (attemptId && question) {
            try {
                await activityAttemptAPI.submitResponse({
                    attempt_id: attemptId,
                    item_id: question.id,
                    response: { answer: null, timed_out: true },
                    time_taken: 30
                });
            } catch (e) {
                console.error("Timeout response error:", e);
            }
        }

        if (socket && attemptId) {
            socket.emit('submit_answer', {
                attempt_id: attemptId,
                score: 0,
                student_id: sId,
                is_correct: false,
                question_index: currentQuestionIndex,
                answer: null,
                time_taken: 30
            });
        }
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
            setCurrentQuestionIndex(sessionData.current_question_index ?? -1);

            // Connect socket
            const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
            const newSocket = io(baseUrl);
            setSocket(newSocket);

            const { studentId, studentName } = getStudentInfo();

            newSocket.on('connect', () => {
                console.log('Student connected to socket:', newSocket.id);
                // Send join event with real student_id AND guest_name as fallback
                newSocket.emit('join_session', {
                    join_code: joinCode,
                    student_id: studentId,
                    guest_name: studentName
                });
            });

            newSocket.on('session_started', () => {
                setStatus('IN_PROGRESS');
                setCurrentQuestionIndex(0);
                startQuestion();
            });

            newSocket.on('next_question', ({ index }: { index: number }) => {
                setCurrentQuestionIndex(index);
                resetForNextQuestion();
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

            // Start an attempt on backend to track score
            try {
                const attemptRes = await activityAttemptAPI.start(sessionData.activity_id, sessionData.id);
                setAttemptId(attemptRes.data.data.id);
            } catch (e) {
                console.error("Failed to start attempt record", e);
            }

        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to join session');
            onExit();
        }
    };

    const startQuestion = () => {
        setIsSubmitted(false);
        setSelectedAnswer(null);
        setShowResult(false);

        const q = session?.activity?.items?.[0]; // Initial question
        if (q) {
            setTimeLeft(q.content?.timeLimit || 30);
        } else {
            setTimeLeft(30);
        }
        setQuestionStartTime(Date.now());
    };

    const resetForNextQuestion = () => {
        setIsSubmitted(false);
        setSelectedAnswer(null);
        setShowResult(false);
        const q = session?.activity?.items?.[currentQuestionIndex + 1] || session?.activity?.items?.[0];
        setTimeLeft(q?.content?.timeLimit || 30);
        setQuestionStartTime(Date.now());
    };

    const handleAnswerSelect = (index: number) => {
        if (isSubmitted) return;
        setSelectedAnswer(index);
        playSound('click');
    };

    const handleSubmit = async () => {
        if (selectedAnswer === null || !session || !attemptId) return;

        setIsSubmitted(true); // Lock UI
        const question = session.activity.items[currentQuestionIndex];
        const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
        const { studentId: sId } = getStudentInfo();

        // Send to server FIRST to validate
        try {
            const res = await activityAttemptAPI.submitResponse({
                attempt_id: attemptId,
                item_id: question.id,
                response: { answer: selectedAnswer },
                time_taken: timeTaken
            });

            const result = res.data.data;
            const validIsCorrect = result.is_correct;

            setIsCorrect(validIsCorrect);
            setShowResult(true);

            if (validIsCorrect) {
                playSound('correct');
                setScore(prev => prev + result.points); // Use points from server
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
            } else {
                playSound('incorrect');
            }

            if (socket) {
                // Emit valid result to socket for leaderboard and teacher real-time monitoring
                socket.emit('submit_answer', {
                    attempt_id: attemptId,
                    score: result.points,
                    student_id: sId,
                    is_correct: validIsCorrect,
                    question_index: currentQuestionIndex,
                    answer: selectedAnswer,
                    time_taken: timeTaken
                });
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to submit answer");
            setIsSubmitted(false); // Unlock if failed
        }
    };

    // Render Logic

    if (status === 'LOBBY') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-800 font-sans overflow-hidden">
                {/* Background Shapes & Grid */}
                <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                    <style>{`
                      @keyframes float-slow {
                        0%, 100% { transform: translateY(0px) rotate(0deg); }
                        50% { transform: translateY(-25px) rotate(180deg); }
                      }
                      .animate-float-slow { animation: float-slow 16s ease-in-out infinite; }
                    `}</style>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
                    <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
                    <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
                    
                    <div className="absolute w-12 h-12 rounded-full border-2 border-saBlue/15 animate-float-slow" style={{ top: '15%', left: '8%' }} />
                    <div className="absolute w-10 h-10 border-2 border-blue-400/20 rounded-lg animate-float-slow" style={{ top: '12%', right: '12%' }} />
                </div>

                <Card className="gamified-card p-10 text-center max-w-sm w-full mx-4 bg-white border border-slate-200 shadow-2xl rounded-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-saBlue/5 to-saVividOrange/5 animate-pulse" />
                    <div className="relative inline-block mb-6">
                        <Star className="w-20 h-20 text-saVividOrange fill-current relative z-10 animate-bounce" />
                    </div>
                    <h2 className="text-3xl font-black mb-1.5 text-slate-800">You're in!</h2>
                    <p className="text-sm text-slate-500 mb-6 font-medium">Waiting for the teacher to start...</p>
                    <div className="flex justify-center gap-1.5">
                        {[0, 1, 2].map(i => <div key={i} className="w-2.5 h-2.5 bg-saBlue rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></div>)}
                    </div>
                </Card>
                <Button variant="ghost" className="absolute top-4 right-4 text-slate-400 hover:text-slate-600" onClick={onExit}> <X /> </Button>
            </div>
        );
    }

    if (status === 'FINISHED') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-800 font-sans overflow-hidden">
                {/* Background Shapes & Grid */}
                <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
                    <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
                    <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
                </div>

                <Card className="gamified-card p-10 text-center max-w-md w-full mx-4 bg-white border border-slate-200 shadow-2xl rounded-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="overflow-y-auto flex-1 pr-1">
                        <Trophy className="w-20 h-20 mx-auto text-saVividOrange mb-5 animate-bounce" />
                        <h2 className="text-3xl font-black mb-1.5 text-slate-800">Quiz Ended!</h2>
                        <p className="text-sm font-bold text-saBlue mb-6">Final Score: {score} EXP</p>

                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-6 text-left">
                            <h3 className="text-xs font-black mb-3 text-center uppercase tracking-wider text-slate-400 border-b pb-2">Final Leaderboard</h3>
                            <div className="space-y-2">
                                {leaderboard.length === 0 ? (
                                    <p className="text-center text-slate-400 text-xs italic">Wait for final scores...</p>
                                ) : (
                                    leaderboard.map((s, i) => (
                                        <div key={s.student_id || i} className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                                            i === 0 ? 'bg-amber-50 border-orange-200 text-saVividOrange' : 'bg-white border-slate-100 text-slate-700'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-saVividOrange text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    #{i + 1}
                                                </div>
                                                <span>{s.name}</span>
                                            </div>
                                            <span>{s.score} pt</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <Button onClick={onExit} size="lg" className="w-full bg-saBlue hover:bg-saBlueDarkHover text-white font-bold h-11 rounded-xl shadow-md mt-4">Exit Game</Button>
                </Card>
            </div>
        );
    }

    const question = session?.activity?.items?.[currentQuestionIndex];

    if (!question) return <div className="p-12 text-center text-slate-500 font-bold">Loading active question...</div>;

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
                  .animate-float-slow { animation: float-slow 16s ease-in-out infinite; }
                  .animate-float-medium { animation: float-medium 22s ease-in-out infinite; }
                  .animate-float-fast { animation: float-fast 13s ease-in-out infinite; }
                `}</style>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
                <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
                <div className="absolute top-[30%] left-[50%] w-[35%] h-[35%] rounded-full bg-blue-300/10 blur-[100px]" />

                <div className="absolute w-12 h-12 rounded-full border-2 border-saBlue/15 animate-float-slow" style={{ top: '15%', left: '8%' }} />
                <div className="absolute w-10 h-10 border-2 border-blue-400/20 rounded-lg animate-float-fast" style={{ top: '12%', right: '12%' }} />
                <svg className="absolute w-14 h-14 text-saVividOrange/15 animate-float-medium" style={{ top: '75%', left: '12%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        Live Quiz
                    </h2>
                    <span className="text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/20 font-bold uppercase tracking-wider shrink-0">
                        Q{currentQuestionIndex + 1}
                    </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                    <button onClick={() => setIsMuted(!isMuted)} className="p-1 sm:p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-colors shrink-0" title={isMuted ? "Unmute" : "Mute"}>
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </button>
                    
                    <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm shrink-0 whitespace-nowrap">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 fill-current text-amber-300" />
                        <span>{score}<span className="hidden xs:inline ml-0.5">EXP</span></span>
                    </div>

                    <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm font-mono shrink-0 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                        <span className={timeLeft <= 5 ? 'animate-pulse text-red-300' : ''}>{timeLeft}s</span>
                    </div>

                    <Button variant="ghost" size="icon" onClick={onExit} className="hover:bg-white/10 text-white/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                </div>
            </div>

            {/* Waiting/Overlay Results with Next Question Action */}
            {isSubmitted && (
                <div className="absolute inset-0 z-40 bg-white/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
                    {showResult && (
                        <div className="text-center space-y-4 mb-6">
                            <div className={`text-5xl sm:text-6xl font-black uppercase tracking-wider ${isCorrect ? 'text-green-500 animate-bounce' : 'text-red-500'}`}>
                                {isCorrect ? 'Correct!' : 'Incorrect'}
                            </div>
                            <div className="text-sm font-bold text-slate-500">
                                Points +{isCorrect ? question.points || 10 : 0}
                            </div>
                        </div>
                    )}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-lg">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3 text-saBlue shadow-xs">
                            <Clock className="w-7 h-7 animate-spin text-saBlue" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">
                            Answer Recorded!
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mb-4">
                            Waiting for the teacher to move to the next question...
                        </p>
                        <div className="flex justify-center items-center gap-1.5 py-1">
                            {[0, 1, 2].map(i => (
                                <div 
                                    key={i} 
                                    className="w-2.5 h-2.5 bg-saBlue rounded-full animate-bounce" 
                                    style={{ animationDelay: `${i * 0.15}s` }} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative z-10 w-full">
                <div className="w-full max-w-7xl mx-auto py-2 sm:py-4">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
                            
                            {/* Left Column: Instructions */}
                            <div className="lg:col-span-1 order-1 lg:order-1 flex flex-col gap-4 self-stretch">
                                <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
                                    <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider">Live Match</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                                        You are playing live with other students! Read the question and submit your answer before time runs out to earn points.
                                    </p>
                                </Card>
                            </div>

                    {/* Center Column: Question details */}
                    <div className="lg:col-span-2 order-2 flex flex-col gap-5 items-stretch min-h-0">
                        {/* Question Card */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col items-center justify-center min-h-[140px]">
                            {question.content.questionMedia && (
                                <div className="mb-4 flex justify-center w-full max-w-lg aspect-video max-h-[220px] overflow-hidden rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                                    <img src={question.content.questionMedia} alt="Question Reference" className="w-full h-full object-contain" />
                                </div>
                            )}
                            {question.content.question && (
                                <h3 className="text-base sm:text-xl font-extrabold text-slate-800 text-center leading-relaxed">
                                    {question.content.question}
                                </h3>
                            )}
                        </Card>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {question.content.options.map((option: string, index: number) => {
                                const isSelected = selectedAnswer === index;
                                let statusClass = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/60 hover:border-slate-350 hover:scale-[1.01]";
                                if (isSelected) statusClass = "bg-blue-50 border-saBlue text-saBlue scale-[1.02] shadow-sm font-bold";

                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleAnswerSelect(index)}
                                        disabled={isSubmitted}
                                        className={`w-full min-h-[4.5rem] px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 text-left ${statusClass}`}
                                    >
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                                          isSelected ? 'bg-saBlue text-white' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          {String.fromCharCode(65 + index)}
                                        </span>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                          {question.content.optionsMedia?.[index] && (
                                            <div className="w-full aspect-video max-h-[140px] overflow-hidden mb-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                                              <img src={question.content.optionsMedia[index]} alt={`Option ${String.fromCharCode(65 + index)}`} className="w-full h-full object-contain" />
                                            </div>
                                          )}
                                          {option && <span className="text-sm font-semibold">{option}</span>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Submit button */}
                        {!isSubmitted && (
                            <Button
                                onClick={handleSubmit}
                                disabled={selectedAnswer === null}
                                className={`w-full py-4 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                                  selectedAnswer !== null
                                    ? 'bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-blue-500/20'
                                    : 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-400 border border-slate-300'
                                }`}
                            >
                                Submit Answer
                            </Button>
                        )}
                    </div>

                    {/* Right Column: Live Leaderboard */}
                    <div className="lg:col-span-1 order-3 lg:order-3 flex flex-col self-stretch">
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex-1 flex flex-col">
                            <h3 className="text-xs font-black mb-3 text-saVividOrange uppercase tracking-wider border-b border-slate-100 pb-2">Live Leaderboard</h3>
                            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 flex-1">
                                {leaderboard.length === 0 ? (
                                    <p className="text-center text-slate-400 text-xs py-4 font-medium italic">No scores yet</p>
                                ) : (
                                    leaderboard.map((s, i) => (
                                        <div key={s.student_id || i} className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                                            i === 0 
                                                ? 'bg-amber-50 border-orange-200 text-saVividOrange' 
                                                : 'bg-slate-50 border-slate-150 text-slate-700'
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                                    i === 0 ? 'bg-saVividOrange text-white' : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                    #{i + 1}
                                                </span>
                                                <span className="truncate max-w-[80px]">{s.name}</span>
                                            </div>
                                            <span>{s.score} pt</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    </div>
    );
}
