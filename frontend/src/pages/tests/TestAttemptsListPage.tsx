import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  Printer,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { testService, testAttemptService } from "@/services/api";
import type { Test, TestAttempt } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { printCertificateDocument, formatCertificateDate } from "@/utils/printCertificate";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageTitle } from "@/hooks/usePageTitle";

type TypeFilter = "all" | "real" | "practice";
type StatusFilter = "ALL" | "GRADED" | "PENDING" | "IN_PROGRESS";
type OutcomeFilter = "ALL" | "CERTIFICATE" | "PASSED" | "FAILED";
type SortField = "student" | "type" | "status" | "score" | "submitted" | "certificate";
type SortDirection = "asc" | "desc";

export default function TestAttemptsListPage() {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  usePageTitle(test ? `Test Attempts & Certificates: ${test.title}` : "Test Attempts");

  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>(
    searchParams.get("filter") === "certificates" ? "CERTIFICATE" : "ALL"
  );

  // Sorting
  const [sortField, setSortField] = useState<SortField>("submitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Certificate Modal State
  const [selectedCertAttempt, setSelectedCertAttempt] = useState<TestAttempt | null>(null);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Helper to extract candidate name and email
  const getCandidateDetails = (attempt: TestAttempt) => {
    const guestObj = attempt.guest_info as any;
    const isFallbackGuest =
      attempt.student?.user?.email === "guest@studyasan.com" ||
      attempt.student?.user?.name === "Guest User" ||
      !attempt.student_id;

    const name =
      guestObj?.name ||
      attempt.certificate?.recipient_name ||
      (!isFallbackGuest ? attempt.student?.user?.name : undefined) ||
      attempt.student?.user?.name ||
      "Guest Candidate";

    const email =
      guestObj?.email ||
      attempt.certificate?.recipient_email ||
      (!isFallbackGuest ? attempt.student?.user?.email : undefined) ||
      attempt.student?.user?.email ||
      "—";

    const isGuest = isFallbackGuest || !!guestObj?.name || !!attempt.certificate?.recipient_name;
    return { name, email, isGuest };
  };

  // KPI Metrics
  const totalAttemptsCount = attempts.length;
  const realAttemptsCount = attempts.filter((a) => !a.is_practice).length;
  const practiceAttemptsCount = attempts.filter((a) => a.is_practice).length;
  const gradedCount = attempts.filter((a) => a.is_graded).length;
  const pendingCount = attempts.filter((a) => a.submitted_at && !a.is_graded).length;
  const issuedCertificatesCount = attempts.filter(
    (a) =>
      !!a.certificate ||
      (a.is_graded && a.is_passed && (test?.is_certification || (test?.test_type as string) === "CERTIFICATION"))
  ).length;

  // Filter & Sort
  const processedAttempts = useMemo(() => {
    let result = [...attempts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const { name, email } = getCandidateDetails(a);
        const certCode = a.certificate?.code?.toLowerCase() || "";
        return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || certCode.includes(q);
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
    if (outcomeFilter === "CERTIFICATE") {
      result = result.filter(
        (a) =>
          !!a.certificate ||
          (a.is_graded && a.is_passed && (test?.is_certification || (test?.test_type as string) === "CERTIFICATION"))
      );
    } else if (outcomeFilter === "PASSED") {
      result = result.filter((a) => a.is_graded && a.is_passed);
    } else if (outcomeFilter === "FAILED") {
      result = result.filter((a) => a.is_graded && !a.is_passed);
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "student") {
        const nameA = getCandidateDetails(a).name;
        const nameB = getCandidateDetails(b).name;
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === "type") {
        comparison = (a.is_practice ? 1 : 0) - (b.is_practice ? 1 : 0);
      } else if (sortField === "status") {
        const statA = a.is_graded ? "Graded" : a.submitted_at ? "Pending" : "In Progress";
        const statB = b.is_graded ? "Graded" : b.submitted_at ? "Pending" : "In Progress";
        comparison = statA.localeCompare(statB);
      } else if (sortField === "score") {
        const scoreA = a.is_graded ? a.score ?? 0 : -1;
        const scoreB = b.is_graded ? b.score ?? 0 : -1;
        comparison = scoreA - scoreB;
      } else if (sortField === "certificate") {
        const certA = a.certificate?.code || (a.is_passed ? "1" : "0");
        const certB = b.certificate?.code || (b.is_passed ? "1" : "0");
        comparison = certA.localeCompare(certB);
      } else if (sortField === "submitted") {
        const timeA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const timeB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        comparison = timeA - timeB;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [attempts, searchQuery, typeFilter, statusFilter, outcomeFilter, sortField, sortDirection, test]);

  // Pagination
  const totalCount = processedAttempts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedAttempts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedAttempts.slice(startIndex, startIndex + pageSize);
  }, [processedAttempts, currentPage, pageSize]);

  const hasActiveFilters =
    searchQuery !== "" || typeFilter !== "all" || statusFilter !== "ALL" || outcomeFilter !== "ALL";

  // Open Certificate Preview
  const openCertificateModal = (attempt: TestAttempt) => {
    setSelectedCertAttempt(attempt);
    setCopiedCode(false);
    setCopiedLink(false);
    setCertModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!test) return;
    const url = `${window.location.origin}/certification/${test.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  const handlePrintCertificate = () => {
    if (!selectedCertAttempt) return;
    const candidateName = getCandidateDetails(selectedCertAttempt).name;
    const certTitle = test?.certificate_title || "Certificate of Completion";
    const certBody = renderCertificateText(selectedCertAttempt);
    const certCode = selectedCertAttempt.certificate?.code || "SA-CERT-VERIFIED";
    const dateStr = selectedCertAttempt.submitted_at
      ? new Date(selectedCertAttempt.submitted_at).toLocaleDateString()
      : new Date().toLocaleDateString();

    printCertificateDocument({
      title: test?.title || "Certificate of Completion",
      candidateName,
      certificateTitle: certTitle,
      certificateBodyText: certBody,
      certificateCode: certCode,
      dateStr,
    });
  };

  // Helper for rendering certificate body text in modal
  const renderCertificateText = (attempt: TestAttempt | null) => {
    if (!attempt) return "";
    if (attempt.certificate?.certificate_text) {
      return attempt.certificate.certificate_text;
    }
    const { name } = getCandidateDetails(attempt);
    const score = attempt.score ?? 0;
    const maxMarks = test?.total_marks ?? attempt.total_marks;
    const percentage = maxMarks > 0 ? `${Math.round((score / maxMarks) * 100)}%` : "0%";
    const dateStr = attempt.submitted_at
      ? new Date(attempt.submitted_at).toLocaleDateString()
      : new Date().toLocaleDateString();
    const testTitle = test?.title || "Assessment";

    const template =
      test?.certificate_template ||
      "has successfully completed the assessment for {test_title} with a score of {score}/{total_marks} ({percentage}) on {date}.";

    return template
      .replace(/\{name\}|\{candidate_name\}|\{student_name\}/gi, name)
      .replace(/\{test_title\}|\{title\}/gi, testTitle)
      .replace(/\{score\}|\{marks\}/gi, String(score))
      .replace(/\{total_marks\}|\{max_marks\}/gi, String(maxMarks))
      .replace(/\{percentage\}|\{percent\}/gi, percentage)
      .replace(/\{date\}|\{completion_date\}/gi, dateStr)
      .replace(/\{certificate_id\}|\{certificate_code\}|\{code\}/gi, attempt.certificate?.code || "SA-CERT-VERIFIED");
  };

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Test Attempts & Issued Certificates
              </h1>
              {(test?.is_certification || (test?.test_type as string) === "CERTIFICATION") && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-2 py-0.5 text-[10px] flex items-center gap-1">
                  <Award className="w-3 h-3" /> Certification Exam
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              {test?.title || "Loading test details..."}
            </p>
          </div>
        </div>

        {test && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
              Total Marks: <span className="text-slate-900">{test.total_marks}</span>
            </span>
            <span className="text-xs font-bold text-[#0276D3] bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl">
              Pass Marks: <span>{test.passing_marks}</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/tests/${testId}`)}
              className="h-8 rounded-xl text-xs font-bold border-slate-200"
            >
              Test Specs
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards - StudyAsan Branding */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div
          onClick={() => {
            setOutcomeFilter("ALL");
            setTypeFilter("all");
          }}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0276D3] flex items-center justify-center font-bold shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Attempts</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{totalAttemptsCount}</p>
          </div>
        </div>

        {/* Issued Certificates */}
        <div
          onClick={() => setOutcomeFilter("CERTIFICATE")}
          className={`p-4 rounded-2xl border shadow-xs flex items-center gap-3 cursor-pointer transition-all ${
            outcomeFilter === "CERTIFICATE"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Issued Certs</p>
            <p className="text-lg sm:text-xl font-black text-emerald-950">{issuedCertificatesCount}</p>
          </div>
        </div>

        {/* Exam Attempts */}
        <div
          onClick={() => setTypeFilter("real")}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Official Exams</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{realAttemptsCount}</p>
          </div>
        </div>

        {/* Graded */}
        <div
          onClick={() => setStatusFilter("GRADED")}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0276D3] flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Graded</p>
            <p className="text-lg sm:text-xl font-black text-slate-900">{gradedCount}</p>
          </div>
        </div>

        {/* Pending */}
        <div
          onClick={() => setStatusFilter("PENDING")}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 cursor-pointer hover:border-amber-300 transition-colors col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</p>
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
              placeholder="Search by candidate name, email, or Cert ID..."
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

          {/* Outcome & Certificate Filter */}
          <div>
            <Select value={outcomeFilter} onValueChange={(v: any) => setOutcomeFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="Result & Certificate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Outcomes</SelectItem>
                <SelectItem value="CERTIFICATE">🎖️ Issued Certificates Only</SelectItem>
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
              Showing{" "}
              <span className="font-bold text-slate-800">
                {totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-bold text-slate-800">{totalCount}</span> attempts
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

      {/* Attempts & Certificates Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading attempts & certificates...</p>
        </div>
      ) : paginatedAttempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No attempts found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {hasActiveFilters
              ? "No attempts match your active filters."
              : "No candidates have attempted this test yet."}
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
                  {/* Candidate */}
                  <TableHead
                    className="w-[260px] font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("student")}
                  >
                    <div className="flex items-center gap-1.5">
                      Candidate
                      {sortField === "student" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Format */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("type")}
                  >
                    <div className="flex items-center gap-1.5">
                      Format
                      {sortField === "type" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                        )
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
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                        )
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
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Certificate ID */}
                  <TableHead
                    className="font-bold text-xs uppercase tracking-wider text-slate-700 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort("certificate")}
                  >
                    <div className="flex items-center gap-1.5">
                      Certificate
                      {sortField === "certificate" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                        )
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
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Action */}
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-700">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAttempts.map((attempt) => {
                  const { name, email, isGuest } = getCandidateDetails(attempt);
                  const isGraded = attempt.is_graded;
                  const isPending = attempt.submitted_at && !attempt.is_graded;
                  const maxMarks = test?.total_marks ?? attempt.total_marks;
                  const score = attempt.score ?? 0;
                  const percentage = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;
                  const hasCert =
                    !!attempt.certificate ||
                    (attempt.is_graded &&
                      attempt.is_passed &&
                      (test?.is_certification || (test?.test_type as string) === "CERTIFICATION"));
                  const certCode = attempt.certificate?.code;

                  return (
                    <TableRow
                      key={attempt.id}
                      className="cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-slate-100"
                      onClick={() => navigate(`/test-attempts/${attempt.id}/grade`)}
                    >
                      {/* Candidate Info */}
                      <TableCell className="font-medium py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                              isGuest
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-blue-50 text-[#0276D3] border-blue-100"
                            }`}
                          >
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 leading-tight">{name}</p>
                              {isGuest && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                  Guest
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{email}</p>
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
                            <span className="text-[10px] font-bold text-slate-400">{percentage}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </TableCell>

                      {/* Certificate */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {certCode ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold">
                              <Award className="w-3 h-3 text-emerald-600 shrink-0" />
                              {certCode}
                            </span>
                            <button
                              onClick={() => handleCopyCode(certCode)}
                              className="text-slate-400 hover:text-emerald-700 p-1 rounded hover:bg-slate-100 transition-colors"
                              title="Copy Certificate ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : hasCert ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            <Award className="w-3 h-3 text-emerald-600" />
                            Eligible / Issued
                          </span>
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

                      {/* Actions */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {hasCert && (
                            <Button
                              size="sm"
                              onClick={() => openCertificateModal(attempt)}
                              className="h-8 px-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1"
                              title="View & Print Official Certificate"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Certificate
                            </Button>
                          )}

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
                        </div>
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
                  .filter(
                    (page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                  )
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

      {/* CERTIFICATE PREVIEW & PRINT MODAL */}
      <Dialog open={certModalOpen} onOpenChange={setCertModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl">
          {/* Modal Header & Quick Action Bar */}
          <div className="flex items-center justify-between p-4 px-6 bg-slate-950/80 border-b border-slate-800 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-none">Official Digital Certificate</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ID: <span className="font-mono text-emerald-400 font-bold">{selectedCertAttempt?.certificate?.code || "SA-CERT-VERIFIED"}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyCode(selectedCertAttempt?.certificate?.code || "SA-CERT-VERIFIED")}
                className="h-8 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copiedCode ? "Copied ID" : "Copy ID"}
              </Button>
              <Button
                size="sm"
                onClick={handlePrintCertificate}
                className="h-8 rounded-xl text-xs font-bold bg-[#0276D3] hover:bg-[#015bb5] text-white shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print Certificate
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setCertModalOpen(false)}
                className="h-8 w-8 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Printable Certificate View */}
          <div className="p-4 sm:p-8 bg-slate-100 overflow-x-auto flex justify-center">
            {selectedCertAttempt && (() => {
              const candidate = getCandidateDetails(selectedCertAttempt);
              const rawTitle = test?.certificate_title || "Certificate of Completion";
              let certMainHeading = "CERTIFICATE";
              let certSubHeading = "OF COMPLETION";
              const match = rawTitle.match(/^certificate\s+(of\s+.*)/i);
              if (match && match[1]) {
                certSubHeading = match[1].toUpperCase();
              } else if (/^certificate$/i.test(rawTitle.trim())) {
                certSubHeading = "OF COMPLETION";
              } else {
                certSubHeading = rawTitle.toUpperCase();
              }

              const formattedDate = formatCertificateDate(selectedCertAttempt.submitted_at);

              return (
                <div
                  id="admin-certificate-view"
                  className="w-full max-w-[840px] aspect-[1.414/1] relative box-border overflow-hidden rounded-2xl shadow-2xl border border-slate-200 select-none bg-white"
                  style={{
                    backgroundImage: "url('/certificate_background.png')",
                    backgroundSize: "100% 100%",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center center",
                  }}
                >
                  {/* Content Layout */}
                  <div className="absolute top-[17%] left-[14%] right-[14%] bottom-[28%] flex flex-col items-center justify-center text-center">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#002b5b] tracking-[4px] uppercase leading-none font-['Outfit']">
                      {certMainHeading}
                    </h1>
                    <h2 className="text-xs sm:text-sm lg:text-base font-bold text-[#002b5b] tracking-[6px] uppercase mt-1 sm:mt-1.5 font-['Outfit']">
                      {certSubHeading}
                    </h2>
                    <div className="w-8 sm:w-11 h-1 bg-[#0276D3] rounded-full my-1.5 sm:my-2"></div>

                    <p className="font-serif italic text-xs sm:text-sm text-slate-600 mb-0.5 sm:mb-1">
                      This is to certify that
                    </p>
                    <div className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-[#002b5b] px-4 leading-tight font-['Outfit']">
                      {candidate.name}
                    </div>
                    <div className="w-48 sm:w-64 h-[1px] bg-slate-300 my-1 sm:my-1.5"></div>

                    <p className="text-[11px] sm:text-xs text-slate-600">
                      has successfully completed the course
                    </p>
                    <div className="text-xs sm:text-sm lg:text-base font-extrabold text-[#0276D3] my-0.5">
                      {test?.title || "Certification Assessment"}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600">
                      offered by <strong className="text-[#002b5b] font-bold">StudyAsan</strong>
                    </p>

                    <p className="text-[9px] sm:text-[11px] text-slate-500 max-w-[560px] mx-auto mt-1 sm:mt-2 leading-relaxed px-2 line-clamp-2">
                      {selectedCertAttempt.certificate?.certificate_text ||
                        "We appreciate your dedication, curiosity and consistent effort in achieving this milestone. We wish you continued success in your learning journey."}
                    </p>
                  </div>

                  {/* Bottom Left Meta */}
                  <div className="absolute bottom-[11%] left-[6%] flex items-center gap-3 sm:gap-4 text-left z-10">
                    <div>
                      <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 block">Date of Issue</span>
                      <span className="text-[10px] sm:text-xs font-extrabold text-slate-900">{formattedDate}</span>
                    </div>
                    <div className="w-px h-5 sm:h-7 bg-slate-300"></div>
                    <div>
                      <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 block">Certificate ID</span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-900">
                        {selectedCertAttempt.certificate?.code || "SA-CERT-VERIFIED"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 px-6 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Recipient Email: <strong className="text-slate-200">{selectedCertAttempt ? getCandidateDetails(selectedCertAttempt).email : "—"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-8 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5 mr-1" />}
                {copiedLink ? "Link Copied" : "Public Exam Link"}
              </Button>
              <Button
                size="sm"
                onClick={() => setCertModalOpen(false)}
                className="h-8 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
