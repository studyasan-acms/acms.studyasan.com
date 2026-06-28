import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Video, MapPin, Clock, Calendar, Users, RefreshCw, ChevronLeft, ChevronRight, BookOpen, Trash2 } from 'lucide-react';
import { classSessionService, subjectService, teacherService } from '@/services/api';
import type { ClassSession, Subject, Teacher } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from '@/hooks/usePermissions';

interface SessionParams {
  subject_id?: number;
  teacher_id?: number;
  mode?: 'ONLINE' | 'OFFLINE';
}

const MAX_SESSION_DURATION_HOURS = 8;

export default function ClassSessionsPage() {
  usePageTitle("Class Sessions");
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedMode, setSelectedMode] = useState<'ONLINE' | 'OFFLINE' | ''>('');
  const [viewMode, setViewMode] = useState<'all' | 'upcoming' | 'past' | 'today' | 'week'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ [key: string]: ClassSession[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [now, setNow] = useState<Date>(new Date());
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';
  const { canCreate, canUpdate, canDelete } = usePermissions();
  const canManage = isAdmin || isTeacher;
  const canAddSession = isAdmin || canCreate('classSessions');
  const canEditSession = isAdmin || canUpdate('classSessions');
  const canDeleteSession = isAdmin || canDelete('classSessions');

  const findBoardNameForSubject = (subjectId: number) => {
    const fromSessions = sessions.find((session) => session.subject_id === subjectId && session.board?.name)?.board?.name;
    if (fromSessions) return fromSessions;

    if (weeklyData) {
      for (const daySessions of Object.values(weeklyData)) {
        const fromWeekly = daySessions.find((session) => session.subject_id === subjectId && session.board?.name)?.board?.name;
        if (fromWeekly) return fromWeekly;
      }
    }

    return null;
  };

  const formatSubjectFilterLabel = (subject: Subject) => {
    const classPart = subject.class?.name ? ` (${subject.class.name})` : '';
    const boardName = subject.board?.name || findBoardNameForSubject(subject.id);
    const boardPart = boardName ? ` [${boardName}]` : '';
    return `${subject.name}${classPart}${boardPart}`;
  };

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

      if (viewMode === 'week') {
        const weekRes = await classSessionService.getWeeklySchedule({ week_offset: weekOffset });
        let flatSessions: ClassSession[] = weekRes.data.sessions;

        // Weekly endpoint does not accept filter params, so apply them locally.
        if (selectedSubject) {
          flatSessions = flatSessions.filter((session) => session.subject_id === selectedSubject);
        }
        if (selectedMode) {
          flatSessions = flatSessions.filter((session) => session.mode === selectedMode);
        }

        // Group sessions by day in the user's local timezone
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const grouped: { [key: string]: ClassSession[] } = {};

        flatSessions.forEach(session => {
          const dayIndex = new Date(session.start_time).getDay();
          const dayName = dayNames[dayIndex];
          if (!grouped[dayName]) grouped[dayName] = [];
          grouped[dayName].push(session);
        });

        setWeeklyData(grouped);

        // Auto-select today if no day is selected and we are in current week
        if (!selectedDay) {
          setSelectedDay(dayNames[new Date().getDay()]);
        }

        setLoading(false);
        return;
      }

      switch (viewMode) {
        case 'upcoming': {
          if (isStudent) {
            const myUpcomingRes = await classSessionService.getMySchedule({
              subject_id: selectedSubject || undefined,
              upcoming_only: true,
            });
            data = myUpcomingRes.data.data;
          } else {
            const upcomingRes = await classSessionService.getUpcoming(params);
            data = upcomingRes.data;
          }
          break;
        }
        case 'past': {
          if (isStudent) {
            const myAllRes = await classSessionService.getMySchedule({
              subject_id: selectedSubject || undefined,
            });
            const now = new Date();
            data = myAllRes.data.data.filter((session) => new Date(session.end_time) < now);
          } else {
            const pastRes = await classSessionService.getPast(params);
            data = pastRes.data;
          }
          break;
        }
        case 'today': {
          const todayRes = await classSessionService.getToday();
          data = todayRes.data;
          break;
        }
        default: {
          if (isStudent) {
            const myRes = await classSessionService.getMySchedule({
              subject_id: selectedSubject || undefined,
            });
            data = myRes.data.data;
          } else {
            const allRes = await classSessionService.getAll(params);
            data = allRes.data.data;
          }
        }
      }

      if (isStudent && selectedMode) {
        data = data.filter((session) => session.mode === selectedMode);
      }

      setSessions(data);
      setWeeklyData(null);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedSubject, selectedTeacher, selectedMode, weekOffset, isStudent, selectedDay]);

  useEffect(() => {
    fetchSubjects();
    if (isAdmin) fetchTeachers();
  }, [fetchSubjects, fetchTeachers, isAdmin]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const getSessionStatus = (session: ClassSession) => {
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const maxEnd = new Date(start.getTime() + MAX_SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const effectiveEnd = end > maxEnd ? maxEnd : end;

    if (now > effectiveEnd) {
      return { label: 'Ended', color: 'bg-gray-500', canJoin: false };
    }

    const isLive = now >= start;
    if (now <= effectiveEnd) {
      return {
        label: isLive ? 'Live Now' : 'Upcoming',
        color: isLive ? 'bg-green-500' : 'bg-blue-500',
        canJoin: isLive
      };
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
    const status = getSessionStatus(session);
    if (!status.canJoin) {
      return;
    }

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
        className="group shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl overflow-hidden flex flex-col border border-gray-100 bg-white"
      >
        <div className={`relative p-5 ${session.mode === 'ONLINE' ? 'bg-blue-50/50' : 'bg-orange-50/50'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${session.mode === 'ONLINE' ? 'bg-saBlue/10 text-saBlue' : 'bg-saVividOrange/10 text-saVividOrange'}`}>
              {session.mode === 'ONLINE' ? <Video className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`${status.color} text-white border-none px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight`}>
                {status.label}
              </Badge>
              {session.is_recurring && (
                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-md border border-gray-100">
                  <RefreshCw className="w-2.5 h-2.5" /> Recurring
                </div>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-800 leading-tight group-hover:text-saBlue transition-colors">
            {session.subject?.name || 'Class Session'}
          </h3>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            {session.teacher?.user?.name || 'Teacher'}
          </p>
        </div>

        <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between mt-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Time</p>
                <div className="flex items-center gap-2 text-gray-700 font-bold text-xs">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>{formatTime(session.start_time)}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100/50">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Class</p>
                <div className="flex items-center gap-2 text-gray-700 font-bold text-xs">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span>{session.class?.name || 'All'}</span>
                </div>
              </div>
            </div>

            {session.mode === 'OFFLINE' && session.location && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] font-semibold text-gray-600">{session.location}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-auto">
            <Button
              size="sm"
              className={`flex-1 h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all ${status.canJoin
                ? 'bg-saBlue text-white shadow-md shadow-saBlue/10'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 shadow-none'
                }`}
              onClick={() => handleJoinSession(session)}
            >
              {status.canJoin ? 'Join Now' : 'View Session'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-wider border-gray-200"
              onClick={() => navigate(`/class-sessions/${session.id}/attendance`)}
            >
              Attendance
            </Button>

            {canEditSession && (
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-xl border-gray-100 hover:border-saBlue hover:text-saBlue transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/dashboard/class-sessions/${session.id}/edit`);
                }}
                title="Edit Session"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}

            {canDeleteSession && (
              <Button
                variant="outline"
                size="icon"
                className="w-10 h-10 rounded-xl border-gray-100 hover:border-red-500 hover:text-red-500 transition-all text-red-500/80"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(session);
                }}
                title="Delete Session"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };


  const renderWeeklyView = () => {
    if (!weeklyData) return null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay();
    const orderedDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      orderedDays.push(dayNames[(todayIndex + i) % 7]);
    }

    const currentSessions = weeklyData[selectedDay] || [];

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          {/* COMPACT DATE & WEEK NAV */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">{selectedDay}</h3>
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white"
                onClick={() => setWeekOffset((prev) => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-2 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                {weekOffset === 0 ? 'Current' : weekOffset > 0 ? `+${weekOffset}wk` : `${weekOffset}wk`}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white"
                onClick={() => setWeekOffset((prev) => prev + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* WRAPPING DAY SELECTOR - No forced scroll */}
          <div className="flex flex-wrap gap-2">
            {orderedDays.map((day) => {
              const isToday = day === dayNames[todayIndex] && weekOffset === 0;
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 min-w-[50px] sm:flex-none sm:px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${isSelected
                    ? 'bg-saBlue border-saBlue text-white shadow-md shadow-saBlue/10'
                    : isToday
                      ? 'bg-blue-50 border-blue-100 text-saBlue'
                      : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                    }`}
                >
                  {isToday ? 'Today' : day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          {currentSessions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentSessions.map(renderSessionCard)}
            </div>
          ) : (
            <div className="py-20 bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
              <Clock className="w-10 h-10 text-gray-200 mb-4" />
              <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">No Classes Today</h4>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Schedule</h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            {isStudent ? 'Learning Path' : 'Management'}
          </p>
        </div>
        {canAddSession && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-10 px-5 font-bold text-[10px] uppercase tracking-wider border-saBlue text-saBlue hover:bg-saBlue/10 transition-all"
              onClick={() => navigate('/dashboard/attendance')}
            >
              Attendance
            </Button>
            <Button
              className="bg-saBlue hover:bg-saBlue/90 text-white h-10 px-5 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm"
              onClick={() => navigate('/dashboard/class-sessions/create')}
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              New Class
            </Button>
          </div>
        )}
      </div>

      {/* ULTRA-COMPACT FILTERS - One Line */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
          <div className="flex-1 min-w-[120px] relative">
            <SearchablePaginatedSelect
              value={selectedSubject ? String(selectedSubject) : 'all'}
              onValueChange={(value) => setSelectedSubject(value === 'all' ? null : parseInt(value))}
              placeholder="Subject: All"
              searchPlaceholder="Search subject..."
              triggerClassName="w-full h-9 pl-3 pr-8 bg-white border border-gray-100 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-gray-600 focus:ring-2 focus:ring-saBlue/5"
              options={[
                { value: 'all', label: 'Subject: All' },
                ...subjects.map((subject) => ({
                  value: String(subject.id),
                  label: formatSubjectFilterLabel(subject),
                  searchText: `${subject.name} ${subject.class?.name || ''} ${subject.board?.name || findBoardNameForSubject(subject.id) || ''}`,
                })),
              ]}
            />
          </div>

          <div className="flex-1 min-w-[120px] relative">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as typeof selectedMode)}
              className="w-full appearance-none h-9 pl-3 pr-8 bg-white border border-gray-100 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-gray-600 outline-none focus:ring-2 focus:ring-saBlue/5 transition-all"
            >
              <option value="">Mode: All</option>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
            <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-300 rotate-90" />
          </div>

          <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-lg">
            {(isStudent ? ['week', 'all', 'upcoming', 'past'] : ['week', 'all']).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setViewMode(mode as typeof viewMode);
                  setWeekOffset(0);
                }}
                className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${viewMode === mode ? 'bg-saBlue/10 text-saBlue' : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Loading Your Schedule...</p>
        </div>
      ) : viewMode === 'week' ? (
        renderWeeklyView()
      ) : sessions.length === 0 ? (
        <div className="py-32 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Calendar className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-xl font-bold text-gray-600">No sessions found</h3>
          <p className="text-gray-400 mt-2 max-w-xs">There are no classes scheduled for your selection at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {sessions.map(renderSessionCard)}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        title="Delete Session"
        message={`Are you sure you want to delete "${sessionToDelete?.subject?.name}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="No, Keep It"
        onConfirm={confirmDeleteSession}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
      />
    </div>
  );
}
