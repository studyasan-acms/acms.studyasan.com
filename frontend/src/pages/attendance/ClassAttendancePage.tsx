import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Users,
  Search,
  RefreshCw,
  Download,
  GraduationCap,
  Radio,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CalendarDays,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

interface AttendanceLog {
  id: number;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number | null;
}

interface AttendanceRecord {
  id: number;
  role: string;
  joined_at: string;
  left_at: string | null;
  duration_minutes: number | null;
  total_joins: number;
  total_duration: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  attendance_logs: AttendanceLog[];
}

interface SessionInfo {
  id: number;
  subject: string;
  start_time: string;
  end_time: string;
  teacher: string;
}

interface AttendanceData {
  session: SessionInfo;
  attendances: AttendanceRecord[];
  canViewAll: boolean;
}

export default function ClassAttendancePage() {
  usePageTitle('Class Attendance');
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AttendanceData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>('ALL');

  useEffect(() => {
    fetchAttendance();
  }, [sessionId]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api/'}class-sessions/${sessionId}/attendance`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message || 'Failed to fetch attendance');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDuration = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0 && mins === 0) return '< 1m';
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'SA';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatSafeTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return format(d, 'p');
  };

  const formatSafeFullDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return format(d, 'PPp');
  };

  // Filtered attendances list
  const filteredAttendances = useMemo(() => {
    if (!data?.attendances) return [];
    return data.attendances.filter((record) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        record.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.user?.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        roleFilter === 'ALL' || record.role.toUpperCase() === roleFilter.toUpperCase();

      return matchesSearch && matchesRole;
    });
  }, [data?.attendances, searchQuery, roleFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!data?.attendances) {
      return { total: 0, students: 0, teachers: 0, activeNow: 0, avgDuration: 0 };
    }
    const total = data.attendances.length;
    const students = data.attendances.filter((a) => a.role === 'STUDENT').length;
    const teachers = data.attendances.filter((a) => a.role === 'TEACHER' || a.role === 'ADMIN').length;
    const activeNow = data.attendances.filter((a) => !a.left_at).length;
    const totalMins = data.attendances.reduce((acc, curr) => acc + (curr.total_duration || 0), 0);
    const avgDuration = total > 0 ? Math.round(totalMins / total) : 0;

    return { total, students, teachers, activeNow, avgDuration };
  }, [data?.attendances]);

  // CSV Export
  const handleExportCSV = () => {
    if (!data?.attendances || data.attendances.length === 0) {
      toast.error('No attendance records to export');
      return;
    }

    const headers = ['Name', 'Role', 'Email', 'First Joined', 'Last Left', 'Total Joins', 'Total Duration (Mins)'];
    const rows = data.attendances.map((att) => [
      `"${att.user.name.replace(/"/g, '""')}"`,
      att.role,
      `"${att.user.email || ''}"`,
      att.joined_at ? formatSafeFullDateTime(att.joined_at) : '—',
      att.left_at ? formatSafeFullDateTime(att.left_at) : 'Still in class',
      att.total_joins,
      att.total_duration || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_session_${sessionId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Attendance CSV downloaded successfully');
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
        <div className="h-8 w-48 bg-slate-100 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 animate-pulse rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-red-50 text-red-500 border border-red-200 flex items-center justify-center">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Failed to Load Attendance</h2>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/class-sessions/${sessionId}`)}
            className="rounded-xl border-slate-200"
          >
            Back to Session
          </Button>
          <Button
            onClick={fetchAttendance}
            className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { session, canViewAll } = data;

  return (
    <div className="space-y-6 pb-20 sm:pb-8 max-w-6xl mx-auto">
      {/* Top Breadcrumbs & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to={`/dashboard/class-sessions/${sessionId}`}
          className="group inline-flex items-center text-xs sm:text-sm font-bold text-slate-600 hover:text-saBlue transition-colors"
        >
          <span className="p-1.5 rounded-lg bg-saBlueSubtle text-saBlue mr-2 group-hover:-translate-x-0.5 transition-transform">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          Back to Session Details
        </Link>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttendance}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-saBlueSubtle hover:text-saBlue hover:border-saBlue/30 text-xs font-bold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          {canViewAll && data.attendances.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-xl border-saOrangeDark/30 bg-saOrangeSubtle/60 text-saOrangeDark hover:bg-saVividOrange hover:text-white text-xs font-bold gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/class-sessions/${sessionId}`)}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Session
          </Button>
        </div>
      </div>

      {/* Header Overview Card */}
      <Card className="rounded-3xl border border-slate-200/80 shadow-md overflow-hidden bg-white">
        <div className="p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-saBlueSubtle text-saBlue border border-saBlue/20">
                  Attendance Roster
                </span>
                {session.subject && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/20">
                    {session.subject}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {session.subject || 'Class Session Attendance'}
              </h1>

              {/* Session Meta Row */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-saBlue" />
                  <span>
                    {session.start_time ? format(new Date(session.start_time), 'EEEE, MMMM d, yyyy') : '—'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-saVividOrange" />
                  <span>
                    {session.start_time ? format(new Date(session.start_time), 'p') : '—'} –{' '}
                    {session.end_time ? format(new Date(session.end_time), 'p') : '—'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-saBlue" />
                  <span>Teacher: {session.teacher}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-saBlueSubtle text-saBlue flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Attendees</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-saBlueSubtle text-saBlue flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Students</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{stats.students}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-saOrangeSubtle text-saOrangeDark flex items-center justify-center shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Instructors</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{stats.teachers}</p>
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-saOrangeSubtle text-saOrangeDark flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg. Time</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {formatDuration(stats.avgDuration)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Table & Filter Card */}
      <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
        {/* Search & Role Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by participant name..."
              className="pl-9 pr-8 h-10 rounded-xl border-slate-200 text-xs focus:border-saBlue focus:ring-2 focus:ring-saBlue/15"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          {canViewAll && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl self-stretch sm:self-auto">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  roleFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setRoleFilter('STUDENT')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  roleFilter === 'STUDENT'
                    ? 'bg-saBlue text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Students ({stats.students})
              </button>
              <button
                onClick={() => setRoleFilter('TEACHER')}
                className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  roleFilter === 'TEACHER'
                    ? 'bg-saVividOrange text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Teachers ({stats.teachers})
              </button>
            </div>
          )}
        </div>

        {/* Content View: Desktop Table & Mobile Cards */}
        <CardContent className="p-0">
          {filteredAttendances.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-saBlueSubtle text-saBlue flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">No Attendance Records Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `No attendees matching "${searchQuery}". Try changing your search query.`
                  : 'Participants will automatically appear in this roster as they join the class session.'}
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on small mobile) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-100">
                      <TableHead className="text-xs font-black text-slate-700 uppercase tracking-wider py-3.5 pl-6">
                        Participant
                      </TableHead>
                      <TableHead className="text-xs font-black text-slate-700 uppercase tracking-wider py-3.5">
                        Role
                      </TableHead>
                      <TableHead className="text-xs font-black text-slate-700 uppercase tracking-wider py-3.5">
                        First Joined
                      </TableHead>
                      <TableHead className="text-xs font-black text-slate-700 uppercase tracking-wider py-3.5">
                        Last Leave
                      </TableHead>
                      <TableHead className="text-xs font-black text-slate-700 uppercase tracking-wider py-3.5 text-center">
                        Joins Count
                      </TableHead>
                      <TableHead className="text-xs font-black text-slate-700 uppercase tracking-wider py-3.5">
                        Total Time
                      </TableHead>
                      <TableHead className="text-xs font-black text-slate-700 uppercase tracking-wider py-3.5 text-right pr-6">
                        Log History
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendances.map((record) => {
                      const isExpanded = expandedRows.has(record.id);
                      const isCurrentUser = record.user.id === user?.id;
                      const isTeacherRole = record.role === 'TEACHER' || record.role === 'ADMIN';
                      const isStillInClass = !record.left_at;

                      return (
                        <tbody key={record.id} className="border-b border-slate-100">
                          <TableRow className="hover:bg-saBlueSubtle/30 transition-colors">
                            {/* Participant */}
                            <TableCell className="py-4 pl-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-saBlueSubtle text-saBlue font-black text-xs flex items-center justify-center shrink-0">
                                  {getInitials(record.user.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-black text-slate-900 truncate">
                                      {record.user.name}
                                    </p>
                                    {isCurrentUser && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-saBlue text-white">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  {record.user.email && (
                                    <p className="text-[11px] text-slate-400 truncate">{record.user.email}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Role */}
                            <TableCell className="py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                  isTeacherRole
                                    ? 'bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/20'
                                    : 'bg-saBlueSubtle text-saBlue border border-saBlue/20'
                                }`}
                              >
                                {record.role}
                              </span>
                            </TableCell>

                            {/* First Joined */}
                            <TableCell className="py-4 text-xs font-bold text-slate-700">
                              {formatSafeTime(record.joined_at)}
                            </TableCell>

                            {/* Last Leave */}
                            <TableCell className="py-4">
                              {isStillInClass ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-saVividOrange text-white animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                  Active Now
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-700">
                                  {formatSafeTime(record.left_at)}
                                </span>
                              )}
                            </TableCell>

                            {/* Joins Count */}
                            <TableCell className="py-4 text-center">
                              <span className="inline-block px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-extrabold">
                                {record.total_joins}
                              </span>
                            </TableCell>

                            {/* Total Duration */}
                            <TableCell className="py-4 font-black text-xs text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-saBlue" />
                                <span>{formatDuration(record.total_duration)}</span>
                              </div>
                            </TableCell>

                            {/* Details Toggle Button */}
                            <TableCell className="py-4 text-right pr-6">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRow(record.id)}
                                className="h-8 px-2.5 rounded-xl text-xs font-bold text-saBlue hover:bg-saBlueSubtle gap-1"
                              >
                                {isExpanded ? (
                                  <>
                                    <span>Hide</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>Logs ({record.attendance_logs?.length || 0})</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded History Row */}
                          {isExpanded && (
                            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                              <TableCell colSpan={7} className="p-4 sm:p-5 pl-14">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5 text-saVividOrange" />
                                      Join & Leave Log Timeline for {record.user.name}
                                    </h4>
                                    <span className="text-[11px] font-bold text-slate-500">
                                      {record.attendance_logs.length} session entries
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {record.attendance_logs.map((log, index) => (
                                      <div
                                        key={log.id}
                                        className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="px-2 py-0.5 rounded-lg bg-saBlueSubtle text-saBlue font-black text-[10px]">
                                            Session #{index + 1}
                                          </span>
                                          <span className="text-[11px] font-black text-slate-800">
                                            {log.left_at ? formatDuration(log.duration_minutes) : 'In Progress'}
                                          </span>
                                        </div>

                                        <div className="text-[11px] space-y-0.5 text-slate-600 font-medium">
                                          <p>
                                            <span className="font-bold text-slate-700">Joined:</span>{' '}
                                            {formatSafeFullDateTime(log.joined_at)}
                                          </p>
                                          <p>
                                            <span className="font-bold text-slate-700">Left:</span>{' '}
                                            {log.left_at ? formatSafeFullDateTime(log.left_at) : 'Still Active'}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </tbody>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* MOBILE CARD VIEW (shown on screens < md) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredAttendances.map((record) => {
                  const isExpanded = expandedRows.has(record.id);
                  const isCurrentUser = record.user.id === user?.id;
                  const isTeacherRole = record.role === 'TEACHER' || record.role === 'ADMIN';
                  const isStillInClass = !record.left_at;

                  return (
                    <div key={record.id} className="p-4 space-y-3">
                      {/* Top Row: User Avatar & Role */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-saBlueSubtle text-saBlue font-black text-xs flex items-center justify-center shrink-0">
                            {getInitials(record.user.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-black text-slate-900 truncate">{record.user.name}</p>
                              {isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-saBlue text-white">
                                  You
                                </span>
                              )}
                            </div>
                            {record.user.email && (
                              <p className="text-xs text-slate-400 truncate">{record.user.email}</p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            isTeacherRole
                              ? 'bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/20'
                              : 'bg-saBlueSubtle text-saBlue border border-saBlue/20'
                          }`}
                        >
                          {record.role}
                        </span>
                      </div>

                      {/* 2-Column Key Metrics */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">First Join</p>
                          <p className="text-xs font-black text-slate-800 mt-0.5">
                            {formatSafeTime(record.joined_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                          <p className="text-xs font-black mt-0.5">
                            {isStillInClass ? (
                              <span className="text-saVividOrange">Active Now</span>
                            ) : (
                              <span className="text-slate-800">{formatSafeTime(record.left_at)}</span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Time</p>
                          <p className="text-xs font-black text-saBlue mt-0.5">
                            {formatDuration(record.total_duration)}
                          </p>
                        </div>
                      </div>

                      {/* Log History Accordion Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRow(record.id)}
                        className="w-full h-9 rounded-xl border-slate-200 text-xs font-bold text-saBlue hover:bg-saBlueSubtle flex items-center justify-between"
                      >
                        <span>
                          {isExpanded ? 'Hide History Logs' : `View Logs (${record.attendance_logs?.length || 0})`}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>

                      {/* Mobile Expanded Logs */}
                      {isExpanded && (
                        <div className="space-y-2 pt-1">
                          {record.attendance_logs.map((log, index) => (
                            <div
                              key={log.id}
                              className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="text-saBlue font-black">Session #{index + 1}</span>
                                <span className="text-slate-800">
                                  {log.left_at ? formatDuration(log.duration_minutes) : 'Active Now'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                <span className="text-slate-400">Joined:</span> {formatSafeFullDateTime(log.joined_at)}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                <span className="text-slate-400">Left:</span>{' '}
                                {log.left_at ? formatSafeFullDateTime(log.left_at) : 'Still in classroom'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
