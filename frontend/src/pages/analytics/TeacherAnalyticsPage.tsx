import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { analyticsService, subjectService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
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
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePageTitle } from "@/hooks/usePageTitle";

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

import type { Subject } from '@/types';
export default function TeacherAnalyticsPage() {
    usePageTitle("Teacher Analytics");
    const [studentsAnalytics, setStudentsAnalytics] = useState<StudentAnalytics[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);

    const formatSubjectFilterLabel = (subject: Subject) => {
        const classPart = subject.class?.name ? ` (${subject.class.name})` : '';
        const boardPart = subject.board?.name ? ` [${subject.board.name}]` : '';
        return `${subject.name}${classPart}${boardPart}`;
    };

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
            const response = await subjectService.getAll();
            setSubjects(response.data?.data || []);
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const totalStudents = studentsAnalytics.length;
    const avgTestScore = studentsAnalytics.length > 0
        ? studentsAnalytics.reduce((sum, s) => sum + (s.tests?.averageScore || 0), 0) / studentsAnalytics.length
        : 0;
    const avgActivityScore = studentsAnalytics.length > 0
        ? studentsAnalytics.reduce((sum, s) => sum + (s.activities?.averageScore || 0), 0) / studentsAnalytics.length
        : 0;
    const totalHoursSpent = studentsAnalytics.reduce((sum, s) => sum + (s.totalHoursSpent || 0), 0);

    const performanceData = studentsAnalytics.map(s => ({
        name: s.studentName.split(' ')[0], // First name only for chart
        testScore: s.tests.averageScore,
        activityScore: s.activities.averageScore
    })).slice(0, 10); // Top 10 students

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Student Analytics</h1>
                    <p className="text-muted-foreground">Monitor your students' progress and performance</p>
                </div>
                <SearchablePaginatedSelect
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                    placeholder="Filter by subject"
                    searchPlaceholder="Search subject..."
                    triggerClassName="w-full md:w-[250px]"
                    options={[
                        { value: 'all', label: 'All Subjects' },
                        ...subjects.map((subject) => ({
                            value: subject.id.toString(),
                            label: formatSubjectFilterLabel(subject),
                            searchText: `${subject.name} ${subject.class?.name || ''} ${subject.board?.name || ''}`,
                        })),
                    ]}
                />
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Students"
                    value={totalStudents}
                    icon={Users}
                    description={selectedSubject === 'all' ? 'All subjects' : 'In selected subject'}
                />
                <StatCard
                    title="Avg. Test Score"
                    value={`${(avgTestScore || 0).toFixed(1)}%`}
                    icon={Award}
                    description="Across all students"
                />
                <StatCard
                    title="Avg. Activity Score"
                    value={`${(avgActivityScore || 0).toFixed(1)}%`}
                    icon={TrendingUp}
                    description="Across all students"
                />
                <StatCard
                    title="Total Study Hours"
                    value={(totalHoursSpent || 0).toFixed(1)}
                    icon={BookOpen}
                    description="Combined student hours"
                />
            </div>

            {/* Performance Chart */}
            {performanceData.length > 0 && (
                <AnalyticsChart
                    title="Student Performance Comparison"
                    data={performanceData}
                    type="bar"
                    dataKey="testScore"
                    xAxisKey="name"
                    seriesName="Test Score"
                    valueSuffix="%"
                />
            )}

            {/* Students List */}
            <Card>
                <CardHeader>
                    <CardTitle>Student Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {studentsAnalytics.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No students found</p>
                        ) : (
                            <div className="grid gap-4">
                                {studentsAnalytics.map((student) => (
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
                                                <Badge variant="outline">
                                                    Classes: {student.classes.attended}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Tests: {student.tests.attempted}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Activities: {student.activities.played}
                                                </Badge>
                                                <Badge variant="outline">
                                                    Modules: {student.modules.completed}/{student.modules.total}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Test Avg.</p>
                                                <p className="font-semibold">{(student.tests?.averageScore || 0).toFixed(1)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Activity Avg.</p>
                                                <p className="font-semibold">{(student.activities?.averageScore || 0).toFixed(1)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Module Progress</p>
                                                <p className="font-semibold">{(student.modules?.averageProgress || 0).toFixed(1)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Total Hours</p>
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
        </div>
    );
}
