import { useState, useEffect } from 'react';
import { X, Trophy, Clock, Star, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import type { Activity } from '../../../types/activity';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { useSound } from '../../../hooks/useSound';

interface Props {
  activity: Activity;
  attemptId: number;
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
      playSound('bg-music', { loop: true, volume: 0.2 });
    } else {
      stopSound('bg-music');
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

  const handleComplete = (finalScore: number) => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    setShowCelebration(true);
    playSound('game-over');

    // Big celebration
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      onComplete(finalScore, timeTaken);
    }, 4000);
  };

  if (showCelebration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a] text-white">
        <Card className="gamified-card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10" />
          <Trophy className="w-32 h-32 mx-auto text-yellow-500 mb-8 animate-bounce relative z-10" />
          <h2 className="text-5xl font-black mb-4 relative z-10">Match Complete!</h2>
          <p className="text-3xl text-blue-300 mb-8 font-bold relative z-10">Score: {Math.round(score)}</p>
          <div className="flex justify-center gap-4">
            {[...Array(3)].map((_, i) => (
              <Star key={i} className="w-12 h-12 text-yellow-400 fill-current animate-spin-slow" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[url('/grid.svg')] opacity-20" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/40 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/40 blur-[100px] rounded-full" />

      {/* Header */}
      <div className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            {activity.title}
          </h2>
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center bg-yellow-400/10 px-6 py-2 rounded-full text-yellow-400 border border-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
            <Star className="w-6 h-6 mr-3 fill-current animate-pulse" />
            <span className="font-bold text-xl">{Math.round(score)}</span>
          </div>
          <div className="flex items-center bg-blue-400/10 px-6 py-2 rounded-full text-blue-400 border border-blue-400/20">
            <Clock className="w-6 h-6 mr-3" />
            <span className="font-bold text-xl font-mono">{timeElapsed}s</span>
          </div>
          <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <X className="w-8 h-8" />
          </Button>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 overflow-y-auto p-8 relative z-10 w-full max-w-7xl mx-auto flex flex-col">
        <div className="flex-1 grid grid-cols-2 gap-12 h-full">
          {/* Left Column */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-center text-blue-300 uppercase tracking-widest mb-6 border-b border-blue-500/30 pb-2">Terms</h3>
            <div className="grid gap-4">
              {leftItems.map((pair, index) => {
                const isSelected = selectedLeft === index;
                const isMatched = matched.has(`L${index}`);

                return (
                  <button
                    key={index}
                    onClick={() => handleLeftClick(index)}
                    disabled={isMatched}
                    className={`btn-3d w-full min-h-[5rem] p-4 text-left rounded-xl transition-all duration-300 flex items-center gap-4 group 
                                    ${isMatched
                        ? 'opacity-50 grayscale cursor-not-allowed bg-green-500/20 border-green-500/50'
                        : isSelected
                          ? 'btn-3d-primary scale-105 ring-4 ring-blue-500/30 z-10'
                          : 'btn-3d-neutral hover:scale-102'}`}
                  >
                    {pair.imageLeft && (
                      <img src={pair.imageLeft} alt="" className="w-16 h-16 object-cover rounded-lg bg-black/30" />
                    )}
                    <span className={`text-lg font-bold ${isMatched ? 'text-green-400 line-through' : 'text-white'}`}>
                      {pair.left}
                    </span>
                    {isMatched && <div className="ml-auto text-green-400"><Star className="w-5 h-5 fill-current" /></div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-center text-purple-300 uppercase tracking-widest mb-6 border-b border-purple-500/30 pb-2">Definitions</h3>
            <div className="grid gap-4">
              {rightItems.map((pair, index) => {
                const isSelected = selectedRight === index;
                const isMatched = matched.has(`R${index}`);
                const isVisible = selectedLeft !== null;

                return (
                  <button
                    key={index}
                    onClick={() => handleRightClick(index)}
                    disabled={isMatched || !isVisible}
                    className={`btn-3d w-full min-h-[5rem] p-4 text-left rounded-xl transition-all duration-300 flex items-center gap-4 group 
                                    ${isMatched
                        ? 'opacity-50 grayscale cursor-not-allowed bg-green-500/20 border-green-500/50'
                        : isSelected
                          ? 'btn-3d-primary scale-105 ring-4 ring-purple-500/30 z-10'
                          : !isVisible
                            ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed justify-center'
                            : 'bg-slate-700 border-b-4 border-slate-900 text-slate-100 hover:bg-slate-600 hover:scale-102 shadow-lg'}`}
                  >
                    {!isVisible && !isMatched ? (
                      <HelpCircle className="w-8 h-8 text-slate-600 animate-pulse" />
                    ) : (
                      <>
                        {pair.imageRight && (
                          <img src={pair.imageRight} alt="" className="w-16 h-16 object-cover rounded-lg bg-black/30" />
                        )}
                        <span className={`text-lg font-bold ${isMatched ? 'text-green-400 line-through' : 'text-white'}`}>
                          {pair.right}
                        </span>
                        {isMatched && <div className="ml-auto text-green-400"><Star className="w-5 h-5 fill-current" /></div>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
