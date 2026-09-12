import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Award,
  Calendar,
  BookOpen,
  User,
  Loader2,
  Sparkles,
  Puzzle,
  X,
  Send,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { brainQuestService } from "@/services/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import FilePreviewModal from "@/components/FilePreviewModal";

export default function BrainQuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.role === "ADMIN" || (typeof user?.role === "object" && (user?.role as any)?.name === "ADMIN");
  const isTeacher = user?.role === "TEACHER" || (typeof user?.role === "object" && (user?.role as any)?.name === "TEACHER");
  const isStudent = user?.role === "STUDENT" || (typeof user?.role === "object" && (user?.role as any)?.name === "STUDENT");

  const [quest, setQuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string } | null>(null);

  // Student Submission State
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Teacher Grading Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeMarks, setGradeMarks] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [grading, setGrading] = useState(false);

  usePageTitle(quest ? `Brain Quest - ${quest.title}` : "Brain Quest Test");

  const fetchQuestDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await brainQuestService.getById(parseInt(id));
      setQuest(res.data);
    } catch (err: any) {
      console.error("Failed to load Brain Quest details:", err);
      toast.error("Failed to load test details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuestDetail();
  }, [fetchQuestDetail]);

  // Handle Student Answer File Upload
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!submissionFile) {
      toast.error("Please select an answer sheet file (jpg, jpeg, png, doc, docx, or pdf).");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("submission", submissionFile);
      if (remarks.trim()) formData.append("remarks", remarks.trim());

      await brainQuestService.submitAnswer(parseInt(id), formData);
      toast.success("Answer sheet submitted successfully!");
      setSubmissionFile(null);
      setRemarks("");
      fetchQuestDetail();
    } catch (err: any) {
      console.error("Failed to submit answer:", err);
      toast.error(err.response?.data?.error || "Failed to submit answer file.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Teacher Grading Submit
  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      setGrading(true);
      await brainQuestService.gradeSubmission(selectedSubmission.id, {
        marks_obtained: gradeMarks ? parseFloat(gradeMarks) : 0,
        feedback: gradeFeedback.trim(),
      });
      toast.success("Submission graded successfully!");
      setSelectedSubmission(null);
      fetchQuestDetail();
    } catch (err: any) {
      console.error("Failed to grade submission:", err);
      toast.error(err.response?.data?.error || "Failed to grade submission.");
    } finally {
      setGrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-[#0276D3]" />
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 space-y-4">
        <AlertCircle className="w-12 h-12 text-[#FF7A00] mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">Brain Quest Test Not Found</h3>
        <Button onClick={() => navigate("/dashboard/brain-quest")} variant="outline" className="rounded-xl">
          Back to Tests
        </Button>
      </div>
    );
  }

  const studentSubmission = isStudent ? quest.submissions?.[0] : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Back Navigation */}
      <Button
        variant="ghost"
        onClick={() => navigate("/dashboard/brain-quest")}
        className="rounded-xl gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Brain Quest Tests
      </Button>

      {/* HEADER CARD */}
      <Card className="border border-slate-200/80 rounded-3xl shadow-sm bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-[#0276D3] via-[#025AA3] to-[#FF7A00] p-6 sm:p-8 text-white space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-saVividOrange text-white font-black px-3 py-1 rounded-xl text-xs">
                {quest.subject?.name || "General Subject"}
              </Badge>
              <span className="text-xs text-blue-100 font-bold flex items-center gap-1">
                <Award className="w-4 h-4 text-amber-300" /> Total: {quest.total_marks || 100} Marks
              </span>
            </div>

            {/* View Test Paper Button */}
            {quest.document_url && (
              <Button
                onClick={() => setPreviewFile({ url: quest.document_url, title: `Test Paper - ${quest.title}` })}
                className="bg-white text-[#0276D3] hover:bg-blue-50 font-extrabold rounded-2xl h-10 px-5 shadow-md flex items-center gap-2"
              >
                <Eye className="w-4 h-4 text-[#0276D3]" />
                View Test Paper PDF
              </Button>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{quest.title}</h1>
            {quest.description && (
              <p className="text-sm text-blue-50 mt-2 leading-relaxed max-w-3xl">
                {quest.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10 text-xs text-blue-100">
            {quest.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-300" />
                <span>Due Date: {format(new Date(quest.due_date), "PPP p")}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-200" />
              <span>Teacher: {quest.teacher?.user?.name || "Teacher"}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* STUDENT SECTION: SUBMIT ANSWER SHEET */}
      {isStudent && (
        <Card className="border border-slate-200/80 rounded-3xl shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Status Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#FF7A00] flex items-center justify-center font-bold">
                  <Puzzle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Your Submission</h3>
                  <p className="text-xs text-slate-500">Upload your notebook photo or PDF answer sheet below</p>
                </div>
              </div>

              {studentSubmission ? (
                studentSubmission.is_graded ? (
                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Graded: {studentSubmission.marks_obtained ?? 0} / {quest.total_marks || 100} Marks
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-blue-50 border-blue-200 text-[#0276D3] font-bold px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#0276D3]" />
                    Submitted on {format(new Date(studentSubmission.submitted_at), "MMM d, h:mm a")} (Pending Evaluation)
                  </Badge>
                )
              ) : (
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 font-bold px-3 py-1.5 rounded-xl text-sm">
                  Not Submitted Yet
                </Badge>
              )}
            </div>

            {/* Existing Submission Details */}
            {studentSubmission && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Answer File</span>
                  <Button
                    size="sm"
                    onClick={() =>
                      setPreviewFile({
                        url: studentSubmission.submission_file_url,
                        title: `Your Submission - ${quest.title}`,
                      })
                    }
                    className="bg-[#0276D3] hover:bg-[#025AA3] text-white font-bold rounded-xl h-8 text-xs px-3 shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View My Answer Sheet
                  </Button>
                </div>

                {studentSubmission.remarks && (
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-900">Your Remarks:</span> {studentSubmission.remarks}
                  </p>
                )}

                {/* Teacher Feedback & Score if Graded */}
                {studentSubmission.is_graded && (
                  <div className="pt-3 border-t border-slate-200/60 space-y-2 bg-emerald-50/60 -mx-5 -mb-5 p-5 rounded-b-2xl">
                    <div className="flex items-center justify-between text-emerald-800">
                      <span className="font-extrabold text-xs uppercase tracking-wider">Teacher Grade & Remarks</span>
                      <span className="font-black text-sm">{studentSubmission.marks_obtained} / {quest.total_marks || 100}</span>
                    </div>
                    {studentSubmission.feedback && (
                      <p className="text-xs text-emerald-900 font-medium">
                        "{studentSubmission.feedback}"
                      </p>
                    )}
                    {studentSubmission.grader?.name && (
                      <p className="text-[10px] text-emerald-600 font-bold">
                        Evaluated by: {studentSubmission.grader.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Submission Form (Allow re-submission or initial submission) */}
            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                {studentSubmission ? "Re-upload / Update Answer Sheet" : "Upload Answer Sheet File (JPG, PNG, DOC, or PDF)"}
              </Label>

              <div className="relative border-2 border-dashed border-slate-300 rounded-3xl p-6 text-center bg-slate-50/60 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.doc,.docx,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSubmissionFile(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {submissionFile ? (
                  <div className="flex items-center justify-center gap-3 text-[#0276D3] bg-blue-50 border border-blue-100 p-3.5 rounded-2xl">
                    <FileText className="w-7 h-7 shrink-0 text-[#0276D3]" />
                    <div className="text-left">
                      <p className="text-sm font-extrabold text-slate-900 line-clamp-1">{submissionFile.name}</p>
                      <p className="text-xs text-slate-500">{(submissionFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubmissionFile(null);
                      }}
                      className="ml-auto text-slate-400 hover:text-red-600 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-7 h-7 text-[#0276D3] mx-auto" />
                    <p className="text-xs font-extrabold text-slate-800">
                      Click or drop your solution file here (jpg, jpeg, png, doc, docx, or pdf)
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="remarks" className="text-xs font-bold text-slate-700">
                  Remarks / Notes (Optional)
                </Label>
                <Input
                  id="remarks"
                  type="text"
                  placeholder="e.g. Attached 3 pages of notebook solutions."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-10 text-xs rounded-xl border-slate-200"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting || !submissionFile}
                  className="bg-[#0276D3] hover:bg-[#025AA3] text-white font-extrabold rounded-xl h-11 px-6 shadow-md shadow-blue-600/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Submit Answer Sheet
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* TEACHER & ADMIN SECTION: STUDENT SUBMISSIONS LIST & EVALUATION */}
      {(isTeacher || isAdmin) && (
        <Card className="border border-slate-200/80 rounded-3xl shadow-sm bg-white overflow-hidden space-y-4">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Student Submissions Log</h3>
              <p className="text-xs text-slate-500">
                Review submitted answer sheets using the file viewer, grade submissions, and give feedback.
              </p>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-[#0276D3] font-extrabold px-3 py-1 rounded-xl text-xs">
              {quest.submissions?.length || 0} Submissions
            </Badge>
          </div>

          <CardContent className="p-0">
            {!quest.submissions || quest.submissions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No student submissions received for this Brain Quest test yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="border-b border-slate-100">
                    <TableHead className="font-bold text-xs uppercase text-slate-600 py-3.5">Student</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-slate-600 py-3.5">Submitted File</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-slate-600 py-3.5">Date & Time</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-slate-600 py-3.5">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-slate-600 py-3.5">Marks</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-slate-600 py-3.5 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {quest.submissions.map((sub: any) => (
                    <TableRow key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="font-extrabold text-xs text-slate-900">{sub.student?.user?.name || "Student"}</div>
                        <div className="text-[10px] text-slate-400">{sub.student?.user?.email}</div>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPreviewFile({
                              url: sub.submission_file_url,
                              title: `Answer Sheet - ${sub.student?.user?.name}`,
                            })
                          }
                          className="h-8 rounded-xl text-xs font-bold text-[#0276D3] border-blue-200 hover:bg-blue-50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Answer Sheet
                        </Button>
                      </TableCell>

                      <TableCell className="py-3.5 text-xs text-slate-600 font-medium">
                        {format(new Date(sub.submitted_at), "MMM d, h:mm a")}
                      </TableCell>

                      <TableCell className="py-3.5">
                        {sub.is_graded ? (
                          <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold px-2.5 py-0.5 rounded-lg text-[10px]">
                            Graded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 font-bold px-2.5 py-0.5 rounded-lg text-[10px]">
                            Pending Grade
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-3.5 text-xs font-extrabold text-slate-800">
                        {sub.is_graded ? `${sub.marks_obtained ?? 0} / ${quest.total_marks || 100}` : "-"}
                      </TableCell>

                      <TableCell className="py-3.5 text-center">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSubmission(sub);
                            setGradeMarks(sub.marks_obtained?.toString() || "");
                            setGradeFeedback(sub.feedback || "");
                          }}
                          className="bg-[#0276D3] hover:bg-[#025AA3] text-white font-bold rounded-xl h-8 text-xs px-3 shadow-xs"
                        >
                          {sub.is_graded ? "Edit Grade" : "Grade Submission"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* FILE PREVIEW MODAL (Used for both Test Paper PDF & Student Submissions) */}
      <FilePreviewModal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        url={previewFile?.url}
        title={previewFile?.title}
      />

      {/* TEACHER GRADING DIALOG */}
      {selectedSubmission && (
        <Dialog open={Boolean(selectedSubmission)} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-900">
                Grade Submission: {selectedSubmission.student?.user?.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Enter marks obtained and teacher comments for this Brain Quest submission.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGradeSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="gradeMarks" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Marks Obtained (Max: {quest.total_marks || 100})
                </Label>
                <Input
                  id="gradeMarks"
                  type="number"
                  placeholder="e.g. 95"
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(e.target.value)}
                  max={quest.total_marks || 100}
                  className="h-11 rounded-xl border-slate-200 text-sm font-extrabold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gradeFeedback" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Teacher Feedback / Comments
                </Label>
                <Textarea
                  id="gradeFeedback"
                  placeholder="e.g. Great handwriting and well-solved math problems!"
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  rows={3}
                  className="rounded-xl border-slate-200 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSubmission(null)}
                  className="rounded-xl h-10 px-4 text-xs font-bold text-slate-700 border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={grading}
                  className="bg-[#0276D3] hover:bg-[#025AA3] text-white font-bold rounded-xl h-10 px-5 text-xs shadow-md shadow-blue-600/20"
                >
                  {grading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Save Grade
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
