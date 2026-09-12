import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  CheckSquare,
  Square,
  AlertTriangle,
  Pencil,
  Layers,
} from 'lucide-react';
import { classSessionService, subjectService, teacherService, attendanceService } from '@/services/api';
import type { ClassSession, Subject, Teacher } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UnifiedPageHeader from '@/components/ui/UnifiedPageHeader';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { RecordingPlayerModal } from '@/components/classroom/RecordingPlayerModal';
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

const MAX_SESSION_DURATION_HOURS = 8;

export default function ClassSessionsPage() {
  usePageTitle("Schedule & Class Sessions");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedRecordingSession, setSelectedRecordingSession] = useState<ClassSession | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const { canCreate, canDelete } = usePermissions();
  const canAddSession = isAdmin || canCreate('classSessions');
  const canEditSession = isAdmin;
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

  // Selection & Batch Delete State
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteRecurringSeries, setBulkDeleteRecurringSeries] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Single Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recurringDeleteModalOpen, setRecurringDeleteModalOpen] = useState(false);
  const [recurringDeleting, setRecurringDeleting] = useState(false);
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
      const response = await subjectService.getAll({ limit: 1000 });
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
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleToggleSelectSession = (id: number) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = (allIds: number[]) => {
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedSessionIds.includes(id));
    if (allSelected) {
      setSelectedSessionIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedSessionIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleDeleteSession = (session: ClassSession) => {
    setSessionToDelete(session);
    if (session.is_recurring || session.recurrence_group_id) {
      setRecurringDeleteModalOpen(true);
    } else {
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteSession = async (deleteRecurring = false) => {
    if (!sessionToDelete) return;
    try {
      if (deleteRecurring) setRecurringDeleting(true);
      await classSessionService.delete(sessionToDelete.id, { delete_recurring: deleteRecurring });
      setSelectedSessionIds((prev) => prev.filter((id) => id !== sessionToDelete.id));
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setRecurringDeleting(false);
      setDeleteModalOpen(false);
      setRecurringDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedSessionIds.length === 0) return;
    try {
      setBulkDeleting(true);
      await classSessionService.bulkDelete({
        session_ids: selectedSessionIds,
        delete_recurring_series: bulkDeleteRecurringSeries,
      });
      setSelectedSessionIds([]);
      fetchSessions();
    } catch (error) {
      console.error('Error in bulk delete:', error);
    } finally {
      setBulkDeleting(false);
      setBulkDeleteModalOpen(false);
    }
  };

  const handleJoinSession = (session: ClassSession) => {
    navigate(`/dashboard/class-sessions/${session.id}`);
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
    const isSelected = selectedSessionIds.includes(session.id);

    return (
      <Card
        key={session.id}
        className={cn(
          "group hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col border bg-white relative",
          isSelected
            ? "border-saBlue ring-2 ring-saBlue/20 shadow-md"
            : "border-slate-200/80 hover:border-saBlue/50"
        )}
      >
        {/* Header Banner */}
        <div className={cn(
          "p-4 relative flex flex-col justify-between transition-all",
          isOnline
            ? "bg-saBlueSubtle/40 border-b border-saBlue/15"
            : "bg-saOrangeSubtle/40 border-b border-saVividOrange/15"
        )}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {canDeleteSession && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelectSession(session.id);
                  }}
                  className="p-1 rounded-lg hover:bg-white/80 transition-colors"
                  title={isSelected ? 'Deselect Session' : 'Select Session'}
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-saBlue fill-saBlue/10" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400 hover:text-saBlue" />
                  )}
                </button>
              )}
              <div className={cn(
                "p-2 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-sm",
                isOnline
                  ? "bg-saBlue text-white"
                  : "bg-saVividOrange text-white"
              )}>
                {isOnline ? <Video className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                <span>{session.mode}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={cn("text-[10px] font-bold border-0 px-2 py-0.5 rounded-full shadow-sm", status.color)}>
                {status.label}
              </Badge>
              {session.section && (
                <div className="flex items-center gap-1 text-[9px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200" title={`Section: ${session.section.title}`}>
                  <Layers className="w-2.5 h-2.5 text-orange-600" />
                  <span className="truncate max-w-[120px]">{session.section.title}</span>
                </div>
              )}
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
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Date & Time</p>
                <div className="space-y-0.5 mt-1">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs truncate">
                    <Calendar className="w-3.5 h-3.5 text-saBlue shrink-0" />
                    <span className="truncate">{formatDate(session.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px] truncate">
                    <Clock className="w-3 h-3 text-saBlue/70 shrink-0" />
                    <span>{formatTime(session.start_time)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End Date & Time</p>
                <div className="space-y-0.5 mt-1">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs truncate">
                    <Calendar className="w-3.5 h-3.5 text-saVividOrange shrink-0" />
                    <span className="truncate">{formatDate(session.end_time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-[11px] truncate">
                    <Clock className="w-3 h-3 text-saVividOrange/70 shrink-0" />
                    <span>{formatTime(session.end_time)}</span>
                  </div>
                </div>
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

            {session.mode === 'OFFLINE' && session.location && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-saVividOrange shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">{session.location}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-2.5 border-t border-slate-100 flex-wrap">
            <Button
              size="sm"
              className={cn(
                "flex-1 min-w-[110px] h-9 rounded-xl font-bold text-xs transition-all shadow-sm",
                status.canJoin
                  ? "bg-saBlue hover:bg-saBlueDarkHover text-white shadow-saBlue/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
              onClick={() => handleJoinSession(session)}
            >
              {status.canJoin ? 'Join Live Class' : 'View Details'}
            </Button>

            {isAdmin && status.label === 'Ended' && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2.5 rounded-xl font-bold text-xs border-saBlue/20 text-saBlue bg-saBlueSubtle/60 hover:bg-saBlue hover:text-white gap-1 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedRecordingSession(session);
                }}
                title="Watch Class Recording (Admin Only)"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Recording</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2.5 rounded-xl font-bold text-xs border-slate-200 hover:bg-saOrangeSubtle hover:text-saOrangeDark hover:border-saVividOrange/30 shrink-0"
              onClick={() => navigate(`/dashboard/class-sessions/${session.id}/attendance`)}
            >
              Attendance
            </Button>

            {canEditSession && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-slate-200 text-slate-600 hover:border-saVividOrange hover:text-saVividOrange hover:bg-saOrangeSubtle shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/dashboard/class-sessions/${session.id}/edit`);
                }}
                title="Edit Session"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}

            {canDeleteSession && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl border-slate-200 text-slate-400 hover:border-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
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
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
          {/* Top Row: Day Title & Week Offset */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {selectedDay}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-saBlueSubtle text-saBlue border border-saBlue/20 shrink-0">
                {currentSessions.length} {currentSessions.length === 1 ? 'Class' : 'Classes'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {canDeleteSession && currentSessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllVisible(currentSessions.map((s) => s.id))}
                  className="h-7 px-2 text-[10px] sm:text-[11px] font-bold rounded-lg border-slate-200 text-slate-600 hover:text-saBlue hover:bg-saBlue/5"
                >
                  {currentSessions.every((s) => selectedSessionIds.includes(s.id)) ? 'Deselect' : 'Select All'}
                </Button>
              )}

              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg text-slate-600 hover:bg-white"
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="px-1.5 text-[10px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">
                  {weekOffset === 0 ? 'This Week' : weekOffset > 0 ? `+${weekOffset}w` : `${weekOffset}w`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg text-slate-600 hover:bg-white"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* DAY SELECTOR PILLS (scrollbar hidden, smooth touch scroll) */}
          <div className="overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5">
            <div className="flex gap-1.5 sm:gap-2 min-w-max">
              {orderedDays.map((day) => {
                const isToday = day === dayNames[todayIndex] && weekOffset === 0;
                const isSelected = day === selectedDay;
                const daySessionCount = (weeklyData[day] || []).length;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 shrink-0",
                      isSelected
                        ? "bg-saBlue border-saBlue text-white shadow-md shadow-saBlue/20 scale-105"
                        : isToday
                          ? "bg-saOrangeSubtle border-saVividOrange/30 text-saOrangeDark font-black"
                          : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-saBlueSubtle hover:text-saBlue"
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
        </div>

        <div>
          {currentSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {currentSessions.map(renderSessionCard)}
            </div>
          ) : (
            <Card className="py-12 sm:py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
              <CardContent>
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-saBlueSubtle rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-saBlue">
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">No Classes on {selectedDay}</h3>
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
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
        <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                Class Schedule & Sessions
              </h1>
              <span className="inline-flex items-center text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30 shrink-0">
                {allCurrentSessions.length} Scheduled
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
              {isStudent ? 'Track upcoming live classes and past recordings.' : 'Manage online & offline timetable and attendance.'}
            </p>
          </div>

          {canAddSession && (
            <Button
              className="sm:hidden bg-saBlue hover:bg-saBlueDarkHover text-white shadow-sm rounded-xl h-9 px-3 font-bold text-xs shrink-0 flex items-center gap-1.5"
              onClick={() => navigate('/dashboard/class-sessions/create')}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </Button>
          )}
        </div>

        {canAddSession && (
          <Button
            className="hidden sm:flex bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-saBlue/20 rounded-xl h-10 px-5 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 items-center gap-2 shrink-0"
            onClick={() => navigate('/dashboard/class-sessions/create')}
          >
            <Plus className="w-4 h-4" />
            New Class
          </Button>
        )}
      </div>

      {/* COMPACT STATS STRIP WITH BLUE & ORANGE THEME */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2.5 shadow-xs hover:border-saBlue/40 transition-all">
          <div className="h-7 w-7 sm:h-9 sm:w-9 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue shrink-0">
            <Calendar className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total</p>
            <p className="text-sm sm:text-lg font-black text-slate-900 leading-tight mt-0.5">{allCurrentSessions.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2.5 shadow-xs hover:border-saVividOrange/40 transition-all">
          <div className="h-7 w-7 sm:h-9 sm:w-9 bg-saVividOrange/15 rounded-xl flex items-center justify-center text-saVividOrange shrink-0">
            <Radio className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Live</p>
            <p className="text-sm sm:text-lg font-black text-saVividOrange leading-tight mt-0.5">{liveCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2.5 shadow-xs hover:border-saBlue/40 transition-all">
          <div className="h-7 w-7 sm:h-9 sm:w-9 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue shrink-0">
            <Video className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Online</p>
            <p className="text-sm sm:text-lg font-black text-saBlue leading-tight mt-0.5">{onlineCount}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-2 sm:p-3 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-2.5 shadow-xs hover:border-saVividOrange/40 transition-all">
          <div className="h-7 w-7 sm:h-9 sm:w-9 bg-saVividOrange/10 rounded-xl flex items-center justify-center text-saVividOrange shrink-0">
            <BookOpen className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Offline</p>
            <p className="text-sm sm:text-lg font-black text-saVividOrange leading-tight mt-0.5">{offlineCount}</p>
          </div>
        </div>
      </div>

      {/* COMPACT RESPONSIVE FILTER TOOLBAR */}
      <div className="bg-[#FFF8F2] border border-orange-200/80 shadow-xs rounded-2xl p-2.5 sm:p-3 space-y-2.5">
        {/* Top Row: View Mode Tabs */}
        <div className="flex items-center justify-between gap-2">
          <div className="grid grid-cols-5 sm:flex w-full sm:w-auto p-1 bg-white/80 border border-orange-200/60 rounded-xl gap-0.5 shrink-0 overflow-x-auto scrollbar-hide shadow-xs">
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
                  "px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all text-center whitespace-nowrap",
                  viewMode === mode.id
                    ? "bg-saVividOrange shadow-sm text-white font-black"
                    : "text-slate-600 hover:text-saOrangeDark hover:bg-orange-50"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 shrink-0 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 font-bold rounded-xl"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Bottom Row: Search & Dropdowns */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search subject or teacher..."
              className="pl-8 pr-8 h-9 border-orange-200/80 rounded-xl bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:ring-saVividOrange focus:border-saVividOrange"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Dropdowns Row on Mobile */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Subject Filter */}
            <div className="flex-1 sm:flex-initial sm:w-44 min-w-[130px]">
              <SearchablePaginatedSelect
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                placeholder="All Subjects"
                searchPlaceholder="Search subject..."
                triggerClassName="h-9 px-2.5 rounded-xl border-orange-200/80 bg-white text-xs font-medium text-slate-800 w-full"
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
            <div className="w-28 sm:w-32 shrink-0">
              <Select value={selectedMode} onValueChange={setSelectedMode}>
                <SelectTrigger className="h-9 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs font-medium">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Filter (Admin only) */}
            {isAdmin && teachers.length > 0 && (
              <div className="w-32 sm:w-36 shrink-0">
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="h-9 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs font-medium">
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
          </div>
        </div>
      </div>

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

      {/* Recording Player Modal (Admin Only) */}
      {isAdmin && selectedRecordingSession && (
        <RecordingPlayerModal
          isOpen={!!selectedRecordingSession}
          onClose={() => setSelectedRecordingSession(null)}
          sessionId={selectedRecordingSession.id}
          sessionTitle={selectedRecordingSession.subject?.name}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        title="Delete Session"
        message={`Are you sure you want to delete "${sessionToDelete?.subject?.name}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="No, Keep It"
        onConfirm={() => confirmDeleteSession(false)}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSessionToDelete(null);
        }}
      />

      {/* Recurring Session Delete Modal */}
      {recurringDeleteModalOpen && sessionToDelete && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0"
            onClick={() => {
              setRecurringDeleteModalOpen(false);
              setSessionToDelete(null);
            }}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl p-6 sm:p-7 w-full max-w-md text-left space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-saOrangeSubtle border border-saVividOrange/20 flex items-center justify-center text-saVividOrange shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Delete Recurring Class</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  <strong className="text-slate-700">"{sessionToDelete.subject?.name}"</strong> is part of a recurring timetable series. How would you like to proceed?
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Scheduled Slot:</p>
              <p className="font-semibold text-slate-900">{formatDate(sessionToDelete.start_time)} at {formatTime(sessionToDelete.start_time)} – {formatTime(sessionToDelete.end_time)}</p>
            </div>

            <div className="space-y-2.5 pt-1">
              <Button
                type="button"
                disabled={recurringDeleting}
                onClick={() => confirmDeleteSession(false)}
                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs justify-between px-4 border border-slate-200 transition-all"
              >
                <span>Delete This Session Only</span>
                <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-md font-bold text-slate-700">Single Date</span>
              </Button>

              <Button
                type="button"
                disabled={recurringDeleting}
                onClick={() => confirmDeleteSession(true)}
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs justify-between px-4 shadow-md shadow-red-600/20 transition-all"
              >
                <span>{recurringDeleting ? 'Deleting Series...' : 'Delete Entire Recurring Series'}</span>
                <span className="text-[10px] bg-red-700 px-2 py-0.5 rounded-md font-bold text-red-100">All Dates</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setRecurringDeleteModalOpen(false);
                  setSessionToDelete(null);
                }}
                className="w-full h-9 text-slate-500 hover:text-slate-800 text-xs rounded-xl font-semibold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Bulk Delete Modal */}
      {bulkDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0"
            onClick={() => setBulkDeleteModalOpen(false)}
          />

          <div className="relative bg-white rounded-3xl shadow-2xl p-6 sm:p-7 w-full max-w-md text-left space-y-5 animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Batch Delete Classes</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  You are about to delete <strong className="text-slate-800">{selectedSessionIds.length}</strong> selected class session{selectedSessionIds.length > 1 ? 's' : ''}.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-amber-900">Delete recurring series</p>
                <p className="text-[11px] text-amber-700 leading-tight mt-0.5">If any selected classes are recurring, delete their entire series as well.</p>
              </div>
              <Switch
                checked={bulkDeleteRecurringSeries}
                onCheckedChange={setBulkDeleteRecurringSeries}
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200/80">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>This action is permanent and cannot be undone</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={bulkDeleting}
                onClick={confirmBulkDelete}
                className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20"
              >
                {bulkDeleting ? 'Deleting...' : `Delete ${selectedSessionIds.length} Classes`}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Batch Action Bar */}
      {canDeleteSession && selectedSessionIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-saBlue text-white text-xs font-bold flex items-center justify-center">
              {selectedSessionIds.length}
            </div>
            <span className="text-xs font-bold">Classes Selected</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSessionIds([])}
            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            Clear Selection
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setBulkDeleteRecurringSeries(false);
              setBulkDeleteModalOpen(true);
            }}
            className="h-8 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-lg shadow-red-600/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedSessionIds.length})
          </Button>
        </div>
      )}
    </div>
  );
}
