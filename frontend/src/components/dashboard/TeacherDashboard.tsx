import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { analyticsService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import QuickActions from '@/components/dashboard/QuickActions';
import {
    Users,
    BookOpen,
    TrendingUp,
    Award
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StudentAnalytics {
    studentId: number;
    studentName: string;
    studentEmail: string;
    classes: { attended: number; totalHours: number };
    tests: { attempted: number; averageScore: number };
    activities: { played: number; averageScore: number; totalHours: number };
    modules: { completed: number; total: number; averageProgress: number; totalHours: number };
    homework: { submitted: number; checked: number };
    totalHoursSpent: number;
}

interface Subject {
    id: number;
    name: string;
}

export default function TeacherDashboard() {
    const [studentsAnalytics, setStudentsAnalytics] = useState<StudentAnalytics[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchSubjects();
        fetchStudentsAnalytics();
    }, []);

    useEffect(() => {
        if (selectedSubject !== 'all') {
            fetchSubjectAnalytics(selectedSubject);
        } else {
            fetchStudentsAnalytics();
        }
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSubjects(data);
            }
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchStudentsAnalytics = async () => {
        try {
            setLoading(true);
            const data = await analyticsService.getTeacherStudentsAnalytics();
            setStudentsAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjectAnalytics = async (subjectId: string) => {
        try {
            setLoading(true);
            const data = await analyticsService.getTeacherSubjectAnalytics(subjectId);
            setStudentsAnalytics(data);
        } catch (error) {
            console.error('Error fetching subject analytics:', error);
            toast.error('Failed to load subject analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const totalStudents = studentsAnalytics.length;
    const avgTestScore = studentsAnalytics.length > 0
        ? studentsAnalytics.reduce((sum, s) => sum + s.tests.averageScore, 0) / studentsAnalytics.length
        : 0;
    const avgActivityScore = studentsAnalytics.length > 0
        ? studentsAnalytics.reduce((sum, s) => sum + s.activities.averageScore, 0) / studentsAnalytics.length
        : 0;
    const totalHoursSpent = studentsAnalytics.reduce((sum, s) => sum + s.totalHoursSpent, 0);

    const performanceData = studentsAnalytics.map(s => ({
        name: s.studentName.split(' ')[0], // First name only for chart
        testScore: s.tests.averageScore,
        activityScore: s.activities.averageScore
    })).slice(0, 10); // Top 10 students

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Section: Quick Actions + Filter */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-muted-foreground">Classroom Overview</h2>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="w-full md:w-[250px]">
                            <SelectValue placeholder="Filter by subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                    {subject.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Stats & Charts */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            title="Total Students"
                            value={totalStudents}
                            icon={Users}
                            description={selectedSubject === 'all' ? 'All active students' : 'Enrolled in subject'}
                            className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
                        />
                        <StatCard
                            title="Avg. Class Performance"
                            value={`${avgTestScore.toFixed(1)}%`}
                            icon={Award}
                            className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800"
                            description="Based on recent tests"
                        />
                        <StatCard
                            title="Avg. Activity Score"
                            value={`${avgActivityScore.toFixed(1)}%`}
                            className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800"
                            icon={TrendingUp}
                        />
                        <StatCard
                            title="Total Learning Hours"
                            value={totalHoursSpent.toFixed(1)}
                            icon={BookOpen}
                            className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
                            description="Cumulative student time"
                        />
                    </div>

                    {performanceData.length > 0 && (
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <CardTitle>Top Student Performance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AnalyticsChart
                                    title=""
                                    data={performanceData}
                                    type="bar"
                                    dataKey="testScore"
                                    xAxisKey="name"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Quick Actions & Student List Preview */}
                <div className="space-y-6">
                    <QuickActions />

                    <Card className="h-full max-h-[500px] overflow-hidden flex flex-col">
                        <CardHeader>
                            <CardTitle>Recent Student Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-y-auto flex-1 pr-2">
                            <div className="space-y-4">
                                {studentsAnalytics.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No activity found</p>
                                ) : (
                                    studentsAnalytics.slice(0, 5).map((student) => (
                                        <div
                                            key={student.studentId}
                                            className="p-3 border rounded-lg bg-card/50 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-semibold text-sm">{student.studentName}</h3>
                                                <Badge variant={student.tests.averageScore > 75 ? "default" : "secondary"} className="text-[10px]">
                                                    {student.tests.averageScore.toFixed(0)}% Avg
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <div>Classes: {student.classes.attended}</div>
                                                <div>Modules: {student.modules.completed}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
