import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  Sparkles,
  Loader2,
  AlertCircle,
  GraduationCap,
  Mail,
  Layers,
  Search,
  Filter
} from "lucide-react";
import { progressService, subjectService, moduleService } from "@/services/api";
import type { Subject, Module, StudentModuleProgress } from "@/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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

  useEffect(() => {
    if (subjectId) {
      loadData();
    }
  }, [subjectId]);

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

  const filteredProgress = studentProgress.filter(
    (sp) =>
      sp.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sp.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStudentModuleProgress = (studentId: number, moduleId: number) => {
    const student = studentProgress.find((sp) => sp.student_id === studentId);
    return student?.modules.find((p) => p.module_id === moduleId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
      case "IN_PROGRESS":
        return <Clock className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-gray-300" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-saBlue" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
          Aggregating Subject Analytics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-20 max-w-2xl text-center">
        <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Analytics Error</h3>
        <p className="text-gray-500 mt-2 mb-10">{error}</p>
        <Button onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)} className="bg-saBlue h-14 px-10 rounded-2xl font-bold">
          Return to Modules
        </Button>
      </div>
    );
  }

  const completedAllCount = studentProgress.filter(
    (sp) => sp.completed_modules === sp.total_modules && sp.total_modules > 0
  ).length;

  const averageSubjectProgress =
    studentProgress.length > 0
      ? Math.round(
        studentProgress.reduce((sum, sp) => sum + sp.average_progress, 0) /
        studentProgress.length
      )
      : 0;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32">
      {/* PREMIUM HEADER SECTION */}
      <div className="bg-slate-50 rounded-b-[48px] mb-12 shadow-sm border-b border-slate-100 relative overflow-hidden">
        {/* Abstract Background Effects */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-saBlue/10 rounded-full blur-[120px] animate-pulse duration-[5000ms]" />

        <div className="max-w-7xl mx-auto px-6 pt-12 pb-20 relative z-10">
          <Link
            to={`/dashboard/subjects/${subjectId}/modules`}
            className="group inline-flex items-center text-xs font-black text-slate-400 hover:text-saBlue uppercase tracking-widest transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Subject Control Hub
          </Link>

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-saBlue/20 rounded-2xl border border-saBlue/30 text-saBlue">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <Badge variant="outline" className="border-saBlue/30 text-saBlue text-[10px] uppercase font-bold tracking-[0.25em] px-4 py-1.5 bg-saBlue/5 rounded-full">
                  Learning Analytics
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {subject?.name} Progress
                <Sparkles className="w-8 h-8 text-saVividOrange inline-block ml-4 animate-pulse duration-1000" />
              </h1>
              <p className="text-slate-500 text-lg font-medium max-w-xl">
                Comprehensive overview of student engagement, module completion rates, and overall academic performance metrics.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Success Metric</p>
                <div className="text-4xl font-black text-slate-900 leading-none tabular-nums">
                  {averageSubjectProgress}<small className="text-lg text-saBlue ml-1">%</small>
                </div>
              </div>
              <div className="h-16 w-px bg-slate-200 mx-2" />
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cohort Size</p>
                <div className="text-4xl font-black text-slate-900 leading-none tabular-nums">
                  {studentProgress.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {studentProgress.length === 0 ? (
          <div className="py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-2 border-dashed border-gray-100 bg-white rounded-[40px] overflow-hidden shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 bg-gray-50 rounded-3xl flex items-center justify-center mb-8 shadow-sm border border-gray-100">
                  <Users className="w-12 h-12 text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Cohort Empty</h3>
                <p className="text-gray-500 max-w-sm text-sm">
                  No student enrollments or active learning sessions detected for this curriculum yet.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-12">
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Card className="rounded-3xl border-none shadow-xl shadow-gray-200/50 p-8 overflow-hidden relative group transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Users className="w-20 h-20 text-saBlue" />
                </div>
                <div className="p-3 bg-saBlue/10 rounded-2xl text-saBlue inline-block mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Enrollments</h4>
                <p className="text-4xl font-black text-gray-900 tabular-nums">{studentProgress.length}</p>
                <p className="text-xs font-bold text-saBlue mt-4 flex items-center gap-1.5">
                  Active in Subject <ChevronRight className="w-3 h-3" />
                </p>
              </Card>

              <Card className="rounded-3xl border-none shadow-xl shadow-gray-200/50 p-8 overflow-hidden relative group transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Award className="w-20 h-20 text-green-500" />
                </div>
                <div className="p-3 bg-green-50 rounded-2xl text-green-600 inline-block mb-6">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Certifications Ready</h4>
                <p className="text-4xl font-black text-gray-900 tabular-nums">{completedAllCount}</p>
                <p className="text-xs font-bold text-green-600 mt-4 flex items-center gap-1.5">
                  100% Completion <ChevronRight className="w-3 h-3" />
                </p>
              </Card>

              <Card className="rounded-3xl border-none shadow-xl shadow-gray-200/50 p-8 overflow-hidden relative group transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Zap className="w-20 h-20 text-saVividOrange" />
                </div>
                <div className="p-3 bg-saVividOrange/10 rounded-2xl text-saVividOrange inline-block mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Learning Momentum</h4>
                <p className="text-4xl font-black text-gray-900 tabular-nums">{modules.length}</p>
                <p className="text-xs font-bold text-saVividOrange mt-4 flex items-center gap-1.5">
                  Total Active Modules <ChevronRight className="w-3 h-3" />
                </p>
              </Card>
            </div>

            {/* STUDENT ROSTER & SEARCH */}
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Roster Performance</h3>
                  <p className="text-gray-500 text-sm font-medium">Detailed tracking for individual educational paths.</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search Learner..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-14 rounded-2xl border-none bg-white shadow-xl shadow-gray-200/50 pl-12 pr-6 text-sm font-bold focus:ring-4 focus:ring-saBlue/5"
                    />
                  </div>
                  <Button variant="outline" className="h-14 w-14 rounded-2xl border-none bg-white shadow-xl shadow-gray-200/50 hover:bg-gray-50">
                    <Filter className="w-5 h-5 text-gray-400" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-10">
                {filteredProgress.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-[40px] shadow-xl shadow-gray-200/50">
                    <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No matching results for "{searchTerm}"</p>
                  </div>
                ) : (
                  filteredProgress.map((studentData) => {
                    const overallProgress = studentData.average_progress;

                    return (
                      <Card
                        key={studentData.student_id}
                        className="rounded-[40px] border-none shadow-2xl shadow-gray-200/60 overflow-hidden bg-white group hover:shadow-saBlue/5 transition-all duration-500"
                      >
                        <CardHeader className="p-8 md:p-10 border-b border-gray-50">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                            <div className="flex items-center gap-6">
                              <div className="w-20 h-20 bg-saBlue/5 rounded-3xl flex items-center justify-center border border-saBlue/10 text-saBlue transition-transform duration-500 group-hover:scale-105">
                                <GraduationCap className="w-10 h-10" />
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{studentData.student_name}</h3>
                                <div className="flex flex-wrap items-center gap-4">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <Mail className="w-3.5 h-3.5" />
                                    {studentData.student_email}
                                  </div>
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <Layers className="w-3.5 h-3.5" />
                                    {studentData.completed_modules} of {studentData.total_modules} Complete
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-8 px-6 py-4 bg-gray-50 rounded-3xl border border-gray-100/50 shrink-0">
                              <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Mastery Path</p>
                                <div className="text-3xl font-black text-saBlue tabular-nums">{overallProgress}%</div>
                              </div>
                              <div className="w-px h-10 bg-gray-200" />
                              <div className="p-3 bg-white rounded-2xl shadow-sm text-saBlue group-hover:rotate-12 transition-transform">
                                <TrendingUp className="w-5 h-5 font-black" />
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-8 md:p-10">
                          <div className="mb-10">
                            <div className="flex justify-between items-end mb-4 px-1">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Learning Milestones</span>
                              <span className="text-xs font-black text-saBlue bg-saBlue/5 px-4 py-1.5 rounded-full border border-saBlue/10 tabular-nums">
                                Global Progress: {overallProgress}%
                              </span>
                            </div>
                            <Progress value={overallProgress} className="h-6 bg-gray-50 rounded-2xl overflow-hidden border-4 border-white shadow-inner">
                              <div className="h-full bg-gradient-to-r from-saBlue to-blue-400 rounded-2xl shadow-lg transition-all duration-1000" />
                            </Progress>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {modules.map((module) => {
                              const prog = getStudentModuleProgress(studentData.student_id, module.module_id);
                              const status = prog?.is_completed ? "COMPLETED" : (prog?.progress_percent ?? 0) > 0 ? "IN_PROGRESS" : "NOT_STARTED";

                              return (
                                <div
                                  key={module.module_id}
                                  className={cn(
                                    "p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between min-h-[140px] group/item",
                                    status === "COMPLETED"
                                      ? "bg-green-50/30 border-green-100 hover:bg-green-50"
                                      : status === "IN_PROGRESS"
                                        ? "bg-saBlue/5 border-saBlue/10 hover:bg-saBlue/[0.08]"
                                        : "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                                  )}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      {getStatusIcon(status)}
                                      <Badge variant="outline" className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none",
                                        status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                          status === "IN_PROGRESS" ? "bg-saBlue/10 text-saBlue" : "bg-gray-100 text-gray-400"
                                      )}>
                                        {status.replace("_", " ")}
                                      </Badge>
                                    </div>
                                    <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-widest line-clamp-2 leading-tight">
                                      {module.title}
                                    </h4>
                                  </div>

                                  <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                                    <span className="text-[9px] font-bold tracking-tight text-gray-400 tabular-nums">
                                      {prog?.progress_percent || 0}%
                                    </span>
                                    {prog?.completed_on && (
                                      <span className="text-[8px] font-bold text-green-600/60 uppercase">
                                        Done
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}