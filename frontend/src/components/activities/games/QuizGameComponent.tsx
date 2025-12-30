import { useState, useEffect } from 'react';
import { X, Trophy, Clock, Star, ChevronRight, Volume2, VolumeX } from 'lucide-react';
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

  const { playSound, stopSound, stopAll } = useSound();

  const questions = activity.items || [];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music', { loop: true, volume: 0.3 });
    } else {
      stopSound('bg-music');
    }
  }, [isMuted]);

  useEffect(() => {
    if (questions[currentQuestion]) {
      setTimeLeft(questions[currentQuestion].content.timeLimit || 30);
      setQuestionStartTime(Date.now());
      setTimerTickPlayed(false); // Reset timer tick sound for new question
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

    // Auto advance after 2 seconds
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
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

  if (currentQuestion >= totalQuestions) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a] overflow-hidden">
        {/* Animated Background Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />

        <Card className="gamified-card p-12 text-center max-w-lg w-full mx-4 floating">
          <div className="relative inline-block mb-8">
            <Trophy className="w-32 h-32 mx-auto text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full -z-10" />
          </div>
          <h2 className="text-5xl font-extrabold mb-4 text-white tracking-tight">Quiz Complete!</h2>
          <div className="space-y-4 mb-8">
            <p className="text-3xl font-bold text-blue-300">Final Score: {score}</p>
            <p className="text-blue-100/60 text-lg italic">
              "Great effort! You've conquered the challenge."
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-white/10 px-4 py-2 rounded-full font-bold text-blue-300 border border-white/10">
            {currentQuestion + 1} / {totalQuestions}
          </div>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center bg-yellow-400/10 px-4 py-2 rounded-full text-yellow-400 border border-yellow-400/20">
            <Star className="w-5 h-5 mr-2 fill-current" />
            <span className="font-bold text-lg">{score}</span>
          </div>
          <div className="flex items-center bg-blue-400/10 px-4 py-2 rounded-full text-blue-400 border border-blue-400/20">
            <Clock className="w-5 h-5 mr-2" />
            <span className={`font-bold text-lg ${timeLeft <= 5 ? 'animate-pulse text-red-400' : ''}`}>
              {timeLeft}s
            </span>
          </div>
          <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 rounded-full h-10 w-10 p-0">
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Progress Bar (at the top) */}
      <div className="h-1.5 w-full bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full space-y-8">
          {/* Question Section */}
          <div className="text-center space-y-6">
            <Card className="gamified-card p-8 md:p-12 mb-8">
              <h3 className="text-2xl md:text-4xl font-extrabold leading-tight tracking-tight">
                {question.content.question}
              </h3>
            </Card>
          </div>

          {/* Answers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {question.content.options.map((option: string, index: number) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === question.content.correctAnswer;

              let statusClass = "btn-3d-neutral";
              if (showResult) {
                if (isCorrectOption) statusClass = "btn-3d-success scale-105 z-10";
                else if (isSelected) statusClass = "btn-3d-danger grayscale-[0.5]";
                else statusClass = "opacity-40 grayscale pointer-events-none";
              } else if (isSelected) {
                statusClass = "btn-3d-primary scale-105 z-10 ring-4 ring-blue-400/30";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`btn-3d group min-h-[100px] flex items-center p-6 text-left transition-all duration-300 ${statusClass}`}
                >
                  <span className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center mr-4 font-bold text-xl group-hover:bg-black/20 shrink-0">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-xl md:text-2xl font-bold line-clamp-2">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Submission */}
      {!showResult && (
        <div className="p-6 bg-black/40 backdrop-blur-md border-t border-white/5 flex justify-center">
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
            className={`btn-3d max-w-md w-full py-4 text-2xl font-black uppercase tracking-widest transition-all duration-300 ${selectedAnswer !== null
              ? 'btn-3d-primary animate-pulse'
              : 'opacity-50 cursor-not-allowed bg-gray-700'
              }`}
          >
            Submit Answer
          </button>
        </div>
      )}

      {/* Result Popup Overlay */}
      {showResult && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className={`text-6xl md:text-9xl font-black uppercase tracking-tighter animate-bounce drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${isCorrect ? 'text-green-400' : 'text-red-500'
            }`}>
            {isCorrect ? 'Awesome!' : 'Oops!'}
          </div>
        </div>
      )}
    </div>
  );
}
