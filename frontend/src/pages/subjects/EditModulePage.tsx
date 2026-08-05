import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
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
  Sparkles,
  ChevronRight,
  MoreHorizontal,
  Eye,
  ExternalLink,
} from "lucide-react";
import { moduleService } from "@/services/api";
import type { Module, ModuleContent, UpdateModuleData } from "@/types";
import { usePageTitle } from "@/hooks/usePageTitle";
import ErrorModal from "@/components/ui/errorModal";
import SuccessModal from "@/components/ui/successModal";
import { cn, resolveImageUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      window.open(fileUrl, "_blank", "noopener,noreferrer");
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
      await loadModule(); // Reload to show new content
      e.target.value = ""; // Reset file input
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
        {
          text_content: textContent,
        }
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
    const iconClass = "w-5 h-5 transition-transform group-hover:scale-110 duration-300";
    switch (type) {
      case "text":
        return (
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-500">
            <FileText className={iconClass} />
          </div>
        );
      case "image":
        return (
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-500">
            <ImageIcon className={iconClass} />
          </div>
        );
      case "video":
        return (
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-500">
            <Video className={iconClass} />
          </div>
        );
      case "pdf":
        return (
          <div className="p-2.5 bg-red-50 rounded-xl text-red-500">
            <File className={iconClass} />
          </div>
        );
      default:
        return (
          <div className="p-2.5 bg-gray-50 rounded-xl text-gray-500">
            <Files className={iconClass} />
          </div>
        );
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
      <div className="flex flex-col items-center justify-center min-vh-screen space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-saBlue" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">
          Loading Module Content...
        </p>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Module not found</h3>
        <Button onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)} className="mt-4 rounded-xl">
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* PREMIUM HEADER SECTION */}
      <div className="relative overflow-hidden bg-slate-50 rounded-b-[32px] mb-8 shadow-sm border-b border-slate-100 group">
        {/* Animated Background Elements */}
        <div className="absolute top-[-20%] right-[-5%] w-[400px] h-[400px] bg-saBlue/10 rounded-full blur-[100px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[80px]" />

        <div className="max-w-5xl mx-auto px-6 pt-8 pb-10 relative z-10">
          <Link
            to={`/dashboard/subjects/${subjectId}/modules`}
            className="group inline-flex items-center text-xs font-black text-slate-400 hover:text-saBlue uppercase tracking-widest transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Subject Modules
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-saBlue/10 rounded-xl text-saBlue animate-in zoom-in duration-500 shadow-sm border border-saBlue/5">
                <Layers className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <Badge variant="outline" className="border-saBlue/20 text-saBlue text-[9px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 bg-saBlue/5 rounded-full mb-1">
                  Asset Synchronization Active
                </Badge>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Edit: {module.title}
                  <Sparkles className="w-4 h-4 text-saVividOrange animate-pulse" />
                </h1>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-10">
        <div className="grid lg:grid-cols-1 gap-10">
          {/* 1. MODULE SETTINGS CARD */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="rounded-[24px] border-none shadow-xl shadow-gray-200/50 overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <FileText className="w-4 h-4 text-saBlue" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight">Module Configuration</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-gray-400">Core Identity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                      Module Display Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter module title"
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-saBlue/5 transition-all px-4 text-sm font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      Module Synopsis <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Provide a comprehensive summary of this module..."
                      rows={3}
                      className="rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-saBlue/5 transition-all p-4 text-sm font-medium leading-relaxed resize-none"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="estimated_time_minutes" className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      Completion Duration (Minutes)
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-saBlue/50" />
                      <Input
                        id="estimated_time_minutes"
                        type="number"
                        min="0"
                        value={formData.estimated_time_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_time_minutes: parseInt(e.target.value) || 0 }))}
                        className="h-11 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-saBlue/5 transition-all pl-12 pr-4 text-sm font-bold"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
                className="flex-1 sm:flex-none sm:min-w-[160px] h-11 rounded-xl border-gray-200 font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Discard Changes
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none sm:min-w-[160px] h-11 bg-saBlue hover:bg-saBlue/90 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-saBlue/20 transition-all active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-3" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* 2. CONTENT REPOSITORY CARD */}
          <Card className="rounded-[24px] border-none shadow-xl shadow-gray-200/50 overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <Files className="w-4 h-4 text-saBlue" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight">Instructional Assets</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Content Management</CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    onClick={() => document.getElementById("file-upload")?.click()}
                    disabled={uploading}
                    className="h-10 px-5 rounded-xl bg-gray-950 hover:bg-gray-900 font-bold text-xs uppercase tracking-widest shadow-lg shadow-gray-200/50 transition-all"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                    Upload Resources
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {/* Text Entry Section */}
              <div className="space-y-4">
                <Label htmlFor="text-content" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 flex items-center gap-2">
                  <Plus className="w-3 h-3 text-saBlue" />
                  Quick Module Text
                </Label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Textarea
                    id="text-content"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Compose instructional text, lecture notes, or module summaries..."
                    rows={2}
                    className="flex-1 rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white focus:ring-4 focus:ring-saBlue/5 transition-all p-4 text-sm font-medium resize-none min-h-[60px]"
                  />
                  <Button
                    onClick={handleAddTextContent}
                    disabled={!textContent.trim()}
                    variant="outline"
                    className="sm:w-28 h-auto sm:aspect-square flex flex-col items-center justify-center gap-2 rounded-xl border-saBlue/20 text-saBlue hover:bg-saBlue hover:text-white transition-all duration-500"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Add Text</span>
                  </Button>
                </div>
              </div>

              {/* Assets List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Deployed Content · {module.content?.length || 0} Items
                  </h4>
                </div>

                <div className="grid gap-4">
                  {module.content && module.content.length > 0 ? (
                    module.content.map((content) => (
                      <div
                        key={content.content_id}
                        className="group flex flex-col md:flex-row items-stretch border border-gray-100 rounded-xl hover:border-saBlue/20 hover:bg-saBlue/[0.02] transition-all duration-300 overflow-hidden"
                      >
                        <div
                          onClick={() => handleViewContent(content)}
                          className="flex-1 p-3 flex items-center gap-3 cursor-pointer"
                          title="Click to view content"
                        >
                          <div className="shrink-0">{getContentIcon(content.type)}</div>
                          <div className="flex-1 min-w-0 pr-2">
                            <h5 className="text-xs font-bold text-gray-800 truncate group-hover:text-saBlue transition-colors flex items-center gap-1.5">
                              {content.type === "text"
                                ? content.text_content?.substring(0, 80) + (content.text_content?.length! > 80 ? "..." : "")
                                : (content.file_name || (content as any).filename || "Instructional Material")}
                            </h5>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-saBlue/50 bg-saBlue/5 px-2 py-0.5 rounded-full">
                                {content.type}
                              </span>
                              {content.file_size && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 tracking-tight">
                                  <Files className="w-3 h-3" />
                                  {formatFileSize(content.file_size)}
                                </span>
                              )}
                              {content.uploaded_at && (
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 tracking-tight">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(content.uploaded_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="md:w-28 border-t md:border-t-0 md:border-l border-gray-100 flex items-center justify-center gap-1 p-3 md:p-0 bg-gray-50/30 transition-colors">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewContent(content);
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-saBlue hover:bg-saBlue/10 rounded-lg transition-all"
                            title="View Content"
                          >
                            {content.type === "text" ? <Eye className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveContent(content.content_id);
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete Content"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[24px] bg-gray-50/30">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100">
                        <Plus className="w-6 h-6 text-gray-200" />
                      </div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No instructional assets detected</p>
                      <p className="text-xs text-gray-500 mt-2">Upload files or compose text to populate this module.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Dialog open={selectedTextContent !== null} onOpenChange={(open) => { if (!open) setSelectedTextContent(null); }}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Module Text Content</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">Instructional material preview</DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-800 leading-relaxed max-h-[60vh] overflow-y-auto whitespace-pre-wrap font-medium">
            {selectedTextContent}
          </div>
        </DialogContent>
      </Dialog>

      <ErrorModal
        open={!!error}
        onConfirm={() => setError("")}
        title="Operation Interrupted"
        description={error}
      />

      <SuccessModal
        open={!!success}
        onConfirm={() => setSuccess("")}
        title="Configuration Saved"
        description={success}
        okText="Continue Editing"
      />
    </div>
  );
}