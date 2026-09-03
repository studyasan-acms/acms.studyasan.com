import { useEffect, useState } from 'react';
import { analyticsService, homeService, announcementService, boardService } from '@/services/api';
import api from '@/services/api';
import { getAnnouncementTypeConfig } from '@/utils/announcementUtils';
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
    PartyPopper,
    Palette,
    Compass,
    Laptop,
    Languages,
    Code2,
    Award,
    Sparkles,
    School,
    Star,
    Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

// ================== LEARNING STAGES STRUCTURE ==================
export interface LearningStage {
    id: 'ALL' | 'FOUNDATIONAL' | 'PREPARATORY' | 'MIDDLE' | 'SECONDARY' | 'OTHER_COURSES';
    name: string;
    stageNumber: string;
    grades: string;
    subtitle: string;
    description: string;
    icon: React.ElementType;
}

export const LEARNING_STAGES: LearningStage[] = [
    {
        id: 'ALL',
        name: 'All Stages',
        stageNumber: '0',
        grades: 'Complete Curriculum',
        subtitle: 'All Grades & Courses',
        description: 'Explore full academic curriculum and specialized courses',
        icon: Sparkles,
    },
    {
        id: 'FOUNDATIONAL',
        name: 'Foundational',
        stageNumber: '1',
        grades: 'Pre-Primary, Grades 1-2',
        subtitle: 'Pre-Primary, Grades 1-2',
        description: 'Early childhood, play, literacy, numeracy & activity discovery',
        icon: Palette,
    },
    {
        id: 'PREPARATORY',
        name: 'Preparatory',
        stageNumber: '2',
        grades: 'Grades 3-5',
        subtitle: 'Grades 3-5',
        description: 'Building literacy, numeracy & core conceptual foundations',
        icon: BookOpen,
    },
    {
        id: 'MIDDLE',
        name: 'Middle',
        stageNumber: '3',
        grades: 'Grades 6-8',
        subtitle: 'Grades 6-8',
        description: 'Experiential sciences, mathematics, humanities & arts',
        icon: Compass,
    },
    {
        id: 'SECONDARY',
        name: 'Secondary',
        stageNumber: '4',
        grades: 'Grades 9-12',
        subtitle: 'Grades 9-12',
        description: 'Higher concepts, board preparation & stream specialization',
        icon: GraduationCap,
    },
    {
        id: 'OTHER_COURSES',
        name: 'Other Courses',
        stageNumber: '★',
        grades: 'Computer, Competitive, Spoken English',
        subtitle: 'Skill & Competitive Programs',
        description: 'Specialized programs: Computer, Competitive, Spoken English, Aptitude',
        icon: Laptop,
    },
];

