import { useEffect, useState } from 'react';
import { analyticsService, homeService } from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
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
        if (container) {
            container.scrollTo({
                left: container.scrollLeft - 300,
                behavior: 'smooth'
            });
        }
    };

    const scrollRight = () => {
        const container = document.getElementById(`slider-${title.replace(/\s+/g, '-')}`);
        if (container) {
            container.scrollTo({
                left: container.scrollLeft + 300,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="space-y-4 md:space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h3>
                </div>
                {items.length > 2 && (
                    <div className="flex space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={scrollLeft}
                            className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-full hover:bg-saBlue hover:text-white transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={scrollRight}
                            className="h-8 w-8 md:h-9 md:w-9 p-0 rounded-full hover:bg-saBlue hover:text-white transition-colors"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Horizontal Slider for all screen sizes */}
            <div
                id={`slider-${title.replace(/\s+/g, '-')}`}
                className="flex space-x-3 md:space-x-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
                style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent'
                }}
            >
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full py-12 md:py-16 px-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="p-4 rounded-full bg-gray-100 mb-4">
                            <Icon className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm md:text-base font-medium">No {title.toLowerCase()} available</p>
                        <p className="text-gray-400 text-xs md:text-sm mt-1">Check back later for new content</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="flex-shrink-0 w-56 sm:w-64 md:w-72 snap-start">
                            <HomeItemCard
                                item={item}
                                onClick={() => onItemClick(item)}
                            />
                        </div>
                    ))
                )}
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
        { name: 'Tests', value: analytics.tests.averageScore, fill: '#3b82f6' },
        { name: 'Activities', value: analytics.activities.averageScore, fill: '#f59e0b' },
        { name: 'Modules', value: analytics.modules.averageProgress, fill: '#10b981' }
    ] : [];

    // Derived States for Home Items
    const subjectsAndCourses = filteredItems.filter(item => item.type === 'SUBJECT' || item.type === 'COURSE');
    const activityGroups = filteredItems.filter(item => item.type === 'ACTIVITY_GROUP');
    const testSeries = filteredItems.filter(item => item.type === 'TEST_SERIES');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

            {/* 1. Analytics Section */}
            {analytics ? (
                <div className="space-y-6">
                    {/* Stats Cards - Horizontal Scroll */}
                    <div className="relative">
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth" style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent'
                        }}>
                            <div className="flex-shrink-0 w-72 snap-start">
                                <StatCard
                                    title="Tests Taken"
                                    value={analytics.tests.attempted}
                                    icon={FileText}
                                    description={`Avg: ${analytics.tests.averageScore.toFixed(0)}%`}
                                    className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
                                />
                            </div>
                            <div className="flex-shrink-0 w-72 snap-start">
                                <StatCard
                                    title="Modules Done"
                                    value={`${analytics.modules.completed}/${analytics.modules.total}`}
                                    icon={GraduationCap}
                                    description={`${moduleCompletionRate.toFixed(0)}% Complete`}
                                    className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800"
                                />
                            </div>
                            <div className="flex-shrink-0 w-72 snap-start">
                                <StatCard
                                    title="Activities"
                                    value={analytics.activities.played}
                                    icon={Gamepad2}
                                    description="Games Played"
                                    className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800"
                                />
                            </div>
                            <div className="flex-shrink-0 w-72 snap-start">
                                <StatCard
                                    title="Study Hours"
                                    value={analytics.totalHoursSpent.toFixed(1)}
                                    icon={Clock}
                                    description="Total Time"
                                    className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800"
                                />
                            </div>
                        </div>
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
                                dataKey="value"
                                xAxisKey="name"
                                colors={['#3b82f6', '#f59e0b', '#10b981']}
                            />
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    <p>No analytics data available yet. Start learning to see your progress!</p>
                </div>
            )}

            {/* 2. Explore Learning Section (Unified Home Logic) */}
            <div className="space-y-6 pt-8 mt-8 border-t border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Explore Learning</h2>
                        <p className="text-sm text-gray-500 mt-1">Discover courses, activities, and tests</p>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search courses, subjects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 rounded-xl border-gray-200 focus:border-saBlue focus:ring-saBlue"
                            />
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[160px] h-10 rounded-xl border-gray-200">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="COURSE">Courses</SelectItem>
                                <SelectItem value="SUBJECT">Subjects</SelectItem>
                                <SelectItem value="ACTIVITY_GROUP">Activities</SelectItem>
                                <SelectItem value="TEST_SERIES">Test Series</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {itemsLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-2xl">
                        <Loader2 className="h-10 w-10 animate-spin text-saBlue mb-4" />
                        <p className="text-gray-500 font-medium">Loading content...</p>
                    </div>
                ) : (
                    <div className="space-y-10">
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
