import { useState, useEffect } from 'react';
import { X, Trophy, Clock, Star, Volume2, VolumeX, HelpCircle, CheckCircle } from 'lucide-react';
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

export default function MatchPairsGame({ activity, attemptId, onComplete, onCancel }: Props) {
  const [leftItems, setLeftItems] = useState<any[]>([]);
  const [rightItems, setRightItems] = useState<any[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { playSound, stopSound, stopAll } = useSound();
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music-playful', { loop: true });
    } else {
      stopSound('bg-music-playful');
    }
    return () => stopAll();
  }, [isMuted]);

  useEffect(() => {
    if (activity.items && activity.items.length > 0) {
      const allPairs = activity.items.flatMap((item: any, itemIndex) =>
        item.content.pairs.map((pair: any, pairIndex: number) => ({
          ...pair,
          itemId: itemIndex,
          pairId: `${itemIndex}-${pairIndex}`,
          points: item.points / item.content.pairs.length,
        }))
      );

      setLeftItems(allPairs);

      // Shuffle right items
      const shuffledRight = [...allPairs].sort(() => Math.random() - 0.5);
      setRightItems(shuffledRight);
    }
  }, [activity]);

  const handleLeftClick = (index: number) => {
    const key = `L${index}`;
    if (matched.has(key)) return;
    setSelectedLeft(index);
    playSound('click');
  };

  const handleRightClick = (index: number) => {
    const key = `R${index}`;
    if (matched.has(key)) return;
    if (selectedLeft === null) return;

    setSelectedRight(index);

    // Check if match is correct (pairId should match)
    const isCorrect = leftItems[selectedLeft].pairId === rightItems[index].pairId;

    if (isCorrect) {
      // Correct match!
      const newMatched = new Set(matched);
      newMatched.add(`L${selectedLeft}`);
      newMatched.add(`R${index}`);
      setMatched(newMatched);

      const newScore = score + (leftItems[selectedLeft].points || 10);
      setScore(newScore);

      playSound('correct');
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });

      submitResponse(selectedLeft, index, true);

      // Check if all matched
      if (newMatched.size === leftItems.length * 2) {
        setTimeout(() => {
          handleComplete(newScore);
        }, 1000);
      }
    } else {
      // Wrong match
      playSound('incorrect');
      submitResponse(selectedLeft, index, false);
    }

    // Reset selection after a delay
    setTimeout(() => {
      setSelectedLeft(null);
      setSelectedRight(null);
    }, 500);
  };

  const submitResponse = async (leftIndex: number, rightIndex: number, isCorrect: boolean) => {
    if (!attemptId) return; // Skip submission for preview mode
    try {
      await activityAttemptAPI.submitResponse({
        attempt_id: attemptId,
        item_id: activity.items![leftItems[leftIndex].itemId].id,
        response: {
          left: leftItems[leftIndex].left,
          right: rightItems[rightIndex].right,
        },
        is_correct: isCorrect,
      });
    } catch (error) {
      console.error('Failed to submit response', error);
    }
  };

  const handleComplete = (finalScore?: number) => {
    if (finalScore !== undefined) setScore(finalScore);
    setShowCelebration(true);
    stopAll();
    playSound('game-over');
  };

  if (showCelebration) {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    return (
      <VictoryCelebrationModal
        title="All Pairs Matched!"
        activityTitle={activity.title || 'Match Pairs Game'}
        score={Math.round(score)}
        timeTaken={timeTaken}
        totalQuestions={leftItems.length}
        correctAnswers={leftItems.length}
        onContinue={() => onComplete(score, timeTaken)}
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
            50% { transform: translateY(-25px) rotate(180deg); }
          }
          @keyframes float-medium {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-40px) rotate(-90deg) scale(1.08); }
          }
          @keyframes float-fast {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-18px) rotate(120deg) scale(0.92); }
          }
          .animate-float-slow {
            animation: float-slow 16s ease-in-out infinite;
          }
          .animate-float-medium {
            animation: float-medium 22s ease-in-out infinite;
          }
          .animate-float-fast {
            animation: float-fast 13s ease-in-out infinite;
          }
        `}</style>

        {/* Soft Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
        
        {/* Colorful Blurred Glowing Blobs */}
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[50%] w-[35%] h-[35%] rounded-full bg-blue-300/10 blur-[100px]" />

        {/* Floating Geometric Shapes */}
        {/* Circles */}
        <div className="absolute w-12 h-12 rounded-full border-2 border-saBlue/15 animate-float-slow" style={{ top: '15%', left: '8%' }} />
        <div className="absolute w-8 h-8 rounded-full border-2 border-blue-400/20 animate-float-fast" style={{ top: '55%', left: '4%' }} />
        
        {/* Squares */}
        <div className="absolute w-10 h-10 border-2 border-blue-400/20 rounded-lg animate-float-fast" style={{ top: '12%', right: '12%' }} />
        <div className="absolute w-14 h-14 border-2 border-saVividOrange/15 rounded-xl animate-float-medium" style={{ top: '48%', left: '88%' }} />
        
        {/* Triangles */}
        <svg className="absolute w-14 h-14 text-saVividOrange/15 animate-float-medium" style={{ top: '75%', left: '12%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 22 2 22" />
        </svg>
        <svg className="absolute w-11 h-11 text-saBlue/15 animate-float-slow" style={{ top: '78%', right: '16%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 22 22 2 22" />
        </svg>
      </div>
      {/* Header */}
      <div className="px-2.5 py-2 sm:px-6 sm:py-3 flex flex-row justify-between items-center gap-1.5 sm:gap-4 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="flex items-center shrink-0">
            <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-5 sm:h-7 w-auto object-contain" />
          </div>
          <div className="h-4 sm:h-6 w-px bg-white/25 hidden sm:block" />
          <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate min-w-0">
            Match Pairs
          </h2>
        </div>

        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <button onClick={() => setIsMuted(!isMuted)} className="p-1 sm:p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-colors shrink-0" title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
          
          <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm shrink-0 whitespace-nowrap">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 fill-current text-amber-300" />
            <span>{Math.round(score)}<span className="hidden xs:inline ml-0.5">EXP</span></span>
          </div>

          <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm font-mono shrink-0 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
            <span>{timeElapsed}s</span>
          </div>

          <Button variant="ghost" size="icon" onClick={onCancel} className="hover:bg-white/10 text-white/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg transition-colors shrink-0">
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 relative z-10 w-full max-w-7xl mx-auto flex flex-col justify-start">
        
        {/* Mobile Instructions Banner */}
        <div className="block lg:hidden mb-3">
          <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-xl p-2.5 shadow-xs flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-saBlue shrink-0" />
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-tight">
              {activity.instructions || "Tap a Term on the left, then tap its matching Definition on the right!"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
          
          {/* Left Column: Instructions (Desktop) */}
          <div className="hidden lg:flex lg:col-span-1 flex-col gap-4 self-stretch">
            <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
              <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider">Instructions</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                {activity.instructions || "Match each term on the left with its correct definition on the right. Select a term first, then click on its matching definition to pair them!"}
              </p>
            </Card>
          </div>

          {/* Right Column: Game Board Columns (Always 2 Side-by-Side Columns) */}
          <div className="lg:col-span-3 flex-1 grid grid-cols-2 gap-2 sm:gap-4 md:gap-6 h-full items-start">
            
            {/* Left Column (Terms) */}
            <Card className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 md:p-5 shadow-xs flex flex-col gap-2 sm:gap-4">
              <h3 className="text-xs sm:text-sm font-black text-center text-saBlue uppercase tracking-wider border-b border-slate-100 pb-2 sm:pb-3">
                Terms
              </h3>
              <div className="flex flex-col gap-2 sm:gap-3">
                {leftItems.map((pair, index) => {
                  const isSelected = selectedLeft === index;
                  const isMatched = matched.has(`L${index}`);

                  return (
                    <button
                      key={index}
                      onClick={() => handleLeftClick(index)}
                      disabled={isMatched}
                      className={`w-full min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] p-2 sm:p-3 text-left rounded-lg sm:rounded-xl transition-all duration-200 border flex items-center justify-between gap-1.5 sm:gap-3 group
                        ${isMatched
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-700 cursor-not-allowed opacity-75'
                          : isSelected
                            ? 'bg-blue-50 border-saBlue text-saBlue scale-[1.01] shadow-xs font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-50/60'}`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                        {pair.imageLeft && (
                          <img src={pair.imageLeft} alt="" className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 object-cover rounded-md sm:rounded-lg bg-slate-100 shrink-0" />
                        )}
                        <span className={`text-xs sm:text-sm font-bold break-words leading-tight ${isMatched ? 'text-emerald-700/80 line-through' : 'text-slate-700'}`}>
                          {pair.left}
                        </span>
                      </div>
                      {isMatched && (
                        <div className="text-emerald-600 shrink-0">
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Right Column (Definitions) */}
            <Card className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 md:p-5 shadow-xs flex flex-col gap-2 sm:gap-4">
              <h3 className="text-xs sm:text-sm font-black text-center text-saVividOrange uppercase tracking-wider border-b border-slate-100 pb-2 sm:pb-3">
                Definitions
              </h3>
              <div className="flex flex-col gap-2 sm:gap-3">
                {rightItems.map((pair, index) => {
                  const isSelected = selectedRight === index;
                  const isMatched = matched.has(`R${index}`);
                  const isVisible = selectedLeft !== null || isMatched;

                  return (
                    <button
                      key={index}
                      onClick={() => handleRightClick(index)}
                      disabled={isMatched || !isVisible}
                      className={`w-full min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] p-2 sm:p-3 text-left rounded-lg sm:rounded-xl transition-all duration-200 border flex items-center justify-between gap-1.5 sm:gap-3 group
                        ${isMatched
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-700 cursor-not-allowed opacity-75'
                          : isSelected
                            ? 'bg-orange-50 border-saVividOrange text-saVividOrange scale-[1.01] shadow-xs font-bold'
                            : !isVisible
                              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed justify-center'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-50/60'}`}
                    >
                      {!isVisible && !isMatched ? (
                        <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 animate-pulse" />
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
                            {pair.imageRight && (
                              <img src={pair.imageRight} alt="" className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 object-cover rounded-md sm:rounded-lg bg-slate-100 shrink-0" />
                            )}
                            <span className={`text-xs sm:text-sm font-bold break-words leading-tight ${isMatched ? 'text-emerald-700/80 line-through' : 'text-slate-700'}`}>
                              {pair.right}
                            </span>
                          </div>
                          {isMatched && (
                            <div className="text-emerald-600 shrink-0">
                              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
