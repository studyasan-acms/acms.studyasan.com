import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Clock,
  Play,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Sparkles,
  Zap,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Expand,
  Maximize2
} from "lucide-react";
import { moduleService, progressService } from "@/services/api";
import type { Module, StudentModuleProgress, UpdateProgressData } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn, resolveImageUrl } from "@/lib/utils";

export default function StudyModulePage() {
  usePageTitle("Study Session");
  const { subjectId, moduleId } = useParams<{
    subjectId: string;
    moduleId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<StudentModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);

  useEffect(() => {
    if (subjectId && moduleId && user) {
      loadData();
    }
  }, [subjectId, moduleId, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [moduleResponse, progressResponse] = await Promise.all([
        moduleService.getModuleById(parseInt(subjectId!), parseInt(moduleId!)),
        progressService.getStudentProgress(user!.id, parseInt(subjectId!)),
      ]);

      const moduleData = moduleResponse.data;
      setModule(moduleData);

      const moduleProgress = progressResponse.data.find(
        (p: any) => p.module_id === parseInt(moduleId!)
      );
      setProgress(moduleProgress || null);

      if (!moduleProgress) {
        await startModule();
      }
    } catch (err: any) {
      console.error("Failed to load module session:", err);
      navigate(`/dashboard/subjects/${subjectId}/modules`);
    } finally {
      setLoading(false);
    }
  };

  const startModule = async () => {
    try {
      const progressData = await progressService.updateProgress(
        user!.id,
        parseInt(subjectId!),
        parseInt(moduleId!),
        { progress_percent: 0, is_completed: false }
      );
      setProgress(progressData.data);
    } catch (err: any) {
      console.error("Failed to initialize progress:", err);
    }
  };

  const updateProgress = async (data: UpdateProgressData) => {
    try {
      setUpdating(true);
      const progressData = await progressService.updateProgress(
        user!.id,
        parseInt(subjectId!),
        parseInt(moduleId!),
        data
      );
      setProgress(progressData.data);
    } catch (err: any) {
      console.error("Failed to synchronize progress:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteModule = async () => {
    await updateProgress({ progress_percent: 100, is_completed: true });
    navigate(`/dashboard/subjects/${subjectId}/modules`);
  };

  const handleNext = async () => {
    if (currentContentIndex < (module?.content.length || 0) - 1) {
      const newIndex = currentContentIndex + 1;
      setCurrentContentIndex(newIndex);

      if (module && !progress?.is_completed) {
        const progressPercent = Math.round(
          ((newIndex + 1) / module.content.length) * 100
        );
        await updateProgress({ progress_percent: progressPercent });
      }
    }
  };

  const handlePrevious = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
    }
  };

  const renderContent = (content: any) => {
    const assetUrl = resolveImageUrl(content.s3_url || content.url);

    switch (content.type) {
      case "text":
        return (
          <div className="max-w-4xl mx-auto py-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="prose prose-slate prose-lg max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-[1.8] text-base font-medium tracking-tight bg-white p-6 md:p-8 rounded-[24px] border border-gray-100 shadow-sm transition-all hover:shadow-md">
                {content.text_content}
              </div>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="max-w-5xl mx-auto py-6 animate-in zoom-in-95 duration-700">
            <div className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-xl overflow-hidden group relative">
              <img
                src={assetUrl}
                alt={content.filename || content.file_name || "Instructional Asset"}
                className="w-full h-auto max-h-[700px] object-contain rounded-[32px] transition-transform duration-700 group-hover:scale-[1.01]"
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="absolute bottom-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="rounded-full bg-white/90 backdrop-blur-sm shadow-xl">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-center mt-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500/50" />
              Secure Instructional Content
            </p>
          </div>
        );

      case "video":
        return (
          <div className="max-w-6xl mx-auto py-6 animate-in fade-in zoom-in-95 duration-700">
            <div className="bg-gray-950 rounded-[40px] overflow-hidden shadow-2xl ring-1 ring-white/10 relative group">
              <video
                controls
                controlsList="nodownload"
                className="w-full aspect-video shadow-2xl"
                onContextMenu={(e) => e.preventDefault()}
              >
                <source src={assetUrl} />
                Learning content unavailable in this browser.
              </video>
            </div>
            <div className="flex items-center justify-between mt-8 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-saBlue/10 rounded-xl text-saBlue">
                  <Play className="w-5 h-5" fill="currentColor" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">Dynamic Video Lecture</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Multimedia Module</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "pdf":
        return (
          <div className="max-w-6xl mx-auto py-6 animate-in fade-in duration-700">
            <div className="bg-white p-3 rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden min-h-[700px]">
              <div className="w-full h-[750px] rounded-[32px] overflow-hidden bg-gray-50 flex flex-col">
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {content.filename || content.file_name || "Document Viewer"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold tracking-widest uppercase py-1 border-gray-200">
                    Encrypted PDF
                  </Badge>
                </div>
                <iframe
                  src={`${assetUrl}#toolbar=0&navpanes=0`}
                  className="w-full flex-1 border-none"
                  title="PDF Document"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="max-w-4xl mx-auto py-20 text-center animate-in fade-in duration-700">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
              <AlertCircle className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 tracking-tight">Resource Unsupported</h3>
            <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">This asset type is currently not optimized for this viewing environment.</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-saBlue" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Initializing Study Environment...</p>
      </div>
    );
  }

  if (!module) return null;

  const currentContent = module.content[currentContentIndex];
  const progressPercent = module.content.length > 0
    ? ((currentContentIndex + 1) / module.content.length) * 100
    : 100;

  return (
    <div className="min-h-screen bg-white pb-40">
      {/* IMMERSIVE HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <Button
                variant="ghost"
                onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
                className="hover:bg-gray-100 rounded-full h-10 w-10 p-0 text-gray-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate pr-4">{module.title}</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="font-medium">
                    Part {currentContentIndex + 1} of {module.content.length}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="uppercase tracking-wider font-semibold text-[11px]">
                    {progress?.is_completed ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-end w-64 flex-shrink-0">
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="text-xs font-medium text-gray-500">Progress</span>
                <span className="text-xs font-bold text-gray-900">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2 w-full bg-gray-100" />
            </div>

            <div className="md:hidden flex items-center">
              <span className="text-sm font-bold text-saBlue">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-6 pt-10">
        {module.content.length === 0 ? (
          <div className="py-24 text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="w-16 h-16 bg-white rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 ring-1 ring-gray-100">
              <AlertCircle className="w-8 h-8 text-gray-200" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Curriculum Unavailable</h3>
            <p className="text-gray-500 text-base mt-3 max-w-sm mx-auto font-medium">This module exists in the syllabus but currently contains no instructional materials.</p>
            <Button
              onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
              className="mt-8 h-10 px-8 rounded-xl bg-saBlue hover:bg-saBlue/90 font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-saBlue/20"
            >
              Back to Roadmap
            </Button>
          </div>
        ) : (
          <div className="pb-10">
            {renderContent(currentContent)}
          </div>
        )}
      </div>

      {/* FLOAT NAVIGATION CONTROLS */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-6">
        <Card className="bg-white/90 backdrop-blur-2xl border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] rounded-[32px] overflow-hidden p-3 md:p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={handlePrevious}
              disabled={currentContentIndex === 0}
              variant="outline"
              className="h-10 sm:w-10 w-10 rounded-xl border-gray-200 transition-all active:scale-90 disabled:opacity-30 disabled:grayscale group"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600 group-hover:text-saBlue" />
            </Button>

            <div className="flex-1 flex items-center justify-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-4 h-10 bg-gray-50 rounded-full border border-gray-100">
                {module.content.map((_, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentContentIndex(index)}
                    className={cn(
                      "cursor-pointer transition-all duration-500 rounded-full",
                      index === currentContentIndex
                        ? "w-4 h-2 bg-saBlue"
                        : index < currentContentIndex
                          ? "w-2 h-2 bg-green-400"
                          : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                    )}
                  />
                ))}
              </div>
              <span className="sm:hidden text-xs font-black text-gray-500 uppercase tracking-widest">
                {currentContentIndex + 1} / {module.content.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!progress?.is_completed && currentContentIndex === module.content.length - 1 && (
                <Button
                  onClick={handleCompleteModule}
                  disabled={updating}
                  className="h-10 px-6 rounded-xl bg-saVividOrange hover:bg-saVividOrange/90 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-saVividOrange/20 transition-all active:scale-95 group/complete"
                >
                  {updating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  )}
                  Finish Session
                </Button>
              )}

              {currentContentIndex < module.content.length - 1 && (
                <Button
                  onClick={handleNext}
                  className="h-10 px-6 md:px-8 rounded-xl bg-saBlue hover:bg-saBlue/90 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-saBlue/20 transition-all active:scale-95 group/next"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2 group-hover/next:translate-x-1 transition-transform" />
                </Button>
              )}

              {currentContentIndex === module.content.length - 1 && progress?.is_completed && (
                <Button
                  onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
                  className="h-10 px-8 rounded-xl bg-gray-950 hover:bg-gray-900 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 transition-all"
                >
                  Subject Hub
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}