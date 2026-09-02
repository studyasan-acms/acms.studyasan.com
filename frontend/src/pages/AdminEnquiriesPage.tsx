import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { enquiryService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Trash2,
  Filter,
  Eye,
  Search,
  HelpCircle,
  Clock,
  Phone,
  Mail,
  Tag,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X,
  BookOpen,
  Sparkles,
  Layers,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const typeLabels: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  COURSE: { label: 'Course', icon: BookOpen },
  SUBJECT: { label: 'Subject', icon: Layers },
  ACTIVITY_GROUP: { label: 'Activity Group', icon: Sparkles },
  TEST_SERIES: { label: 'Test Series', icon: Tag },
};

const statusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'RESOLVED', label: 'Resolved' },
];

export default function AdminEnquiriesPage() {
  usePageTitle('Enquiries');
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('date_desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState<any>(null);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [enquiryToDelete, setEnquiryToDelete] = useState<any | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);

  const fetchEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 1000 };
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterType !== 'ALL') params.item_type = filterType;

      const response = await enquiryService.getAll(params);
      setEnquiries(response.data || []);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching enquiries:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await enquiryService.updateStatus(id, status as any);
      setEnquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
      if (selectedEnquiry && selectedEnquiry.id === id) {
        setSelectedEnquiry((prev: any) => ({ ...prev, status }));
      }
      toast.success(`Enquiry marked as ${status.toLowerCase()}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDeleteClick = (enquiry: any) => {
    setEnquiryToDelete(enquiry);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!enquiryToDelete) return;
    try {
      await enquiryService.delete(enquiryToDelete.id);
      setEnquiries((prev) => prev.filter((item) => item.id !== enquiryToDelete.id));
      setDeleteModalOpen(false);
      setEnquiryToDelete(null);
      toast.success('Enquiry deleted successfully');
    } catch (error: any) {
      console.error('Error deleting enquiry:', error);
      toast.error(error.response?.data?.error || 'Failed to delete enquiry');
    }
  };

  // Processed (searched, filtered, sorted) enquiries
  const processedEnquiries = useMemo(() => {
    let result = enquiries.filter((e) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        e.student_name?.toLowerCase().includes(q) ||
        e.student_email?.toLowerCase().includes(q) ||
        e.student_phone?.toLowerCase().includes(q) ||
        e.item_name?.toLowerCase().includes(q) ||
        e.message?.toLowerCase().includes(q) ||
        e.coupon_code?.toLowerCase().includes(q);

      const matchesStatus = filterStatus === 'ALL' || e.status === filterStatus;
      const matchesType = filterType === 'ALL' || e.item_type === filterType;

      return matchesSearch && matchesStatus && matchesType;
    });

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOption === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOption === 'name_asc') {
        return (a.student_name || '').localeCompare(b.student_name || '');
      }
      if (sortOption === 'name_desc') {
        return (b.student_name || '').localeCompare(a.student_name || '');
      }
      return 0;
    });

    return result;
  }, [enquiries, searchTerm, filterStatus, filterType, sortOption]);

  // Counts for KPI & status tabs
  const counts = useMemo(() => {
    return {
      total: enquiries.length,
      pending: enquiries.filter((e) => e.status === 'PENDING').length,
      contacted: enquiries.filter((e) => e.status === 'CONTACTED').length,
      resolved: enquiries.filter((e) => e.status === 'RESOLVED').length,
    };
  }, [enquiries]);

  // Pagination slice
  const totalPages = Math.ceil(processedEnquiries.length / itemsPerPage) || 1;
  const paginatedEnquiries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedEnquiries.slice(start, start + itemsPerPage);
  }, [processedEnquiries, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType, sortOption, itemsPerPage]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const relative = formatDistanceToNow(date, { addSuffix: true });
      const full = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      return { relative, full };
    } catch {
      return { relative: '', full: dateStr };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-bold">
            Pending
          </Badge>
        );
      case 'CONTACTED':
        return (
          <Badge variant="outline" className="bg-blue-50 text-saBlue border-blue-200 text-[11px] font-bold">
            Contacted
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-bold">
            Resolved
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-saBlue/10 text-saBlue rounded-2xl flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Enquiries
              </h1>
              <Badge className="bg-saBlue/10 text-saBlue font-bold text-xs border border-saBlue/20 rounded-full px-2 py-0.5">
                {enquiries.length}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage student enquiries for courses, subjects, activities, and test series
            </p>
          </div>
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Enquiries</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{counts.total}</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue shrink-0">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">All incoming queries</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{counts.pending}</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">Awaiting follow up</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contacted</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{counts.contacted}</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-50 rounded-xl flex items-center justify-center text-saBlue shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">In active discussion</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{counts.resolved}</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">Successfully closed</p>
        </Card>
      </div>

      {/* SEARCH, SORT & FILTERS TOOLBAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search enquiries by student, email, phone, item or coupon..."
              className="pl-10 pr-9 h-10 sm:h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm focus-visible:ring-saBlue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Controls: Type, Sort & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
            {/* Item Type Select */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-full sm:w-[150px] bg-slate-50/50">
                <div className="flex items-center gap-1.5 truncate">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="All Types" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="COURSE">Courses</SelectItem>
                <SelectItem value="SUBJECT">Subjects</SelectItem>
                <SelectItem value="ACTIVITY_GROUP">Activity Groups</SelectItem>
                <SelectItem value="TEST_SERIES">Test Series</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Select */}
            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-full sm:w-[150px] bg-slate-50/50">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Sort By" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="date_desc">Newest First</SelectItem>
                <SelectItem value="date_asc">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A - Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z - A)</SelectItem>
              </SelectContent>
            </Select>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                  viewMode === 'table'
                    ? 'bg-white text-saBlue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                  viewMode === 'cards'
                    ? 'bg-white text-saBlue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none select-none">
          {statusOptions.map((st) => {
            const isSelected = filterStatus === st.value;
            const count =
              st.value === 'ALL'
                ? counts.total
                : st.value === 'PENDING'
                ? counts.pending
                : st.value === 'CONTACTED'
                ? counts.contacted
                : counts.resolved;

            return (
              <button
                key={st.value}
                onClick={() => setFilterStatus(st.value)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border',
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                <span>{st.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT DISPLAY */}
      {loading && enquiries.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading enquiries...
          </p>
        </div>
      ) : processedEnquiries.length === 0 ? (
        <Card className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-700">No enquiries found</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
            {searchTerm || filterStatus !== 'ALL' || filterType !== 'ALL'
              ? 'No student enquiries match your search or filter criteria.'
              : 'There are no student enquiries recorded yet.'}
          </p>
          {(searchTerm || filterStatus !== 'ALL' || filterType !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl text-xs font-semibold"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('ALL');
                setFilterType('ALL');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : viewMode === 'table' ? (
        /* TABULAR COMPACT FORMAT */
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  <TableHead className="w-[200px] font-bold text-xs uppercase tracking-wider text-slate-700 pl-4 sm:pl-6">
                    Student
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[170px] hidden sm:table-cell">
                    Contact Details
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[160px]">
                    Interested Item
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[140px] hidden md:table-cell">
                    Message
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 hidden lg:table-cell">
                    Coupon
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[130px]">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 hidden xl:table-cell">
                    Date
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-700 pr-4 sm:pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEnquiries.map((enquiry) => {
                  const typeInfo = typeLabels[enquiry.item_type] || { label: enquiry.item_type || 'General', icon: HelpCircle };
                  const TypeIcon = typeInfo.icon;
                  const dates = formatDate(enquiry.created_at);

                  return (
                    <TableRow
                      key={enquiry.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 cursor-pointer"
                      onClick={() => setSelectedEnquiry(enquiry)}
                    >
                      {/* Student Name */}
                      <TableCell className="pl-4 sm:pl-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs shrink-0">
                            {(enquiry.student_name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                              {enquiry.student_name || 'Anonymous Student'}
                            </p>
                            <p className="text-[11px] text-slate-400 sm:hidden truncate max-w-[140px]">
                              {enquiry.student_phone || enquiry.student_email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="hidden sm:table-cell py-3.5">
                        <div className="text-xs space-y-0.5">
                          <div className="text-slate-700 font-medium flex items-center gap-1.5 truncate max-w-[180px]">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{enquiry.student_email || '-'}</span>
                          </div>
                          <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{enquiry.student_phone || '-'}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Item & Type */}
                      <TableCell className="py-3.5">
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                            {enquiry.item_name || 'General Query'}
                          </p>
                          <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-saBlue bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 mt-1">
                            <TypeIcon className="w-3 h-3" />
                            <span>{typeInfo.label}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Message Preview */}
                      <TableCell className="hidden md:table-cell py-3.5">
                        <div className="max-w-[180px] text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {enquiry.message || <span className="text-slate-400 italic">No message text</span>}
                        </div>
                      </TableCell>

                      {/* Coupon */}
                      <TableCell className="hidden lg:table-cell py-3.5">
                        {enquiry.coupon_code ? (
                          <div className="inline-flex flex-col text-[11px]">
                            <span className="font-bold text-slate-800 font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 w-fit">
                              {enquiry.coupon_code}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {enquiry.discount_type === 'PERCENTAGE'
                                ? `${enquiry.discount_value}% Off`
                                : `Flat ₹${enquiry.discount_value}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </TableCell>

                      {/* Status Dropdown */}
                      <TableCell className="py-3.5" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={enquiry.status}
                          onValueChange={(val) => handleStatusChange(enquiry.id, val)}
                        >
                          <SelectTrigger className="h-8 w-[115px] rounded-lg border-slate-200 text-xs font-semibold bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl text-xs">
                            <SelectItem value="PENDING">
                              <span className="text-amber-700 font-bold">Pending</span>
                            </SelectItem>
                            <SelectItem value="CONTACTED">
                              <span className="text-saBlue font-bold">Contacted</span>
                            </SelectItem>
                            <SelectItem value="RESOLVED">
                              <span className="text-emerald-700 font-bold">Resolved</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="hidden xl:table-cell py-3.5 text-xs text-slate-500">
                        <div>
                          <p className="font-medium text-slate-700">{dates.full}</p>
                          <p className="text-[10px] text-slate-400">{dates.relative}</p>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4 sm:pr-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedEnquiry(enquiry)}
                            className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-xl"
                            title="View enquiry details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(enquiry)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                            title="Delete enquiry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {paginatedEnquiries.map((enquiry) => {
            const typeInfo = typeLabels[enquiry.item_type] || { label: enquiry.item_type || 'General', icon: HelpCircle };
            const TypeIcon = typeInfo.icon;
            const dates = formatDate(enquiry.created_at);

            return (
              <Card
                key={enquiry.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div className="p-4 space-y-3">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs shrink-0">
                        {(enquiry.student_name || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-snug">
                          {enquiry.student_name || 'Anonymous Student'}
                        </h3>
                        <p className="text-[11px] text-slate-400">{dates.full}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedEnquiry(enquiry)}
                        className="h-7 w-7 text-slate-400 hover:text-saBlue rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(enquiry)}
                        className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Interested Item */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Interested In</p>
                      <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{enquiry.item_name}</p>
                    </div>
                    <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-saBlue bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 shrink-0">
                      <TypeIcon className="w-3 h-3" />
                      <span>{typeInfo.label}</span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-slate-600">
                    {enquiry.student_email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{enquiry.student_email}</span>
                      </div>
                    )}
                    {enquiry.student_phone && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{enquiry.student_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Message Snippet */}
                  {enquiry.message && (
                    <div className="p-2.5 rounded-xl bg-slate-50/50 border border-slate-100 text-xs text-slate-600 line-clamp-2 italic">
                      "{enquiry.message}"
                    </div>
                  )}
                </div>

                {/* Footer Status Controls */}
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">Status:</span>
                  <Select
                    value={enquiry.status}
                    onValueChange={(val) => handleStatusChange(enquiry.id, val)}
                  >
                    <SelectTrigger className="h-8 w-[120px] rounded-lg border-slate-200 text-xs font-semibold bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs">
                      <SelectItem value="PENDING">
                        <span className="text-amber-700 font-bold">Pending</span>
                      </SelectItem>
                      <SelectItem value="CONTACTED">
                        <span className="text-saBlue font-bold">Contacted</span>
                      </SelectItem>
                      <SelectItem value="RESOLVED">
                        <span className="text-emerald-700 font-bold">Resolved</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* PAGINATION TOOLBAR */}
      {processedEnquiries.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {(currentPage - 1) * itemsPerPage + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(currentPage * itemsPerPage, processedEnquiries.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{processedEnquiries.length}</strong>{' '}
              enquiries
            </span>

            <span className="hidden sm:inline text-slate-300">|</span>

            {/* Per page select */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 font-semibold text-slate-700 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (totalPages <= 5) return true;
                return Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && page - prev > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                        currentPage === page
                          ? 'bg-saBlue text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 rounded-lg text-xs font-semibold"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* FULL ENQUIRY DETAILS DIALOG */}
      {selectedEnquiry && (
        <Dialog open={!!selectedEnquiry} onOpenChange={() => setSelectedEnquiry(null)}>
          <DialogContent className="w-[96vw] sm:max-w-xl max-h-[90vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-slate-200">
            <DialogHeader className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between mb-1">
                {getStatusBadge(selectedEnquiry.status)}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(selectedEnquiry.created_at).full}
                </span>
              </div>
              <DialogTitle className="text-base sm:text-xl font-bold text-slate-900">
                Enquiry from {selectedEnquiry.student_name}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Student & Contact Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Student Name</span>
                  <span className="font-semibold text-slate-900">{selectedEnquiry.student_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Email</span>
                  {selectedEnquiry.student_email ? (
                    <a
                      href={`mailto:${selectedEnquiry.student_email}`}
                      className="text-saBlue hover:underline font-medium"
                    >
                      {selectedEnquiry.student_email}
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Phone</span>
                  {selectedEnquiry.student_phone ? (
                    <a
                      href={`tel:${selectedEnquiry.student_phone}`}
                      className="text-saBlue hover:underline font-mono font-medium"
                    >
                      {selectedEnquiry.student_phone}
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>
              </div>

              {/* Interested Item Details */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Interested Item</span>
                  <span className="font-bold text-slate-900">{selectedEnquiry.item_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Item Type</span>
                  <Badge variant="outline" className="bg-blue-50 text-saBlue border-blue-200 text-[10px]">
                    {typeLabels[selectedEnquiry.item_type]?.label || selectedEnquiry.item_type}
                  </Badge>
                </div>
                {selectedEnquiry.coupon_code && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="font-bold text-slate-700">Applied Coupon</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                      {selectedEnquiry.coupon_code} (
                      {selectedEnquiry.discount_type === 'PERCENTAGE'
                        ? `${selectedEnquiry.discount_value}%`
                        : `Flat ₹${selectedEnquiry.discount_value}`}
                      )
                    </span>
                  </div>
                )}
              </div>

              {/* Message */}
              <div>
                <span className="block font-bold text-xs uppercase tracking-wider text-slate-700 mb-1.5">
                  Message / Query:
                </span>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 whitespace-pre-wrap leading-relaxed text-slate-700 min-h-[80px]">
                  {selectedEnquiry.message || <span className="text-slate-400 italic">No message provided.</span>}
                </div>
              </div>

              {/* Update Status Inline */}
              <div className="pt-2 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">Update Status:</span>
                <Select
                  value={selectedEnquiry.status}
                  onValueChange={(val) => handleStatusChange(selectedEnquiry.id, val)}
                >
                  <SelectTrigger className="h-9 w-[140px] rounded-xl border-slate-200 text-xs font-semibold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="PENDING">
                      <span className="text-amber-700 font-bold">Pending</span>
                    </SelectItem>
                    <SelectItem value="CONTACTED">
                      <span className="text-saBlue font-bold">Contacted</span>
                    </SelectItem>
                    <SelectItem value="RESOLVED">
                      <span className="text-emerald-700 font-bold">Resolved</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEnquiry(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title="Delete Student Enquiry"
        message={
          enquiryToDelete ? (
            <span className="text-sm text-slate-600">
              Are you sure you want to delete the enquiry from{' '}
              <strong className="text-slate-900">{enquiryToDelete.student_name}</strong> for{' '}
              <strong>{enquiryToDelete.item_name}</strong>?
            </span>
          ) : undefined
        }
        footer={
          <div className="flex flex-row items-center justify-end gap-2 mt-4 w-full">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1 sm:flex-none rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 rounded-xl text-xs font-semibold"
            >
              Delete
            </Button>
          </div>
        }
      />
    </div>
  );
}
