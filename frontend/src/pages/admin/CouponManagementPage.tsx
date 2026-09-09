import { useEffect, useMemo, useState, useCallback } from 'react';
import { couponService, subjectService, testSeriesService, activityGroupService } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Tag,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Trophy,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Percent,
  IndianRupee,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Coupon, CouponStats } from '@/types';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';

interface CouponFormData {
  code: string;
  discount_type: 'PERCENTAGE' | 'FLAT';
  discount_value: string;
  min_order_amount: string;
  applicable_to: 'ALL' | 'COURSE' | 'TEST_SERIES' | 'ACTIVITY_GROUP' | 'CUSTOM';
  applicable_course_ids: number[];
  applicable_test_series_ids: number[];
  applicable_activity_ids: number[];
  max_discount_amount: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  max_uses: string;
}

const initialFormData: CouponFormData = {
  code: '',
  discount_type: 'PERCENTAGE',
  discount_value: '',
  min_order_amount: '',
  applicable_to: 'ALL',
  applicable_course_ids: [],
  applicable_test_series_ids: [],
  applicable_activity_ids: [],
  max_discount_amount: '',
  is_active: true,
  valid_from: '',
  valid_until: '',
  max_uses: '',
};

const toDatetimeLocal = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) => (value ? new Date(value).toISOString() : null);

