import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { X } from 'lucide-react';
import WordSearchGame from './WordSearchGame';
import { activityAttemptAPI, quizSessionAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';

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
        const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
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
            <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 -z-10" />
                <div className="p-4 sm:p-5 flex justify-between items-center bg-saBlue text-white border-b border-saBlue/80 z-20 shadow-xs">
                    <div className="flex items-center gap-3">
                        <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-7 sm:h-8 object-contain" />
                        <div className="h-5 sm:h-6 w-px bg-white/25" />
                        <h2 className="text-base sm:text-lg font-black uppercase tracking-wider">
                            Live Word Search
                        </h2>
                    </div>
                    <Button variant="ghost" onClick={onExit} className="hover:bg-white/10 text-white p-2 rounded-xl">
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <Card className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full shadow-xl relative overflow-hidden">
                        <div className="w-20 h-20 mx-auto mb-6 bg-blue-50 text-saBlue rounded-3xl flex items-center justify-center animate-pulse border border-blue-100 shadow-sm">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-saBlue"></div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
                            {status === 'CONNECTING' ? 'Connecting to Room...' : 'Waiting for Teacher...'}
                        </h2>
                        {status === 'WAITING' && (
                            <div className="space-y-3 mt-4">
                                <p className="text-sm text-slate-500 font-medium">
                                    Welcome, <span className="text-saBlue font-black">{studentName}</span>! The teacher will reveal the target word shortly.
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
            <VictoryCelebrationModal
                title="Live Challenge Ended!"
                activityTitle="Live Word Search"
                score={score}
                onContinue={onExit}
                continueText="Exit Session"
            />
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
        <div className="fixed inset-0 z-50 bg-[#061a3a] text-white flex flex-col font-sans overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-saVividOrange/25 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-saBlue/40 blur-[100px] rounded-full" />
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
                        <div className="w-24 h-24 mx-auto bg-saBlueLight/20 rounded-full flex items-center justify-center animate-pulse">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-saBlueLight"></div>
                        </div>
                        <div className="absolute inset-0 bg-saBlueLight/20 blur-2xl rounded-full -z-10" />
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
