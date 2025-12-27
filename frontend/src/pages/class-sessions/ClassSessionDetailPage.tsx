import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Video, MapPin, Clock, Calendar, Users, RefreshCw, User, ExternalLink, ArrowLeft } from 'lucide-react';
import { classSessionService } from '@/services/api';
import type { ClassSession } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';

export default function ClassSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [joinReason, setJoinReason] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const canManage = isAdmin || isTeacher;

  const fetchSession = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await classSessionService.getById(parseInt(id));
      setSession(response.data);

      // Check if user can join
      const joinResponse = await classSessionService.canJoin(parseInt(id));
      setCanJoin(joinResponse.data.canJoin);
      setJoinReason(joinResponse.data.reason);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const getSessionStatus = () => {
    if (!session) return { label: 'Unknown', color: 'bg-gray-500' };

    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const fifteenMinsBefore = new Date(start.getTime() - 15 * 60 * 1000);

    if (now >= fifteenMinsBefore && now <= end) {
      return { label: 'Live Now', color: 'bg-green-500' };
    }
    if (now < start) {
      return { label: 'Upcoming', color: 'bg-blue-500' };
    }
    return { label: 'Ended', color: 'bg-gray-500' };
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDuration = () => {
    if (!session) return '';
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} minutes`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const formatRecurrenceRule = () => {
    if (!session?.recurrence_rule) return null;
    const rule = session.recurrence_rule;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let text = '';
    if (rule.frequency === 'daily') {
      text = rule.interval === 1 ? 'Every day' : `Every ${rule.interval} days`;
    } else if (rule.frequency === 'weekly') {
      const days = rule.daysOfWeek?.map((d: number) => dayNames[d]).join(', ') || '';
      text = rule.interval === 1 ? `Weekly on ${days}` : `Every ${rule.interval} weeks on ${days}`;
    } else if (rule.frequency === 'monthly') {
      text = rule.interval === 1 ? 'Monthly' : `Every ${rule.interval} months`;
    }

    if (rule.endDate) {
      text += ` until ${new Date(rule.endDate).toLocaleDateString()}`;
    } else if (rule.count) {
      text += ` (${rule.count} occurrences)`;
    }

    return text;
  };

  const handleJoin = () => {
    if (session?.meeting_link) {
      window.open(session.meeting_link, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    try {
      await classSessionService.delete(session.id);
      navigate('/dashboard/class-sessions');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading session details...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Session not found</p>
        <Link to="/dashboard/class-sessions">
          <Button>Back to Sessions</Button>
        </Link>
      </div>
    );
  }

  const status = getSessionStatus();

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/dashboard/class-sessions"
        className="inline-flex items-center mb-4 text-saBlue font-medium hover:underline"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sessions
      </Link>

      {/* Main Card */}
      <Card className="shadow-lg rounded-2xl overflow-hidden">
        {/* Header */}
        <div className={`${session.mode === 'ONLINE' ? 'bg-saBlueLight/60' : 'bg-saBlueLight/60'} p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              {session.mode === 'ONLINE' ? (
                <div className="p-3 bg-saBlue/20 rounded-full">
                  <Video className="w-8 h-8 text-saBlue" />
                </div>
              ) : (
                <div className="p-3 bg-saBlue/20 rounded-full">
                  <MapPin className="w-8 h-8 text-saBlue" />
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                  {session.subject?.name || 'Class Session'}
                </h1>
                <p className="text-gray-600">
                  {session.mode === 'ONLINE' ? 'Online Session' : 'In-Person Session'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <Badge className={`${status.color} text-white px-3 py-1`}>
                {status.label}
              </Badge>
              {session.is_recurring && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Recurring
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Join Section */}
          {session.mode === 'ONLINE' && (
            <div className={`p-4 rounded-lg ${canJoin ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              {canJoin ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-green-800">Class is now accessible!</p>
                    <p className="text-sm text-green-600">You can join the meeting now.</p>
                  </div>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                    onClick={handleJoin}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Join Meeting
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-600">
                  <p className="font-medium">{joinReason || 'Meeting not available yet'}</p>
                  <p className="text-sm mt-1">The meeting link will become available 15 minutes before the scheduled time.</p>
                </div>
              )}
            </div>
          )}

          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Schedule</h3>
              
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-saBlue/50 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-600">Start Time</p>
                  <p className="text-gray-600 text-sm">{formatDateTime(session.start_time)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-saBlue/50 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-600">End Time</p>
                  <p className="text-gray-600 text-sm">{formatDateTime(session.end_time)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-saBlue/50 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-600">Duration</p>
                  <p className="text-gray-600 text-sm">{getDuration()}</p>
                </div>
              </div>

              {session.is_recurring && session.recurrence_rule && (
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-600">Recurrence</p>
                    <p className="text-gray-600 text-sm">{formatRecurrenceRule()}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 border-b pb-2">Details</h3>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-saBlue/50 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-600">Teacher</p>
                  <p className="text-gray-600 text-sm">{session.teacher?.user?.name || 'Not assigned'}</p>
                  {session.teacher?.user?.email && (
                    <p className="text-gray-400 text-xs">{session.teacher.user.email}</p>
                  )}
                </div>
              </div>

              {session.class && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-600">Class</p>
                    <p className="text-gray-600 text-sm">{session.class.name}</p>
                  </div>
                </div>
              )}

              {session.board && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-600">Board</p>
                    <p className="text-gray-600 text-sm">{session.board.name}</p>
                  </div>
                </div>
              )}

              {session.mode === 'OFFLINE' && session.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-600">Location</p>
                    <p className="text-gray-600 text-sm">{session.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-saBlue/50 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-600">Attendees</p>
                  <p className="text-gray-600 text-sm">{session._count?.attendances || 0} joined</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendees List (if available) */}
          {session.attendances && session.attendances.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 border-b pb-2 mb-4">Attendance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {session.attendances.map((attendance) => (
                  <div key={attendance.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-saBlueLight rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-saBlue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{attendance.user?.name}</p>
                      <p className="text-xs text-gray-500">{attendance.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

           {/* Actions */}
          {canManage && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/dashboard/class-sessions/${session.id}/edit`)}
              >
                Edit Session
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setDeleteModalOpen(true)}
              >
                Delete Session
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        title="Delete Class Session"
        message={`Are you sure you want to delete "${session.subject?.name || 'this session'}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          handleDelete();
          setDeleteModalOpen(false);
        }}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}