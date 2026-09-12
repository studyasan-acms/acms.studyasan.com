import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  ArrowLeft,
  Trophy,
  TrendingUp,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { testAttemptService, subjectService } from '@/services/api';
import type { TestAttempt, Subject, TestType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from "@/hooks/usePageTitle";
import { getEffectiveTestType } from "./TestsPage";

type SortField = 'date' | 'title' | 'score' | 'percentage';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'PASSED' | 'FAILED' | 'PENDING' | 'COMPLETED';
type DateFilter = 'ALL' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH';

export default function MyResultsPage() {
  usePageTitle("My Test Results");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Data State
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedFormat, setSelectedFormat] = useState<"ALL" | TestType>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateFilter>("ALL");

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const formatSubjectFilterLabel = (subject: any) => {
    if (!subject) return 'General';
    const parts = [subject.name];
    if (subject.class?.name) parts.push(subject.class.name);
    if (subject.board?.name) parts.push(subject.board.name);
    return parts.filter(Boolean).join(' - ');
  };

  useEffect(() => {
    fetchSubjects();
    fetchAttempts();
  }, [selectedSubject]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFormat, selectedStatus, selectedDateFilter, selectedSubject, pageSize]);

  const fetchSubjects = async () => {
    try {
      const params: any = { limit: 1000 };
      if (user?.role === 'STUDENT' && user?.id) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedSubject && selectedSubject !== "ALL") params.subject_id = parseInt(selectedSubject);
      const response = await testAttemptService.getMyAttempts(params);
      setAttempts(response.data || []);
    } catch (error) {
      console.error('Error fetching test attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (attempt: TestAttempt) => {
    if (!attempt.total_marks || attempt.score === null) return 0;
    return (attempt.score / attempt.total_marks) * 100;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedSubject("ALL");
    setSelectedFormat("ALL");
    setSelectedStatus("ALL");
    setSelectedDateFilter("ALL");
    setSortField('date');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  // Overall KPI Metrics
  const totalAttempts = attempts.length;
  const gradedAttempts = attempts.filter((a) => a.is_graded);
  const passedAttempts = gradedAttempts.filter((a) => a.is_passed).length;
  const avgScore = gradedAttempts.length > 0
    ? (gradedAttempts.reduce((sum, a) => sum + getPercentage(a), 0) / gradedAttempts.length).toFixed(1)
    : '0.0';

  // Filtered and Sorted Data
  const processedAttempts = useMemo(() => {
    let result = [...attempts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(a => {
        const title = a.test?.title?.toLowerCase() || '';
        const subject = a.test?.subject?.name?.toLowerCase() || '';
        const series = a.test?.test_series?.title?.toLowerCase() || '';
        return title.includes(q) || subject.includes(q) || series.includes(q);
      });
    }

    // Format / Type filter
    if (selectedFormat !== "ALL") {
      result = result.filter(a => {
        const effectiveType = a.test ? getEffectiveTestType(a.test) : (a.is_practice ? "PRACTICE" : "MOCK_TEST");
        return effectiveType === selectedFormat;
      });
    }

    // Status filter
    if (selectedStatus !== "ALL") {
      result = result.filter(a => {
        const effectiveType = a.test ? getEffectiveTestType(a.test) : (a.is_practice ? "PRACTICE" : "MOCK_TEST");
        const isPractice = effectiveType === "PRACTICE" || a.is_practice;
        const isPassed = a.is_passed ?? (a.score !== null && a.test?.passing_marks ? a.score >= a.test.passing_marks : false);

        if (selectedStatus === 'PENDING') return !a.is_graded;
        if (selectedStatus === 'COMPLETED') return isPractice && a.is_graded;
        if (selectedStatus === 'PASSED') return !isPractice && a.is_graded && isPassed;
        if (selectedStatus === 'FAILED') return !isPractice && a.is_graded && !isPassed;
        return true;
      });
    }

    // Date filter
    if (selectedDateFilter !== "ALL") {
      const now = new Date();
      result = result.filter(a => {
        if (!a.submitted_at && !a.created_at) return false;
        const targetDate = new Date(a.submitted_at || a.created_at);
        const diffMs = now.getTime() - targetDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (selectedDateFilter === '7_DAYS') return diffDays <= 7;
        if (selectedDateFilter === '30_DAYS') return diffDays <= 30;
        if (selectedDateFilter === 'THIS_MONTH') {
          return targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        const dateA = new Date(a.submitted_at || a.created_at || 0).getTime();
        const dateB = new Date(b.submitted_at || b.created_at || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortField === 'title') {
        const titleA = (a.test?.title || '').toLowerCase();
        const titleB = (b.test?.title || '').toLowerCase();
        comparison = titleA.localeCompare(titleB);
      } else if (sortField === 'score') {
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        comparison = scoreA - scoreB;
      } else if (sortField === 'percentage') {
        const pctA = getPercentage(a);
        const pctB = getPercentage(b);
        comparison = pctA - pctB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [attempts, searchQuery, selectedFormat, selectedStatus, selectedDateFilter, sortField, sortDirection]);

  // Pagination calculation
  const totalCount = processedAttempts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedAttempts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedAttempts.slice(startIndex, startIndex + pageSize);
  }, [processedAttempts, currentPage, pageSize]);

  const hasActiveFilters = searchQuery !== "" || selectedSubject !== "ALL" || selectedFormat !== "ALL" || selectedStatus !== "ALL" || selectedDateFilter !== "ALL";

  return (
    <div className="space-y-6 p-2 sm:p-6 max-w-6xl mx-auto pb-24">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tests")}
            className="text-slate-500 hover:text-[#0276D3] hover:bg-slate-100 rounded-xl h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Test Results</h1>
            <p className="text-xs text-slate-500 mt-0.5">Track your test performance, review answer solutions, and access certificates</p>
          </div>
        </div>

        <Button
          onClick={() => navigate("/tests")}
          className="bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl text-xs font-bold w-full sm:w-auto shadow-md shadow-[#0276D3]/10 flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" /> Browse Tests
        </Button>
      </div>

      {/* KPI Stats Grid - Strict StudyAsan Palette */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Attempts */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#0276D3] shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Attempts</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{totalAttempts}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tests Passed */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#0276D3] shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tests Passed</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {passedAttempts} <span className="text-xs text-slate-400 font-semibold">/ {gradedAttempts.length} Graded</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Average Score */}
        <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 sm:p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#FF7A00] shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Score</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{avgScore}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Format Filter Tabs - Clean StudyAsan Blue */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setSelectedFormat("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedFormat === "ALL"
              ? "bg-[#0276D3] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All Formats ({attempts.length})
        </button>

        <button
          onClick={() => setSelectedFormat("MOCK_TEST")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedFormat === "MOCK_TEST"
              ? "bg-[#0276D3] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Mock Tests
        </button>

        <button
          onClick={() => setSelectedFormat("PRACTICE")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedFormat === "PRACTICE"
              ? "bg-[#0276D3] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Practice Sets
        </button>

        <button
          onClick={() => setSelectedFormat("ASSESSMENT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedFormat === "ASSESSMENT"
              ? "bg-[#0276D3] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Assessments
        </button>

        <button
          onClick={() => setSelectedFormat("CERTIFICATION")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            selectedFormat === "CERTIFICATION"
              ? "bg-[#0276D3] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Certifications
        </button>
      </div>

      {/* Filter, Search & Sorting Controls Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search test name or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 w-full rounded-xl text-xs border-slate-200"
            />
          </div>

          {/* Subject Filter */}
          <div>
            <SearchablePaginatedSelect
              value={selectedSubject}
              onValueChange={setSelectedSubject}
              placeholder="Filter by Subject"
              searchPlaceholder="Search subject..."
              triggerClassName="h-10 w-full rounded-xl text-xs border-slate-200"
              options={[
                { value: 'ALL', label: 'All Subjects' },
                ...subjects.map((s) => ({
                  value: s.id.toString(),
                  label: formatSubjectFilterLabel(s),
                  searchText: `${s.name} ${s.class?.name || ''} ${s.board?.name || ''}`,
                })),
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
              <SelectTrigger className="h-10 rounded-xl text-xs border-slate-200">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PASSED">Passed</SelectItem>
                <SelectItem value="FAILED">Needs Improvement</SelectItem>
                <SelectItem value="COMPLETED">Completed (Practice)</SelectItem>
                <SelectItem value="PENDING">Under Review / Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div>
            <Select value={selectedDateFilter} onValueChange={(v: any) => setSelectedDateFilter(v)}>
              <SelectTrigger className="h-10 rounded-xl text-xs border-slate-200">
                <SelectValue placeholder="Filter by Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Time</SelectItem>
                <SelectItem value="7_DAYS">Last 7 Days</SelectItem>
                <SelectItem value="30_DAYS">Last 30 Days</SelectItem>
                <SelectItem value="THIS_MONTH">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Secondary Filter Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Showing <span className="font-bold text-slate-800">{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-bold text-slate-800">{totalCount}</span> attempts</span>
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

      {/* Results Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading your results...</p>
        </div>
      ) : paginatedAttempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No test results found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {hasActiveFilters ? "No attempts match the selected filter criteria." : "You haven't attempted any tests in this category yet."}
          </p>
          {hasActiveFilters ? (
            <Button
              onClick={resetAllFilters}
              variant="outline"
              className="rounded-xl text-xs font-bold mt-4 border-slate-200"
            >
              Clear All Filters
            </Button>
          ) : (
            <Button
              onClick={() => navigate("/tests")}
              className="bg-[#0276D3] text-white rounded-xl text-xs font-bold mt-4"
            >
              Browse Available Tests
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200">
                  {/* Test Details Header */}
                  <TableHead
                    className="font-bold text-slate-700 text-xs uppercase tracking-wider py-3.5 cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1.5">
                      Test Details
                      {sortField === 'title' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Subject Header */}
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Subject
                  </TableHead>

                  {/* Format Header */}
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Format
                  </TableHead>

                  {/* Status Header */}
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Status
                  </TableHead>

                  {/* Score Header */}
                  <TableHead
                    className="text-center font-bold text-slate-700 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Score
                      {sortField === 'score' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Accuracy Header */}
                  <TableHead
                    className="text-center font-bold text-slate-700 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort('percentage')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Accuracy
                      {sortField === 'percentage' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Submitted Date Header */}
                  <TableHead
                    className="font-bold text-slate-700 text-xs uppercase tracking-wider hidden md:table-cell cursor-pointer select-none hover:text-[#0276D3]"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      Submitted Date
                      {sortField === 'date' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0276D3]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0276D3]" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </div>
                  </TableHead>

                  {/* Action Header */}
                  <TableHead className="text-right font-bold text-slate-700 text-xs uppercase tracking-wider">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {paginatedAttempts.map((attempt) => {
                  const effectiveType = attempt.test ? getEffectiveTestType(attempt.test) : (attempt.is_practice ? "PRACTICE" : "MOCK_TEST");
                  const pct = getPercentage(attempt);
                  const isPractice = effectiveType === "PRACTICE" || attempt.is_practice;
                  const isPassed = attempt.is_passed ?? (attempt.score !== null && attempt.test?.passing_marks ? attempt.score >= attempt.test.passing_marks : false);

                  return (
                    <TableRow
                      key={attempt.id}
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                      onClick={() => navigate(`/test-attempts/${attempt.id}/results`)}
                    >
                      {/* Test Title */}
                      <TableCell className="py-4">
                        <span className="font-bold text-slate-900 text-sm block">{attempt.test?.title}</span>
                        <span className="text-[11px] text-slate-400 font-medium md:hidden block mt-0.5">
                          {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString('en-IN') : 'In progress'}
                        </span>
                      </TableCell>

                      {/* Subject */}
                      <TableCell>
                        <span className="font-medium bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 whitespace-nowrap inline-block">
                          {attempt.test?.subject ? formatSubjectFilterLabel(attempt.test.subject) : (attempt.test?.test_series?.title || 'General')}
                        </span>
                      </TableCell>

                      {/* Format Badge */}
                      <TableCell>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                          {effectiveType === "MOCK_TEST" && "Mock Test"}
                          {effectiveType === "PRACTICE" && "Practice Set"}
                          {effectiveType === "ASSESSMENT" && "Assessment"}
                          {effectiveType === "CERTIFICATION" && "Certification"}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {!attempt.is_graded ? (
                          <span className="text-[11px] font-bold text-[#FF7A00] bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3 h-3" /> Under Review
                          </span>
                        ) : isPractice ? (
                          <span className="text-[11px] font-bold text-[#0276D3] bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                            Completed
                          </span>
                        ) : isPassed ? (
                          <span className="text-[11px] font-bold text-[#0276D3] bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                            Passed
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg inline-block whitespace-nowrap">
                            Needs Work
                          </span>
                        )}
                      </TableCell>

                      {/* Score */}
                      <TableCell className="text-center font-bold text-slate-900 text-xs">
                        {attempt.is_graded ? (
                          <span>{attempt.score || 0} / {attempt.total_marks}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      {/* Percentage Bar */}
                      <TableCell className="text-center">
                        {attempt.is_graded ? (
                          <div className="flex flex-col items-center gap-1 max-w-[80px] mx-auto">
                            <span className="text-xs font-bold text-slate-800">{pct.toFixed(0)}%</span>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${isPassed || isPractice ? 'bg-[#0276D3]' : 'bg-slate-400'}`}
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Submitted Date */}
                      <TableCell className="text-xs text-slate-500 font-medium hidden md:table-cell whitespace-nowrap">
                        {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }) : 'In progress'}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/test-attempts/${attempt.id}/results`);
                          }}
                          className="text-[#0276D3] hover:bg-blue-50 font-bold text-xs rounded-xl h-8 px-3"
                        >
                          View Results <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
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
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                {/* Page Number Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
