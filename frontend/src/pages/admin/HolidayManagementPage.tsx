import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  isToday,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Palmtree,
  PartyPopper,
  GraduationCap,
  Flag,
  Info,
  CalendarDays,
  List,
  Grid,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import UnifiedPageHeader from '@/components/ui/UnifiedPageHeader';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { holidayService } from '@/services/api';
import type { Holiday, HolidayType, CreateHolidayData, UpdateHolidayData } from '@/types';
import { toast } from 'sonner';

export const HOLIDAY_TYPE_CONFIG: Record<HolidayType, {
  label: string;
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  dotBg: string;
}> = {
  NATIONAL: {
    label: 'National Holiday',
    icon: Flag,
    bg: 'bg-rose-50 text-rose-800 border-rose-200',
    text: 'text-rose-700',
    border: 'border-rose-300',
    badgeBg: 'bg-rose-100 text-rose-800',
    dotBg: 'bg-rose-500',
  },
  FESTIVAL: {
    label: 'Festival',
    icon: PartyPopper,
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    text: 'text-amber-700',
    border: 'border-amber-300',
    badgeBg: 'bg-amber-100 text-amber-800',
    dotBg: 'bg-amber-500',
  },
  ACADEMIC: {
    label: 'Academic Break',
    icon: GraduationCap,
    bg: 'bg-sky-50 text-sky-800 border-sky-200',
    text: 'text-sky-700',
    border: 'border-sky-300',
    badgeBg: 'bg-sky-100 text-sky-800',
    dotBg: 'bg-sky-500',
  },
  VACATION: {
    label: 'Vacation',
    icon: Palmtree,
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    dotBg: 'bg-emerald-500',
  },
  GENERAL: {
    label: 'General Holiday',
    icon: Sparkles,
    bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    dotBg: 'bg-indigo-500',
  },
};

