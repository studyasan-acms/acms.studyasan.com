import { useState, useEffect } from 'react';
import { X, Trophy, Star, CheckCircle, XCircle, Volume2, VolumeX } from 'lucide-react';
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
  // Live mode props
  isLive?: boolean;
  onAnswerSubmit?: (answer: boolean, timeTaken: number) => void;
  currentQuestionIndex?: number;
}

export default function TrueFalseGame({ activity, attemptId, onComplete, onCancel, isLive, onAnswerSubmit, currentQuestionIndex }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [startTime] = useState(Date.now());
  const [isMuted, setIsMuted] = useState(false);

  const { playSound, stopSound, stopAll } = useSound();

  useEffect(() => {
    if (!isMuted) {
      playSound('bg-music', { loop: true, volume: 0.3 });
    } else {
      stopSound('bg-music');
    }
    return () => stopAll();
  }, [isMuted]);

  const questions = activity.items || [];
  const activeQuestionIndex = isLive ? (currentQuestionIndex ?? 0) : currentQuestion;

  console.log('TrueFalseGame Debug:');
  console.log('activity:', activity);
  console.log('questions:', questions);
  console.log('questions.length:', questions.length);
  console.log('activeQuestionIndex:', activeQuestionIndex);
  console.log('isLive:', isLive);
  console.log('currentQuestionIndex:', currentQuestionIndex);

  const handleAnswer = async (answer: boolean) => {
    const question = questions[activeQuestionIndex];
    const correct = answer === question.content.correctAnswer;

    setSelectedAnswer(answer);
    setShowResult(true);

    if (correct) {
      setScore(score + question.points);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      playSound('correct');
    } else {
      playSound('incorrect');
    }

    // Submit response
    if (attemptId) {
      try {
        await activityAttemptAPI.submitResponse({
          attempt_id: attemptId,
          item_id: question.id,
          response: { answer },
          is_correct: correct,
        });
      } catch (error) {
        console.error('Failed to submit response', error);
      }
    }

    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    if (isLive && onAnswerSubmit) {
      // In live mode, let the parent component handle advancement
      onAnswerSubmit(answer, timeTaken);
    } else {
      // In regular mode, auto-advance after delay
      setTimeout(() => {
        if (currentQuestion < questions.length - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setShowResult(false);
          setSelectedAnswer(null);
        } else {
          onComplete(score + (correct ? question.points : 0), timeTaken);
        }
      }, 1500);
    }
  };

  if (activeQuestionIndex < 0 || activeQuestionIndex >= questions.length) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
        </div>

        {/* Header */}
        <div className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
          <h2 className="text-2xl font-bold text-white">
            {activity.title}
          </h2>
          {isLive && (
            <div className="bg-green-500/20 px-4 py-2 rounded-full font-bold text-green-400 border border-green-500/30">
              LIVE
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="gamified-card p-12 text-center max-w-lg w-full mx-4 floating">
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center animate-pulse">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400"></div>
              </div>
              <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full -z-10" />
            </div>
            <h2 className="text-4xl font-extrabold mb-4 text-white tracking-tight">
              Question content loading...
            </h2>
            <p className="text-slate-400 text-sm">
              Waiting for the next question from the teacher.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const question = questions[activeQuestionIndex];

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full -z-10">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <div className="p-6 flex justify-between items-center bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            {activity.title}
          </h2>
          <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
          {!isLive && (
            <div className="bg-white/10 px-4 py-2 rounded-full font-bold text-blue-300 border border-white/10">
              {currentQuestion + 1} / {questions.length}
            </div>
          )}
          {isLive && (
            <div className="bg-green-500/20 px-4 py-2 rounded-full font-bold text-green-400 border border-green-500/30">
              LIVE
            </div>
          )}
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center bg-yellow-400/10 px-6 py-2 rounded-full text-yellow-400 border border-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
            <Star className="w-6 h-6 mr-3 fill-current animate-pulse" />
            <span className="font-bold text-xl">{score}</span>
          </div>
          <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <X className="w-8 h-8" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {!isLive && (
        <div className="h-1.5 w-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            style={{ width: `${questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full space-y-8">
          {/* Question Section */}
          <div className="text-center space-y-6">
            <Card className="gamified-card p-8 md:p-12 mb-8">
              <h3 className="text-2xl md:text-4xl font-extrabold leading-tight tracking-tight">
                {question.content.statement}
              </h3>
            </Card>
          </div>

          {/* Answer Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            <button
              onClick={() => handleAnswer(true)}
              disabled={showResult}
              className={`btn-3d group min-h-[120px] flex items-center justify-center p-6 text-left transition-all duration-300 ${
                showResult && selectedAnswer === true
                  ? question.content.correctAnswer === true
                    ? 'btn-3d-success scale-105 z-10'
                    : 'btn-3d-danger grayscale-[0.5]'
                  : 'btn-3d-success hover:scale-102'
              }`}
            >
              <span className="text-3xl md:text-4xl font-black uppercase tracking-widest">TRUE</span>
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={showResult}
              className={`btn-3d group min-h-[120px] flex items-center justify-center p-6 text-left transition-all duration-300 ${
                showResult && selectedAnswer === false
                  ? question.content.correctAnswer === false
                    ? 'btn-3d-success scale-105 z-10'
                    : 'btn-3d-danger grayscale-[0.5]'
                  : 'btn-3d-danger hover:scale-102'
              }`}
            >
              <span className="text-3xl md:text-4xl font-black uppercase tracking-widest">FALSE</span>
            </button>
          </div>

          {/* Result Feedback */}
          {showResult && (
            <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className={`text-6xl md:text-9xl font-black uppercase tracking-tighter animate-bounce drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${
                selectedAnswer === question.content.correctAnswer ? 'text-green-400' : 'text-red-500'
              }`}>
                {selectedAnswer === question.content.correctAnswer ? (
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-16 h-16 md:w-24 md:h-24" />
                    <span>Correct!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <XCircle className="w-16 h-16 md:w-24 md:h-24" />
                    <span>Wrong!</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
