import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Users,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Award,
  Loader2,
  AlertCircle,
  Mail,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { progressService, subjectService, moduleService } from "@/services/api";
import type { Subject, Module, StudentModuleProgress } from "@/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentProgress {
  student_id: number;
  student_name: string;
  student_email: string;
  modules: StudentModuleProgress[];
  total_modules: number;
  completed_modules: number;
  average_progress: number;
  total_time_spent: number;
}

export default function SubjectProgressPage() {
  usePageTitle("Analytics & Progress");
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED">("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (subjectId) {
      loadData();
    }
  }, [subjectId]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectResponse, modulesResponse, progressResponse] =
        await Promise.all([
          subjectService.getById(parseInt(subjectId!)),
          moduleService.getModulesBySubject(parseInt(subjectId!)),
          progressService.getSubjectProgress(parseInt(subjectId!)),
        ]);

      setSubject(subjectResponse.data);
      const moduleData = modulesResponse.data;
      setModules(Array.isArray(moduleData) ? moduleData : []);

      const studentsData = progressResponse.data?.students || [];
      setStudentProgress(Array.isArray(studentsData) ? studentsData : []);
      setError(null);
    } catch (err: any) {
      console.error("Error loading progress data:", err);
      setError(err.response?.data?.message || "Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  const filteredProgress = studentProgress.filter((sp) => {
    const matchesSearch =
      sp.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sp.student_email.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "COMPLETED") {
      return sp.completed_modules === sp.total_modules && sp.total_modules > 0;
    } else if (statusFilter === "IN_PROGRESS") {
      return sp.completed_modules < sp.total_modules && sp.average_progress > 0;
    } else if (statusFilter === "NOT_STARTED") {
      return sp.average_progress === 0;
    }

    return true;
  });

  // Calculate Pagination
  const totalItems = filteredProgress.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedProgress = filteredProgress.slice(startIndex, startIndex + pageSize);

  const getStudentModuleProgress = (studentId: number, moduleId: number) => {
    const student = studentProgress.find((sp) => sp.student_id === studentId);
    return student?.modules.find((p) => p.module_id === moduleId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Analytics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-800">Analytics Error</h3>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
        <Button
          onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
          className="bg-saBlue hover:bg-saBlueDarkHover h-9 px-4 rounded-xl text-xs font-bold"
        >
          Return to Modules
        </Button>
      </div>
    );
  }

  const completedAllCount = studentProgress.filter(
    (sp) => sp.completed_modules === sp.total_modules && sp.total_modules > 0
  ).length;

  const inProgressCount = studentProgress.filter(
    (sp) => sp.completed_modules < sp.total_modules && sp.average_progress > 0
  ).length;

  const averageSubjectProgress =
    studentProgress.length > 0
      ? Math.round(
          studentProgress.reduce((sum, sp) => sum + sp.average_progress, 0) /
            studentProgress.length
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12 px-3 sm:px-6">
      {/* COMPACT TOP BAR & HEADER */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-saBlue hover:bg-saBlue/10 transition-all shrink-0"
            title="Back to Modules"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 truncate">
                {subject?.name} Progress
              </h1>
              <Badge className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                Analytics
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              Cohort tracking & module completion breakdown
            </p>
          </div>
        </div>

        {/* STAT BADGES */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
            <Users className="w-4 h-4 text-saBlue" />
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Students</p>
              <p className="text-xs font-black text-slate-800 leading-none">{studentProgress.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <Award className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-wider">Completed</p>
              <p className="text-xs font-black text-emerald-700 leading-none">{completedAllCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100">
            <TrendingUp className="w-4 h-4 text-saBlue" />
            <div>
              <p className="text-[9px] font-bold text-saBlue/70 uppercase tracking-wider">Avg Progress</p>
              <p className="text-xs font-black text-saBlue leading-none">{averageSubjectProgress}%</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-50/50 px-3 py-1.5 rounded-xl border border-amber-100">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-[9px] font-bold text-amber-600/70 uppercase tracking-wider">Modules</p>
              <p className="text-xs font-black text-amber-700 leading-none">{modules.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search student by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-saBlue"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "COMPLETED", "IN_PROGRESS", "NOT_STARTED"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "h-8 px-3 rounded-xl text-xs font-bold shrink-0 transition-all",
                statusFilter === filter
                  ? "bg-saBlue text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {filter === "ALL"
                ? `All (${studentProgress.length})`
                : filter === "COMPLETED"
                ? `Completed (${completedAllCount})`
                : filter === "IN_PROGRESS"
                ? `In Progress (${inProgressCount})`
                : `Not Started (${studentProgress.length - completedAllCount - inProgressCount})`}
            </Button>
          ))}
        </div>
      </div>

      {/* TABULAR COMPACT ROSTER LIST */}
      {filteredProgress.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200/80 rounded-2xl p-6">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No Student Records Found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || statusFilter !== "ALL"
              ? "Try adjusting your search query or status filter."
              : "No students are currently enrolled in this subject."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4 w-48">Modules Completed</th>
                  <th className="py-3 px-4 w-44">Overall Progress</th>
                  <th className="py-3 px-4">Module Breakdown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {paginatedProgress.map((sp, index) => {
                  const percent = Math.round(sp.average_progress || 0);

                  return (
                    <tr
                      key={sp.student_id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                        {startIndex + index + 1}
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs shrink-0 border border-saBlue/20">
                            {sp.student_name ? sp.student_name[0].toUpperCase() : "S"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate">
                              {sp.student_name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {sp.student_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Modules Count Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-xs px-2.5 py-0.5 rounded-lg border",
                            sp.completed_modules === sp.total_modules && sp.total_modules > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : sp.completed_modules > 0
                              ? "bg-saBlue/10 text-saBlue border-saBlue/20"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {sp.completed_modules} / {sp.total_modules} Modules
                        </Badge>
                      </td>

                      {/* Progress Bar & Percent */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5 w-36">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700">{percent}%</span>
                            {percent === 100 && (
                              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" /> Done
                              </span>
                            )}
                          </div>
                          <Progress
                            value={percent}
                            className="h-2 bg-slate-100 rounded-full"
                          />
                        </div>
                      </td>

                      {/* Module Grid Pills */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {modules.map((m) => {
                            const prog = getStudentModuleProgress(sp.student_id, m.module_id);
                            const isDone = prog?.is_completed;
                            const modPercent = prog?.progress_percent || 0;

                            return (
                              <div
                                key={m.module_id}
                                title={`${m.title}: ${isDone ? "Completed" : modPercent > 0 ? `${modPercent}% In Progress` : "Not Started"}`}
                                className={cn(
                                  "px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1",
                                  isDone
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : modPercent > 0
                                    ? "bg-saBlue/10 text-saBlue border-saBlue/20"
                                    : "bg-slate-50 text-slate-400 border-slate-200/80"
                                )}
                              >
                                {isDone ? (
                                  <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                )}
                                <span className="truncate max-w-[90px]">{m.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISIBLE PAGINATION FOOTER */}
          <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-900">{startIndex + 1}</strong> to{" "}
                <strong className="text-slate-900">{Math.min(startIndex + pageSize, totalItems)}</strong> of{" "}
                <strong className="text-slate-900">{totalItems}</strong> students
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger className="h-7 w-16 text-xs font-bold rounded-lg border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={validCurrentPage === 1}
                className="h-8 px-2.5 rounded-lg border-slate-200 font-bold text-xs hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={pageNum === validCurrentPage ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "h-8 w-8 p-0 rounded-lg text-xs font-bold transition-all",
                      pageNum === validCurrentPage
                        ? "bg-saBlue text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-200/60"
                    )}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={validCurrentPage === totalPages}
                className="h-8 px-2.5 rounded-lg border-slate-200 font-bold text-xs hover:bg-white disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}