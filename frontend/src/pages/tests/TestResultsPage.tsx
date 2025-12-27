import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
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
      alert('Failed to load results');
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading results...</div>;
  }

  if (!attempt) {
    return <div className="p-6 text-center">Results not found</div>;
  }

  const percentage = attempt.score ? (attempt.score / attempt.total_marks) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Button variant="ghost" onClick={() => navigate('/tests')} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tests
      </Button>

      <h1 className="text-3xl font-bold mb-6">Test Results</h1>

      {/* Overall Result */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {!attempt.is_graded ? (
            <div className="text-center py-8">
              <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Grading in Progress</h3>
              <p className="text-gray-600">
                Your test is being reviewed. Results will be available once grading is complete.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              {attempt.is_passed ? (
                <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              ) : (
                <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              )}
              <h3 className="text-2xl font-bold mb-2">
                {attempt.is_passed ? 'Congratulations! You Passed' : 'You did not pass'}
              </h3>
              <div className="flex items-center justify-center gap-8 mt-6">
                <div>
                  <p className="text-sm text-gray-600">Your Score</p>
                  <p className="text-3xl font-bold">{attempt.score || 0}</p>
                </div>
                <div className="text-4xl text-gray-300">/</div>
                <div>
                  <p className="text-sm text-gray-600">Total Marks</p>
                  <p className="text-3xl font-bold">{attempt.total_marks}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${
                      attempt.is_passed ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-lg font-semibold mt-2">{percentage.toFixed(1)}%</p>
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Test</p>
              <p className="font-semibold">{attempt.test?.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Submitted</p>
              <p className="font-semibold">
                {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            {attempt.is_graded && attempt.graded_by && (
              <div>
                <p className="text-sm text-gray-600">Graded By</p>
                <p className="font-semibold">{attempt.grader?.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Answers (only if graded) */}
      {attempt.is_graded && attempt.answers && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {attempt.answers.map((answer, index) => (
                <div key={answer.id} className="border-b pb-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">
                      {index + 1}. {answer.question?.question_text}
                    </p>
                    <div className="flex items-center gap-2">
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

                  <div className="ml-4 space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Your Answer:</p>
                      <p className="text-sm">{answer.answer_text || 'Not answered'}</p>
                    </div>

                    {answer.question?.question_type !== 'SHORT_ANSWER' && (
                      <div>
                        <p className="text-sm font-medium text-green-600">Correct Answer:</p>
                        <p className="text-sm text-green-600">{answer.question?.correct_answer}</p>
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
