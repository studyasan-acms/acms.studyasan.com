import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { usePageTitle } from "@/hooks/usePageTitle";

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
  usePageTitle("Class Attendance");
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AttendanceData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    if (minutes === null) return '—';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'TEACHER':
      case 'ADMIN':
        return 'bg-blue-500';
      case 'STUDENT':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-96 w-full bg-gray-200 animate-pulse rounded" />
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

  if (!data) return null;

  const { session, attendances, canViewAll } = data;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-2">Class Attendance</h1>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {session.start_time && format(new Date(session.start_time), 'PPP')}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {session.start_time && format(new Date(session.start_time), 'p')} - {session.end_time && format(new Date(session.end_time), 'p')}
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Teacher: {session.teacher}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {session.subject}
          </CardTitle>
          <CardDescription>
            {canViewAll
              ? `Total participants: ${attendances.length}`
              : 'Your attendance record'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>First Join</TableHead>
                  <TableHead>Last Leave</TableHead>
                  <TableHead>Join Count</TableHead>
                  <TableHead>Total Duration</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendances.map((record) => (
                    <>
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.user.name}
                          {record.user.id === user?.id && (
                            <Badge variant="outline" className="ml-2">You</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeColor(record.role)}>
                            {record.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.joined_at && new Date(record.joined_at).getTime()
                            ? format(new Date(record.joined_at), 'p')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {record.left_at && new Date(record.left_at).getTime()
                            ? format(new Date(record.left_at), 'p')
                            : 'Still in class'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{record.total_joins}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDuration(record.total_duration)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(record.id)}
                          >
                            {expandedRows.has(record.id) ? 'Hide' : 'Show'}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(record.id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/50">
                            <div className="p-4">
                              <h4 className="font-semibold mb-3">Session History</h4>
                              <div className="space-y-2">
                                {record.attendance_logs.map((log, index) => (
                                  <div
                                    key={log.id}
                                    className="flex items-center justify-between bg-background p-3 rounded-md border"
                                  >
                                    <div className="flex items-center gap-4">
                                      <Badge variant="outline">#{index + 1}</Badge>
                                      <div>
                                        <div className="text-sm">
                                          <span className="font-medium">Joined:</span>{' '}
                                          {log.joined_at && new Date(log.joined_at).getTime()
                                            ? format(new Date(log.joined_at), 'PPp')
                                            : '—'}
                                        </div>
                                        {log.left_at && (
                                          <div className="text-sm text-muted-foreground">
                                            <span className="font-medium">Left:</span>{' '}
                                            {new Date(log.left_at).getTime()
                                              ? format(new Date(log.left_at), 'PPp')
                                              : '—'}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold">
                                        {log.left_at
                                          ? formatDuration(log.duration_minutes)
                                          : 'In progress'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
