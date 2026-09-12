import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ArrowLeft,
  Upload,
  FileText,
  Loader2,
  Puzzle,
  Sparkles,
  Award,
  Calendar,
  X,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { subjectService, brainQuestService } from "@/services/api";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function CreateBrainQuestPage() {
  usePageTitle("Upload Brain Quest Test Paper");
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [dueDate, setDueDate] = useState("");
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === "TEACHER" || (typeof user?.role === "object" && (user?.role as any)?.name === "TEACHER");

  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const params: any = { limit: 100 };
        if (isTeacher && user?.id) {
          params.user_id = user.id;
          params.role = "TEACHER";
        }
        let res = await subjectService.getAll(params);
        let list = res.data?.data || res.data || [];

        if (list.length === 0) {
          res = await subjectService.getAll({ limit: 100 });
          list = res.data?.data || res.data || [];
        }
        setSubjects(list);
      } catch (err) {
        console.error("Failed to load subjects:", err);
        toast.error("Failed to load subjects.");
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [user, isTeacher]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title for the Brain Quest test.");
      return;
    }
    if (!subjectId) {
      toast.error("Please select a subject.");
      return;
    }
    if (!pdfFile) {
      toast.error("Please upload the test paper PDF file.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("subject_id", subjectId);
      formData.append("total_marks", totalMarks);
      if (dueDate) formData.append("due_date", dueDate);
      formData.append("document", pdfFile);

      await brainQuestService.create(formData);
      toast.success("Brain Quest test paper uploaded successfully!");
      navigate("/dashboard/brain-quest");
    } catch (err: any) {
      console.error("Failed to create Brain Quest:", err);
      toast.error(err.response?.data?.error || "Failed to create Brain Quest test paper.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard/brain-quest")}
        className="rounded-xl gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Brain Quest Tests
      </Button>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0276D3] via-[#025AA3] to-[#FF7A00] rounded-3xl p-6 text-white shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" /> New Kids Test Paper
          </div>
          <h1 className="text-2xl font-extrabold">Upload Brain Quest Test Paper</h1>
          <p className="text-xs text-blue-100">
            Upload a PDF test paper so students can view the questions and upload their solved answer sheets.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
          <Puzzle className="w-7 h-7" />
        </div>
      </div>

      {/* Form Card */}
      <Card className="border border-slate-200/80 rounded-3xl shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title & Subject Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Test Paper Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g. Brain Quest - Math Quiz 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <Select value={subjectId} onValueChange={setSubjectId} disabled={loadingSubjects}>
                  <SelectTrigger id="subject" className="h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm">
                    <SelectValue placeholder={loadingSubjects ? "Loading subjects..." : "Select Subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: any) => {
                      const className = s.class?.name ? ` [${s.class.name}]` : "";
                      const boardName = s.board?.name ? ` [${s.board.name}]` : "";
                      const label = `${s.name}${className}${boardName}`;
                      return (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description / Instructions */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Test Instructions / Description
              </Label>
              <Textarea
                id="description"
                placeholder="Write instructions for the kids or parents (e.g. Solve questions in notebook, take photos, and upload as PDF or images)."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm resize-none"
              />
            </div>

            {/* Total Marks & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="marks" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Total Marks
                </Label>
                <div className="relative">
                  <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="marks"
                    type="number"
                    placeholder="100"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Due Date & Time
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="due"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* PDF Test Paper Upload Dropzone */}
            <div className="space-y-2">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Upload Test Paper File (PDF / Document) <span className="text-red-500">*</span>
              </Label>

              <div className="relative border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {pdfFile ? (
                  <div className="flex items-center justify-center gap-3 text-[#0276D3] bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                    <FileText className="w-8 h-8 shrink-0 text-[#0276D3]" />
                    <div className="text-left">
                      <p className="text-sm font-extrabold text-slate-900 line-clamp-1">{pdfFile.name}</p>
                      <p className="text-xs text-slate-500">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                      className="ml-auto text-slate-400 hover:text-red-600 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0276D3] flex items-center justify-center mx-auto shadow-inner">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">
                        Click or drag & drop test paper file here
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports PDF, Word Documents (.doc, .docx), or Images (.png, .jpg)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard/brain-quest")}
                className="rounded-xl h-11 px-5 border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#0276D3] hover:bg-[#025AA3] text-white font-extrabold rounded-xl h-11 px-6 shadow-md shadow-blue-600/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" /> Publish Brain Quest
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
