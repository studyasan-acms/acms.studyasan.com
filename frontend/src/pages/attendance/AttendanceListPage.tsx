import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, ChevronRight, ClipboardCheck } from 'lucide-react';
import { format } from 'date-fns';

interface ClassSession {
  id: number;
  subject: {
    name: string;
  };
  teacher: {
    id: number;
    user?: {
      name: string;
    };
  };
  class?: {
    name: string;
  };
  board?: {
    name: string;
  };
  start_time: string;
  end_time: string;
  mode: string;
  _count?: {
    attendances: number;
  };
}

export default function AttendanceListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch past sessions (where attendance would be recorded)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/'}class-sessions/past`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        // API returns sessions directly in data array
        setSessions(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.message || 'Failed to fetch sessions');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const viewAttendance = (sessionId: number) => {
    navigate(`/class-sessions/${sessionId}/attendance`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ClipboardCheck className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Class Attendance</h1>
        </div>
        <p className="text-muted-foreground">
          View attendance records for past class sessions
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardCheck className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Sessions Found</h3>
            <p className="text-muted-foreground">
              There are no past class sessions with attendance records yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => viewAttendance(session.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {session.subject.name}
                      </h3>
                      <Badge variant="outline" className="bg-blue-50">
                        {session.mode}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(session.start_time), 'PPP')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(session.start_time), 'p')} -{' '}
                        {format(new Date(session.end_time), 'p')}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {session.teacher?.user?.name || 'Teacher'}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-4 flex-shrink-0"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
