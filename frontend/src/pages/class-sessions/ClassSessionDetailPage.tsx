import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Video,
  MapPin,
  Clock,
  Calendar,
  Users,
  RefreshCw,
  User,
  ExternalLink,
  ArrowLeft,
  PlayCircle,
  Pencil,
  Trash2,
  Copy,
  Check,
  BookOpen,
  GraduationCap,
  Globe,
  Radio,
  CheckCircle2,
  CalendarDays,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { classSessionService, recordingApi, type SessionRecordingInfo } from '@/services/api';
import type { ClassSession } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { RecordingPlayerModal } from '@/components/classroom/RecordingPlayerModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

const MAX_SESSION_DURATION_HOURS = 8;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ClassSessionDetailPage() {
  usePageTitle('Session Details');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [joinReason, setJoinReason] = useState('');
  const [now, setNow] = useState<Date>(new Date());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState<SessionRecordingInfo | null>(null);
  const [recordingModalOpen, setRecordingModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { user } = useAuthStore();

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';
  const canManage = isAdmin || isTeacher;

  const fetchSession = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await classSessionService.getById(parseInt(id));
      setSession(response.data);

      // Check if user can join
      try {
        const joinResponse = await classSessionService.canJoin(parseInt(id));
        setCanJoin(joinResponse.data.canJoin);
        setJoinReason(joinResponse.data.reason || '');
      } catch (e) {
        setCanJoin(false);
      }

      // Fetch 360p recording info only if admin (30-day retention)
      if (isAdmin) {
        try {
          const recRes = await recordingApi.getInfo(parseInt(id));
          if (recRes.success && recRes.data) {
            setRecordingInfo(recRes.data);
          } else {
            setRecordingInfo(null);
          }
        } catch (recErr) {
          setRecordingInfo(null);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const getSessionStatus = () => {
    if (!session) return { label: 'Unknown', status: 'unknown' as const };

    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const maxEnd = new Date(start.getTime() + MAX_SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const effectiveEnd = end > maxEnd ? maxEnd : end;

    if (now <= effectiveEnd) {
      return now >= start
        ? { label: 'Live Now', status: 'live' as const }
        : { label: 'Upcoming', status: 'upcoming' as const };
    }
    return { label: 'Completed', status: 'completed' as const };
  };

  const formatFullDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const e = new Date(endStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${s} – ${e}`;
    } catch {
      return `${startStr} - ${endStr}`;
    }
  };

  const getDuration = () => {
    if (!session) return '';
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const maxEnd = new Date(start.getTime() + MAX_SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const effectiveEnd = end > maxEnd ? maxEnd : end;
    const diffMs = effectiveEnd.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const formatRecurrenceRule = () => {
    if (!session?.recurrence_rule) return null;
    const rule = session.recurrence_rule;

    let text = '';
    if (rule.frequency === 'daily') {
      text = rule.interval === 1 ? 'Every day' : `Every ${rule.interval} days`;
    } else if (rule.frequency === 'weekly') {
      const days = rule.daysOfWeek?.map((d: number) => FULL_DAY_NAMES[d]).join(', ') || '';
      text = rule.interval === 1 ? `Weekly on ${days}` : `Every ${rule.interval} weeks on ${days}`;
    } else if (rule.frequency === 'monthly') {
      text = rule.interval === 1 ? 'Monthly' : `Every ${rule.interval} months`;
    }

    if (rule.endDate) {
      text += ` until ${new Date(rule.endDate).toLocaleDateString()}`;
    } else if (rule.count) {
      text += ` (${rule.count} sessions total)`;
    }

    return text;
  };

  const handleJoin = () => {
    window.open(`/classroom/${session?.id}`, '_blank');
  };

  const copyEmergencyLink = () => {
    if (!session?.emergency_meeting_link) return;
    navigator.clipboard.writeText(session.emergency_meeting_link);
    setCopiedLink(true);
    toast.success('Meeting link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = async () => {
    if (!session) return;
    try {
      await classSessionService.delete(session.id);
      toast.success('Class session deleted successfully');
      navigate('/dashboard/class-sessions');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-saBlueSubtle flex items-center justify-center text-saBlue animate-spin">
          <RefreshCw className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Loading class session details...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-16 px-4 max-w-md mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-saOrangeSubtle flex items-center justify-center text-saVividOrange border border-saVividOrange/20">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Session Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The requested class session could not be found or may have been deleted.
        </p>
        <Link to="/dashboard/class-sessions">
          <Button className="bg-saBlue hover:bg-saBlueDarkHover text-white font-bold rounded-xl px-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  const statusInfo = getSessionStatus();
  const sessionStart = new Date(session.start_time);
  const sessionEnd = new Date(session.end_time);
  const maxEnd = new Date(sessionStart.getTime() + MAX_SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const effectiveSessionEnd = sessionEnd > maxEnd ? maxEnd : sessionEnd;
  const isWithinSessionTime = now >= sessionStart && now <= effectiveSessionEnd;
  const canJoinNow = canJoin && isWithinSessionTime;

  const isOnline = session.mode === 'ONLINE';
  const recurrenceRule = session.recurrence_rule;
  const activeDays = recurrenceRule?.daysOfWeek || [];

  return (
    <div className="space-y-6 pb-20 sm:pb-8 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to="/dashboard/class-sessions"
          className="group inline-flex items-center text-xs sm:text-sm font-bold text-slate-600 hover:text-saBlue transition-colors"
        >
          <span className="p-1.5 rounded-lg bg-saBlueSubtle text-saBlue mr-2 group-hover:-translate-x-0.5 transition-transform">
            <ArrowLeft className="w-3.5 h-3.5" />
          </span>
          Back to Class Sessions
        </Link>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSession}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-saBlueSubtle hover:text-saBlue hover:border-saBlue/30 text-xs font-bold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/class-sessions/${session.id}/attendance`)}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-saOrangeSubtle hover:text-saOrangeDark hover:border-saVividOrange/30 text-xs font-bold gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            {isStudent ? 'My Attendance' : 'Attendance Log'}
          </Button>

          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/dashboard/class-sessions/${session.id}/edit`)}
                className="rounded-xl border-saBlue/30 bg-saBlueSubtle/50 text-saBlue hover:bg-saBlue hover:text-white text-xs font-bold gap-1.5 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModalOpen(true)}
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-bold gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Hero Session Overview Card */}
      <Card className="rounded-3xl border border-slate-200/80 shadow-md overflow-hidden bg-white">
        <div className="p-5 sm:p-7">
          {/* Badges & Meta Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode Pill */}
              {isOnline ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-saBlueSubtle text-saBlue border border-saBlue/20">
                  <Video className="w-3.5 h-3.5 text-saBlue" />
                  Online Classroom
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30">
                  <MapPin className="w-3.5 h-3.5 text-saVividOrange" />
                  In-Person Session
                </span>
              )}

              {/* Status Pill */}
              {statusInfo.status === 'live' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-saVividOrange text-white shadow-sm shadow-saVividOrange/40 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  LIVE NOW
                </span>
              )}
              {statusInfo.status === 'upcoming' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-saBlue text-white shadow-sm">
                  <Clock className="w-3.5 h-3.5" />
                  Upcoming
                </span>
              )}
              {statusInfo.status === 'completed' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  Completed
                </span>
              )}

              {/* Recurring Pill */}
              {session.is_recurring && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/20">
                  <RefreshCw className="w-3 h-3 text-saVividOrange" />
                  Recurring
                </span>
              )}
            </div>

            {/* Duration Chip */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
              <Clock className="w-3.5 h-3.5 text-saBlue" />
              <span>{getDuration()}</span>
            </div>
          </div>

          {/* Session Title & Subtitle */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {session.subject?.name || 'Class Session'}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl pt-0.5">
              Scheduled {isOnline ? 'online interactive class' : 'in-person session'} for {session.class?.name || 'enrolled students'}{session.board?.name ? ` (${session.board.name})` : ''}.
            </p>
          </div>

          {/* Key Pills Bar (Subject / Class / Board / Teacher) */}
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-saBlueSubtle/40 border border-saBlue/10">
              <p className="text-[11px] font-bold text-saBlue uppercase tracking-wider">Subject</p>
              <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">
                {session.subject?.name || 'Not specified'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-saOrangeSubtle/50 border border-saVividOrange/15">
              <p className="text-[11px] font-bold text-saOrangeDark uppercase tracking-wider">Class / Grade</p>
              <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">
                {session.class?.name || 'All Classes'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-saBlueSubtle/40 border border-saBlue/10">
              <p className="text-[11px] font-bold text-saBlue uppercase tracking-wider">Board / Exam</p>
              <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">
                {session.board?.name || 'General'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-saOrangeSubtle/50 border border-saVividOrange/15">
              <p className="text-[11px] font-bold text-saOrangeDark uppercase tracking-wider">Instructor</p>
              <p className="text-sm font-extrabold text-slate-800 truncate mt-0.5">
                {session.teacher?.user?.name || 'Assigned Teacher'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Hero Action Callout (Live Classroom / Recording / Schedule Notice) */}
      {isOnline && (
        <>
          {canJoinNow ? (
            /* LIVE JOIN HERO CALLOUT */
            <div className="rounded-3xl bg-saBlue text-white p-5 sm:p-8 shadow-xl shadow-saBlue/20 relative overflow-hidden">
              {/* Background ambient watermarks */}
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
                <Video className="w-64 h-64 text-white" />
              </div>

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saVividOrange text-white text-xs font-black uppercase tracking-wider shadow-sm">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    Interactive Virtual Classroom
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Class is Live & Ready to Join
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
                    Join with integrated WebRTC video, real-time interactive whiteboard, high quality audio &
                    screen sharing.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                  <Button
                    onClick={handleJoin}
                    className="h-12 sm:h-14 px-6 sm:px-8 rounded-2xl bg-saVividOrange hover:bg-saOrangeDark text-white font-black text-sm sm:text-base shadow-lg shadow-saVividOrange/40 hover:shadow-saVividOrange/60 transition-all transform hover:-translate-y-0.5 active:translate-y-0 gap-2.5 flex items-center justify-center"
                  >
                    <Video className="w-5 h-5" />
                    Join Live Classroom
                  </Button>

                  {session.emergency_meeting_link && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(session.emergency_meeting_link!, '_blank', 'noopener,noreferrer')}
                      className="h-12 sm:h-14 px-5 rounded-2xl border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm backdrop-blur-md gap-2"
                    >
                      <ExternalLink className="w-4 h-4 text-saOrangeLight" />
                      Google Meet Backup
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* NOT JOINABLE / COUNTDOWN / LOCKED CALLOUT */
            <div className="rounded-3xl bg-saBlueSubtle/50 border border-saBlue/20 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-saBlue text-white shadow-sm shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    {!isWithinSessionTime && now < sessionStart
                      ? 'Live Classroom Opens at Session Time'
                      : statusInfo.status === 'completed'
                      ? 'This Session Has Ended'
                      : joinReason || 'Classroom not accessible'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {!isWithinSessionTime && now < sessionStart
                      ? `Scheduled to begin on ${formatFullDate(session.start_time)} at ${new Date(
                          session.start_time
                        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'The instructor or students can access class sessions during their scheduled slot.'}
                  </p>
                </div>
              </div>

              {session.emergency_meeting_link && (
                <Button
                  variant="outline"
                  onClick={() => window.open(session.emergency_meeting_link!, '_blank', 'noopener,noreferrer')}
                  className="rounded-xl border-saBlue/30 text-saBlue hover:bg-saBlueSubtle text-xs font-bold gap-1.5 w-full sm:w-auto shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Backup Google Meet
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Class Recording Card (Admin only) */}
      {isAdmin && recordingInfo?.available && (
        <Card className="rounded-3xl border border-saVividOrange/30 bg-saOrangeSubtle/30 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-saVividOrange text-white shadow-md shadow-saVividOrange/20 shrink-0">
                <PlayCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-slate-900">Class Recording Ready (360p)</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-saBlueSubtle text-saBlue border border-saBlue/20">
                    30-Day Retention
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Watch recorded whiteboard canvas, screen share, and synchronized audio.
                  {recordingInfo.expiresAt && (
                    <span className="text-slate-500 ml-1">
                      (Available until {new Date(recordingInfo.expiresAt).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setRecordingModalOpen(true)}
              className="h-11 px-6 rounded-2xl bg-saBlue hover:bg-saBlueDarkHover text-white font-extrabold text-sm shadow-md shadow-saBlue/20 hover:shadow-saBlue/40 transition-all gap-2 w-full sm:w-auto shrink-0"
            >
              <PlayCircle className="w-4 h-4 text-saOrangeLight" />
              Watch Recording
            </Button>
          </div>
        </Card>
      )}

      {/* Main Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Schedule & Timing */}
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-saBlueSubtle text-saBlue">
                <Calendar className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-black text-slate-900">Schedule & Timing</CardTitle>
            </div>
            <span className="text-xs font-bold text-saBlue bg-saBlueSubtle px-2.5 py-0.5 rounded-full">
              {getDuration()}
            </span>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Full Date */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-saBlue shrink-0 mt-0.5">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</p>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">
                  {formatFullDate(session.start_time)}
                </p>
              </div>
            </div>

            {/* Time Span Timeline */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-saVividOrange shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div className="w-full">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Time</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="px-3 py-1.5 rounded-xl bg-saBlueSubtle/60 border border-saBlue/15 text-center">
                    <p className="text-[10px] font-bold text-saBlue uppercase">Start</p>
                    <p className="text-xs font-extrabold text-slate-800">
                      {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="h-0.5 flex-1 bg-slate-200 relative">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-saVividOrange" />
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-saOrangeSubtle/60 border border-saVividOrange/15 text-center">
                    <p className="text-[10px] font-bold text-saOrangeDark uppercase">End</p>
                    <p className="text-xs font-extrabold text-slate-800">
                      {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recurrence Rule Card */}
            {session.is_recurring && (
              <div className="p-4 rounded-2xl bg-saOrangeSubtle/40 border border-saVividOrange/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-saVividOrange" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Recurrence Schedule
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-saOrangeDark capitalize">
                    {recurrenceRule?.frequency || 'Weekly'}
                  </span>
                </div>

                {/* Active Days of Week Pills */}
                {recurrenceRule?.frequency === 'weekly' && (
                  <div className="flex items-center justify-between gap-1 pt-1">
                    {DAY_LABELS.map((day, idx) => {
                      const isActive = activeDays.includes(idx);
                      return (
                        <div
                          key={day}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all ${
                            isActive
                              ? 'bg-saBlue text-white shadow-sm shadow-saBlue/30 scale-105'
                              : 'bg-white/80 border border-slate-200 text-slate-400'
                          }`}
                        >
                          {day[0]}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-xs text-slate-600 font-medium pt-1">
                  {formatRecurrenceRule()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Instructor & Academic Details */}
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-saOrangeSubtle text-saOrangeDark">
                <User className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-black text-slate-900">Instructor & Academic</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Teacher Profile Box */}
            <div className="p-4 rounded-2xl bg-saBlueSubtle/40 border border-saBlue/15 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-saBlue text-white font-black text-sm flex items-center justify-center shadow-md shadow-saBlue/20 shrink-0">
                {getInitials(session.teacher?.user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {session.teacher?.user?.name || 'No Teacher Assigned'}
                  </p>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-saOrangeSubtle text-saOrangeDark">
                    Instructor
                  </span>
                </div>
                {session.teacher?.user?.email && !isStudent && (
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {session.teacher.user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Academic Tags */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-saBlue" />
                  <span className="text-xs font-bold text-slate-600">Subject</span>
                </div>
                <span className="text-xs font-extrabold text-slate-800">
                  {session.subject?.name || '—'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-saVividOrange" />
                  <span className="text-xs font-bold text-slate-600">Target Class</span>
                </div>
                <span className="text-xs font-extrabold text-slate-800">
                  {session.class?.name || 'All Students'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-saBlue" />
                  <span className="text-xs font-bold text-slate-600">Board / Curriculum</span>
                </div>
                <span className="text-xs font-extrabold text-slate-800">
                  {session.board?.name || 'Standard Curriculum'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Location & Connectivity */}
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-saBlueSubtle text-saBlue">
                {isOnline ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <CardTitle className="text-base font-black text-slate-900">
                {isOnline ? 'Virtual Classroom & Links' : 'Location Details'}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {isOnline ? (
              <>
                {/* Integrated Classroom Info */}
                <div className="p-4 rounded-2xl bg-saBlueSubtle/40 border border-saBlue/15 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-saBlue text-white shadow-sm shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-saBlue uppercase tracking-wider">
                      StudyAsan Integrated Classroom
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      Equipped with high-performance audio/video, real-time shared whiteboard canvas, student hand-raise,
                      and automatic 360p recording.
                    </p>
                  </div>
                </div>

                {/* Emergency Google Meet Backup Link */}
                {session.emergency_meeting_link ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-saVividOrange" />
                        Backup Google Meet Link
                      </span>
                      <span className="text-[10px] font-bold text-saOrangeDark bg-saOrangeSubtle px-2 py-0.5 rounded-full">
                        Emergency Fallback
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-xl border border-slate-200 flex-1 min-w-0 font-mono text-xs text-slate-600 truncate select-all">
                        {session.emergency_meeting_link}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyEmergencyLink}
                        className="rounded-xl border-slate-200 hover:bg-saBlueSubtle hover:text-saBlue shrink-0 text-xs font-bold h-9"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-saBlue" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => window.open(session.emergency_meeting_link!, '_blank', 'noopener,noreferrer')}
                        className="rounded-xl bg-saBlue hover:bg-saBlueDarkHover text-white shrink-0 text-xs font-bold h-9 gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-500 font-medium">
                    No emergency Google Meet link configured for this session.
                  </div>
                )}
              </>
            ) : (
              /* In-Person / Offline location */
              <div className="p-4 rounded-2xl bg-saOrangeSubtle/40 border border-saVividOrange/20 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-saVividOrange" />
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Physical Room / Location
                  </span>
                </div>
                <p className="text-sm font-extrabold text-slate-900">
                  {session.location || 'Campus Classroom — Details at front desk'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Attendance & Attendees Roster */}
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-saOrangeSubtle text-saOrangeDark">
                <Users className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-black text-slate-900">
                Attendees ({session.attendances?.length || session._count?.attendances || 0})
              </CardTitle>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/dashboard/class-sessions/${session.id}/attendance`)}
              className="text-xs font-bold text-saBlue hover:bg-saBlueSubtle gap-1 px-2.5 rounded-xl"
            >
              View Full Log
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="p-5">
            {session.attendances && session.attendances.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {session.attendances.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-saBlue/20 hover:bg-saBlueSubtle/30 transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-saBlueSubtle text-saBlue font-extrabold text-xs flex items-center justify-center shrink-0">
                      {getInitials(att.user?.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-slate-800 truncate">{att.user?.name || 'Attendee'}</p>
                      <span
                        className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          att.role === 'TEACHER'
                            ? 'bg-saOrangeSubtle text-saOrangeDark'
                            : 'bg-saBlueSubtle text-saBlue'
                        }`}
                      >
                        {att.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 rounded-2xl bg-slate-50/60 border border-dashed border-slate-200">
                <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-saBlueSubtle text-saBlue flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No Attendees Recorded Yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Attendance logs are updated automatically as participants enter the classroom.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Action Card */}
      <Card className="rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-5 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-saBlue" />
          <span>StudyAsan Academic Session Management</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
          {recordingInfo?.available && (
            <Button
              onClick={() => setRecordingModalOpen(true)}
              className="bg-saVividOrange hover:bg-saOrangeDark text-white font-extrabold text-xs rounded-xl h-10 px-4 gap-1.5 shadow-sm w-full sm:w-auto"
            >
              <PlayCircle className="w-4 h-4" />
              Watch Recording
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/class-sessions/${session.id}/attendance`)}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs h-10 px-4 w-full sm:w-auto"
          >
            Detailed Attendance
          </Button>

          {canManage && (
            <Button
              onClick={() => navigate(`/dashboard/class-sessions/${session.id}/edit`)}
              className="bg-saBlue hover:bg-saBlueDarkHover text-white font-bold text-xs rounded-xl h-10 px-4 gap-1.5 w-full sm:w-auto"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Session
            </Button>
          )}
        </div>
      </Card>

      {/* Mobile Sticky Floating Join Button (if Live & joinable) */}
      {canJoinNow && isOnline && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl z-40 flex items-center gap-2">
          <Button
            onClick={handleJoin}
            className="flex-1 h-12 rounded-xl bg-saVividOrange hover:bg-saOrangeDark text-white font-black text-sm shadow-md gap-2"
          >
            <Video className="w-4 h-4 animate-pulse" />
            Join Classroom
          </Button>
          {session.emergency_meeting_link && (
            <Button
              variant="outline"
              onClick={() => window.open(session.emergency_meeting_link!, '_blank', 'noopener,noreferrer')}
              className="h-12 px-3 rounded-xl border-slate-200 text-slate-700"
              title="Google Meet Backup"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Recording Player Modal (Admin Only) */}
      {isAdmin && session && (
        <RecordingPlayerModal
          isOpen={recordingModalOpen}
          onClose={() => setRecordingModalOpen(false)}
          sessionId={session.id}
          sessionTitle={session.subject?.name}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        title="Delete Class Session"
        message={`Are you sure you want to delete "${session.subject?.name || 'this session'}"? This action cannot be undone.`}
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