import { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsService } from '@/services/api';
import QuickActions from '@/components/dashboard/QuickActions';
import {
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  UserCheck,
  Activity,
  Search,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { useAuthStore } from '@/store/authStore';

interface StudentAnalytics {
  studentId: number;
  studentName: string;
  studentEmail: string;
  classes: { attended: number; totalHours: number };
  tests: { attempted: number; averageScore: number };
  activities: { played: number; averageScore: number };
  modules: { completed: number; total: number; averageProgress: number };
  homework: { submitted: number; checked: number };
  totalHoursSpent: number;
}

interface TeacherAnalytics {
  teacherId: number;
  teacherName: string;
  teacherEmail: string;
  subjectsCount: number;
  studentsCount: number;
  subjects: Array<{ id: number; name: string; studentsEnrolled: number }>;
}

interface BusinessAnalytics {
  students: {
    total: number;
    newLast30Days: number;
    newLast7Days: number;
    newToday: number;
    byDay: Array<{ date: string; count: number }>;
  };
  payments: {
    totalRevenue: number;
    revenueLast30Days: number;
    paidCount: number;
    pendingCount: number;
    totalCount: number;
    byDay: Array<{ date: string; total: number }>;
  };
  enrollments: {
    total: number;
    last30Days: number;
  };
  activityGroups: {
    totalEnrollments: number;
    enrollmentsLast30Days: number;
    revenueLast30Days: number;
  };
  testSeries: {
    totalEnrollments: number;
    enrollmentsLast30Days: number;
    revenueLast30Days: number;
  };
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [studentsAnalytics, setStudentsAnalytics] = useState<StudentAnalytics[]>([]);
  const [teachersAnalytics, setTeachersAnalytics] = useState<TeacherAnalytics[]>([]);
  const [businessAnalytics, setBusinessAnalytics] = useState<BusinessAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const hasInitiallyFetched = useRef(false);

  const fetchAllAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsData, teachersData, businessData] = await Promise.all([
        analyticsService.getAdminStudentsAnalytics(),
        analyticsService.getAdminTeachersAnalytics(),
        analyticsService.getAdminBusinessAnalytics()
      ]);

      setStudentsAnalytics(studentsData || []);
      setTeachersAnalytics(teachersData || []);
      setBusinessAnalytics(businessData || null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true;
      fetchAllAnalytics();
    }
  }, [fetchAllAnalytics]);

  const filteredStudents = studentsAnalytics.filter(s =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeachers = teachersAnalytics.filter(t =>
    t.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.teacherEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Executive Dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">



      {/* TOP GRID: STAT CARDS & QUICK ACTIONS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* LEFT 2 COLUMNS: STAT KPI CARDS & REVENUE CHART */}
        <div className="xl:col-span-2 space-y-5">

          {/* 3 COMPACT KPI STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">

            {/* Total Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-saBlue/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
                <div className="w-9 h-9 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  ₹{businessAnalytics ? businessAnalytics.payments.totalRevenue.toLocaleString() : "0"}
                </h3>
                <p className="text-[11px] font-bold text-saBlue mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +₹{businessAnalytics ? businessAnalytics.payments.revenueLast30Days.toLocaleString() : "0"} (30d)
                </p>
              </div>
            </div>

            {/* Active Students */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-saBlue/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Students</span>
                <div className="w-9 h-9 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {studentsAnalytics.length}
                </h3>
                <p className="text-[11px] font-bold text-saBlue mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{businessAnalytics ? businessAnalytics.students.newLast30Days : 0} new (30d)
                </p>
              </div>
            </div>

            {/* Total Teachers */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-saBlue/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Teachers</span>
                <div className="w-9 h-9 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  {teachersAnalytics.length}
                </h3>
                <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-saBlue" />
                  Active Faculty Members
                </p>
              </div>
            </div>
          </div>

          {/* REVENUE & GROWTH CHART CARD */}
          {businessAnalytics && (
            <Card className="rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-extrabold text-slate-900">
                    Revenue & Growth Trend
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Daily payment collection insights</p>
                </div>
                <Badge variant="outline" className="border-saBlue/20 text-saBlue font-bold text-[10px] bg-saBlue/5">
                  Last 30 Days
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-[280px]">
                  <AnalyticsChart
                    title=""
                    data={businessAnalytics.payments.byDay.map(d => ({
                      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      revenue: d.total
                    }))}
                    type="area"
                    dataKey="revenue"
                    xAxisKey="date"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS & PENDING ACTIONS */}
        <div className="space-y-4">
          <QuickActions />

          {/* PENDING ACTIONS CARD */}
          <Card className="rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-saBlue" />
                Pending Actions & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {businessAnalytics && (
                <>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Pending Payments</span>
                    </div>
                    <Badge className="bg-saVividOrange text-white font-extrabold text-xs px-2.5">
                      {businessAnalytics.payments.pendingCount}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">New Students (Today)</span>
                    </div>
                    <Badge className="bg-saBlue text-white font-extrabold text-xs px-2.5">
                      +{businessAnalytics.students.newToday}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DETAILED ANALYTICS TABS */}
      <Tabs defaultValue="students" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900 px-1">Detailed Analytics Directory</h2>
          <TabsList className="bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="students" className="rounded-lg text-xs font-bold px-3 data-[state=active]:bg-saBlue data-[state=active]:text-white">
              Students ({studentsAnalytics.length})
            </TabsTrigger>
            <TabsTrigger value="teachers" className="rounded-lg text-xs font-bold px-3 data-[state=active]:bg-saBlue data-[state=active]:text-white">
              Teachers ({teachersAnalytics.length})
            </TabsTrigger>
            <TabsTrigger value="business" className="rounded-lg text-xs font-bold px-3 data-[state=active]:bg-saBlue data-[state=active]:text-white">
              Business Health
            </TabsTrigger>
          </TabsList>
        </div>

        {/* STUDENTS TAB */}
        <TabsContent value="students" className="space-y-4">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-saBlue"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Students Performance Overview</h3>
              <span className="text-xs text-slate-500 font-semibold">{filteredStudents.length} records</span>
            </div>
            {filteredStudents.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-10">No students found matching your search</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs font-medium">
                {filteredStudents.slice(0, 15).map((student) => (
                  <div
                    key={student.studentId}
                    className="p-3.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs shrink-0 border border-saBlue/20">
                        {student.studentName ? student.studentName[0].toUpperCase() : "S"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{student.studentName}</h4>
                        <p className="text-[11px] text-slate-500">{student.studentEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end md:self-auto">
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Test Avg</p>
                        <p className="font-black text-slate-800 text-xs">{(student.tests?.averageScore || 0).toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Activities</p>
                        <p className="font-black text-slate-800 text-xs">{student.activities?.played || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Time</p>
                        <p className="font-black text-slate-800 text-xs">{(student.totalHoursSpent || 0).toFixed(1)}h</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TEACHERS TAB */}
        <TabsContent value="teachers" className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Faculty Directory & Subjects Taught</h3>
              <span className="text-xs text-slate-500 font-semibold">{filteredTeachers.length} educators</span>
            </div>
            {filteredTeachers.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-10">No teachers found</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs font-medium">
                {filteredTeachers.map((teacher) => (
                  <div key={teacher.teacherId} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs shrink-0 border border-saBlue/20">
                          {teacher.teacherName ? teacher.teacherName[0].toUpperCase() : "T"}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{teacher.teacherName}</h4>
                          <p className="text-[11px] text-slate-500">{teacher.teacherEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 font-bold text-[10px]">
                          {teacher.subjectsCount} Subjects
                        </Badge>
                        <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 font-bold text-[10px]">
                          {teacher.studentsCount} Students
                        </Badge>
                      </div>
                    </div>

                    {teacher.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 pl-11">
                        {teacher.subjects.map((sub) => (
                          <Badge key={sub.id} className="bg-slate-100 text-slate-700 font-semibold text-[10px] hover:bg-slate-200 border-none">
                            {sub.name} ({sub.studentsEnrolled} students)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* BUSINESS TAB */}
        <TabsContent value="business" className="space-y-4">
          {businessAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-2xl border border-slate-200/80 shadow-sm bg-white">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-extrabold text-slate-900">Student Enrolment Growth</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">New Students (Last 7 Days)</span>
                    <span className="font-black text-slate-900 text-sm">{businessAnalytics.students.newLast7Days}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">New Students (Last 30 Days)</span>
                    <span className="font-black text-slate-900 text-sm">{businessAnalytics.students.newLast30Days}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 font-medium">Total Registered Cohort</span>
                    <span className="font-black text-saBlue text-sm">{businessAnalytics.students.total}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-slate-200/80 shadow-sm bg-white">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-extrabold text-slate-900">Financial Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Total Lifetime Revenue</span>
                    <span className="font-black text-saBlue text-sm">₹{businessAnalytics.payments.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Paid Invoices</span>
                    <span className="font-black text-slate-900 text-sm">{businessAnalytics.payments.paidCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 font-medium">Pending Invoices</span>
                    <span className="font-black text-saVividOrange text-sm">{businessAnalytics.payments.pendingCount}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
