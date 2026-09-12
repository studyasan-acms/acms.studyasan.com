import { useState, useEffect } from 'react';
import { X, Trophy, Clock, Star, ChevronRight, Volume2, VolumeX } from 'lucide-react';
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

export default function QuizGameComponent({ activity, attemptId, onComplete, onCancel }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isMuted, setIsMuted] = useState(false);
  const [timerTickPlayed, setTimerTickPlayed] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);

  const { playSound, stopSound, stopAll } = useSound();

  const questions = activity.items || [];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music-playful', { loop: true, volume: 0.15 });
    } else {
      stopSound('bg-music-playful');
    }
  }, [isMuted]);

  useEffect(() => {
    if (questions[currentQuestion]) {
      setTimeLeft(questions[currentQuestion].content.timeLimit || 30);
      setQuestionStartTime(Date.now());
      setTimerTickPlayed(false); // Reset timer tick sound for new question
      setIsTimeout(false);
    }
  }, [currentQuestion, questions]);

  useEffect(() => {
    if (timeLeft > 0 && !showResult) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        if (timeLeft <= 5 && !timerTickPlayed) {
          playSound('timer-tick', { volume: 0.4 });
          setTimerTickPlayed(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleSubmitAnswer();
    }
  }, [timeLeft, showResult, timerTickPlayed]);

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
    playSound('click');
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null && timeLeft > 0) return;

    // Ensure countdown tick audio does not continue after submission.
    stopSound('timer-tick');
    setTimerTickPlayed(false);

    const question = questions[currentQuestion];
    const correct = selectedAnswer === question.content.correctAnswer;
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      playSound('correct');
      setScore(score + question.points);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      playSound('incorrect');
    }

    // Submit response
    if (attemptId) {
      try {
        await activityAttemptAPI.submitResponse({
          attempt_id: attemptId,
          item_id: question.id,
          response: {
            answer: selectedAnswer,
          },
          is_correct: correct,
          time_taken: timeTaken,
        });
      } catch (error) {
        console.error('Failed to submit response', error);
      }
    }

    // On timeout (no answer selected), require manual advancement
    const timedOut = selectedAnswer === null;
    if (timedOut) {
      setIsTimeout(true);
    } else {
      // Auto advance after 2 seconds
      setTimeout(() => {
        handleNextQuestion();
      }, 2000);
    }
  };

  const handleNextQuestion = () => {
    stopSound('timer-tick');
    if (currentQuestion < totalQuestions - 1) {
      const nextQuestion = questions[currentQuestion + 1];
      setTimeLeft(nextQuestion?.content.timeLimit || 30); // reset before showResult=false to prevent stale timeLeft===0 re-triggering handleSubmitAnswer
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    stopSound('timer-tick');
    stopAll();
    playSound('game-over');
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
    });
    setTimeout(() => {
      onComplete(score, timeTaken);
    }, 2000);
  };

  const resetGame = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setTimeLeft(30);
  };

  if (currentQuestion >= totalQuestions) {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    return (
      <VictoryCelebrationModal
        title="Quiz Complete!"
        activityTitle={activity.title || 'Multiple Choice Quiz'}
        score={score}
        timeTaken={timeTaken}
        totalQuestions={totalQuestions}
        onPlayAgain={resetGame}
        playAgainText="Play Again"
        onContinue={() => onComplete(score, timeTaken)}
        continueText="Back to Activities"
      />
    );
  }

  const question = questions[currentQuestion];

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
      <div className="px-4 py-3 sm:px-6 sm:py-3.5 flex flex-row justify-between items-center gap-3 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center shrink-0">
            <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-6 sm:h-7 w-auto object-contain" />
          </div>
          <div className="h-5 sm:h-6 w-px bg-white/25 hidden sm:block" />
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            Quiz
            <span className="text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full border border-white/20 font-bold uppercase tracking-wider">
              {currentQuestion + 1} / {totalQuestions}
            </span>
          </h2>
          <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 sm:p-2 hover:bg-white/10 text-white/80 hover:text-white rounded-full transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center bg-white/15 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-white border border-white/20 font-bold text-xs sm:text-base">
            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 fill-current" />
            <span>{score} EXP</span>
          </div>
          <div className="flex items-center bg-white/15 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-white border border-white/20 font-bold text-xs sm:text-base font-mono">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            <span className={timeLeft <= 5 ? 'animate-pulse text-red-300' : ''}>{timeLeft}s</span>
          </div>
          <Button variant="ghost" onClick={onCancel} className="hover:bg-white/10 text-white/80 hover:text-white p-1.5 sm:p-2 rounded-xl transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-slate-200 shrink-0">
        <div
          className="h-full bg-saBlue transition-all duration-500"
          style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 relative z-10 w-full">
        <div className="w-full max-w-7xl mx-auto py-2 sm:py-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 items-start">
              
              {/* Left Column: Instructions */}
              <div className="lg:col-span-1 order-1 lg:order-1 flex flex-col gap-4 self-stretch">
                <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col">
                  <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider">Instructions</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium flex-1">
                    {activity.instructions || "Read the question carefully and select the correct answer from the options below. Click 'Submit Answer' to confirm your response before the timer expires!"}
                  </p>
                </Card>
              </div>

              {/* Center Column: Question & Answers */}
              <div className="lg:col-span-2 order-2 flex flex-col gap-4 sm:gap-5 items-stretch min-h-0">
                {/* Question Card */}
                <Card className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col items-center justify-center min-h-[140px]">
                  {question.content.questionMedia && (
                    <div className="mb-4 flex justify-center w-full max-w-lg aspect-video max-h-[180px] sm:max-h-[220px] overflow-hidden rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                      <img src={question.content.questionMedia} alt="Question Reference" className="w-full h-full object-contain" />
                    </div>
                  )}
              {question.content.question && (
                <h3 className="text-base sm:text-xl font-extrabold text-slate-800 text-center leading-relaxed">
                  {question.content.question}
                </h3>
              )}
            </Card>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {question.content.options.map((option: string, index: number) => {
                const isSelected = selectedAnswer === index;
                const isCorrectOption = index === question.content.correctAnswer;

                let statusClass = "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/60 hover:border-slate-350 hover:scale-[1.01]";
                if (showResult) {
                  if (isCorrectOption) statusClass = "bg-emerald-50 border-emerald-300 text-emerald-700 font-bold scale-[1.02] shadow-sm";
                  else if (isSelected) statusClass = "bg-red-50 border-red-300 text-red-600 font-bold";
                  else statusClass = "opacity-40 cursor-not-allowed pointer-events-none bg-slate-50/40 text-slate-400";
                } else if (isSelected) {
                  statusClass = "bg-blue-50 border-saBlue text-saBlue scale-[1.02] shadow-sm font-bold";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                    className={`w-full min-h-[4.5rem] px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 text-left ${statusClass}`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                      isSelected ? 'bg-saBlue text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <div className="flex-1 min-w-0 flex flex-col">
                      {question.content.optionsMedia?.[index] && (
                        <div className="w-full aspect-video max-h-[140px] overflow-hidden mb-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                          <img src={question.content.optionsMedia[index]} alt={`Option ${String.fromCharCode(65 + index)}`} className="w-full h-full object-contain" />
                        </div>
                      )}
                      {option && <span className="text-sm font-semibold">{option}</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Submit Action Button */}
            {!showResult && (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className={`w-full py-4 text-sm font-black uppercase tracking-wider rounded-xl transition-all duration-300 ${
                  selectedAnswer !== null
                    ? 'bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-blue-500/20'
                    : 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-400 border border-slate-300'
                }`}
              >
                Submit Answer
              </Button>
            )}

            {showResult && isTimeout && (
              <Button
                onClick={handleNextQuestion}
                className="w-full bg-saBlue hover:bg-saBlueDarkHover text-white font-black uppercase tracking-wider rounded-xl py-4 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
              >
                Next Question <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Right Column: Question Tracker */}
          <div className="lg:col-span-1 order-3 lg:order-3 flex flex-col self-stretch">
            <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex-1 flex flex-col">
              <h3 className="text-xs font-black mb-3 text-saBlue uppercase tracking-wider">Question Progress</h3>
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 flex-1">
                {questions.map((_, i) => {
                  const isActive = i === currentQuestion;
                  const isCleared = i < currentQuestion;
                  return (
                    <div 
                      key={i} 
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        isActive 
                          ? 'bg-blue-50 border-blue-200 text-saBlue' 
                          : isCleared
                          ? 'bg-slate-50 border-slate-150 text-slate-400 line-through'
                          : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      <span>Question {i + 1}</span>
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

      {/* Result Popup Overlay */}
      {showResult && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className={`text-5xl sm:text-7xl font-black uppercase tracking-widest animate-bounce drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] ${
            isCorrect ? 'text-green-400' : 'text-red-400'
          }`}>
            {isCorrect ? 'Awesome!' : 'Oops!'}
          </div>
        </div>
      )}
    </div>
  );
}
