import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  FolderOpen,
  Users,
  UserCheck,
  Search,
  MoreVertical,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
  Eye,
  IndianRupee,
  ImagePlus,
  X,
  Upload,
  ArrowUpDown,
  LayoutGrid,
  List,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { resolveImageUrl } from '@/lib/utils';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { activityGroupAPI } from '@/services/activity.service';
import { currencyService, uploadService } from '@/services/api';
import type { ActivityGroup, CreateActivityGroupInput } from '@/types/activity';
import type { Currency } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import { usePageTitle } from '@/hooks/usePageTitle';
import ConfirmModal from '@/components/ui/confirmationModal';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import EnrollStudentsToGroupModal from '@/components/activities/admin/EnrollStudentsToGroupModal';
import AssignTeachersToGroupModal from '@/components/activities/admin/AssignTeachersToGroupModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function ActivityGroupsPage() {
  usePageTitle("Activity Groups");
  const { user } = useAuthStore();
  const { hasPermission } = usePermissions();
  const isAdmin = user?.role === 'ADMIN';

  // Permission guards for action buttons
  const canCreate = isAdmin || hasPermission('activityGroups', 'create');
  const canUpdate = isAdmin || hasPermission('activityGroups', 'update');
  const canDelete = isAdmin || hasPermission('activityGroups', 'delete');

  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [sortOption, setSortOption] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'newest' | 'oldest'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const limit = 12;

  // Form modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ActivityGroup | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [formData, setFormData] = useState<CreateActivityGroupInput>({
    name: '',
    description: '',
    cover_image: '',
    price: null,
    actual_price: null,
    currency_id: null,
  });

  // Delete modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingName, setDeletingName] = useState('');

  // Success / Error modals
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Enroll / Teacher modals
  const [enrollingGroup, setEnrollingGroup] = useState<ActivityGroup | null>(null);
  const [managingTeachersGroup, setManagingTeachersGroup] = useState<ActivityGroup | null>(null);

  const fetchActivityGroups = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sortOption) params.sort = sortOption;

      const res = await activityGroupAPI.getAll(params);
      const data = (res.data as any)?.data || res.data;
      setActivityGroups(data.activityGroups || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
      if (data.stats) {
        setStats({
          total: data.stats.total || 0,
          active: data.stats.active || 0,
          inactive: data.stats.inactive || 0,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch activity groups:', err);
      toast.error('Failed to load activity groups');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, sortOption]);

  useEffect(() => {
    fetchActivityGroups();
  }, [fetchActivityGroups]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortOption]);

  useEffect(() => {
    if (isAdmin) {
      currencyService.getAll().then(setCurrencies).catch(console.error);
    }
  }, [isAdmin]);

  const filteredGroups = activityGroups;

  // Stats
  const totalGroups = stats.total || total;
  const activeGroups = stats.active;
  const inactiveGroups = stats.inactive;

  // Form helpers
  const resetForm = () => {
    setFormData({ name: '', description: '', cover_image: '', price: null, actual_price: null, currency_id: null });
    setEditingGroup(null);
  };

  const openCreateModal = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditModal = (group: ActivityGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      cover_image: group.cover_image || '',
      price: group.price ? Number(group.price) : null,
      actual_price: group.actual_price ? Number(group.actual_price) : null,
      currency_id: group.currency_id,
    });
    setFormOpen(true);
  };

  const confirmDelete = (id: number, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await activityGroupAPI.delete(deletingId);
      setDeleteConfirmOpen(false);
      setSuccessMessage('Activity group deleted successfully!');
      setSuccessOpen(true);
      fetchActivityGroups();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to delete group');
      setErrorOpen(true);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSaving(true);
      if (editingGroup) {
        await activityGroupAPI.update(editingGroup.id, formData);
        setSuccessMessage('Activity group updated successfully!');
      } else {
        await activityGroupAPI.create(formData);
        setSuccessMessage('Activity group created successfully!');
      }
      setFormOpen(false);
      resetForm();
      setSuccessOpen(true);
      fetchActivityGroups();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to save activity group');
      setErrorOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortOption('name_asc');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || sortOption !== 'name_asc';

  return (
    <div className="space-y-5">
      {/* Confirmation & Alert Modals */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete Activity Group"
        description={`Are you sure you want to delete "${deletingName}"? All activities in this group will be affected.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
      <SuccessModal
        open={successOpen}
        title="Success"
        description={successMessage}
        onConfirm={() => setSuccessOpen(false)}
        onClose={() => setSuccessOpen(false)}
      />
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* Enroll & Teacher Modals */}
      {enrollingGroup && (
        <EnrollStudentsToGroupModal
          group={enrollingGroup}
          onClose={() => setEnrollingGroup(null)}
          onSuccess={fetchActivityGroups}
        />
      )}
      {managingTeachersGroup && (
        <AssignTeachersToGroupModal
          group={managingTeachersGroup}
          onClose={() => setManagingTeachersGroup(null)}
          onSuccess={fetchActivityGroups}
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingGroup ? 'Edit Activity Group' : 'Create Activity Group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup ? 'Update the details of this group.' : 'Fill in details to create a new group.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ag-name" className="font-semibold text-xs text-slate-700">Group Name *</Label>
              <Input
                id="ag-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Science Club, Sports & Fitness"
                className="rounded-xl border-slate-200 focus:ring-saBlue"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-desc" className="font-semibold text-xs text-slate-700">Description</Label>
              <Textarea
                id="ag-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this group..."
                className="rounded-xl border-slate-200 focus:ring-saBlue"
                rows={3}
              />
            </div>
            {/* Cover Image Upload */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs text-slate-700">Cover Image</Label>
              {formData.cover_image ? (
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 group">
                  <img
                    src={resolveImageUrl(formData.cover_image) || formData.cover_image}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cover_image: '' }))}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-saBlue hover:bg-saBlue/5 transition-all">
                  <div className="flex flex-col items-center justify-center pt-3 pb-3">
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 text-saBlue animate-spin mb-1" />
                    ) : (
                      <Upload className="h-6 w-6 text-slate-400 mb-1" />
                    )}
                    <p className="text-xs text-slate-500 font-medium">
                      {isUploading ? 'Uploading...' : 'Click to upload cover image'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploading(true);
                        const res = await uploadService.uploadFile(file);
                        setFormData(prev => ({ ...prev, cover_image: res.url || res.key }));
                      } catch (err: any) {
                        toast.error('Failed to upload image');
                      } finally {
                        setIsUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
            </div>
            {isAdmin && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="ag-actual-price" className="font-semibold text-xs text-slate-700">Actual Price (MRP)</Label>
                    <Input
                      id="ag-actual-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 500"
                      value={formData.actual_price ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, actual_price: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="rounded-xl border-slate-200 focus:ring-saBlue text-sm"
                    />
                    <p className="text-[10px] text-slate-400">Original price (strikethrough)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ag-price" className="font-semibold text-xs text-slate-700">Discounted Price (Selling Price)</Label>
                    <Input
                      id="ag-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 299"
                      value={formData.price ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : null }))}
                      className="rounded-xl border-slate-200 focus:ring-saBlue text-sm"
                    />
                    <p className="text-[10px] text-slate-400">Actual price student will pay</p>
                  </div>
                </div>

                {/* Live Discount Calculation Badge */}
                {formData.actual_price !== null && formData.actual_price !== undefined && formData.price !== null && formData.price !== undefined && formData.actual_price > formData.price && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 line-through font-semibold">
                        ₹{formData.actual_price.toLocaleString()}
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        ₹{formData.price.toLocaleString()}
                      </span>
                    </div>
                    <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 border-none">
                      {Math.round(((formData.actual_price - formData.price) / formData.actual_price) * 100)}% DISCOUNT
                    </Badge>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="ag-currency" className="font-semibold text-xs text-slate-700">Currency</Label>
                  <Select
                    value={formData.currency_id?.toString() ?? ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: value ? parseInt(value) : null }))}
                  >
                    <SelectTrigger id="ag-currency" className="rounded-xl border-slate-200">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name} ({c.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl min-w-[100px] font-semibold">
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> {editingGroup ? 'Update' : 'Create'}</>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* BRAND UNIFIED STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Groups</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalGroups}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <FolderOpen className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Activity groups in system</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saVividOrange/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Groups</p>
              <h3 className="text-2xl font-black text-saVividOrange mt-1">{activeGroups}</h3>
            </div>
            <div className="h-10 w-10 bg-saVividOrange/10 rounded-xl flex items-center justify-center text-saVividOrange">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Currently operational</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inactive Groups</p>
              <h3 className="text-2xl font-black text-slate-700 mt-1">{inactiveGroups}</h3>
            </div>
            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Archived / Paused</p>
        </Card>
      </div>

      {/* SEARCH, SORTING & TOOLBAR */}
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search activity group by name..."
              className="pl-10 h-10 border-slate-200/80 rounded-xl bg-slate-50/50 focus:bg-white text-sm focus:ring-saBlue focus:border-saBlue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Status Filter */}
            <div className="min-w-[130px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Option */}
            <div className="flex items-center gap-1.5 min-w-[170px]">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Alphabetical: A → Z</SelectItem>
                  <SelectItem value="name_desc">Alphabetical: Z → A</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all text-slate-600",
                  viewMode === 'grid' ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition-all text-slate-600",
                  viewMode === 'list' ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                )}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Create Action */}
            {canCreate && (
              <Button onClick={openCreateModal} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 font-semibold px-4 shadow-sm">
                <Plus className="mr-1.5 h-4 w-4" /> Create Group
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter className="h-3 w-3 text-saBlue" /> Active Filters:
              </span>
              {searchTerm && (
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Status: {statusFilter}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 font-semibold"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Content Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-2xl shadow-sm border border-slate-200/80">
          <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-medium text-sm">Loading activity groups...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <CardContent>
            <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Activity Groups Found</h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter options'
                : 'Create your first activity group to get started'}
            </p>
            {canCreate && (
              <Button onClick={openCreateModal} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold">
                <Plus className="mr-2 h-4 w-4" /> Create Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="group hover:shadow-xl transition-all duration-300 overflow-hidden bg-white border border-slate-200/80 hover:border-saBlue/50 cursor-pointer rounded-2xl flex flex-col justify-between"
              onClick={() => {}}
            >
              {/* Cover Image Header */}
              <div className="h-32 w-full relative overflow-hidden bg-slate-100">
                {group.cover_image ? (
                  <img
                    src={resolveImageUrl(group.cover_image) || group.cover_image}
                    alt={group.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-saBlue via-saBlueLight to-blue-500 flex items-center justify-center">
                    <FolderOpen className="h-10 w-10 text-white/70" />
                  </div>
                )}
                <div className="absolute inset-0 bg-white/5"></div>
                <div className="absolute top-3 right-3 z-10 flex gap-1">
                  <Badge className={cn(
                    "text-[10px] font-bold border-0 shadow-sm",
                    group.is_active ? "bg-saVividOrange text-white" : "bg-slate-200 text-slate-800"
                  )}>
                    {group.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-saBlue transition-colors truncate">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                    {group.description || "No description available."}
                  </p>
                </div>

                {/* Price Tag */}
                <div className="flex items-center justify-between">
                  {(group.price !== undefined && group.price !== null) || (group.actual_price !== undefined && group.actual_price !== null) ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {group.actual_price && group.price && group.actual_price > group.price ? (
                        <>
                          <span className="text-[11px] text-slate-400 line-through font-semibold">
                            {group.currency?.symbol || '₹'}{group.actual_price.toLocaleString()}
                          </span>
                          <span className="text-xs font-black text-slate-900">
                            {group.currency?.symbol || '₹'}{group.price.toLocaleString()}
                          </span>
                          <Badge className="bg-emerald-600 text-white font-black text-[9px] px-1 py-0 border-none">
                            {Math.round(((group.actual_price - group.price) / group.actual_price) * 100)}% OFF
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                          {group.currency?.symbol || '₹'}{(group.price ?? group.actual_price)?.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg">
                      Free
                    </Badge>
                  )}

                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        {isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => setEnrollingGroup(group)}>
                              <Users className="h-4 w-4 mr-2 text-saBlue" /> Enroll Students
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setManagingTeachersGroup(group)}>
                              <UserCheck className="h-4 w-4 mr-2 text-saBlue" /> Assign Teachers
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {canUpdate && (
                          <DropdownMenuItem onClick={() => openEditModal(group)}>
                            <Edit className="h-4 w-4 mr-2 text-saVividOrange" /> Edit Group
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => confirmDelete(group.id, group.name)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Counts Footer */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
                  <div className="flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
                    <span>{group._count?.activities || 0} Activities</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                    <span>{group.teacher_junctions?.length || 0} Teachers</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-slate-700">#</TableHead>
                <TableHead className="font-bold text-slate-700">Group Name</TableHead>
                <TableHead className="font-bold text-slate-700">Status</TableHead>
                <TableHead className="font-bold text-slate-700">Price</TableHead>
                <TableHead className="font-bold text-slate-700">Activities</TableHead>
                <TableHead className="font-bold text-slate-700">Teachers</TableHead>
                <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group, index) => (
                <TableRow
                  key={group.id}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <TableCell className="font-bold text-slate-400 text-xs">
                    {index + 1 + (currentPage - 1) * limit}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-900">{group.name}</div>
                    <div className="text-xs text-slate-400 line-clamp-1">{group.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "text-[10px] font-bold border-0",
                      group.is_active ? "bg-saVividOrange/15 text-saVividOrange" : "bg-slate-100 text-slate-600"
                    )}>
                      {group.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">
                    {group.actual_price && group.price && group.actual_price > group.price ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-400 line-through text-[11px]">{group.currency?.symbol || '₹'}{group.actual_price.toLocaleString()}</span>
                        <span className="font-bold text-slate-900">{group.currency?.symbol || '₹'}{group.price.toLocaleString()}</span>
                        <Badge className="bg-emerald-600 text-white font-black text-[9px] px-1 py-0 border-none">
                          {Math.round(((group.actual_price - group.price) / group.actual_price) * 100)}% OFF
                        </Badge>
                      </div>
                    ) : (group.price !== null && group.price !== undefined) || (group.actual_price !== null && group.actual_price !== undefined) ? (
                      `${group.currency?.symbol || '₹'}${Number(group.price ?? group.actual_price).toLocaleString()}`
                    ) : (
                      "Free"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">
                    {group._count?.activities || 0}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">
                    {group.teacher_junctions?.length || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 hover:text-saVividOrange hover:bg-saVividOrange/10"
                          onClick={() => openEditModal(group)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50"
                          onClick={() => confirmDelete(group.id, group.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
          <p className="text-xs text-slate-500 font-medium">
            Showing {(currentPage - 1) * limit + 1} to{" "}
            {Math.min(currentPage * limit, total)} of {total} activity groups
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-xl text-xs border-slate-200/80 hover:border-saBlue hover:text-saBlue"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl text-xs border-slate-200/80 hover:border-saBlue hover:text-saBlue"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
