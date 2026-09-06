import { useEffect, useMemo, useState } from 'react';
import { X, Sparkles, Minus, Plus, Star, Volume2, VolumeX, RotateCcw, HelpCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import type { Activity } from '../../../types/activity';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { useSound } from '../../../hooks/useSound';
import VictoryCelebrationModal from '../common/VictoryCelebrationModal';

interface Props {
  activity: Activity;
  attemptId: number | null;
  onComplete: (score: number, timeTaken: number) => void;
  onCancel: () => void;
}

function Rod({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-xs min-w-[95px] sm:min-w-[130px]">
      <div className="text-[11px] sm:text-xs font-black text-slate-600 uppercase tracking-wider">
        {label}
      </div>

      {/* Abacus Column Frame */}
      <div className="h-36 sm:h-48 w-8 sm:w-10 rounded-full bg-amber-900/20 relative flex items-end justify-center py-2 border border-amber-900/30">
        <div className="absolute inset-y-0 w-1 bg-amber-800/40 rounded-full" />
        <div className="absolute inset-0 flex flex-col-reverse items-center gap-1 py-2 z-10">
          {Array.from({ length: 10 }).map((_, i) => {
            const beadIndex = i + 1;
            const active = beadIndex <= value;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange(beadIndex === value ? beadIndex - 1 : beadIndex)}
                className={`h-2.5 sm:h-3.5 w-6 sm:w-8 rounded-full transition-all shadow-xs ${
                  active ? `${color} scale-105 shadow-sm` : 'bg-slate-300/80 hover:bg-slate-400'
                }`}
                aria-label={`${label} bead ${beadIndex}`}
              />
            );
          })}
        </div>
      </div>

      {/* Stepper Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 rounded-lg border-slate-300"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <span className="w-6 text-center text-sm font-black text-slate-800 font-mono">{value}</span>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7 rounded-lg border-slate-300"
          onClick={() => onChange(Math.min(9, value + 1))}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AbacusGame({ activity, attemptId, onComplete, onCancel }: Props) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [startedAt] = useState(Date.now());
  const [showResult, setShowResult] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const { playSound, stopSound, stopAll } = useSound();

  const items = useMemo(() => activity.items || [], [activity.items]);
  const item = items[current];

  const [hundreds, setHundreds] = useState(0);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);

  const representedNumber = hundreds * 100 + tens * 10 + ones;

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music-zen', { loop: true, volume: 0.15 });
    } else {
      stopSound('bg-music-zen');
    }
    return () => stopAll();
  }, [isMuted]);

  const handleRodChange = (setter: (fn: (v: number) => number) => void, val: number) => {
    setter(() => val);
    playSound('click');
  };

  const resetAbacus = () => {
    setHundreds(0);
    setTens(0);
    setOnes(0);
    playSound('click');
  };

  const completeGame = (finalScore?: number) => {
    if (finalScore !== undefined) setScore(finalScore);
    setShowCelebration(true);
    stopAll();
    playSound('game-over');
  };

  const submit = async () => {
    if (!item) return;

    const correctAnswer = Number(item.content?.correctAnswer ?? item.content?.targetNumber ?? 0);
    const isCorrect = representedNumber === correctAnswer;

    setLastCorrect(isCorrect);
    setShowResult(true);

    if (isCorrect) {
      playSound('correct');
      const earnedPoints = Number(item.points || 10);
      const updatedScore = score + earnedPoints;
      setScore(updatedScore);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.62 } });

      if (attemptId) {
        try {
          await activityAttemptAPI.submitResponse({
            attempt_id: attemptId,
            item_id: item.id,
            response: { representedNumber, hundreds, tens, ones },
            is_correct: isCorrect,
          });
        } catch (err) {
          console.error('Failed to submit abacus response', err);
        }
      }

      setTimeout(() => {
        if (current < items.length - 1) {
          setCurrent((c) => c + 1);
          setHundreds(0);
          setTens(0);
          setOnes(0);
          setShowResult(false);
        } else {
          completeGame(updatedScore);
        }
      }, 1200);
    } else {
      playSound('incorrect');
      if (attemptId) {
        try {
          await activityAttemptAPI.submitResponse({
            attempt_id: attemptId,
            item_id: item.id,
            response: { representedNumber, hundreds, tens, ones },
            is_correct: isCorrect,
          });
        } catch (err) {
          console.error('Failed to submit abacus response', err);
        }
      }

      setTimeout(() => {
        if (current < items.length - 1) {
          setCurrent((c) => c + 1);
          setHundreds(0);
          setTens(0);
          setOnes(0);
          setShowResult(false);
        } else {
          completeGame(score);
        }
      }, 1400);
    }
  };

  if (!item) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-800">
        <Card className="p-8 text-center max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold mb-2">No Abacus Problems</h2>
          <p className="text-xs text-slate-500 mb-6">Add problems in the builder to preview.</p>
          <Button onClick={onCancel} className="w-full">
            Back
          </Button>
        </Card>
      </div>
    );
  }

  if (showCelebration) {
    const timeTaken = Math.floor((Date.now() - startedAt) / 1000);
    return (
      <VictoryCelebrationModal
        title="Abacus Mastered!"
        activityTitle={activity.title || 'Abacus Lab'}
        score={score}
        timeTaken={timeTaken}
        totalQuestions={items.length}
        onContinue={() => onComplete(score, timeTaken)}
        continueText="Finish & Claim Rewards"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-y-auto">
      {/* Background Shapes & Grid */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-22px) rotate(180deg); }
          }
          .animate-float-slow { animation: float-slow 18s ease-in-out infinite; }
        `}</style>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
        <div className="absolute w-12 h-12 rounded-full border-2 border-saBlue/15 animate-float-slow" style={{ top: '15%', left: '8%' }} />
      </div>

      {/* Header */}
      <div className="p-3 sm:p-5 flex flex-col sm:flex-row justify-between items-center gap-3 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white">
        <div className="flex items-center gap-3 sm:gap-4">
          <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-7 sm:h-8 object-contain" />
          <div className="h-5 sm:h-6 w-px bg-white/25 hidden sm:block" />
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            Abacus Lab
            <span className="text-[10px] bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20 font-bold uppercase tracking-wider">
              {current + 1} / {items.length}
            </span>
          </h2>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 sm:p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs sm:text-sm">
            <Star className="w-4 h-4 mr-1.5 text-amber-300 fill-current" />
            <span>{score} EXP</span>
          </div>

          <Button variant="ghost" onClick={onCancel} className="hover:bg-white/10 text-white p-2 rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 max-w-4xl w-full mx-auto flex flex-col justify-center gap-4 sm:gap-6">
        {/* Prompt Card */}
        <Card className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-saBlue mb-1 block">
            Represent On Abacus
          </span>
          <h3 className="text-2xl sm:text-4xl font-black text-slate-800 leading-tight">
            {item.content?.prompt}
          </h3>
          {item.content?.hint && (
            <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">
              Hint: {item.content.hint}
            </p>
          )}
        </Card>

        {/* Abacus Interactive Board */}
        <Card className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-8 shadow-md">
          <div className="flex justify-center items-center gap-3 sm:gap-6 overflow-x-auto py-2">
            <Rod
              label="Hundreds"
              value={hundreds}
              onChange={(v) => handleRodChange(setHundreds, v)}
              color="bg-saBlue"
            />
            <Rod
              label="Tens"
              value={tens}
              onChange={(v) => handleRodChange(setTens, v)}
              color="bg-amber-500"
            />
            <Rod
              label="Ones"
              value={ones}
              onChange={(v) => handleRodChange(setOnes, v)}
              color="bg-emerald-500"
            />
          </div>

          {/* Current Value Display & Controls */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Current Abacus Value
              </span>
              <span className="text-3xl sm:text-4xl font-black text-saBlue font-mono">
                {representedNumber}
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={resetAbacus}
                className="flex-1 sm:flex-none border-slate-200 text-slate-600 hover:bg-slate-50 font-bold gap-1.5 rounded-xl h-11"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </Button>
              <Button
                onClick={submit}
                className="flex-1 sm:flex-none bg-saBlue hover:bg-saBlueDarkHover text-white font-black uppercase tracking-wider gap-2 rounded-xl h-11 px-6 shadow-md shadow-blue-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Confirm</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Floating Feedback Result */}
      {showResult && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/35 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div
            className={`text-5xl sm:text-7xl font-black uppercase tracking-wider animate-bounce drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)] ${
              lastCorrect ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {lastCorrect ? 'Awesome!' : 'Try Again!'}
          </div>
        </div>
      )}
    </div>
  );
}
