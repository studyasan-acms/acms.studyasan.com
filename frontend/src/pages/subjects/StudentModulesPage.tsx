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
  BookOpen,
  CheckCircle,
  Clock,
  Play,
  ArrowLeft,
  ChevronRight,
  Target,
  Trophy,
  Sparkles,
  Loader2,
  Calendar,
  Layers,
  Zap,
  Plus,
} from "lucide-react";
import { moduleService, progressService, subjectService } from "@/services/api";
import type { Module, Subject, StudentModuleProgress } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";

export default function StudentModulesPage() {
  usePageTitle("My Learning Path");
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<StudentModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subjectId && user) {
      loadData();
    }
  }, [subjectId, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectResponse, modulesResponse, progressResponse] =
        await Promise.all([
          subjectService.getById(parseInt(subjectId!)),
          moduleService.getModulesBySubject(parseInt(subjectId!)),
          progressService.getStudentProgress(user!.id, parseInt(subjectId!)),
        ]);

      setSubject(subjectResponse.data);
      setModules(Array.isArray(modulesResponse.data) ? modulesResponse.data : []);
      setProgress(Array.isArray(progressResponse.data) ? progressResponse.data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load learning data");
    } finally {
      setLoading(false);
    }
  };

  const getModuleProgress = (moduleId: number) => {
    return progress.find((p) => p.module_id === moduleId);
  };

  const getProgressStatus = (moduleId: number) => {
    const moduleProgress = getModuleProgress(moduleId);
    if (!moduleProgress) return "NOT_STARTED";
    if (moduleProgress.is_completed) return "COMPLETED";
    if (moduleProgress.progress_percent > 0) return "IN_PROGRESS";
    return "NOT_STARTED";
  };

  const calculateOverallProgress = () => {
    if (modules.length === 0) return 0;
    const completedModules = progress.filter((p) => p.is_completed).length;
    return Math.round((completedModules / modules.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-saBlue" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
          Calibrating Learning Path...
        </p>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();
  const completedCount = progress.filter((p) => p.is_completed).length;

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* PREMIUM HEADER & PROGRESS OVERVIEW */}
      <div className="relative overflow-hidden bg-slate-50 rounded-b-[48px] mb-12 shadow-sm border-b border-slate-100">
        {/* Abstract Background Effects */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-saBlue/10 rounded-full blur-[120px] animate-pulse duration-[5000ms]" />
        <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />

        <div className="max-w-7xl mx-auto px-6 pt-12 pb-20 relative z-10">
          <Link
            to="/dashboard/subjects"
            className="group inline-flex items-center text-xs font-black text-slate-400 hover:text-saBlue uppercase tracking-widest transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Catalog
          </Link>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-saBlue/20 rounded-2xl border border-saBlue/30 text-saBlue">
                  <Layers className="w-8 h-8" />
                </div>
                <Badge variant="outline" className="border-saBlue/30 text-saBlue text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-1.5 bg-saBlue/5 rounded-full">
                  Educational Syllabus
                </Badge>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                {subject?.name}
                <Sparkles className="w-8 h-8 text-saVividOrange inline-block ml-4 animate-pulse" />
              </h1>
              <p className="text-slate-500 text-lg font-medium max-w-xl">
                Master the curriculum through structured learning modules and track your progress toward certification.
              </p>
            </div>

            <Card className="bg-white border-slate-100 rounded-[40px] p-8 md:p-10 shadow-xl">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-saVividOrange/10 rounded-xl text-saVividOrange">
                      <Target className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mastery Status</span>
                  </div>
                  <span className="text-3xl font-black text-slate-900">{overallProgress}%</span>
                </div>

                <div className="space-y-4">
                  <Progress value={overallProgress} className="h-4 bg-slate-50 border-none rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-saBlue to-blue-400 rounded-full shadow-lg" />
                  </Progress>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                    <span className="text-gray-500">{completedCount} Completed</span>
                    <span className="text-gray-500">{modules.length} Total Modules</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Efficiency Ranking</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-saBlue/10 rounded-lg text-saBlue">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Streak</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {modules.length === 0 ? (
          <div className="py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-2 border-dashed border-gray-100 bg-gray-50/50 rounded-[40px] overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-sm border border-gray-100">
                  <BookOpen className="w-12 h-12 text-gray-200" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Curriculum Pending</h3>
                <p className="text-gray-500 max-w-xs text-sm">
                  Instructional modules for this subject are currently being finalized. Please check back shortly.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                Sequential Journey · {modules.length} Step{modules.length !== 1 ? 's' : ''}
              </h2>
            </div>

            <div className="grid gap-6">
              {[...modules]
                .sort((a, b) => a.order - b.order)
                .map((module, index) => {
                  const status = getProgressStatus(module.module_id);
                  const isCompleted = status === "COMPLETED";
                  const isStarted = status === "IN_PROGRESS";

                  return (
                    <Card
                      key={module.module_id}
                      className={cn(
                        "group border-none shadow-sm hover:shadow-xl hover:shadow-saBlue/5 transition-all duration-500 rounded-[32px] overflow-hidden bg-white ring-1 ring-gray-100",
                        isCompleted && "bg-gray-50/50 ring-green-100/50"
                      )}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row items-stretch">
                          {/* Order Indicator */}
                          <div className={cn(
                            "md:w-32 flex flex-row md:flex-col items-center justify-center p-6 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 transition-colors duration-500 shrink-0",
                            isCompleted ? "bg-green-500/5" : "bg-gray-50/50 group-hover:bg-saBlue/5"
                          )}>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest mb-0 md:mb-2 mr-4 md:mr-0 transition-colors",
                              isCompleted ? "text-green-500" : "text-gray-400 group-hover:text-saBlue/40"
                            )}>Step</span>
                            <span className={cn(
                              "text-5xl font-black transition-all duration-500 tabular-nums leading-none",
                              isCompleted ? "text-green-200" : "text-gray-200 group-hover:text-saBlue"
                            )}>
                              {(index + 1).toString().padStart(2, '0')}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 p-6 md:p-10 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3 mb-4">
                                {isCompleted ? (
                                  <div className="flex items-center gap-1.5 bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Completed
                                  </div>
                                ) : isStarted ? (
                                  <div className="flex items-center gap-1.5 bg-saBlue/5 text-saBlue px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-saBlue/10 animate-pulse">
                                    <Clock className="w-3.5 h-3.5" />
                                    In Progress
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 bg-gray-50 text-gray-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Pending
                                  </div>
                                )}
                              </div>

                              <h3 className={cn(
                                "text-2xl font-black tracking-tight mb-4 transition-colors duration-300",
                                isCompleted ? "text-gray-500" : "text-gray-800 group-hover:text-saBlue"
                              )}>
                                {module.title}
                              </h3>
                              <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-3xl mb-8">
                                {module.description}
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-6 border-t border-gray-100">
                              <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Clock className="w-4 h-4" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">{module.estimated_time_minutes} min</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                  <Layers className="w-4 h-4" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">{module.content?.length || 0} Assets</span>
                                </div>
                              </div>

                              <Button
                                onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`)}
                                className={cn(
                                  "h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 group/btn-join min-w-[200px]",
                                  isCompleted
                                    ? "bg-white border-2 border-green-100 text-green-600 hover:bg-green-50"
                                    : "bg-saBlue hover:bg-saBlue/90 text-white shadow-xl shadow-saBlue/20"
                                )}
                              >
                                {isCompleted ? (
                                  <>Review Knowledge <ChevronRight className="w-4 h-4 ml-2 group-hover/btn-join:translate-x-1 transition-transform" /></>
                                ) : isStarted ? (
                                  <>Continue Learning <Play className="w-4 h-4 ml-2 group-hover/btn-join:scale-110 transition-transform" fill="currentColor" /></>
                                ) : (
                                  <>Begin Learning <Plus className="w-4 h-4 ml-2 group-hover/btn-join:rotate-90 transition-transform" /></>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}