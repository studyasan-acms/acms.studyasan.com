import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeService, analyticsService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Search, Filter, ChevronRight, BookOpen, Activity, Users, GraduationCap, Trophy, Award, CheckCircle2, Download, TrendingUp, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import HomeItemCard from '@/components/home/HomeItemCard';
import ItemDetailModal from '@/components/home/ItemDetailModal';
import { toast } from 'sonner';
import { usePageTitle } from "@/hooks/usePageTitle";

// Stats Card Component
const StatCard = ({ icon: Icon, label, value, color, bgColor }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    color: string;
    bgColor: string;
}) => {
    return (
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-gray-600 text-xs md:text-sm font-medium mb-2">{label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 md:p-4 rounded-xl ${bgColor}`}>
                    <Icon className={`h-5 w-5 md:h-6 md:w-6 ${color}`} />
                </div>
            </div>
        </div>
    );
};

// Quick Nav Card Component
const QuickNavCard = ({ to, icon: Icon, label, description, gradient }: {
    to: string;
    icon: React.ElementType;
    label: string;
    description: string;
    gradient: string;
}) => {
    return (
        <Link
            to={to}
            className={`group bg-gradient-to-br ${gradient} rounded-2xl p-4 md:p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-opacity-20 border-white overflow-hidden relative`}
        >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-white transition-opacity"></div>
            <div className="relative z-10 flex items-start space-x-3 md:space-x-4">
                <div className="p-2 md:p-3 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm group-hover:bg-opacity-30 transition-all">
                    <Icon className="h-5 w-5 md:h-7 md:w-7 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm md:text-base mb-1">{label}</h3>
                    <p className="text-xs md:text-sm text-white text-opacity-80 line-clamp-1">{description}</p>
                </div>
                <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-white opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
            </div>
        </Link>
    );
};

