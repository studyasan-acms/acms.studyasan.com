import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { testService, testAttemptService } from '@/services/api';
import type { Test, TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TestAttemptsListPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testId) {
      fetchTest();
      fetchAttempts();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      const response = await testService.getById(parseInt(testId!));
      setTest(response.data);
    } catch (error) {
      console.error('Error fetching test:', error);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getTestAttempts(parseInt(testId!));
      setAttempts(response.data);
    } catch (error) {
      console.error('Error fetching attempts:', error);
      alert('Failed to load attempts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
{/* Header */}
<div className="flex flex-col gap-3">
  <div
    onClick={() => navigate(`/tests/${testId}`)}
    className="inline-flex items-center text-sm sm:text-base text-blue-600 hover:underline cursor-pointer"
  >
    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
    Back to Test
  </div>

  <div>
    <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Test Attempts</h1>
    <p className="text-gray-400 mt-1 text-sm sm:text-base">
      View all student attempts for this test
    </p>
  </div>
</div>

<p className="text-gray-600 text-sm sm:text-base md:text-lg mb-6 font-semibold">{test?.title}</p>


      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading attempts...</div>
      ) : attempts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-600">
            No attempts yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => (
            <Card
              key={attempt.id}
              className="p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                {/* Student Info */}
                <div className="flex items-start sm:items-center gap-4 flex-1">
                  <User className="w-10 h-10 text-gray-400 flex-shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 w-full justify-between">
                    <div>
                      <p className="font-semibold text-sm sm:text-base">{attempt.student?.user.name}</p>
                      <p className="text-gray-600 text-xs sm:text-sm">{attempt.student?.user.email}</p>
                      <p className="text-gray-500 text-xs sm:text-sm">
                        Submitted: {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'In Progress'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attempt Info and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
                  {attempt.is_graded ? (
                    <div className="text-right">
                      <Badge variant={attempt.is_passed ? 'default' : 'destructive'}>
                        {attempt.score} / {attempt.total_marks}
                      </Badge>
                      <p className="text-gray-600 text-xs sm:text-sm mt-1">
                        {attempt.is_passed ? 'Passed' : 'Failed'}
                      </p>
                    </div>
                  ) : attempt.submitted_at ? (
                    <Badge variant="outline">Pending Grading</Badge>
                  ) : (
                    <Badge variant="outline">In Progress</Badge>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/test-attempts/${attempt.id}/grade`)}
                    disabled={!attempt.submitted_at}
                  >
                    {attempt.is_graded ? 'View' : 'Grade'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
