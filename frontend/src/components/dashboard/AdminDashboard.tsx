import { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import QuickActions from '@/components/dashboard/QuickActions';
import {
    Users,
    GraduationCap,
    DollarSign,
    TrendingUp,
    UserCheck,
    BookOpen,
    CreditCard,
    Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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

            setStudentsAnalytics(studentsData);
            setTeachersAnalytics(teachersData);
            setBusinessAnalytics(businessData);
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
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Section: Quick Stats & Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left: Quick Business Overview (KPIs) */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard
                            title="Total Revenue"
                            value={businessAnalytics ? `₹${businessAnalytics.payments.totalRevenue.toLocaleString()}` : '...'}
                            icon={DollarSign}
                            description={businessAnalytics ? `+₹${businessAnalytics.payments.revenueLast30Days.toLocaleString()} (30d)` : ''}
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800"
                        />
                        <StatCard
                            title="Active Students"
                            value={studentsAnalytics.length}
                            icon={Users}
                            className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800"
                            description={businessAnalytics ? `+${businessAnalytics.students.newLast30Days} new (30d)` : ''}
                        />
                        <StatCard
                            title="Total Teachers"
                            value={teachersAnalytics.length}
                            icon={GraduationCap}
                            className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800"
                        />
                    </div>

                    {/* Main Charts Area */}
                    {businessAnalytics && (
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle>Revenue & Growth Trend</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
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

                {/* Right: Quick Actions */}
                <div className="xl:col-span-1">
                    <QuickActions />

                    {/* Additional Mini Stats or Recent Activity could go here */}
                    <Card className="mt-6 border-none shadow-md bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-orange-600" />
                                Pending Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {businessAnalytics && (
                                    <>
                                        <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                                            <span className="text-sm font-medium">Pending Payments</span>
                                            <Badge variant="destructive" className="ml-auto">
                                                {businessAnalytics.payments.pendingCount}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-black/20 rounded-lg">
                                            <span className="text-sm font-medium">New Students (Today)</span>
                                            <Badge variant="secondary" className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                                {businessAnalytics.students.newToday}
                                            </Badge>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Detailed Analytics Tabs */}
            <Tabs defaultValue="students" className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">Detailed Analytics</h2>
                    <TabsList>
                        <TabsTrigger value="students">Students</TabsTrigger>
                        <TabsTrigger value="teachers">Teachers</TabsTrigger>
                        <TabsTrigger value="business">Business</TabsTrigger>
                    </TabsList>
                </div>

                {/* Students Tab */}
                <TabsContent value="students" className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Input
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                            <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>All Students Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredStudents.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No students found</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {filteredStudents.slice(0, 10).map((student) => (
                                            <div
                                                key={student.studentId}
                                                className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold">{student.studentName}</h3>
                                                    <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-4 mt-4 md:mt-0">
                                                    <div className="text-center">
                                                        <p className="text-xs text-muted-foreground">Tests</p>
                                                        <p className="font-semibold">{(student.tests?.averageScore || 0).toFixed(1)}%</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-muted-foreground">Activities</p>
                                                        <p className="font-semibold">{student.activities.played}</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-xs text-muted-foreground">Hours</p>
                                                        <p className="font-semibold">{(student.totalHoursSpent || 0).toFixed(1)}h</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Teachers Tab */}
                <TabsContent value="teachers" className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <StatCard
                            title="Total Teachers"
                            value={teachersAnalytics.length}
                            icon={UserCheck}
                        />
                        <StatCard
                            title="Total Subjects"
                            value={teachersAnalytics.reduce((sum, t) => sum + t.subjectsCount, 0)}
                            icon={BookOpen}
                        />
                        <StatCard
                            title="Students Taught"
                            value={teachersAnalytics.reduce((sum, t) => sum + t.studentsCount, 0)}
                            icon={Users}
                        />
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Teachers Directory</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredTeachers.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No teachers found</p>
                                ) : (
                                    <div className="grid gap-4">
                                        {filteredTeachers.map((teacher) => (
                                            <div
                                                key={teacher.teacherId}
                                                className="p-4 border rounded-lg hover:shadow-md transition-shadow bg-card"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{teacher.teacherName}</h3>
                                                        <p className="text-sm text-muted-foreground">{teacher.teacherEmail}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Badge variant="secondary">{teacher.subjectsCount} Subjects</Badge>
                                                        <Badge variant="outline">{teacher.studentsCount} Students</Badge>
                                                    </div>
                                                </div>
                                                {teacher.subjects.length > 0 && (
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {teacher.subjects.map((subject) => (
                                                            <Badge key={subject.id} variant="secondary" className="bg-primary/10 hover:bg-primary/20 text-primary border-transparent">
                                                                {subject.name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Overview/Business Tab */}
                <TabsContent value="business" className="space-y-6 animate-in fade-in duration-300">
                    {businessAnalytics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Growth Metrics</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">New Students (Last 7 Days)</span>
                                            <span className="text-xl font-bold">{businessAnalytics.students.newLast7Days}</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-primary w-[70%]" /> {/* Mock width */}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Activity Enrollments (30d)</span>
                                            <span className="text-xl font-bold">{businessAnalytics.activityGroups.enrollmentsLast30Days}</span>
                                        </div>
                                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 w-[50%]" /> {/* Mock width */}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Financial Health</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <span className="font-medium">Total Revenue</span>
                                        <span className="font-bold text-green-600">₹{businessAnalytics.payments.totalRevenue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <span className="font-medium">Paid Invoices</span>
                                        <span className="font-bold">{businessAnalytics.payments.paidCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <span className="font-medium">Pending Invoices</span>
                                        <span className="font-bold text-red-500">{businessAnalytics.payments.pendingCount}</span>
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
