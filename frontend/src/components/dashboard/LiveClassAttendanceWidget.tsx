import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, ArrowUpRight, UserCheck, Calendar, Layers, ClipboardCheck } from 'lucide-react';
import { classSessionService } from '@/services/api';
import type { ClassSession } from '@/types';

export default function LiveClassAttendanceWidget({ isStudent }: { isStudent?: boolean }) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveSessions = async () => {
    try {
      let res;
      if (isStudent) {
        res = await classSessionService.getMySchedule({ upcoming_only: true });
      } else {
        res = await classSessionService.getToday();
      }

      const allSessions: ClassSession[] = (res.data as any)?.data || res.data || [];
      const now = new Date();

      // Attendance is ONLY available till the time of class.
      // Disappears as soon as the class ends. Filter out ended classes!
      const activeOrUpcoming = allSessions.filter((s) => {
        const endTime = new Date(s.end_time);
        return now <= endTime;
      });

      // Sort by start_time ascending so the SINGLE CLOSEST class is always at index 0
      activeOrUpcoming.sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      setSessions(activeOrUpcoming);
    } catch (err) {
      console.error('Failed to fetch live/upcoming sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrAttend = (session: ClassSession) => {
    navigate(`/dashboard/class-sessions/${session.id}`);
  };

  if (loading || sessions.length === 0) return null;

  // Show ONLY ONE class that is closest to upcoming (or currently live)
  const closestSession = sessions[0];
  const now = new Date();
  const start = new Date(closestSession.start_time);
  const end = new Date(closestSession.end_time);
  const isLiveNow = now >= start && now <= end;

  const timeFormatted = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Card className="overflow-hidden rounded-2xl border border-blue-700/40 bg-[#0276D3] text-white shadow-sm">
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            {isLiveNow ? (
              <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-xs border-0">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                LIVE CLASS NOW
              </Badge>
            ) : (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-xs border-0">
                <Clock className="w-3.5 h-3.5" />
                UPCOMING CLASS
              </Badge>
            )}

            {closestSession.section && (
              <span className="text-xs font-bold text-amber-300 bg-blue-900/50 px-2.5 py-0.5 rounded-lg border border-amber-400/30 flex items-center gap-1">
                <Layers className="w-3 h-3 text-amber-400" />
                {closestSession.section.title}
              </span>
            )}

            <span className="text-xs text-blue-100 font-semibold bg-blue-800/60 px-2.5 py-0.5 rounded-lg border border-blue-400/20">
              {dateFormatted} at {timeFormatted}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
            {(closestSession as any).title || closestSession.subject?.name || 'Scheduled Live Session'}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs text-blue-100 font-medium">
            <span className="flex items-center gap-1 bg-blue-800/50 px-2.5 py-1 rounded-lg border border-blue-400/20">
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              Faculty: {closestSession.teacher?.user?.name || 'Assigned Teacher'}
            </span>
            {(closestSession.class?.name || closestSession.board?.name) && (
              <span className="flex items-center gap-1 bg-blue-800/50 px-2.5 py-1 rounded-lg border border-blue-400/20 font-bold text-amber-200">
                {closestSession.class?.name || 'All Classes'} {closestSession.board?.name ? `[${closestSession.board.name}]` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <Button
            size="sm"
            onClick={() => handleJoinOrAttend(closestSession)}
            className={`h-10 px-5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${
              isLiveNow
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-white text-[#0276D3] hover:bg-blue-50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isLiveNow ? 'Join Live Class Now' : 'View Class Session'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>

          {!isStudent && (
            <Button
              size="sm"
              onClick={() => navigate(`/dashboard/class-sessions/${closestSession.id}/attendance`)}
              className="h-10 px-4 rounded-xl text-xs font-bold bg-blue-800 hover:bg-blue-900 text-white border border-blue-400/30 transition-all flex items-center justify-center gap-1.5"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Attendance Log</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
