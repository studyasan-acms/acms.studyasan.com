import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, Award, FileText, BookOpen } from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePageTitle } from "@/hooks/usePageTitle";
import MathRenderer from "@/components/ui/MathRenderer";

export default function TestResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  usePageTitle(attempt ? `Test Results: ${attempt.test?.title || ""}` : "Test Results");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attemptId) {
      fetchAttempt();
    }
  }, [attemptId]);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getAttempt(parseInt(attemptId!));
      setAttempt(response.data);
    } catch (error) {
      console.error('Error fetching test attempt:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading results...</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <FileText className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Results not found</p>
        <Button variant="link" className="text-saBlue" onClick={() => navigate('/tests')}>Back to Tests</Button>
      </div>
    );
  }

  const percentage = attempt.score ? (attempt.score / attempt.total_marks) * 100 : 0;

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests/my-results')} className="text-gray-500 hover:text-saBlue">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Test Results</h1>
            <p className="text-gray-500 text-sm mt-0.5">{attempt.test?.title}</p>
          </div>
        </div>
      </div>

      {/* Practice Attempt Banner */}
      {attempt.is_practice && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-purple-800">Practice Attempt</p>
            <p className="text-sm text-purple-600">This was a practice attempt. Scores are not counted towards your official results.</p>
          </div>
        </div>
      )}

      {/* Score Banner */}
      <Card className="shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {!attempt.is_graded ? (
            <div className="text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-50 mb-4">
                <Clock className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Grading in Progress</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Your test is being reviewed by a teacher. Results will be available once grading is complete.
              </p>
            </div>
          ) : (
            <div className={`text-center py-10 px-6 ${attempt.is_passed ? 'bg-gradient-to-b from-green-50 to-white' : 'bg-gradient-to-b from-red-50 to-white'}`}>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${attempt.is_passed ? 'bg-green-100' : 'bg-red-100'} mb-4`}>
                {attempt.is_passed ? (
                  <CheckCircle className="w-10 h-10 text-green-500" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-500" />
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-1">
                {attempt.is_passed ? '🎉 Congratulations! You Passed' : 'You did not pass this time'}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {attempt.is_passed ? 'Great job on this test!' : "Keep practicing, you'll get there!"}
              </p>

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Your Score</p>
                  <p className="text-4xl font-extrabold text-gray-800 mt-1">{attempt.score || 0}</p>
                </div>
                <div className="text-3xl text-gray-300 font-light">/</div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Total Marks</p>
                  <p className="text-4xl font-extrabold text-gray-800 mt-1">{attempt.total_marks}</p>
                </div>
              </div>

              <div className="max-w-xs mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${attempt.is_passed ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-lg font-bold text-gray-700">{percentage.toFixed(1)}%</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Test</p>
              <p className="font-semibold text-gray-800 mt-1">{attempt.test?.title}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Submitted</p>
              <p className="font-semibold text-gray-800 mt-1">
                {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            {attempt.is_graded && attempt.grader && (
              <div className="text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Graded By</p>
                <p className="font-semibold text-gray-800 mt-1">{attempt.grader?.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Review */}
      {attempt.is_graded && attempt.answers && (
        <Card className="shadow-sm border border-gray-100 rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
            <CardTitle className="text-lg text-gray-800">Detailed Review</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {attempt.answers.map((answer, index) => (
                <div key={answer.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-bold text-gray-600 flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="font-medium text-gray-800">
                        <MathRenderer text={answer.question?.question_text || ''} />
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Badge variant={answer.is_correct ? 'default' : 'destructive'}>
                        {answer.marks_obtained || 0} / {answer.question?.marks} marks
                      </Badge>
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="ml-10 space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Your Answer</p>
                      {!answer.answer_text && !answer.answer_media_url ? (
                        <p className="text-sm text-gray-400 italic">Not answered</p>
                      ) : (
                        <>
                          {answer.answer_text && (
                            <p className="text-sm text-gray-700">
                              <MathRenderer text={answer.answer_text} />
                            </p>
                          )}
                          {answer.answer_media_url && answer.answer_media_type === 'image' && (
                            <img src={answer.answer_media_url} alt="Your answer" className="mt-2 max-w-md max-h-48 rounded border" />
                          )}
                        </>
                      )}
                    </div>

                    {answer.question?.question_type !== 'SHORT_ANSWER' && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Correct Answer</p>
                        <p className="text-sm text-green-700 font-medium">
                          <MathRenderer text={answer.question?.correct_answer || ''} />
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
