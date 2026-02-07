import { useEffect, useState } from 'react';
import { analyticsService, homeService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import QuickActions from '@/components/dashboard/QuickActions';
import HomeItemCard from '@/components/home/HomeItemCard';
import ItemDetailModal from '@/components/home/ItemDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BookOpen,
    FileText,
    Gamepad2,
    GraduationCap,
    Clock,
    TrendingUp,
    Star,
    Search,
    Filter,
    Activity,
    Trophy,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Slider Component from StudentHomePage
const ItemSlider = ({ title, items, icon: Icon, onItemClick }: {
    title: string;
    items: any[];
    icon: React.ElementType;
    onItemClick: (item: any) => void;
}) => {
    const scrollLeft = () => {
        const container = document.getElementById(`slider-${title.replace(/\s+/g, '-')}`);
        if (container) container.scrollLeft -= 200;
    };

    const scrollRight = () => {
        const container = document.getElementById(`slider-${title.replace(/\s+/g, '-')}`);
        if (container) container.scrollLeft += 200;
    };

    return (
        <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    <h2 className="text-lg md:text-xl font-semibold text-foreground">{title}</h2>
                </div>
                {items.length > 3 && (
                    <div className="hidden md:flex space-x-1 md:space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={scrollLeft}
                            className="p-1 h-7 w-7 md:h-9 md:w-9"
                        >
                            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={scrollRight}
                            className="p-1 h-7 w-7 md:h-9 md:w-9"
                        >
                            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Mobile: Grid layout, Desktop: Horizontal scroll */}
            <div className="block md:hidden">
                {items.length === 0 ? (
                    <div className="flex items-center justify-center w-full py-6">
                        <p className="text-muted-foreground text-sm">No {title.toLowerCase()} available</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.slice(0, 6).map((item) => (
                            <div key={`${item.type}-${item.id}`} className="w-full">
                                <HomeItemCard
                                    item={item}
                                    onClick={() => onItemClick(item)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="hidden md:block">
                <div
                    id={`slider-${title.replace(/\s+/g, '-')}`}
                    className="flex space-x-2 md:space-x-4 overflow-x-auto scrollbar-hide pb-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {items.length === 0 ? (
                        <div className="flex items-center justify-center w-full py-6 md:py-8">
                            <p className="text-muted-foreground text-sm md:text-base">No {title.toLowerCase()} available</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={`${item.type}-${item.id}`} className="flex-shrink-0 w-40 sm:w-48 md:w-64">
                                <HomeItemCard
                                    item={item}
                                    onClick={() => onItemClick(item)}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default function StudentDashboard() {
    // Analytics State
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    // Home Items State
    const [items, setItems] = useState<any[]>([]);
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchAnalytics();
        fetchHomeItems();
    }, []);

    useEffect(() => {
        filterItems();
    }, [searchQuery, filterType, items]);

    const fetchAnalytics = async () => {
        try {
            const data = await analyticsService.getMyAnalytics();
            setAnalytics(data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            // Don't toast on initial load error to avoid spam if just empty
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const fetchHomeItems = async () => {
        try {
            setItemsLoading(true);
            const response = await homeService.getItems();
            setItems(response.data);
        } catch (error: any) {
            console.error('Error fetching home items:', error);
            // toast.error(error.response?.data?.error || 'Failed to fetch items');
        } finally {
            setItemsLoading(false);
        }
    };

    const filterItems = () => {
        let filtered = items;

        if (filterType !== 'ALL') {
            filtered = filtered.filter((item) => item.type === filterType);
        }

        if (searchQuery) {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        setFilteredItems(filtered);
    };

    const handleItemClick = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };


    if (analyticsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Derived States for Analytics
    const moduleCompletionRate = analytics?.modules.total && analytics.modules.total > 0
        ? (analytics.modules.completed / analytics.modules.total) * 100
        : 0;

    const performanceData = analytics ? [
        { name: 'Tests', score: analytics.tests.averageScore },
        { name: 'Activities', score: analytics.activities.averageScore },
        { name: 'Modules', score: analytics.modules.averageProgress }
    ] : [];

    // Derived States for Home Items
    const subjectsAndCourses = filteredItems.filter(item => item.type === 'SUBJECT' || item.type === 'COURSE');
    const activityGroups = filteredItems.filter(item => item.type === 'ACTIVITY_GROUP');
    const testSeries = filteredItems.filter(item => item.type === 'TEST_SERIES');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

            {/* 1. Analytics & Actions Section */}
            {analytics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left: Quick Snapshot */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="Tests Taken"
                                value={analytics.tests.attempted}
                                icon={FileText}
                                description={`Avg: ${analytics.tests.averageScore.toFixed(0)}%`}
                                className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
                            />
                            <StatCard
                                title="Modules Done"
                                value={`${analytics.modules.completed}/${analytics.modules.total}`}
                                icon={GraduationCap}
                                description={`${moduleCompletionRate.toFixed(0)}% Complete`}
                                className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800"
                            />
                            <StatCard
                                title="Activities"
                                value={analytics.activities.played}
                                icon={Gamepad2}
                                description="Games Played"
                                className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800"
                            />
                            <StatCard
                                title="Study Hours"
                                value={analytics.totalHoursSpent.toFixed(1)}
                                icon={Clock}
                                description="Total Time"
                                className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800"
                            />
                        </div>

                        {/* Performance Chart */}
                        <Card className="border-none shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-primary" />
                                    Your Performance Trend
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AnalyticsChart
                                    title=""
                                    data={performanceData}
                                    type="bar"
                                    dataKey="score"
                                    xAxisKey="name"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Quick Actions */}
                    <div className="space-y-6">
                        <QuickActions />

                        {/* Top Performer Highlight */}
                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="bg-background p-3 rounded-full shadow-sm">
                                <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Top Performer?</h3>
                                <p className="text-sm text-muted-foreground">Keep up the great work! You've maintained a {analytics.tests.averageScore.toFixed(0)}% average.</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    <p>No analytics data available yet. Start learning to see your progress!</p>
                </div>
            )}

            {/* 2. Explore Learning Section (Unified Home Logic) */}
            <div className="space-y-6 pt-6 border-t">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-2xl font-bold tracking-tight">Explore Learning</h2>

                    {/* Search & Filter */}
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-9"
                            />
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[140px] h-9">
                                <Filter className="h-3 w-3 mr-2" />
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All</SelectItem>
                                <SelectItem value="COURSE">Courses</SelectItem>
                                <SelectItem value="SUBJECT">Subjects</SelectItem>
                                <SelectItem value="ACTIVITY_GROUP">Activities</SelectItem>
                                <SelectItem value="TEST_SERIES">Test Series</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {itemsLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        <ItemSlider
                            title="Subjects & Courses"
                            items={subjectsAndCourses}
                            icon={BookOpen}
                            onItemClick={handleItemClick}
                        />
                        <ItemSlider
                            title="Activity Groups"
                            items={activityGroups}
                            icon={Activity}
                            onItemClick={handleItemClick}
                        />
                        <ItemSlider
                            title="Test Series"
                            items={testSeries}
                            icon={Trophy}
                            onItemClick={handleItemClick}
                        />
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
}
