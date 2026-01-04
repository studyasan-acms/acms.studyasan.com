import { useEffect, useState } from 'react';
import { analyticsService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { ProgressRing } from '@/components/analytics/ProgressRing';
import { MetricsList } from '@/components/analytics/MetricsList';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import {
    BookOpen,
    FileText,
    Gamepad2,
    GraduationCap,
    Clock,
    CheckCircle,
    TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { usePageTitle } from "@/hooks/usePageTitle";

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

export default function StudentAnalyticsPage() {
    usePageTitle("My Analytics");
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    // const token = useAuthStore((state) => state.token);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const data = await analyticsService.getMyAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
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

    if (!analytics) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-muted-foreground">No analytics data available</p>
            </div>
        );
    }

    const moduleCompletionRate = analytics.modules.total > 0
        ? (analytics.modules.completed / analytics.modules.total) * 100
        : 0;

    const homeworkCompletionRate = analytics.homework.submitted > 0
        ? (analytics.homework.checked / analytics.homework.submitted) * 100
        : 0;

    const performanceData = [
        { name: 'Tests', score: analytics.tests.averageScore },
        { name: 'Activities', score: analytics.activities.averageScore },
        { name: 'Modules', score: analytics.modules.averageProgress }
    ];

    const timeDistribution = [
        { name: 'Classes', value: analytics.classes.totalHours },
        { name: 'Activities', value: analytics.activities.totalHours },
        { name: 'Modules', value: analytics.modules.totalHours }
    ];

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">My Analytics</h1>
                <p className="text-muted-foreground">Track your learning progress and achievements</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Classes Attended"
                    value={analytics.classes.attended}
                    icon={BookOpen}
                    description={`${analytics.classes.totalHours.toFixed(1)} hours total`}
                />
                <StatCard
                    title="Tests Attempted"
                    value={analytics.tests.attempted}
                    icon={FileText}
                    description={`Avg. Score: ${analytics.tests.averageScore.toFixed(1)}%`}
                />
                <StatCard
                    title="Activities Played"
                    value={analytics.activities.played}
                    icon={Gamepad2}
                    description={`Avg. Score: ${analytics.activities.averageScore.toFixed(1)}%`}
                />
                <StatCard
                    title="Total Hours"
                    value={analytics.totalHoursSpent.toFixed(1)}
                    icon={Clock}
                    description="Time spent learning"
                />
            </div>

            {/* Progress Rings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card rounded-lg border p-6 flex flex-col items-center">
                    <ProgressRing
                        progress={moduleCompletionRate}
                        label="Modules Completed"
                        color="hsl(var(--primary))"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                        {analytics.modules.completed} of {analytics.modules.total} modules
                    </p>
                </div>

                <div className="bg-card rounded-lg border p-6 flex flex-col items-center">
                    <ProgressRing
                        progress={analytics.tests.averageScore}
                        label="Average Test Score"
                        color="#10b981"
                    />
                </div>

                <div className="bg-card rounded-lg border p-6 flex flex-col items-center">
                    <ProgressRing
                        progress={homeworkCompletionRate}
                        label="Homework Checked"
                        color="#f59e0b"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                        {analytics.homework.checked} of {analytics.homework.submitted} checked
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnalyticsChart
                    title="Performance Overview"
                    data={performanceData}
                    type="bar"
                    dataKey="score"
                    xAxisKey="name"
                />
                <AnalyticsChart
                    title="Time Distribution"
                    data={timeDistribution.filter(item => item.value > 0)}
                    type="pie"
                    dataKey="value"
                    xAxisKey="name"
                />
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MetricsList
                    title="Learning Activities"
                    metrics={[
                        {
                            label: 'Classes Attended',
                            value: analytics.classes.attended,
                            icon: BookOpen,
                            subtext: `${analytics.classes.totalHours.toFixed(1)} hours`
                        },
                        {
                            label: 'Tests Attempted',
                            value: analytics.tests.attempted,
                            icon: FileText,
                            subtext: `Average: ${analytics.tests.averageScore.toFixed(1)}%`
                        },
                        {
                            label: 'Activities Completed',
                            value: analytics.activities.played,
                            icon: Gamepad2,
                            subtext: `Average: ${analytics.activities.averageScore.toFixed(1)}%`
                        }
                    ]}
                />

                <MetricsList
                    title="Progress & Achievements"
                    metrics={[
                        {
                            label: 'Modules Completed',
                            value: `${analytics.modules.completed}/${analytics.modules.total}`,
                            icon: GraduationCap,
                            subtext: `${moduleCompletionRate.toFixed(1)}% complete`
                        },
                        {
                            label: 'Homework Submitted',
                            value: analytics.homework.submitted,
                            icon: CheckCircle,
                            subtext: `${analytics.homework.checked} checked`
                        },
                        {
                            label: 'Total Study Time',
                            value: `${analytics.totalHoursSpent.toFixed(1)}h`,
                            icon: Clock,
                            subtext: 'Across all activities'
                        }
                    ]}
                />
            </div>
        </div>
    );
}
