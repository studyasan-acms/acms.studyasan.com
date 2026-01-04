import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MediaUpload from '@/components/ui/MediaUpload';
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TestAttemptPage() {

  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  usePageTitle(attempt ? `Test Attempt: ${attempt.test?.title || ""}` : "Test Attempt");
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [answerMediaFiles, setAnswerMediaFiles] = useState<{ [questionId: number]: File | null }>({});
  const [answerMediaUrls, setAnswerMediaUrls] = useState<{ [questionId: number]: string | null }>({});
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

      // Load existing answers and media
      const existingAnswers: { [key: number]: string } = {};
      const existingMediaUrls: { [key: number]: string | null } = {};
      response.data.answers?.forEach((answer) => {
        if (answer.answer_text) {
          existingAnswers[answer.question_id] = answer.answer_text;
        }
        if (answer.answer_media_url) {
          existingMediaUrls[answer.question_id] = answer.answer_media_url;
        }
      });
      setAnswers(existingAnswers);
      setAnswerMediaUrls(existingMediaUrls);
    } catch (error) {
      console.error('Error fetching test attempt:', error);
      alert('Failed to load test');
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (questionId: number, answerText: string, mediaFile?: File | null, mediaUrl?: string | null) => {
    setAnswers({ ...answers, [questionId]: answerText });

    // Auto-save answer
    try {
      if (mediaFile || mediaUrl) {
        const formData = new FormData();
        formData.append("question_id", questionId.toString());
        formData.append("answer_text", answerText || "");

        if (mediaFile) {
          formData.append("answer_media", mediaFile);
          setAnswerMediaFiles({ ...answerMediaFiles, [questionId]: mediaFile });
        } else if (mediaUrl) {
          formData.append("answer_media_url", mediaUrl);
          setAnswerMediaUrls({ ...answerMediaUrls, [questionId]: mediaUrl });
        }

        await testAttemptService.submitAnswerWithMedia(parseInt(attemptId!), formData);
      } else {
        await testAttemptService.submitAnswer(parseInt(attemptId!), {
          question_id: questionId,
          answer_text: answerText,
        });
      }
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
            <p className="text-lg mb-4">{currentQuestion.question_text}</p>

            {/* Question Media Display */}
            {currentQuestion.media_url && (
              <div className="mb-6 border rounded-lg p-3 bg-gray-50">
                {currentQuestion.media_type === 'image' && (
                  <img
                    src={currentQuestion.media_url}
                    alt="Question"
                    className="max-w-full max-h-96 mx-auto rounded"
                  />
                )}
                {currentQuestion.media_type === 'pdf' && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="font-medium">PDF Document</p>
                      <a
                        href={currentQuestion.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View PDF
                      </a>
                    </div>
                  </div>
                )}
                {currentQuestion.media_type === 'video' && (
                  <video
                    src={currentQuestion.media_url}
                    controls
                    className="max-w-full max-h-96 mx-auto rounded"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>
            )}

            {/* MCQ Options */}
            {currentQuestion.question_type === 'MCQ' && currentQuestion.options && (
              <div className="space-y-3">
                {(currentQuestion.options as any[]).map((option, index) => {
                  const optionText = typeof option === 'string' ? option : option.text;
                  const optionMediaUrl = typeof option === 'object' ? option.media_url : null;
                  const optionMediaType = typeof option === 'object' ? option.media_type : null;
                  const optionLetter = String.fromCharCode(65 + index);
                  // Use option text if available, otherwise use letter for image-only options
                  const optionValue = optionText || optionLetter;

                  return (
                    <label
                      key={index}
                      className="flex flex-col p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={optionValue}
                          checked={answers[currentQuestion.id] === optionValue}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="mr-3"
                        />
                        <span>
                          {optionLetter}. {optionText}
                        </span>
                      </div>

                      {/* Option Media */}
                      {optionMediaUrl && (
                        <div className="ml-8 mt-2">
                          {optionMediaType === 'image' && (
                            <img
                              src={optionMediaUrl}
                              alt={`Option ${optionLetter}`}
                              className="max-w-xs max-h-32 rounded border"
                            />
                          )}
                        </div>
                      )}
                    </label>
                  );
                })}
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

            {/* Short Answer / Long Answer - with text and media upload */}
            {(currentQuestion.question_type === 'SHORT_ANSWER' || currentQuestion.question_type === 'LONG_ANSWER') && (
              <div className="space-y-4">
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full p-4 border rounded-lg min-h-[150px]"
                  placeholder="Type your answer here..."
                />

                <MediaUpload
                  label="Upload Answer Media (Optional)"
                  value={answerMediaUrls[currentQuestion.id]}
                  onChange={(file, url) => {
                    if (file || url) {
                      handleAnswerChange(currentQuestion.id, answers[currentQuestion.id] || '', file, url);
                    }
                  }}
                  acceptTypes="image/*,application/pdf"
                  maxSize={10}
                />
              </div>
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
                className={`w-10 h-10 rounded-full ${index === currentQuestionIndex
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
