import { useState, useEffect } from 'react';
import { X, Star, Clock, CheckCircle2, XCircle, Volume2, VolumeX, Check, ChevronRight } from 'lucide-react';
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
  // Live mode props
  isLive?: boolean;
  onAnswerSubmit?: (answer: boolean, timeTaken: number) => void;
  currentQuestionIndex?: number;
}

export default function TrueFalseGame({
  activity,
  attemptId,
  onComplete,
  onCancel,
  isLive,
  onAnswerSubmit,
  currentQuestionIndex,
}: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(30);
  const [isMuted, setIsMuted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const { playSound, stopSound, stopAll } = useSound();

  const questions = activity.items || [];
  const totalQuestions = questions.length;
  const activeQuestionIndex = isLive ? (currentQuestionIndex ?? 0) : currentQuestion;
  const question = questions[activeQuestionIndex];

  // Background music
  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music-playful', { loop: true });
    } else {
      stopSound('bg-music-playful');
    }
    return () => stopAll();
  }, [isMuted]);

  // Per-question timer initialization
  useEffect(() => {
    if (question) {
      const limit = question.content?.timeLimit || 30;
      setTimeLeft(limit);
      setQuestionStartTime(Date.now());
    }
  }, [activeQuestionIndex, questions]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !showResult && !showCelebration) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
        if (timeLeft <= 5 && timeLeft > 1) {
          playSound('timer-tick', { volume: 0.3 });
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult && !showCelebration) {
      if (selectedAnswer !== null) {
        handleSubmit();
      } else if (isLive) {
        setIsCorrect(false);
        setShowResult(true);
        playSound('incorrect');
        if (onAnswerSubmit) {
          onAnswerSubmit(false, 30);
        }
      }
    }
  }, [timeLeft, showResult, showCelebration, selectedAnswer, isLive]);

  const handleSelectAnswer = (answer: boolean) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    playSound('click');
  };

  const getParsedContent = (item: any) => {
    if (!item) return {};
    let c = item.content;
    if (typeof c === 'string') {
      try {
        c = JSON.parse(c);
      } catch (e) {
        console.error('Failed to parse TrueFalse content', e);
      }
    }
    return c || {};
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

  const currentContent = getParsedContent(question);

  const resetGame = () => {
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
    setIsCorrect(false);
    setCorrectCount(0);
    setTimeLeft(30);
    setShowCelebration(false);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || !question) return;

    const expectedAnswer = normalizeBoolean(currentContent.correctAnswer);
    const correct = selectedAnswer === expectedAnswer;
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      const points = Number(question.points || 10);
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      playSound('correct');
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.62 },
      });
    } else {
      playSound('incorrect');
    }

    // Submit attempt response to backend
    if (attemptId) {
      try {
        await activityAttemptAPI.submitResponse({
          attempt_id: attemptId,
          item_id: question.id,
          response: { answer: selectedAnswer },
          is_correct: correct,
          time_taken: timeTaken,
        });
      } catch (error) {
        console.error('Failed to submit True/False response:', error);
      }
    }

    if (isLive && onAnswerSubmit) {
      onAnswerSubmit(selectedAnswer, timeTaken);
    } else {
      // Auto advance to next question or celebration
      setTimeout(() => {
        if (currentQuestion < totalQuestions - 1) {
          setCurrentQuestion((prev) => prev + 1);
          setShowResult(false);
          setSelectedAnswer(null);
        } else {
          stopSound('bg-music');
          playSound('game-over');
          setShowCelebration(true);
        }
      }, 1600);
    }
  };

  const handleFinishGame = () => {
    const totalTimeTaken = Math.floor((Date.now() - startTime) / 1000);
    onComplete(score, totalTimeTaken);
  };

  // Celebration modal screen
  if (showCelebration) {
    const totalTimeTaken = Math.floor((Date.now() - startTime) / 1000);
    const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 100;
    return (
      <VictoryCelebrationModal
        title={accuracy >= 80 ? 'Mastery Achieved!' : 'Well Done!'}
        activityTitle={activity.title || 'True or False Quiz'}
        score={score}
        timeTaken={totalTimeTaken}
        accuracy={accuracy}
        totalQuestions={totalQuestions}
        correctAnswers={correctCount}
        onPlayAgain={resetGame}
        playAgainText="Play Again"
        onContinue={handleFinishGame}
        continueText="Back to Activities"
      />
    );
  }

  // Fallback for missing/loading question
  if (!question) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-6 text-slate-800">
        <Card className="p-8 text-center max-w-md w-full bg-white border border-slate-200 rounded-3xl shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 text-saBlue rounded-2xl flex items-center justify-center animate-spin">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Preparing Questions...</h3>
          <p className="text-xs text-slate-500 mb-6">Waiting for activity data to load.</p>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel
          </Button>
        </Card>
      </div>
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
          @keyframes float-medium {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-35px) rotate(-90deg) scale(1.06); }
          }
          @keyframes float-fast {
            0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
            50% { transform: translateY(-16px) rotate(120deg) scale(0.94); }
          }
          .animate-float-slow { animation: float-slow 18s ease-in-out infinite; }
          .animate-float-medium { animation: float-medium 22s ease-in-out infinite; }
          .animate-float-fast { animation: float-fast 14s ease-in-out infinite; }
        `}</style>

        {/* Soft Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

        {/* Colorful Blurred Glowing Blobs */}
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-saBlue/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] rounded-full bg-saVividOrange/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[50%] w-[35%] h-[35%] rounded-full bg-blue-300/10 blur-[100px]" />

        {/* Floating Geometric Shapes */}
        <div className="absolute w-12 h-12 rounded-full border-2 border-saBlue/15 animate-float-slow" style={{ top: '15%', left: '8%' }} />
        <div className="absolute w-8 h-8 rounded-full border-2 border-blue-400/20 animate-float-fast" style={{ top: '55%', left: '4%' }} />
        <div className="absolute w-10 h-10 border-2 border-blue-400/20 rounded-lg animate-float-fast" style={{ top: '12%', right: '12%' }} />
        <div className="absolute w-14 h-14 border-2 border-saVividOrange/15 rounded-xl animate-float-medium" style={{ top: '48%', left: '88%' }} />
        <svg className="absolute w-14 h-14 text-saVividOrange/15 animate-float-medium" style={{ top: '75%', left: '12%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 22 22 2 22" />
        </svg>
        <svg className="absolute w-11 h-11 text-saBlue/15 animate-float-slow" style={{ top: '78%', right: '16%' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 22 22 2 22" />
        </svg>
      </div>

      {/* Branded Header */}
      <div className="px-2.5 py-2 sm:px-6 sm:py-3 flex flex-row justify-between items-center gap-1.5 sm:gap-4 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="flex items-center shrink-0">
            <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-5 sm:h-7 w-auto object-contain" />
          </div>
          <div className="h-4 sm:h-6 w-px bg-white/25 hidden sm:block" />
          <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate min-w-0">
            True / False
          </h2>
          {!isLive && (
            <span className="hidden xs:inline-block text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/20 font-bold uppercase tracking-wider shrink-0">
              {activeQuestionIndex + 1}/{totalQuestions}
            </span>
          )}
          {isLive && (
            <span className="text-[10px] bg-emerald-400/25 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30 font-bold uppercase tracking-wider animate-pulse shrink-0">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 sm:p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-colors shrink-0"
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* EXP Badge */}
          <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm shrink-0 whitespace-nowrap">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 fill-current text-amber-300" />
            <span>{score}<span className="hidden xs:inline ml-0.5">EXP</span></span>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-white border border-white/20 font-bold text-[11px] sm:text-sm font-mono shrink-0 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
            <span className={timeLeft <= 5 ? 'animate-pulse text-red-300' : ''}>{timeLeft}s</span>
          </div>

          {/* Exit / Cancel */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="hover:bg-white/10 text-white/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg transition-colors shrink-0"
            title="Exit Activity"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {!isLive && (
        <div className="h-1.5 w-full bg-slate-200 shrink-0">
          <div
            className="h-full bg-saBlue transition-all duration-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
            style={{ width: `${totalQuestions > 0 ? ((activeQuestionIndex + 1) / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Main Content Stage */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative z-10 w-full">
        <div className="w-full max-w-7xl mx-auto py-2 sm:py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
          {/* Left Column: Instructions */}
          <div className="lg:col-span-1 order-1 flex flex-col gap-4 self-stretch">
            <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
              <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider flex items-center gap-1.5">
                <span>Instructions</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                {activity.instructions ||
                  'Read the statement below carefully. Decide if the statement is factually True or False, select your choice, and confirm your answer before time runs out!'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                <span>Value</span>
                <span className="text-saBlue font-black">+{question.points || 10} EXP</span>
              </div>
            </Card>
          </div>

          {/* Center Column: Question & Sleek True/False Option Cards */}
          <div className="lg:col-span-2 order-2 flex flex-col gap-4 sm:gap-5 items-stretch min-h-0">
            {/* Statement Question Card */}
            <Card className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Statement {activeQuestionIndex + 1}
              </span>

              {/* Optional Statement Media */}
              {question.content?.statementMedia && (
                <div className="mb-4 flex justify-center w-full max-h-[170px] overflow-hidden rounded-xl border border-slate-100">
                  <img
                    src={question.content.statementMedia}
                    alt="Statement Visual"
                    className="h-full w-auto max-w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}

              {/* Statement Text */}
              {question.content?.statement && (
                <h3 className="text-lg sm:text-2xl font-extrabold text-slate-800 text-center leading-relaxed max-w-2xl">
                  &ldquo;{question.content.statement}&rdquo;
                </h3>
              )}
            </Card>

            {/* True & False Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Option: TRUE */}
              {(() => {
                const expectedAnswer = normalizeBoolean(currentContent.correctAnswer);
                const isSelected = selectedAnswer === true;
                const isCorrectOption = expectedAnswer === true;

                let cardStyle =
                  'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40 hover:scale-[1.015] hover:shadow-md';

                if (showResult) {
                  if (isCorrectOption) {
                    cardStyle =
                      'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/40 font-bold scale-[1.02] shadow-md shadow-emerald-500/10';
                  } else if (isSelected) {
                    cardStyle = 'bg-red-50 border-red-300 text-red-700 font-bold';
                  } else {
                    cardStyle = 'opacity-35 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200';
                  }
                } else if (isSelected) {
                  cardStyle =
                    'bg-emerald-50/80 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/30 font-bold scale-[1.02] shadow-md shadow-emerald-500/15';
                }

                return (
                  <button
                    onClick={() => handleSelectAnswer(true)}
                    disabled={showResult}
                    className={`w-full min-h-[5.5rem] p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 text-left ${cardStyle}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected || (showResult && isCorrectOption)
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xl sm:text-2xl font-black uppercase tracking-wider text-emerald-700">
                          True
                        </span>
                        {isSelected && !showResult && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Statement is accurate
                      </p>
                    </div>
                  </button>
                );
              })()}

              {/* Option: FALSE */}
              {(() => {
                const expectedAnswer = normalizeBoolean(currentContent.correctAnswer);
                const isSelected = selectedAnswer === false;
                const isCorrectOption = expectedAnswer === false;

                let cardStyle =
                  'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 hover:scale-[1.015] hover:shadow-md';

                if (showResult) {
                  if (isCorrectOption) {
                    cardStyle =
                      'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-400/40 font-bold scale-[1.02] shadow-md shadow-emerald-500/10';
                  } else if (isSelected) {
                    cardStyle = 'bg-red-50 border-red-300 text-red-700 font-bold';
                  } else {
                    cardStyle = 'opacity-35 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200';
                  }
                } else if (isSelected) {
                  cardStyle =
                    'bg-amber-50/80 border-amber-500 text-amber-900 ring-2 ring-amber-500/30 font-bold scale-[1.02] shadow-md shadow-amber-500/15';
                }

                return (
                  <button
                    onClick={() => handleSelectAnswer(false)}
                    disabled={showResult}
                    className={`w-full min-h-[5.5rem] p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 text-left ${cardStyle}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected || (showResult && isCorrectOption)
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}
                    >
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xl sm:text-2xl font-black uppercase tracking-wider text-amber-700">
                          False
                        </span>
                        {isSelected && !showResult && (
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Statement is inaccurate
                      </p>
                    </div>
                  </button>
                );
              })()}
            </div>

            {/* Confirm / Submit Button */}
            {!showResult && (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className={`w-full py-4 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                  selectedAnswer !== null
                    ? 'bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-blue-500/25 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed bg-slate-200 text-slate-400 border border-slate-300'
                }`}
              >
                Confirm Answer
              </Button>
            )}
          </div>

          {/* Right Column: Question Tracker */}
          <div className="lg:col-span-1 order-3 flex flex-col self-stretch">
            <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex-1 flex flex-col">
              <h3 className="text-xs font-black mb-3 text-saBlue uppercase tracking-wider">
                Question Tracker
              </h3>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 flex-1">
                {questions.map((_, i) => {
                  const isActive = i === activeQuestionIndex;
                  const isCleared = i < activeQuestionIndex;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-blue-50 border-blue-200 text-saBlue shadow-xs'
                          : isCleared
                          ? 'bg-slate-50 border-slate-150 text-slate-400 line-through'
                          : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isActive ? 'bg-saBlue text-white' : isCleared ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {i + 1}
                        </span>
                        <span>Question {i + 1}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase">
                        {isActive ? 'Active' : isCleared ? 'Done' : 'Locked'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>

      {/* Inline Floating Result Feedback */}
      {showResult && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/85 backdrop-blur-xs animate-in fade-in duration-200 p-6">
          <div
            className={`text-4xl sm:text-6xl font-black uppercase tracking-wider mb-6 flex items-center gap-3 ${
              isCorrect ? 'text-emerald-500 animate-bounce' : 'text-red-500'
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16" />
                <span>{isLive ? 'Correct!' : 'Awesome!'}</span>
              </>
            ) : (
              <>
                <XCircle className="w-12 h-12 sm:w-16 sm:h-16" />
                <span>{isLive ? 'Incorrect' : 'Oops!'}</span>
              </>
            )}
          </div>

          {isLive && (
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto mb-3 text-saBlue shadow-xs">
                <Clock className="w-7 h-7 animate-spin text-saBlue" />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-1">
                Answer Recorded!
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-4">
                Waiting for the teacher to move to the next question...
              </p>
              <div className="flex justify-center items-center gap-1.5 py-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 bg-saBlue rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
