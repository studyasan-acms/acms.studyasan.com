import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Video,
  MapPin,
  Clock,
  Calendar,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trash2,
  Search,
  Filter,
  X,
  Radio,
  CheckCircle,
  PlayCircle,
  ArrowUpDown,
  UserCheck,
} from 'lucide-react';
import { classSessionService, subjectService, teacherService, attendanceService } from '@/services/api';
import type { ClassSession, Subject, Teacher } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

const MAX_SESSION_DURATION_HOURS = 8;

export default function ClassSessionsPage() {
  usePageTitle("Schedule & Class Sessions");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const { canCreate, canUpdate, canDelete } = usePermissions();
  const canAddSession = isAdmin || canCreate('classSessions');
  const canEditSession = isAdmin || canUpdate('classSessions');
  const canDeleteSession = isAdmin || canDelete('classSessions');

  // State
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all'); // 'all' | 'ONLINE' | 'OFFLINE'
  const [viewMode, setViewMode] = useState<'week' | 'all' | 'upcoming' | 'past' | 'today'>('week');
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyData, setWeeklyData] = useState<{ [key: string]: ClassSession[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [now, setNow] = useState<Date>(new Date());

  // Pagination for 'all' mode
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ClassSession | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await subjectService.getAll({ limit: 100 });
      setSubjects(response.data.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const response = await teacherService.getAll({ limit: 100 });
      setTeachers(response.data.data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      let data: ClassSession[] = [];

      const params: any = {};
      if (selectedSubject !== 'all') params.subject_id = Number(selectedSubject);
      if (selectedTeacher !== 'all') params.teacher_id = Number(selectedTeacher);
      if (selectedMode !== 'all') params.mode = selectedMode as 'ONLINE' | 'OFFLINE';
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      if (viewMode === 'all') {
        params.page = page;
        params.limit = 12;
      }

      if (viewMode === 'week') {
        const weekRes = await classSessionService.getWeeklySchedule({ week_offset: weekOffset });
        let flatSessions: ClassSession[] = weekRes.data.sessions || [];

        // Apply local filtering for week view
        if (selectedSubject !== 'all') {
          flatSessions = flatSessions.filter((session) => session.subject_id === Number(selectedSubject));
        }
        if (selectedTeacher !== 'all') {
          flatSessions = flatSessions.filter((session) => session.teacher_id === Number(selectedTeacher));
        }
        if (selectedMode !== 'all') {
          flatSessions = flatSessions.filter((session) => session.mode === selectedMode);
        }
        if (debouncedSearch.trim()) {
          const s = debouncedSearch.toLowerCase();
          flatSessions = flatSessions.filter(
            (session) =>
              (session.subject?.name || '').toLowerCase().includes(s) ||
              (session.teacher?.user?.name || '').toLowerCase().includes(s) ||
              (session.location || '').toLowerCase().includes(s)
          );
        }

        // Group sessions by day
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const grouped: { [key: string]: ClassSession[] } = {};

        flatSessions.forEach(session => {
          const dayIndex = new Date(session.start_time).getDay();
          const dayName = dayNames[dayIndex];
          if (!grouped[dayName]) grouped[dayName] = [];
          grouped[dayName].push(session);
        });

        setWeeklyData(grouped);

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
              subject_id: selectedSubject !== 'all' ? Number(selectedSubject) : undefined,
              upcoming_only: true,
            });
            data = myUpcomingRes.data.data || [];
          } else {
            const upcomingRes = await classSessionService.getUpcoming(params);
            data = upcomingRes.data || [];
          }
          break;
        }
        case 'past': {
          if (isStudent) {
            const myAllRes = await classSessionService.getMySchedule({
              subject_id: selectedSubject !== 'all' ? Number(selectedSubject) : undefined,
            });
            const currentTime = new Date();
            data = (myAllRes.data.data || []).filter((session) => new Date(session.end_time) < currentTime);
          } else {
            const pastRes = await classSessionService.getPast(params);
            data = pastRes.data || [];
          }
          break;
        }
        case 'today': {
          const todayRes = await classSessionService.getToday();
          data = todayRes.data || [];
          break;
        }
        default: {
          if (isStudent) {
            const myRes = await classSessionService.getMySchedule({
              subject_id: selectedSubject !== 'all' ? Number(selectedSubject) : undefined,
              search: debouncedSearch || undefined,
              page: viewMode === 'all' ? page : undefined,
              limit: viewMode === 'all' ? 12 : undefined,
            });
            data = myRes.data.data || [];
            if (viewMode === 'all') setTotalPages(myRes.data.pagination?.totalPages || 1);
          } else {
            const allRes = await classSessionService.getAll(params);
            data = allRes.data.data || [];
            if (viewMode === 'all') setTotalPages(allRes.data.pagination?.totalPages || 1);
          }
        }
      }

      if (isStudent && selectedMode !== 'all') {
        data = data.filter((session) => session.mode === selectedMode);
      }

      setSessions(data);
      setWeeklyData(null);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedSubject, selectedTeacher, selectedMode, debouncedSearch, weekOffset, isStudent, selectedDay, page]);

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
      return { label: 'Ended', color: 'bg-slate-400 text-white', canJoin: false };
    }

    const isLive = now >= start;
    if (now <= effectiveEnd) {
      return {
        label: isLive ? 'Live Now' : 'Upcoming',
        color: isLive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-saBlue text-white',
        canJoin: isLive,
      };
    }

    return { label: 'Ended', color: 'bg-slate-400 text-white', canJoin: false };
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    } finally {
      setDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const handleJoinSession = async (session: ClassSession) => {
    const status = getSessionStatus(session);

    if (session.mode === 'ONLINE' && status.canJoin) {
      try {
        await attendanceService.markJoinTime(session.id);
      } catch (err) {
        console.error('Failed to auto-record attendance:', err);
      }

      if (session.meeting_link) {
        window.open(session.meeting_link, '_blank');
      } else {
        window.open(`/classroom/${session.id}`, '_blank');
      }
    } else {
      navigate(`/dashboard/class-sessions/${session.id}`);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSubject('all');
    setSelectedTeacher('all');
    setSelectedMode('all');
  };

  const hasActiveFilters =
    debouncedSearch ||
    selectedSubject !== 'all' ||
    selectedTeacher !== 'all' ||
    selectedMode !== 'all';

  // Stats calculation
  const allCurrentSessions = weeklyData ? Object.values(weeklyData).flat() : sessions;
  const onlineCount = allCurrentSessions.filter((s) => s.mode === 'ONLINE').length;
  const offlineCount = allCurrentSessions.filter((s) => s.mode === 'OFFLINE').length;
  const liveCount = allCurrentSessions.filter((s) => {
    const st = new Date(s.start_time);
    const et = new Date(s.end_time);
    return now >= st && now <= et;
  }).length;

  const renderSessionCard = (session: ClassSession) => {
    const status = getSessionStatus(session);
    const isOnline = session.mode === 'ONLINE';

    return (
      <Card
        key={session.id}
        className="group hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col border border-slate-200/80 bg-white hover:border-saBlue/50"
      >
        {/* Header Banner */}
        <div className={cn(
          "p-4 relative flex flex-col justify-between transition-all",
          isOnline
            ? "bg-gradient-to-r from-saBlue/10 via-saBlue/5 to-transparent border-b border-saBlue/10"
            : "bg-gradient-to-r from-saVividOrange/10 via-saVividOrange/5 to-transparent border-b border-saVividOrange/10"
        )}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className={cn(
              "p-2.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-sm",
              isOnline
                ? "bg-saBlue text-white"
                : "bg-saVividOrange text-white"
            )}>
              {isOnline ? <Video className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              <span>{session.mode}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={cn("text-[10px] font-bold border-0 px-2 py-0.5 rounded-full shadow-sm", status.color)}>
                {status.label}
              </Badge>
              {session.is_recurring && (
                <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full border border-slate-200">
                  <RefreshCw className="w-2.5 h-2.5 text-saBlue" /> Recurring
                </div>
              )}
            </div>
          </div>

          <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-saBlue transition-colors line-clamp-1">
            {session.subject?.name || 'Class Session'}
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-slate-400" />
            {session.teacher?.user?.name || 'Teacher Unassigned'}
          </p>
        </div>

        <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Time</p>
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-saBlue" />
                  <span>{formatTime(session.start_time)}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class & Board</p>
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs mt-0.5 truncate">
                  <Users className="w-3.5 h-3.5 text-saVividOrange shrink-0" />
                  <span className="truncate">
                    {session.class?.name || 'All Students'}
                    {session.board?.name ? ` (${session.board.name})` : ''}
                  </span>
                </div>
              </div>
            </div>

            {session.mode === 'OFFLINE' && session.location && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-saVividOrange shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">{session.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              className={cn(
                "flex-1 h-9 rounded-xl font-bold text-xs transition-all shadow-sm",
                status.canJoin
                  ? "bg-saBlue hover:bg-saBlueDarkHover text-white shadow-saBlue/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
              onClick={() => handleJoinSession(session)}
            >
              {status.canJoin ? 'Join Live Class' : 'View Details'}
            </Button>

            {status.label !== 'Ended' && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl font-semibold text-xs border-slate-200 hover:bg-saBlue/10 hover:text-saBlue hover:border-saBlue/30"
                onClick={() => navigate(`/dashboard/class-sessions/${session.id}/attendance`)}
              >
                Attendance
              </Button>
            )}

            {canEditSession && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-slate-200 text-slate-600 hover:border-saVividOrange hover:text-saVividOrange hover:bg-saVividOrange/10"
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
                className="h-9 w-9 rounded-xl border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-600 hover:bg-red-50"
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
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{selectedDay} Schedule</h3>
              <Badge className="bg-saBlue/10 text-saBlue border-saBlue/20 text-xs font-bold">
                {currentSessions.length} Classes
              </Badge>
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-slate-600 hover:bg-white"
                onClick={() => setWeekOffset((prev) => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-2 text-xs font-bold text-slate-700">
                {weekOffset === 0 ? 'Current Week' : weekOffset > 0 ? `+${weekOffset} Week` : `${weekOffset} Week`}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-slate-600 hover:bg-white"
                onClick={() => setWeekOffset((prev) => prev + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* DAY SELECTOR PILLS */}
          <div className="flex flex-wrap gap-2">
            {orderedDays.map((day) => {
              const isToday = day === dayNames[todayIndex] && weekOffset === 0;
              const isSelected = day === selectedDay;
              const daySessionCount = (weeklyData[day] || []).length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex-1 min-w-[70px] sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5",
                    isSelected
                      ? "bg-saBlue border-saBlue text-white shadow-md shadow-saBlue/20 scale-105"
                      : isToday
                        ? "bg-saVividOrange/15 border-saVividOrange/30 text-saVividOrange font-black"
                        : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-saBlue/10 hover:text-saBlue"
                  )}
                >
                  <span>{isToday ? 'Today' : day.slice(0, 3)}</span>
                  {daySessionCount > 0 && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    )}>
                      {daySessionCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {currentSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentSessions.map(renderSessionCard)}
            </div>
          ) : (
            <Card className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
              <CardContent>
                <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
                  <Clock className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">No Classes Scheduled for {selectedDay}</h3>
                <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
                  There are no active class sessions scheduled on this day matching your filters.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Schedule & Sessions</h1>
            <Badge className="bg-saBlue/10 text-saBlue hover:bg-saBlue/15 font-semibold px-2.5 py-0.5 rounded-full text-xs border border-saBlue/20">
              {allCurrentSessions.length} Scheduled
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isStudent ? 'Track your upcoming live classes and past recordings.' : 'Manage online & offline timetable and attendance.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canAddSession && (
            <Button
              className="bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-saBlue/20 rounded-xl px-4 py-2 font-semibold transition-all"
              onClick={() => navigate('/dashboard/class-sessions/create')}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Class
            </Button>
          )}
        </div>
      </div>

      {/* BRAND UNIFIED STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Classes</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{allCurrentSessions.length}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Classes in current view</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Now</p>
              <h3 className="text-2xl font-black text-saBlue mt-1">{liveCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Active live sessions</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Online Sessions</p>
              <h3 className="text-2xl font-black text-saBlue mt-1">{onlineCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <Video className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Virtual classroom link</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saVividOrange/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Offline Classes</p>
              <h3 className="text-2xl font-black text-saVividOrange mt-1">{offlineCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saVividOrange/10 rounded-xl flex items-center justify-center text-saVividOrange">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Physical classroom venue</p>
        </Card>
      </div>

      {/* SEARCH, MULTI-FILTER & VIEW TABS TOOLBAR */}
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search class by subject, teacher, location..."
              className="pl-10 h-10 border-slate-200/80 rounded-xl bg-slate-50/50 focus:bg-white text-sm focus:ring-saBlue focus:border-saBlue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & View Mode Tabs */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-3">
            {/* Subject Filter */}
            <div className="flex-1 sm:flex-initial min-w-[140px]">
              <SearchablePaginatedSelect
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                placeholder="All Subjects"
                searchPlaceholder="Search subject..."
                triggerClassName="h-10 px-3 rounded-xl border-slate-200/80 bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue"
                options={[
                  { value: 'all', label: 'All Subjects' },
                  ...subjects.map((subject) => ({
                    value: String(subject.id),
                    label: formatSubjectFilterLabel(subject),
                    searchText: `${subject.name} ${subject.class?.name || ''} ${subject.board?.name || findBoardNameForSubject(subject.id) || ''}`,
                  })),
                ]}
              />
            </div>

            {/* Mode Filter */}
            <div className="flex-1 sm:flex-initial min-w-[110px]">
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="ONLINE">Online Only</SelectItem>
                  <SelectItem value="OFFLINE">Offline Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Filter (Admin only) */}
            {isAdmin && teachers.length > 0 && (
              <div className="flex-1 sm:flex-initial min-w-[130px]">
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                    <SelectValue placeholder="All Teachers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teachers</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* View Mode Tabs (Scrollable on mobile) */}
            <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                {[
                  { id: 'week', label: 'Week' },
                  { id: 'today', label: 'Today' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'past', label: 'Past' },
                  { id: 'all', label: 'All' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setViewMode(mode.id as typeof viewMode);
                      setWeekOffset(0);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                      viewMode === mode.id
                        ? "bg-white shadow-sm text-saBlue"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter className="h-3 w-3 text-saBlue" /> Active Filters:
              </span>
              {debouncedSearch && (
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                  Search: "{debouncedSearch}"
                </Badge>
              )}
              {selectedSubject !== 'all' && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Subject: {subjects.find((s) => s.id.toString() === selectedSubject)?.name || selectedSubject}
                </Badge>
              )}
              {selectedMode !== 'all' && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Mode: {selectedMode}
                </Badge>
              )}
              {selectedTeacher !== 'all' && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Teacher: {teachers.find((t) => t.id.toString() === selectedTeacher)?.user.name || selectedTeacher}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 font-semibold"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* CONTENT DISPLAY */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium text-sm">Loading schedule...</p>
        </div>
      ) : viewMode === 'week' ? (
        renderWeeklyView()
      ) : sessions.length === 0 ? (
        <Card className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <CardContent>
            <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Class Sessions Found</h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filter options"
                : "No class sessions scheduled for this view"}
            </p>
            {canAddSession && (
              <Button onClick={() => navigate('/dashboard/class-sessions/create')} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold">
                <Plus className="mr-2 h-4 w-4" /> Create Class Session
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map(renderSessionCard)}
          </div>
          {viewMode === 'all' && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3 sm:gap-0">
              <p className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl text-xs"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl text-xs"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
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
