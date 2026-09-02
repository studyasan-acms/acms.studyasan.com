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
  BookOpen,
  Play,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { testService, subjectService } from "@/services/api";
import type { Test, Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import SearchablePaginatedSelect from "@/components/ui/searchablePaginatedSelect";
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

type TestCategoryTab = "ALL" | "MOCK" | "PRACTICE" | "CERTIFICATION";

export default function TestsPage() {
  usePageTitle("Tests & Practice Sets");
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TestCategoryTab>("ALL");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";

  const formatSubjectFilterLabel = (subject: Subject) => {
    const classPart = subject.class?.name ? ` (${subject.class.name})` : "";
    const boardPart = subject.board?.name ? ` [${subject.board.name}]` : "";
    return `${subject.name}${classPart}${boardPart}`;
  };

  const fetchSubjects = useCallback(async () => {
    try {
      const params: any = { limit: 1000 };
      if (user?.id && user?.role) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data.data);
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
      setTests(response.data);
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
      toast.success(`Test "${response.data.title}" created successfully!`);
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

  const isCertificationTest = (test: Test) => {
    return (
      test.is_certification ||
      test.title.includes("[CERTIFICATION]") ||
      test.description?.includes("[CERTIFICATION]")
    );
  };

  const isPracticeSet = (test: Test) => {
    return (
      test.title.toLowerCase().includes("practice") ||
      test.description?.toLowerCase().includes("practice") ||
      !test.duration_minutes ||
      test.duration_minutes === 0
    );
  };

  const getTestStatus = (test: Test) => {
    const now = new Date();
    const availableFrom = new Date(test.available_from);
    const availableUntil = new Date(test.available_until);

    if (!test.is_published) return { label: "Draft", color: "bg-gray-500 hover:bg-gray-600" };
    if (now < availableFrom) return { label: "Upcoming", color: "bg-blue-500 hover:bg-blue-600" };
    if (now > availableUntil) return { label: "Closed", color: "bg-red-500 hover:bg-red-600" };
    return { label: "Active", color: "bg-green-500 hover:bg-green-600" };
  };

  // Categorized counts
  const categoryCounts = useMemo(() => {
    const total = tests.length;
    let mock = 0;
    let practice = 0;
    let cert = 0;

    tests.forEach((t) => {
      if (isCertificationTest(t)) {
        cert++;
      } else if (isPracticeSet(t)) {
        practice++;
      } else {
        mock++;
      }
    });

    return { ALL: total, MOCK: mock, PRACTICE: practice, CERTIFICATION: cert };
  }, [tests]);

  // Filtered tests based on tab, search query, and subject
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      // Search text match
      const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Category filter match
      if (activeTab === "MOCK") {
        return !isCertificationTest(test) && !isPracticeSet(test);
      }
      if (activeTab === "PRACTICE") {
        return isPracticeSet(test);
      }
      if (activeTab === "CERTIFICATION") {
        return isCertificationTest(test);
      }
      return true;
    });
  }, [tests, searchQuery, activeTab]);

  return (
    <div className="space-y-5 p-1 sm:p-4 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Mock Tests & Practice Sets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access chapter practice sets, full-length mock tests, and assessments in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isTeacherOrAdmin && (
            <Button
              className="bg-saBlue hover:bg-saBlueDark text-white flex items-center justify-center shadow-md shadow-saBlue/20 rounded-xl h-11 px-5 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 w-full sm:w-auto"
              onClick={() => navigate("/tests/create")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          )}
          {isStudent && (
            <Button
              variant="outline"
              className="border-saBlue text-saBlue hover:bg-blue-50 flex items-center justify-center rounded-xl h-11 px-5 font-bold text-xs uppercase tracking-wider w-full sm:w-auto"
              onClick={() => navigate("/tests/my-results")}
            >
              <Award className="w-4 h-4 mr-2" />
              My Test Results
            </Button>
          )}
        </div>
      </div>

      {/* CATEGORY SELECTOR & FILTER TOOLBAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Tests</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {categoryCounts.ALL}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("MOCK")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
              activeTab === "MOCK"
                ? "bg-blue-50 text-saBlue border-blue-200 ring-2 ring-saBlue/20 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-saBlue" />
            <span>Mock Tests</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "MOCK" ? "bg-saBlue/10 text-saBlue" : "bg-slate-100 text-slate-600"
              }`}
            >
              {categoryCounts.MOCK}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("PRACTICE")}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
              activeTab === "PRACTICE"
                ? "bg-orange-50 text-orange-700 border-orange-200 ring-2 ring-orange-500/20 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Practice Sets</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === "PRACTICE" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {categoryCounts.PRACTICE}
            </span>
          </button>

          {categoryCounts.CERTIFICATION > 0 && (
            <button
              onClick={() => setActiveTab("CERTIFICATION")}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                activeTab === "CERTIFICATION"
                  ? "bg-purple-50 text-purple-700 border-purple-200 ring-2 ring-purple-500/20 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Certifications</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "CERTIFICATION" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {categoryCounts.CERTIFICATION}
              </span>
            </button>
          )}
        </div>

        {/* Search & Subject Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tests by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm focus-visible:ring-saBlue"
            />
          </div>
          <div className="w-full sm:w-72">
            <SearchablePaginatedSelect
              value={selectedSubject}
              onValueChange={setSelectedSubject}
              placeholder="Filter by Subject"
              searchPlaceholder="Search subject..."
              triggerClassName="h-11 rounded-xl border-slate-200"
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
        </div>
      </div>

      {/* Tests Table & Listing */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-3xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading tests...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-700">No tests found</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery || selectedSubject !== "ALL"
              ? "No tests match your filters. Try adjusting your search."
              : "There are no tests in this category yet."}
          </p>
          {isTeacherOrAdmin && (
            <Button
              className="bg-saBlue text-white hover:bg-saBlueDark font-semibold rounded-xl text-xs mt-4"
              onClick={() => navigate("/tests/create")}
            >
              Create a new test
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="w-[320px] font-bold text-xs uppercase tracking-wider text-slate-700">
                    Test Title & Type
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Subject
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Status
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-slate-700">
                    Questions
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-slate-700">
                    Duration
                  </TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-slate-700">
                    Marks
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-700">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => {
                  const status = getTestStatus(test);
                  const isPractice = isPracticeSet(test);
                  const isCert = isCertificationTest(test);

                  return (
                    <TableRow
                      key={test.id}
                      className="cursor-pointer hover:bg-blue-50/30 transition-colors border-b border-slate-100"
                      onClick={() => navigate(`/tests/${test.id}`)}
                    >
                      <TableCell className="font-medium py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 leading-tight hover:text-saBlue transition-colors">
                              {test.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isPractice ? (
                              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                                Practice Set
                              </span>
                            ) : isCert ? (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                Certification
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-saBlue bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                Mock Test
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {new Date(test.available_from).toLocaleDateString()} -{" "}
                              {new Date(test.available_until).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-semibold bg-slate-100 text-slate-700 border border-slate-200 text-xs"
                        >
                          {test.subject?.name || test.test_series?.title || "General"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge className={`${status.color} border-none text-white whitespace-nowrap shadow-xs font-semibold text-xs`}>
                          {status.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-700 text-xs font-medium">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{test._count?.questions || 0} Qs</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-700 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{test.duration_minutes || 0}m</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-slate-700 text-xs font-bold">
                          <Award className="w-3.5 h-3.5 text-orange-500" />
                          <span>{test.total_marks}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/tests/${test.id}`)}
                            className="h-8 rounded-lg bg-slate-100 hover:bg-saBlue hover:text-white text-slate-700 text-xs font-bold transition-all px-3 shadow-2xs"
                          >
                            {isPractice ? "Practice" : "View"}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-saBlue hover:bg-blue-50 rounded-lg"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[170px] rounded-xl">
                              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}`)}>
                                <Eye className="mr-2 h-4 w-4 text-saBlue" /> View Details
                              </DropdownMenuItem>
                              {isCert && (
                                <DropdownMenuItem onClick={() => handleCopyLink(test)}>
                                  <Copy className="mr-2 h-4 w-4 text-purple-600" /> Copy Public Link
                                </DropdownMenuItem>
                              )}
                              {isTeacherOrAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => navigate(`/tests/${test.id}/edit`)}>
                                    <Edit className="mr-2 h-4 w-4 text-slate-600" /> Edit Test
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicateTest(test)}>
                                    <Copy className="mr-2 h-4 w-4 text-blue-600" /> Duplicate Test
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={() => handleDeleteClick(test)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title="Delete Test"
        message={
          selectedTest ? (
            <span className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-900">{selectedTest.title}</span>? This action cannot be undone.
            </span>
          ) : undefined
        }
        footer={
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              Delete
            </Button>
          </div>
        }
      />
    </div>
  );
}