export default function CouponManagementPage() {
  usePageTitle('Coupons');

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats>({
    totalCount: 0,
    totalActive: 0,
    totalExpired: 0,
    totalUses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search, Filter & Pagination state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  // Catalog items for scope selection
  const [courses, setCourses] = useState<any[]>([]);
  const [testSeriesList, setTestSeriesList] = useState<any[]>([]);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);

  // Load catalog options once
  useEffect(() => {
    Promise.all([
      subjectService.getAll({ limit: 500 }).catch(() => ({ data: { data: [] } })),
      testSeriesService.getAll({ limit: 500 }).catch(() => ({ data: { data: [] } })),
      activityGroupService.getAll({ limit: 500 }).catch(() => ({ data: { activityGroups: [] } })),
    ]).then(([subRes, tsRes, agRes]) => {
      setCourses((subRes as any)?.data?.data || (subRes as any)?.data || []);
      setTestSeriesList((tsRes as any)?.data?.data || (tsRes as any)?.data || []);
      setActivityGroups((agRes as any)?.data?.activityGroups || (agRes as any)?.data?.data || []);
    });
  }, []);

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (discountTypeFilter !== 'ALL') params.discount_type = discountTypeFilter;
      if (scopeFilter !== 'ALL') params.applicable_to = scopeFilter;

      const res = await couponService.getAll(params);
      setCoupons(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalRecords(res.pagination.total || 0);
      }
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, discountTypeFilter, scopeFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, discountTypeFilter, scopeFilter, sortBy, sortOrder]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setModalOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      min_order_amount: coupon.min_order_amount !== null && coupon.min_order_amount !== undefined ? String(coupon.min_order_amount) : '',
      applicable_to: (coupon.applicable_to as any) || 'ALL',
      applicable_course_ids: Array.isArray(coupon.applicable_course_ids) ? coupon.applicable_course_ids : [],
      applicable_test_series_ids: Array.isArray(coupon.applicable_test_series_ids) ? coupon.applicable_test_series_ids : [],
      applicable_activity_ids: Array.isArray(coupon.applicable_activity_ids) ? coupon.applicable_activity_ids : [],
      max_discount_amount: coupon.max_discount_amount !== null && coupon.max_discount_amount !== undefined ? String(coupon.max_discount_amount) : '',
      is_active: coupon.is_active,
      valid_from: toDatetimeLocal(coupon.valid_from),
      valid_until: toDatetimeLocal(coupon.valid_until),
      max_uses: coupon.max_uses !== null ? String(coupon.max_uses) : '',
    });
    setModalOpen(true);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'SAVE';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    const parsedDiscount = Number(formData.discount_value);
    if (Number.isNaN(parsedDiscount) || parsedDiscount <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    if (formData.discount_type === 'PERCENTAGE' && parsedDiscount > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }

    if (formData.valid_from && formData.valid_until && new Date(formData.valid_from) > new Date(formData.valid_until)) {
      toast.error('Valid until must be after valid from');
      return;
    }

    const parsedMaxUses = formData.max_uses ? Number(formData.max_uses) : null;
    if (parsedMaxUses !== null && (Number.isNaN(parsedMaxUses) || parsedMaxUses <= 0)) {
      toast.error('Max uses must be greater than 0');
      return;
    }

    const parsedMinOrder = formData.min_order_amount ? Number(formData.min_order_amount) : null;
    if (parsedMinOrder !== null && (Number.isNaN(parsedMinOrder) || parsedMinOrder < 0)) {
      toast.error('Minimum order threshold must be 0 or greater');
      return;
    }

    const parsedMaxDiscount = formData.max_discount_amount ? Number(formData.max_discount_amount) : null;

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: parsedDiscount,
      min_order_amount: parsedMinOrder,
      applicable_to: formData.applicable_to,
      applicable_course_ids: formData.applicable_course_ids,
      applicable_test_series_ids: formData.applicable_test_series_ids,
      applicable_activity_ids: formData.applicable_activity_ids,
      max_discount_amount: parsedMaxDiscount,
      is_active: formData.is_active,
      valid_from: toIsoOrNull(formData.valid_from),
      valid_until: toIsoOrNull(formData.valid_until),
      max_uses: parsedMaxUses,
    };

    setSaving(true);
    try {
      if (editingId) {
        await couponService.update(editingId, payload);
        toast.success('Coupon updated successfully');
      } else {
        await couponService.create(payload);
        toast.success('Coupon created successfully');
      }
      setModalOpen(false);
      loadCoupons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await couponService.update(coupon.id, { is_active: !coupon.is_active });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      );
      toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update coupon status');
    }
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    try {
      await couponService.delete(couponToDelete.id);
      toast.success('Coupon deleted successfully');
      setDeleteModalOpen(false);
      setCouponToDelete(null);
      loadCoupons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete coupon');
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code ${code} copied to clipboard`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* ─── PAGE HEADER BANNER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-saBlue/10 text-saBlue rounded-2xl flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Coupons & Discounts
              </h1>
              <Badge className="bg-saBlue/10 text-saBlue font-bold text-xs border border-saBlue/20 rounded-full px-2.5 py-0.5">
                {stats.totalCount}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Create promotional discount vouchers, thresholds, and applicability rules
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCoupons}
            className="rounded-xl border-slate-200 h-10 px-3 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-saBlue hover:bg-saBlueDarkHover text-white font-bold rounded-xl h-10 px-4 shadow-md shadow-saBlue/15 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Create Coupon
          </Button>
        </div>
      </div>

      {/* ─── KPI STATS CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Coupons</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.totalCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue shrink-0">
              <Tag className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">All configured vouchers</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Active Coupons</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">{stats.totalActive}</h3>
            </div>
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Live & redeemable</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Redemptions</p>
              <h3 className="text-xl sm:text-2xl font-black text-saBlue mt-1">{stats.totalUses}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-saBlue shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Total times redeemed</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Expired / Past</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{stats.totalExpired}</h3>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Past validity date</p>
        </Card>
      </div>

      {/* ─── SEARCH & FILTER TOOLBAR ───────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by coupon code..."
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-full sm:w-[140px] bg-slate-50/50">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            {/* Discount Type */}
            <Select value={discountTypeFilter} onValueChange={setDiscountTypeFilter}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-full sm:w-[150px] bg-slate-50/50">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                <SelectItem value="FLAT">Flat Amount (₹)</SelectItem>
              </SelectContent>
            </Select>

            {/* Scope Filter */}
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-full sm:w-[150px] bg-slate-50/50">
                <SelectValue placeholder="All Scopes" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="ALL">All Offerings</SelectItem>
                <SelectItem value="COURSE">Courses / Subjects</SelectItem>
                <SelectItem value="TEST_SERIES">Test Series</SelectItem>
                <SelectItem value="ACTIVITY_GROUP">Activity Groups</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Select */}
            <Select
              value={`${sortBy}_${sortOrder}`}
              onValueChange={(val) => {
                const [sb, so] = val.split('_');
                setSortBy(sb);
                setSortOrder(so as any);
              }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-full sm:w-[160px] bg-slate-50/50">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-400" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="rounded-xl text-xs">
                <SelectItem value="created_at_desc">Newest First</SelectItem>
                <SelectItem value="created_at_asc">Oldest First</SelectItem>
                <SelectItem value="code_asc">Code (A - Z)</SelectItem>
                <SelectItem value="discount_value_desc">Highest Discount</SelectItem>
                <SelectItem value="used_count_desc">Most Used</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── COUPONS TABLE ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-saBlue mb-2" />
            <p className="text-xs font-medium text-slate-400">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Tag className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No coupons found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create your first promotional discount coupon or adjust your filters.
            </p>
            <Button
              onClick={handleOpenCreate}
              className="mt-4 bg-saBlue hover:bg-saBlueDarkHover text-white font-bold rounded-xl text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Create Coupon
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Code</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Discount</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Min Order Threshold</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Applicability Scope</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5 text-center">Usage</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Validity</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5 text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {coupons.map((coupon) => {
                  const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();

                  return (
                    <TableRow key={coupon.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Code */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => copyCodeToClipboard(coupon.code)}
                            className="font-mono font-black text-sm text-slate-900 bg-slate-100 hover:bg-saBlue/10 hover:text-saBlue transition-colors px-2.5 py-1 rounded-lg border border-slate-200 cursor-pointer flex items-center gap-1.5"
                            title="Click to copy code"
                          >
                            {coupon.code}
                            <Copy className="w-3 h-3 opacity-50" />
                          </span>
                        </div>
                      </TableCell>

                      {/* Discount Value */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-1 font-bold text-xs">
                          {coupon.discount_type === 'PERCENTAGE' ? (
                            <Badge className="bg-blue-50 text-saBlue border-blue-200 font-extrabold px-2 py-0.5">
                              <Percent className="w-3 h-3 mr-0.5" />
                              {coupon.discount_value}% OFF
                              {coupon.max_discount_amount ? ` (Up to ₹${coupon.max_discount_amount})` : ''}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold px-2 py-0.5">
                              Flat ₹{coupon.discount_value} OFF
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Min Order Threshold */}
                      <TableCell className="py-3.5 text-xs font-semibold text-slate-700">
                        {coupon.min_order_amount !== null && coupon.min_order_amount !== undefined && coupon.min_order_amount > 0 ? (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                            Min ₹{coupon.min_order_amount}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">No minimum</span>
                        )}
                      </TableCell>

                      {/* Scope */}
                      <TableCell className="py-3.5">
                        {coupon.applicable_to === 'ALL' || !coupon.applicable_to ? (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] font-semibold">
                            All Offerings
                          </Badge>
                        ) : coupon.applicable_to === 'COURSE' ? (
                          <Badge variant="outline" className="bg-blue-50 text-saBlue border-blue-200 text-[11px] font-semibold flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Courses Only
                          </Badge>
                        ) : coupon.applicable_to === 'TEST_SERIES' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-semibold flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Test Series
                          </Badge>
                        ) : coupon.applicable_to === 'ACTIVITY_GROUP' ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] font-semibold flex items-center gap-1">
                            <Gamepad2 className="w-3 h-3" /> Activity Groups
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px]">
                            Custom
                          </Badge>
                        )}
                      </TableCell>

                      {/* Usage */}
                      <TableCell className="py-3.5 text-center">
                        <span className="font-bold text-xs text-slate-800">
                          {coupon.used_count}
                          <span className="text-slate-400 font-normal"> / {coupon.max_uses ?? '∞'}</span>
                        </span>
                      </TableCell>

                      {/* Validity Dates */}
                      <TableCell className="py-3.5 text-xs text-slate-600">
                        {coupon.valid_until ? (
                          <div className="space-y-0.5">
                            <span className="block font-medium">
                              Until {new Date(coupon.valid_until).toLocaleDateString()}
                            </span>
                            {isExpired && (
                              <span className="text-[10px] text-red-500 font-bold uppercase">Expired</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">No expiration</span>
                        )}
                      </TableCell>

                      {/* Status Toggle */}
                      <TableCell className="py-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={() => handleToggleActive(coupon)}
                            className="data-[state=checked]:bg-emerald-600"
                          />
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(coupon)}
                            className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-saBlue hover:bg-blue-50"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCouponToDelete(coupon);
                              setDeleteModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50"
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
        )}

        {/* ─── PAGINATION BAR ────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-700">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-slate-700">{Math.min(page * limit, totalRecords)}</span> of{' '}
              <span className="font-bold text-slate-700">{totalRecords}</span> coupons
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;

                  return (
                    <div key={p} className="flex items-center">
                      {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                      <button
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          page === p
                            ? 'bg-saBlue text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}

              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── CREATE / EDIT COUPON MODAL ──────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-saBlue" />
              {editingId ? 'Edit Discount Coupon' : 'Create New Coupon'}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Configure discount rules, order amount thresholds, item applicability, and validity periods.
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Row 1: Code & Generate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code" className="text-xs font-bold text-slate-700">
                  Coupon Code <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon-code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. DIWALI50"
                    className="font-mono font-bold uppercase rounded-xl border-slate-200 h-10 text-xs sm:text-sm"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomCode}
                    className="rounded-xl text-xs shrink-0 h-10 px-3 font-semibold"
                  >
                    Generate
                  </Button>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <div className="flex items-center justify-between h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-medium text-slate-700">
                    {formData.is_active ? 'Active & Usable' : 'Inactive'}
                  </span>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Discount Type & Value */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(val: any) => setFormData({ ...formData, discount_type: val })}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 h-10 text-xs font-semibold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="PERCENTAGE">Percentage (%) Discount</SelectItem>
                    <SelectItem value="FLAT">Flat Amount (₹) Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="discount-val" className="text-xs font-bold text-slate-700">
                  Discount Value ({formData.discount_type === 'PERCENTAGE' ? '%' : '₹'}) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="discount-val"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'PERCENTAGE' ? 'e.g. 20 (for 20%)' : 'e.g. 500 (for ₹500)'}
                  className="rounded-xl border-slate-200 h-10 text-xs sm:text-sm bg-white font-bold"
                  required
                />
              </div>
            </div>

            {/* Row 3: Minimum Order Amount & Cap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="min-order" className="text-xs font-bold text-slate-700">
                  Minimum Order Amount (₹ Threshold)
                </Label>
                <Input
                  id="min-order"
                  type="number"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="e.g. 1000 (valid only if cart >= 1000)"
                  className="rounded-xl border-slate-200 h-10 text-xs sm:text-sm"
                />
                <p className="text-[10px] text-slate-400">Coupon cannot be applied if total is below this amount.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-discount" className="text-xs font-bold text-slate-700">
                  Maximum Discount Cap (₹)
                </Label>
                <Input
                  id="max-discount"
                  type="number"
                  min="0"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                  placeholder="e.g. 2000 (max discount cap)"
                  className="rounded-xl border-slate-200 h-10 text-xs sm:text-sm"
                  disabled={formData.discount_type === 'FLAT'}
                />
                <p className="text-[10px] text-slate-400">Caps the maximum deduction for percentage discounts.</p>
              </div>
            </div>

            {/* Row 4: Applicability Scope */}
            <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-saBlue" /> Applicable Offerings
              </Label>
              <Select
                value={formData.applicable_to}
                onValueChange={(val: any) => setFormData({ ...formData, applicable_to: val })}
              >
                <SelectTrigger className="rounded-xl border-slate-200 h-10 text-xs font-semibold bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="ALL">Apply to All (Courses, Test Series & Activity Groups)</SelectItem>
                  <SelectItem value="COURSE">Courses & Subjects Only</SelectItem>
                  <SelectItem value="TEST_SERIES">Test Series Only</SelectItem>
                  <SelectItem value="ACTIVITY_GROUP">Activity Groups Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Row 5: Validity Dates & Max Uses */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="valid-from" className="text-xs font-bold text-slate-700">
                  Valid From (Optional)
                </Label>
                <Input
                  id="valid-from"
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="rounded-xl border-slate-200 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="valid-until" className="text-xs font-bold text-slate-700">
                  Valid Until (Optional)
                </Label>
                <Input
                  id="valid-until"
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="rounded-xl border-slate-200 h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max-uses" className="text-xs font-bold text-slate-700">
                  Total Max Uses (Optional)
                </Label>
                <Input
                  id="max-uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="e.g. 100"
                  className="rounded-xl border-slate-200 h-10 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs font-semibold"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-saBlue hover:bg-saBlueDarkHover text-white font-bold rounded-xl text-xs shadow-md shadow-saBlue/15"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : editingId ? (
                  'Update Coupon'
                ) : (
                  'Create Coupon'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION MODAL ────────────────────────────────── */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title="Delete Coupon"
        message={
          couponToDelete ? (
            <span className="text-sm text-slate-600">
              Are you sure you want to delete the coupon{' '}
              <strong className="text-slate-900">{couponToDelete.code}</strong>? Students will no longer be able to
              redeem this discount.
            </span>
          ) : undefined
        }
        footer={
          <div className="flex items-center justify-end gap-2 mt-4 w-full">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl text-xs font-semibold"
            >
              Delete Coupon
            </Button>
          </div>
        }
      />
    </div>
  );
}
