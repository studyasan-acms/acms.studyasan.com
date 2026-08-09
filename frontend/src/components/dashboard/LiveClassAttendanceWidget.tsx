import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, ArrowUpRight, UserCheck, Calendar, Sparkles } from 'lucide-react';
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
    <Card className="overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-r from-[#0276D3] via-[#025AA3] to-indigo-900 text-white shadow-lg">
      <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2.5 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            {isLiveNow ? (
              <Badge className="bg-red-500 text-white font-black text-xs px-3 py-1 rounded-xl animate-pulse flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                LIVE CLASS NOW
              </Badge>
            ) : (
              <Badge className="bg-[#eca209] text-white font-black text-xs px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-md">
                <Clock className="w-3.5 h-3.5" />
                UPCOMING CLASS
              </Badge>
            )}
            <span className="text-xs text-blue-100 font-bold bg-white/10 px-2.5 py-0.5 rounded-lg backdrop-blur-xs">
              {dateFormatted} at {timeFormatted}
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
            {(closestSession as any).title || closestSession.subject?.name || 'Scheduled Live Session'}
          </h3>

          <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100 font-medium">
            <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-xl backdrop-blur-xs">
              <UserCheck className="w-3.5 h-3.5 text-amber-300" />
              Faculty: {closestSession.teacher?.user?.name || 'Assigned Teacher'}
            </span>
            {(closestSession.class?.name || closestSession.board?.name) && (
              <span className="flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-xl backdrop-blur-xs font-bold text-amber-200">
                {closestSession.class?.name || 'All Classes'} {closestSession.board?.name ? `[${closestSession.board.name}]` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <Button
            size="lg"
            onClick={() => handleJoinOrAttend(closestSession)}
            className={`w-full sm:w-auto h-12 px-6 rounded-2xl font-extrabold text-sm shadow-lg transition-all ${
              isLiveNow
                ? 'bg-[#eca209] hover:bg-[#d49106] text-white shadow-amber-500/30'
                : 'bg-white text-[#0276D3] hover:bg-blue-50 shadow-white/20'
            }`}
          >
            <Video className="w-4 h-4 mr-2" />
            {isLiveNow ? 'Join Live Class Now' : 'View Class Session'}
            <ArrowUpRight className="w-4 h-4 ml-1.5" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(`/dashboard/class-sessions/${closestSession.id}/attendance`)}
            className="w-full sm:w-auto h-12 px-4 rounded-2xl text-xs font-bold border-white/30 text-white hover:bg-white/10 backdrop-blur-xs"
          >
            Attendance Log
          </Button>
        </div>
      </div>
    </Card>
  );
}
