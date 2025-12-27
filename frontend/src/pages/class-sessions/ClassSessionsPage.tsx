import { useState, useEffect, useCallback } from 'react';
import {  useNavigate } from 'react-router-dom';
import { Plus, Video, MapPin, Clock, Calendar, Users, RefreshCw, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { classSessionService, subjectService, teacherService } from '@/services/api';
import type { ClassSession, Subject, Teacher } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';

interface SessionParams {
  subject_id?: number;
  teacher_id?: number;
  mode?: 'ONLINE' | 'OFFLINE';
}

export default function ClassSessionsPage() {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<'ONLINE' | 'OFFLINE' | ''>('');
  const [viewMode, setViewMode] = useState<'all' | 'upcoming' | 'past' | 'today' | 'week'>('upcoming');
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ [key: string]: ClassSession[] } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';
  const canManage = isAdmin || isTeacher;

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null);

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await subjectService.getAll();
      setSubjects(response.data.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const response = await teacherService.getAll();
      setTeachers(response.data.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      let data: ClassSession[] = [];

      const params: SessionParams = {};
      if (selectedSubject) params.subject_id = selectedSubject;
      if (selectedTeacher) params.teacher_id = selectedTeacher;
      if (selectedMode) params.mode = selectedMode as 'ONLINE' | 'OFFLINE';

      switch (viewMode) {
        case 'upcoming': {
          const upcomingRes = await classSessionService.getUpcoming(params);
          data = upcomingRes.data;
          break;
        }
        case 'past': {
          const pastRes = await classSessionService.getPast(params);
          data = pastRes.data;
          break;
        }
        case 'today': {
          const todayRes = await classSessionService.getToday();
          data = todayRes.data;
          break;
        }
        case 'week': {
          const weekRes = await classSessionService.getWeeklySchedule({ week_offset: weekOffset });
          setWeeklyData(weekRes.data.sessions);
          setLoading(false);
          return;
        }
        default: {
          if (isStudent) {
            const myRes = await classSessionService.getMySchedule(params);
            data = myRes.data.data;
          } else {
            const allRes = await classSessionService.getAll(params);
            data = allRes.data.data;
          }
        }
      }

      setSessions(data);
      setWeeklyData(null);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedSubject, selectedTeacher, selectedMode, weekOffset, isStudent]);

  useEffect(() => {
    fetchSubjects();
    if (isAdmin) fetchTeachers();
  }, [fetchSubjects, fetchTeachers, isAdmin]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const getSessionStatus = (session: ClassSession) => {
    const now = new Date();
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const fifteenMinsBefore = new Date(start.getTime() - 15 * 60 * 1000);

    if (now >= fifteenMinsBefore && now <= end) {
      return { label: 'Live Now', color: 'bg-green-500', canJoin: true };
    }
    if (now < start) {
      return { label: 'Upcoming', color: 'bg-blue-500', canJoin: false };
    }
    return { label: 'Ended', color: 'bg-gray-500', canJoin: false };
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleDeleteSession = (session: ClassSession) => {
    setSessionToDelete(session);
    setDeleteModalOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      await classSessionService.delete(sessionToDelete.id);
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    } finally {
      setDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleJoinSession = async (session: ClassSession) => {
    if (session.mode === 'ONLINE' && session.meeting_link) {
      window.open(session.meeting_link, '_blank');
    } else {
      navigate(`/dashboard/class-sessions/${session.id}`);
    }
  };

const renderSessionCard = (session: ClassSession) => {
  const status = getSessionStatus(session);
  return (
    <Card
      key={session.id}
      className="shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col"
    >
      <div className={`relative ${session.mode === 'ONLINE' ? 'bg-saBlueLight/60' : 'bg-saBlueLight/60'} text-gray-600 p-4 sm:p-5`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {session.mode === 'ONLINE' ? <Video className="w-5 h-5 text-saBlue/50" /> : <BookOpen className="w-5 h-5 text-saVividOrange" />}
            <CardTitle className="text-md sm:text-lg font-semibold">
              {session.subject?.name || 'Class Session'}
            </CardTitle>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={`text-white text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
              {status.label}
            </Badge>
            {session.is_recurring && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Recurring
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs sm:text-sm mt-1 opacity-80">
          by {session.teacher?.user?.name || 'Unknown Teacher'}
        </p>
      </div>

      <CardContent className="bg-gray-100 rounded-b-2xl pt-6 p-4 sm:p-5 space-y-3 text-gray-700 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-saBlue/50" />
            <span>{formatDate(session.start_time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-saBlue/50" />
            <span>{formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
          </div>
          {session.class && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-saBlue/50" />
              <span>Class {session.class.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-saBlue/50" />
            <span>{session._count?.attendances || 0} Attendees</span>
          </div>
        </div>

        {session.mode === 'OFFLINE' && session.location && (
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {session.location}
          </p>
        )}

        <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row gap-2">
          {/* View Button */}
          <Button
            size="sm"
            variant={'outline'}
            className="text-gray-600 flex-1 border"
            onClick={() => handleJoinSession(session)}
          >
            View
          </Button>

          {/* Online Join button */}
          {status.canJoin && session.mode === 'ONLINE' && session.meeting_link && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              onClick={(e) => {
                e.stopPropagation();
                handleJoinSession(session);
              }}
            >
              <Video className="w-4 h-4 mr-2" />
              Join Now
            </Button>
          )}

          {/* Edit/Delete for Admin/Teacher */}
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/dashboard/class-sessions/${session.id}/edit`);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(session);
                }}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


  const renderWeeklyView = () => {
    if (!weeklyData) return null;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((prev) => prev - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous Week
          </Button>
          <span className="font-medium">
            {weekOffset === 0 ? 'This Week' : weekOffset > 0 ? `${weekOffset} week(s) ahead` : `${Math.abs(weekOffset)} week(s) ago`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((prev) => prev + 1)}
          >
            Next Week <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {days.map((day) => (
            <div key={day} className="bg-white rounded-lg shadow p-3">
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">{day}</h3>
              {weeklyData[day]?.length > 0 ? (
                <div className="space-y-2">
                  {weeklyData[day].map((session) => {
                    const status = getSessionStatus(session);
                    return (
                      <div
                        key={session.id}
                        className={`p-2 rounded cursor-pointer hover:bg-gray-50 border-l-4 ${
                          status.label === 'Live Now' ? 'border-green-500 bg-green-50' :
                          status.label === 'Upcoming' ? 'border-blue-500' : 'border-gray-300'
                        }`}
                        onClick={() => navigate(`/dashboard/class-sessions/${session.id}`)}
                      >
                        <p className="font-medium text-sm text-gray-800">{session.subject?.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatTime(session.start_time)} - {formatTime(session.end_time)}
                        </p>
                        <p className="text-xs text-gray-400">{session.teacher?.user?.name}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">No classes</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Class Sessions</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            {isStudent ? 'View your scheduled classes' : 'Manage and schedule class sessions'}
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-saBlue hover:bg-saBlueDarkHover text-white w-full sm:w-auto flex items-center justify-center"
            onClick={() => navigate('/dashboard/class-sessions/create')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Class
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {['upcoming', 'today', 'week', 'all', 'past'].map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'outline'}
            size="sm"
            className={viewMode === mode ? 'bg-saBlue text-white' : ''}
            onClick={() => {
              setViewMode(mode as typeof viewMode);
              setWeekOffset(0);
            }}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Button>
        ))}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-600">Subject</label>
              <select
                value={selectedSubject || ''}
                onChange={(e) => setSelectedSubject(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600">Teacher</label>
                <select
                  value={selectedTeacher || ''}
                  onChange={(e) => setSelectedTeacher(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="">All Teachers</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-600">Mode</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as typeof selectedMode)}
                className="w-full p-2 border rounded-md text-sm"
              >
                <option value="">All Modes</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading sessions...</div>
      ) : viewMode === 'week' ? (
        renderWeeklyView()
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No class sessions found</p>
            {canManage && (
              <Button
                className="bg-saBlue hover:bg-saBlueDarkHover text-white mt-2"
                onClick={() => navigate('/dashboard/class-sessions/create')}
              >
                Schedule Your First Class
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sessions.map(renderSessionCard)}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        title="Delete Class Session"
        message={`Are you sure you want to delete the session "${sessionToDelete?.subject?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteSession}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
      />
    </div>
  );
}
