import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Sparkles,
  Minus,
  Plus,
  Star,
  Volume2,
  VolumeX,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  Lightbulb,
  Info,
} from 'lucide-react';
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

interface RodConfig {
  placeIndex: number;
  label: string;
  shortLabel: string;
  multiplier: number;
  hasUnitDot: boolean;
  badgeClass: string;
}

const ROD_CONFIGS: RodConfig[] = [
  {
    placeIndex: 4,
    label: 'Ten Thousands',
    shortLabel: '10K',
    multiplier: 10000,
    hasUnitDot: false,
    badgeClass: 'bg-saBlueSubtle text-saBlue border-saBlue/30',
  },
  {
    placeIndex: 3,
    label: 'Thousands',
    shortLabel: '1K',
    multiplier: 1000,
    hasUnitDot: true, // Unit dot on Thousands
    badgeClass: 'bg-saOrangeSubtle text-saVividOrange border-saVividOrange/30',
  },
  {
    placeIndex: 2,
    label: 'Hundreds',
    shortLabel: '100',
    multiplier: 100,
    hasUnitDot: false,
    badgeClass: 'bg-saBlueSubtle text-saBlue border-saBlue/30',
  },
  {
    placeIndex: 1,
    label: 'Tens',
    shortLabel: '10',
    multiplier: 10,
    hasUnitDot: false,
    badgeClass: 'bg-saOrangeSubtle text-saVividOrange border-saVividOrange/30',
  },
  {
    placeIndex: 0,
    label: 'Ones',
    shortLabel: '1',
    multiplier: 1,
    hasUnitDot: true, // Unit dot on Ones
    badgeClass: 'bg-saBlueSubtle text-saBlue border-saBlue/30',
  },
];

