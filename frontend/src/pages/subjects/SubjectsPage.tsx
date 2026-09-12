import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import UnifiedPageHeader from "@/components/ui/UnifiedPageHeader";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  subjectService,
  classService,
  boardService,
} from "@/services/api";
import type { Subject, Class, Board } from "@/types";
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  GraduationCap,
  PlayCircle,
  Star,
  BookMarked,
  Target,
  Award,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  X,
  Layers,
  Compass,
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from "@/hooks/usePermissions";

export default function SubjectsPage({ embedded = false }: { embedded?: boolean }) {
  usePageTitle("Subjects & Curriculums");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";
  const { canCreate, canUpdate, canDelete: canDeletePerm } = usePermissions();
  const canAddSubject = isAdmin || canCreate('subjects');
  const canEditSubject = isAdmin || canUpdate('subjects');
  const canDeleteSubject = isAdmin || canDeletePerm('subjects');

  // Data & Filter State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classesList, setClassesList] = useState<Class[]>([]);
  const [boardsList, setBoardsList] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [selectedBoardId, setSelectedBoardId] = useState("all");
  const [selectedType, setSelectedType] = useState("all"); // 'all' | 'subject' | 'course'
  const [sortOption, setSortOption] = useState("name_asc"); // 'name_asc' | 'name_desc' | 'newest' | 'oldest'
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  /** Fetch Classes & Boards for Filters */
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [cRes, bRes] = await Promise.all([
          classService.getAll({ limit: 100 }),
          boardService.getAll({ limit: 100 }),
        ]);
        setClassesList(cRes.data.data);
        setBoardsList(bRes.data.data);
      } catch (err) {
        console.error("Failed to fetch classes or boards for filter:", err);
      }
    };
    fetchMetadata();
  }, []);

  /** Fetch subjects */
  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);

    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
      };

      if (debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim();
      }

      if (selectedClassId !== "all") {
        params.class_id = Number(selectedClassId);
      }

      if (selectedBoardId !== "all") {
        params.board_id = Number(selectedBoardId);
      }

      if (selectedType === "course") params.is_course = true;
      if (selectedType === "subject") params.is_course = false;

      // Dynamic Sorting
      if (sortOption === "name_asc") {
        params.sort = "name";
        params.order = "asc";
      } else if (sortOption === "name_desc") {
        params.sort = "name";
        params.order = "desc";
      } else if (sortOption === "newest") {
        params.sort = "created_at";
        params.order = "desc";
      } else if (sortOption === "oldest") {
        params.sort = "created_at";
        params.order = "asc";
      }

      // Teacher filter
      if (user?.role === "TEACHER" && user.id) {
        params.user_id = user.id;
        params.role = "TEACHER";
      }

      // Student filter
      if (user?.role === "STUDENT" && user.id) {
        params.user_id = user.id;
        params.role = "STUDENT";
      }

      const response = await subjectService.getAll(params);

      setSubjects(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    user,
    debouncedSearchTerm,
    selectedClassId,
    selectedBoardId,
    selectedType,
    sortOption,
  ]);

  // Debounce search input to avoid too many API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedClassId, selectedBoardId, selectedType, sortOption]);

  /** Fetch subjects on filter/pagination change */
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleDelete = async () => {
    if (!deleteSubject) return;
    try {
      await subjectService.delete(deleteSubject.id);
      setDeleteSubject(null);
      fetchSubjects();
    } catch (error) {
      console.error("Failed to delete subject:", error);
    }
  };

  const hasActiveFilters =
    debouncedSearchTerm ||
    selectedClassId !== "all" ||
    selectedBoardId !== "all" ||
    selectedType !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedClassId("all");
    setSelectedBoardId("all");
    setSelectedType("all");
    setSortOption("name_asc");
  };

  // Quick stats calculations
  const courseCount = subjects.filter((s) => s.is_course).length;
  const standardSubjectCount = subjects.filter((s) => !s.is_course).length;

  return (
    <div className={cn(
      "space-y-5 pb-12 w-full",
      !embedded && "max-w-7xl mx-auto"
    )}>
      {/* Header - Only show if not embedded */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Curriculum Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage your educational offerings, including subjects, classes, boards, and test series.
            </p>
          </div>
          {canAddSubject && (
            <Button
              className="bg-saBlue hover:bg-saBlueDarkHover text-white shadow-xs rounded-xl h-10 px-5 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2"
              onClick={() => navigate("/dashboard/subjects/new")}
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          )}
        </div>
      )}

      <div className="space-y-5 w-full max-w-full">
        {/* BRAND UNIFIED STATS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saBlue/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Curriculums</p>
                <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">{total}</h3>
              </div>
              <div className="h-8 w-8 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue">
                <BookOpen className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Curriculums created in system</p>
          </Card>

          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saVividOrange/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Courses</p>
                <h3 className="text-xl font-black text-saVividOrange leading-tight mt-0.5">{courseCount}</h3>
              </div>
              <div className="h-8 w-8 bg-saVividOrange/10 rounded-lg flex items-center justify-center text-saVividOrange">
                <Star className="h-4 w-4 fill-saVividOrange/20" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Full course offerings</p>
          </Card>

          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saBlue/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects</p>
                <h3 className="text-xl font-black text-saBlue leading-tight mt-0.5">{standardSubjectCount}</h3>
              </div>
              <div className="h-8 w-8 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Standard subjects</p>
          </Card>

          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Levels</p>
                <h3 className="text-xl font-black text-slate-800 leading-tight mt-0.5">{classesList.length}</h3>
              </div>
              <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                <GraduationCap className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Classes & Boards</p>
          </Card>
        </div>

        {/* SEARCH, SORTING & FILTER TOOLBAR */}
        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-2.5">
          <div className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search curriculum by name..."
                className="pl-9 h-8 border-slate-200/80 rounded-lg bg-slate-50/50 text-xs focus:bg-white focus:ring-saBlue focus:border-saBlue"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filters & Sorting */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Sort Selection */}
              <div className="flex items-center gap-1 min-w-[150px]">
                <ArrowUpDown className="h-3 w-3 text-slate-400 shrink-0" />
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="h-8 border-slate-200/80 rounded-lg bg-slate-50/50 text-xs font-medium focus:ring-saBlue">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Alphabetical: A → Z</SelectItem>
                    <SelectItem value="name_desc">Alphabetical: Z → A</SelectItem>
                    <SelectItem value="newest">Newest Designed</SelectItem>
                    <SelectItem value="oldest">Oldest Designed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Class Filter */}
              <div className="min-w-[115px]">
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-8 border-slate-200/80 rounded-lg bg-slate-50/50 text-xs font-medium focus:ring-saBlue">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classesList.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Board Filter */}
              <div className="min-w-[115px]">
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger className="h-8 border-slate-200/80 rounded-lg bg-slate-50/50 text-xs font-medium focus:ring-saBlue">
                    <SelectValue placeholder="All Boards" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Boards</SelectItem>
                    {boardsList.map((b) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type Filter */}
              <div className="min-w-[115px]">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="h-8 border-slate-200/80 rounded-lg bg-slate-50/50 text-xs font-medium focus:ring-saBlue">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="subject">Subjects Only</SelectItem>
                    <SelectItem value="course">Courses Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1 rounded-md transition-all text-slate-600",
                    viewMode === "grid" ? "bg-white shadow-xs text-saBlue font-bold" : "hover:text-slate-900"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1 rounded-md transition-all text-slate-600",
                    viewMode === "list" ? "bg-white shadow-xs text-saBlue font-bold" : "hover:text-slate-900"
                  )}
                  title="List View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Add Subject Action for Embedded View */}
              {embedded && canAddSubject && (
                <Button
                  onClick={() => navigate("/dashboard/subjects/new")}
                  className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-lg h-8 text-xs font-semibold px-3 shadow-xs shrink-0 ml-1"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Subject
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
                {debouncedSearchTerm && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                    Search: "{debouncedSearchTerm}"
                  </Badge>
                )}
                {selectedClassId !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                    Class: {classesList.find((c) => c.id.toString() === selectedClassId)?.name || selectedClassId}
                  </Badge>
                )}
                {selectedBoardId !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                    Board: {boardsList.find((b) => b.id.toString() === selectedBoardId)?.name || selectedBoardId}
                  </Badge>
                )}
                {selectedType !== "all" && (
                  <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                    Type: {selectedType}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 font-semibold"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </Card>

        {/* CURRICULUMS LIST / GRID DISPLAY */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-saBlue/20 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-saBlue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-slate-600 font-medium text-sm">Loading designed curriculums...</p>
          </div>
        ) : subjects.length === 0 ? (
          <Card className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <CardContent>
              <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No Curriculums Found</h3>
              <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4">
                {hasActiveFilters 
                  ? "No curriculums match your selected alphabetical letter or filter options."
                  : "Get started by creating your first subject/curriculum in the system."}
              </p>
              <div className="flex justify-center gap-3">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="rounded-xl text-xs font-semibold hover:border-saBlue hover:text-saBlue">
                    Clear Filters & Show All
                  </Button>
                )}
                {canAddSubject && (
                  <Button
                    className="bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-saBlue/20 rounded-xl px-4 py-2 font-semibold transition-all"
                    onClick={() => navigate("/dashboard/subjects/new")}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subject
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Counter info */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Showing {subjects.length} of {total} Designed Curriculums
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Sorted by: {sortOption === "name_asc" ? "Alphabetical (A-Z)" : sortOption === "name_desc" ? "Alphabetical (Z-A)" : sortOption === "newest" ? "Newest" : "Oldest"}
              </p>
            </div>

            {viewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full">
                {subjects.map((subject, index) => {
                  const isCourseEnded =
                    subject.is_course && subject.end_date && new Date(subject.end_date) < new Date();

                  return (
                    <Card
                      key={subject.id}
                      className="group hover:shadow-xl transition-all duration-300 overflow-hidden bg-white border border-slate-200/80 hover:border-saBlue/50 cursor-pointer rounded-2xl flex flex-col justify-between"
                      onClick={() => navigate(`/dashboard/subjects/${subject.id}`)}
                    >
                      {/* Card Header with Brand Colors */}
                      <div className={cn(
                        "h-24 relative overflow-hidden p-4 flex flex-col justify-between transition-all",
                        subject.is_course
                          ? "bg-gradient-to-br from-saBlueDarkHover via-saBlue to-saBlueLight"
                          : "bg-gradient-to-br from-saBlue via-saBlueLight to-blue-400"
                      )}>
                        <div className="absolute inset-0 bg-black/10"></div>

                        {/* Top Badges */}
                        <div className="relative z-10 flex items-center justify-between">
                          <Badge className="bg-white/20 backdrop-blur-md text-white border-0 text-[10px] px-2 py-0.5 font-bold tracking-wider">
                            #{index + 1 + (currentPage - 1) * limit}
                          </Badge>
                          <div className="flex gap-1">
                            {subject.is_course ? (
                              <Badge className="bg-saVividOrange text-white border-0 shadow-sm text-[9px] px-2 py-0.5 font-bold">
                                <Star className="h-2.5 w-2.5 mr-1 fill-white" />
                                Course
                              </Badge>
                            ) : (
                              <Badge className="bg-white/80 text-slate-800 border-0 shadow-sm text-[9px] px-2 py-0.5 font-bold">
                                Subject
                              </Badge>
                            )}
                            {isCourseEnded && (
                              <Badge className="bg-red-500 text-white border-0 shadow-sm text-[9px] px-2 py-0.5">
                                Ended
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Curriculum Name */}
                        <div className="relative z-10">
                          <h3 className="text-lg font-bold text-white drop-shadow-md line-clamp-1">
                            {subject.name}
                          </h3>
                        </div>

                        {/* Decorative circles */}
                        <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full pointer-events-none"></div>
                        <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-white/10 rounded-full pointer-events-none"></div>
                      </div>

                      <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                        {/* Class and Board Info */}
                        {/* Class and Board Info */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex gap-1.5 flex-wrap">
                            <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] px-2 py-0.5 rounded-lg font-semibold">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {subject.class?.name || "No Class"}
                            </Badge>
                            {subject.board && (
                              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] px-2 py-0.5 rounded-lg font-semibold">
                                {subject.board.name}
                              </Badge>
                            )}
                          </div>

                          {/* Pricing Badge */}
                          {(subject.price !== null || subject.actual_price !== null) && (
                            <div className="flex items-center gap-1.5">
                              {subject.actual_price && subject.price && subject.actual_price > subject.price ? (
                                <>
                                  <span className="text-[11px] text-slate-400 line-through font-semibold">
                                    {subject.currency?.symbol || '₹'}{subject.actual_price.toLocaleString()}
                                  </span>
                                  <span className="text-xs font-black text-slate-900">
                                    {subject.currency?.symbol || '₹'}{subject.price.toLocaleString()}
                                  </span>
                                  <Badge className="bg-emerald-600 text-white font-black text-[9px] px-1 py-0 border-none">
                                    {Math.round(((subject.actual_price - subject.price) / subject.actual_price) * 100)}% OFF
                                  </Badge>
                                </>
                              ) : (
                                <span className="text-xs font-black text-slate-900">
                                  {subject.currency?.symbol || '₹'}{(subject.price ?? subject.actual_price)?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                          {user?.role !== "STUDENT" ? (
                            <>
                              <div className="flex items-center gap-1.5 font-medium">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                <span>{subject._count?.enrollments || 0} students</span>
                              </div>
                              <div className="flex items-center gap-1.5 font-medium">
                                <Target className="h-3.5 w-3.5 text-slate-400" />
                                <span>{subject._count?.teacher_subject_junctions || 0} teachers</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 text-saBlue">
                              <Award className="h-4 w-4" />
                              <span className="font-bold">Start Learning</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <Button
                            variant="outline"
                            className="w-full justify-start border-slate-200 hover:bg-saBlue/10 hover:text-saBlue hover:border-saBlue/30 group/btn rounded-xl text-xs font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/subjects/${subject.id}/modules`);
                            }}
                          >
                            <BookMarked className="h-3.5 w-3.5 mr-2 group-hover/btn:scale-110 transition-transform text-saBlue" />
                            View Modules
                          </Button>

                          <Button
                            className="w-full h-9 bg-saVividOrange hover:bg-saOrangeDark text-white text-xs uppercase font-bold tracking-wider rounded-xl shadow-sm shadow-saVividOrange/25 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/subjects/${subject.id}/student-modules`);
                            }}
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                            Start Learning
                          </Button>

                          {/* Admin/Teacher Actions */}
                          {(canEditSubject || canDeleteSubject) && (
                            <div className="flex gap-2 pt-1">
                              {canEditSubject && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-8 text-[10px] uppercase font-bold tracking-wider hover:bg-saVividOrange/10 hover:text-saVividOrange hover:border-saVividOrange/30 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/dashboard/subjects/${subject.id}/edit`);
                                  }}
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                              )}
                              {canDeleteSubject && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-8 text-[10px] uppercase font-bold tracking-wider hover:bg-red-50 hover:text-red-700 hover:border-red-200 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteSubject(subject);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">#</TableHead>
                      <TableHead className="font-bold text-slate-700">Curriculum Name</TableHead>
                      <TableHead className="font-bold text-slate-700">Type</TableHead>
                      <TableHead className="font-bold text-slate-700">Class</TableHead>
                      <TableHead className="font-bold text-slate-700">Board</TableHead>
                      <TableHead className="font-bold text-slate-700">Price</TableHead>
                      <TableHead className="font-bold text-slate-700">Students</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjects.map((subject, index) => (
                      <TableRow
                        key={subject.id}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        onClick={() => navigate(`/dashboard/subjects/${subject.id}`)}
                      >
                        <TableCell className="font-bold text-slate-400 text-xs">
                          {index + 1 + (currentPage - 1) * limit}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900">{subject.name}</div>
                        </TableCell>
                        <TableCell>
                          {subject.is_course ? (
                            <Badge className="bg-saVividOrange/15 text-saVividOrange border-saVividOrange/30 text-[10px] font-bold">
                              Course
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                              Subject
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {subject.class?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {subject.board?.name || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {subject.price !== null || subject.actual_price !== null ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {subject.actual_price && subject.price && subject.actual_price > subject.price ? (
                                <>
                                  <span className="text-[11px] text-slate-400 line-through">
                                    {subject.currency?.symbol || '₹'}{subject.actual_price.toLocaleString()}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {subject.currency?.symbol || '₹'}{subject.price.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded font-bold">
                                    {Math.round(((subject.actual_price - subject.price) / subject.actual_price) * 100)}% OFF
                                  </span>
                                </>
                              ) : (
                                <span className="font-bold text-slate-900">
                                  {subject.currency?.symbol || '₹'}{(subject.price ?? subject.actual_price)?.toLocaleString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Free</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-medium">
                          {subject._count?.enrollments || 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-saBlue hover:text-saBlueDarkHover hover:bg-saBlue/10 font-semibold"
                              onClick={() => navigate(`/dashboard/subjects/${subject.id}/modules`)}
                            >
                              Modules
                            </Button>
                            {canEditSubject && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-saVividOrange hover:bg-saVividOrange/10"
                                onClick={() => navigate(`/dashboard/subjects/${subject.id}/edit`)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDeleteSubject && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteSubject(subject)}
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

            {/* PAGINATION */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4 sm:gap-0">
              <p className="text-xs text-slate-500 font-medium">
                Showing {Math.min(currentPage * limit, total)} of {total} curriculums
              </p>
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-xl text-xs border-slate-200/80 hover:border-saBlue hover:text-saBlue"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200/80 shadow-sm">
                  <span className="text-xs font-bold text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-xl text-xs border-slate-200/80 hover:border-saBlue hover:text-saBlue"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {canDeleteSubject && (
          <DeleteConfirmationModal
            open={!!deleteSubject}
            title="Delete Subject / Curriculum"
            message={
              <span>
                Are you sure you want to delete <strong>{deleteSubject?.name}</strong>? This action cannot be undone.
              </span>
            }
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleDelete}
            onCancel={() => setDeleteSubject(null)}
            onClose={() => setDeleteSubject(null)}
          />
        )}
      </div>
    </div>
  );
}
