import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Award,
} from "lucide-react";
import { testService, testAttemptService } from "@/services/api";
import type { Test, TestAttempt } from "@/types";
import { Button } from "@/components/ui/button";
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
import { usePageTitle } from "@/hooks/usePageTitle";

type TypeFilter = "all" | "real" | "practice";
type StatusFilter = "ALL" | "GRADED" | "PENDING" | "IN_PROGRESS";
type OutcomeFilter = "ALL" | "PASSED" | "FAILED";
type SortField = "student" | "type" | "status" | "score" | "submitted";
type SortDirection = "asc" | "desc";

export default function TestAttemptsListPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  usePageTitle(test ? `Test Attempts: ${test.title}` : "Test Attempts");

  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("ALL");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("submitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    if (testId) {
      fetchTest();
      fetchAttempts();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      const response = await testService.getById(parseInt(testId!));
      setTest(response.data);
    } catch (error) {
      console.error("Error fetching test:", error);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getTestAttempts(parseInt(testId!));
      setAttempts(response.data || []);
    } catch (error) {
      console.error("Error fetching attempts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, statusFilter, outcomeFilter, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("ALL");
    setOutcomeFilter("ALL");
    setSortField("submitted");
    setSortDirection("desc");
    setCurrentPage(1);
  };

  // KPI Metrics
  const totalAttemptsCount = attempts.length;
  const realAttemptsCount = attempts.filter((a) => !a.is_practice).length;
  const practiceAttemptsCount = attempts.filter((a) => a.is_practice).length;
  const gradedCount = attempts.filter((a) => a.is_graded).length;
  const pendingCount = attempts.filter((a) => a.submitted_at && !a.is_graded).length;

  // Filter & Sort
  const processedAttempts = useMemo(() => {
    let result = [...attempts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const name = a.student?.user?.name?.toLowerCase() || "";
        const email = a.student?.user?.email?.toLowerCase() || "";
        return name.includes(q) || email.includes(q);
      });
    }

    // Type filter
    if (typeFilter === "real") {
      result = result.filter((a) => !a.is_practice);
    } else if (typeFilter === "practice") {
      result = result.filter((a) => a.is_practice);
    }

    // Status filter
    if (statusFilter === "GRADED") {
      result = result.filter((a) => a.is_graded);
    } else if (statusFilter === "PENDING") {
      result = result.filter((a) => a.submitted_at && !a.is_graded);
    } else if (statusFilter === "IN_PROGRESS") {
      result = result.filter((a) => !a.submitted_at);
    }

    // Outcome filter
    if (outcomeFilter === "PASSED") {
      result = result.filter((a) => a.is_graded && a.is_passed);
    } else if (outcomeFilter === "FAILED") {
      result = result.filter((a) => a.is_graded && !a.is_passed);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "student") {
        const nameA = a.student?.user?.name || "";
        const nameB = b.student?.user?.name || "";
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === "type") {
        comparison = (a.is_practice ? 1 : 0) - (b.is_practice ? 1 : 0);
      } else if (sortField === "status") {
        const statA = a.is_graded ? "Graded" : a.submitted_at ? "Pending" : "In Progress";
        const statB = b.is_graded ? "Graded" : b.submitted_at ? "Pending" : "In Progress";
        comparison = statA.localeCompare(statB);
      } else if (sortField === "score") {
        const scoreA = a.is_graded ? (a.score ?? 0) : -1;
        const scoreB = b.is_graded ? (b.score ?? 0) : -1;
        comparison = scoreA - scoreB;
      } else if (sortField === "submitted") {
        const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        comparison = timeA - timeB;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [attempts, searchQuery, typeFilter, statusFilter, outcomeFilter, sortField, sortDirection]);

  // Pagination
  const totalCount = processedAttempts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedAttempts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedAttempts.slice(startIndex, startIndex + pageSize);
  }, [processedAttempts, currentPage, pageSize]);

  const hasActiveFilters = searchQuery !== "" || typeFilter !== "all" || statusFilter !== "ALL" || outcomeFilter !== "ALL";

  return (
    <div className="space-y-5 p-1 sm:p-4 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/tests/${testId}`)}
            className="h-9 w-9 rounded-xl text-slate-500 hover:text-[#0276D3] hover:bg-blue-50 shrink-0"
            title="Back to Test Details"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Test Attempts
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              {test?.title || "Loading test details..."}
            </p>
          </div>
        </div>

        {test && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
              Total Marks: <span className="text-slate-900">{test.total_marks}</span>
            </span>
            <span className="text-xs font-bold text-[#0276D3] bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
              Pass Marks: <span>{test.passing_marks}</span>
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards - StudyAsan Branding */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0276D3] flex items-center justify-center font-bold shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{totalAttemptsCount}</p>
          </div>
        </div>

        {/* Real */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0276D3] flex items-center justify-center font-bold shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Exam</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{realAttemptsCount}</p>
          </div>
        </div>

        {/* Practice */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#eca209] flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Practice</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{practiceAttemptsCount}</p>
          </div>
        </div>

        {/* Graded */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Graded</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{gradedCount}</p>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Search & Select Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50/60 focus:bg-white text-xs focus-visible:ring-[#0276D3]"
            />
          </div>

          {/* Type Filter */}
          <div>
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="Attempt Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Attempt Types</SelectItem>
                <SelectItem value="real">Official Exam Attempts</SelectItem>
                <SelectItem value="practice">Practice Set Attempts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grading Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="Grading Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Grading Statuses</SelectItem>
                <SelectItem value="GRADED">Graded</SelectItem>
                <SelectItem value="PENDING">Pending Teacher Review</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress / Unsubmitted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Outcome Filter */}
          <div>
            <Select value={outcomeFilter} onValueChange={(v: any) => setOutcomeFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="Result Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Outcomes</SelectItem>
                <SelectItem value="PASSED">Passed</SelectItem>
                <SelectItem value="FAILED">Needs Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Counter & Per Page Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>
              Showing <span className="font-bold text-slate-800">{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{" "}
              <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalCount)}</span> of{" "}
              <span className="font-bold text-slate-800">{totalCount}</span> attempts
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-[#0276D3] hover:underline font-bold flex items-center gap-1 ml-2"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Per Page:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-8 w-18 rounded-lg text-xs border-slate-200">
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

      {/* Attempts Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading attempts...</p>
        </div>
      ) : paginatedAttempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No attempts found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {hasActiveFilters
              ? "No student attempts match your active filters."
              : "No students have attempted this test yet."}
          </p>
          {hasActiveFilters && (
            <Button
              onClick={resetAllFilters}
              variant="outline"
              className="rounded-xl text-xs font-bold mt-4 border-slate-200"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  {/* Student */}
                  <TableHead
                    className="w-[280px] font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("student")}
                  >
                    <div className="flex items-center gap-1.5">
                      Student
                      {sortField === "student" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Type */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center gap-1.5">
                      Format
                      {sortField === "type" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Status */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1.5">
                      Status
                      {sortField === "status" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Score */}
                  <TableHead
                    className="text-center font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("score")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Score
                      {sortField === "score" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Submitted */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("submitted")}
                  >
                    <div className="flex items-center gap-1.5">
                      Submitted At
                      {sortField === "submitted" ? (
                        sortDirection === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Action */}
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-700">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAttempts.map((attempt) => {
                  const studentName = attempt.student?.user?.name || "Student";
                  const studentEmail = attempt.student?.user?.email || "—";
                  const isGraded = attempt.is_graded;
                  const isPending = attempt.submitted_at && !attempt.is_graded;
                  const maxMarks = test?.total_marks ?? attempt.total_marks;
                  const score = attempt.score ?? 0;
                  const percentage = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;

                  return (
                    <TableRow
                      key={attempt.id}
                      className="cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                      onClick={() => navigate(`/test-attempts/${attempt.id}/grade`)}
                    >
                      {/* Student Info */}
                      <TableCell className="font-medium py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0276D3] flex items-center justify-center font-black text-xs shrink-0 border border-blue-100">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {studentName}
                            </p>
                            <p className="text-[11px] text-slate-400">{studentEmail}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Format Type */}
                      <TableCell>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md inline-block">
                          {attempt.is_practice ? "Practice Set" : "Official Exam"}
                        </span>
                      </TableCell>

                      {/* Grading Status */}
                      <TableCell>
                        {isGraded ? (
                          <span
                            className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              attempt.is_passed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {attempt.is_passed ? "Passed" : "Needs Work"}
                          </span>
                        ) : isPending ? (
                          <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            In Progress
                          </span>
                        )}
                      </TableCell>

                      {/* Score */}
                      <TableCell className="text-center">
                        {isGraded ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-black text-slate-900">
                              {score} / {maxMarks}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {percentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </TableCell>

                      {/* Submitted At */}
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {attempt.submitted_at
                          ? new Date(attempt.submitted_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/test-attempts/${attempt.id}/grade`)}
                          disabled={!attempt.submitted_at}
                          className={`h-8 px-3 rounded-xl text-xs font-bold ${
                            isPending
                              ? "bg-[#0276D3] hover:bg-[#015bb5] text-white shadow-xs"
                              : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          {isPending ? "Grade" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Page <span className="font-bold text-slate-800">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-800">{totalPages}</span>
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
    </div>
  );
}
