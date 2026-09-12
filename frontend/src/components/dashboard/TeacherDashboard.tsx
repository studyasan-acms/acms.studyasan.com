import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { analyticsService, announcementService, subjectService } from '@/services/api';
import api from '@/services/api';
import { getAnnouncementTypeConfig } from '@/utils/announcementUtils';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import QuickActions from '@/components/dashboard/QuickActions';
import LiveClassAttendanceWidget from '@/components/dashboard/LiveClassAttendanceWidget';
import UpcomingHolidaysWidget from '@/components/dashboard/UpcomingHolidaysWidget';
import {
    Users,
    BookOpen,
    TrendingUp,
    Award,
    Megaphone,
    PartyPopper
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
    const [isBirthday, setIsBirthday] = useState(false);
    const [teacherName, setTeacherName] = useState<string>('');
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubjects();
        fetchStudentsAnalytics();
        fetchAnnouncements();
        checkBirthday();
    }, []);

    const checkBirthday = async () => {
        try {
            const response = await api.get('/profile');
            const userData = response.data?.data;
            setTeacherName(userData?.name || '');
            const dob: string | null | undefined = userData?.teacher?.date_of_birth;
            if (!dob) return;
            const today = new Date();
            const birth = new Date(dob);
            if (birth.getDate() === today.getDate() && birth.getMonth() === today.getMonth()) {
                setIsBirthday(true);
            }
        } catch {
            // silently fail
        }
    };

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
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
                </div>
                <div className="h-72 bg-slate-100 rounded-xl" />
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

            {/* 🎂 Birthday Banner */}
            {isBirthday && (
                <div
                    className="relative overflow-hidden rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
                    style={{
                        background: 'linear-gradient(135deg, #0276D3 0%, #0590ff 50%, #FF7A00 100%)',
                        boxShadow: '0 8px 32px rgba(2, 118, 211, 0.35)'
                    }}
                >
                    <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full opacity-20" style={{ background: '#FF7A00' }} />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ background: '#ffffff' }} />
                    <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                        <span className="text-4xl select-none">🎂</span>
                    </div>
                    <div className="relative flex-1 text-center sm:text-left">
                        <p className="text-white/80 text-sm font-semibold tracking-widest uppercase mb-0.5">Today is your special day!</p>
                        <h2 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight">
                            Happy Birthday{teacherName ? `, ${teacherName.split(' ')[0]}` : ''}! 🎉
                        </h2>
                        <p className="text-white/75 text-sm mt-1">Wishing you an amazing day. Thank you for inspiring our students every day! 🌟</p>
                    </div>
                    <div className="relative shrink-0 hidden sm:flex items-center justify-center">
                        <PartyPopper className="h-10 w-10 text-white/70" />
                    </div>
                </div>
            )}

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
                        {announcements.slice(0, 3).map((a) => {
                            const config = getAnnouncementTypeConfig(a.type);
                            const Icon = config.icon;
                            return (
                                <Card 
                                    key={a.id} 
                                    className={`hover:shadow-md transition-all cursor-pointer border-l-4 rounded-2xl bg-white ${config.borderLeftClass}`} 
                                    onClick={() => navigate('/dashboard/announcements')}
                                >
                                    <CardHeader className="py-3 px-4 flex flex-col gap-1.5 space-y-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${config.badgeClass}`}>
                                                <Icon className="w-3 h-3" />
                                                <span>{config.label}</span>
                                            </span>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap bg-gray-100 px-1.5 py-0.5 rounded">
                                                {new Date(a.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <CardTitle className="text-sm font-bold line-clamp-1 text-gray-900">{a.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="py-2 px-4 pb-3 space-y-2">
                                        {a.image_url && (
                                            <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-2xs">
                                                <img 
                                                    src={a.image_url} 
                                                    alt={a.title} 
                                                    className="w-full h-36 object-cover hover:scale-105 transition-transform duration-300" 
                                                />
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{a.content}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Live Class Attendance Banner */}
            <LiveClassAttendanceWidget isStudent={false} />

            {/* Upcoming Holidays Widget */}
            <UpcomingHolidaysWidget />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Classroom Overview</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Aggregated performance across your students</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="w-full sm:w-[220px] border-slate-200 text-sm">
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
                                    seriesName="Test Score"
                                    valueSuffix="%"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Quick Actions & Student List Preview */}
                <div className="space-y-6">
                    <QuickActions />

                    <Card className="h-full max-h-[500px] overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-slate-100">
                            <CardTitle className="text-sm font-bold text-slate-800">Recent Student Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-y-auto flex-1 p-4">
                            <div className="space-y-2.5">
                                {studentsAnalytics.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-8">No activity found</p>
                                ) : (
                                    studentsAnalytics.slice(0, 5).map((student) => (
                                        <div
                                            key={student.studentId}
                                            className="p-3 border border-slate-100 rounded-xl bg-slate-50 hover:bg-saBlueSubtle hover:border-saBlue/20 transition-all"
                                        >
                                            <div className="flex justify-between items-center mb-1.5">
                                                <h3 className="font-semibold text-sm text-slate-800">{student.studentName}</h3>
                                                <Badge variant={(student.tests?.averageScore || 0) > 75 ? "success" : "slate"} className="text-[10px]">
                                                    {(student.tests?.averageScore || 0).toFixed(0)}% Avg
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 text-xs text-slate-500">
                                                <div>📚 Classes: {student.classes.attended}</div>
                                                <div>📝 Modules: {student.modules.completed}</div>
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
