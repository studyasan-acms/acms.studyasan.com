import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { X, Clock, Star, Users } from 'lucide-react';
import TrueFalseGame from './TrueFalseGame';
import { activityAttemptAPI, quizSessionAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';

interface Props {
  joinCode: string;
  initialSession?: any;
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

  // Load user from local storage
  const [studentId, setStudentId] = useState<number>(0);
  const [studentName, setStudentName] = useState<string>('');

  const { playSound, stopSound, stopAll } = useSound();

  useEffect(() => {
    let sid = parseInt(localStorage.getItem('student_id') || '0');

    if (!sid) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          sid = user.student_id || user.id || 0;
          if (!sid && user.user?.id) sid = user.user.id;
        } catch (e) {
          console.error(e);
        }
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
    if (!joinCode) return;

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

        const res = await activityAttemptAPI.start(currentSession.activity_id, currentSession.id);
        setAttemptId(res.data.data.id);

        connectSocket(studentId, studentName);
      } catch (e: any) {
        console.error(e);
        toast.error(e.response?.data?.message || 'Failed to join game');
        onExit();
      }
    };

    if (studentName) {
      initGame();
    }

    return () => {
      socket?.disconnect();
      stopAll();
    };
  }, [joinCode, studentName, initialSession]);

  useEffect(() => {
    if (session?.activity_id && !activity) {
      if (session.activity && session.activity.items) {
        setActivity(session.activity);
      }
    }
  }, [session, activity]);

  const connectSocket = (sId: number, sName: string) => {
    const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
    const newSocket = io(baseUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_session', {
        join_code: joinCode,
        student_id: sId,
        guest_name: sName,
      });
      setStatus('WAITING');
    });

    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
      toast.error('Connection error');
    });

    newSocket.on('next_question', ({ index }: { index: number }) => {
      setCurrentQuestionIndex(index);
      setStatus('PLAYING');
    });

    newSocket.on('session_started', (updatedSession: any) => {
      setSession(updatedSession);
      if (updatedSession.activity) {
        setActivity(updatedSession.activity);
      }
      setCurrentQuestionIndex(updatedSession.current_question_index);
      setStatus('PLAYING');
    });

    newSocket.on('session_updated', (updatedSession: any) => {
      setSession(updatedSession);
      if (updatedSession.activity) {
        setActivity(updatedSession.activity);
      }
      if (updatedSession.status === 'IN_PROGRESS' && updatedSession.current_question_index >= 0) {
        setCurrentQuestionIndex(updatedSession.current_question_index);
        setStatus('PLAYING');
      }
    });

    newSocket.on('session_ended', () => {
      playSound('game-over');
      setStatus('FINISHED');
    });
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

  const handleAnswerSubmit = async (answer: boolean, timeTaken: number) => {
    if (!socket || !attemptId) {
      console.error('Socket or AttemptId missing, cannot emit student_answer');
      return;
    }

    const question = session?.activity?.items?.[currentQuestionIndex];
    let content = question?.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse question content', e);
      }
    }
    const expected = normalizeBoolean(content?.correctAnswer);
    const correct = answer === expected;
    const points = correct ? question?.points || 10 : 0;
    setScore((prev) => prev + points);

    socket.emit('student_answer', {
      attempt_id: attemptId,
      student_id: studentId,
      question_index: currentQuestionIndex,
      answer,
      is_correct: correct,
      time_taken: timeTaken,
      score: points,
      score_add: points,
    });
  };

  if (status === 'CONNECTING' || status === 'WAITING') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
        {/* Soft Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 -z-10" />
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px] -z-10" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px] -z-10" />

        {/* Header */}
        <div className="p-4 sm:p-5 flex justify-between items-center bg-saBlue text-white border-b border-saBlue/80 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-7 sm:h-8 object-contain" />
            <div className="h-5 sm:h-6 w-px bg-white/25" />
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider">
              Live True / False
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs sm:text-sm">
              <Star className="w-4 h-4 mr-1.5 text-amber-300 fill-current" />
              <span>{score} EXP</span>
            </div>
            <Button
              variant="ghost"
              onClick={onExit}
              className="hover:bg-white/10 text-white p-2 rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start">
          <Card className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full shadow-xl relative overflow-hidden mt-4 sm:mt-10">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-blue-50 text-saBlue rounded-3xl flex items-center justify-center animate-pulse border border-blue-100 shadow-sm">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
              {status === 'CONNECTING' ? 'Connecting to Room...' : 'Waiting for Next Question...'}
            </h2>
            {status === 'WAITING' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 font-medium">
                  Welcome, <span className="text-saBlue font-black">{studentName}</span>! Your teacher will reveal the next question shortly.
                </p>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">Session Join Code: <span className="text-saBlue font-mono font-black">{joinCode}</span></span>
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
      <VictoryCelebrationModal
        title="Live Session Complete!"
        activityTitle="Live True / False"
        score={score}
        onContinue={onExit}
        continueText="Exit Live Quiz"
      />
    );
  }

  if (activity && currentQuestionIndex >= 0) {
    const currentActivity = {
      id: session.activity_id,
      group_id: session.activity?.group_id || 0,
      title: session.activity?.title || `Live True/False Quiz`,
      activity_type: 'TRUE_FALSE' as const,
      description: '',
      points: 10,
      difficulty: 'EASY' as const,
      estimated_time: 30,
      is_published: true,
      created_by: session.activity?.created_by || 0,
      created_at: session.activity?.created_at || new Date().toISOString(),
      updated_at: session.activity?.updated_at || new Date().toISOString(),
      items: activity.items || [],
    };

    return (
      <TrueFalseGame
        activity={currentActivity}
        attemptId={attemptId}
        onComplete={async (finalScore, timeTaken) => {
          if (attemptId) {
            try {
              await activityAttemptAPI.complete(attemptId, timeTaken, finalScore);
            } catch (e) {
              console.error('Failed to complete True/False attempt', e);
            }
          }
          setStatus('FINISHED');
        }}
        onCancel={onExit}
        isLive={true}
        currentQuestionIndex={currentQuestionIndex}
        onAnswerSubmit={(answer, timeTaken) => {
          handleAnswerSubmit(answer, timeTaken);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6">
      <Card className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-md w-full shadow-lg">
        <Clock className="w-12 h-12 text-saBlue animate-spin mx-auto mb-4" />
        <h3 className="text-xl font-black text-slate-800 mb-2">Loading Game Data...</h3>
        <p className="text-xs text-slate-500 mb-6">Preparing your live True/False challenge.</p>
        <Button onClick={onExit} variant="outline" className="w-full">
          Cancel
        </Button>
      </Card>
    </div>
  );
}