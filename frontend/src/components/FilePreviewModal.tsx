import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Download,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | undefined;
  title?: string;
}

type FileType = "pdf" | "word" | "image" | "video" | "audio" | "unknown";

function getFileType(url: string): FileType {
  if (!url) return "unknown";
  const cleanUrl = url.split("?")[0].toLowerCase();

  if (cleanUrl.endsWith(".pdf")) {
    return "pdf";
  }
  if (cleanUrl.endsWith(".doc") || cleanUrl.endsWith(".docx")) {
    return "word";
  }
  if (
    cleanUrl.endsWith(".png") ||
    cleanUrl.endsWith(".jpg") ||
    cleanUrl.endsWith(".jpeg") ||
    cleanUrl.endsWith(".gif") ||
    cleanUrl.endsWith(".svg") ||
    cleanUrl.endsWith(".webp") ||
    cleanUrl.endsWith(".bmp")
  ) {
    return "image";
  }
  if (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".avi") ||
    cleanUrl.endsWith(".mkv")
  ) {
    return "video";
  }
  if (
    cleanUrl.endsWith(".mp3") ||
    cleanUrl.endsWith(".wav") ||
    cleanUrl.endsWith(".ogg") ||
    cleanUrl.endsWith(".m4a") ||
    cleanUrl.endsWith(".aac") ||
    cleanUrl.endsWith(".flac")
  ) {
    return "audio";
  }
  return "unknown";
}

function getFileIcon(type: FileType) {
  switch (type) {
    case "pdf":
      return <FileText className="h-5 w-5 text-red-500" />;
    case "word":
      return <FileCode className="h-5 w-5 text-blue-600" />;
    case "image":
      return <ImageIcon className="h-5 w-5 text-emerald-500" />;
    case "video":
      return <VideoIcon className="h-5 w-5 text-indigo-500" />;
    case "audio":
      return <Music className="h-5 w-5 text-amber-500" />;
    default:
      return <FileText className="h-5 w-5 text-slate-500" />;
  }
}

function getFileTypeLabel(type: FileType): string {
  switch (type) {
    case "pdf":
      return "PDF Document";
    case "word":
      return "Word Document";
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    default:
      return "Attachment";
  }
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  url,
  title,
}: FilePreviewModalProps) {
  if (!url) return null;

  const resolvedUrl = resolveImageUrl(url) || "";
  const fileType = getFileType(resolvedUrl);

  // Extract filename from URL
  const getFileName = () => {
    if (title) return title;
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split("/");
      return parts[parts.length - 1] || "Attachment";
    } catch {
      return "Attachment";
    }
  };

  const fileName = getFileName();

  // Detect if running on localhost or a local IP
  const isLocalhost = () => {
    const hostname = window.location.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    );
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = resolvedUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-2xl">
        {/* Header Section */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-6">
            <div className="h-9 w-9 rounded-lg bg-white shadow-sm flex items-center justify-center border border-slate-200/60 shrink-0">
              {getFileIcon(fileType)}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-sm font-bold text-slate-800 truncate leading-snug">
                {fileName}
              </DialogTitle>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                {getFileTypeLabel(fileType)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mr-8 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(resolvedUrl, "_blank")}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200 rounded-lg flex items-center gap-1.5"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200 rounded-lg flex items-center gap-1.5"
              title="Download file"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Preview Container */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30 flex items-center justify-center min-h-[300px]">
          {/* IMAGE */}
          {fileType === "image" && (
            <div className="relative max-w-full max-h-[70vh] flex items-center justify-center bg-white rounded-xl border border-slate-200/50 p-2 shadow-sm animate-fade-in">
              <img
                src={resolvedUrl}
                alt={fileName}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
          )}

          {/* VIDEO */}
          {fileType === "video" && (
            <div className="w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
              <video
                src={resolvedUrl}
                controls
                className="w-full h-full object-contain"
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {/* AUDIO */}
          {fileType === "audio" && (
            <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 animate-pulse">
                <Music className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 truncate max-w-xs">
                  {fileName}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Ready to play</p>
              </div>
              <audio src={resolvedUrl} controls className="w-full mt-2" />
            </div>
          )}

          {/* PDF */}
          {fileType === "pdf" && (
            <div className="w-full h-[65vh] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <iframe
                src={`${resolvedUrl}#toolbar=1`}
                className="w-full h-full border-0"
                title={fileName}
              />
            </div>
          )}

          {/* WORD DOCS */}
          {fileType === "word" && (
            <div className="w-full h-[65vh] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {isLocalhost() ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
                  <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Localhost Preview Restricted
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Microsoft Office Document Viewer requires a publicly accessible URL
                    to load and render Word documents. Since you are in a local
                    development environment, please download the file directly.
                  </p>
                  <Button
                    onClick={handleDownload}
                    className="mt-5 bg-saBlue hover:bg-sky-700 text-white font-bold rounded-lg text-xs h-9 px-4 flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    Download to View
                  </Button>
                </div>
              ) : (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                    resolvedUrl
                  )}`}
                  className="w-full h-full border-0"
                  title={fileName}
                />
              )}
            </div>
          )}

          {/* UNKNOWN */}
          {fileType === "unknown" && (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">
                Preview Unavailable
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This file format does not support browser previewing. You can download
                the file to view it on your device.
              </p>
              <Button
                onClick={handleDownload}
                className="mt-5 bg-saBlue hover:bg-sky-700 text-white font-bold rounded-lg text-xs h-9 px-4 flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Download Attachment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