export default function HolidayManagementPage() {
  usePageTitle('Holiday Management');
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  // View state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for list view
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<{
    id?: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    type: HolidayType;
  }>({
    title: '',
    description: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    type: 'GENERAL',
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Fetch holidays
  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await holidayService.getAll({
        year: currentDate.getFullYear(),
      });
      if (res && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any).holidays || [];
        setHolidays(list);
      }
    } catch (err: any) {
      console.error('Failed to load holidays:', err);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Calendar Navigation
  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  // Open Add modal with preselected date
  const openAddModalForDate = (date: Date) => {
    if (!isAdmin) return;
    const formatted = format(date, 'yyyy-MM-dd');
    setFormData({
      title: '',
      description: '',
      start_date: formatted,
      end_date: formatted,
      type: 'GENERAL',
    });
    setFormErrors({});
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  // Open Edit modal
  const openEditModal = (holiday: Holiday, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAdmin) return;
    setFormData({
      id: holiday.id,
      title: holiday.title,
      description: holiday.description || '',
      start_date: format(new Date(holiday.start_date), 'yyyy-MM-dd'),
      end_date: format(new Date(holiday.end_date), 'yyyy-MM-dd'),
      type: holiday.type,
    });
    setFormErrors({});
    setFormMode('edit');
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  // Open Detail modal
  const openDetailModal = (holiday: Holiday, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedHoliday(holiday);
    setIsDetailModalOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.title.trim()) {
      errors.title = 'Holiday title is required';
    }
    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      errors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) > new Date(formData.end_date)) {
        errors.end_date = 'End date cannot be earlier than start date';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      if (formMode === 'create') {
        const payload: CreateHolidayData = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date).toISOString(),
          type: formData.type,
        };
        await holidayService.create(payload);
        toast.success('Holiday added successfully');
      } else if (formMode === 'edit' && formData.id) {
        const payload: UpdateHolidayData = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date).toISOString(),
          type: formData.type,
        };
        await holidayService.update(formData.id, payload);
        toast.success('Holiday updated successfully');
      }

      setIsFormModalOpen(false);
      fetchHolidays();
    } catch (err: any) {
      console.error('Failed to save holiday:', err);
      toast.error(err.response?.data?.message || 'Failed to save holiday');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!holidayToDelete) return;
    try {
      await holidayService.delete(holidayToDelete.id);
      toast.success('Holiday deleted successfully');
      setHolidayToDelete(null);
      setIsDetailModalOpen(false);
      fetchHolidays();
    } catch (err: any) {
      console.error('Failed to delete holiday:', err);
      toast.error(err.response?.data?.message || 'Failed to delete holiday');
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingHolidays = holidays.filter((h) => new Date(h.end_date) >= today);
    const thisMonthHolidays = holidays.filter((h) => {
      const s = new Date(h.start_date);
      const e = new Date(h.end_date);
      return (
        (s.getMonth() === currentDate.getMonth() && s.getFullYear() === currentDate.getFullYear()) ||
        (e.getMonth() === currentDate.getMonth() && e.getFullYear() === currentDate.getFullYear())
      );
    });

    const festivals = holidays.filter((h) => h.type === 'FESTIVAL' || h.type === 'NATIONAL');

    return {
      total: holidays.length,
      upcoming: upcomingHolidays.length,
      thisMonth: thisMonthHolidays.length,
      festivals: festivals.length,
    };
  }, [holidays, currentDate]);

  // Filtered list for Table view
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      const matchesSearch =
        !searchQuery.trim() ||
        h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType =
        selectedTypeFilter === 'ALL' || h.type === selectedTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [holidays, searchQuery, selectedTypeFilter]);

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Generate matrix of days
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [startDate, endDate]);

  // Helper to get holidays for a specific day
  const getHolidaysForDay = (day: Date) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return holidays.filter((h) => {
      const hStart = new Date(h.start_date);
      hStart.setHours(0, 0, 0, 0);
      const hEnd = new Date(h.end_date);
      hEnd.setHours(23, 59, 59, 999);
      return dayStart <= hEnd && dayEnd >= hStart;
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <UnifiedPageHeader
        title="Holiday Management"
        subtitle="Schedule and manage institution holidays, vacations, and academic breaks"
        icon={CalendarIcon}
        badge="Academic Calendar"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-saBlue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-saBlue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>

            {isAdmin && (
              <Button
                onClick={() => openAddModalForDate(new Date())}
                className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 px-4 font-bold text-xs uppercase tracking-wider gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Holiday</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-saBlue/10 text-saBlue flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Holidays</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <PartyPopper className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Festivals & National</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.festivals}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.upcoming}</p>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{format(currentDate, 'MMMM')} Holidays</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.thisMonth}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. CALENDAR VIEW                                                          */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
          {/* Calendar Header / Navigation Controls */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 via-white to-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToday}
                  className="h-8 px-3 rounded-xl text-xs font-bold text-slate-700 hover:text-saBlue hover:bg-saBlue/10"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>

            {/* Type Legend Pill Indicators */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              {(Object.keys(HOLIDAY_TYPE_CONFIG) as HolidayType[]).map((typeKey) => {
                const cfg = HOLIDAY_TYPE_CONFIG[typeKey];
                return (
                  <div key={typeKey} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600">
                    <span className={`w-2 h-2 rounded-full ${cfg.dotBg}`} />
                    <span>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-3 sm:p-6">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
                <div key={dayName} className={`py-2 ${idx === 0 || idx === 6 ? 'text-amber-500/80' : ''}`}>
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((day) => {
                const dayHolidays = getHolidaysForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      if (isAdmin && isCurrentMonth) {
                        openAddModalForDate(day);
                      }
                    }}
                    className={`min-h-[90px] sm:min-h-[120px] p-1.5 sm:p-2.5 rounded-2xl border transition-all flex flex-col justify-between group ${
                      !isCurrentMonth
                        ? 'bg-slate-50/40 border-slate-100 text-slate-300 opacity-60'
                        : isTodayDate
                        ? 'bg-blue-50/40 border-saBlue/40 shadow-xs'
                        : 'bg-white border-slate-100 hover:border-saBlue/30 hover:shadow-xs'
                    } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {/* Date Number & Quick Add Button */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                          isTodayDate
                            ? 'bg-saBlue text-white shadow-xs'
                            : isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-300'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>

                      {isAdmin && isCurrentMonth && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddModalForDate(day);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-saBlue hover:bg-saBlue/10 transition-all"
                          title="Add holiday on this date"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Holidays List in Date Cell */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayHolidays.slice(0, 2).map((h) => {
                        const cfg = HOLIDAY_TYPE_CONFIG[h.type] || HOLIDAY_TYPE_CONFIG.GENERAL;
                        const TypeIcon = cfg.icon;
                        const isMultiDay = !isSameDay(new Date(h.start_date), new Date(h.end_date));

                        return (
                          <div
                            key={h.id}
                            onClick={(e) => openDetailModal(h, e)}
                            className={`px-1.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold border truncate transition-all cursor-pointer hover:scale-[1.02] flex items-center gap-1 shadow-2xs ${cfg.bg} ${cfg.border}`}
                            title={`${h.title} (${cfg.label})`}
                          >
                            <TypeIcon className="w-3 h-3 shrink-0" />
                            <span className="truncate">{h.title}</span>
                          </div>
                        );
                      })}

                      {dayHolidays.length > 2 && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(dayHolidays[0]);
                          }}
                          className="text-[10px] font-bold text-slate-500 pl-1 cursor-pointer hover:text-saBlue"
                        >
                          +{dayHolidays.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Footer / Empty State placeholder */}
                    <div className="h-1" />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2. LIST VIEW                                                              */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
          {/* List View Controls Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search holidays..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-white border-slate-200 focus-visible:ring-saBlue"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="h-10 w-full sm:w-48 rounded-xl bg-white border-slate-200 text-xs font-bold">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">All Categories</SelectItem>
                  <SelectItem value="NATIONAL">National Holiday</SelectItem>
                  <SelectItem value="FESTIVAL">Festival</SelectItem>
                  <SelectItem value="ACADEMIC">Academic Break</SelectItem>
                  <SelectItem value="VACATION">Vacation</SelectItem>
                  <SelectItem value="GENERAL">General Holiday</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchHolidays}
                disabled={loading}
                className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Holiday</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Dates & Duration</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                        <CalendarIcon className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 text-base">No Holidays Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchQuery ? 'Try changing your search or filters.' : 'Click "Add Holiday" to schedule the first one.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((holiday) => {
                    const cfg = HOLIDAY_TYPE_CONFIG[holiday.type] || HOLIDAY_TYPE_CONFIG.GENERAL;
                    const TypeIcon = cfg.icon;
                    const sDate = new Date(holiday.start_date);
                    const eDate = new Date(holiday.end_date);
                    const isSingleDay = isSameDay(sDate, eDate);

                    return (
                      <tr
                        key={holiday.id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => openDetailModal(holiday)}
                      >
                        {/* Title */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border}`}>
                              <TypeIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 group-hover:text-saBlue transition-colors">
                                {holiday.title}
                              </p>
                              <p className="text-[11px] text-slate-400">Added by {holiday.creator?.name || 'Admin'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${cfg.bg} ${cfg.border}`}>
                            <TypeIcon className="w-3.5 h-3.5" />
                            <span>{cfg.label}</span>
                          </span>
                        </td>

                        {/* Dates */}
                        <td className="py-4 px-6">
                          <div className="text-xs text-slate-700 font-semibold">
                            {isSingleDay ? (
                              <span>{format(sDate, 'MMM d, yyyy (EEEE)')}</span>
                            ) : (
                              <span>
                                {format(sDate, 'MMM d')} – {format(eDate, 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-4 px-6 max-w-xs truncate text-xs text-slate-500">
                          {holiday.description || <span className="text-slate-300 italic">No notes</span>}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetailModal(holiday)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-saBlue hover:bg-saBlue/10"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => openEditModal(holiday, e)}
                                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                  title="Edit Holiday"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHolidayToDelete(holiday);
                                  }}
                                  className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  title="Delete Holiday"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 3. ADD / EDIT HOLIDAY MODAL                                               */}
      {/* ========================================================================= */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="rounded-3xl max-w-lg p-6 bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-saBlue" />
              {formMode === 'create' ? 'Add New Holiday' : 'Edit Holiday'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Declare an institution holiday or vacation break to notify students & faculty.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Holiday Title *</Label>
              <Input
                placeholder="e.g. Independence Day, Diwali Break, Summer Vacation"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 focus-visible:ring-saBlue"
              />
              {formErrors.title && <p className="text-xs font-bold text-red-500">{formErrors.title}</p>}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Category / Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val: HolidayType) => setFormData((p) => ({ ...p, type: val }))}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-bold">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="NATIONAL">National Holiday</SelectItem>
                  <SelectItem value="FESTIVAL">Festival</SelectItem>
                  <SelectItem value="ACADEMIC">Academic Break</SelectItem>
                  <SelectItem value="VACATION">Vacation / Summer Break</SelectItem>
                  <SelectItem value="GENERAL">General Holiday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setFormData((p) => ({
                      ...p,
                      start_date: newStart,
                      // If end date was before new start date, auto-sync it
                      end_date: p.end_date < newStart ? newStart : p.end_date,
                    }));
                  }}
                  className="h-10 rounded-xl border-slate-200 focus-visible:ring-saBlue text-xs font-medium"
                />
                {formErrors.start_date && <p className="text-xs font-bold text-red-500">{formErrors.start_date}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date}
                  onChange={(e) => setFormData((p) => ({ ...p, end_date: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200 focus-visible:ring-saBlue text-xs font-medium"
                />
                {formErrors.end_date && <p className="text-xs font-bold text-red-500">{formErrors.end_date}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Description / Note (Optional)</Label>
              <textarea
                placeholder="Details regarding holiday observances, celebrations, or campus closure..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-saBlue resize-none"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-xl border-slate-200 text-xs font-bold h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold h-10 px-5 shadow-sm"
              >
                {isSubmitting ? 'Saving...' : formMode === 'create' ? 'Add Holiday' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 4. HOLIDAY DETAILS MODAL                                                  */}
      {/* ========================================================================= */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="rounded-3xl max-w-md p-6 bg-white border-slate-200">
          {selectedHoliday && (() => {
            const cfg = HOLIDAY_TYPE_CONFIG[selectedHoliday.type] || HOLIDAY_TYPE_CONFIG.GENERAL;
            const TypeIcon = cfg.icon;
            const sDate = new Date(selectedHoliday.start_date);
            const eDate = new Date(selectedHoliday.end_date);
            const isSingleDay = isSameDay(sDate, eDate);

            return (
              <div className="space-y-4">
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${cfg.bg} ${cfg.border}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
                        {selectedHoliday.title}
                      </DialogTitle>
                      <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${cfg.bg} ${cfg.border}`}>
                        <TypeIcon className="w-3 h-3" />
                        <span>{cfg.label}</span>
                      </span>
                    </div>
                  </div>
                </DialogHeader>

                {/* Info Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400 font-bold">Dates:</span>
                    <span className="font-bold text-slate-800 text-right">
                      {isSingleDay
                        ? format(sDate, 'MMMM d, yyyy (EEEE)')
                        : `${format(sDate, 'MMM d, yyyy')} – ${format(eDate, 'MMM d, yyyy')}`}
                    </span>
                  </div>

                  {selectedHoliday.description && (
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-400 font-bold block mb-1">Details:</span>
                      <p className="text-slate-700 leading-relaxed">{selectedHoliday.description}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Added by: {selectedHoliday.creator?.name || 'Administrator'}</span>
                    <span>{format(new Date(selectedHoliday.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                  {isAdmin && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openEditModal(selectedHoliday)}
                        className="rounded-xl border-slate-200 text-xs font-bold h-10 px-4 gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setHolidayToDelete(selectedHoliday);
                          setIsDetailModalOpen(false);
                        }}
                        className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold h-10 px-4 gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </Button>
                    </>
                  )}

                  <Button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold h-10 px-5 ml-auto"
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 5. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <DeleteConfirmationModal
        open={Boolean(holidayToDelete)}
        onClose={() => setHolidayToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Holiday"
        message={`Are you sure you want to remove "${holidayToDelete?.title}" from the institution calendar?`}
      />
    </div>
  );
}
