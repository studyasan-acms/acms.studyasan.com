import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, ArrowUpRight, UserCheck, Calendar } from 'lucide-react';
import { classSessionService, attendanceService } from '@/services/api';
import type { ClassSession } from '@/types';
import { toast } from 'sonner';

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

      // STRICT MANDATE: Attendance is ONLY available till the time of class.
      // Disappears as soon as the class ends. Filter out ended classes completely!
      const activeOrUpcoming = allSessions.filter((s) => {
        const endTime = new Date(s.end_time);
        return now <= endTime;
      });

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

  return (
    <Card className="rounded-2xl border border-saBlue/20 bg-gradient-to-r from-saBlue/5 via-white to-blue-50/40 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-saBlue text-white font-bold">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Live & Active Class Sessions
            </h3>
            <p className="text-[11px] font-medium text-slate-500">
              Attendance active until class ends. Recorded automatically for Google Meet & live links.
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-500 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full animate-pulse">
          Live Window Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sessions.map((session) => {
          const now = new Date();
          const start = new Date(session.start_time);
          const end = new Date(session.end_time);
          const isLiveNow = now >= start && now <= end;

          return (
            <div
              key={session.id}
              className="p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between space-y-2 hover:border-saBlue/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[9px] font-black uppercase px-2 py-0.5 border-none ${
                      isLiveNow
                        ? 'bg-emerald-100 text-emerald-700 animate-pulse'
                        : 'bg-saBlue/10 text-saBlue'
                    }`}
                  >
                    {isLiveNow ? 'Live Now' : 'Starts Soon'}
                  </Badge>
                  <span className="text-[10px] font-bold text-slate-400">
                    Until {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h4 className="text-xs font-black text-slate-900 line-clamp-1">
                  {session.subject?.name || 'Scheduled Class'}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-0.5">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
                    {session.teacher?.user?.name || 'Faculty Member'}
                  </span>
                  {(session.class?.name || session.board?.name) && (
                    <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                      {session.class?.name || 'All'} {session.board?.name ? `(${session.board.name})` : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  onClick={() => handleJoinOrAttend(session)}
                  className={`flex-1 h-8 rounded-lg font-bold text-xs ${
                    isLiveNow
                      ? 'bg-saBlue hover:bg-saBlueDarkHover text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isLiveNow ? (session.meeting_link ? 'Join Google Meet & Record' : 'Join Live Class') : 'View Session'}
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard/class-sessions/${session.id}/attendance`)}
                  className="h-8 px-2.5 rounded-lg text-[11px] font-bold border-slate-200 text-slate-600 hover:text-saBlue hover:bg-saBlue/10"
                >
                  Attendance Log
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
