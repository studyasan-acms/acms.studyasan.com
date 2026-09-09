import { useState, useEffect } from 'react';
import { X, Trophy, Clock, User, Star } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import type { Activity, ActivityAttempt } from '../../../types/activity';
import { activityAttemptAPI } from '../../../services/activity.service';
import { useAuthStore } from '../../../store/authStore';
import { toast } from 'sonner';

interface Props {
  activity: Activity;
  onClose: () => void;
}

export default function ActivityAttemptsModal({ activity, onClose }: Props) {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER';
  const [attempts, setAttempts] = useState<ActivityAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
  }, [activity.id]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await activityAttemptAPI.getByActivity(activity.id, {
        is_completed: true,
      });
      setAttempts(response.data.data.attempts || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch attempts');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{activity.title}</h2>
              <p className="text-purple-100">Student Attempts & Scores</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              <span>Total Attempts: {attempts.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>
                Unique Students:{' '}
                {new Set(attempts.map((a) => a.student_id)).size}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No Attempts Yet
              </h3>
              <p className="text-gray-500">
                No students have completed this activity yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 rounded-lg font-semibold text-sm text-gray-700">
                <div className="col-span-3">Student</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Percentage</div>
                <div className="col-span-2 text-center">Time Taken</div>
                <div className="col-span-3 text-center">Completed At</div>
              </div>

              {/* Table Rows */}
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="grid grid-cols-12 gap-4 px-4 py-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                      {attempt.student?.user?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {attempt.student?.user?.name || `Student #${attempt.student_id}`}
                      </p>
                      {!isTeacher && attempt.student?.user?.email && (
                        <p className="text-xs text-gray-500">
                          {attempt.student.user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <span
                      className={`text-lg font-bold ${getScoreColor(
                        attempt.score,
                        attempt.max_score
                      )}`}
                    >
                      {Math.round(attempt.score)} / {attempt.max_score}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">
                        {Math.round((attempt.score / attempt.max_score) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      {formatDuration(attempt.time_taken || 0)}
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center justify-center text-sm text-gray-600">
                    {formatDate(attempt.completed_at || attempt.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {attempts.length > 0 && (
                <>
                  Average Score:{' '}
                  <span className="font-semibold text-gray-800">
                    {Math.round(
                      attempts.reduce((sum, a) => sum + (a.score / a.max_score) * 100, 0) /
                        attempts.length
                    )}
                    %
                  </span>
                </>
              )}
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
