import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { activityGroupAPI } from '@/services/activity.service';
import { currencyService, uploadService } from '@/services/api';
import type { ActivityGroup, CreateActivityGroupInput } from '@/types/activity';
import type { Currency } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import ConfirmModal from '@/components/ui/confirmationModal';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import EnrollStudentsToGroupModal from '@/components/activities/admin/EnrollStudentsToGroupModal';
import AssignTeachersToGroupModal from '@/components/activities/admin/AssignTeachersToGroupModal';
import { toast } from 'sonner';

export default function ActivityGroupsPage() {
  usePageTitle("Activity Groups");
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  useEffect(() => {
    fetchActivityGroups();
    if (isAdmin) {
      currencyService.getAll().then(setCurrencies).catch(console.error);
    }
  }, [isAdmin]);

  const fetchActivityGroups = async () => {
    try {
      setLoading(true);
      const response = await activityGroupAPI.getAll();
      setActivityGroups(response.data.data.activityGroups || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch activity groups');
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filteredGroups = activityGroups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalGroups = activityGroups.length;
  const activeGroups = activityGroups.filter(g => g.is_active).length;
  const inactiveGroups = activityGroups.filter(g => !g.is_active).length;

  // Form helpers
  const resetForm = () => {
    setFormData({ name: '', description: '', cover_image: '', price: null, currency_id: null });
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
      price: group.price || null,
      currency_id: group.currency_id || null,
    });
    setFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsSaving(true);

    try {
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
      setErrorMessage(error.response?.data?.message || 'Failed to save activity group.');
      setErrorOpen(true);
    } finally {
      setIsSaving(false);
    }
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
      toast.success('Activity group deleted');
      fetchActivityGroups();
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to delete activity group.');
      setErrorOpen(true);
    }
  };

  return (
    <div className="space-y-5">
      {/* Modals */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Delete Activity Group"
        description={`Are you sure you want to delete "${deletingName}"? This will also remove all activities, enrollments, and teacher assignments within this group.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteConfirmOpen(false)}
        confirmText="Delete"
        cancelText="Cancel"
      />
      <SuccessModal open={successOpen} title="Success" description={successMessage} onConfirm={() => setSuccessOpen(false)} onClose={() => setSuccessOpen(false)} />
      <ErrorModal open={errorOpen} title="Error" description={errorMessage} onConfirm={() => setErrorOpen(false)} onClose={() => setErrorOpen(false)} />

      {enrollingGroup && (
        <EnrollStudentsToGroupModal
          group={enrollingGroup}
          onClose={() => setEnrollingGroup(null)}
          onSuccess={() => { setEnrollingGroup(null); fetchActivityGroups(); }}
        />
      )}
      {managingTeachersGroup && (
        <AssignTeachersToGroupModal
          group={managingTeachersGroup}
          onClose={() => setManagingTeachersGroup(null)}
          onSuccess={() => { setManagingTeachersGroup(null); fetchActivityGroups(); }}
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-800">
              {editingGroup ? 'Edit Activity Group' : 'Create Activity Group'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup
                ? 'Update the details of this activity group.'
                : 'Fill in the details to create a new activity group.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ag-name">Name *</Label>
              <Input
                id="ag-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Chess Club"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-desc">Description</Label>
              <Textarea
                id="ag-desc"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this activity group"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cover Image</Label>
              {formData.cover_image ? (
                <div className="relative w-full h-36 rounded-lg overflow-hidden border border-gray-200">
                  <img src={formData.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cover_image: '' }))}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="ag-cover-upload"
                  className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isUploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                      <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500 font-medium">Click to upload cover image</span>
                      <span className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (max 10MB)</span>
                    </>
                  )}
                  <input
                    id="ag-cover-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={isUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('File size must be under 10MB');
                        return;
                      }
                      try {
                        setIsUploading(true);
                        const result = await uploadService.uploadFile(file, 'activity-groups');
                        setFormData(prev => ({ ...prev, cover_image: result.url }));
                        toast.success('Image uploaded');
                      } catch {
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ag-price">Price</Label>
                  <Input
                    id="ag-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : null }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ag-currency">Currency</Label>
                  <Select
                    value={formData.currency_id?.toString() ?? ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency_id: value ? parseInt(value) : null }))}
                  >
                    <SelectTrigger id="ag-currency">
                      <SelectValue placeholder="Select" />
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
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-saBlue hover:bg-saBlueDarkHover text-white min-w-[100px]">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Activity Groups</h2>
          <p className="text-muted-foreground text-sm">
            Organize activities into groups for easy management
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-saBlue hover:bg-saBlueDarkHover text-white w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg hidden sm:flex">
            <FolderOpen className="h-5 w-5 text-saBlue" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">Total</p>
            <p className="text-lg sm:text-xl font-bold text-gray-800">{totalGroups}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg hidden sm:flex">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">Active</p>
            <p className="text-lg sm:text-xl font-bold text-gray-800">{activeGroups}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg hidden sm:flex">
            <XCircle className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-gray-500">Inactive</p>
            <p className="text-lg sm:text-xl font-bold text-gray-800">{inactiveGroups}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search activity groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading activity groups...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white rounded-xl shadow-sm border border-gray-100">
          <FolderOpen className="h-14 w-14 text-gray-300" />
          <p className="text-lg font-semibold text-gray-600">
            {searchTerm ? 'No results found' : 'No Activity Groups Yet'}
          </p>
          <p className="text-sm text-gray-400">
            {searchTerm
              ? 'Try a different search term'
              : 'Create your first activity group to get started'}
          </p>
          {!searchTerm && (
            <Button onClick={openCreateModal} className="mt-2 bg-saBlue hover:bg-saBlueDarkHover text-white">
              <Plus className="mr-2 h-4 w-4" /> Create Group
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="group hover:shadow-md transition-all duration-200 border border-gray-100 rounded-xl overflow-hidden"
            >
              {/* Status bar */}
              <div className={`h-1 ${group.is_active ? 'bg-green-500' : 'bg-orange-400'}`} />

              {/* Cover image or gradient */}
              {group.cover_image ? (
                <div className="w-full h-32 overflow-hidden bg-gray-100">
                  <img src={group.cover_image} alt={group.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <FolderOpen className="h-10 w-10 text-white/60" />
                </div>
              )}

              <CardContent className="p-4 sm:p-5">
                {/* Top row: title + actions */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-800 truncate">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => window.location.href = `/dashboard/activities?group_id=${group.id}`}>
                          <Eye className="h-4 w-4 mr-2" /> View Activities
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditModal(group)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => confirmDelete(group.id, group.name)}
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <Badge className={`text-[11px] px-2 py-0.5 ${group.is_active ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-orange-100 text-orange-700 hover:bg-orange-100'}`}>
                    {group.is_active ? <><CheckCircle className="h-3 w-3 mr-1" /> Active</> : <><XCircle className="h-3 w-3 mr-1" /> Inactive</>}
                  </Badge>
                  {group.price !== undefined && group.price !== null && group.price > 0 && (
                    <Badge className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-50">
                      <IndianRupee className="h-3 w-3 mr-0.5" />{group.price}
                    </Badge>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <FolderOpen className="h-3.5 w-3.5" />
                    <span>{group._count?.activities || 0} Activities</span>
                  </div>
                  {group.teacher_junctions && (
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>{group.teacher_junctions.length} Teachers</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
