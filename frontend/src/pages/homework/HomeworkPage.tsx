import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { subjectService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

import type { Subject } from "@/types";

import {
  Plus,
  Eye,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  BookOpen,
  Calendar,
  Users,
  Search,
  Filter,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ClipboardCheck,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Homework {
  id: number;
  title: string;
  description?: string;
  document_url?: string;
  document_type?: string;
  due_date?: string;
  created_at: string;
  subject: Subject;
  teacher: {
    user: {
      id: number;
      name: string;
    };
  };
  assignments: {
    student: {
      user: {
        id: number;
        name: string;
      };
    };
  }[];
  _count: {
    assignments: number;
    responses: number;
  };
  response?: {
    id: number;
    response_text?: string;
    response_media_url?: string;
    response_media_type?: string;
    submitted_at: string;
    is_checked: boolean;
    feedback?: string;
  };
}

export default function HomeworkPage() {
  usePageTitle("Homework");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const formatSubjectFilterLabel = (subject: Subject) => {
    const classPart = subject.class?.name ? ` (${subject.class.name})` : '';
    const boardPart = subject.board?.name ? ` [${subject.board.name}]` : '';
    return `${subject.name}${classPart}${boardPart}`;
  };

  const fetchHomework = useCallback(async () => {
    try {
      setLoading(true);
      let response;

      // Build URL and query params for pagination
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));

      if (isStudent) {
        response = await fetch(`/api/homework/student?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        const baseUrl = selectedSubject && selectedSubject !== 'all'
          ? `/api/subjects/${selectedSubject}/homework`
          : '/api/homework/teacher';
        response = await fetch(`${baseUrl}?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
      }

      if (response.ok) {
        const body = await response.json();
        const payload = body.data ?? body; // payload should be { data: [...], pagination }
        let homeworkData: any[] = [];
        if (Array.isArray(payload?.data)) {
          homeworkData = payload.data;
        } else if (Array.isArray(payload)) {
          homeworkData = payload;
        }

        if (isStudent) {
          // student endpoint returns assignments with homework + response
          homeworkData = homeworkData.map((item: any) => ({
            ...item.homework,
            response: item.response,
            student: item.student,
            // Provide a safe fallback so non-student code paths that access _count don't crash
            _count: item.homework?._count ?? { responses: 0, assignments: 0 },
          }));
        }

        setHomework(homeworkData);
        // pagination
        const pagination = payload?.pagination || {};
        setTotal(pagination.total || 0);
        setTotalPages(pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
    }
  }, [isStudent, selectedSubject, page, limit]);

  const fetchSubjects = useCallback(async () => {
    try {
      const baseParams: any = {};
      if (isTeacher) {
        // backend expects either teacher_id (junction id) OR user_id+role; pass user_id+role so controller resolves teacher
        baseParams.user_id = user?.id;
        baseParams.role = 'TEACHER';
      }

      const accumulatedSubjects: Subject[] = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const response = await subjectService.getAll({
          ...baseParams,
          page: currentPage,
          limit: 100,
        });

        const payload = response.data?.data || [];
        accumulatedSubjects.push(...payload);
        totalPages = response.data?.pagination?.totalPages || 1;
        currentPage += 1;
      } while (currentPage <= totalPages);

      setSubjects(accumulatedSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, [user, isTeacher]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchHomework();
  }, [fetchHomework]);

  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredHomework = homework.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teacher.user.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedStatus === 'all') return true;
    
    const isFinished = isStudent ? !!item.response?.is_checked : (item._count.responses === item._count.assignments && item._count.assignments > 0);
    const isSubmitted = isStudent ? !!item.response : item._count.responses > 0;

    if (selectedStatus === 'completed') return isFinished;
    if (selectedStatus === 'pending') return !isFinished && !isSubmitted;
    if (selectedStatus === 'submitted') return isSubmitted && !isFinished;

    return true;
  });

  const getStatusBadge = (item: Homework) => {
    if (isStudent) {
      if (item.response?.is_checked) {
        return <Badge className="bg-saBlue/10 text-saBlue border-saBlue/20 px-2.5 py-0.5 rounded-full text-xs font-bold">COMPLETED</Badge>;
      } else if (item.response) {
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200 px-2.5 py-0.5 rounded-full text-xs font-bold">SUBMITTED</Badge>;
      } else {
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-bold">PENDING</Badge>;
      }
    } else {
      const isFinished = item._count.responses === item._count.assignments && item._count.assignments > 0;
      if (isFinished) {
        return <Badge className="bg-saBlue/10 text-saBlue border-saBlue/20 px-2.5 py-0.5 rounded-full text-xs font-bold">ALL SUBMITTED</Badge>;
      }
      return <Badge className="bg-slate-100 text-slate-700 border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-bold">IN PROGRESS</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-50 border-t-saBlue animate-spin" />
          <Loader2 className="h-6 w-6 text-saBlue absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-slate-500 font-medium text-sm animate-pulse">Loading assignments...</p>
      </div>
    );
  }

  const stats = {
    total: total || homework.length,
    pending: isStudent ? homework.filter(h => !h.response).length : homework.filter(h => h._count.responses < h._count.assignments).length,
    completed: isStudent ? homework.filter(h => h.response?.is_checked).length : homework.filter(h => h._count.responses === h._count.assignments && h._count.assignments > 0).length
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Homework & Assignments</h1>
          <p className="text-slate-500 text-xs">
            {isStudent ? "Your current assignments and learning tasks." : "Manage and track student submissions."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pagination in header */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 rounded text-slate-600 font-bold text-xs hover:bg-slate-200 disabled:opacity-40"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-xs font-bold text-slate-700 px-1">Page {page} of {totalPages}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 rounded text-slate-600 font-bold text-xs hover:bg-slate-200 disabled:opacity-40"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
          {(isAdmin || isTeacher) && (
            <Button
              onClick={() => navigate('/dashboard/homework/create')}
              className="bg-saBlue hover:bg-saBlueDarkHover text-white h-9 px-4 rounded-xl shadow-sm transition-all font-semibold text-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Assignment
            </Button>
          )}
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm rounded-xl bg-white border border-slate-200/80">
          <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue shrink-0">
              <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Total</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-none mt-0.5">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-xl bg-white border border-slate-200/80">
          <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Pending</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-none mt-0.5">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm rounded-xl bg-white border border-slate-200/80">
          <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-sky-50 flex items-center justify-center text-saBlue shrink-0">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Completed</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 leading-none mt-0.5">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Horizontal Filter Toolbar */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          <div className="relative w-64 sm:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search assignment, subject..."
              className="pl-9 h-9 bg-slate-50 border-slate-200/80 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-saBlue"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 w-36 bg-slate-50 border-slate-200/80 rounded-lg font-semibold text-slate-700 text-xs shrink-0">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Subject Filter */}
          {(isAdmin || isTeacher) && (
            <div className="w-52 shrink-0">
              <SearchablePaginatedSelect
                value={selectedSubject}
                onValueChange={(v) => { setSelectedSubject(v); setPage(1); }}
                placeholder="All Subjects"
                pageSize={5}
                searchPlaceholder="Search subject..."
                triggerClassName="h-9 w-full bg-slate-50 border-slate-200/80 rounded-lg font-semibold text-slate-700 text-xs"
                options={[
                  { value: 'all', label: 'All Subjects' },
                  ...subjects.map((subject) => ({
                    value: subject.id.toString(),
                    label: formatSubjectFilterLabel(subject),
                    searchText: `${subject.name} ${subject.class?.name || ''} ${subject.board?.name || ''}`,
                  })),
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Homework Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredHomework.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50">
            <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 border border-slate-200">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Assignments Found</h3>
            <p className="text-slate-500 text-xs mt-1">There are no assignments matching your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Title & Subject</th>
                  <th className="py-3.5 px-4">Teacher</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  {!isStudent && <th className="py-3.5 px-4">Submissions</th>}
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredHomework.map((item) => {
                  const isFinished = isStudent ? !!item.response?.is_checked : (item._count.responses === item._count.assignments && item._count.assignments > 0);
                  const isLate = !isFinished && item.due_date && new Date(item.due_date) < new Date();
                  const submissionPercent = Math.round(((item._count?.responses ?? 0) / (item._count?.assignments || 1)) * 100);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/dashboard/homework/${item.id}`)}
                    >
                      {/* Title & Subject */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-saBlue group-hover:text-white transition-colors">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug group-hover:text-saBlue transition-colors">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
                                {item.subject.name}
                              </span>
                              {item.subject.class && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  • {item.subject.class.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {item.teacher.user.name}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span className={`font-semibold text-xs ${isLate ? 'text-red-600 font-bold' : 'text-slate-800'}`}>
                            {item.due_date ? new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "No Limit"}
                          </span>
                          {isLate && (
                            <Badge className="bg-red-50 text-red-700 border-red-200 text-[9px] font-bold px-1.5 py-0 shadow-none">
                              LATE
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(item)}
                      </td>

                      {/* Submissions (Teacher/Admin view) */}
                      {!isStudent && (
                        <td className="py-3.5 px-4 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-700">
                              <span>{item._count.responses} / {item._count.assignments}</span>
                              <span className="text-saBlue">{submissionPercent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-saBlue rounded-full transition-all duration-500"
                                style={{ width: `${submissionPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-lg text-saBlue hover:bg-saBlue/10 font-semibold text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/homework/${item.id}`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}