import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { moduleService, progressService } from "@/services/api";
import type { Module, StudentModuleProgress } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn, resolveImageUrl } from "@/lib/utils";

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Per-content loading state
  const [contentLoading, setContentLoading] = useState(true);

  // PDF state
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.2);

  // Strictly block right click, copy, cut, inspect globally on this page
  useEffect(() => {
    const block = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    const blockKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "u")) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "C", "J"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("contextmenu", block, true);
    document.addEventListener("keydown", blockKeys, true);
    return () => {
      document.removeEventListener("contextmenu", block, true);
      document.removeEventListener("keydown", blockKeys, true);
    };
  }, []);

  // Prevent drag on the whole page
  useEffect(() => {
    const blockDrag = (e: DragEvent) => e.preventDefault();
    document.addEventListener("dragstart", blockDrag, true);
    return () => document.removeEventListener("dragstart", blockDrag, true);
  }, []);

  useEffect(() => {
    if (subjectId && moduleId && user) {
      loadData();
    }
  }, [subjectId, moduleId, user]);

  // Reset content loading state and PDF page when switching content
  useEffect(() => {
    setContentLoading(true);
    setPdfPage(1);
    setPdfScale(1.2);
    setNumPages(0);
  }, [currentContentIndex]);

  const loadData = async () => {
    try {
      setLoading(true);
      const isStudent = user?.role === "STUDENT";
      const [moduleResponse, progressResponse] = await Promise.all([
        moduleService.getModuleById(parseInt(subjectId!), parseInt(moduleId!)),
        isStudent
          ? progressService.getStudentProgress(user!.id, parseInt(subjectId!))
          : Promise.resolve({ success: true, data: [] }),
      ]);

      const moduleData = moduleResponse.data;
      setModule(moduleData);

      const moduleProgress = Array.isArray(progressResponse?.data)
        ? progressResponse.data.find(
            (p: any) => p.module_id === parseInt(moduleId!)
          )
        : null;
      setProgress(moduleProgress || null);

      if (isStudent && !moduleProgress) {
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
        { is_completed: false, progress_percent: 0 }
      );
      setProgress(progressData.data);
    } catch (err) {
      console.error("Failed to start module progress tracking:", err);
    }
  };

  const handleProgressUpdate = async (isCompleted: boolean) => {
    if (!module || user?.role !== "STUDENT") return;
    try {
      setUpdating(true);
      const newProgressPercent = Math.round(
        ((currentContentIndex + 1) / module.content.length) * 100
      );
      const response = await progressService.updateProgress(
        user.id,
        parseInt(subjectId!),
        parseInt(moduleId!),
        {
          is_completed: isCompleted,
          progress_percent: isCompleted
            ? 100
            : Math.max(progress?.progress_percent || 0, newProgressPercent),
        }
      );
      setProgress(response.data);
    } catch (err) {
      console.error("Failed to sync progress:", err);
    } finally {
      setUpdating(false);
    }
  };

  const handleNext = () => {
    if (!module) return;
    if (currentContentIndex < module.content.length - 1) {
      setCurrentContentIndex((prev) => prev + 1);
      handleProgressUpdate(false);
    } else {
      handleProgressUpdate(true);
    }
  };

  const handlePrevious = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex((prev) => prev - 1);
    }
  };

  const block = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  // ── Canvas-based PDF Viewer (no native browser PDF viewer) ──────────────
  const PdfViewer = ({ url }: { url: string }) => (
    <div
      className="w-full h-full flex flex-col overflow-hidden select-none"
      onContextMenu={block}
    >
      {/* PDF toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
            disabled={pdfPage <= 1}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300 px-2">
            {pdfPage} / {numPages || "—"}
          </span>
          <button
            onClick={() => setPdfPage((p) => Math.min(numPages, p + 1))}
            disabled={pdfPage >= numPages}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPdfScale((s) => Math.max(0.5, s - 0.2))}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300 w-12 text-center">
            {Math.round(pdfScale * 100)}%
          </span>
          <button
            onClick={() => setPdfScale((s) => Math.min(3, s + 0.2))}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PDF canvas scroll area */}
      <div
        className="flex-1 overflow-auto bg-slate-800 flex justify-center p-4"
        onContextMenu={block}
      >
        {contentLoading && (
          <div className="flex items-center justify-center h-full w-full absolute inset-0 bg-slate-800/80 z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-saBlue/30 border-t-saBlue rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest animate-pulse">
                Loading PDF...
              </span>
            </div>
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            setContentLoading(false);
          }}
          onLoadError={() => setContentLoading(false)}
          loading=""
        >
          <div
            className="shadow-2xl rounded-sm overflow-hidden"
            onContextMenu={block}
            style={{ userSelect: "none" }}
          >
            <Page
              pageNumber={pdfPage}
              scale={pdfScale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onContextMenu={block}
            />
          </div>
        </Document>
      </div>
    </div>
  );

  // ── Loading overlay ──────────────────────────────────────────────────────
  const LoadingOverlay = () => (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-saBlue/30 border-t-saBlue rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest animate-pulse">
          Loading Content...
        </span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 select-none"
        onContextMenu={block}
      >
        <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Protected Study Session...
        </p>
      </div>
    );
  }

  if (!module) return null;

  const currentContent = module.content[currentContentIndex];
  const rawUrl = currentContent
    ? currentContent.s3_url ||
      (currentContent as any).url ||
      (currentContent as any).file_url
    : "";
  const assetUrl = resolveImageUrl(rawUrl);

  // ── Navigation bar (shared) ──────────────────────────────────────────────
  const NavBar = ({ inFullscreen }: { inFullscreen: boolean }) => (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0",
        inFullscreen
          ? "bg-slate-900 border-slate-800 text-white"
          : "bg-white border-slate-200/80 text-slate-900"
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {!inFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-saBlue hover:bg-saBlue/10 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className={cn(
                "text-sm font-extrabold truncate max-w-[180px] sm:max-w-xs",
                inFullscreen ? "text-slate-100" : "text-slate-900"
              )}
            >
              {module.title}
            </h1>
            <Badge
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                inFullscreen
                  ? "bg-saBlue text-white"
                  : "bg-saBlue/10 text-saBlue border-saBlue/20"
              )}
            >
              {currentContentIndex + 1} / {module.content.length}
            </Badge>
          </div>
          <p
            className={cn(
              "text-[11px] truncate max-w-[200px] sm:max-w-xs",
              inFullscreen ? "text-slate-400" : "text-slate-500"
            )}
          >
            {(currentContent as any)?.filename ||
              currentContent?.file_name ||
              module.description ||
              "Study Session"}
          </p>
        </div>
      </div>

      {/* Center nav */}
      <div
        className={cn(
          "flex items-center gap-2 p-1 px-2 rounded-xl border",
          inFullscreen ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200/80"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevious}
          disabled={currentContentIndex === 0}
          className={cn(
            "h-7 px-2.5 rounded-lg font-bold text-xs",
            inFullscreen
              ? "text-slate-300 hover:text-white hover:bg-slate-700"
              : "text-slate-700 hover:bg-white"
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
        </Button>
        <div className="flex items-center gap-1 px-1">
          {module.content.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentContentIndex(idx)}
              className={cn(
                "h-2 rounded-full transition-all cursor-pointer",
                idx === currentContentIndex
                  ? "w-5 bg-saBlue"
                  : inFullscreen
                  ? "w-2 bg-slate-700 hover:bg-slate-500"
                  : "w-2 bg-slate-200 hover:bg-slate-300"
              )}
            />
          ))}
        </div>
        <Button
          size="sm"
          onClick={handleNext}
          disabled={updating}
          className="h-7 px-3 rounded-lg bg-saBlue hover:bg-saBlueDarkHover text-white font-bold text-xs"
        >
          {updating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : currentContentIndex === module.content.length - 1 ? (
            <>
              Finish <CheckCircle className="w-3 h-3 ml-1" />
            </>
          ) : (
            <>
              Next <ChevronRight className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold",
            inFullscreen
              ? "bg-slate-800 border-slate-700 text-slate-300"
              : "bg-slate-50 border-slate-200/80 text-slate-700"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-saBlue">
            {Math.round(progress?.progress_percent || 0)}%
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={cn(
            "h-8 px-3 rounded-xl text-xs font-bold",
            inFullscreen
              ? "border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
              : "border-saBlue/30 text-saBlue bg-saBlue/5 hover:bg-saBlue/10"
          )}
        >
          {inFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 mr-1.5" /> Exit
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 mr-1.5" /> Fullscreen
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // ── Content renderer ─────────────────────────────────────────────────────
  const ContentArea = () => {
    if (!currentContent) return null;

    return (
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-950"
        onContextMenu={block}
      >
        {/* PDF: canvas-based — browser native context menu is completely bypassed */}
        {currentContent.type === "pdf" && (
          <div className="w-full h-full" onContextMenu={block}>
            <PdfViewer url={assetUrl as string} />
          </div>
        )}

        {/* IMAGE */}
        {currentContent.type === "image" && (
          <div
            className="w-full h-full flex items-center justify-center p-4 relative bg-slate-900"
            onContextMenu={block}
          >
            {contentLoading && <LoadingOverlay />}
            <img
              src={assetUrl}
              alt="Protected Educational Content"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl pointer-events-none select-none"
              onContextMenu={block}
              draggable={false}
              onLoad={() => setContentLoading(false)}
            />
            {/* Full transparent overlay blocks right-click entirely */}
            <div
              className="absolute inset-0 z-10"
              onContextMenu={block}
              style={{ pointerEvents: "all", userSelect: "none", cursor: "default" }}
            />
          </div>
        )}

        {/* VIDEO */}
        {currentContent.type === "video" && (
          <div
            className="w-full h-full flex items-center justify-center bg-black relative"
            onContextMenu={block}
          >
            {contentLoading && <LoadingOverlay />}
            <video
              controls
              controlsList="nodownload noremoteplayback nofullscreen"
              disablePictureInPicture
              className="w-full h-full object-contain"
              onContextMenu={block}
              onCanPlay={() => setContentLoading(false)}
              onLoadedData={() => setContentLoading(false)}
              style={{ pointerEvents: "all" }}
            >
              <source src={assetUrl} />
              Video playback unsupported.
            </video>
            {/* Transparent right-click shield — covers the non-controls area */}
            <div
              className="absolute inset-0 z-10"
              onContextMenu={block}
              style={{ pointerEvents: "none", userSelect: "none" }}
            />
          </div>
        )}

        {/* TEXT */}
        {currentContent.type === "text" && (
          <div
            className="w-full h-full overflow-y-auto p-6 sm:p-10 text-slate-100 font-medium text-sm sm:text-base leading-relaxed whitespace-pre-wrap select-none bg-slate-900"
            onContextMenu={block}
            ref={(el) => {
              if (el) setContentLoading(false);
            }}
          >
            <div className="max-w-4xl mx-auto">{currentContent.text_content}</div>
          </div>
        )}
      </div>
    );
  };

  // ── Fullscreen mode ──────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-[99999] flex flex-col w-screen h-screen overflow-hidden select-none bg-slate-950"
        onContextMenu={block}
      >
        <NavBar inFullscreen={true} />
        <ContentArea />
      </div>
    );
  }

  // ── Standard view ────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col space-y-3 max-w-7xl mx-auto pb-6 px-3 sm:px-6 select-none"
      onContextMenu={block}
    >
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <NavBar inFullscreen={false} />
      </div>

      {module.content.length === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-200/80 rounded-2xl p-8">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Content Available</h3>
          <p className="text-xs text-slate-500 mt-1">
            This module currently does not contain any study materials.
          </p>
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
          onContextMenu={block}
        >
          <div
            className="w-full h-[calc(100vh-170px)] min-h-[640px] flex flex-col relative"
            onContextMenu={block}
          >
            <ContentArea />
          </div>
        </div>
      )}
    </div>
  );
}