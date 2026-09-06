import { useState, useEffect } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Clock, Star, Volume2, VolumeX, Heart, Lightbulb, HelpCircle } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';

interface Props {
  activity: Activity;
  attemptId: number | null;
  onComplete: (score: number, timeTaken: number) => void;
  onCancel: () => void;
}

interface HangmanContent {
  word: string;
  hint?: string;
}

export default function HangmanGame({ activity, attemptId, onComplete, onCancel }: Props) {
  const [word, setWord] = useState('');
  const [hint, setHint] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [startTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentItem, setCurrentItem] = useState(0);
  const maxWrongGuesses = 6;

  const { playSound, stopSound, stopAll } = useSound();

  useEffect(() => {
    const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music-playful', { loop: true, volume: 0.15 });
    } else {
      stopSound('bg-music-playful');
    }
    return () => stopAll();
  }, [isMuted]);

  useEffect(() => {
    if (activity.items && activity.items.length > 0 && activity.items[currentItem]) {
      const content = activity.items[currentItem].content as HangmanContent;
      setWord(content.word.toUpperCase());
      setHint(content.hint || '');
      setGuessedLetters(new Set());
      setWrongGuesses(0);
    }
  }, [activity, currentItem]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const handleLetterClick = (letter: string) => {
    if (guessedLetters.has(letter) || wrongGuesses >= maxWrongGuesses) return;

    const newGuessedLetters = new Set(guessedLetters);
    newGuessedLetters.add(letter);
    setGuessedLetters(newGuessedLetters);

    if (word.includes(letter)) {
      playSound('correct');
      // Check if won this word
      const isWordComplete = word
        .split('')
        .every((char) => char === ' ' || newGuessedLetters.has(char));

      if (isWordComplete) {
        const itemPoints = Number(activity.items?.[currentItem]?.points || 10);
        const newScore = score + itemPoints;
        setScore(newScore);
        submitResponse(word, true);

        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.62 },
        });

        setTimeout(() => {
          if (activity.items && currentItem < activity.items.length - 1) {
            setCurrentItem((prev) => prev + 1);
          } else {
            handleComplete(newScore);
          }
        }, 1200);
      }
    } else {
      playSound('incorrect');
      const newWrong = wrongGuesses + 1;
      setWrongGuesses(newWrong);

      if (newWrong >= maxWrongGuesses) {
        submitResponse(word, false);
        setTimeout(() => {
          if (activity.items && currentItem < activity.items.length - 1) {
            setCurrentItem((prev) => prev + 1);
          } else {
            handleComplete(score);
          }
        }, 1400);
      }
    }
  };

  const submitResponse = async (guessedWord: string, isCorrect: boolean) => {
    if (!attemptId || !activity.items || !activity.items[currentItem]) return;
    try {
      await activityAttemptAPI.submitResponse({
        attempt_id: attemptId,
        item_id: activity.items[currentItem].id,
        response: { guessedWord, wrongGuesses },
        is_correct: isCorrect,
      });
    } catch (error) {
      console.error('Failed to submit hangman response:', error);
    }
  };

  const handleComplete = (finalScore?: number) => {
    if (finalScore !== undefined) setScore(finalScore);
    setShowCelebration(true);
    stopAll();
    playSound('game-over');
  };

  const renderHangman = () => {
    return (
      <svg viewBox="0 0 200 210" className="w-full h-full max-h-[190px] md:max-h-[220px] mx-auto">
        {/* Gallows Pole & Beam */}
        <line x1="24" y1="190" x2="176" y2="190" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
        <line x1="50" y1="190" x2="50" y2="25" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
        <line x1="50" y1="25" x2="135" y2="25" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />
        <line x1="50" y1="65" x2="90" y2="25" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        <line x1="135" y1="25" x2="135" y2="48" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 3" />

        {/* Person Parts (Friendly Blue Scholar Character) */}
        {/* Head */}
        <circle
          cx="135"
          cy="68"
          r="19"
          stroke="#2563EB"
          strokeWidth="3.5"
          fill="#DBEAFE"
          className={`transition-opacity duration-300 ${wrongGuesses >= 1 ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Eyes on Head */}
        {wrongGuesses >= 1 && (
          <>
            <circle cx="129" cy="66" r="2" fill="#1E3A8A" />
            <circle cx="141" cy="66" r="2" fill="#1E3A8A" />
            <path d="M131 74 Q135 77 139 74" stroke="#1E3A8A" strokeWidth="1.5" fill="none" />
          </>
        )}
        {/* Body */}
        <line
          x1="135"
          y1="87"
          x2="135"
          y2="135"
          stroke="#2563EB"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={`transition-opacity duration-300 ${wrongGuesses >= 2 ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Left Arm */}
        <line
          x1="135"
          y1="98"
          x2="110"
          y2="118"
          stroke="#2563EB"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={`transition-opacity duration-300 ${wrongGuesses >= 3 ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Right Arm */}
        <line
          x1="135"
          y1="98"
          x2="160"
          y2="118"
          stroke="#2563EB"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={`transition-opacity duration-300 ${wrongGuesses >= 4 ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Left Leg */}
        <line
          x1="135"
          y1="135"
          x2="114"
          y2="168"
          stroke="#2563EB"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={`transition-opacity duration-300 ${wrongGuesses >= 5 ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Right Leg */}
        <line
          x1="135"
          y1="135"
          x2="156"
          y2="168"
          stroke="#2563EB"
          strokeWidth="3.5"
          strokeLinecap="round"
          className={`transition-opacity duration-300 ${wrongGuesses >= 6 ? 'opacity-100' : 'opacity-0'}`}
        />
      </svg>
    );
  };

  const renderWord = () => {
    return word.split('').map((char, index) => {
      if (char === ' ') {
        return <div key={index} className="w-3 sm:w-5" />;
      }
      const isRevealed = guessedLetters.has(char);
      return (
        <div
          key={index}
          className={`w-9 h-12 sm:w-13 sm:h-16 rounded-xl border-2 flex items-center justify-center text-xl sm:text-3xl font-black transition-all ${
            isRevealed
              ? 'bg-blue-50 border-saBlue text-saBlue shadow-xs scale-105'
              : 'bg-white border-slate-200 text-transparent shadow-xs'
          }`}
        >
          {isRevealed ? char : ''}
        </div>
      );
    });
  };

  if (showCelebration) {
    return (
      <VictoryCelebrationModal
        title={wrongGuesses >= maxWrongGuesses ? 'Game Over!' : 'Word Master!'}
        activityTitle={activity.title || 'Hangman Word Challenge'}
        score={Math.round(score)}
        timeTaken={timeElapsed}
        totalQuestions={activity.items?.length || 1}
        onContinue={() => onComplete(score, timeElapsed)}
        continueText="Finish & Claim Rewards"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
      {/* Background Shapes & Grid */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-22px) rotate(180deg); }
          }
          @keyframes float-fast {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-16px) rotate(120deg) scale(0.94); }
          }
          .animate-float-slow { animation: float-slow 18s ease-in-out infinite; }
          .animate-float-fast { animation: float-fast 14s ease-in-out infinite; }
        `}</style>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
        <div className="absolute w-12 h-12 rounded-full border-2 border-saBlue/15 animate-float-slow" style={{ top: '15%', left: '8%' }} />
        <div className="absolute w-10 h-10 border-2 border-blue-400/20 rounded-lg animate-float-fast" style={{ top: '12%', right: '12%' }} />
      </div>

      {/* Header */}
      <div className="p-3 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-3 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white">
        <div className="flex items-center gap-3 sm:gap-4">
          <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-7 sm:h-8 object-contain" />
          <div className="h-5 sm:h-6 w-px bg-white/25 hidden sm:block" />
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            Hangman
            {activity.items && activity.items.length > 1 && (
              <span className="text-[10px] bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20 font-bold uppercase tracking-wider">
                Word {currentItem + 1} / {activity.items.length}
              </span>
            )}
          </h2>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 sm:p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Remaining Lives */}
          <div className="flex items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs sm:text-sm">
            <Heart className="w-4 h-4 mr-1.5 text-red-300 fill-current" />
            <span>{maxWrongGuesses - wrongGuesses} Lives</span>
          </div>

          {/* EXP */}
          <div className="flex items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs sm:text-sm">
            <Star className="w-4 h-4 mr-1.5 text-amber-300 fill-current" />
            <span>{Math.round(score)} EXP</span>
          </div>

          {/* Timer */}
          <div className="flex items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs sm:text-sm font-mono">
            <Clock className="w-4 h-4 mr-1.5" />
            <span>{timeElapsed}s</span>
          </div>

          {/* Exit */}
          <Button variant="ghost" onClick={onCancel} className="hover:bg-white/10 text-white p-2 rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row p-4 sm:p-6 gap-4 sm:gap-6 relative z-10 w-full max-w-6xl mx-auto overflow-y-auto">
        {/* Left Column: Gallows & Instructions */}
        <div className="flex flex-col gap-4 shrink-0 md:w-80 lg:w-96">
          <Card className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex items-center justify-center shadow-xs min-h-[220px]">
            {renderHangman()}
          </Card>

          <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-black text-saBlue uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How To Play</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Select letters from the keyboard below to uncover the hidden word. Each incorrect guess costs 1 life.
            </p>
            {hint && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">Hint</span>
                  <span className="text-xs font-semibold text-amber-900">{hint}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Word Blanks & Interactive Keyboard */}
        <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-w-0">
          {/* Word Blanks Display */}
          <Card className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 flex items-center justify-center shadow-xs min-h-[140px]">
            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
              {renderWord()}
            </div>
          </Card>

          {/* Letter Keyboard Grid */}
          <Card className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex-1 shadow-xs flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center mb-3">
              Select A Letter
            </span>
            <div className="grid grid-cols-7 sm:grid-cols-9 gap-1.5 sm:gap-2.5 max-w-2xl mx-auto w-full">
              {alphabet.map((letter) => {
                const isGuessed = guessedLetters.has(letter);
                const isCorrect = isGuessed && word.includes(letter);
                const isWrong = isGuessed && !word.includes(letter);

                let btnStyle =
                  'bg-white border-slate-200 text-slate-700 hover:border-saBlue hover:bg-blue-50 hover:text-saBlue hover:scale-105 shadow-xs font-bold';

                if (isCorrect) {
                  btnStyle = 'bg-emerald-50 border-emerald-300 text-emerald-700 font-black cursor-not-allowed';
                } else if (isWrong) {
                  btnStyle = 'bg-slate-100 border-slate-200 text-slate-400 line-through opacity-50 cursor-not-allowed';
                }

                return (
                  <button
                    key={letter}
                    onClick={() => handleLetterClick(letter)}
                    disabled={isGuessed || wrongGuesses >= maxWrongGuesses}
                    className={`aspect-square flex items-center justify-center rounded-xl border text-sm sm:text-base transition-all duration-150 ${btnStyle}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
