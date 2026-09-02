import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Search,
  ChevronRight,
  ClipboardCheck,
  RotateCcw,
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

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("due_asc");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const fetchHomework = useCallback(async () => {
    try {
      setLoading(true);
      let response;

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
        const payload = body.data ?? body;
        let homeworkData: any[] = [];
        if (Array.isArray(payload?.data)) {
          homeworkData = payload.data;
        } else if (Array.isArray(payload)) {
          homeworkData = payload;
        }

        if (isStudent) {
          homeworkData = homeworkData.map((item: any) => ({
            ...item.homework,
            response: item.response,
            student: item.student,
            _count: item.homework?._count ?? { responses: 0, assignments: 0 },
          }));
        }

        setHomework(homeworkData);
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

  // Extract unique classes from subjects for Class filter
  const uniqueClasses = useMemo(() => {
    const classMap = new Map<number, string>();
    subjects.forEach((s) => {
      if (s.class?.id && s.class?.name) {
        classMap.set(s.class.id, s.class.name);
      }
    });
    return Array.from(classMap.entries()).map(([id, name]) => ({ id, name }));
  }, [subjects]);

  // Client-side filtering & sorting
  const filteredAndSortedHomework = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let list = homework.filter((item) => {
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subject?.name?.toLowerCase().includes(q) ||
        item.teacher?.user?.name?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (selectedSubject !== 'all' && item.subject?.id?.toString() !== selectedSubject) {
        return false;
      }

      if (selectedClass !== 'all' && item.subject?.class?.id?.toString() !== selectedClass) {
        return false;
      }

      if (selectedStatus !== 'all') {
        const isFinished = isStudent
          ? !!item.response?.is_checked
          : item._count.responses === item._count.assignments && item._count.assignments > 0;
        const isSubmitted = isStudent ? !!item.response : item._count.responses > 0;

        if (selectedStatus === 'completed') return isFinished;
        if (selectedStatus === 'pending') return !isFinished && !isSubmitted;
        if (selectedStatus === 'submitted') return isSubmitted && !isFinished;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'due_asc') {
        return new Date(a.due_date || '').getTime() - new Date(b.due_date || '').getTime();
      }
      if (sortBy === 'due_desc') {
        return new Date(b.due_date || '').getTime() - new Date(a.due_date || '').getTime();
      }
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'title_desc') {
        return b.title.localeCompare(a.title);
      }
      if (sortBy === 'created_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    return list;
  }, [homework, searchQuery, selectedSubject, selectedClass, selectedStatus, sortBy, isStudent]);

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedSubject !== "all" ||
    selectedClass !== "all" ||
    selectedStatus !== "all" ||
    sortBy !== "due_asc";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSubject("all");
    setSelectedClass("all");
    setSelectedStatus("all");
    setSortBy("due_asc");
    setPage(1);
  };

  const getStatusBadge = (item: Homework) => {
    if (isStudent) {
      if (item.response?.is_checked) {
        return <span className="bg-saBlue/10 text-saBlue border border-saBlue/20 font-bold text-[10px] px-2.5 py-0.5 rounded-full">COMPLETED</span>;
      } else if (item.response) {
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] px-2.5 py-0.5 rounded-full">SUBMITTED</span>;
      } else {
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 font-bold text-[10px] px-2.5 py-0.5 rounded-full">PENDING</span>;
      }
    } else {
      const isFinished = item._count.responses === item._count.assignments && item._count.assignments > 0;
      if (isFinished) {
        return <span className="bg-saBlue/10 text-saBlue border border-saBlue/20 font-bold text-[10px] px-2.5 py-0.5 rounded-full">ALL SUBMITTED</span>;
      }
      return <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] px-2.5 py-0.5 rounded-full">IN PROGRESS</span>;
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

  const getSortByLabel = () => {
    switch (sortBy) {
      case 'due_asc': return 'Due Date (Earliest First)';
      case 'due_desc': return 'Due Date (Latest First)';
      case 'title_asc': return 'Title: A → Z';
      case 'title_desc': return 'Title: Z → A';
      case 'created_desc': return 'Recently Created';
      default: return 'Default';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Homework & Assignments</h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            {isStudent ? "Your current assignments and learning tasks." : "Manage and track student submissions."}
          </p>
        </div>
        {(isAdmin || isTeacher) && (
          <Button
            onClick={() => navigate('/dashboard/homework/create')}
            className="bg-saBlue hover:bg-saBlueDarkHover text-white h-10 px-5 rounded-xl shadow-xs transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            New Assignment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saBlue/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Assignments</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">{stats.total}</h3>
            </div>
            <div className="h-8 w-8 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue shrink-0">
              <ClipboardCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Assignments in platform</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-orange-400/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Submissions</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">{stats.pending}</h3>
            </div>
            <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Awaiting completion</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saBlue/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Tasks</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">{stats.completed}</h3>
            </div>
            <div className="h-8 w-8 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue shrink-0">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Submitted and verified</p>
        </Card>
      </div>

      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search assignment by title, subject, teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-lg border-slate-200 bg-slate-50/60 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-44 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_asc">Due Date: Earliest First</SelectItem>
                <SelectItem value="due_desc">Due Date: Latest First</SelectItem>
                <SelectItem value="title_asc">Title: A → Z</SelectItem>
                <SelectItem value="title_desc">Title: Z → A</SelectItem>
                <SelectItem value="created_desc">Recently Created</SelectItem>
              </SelectContent>
            </Select>

            {uniqueClasses.length > 0 && (
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-9 w-32 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {subjects.length > 0 && (
              <Select value={selectedSubject} onValueChange={(v) => { setSelectedSubject(v); setPage(1); }}>
                <SelectTrigger className="h-9 w-36 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-9 w-32 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
          Showing {filteredAndSortedHomework.length} of {total || homework.length} Assignments
        </span>
        <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">
          Sorted by: {getSortByLabel()}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredAndSortedHomework.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-3 border border-slate-200">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Assignments Found</h3>
            <p className="text-slate-500 text-xs mt-0.5">There are no assignments matching your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Title & Subject</th>
                  <th className="py-3 px-4">Teacher</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  {!isStudent && <th className="py-3 px-4">Submissions</th>}
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAndSortedHomework.map((item) => {
                  const isFinished = isStudent ? !!item.response?.is_checked : (item._count.responses === item._count.assignments && item._count.assignments > 0);
                  const isLate = !isFinished && item.due_date && new Date(item.due_date) < new Date();
                  const submissionPercent = Math.round(((item._count?.responses ?? 0) / (item._count?.assignments || 1)) * 100);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/dashboard/homework/${item.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-saBlue group-hover:text-white transition-colors">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug group-hover:text-saBlue transition-colors">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
                                {item.subject?.name}
                              </span>
                              {item.subject?.class && (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  • {item.subject.class.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-slate-700 font-semibold">{item.teacher?.user?.name || 'Assigned'}</p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span className={`font-semibold ${isLate ? 'text-rose-600' : 'text-slate-600'}`}>
                            {item.due_date ? new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                          </span>
                          {isLate && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                              LATE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(item)}
                      </td>
                      {!isStudent && (
                        <td className="py-3.5 px-4 min-w-[120px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700">
                              <span>{item._count.responses} / {item._count.assignments}</span>
                              <span className="text-saBlue">{submissionPercent}%</span>
                            </div>
                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-saBlue rounded-full transition-all duration-500"
                                style={{ width: `${submissionPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 rounded-lg text-saBlue hover:bg-saBlue/10 font-bold text-xs"
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

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            Showing Page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({total || homework.length} total assignments)
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold border-slate-200 disabled:opacity-40"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                    <button
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                        page === p
                          ? 'bg-saBlue text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold border-slate-200 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}