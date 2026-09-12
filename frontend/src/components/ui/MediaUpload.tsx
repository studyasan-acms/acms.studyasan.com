import { useState, useRef, useEffect } from "react";
import { Upload, Link as LinkIcon, X, FileImage, FileText, Video, CheckCircle } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

interface MediaUploadProps {
  label?: string;
  value?: string | null;
  mediaType?: string | null;
  onChange: (file: File | null, url: string | null, type: string | null) => void;
  acceptTypes?: string;
  maxSize?: number; // in MB
}

export default function MediaUpload({
  label = "Media",
  value,
  mediaType,
  onChange,
  acceptTypes = "image/*,application/pdf,video/*",
  maxSize = 10,
}: MediaUploadProps) {
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [linkUrl, setLinkUrl] = useState(value || "");
  const [previewUrl, setPreviewUrl] = useState(value || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync internal state when the parent changes the value (e.g. navigating to a different question).
  useEffect(() => {
    if (value) {
      setPreviewUrl(value);
      setLinkUrl(value);
      // Don't clear selectedFile here – it may still be the object backing this URL
    } else {
      // No file for this question – wipe everything so Q1's file can't leak into Q2
      setPreviewUrl("");
      setLinkUrl("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [value]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Determine file type
    const type = file.type.startsWith("image/")
      ? "image"
      : file.type === "application/pdf"
        ? "pdf"
        : file.type.startsWith("video/")
          ? "video"
          : "other";

    onChange(file, null, type);
  };

  const handleLinkSubmit = () => {
    if (!linkUrl.trim()) return;

    setPreviewUrl(linkUrl);
    setSelectedFile(null);

    // Determine type from URL or extension
    const url = linkUrl.toLowerCase();
    const type = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      ? "image"
      : url.match(/\.pdf$/i)
        ? "pdf"
        : url.match(/\.(mp4|webm|mov|avi)$/i)
          ? "video"
          : url.startsWith("http")
            ? "link"
            : "other";

    onChange(null, linkUrl, type);
  };

  const handleClear = () => {
    setPreviewUrl("");
    setLinkUrl("");
    setSelectedFile(null);
    onChange(null, null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getResolvedType = () => {
    if (mediaType) return mediaType;
    if (selectedFile) {
      if (selectedFile.type.startsWith("image/")) return "image";
      if (selectedFile.type === "application/pdf") return "pdf";
      if (selectedFile.type.startsWith("video/")) return "video";
      return "file";
    }
    if (previewUrl) {
      const url = previewUrl.toLowerCase();
      if (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) return "image";
      if (url.match(/\.pdf(\?.*)?$/i)) return "pdf";
      if (url.match(/\.(mp4|webm|mov|avi)(\?.*)?$/i)) return "video";
      if (url.startsWith("blob:")) return "file";
      if (url.startsWith("http://") || url.startsWith("https://")) return "link";
    }
    return "file";
  };

  const renderPreview = () => {
    if (!previewUrl) return null;

    const resolvedType = getResolvedType();
    const fileName = selectedFile?.name || (previewUrl.startsWith("blob:") ? "Attached File" : previewUrl.split("/").pop()?.split("?")[0] || "Attached File");

    if (resolvedType === "image") {
      return (
        <div className="relative mt-2 p-3 bg-green-50/60 border border-green-200 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-green-800">File uploaded successfully</span>
              {selectedFile?.name && (
                <span className="text-xs text-gray-500 font-medium truncate max-w-[200px]">({selectedFile.name})</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-xl overflow-hidden bg-white border border-green-100 max-h-56 flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Uploaded answer preview"
              className="max-h-52 w-auto object-contain rounded"
              onError={() => setPreviewUrl("")}
            />
          </div>
        </div>
      );
    }

    if (resolvedType === "pdf") {
      return (
        <div className="relative mt-2 flex items-center justify-between p-3.5 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                <p className="text-xs font-bold text-green-800">File uploaded successfully</p>
              </div>
              <p className="text-xs text-gray-600 font-medium truncate max-w-xs sm:max-w-md mt-0.5">
                {fileName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-saBlue hover:underline px-2 py-1 rounded bg-white border border-slate-200"
            >
              View PDF
            </a>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    if (resolvedType === "video") {
      return (
        <div className="relative mt-2 p-3 bg-green-50/60 border border-green-200 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-green-800">File uploaded successfully</span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-56 mx-auto rounded-xl"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (resolvedType === "file" || previewUrl.startsWith("blob:")) {
      return (
        <div className="relative mt-2 flex items-center justify-between p-3.5 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-green-800">File uploaded successfully</p>
              <p className="text-xs text-gray-600 font-medium truncate max-w-xs sm:max-w-md mt-0.5">
                {fileName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-colors flex-shrink-0"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="relative mt-2 flex items-center justify-between p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-900">Link attached successfully</p>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline truncate block max-w-xs sm:max-w-md"
            >
              {previewUrl}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-colors flex-shrink-0"
          title="Remove link"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-gray-700">{label}</Label>
          <button
            type="button"
            onClick={() => setUploadMode(uploadMode === "file" ? "link" : "file")}
            className="text-xs text-saBlue hover:text-saBlueDarkHover hover:underline flex items-center gap-1 font-medium transition-colors"
          >
            {uploadMode === "file" ? (
              <>
                <LinkIcon className="w-3.5 h-3.5" /> Attach URL instead
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" /> Upload File instead
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload / Link Area */}
      <div>
        {uploadMode === "file" && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              onChange={handleFileSelect}
              className="hidden"
              id={`file-upload-${label}`}
              data-file-upload="true"
            />
            <label
              htmlFor={`file-upload-${label}`}
              data-file-upload="true"
              className="flex items-center justify-center gap-2.5 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-saBlue hover:bg-blue-50/30 transition-all bg-white group"
            >
              <div className="w-8 h-8 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-saBlue transition-colors">
                  Click to upload file (max {maxSize}MB)
                </p>
                <p className="text-[11px] text-gray-400">
                  Supported formats: Images, PDF, Videos
                </p>
              </div>
            </label>
          </div>
        )}

        {uploadMode === "link" && (
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="text-sm rounded-xl"
            />
            <Button
              type="button"
              onClick={handleLinkSubmit}
              className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs px-4 flex-shrink-0"
            >
              Attach Link
            </Button>
          </div>
        )}
      </div>

      {/* Preview */}
      {renderPreview()}
    </div>
  );
}
