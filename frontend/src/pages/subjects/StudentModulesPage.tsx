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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/dashboard/subjects"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-saBlue mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subjects
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {subject?.board && (
                  <Badge variant="secondary" className="bg-blue-50 text-saBlue hover:bg-blue-100 border-none">
                    {subject.board.name}
                  </Badge>
                )}
                {subject?.class && (
                  <Badge variant="outline" className="text-gray-500 border-gray-200">
                    {subject.class.name}
                  </Badge>
                )}
                {overallProgress === 100 && (
                  <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-none">
                    Completed
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{subject?.name}</h1>
            </div>

            <Card className="min-w-[280px] bg-white border-gray-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Progress</span>
                  <span className="text-2xl font-bold text-gray-900">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-2.5 bg-gray-100" />
                <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                  <span>{completedCount} of {modules.length} modules completed</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {modules.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No modules yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-2">
              Content for this subject is being prepared. Check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Modules</h2>
              <span className="text-sm text-gray-500">{modules.length} items</span>
            </div>

            <div className="grid gap-4">
              {[...modules]
                .sort((a, b) => a.order - b.order)
                .map((module, index) => {
                  const status = getProgressStatus(module.module_id);
                  const isCompleted = status === "COMPLETED";
                  const isStarted = status === "IN_PROGRESS";

                  return (
                    <div
                      key={module.module_id}
                      className={cn(
                        "group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
                        isCompleted && "bg-gray-50/50"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Status Indicator Strip */}
                        <div className={cn(
                          "w-full sm:w-2 h-2 sm:h-auto",
                          isCompleted ? "bg-green-500" : isStarted ? "bg-saBlue" : "bg-gray-200"
                        )} />

                        <div className="p-6 flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-500 font-bold text-lg border border-gray-100">
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className={cn(
                                "text-lg font-bold text-gray-900 truncate",
                                isCompleted && "text-gray-600"
                              )}>
                                {module.title}
                              </h3>
                              {isCompleted && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                              {module.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{module.estimated_time_minutes} min</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5" />
                                <span>{module.content?.length || 0} topics</span>
                              </div>
                            </div>
                          </div>

                          <div className="self-end sm:self-center pt-4 sm:pt-0 pl-14 sm:pl-0 w-full sm:w-auto">
                            <Button
                              onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`)}
                              variant={isCompleted ? "outline" : "default"}
                              className={cn(
                                "w-full sm:w-auto font-semibold shadow-none",
                                !isCompleted && "bg-saBlue hover:bg-saBlueDarkHover text-white",
                                isCompleted && "text-gray-600 border-gray-300 hover:bg-gray-50"
                              )}
                            >
                              {isCompleted ? (
                                <>Review</>
                              ) : isStarted ? (
                                <>Continue <Play className="w-3.5 h-3.5 ml-2 fill-current" /></>
                              ) : (
                                <>Start Learning <ChevronRight className="w-4 h-4 ml-1" /></>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}