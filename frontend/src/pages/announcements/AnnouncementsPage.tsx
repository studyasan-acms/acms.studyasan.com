import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  announcementService,
  boardService,
  classService,
  subjectService,
  activityGroupService,
} from '@/services/api';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Plus,
  Trash2,
  Edit2,
  Megaphone,
  Clock,
  Search,
  X,
  Layers,
  GraduationCap,
  BookOpen,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Eye,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Tag,
  ImageIcon,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { MultiSelect } from '@/components/ui/multiSelect';
import type { Board, Class, Subject, ActivityGroup, Announcement, AnnouncementType } from '@/types';
import {
  ALL_ANNOUNCEMENT_TYPES,
  getAnnouncementTypeConfig,
} from '@/utils/announcementUtils';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AnnouncementsPage() {
  usePageTitle('Announcements');
  const { user } = useAuthStore();
  const { permissions } = usePermissions();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filter state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [sortOption, setSortOption] = useState<string>('date_desc');
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);

  // Master data states
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<ActivityGroup[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<AnnouncementType>('NOTICE');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetBoards, setTargetBoards] = useState<number[]>([]);
  const [targetClasses, setTargetClasses] = useState<number[]>([]);
  const [targetSubjects, setTargetSubjects] = useState<number[]>([]);
  const [targetGroups, setTargetGroups] = useState<number[]>([]);

  // Picture / Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage =
    user?.role === 'ADMIN' ||
    (user?.role === 'TEACHER' && permissions.announcements?.manage);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await announcementService.getAnnouncements();
      setAnnouncements(res.data?.announcements || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [boardsRes, classesRes, subjectsRes, groupsRes] = await Promise.all([
          boardService.getAll({ limit: 1000 }),
          classService.getAll({ limit: 1000 }),
          subjectService.getAll({ limit: 1000 }),
          activityGroupService.getAll({ limit: 1000 }),
        ]);

        setBoards(boardsRes.data?.data || []);
        setClasses(classesRes.data?.data || []);
        setSubjects(subjectsRes.data?.data || []);
        setGroups(groupsRes.data?.activityGroups || []);
      } catch (error) {
        console.error('Failed to fetch targeting options data:', error);
      }
    };

    fetchAnnouncements();
    fetchMasterData();
  }, []);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setType('NOTICE');
    setTargetRoles([]);
    setTargetBoards([]);
    setTargetClasses([]);
    setTargetSubjects([]);
    setTargetGroups([]);
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setExistingImageUrl(null);
    setRemoveImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: Announcement) => {
    resetForm();
    setTitle(a.title);
    setContent(a.content);
    setType(a.type || 'GENERAL');
    setTargetRoles(a.target_roles || []);
    setTargetBoards(a.target_boards || []);
    setTargetClasses(a.target_classes || []);
    setTargetSubjects(a.target_subjects || []);
    setTargetGroups(a.target_groups || []);
    setExistingImageUrl(a.image_url || null);
    setRemoveImage(false);
    setIsEditing(true);
    setCurrentId(a.id);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Image size must be less than 25MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setExistingImageUrl(null);
    setRemoveImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteClick = (a: Announcement) => {
    setAnnouncementToDelete(a);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    try {
      await announcementService.deleteAnnouncement(announcementToDelete.id);
      toast.success('Announcement deleted');
      setDeleteModalOpen(false);
      setAnnouncementToDelete(null);
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setSaving(true);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('content', content.trim());
    formData.append('type', type);
    if (targetRoles.length > 0) formData.append('target_roles', JSON.stringify(targetRoles));
    if (targetBoards.length > 0) formData.append('target_boards', JSON.stringify(targetBoards));
    if (targetClasses.length > 0) formData.append('target_classes', JSON.stringify(targetClasses));
    if (targetSubjects.length > 0) formData.append('target_subjects', JSON.stringify(targetSubjects));
    if (targetGroups.length > 0) formData.append('target_groups', JSON.stringify(targetGroups));

    if (imageFile) {
      formData.append('image', imageFile);
    } else if (removeImage) {
      formData.append('remove_image', 'true');
    }

    try {
      if (isEditing && currentId) {
        await announcementService.updateAnnouncement(currentId, formData);
        toast.success('Announcement updated');
      } else {
        await announcementService.createAnnouncement(formData);
        toast.success('Announcement published');
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (role: string) => {
    if (targetRoles.includes(role)) {
      setTargetRoles(targetRoles.filter((r) => r !== role));
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered and Sorted announcements
  const processedAnnouncements = useMemo(() => {
    let result = announcements.filter((a) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        (a.creator?.name && a.creator.name.toLowerCase().includes(q));

      const matchesType =
        selectedTypeFilter === 'ALL' || (a.type || 'GENERAL') === selectedTypeFilter;

      return matchesSearch && matchesType;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortOption === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortOption === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortOption === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortOption === 'type_asc') {
        return (a.type || 'GENERAL').localeCompare(b.type || 'GENERAL');
      }
      return 0;
    });

    return result;
  }, [announcements, searchTerm, selectedTypeFilter, sortOption]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTypeFilter, sortOption, itemsPerPage]);

  // Pagination slice
  const totalPages = Math.ceil(processedAnnouncements.length / itemsPerPage) || 1;
  const paginatedAnnouncements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedAnnouncements.slice(start, start + itemsPerPage);
  }, [processedAnnouncements, currentPage, itemsPerPage]);

  // Counts by type for tab badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: announcements.length };
    ALL_ANNOUNCEMENT_TYPES.forEach((t) => {
      counts[t] = announcements.filter((a) => (a.type || 'GENERAL') === t).length;
    });
    return counts;
  }, [announcements]);

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

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-saBlue/10 text-saBlue rounded-2xl flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Announcements
              </h1>
              <Badge className="bg-saBlue/10 text-saBlue font-bold text-xs border border-saBlue/20 rounded-full px-2 py-0.5">
                {announcements.length}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Stay updated with notices, news, schedules, and important alerts
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            onClick={handleOpenCreate}
            className="bg-saBlue hover:bg-saBlueDark text-white shadow-md shadow-saBlue/20 rounded-xl h-10 sm:h-11 px-5 font-bold text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      {/* SEARCH, SORT & FILTER TOOLBAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search announcements by keyword, topic or author..."
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

          {/* Controls: Sorting, Items Per Page & View Mode */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs font-semibold w-full sm:w-[160px] bg-slate-50/50">
                  <div className="flex items-center gap-1.5 truncate">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <SelectValue placeholder="Sort By" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="date_desc">Newest First</SelectItem>
                  <SelectItem value="date_asc">Oldest First</SelectItem>
                  <SelectItem value="title_asc">Title (A - Z)</SelectItem>
                  <SelectItem value="title_desc">Title (Z - A)</SelectItem>
                  <SelectItem value="type_asc">By Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                title="Tabular View"
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

        {/* Horizontal Type Filter Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none select-none">
          <button
            onClick={() => setSelectedTypeFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border',
              selectedTypeFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            <span>All Updates</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded-full',
                selectedTypeFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              )}
            >
              {typeCounts.ALL || 0}
            </span>
          </button>

          {ALL_ANNOUNCEMENT_TYPES.map((t) => {
            const config = getAnnouncementTypeConfig(t);
            const Icon = config.icon;
            const isSelected = selectedTypeFilter === t;
            const count = typeCounts[t] || 0;

            return (
              <button
                key={t}
                onClick={() => setSelectedTypeFilter(t)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border',
                  isSelected
                    ? `${config.badgeClass} ring-2 ring-offset-1 ring-saBlue/30 shadow-xs`
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{config.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-semibold',
                      isSelected ? 'bg-black/10' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ANNOUNCEMENTS CONTENT */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading announcements...
          </p>
        </div>
      ) : processedAnnouncements.length === 0 ? (
        <Card className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
            <Megaphone className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-700">No announcements found</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
            {searchTerm || selectedTypeFilter !== 'ALL'
              ? 'No announcements match your search filters. Try clearing filters.'
              : 'There are no active announcements at this time.'}
          </p>
          {(searchTerm || selectedTypeFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl text-xs font-semibold"
              onClick={() => {
                setSearchTerm('');
                setSelectedTypeFilter('ALL');
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
                  <TableHead className="w-[130px] font-bold text-xs uppercase tracking-wider text-slate-700 pl-4 sm:pl-6">
                    Category
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[240px]">
                    Title & Message
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[180px] hidden md:table-cell">
                    Target Audience
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 hidden lg:table-cell">
                    Author
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[120px]">
                    Date
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-700 pr-4 sm:pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAnnouncements.map((a) => {
                  const config = getAnnouncementTypeConfig(a.type);
                  const Icon = config.icon;
                  const dates = formatDate(a.created_at);

                  return (
                    <TableRow
                      key={a.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 cursor-pointer"
                      onClick={() => setViewingAnnouncement(a)}
                    >
                      {/* Type Badge */}
                      <TableCell className="pl-4 sm:pl-6 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border',
                            config.badgeClass
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{config.label}</span>
                        </span>
                      </TableCell>

                      {/* Title & Preview */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3 max-w-md">
                          {a.image_url ? (
                            <img
                              src={a.image_url}
                              alt={a.title}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 border border-slate-200/60 shrink-0 flex items-center justify-center">
                              <Megaphone className="w-4 h-4 opacity-40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1 leading-snug hover:text-saBlue transition-colors">
                              {a.title}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                              {a.content}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Target Groups */}
                      <TableCell className="hidden md:table-cell py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1 max-w-xs text-[10px]">
                          {a.target_roles && a.target_roles.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md font-medium border border-slate-200">
                              <Users className="w-3 h-3 text-slate-400" />
                              {a.target_roles.join(', ')}
                            </span>
                          )}

                          {a.target_boards && a.target_boards.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-medium border border-blue-100">
                              <Layers className="w-3 h-3 text-blue-400" />
                              {a.target_boards.map((id) => boards.find((b) => b.id === id)?.name || id).join(', ')}
                            </span>
                          )}

                          {a.target_classes && a.target_classes.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md font-medium border border-emerald-100">
                              <GraduationCap className="w-3 h-3 text-emerald-400" />
                              {a.target_classes.map((id) => classes.find((c) => c.id === id)?.name || id).join(', ')}
                            </span>
                          )}

                          {a.target_subjects && a.target_subjects.length > 0 && (
                            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-md font-medium border border-purple-100">
                              <BookOpen className="w-3 h-3 text-purple-400" />
                              {a.target_subjects.map((id) => subjects.find((s) => s.id === id)?.name || id).join(', ')}
                            </span>
                          )}

                          {!a.target_roles?.length &&
                            !a.target_boards?.length &&
                            !a.target_classes?.length &&
                            !a.target_subjects?.length &&
                            !a.target_groups?.length && (
                              <span className="inline-flex items-center gap-1 text-slate-400 text-[11px] italic">
                                <Globe className="w-3 h-3 text-slate-300" />
                                Everyone
                              </span>
                            )}
                        </div>
                      </TableCell>

                      {/* Author */}
                      <TableCell className="hidden lg:table-cell py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[10px]">
                            {(a.creator?.name || 'A').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-slate-700 font-medium truncate max-w-[120px]">
                            {a.creator?.name || 'Administrator'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="text-[11px] text-slate-500">
                          <p className="font-semibold text-slate-700 whitespace-nowrap">{dates.full}</p>
                          <p className="text-[10px] text-slate-400 whitespace-nowrap">{dates.relative}</p>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4 sm:pr-6 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingAnnouncement(a)}
                            className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-xl"
                            title="View announcement"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(a)}
                                className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-xl"
                                title="Edit announcement"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(a)}
                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                title="Delete announcement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
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
        /* CARD VIEW */
        <div className="space-y-3 sm:space-y-4">
          {paginatedAnnouncements.map((a) => {
            const config = getAnnouncementTypeConfig(a.type);
            const Icon = config.icon;
            const dates = formatDate(a.created_at);
            const isExpanded = expandedCards[a.id];
            const isLongText = a.content.length > 220;

            return (
              <Card
                key={a.id}
                className={cn(
                  'bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden border-l-4',
                  config.borderLeftClass
                )}
              >
                <CardHeader className="py-3 sm:py-4 px-4 sm:px-6 bg-slate-50/40 border-b border-slate-100 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Type Badge */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border',
                          config.badgeClass
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{config.label}</span>
                      </span>

                      {/* Time */}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{dates.relative || dates.full}</span>
                      </span>
                    </div>

                    {/* Management actions */}
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(a)}
                          className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-saBlue hover:bg-saBlue/10"
                          title="Edit announcement"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(a)}
                          className="h-8 w-8 p-0 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug break-words">
                    {a.title}
                  </h2>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 space-y-4">
                  {a.image_url && (
                    <div
                      onClick={() => setViewingAnnouncement(a)}
                      className="rounded-2xl overflow-hidden border border-slate-200/80 bg-slate-50 cursor-pointer group/img max-h-72 flex items-center justify-center shadow-2xs hover:border-saBlue/40 transition-all"
                    >
                      <img
                        src={a.image_url}
                        alt={a.title}
                        className="w-full h-full max-h-72 object-cover transition-transform duration-300 group-hover/img:scale-[1.01]"
                      />
                    </div>
                  )}

                  {/* Content with expand/collapse */}
                  <div>
                    <p
                      className={cn(
                        'text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words',
                        !isExpanded && isLongText ? 'line-clamp-3' : ''
                      )}
                    >
                      {a.content}
                    </p>

                    {isLongText && (
                      <button
                        onClick={() => toggleExpand(a.id)}
                        className="text-xs font-bold text-saBlue hover:text-saBlueDark mt-2 inline-flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            Show Less <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Read Full Announcement <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Author & Targeting Badges */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    {/* Author */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[10px]">
                        {(a.creator?.name || 'Admin').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-700 text-xs">
                        Posted by {a.creator?.name || 'Administrator'}
                      </span>
                    </div>

                    {/* Target Audience Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {a.target_roles && a.target_roles.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                          <Users className="w-3 h-3 text-slate-400" />
                          {a.target_roles.join(', ')}
                        </span>
                      )}

                      {a.target_boards && a.target_boards.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium border border-blue-100">
                          <Layers className="w-3 h-3 text-blue-400" />
                          {a.target_boards.map((id) => boards.find((b) => b.id === id)?.name || id).join(', ')}
                        </span>
                      )}

                      {a.target_classes && a.target_classes.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-100">
                          <GraduationCap className="w-3 h-3 text-emerald-400" />
                          {a.target_classes.map((id) => classes.find((c) => c.id === id)?.name || id).join(', ')}
                        </span>
                      )}

                      {a.target_subjects && a.target_subjects.length > 0 && (
                        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium border border-purple-100">
                          <BookOpen className="w-3 h-3 text-purple-400" />
                          {a.target_subjects.map((id) => subjects.find((s) => s.id === id)?.name || id).join(', ')}
                        </span>
                      )}

                      {!a.target_roles?.length &&
                        !a.target_boards?.length &&
                        !a.target_classes?.length &&
                        !a.target_subjects?.length &&
                        !a.target_groups?.length && (
                          <span className="text-slate-400 text-[11px] italic">
                            Visible to Everyone
                          </span>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* PAGINATION TOOLBAR */}
      {processedAnnouncements.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {(currentPage - 1) * itemsPerPage + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-900">
                {Math.min(currentPage * itemsPerPage, processedAnnouncements.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{processedAnnouncements.length}</strong>{' '}
              announcements
            </span>

            <span className="hidden sm:inline text-slate-300">|</span>

            {/* Items Per Page Select */}
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

      {/* VIEW ANNOUNCEMENT DETAIL MODAL */}
      {viewingAnnouncement && (
        <Dialog open={!!viewingAnnouncement} onOpenChange={() => setViewingAnnouncement(null)}>
          <DialogContent className="w-[96vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-slate-200">
            {/* Modal Header */}
            <DialogHeader className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const cfg = getAnnouncementTypeConfig(viewingAnnouncement.type);
                  const Icon = cfg.icon;
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border', cfg.badgeClass)}>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{cfg.label}</span>
                    </span>
                  );
                })()}

                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(viewingAnnouncement.created_at).full} ({formatDate(viewingAnnouncement.created_at).relative})
                </span>
              </div>

              <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 leading-snug">
                {viewingAnnouncement.title}
              </DialogTitle>
            </DialogHeader>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {viewingAnnouncement.image_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center shadow-xs">
                  <img
                    src={viewingAnnouncement.image_url}
                    alt={viewingAnnouncement.title}
                    className="w-full max-h-96 object-contain rounded-xl"
                  />
                </div>
              )}

              <div className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                {viewingAnnouncement.content}
              </div>

              {/* Targeting and metadata summary */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-[10px]">
                    {(viewingAnnouncement.creator?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <span>Posted by <strong className="text-slate-800">{viewingAnnouncement.creator?.name || 'Administrator'}</strong></span>
                </div>

                {/* Target Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-xs mr-1">Audience:</span>
                  {viewingAnnouncement.target_roles?.map((r) => (
                    <span key={r} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200">
                      {r}
                    </span>
                  ))}
                  {viewingAnnouncement.target_boards?.map((id) => (
                    <span key={id} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-[11px] font-medium border border-blue-100">
                      {boards.find((b) => b.id === id)?.name || `Board ${id}`}
                    </span>
                  ))}
                  {viewingAnnouncement.target_classes?.map((id) => (
                    <span key={id} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-medium border border-emerald-100">
                      {classes.find((c) => c.id === id)?.name || `Class ${id}`}
                    </span>
                  ))}
                  {viewingAnnouncement.target_subjects?.map((id) => (
                    <span key={id} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[11px] font-medium border border-purple-100">
                      {subjects.find((s) => s.id === id)?.name || `Subject ${id}`}
                    </span>
                  ))}
                  {!viewingAnnouncement.target_roles?.length &&
                    !viewingAnnouncement.target_boards?.length &&
                    !viewingAnnouncement.target_classes?.length &&
                    !viewingAnnouncement.target_subjects?.length &&
                    !viewingAnnouncement.target_groups?.length && (
                      <span className="text-slate-500 text-xs italic">Everyone (All students & faculty)</span>
                    )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAnnouncement(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close
              </Button>
              {canManage && (
                <Button
                  size="sm"
                  onClick={() => {
                    const toEdit = viewingAnnouncement;
                    setViewingAnnouncement(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="bg-saBlue hover:bg-saBlueDark text-white font-bold rounded-xl text-xs px-4"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[96vw] sm:max-w-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-slate-200">
          <DialogHeader className="p-4 sm:p-5 bg-white border-b border-slate-200/80 shrink-0">
            <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <span>{isEditing ? 'Edit Announcement' : 'Publish New Announcement'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Type Selector Pills */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Announcement Type *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_ANNOUNCEMENT_TYPES.map((t) => {
                    const config = getAnnouncementTypeConfig(t);
                    const Icon = config.icon;
                    const isSelected = type === t;

                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setType(t)}
                        className={cn(
                          'p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5',
                          isSelected
                            ? `${config.bgLightClass} ${config.badgeClass} ring-2 ring-offset-1 ring-saBlue font-bold shadow-xs`
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0', config.iconBgClass)}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight truncate">{config.label}</p>
                          <p className="text-[9px] opacity-70 truncate text-slate-500 font-medium">{config.label}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-term Exam Schedule & Room Allocation"
                  className="h-10 sm:h-11 rounded-xl border-slate-200 focus-visible:ring-saBlue text-xs sm:text-sm font-medium"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Message Content *
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement details here..."
                  className="min-h-[120px] rounded-xl border-slate-200 focus-visible:ring-saBlue text-xs sm:text-sm leading-relaxed"
                  required
                />
              </div>

              {/* Picture Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-saBlue" />
                    <span>Announcement Picture (Optional)</span>
                  </label>
                  {(imagePreview || (existingImageUrl && !removeImage)) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                  id="announcement-image-input"
                />

                {imagePreview || (existingImageUrl && !removeImage) ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    <img
                      src={imagePreview || existingImageUrl!}
                      alt="Announcement Preview"
                      className="w-full max-h-52 object-contain bg-slate-950/5 rounded-xl"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl text-xs font-semibold bg-white/95 hover:bg-white text-slate-800 shadow-md"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Change Picture
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={handleRemoveImage}
                        className="rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-saBlue/50 hover:bg-saBlue/[0.02] transition-all rounded-2xl p-5 text-center cursor-pointer flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-saBlue/10 text-saBlue flex items-center justify-center group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 group-hover:text-saBlue transition-colors">
                        Click to upload an announcement picture
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PNG, JPG, WEBP, or GIF up to 25MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Targeting Options Container */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Target Audience (Optional)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Leave blank to broadcast to all students and teachers.
                    </p>
                  </div>
                </div>

                {/* Roles Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Target Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all',
                        targetRoles.includes('STUDENT')
                          ? 'bg-saBlue/10 border-saBlue/30 text-saBlue'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={targetRoles.includes('STUDENT')}
                        onChange={() => toggleRole('STUDENT')}
                        className="rounded text-saBlue focus:ring-saBlue"
                      />
                      <span>Students</span>
                    </label>

                    <label
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all',
                        targetRoles.includes('TEACHER')
                          ? 'bg-saBlue/10 border-saBlue/30 text-saBlue'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={targetRoles.includes('TEACHER')}
                        onChange={() => toggleRole('TEACHER')}
                        className="rounded text-saBlue focus:ring-saBlue"
                      />
                      <span>Teachers</span>
                    </label>
                  </div>
                </div>

                {/* MultiSelects Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Target Boards
                    </label>
                    <MultiSelect
                      options={boards.map((b) => ({ value: b.id, label: b.name }))}
                      selectedValues={targetBoards}
                      onSelectChange={setTargetBoards}
                      placeholder="All Boards"
                      searchPlaceholder="Search boards..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Target Classes
                    </label>
                    <MultiSelect
                      options={classes.map((c) => ({ value: c.id, label: c.name }))}
                      selectedValues={targetClasses}
                      onSelectChange={setTargetClasses}
                      placeholder="All Classes"
                      searchPlaceholder="Search classes..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Target Subjects
                    </label>
                    <MultiSelect
                      options={subjects.map((s) => ({
                        value: s.id,
                        label: `${s.name}${s.class?.name ? ` (${s.class.name})` : ''}`,
                      }))}
                      selectedValues={targetSubjects}
                      onSelectChange={setTargetSubjects}
                      placeholder="All Subjects"
                      searchPlaceholder="Search subjects..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Target Activity Groups
                    </label>
                    <MultiSelect
                      options={groups.map((g) => ({ value: g.id, label: g.name }))}
                      selectedValues={targetGroups}
                      onSelectChange={setTargetGroups}
                      placeholder="All Groups"
                      searchPlaceholder="Search groups..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 flex flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 sm:flex-none rounded-xl h-10 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none bg-saBlue hover:bg-saBlueDark text-white font-bold rounded-xl h-10 px-5 shadow-md shadow-saBlue/20 text-xs"
              >
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Publish Announcement'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title="Delete Announcement"
        message={
          announcementToDelete ? (
            <span className="text-sm text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">"{announcementToDelete.title}"</strong>? This will remove the announcement for all users.
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