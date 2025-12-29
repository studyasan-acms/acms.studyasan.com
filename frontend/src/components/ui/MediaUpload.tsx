import { useState, useRef, useEffect } from "react";
import { Upload, Link as LinkIcon, X, FileImage, FileText, Video } from "lucide-react";
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

  // Initialize with value prop when component mounts or value changes
  useEffect(() => {
    if (value) {
      setPreviewUrl(value);
      setLinkUrl(value);
    } else {
      setPreviewUrl("");
      setLinkUrl("");
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

  const renderPreview = () => {
    if (!previewUrl) return null;

    const type = mediaType || "link";

    return (
      <div className="relative mt-2 border rounded-lg p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 z-10"
          onClick={handleClear}
        >
          <X className="w-4 h-4" />
        </Button>

        {type === "image" && (
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-64 mx-auto rounded"
            onError={() => setPreviewUrl("")}
          />
        )}

        {type === "pdf" && (
          <div className="flex items-center gap-2 p-4">
            <FileText className="w-8 h-8 text-red-500" />
            <div>
              <p className="font-medium">PDF Document</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View PDF
              </a>
            </div>
          </div>
        )}

        {type === "video" && (
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-64 mx-auto rounded"
          >
            Your browser does not support the video tag.
          </video>
        )}

        {type === "link" && (
          <div className="flex items-center gap-2 p-4">
            <LinkIcon className="w-8 h-8 text-blue-500" />
            <div>
              <p className="font-medium">External Link</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {previewUrl}
              </a>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}

      <div className="flex flex-col md:flex-row gap-3">
        {/* Upload Mode Toggle */}
        <div className="flex gap-2 md:flex-col">
          <Button
            type="button"
            variant={uploadMode === "file" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadMode("file")}
            className="flex-1 md:flex-none"
          >
            <Upload className="w-4 h-4 mr-1" />
            Upload File
          </Button>
          <Button
            type="button"
            variant={uploadMode === "link" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadMode("link")}
            className="flex-1 md:flex-none"
          >
            <LinkIcon className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>

        {/* Upload/Link Area */}
        <div className="flex-1">
          {/* File Upload */}
          {uploadMode === "file" && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptTypes}
                onChange={handleFileSelect}
                className="hidden"
                id={`file-upload-${label}`}
              />
              <label
                htmlFor={`file-upload-${label}`}
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to upload (max {maxSize}MB)
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Supported: Images, PDF, Videos
              </p>
            </div>
          )}

          {/* Link Input */}
          {uploadMode === "link" && (
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <Button type="button" onClick={handleLinkSubmit}>
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {renderPreview()}
    </div>
  );
}
