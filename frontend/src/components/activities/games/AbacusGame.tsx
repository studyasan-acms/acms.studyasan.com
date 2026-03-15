import { useEffect, useMemo, useState } from 'react';
import { X, Trophy, Sparkles, Minus, Plus, Star, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import type { Activity } from '../../../types/activity';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { useSound } from '../../../hooks/useSound';

interface Props {
  activity: Activity;
  attemptId: number | null;
  onComplete: (score: number, timeTaken: number) => void;
  onCancel: () => void;
}

function Rod({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-white/10 border border-white/20 min-w-[92px] sm:min-w-[120px]">
      <div className="text-[11px] sm:text-xs font-semibold text-white uppercase tracking-wider">{label}</div>
      <div className="h-32 sm:h-44 w-8 sm:w-10 rounded-full bg-amber-800/80 relative flex items-end justify-center py-1.5 sm:py-2">
        <div className="absolute inset-0 flex flex-col-reverse items-center gap-1 py-2">
          {Array.from({ length: 10 }).map((_, i) => {
            const beadIndex = i + 1;
            const active = beadIndex <= value;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onChange(beadIndex === value ? beadIndex - 1 : beadIndex)}
                className={`h-2.5 sm:h-3.5 w-6 sm:w-8 rounded-full transition-all ${active ? color : 'bg-gray-300'}`}
                aria-label={`${label} bead ${beadIndex}`}
              />
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button size="icon" variant="outline" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => onChange(Math.max(0, value - 1))}>
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <span className="w-5 sm:w-6 text-center text-xs sm:text-sm font-bold text-white">{value}</span>
        <Button size="icon" variant="outline" className="h-6 w-6 sm:h-7 sm:w-7" onClick={() => onChange(Math.min(9, value + 1))}>
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

  const items = activity.items || [];
  const item = items[current];

  const [hundreds, setHundreds] = useState(0);
  const [tens, setTens] = useState(0);
  const [ones, setOnes] = useState(0);

  const representedNumber = useMemo(() => hundreds * 100 + tens * 10 + ones, [hundreds, tens, ones]);

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music', { loop: true, volume: 0.25 });
    } else {
      stopSound('bg-music');
    }

    return () => stopAll();
  }, [isMuted]);

  const resetAbacus = () => {
    if (!isMuted) {
      playSound('click', { volume: 0.35 });
    }
    setHundreds(0);
    setTens(0);
    setOnes(0);
  };

  const handleRodChange = (setter: (v: number) => void, value: number) => {
    setter(value);
    if (!isMuted) {
      playSound('click', { volume: 0.3 });
    }
  };

  const completeGame = (finalScore: number) => {
    setShowCelebration(true);
    stopAll();
    if (!isMuted) {
      playSound('game-over', { volume: 0.45 });
    }

    confetti({
      particleCount: 180,
      spread: 100,
      origin: { y: 0.6 },
    });

    const timeTaken = Math.floor((Date.now() - startedAt) / 1000);
    setTimeout(() => {
      onComplete(finalScore, timeTaken);
    }, 1800);
  };

  const submit = async () => {
    if (!item) return;

    const correctAnswer = Number(item.content?.answer ?? 0);
    const isCorrect = representedNumber === correctAnswer;

    setLastCorrect(isCorrect);
    setShowResult(true);

    if (!isMuted) {
      playSound(isCorrect ? 'correct' : 'incorrect', { volume: 0.45 });
    }

    const earnedPoints = isCorrect ? Number(item.points || 0) : 0;
    const updatedScore = score + earnedPoints;
    if (isCorrect) {
      setScore(updatedScore);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }

    if (attemptId) {
      try {
        await activityAttemptAPI.submitResponse({
          attempt_id: attemptId,
          item_id: item.id,
          response: {
            representedNumber,
            hundreds,
            tens,
            ones,
          },
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
    }, 1000);
  };

  if (!item) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white">
        <Card className="p-8 text-center max-w-lg">
          <Trophy className="w-14 h-14 mx-auto mb-4 text-saVividOrange" />
          <h2 className="text-2xl font-bold mb-2">No Abacus Problems</h2>
          <p className="text-gray-500 mb-4">Add at least one problem in the builder first.</p>
          <Button onClick={onCancel}>Back</Button>
        </Card>
      </div>
    );
  }

  if (showCelebration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a3a] text-white overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-saBlueLight/30 blur-[110px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-saVividOrange/20 blur-[110px] rounded-full animate-pulse" />

        <Card className="gamified-card p-8 sm:p-12 text-center max-w-lg w-[92%] floating">
          <Trophy className="w-20 h-20 sm:w-28 sm:h-28 mx-auto mb-5 sm:mb-7 text-saVividOrange" />
          <h2 className="text-3xl sm:text-5xl font-black mb-3">Abacus Complete!</h2>
          <p className="text-xl sm:text-3xl text-saBlueLight font-bold mb-6">Final Score: {score}</p>
          <div className="flex justify-center gap-3">
            <Star className="w-8 h-8 sm:w-10 sm:h-10 text-saVividOrange fill-current" />
            <Star className="w-8 h-8 sm:w-10 sm:h-10 text-saVividOrange fill-current" />
            <Star className="w-8 h-8 sm:w-10 sm:h-10 text-saVividOrange fill-current" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#061a3a] text-white overflow-auto">
      <div className="fixed top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-saBlueLight/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-saVividOrange/20 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6">
        <div className="gamified-card p-3 sm:p-4 border-white/10">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-saVividOrange truncate">Abacus Lab</h2>
              <p className="text-xs sm:text-sm text-blue-100/70">Problem {current + 1} of {items.length}</p>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="bg-saVividOrange/10 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-saVividOrange border border-saVividOrange/25">
                <p className="text-[10px] sm:text-xs uppercase tracking-wide">Score</p>
                <p className="text-sm sm:text-lg font-extrabold leading-none">{score}</p>
              </div>

              <Button
                variant="ghost"
                onClick={() => setIsMuted((m) => !m)}
                className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-white hover:bg-white/10"
                aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>

              <Button variant="ghost" onClick={onCancel} className="h-9 w-9 sm:h-10 sm:w-10 p-0 text-red-300 hover:bg-red-500/10">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
        </div>

        <Card className="gamified-card p-4 sm:p-6 md:p-8 border-white/10">
          <div className="text-center mb-5 sm:mb-6">
            <p className="text-[11px] sm:text-xs uppercase tracking-widest text-blue-700 font-semibold mb-2">Solve On Abacus</p>
            <h3 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 leading-tight">{item.content?.prompt}</h3>
            {item.content?.hint && (
              <p className="mt-2 text-xs sm:text-sm text-blue-700">Hint: {item.content.hint}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/15 bg-black/20 p-3 sm:p-4 md:p-6">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 min-w-[300px] sm:min-w-0">
                <Rod label="Hundreds" value={hundreds} onChange={(v) => handleRodChange(setHundreds, v)} color="bg-saBlue" />
                <Rod label="Tens" value={tens} onChange={(v) => handleRodChange(setTens, v)} color="bg-saVividOrange" />
                <Rod label="Ones" value={ones} onChange={(v) => handleRodChange(setOnes, v)} color="bg-emerald-500" />
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="text-center sm:text-left">
              <p className="text-[11px] sm:text-xs uppercase tracking-wide text-slate-600">Represented Number</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-saBlueLight">{representedNumber}</p>
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <button onClick={resetAbacus} className="flex-1 sm:flex-none btn-3d btn-3d-neutral">
                Reset
              </button>
              <button className="flex-1 sm:flex-none btn-3d btn-3d-primary flex items-center justify-center gap-2" onClick={submit}>
                <Sparkles className="w-4 h-4 ml-[-4px]" /> Submit
              </button>
            </div>
          </div>
        </Card>
      </div>

      {showResult && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className={`px-5 sm:px-8 py-4 sm:py-6 rounded-2xl text-xl sm:text-3xl font-black shadow-2xl text-center mx-4 ${lastCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {lastCorrect ? 'Correct!' : `Wrong! Answer: ${Number(item.content?.answer ?? 0)}`}
          </div>
        </div>
      )}
    </div>
  );
}
