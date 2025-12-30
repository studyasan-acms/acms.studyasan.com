import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { analyticsService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import {
    Users,
    GraduationCap,
    DollarSign,
    TrendingUp,
    UserCheck,
    BookOpen,
    CreditCard
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

export default function AdminAnalyticsPage() {
    const [studentsAnalytics, setStudentsAnalytics] = useState<StudentAnalytics[]>([]);
    const [teachersAnalytics, setTeachersAnalytics] = useState<TeacherAnalytics[]>([]);
    const [businessAnalytics, setBusinessAnalytics] = useState<BusinessAnalytics | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    // Remove token requirement
    // const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchAllAnalytics();
    }, []);

    const fetchAllAnalytics = async () => {
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
    };

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
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Comprehensive analytics for students, teachers, and business</p>
            </div>

            <Tabs defaultValue="students" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="teachers">Teachers</TabsTrigger>
                    <TabsTrigger value="business">Business</TabsTrigger>
                </TabsList>

                {/* Students Tab */}
                <TabsContent value="students" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Total Students"
                            value={studentsAnalytics.length}
                            icon={Users}
                        />
                        <StatCard
                            title="Avg. Test Score"
                            value={`${(studentsAnalytics.reduce((sum, s) => sum + s.tests.averageScore, 0) / studentsAnalytics.length || 0).toFixed(1)}%`}
                            icon={TrendingUp}
                        />
                        <StatCard
                            title="Total Classes"
                            value={studentsAnalytics.reduce((sum, s) => sum + s.classes.attended, 0)}
                            icon={BookOpen}
                        />
                        <StatCard
                            title="Total Study Hours"
                            value={studentsAnalytics.reduce((sum, s) => sum + s.totalHoursSpent, 0).toFixed(1)}
                            icon={GraduationCap}
                        />
                    </div>

                    <Input
                        placeholder="Search students by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>All Students</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredStudents.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No students found</p>
                                ) : (
                                    filteredStudents.map((student) => (
                                        <div
                                            key={student.studentId}
                                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{student.studentName}</h3>
                                                    <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge>Tests: {student.tests.averageScore.toFixed(1)}%</Badge>
                                                    <Badge>Activities: {student.activities.played}</Badge>
                                                    <Badge>Hours: {student.totalHoursSpent.toFixed(1)}h</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Teachers Tab */}
                <TabsContent value="teachers" className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                    <Input
                        placeholder="Search teachers by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>All Teachers</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {filteredTeachers.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No teachers found</p>
                                ) : (
                                    filteredTeachers.map((teacher) => (
                                        <div
                                            key={teacher.teacherId}
                                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{teacher.teacherName}</h3>
                                                    <p className="text-sm text-muted-foreground">{teacher.teacherEmail}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge>Subjects: {teacher.subjectsCount}</Badge>
                                                    <Badge>Students: {teacher.studentsCount}</Badge>
                                                </div>
                                            </div>
                                            {teacher.subjects.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-sm font-medium mb-2">Subjects:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {teacher.subjects.map((subject) => (
                                                            <Badge key={subject.id} variant="outline">
                                                                {subject.name} ({subject.studentsEnrolled})
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Business Tab */}
                <TabsContent value="business" className="space-y-6">
                    {businessAnalytics && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    title="Total Students"
                                    value={businessAnalytics.students.total}
                                    icon={Users}
                                    description={`+${businessAnalytics.students.newLast30Days} last 30 days`}
                                />
                                <StatCard
                                    title="New This Week"
                                    value={businessAnalytics.students.newLast7Days}
                                    icon={UserCheck}
                                    description="Last 7 days"
                                />
                                <StatCard
                                    title="Total Revenue"
                                    value={`₹${businessAnalytics.payments.totalRevenue.toLocaleString()}`}
                                    icon={DollarSign}
                                    description={`₹${businessAnalytics.payments.revenueLast30Days.toLocaleString()} last 30 days`}
                                />
                                <StatCard
                                    title="Pending Payments"
                                    value={businessAnalytics.payments.pendingCount}
                                    icon={CreditCard}
                                    description={`${businessAnalytics.payments.paidCount} paid`}
                                />
                                <StatCard
                                    title="Activity Group Enrollments"
                                    value={businessAnalytics.activityGroups.totalEnrollments}
                                    icon={BookOpen}
                                    description={`+${businessAnalytics.activityGroups.enrollmentsLast30Days} last 30 days`}
                                />
                                <StatCard
                                    title="Test Series Enrollments"
                                    value={businessAnalytics.testSeries.totalEnrollments}
                                    icon={GraduationCap}
                                    description={`+${businessAnalytics.testSeries.enrollmentsLast30Days} last 30 days`}
                                />
                                <StatCard
                                    title="Activity Revenue (30d)"
                                    value={`₹${businessAnalytics.activityGroups.revenueLast30Days.toLocaleString()}`}
                                    icon={DollarSign}
                                    description="From activity groups"
                                />
                                <StatCard
                                    title="Test Series Revenue (30d)"
                                    value={`₹${businessAnalytics.testSeries.revenueLast30Days.toLocaleString()}`}
                                    icon={DollarSign}
                                    description="From test series"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <AnalyticsChart
                                    title="New Students (Last 30 Days)"
                                    data={businessAnalytics.students.byDay.map(d => ({
                                        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                        count: d.count
                                    }))}
                                    type="line"
                                    dataKey="count"
                                    xAxisKey="date"
                                />
                                <AnalyticsChart
                                    title="Revenue (Last 30 Days)"
                                    data={businessAnalytics.payments.byDay.map(d => ({
                                        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                                        revenue: d.total
                                    }))}
                                    type="bar"
                                    dataKey="revenue"
                                    xAxisKey="date"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Student Growth</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Today</span>
                                            <span className="font-semibold">{businessAnalytics.students.newToday}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last 7 Days</span>
                                            <span className="font-semibold">{businessAnalytics.students.newLast7Days}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last 30 Days</span>
                                            <span className="font-semibold">{businessAnalytics.students.newLast30Days}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Payment Status</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Paid</span>
                                            <span className="font-semibold text-green-600">{businessAnalytics.payments.paidCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Pending</span>
                                            <span className="font-semibold text-orange-600">{businessAnalytics.payments.pendingCount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total</span>
                                            <span className="font-semibold">{businessAnalytics.payments.totalCount}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Enrollments</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total</span>
                                            <span className="font-semibold">{businessAnalytics.enrollments.total}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last 30 Days</span>
                                            <span className="font-semibold">{businessAnalytics.enrollments.last30Days}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Activity Groups</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Enrollments</span>
                                            <span className="font-semibold">{businessAnalytics.activityGroups.totalEnrollments}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last 30 Days</span>
                                            <span className="font-semibold">{businessAnalytics.activityGroups.enrollmentsLast30Days}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Revenue (30d)</span>
                                            <span className="font-semibold text-green-600">₹{businessAnalytics.activityGroups.revenueLast30Days.toLocaleString()}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Test Series</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Enrollments</span>
                                            <span className="font-semibold">{businessAnalytics.testSeries.totalEnrollments}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Last 30 Days</span>
                                            <span className="font-semibold">{businessAnalytics.testSeries.enrollmentsLast30Days}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Revenue (30d)</span>
                                            <span className="font-semibold text-green-600">₹{businessAnalytics.testSeries.revenueLast30Days.toLocaleString()}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
