import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  ArrowLeft,
  Clock,
  FileText,
  ChevronRight,
  MoreVertical,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { moduleService, subjectService, progressService } from "@/services/api";
import type { Module, Subject, StudentModuleProgress } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SubjectModulesPage() {
  usePageTitle("Subject Modules");
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<StudentModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subjectId) {
      loadData();
    }
  }, [subjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectRes, modulesRes, progressRes] = await Promise.all([
        subjectService.getById(parseInt(subjectId!)),
        moduleService.getModulesBySubject(parseInt(subjectId!)),
        user?.role === "STUDENT"
          ? progressService.getStudentProgress(user.id, parseInt(subjectId!))
          : Promise.resolve({ success: true, data: [] as StudentModuleProgress[] })
      ]);

      setSubject(subjectRes.data);
      setModules(Array.isArray(modulesRes.data) ? modulesRes.data : []);

      if (user?.role === "STUDENT") {
        setProgress(Array.isArray(progressRes.data) ? progressRes.data : []);
      }

      setError(null);
    } catch (err: any) {
      console.error("Error loading modules:", err);
      setError(err.response?.data?.message || "Failed to load module data");
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this module? This will also delete all associated content."
      )
    ) {
      return;
    }

    try {
      await moduleService.deleteModule(parseInt(subjectId!), moduleId);
      await loadData(); // Reload to get fresh data
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete module");
    }
  };

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";

  const getModuleProgress = (moduleId: number) => {
    return progress.find((p) => p.module_id === moduleId);
  };

  const isModuleCompleted = (moduleId: number) => {
    const moduleProgress = getModuleProgress(moduleId);
    return moduleProgress?.is_completed || false;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-saBlue" />
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          Loading Learning Modules...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card className="border-red-100 bg-red-50/50 rounded-3xl overflow-hidden shadow-sm">
          <CardContent className="p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-xs">{error}</p>
            <Button
              onClick={() => navigate("/dashboard/subjects")}
              className="bg-saBlue hover:bg-saBlue/90 rounded-xl px-8 h-12 font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Subjects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* PREMIUM HEADER SECTION */}
      <div className="relative overflow-hidden bg-slate-50 rounded-b-[32px] mb-8 shadow-sm border-b border-slate-100 group">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-saBlue/10 rounded-full blur-[100px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[80px]" />

        <div className="max-w-7xl mx-auto px-6 pt-8 pb-10 relative z-10">
          {/* Breadcrumb / Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}`)}
            className="mb-6 text-slate-500 hover:text-saBlue hover:bg-saBlue/5 rounded-xl transition-all h-9 px-3 group/back"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover/back:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back to Subject</span>
          </Button>

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-saBlue/20 rounded-xl border border-saBlue/30 text-saBlue animate-in zoom-in duration-500">
                  <Layers className="w-5 h-5" />
                </div>
                <Badge variant="outline" className="border-saBlue/30 text-saBlue text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 bg-saBlue/5 rounded-full">
                  Learning Content
                </Badge>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-1 flex items-center gap-3">
                  {subject?.name}
                  <Sparkles className="w-4 h-4 text-saVividOrange animate-pulse" />
                </h1>
                <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-xl">
                  {isTeacher
                    ? "Structure and manage your course modules, curriculum, and educational resources."
                    : "Access your learning materials, study modules, and track your educational journey."}
                </p>
              </div>
            </div>

            {isTeacher && (
              <Button
                onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/create`)}
                className="bg-saBlue hover:bg-saBlue/90 text-white h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-saBlue/20 transition-all active:scale-95 group/btn border border-saBlue/50"
              >
                <Plus className="w-4 h-4 mr-2 group-hover/btn:rotate-90 transition-transform duration-300" />
                Create New Module
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* MODULES LIST */}
        {!Array.isArray(modules) || modules.length === 0 ? (
          <div className="py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Card className="border-2 border-dashed border-gray-100 bg-gray-50/50 rounded-[40px] overflow-hidden">
              <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-sm border border-gray-100 group">
                  <BookOpen className="w-12 h-12 text-gray-200 group-hover:text-saBlue transition-colors duration-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">No learning modules yet</h3>
                <p className="text-gray-500 mb-10 max-w-sm text-sm">
                  {isTeacher
                    ? "Start building your curriculum by creating your first instructional module."
                    : "Your teacher hasn't published any learning modules for this subject yet."}
                </p>
                {isTeacher && (
                  <Button
                    onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/create`)}
                    className="h-10 px-8 rounded-xl bg-saBlue hover:bg-saBlue/90 font-bold text-xs uppercase tracking-widest shadow-lg shadow-saBlue/15"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Module
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Curriculum Structure · {modules.length} {modules.length === 1 ? 'Module' : 'Modules'}
              </h2>
            </div>

            <div className="space-y-6">
              {[...modules]
                .sort((a, b) => a.order - b.order)
                .map((module, index) => {
                  const isCompleted = user?.role === "STUDENT" && isModuleCompleted(module.module_id);
                  const moduleProgress = getModuleProgress(module.module_id);

                  return (
                    <Card
                      key={module.module_id}
                      className={cn(
                        "group border transition-all duration-500 rounded-[24px] overflow-hidden",
                        isCompleted
                          ? "border-green-200 bg-green-50/30 hover:border-green-300 hover:shadow-xl hover:shadow-green-500/10"
                          : "border-gray-100 hover:border-saBlue/20 hover:shadow-xl hover:shadow-saBlue/5"
                      )}
                    >
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row items-stretch">
                          {/* Module Order Indicator */}
                          <div className={cn(
                            "md:w-20 flex flex-row md:flex-col items-center justify-center p-3 md:p-4 border-b md:border-b-0 md:border-r border-gray-100 transition-colors duration-500 shrink-0",
                            isCompleted
                              ? "bg-green-100 group-hover:bg-green-200/50"
                              : "bg-gray-50 group-hover:bg-saBlue/5"
                          )}>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-[0.2em] mb-0 md:mb-1 mr-3 md:mr-0 transition-colors",
                              isCompleted
                                ? "text-green-600 group-hover:text-green-700"
                                : "text-gray-500 group-hover:text-saBlue/40"
                            )}>Module</span>
                            <span className={cn(
                              "text-2xl font-black transition-all duration-500 tabular-nums leading-none",
                              isCompleted
                                ? "text-green-600 group-hover:text-green-700"
                                : "text-gray-200 group-hover:text-saBlue"
                            )}>
                              {(index + 1).toString().padStart(2, '0')}
                            </span>
                          </div>

                          {/* Module Info */}
                          <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <h3 className={cn(
                                    "text-lg font-black tracking-tight transition-colors duration-300",
                                    isCompleted
                                      ? "text-green-800 group-hover:text-green-900"
                                      : "text-gray-800 group-hover:text-saBlue"
                                  )}>
                                    {module.title}
                                  </h3>
                                  {isCompleted && (
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                  )}
                                </div>
                                {isTeacher && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:bg-gray-50 rounded-lg">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl border-gray-100 p-1 min-w-[140px] shadow-lg">
                                      <DropdownMenuItem
                                        onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/edit`)}
                                        className="rounded-lg px-3 py-2 font-bold text-[10px] uppercase tracking-widest text-gray-600 focus:bg-saBlue/5 focus:text-saBlue cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5 mr-2" />
                                        Edit Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteModule(module.module_id)}
                                        className="rounded-lg px-3 py-2 font-bold text-[10px] uppercase tracking-widest text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer mt-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                        Delete Module
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                              <p className="text-gray-500 mb-6 max-w-3xl leading-relaxed text-xs">
                                {module.description}
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-50">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                                  isCompleted
                                    ? "bg-green-100 border-green-200 group-hover:bg-green-50 group-hover:border-green-300"
                                    : "bg-gray-50 border-gray-100 group-hover:bg-white group-hover:border-saBlue/10"
                                )}>
                                  <Clock className="w-3.5 h-3.5 text-saBlue/60" />
                                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{module.estimated_time_minutes} min</span>
                                </div>
                                <div className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                                  isCompleted
                                    ? "bg-green-100 border-green-200 group-hover:bg-green-50 group-hover:border-green-300"
                                    : "bg-gray-50 border-gray-100 group-hover:bg-white group-hover:border-saBlue/10"
                                )}>
                                  <FileText className="w-3.5 h-3.5 text-saBlue/60" />
                                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    {module.content?.length || 0} Content
                                  </span>
                                </div>
                                {isCompleted && user?.role === "STUDENT" && (
                                  <div className="bg-green-100 border-green-200 px-3 py-1.5 rounded-xl border">
                                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest flex items-center gap-1.5">
                                      <CheckCircle className="w-3 h-3" />
                                      Completed
                                    </span>
                                  </div>
                                )}
                              </div>

                              <Button
                                onClick={() => {
                                  if (isTeacher) {
                                    navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/edit`);
                                  } else {
                                    navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`);
                                  }
                                }}
                                className={cn(
                                  "h-9 px-5 rounded-xl font-bold text-xs uppercase tracking-[0.15em] transition-all active:scale-95 group/btn-go",
                                  isTeacher
                                    ? "bg-gray-50 text-gray-700 hover:bg-saBlue hover:text-white border border-gray-100"
                                    : isCompleted
                                      ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                                      : "bg-saBlue hover:bg-saBlue/90 text-white shadow-lg shadow-saBlue/15"
                                )}
                              >
                                {isTeacher ? "Manage" : isCompleted ? "Review" : "Start"}
                                <ChevronRight className="w-3 h-3 ml-2 group-hover/btn-go:translate-x-1 transition-transform" />
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