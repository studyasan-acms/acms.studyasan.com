import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Layers,
  Plus,
  Search,
  Users,
  UserCheck,
  BookOpen,
  Edit2,
  Trash2,
  X,
  UserPlus,
  UserMinus,
  CheckCircle2,
  Filter,
  RefreshCw,
  LayoutGrid,
  List,
  GraduationCap,
  Video,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { sectionService, subjectService, teacherService } from "@/services/api";
import type { Section, SectionStudent, Subject, Teacher } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UnifiedPageHeader from "@/components/ui/UnifiedPageHeader";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import SearchablePaginatedSelect from "@/components/ui/searchablePaginatedSelect";
import { useAuthStore } from "@/store/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";

export default function SectionsPage() {
  usePageTitle("Class Sections");
  const { user } = useAuthStore();
  const { hasPermission } = usePermissions();

  const canCreate = user?.role === "ADMIN" || hasPermission("sections", "create");
  const canUpdate = user?.role === "ADMIN" || hasPermission("sections", "update");
  const canDelete = user?.role === "ADMIN" || hasPermission("sections", "delete");

  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Sorting & Pagination State
  type SortField = 'title' | 'subject' | 'teacher' | 'students' | 'sessions' | 'created_at';
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create / Edit Modal State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [formSubjectId, setFormSubjectId] = useState<string>("");
  const [formTitle, setFormTitle] = useState("");
  const [formTeacherId, setFormTeacherId] = useState<string>("");
  const [formTeachersList, setFormTeachersList] = useState<Teacher[]>([]);
  const [formTeachersLoading, setFormTeachersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manage Students Modal State
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [sectionMembers, setSectionMembers] = useState<SectionStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentTab, setStudentTab] = useState<"enrolled" | "add">("enrolled");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [actionInProgressStudentId, setActionInProgressStudentId] = useState<number | null>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch sections and subjects
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [secRes, subRes] = await Promise.all([
        sectionService.getAll({ limit: 500 }),
        subjectService.getAll({ limit: 500 }),
      ]);

      if (secRes && (secRes.success !== false)) {
        const rawSec = secRes.data?.data ?? secRes.data ?? secRes;
        setSections(Array.isArray(rawSec) ? rawSec : []);
      }
      if (subRes && (subRes.success !== false)) {
        const rawSub = subRes.data?.data ?? subRes.data ?? subRes;
        setSubjects(Array.isArray(rawSub) ? rawSub : []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load sections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When subject changes in Create/Edit modal, fetch teachers for that subject
  useEffect(() => {
    if (!formSubjectId) {
      setFormTeachersList([]);
      return;
    }

    const loadTeachers = async () => {
      setFormTeachersLoading(true);
      try {
        const res = await teacherService.getBySubject(parseInt(formSubjectId));
        const list = Array.isArray(res.data) ? res.data : [];

        if (list.length > 0) {
          setFormTeachersList(list);
        } else {
          // Fallback: fetch all active teachers
          const allRes = await teacherService.getAll({ limit: 200 });
          const rawAll: any = allRes.data;
          const allList = Array.isArray(rawAll?.data) ? rawAll.data : Array.isArray(rawAll) ? rawAll : [];
          setFormTeachersList(allList);
        }
      } catch {
        // Fallback: fetch all active teachers
        try {
          const allRes = await teacherService.getAll({ limit: 200 });
          const rawAll: any = allRes.data;
          const allList = Array.isArray(rawAll?.data) ? rawAll.data : Array.isArray(rawAll) ? rawAll : [];
          setFormTeachersList(allList);
        } catch {
          setFormTeachersList([]);
        }
      } finally {
        setFormTeachersLoading(false);
      }
    };

    loadTeachers();
  }, [formSubjectId]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSection(null);
    setFormSubjectId("");
    setFormTitle("");
    setFormTeacherId("");
    setFormTeachersList([]);
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (section: Section) => {
    setEditingSection(section);
    setFormSubjectId(section.subject_id.toString());
    setFormTitle(section.title);
    setFormTeacherId(section.teacher_id.toString());
    setShowFormModal(true);
  };

  // Submit Section Form (Create / Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Please enter a section title");
      return;
    }
    if (!formSubjectId) {
      toast.error("Please select a subject");
      return;
    }
    if (!formTeacherId) {
      toast.error("Please select a designated teacher");
      return;
    }

    try {
      setSubmitting(true);
      if (editingSection) {
        const res = await sectionService.update(editingSection.id, {
          title: formTitle.trim(),
          subject_id: parseInt(formSubjectId),
          teacher_id: parseInt(formTeacherId),
        });
        if (res.success) {
          toast.success("Section updated successfully");
          setShowFormModal(false);
          fetchData();
        }
      } else {
        const res = await sectionService.create({
          title: formTitle.trim(),
          subject_id: parseInt(formSubjectId),
          teacher_id: parseInt(formTeacherId),
        });
        if (res.success) {
          toast.success("Section created successfully");
          setShowFormModal(false);
          fetchData();
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save section");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Manage Students Modal
  const handleOpenStudents = async (section: Section) => {
    setActiveSection(section);
    setShowStudentsModal(true);
    setStudentTab("enrolled");
    setStudentSearchQuery("");
    await loadSectionStudentsData(section.id);
  };

  // Load students for active section
  const loadSectionStudentsData = async (sectionId: number) => {
    setStudentsLoading(true);
    try {
      const [membersRes, availableRes] = await Promise.all([
        sectionService.getStudents(sectionId),
        sectionService.getAvailableStudents(sectionId),
      ]);

      if (membersRes.success) {
        setSectionMembers(membersRes.data || []);
      }
      if (availableRes.success) {
        setAvailableStudents(availableRes.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  };

  // Add student to section
  const handleAddStudent = async (studentId: number) => {
    if (!activeSection) return;
    try {
      setActionInProgressStudentId(studentId);
      const res = await sectionService.addStudent(activeSection.id, studentId);
      if (res.success) {
        toast.success("Student added to section");
        await loadSectionStudentsData(activeSection.id);
        fetchData(); // refresh counts
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add student to section");
    } finally {
      setActionInProgressStudentId(null);
    }
  };

  // Remove student from section
  const handleRemoveStudent = async (studentId: number) => {
    if (!activeSection) return;
    try {
      setActionInProgressStudentId(studentId);
      const res = await sectionService.removeStudent(activeSection.id, studentId);
      if (res.success) {
        toast.success("Student removed from section");
        await loadSectionStudentsData(activeSection.id);
        fetchData(); // refresh counts
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove student from section");
    } finally {
      setActionInProgressStudentId(null);
    }
  };

  // Delete Section
  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      setDeleting(true);
      const res = await sectionService.delete(sectionToDelete.id);
      if (res.success) {
        toast.success("Section deleted successfully");
        setDeleteModalOpen(false);
        setSectionToDelete(null);
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete section");
    } finally {
      setDeleting(false);
    }
  };

  // Sort and Filter Sections
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder(field === "created_at" || field === "students" || field === "sessions" ? "desc" : "asc");
    }
  };

  const sortedAndFilteredSections = useMemo(() => {
    const list = sections.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.subject?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.teacher?.user.name || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSubject =
        selectedSubjectFilter === "ALL" || s.subject_id.toString() === selectedSubjectFilter;

      return matchesSearch && matchesSubject;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "subject":
          comparison = (a.subject?.name || "").localeCompare(b.subject?.name || "");
          break;
        case "teacher":
          comparison = (a.teacher?.user.name || "").localeCompare(b.teacher?.user.name || "");
          break;
        case "students":
          comparison = (a._count?.memberships || 0) - (b._count?.memberships || 0);
          break;
        case "sessions":
          comparison = (a._count?.class_sessions || 0) - (b._count?.class_sessions || 0);
          break;
        case "created_at":
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return list;
  }, [sections, searchQuery, selectedSubjectFilter, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedAndFilteredSections.length / pageSize));

  // Reset page to 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSubjectFilter, sortField, sortOrder, pageSize]);

  const paginatedSections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFilteredSections.slice(start, start + pageSize);
  }, [sortedAndFilteredSections, currentPage, pageSize]);

  // Filtered Student lists in Modal
  const filteredMembers = useMemo(() => {
    if (!studentSearchQuery.trim()) return sectionMembers;
    const q = studentSearchQuery.toLowerCase();
    return sectionMembers.filter(
      (m) =>
        m.student?.user.name.toLowerCase().includes(q) ||
        m.student?.user.email.toLowerCase().includes(q)
    );
  }, [sectionMembers, studentSearchQuery]);

  const filteredAvailable = useMemo(() => {
    if (!studentSearchQuery.trim()) return availableStudents;
    const q = studentSearchQuery.toLowerCase();
    return availableStudents.filter(
      (s) =>
        s.user?.name.toLowerCase().includes(q) ||
        s.user?.email.toLowerCase().includes(q)
    );
  }, [availableStudents, studentSearchQuery]);

  // Overall Stats
  const totalStudentsEnrolled = useMemo(() => {
    return sections.reduce((sum, s) => sum + (s._count?.memberships || 0), 0);
  }, [sections]);

  const uniqueSubjectsCount = useMemo(() => {
    return new Set(sections.map((s) => s.subject_id)).size;
  }, [sections]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <UnifiedPageHeader
        title="Class Sections"
        subtitle="Organize students into dedicated subject sections with assigned teachers for focused live sessions"
        badge={`${sections.length} ${sections.length === 1 ? "Section" : "Sections"}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="border-slate-300 hover:bg-slate-50 text-slate-700"
            >
              <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
            {canCreate && (
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Section
              </Button>
            )}
          </div>
        }
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sections</p>
              <p className="text-xl font-bold text-slate-900">{sections.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Students</p>
              <p className="text-xl font-bold text-slate-900">{totalStudentsEnrolled}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Subjects Covered</p>
              <p className="text-xl font-bold text-slate-900">{uniqueSubjectsCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by section title, subject, or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 text-sm focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subject Filter */}
          <div className="w-full sm:w-48">
            <Select
              value={selectedSubjectFilter}
              onValueChange={setSelectedSubjectFilter}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 text-xs">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Subjects</SelectItem>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id.toString()}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Selector */}
          <div className="w-full sm:w-44">
            <Select
              value={`${sortField}-${sortOrder}`}
              onValueChange={(val) => {
                const [field, order] = val.split("-") as [SortField, SortOrder];
                setSortField(field);
                setSortOrder(order);
              }}
            >
              <SelectTrigger className="bg-slate-50 border-slate-200 text-xs font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="title-asc">Title (A to Z)</SelectItem>
                <SelectItem value="title-desc">Title (Z to A)</SelectItem>
                <SelectItem value="students-desc">Most Students</SelectItem>
                <SelectItem value="students-asc">Least Students</SelectItem>
                <SelectItem value="sessions-desc">Most Sessions</SelectItem>
                <SelectItem value="sessions-asc">Least Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 self-end sm:self-auto border border-slate-200 rounded-lg p-1 bg-slate-50 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("grid")}
            className={cn(
              "h-7 w-7 p-0 rounded-md",
              viewMode === "grid" ? "bg-white shadow-xs text-blue-600 font-bold" : "text-slate-500"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn(
              "h-7 w-7 p-0 rounded-md",
              viewMode === "list" ? "bg-white shadow-xs text-blue-600 font-bold" : "text-slate-500"
            )}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading sections...</p>
        </div>
      ) : sortedAndFilteredSections.length === 0 ? (
        <Card className="border border-slate-200 shadow-sm bg-white p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Sections Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
            {searchQuery || selectedSubjectFilter !== "ALL"
              ? "No sections match your current filters. Try changing your search or resetting filters."
              : "No sections have been created yet. Sections let you divide subject students into designated groups under specific teachers."}
          </p>
          {canCreate && (
            <Button
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Section
            </Button>
          )}
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedSections.map((sec) => (
              <Card
                key={sec.id}
                className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header: Subject & Action buttons */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 truncate max-w-[200px]">
                      <BookOpen className="w-3.5 h-3.5 mr-1 shrink-0" />
                      {sec.subject?.name || "Subject"}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(sec)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Section"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSectionToDelete(sec);
                            setDeleteModalOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete Section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Section Title */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug break-words">
                      {sec.title}
                    </h3>
                  </div>

                  {/* Teacher Info */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {sec.teacher?.user.name?.charAt(0).toUpperCase() || "T"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider leading-none mb-1">
                        Assigned Teacher
                      </p>
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {sec.teacher?.user.name || "Unknown Teacher"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {sec.teacher?.user.email}
                      </p>
                    </div>
                  </div>

                  {/* Badges strip: Student Count & Session Count */}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50 font-semibold text-xs px-2.5 py-1">
                      <Users className="w-3.5 h-3.5 mr-1" />
                      {sec._count?.memberships || 0} {sec._count?.memberships === 1 ? "Student" : "Students"}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 font-semibold text-xs px-2.5 py-1">
                      <Video className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      {sec._count?.class_sessions || 0} Sessions
                    </Badge>
                  </div>
                </CardContent>

                {/* Card Footer Action */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenStudents(sec)}
                    className="w-full border-blue-200 bg-white hover:bg-blue-50 text-blue-700 font-medium text-xs flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Manage Students ({sec._count?.memberships || 0})
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination bar */}
          {sortedAndFilteredSections.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, sortedAndFilteredSections.length)} of{" "}
                  {sortedAndFilteredSections.length} sections
                </span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg text-xs border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-xs text-slate-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={cn(
                                "h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all",
                                currentPage === p
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 rounded-lg text-xs border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead
                    onClick={() => handleSort("title")}
                    className="font-bold text-slate-700 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Section Title</span>
                      {sortField === "title" ? (
                        sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("subject")}
                    className="font-bold text-slate-700 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Subject</span>
                      {sortField === "subject" ? (
                        sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("teacher")}
                    className="font-bold text-slate-700 cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Designated Teacher</span>
                      {sortField === "teacher" ? (
                        sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("students")}
                    className="font-bold text-slate-700 text-center cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Students</span>
                      {sortField === "students" ? (
                        sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-orange-600" /> : <ChevronDown className="w-3.5 h-3.5 text-orange-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort("sessions")}
                    className="font-bold text-slate-700 text-center cursor-pointer select-none hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Sessions</span>
                      {sortField === "sessions" ? (
                        sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSections.map((sec) => (
                  <TableRow key={sec.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-bold text-slate-900">{sec.title}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {sec.subject?.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-800">
                        {sec.teacher?.user.name}
                      </div>
                      <div className="text-xs text-slate-400">{sec.teacher?.user.email}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {sec._count?.memberships || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs font-semibold text-slate-600">
                        {sec._count?.class_sessions || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenStudents(sec)}
                          className="h-8 text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Users className="w-3.5 h-3.5 mr-1" />
                          Students
                        </Button>
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(sec)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSectionToDelete(sec);
                              setDeleteModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination bar */}
          {sortedAndFilteredSections.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, sortedAndFilteredSections.length)} of{" "}
                  {sortedAndFilteredSections.length} sections
                </span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg text-xs border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prev && p - prev > 1 && (
                              <span className="px-1 text-xs text-slate-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={cn(
                                "h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all",
                                currentPage === p
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2.5 rounded-lg text-xs border-slate-200 hover:border-blue-500 hover:text-blue-600 disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================== CREATE / EDIT SECTION MODAL ================== */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              {editingSection ? "Edit Section" : "Create New Section"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 py-2">
            {/* Subject Selector (Searchable) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Subject <span className="text-red-500">*</span>
              </label>
              <SearchablePaginatedSelect
                value={formSubjectId}
                onValueChange={(val) => {
                  setFormSubjectId(val);
                  setFormTeacherId(""); // reset selected teacher when subject changes
                }}
                placeholder={subjects.length === 0 ? "Loading subjects..." : "Select Subject"}
                searchPlaceholder="Search subject by name, class, or board..."
                emptyLabel="No subjects found"
                triggerClassName="bg-slate-50 border-slate-200"
                options={subjects.map((sub) => {
                  const details = [sub.class?.name, sub.board?.name].filter(Boolean).join(' • ');
                  return {
                    value: sub.id.toString(),
                    label: `${sub.name}${details ? ` (${details})` : ''}`,
                    searchText: `${sub.name} ${sub.class?.name || ''} ${sub.board?.name || ''}`,
                  };
                })}
              />
            </div>

            {/* Section Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Section Title <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Section A - Morning, Batch 1"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="bg-slate-50 border-slate-200"
                required
              />
            </div>

            {/* Designated Teacher Selector (Searchable) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Designated Teacher <span className="text-red-500">*</span>
              </label>
              <SearchablePaginatedSelect
                value={formTeacherId}
                onValueChange={setFormTeacherId}
                disabled={!formSubjectId || formTeachersLoading}
                placeholder={
                  !formSubjectId
                    ? "Select a subject first"
                    : formTeachersLoading
                    ? "Loading teachers..."
                    : formTeachersList.length === 0
                    ? "No teachers available"
                    : "Select One Teacher"
                }
                searchPlaceholder="Search teacher by name or email..."
                emptyLabel="No teachers found"
                triggerClassName="bg-slate-50 border-slate-200"
                options={formTeachersList.map((t) => ({
                  value: t.id.toString(),
                  label: `${t.user?.name || `Teacher #${t.id}`} (${t.user?.email || ''})`,
                  searchText: `${t.user?.name || ''} ${t.user?.email || ''}`,
                }))}
              />
              <p className="text-xs text-slate-500">
                Only this designated teacher and section students will participate in section sessions.
              </p>
            </div>

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFormModal(false)}
                disabled={submitting}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !formTitle.trim() || !formSubjectId || !formTeacherId}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingSection ? (
                  "Update Section"
                ) : (
                  "Create Section"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================== MANAGE STUDENTS MODAL ================== */}
      <Dialog open={showStudentsModal} onOpenChange={setShowStudentsModal}>
        <DialogContent className="sm:max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                <span>Manage Section Students</span>
              </div>
            </DialogTitle>
            {activeSection && (
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">
                  {activeSection.title}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {activeSection.subject?.name}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">
                  Teacher: {activeSection.teacher?.user.name}
                </span>
              </div>
            )}
          </div>

          {/* Modal Tabs & Search */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setStudentTab("enrolled");
                  setStudentSearchQuery("");
                }}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all",
                  studentTab === "enrolled"
                    ? "bg-white text-orange-700 shadow-xs border border-orange-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                In Section ({sectionMembers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStudentTab("add");
                  setStudentSearchQuery("");
                }}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1",
                  studentTab === "add"
                    ? "bg-white text-blue-700 shadow-xs border border-blue-200"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Available ({availableStudents.length})
              </button>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Search students..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
              />
              {studentSearchQuery && (
                <button
                  onClick={() => setStudentSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Student List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[50vh]">
            {studentsLoading ? (
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-orange-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading section members...</p>
              </div>
            ) : studentTab === "enrolled" ? (
              /* Enrolled Students Tab */
              filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No Students in this Section</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click the &quot;Add Available&quot; tab to enroll students from this subject.
                  </p>
                </div>
              ) : (
                filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {m.student?.user.name?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {m.student?.user.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{m.student?.user.email}</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveStudent(m.student_id)}
                      disabled={actionInProgressStudentId === m.student_id}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-medium shrink-0"
                    >
                      {actionInProgressStudentId === m.student_id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="w-3.5 h-3.5 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                ))
              )
            ) : (
              /* Add Available Students Tab */
              filteredAvailable.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">All Enrolled Students Assigned</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    There are no unassigned students enrolled in this subject.
                  </p>
                </div>
              ) : (
                filteredAvailable.map((std) => (
                  <div
                    key={std.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {std.user?.name?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{std.user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{std.user?.email}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleAddStudent(std.id)}
                      disabled={actionInProgressStudentId === std.id}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shrink-0"
                    >
                      {actionInProgressStudentId === std.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Add to Section
                        </>
                      )}
                    </Button>
                  </div>
                ))
              )
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Students cannot join more than one section for the same subject.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStudentsModal(false)}
              className="border-slate-300 text-slate-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================== DELETE CONFIRMATION MODAL ================== */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSectionToDelete(null);
        }}
        onConfirm={handleDeleteSection}
        title="Delete Section"
        message={`Are you sure you want to delete section "${sectionToDelete?.title}"? Any scheduled classes linked to this section will revert to subject-wide access.`}
        confirmText="Delete Section"
      />
    </div>
  );
}
