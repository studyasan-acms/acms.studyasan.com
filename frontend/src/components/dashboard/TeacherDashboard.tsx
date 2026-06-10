import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { analyticsService, announcementService, subjectService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import QuickActions from '@/components/dashboard/QuickActions';
import {
    Users,
    BookOpen,
    TrendingUp,
    Award,
    Megaphone
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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

import type { Subject } from '@/types';
export default function TeacherDashboard() {
    const [studentsAnalytics, setStudentsAnalytics] = useState<StudentAnalytics[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubjects();
        fetchStudentsAnalytics();
        fetchAnnouncements();
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

    const fetchAnnouncements = async () => {
        try {
            const res = await announcementService.getAnnouncements();
            setAnnouncements(res.data?.announcements || []);
        } catch (error) {
            console.error('Error fetching announcements:', error);
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Announcements Section */}
            {announcements.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-orange-100">
                                <Megaphone className="h-5 w-5 text-orange-600" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Latest Announcements</h2>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-primary hover:bg-primary/5"
                            onClick={() => navigate('/dashboard/announcements')}
                        >
                            View All
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {announcements.slice(0, 3).map((a) => (
                            <Card 
                                key={a.id} 
                                className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-orange-400" 
                                onClick={() => navigate('/dashboard/announcements')}
                            >
                                <CardHeader className="py-3 px-4 flex flex-row items-start justify-between space-y-0">
                                    <CardTitle className="text-sm font-bold line-clamp-1 pr-2">{a.title}</CardTitle>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                                        {new Date(a.created_at).toLocaleDateString()}
                                    </span>
                                </CardHeader>
                                <CardContent className="py-2 px-4">
                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{a.content}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
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
                            value={`${(avgTestScore || 0).toFixed(1)}%`}
                            icon={Award}
                            className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800"
                            description="Based on recent tests"
                        />
                        <StatCard
                            title="Avg. Activity Score"
                            value={`${(avgActivityScore || 0).toFixed(1)}%`}
                            className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800"
                            icon={TrendingUp}
                        />
                        <StatCard
                            title="Total Learning Hours"
                            value={(totalHoursSpent || 0).toFixed(1)}
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
                                                <Badge variant={(student.tests?.averageScore || 0) > 75 ? "default" : "secondary"} className="text-[10px]">
                                                    {(student.tests?.averageScore || 0).toFixed(0)}% Avg
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