// Soroban Rod Component representing 1 place value column (1 upper bead [value 5], 4 lower beads [value 1 each])
function SorobanRod({
  config,
  value,
  onChange,
  onPlayClick,
}: {
  config: RodConfig;
  value: number;
  onChange: (newValue: number) => void;
  onPlayClick: () => void;
}) {
  const isUpperActive = value >= 5;
  const activeLowerCount = value % 5;

  // Upper bead toggle (0 <-> 5)
  const handleUpperBeadClick = () => {
    onPlayClick();
    if (isUpperActive) {
      onChange(value - 5);
    } else {
      onChange(value + 5);
    }
  };

  // Lower bead click (index 0..3 from top to bottom)
  const handleLowerBeadClick = (index: number) => {
    onPlayClick();
    const base = isUpperActive ? 5 : 0;
    if (index < activeLowerCount) {
      // If clicking an active bead, deactivate this bead and those below it
      onChange(base + index);
    } else {
      // If clicking an inactive bead, activate it and those above it
      onChange(base + (index + 1));
    }
  };

  return (
    <div className="flex flex-col items-center select-none min-w-[56px] xs:min-w-[66px] sm:min-w-[84px] flex-1 max-w-[115px]">
      {/* Place Value Header */}
      <div className="text-center mb-1.5 sm:mb-2">
        <span
          className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase border shadow-2xs ${config.badgeClass}`}
        >
          {config.shortLabel}
        </span>
        <span className="hidden sm:block text-[9px] font-bold text-slate-500 mt-0.5 tracking-tight">
          {config.label}
        </span>
      </div>

      {/* Individual Rod Container inside Abacus Frame */}
      <div className="relative w-full flex flex-col items-center px-1 sm:px-2 py-1">
        {/* Metal Rod (continuous behind upper & lower decks) */}
        <div className="absolute inset-y-0 w-1.5 sm:w-2 bg-gradient-to-r from-slate-300 via-white to-slate-300 rounded-full shadow-xs z-0 pointer-events-none" />

        {/* --- UPPER DECK (Heaven: 1 Bead = 5) --- */}
        <div className="relative w-full h-[64px] sm:h-[78px] flex justify-center items-start z-10">
          <button
            type="button"
            onClick={handleUpperBeadClick}
            aria-label={`${config.label} upper bead 5`}
            className={`absolute w-[44px] xs:w-[52px] sm:w-[68px] h-[22px] sm:h-[28px] transition-all duration-200 ease-out focus:outline-hidden group cursor-pointer ${
              isUpperActive
                ? 'top-[40px] sm:top-[48px]' // Pushed DOWN touching beam (Active = 5)
                : 'top-[2px]' // Pushed UP against upper frame (Inactive = 0)
            }`}
          >
            {/* Authentic Bi-Conical Rhomboid Soroban Bead Shape (Light Blue/Orange Theme) */}
            <div
              className={`w-full h-full transition-all duration-150 ${
                isUpperActive
                  ? 'bg-gradient-to-b from-amber-300 via-saVividOrange to-saOrangeDark shadow-md shadow-orange-500/40 border-t border-amber-100 border-b border-orange-800 scale-102'
                  : 'bg-gradient-to-b from-blue-100 via-blue-200 to-blue-300 border-t border-white border-b border-blue-300/80 group-hover:from-blue-200 group-hover:to-blue-300 shadow-2xs'
              } transition-transform active:scale-95`}
              style={{
                clipPath: 'polygon(16% 0%, 84% 0%, 100% 50%, 84% 100%, 16% 100%, 0% 50%)',
              }}
            >
              {/* Highlight Ridge across center */}
              <div className="w-full h-[1px] bg-white/70 absolute top-1/2 -translate-y-1/2" />
            </div>
          </button>
        </div>

        {/* --- RECKONING BEAM (StudyAsan Blue Separator Bar with Unit Dots) --- */}
        <div className="relative w-full h-3.5 sm:h-5 bg-gradient-to-r from-saBlue via-saBlueLight to-saBlue border-y border-saBlueDarkHover shadow-xs flex items-center justify-center z-20 rounded-xs">
          {config.hasUnitDot && (
            <div
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white ring-2 ring-saOrangeLight shadow-xs shadow-white/80"
              title="Unit / Reckoning Point Marker"
            />
          )}
        </div>

        {/* --- LOWER DECK (Earth: 4 Beads = 1 each) --- */}
        <div className="relative w-full h-[142px] sm:h-[176px] z-10">
          {[0, 1, 2, 3].map((beadIndex) => {
            const isActive = beadIndex < activeLowerCount;
            // Mobile: bead height = 22px, travel clearance = 46px
            // Desktop: bead height = 28px, travel clearance = 56px
            return (
              <button
                key={beadIndex}
                type="button"
                onClick={() => handleLowerBeadClick(beadIndex)}
                aria-label={`${config.label} lower bead ${beadIndex + 1}`}
                className="absolute left-1/2 -translate-x-1/2 w-[44px] xs:w-[52px] sm:w-[68px] h-[22px] sm:h-[28px] transition-all duration-200 ease-out focus:outline-hidden group cursor-pointer"
                style={{
                  top: isActive
                    ? `${beadIndex * 24}px` // Stacked UP touching beam (Active)
                    : `${46 + beadIndex * 24}px`, // Stacked DOWN against bottom frame (Inactive)
                }}
              >
                {/* Authentic Bi-Conical Rhomboid Soroban Bead Shape */}
                <div
                  className={`w-full h-full transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-b from-amber-300 via-saVividOrange to-saOrangeDark shadow-md shadow-orange-500/40 border-t border-amber-100 border-b border-orange-800 scale-102'
                      : 'bg-gradient-to-b from-blue-100 via-blue-200 to-blue-300 border-t border-white border-b border-blue-300/80 group-hover:from-blue-200 group-hover:to-blue-300 shadow-2xs'
                  } transition-transform active:scale-95`}
                  style={{
                    clipPath: 'polygon(16% 0%, 84% 0%, 100% 50%, 84% 100%, 16% 100%, 0% 50%)',
                  }}
                >
                  <div className="w-full h-[1px] bg-white/70 absolute top-1/2 -translate-y-1/2" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Digit Stepper & Direct Indicator Controls */}
      <div className="mt-2 sm:mt-3 flex flex-col items-center gap-1.5 w-full">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              onPlayClick();
              onChange(Math.max(0, value - 1));
            }}
            disabled={value <= 0}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white hover:bg-saBlueSubtle active:bg-blue-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-saBlue border border-saBlue/20 shadow-2xs font-black transition-colors"
            title="Decrement"
          >
            <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          <span
            className={`w-7 sm:w-8 h-7 sm:h-8 rounded-lg flex items-center justify-center text-sm sm:text-base font-black font-mono border shadow-xs transition-colors ${
              value > 0
                ? 'bg-saBlue text-white border-saBlue shadow-xs shadow-saBlue/25'
                : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            {value}
          </span>

          <button
            type="button"
            onClick={() => {
              onPlayClick();
              onChange(Math.min(9, value + 1));
            }}
            disabled={value >= 9}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white hover:bg-saBlueSubtle active:bg-blue-100 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-saBlue border border-saBlue/20 shadow-2xs font-black transition-colors"
            title="Increment"
          >
            <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
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
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const { playSound, stopSound, stopAll } = useSound();

  const items = useMemo(() => activity.items || [], [activity.items]);
  const item = items[current];

  // 5 Rod state array: [ones (0), tens (1), hundreds (2), thousands (3), tenThousands (4)]
  const [rodValues, setRodValues] = useState<number[]>([0, 0, 0, 0, 0]);

  // Compute total represented integer
  const representedNumber = useMemo(() => {
    return (
      (rodValues[4] || 0) * 10000 +
      (rodValues[3] || 0) * 1000 +
      (rodValues[2] || 0) * 100 +
      (rodValues[1] || 0) * 10 +
      (rodValues[0] || 0)
    );
  }, [rodValues]);

  // Target answer extracted reliably across answer, correctAnswer, and targetNumber
  const correctAnswer = useMemo(() => {
    if (!item?.content) return 0;
    const ans = item.content.answer ?? item.content.correctAnswer ?? item.content.targetNumber ?? 0;
    return Number(ans);
  }, [item]);

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music-zen', { loop: true });
    } else {
      stopSound('bg-music-zen');
    }
    return () => stopAll();
  }, [isMuted, playSound, stopSound, stopAll]);

  const handleRodChange = (placeIndex: number, val: number) => {
    setRodValues((prev) => {
      const next = [...prev];
      next[placeIndex] = Math.max(0, Math.min(9, val));
      return next;
    });
  };

  const playBeadClick = () => {
    playSound('click');
  };

  // Quick reset all rods to 0
  const resetAbacus = () => {
    setRodValues([0, 0, 0, 0, 0]);
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

    const isCorrect = representedNumber === correctAnswer;

    setLastCorrect(isCorrect);
    setShowResult(true);

    if (isCorrect) {
      playSound('correct');
      const earnedPoints = Number(item.points || 10);
      const updatedScore = score + earnedPoints;
      setScore(updatedScore);
      confetti({ particleCount: 80, spread: 75, origin: { y: 0.6 } });

      if (attemptId) {
        try {
          await activityAttemptAPI.submitResponse({
            attempt_id: attemptId,
            item_id: item.id,
            response: { representedNumber, rodValues },
            is_correct: isCorrect,
          });
        } catch (err) {
          console.error('Failed to submit abacus response', err);
        }
      }

      setTimeout(() => {
        if (current < items.length - 1) {
          setCurrent((c) => c + 1);
          setRodValues([0, 0, 0, 0, 0]);
          setShowResult(false);
          setShowHint(false);
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
            response: { representedNumber, rodValues },
            is_correct: isCorrect,
          });
        } catch (err) {
          console.error('Failed to submit abacus response', err);
        }
      }

      setTimeout(() => {
        if (current < items.length - 1) {
          setCurrent((c) => c + 1);
          setRodValues([0, 0, 0, 0, 0]);
          setShowResult(false);
          setShowHint(false);
        } else {
          completeGame(score);
        }
      }, 1400);
    }
  };

  if (!item) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 text-slate-800 p-4">
        <Card className="p-8 text-center max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl">
          <h2 className="text-xl font-bold mb-2 text-slate-800">No Abacus Problems</h2>
          <p className="text-xs text-slate-500 mb-6">Add problems in the builder to preview.</p>
          <Button onClick={onCancel} className="w-full bg-saBlue hover:bg-saBlueDarkHover text-white font-bold">
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
        activityTitle={activity.title || 'Soroban Abacus Lab'}
        score={score}
        timeTaken={timeTaken}
        totalQuestions={items.length}
        onContinue={() => onComplete(score, timeTaken)}
        continueText="Finish & Claim Rewards"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFD] text-slate-800 flex flex-col font-sans overflow-y-auto w-full min-h-screen">
      {/* Background Shapes & Grid with 100% Full-Screen Edge-to-Edge Coverage */}
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <style>{`
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-22px) rotate(180deg); }
          }
          @keyframes float-medium {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-35px) rotate(-90deg) scale(1.06); }
          }
          .animate-float-slow { animation: float-slow 18s ease-in-out infinite; }
          .animate-float-medium { animation: float-medium 14s ease-in-out infinite; }
        `}</style>
        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-70" />
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-saBlue/10 blur-[130px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-saVividOrange/10 blur-[130px]" />
        <div className="absolute w-14 h-14 rounded-full border-2 border-saBlue/20 animate-float-slow" style={{ top: '15%', left: '8%' }} />
        <div className="absolute w-16 h-16 border-2 border-saVividOrange/20 rounded-2xl animate-float-medium" style={{ top: '48%', left: '88%' }} />
      </div>

      {/* Top Header - StudyAsan Blue Brand Theme */}
      <div className="px-3 py-2.5 sm:px-6 sm:py-3.5 flex flex-row justify-between items-center gap-2 sm:gap-4 bg-saBlue border-b border-saBlueDarkHover/30 z-20 shadow-md text-white shrink-0">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="flex items-center shrink-0">
            <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-6 sm:h-7 w-auto object-contain" />
          </div>
          <div className="h-5 sm:h-6 w-px bg-white/30 hidden sm:block" />
          <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate min-w-0">
            Abacus Lab
          </h2>
          <span className="hidden xs:inline-block text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/25 font-black uppercase tracking-wider shrink-0">
            {current + 1}/{items.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowGuideModal(true)}
            className="p-1 sm:p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition-colors shrink-0 flex items-center gap-1.5 text-xs font-bold px-2.5"
            title="How to use Soroban Abacus"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 hover:bg-white/15 text-white/90 hover:text-white rounded-xl transition-colors shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* StudyAsan EXP Badge */}
          <div className="flex items-center bg-white/20 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl text-white border border-white/25 font-black text-[11px] sm:text-sm shrink-0 whitespace-nowrap shadow-xs">
            <Star className="w-3.5 h-3.5 mr-1 text-amber-300 fill-amber-300" />
            <span>{score}<span className="hidden xs:inline ml-0.5">EXP</span></span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="hover:bg-white/15 text-white/90 hover:text-white h-8 w-8 p-0 rounded-xl transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar (StudyAsan Vivid Orange) */}
      <div className="h-1.5 w-full bg-saBlue/20 shrink-0">
        <div
          className="h-full bg-saVividOrange transition-all duration-500"
          style={{ width: `${((current + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-6 max-w-4xl w-full mx-auto flex flex-col justify-center gap-4 sm:gap-5 my-auto">
        {/* Question Prompt Card */}
        <Card className="bg-white border-2 border-blue-100 rounded-3xl p-5 sm:p-7 text-center shadow-md shadow-blue-500/5 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-saOrangeSubtle text-saVividOrange border border-saVividOrange/30 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-saVividOrange" />
              Solve On Soroban Abacus
            </span>

            {item.content?.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-saBlue hover:text-saBlueDarkHover hover:underline"
              >
                <Lightbulb className="w-3.5 h-3.5 text-saVividOrange" />
                <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
              </button>
            )}
          </div>

          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight my-1.5 tracking-tight">
            {item.content?.prompt}
          </h3>

          {showHint && item.content?.hint && (
            <div className="mt-3 p-3 rounded-2xl bg-saBlueSubtle border border-saBlue/20 text-xs text-saBlueDarkHover font-semibold inline-block max-w-lg text-left animate-in fade-in duration-150 shadow-2xs">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-saBlue shrink-0 mt-0.5" />
                <span>{item.content.hint}</span>
              </div>
            </div>
          )}
        </Card>

        {/* --- MODERN SOROBAN ABACUS BOARD (Light Theme with Blue & Orange Branding) --- */}
        <div className="relative rounded-3xl p-3.5 sm:p-6 bg-white border-2 border-saBlue/30 shadow-xl shadow-blue-500/5 overflow-hidden">
          {/* Top Bar inside Abacus Frame: Calculation & Actions on one line */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 mb-3.5 px-2.5 py-2 bg-saBlueSubtle/50 rounded-2xl border border-saBlue/15">
            {/* Left: Soroban Badge & Live Value */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-[11px] font-black tracking-widest text-saBlue uppercase flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-saVividOrange" />
                <span className="hidden xs:inline">Japanese Soroban</span>
              </div>

              <div className="h-4 sm:h-5 w-px bg-saBlue/25 hidden xs:block" />

              {/* Live Value Display */}
              <div className="flex items-baseline gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-saBlue/20 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400">Value:</span>
                <span className="text-xl sm:text-2xl font-black text-saBlue font-mono tracking-tight leading-none">
                  {representedNumber.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Center: Calculation Place-Value Breakdown Chips */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              {[4, 3, 2, 1, 0].map((pIdx) => {
                const cfg = ROD_CONFIGS.find((c) => c.placeIndex === pIdx)!;
                const digit = rodValues[pIdx] || 0;
                return (
                  <span
                    key={pIdx}
                    className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg border transition-all ${
                      digit > 0
                        ? `${cfg.badgeClass} font-black shadow-2xs scale-105`
                        : 'bg-white text-slate-400 border-slate-200 opacity-70'
                    }`}
                  >
                    {cfg.shortLabel}: {digit * cfg.multiplier}
                  </span>
                );
              })}
            </div>

            {/* Right: Quick Clear & Confirm Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={resetAbacus}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-orange-50 active:scale-95 text-saVividOrange hover:text-saOrangeDark font-black text-xs shadow-2xs transition-all cursor-pointer border border-saVividOrange/30"
                title="Reset all beads to 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <Button
                onClick={submit}
                className="bg-saBlue hover:bg-saBlueDarkHover active:scale-95 text-white font-black uppercase tracking-wider gap-1.5 rounded-xl h-8 sm:h-9 px-4 sm:px-6 shadow-md shadow-saBlue/25 text-xs sm:text-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Confirm</span>
              </Button>
            </div>
          </div>

          {/* Abacus Interior Track & Rods */}
          <div className="rounded-2xl bg-saBlueSubtle/60 p-2.5 sm:p-5 border-2 border-saBlue/20 shadow-inner flex justify-center items-stretch gap-1 sm:gap-4 overflow-x-auto">
            {/* Render 5 Place-Value Rods (from Ten-Thousands down to Ones) */}
            {[4, 3, 2, 1, 0].map((placeIdx) => {
              const cfg = ROD_CONFIGS.find((c) => c.placeIndex === placeIdx)!;
              return (
                <SorobanRod
                  key={placeIdx}
                  config={cfg}
                  value={rodValues[placeIdx] || 0}
                  onChange={(val) => handleRodChange(placeIdx, val)}
                  onPlayClick={playBeadClick}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Feedback Overlay */}
      {showResult && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/40 backdrop-blur-[3px] animate-in fade-in duration-200">
          <div
            className={`text-4xl sm:text-6xl font-black uppercase tracking-wider drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)] flex items-center gap-3 px-8 py-5 rounded-3xl backdrop-blur-md shadow-2xl border ${
              lastCorrect
                ? 'bg-emerald-600/90 text-white border-emerald-400'
                : 'bg-rose-600/90 text-white border-rose-400'
            }`}
          >
            {lastCorrect ? (
              <>
                <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                <span>Correct!</span>
              </>
            ) : (
              <>
                <X className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                <span>Try Again!</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- SOROBAN INSTRUCTION GUIDE MODAL --- */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <Card className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-saBlueSubtle text-saBlue border border-saBlue/20">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-slate-800">How to use Soroban Abacus</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="p-3.5 rounded-2xl bg-saOrangeSubtle border border-saVividOrange/30">
                <h4 className="font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-saVividOrange text-white text-[11px] flex items-center justify-center font-black">5</span>
                  Upper Deck (Heaven Bead) = 5
                </h4>
                <p className="text-slate-700 text-xs">
                  Each upper bead is worth <strong>5</strong>. Click it down towards the center bar to activate it (adds 5). Click it up to deactivate (0).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-saBlueSubtle border border-saBlue/30">
                <h4 className="font-extrabold text-slate-900 mb-1 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-saBlue text-white text-[11px] flex items-center justify-center font-black">1</span>
                  Lower Deck (Earth Beads) = 1 Each
                </h4>
                <p className="text-slate-700 text-xs">
                  Each lower bead is worth <strong>1</strong> (total 4). Click any lower bead to slide it up against the center bar to add 1, 2, 3, or 4.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <h4 className="font-extrabold text-slate-800 mb-1">Place Value Columns</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  From right to left: <strong>Ones (1)</strong>, <strong>Tens (10)</strong>, <strong>Hundreds (100)</strong>, <strong>Thousands (1,000)</strong>, and <strong>Ten-Thousands (10,000)</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-xs">
                <strong>Example:</strong> To represent <strong>75</strong>, set Tens rod to <strong>7</strong> (Upper 5 + 2 Lower) and Ones rod to <strong>5</strong> (Upper 5 + 0 Lower).
              </div>
            </div>

            <Button
              onClick={() => setShowGuideModal(false)}
              className="w-full mt-5 bg-saBlue hover:bg-saBlueDarkHover text-white font-black rounded-xl h-11 shadow-md shadow-saBlue/20"
            >
              Got it, let&apos;s practice!
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
