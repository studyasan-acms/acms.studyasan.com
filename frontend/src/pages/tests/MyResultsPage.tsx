import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, FileText, Calendar } from 'lucide-react';
import { testAttemptService, subjectService } from '@/services/api';
import type { TestAttempt, Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';

export default function MyResultsPage() {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchSubjects();
    fetchAttempts();
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const params: any = {};
      // For students, only fetch subjects they are enrolled in
      if (user?.role === 'STUDENT' && user?.id) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      
      const response = await testAttemptService.getMyAttempts(params);
      setAttempts(response.data);
    } catch (error) {
      console.error('Error fetching test attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (attempt: TestAttempt) => {
    return attempt.score ? ((attempt.score / attempt.total_marks) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Test Results</h1>
        <p className="text-gray-600 mt-1">View all your test attempts and results</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Filter by Subject</label>
              <select
                value={selectedSubject || ''}
                onChange={(e) => setSelectedSubject(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results List */}
      {loading ? (
        <div className="text-center py-12">Loading your results...</div>
      ) : attempts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No test attempts found</p>
            <Button onClick={() => navigate('/tests')} className="mt-4">
              Browse Available Tests
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => (
            <Card
              key={attempt.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/test-attempts/${attempt.id}/results`)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{attempt.test?.title}</h3>
                      {!attempt.is_graded ? (
                        <Badge className="bg-yellow-500">Pending Grading</Badge>
                      ) : attempt.is_passed ? (
                        <Badge className="bg-green-500">Passed</Badge>
                      ) : (
                        <Badge className="bg-red-500">Failed</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{attempt.test?.subject?.name}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                        <div>
                          <p className="text-xs text-gray-600">Submitted</p>
                          <p className="text-sm font-medium">
                            {attempt.submitted_at
                              ? new Date(attempt.submitted_at).toLocaleDateString()
                              : 'In Progress'}
                          </p>
                        </div>
                      </div>

                      {attempt.is_graded && (
                        <>
                          <div className="flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Score</p>
                              <p className="text-sm font-medium">
                                {attempt.score || 0} / {attempt.total_marks}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-gray-500" />
                            <div>
                              <p className="text-xs text-gray-600">Percentage</p>
                              <p className="text-sm font-medium">{getPercentage(attempt)}%</p>
                            </div>
                          </div>

                          <div className="flex items-center">
                            {attempt.is_passed ? (
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 mr-2 text-red-500" />
                            )}
                            <div>
                              <p className="text-xs text-gray-600">Result</p>
                              <p className={`text-sm font-medium ${attempt.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                                {attempt.is_passed ? 'Passed' : 'Failed'}
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                      {!attempt.is_graded && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                          <div>
                            <p className="text-xs text-gray-600">Status</p>
                            <p className="text-sm font-medium text-yellow-600">
                              Awaiting Grading
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {attempt.is_graded && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              attempt.is_passed ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${getPercentage(attempt)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Button variant="outline" onClick={() => navigate(`/test-attempts/${attempt.id}/results`)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
