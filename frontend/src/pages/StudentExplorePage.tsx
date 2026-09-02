import { useEffect, useState } from 'react';
import { homeService, announcementService } from '@/services/api';
import api from '@/services/api';
import { getAnnouncementTypeConfig } from '@/utils/announcementUtils';
import HomeItemCard from '@/components/home/HomeItemCard';
import ItemDetailModal from '@/components/home/ItemDetailModal';
import LiveClassAttendanceWidget from '@/components/dashboard/LiveClassAttendanceWidget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    Search,
    Trophy,
    Loader2,
    Megaphone,
    BookMarked,
    PartyPopper,
    Compass,
    Laptop,
    School,
    Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

// ================== MAIN EXPLORE TABS ==================
export type MainExploreTab = 'SUBJECT' | 'COURSE' | 'ACTIVITY_GROUP' | 'TEST_SERIES';

export interface TabConfig {
    id: MainExploreTab;
    label: string;
    icon: React.ElementType;
    description: string;
}

export const MAIN_TABS: TabConfig[] = [
    {
        id: 'SUBJECT',
        label: 'Subjects',
        icon: BookOpen,
        description: 'School curriculum stages from Foundational to Secondary',
    },
    {
        id: 'COURSE',
        label: 'Courses',
        icon: Laptop,
        description: 'Specialized programs: Computer, Competitive, Spoken English',
    },
    {
        id: 'ACTIVITY_GROUP',
        label: 'Activities',
        icon: Gamepad2,
        description: 'Gamified learning games, quizzes & interactive challenges',
    },
    {
        id: 'TEST_SERIES',
        label: 'Test Series',
        icon: Trophy,
        description: 'Mock tests, chapter quizzes & full exam series',
    },
];

// ================== SUBJECT STAGES STRUCTURE ==================
export interface SubjectStage {
    id: 'FOUNDATIONAL' | 'PREPARATORY' | 'MIDDLE' | 'SECONDARY' | 'ALL';
    name: string;
    stageNumber: string;
    grades: string;
    description: string;
    icon: React.ElementType;
}

export const SUBJECT_STAGES: SubjectStage[] = [
    {
        id: 'FOUNDATIONAL',
        name: 'Foundational',
        stageNumber: '1',
        grades: 'Pre-Primary, Grades 1-2',
        description: 'Subjects for Pre-Primary (Nursery, LKG, UKG) and Grades 1 & 2',
        icon: School,
    },
    {
        id: 'PREPARATORY',
        name: 'Preparatory',
        stageNumber: '2',
        grades: 'Grades 3-5',
        description: 'Subjects for Grades 3, 4, and 5',
        icon: BookOpen,
    },
    {
        id: 'MIDDLE',
        name: 'Middle',
        stageNumber: '3',
        grades: 'Grades 6-8',
        description: 'Subjects for Grades 6, 7, and 8',
        icon: Compass,
    },
    {
        id: 'SECONDARY',
        name: 'Secondary',
        stageNumber: '4',
        grades: 'Grades 9-12',
        description: 'Subjects for Grades 9, 10, 11, and 12',
        icon: GraduationCap,
    },
    {
        id: 'ALL',
        name: 'All Stages',
        stageNumber: '★',
        grades: 'All Grades',
        description: 'All curriculum subjects across all stages',
        icon: Sparkles,
    },
];

/**
 * Classifies a subject item into:
 * - FOUNDATIONAL (Pre-Primary, Grades 1-2)
 * - PREPARATORY (Grades 3-5)
 * - MIDDLE (Grades 6-8)
 * - SECONDARY (Grades 9-12)
 */
