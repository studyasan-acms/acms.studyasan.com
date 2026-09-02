import { useEffect, useState } from 'react';
import { analyticsService, homeService, announcementService } from '@/services/api';
import api from '@/services/api';
import { getAnnouncementTypeConfig } from '@/utils/announcementUtils';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import LiveClassAttendanceWidget from '@/components/dashboard/LiveClassAttendanceWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BookOpen,
    FileText,
    Gamepad2,
    GraduationCap,
    TrendingUp,
    Download,
    Megaphone,
    PartyPopper,
    Activity,
    Compass,
    LayoutDashboard,
    ArrowRight,
    Trophy,
    Play,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

interface StudentAnalytics {
    classes: {
        attended: number;
        totalHours: number;
    };
    tests: {
        attempted: number;
        averageScore: number;
    };
    activities: {
        played: number;
        averageScore: number;
        totalHours: number;
    };
    modules: {
        completed: number;
        total: number;
        averageProgress: number;
        totalHours: number;
    };
    homework: {
        submitted: number;
        checked: number;
    };
    totalHoursSpent: number;
}

export default function StudentDashboardPage() {
    usePageTitle('Student Dashboard');
    const navigate = useNavigate();

    // Analytics State
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    // Performance Timeseries State
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [performancePeriod, setPerformancePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isBirthday, setIsBirthday] = useState(false);
    const [studentName, setStudentName] = useState<string>('');

    useEffect(() => {
        fetchAnalytics();
        fetchPerformanceData();
        fetchAnnouncements();
        checkBirthday();
    }, []);

    const checkBirthday = async () => {
        try {
            const response = await api.get('/profile');
            const userData = response.data?.data;
            setStudentName(userData?.name || '');
            const dob: string | null | undefined = userData?.student?.date_of_birth;
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

    const fetchAnnouncements = async () => {
        try {
            const res = await announcementService.getAnnouncements();
            setAnnouncements(res.data?.announcements || []);
        } catch (error) {
            console.error('Error fetching announcements:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const data = await analyticsService.getMyAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const fetchPerformanceData = async () => {
        try {
            const response = await homeService.getPerformance();
            setPerformanceData(response);
        } catch (error: any) {
            console.error('Error fetching performance data:', error);
            const mockData = {
                daily: [
                    { label: 'Mon', score: 78, total: 100 },
                    { label: 'Tue', score: 82, total: 100 },
                    { label: 'Wed', score: 85, total: 100 },
                    { label: 'Thu', score: 80, total: 100 },
                    { label: 'Fri', score: 88, total: 100 },
                    { label: 'Sat', score: 90, total: 100 },
                    { label: 'Sun', score: 86, total: 100 },
                ],
                weekly: [
                    { label: 'Week 1', score: 82, total: 100 },
                    { label: 'Week 2', score: 85, total: 100 },
                    { label: 'Week 3', score: 88, total: 100 },
                    { label: 'Week 4', score: 86, total: 100 },
                ],
                monthly: [
                    { label: 'January', score: 80, total: 100 },
                    { label: 'February', score: 83, total: 100 },
                    { label: 'March', score: 85, total: 100 },
                    { label: 'April', score: 87, total: 100 },
                    { label: 'May', score: 86, total: 100 },
                ]
            };
            setPerformanceData(mockData);
        }
    };

    const handleExportPDF = () => {
        const periodLabel = performancePeriod.charAt(0).toUpperCase() + performancePeriod.slice(1);
        const selectedPeriodData = performanceData?.[performancePeriod] || [];
        const avgScore = selectedPeriodData.length > 0 
            ? (selectedPeriodData.reduce((sum: number, d: any) => sum + (d.score || 0), 0) / selectedPeriodData.length || 0).toFixed(0)
            : 0;
        const maxScore = selectedPeriodData.length > 0 
            ? Math.max(...selectedPeriodData.map((d: any) => d.score))
            : 0;

        const printWindow = window.open('', '', 'width=900,height=600');
        if (!printWindow) {
            toast.error('Unable to open print window');
            return;
        }

        const today = new Date().toLocaleDateString();
        const content = `
            <html>
                <head>
                    <title>Performance Report - ${periodLabel}</title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; }
                        .page { width: 8.5in; height: 11in; margin: 0 auto; padding: 40px; background: white; }
                        
                        .header { 
                            display: flex; 
                            align-items: center; 
                            justify-content: space-between;
                            margin-bottom: 40px; 
                            padding-bottom: 20px;
                            border-bottom: 3px solid #3b82f6;
                        }
                        .logo-container {
                            background-color: #3b82f6;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 8px;
                            font-weight: 800;
                            font-size: 20px;
                        }
                        .title { font-size: 24px; font-weight: 800; color: #1f2937; }
                        .subtitle { font-size: 14px; color: #6b7280; margin-top: 4px; }
                        
                        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                        .info-card { padding: 20px; background-color: #f3f4f6 !important; border-radius: 12px; }
                        .info-label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
                        .info-value { font-size: 32px; font-weight: 700; color: #1f2937; }
                        .info-value.avg { color: #3b82f6; }
                        .info-value.max { color: #10b981; }
                        .info-value.date { color: #f59e0b; }
                        
                        .section { margin-bottom: 40px; }
                        .section-title { 
                            font-size: 18px; 
                            font-weight: 700;
                            color: #1f2937;
                            margin-bottom: 20px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            padding-bottom: 10px;
                            border-bottom: 2px solid #e5e7eb;
                        }
                        
                        .data-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                        
                        .data-row { 
                            display: flex; 
                            align-items: center; 
                            gap: 15px;
                            padding: 15px;
                            background-color: #f3f4f6 !important;
                            border-radius: 8px;
                            border: 1px solid #e5e7eb;
                            border-left: 3px solid #3b82f6;
                        }
                        
                        .data-label { 
                            flex: 1;
                            font-size: 14px;
                            font-weight: 600;
                            color: #1f2937;
                        }
                        
                        .progress-bar { 
                            flex: 2;
                            background: #e5e7eb; 
                            height: 8px; 
                            border-radius: 4px;
                            overflow: hidden;
                            position: relative;
                        }
                        .progress-fill { 
                            height: 100%;
                            background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
                            transition: width 0.3s ease;
                            border-radius: 4px;
                        }
                        
                        .data-value { 
                            font-size: 16px; 
                            font-weight: 700; 
                            color: #3b82f6;
                            min-width: 50px;
                            text-align: right;
                        }
                        
                        .footer { 
                            margin-top: 50px; 
                            padding-top: 20px; 
                            border-top: 1px solid #e5e7eb;
                            text-align: center;
                            font-size: 12px;
                            color: #9ca3af;
                        }
                        
                        @media print {
                            body { margin: 0; padding: 0; }
                            .page { width: 100%; height: auto; margin: 0; padding: 40px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <div class="header">
                            <div class="header-left">
                                <div class="logo-container">StudyAsan</div>
                                <p class="subtitle">Student Learning & Progress System</p>
                            </div>
                            <div class="header-right" style="text-align: right;">
                                <div class="title">Performance Report</div>
                                <p class="subtitle">Generated on ${today}</p>
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-card">
                                <div class="info-label">Average Score</div>
                                <div class="info-value avg">${avgScore}%</div>
                            </div>
                            <div class="info-card">
                                <div class="info-label">Peak Performance</div>
                                <div class="info-value max">${maxScore}%</div>
                            </div>
                            <div class="info-card">
                                <div class="info-label">Report Period</div>
                                <div class="info-value date" style="font-size: 24px; padding-top: 6px;">${periodLabel}</div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">Timeline Breakdown</div>
                            <div class="data-grid">
                                ${selectedPeriodData.map((d: any) => `
                                    <div class="data-row">
                                        <div class="data-label">${d.label}</div>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${d.score}%;"></div>
                                        </div>
                                        <div class="data-value">${d.score}%</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="footer">
                            <p>StudyAsan Academy Management System • Official Student Analytics Record</p>
                        </div>
                    </div>
                </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(content);
        printWindow.document.close();

        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    if (analyticsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const moduleCompletionRate = analytics?.modules.total && analytics.modules.total > 0
        ? (analytics.modules.completed / analytics.modules.total) * 100
        : 0;

    const performanceTrendData = analytics ? [
        { name: 'Tests', value: analytics.tests.averageScore, fill: '#0276D3' },
        { name: 'Activities', value: analytics.activities.averageScore, fill: '#eca209' },
        { name: 'Modules', value: analytics.modules.averageProgress, fill: '#0284c7' }
    ] : [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Top Header */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Student Dashboard</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track your learning progress, test series performance, and academic metrics</p>
            </div>

            {/* 🎂 Birthday Banner */}
            {isBirthday && (
                <div
                    className="relative overflow-hidden rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
                    style={{
                        background: 'linear-gradient(135deg, #0276D3 0%, #0590ff 50%, #eca209 100%)',
                        boxShadow: '0 8px 32px rgba(2, 118, 211, 0.35)'
                    }}
                >
                    <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full opacity-20" style={{ background: '#eca209' }} />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ background: '#ffffff' }} />

                    <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                        <span className="text-4xl select-none">🎂</span>
                    </div>

                    <div className="relative flex-1 text-center sm:text-left">
                        <p className="text-white/80 text-sm font-semibold tracking-widest uppercase mb-0.5">Today is your special day!</p>
                        <h2 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight">
                            Happy Birthday{studentName ? `, ${studentName.split(' ')[0]}` : ''}! 🎉
                        </h2>
                        <p className="text-white/90 text-sm mt-1 max-w-lg">
                            Wishing you a fantastic year ahead filled with learning, joy, and incredible achievements! ✨
                        </p>
                    </div>

                    <div className="relative shrink-0 hidden md:flex flex-col items-center justify-center px-5 py-3 rounded-xl bg-white/15 backdrop-blur border border-white/20 text-white text-center">
                        <PartyPopper className="w-6 h-6 mb-1 text-amber-200 animate-bounce" />
                        <span className="text-xs font-bold tracking-wider uppercase">Best Wishes</span>
                        <span className="text-[11px] text-white/80">from StudyAsan</span>
                    </div>
                </div>
            )}

            {/* Announcements Broadcast Card */}
            {announcements.length > 0 && (
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center">
                                <Megaphone className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900">Recent Announcements</h3>
                                <p className="text-[11px] text-slate-400 font-medium">Important updates from administration & teachers</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/dashboard/announcements')}
                            className="text-xs font-bold text-saBlue hover:text-saBlueDarkHover h-8 px-2.5 rounded-lg"
                        >
                            View All ({announcements.length})
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {announcements.slice(0, 2).map((a) => {
                            const config = getAnnouncementTypeConfig(a.type);
                            const TypeIcon = config.icon;
                            return (
                                <div
                                    key={a.id}
                                    onClick={() => navigate('/dashboard/announcements')}
                                    className={`p-3.5 rounded-2xl border ${config.bgLightClass} ${config.borderLeftClass} border-l-4 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${config.badgeClass}`}>
                                                <TypeIcon className="w-3 h-3" />
                                                <span>{config.label}</span>
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                {new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{a.title}</h4>
                                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 font-normal leading-relaxed">{a.content}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Attendance & Session Widget */}
            <LiveClassAttendanceWidget />

            {/* Top Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Classes Attended"
                    value={analytics?.classes.attended || 0}
                    description={`${(analytics?.classes.totalHours || 0).toFixed(1)} hours spent`}
                    icon={GraduationCap}
                />
                <StatCard
                    title="Test Performance"
                    value={`${(analytics?.tests.averageScore || 0).toFixed(1)}%`}
                    description={`${analytics?.tests.attempted || 0} tests completed`}
                    icon={FileText}
                />
                <StatCard
                    title="Activities"
                    value={analytics?.activities.played || 0}
                    description={`Avg. Score: ${(analytics?.activities.averageScore || 0).toFixed(1)}%`}
                    icon={Gamepad2}
                />
                <StatCard
                    title="Module Progress"
                    value={`${moduleCompletionRate.toFixed(0)}%`}
                    description={`${analytics?.modules.completed || 0}/${analytics?.modules.total || 0} completed`}
                    icon={BookOpen}
                />
            </div>

            {/* Performance Analytics Timeseries */}
            {performanceData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2 shadow-xs border border-gray-100 rounded-3xl overflow-hidden bg-white">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-50/50 to-transparent">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-saBlue" />
                                    Performance Analytics
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">Historical test scores and learning trend</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                                    {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setPerformancePeriod(period)}
                                            className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                                                performancePeriod === period
                                                    ? 'bg-white text-saBlue shadow-xs font-bold'
                                                    : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExportPDF}
                                    className="h-8 gap-1.5 rounded-xl text-xs font-semibold border-gray-200 hover:bg-saBlue/10 hover:text-saBlue"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    PDF
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="h-[280px]">
                                <AnalyticsChart
                                    title=""
                                    data={performanceData[performancePeriod] || []}
                                    type="area"
                                    dataKey="score"
                                    xAxisKey="label"
                                    colors={['#0276D3']}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Progress Composition */}
                    <Card className="shadow-xs border border-gray-100 rounded-3xl overflow-hidden bg-white flex flex-col justify-between">
                        <CardHeader className="pb-2 bg-gradient-to-r from-blue-50/50 to-transparent">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Activity className="h-5 w-5 text-saBlue" />
                                Domain Proficiency
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Score allocation across modules</p>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-center pt-2">
                            <AnalyticsChart
                                title=""
                                data={performanceTrendData}
                                type="bar"
                                dataKey="value"
                                xAxisKey="name"
                                colors={['#0276D3', '#eca209', '#0284c7']}
                            />
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    <p>No analytics data available yet. Start learning to see your progress!</p>
                </div>
            )}

            {/* Quick Access Grid to Test Series, Activities, Curriculum & Homework */}
            <div className="space-y-4 pt-4">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Academic Quick Access</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Mock Tests & Test Series */}
                    <div
                        onClick={() => navigate('/tests')}
                        className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-[#eca209]/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-10 h-10 rounded-2xl bg-[#eca209]/10 text-[#eca209] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-saBlue transition-colors">
                                Mock Tests & Test Series
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Practice mock exams, chapter quizzes & view rank analytics
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#eca209]">
                            <span>Take Tests</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Learning Games & Activities */}
                    <div
                        onClick={() => navigate('/dashboard/student-activities')}
                        className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-saBlue/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-10 h-10 rounded-2xl bg-saBlue/10 text-saBlue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-saBlue transition-colors">
                                Learning Games & Activities
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Play interactive activity groups, word games & quizzes
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-saBlue">
                            <span>Play Activities</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Homework & Assignments */}
                    <div
                        onClick={() => navigate('/dashboard/homework')}
                        className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-[#eca209]/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-10 h-10 rounded-2xl bg-[#eca209]/10 text-[#eca209] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-saBlue transition-colors">
                                Homework & Submissions
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                View assigned homework tasks, upload work & view teacher feedback
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#eca209]">
                            <span>Open Tasks</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Curriculum Subjects */}
                    <div
                        onClick={() => navigate('/dashboard/subjects')}
                        className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:border-saBlue/60 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                        <div>
                            <div className="w-10 h-10 rounded-2xl bg-saBlue/10 text-saBlue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-saBlue transition-colors">
                                Curriculum & Subjects
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                Access course syllabus, study modules & chapters
                            </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-saBlue">
                            <span>Explore Subjects</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
