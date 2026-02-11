import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Play,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Layers,
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/dashboard/subjects"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-saBlue mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subjects
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {subject?.board && (
                  <Badge variant="secondary" className="bg-blue-50 text-saBlue hover:bg-blue-100 border-none text-xs">
                    {subject.board.name}
                  </Badge>
                )}
                {subject?.class && (
                  <Badge variant="outline" className="text-gray-500 border-gray-200 text-xs">
                    {subject.class.name}
                  </Badge>
                )}
                {overallProgress === 100 && (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-xs font-semibold">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{subject?.name}</h1>
            </div>

            <Card className="min-w-[180px] bg-white border-gray-200 shadow-sm rounded-xl">
              <CardContent className="p-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Progress</span>
                  <span className="text-sm font-black text-gray-900">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="h-1.5 bg-gray-100" />
                <div className="flex justify-between items-center mt-2 text-xs font-medium text-gray-500">
                  <span>{completedCount}/{modules.length} modules</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Learning Modules</h2>
              <span className="text-sm text-gray-500">{modules.length} modules</span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-gray-100">
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 w-16">
                      Module
                    </TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[250px]">
                      Title
                    </TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[120px] hidden md:table-cell">
                      Duration
                    </TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[100px] hidden lg:table-cell">
                      Content
                    </TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[100px]">
                      Status
                    </TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[100px]">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...modules]
                    .sort((a, b) => a.order - b.order)
                    .map((module, index) => {
                      const status = getProgressStatus(module.module_id);
                      const moduleProgress = getModuleProgress(module.module_id);
                      const progressPercent = moduleProgress?.progress_percent || 0;
                      const isCompleted = status === "COMPLETED";

                      return (
                        <TableRow
                          key={module.module_id}
                          className={cn(
                            "hover:bg-blue-50/30 border-b-gray-50 transition-colors",
                            isCompleted && "bg-green-50/50 hover:bg-green-100/30"
                          )}
                        >
                          <TableCell className="pl-6 py-3">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm",
                              isCompleted 
                                ? "bg-green-100 text-green-700" 
                                : "bg-gray-100 text-gray-600"
                            )}>
                              {index + 1}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-gray-900">
                                  {module.title}
                                </span>
                                {isCompleted && (
                                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                              </div>
                              {module.description && (
                                <p className="text-xs text-gray-500 line-clamp-1">
                                  {module.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell py-3">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span>{module.estimated_time_minutes} min</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell py-3">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              <Layers className="w-4 h-4 text-gray-400" />
                              <span>{module.content?.length || 0} topics</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {isCompleted ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-semibold">
                                Completed
                              </Badge>
                            ) : status === "IN_PROGRESS" ? (
                              <div className="flex flex-col gap-1">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none font-semibold">
                                  In Progress
                                </Badge>
                                <span className="text-xs text-gray-500">{progressPercent}%</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-gray-500 border-gray-200">
                                Not Started
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6 py-3">
                            <Button
                              onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`)}
                              size="sm"
                              variant={isCompleted ? "outline" : "default"}
                              className={cn(
                                "h-8 px-4 rounded-lg font-semibold text-xs transition-all active:scale-95",
                                !isCompleted && "bg-saBlue hover:bg-saBlue/90 text-white",
                                isCompleted && "text-green-700 border-green-200 hover:bg-green-50"
                              )}
                            >
                              {isCompleted ? (
                                <>Review</>
                              ) : status === "IN_PROGRESS" ? (
                                <>
                                  Continue
                                  <Play className="w-3 h-3 ml-1.5 fill-current" />
                                </>
                              ) : (
                                <>
                                  Start
                                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}