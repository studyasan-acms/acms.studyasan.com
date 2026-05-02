import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
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
            student: item.student
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

  const filteredHomework = homework.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (item: Homework) => {
    if (isStudent) {
      if (item.response?.is_checked) {
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold">COMPLETED</Badge>;
      } else if (item.response) {
        return <Badge className="bg-blue-50 text-blue-700 border-blue-100 px-2 py-0.5 rounded-full text-[10px] font-bold">SUBMITTED</Badge>;
      } else {
        return <Badge className="bg-amber-50 text-amber-700 border-amber-100 px-2 py-0.5 rounded-full text-[10px] font-bold">PENDING</Badge>;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-50 border-t-saBlue animate-spin" />
          <Loader2 className="h-6 w-6 text-saBlue absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-gray-500 font-medium text-sm animate-pulse">Loading assignments...</p>
      </div>
    );
  }

  const stats = {
    total: homework.length,
    pending: isStudent ? homework.filter(h => !h.response).length : homework.filter(h => h._count.responses < h._count.assignments).length,
    completed: isStudent ? homework.filter(h => h.response?.is_checked).length : homework.filter(h => h._count.responses === h._count.assignments && h._count.assignments > 0).length
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Homework</h1>
          <p className="text-gray-500 text-sm">
            {isStudent ? "Your current assignments and learning tasks." : "Manage and track student submissions."}
          </p>
        </div>
        {(isAdmin || isTeacher) && (
          <Button
            onClick={() => navigate('/dashboard/homework/create')}
            className="bg-saBlue hover:bg-saBlueDarkHover text-white h-10 px-6 rounded-xl shadow-sm transition-all font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-saBlue shrink-0">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Tasks</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Waiting</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Finished</p>
              <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            className="pl-10 h-10 bg-gray-50 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-saBlue transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {(isAdmin || isTeacher) && (
            <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setPage(1); }}>
              <SelectTrigger className="h-10 w-full md:min-w-[220px] bg-gray-50 border-none rounded-xl font-medium text-gray-700 text-sm">
                <Filter className="h-3.5 w-3.5 mr-2" />
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent className="w-[calc(100vw-2rem)] max-w-[28rem] overflow-hidden rounded-xl border-gray-100 p-0 md:w-[var(--radix-select-trigger-width)]">
                <SearchablePaginatedSelect
                  pageSize={5}
                  searchPlaceholder="Search subject..."
                  options={[
                    { value: 'all', label: 'All Subjects' },
                    ...subjects.map((subject) => ({
                      value: subject.id.toString(),
                      label: formatSubjectFilterLabel(subject),
                      searchText: `${subject.name} ${subject.class?.name || ''} ${subject.board?.name || ''}`,
                    })),
                  ]}
                />
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Homework Grid */}
      {filteredHomework.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
          <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Assignments</h3>
          <p className="text-gray-500 text-sm">You're all caught up!</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHomework.map((item) => {
            const isFinished = isStudent ? !!item.response?.is_checked : (item._count.responses === item._count.assignments && item._count.assignments > 0);
            const isLate = !isFinished && item.due_date && new Date(item.due_date) < new Date();

            return (
              <Card
                key={item.id}
                className="group relative bg-white rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/dashboard/homework/${item.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="h-10 w-10 rounded-xl bg-saBlue flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    {getStatusBadge(item)}
                    {isLate && !isStudent && <Badge className="bg-red-50 text-red-700 border-red-100 rounded-full text-[10px] font-bold">LATE</Badge>}
                  </div>

                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-saBlue transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-gray-500 font-medium text-xs">
                      <span className="truncate">{item.subject.name}</span>
                      <span className="h-1 w-1 rounded-full bg-gray-300" />
                      <span className="truncate">{item.teacher.user.name}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[9px] uppercase tracking-wider">
                        <Calendar className="h-3 w-3" />
                        Due Date
                      </div>
                      <span className={`text-xs font-bold ${isLate ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.due_date ? new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "No Limit"}
                      </span>
                    </div>

                    {!isStudent && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          <span>Submissions</span>
                          <span>{Math.round((item._count.responses / (item._count.assignments || 1)) * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-saBlue rounded-full transition-all duration-700"
                            style={{ width: `${(item._count.responses / (item._count.assignments || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end">
                    <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-saBlue group-hover:text-white transition-all">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6">
            <div className="text-sm text-gray-500">Showing {Math.min(page * limit, total)} of {total} assignments</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}