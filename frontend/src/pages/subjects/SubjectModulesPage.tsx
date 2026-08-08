import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  ArrowLeft,
  Clock,
  FileText,
  ChevronRight,
  MoreVertical,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  Search,
  Filter,
  X,
  ArrowUpDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { moduleService, subjectService, progressService } from "@/services/api";
import type { Module, Subject, StudentModuleProgress } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SubjectModulesPage() {
  usePageTitle("Subject Curriculum Modules");
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<StudentModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Filter & Sort States
  const [searchTerm, setSearchTerm] = useState("");
  const [contentFilter, setContentFilter] = useState("all"); // 'all' | 'has_content' | 'no_content'
  const [sortOption, setSortOption] = useState("order_asc"); // 'order_asc' | 'title_asc' | 'title_desc' | 'duration_desc' | 'duration_asc'
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (subjectId) {
      loadData();
    }
  }, [subjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectRes, modulesRes, progressRes] = await Promise.all([
        subjectService.getById(parseInt(subjectId!)),
        moduleService.getModulesBySubject(parseInt(subjectId!)),
        user?.role === "STUDENT"
          ? progressService.getStudentProgress(user.id, parseInt(subjectId!))
          : Promise.resolve({ success: true, data: [] as StudentModuleProgress[] }),
      ]);

      setSubject(subjectRes.data);
      setModules(Array.isArray(modulesRes.data) ? modulesRes.data : []);

      if (user?.role === "STUDENT") {
        setProgress(Array.isArray(progressRes.data) ? progressRes.data : []);
      }

      setError(null);
    } catch (err: any) {
      console.error("Error loading modules:", err);
      setError(err.response?.data?.message || "Failed to load module data");
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this module? This will also delete all associated content."
      )
    ) {
      return;
    }

    try {
      await moduleService.deleteModule(parseInt(subjectId!), moduleId);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete module");
    }
  };

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  const getModuleProgress = (moduleId: number) => {
    return progress.find((p) => p.module_id === moduleId);
  };

  const isModuleCompleted = (moduleId: number) => {
    const moduleProgress = getModuleProgress(moduleId);
    return moduleProgress?.is_completed || false;
  };

  // Filter & Sort Logic
  const filteredModules = [...modules]
    .filter((m) => {
      const matchSearch =
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.description || "").toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      const contentCount = m.content?.length || 0;
      if (contentFilter === "has_content") return contentCount > 0;
      if (contentFilter === "no_content") return contentCount === 0;

      return true;
    })
    .sort((a, b) => {
      if (sortOption === "order_asc") return a.order - b.order;
      if (sortOption === "title_asc") return a.title.localeCompare(b.title);
      if (sortOption === "title_desc") return b.title.localeCompare(a.title);
      if (sortOption === "duration_desc") return b.estimated_time_minutes - a.estimated_time_minutes;
      if (sortOption === "duration_asc") return a.estimated_time_minutes - b.estimated_time_minutes;
      return a.order - b.order;
    });

  const clearFilters = () => {
    setSearchTerm("");
    setContentFilter("all");
    setSortOption("order_asc");
  };

  const hasActiveFilters =
    searchTerm || contentFilter !== "all" || sortOption !== "order_asc";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Learning Modules...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Card className="border-red-100 bg-red-50/50 rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Error Loading Modules</h3>
            <p className="text-xs text-slate-500 mb-6">{error}</p>
            <Button
              onClick={() => navigate("/dashboard/subjects")}
              className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl px-6 h-9 font-bold text-xs uppercase"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Subjects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* COMPACT BRAND HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/subjects/${subjectId}`}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-saBlue hover:bg-saBlue/10 transition-all shrink-0"
            title="Back to Subject"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                {subject?.name}
              </h1>
              <Badge className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                {modules.length} {modules.length === 1 ? "Module" : "Modules"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-xl">
              {isTeacher
                ? "Structure and manage course modules, curriculum, and learning materials."
                : "Study modules and track your progress in this course."}
            </p>
          </div>
        </div>

        {isTeacher && (
          <Button
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/create`)}
            className="h-9 px-4 bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Create Module
          </Button>
        )}
      </div>

      {/* SEARCH, SORT & MULTI-FILTER TOOLBAR */}
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search module title or summary..."
              className="pl-10 h-10 border-slate-200/80 rounded-xl bg-slate-50/50 focus:bg-white text-sm focus:ring-saBlue focus:border-saBlue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Content Filter */}
            <div className="min-w-[130px]">
              <Select value={contentFilter} onValueChange={setContentFilter}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="All Content" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  <SelectItem value="has_content">With Assets</SelectItem>
                  <SelectItem value="no_content">Empty Modules</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Selection */}
            <div className="flex items-center gap-1.5 min-w-[170px]">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_asc">Module Sequence (1 → N)</SelectItem>
                  <SelectItem value="title_asc">Title: A → Z</SelectItem>
                  <SelectItem value="title_desc">Title: Z → A</SelectItem>
                  <SelectItem value="duration_desc">Duration: High → Low</SelectItem>
                  <SelectItem value="duration_asc">Duration: Low → High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-all text-slate-600",
                  viewMode === "list" ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                )}
                title="Tabular List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all text-slate-600",
                  viewMode === "grid" ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                )}
                title="Grid Card View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
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
              {contentFilter !== "all" && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Assets: {contentFilter === "has_content" ? "With Assets" : "Empty Only"}
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

      {/* MODULES CONTENT DISPLAY */}
      {!Array.isArray(filteredModules) || filteredModules.length === 0 ? (
        <Card className="py-12 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <CardContent>
            <div className="w-14 h-14 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-saBlue">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No Modules Found</h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filter options"
                : "Create your first curriculum module to get started"}
            </p>
            {isTeacher && (
              <Button
                onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/create`)}
                className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl px-5 h-9 font-bold text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Module
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* COMPACT TABULAR LIST VIEW */
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-bold text-slate-700 text-xs w-16 text-center">#</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs min-w-[220px]">Module Title</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Duration</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Resources</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-700 text-xs pr-6 min-w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModules.map((module, index) => {
                const isCompleted = user?.role === "STUDENT" && isModuleCompleted(module.module_id);
                const hasDescription = module.description && module.description.trim() !== module.title.trim();

                return (
                  <TableRow
                    key={module.module_id}
                    className="hover:bg-slate-50/80 border-b border-slate-100 transition-colors"
                  >
                    <TableCell className="text-center font-bold text-saBlue text-xs py-3">
                      {(index + 1).toString().padStart(2, "0")}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {module.title}
                      </div>
                      {hasDescription && (
                        <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">
                          {module.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-saBlue" />
                        <span>{module.estimated_time_minutes} min</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <FileText className="w-3.5 h-3.5 text-saVividOrange" />
                        <span>{module.content?.length || 0} Assets</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      {isCompleted ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] font-bold px-2 py-0.5">
                          <CheckCircle className="w-3 h-3 mr-1" /> Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-semibold px-2 py-0.5">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-saBlue hover:text-saBlueDarkHover hover:bg-saBlue/10 font-semibold rounded-lg"
                          onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`)}
                          title="Preview student study view"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Preview
                        </Button>

                        {isTeacher && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-saVividOrange hover:bg-saVividOrange/10 font-semibold rounded-lg"
                            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/edit`)}
                            title="Edit configuration"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                        )}

                        {isTeacher && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDeleteModule(module.module_id)}
                            title="Delete Module"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredModules.map((module, index) => {
            const isCompleted = user?.role === "STUDENT" && isModuleCompleted(module.module_id);
            const hasDescription = module.description && module.description.trim() !== module.title.trim();

            return (
              <Card
                key={module.module_id}
                className="group hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden bg-white border border-slate-200/80 hover:border-saBlue/50 flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge className="bg-saBlue/10 text-saBlue border-0 text-[10px] font-bold">
                        Module {(index + 1).toString().padStart(2, "0")}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-saBlue rounded-lg"
                          onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`)}
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {isTeacher && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-saVividOrange rounded-lg"
                            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/edit`)}
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isTeacher && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-lg"
                            onClick={() => handleDeleteModule(module.module_id)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 group-hover:text-saBlue transition-colors line-clamp-1">
                      {module.title}
                    </h3>
                    {hasDescription && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                        {module.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-saBlue" />
                      <span>{module.estimated_time_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-saVividOrange" />
                      <span>{module.content?.length || 0} Assets</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}