export const getSubjectStage = (item: any): 'FOUNDATIONAL' | 'PREPARATORY' | 'MIDDLE' | 'SECONDARY' => {
    const raw = (item.class || '').toLowerCase().trim();

    // Check for Nursery / Kindergarten / Pre-primary / Play
    if (
        raw.includes('nursery') ||
        raw.includes('lkg') ||
        raw.includes('ukg') ||
        raw.includes('kg') ||
        raw.includes('pre') ||
        raw.includes('play')
    ) {
        return 'FOUNDATIONAL';
    }

    // Extract numerical grade or standard (e.g., "Class 10", "Grade 1", "11th", "12")
    const match = raw.match(/\b(?:class|grade|std|standard)?\s*(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (match) {
        const num = parseInt(match[1], 10);
        if (num === 1 || num === 2) return 'FOUNDATIONAL';
        if (num >= 3 && num <= 5) return 'PREPARATORY';
        if (num >= 6 && num <= 8) return 'MIDDLE';
        if (num >= 9 && num <= 12) return 'SECONDARY';
    }

    // Roman numeral checks
    if (/\b(?:class|grade)?\s*(?:ix|x|xi|xii)\b/.test(raw)) return 'SECONDARY';
    if (/\b(?:class|grade)?\s*(?:vi|vii|viii)\b/.test(raw)) return 'MIDDLE';
    if (/\b(?:class|grade)?\s*(?:iii|iv|v)\b/.test(raw)) return 'PREPARATORY';
    if (/\b(?:class|grade)?\s*(?:i|ii)\b/.test(raw)) return 'FOUNDATIONAL';

    // Default fallback
    return 'SECONDARY';
};

export default function StudentExplorePage() {
    usePageTitle('Explore Learning');
    const navigate = useNavigate();

    // State
    const [items, setItems] = useState<any[]>([]);
    const [itemsLoading, setItemsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // 4 Main Tabs: Subjects (default), Courses, Activities, Test Series
    const [activeTab, setActiveTab] = useState<MainExploreTab>('SUBJECT');

    // Sub-stage for Subjects: Foundational is SELECTED BY DEFAULT
    const [selectedStage, setSelectedStage] = useState<'FOUNDATIONAL' | 'PREPARATORY' | 'MIDDLE' | 'SECONDARY' | 'ALL'>('FOUNDATIONAL');

    // Board filter
    const [selectedBoard, setSelectedBoard] = useState<string>('ALL');

    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isBirthday, setIsBirthday] = useState(false);
    const [studentName, setStudentName] = useState<string>('');

    useEffect(() => {
        fetchHomeItems();
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

    const fetchHomeItems = async () => {
        try {
            setItemsLoading(true);
            const response = await homeService.getItems();
            setItems(response.data || []);
        } catch (error: any) {
            console.error('Error fetching home items:', error);
        } finally {
            setItemsLoading(false);
        }
    };

    // Calculate dynamic boards for current tab & stage
    const currentTabItems = items.filter((item) => item.type === activeTab);
    const currentStageSubjects = activeTab === 'SUBJECT'
        ? (selectedStage === 'ALL' ? currentTabItems : currentTabItems.filter((item) => getSubjectStage(item) === selectedStage))
        : currentTabItems;

    const availableBoards = Array.from(
        new Set(
            currentStageSubjects
                .map((i) => i.board)
                .filter((b): b is string => Boolean(b && typeof b === 'string'))
        )
    );

    // Filtered items to display
    const displayedItems = currentStageSubjects.filter((item) => {
        // Board filter
        if (selectedBoard !== 'ALL' && item.board !== selectedBoard) {
            return false;
        }

        // Search query
        if (searchQuery && searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const nameMatch = (item.name || '').toLowerCase().includes(query);
            const classMatch = (item.class || '').toLowerCase().includes(query);
            const boardMatch = (item.board || '').toLowerCase().includes(query);
            const descMatch = (item.description || '').toLowerCase().includes(query);
            if (!nameMatch && !classMatch && !boardMatch && !descMatch) {
                return false;
            }
        }

        return true;
    });

    const handleItemClick = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Top Header */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Explore Learning</h1>
                    <Badge className="bg-saBlue/10 text-saBlue border border-saBlue/20 font-bold text-xs">
                        StudyAsan
                    </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Browse curriculum subjects across foundational, preparatory, middle, secondary stages, specialized courses, games & tests
                </p>
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

            {/* ================= 4 MAIN TABS (Subjects, Courses, Activities, Test Series) ================= */}
            <div className="bg-white p-2 sm:p-2.5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {MAIN_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const count = items.filter((i) => i.type === tab.id).length;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedBoard('ALL');
                                }}
                                className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl transition-all duration-200 font-extrabold text-xs sm:text-sm ${
                                    isActive
                                        ? 'bg-saBlue text-white shadow-md shadow-saBlue/25'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div
                                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-saBlue/10 text-saBlue'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className="tracking-tight">{tab.label}</span>
                                </div>
                                <span
                                    className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ================= SUB-TABS: SUBJECT STAGES STRUCTURE (Foundational, Preparatory, Middle, Secondary) ================= */}
            {activeTab === 'SUBJECT' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <School className="w-4 h-4 text-saBlue" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Curriculum Stages
                            </h3>
                        </div>
                        {selectedStage !== 'FOUNDATIONAL' && (
                            <button
                                onClick={() => {
                                    setSelectedStage('FOUNDATIONAL');
                                    setSelectedBoard('ALL');
                                }}
                                className="text-xs font-bold text-saBlue hover:underline"
                            >
                                Reset to Foundational
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                        {SUBJECT_STAGES.map((stage) => {
                            const Icon = stage.icon;
                            const isSelected = selectedStage === stage.id;
                            const count = stage.id === 'ALL'
                                ? items.filter((i) => i.type === 'SUBJECT').length
                                : items.filter((i) => i.type === 'SUBJECT' && getSubjectStage(i) === stage.id).length;

                            return (
                                <button
                                    key={stage.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStage(stage.id);
                                        setSelectedBoard('ALL');
                                    }}
                                    className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                                        isSelected
                                            ? 'bg-saBlue text-white border-saBlue shadow-lg shadow-saBlue/20 ring-2 ring-saBlue ring-offset-2'
                                            : 'bg-white border-slate-200/80 hover:border-saBlue/40 hover:shadow-xs text-slate-800'
                                    }`}
                                >
                                    <div className="flex items-start justify-between w-full mb-2">
                                        <div
                                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                                isSelected ? 'bg-white/20 text-white' : 'bg-saBlue/10 text-saBlue'
                                            }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
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
                                        <span className={isSelected ? 'text-blue-100' : 'text-slate-400'}>Subjects</span>
                                        <span className={`font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>{count}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ================= SEARCH & BOARD FILTER TOOLBAR ================= */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder={`Search ${activeTab.toLowerCase().replace('_', ' ')}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 rounded-xl border-slate-200 text-xs sm:text-sm focus:border-saBlue focus:ring-saBlue bg-slate-50/50"
                    />
                </div>

                {availableBoards.length > 0 && (
                    <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                        <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl border-slate-200 text-xs font-bold bg-slate-50/50">
                            <BookMarked className="h-3.5 w-3.5 mr-1.5 text-saBlue" />
                            <SelectValue placeholder="All Boards" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl text-xs">
                            <SelectItem value="ALL">All Boards</SelectItem>
                            {availableBoards.map((board) => (
                                <SelectItem key={board} value={board}>
                                    {board}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* ================= CONTENT DISPLAY GRID ================= */}
            {itemsLoading ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border border-slate-200/80">
                    <Loader2 className="h-10 w-10 animate-spin text-saBlue mb-4" />
                    <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Loading learning content...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-saBlue text-white font-extrabold text-xs px-3 py-1">
                                {activeTab === 'SUBJECT'
                                    ? `${SUBJECT_STAGES.find((s) => s.id === selectedStage)?.name} Subjects`
                                    : MAIN_TABS.find((t) => t.id === activeTab)?.label}
                            </Badge>
                            <span className="text-xs text-slate-500 font-bold">
                                {displayedItems.length} available
                            </span>
                        </div>
                    </div>

                    {displayedItems.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                            <h4 className="text-base font-bold text-slate-700">No content found</h4>
                            <p className="text-slate-400 text-xs mt-1">
                                No items match your selected filter or search query.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4 rounded-xl text-xs font-semibold hover:bg-saBlue hover:text-white"
                                onClick={() => {
                                    setSelectedStage('FOUNDATIONAL');
                                    setSelectedBoard('ALL');
                                    setSearchQuery('');
                                }}
                            >
                                Reset Filters
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {displayedItems.map((item) => (
                                <div key={`${item.type}-${item.id}`} className="h-full">
                                    <HomeItemCard item={item} onClick={() => handleItemClick(item)} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
