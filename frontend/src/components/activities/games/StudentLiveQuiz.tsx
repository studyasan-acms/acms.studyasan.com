import { useState, useEffect, useRef } from 'react';
import { X, Trophy, Clock, Star, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { quizSessionAPI, activityAttemptAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Props {
    joinCode: string;
    onExit: () => void;
}

export default function StudentLiveQuiz({ joinCode, onExit }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [session, setSession] = useState<any>(null);
    const [status, setStatus] = useState<'LOBBY' | 'IN_PROGRESS' | 'FINISHED'>('LOBBY');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
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
            playSound('bg-music', { loop: true, volume: 0.3 });
        } else {
            stopSound('bg-music');
        }
    }, [isMuted]);

    // Timer logic (local countdown, synchronized roughly with steps)
    useEffect(() => {
        if (status === 'IN_PROGRESS' && !isSubmitted && timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft(prev => prev - 1);
                if (timeLeft <= 5 && timeLeft > 0) playSound('timer-tick', { volume: 0.4 });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, status, isSubmitted]);

    const joinSession = async () => {
        try {
            const response = await quizSessionAPI.join(joinCode);
            const sessionData = response.data.data;
            setSession(sessionData);
            setStatus(sessionData.status);
            setCurrentQuestionIndex(sessionData.current_question_index);

            // Connect socket
            const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
            const newSocket = io(baseUrl);
            setSocket(newSocket);

            const studentId = localStorage.getItem('student_id') || 0;

            // Try to get user name from local storage for better lobby experience
            let guestName = '';
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    guestName = user.name || user.email || '';
                }
            } catch (e) {
                console.error('Error parsing user from local storage', e);
            }

            // Fallback if no user name found (e.g. strict incognito or weird state)
            if (!guestName) {
                guestName = `Guest ${Math.floor(Math.random() * 1000)}`;
            }

            newSocket.on('connect', () => {
                console.log('Student connected to socket:', newSocket.id);
                // Send join event with student_id AND guest_name as fallback
                newSocket.emit('join_session', {
                    join_code: joinCode,
                    student_id: studentId,
                    guest_name: guestName
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

            // Start an attempt on backend to track score?
            try {
                // Pass quiz_session_id to link attempt to this live session
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

        // We rely on currentQuestionIndex state update to get new question data?
        // session.activity.items is static.
        // We just need to reset timer.
        // We need to access the NEW question to set timeLeft.
        // But state update might be async? We use `currentQuestionIndex` from the event data usually.
        // For simplicity, just reset to default or read inside render.
        setTimeLeft(30);
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

        // Send to server FIRST to validate
        try {
            const res = await activityAttemptAPI.submitResponse({
                attempt_id: attemptId,
                item_id: question.id,
                response: { answer: selectedAnswer },
                // we don't send is_correct, server calculates it
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
                // Emit valid result to socket for leaderboard
                socket.emit('submit_answer', {
                    attempt_id: attemptId,
                    score: result.points,
                    student_id: 0,
                    is_correct: validIsCorrect
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a3a] text-white">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="mb-8 relative inline-block">
                        <div className="absolute inset-0 bg-saBlueLight/30 blur-3xl rounded-full animate-pulse"></div>
                        <Star className="w-24 h-24 text-saVividOrange fill-current relative z-10 animate-spin-slow" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4">You're in!</h2>
                    <p className="text-xl text-blue-200">Waiting for {session?.host?.name || 'teacher'} to start...</p>
                    <div className="mt-8">
                        <div className="loading-dots flex justify-center gap-2">
                            {[0, 1, 2].map(i => <div key={i} className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                        </div>
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
                    <h2 className="text-4xl font-bold mb-2">Quiz Ended</h2>
                    <p className="text-xl text-saBlueLight mb-8">Your Final Score: {score}</p>

                    <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 text-left">
                        <h3 className="text-lg font-bold mb-4 text-center uppercase tracking-widest text-slate-400">Leaderboard</h3>
                        <div className="space-y-3">
                            {leaderboard.length === 0 ? (
                                <p className="text-center text-slate-500">Wait for final scores...</p>
                            ) : (
                                leaderboard.map((s, i) => (
                                    <div key={s.student_id} className={`p-3 rounded-lg flex items-center justify-between ${i === 0 ? 'bg-saVividOrange/20 border border-saVividOrange/50' : 'bg-slate-700/50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? 'bg-saVividOrange text-slate-950' : 'bg-slate-600'}`}>
                                                #{i + 1}
                                            </div>
                                            <span className="font-semibold">{s.name}</span>
                                        </div>
                                        <span className="font-bold text-saBlueLight">{s.score}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <Button onClick={onExit} size="lg" className="btn-3d-primary w-full">Exit Game</Button>
                </Card>
            </div>
        );
    }

    const question = session?.activity?.items?.[currentQuestionIndex];

    if (!question) return <div className="text-white">Loading question...</div>;

    return (
        <div className="fixed inset-0 z-50 bg-[#061a3a] text-white flex flex-col overflow-hidden font-sans">
            {/* Reuse the UI from QuizGameComponent roughly */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-saVividOrange/25 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-saBlue/40 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
                <div className="flex items-center gap-4">
                    <span className="bg-white/10 px-4 py-2 rounded-full font-bold">Q{currentQuestionIndex + 1}</span>
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full">
                        {isMuted ? <VolumeX /> : <Volume2 />}
                    </button>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center bg-saVividOrange/10 px-4 py-2 rounded-full text-saVividOrange border border-saVividOrange/25">
                        <Star className="w-5 h-5 mr-2 fill-current" />
                        <span className="font-bold text-lg">{score}</span>
                    </div>
                    <div className="flex items-center bg-saBlueLight/10 px-4 py-2 rounded-full text-saBlueLight border border-saBlueLight/20">
                        <Clock className="w-5 h-5 mr-2" />
                        <span className={`font-bold text-lg ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : ''}`}>{timeLeft}s</span>
                    </div>
                    <Button variant="ghost" onClick={onExit}><X /></Button>
                </div>
            </div>

            {/* Waiting for Next Question State (after submit) */}
            {isSubmitted && (
                <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in">
                    {showResult ? (
                        <div className="text-center space-y-8 mb-12">
                            <div className={`text-6xl font-black uppercase tracking-widest ${isCorrect ? 'text-green-400' : 'text-red-500'} animate-bounce`}>
                                {isCorrect ? 'Correct!' : 'Incorrect'}
                            </div>
                            <div className="text-xl text-white/80">
                                Points +{isCorrect ? question.points || 10 : 0}
                            </div>
                        </div>
                    ) : null}

                    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-sm w-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-saBlueLight mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold mb-2">Waiting for teacher...</h3>
                        <p className="text-slate-400">Get ready for the next question!</p>
                    </div>
                </div>
            )}

            {/* Main Game Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
                <div className="max-w-4xl w-full space-y-8">
                    <Card className="gamified-card p-8 md:p-12 mb-8">
                        <h3 className="text-2xl md:text-4xl font-extrabold leading-tight tracking-tight text-center">
                            {question.content.question}
                        </h3>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                        {question.content.options.map((option: string, index: number) => {
                            const isSelected = selectedAnswer === index;
                            let statusClass = "btn-3d-neutral";
                            if (isSelected) statusClass = "btn-3d-primary ring-4 ring-saBlueLight/30";

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(index)}
                                    disabled={isSubmitted}
                                    className={`btn-3d group min-h-[100px] flex items-center p-6 text-left transition-all duration-300 ${statusClass}`}
                                >
                                    <span className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center mr-4 font-bold text-xl group-hover:bg-black/20 shrink-0">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    <span className="text-xl md:text-2xl font-bold line-clamp-2">{option}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            {!isSubmitted && (
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-black/40 backdrop-blur-md border-t border-white/5 flex justify-center z-30">
                    <button
                        onClick={handleSubmit}
                        disabled={selectedAnswer === null}
                        className={`btn-3d max-w-md w-full py-4 text-2xl font-black uppercase tracking-widest transition-all duration-300 ${selectedAnswer !== null
                            ? 'btn-3d-primary animate-pulse'
                            : 'opacity-50 cursor-not-allowed bg-gray-700'
                            }`}
                    >
                        Submit
                    </button>
                </div>
            )}

        </div>
    );
}
