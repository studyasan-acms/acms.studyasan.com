import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Upload,
  FileText,
  Trash2,
  Image as ImageIcon,
  Video,
  File,
  Loader2,
  Save,
  Clock,
  Plus,
  Files,
  Calendar,
  Layers,
  Eye,
  ExternalLink,
  X,
  Music,
} from "lucide-react";
import { moduleService } from "@/services/api";
import type { Module, ModuleContent, UpdateModuleData } from "@/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import ErrorModal from "@/components/ui/errorModal";
import SuccessModal from "@/components/ui/successModal";
import FilePreviewModal from "@/components/FilePreviewModal";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function EditModulePage() {
  usePageTitle("Edit Module");
  const { subjectId, moduleId } = useParams<{
    subjectId: string;
    moduleId: string;
  }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [module, setModule] = useState<Module | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<UpdateModuleData>({
    title: "",
    description: "",
    estimated_time_minutes: 0,
  });
  const [textContent, setTextContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedTextContent, setSelectedTextContent] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);

  const handleViewContent = (content: ModuleContent) => {
    if (content.type === "text") {
      if (content.text_content) {
        setSelectedTextContent(content.text_content);
      } else {
        setError("Text content is empty.");
      }
      return;
    }
    const rawUrl = content.s3_url || (content as any).url || (content as any).file_url;
    const fileUrl = resolveImageUrl(rawUrl);
    if (fileUrl) {
      setPreviewFile({
        url: fileUrl,
        title: (content as any).filename || content.file_name || "Module Asset",
      });
    } else {
      setError("Unable to open file: Document URL is missing.");
    }
  };

  useEffect(() => {
    if (subjectId && moduleId) {
      loadModule();
    }
  }, [subjectId, moduleId]);

  const loadModule = async () => {
    try {
      setLoading(true);
      const response = await moduleService.getModuleById(
        parseInt(subjectId!),
        parseInt(moduleId!)
      );
      setModule(response.data);
      setFormData({
        title: response.data.title,
        description: response.data.description,
        estimated_time_minutes: response.data.estimated_time_minutes,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load module");
      navigate(`/dashboard/subjects/${subjectId}/modules`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      await moduleService.updateModule(
        parseInt(subjectId!),
        parseInt(moduleId!),
        formData
      );
      setSuccess("Module details updated successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update module");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      await moduleService.uploadContent(
        parseInt(subjectId!),
        parseInt(moduleId!),
        files
      );
      await loadModule();
      e.target.value = "";
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleAddTextContent = async () => {
    if (!textContent.trim()) {
      setError("Please enter some text content.");
      return;
    }

    try {
      await moduleService.addTextContent(
        parseInt(subjectId!),
        parseInt(moduleId!),
        { text_content: textContent }
      );
      setTextContent("");
      await loadModule();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add text content");
    }
  };

  const handleRemoveContent = async (contentId: number) => {
    if (!confirm("Are you sure you want to remove this content?")) return;

    try {
      await moduleService.removeContent(
        parseInt(subjectId!),
        parseInt(moduleId!),
        contentId
      );
      await loadModule();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove content");
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="w-4 h-4 text-saBlue" />;
      case "image":
        return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case "video":
        return <Video className="w-4 h-4 text-purple-500" />;
      case "audio":
        return <Music className="w-4 h-4 text-amber-500" />;
      case "pdf":
        return <File className="w-4 h-4 text-red-500" />;
      default:
        return <Files className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Module Content...
        </p>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Trash2 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Module Not Found</h3>
        <Button onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)} className="rounded-xl bg-saBlue text-white text-xs">
          Back to Modules
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* COMPACT BRAND HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to={`/dashboard/subjects/${subjectId}/modules`}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-saBlue hover:bg-saBlue/10 transition-all shrink-0"
            title="Back to Modules"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                Edit: {module.title}
              </h1>
              <Badge className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                Module #{module.order}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate max-w-xl">
              {module.description || "Manage settings and instructional assets."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${moduleId}/study`)}
            className="h-9 px-3.5 rounded-xl border-saBlue/30 bg-saBlue/5 text-xs font-semibold text-saBlue hover:bg-saBlue/10"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Preview Module
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
            className="h-9 px-3.5 rounded-xl border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-4 bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold shadow-sm"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-3.5 h-3.5 mr-1.5" /> Save Module</>
            )}
          </Button>
        </div>
      </div>

      {/* COMPACT TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: MODULE CONFIGURATION (4 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 sm:p-5">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-saBlue" />
                Module Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-700">
                  Module Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Introduction to Grammar"
                  className="h-9 rounded-xl border-slate-200 focus:ring-saBlue text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-slate-700">
                  Synopsis / Overview *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide a concise summary of learning outcomes..."
                  rows={4}
                  className="rounded-xl border-slate-200 focus:ring-saBlue text-xs font-medium resize-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimated_time_minutes" className="text-xs font-bold text-slate-700">
                  Duration (Minutes)
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="estimated_time_minutes"
                    type="number"
                    min="0"
                    value={formData.estimated_time_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_time_minutes: parseInt(e.target.value) || 0 }))}
                    className="h-9 pl-9 rounded-xl border-slate-200 focus:ring-saBlue text-xs font-semibold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: INSTRUCTIONAL ASSETS & CONTENT (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 sm:p-5">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Files className="w-4 h-4 text-saVividOrange" />
                Instructional Resources & Assets
              </CardTitle>
              <Badge className="bg-slate-100 text-slate-700 border-0 text-[10px] font-bold">
                {module.content?.length || 0} Items
              </Badge>
            </CardHeader>

            <CardContent className="p-0 space-y-5">
              {/* UPLOAD & QUICK TEXT ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Upload Button Box */}
                <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 hover:border-saBlue bg-slate-50/50 hover:bg-saBlue/5 rounded-xl cursor-pointer transition-all">
                  <div className="flex items-center gap-2 text-saBlue font-bold text-xs">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>{uploading ? "Uploading..." : "Upload Files"}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">
                    Audio, PDF, Documents, Video, Images
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.mp3,.wav,.ogg,.m4a,.aac,.flac,.wma,.opus"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>

                {/* Add Quick Text Modal / Inline Toggle */}
                <div className="p-3.5 border border-slate-200/80 rounded-xl bg-slate-50/50 space-y-2 flex flex-col justify-between">
                  <Label htmlFor="quick-text" className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-saVividOrange" /> Add Lecture Note / Text
                  </Label>
                  <Textarea
                    id="quick-text"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter text or lecture notes..."
                    rows={2}
                    className="text-xs rounded-lg border-slate-200 bg-white resize-none"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTextContent}
                    disabled={!textContent.trim()}
                    className="h-7 text-[11px] font-bold bg-saVividOrange hover:bg-saVividOrange/90 text-white rounded-lg w-full"
                  >
                    Add Text Item
                  </Button>
                </div>
              </div>

              {/* ASSETS LIST TABLE / ITEM ROW */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Module Assets ({module.content?.length || 0})
                </h4>

                {module.content && module.content.length > 0 ? (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden bg-white">
                    {module.content.map((content) => (
                      <div
                        key={content.content_id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                          onClick={() => handleViewContent(content)}
                        >
                          <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                            {getContentIcon(content.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate hover:text-saBlue">
                              {content.type === "text"
                                ? content.text_content?.substring(0, 60) + (content.text_content?.length! > 60 ? "..." : "")
                                : (content.file_name || (content as any).filename || "Instructional Document")}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                              <span className="uppercase font-bold text-saBlue">{content.type}</span>
                              {content.file_size && <span>• {formatFileSize(content.file_size)}</span>}
                              {content.uploaded_at && (
                                <span>• {new Date(content.uploaded_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewContent(content)}
                            className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-lg"
                            title="View / Preview"
                          >
                            {content.type === "text" ? <Eye className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveContent(content.content_id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remove Content"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-400">No resources uploaded yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Use file uploader or add quick text above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* TEXT CONTENT PREVIEW DIALOG */}
      <Dialog open={selectedTextContent !== null} onOpenChange={(open) => { if (!open) setSelectedTextContent(null); }}>
        <DialogContent className="max-w-xl rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Text Content Preview</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Instructional material notes</DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed max-h-[50vh] overflow-y-auto whitespace-pre-wrap font-medium">
            {selectedTextContent}
          </div>
        </DialogContent>
      </Dialog>

      {/* FILE PREVIEW MODAL */}
      <FilePreviewModal
        isOpen={previewFile !== null}
        onClose={() => setPreviewFile(null)}
        url={previewFile?.url}
        title={previewFile?.title}
      />

      {/* MODALS */}
      <ErrorModal
        open={!!error}
        onConfirm={() => setError("")}
        title="Error"
        description={error}
      />

      <SuccessModal
        open={!!success}
        onConfirm={() => setSuccess("")}
        title="Saved"
        description={success}
        okText="Continue Editing"
      />
    </div>
  );
}