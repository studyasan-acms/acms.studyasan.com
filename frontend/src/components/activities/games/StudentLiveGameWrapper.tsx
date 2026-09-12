import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Star, Volume2, VolumeX, Gamepad2, Users } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { quizSessionAPI, activityAttemptAPI } from '../../../services/activity.service';
import { useSound } from '../../../hooks/useSound';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';
import HangmanGame from './HangmanGame';
import AbacusGame from './AbacusGame';
import ChessGame from './ChessGame';
import SudokuGame from './SudokuGame';
import CodingIDEGame from './CodingIDEGame';
import CodingLeetcodeGame from './CodingLeetcodeGame';
import type { Activity } from '../../../types/activity';

interface Props {
  joinCode: string;
  onExit: () => void;
  initialSession?: any;
}

export default function StudentLiveGameWrapper({ joinCode, onExit, initialSession }: Props) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [session, setSession] = useState<any>(initialSession || null);
  const [status, setStatus] = useState<'LOBBY' | 'IN_PROGRESS' | 'FINISHED'>('LOBBY');
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [studentName, setStudentName] = useState('');
  const { playSound, stopSound, stopAll } = useSound();

  useEffect(() => {
    joinSession();
    return () => {
      if (socket) socket.disconnect();
      stopAll();
    };
  }, []);

  const joinSession = async () => {
    try {
      let sessionData = session;
      if (!sessionData) {
        const response = await quizSessionAPI.join(joinCode);
        sessionData = response.data.data;
        setSession(sessionData);
      }

      setStatus(sessionData.status || 'LOBBY');

      const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
      const newSocket = io(baseUrl);
      setSocket(newSocket);

      const studentId = localStorage.getItem('student_id') || 0;
      let guestName = '';
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          guestName = user.name || user.email || '';
        }
      } catch (e) {
        console.error('Error parsing user data', e);
      }
      if (!guestName) {
        guestName = `Student ${Math.floor(Math.random() * 1000)}`;
      }
      setStudentName(guestName);

      newSocket.on('connect', () => {
        newSocket.emit('join_session', {
          join_code: joinCode,
          student_id: studentId,
          guest_name: guestName,
        });
      });

      newSocket.on('session_started', () => {
        setStatus('IN_PROGRESS');
      });

      newSocket.on('session_ended', () => {
        setStatus('FINISHED');
        stopAll();
        playSound('game-over');
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      });

      // Start Attempt in background
      try {
        if (sessionData.activity_id) {
          const attemptRes = await activityAttemptAPI.start(sessionData.activity_id, sessionData.id);
          setAttemptId(attemptRes.data.data.id);
        }
      } catch (e) {
        console.warn('Could not initialize activity attempt', e);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to join live session');
      onExit();
    }
  };

  const handleAnswerSubmit = (isCorrect: boolean, scoreAdded: number, currentScore: number) => {
    setScore(currentScore);
    if (socket) {
      const studentId = localStorage.getItem('student_id') || 0;
      socket.emit('student_answer', {
        attempt_id: attemptId,
        score: currentScore,
        student_id: studentId,
        is_correct: isCorrect,
        question_index: 0,
        answer: { scoreAdded, isCorrect },
      });
    }
  };

  const handleGameComplete = async (finalScore: number, timeTaken: number) => {
    setScore(finalScore);
    if (attemptId) {
      try {
        await activityAttemptAPI.complete(attemptId, timeTaken, finalScore);
      } catch (e) {
        console.error('Failed to complete live activity attempt', e);
      }
    }
    if (socket) {
      const studentId = localStorage.getItem('student_id') || 0;
      socket.emit('student_answer', {
        attempt_id: attemptId,
        score: finalScore,
        student_id: studentId,
        is_correct: true,
        question_index: 0,
        answer: { completed: true, finalScore, timeTaken },
      });
    }
    setStatus('FINISHED');
  };

  if (status === 'FINISHED') {
    return (
      <VictoryCelebrationModal
        title="Live Session Complete!"
        activityTitle={session?.activity?.title || 'Live Game'}
        score={score}
        onContinue={onExit}
        continueText="Exit Live Game"
      />
    );
  }

  // 1. LOBBY WAITING SCREEN
  if (status === 'LOBBY') {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-slate-50 text-slate-800 flex flex-col font-sans overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 flex flex-row justify-between items-center gap-3 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0 sticky top-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center shrink-0">
              <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-6 sm:h-7 w-auto object-contain" />
            </div>
            <div className="h-5 sm:h-6 w-px bg-white/25 hidden sm:block" />
            <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>{session?.activity?.title || 'Live Session'}</span>
              <span className="text-[10px] bg-emerald-400/25 text-emerald-200 px-2.5 py-1 rounded-full border border-emerald-400/30 font-bold uppercase tracking-wider animate-pulse">
                Lobby Active
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onExit}
              className="hover:bg-white/10 text-white p-2 rounded-xl transition-colors"
              title="Exit Session"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Center Card */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col items-center justify-start">
          <Card className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg w-full shadow-xl relative overflow-hidden mt-4 sm:mt-10">
            <div className="relative inline-block mb-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto bg-blue-50 text-saBlue rounded-3xl flex items-center justify-center animate-pulse border border-blue-100 shadow-sm">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-saBlue" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
              Waiting for Teacher to Start...
            </h2>

            <div className="space-y-4 mt-4">
              <p className="text-sm text-slate-500 font-medium">
                Welcome, <span className="text-saBlue font-black">{studentName}</span>! Your teacher is getting the game ready. The session will start automatically.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-600">
                  Room Join Code: <span className="text-saBlue font-mono font-black">{joinCode}</span>
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>,
      document.body
    );
  }

  // 2. IN_PROGRESS STATE: Render active game
  const activityData: Activity = session?.activity;
  const gameProps = {
    activity: activityData,
    attemptId,
    onComplete: handleGameComplete,
    onCancel: onExit,
    isLive: true,
    onAnswerSubmit: handleAnswerSubmit,
  };

  switch (activityData?.activity_type) {
    case 'HANGMAN':
      return <HangmanGame {...gameProps} />;
    case 'ABACUS':
      return <AbacusGame {...gameProps} />;
    case 'CHESS':
      return <ChessGame {...gameProps} />;
    case 'SUDOKU':
      return <SudokuGame {...gameProps} />;
    case 'CODING_IDE':
      return <CodingIDEGame {...gameProps} />;
    case 'CODING_LEETCODE':
      return <CodingLeetcodeGame {...gameProps} />;
    default:
      return <HangmanGame {...gameProps} />;
  }
}
