import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { X, CheckCircle, XCircle } from 'lucide-react';
import TrueFalseGame from './TrueFalseGame';
import { activityAttemptAPI, quizSessionAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';

interface Props {
    joinCode: string;
    initialSession?: any; // The session object from the join response
    onExit: () => void;
}

export default function StudentLiveTrueFalse({ joinCode, initialSession, onExit }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [session, setSession] = useState<any>(initialSession || null);
    const [activity, setActivity] = useState<any>(null);
    const [status, setStatus] = useState<'CONNECTING' | 'WAITING' | 'PLAYING' | 'FINISHED'>('CONNECTING');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
    const [attemptId, setAttemptId] = useState<number>(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [showResult, setShowResult] = useState(false);

    // Load user from local storage
    const [studentId, setStudentId] = useState<number>(0);
    const [studentName, setStudentName] = useState<string>("");

    const { playSound, stopSound, stopAll } = useSound();

    useEffect(() => {
        // Load student info
        // Try to get student_id from specific key, or fallback to user object
        let sid = parseInt(localStorage.getItem('student_id') || '0');

        if (!sid) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    // Check for common id fields
                    sid = user.student_id || user.id || 0;
                    // If user is stored as { user: { ... } } structure
                    if (!sid && user.user?.id) sid = user.user.id;
                } catch (e) { console.error(e); }
            }
        }
        setStudentId(sid);

        let name = '';
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                name = user.name || user.email || `Guest ${Math.floor(Math.random() * 1000)}`;
            }
        } catch {
            name = `Guest ${Math.floor(Math.random() * 1000)}`;
        }
        setStudentName(name);
    }, []);

    useEffect(() => {
        if (!joinCode) return; // Wait for joinCode

        const initGame = async () => {
            try {
                let currentSession = initialSession || session;
                if (!currentSession) {
                    const res = await quizSessionAPI.join(joinCode);
                    currentSession = res.data.data;
                    setSession(currentSession);
                    if (currentSession.activity) {
                        setActivity(currentSession.activity);
                    }
                } else if (initialSession && !session) {
                    setSession(initialSession);
                    if (initialSession.activity) {
                        setActivity(initialSession.activity);
                    }
                }

                // Start attempt
                // Pass quiz_session_id to link
                const res = await activityAttemptAPI.start(currentSession.activity_id, currentSession.id);
                setAttemptId(res.data.data.id);

                connectSocket(studentId, studentName);
            } catch (e: any) {
                console.error(e);
                toast.error(e.response?.data?.message || "Failed to join game");
                onExit();
            }
        };

        if (studentName) { // Wait for name to be set
            initGame();
        }

        return () => {
            socket?.disconnect();
        };
    }, [joinCode, studentName, initialSession]);

    useEffect(() => {
        if (session?.activity_id && !activity) {
            // Fetch the full activity data
            fetchActivity();
        }
    }, [session, activity]);

    const fetchActivity = async () => {
        try {
            // If session has activity data with items, use it
            if (session.activity && session.activity.items) {
                setActivity(session.activity);
            } else {
                // TODO: Implement activity fetch API if needed
                console.log('Activity not available in session, need to fetch separately');
            }
        } catch (error) {
            console.error('Failed to fetch activity:', error);
        }
    };

    const connectSocket = (sId: number, sName: string) => {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace('/api', '');
        console.log('Connecting to socket at:', baseUrl);
        const newSocket = io(baseUrl);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to socket with ID:', newSocket.id);
            console.log('Emitting join_session with:', { join_code: joinCode, student_id: sId, guest_name: sName });
            newSocket.emit('join_session', {
                join_code: joinCode,
                student_id: sId,
                guest_name: sName
            });
            setStatus('WAITING');
        });

        newSocket.on('error', (err) => {
            console.error('Socket error:', err);
            toast.error('Connection error');
        });

        newSocket.on('next_question', ({ index }: { index: number }) => {
            console.log('Received next_question:', index);
            console.log('Session activity:', session?.activity);
            setCurrentQuestionIndex(index);
            setStatus('PLAYING');
            resetForNextQuestion();
        });

        newSocket.on('session_started', (updatedSession: any) => {
            console.log('Session started:', updatedSession);
            setSession(updatedSession);
            if (updatedSession.activity) {
                setActivity(updatedSession.activity);
            }
            setCurrentQuestionIndex(updatedSession.current_question_index);
            setStatus('PLAYING');
            resetForNextQuestion();
        });

        newSocket.on('session_updated', (updatedSession: any) => {
            console.log('Session updated:', updatedSession);
            setSession(updatedSession);
            if (updatedSession.activity) {
                setActivity(updatedSession.activity);
            }
            if (updatedSession.status === 'IN_PROGRESS' && updatedSession.current_question_index >= 0) {
                setCurrentQuestionIndex(updatedSession.current_question_index);
                setStatus('PLAYING');
                resetForNextQuestion();
            }
        });

        newSocket.on('session_ended', () => {
            setStatus('FINISHED');
        });
    };

    const resetForNextQuestion = () => {
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setIsCorrect(false);
        setShowResult(false);
    };

    const handleAnswerSubmit = async (answer: boolean, timeTaken: number) => {
        if (!socket || !attemptId) {
            console.error('Socket or AttemptId missing, cannot emit student_answer');
            return;
        }

        const question = session?.activity?.items?.[currentQuestionIndex];
        const correct = answer === question?.content?.correctAnswer;

        setSelectedAnswer(answer);
        setIsCorrect(correct);
        setShowResult(true);
        setIsSubmitted(true);

        // Play sound effect
        if (correct) {
            playSound('correct');
        } else {
            playSound('incorrect');
        }

        // Calculate score
        const points = correct ? (question?.points || 10) : 0;
        setScore(prev => prev + points);

        console.log('Emitting student_answer:', {
            attempt_id: attemptId,
            question_index: currentQuestionIndex,
            answer,
            is_correct: correct,
            time_taken: timeTaken,
            score_add: points
        });

        socket.emit('student_answer', {
            attempt_id: attemptId,
            question_index: currentQuestionIndex,
            answer,
            is_correct: correct,
            time_taken: timeTaken,
            score_add: points
        });

        // Auto advance after showing result
        setTimeout(() => {
            setStatus('WAITING');
        }, 2000);
    };

    if (status === 'CONNECTING' || status === 'WAITING') {
        return (
            <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full -z-10">
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
                </div>

                {/* Header */}
                <div className="p-6 flex justify-end bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
                    <Button variant="ghost" onClick={onExit} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
                        <X className="w-8 h-8" />
                    </Button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center p-8">
                    <Card className="gamified-card p-12 text-center max-w-lg w-full mx-4 floating">
                        <div className="relative inline-block mb-8">
                            <div className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400"></div>
                            </div>
                            <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full -z-10" />
                        </div>
                        <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tight">
                            {status === 'CONNECTING' ? 'Connecting to Session...' : 'Waiting for Next Question...'}
                        </h2>
                        {status === 'WAITING' && (
                            <div className="space-y-4">
                                <p className="text-blue-100/60 text-lg italic">
                                    Welcome, <span className="text-blue-400 font-bold">{studentName}</span>!
                                </p>
                                <p className="text-slate-400 text-sm">
                                    The teacher controls when questions are revealed.
                                </p>
                                <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                                    <p className="text-yellow-400 font-semibold">Current Score: {score}</p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        );
    }

    if (status === 'FINISHED') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a] text-white overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full -z-10">
                    <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
                </div>

                <Card className="gamified-card p-12 text-center max-w-lg w-full mx-4 floating relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10" />
                    <div className="absolute top-4 right-4 z-20">
                        <Button variant="ghost" onClick={onExit} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                    <div className="relative inline-block mb-8">
                        <div className="w-24 h-24 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
                            <div className="text-4xl">🏆</div>
                        </div>
                        <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full -z-10" />
                    </div>
                    <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tight relative z-10">Session Ended</h2>
                    <div className="space-y-4 mb-8 relative z-10">
                        <p className="text-3xl font-bold text-blue-300">Final Score: {score}</p>
                        <p className="text-blue-100/60 text-lg italic">
                            "Great work! You've completed the live True/False session."
                        </p>
                    </div>
                    <Button onClick={onExit} className="btn-3d-primary w-full py-4 text-xl font-bold relative z-10">
                        Exit Game
                    </Button>
                </Card>
            </div>
        );
    }

    if (activity && currentQuestionIndex >= 0) {
        // Create a modified activity with all questions
        console.log('Activity:', activity);
        console.log('Current question index:', currentQuestionIndex);
        console.log('Activity items:', activity.items);

        const currentActivity = {
            id: session.activity_id,
            group_id: session.activity?.group_id || 0,
            title: `Live True/False Quiz`,
            activity_type: 'TRUE_FALSE' as const,
            description: '',
            points: 10,
            difficulty: 'EASY' as const,
            estimated_time: 30,
            is_published: true,
            created_by: session.activity?.created_by || 0,
            created_at: session.activity?.created_at || new Date().toISOString(),
            updated_at: session.activity?.updated_at || new Date().toISOString(),
            items: activity.items || []
        };

        console.log('Current activity:', currentActivity);

        return (
            <TrueFalseGame
                activity={currentActivity}
                attemptId={attemptId}
                onComplete={(finalScore, timeTaken) => {
                    // This won't be called in live mode, but we need to handle it
                    console.log('Question completed:', finalScore, timeTaken);
                }}
                onCancel={onExit}
                isLive={true}
                currentQuestionIndex={currentQuestionIndex}
                onAnswerSubmit={(answer, timeTaken) => {
                    console.log('Answer submitted:', answer, timeTaken);
                    handleAnswerSubmit(answer, timeTaken);
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <div className="p-6 flex justify-end bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
                <Button variant="ghost" onClick={onExit} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
                    <X className="w-8 h-8" />
                </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-8">
                <Card className="gamified-card p-12 text-center max-w-lg w-full mx-4 floating">
                    <div className="relative inline-block mb-8">
                        <div className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400"></div>
                        </div>
                        <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full -z-10" />
                    </div>
                    <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tight">
                        Loading Game Data...
                    </h2>
                    <p className="text-blue-100/60 text-lg italic">
                        "Preparing your True/False challenge..."
                    </p>
                </Card>
            </div>
        </div>
    );
}