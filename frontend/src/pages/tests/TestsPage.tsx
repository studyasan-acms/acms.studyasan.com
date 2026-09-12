import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Clock,
  FileText,
  Award,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Copy,
  Trash2,
  Play,
  Layers,
  Sparkles,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import { testService, subjectService } from "@/services/api";
import type { Test, Subject, TestType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UnifiedPageHeader from "@/components/ui/UnifiedPageHeader";
import SearchablePaginatedSelect from "@/components/ui/searchablePaginatedSelect";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";

interface FetchParams {
  user_id?: number;
  role?: string;
  subject_id?: number;
}

type TestCategoryTab = "ALL" | "MOCK" | "PRACTICE" | "ASSESSMENT" | "CERTIFICATION";
type StatusFilter = "ALL" | "ACTIVE" | "UPCOMING" | "DRAFT" | "CLOSED";
type SortField = "title" | "subject" | "status" | "questions" | "duration" | "marks" | "created_at";
type SortDirection = "asc" | "desc";

export const getEffectiveTestType = (test: Test): TestType => {
  if (test.test_type) return test.test_type;
  if (test.is_certification || test.title?.includes("[CERTIFICATION]") || test.description?.includes("[CERTIFICATION]")) {
    return "CERTIFICATION";
  }
  if (test.title?.toLowerCase().includes("practice") || test.description?.toLowerCase().includes("practice") || !test.duration_minutes || test.duration_minutes === 0) {
    return "PRACTICE";
  }
  if (test.title?.toLowerCase().includes("assessment") || test.description?.toLowerCase().includes("assessment")) {
    return "ASSESSMENT";
  }
  return "MOCK_TEST";
};

export default function TestsPage() {
  usePageTitle("Tests & Practice Sets");
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TestCategoryTab>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // Sorting States
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";

  const formatSubjectFilterLabel = (subject: any) => {
    if (!subject) return "General";
    const parts = [subject.name];
    if (subject.class?.name) parts.push(subject.class.name);
    if (subject.board?.name) parts.push(subject.board.name);
    return parts.filter(Boolean).join(" - ");
  };

  const fetchSubjects = useCallback(async () => {
    try {
      const params: any = { limit: 1000 };
      if (user?.id && user?.role) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data?.data || []);
    } catch (error) {
      console.error("❌ [TESTS_PAGE] Error fetching subjects:", error);
    }
  }, [user]);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const params: FetchParams = {};
      if (selectedSubject && selectedSubject !== "ALL") params.subject_id = parseInt(selectedSubject);
      if ((isStudent || user?.role === "TEACHER") && user?.id) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await testService.getAll(params);
      setTests(response.data || []);
    } catch (error) {
      console.error("Error fetching tests:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, user, isStudent]);

  useEffect(() => {
    fetchSubjects();
    fetchTests();
  }, [fetchSubjects, fetchTests]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, selectedSubject, statusFilter, pageSize]);

  const handleDeleteClick = (test: Test) => {
    setSelectedTest(test);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTest) return;
    try {
      await testService.delete(selectedTest.id);
      setTests(tests.filter((t) => t.id !== selectedTest.id));
      setDeleteModalOpen(false);
      setSelectedTest(null);
      toast.success("Test deleted successfully");
    } catch (error) {
      console.error("Error deleting test:", error);
      toast.error("Failed to delete test.");
    }
  };

  const handleDuplicateTest = async (test: Test) => {
    try {
      const response = await testService.duplicate(test.id);
      setTests([...tests, response.data]);
      toast.success(`Test "${response.data.title}" duplicated successfully!`);
      navigate(`/tests/${response.data.id}/edit`);
    } catch (error) {
      console.error("Error duplicating test:", error);
      toast.error("Failed to duplicate test.");
    }
  };

  const handleCopyLink = (test: Test) => {
    const link = `${window.location.origin}/certification/${test.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public test link copied to clipboard");
  };

  const getTestStatus = (test: Test) => {
    const now = new Date();
    const availableFrom = new Date(test.available_from);
    const availableUntil = new Date(test.available_until);

    if (!test.is_published) return { key: "DRAFT", label: "Draft", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" };
    if (now < availableFrom) return { key: "UPCOMING", label: "Upcoming", badgeClass: "bg-blue-50 text-[#0276D3] border-blue-200" };
    if (now > availableUntil) return { key: "CLOSED", label: "Closed", badgeClass: "bg-red-50 text-red-600 border-red-300 font-extrabold" };
    return { key: "ACTIVE", label: "Active", badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-300 font-extrabold" };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "created_at" ? "desc" : "asc");
    }
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedSubject("ALL");
    setActiveTab("ALL");
    setStatusFilter("ALL");
    setSortField("created_at");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  // Categorized counts
  const categoryCounts = useMemo(() => {
    const total = tests.length;
    let mock = 0;
    let practice = 0;
    let assessment = 0;
    let cert = 0;

    tests.forEach((t) => {
      const type = getEffectiveTestType(t);
      if (type === "CERTIFICATION") cert++;
      else if (type === "PRACTICE") practice++;
      else if (type === "ASSESSMENT") assessment++;
      else mock++;
    });

    return { ALL: total, MOCK: mock, PRACTICE: practice, ASSESSMENT: assessment, CERTIFICATION: cert };
  }, [tests]);

  // Filtered and Sorted tests
  const processedTests = useMemo(() => {
    let result = [...tests];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => {
        const title = t.title?.toLowerCase() || "";
        const desc = t.description?.toLowerCase() || "";
        const subject = t.subject?.name?.toLowerCase() || "";
        const series = t.test_series?.title?.toLowerCase() || "";
        const className = (t.subject as any)?.class?.name?.toLowerCase() || "";
        const board = (t.subject as any)?.board?.name?.toLowerCase() || "";
        return (
          title.includes(q) ||
          desc.includes(q) ||
          subject.includes(q) ||
          series.includes(q) ||
          className.includes(q) ||
          board.includes(q)
        );
      });
    }


    // Tab Filter
    if (activeTab !== "ALL") {
      result = result.filter((t) => {
        const type = getEffectiveTestType(t);
        if (activeTab === "MOCK") return type === "MOCK_TEST";
        if (activeTab === "PRACTICE") return type === "PRACTICE";
        if (activeTab === "ASSESSMENT") return type === "ASSESSMENT";
        if (activeTab === "CERTIFICATION") return type === "CERTIFICATION";
        return true;
      });
    }

    // Status Filter
    if (statusFilter !== "ALL") {
      result = result.filter((t) => {
        const status = getTestStatus(t);
        return status.key === statusFilter;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortField === "subject") {
        const subA = a.subject?.name || a.test_series?.title || "General";
        const subB = b.subject?.name || b.test_series?.title || "General";
        comparison = subA.localeCompare(subB);
      } else if (sortField === "status") {
        const statA = getTestStatus(a).label;
        const statB = getTestStatus(b).label;
        comparison = statA.localeCompare(statB);
      } else if (sortField === "questions") {
        const qA = a._count?.questions || (a.questions?.length || 0);
        const qB = b._count?.questions || (b.questions?.length || 0);
        comparison = qA - qB;
      } else if (sortField === "duration") {
        comparison = (a.duration_minutes || 0) - (b.duration_minutes || 0);
      } else if (sortField === "marks") {
        comparison = (a.total_marks || 0) - (b.total_marks || 0);
      } else if (sortField === "created_at") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = dateA - dateB;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tests, searchQuery, activeTab, statusFilter, sortField, sortDirection]);

  // Pagination calculation
  const totalCount = processedTests.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedTests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedTests.slice(startIndex, startIndex + pageSize);
  }, [processedTests, currentPage, pageSize]);

  const hasActiveFilters = searchQuery !== "" || selectedSubject !== "ALL" || activeTab !== "ALL" || statusFilter !== "ALL";

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <UnifiedPageHeader
        title="Tests & Practice Sets"
        subtitle="Access chapter practice sets, full-length mock tests, assessments, and certifications in one place."
        icon={FileText}
        badge={`${categoryCounts.ALL} Total Tests`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {isTeacherOrAdmin && (
              <Button
                className="bg-gradient-to-r from-saBlue to-[#025AA3] hover:from-[#025AA3] hover:to-saBlue text-white shadow-md shadow-saBlue/20 rounded-xl h-10 sm:h-11 px-5 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                onClick={() => navigate("/tests/create")}
              >
                <Plus className="w-4 h-4" />
                Create Test
              </Button>
            )}
            {isStudent && (
              <Button
                variant="outline"
                className="border-saBlue text-saBlue hover:bg-saOrangeSubtle hover:text-saOrangeDark hover:border-saVividOrange rounded-xl h-10 sm:h-11 px-5 font-bold text-xs uppercase tracking-wider transition-all w-full sm:w-auto flex items-center gap-1.5"
                onClick={() => navigate("/tests/my-results")}
              >
                <Award className="w-4 h-4" />
                My Test Results
              </Button>
            )}
          </div>
        }
      />

      {/* CATEGORY SELECTOR & FILTER TOOLBAR - Strict StudyAsan Theme */}
      <div className="bg-[#FFF8F2] p-4 rounded-2xl sm:rounded-3xl border border-orange-200/80 shadow-xs space-y-3.5">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "ALL"
                ? "bg-gradient-to-r from-saBlue to-[#025AA3] text-white shadow-sm ring-1 ring-saVividOrange/50"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-saOrangeSubtle/40 hover:text-saOrangeDark"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Tests</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "ALL" ? "bg-saVividOrange text-white shadow-xs" : "bg-slate-100 text-slate-700"
              }`}
            >
              {categoryCounts.ALL}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("MOCK")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "MOCK"
                ? "bg-gradient-to-r from-saBlue to-[#025AA3] text-white shadow-sm ring-1 ring-saVividOrange/50"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-saOrangeSubtle/40 hover:text-saOrangeDark"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mock Tests</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "MOCK" ? "bg-saVividOrange text-white shadow-xs" : "bg-slate-100 text-slate-700"
              }`}
            >
              {categoryCounts.MOCK}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("PRACTICE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "PRACTICE"
                ? "bg-gradient-to-r from-saBlue to-[#025AA3] text-white shadow-sm ring-1 ring-saVividOrange/50"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-saOrangeSubtle/40 hover:text-saOrangeDark"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Practice Sets</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "PRACTICE" ? "bg-saVividOrange text-white shadow-xs" : "bg-slate-100 text-slate-700"
              }`}
            >
              {categoryCounts.PRACTICE}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ASSESSMENT")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "ASSESSMENT"
                ? "bg-gradient-to-r from-saBlue to-[#025AA3] text-white shadow-sm ring-1 ring-saVividOrange/50"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-saOrangeSubtle/40 hover:text-saOrangeDark"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Assessments</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "ASSESSMENT" ? "bg-saVividOrange text-white shadow-xs" : "bg-slate-100 text-slate-700"
              }`}
            >
              {categoryCounts.ASSESSMENT}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("CERTIFICATION")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "CERTIFICATION"
                ? "bg-gradient-to-r from-saBlue to-[#025AA3] text-white shadow-sm ring-1 ring-saVividOrange/50"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-saOrangeSubtle/40 hover:text-saOrangeDark"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Certifications</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "CERTIFICATION" ? "bg-saVividOrange text-white shadow-xs" : "bg-slate-100 text-slate-700"
              }`}
            >
              {categoryCounts.CERTIFICATION}
            </span>
          </button>
        </div>

        {/* Search, Subject & Status Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tests by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-orange-200/80 bg-white focus:bg-white text-xs focus-visible:ring-saVividOrange"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <SearchablePaginatedSelect
              value={selectedSubject}
              onValueChange={setSelectedSubject}
              placeholder="Filter by Subject"
              searchPlaceholder="Search subject..."
              triggerClassName="h-10 rounded-xl border-orange-200/80 bg-white text-xs"
              options={[
                { value: "ALL", label: "All Subjects" },
                ...subjects.map((subject) => ({
                  value: subject.id.toString(),
                  label: formatSubjectFilterLabel(subject),
                  searchText: `${subject.name} ${subject.class?.name || ""} ${subject.board?.name || ""}`,
                })),
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl border-orange-200/80 bg-white text-xs">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active / Published</SelectItem>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="DRAFT">Draft / Unpublished</SelectItem>
                <SelectItem value="CLOSED">Closed / Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Secondary Bar with Counter & Pagination Size */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-orange-200/60 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>
              Showing <span className="font-bold text-slate-800">{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
              <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalCount)}</span> of{" "}
              <span className="font-bold text-slate-800">{totalCount}</span> tests
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-saVividOrange hover:underline font-bold flex items-center gap-1 ml-2"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Per Page:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-18 rounded-lg text-xs border-orange-200/80 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tests Table & Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading tests...</p>
        </div>
      ) : paginatedTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No tests found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {hasActiveFilters
              ? "No tests match your filter criteria. Try clearing filters."
              : "There are no tests in this category yet."}
          </p>
          {hasActiveFilters ? (
            <Button
              onClick={resetAllFilters}
              variant="outline"
              className="rounded-xl text-xs font-bold mt-4 border-slate-200"
            >
              Clear All Filters
            </Button>
          ) : isTeacherOrAdmin ? (
            <Button
              className="bg-[#0276D3] text-white hover:bg-[#015bb5] font-bold rounded-xl text-xs mt-4"
              onClick={() => navigate("/tests/create")}
            >
              Create a new test
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-50/70 border-b border-orange-200/80">
                  {/* Test Title Header */}
                  <TableHead
                    className="w-[340px] font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-saVividOrange"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-1.5">
                      Test Title & Type
                      {sortField === "title" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Subject Header */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-saVividOrange"
                    onClick={() => handleSort("subject")}
                  >
                    <div className="flex items-center gap-1.5">
                      Subject / Series
                      {sortField === "subject" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-saVividOrange" /> : <ArrowDown className="w-3.5 h-3.5 text-saVividOrange" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Status Header */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-saVividOrange"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      {sortField === "status" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-saVividOrange" /> : <ArrowDown className="w-3.5 h-3.5 text-saVividOrange" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Questions Header */}
                  <TableHead
                    className="text-center font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-saVividOrange"
                    onClick={() => handleSort("questions")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Questions
                      {sortField === "questions" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-saVividOrange" /> : <ArrowDown className="w-3.5 h-3.5 text-saVividOrange" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Duration Header */}
                  <TableHead
                    className="text-center font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-saVividOrange"
                    onClick={() => handleSort("duration")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Duration
                      {sortField === "duration" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-saVividOrange" /> : <ArrowDown className="w-3.5 h-3.5 text-saVividOrange" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Marks Header */}
                  <TableHead
                    className="text-center font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-saVividOrange"
                    onClick={() => handleSort("marks")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Marks
                      {sortField === "marks" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-saVividOrange" /> : <ArrowDown className="w-3.5 h-3.5 text-saVividOrange" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Created On Header */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-saVividOrange"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-1.5">
                      Created On
                      {sortField === "created_at" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-saVividOrange" /> : <ArrowDown className="w-3.5 h-3.5 text-saVividOrange" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Action Header */}
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-700">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTests.map((test) => {
                  const status = getTestStatus(test);
                  const effectiveType = getEffectiveTestType(test);
                  const qCount = test._count?.questions ?? (test.questions?.length || 0);

                  return (
                    <TableRow
                      key={test.id}
                      className="cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                      onClick={() => navigate(`/tests/${test.id}`)}
                    >
                      <TableCell className="font-medium py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-900 leading-tight hover:text-[#0276D3] transition-colors">
                            {test.title}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block">
                              {effectiveType === "MOCK_TEST" && "Mock Test"}
                              {effectiveType === "PRACTICE" && "Practice Set"}
                              {effectiveType === "ASSESSMENT" && "Assessment"}
                              {effectiveType === "CERTIFICATION" && "Certification"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-slate-600">
                        {test.subject?.name ? (
                          <div className="font-semibold text-slate-800">{formatSubjectFilterLabel(test.subject)}</div>
                        ) : test.test_series?.title ? (
                          <div className="font-semibold text-slate-800">{test.test_series.title}</div>
                        ) : (
                          <span className="text-slate-400">General</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </TableCell>

                      <TableCell className="text-center font-bold text-xs text-slate-800">
                        {qCount}
                      </TableCell>

                      <TableCell className="text-center text-xs font-semibold text-slate-700">
                        {test.duration_minutes > 0 ? `${test.duration_minutes}m` : "Unlimited"}
                      </TableCell>

                      <TableCell className="text-center text-xs font-bold text-slate-900">
                        {test.total_marks}
                      </TableCell>

                      <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                        {test.created_at ? (
                          <span className="font-semibold text-slate-700">
                            {new Date(test.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isStudent && (
                            <Button
                              size="sm"
                              className={
                                effectiveType === "PRACTICE"
                                  ? "h-8 px-3 rounded-xl text-xs font-bold bg-saVividOrange hover:bg-saOrangeDark text-white"
                                  : "h-8 px-3 rounded-xl text-xs font-bold bg-[#0276D3] hover:bg-[#015bb5] text-white"
                              }
                              onClick={() => navigate(`/tests/${test.id}`)}
                            >
                              <Play className="w-3.5 h-3.5 mr-1" />
                              {effectiveType === "PRACTICE" ? "Practice" : "Attempt"}
                            </Button>
                          )}

                          {isTeacherOrAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                                onClick={() => navigate(`/tests/${test.id}`)}
                              >
                                Manage
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-lg">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                  <DropdownMenuLabel className="text-[11px] font-bold uppercase text-slate-400">
                                    Options
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}`)}>
                                    <Eye className="w-4 h-4 mr-2 text-slate-500" /> View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}/edit`)}>
                                    <Edit className="w-4 h-4 mr-2 text-slate-500" /> Edit Test
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateTest(test)}>
                                    <Copy className="w-4 h-4 mr-2 text-slate-500" /> Duplicate
                                  </DropdownMenuItem>
                                  {effectiveType === "CERTIFICATION" && (
                                    <DropdownMenuItem onClick={() => handleCopyLink(test)}>
                                      <Copy className="w-4 h-4 mr-2 text-[#0276D3]" /> Copy Public Link
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(test)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Test
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

          {/* Pagination Footer Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span>
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && page - prev > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {hasGap && <span className="px-1 text-slate-300 text-xs">...</span>}
                        <Button
                          size="sm"
                          variant={currentPage === page ? "default" : "outline"}
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${
                            currentPage === page
                              ? "bg-[#0276D3] text-white border-[#0276D3] shadow-xs"
                              : "border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedTest(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Test"
        message={`Are you sure you want to delete "${selectedTest?.title}"? This action cannot be undone.`}
      />
    </div>
  );
}
