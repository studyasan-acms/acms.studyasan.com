import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { X } from 'lucide-react';
import WordSearchGame from './WordSearchGame';
import { activityAttemptAPI, quizSessionAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';

interface Props {
    joinCode: string;
    initialSession?: any; // The session object from the join response
    onExit: () => void;
}

export default function StudentLiveWordSearch({ joinCode, initialSession, onExit }: Props) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [session, setSession] = useState<any>(initialSession || null);
    const [status, setStatus] = useState<'CONNECTING' | 'WAITING' | 'PLAYING' | 'FINISHED'>('CONNECTING');
    const [targetWord, setTargetWord] = useState<string>("");
    const [attemptId, setAttemptId] = useState<number>(0);
    const [score, setScore] = useState(0);

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
                let currentSession = session;
                if (!currentSession) {
                    const res = await quizSessionAPI.join(joinCode);
                    currentSession = res.data.data;
                    setSession(currentSession);
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
    }, [joinCode, studentName]);

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

        newSocket.on('current_word_update', ({ word }: { word: string }) => {
            console.log('Received current_word_update:', word);
            setTargetWord(word);
            setStatus('PLAYING');
            toast.info(`New mission: Find ${word}!`);
        });

        newSocket.on('session_ended', () => {
            setStatus('FINISHED');
        });
    };

    const handleWordFound = (word: string, timeTaken: number) => {
        console.log('handleWordFound called:', word, 'AttemptId:', attemptId, 'Socket:', !!socket);
        if (!socket || !attemptId) {
            console.error('Socket or AttemptId missing, cannot emit student_found_word');
            return;
        }

        // Calculate score based on speed or just fixed
        const points = 100;
        setScore(prev => prev + points);

        // Play correct sound
        playSound('correct');

        console.log('Emitting student_found_word:', { attempt_id: attemptId });
        socket.emit('student_found_word', {
            attempt_id: attemptId,
            word: word,
            time_taken: timeTaken,
            score_add: points
        });
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
                            {status === 'CONNECTING' ? 'Connecting to Session...' : 'Waiting for Teacher...'}
                        </h2>
                        {status === 'WAITING' && (
                            <div className="space-y-4">
                                <p className="text-blue-100/60 text-lg italic">
                                    Welcome, <span className="text-blue-400 font-bold">{studentName}</span>!
                                </p>
                                <p className="text-slate-400 text-sm">
                                    The teacher controls which words you need to find.
                                </p>
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
                            "Great work! You've completed the live session."
                        </p>
                    </div>
                    <Button onClick={onExit} className="btn-3d-primary w-full py-4 text-xl font-bold relative z-10">
                        Exit Game
                    </Button>
                </Card>
            </div>
        );
    }

    if (session && session.activity) {
        return (
            <WordSearchGame
                activity={session.activity}
                attemptId={attemptId}
                onComplete={() => { }}
                onCancel={onExit}
                isLive={true}
                targetWord={targetWord}
                onWordFound={handleWordFound}
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
                        "Preparing your word search adventure..."
                    </p>
                </Card>
            </div>
        </div>
    );
}
