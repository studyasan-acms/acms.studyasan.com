import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (attemptId) {
      fetchAttempt();
      enterFullscreen();
    }

    return () => {
      exitFullscreen();
    };
  }, [attemptId]);

  // Timer
  useEffect(() => {
    if (!attempt || attempt.submitted_at) return;

    const startTime = new Date(attempt.started_at).getTime();
    const durationMs = attempt.test!.duration_minutes * 60 * 1000;

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, durationMs - elapsed);

      setTimeRemaining(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        handleSubmitTest();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt]);

  // Prevent leaving fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !attempt?.submitted_at) {
        alert('Please stay in fullscreen mode during the test');
        enterFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [attempt]);

  // Prevent context menu and copying
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventCopy = (e: ClipboardEvent) => e.preventDefault();

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('copy', preventCopy);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('copy', preventCopy);
    };
  }, []);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error('Error entering fullscreen:', err);
    });
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
  };

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getAttempt(parseInt(attemptId!));
      setAttempt(response.data);

      // Load existing answers
      const existingAnswers: { [key: number]: string } = {};
      response.data.answers?.forEach((answer) => {
        if (answer.answer_text) {
          existingAnswers[answer.question_id] = answer.answer_text;
        }
      });
      setAnswers(existingAnswers);
    } catch (error) {
      console.error('Error fetching test attempt:', error);
      alert('Failed to load test');
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (questionId: number, answerText: string) => {
    setAnswers({ ...answers, [questionId]: answerText });

    // Auto-save answer
    try {
      await testAttemptService.submitAnswer(parseInt(attemptId!), {
        question_id: questionId,
        answer_text: answerText,
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleSubmitTest = async () => {
    if (!confirm('Are you sure you want to submit the test? You cannot change answers after submission.')) {
      return;
    }

    try {
      await testAttemptService.submitTest(parseInt(attemptId!));
      exitFullscreen();
      navigate(`/test-attempts/${attemptId}/results`);
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading test...</div>;
  }

  if (!attempt || !attempt.test?.questions) {
    return <div className="p-6 text-center">Test not found</div>;
  }

  if (attempt.submitted_at) {
    return (
      <div className="p-6 text-center">
        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Test Submitted</h2>
        <p className="text-gray-600 mb-4">Your test has been submitted successfully</p>
        <Button onClick={() => navigate(`/test-attempts/${attemptId}/results`)}>
          View Results
        </Button>
      </div>
    );
  }

  const questions = attempt.test.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header with timer */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{attempt.test.title}</h1>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-700'}`}>
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-lg font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
            {timeRemaining < 300 && (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-4xl mx-auto mt-24">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">
                Question {currentQuestionIndex + 1}
              </CardTitle>
              <Badge>{currentQuestion.marks} marks</Badge>
            </div>
            <p className="text-sm text-gray-600">
              Type: {currentQuestion.question_type.replace('_', ' ')}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{currentQuestion.question_text}</p>

            {/* MCQ Options */}
            {currentQuestion.question_type === 'MCQ' && currentQuestion.options && (
              <div className="space-y-3">
                {(currentQuestion.options as string[]).map((option, index) => (
                  <label
                    key={index}
                    className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="mr-3"
                    />
                    <span>
                      {String.fromCharCode(65 + index)}. {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* True/False */}
            {currentQuestion.question_type === 'TRUE_FALSE' && (
              <div className="space-y-3">
                {['True', 'False'].map((option) => (
                  <label
                    key={option}
                    className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={answers[currentQuestion.id] === option}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      className="mr-3"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Short Answer */}
            {currentQuestion.question_type === 'SHORT_ANSWER' && (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                className="w-full p-4 border rounded-lg min-h-[150px]"
                placeholder="Type your answer here..."
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-full ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers[questions[index].id]
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex === questions.length - 1 ? (
            <Button onClick={handleSubmitTest}>Submit Test</Button>
          ) : (
            <Button
              onClick={() =>
                setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))
              }
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
