import { useEffect, useState } from 'react';
import { analyticsService, homeService, announcementService, boardService } from '@/services/api';
import api from '@/services/api';
import { StatCard } from '@/components/analytics/StatCard';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import HomeItemCard from '@/components/home/HomeItemCard';
import ItemDetailModal from '@/components/home/ItemDetailModal';
import LiveClassAttendanceWidget from '@/components/dashboard/LiveClassAttendanceWidget';
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
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
    Loader2,
    Download,
    Calendar,
    Megaphone,
    Grid3x3,
    BookMarked,
    PartyPopper
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
const SectionBoardFilter = ({ 
    boards, 
    selectedBoard, 
    onSelectBoard 
}: { 
    boards: Array<{ id: string; name: string; count: number }>;
    selectedBoard: string;
    onSelectBoard: (board: string) => void;
}) => {
    if (boards.length === 0) return null;
    
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 flex-wrap">
            <button
                onClick={() => onSelectBoard('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    selectedBoard === 'ALL'
                        ? 'bg-saBlue text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
                All Boards
            </button>
            {boards.slice(0, 4).map((board) => (
                <button
                    key={board.id}
                    onClick={() => onSelectBoard(board.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        selectedBoard === board.id
                            ? 'bg-saBlue text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    <BookMarked className="h-3.5 w-3.5" />
                    {board.name}
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedBoard === board.id
                            ? 'bg-white/30 text-white'
                            : 'bg-slate-200 text-slate-500'
                    }`}>
                        {board.count}
                    </span>
                </button>
            ))}
            {boards.length > 4 && (
                <Select value={selectedBoard} onValueChange={onSelectBoard}>
                    <SelectTrigger className="w-fit h-8 rounded-full border-none bg-slate-100 hover:bg-slate-200 text-xs font-bold px-3">
                        <SelectValue placeholder="More" />
                    </SelectTrigger>
                    <SelectContent>
                        {boards.slice(4).map((board) => (
                            <SelectItem key={board.id} value={board.id}>
                                <span className="flex items-center gap-2 text-xs font-bold">
                                    {board.name}
                                    <span className="text-[10px] text-slate-400">({board.count})</span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
};

// Slider Component from StudentHomePage
const ItemSlider = ({ title, items, icon: Icon, onItemClick, boards, selectedBoard, onSelectBoard }: {
    title: string;
    items: any[];
    icon: React.ElementType;
    onItemClick: (item: any) => void;
    boards?: Array<{ id: string; name: string; count: number }>;
    selectedBoard?: string;
    onSelectBoard?: (board: string) => void;
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3 shrink-0">
                    <div className="p-2 rounded-xl bg-blue-50 text-[#0276D3]">
                        <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800">{title}</h3>
                </div>

                {boards && selectedBoard && onSelectBoard && boards.length > 0 && (
                    <div className="flex-1 sm:ml-6 flex items-center justify-start overflow-x-auto">
                        <SectionBoardFilter
                            boards={boards}
                            selectedBoard={selectedBoard}
                            onSelectBoard={onSelectBoard}
                        />
                    </div>
                )}

                {items.length > 2 && (
                    <div className="flex space-x-2 shrink-0 self-end sm:self-auto">
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
                className="flex space-x-4 md:space-x-5 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth"
                style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(2, 118, 211, 0.3) transparent'
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
    
    // Performance Timeseries State
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [performancePeriod, setPerformancePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    // Home Items State
    const [items, setItems] = useState<any[]>([]);
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [selectedBoard, setSelectedBoard] = useState<string>('ALL');
    const [boardsList, setBoardsList] = useState<Array<{ id: string; name: string; count: number }>>([]);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isBirthday, setIsBirthday] = useState(false);
    const [studentName, setStudentName] = useState<string>('');
    const navigate = useNavigate();

    // Local board filter states for separate categories
    const [selectedCourseBoard, setSelectedCourseBoard] = useState<string>('ALL');
    const [selectedSubjectBoard, setSelectedSubjectBoard] = useState<string>('ALL');
    const [selectedActivityBoard, setSelectedActivityBoard] = useState<string>('ALL');
    const [selectedTestSeriesBoard, setSelectedTestSeriesBoard] = useState<string>('ALL');

    const getBoardsForCategory = (type: string) => {
        const boardMap = new Map<string, number>();
        items.forEach((item: any) => {
            if (item.type === type && item.board && typeof item.board === 'string') {
                const boardName = item.board;
                boardMap.set(boardName, (boardMap.get(boardName) || 0) + 1);
            }
        });
        return Array.from(boardMap.entries()).map(([name, count]) => ({
            id: name,
            name: name,
            count: count
        }));
    };

    useEffect(() => {
        fetchAnalytics();
        fetchPerformanceData();
        fetchHomeItems();
        fetchBoards();
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

    useEffect(() => {
        // Update board counts whenever items change
        // Only count SUBJECT items since only subjects have boards
        if (items.length > 0) {
            // Extract unique board names from subjects
            const boardMap = new Map<string, number>();
            
            items.forEach((item: any) => {
                // Only count subjects with boards
                if (item.type === 'SUBJECT' && item.board && typeof item.board === 'string') {
                    const boardName = item.board;
                    boardMap.set(boardName, (boardMap.get(boardName) || 0) + 1);
                }
            });
            
            // Convert to formatted boards array
            const formattedBoards = Array.from(boardMap.entries()).map(([name, count]) => ({
                id: name,
                name: name,
                count: count
            }));
            
            setBoardsList(formattedBoards);
        }
    }, [items]);

    useEffect(() => {
        filterItems();
    }, [searchQuery, filterType, selectedBoard, items]);

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
        } finally {
            setItemsLoading(false);
        }
    };

    const fetchBoards = async () => {
        try {
            // Boards will be extracted from items in the updateBoardCounts effect
            setSelectedBoard('ALL');
        } catch (error: any) {
            console.error('Error fetching boards:', error);
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
                            padding: 10px;
                            border-radius: 8px;
                            margin-right: 15px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .logo { max-height: 45px; width: auto; }
                        .header-left { display: flex; align-items: center; }
                        .header-text h1 { font-size: 28px; color: #1f2937; margin: 0; }
                        .header-text p { font-size: 14px; color: #6b7280; margin: 5px 0 0 0; }
                        
                        .period-badge { 
                            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                            color: white; 
                            padding: 8px 16px; 
                            border-radius: 20px;
                            font-size: 13px;
                            font-weight: 600;
                        }
                        
                        .info-grid { 
                            display: grid; 
                            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                            gap: 20px; 
                            margin-bottom: 40px;
                        }
                        .info-box { 
                            padding: 20px; 
                            border-radius: 10px; 
                            background-color: #f3f4f6 !important;
                            border: 1px solid #e5e7eb;
                            border-left: 4px solid #3b82f6;
                        }
                        .info-box.avg { border-left-color: #3b82f6; }
                        .info-box.max { border-left-color: #10b981; }
                        .info-box.date { border-left-color: #f59e0b; }
                        
                        .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
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
                                <div class="logo-container">
                                    <img src="${window.location.origin}/studyasan-logo.png" alt="StudyAsan Logo" class="logo" />
                                </div>
                                <div class="header-text">
                                    <h1 style="color: #4b5563; font-size: 22px; font-weight: 600; margin-top: 4px;">Performance Report</h1>
                                </div>
                            </div>
                            <div class="period-badge">${periodLabel} Overview</div>
                        </div>

                        <div class="info-grid">
                            <div class="info-box avg">
                                <div class="info-label">Average Score</div>
                                <div class="info-value avg">${avgScore}%</div>
                            </div>
                            <div class="info-box max">
                                <div class="info-label">Highest Score</div>
                                <div class="info-value max">${maxScore}%</div>
                            </div>
                            <div class="info-box date">
                                <div class="info-label">Generated On</div>
                                <div class="info-value date" style="font-size: 16px; color: #f59e0b;">${today}</div>
                            </div>
                            <div class="info-box">
                                <div class="info-label">Modules Studied</div>
                                <div class="info-value" style="color: #4f46e5;">${analytics?.modules?.completed || 0}</div>
                            </div>
                            <div class="info-box">
                                <div class="info-label">Classes Taken</div>
                                <div class="info-value" style="color: #ea580c;">${analytics?.classes?.attended || 0}</div>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">📊 ${periodLabel} Breakdown</div>
                            <div class="data-grid">
                                ${selectedPeriodData.map((item: any) => `
                                    <div class="data-row">
                                        <div class="data-label">${item.label}</div>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${item.score}%;"></div>
                                        </div>
                                        <div class="data-value">${item.score}%</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="footer">
                            <p>This is an automatically generated performance report from StudyAsan.</p>
                            <p style="margin-top: 8px;">Keep learning and improving! 🎓</p>
                        </div>
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


    const filterItems = () => {
        let filtered = items;

        // Filter by type
        if (filterType !== 'ALL' && filterType !== '') {
            filtered = filtered.filter((item) => item.type === filterType);
        }

        // Filter by search query
        if (searchQuery && searchQuery.trim() !== '') {
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

    const performanceTrendData = analytics ? [
        { name: 'Tests', value: analytics.tests.averageScore, fill: '#3b82f6' },
        { name: 'Activities', value: analytics.activities.averageScore, fill: '#f59e0b' },
        { name: 'Modules', value: analytics.modules.averageProgress, fill: '#10b981' }
    ] : [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

            {/* 🎂 Birthday Banner */}
            {isBirthday && (
                <div
                    className="relative overflow-hidden rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
                    style={{
                        background: 'linear-gradient(135deg, #0276D3 0%, #0590ff 50%, #eca209 100%)',
                        boxShadow: '0 8px 32px rgba(2, 118, 211, 0.35)'
                    }}
                >
                    {/* Decorative blobs */}
                    <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full opacity-20" style={{ background: '#eca209' }} />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ background: '#ffffff' }} />

                    {/* Icon */}
                    <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                        <span className="text-4xl select-none">🎂</span>
                    </div>

                    {/* Text */}
                    <div className="relative flex-1 text-center sm:text-left">
                        <p className="text-white/80 text-sm font-semibold tracking-widest uppercase mb-0.5">Today is your special day!</p>
                        <h2 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight">
                            Happy Birthday{studentName ? `, ${studentName.split(' ')[0]}` : ''}! 🎉
                        </h2>
                        <p className="text-white/75 text-sm mt-1">Wishing you a wonderful day full of joy and success. Keep learning and growing! 🌟</p>
                    </div>

                    {/* Party icon */}
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

            {/* Live Class Attendance Banner */}
            <LiveClassAttendanceWidget isStudent={true} />

            {/* 1. Analytics Section */}
            {analytics && performanceData ? (
                <div className="space-y-6">
                    {/* Period Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Performance Overview</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80">
                                <Button
                                    size="sm"
                                    onClick={() => setPerformancePeriod('daily')}
                                    className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                                        performancePeriod === 'daily'
                                            ? 'bg-[#0276D3] text-white shadow-sm'
                                            : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    }`}
                                >
                                    Daily
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setPerformancePeriod('weekly')}
                                    className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                                        performancePeriod === 'weekly'
                                            ? 'bg-[#0276D3] text-white shadow-sm'
                                            : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    }`}
                                >
                                    Weekly
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setPerformancePeriod('monthly')}
                                    className={`h-9 px-4 rounded-xl text-xs font-bold transition-all ${
                                        performancePeriod === 'monthly'
                                            ? 'bg-[#0276D3] text-white shadow-sm'
                                            : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    }`}
                                >
                                    Monthly
                                </Button>
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleExportPDF}
                                className="h-10 px-4 rounded-2xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <Download className="h-4 w-4 text-[#0276D3]" />
                                Export PDF
                            </Button>
                        </div>
                    </div>

                    {/* Dynamic Stats Cards - Scroll Horizontally */}
                    <div className="relative">
                        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth" style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(2, 118, 211, 0.3) transparent'
                        }}>
                            {performanceData[performancePeriod]?.map((item: any, idx: number) => (
                                <div key={idx} className="flex-shrink-0 w-64 sm:w-72 snap-start">
                                    <StatCard
                                        title={item.label}
                                        value={`${item.score}%`}
                                        icon={TrendingUp}
                                        description={`Score: ${item.score}/${item.total}`}
                                        className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-[#0276D3]/40 transition-all p-5"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#0276D3]/30 transition-all">
                            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Modules Studied</p>
                            <p className="text-2xl font-black text-[#0276D3] mt-1">
                                {analytics?.modules?.completed || 0}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#eca209]/40 transition-all">
                            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Classes Taken</p>
                            <p className="text-2xl font-black text-[#eca209] mt-1">
                                {analytics?.classes?.attended || 0}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#0276D3]/30 transition-all">
                            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Average Score</p>
                            <p className="text-2xl font-black text-[#0276D3] mt-1">
                                {performanceData[performancePeriod]?.length > 0 
                                    ? (performanceData[performancePeriod].reduce((sum: number, d: any) => sum + (d.score || 0), 0) / performanceData[performancePeriod].length || 0).toFixed(0)
                                    : 0}%
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-emerald-300 transition-all">
                            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Highest Score</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                {performanceData[performancePeriod]?.length > 0 
                                    ? Math.max(...performanceData[performancePeriod].map((d: any) => d.score))
                                    : 0}%
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-[#eca209]/40 transition-all">
                            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Attempts</p>
                            <p className="text-2xl font-black text-[#eca209] mt-1">
                                {performanceData[performancePeriod]?.length || 0}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
                            <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Lowest Score</p>
                            <p className="text-2xl font-black text-slate-700 mt-1">
                                {performanceData[performancePeriod]?.length > 0 
                                    ? Math.min(...performanceData[performancePeriod].map((d: any) => d.score))
                                    : 0}%
                            </p>
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
                                data={performanceTrendData}
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
                        <p className="text-sm text-gray-500 mt-1">Discover courses, subjects, activities, and tests</p>
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
                    <div className="space-y-8">
                        {/* Content Sections */}
                        {filteredItems.length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No content found</p>
                                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query</p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {/* Courses Section */}
                                {filteredItems.some(item => item.type === 'COURSE') && (
                                    <ItemSlider
                                        title="Courses"
                                        items={filteredItems.filter(item => item.type === 'COURSE').filter(item => selectedCourseBoard === 'ALL' || item.board === selectedCourseBoard)}
                                        icon={BookOpen}
                                        onItemClick={handleItemClick}
                                        boards={getBoardsForCategory('COURSE')}
                                        selectedBoard={selectedCourseBoard}
                                        onSelectBoard={setSelectedCourseBoard}
                                    />
                                )}

                                {/* Subjects Section */}
                                {filteredItems.some(item => item.type === 'SUBJECT') && (
                                    <ItemSlider
                                        title="Subjects"
                                        items={filteredItems.filter(item => item.type === 'SUBJECT').filter(item => selectedSubjectBoard === 'ALL' || item.board === selectedSubjectBoard)}
                                        icon={GraduationCap}
                                        onItemClick={handleItemClick}
                                        boards={getBoardsForCategory('SUBJECT')}
                                        selectedBoard={selectedSubjectBoard}
                                        onSelectBoard={setSelectedSubjectBoard}
                                    />
                                )}

                                {/* Activity Groups Section */}
                                {filteredItems.some(item => item.type === 'ACTIVITY_GROUP') && (
                                    <ItemSlider
                                        title="Activity Groups"
                                        items={filteredItems.filter(item => item.type === 'ACTIVITY_GROUP').filter(item => selectedActivityBoard === 'ALL' || item.board === selectedActivityBoard)}
                                        icon={Activity}
                                        onItemClick={handleItemClick}
                                        boards={getBoardsForCategory('ACTIVITY_GROUP')}
                                        selectedBoard={selectedActivityBoard}
                                        onSelectBoard={setSelectedActivityBoard}
                                    />
                                )}

                                {/* Test Series Section */}
                                {filteredItems.some(item => item.type === 'TEST_SERIES') && (
                                    <ItemSlider
                                        title="Test Series"
                                        items={filteredItems.filter(item => item.type === 'TEST_SERIES').filter(item => selectedTestSeriesBoard === 'ALL' || item.board === selectedTestSeriesBoard)}
                                        icon={Trophy}
                                        onItemClick={handleItemClick}
                                        boards={getBoardsForCategory('TEST_SERIES')}
                                        selectedBoard={selectedTestSeriesBoard}
                                        onSelectBoard={setSelectedTestSeriesBoard}
                                    />
                                )}
                            </div>
                        )}
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