export const getItemStage = (item: any): 'FOUNDATIONAL' | 'PREPARATORY' | 'MIDDLE' | 'SECONDARY' | 'OTHER_COURSES' => {
    const className = (item.class || '').toLowerCase();
    const name = (item.name || '').toLowerCase();
    const isSpecialCourse =
        item.type === 'COURSE' ||
        name.includes('computer') ||
        name.includes('coding') ||
        name.includes('python') ||
        name.includes('spoken english') ||
        name.includes('english speaking') ||
        name.includes('competitive') ||
        name.includes('jee') ||
        name.includes('neet') ||
        name.includes('upsc') ||
        name.includes('olympiad') ||
        name.includes('aptitude') ||
        item.type === 'TEST_SERIES' ||
        item.type === 'ACTIVITY_GROUP';

    if (!className && isSpecialCourse) {
        return 'OTHER_COURSES';
    }

    // 1. Foundational: Pre-Primary, Grades 1-2
    if (
        className.includes('nursery') ||
        className.includes('lkg') ||
        className.includes('ukg') ||
        className.includes('pre') ||
        className.includes('kg') ||
        className.includes('play') ||
        className.includes('class 1') ||
        className.includes('grade 1') ||
        className.includes('class 2') ||
        className.includes('grade 2') ||
        className === '1' ||
        className === '2' ||
        className === '1st' ||
        className === '2nd'
    ) {
        return 'FOUNDATIONAL';
    }

    // 2. Preparatory: Grades 3-5
    if (
        className.includes('class 3') ||
        className.includes('grade 3') ||
        className.includes('class 4') ||
        className.includes('grade 4') ||
        className.includes('class 5') ||
        className.includes('grade 5') ||
        className === '3' ||
        className === '4' ||
        className === '5' ||
        className === '3rd' ||
        className === '4th' ||
        className === '5th'
    ) {
        return 'PREPARATORY';
    }

    // 3. Middle: Grades 6-8
    if (
        className.includes('class 6') ||
        className.includes('grade 6') ||
        className.includes('class 7') ||
        className.includes('grade 7') ||
        className.includes('class 8') ||
        className.includes('grade 8') ||
        className === '6' ||
        className === '7' ||
        className === '8' ||
        className === '6th' ||
        className === '7th' ||
        className === '8th'
    ) {
        return 'MIDDLE';
    }

    // 4. Secondary: Grades 9-12
    if (
        className.includes('class 9') ||
        className.includes('grade 9') ||
        className.includes('class 10') ||
        className.includes('grade 10') ||
        className.includes('class 11') ||
        className.includes('grade 11') ||
        className.includes('class 12') ||
        className.includes('grade 12') ||
        className === '9' ||
        className === '10' ||
        className === '11' ||
        className === '12' ||
        className === '9th' ||
        className === '10th' ||
        className === '11th' ||
        className === '12th'
    ) {
        return 'SECONDARY';
    }

    if (isSpecialCourse) {
        return 'OTHER_COURSES';
    }

    return 'MIDDLE';
};

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
    const [selectedStage, setSelectedStage] = useState<string>('ALL');
    const [selectedSkillCategory, setSelectedSkillCategory] = useState<string>('ALL');
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
    }, [searchQuery, filterType, selectedBoard, selectedStage, selectedSkillCategory, items]);

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

    const filterItems = () => {
        let filtered = items;

        // 1. Filter by Stage
        if (selectedStage !== 'ALL') {
            filtered = filtered.filter((item) => getItemStage(item) === selectedStage);
        }

        // 2. Filter by Skill Category when Other Courses is active
        if (selectedStage === 'OTHER_COURSES' && selectedSkillCategory !== 'ALL') {
            filtered = filtered.filter((item) => {
                const name = (item.name || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                const text = `${name} ${desc}`;

                if (selectedSkillCategory === 'COMPUTER') {
                    return text.includes('computer') || text.includes('coding') || text.includes('python') || text.includes('programming') || text.includes('web') || text.includes('app') || text.includes('tech');
                }
                if (selectedSkillCategory === 'COMPETITIVE') {
                    return text.includes('competitive') || text.includes('jee') || text.includes('neet') || text.includes('upsc') || text.includes('olympiad') || text.includes('aptitude') || text.includes('entrance') || item.type === 'TEST_SERIES';
                }
                if (selectedSkillCategory === 'SPOKEN_ENGLISH') {
                    return text.includes('spoken') || text.includes('english') || text.includes('communication') || text.includes('grammar') || text.includes('fluency');
                }
                if (selectedSkillCategory === 'ACTIVITIES') {
                    return item.type === 'ACTIVITY_GROUP';
                }
                return true;
            });
        }

        // 3. Filter by type
        if (filterType !== 'ALL' && filterType !== '') {
            filtered = filtered.filter((item) => item.type === filterType);
        }

        // 4. Filter by search query
        if (searchQuery && searchQuery.trim() !== '') {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.class && item.class.toLowerCase().includes(searchQuery.toLowerCase()))
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
                        <p className="text-white/90 text-sm mt-1 max-w-lg">
                            Wishing you a fantastic year ahead filled with learning, joy, and incredible achievements! ✨
                        </p>
                    </div>

                    {/* Right badge */}
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
                        <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/60 border-b border-slate-100">
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
                        <CardHeader className="pb-2 bg-slate-50/60 border-b border-slate-100">
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

            {/* ============================================================ */}
            {/* 2. EXPLORE LEARNING SECTION WITH STAGES STRUCTURE */}
            {/* ============================================================ */}
            <div className="space-y-6 pt-8 mt-8 border-t border-slate-200">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                                Explore Learning
                            </h2>
                            <Badge className="bg-saBlue/10 text-saBlue border border-saBlue/20 font-bold text-xs">
                                5 Stages
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Discover foundational, preparatory, middle, secondary stages and specialized skill courses
                        </p>
                    </div>

                    {/* Search & Filter Toolbar */}
                    <div className="flex gap-2.5 w-full md:w-auto">
                        <div className="relative flex-1 md:w-72">
                            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search courses, subjects, skills..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 rounded-xl border-slate-200 text-xs sm:text-sm focus:border-saBlue focus:ring-saBlue bg-white"
                            />
                        </div>
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[150px] h-10 rounded-xl border-slate-200 text-xs font-semibold bg-white">
                                <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl text-xs">
                                <SelectItem value="ALL">All Types</SelectItem>
                                <SelectItem value="COURSE">Courses</SelectItem>
                                <SelectItem value="SUBJECT">Subjects</SelectItem>
                                <SelectItem value="ACTIVITY_GROUP">Activities</SelectItem>
                                <SelectItem value="TEST_SERIES">Test Series</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* STAGES STRUCTURE CARDS (28.1 Requirement) */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <School className="w-4 h-4 text-saBlue" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Stages Structure & Skill Programs
                            </h3>
                        </div>
                        {selectedStage !== 'ALL' && (
                            <button
                                onClick={() => setSelectedStage('ALL')}
                                className="text-xs font-bold text-saBlue hover:underline"
                            >
                                View All Stages
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                        {LEARNING_STAGES.filter((s) => s.id !== 'ALL').map((stage) => {
                            const Icon = stage.icon;
                            const isSelected = selectedStage === stage.id;
                            const count = items.filter((item) => getItemStage(item) === stage.id).length;

                            return (
                                <button
                                    key={stage.id}
                                    type="button"
                                    onClick={() => setSelectedStage(isSelected ? 'ALL' : stage.id)}
                                    className={`p-3 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                                        isSelected
                                            ? 'bg-saBlue text-white border-saBlue shadow-lg shadow-saBlue/20 ring-2 ring-saBlue ring-offset-2'
                                            : 'bg-white border-slate-200/80 hover:border-saBlue/40 hover:shadow-xs text-slate-800'
                                    }`}
                                >
                                    <div className="flex items-start justify-between w-full mb-2">
                                        <div
                                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-saBlue/10 text-saBlue'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span
                                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {stage.stageNumber}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className={`text-xs sm:text-sm font-black tracking-tight leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                            {stage.name}
                                        </h4>
                                        <p className={`text-[10px] sm:text-[11px] font-bold mt-0.5 line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                            {stage.grades}
                                        </p>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-slate-100/30 flex items-center justify-between text-[10px]">
                                        <span className={isSelected ? 'text-blue-100' : 'text-slate-400'}>Programs</span>
                                        <span className={`font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>{count}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sub-Filter Pills for "Other Courses" (Eg: Computer, Competitive, Spoken English) */}
                {selectedStage === 'OTHER_COURSES' && (
                    <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center gap-1.5 overflow-x-auto select-none">
                        <span className="text-xs font-bold text-slate-500 mr-1 whitespace-nowrap">Specializations:</span>
                        {[
                            { id: 'ALL', label: 'All Skill Programs', icon: Sparkles },
                            { id: 'COMPUTER', label: 'Computer & Coding', icon: Code2 },
                            { id: 'COMPETITIVE', label: 'Competitive Exams', icon: Award },
                            { id: 'SPOKEN_ENGLISH', label: 'Spoken English & Communication', icon: Languages },
                            { id: 'ACTIVITIES', label: 'Interactive Activities', icon: Gamepad2 },
                        ].map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = selectedSkillCategory === sub.id;
                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => setSelectedSkillCategory(sub.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                                        isSubActive
                                            ? 'bg-saBlue text-white border-saBlue shadow-xs'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <SubIcon className="w-3.5 h-3.5" />
                                    <span>{sub.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Content Display */}
                {itemsLoading ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-200/80">
                        <Loader2 className="h-10 w-10 animate-spin text-saBlue mb-4" />
                        <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Loading learning content...</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {filteredItems.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-slate-700">No content found</h4>
                                <p className="text-slate-400 text-xs mt-1">
                                    No courses or subjects match your selected stage or search query.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-4 rounded-xl text-xs font-semibold"
                                    onClick={() => {
                                        setSelectedStage('ALL');
                                        setSelectedSkillCategory('ALL');
                                        setSearchQuery('');
                                        setFilterType('ALL');
                                    }}
                                >
                                    Reset Filters
                                </Button>
                            </div>
                        ) : selectedStage !== 'ALL' ? (
                            /* DIRECT GRID VIEW FOR SELECTED STAGE */
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-saBlue text-white font-bold text-xs px-2.5 py-1">
                                            {LEARNING_STAGES.find((s) => s.id === selectedStage)?.name}
                                        </Badge>
                                        <span className="text-xs text-slate-500 font-semibold">
                                            {filteredItems.length} programs available
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredItems.map((item) => (
                                        <div key={`${item.type}-${item.id}`} className="h-full">
                                            <HomeItemCard item={item} onClick={() => handleItemClick(item)} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* ALL STAGES SLIDERS VIEW */
                            <div className="space-y-12">
                                {/* Courses Section */}
                                {filteredItems.some((item) => item.type === 'COURSE') && (
                                    <ItemSlider
                                        title="Specialized Courses"
                                        items={filteredItems.filter((item) => item.type === 'COURSE').filter((item) => selectedCourseBoard === 'ALL' || item.board === selectedCourseBoard)}
                                        icon={BookOpen}
                                        onItemClick={handleItemClick}
                                        boards={getBoardsForCategory('COURSE')}
                                        selectedBoard={selectedCourseBoard}
                                        onSelectBoard={setSelectedCourseBoard}
                                    />
                                )}

                                {/* Subjects Section */}
                                {filteredItems.some((item) => item.type === 'SUBJECT') && (
                                    <ItemSlider
                                        title="Curriculum Subjects"
                                        items={filteredItems.filter((item) => item.type === 'SUBJECT').filter((item) => selectedSubjectBoard === 'ALL' || item.board === selectedSubjectBoard)}
                                        icon={GraduationCap}
                                        onItemClick={handleItemClick}
                                        boards={getBoardsForCategory('SUBJECT')}
                                        selectedBoard={selectedSubjectBoard}
                                        onSelectBoard={setSelectedSubjectBoard}
                                    />
                                )}

                                {/* Activity Groups Section */}
                                {filteredItems.some((item) => item.type === 'ACTIVITY_GROUP') && (
                                    <ItemSlider
                                        title="Activity Groups & Games"
                                        items={filteredItems.filter((item) => item.type === 'ACTIVITY_GROUP').filter((item) => selectedActivityBoard === 'ALL' || item.board === selectedActivityBoard)}
                                        icon={Activity}
                                        onItemClick={handleItemClick}
                                        boards={getBoardsForCategory('ACTIVITY_GROUP')}
                                        selectedBoard={selectedActivityBoard}
                                        onSelectBoard={setSelectedActivityBoard}
                                    />
                                )}

                                {/* Test Series Section */}
                                {filteredItems.some((item) => item.type === 'TEST_SERIES') && (
                                    <ItemSlider
                                        title="Mock Tests & Test Series"
                                        items={filteredItems.filter((item) => item.type === 'TEST_SERIES').filter((item) => selectedTestSeriesBoard === 'ALL' || item.board === selectedTestSeriesBoard)}
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
