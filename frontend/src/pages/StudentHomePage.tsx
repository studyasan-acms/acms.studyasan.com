import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Loader2, Search, Filter, ChevronLeft, ChevronRight, BookOpen, Activity, FileText, Users, GraduationCap, Trophy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import HomeItemCard from '@/components/home/HomeItemCard';
import ItemDetailModal from '@/components/home/ItemDetailModal';
import { toast } from 'sonner';
import { usePageTitle } from "@/hooks/usePageTitle";

// Grid Component
const ItemGrid = ({ title, items, icon: Icon, onItemClick }: {
    title: string;
    items: any[];
    icon: React.ElementType;
    onItemClick: (item: any) => void;
}) => {
    return (
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center space-x-3 border-b pb-4 border-gray-100">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="h-5 w-5 md:h-6 md:w-6 text-saBlue" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight">{title}</h2>
            </div>
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center w-full py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Icon className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-gray-400 font-medium">No {title.toLowerCase()} available at the moment</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {items.map((item) => (
                        <div key={`${item.type}-${item.id}`} className="transform hover:-translate-y-1 transition-transform duration-300">
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

    useEffect(() => {
        fetchHomeItems();
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
        const filteredSubjectsAndCourses = filtered.filter(item => item.type === 'SUBJECT' || item.type === 'COURSE');
        const filteredActivityGroups = filtered.filter(item => item.type === 'ACTIVITY_GROUP');
        const filteredTestSeries = filtered.filter(item => item.type === 'TEST_SERIES');

        setFilteredItems(filtered);
        // Note: We'll use the original grouped items for sliders, but filtered for any future use
    };

    const handleItemClick = (item: any) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedItem(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 md:h-96">
                <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-saBlue" />
            </div>
        );
    }

    const subjectsAndCourses = filteredItems.filter(item => item.type === 'SUBJECT' || item.type === 'COURSE');
    const activityGroups = filteredItems.filter(item => item.type === 'ACTIVITY_GROUP');
    const testSeries = filteredItems.filter(item => item.type === 'TEST_SERIES');

    return (
        <div className="space-y-4 md:space-y-8">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-saBlue to-saBlueDark text-white rounded-lg p-3 md:p-6">
                <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2">
                    Welcome back, {user?.name || 'Student'}!
                </h1>
                <p className="text-blue-100 text-xs md:text-base">
                    Continue your learning journey
                </p>
            </div>

            {/* Quick Navigation */}
            <div className="grid grid-cols-1 gap-2 md:gap-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                    <Link
                        to="/dashboard/subjects"
                        className="bg-white rounded-lg p-2 md:p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                    >
                        <div className="flex items-center space-x-2 md:space-x-3">
                            <BookOpen className="h-5 w-5 md:h-8 md:w-8 text-saBlue flex-shrink-0" />
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-700 text-xs md:text-base">My Subjects</h3>
                                <p className="text-xs text-gray-500 truncate hidden sm:block">View enrolled subjects</p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        to="/dashboard/student-activities"
                        className="bg-white rounded-lg p-2 md:p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                    >
                        <div className="flex items-center space-x-2 md:space-x-3">
                            <Activity className="h-5 w-5 md:h-8 md:w-8 text-green-600 flex-shrink-0" />
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-700 text-xs md:text-base">My Activities</h3>
                                <p className="text-xs text-gray-500 truncate hidden sm:block">Track your progress</p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        to="/dashboard/test-series"
                        className="bg-white rounded-lg p-2 md:p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                    >
                        <div className="flex items-center space-x-2 md:space-x-3">
                            <Trophy className="h-5 w-5 md:h-8 md:w-8 text-yellow-600 flex-shrink-0" />
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-700 text-xs md:text-base">Test Series</h3>
                                <p className="text-xs text-gray-500 truncate hidden sm:block">Practice tests</p>
                            </div>
                        </div>
                    </Link>
                    <Link
                        to="/dashboard/profile"
                        className="bg-white rounded-lg p-2 md:p-4 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
                    >
                        <div className="flex items-center space-x-2 md:space-x-3">
                            <Users className="h-5 w-5 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
                            <div className="min-w-0">
                                <h3 className="font-semibold text-gray-700 text-xs md:text-base">Profile</h3>
                                <p className="text-xs text-gray-500 truncate hidden sm:block">Manage your account</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg p-3 md:p-6 shadow-md">
                <div className="flex flex-col gap-2 md:gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search courses, activities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 text-sm md:text-base"
                        />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-full h-9 md:h-10">
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

            {/* Grids */}
            <div className="space-y-4 md:space-y-8">
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