// Performance Chart Component
const PerformanceChart = ({
    performanceData,
    onExportPDF
}: {
    performanceData: {
        daily: { label: string; score: number; total: number }[];
        weekly: { label: string; score: number; total: number }[];
        monthly: { label: string; score: number; total: number }[];
    } | null;
    onExportPDF: () => void;
}) => {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    if (!performanceData) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
                </div>
            </div>
        );
    }

    const data = performanceData[period];

    return (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800">Performance Analytics</h3>
                </div>
                <Button
                    onClick={onExportPDF}
                    className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-medium flex items-center gap-2"
                >
                    <Download className="h-4 w-4" />
                    Export as PDF
                </Button>
            </div>

            <Tabs value={period} onValueChange={(v) => setPeriod(v as 'daily' | 'weekly' | 'monthly')} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="daily" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">Daily</span>
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">Weekly</span>
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="hidden sm:inline">Monthly</span>
                    </TabsTrigger>
                </TabsList>

                {['daily', 'weekly', 'monthly'].map((p) => (
                    <TabsContent key={p} value={p} className="space-y-4">
                        <div className="space-y-4">
                            {data.map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                        <span className="text-sm font-bold text-indigo-600">{item.score}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                                            style={{ width: `${(item.score / item.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 mt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Average Score</p>
                                    <p className="text-2xl font-bold text-indigo-600">
                                        {Math.round(data.reduce((a, b) => a + b.score, 0) / data.length)}%
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-600 mb-1">Highest Score</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {Math.max(...data.map(d => d.score))}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

// Grid Component
const ItemGrid = ({ title, items, icon: Icon, onItemClick }: {
    title: string;
    items: any[];
    icon: React.ElementType;
    onItemClick: (item: any) => void;
}) => {
    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center space-x-3 border-b-2 pb-4 border-gray-200">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-saBlue" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">{title}</h2>
            </div>
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-dashed border-gray-300">
                    <Icon className="h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-gray-500 font-medium">No {title.toLowerCase()} available</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {items.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="transform hover:-translate-y-2 transition-all duration-300">
                            <HomeItemCard
                                item={item}
                                onClick={() => onItemClick(item)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function StudentHomePage() {
    usePageTitle("Home");
    const { user } = useAuthStore();
    const [items, setItems] = useState<any[]>([]);
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [analyticsData, setAnalyticsData] = useState<any>(null);

    useEffect(() => {
        fetchHomeItems();
        fetchPerformanceData();
        fetchAnalyticsData();
    }, []);

    useEffect(() => {
        filterItems();
    }, [searchQuery, filterType, items]);

    const fetchHomeItems = async () => {
        try {
            setLoading(true);
            const response = await homeService.getItems();
            setItems(response.data);
        } catch (error: any) {
            console.error('Error fetching home items:', error);
            toast.error(error.response?.data?.error || 'Failed to fetch items');
        } finally {
            setLoading(false);
        }
    };

    const fetchPerformanceData = async () => {
        try {
            const response = await homeService.getPerformance();
            setPerformanceData(response);
        } catch (error: any) {
            console.error('Error fetching performance data:', error);
            // Fallback to mock data if API fails
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

    const fetchAnalyticsData = async () => {
        try {
            const data = await analyticsService.getMyAnalytics();
            setAnalyticsData(data);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        }
    };

    const filterItems = () => {
        let filtered = items;

        // Filter by type
        if (filterType !== 'ALL') {
            filtered = filtered.filter((item) => item.type === filterType);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Update grouped items
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

    const handleExportPDF = () => {
        // Create a new window for printing
        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) {
            toast.error('Unable to open print window');
            return;
        }

        const today = new Date().toLocaleDateString();
        const content = `
            <html>
                <head>
                    <title>Performance Report - ${user?.name || 'Student'}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                        .header { border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }
                        .header h1 { margin: 0 0 10px 0; color: #1F2937; }
                        .header p { margin: 5px 0; color: #6B7280; }
                        .section { margin-bottom: 30px; page-break-inside: avoid; }
                        .section h2 { color: #4F46E5; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #4F46E5; padding-left: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
                        th { background-color: #F3F4F6; font-weight: bold; color: #1F2937; }
                        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
                        .stat-box { background: #F9FAFB; padding: 15px; border-radius: 8px; text-align: center; }
                        .stat-value { font-size: 28px; font-weight: bold; color: #4F46E5; }
                        .stat-label { font-size: 12px; color: #6B7280; margin-top: 5px; }
                        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #9CA3AF; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="${window.location.origin}/studyasan-logo.png" alt="StudyAsan Logo" style="height: 60px; margin-bottom: 15px;" />
                        <h1>Performance Report</h1>
                        <p><strong>Student Name:</strong> ${user?.name || 'N/A'}</p>
                        <p><strong>Generated on:</strong> ${today}</p>
                    </div>

                    <div class="section">
                        <h2>Summary</h2>
                        <div class="stats-grid" style="margin-top: 0; margin-bottom: 20px;">
                            <div class="stat-box">
                                <div class="stat-label">Modules Studied</div>
                                <div class="stat-value">${analyticsData?.modules?.completed || 0}</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-label">Classes Taken</div>
                                <div class="stat-value">${analyticsData?.classes?.attended || 0}</div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Daily Performance (Last 7 Days)</h2>
                        <table>
                            <tr>
                                <th>Day</th>
                                <th>Score</th>
                                <th>Progress</th>
                            </tr>
                            <tr><td>Monday</td><td>78%</td><td>███░░░░░░</td></tr>
                            <tr><td>Tuesday</td><td>82%</td><td>████░░░░░</td></tr>
                            <tr><td>Wednesday</td><td>85%</td><td>█████░░░░</td></tr>
                            <tr><td>Thursday</td><td>80%</td><td>████░░░░░</td></tr>
                            <tr><td>Friday</td><td>88%</td><td>██████░░░</td></tr>
                            <tr><td>Saturday</td><td>90%</td><td>███████░░</td></tr>
                            <tr><td>Sunday</td><td>86%</td><td>██████░░░</td></tr>
                        </table>
                        <div class="stats-grid">
                            <div class="stat-box">
                                <div class="stat-label">Average Score</div>
                                <div class="stat-value">85%</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-label">Highest Score</div>
                                <div class="stat-value">90%</div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Weekly Performance</h2>
                        <table>
                            <tr>
                                <th>Week</th>
                                <th>Score</th>
                                <th>Progress</th>
                            </tr>
                            <tr><td>Week 1</td><td>82%</td><td>████░░░░░</td></tr>
                            <tr><td>Week 2</td><td>85%</td><td>█████░░░░</td></tr>
                            <tr><td>Week 3</td><td>88%</td><td>██████░░░</td></tr>
                            <tr><td>Week 4</td><td>86%</td><td>██████░░░</td></tr>
                        </table>
                    </div>

                    <div class="section">
                        <h2>Monthly Performance</h2>
                        <table>
                            <tr>
                                <th>Month</th>
                                <th>Score</th>
                                <th>Progress</th>
                            </tr>
                            <tr><td>January</td><td>80%</td><td>████░░░░░</td></tr>
                            <tr><td>February</td><td>83%</td><td>█████░░░░</td></tr>
                            <tr><td>March</td><td>85%</td><td>█████░░░░</td></tr>
                            <tr><td>April</td><td>87%</td><td>██████░░░</td></tr>
                            <tr><td>May</td><td>86%</td><td>██████░░░</td></tr>
                        </table>
                    </div>

                    <div class="footer">
                        <p>This is an automatically generated performance report. For detailed analytics, please visit your dashboard.</p>
                    </div>
                </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 md:h-96">
                <Loader2 className="h-8 w-8 md:h-10 md:w-10 animate-spin text-saBlue" />
            </div>
        );
    }

    const subjectsAndCourses = filteredItems.filter(item => item.type === 'SUBJECT' || item.type === 'COURSE');
    const activityGroups = filteredItems.filter(item => item.type === 'ACTIVITY_GROUP');
    const testSeries = filteredItems.filter(item => item.type === 'TEST_SERIES');

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Welcome Header with Gradient */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-saBlue via-indigo-500 to-saBlueDark text-white p-6 md:p-8 shadow-lg">
                <div className="absolute top-0 right-0 w-40 h-40 md:w-64 md:h-64 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 md:w-48 md:h-48 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">
                        Welcome back, {user?.name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-blue-100 text-sm md:text-base font-medium">
                        Keep pushing! Your learning journey continues...
                    </p>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    icon={BookOpen}
                    label="Modules Studied"
                    value={analyticsData?.modules?.completed || 0}
                    color="text-indigo-600"
                    bgColor="bg-indigo-100"
                />
                <StatCard
                    icon={CheckCircle2}
                    label="Completed Courses"
                    value={filteredItems.length}
                    color="text-green-600"
                    bgColor="bg-green-100"
                />
                <StatCard
                    icon={GraduationCap}
                    label="Classes Taken"
                    value={analyticsData?.classes?.attended || 0}
                    color="text-orange-600"
                    bgColor="bg-orange-100"
                />
                <StatCard
                    icon={Award}
                    label="Your Score"
                    value={`${analyticsData?.tests?.averageScore || 0}%`}
                    color="text-purple-600"
                    bgColor="bg-purple-100"
                />
            </div>

            {/* Quick Navigation */}
            <div className="space-y-3">
                <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase tracking-wider px-1">Quick Access</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <QuickNavCard
                        to="/dashboard/subjects"
                        icon={BookOpen}
                        label="My Subjects"
                        description="Explore your courses"
                        gradient="from-blue-500 to-cyan-500"
                    />
                    <QuickNavCard
                        to="/dashboard/student-activities"
                        icon={Activity}
                        label="Activities"
                        description="Track your progress"
                        gradient="from-green-500 to-emerald-500"
                    />
                    <QuickNavCard
                        to="/dashboard/test-series"
                        icon={Trophy}
                        label="Test Series"
                        description="Practice & improve"
                        gradient="from-amber-500 to-orange-500"
                    />
                    <QuickNavCard
                        to="/dashboard/profile"
                        icon={Users}
                        label="Profile"
                        description="Manage your account"
                        gradient="from-purple-500 to-pink-500"
                    />
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-md border border-gray-100">
                <div className="space-y-3 md:space-y-4">
                    <p className="text-sm font-semibold text-gray-700">Search & Filter</p>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search courses, activities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 h-11 text-sm md:text-base border-gray-200 focus:border-saBlue rounded-xl"
                        />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-11 rounded-xl border-gray-200 focus:border-saBlue">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Types</SelectItem>
                            <SelectItem value="COURSE">Courses</SelectItem>
                            <SelectItem value="SUBJECT">Subjects</SelectItem>
                            <SelectItem value="ACTIVITY_GROUP">Activity Groups</SelectItem>
                            <SelectItem value="TEST_SERIES">Test Series</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Performance Analytics */}
            <PerformanceChart performanceData={performanceData} onExportPDF={handleExportPDF} />

            {/* Content Grids */}
            <div className="space-y-8 md:space-y-12">
                <ItemGrid
                    title="Subjects & Courses"
                    items={subjectsAndCourses}
                    icon={BookOpen}
                    onItemClick={handleItemClick}
                />
                <ItemGrid
                    title="Activity Groups"
                    items={activityGroups}
                    icon={Activity}
                    onItemClick={handleItemClick}
                />
                <ItemGrid
                    title="Test Series"
                    items={testSeries}
                    icon={Trophy}
                    onItemClick={handleItemClick}
                />
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
