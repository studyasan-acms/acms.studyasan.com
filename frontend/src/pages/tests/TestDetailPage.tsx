import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  FileText,
  Users,
  Calendar,
  Edit,
  Play,
  CheckCircle,
  Trash2,
  Pencil,
  BookOpen,
  Image as ImageIcon,
  Video,
  Award,
  Eye,
  Copy,
  Sparkles,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  X,
  Upload,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

import { testService, testAttemptService, uploadService } from "@/services/api";
import type { Test, Question, UpdateQuestionData, QuestionType, TestType } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import ConfirmModal from "@/components/ui/confirmationModal";
import MediaUpload from "@/components/ui/MediaUpload";
import MathRenderer from "@/components/ui/MathRenderer";
import { usePageTitle } from "@/hooks/usePageTitle";
import TestInstructionsModal from "@/components/tests/TestInstructionsModal";
import { getEffectiveTestType } from "./TestsPage";

export default function TestDetailPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  usePageTitle(test ? `Test: ${test.title}` : "Test Details");
  const [loading, setLoading] = useState(true);
  const [hasAttempted, setHasAttempted] = useState(false);
  const { user } = useAuthStore();

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";

  // Modals
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [pendingAttemptMode, setPendingAttemptMode] = useState<"test" | "practice" | null>(null);

  // Edit question
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateQuestionData>({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    marks: 2,
    negative_marks: 0,
  });
  const [editQuestionMediaFile, setEditQuestionMediaFile] = useState<File | null>(null);
  const [editQuestionMediaUrl, setEditQuestionMediaUrl] = useState<string | null>(null);
  const [editQuestionMediaType, setEditQuestionMediaType] = useState<string | null>(null);
  const [removeQuestionMedia, setRemoveQuestionMedia] = useState(false);
  const [removeOptionMedia, setRemoveOptionMedia] = useState<{ [key: number]: boolean }>({});

  // Question Search, Filter & Pagination
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string>("ALL");
  const [questionPage, setQuestionPage] = useState<number>(1);
  const [questionPageSize, setQuestionPageSize] = useState<number>(10);

  const fetchTest = useCallback(async () => {
    if (!testId) return;
    try {
      setLoading(true);
      const response = await testService.getById(Number(testId));
      setTest(response.data);

      if (isStudent) {
        try {
          const attemptsRes = await testAttemptService.getMyAttempts({ test_id: Number(testId) });
          const hasExistingAttempt = attemptsRes.data && attemptsRes.data.length > 0;
          setHasAttempted(hasExistingAttempt);
        } catch (attemptErr) {
          console.warn("Could not check student attempts:", attemptErr);
        }
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load test");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  }, [testId, isStudent]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  const handleCopyLink = () => {
    if (!test) return;
    const link = `${window.location.origin}/certification/${test.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public test link copied to clipboard");
  };

  const getTestStatus = () => {
    if (!test) return { label: "Draft", badgeClass: "bg-slate-100 text-slate-600 border-slate-200", canAttempt: false, canPractice: false };
    const now = new Date();
    const availableFrom = new Date(test.available_from);
    const availableUntil = new Date(test.available_until);

    if (!test.is_published) {
      return {
        label: "Draft",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
        canAttempt: false,
        canPractice: false,
      };
    }

    if (now < availableFrom) {
      return {
        label: "Upcoming",
        badgeClass: "bg-blue-50 text-[#0276D3] border-blue-200",
        canAttempt: false,
        canPractice: false,
      };
    }

    if (now > availableUntil) {
      return {
        label: "Closed",
        badgeClass: "bg-red-50 text-red-600 border-red-300 font-extrabold",
        canAttempt: false,
        canPractice: true,
      };
    }

    return {
      label: "Active",
      badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-300 font-extrabold",
      canAttempt: !hasAttempted,
      canPractice: true,
    };
  };

  const openInstructions = (mode: "test" | "practice") => {
    setPendingAttemptMode(mode);
    setInstructionsOpen(true);
  };

  const startAttempt = async (mode: "test" | "practice" = "test") => {
    if (!test) return;
    try {
      setLoading(true);
      const isPractice = mode === "practice";
      const response = isPractice
        ? await testAttemptService.startPracticeAttempt(test.id)
        : await testAttemptService.startAttempt(test.id);
      const attempt = response.data;
      setInstructionsOpen(false);
      setPendingAttemptMode(null);
      const attemptUrl = `/tests/${test.id}/attempt/${attempt.id}`;
      window.open(attemptUrl, '_blank');
      fetchTest();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start test attempt");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Paginated Questions for Teacher View
  const processedQuestions = useMemo(() => {
    let list = test?.questions ? [...test.questions] : [];

    // Sort by order
    list.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Type filter
    if (questionTypeFilter !== "ALL") {
      list = list.filter((q) => q.question_type === questionTypeFilter);
    }

    // Search query
    if (questionSearch.trim()) {
      const q = questionSearch.toLowerCase().trim();
      list = list.filter((item) => {
        const text = item.question_text?.toLowerCase() || "";
        const ans = item.correct_answer?.toLowerCase() || "";
        const opts = Array.isArray(item.options) ? item.options.join(" ").toLowerCase() : "";
        return text.includes(q) || ans.includes(q) || opts.includes(q);
      });
    }

    return list;
  }, [test?.questions, questionTypeFilter, questionSearch]);

  const totalQuestionCount = processedQuestions.length;
  const effectivePageSize = questionPageSize === -1 ? totalQuestionCount || 1 : questionPageSize;
  const totalQuestionPages = Math.max(1, Math.ceil(totalQuestionCount / effectivePageSize));

  const paginatedQuestions = useMemo(() => {
    if (questionPageSize === -1) return processedQuestions;
    const startIndex = (questionPage - 1) * questionPageSize;
    return processedQuestions.slice(startIndex, startIndex + questionPageSize);
  }, [processedQuestions, questionPage, questionPageSize]);

  const parsedAllowedCandidates = useMemo(() => {
    if (!test?.allowed_candidates) return [];
    try {
      const raw =
        typeof test.allowed_candidates === "string"
          ? JSON.parse(test.allowed_candidates)
          : test.allowed_candidates;
      return Array.isArray(raw) ? (raw as { name: string; email: string; added_at?: string }[]) : [];
    } catch (e) {
      return [];
    }
  }, [test?.allowed_candidates]);

  // Reset questionPage when search, type filter, or page size changes
  useEffect(() => {
    setQuestionPage(1);
  }, [questionSearch, questionTypeFilter, questionPageSize]);

  const resetQuestionFilters = () => {
    setQuestionSearch("");
    setQuestionTypeFilter("ALL");
    setQuestionPage(1);
  };

  const handleTogglePublish = () => {
    if (!test) return;
    const action = test.is_published ? "unpublish" : "publish";

    if (!test.is_published) {
      if (!test.questions || test.questions.length === 0) {
        setErrorMessage("Cannot publish test: The test contains no questions. Please add questions before publishing.");
        setErrorOpen(true);
        return;
      }

      const totalQuestionMarks = test.questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
      if (totalQuestionMarks <= 0) {
        setErrorMessage("Cannot publish test: Total question marks must be greater than 0.");
        setErrorOpen(true);
        return;
      }
    }

    setConfirmMessage(`Are you sure you want to ${action} "${test.title}"?`);
    setConfirmAction(() => async () => {
      try {
        const totalQuestionMarks = test.questions?.reduce((acc, q) => acc + (Number(q.marks) || 0), 0) || test.total_marks;
        await testService.update(test.id, {
          is_published: !test.is_published,
          total_marks: totalQuestionMarks,
        });
        setSuccessMessage(`Test "${test.title}" ${action}ed successfully!`);
        setSuccessOpen(true);
        fetchTest();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : `Failed to ${action} test`);
        setErrorOpen(true);
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleDeleteQuestion = (questionId: number, questionText: string) => {
    setConfirmMessage(`Delete question: "${questionText.substring(0, 50)}..."?`);
    setConfirmAction(() => async () => {
      try {
        await testService.deleteQuestion(questionId);
        setSuccessMessage("Question deleted!");
        setSuccessOpen(true);
        fetchTest();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to delete question");
        setErrorOpen(true);
      } finally {
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    const initialOptions = Array.isArray(question.options) && question.options.length > 0
      ? [...question.options]
      : (question.question_type === "MCQ" ? ["", "", "", ""] : question.question_type === "TRUE_FALSE" ? ["True", "False"] : []);

    setEditFormData({
      question_text: question.question_text || "",
      options: initialOptions,
      correct_answer: question.correct_answer || (initialOptions.length > 0 ? initialOptions[0] : (question.question_type === "TRUE_FALSE" ? "True" : "")),
      marks: question.marks || 2,
      negative_marks: question.negative_marks || 0,
      is_autograded: question.is_autograded !== undefined
        ? question.is_autograded
        : (question.question_type === "MCQ" || question.question_type === "TRUE_FALSE" || question.question_type === "MATCH_THE_FOLLOWING"),
    });
    setEditQuestionMediaFile(null);
    setEditQuestionMediaUrl(question.media_url || null);
    setEditQuestionMediaType(question.media_type || null);
    setRemoveQuestionMedia(false);
    setRemoveOptionMedia({});
    setEditModalOpen(true);
  };

  const updateEditOptionText = (index: number, val: string) => {
    const opts: any[] = [...(editFormData.options || [])];
    const curr: any = opts[index];
    const oldText = typeof curr === "string" ? curr : (curr?.text || "");
    const isOldCorrect = editFormData.correct_answer === oldText;
    if (typeof curr === "object" && curr !== null) {
      opts[index] = { ...curr, text: val };
    } else {
      opts[index] = val;
    }
    setEditFormData({
      ...editFormData,
      options: opts,
      correct_answer: isOldCorrect ? val : editFormData.correct_answer,
    });
  };

  const updateEditOptionMedia = (index: number, media_url: string | null, media_type: string | null = "image") => {
    const opts: any[] = [...(editFormData.options || [])];
    const curr: any = opts[index];
    const currText = typeof curr === "string" ? curr : (curr?.text || "");
    if (!media_url) {
      opts[index] = currText;
    } else {
      opts[index] = {
        text: currText,
        media_url,
        media_type: media_type || "image",
      };
    }
    setEditFormData({
      ...editFormData,
      options: opts,
    });
  };

  const handleAddEditOption = () => {
    setEditFormData({
      ...editFormData,
      options: [...(editFormData.options || []), ""],
    });
  };

  const handleRemoveEditOption = (index: number) => {
    const opts: any[] = (editFormData.options || []).filter((_, i) => i !== index);
    const curr: any = editFormData.options?.[index];
    const removedText = typeof curr === "string" ? curr : (curr?.text || "");
    setEditFormData({
      ...editFormData,
      options: opts,
      correct_answer: editFormData.correct_answer === removedText ? (typeof opts[0] === "string" ? opts[0] : (opts[0]?.text || "")) : editFormData.correct_answer,
    });
  };


  const getParsedEditPairs = (): { left: string; right: string }[] => {
    return (editFormData.options || []).map((opt) => {
      try {
        const parsed = typeof opt === "string" ? JSON.parse(opt) : opt;
        return { left: parsed.left || "", right: parsed.right || "" };
      } catch {
        return { left: "", right: "" };
      }
    });
  };

  const updateEditMatchPair = (pairIndex: number, field: "left" | "right", value: string) => {
    const pairs = getParsedEditPairs();
    if (pairs[pairIndex]) {
      pairs[pairIndex][field] = value;
    }
    const newOptions = pairs.map((p) => JSON.stringify(p));
    setEditFormData({
      ...editFormData,
      options: newOptions,
      correct_answer: JSON.stringify(pairs),
    });
  };

  const addEditMatchPair = () => {
    const pairs = getParsedEditPairs();
    const newPair = { left: `Item ${pairs.length + 1}`, right: `Match ${pairs.length + 1}` };
    const updatedPairs = [...pairs, newPair];
    setEditFormData({
      ...editFormData,
      options: updatedPairs.map((p) => JSON.stringify(p)),
      correct_answer: JSON.stringify(updatedPairs),
    });
  };

  const removeEditMatchPair = (pairIndex: number) => {
    const pairs = getParsedEditPairs().filter((_, idx) => idx !== pairIndex);
    setEditFormData({
      ...editFormData,
      options: pairs.map((p) => JSON.stringify(p)),
      correct_answer: JSON.stringify(pairs),
    });
  };



  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    try {
      setLoading(true);
      const updateData = {
        question_type: editingQuestion.question_type,
        ...editFormData,
        media_url: removeQuestionMedia ? null : (editQuestionMediaUrl || null),
        media_type: removeQuestionMedia ? null : (editQuestionMediaType || null),
      };
      if (editQuestionMediaFile || removeQuestionMedia) {
        const formData = new FormData();
        formData.append("question_type", editingQuestion.question_type);
        formData.append("question_text", editFormData.question_text || "");
        formData.append("correct_answer", editFormData.correct_answer || "");
        formData.append("marks", (editFormData.marks || 2).toString());
        formData.append("negative_marks", (editFormData.negative_marks || 0).toString());
        formData.append("is_autograded", (editFormData.is_autograded !== false).toString());
        if (editFormData.options) formData.append("options", JSON.stringify(editFormData.options));
        if (removeQuestionMedia) {
          formData.append("media_url", "");
          formData.append("media_type", "");
        } else if (editQuestionMediaFile) {
          formData.append("media", editQuestionMediaFile);
        } else if (editQuestionMediaUrl) {
          formData.append("media_url", editQuestionMediaUrl);
          if (editQuestionMediaType) formData.append("media_type", editQuestionMediaType);
        }
        await testService.updateQuestionWithMedia(editingQuestion.id, formData);
      } else {
        await testService.updateQuestion(editingQuestion.id, updateData);
      }
      setSuccessMessage("Question updated!");
      setSuccessOpen(true);
      setEditModalOpen(false);
      fetchTest();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update question");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !test) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 p-8 max-w-md mx-auto mt-10">
        <p className="text-slate-600 font-semibold mb-4">Test not found or no access.</p>
        <Button
          className="bg-[#0276D3] text-white hover:bg-[#015bb5] rounded-xl text-xs"
          onClick={() => navigate("/tests")}
        >
          Back to Tests
        </Button>
      </div>
    );
  }

  const status = getTestStatus();
  const effectiveType = getEffectiveTestType(test);

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20 max-w-7xl mx-auto">
      {/* Modals */}
      <SuccessModal open={successOpen} title={test.title} description={successMessage} showButtons okText="OK" onConfirm={() => setSuccessOpen(false)} onClose={() => setSuccessOpen(false)} />
      <ErrorModal open={errorOpen} title={test?.title || "Error"} description={errorMessage} showButtons okText="Close" onConfirm={() => setErrorOpen(false)} onClose={() => setErrorOpen(false)} />
      <ConfirmModal open={confirmOpen} title={test?.title || "Confirm Action"} description={confirmMessage} onConfirm={confirmAction} onClose={() => setConfirmOpen(false)} confirmText="Yes" cancelText="No" />
      
      {/* Instructions Modal */}
      <TestInstructionsModal
        open={instructionsOpen}
        onClose={() => {
          setInstructionsOpen(false);
          setPendingAttemptMode(null);
        }}
        onConfirm={() => {
          if (pendingAttemptMode) {
            startAttempt(pendingAttemptMode);
          }
        }}
        test={test}
        mode={pendingAttemptMode || 'test'}
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tests")}
            className="text-slate-500 hover:text-[#0276D3] hover:bg-slate-100 rounded-xl h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{test.title}</h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${status.badgeClass}`}>
                {status.label}
              </span>
              {effectiveType === "PRACTICE" && (
                <span className="text-[11px] font-bold text-[#FF7A00] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Practice Set
                </span>
              )}
              {effectiveType === "MOCK_TEST" && (
                <span className="text-[11px] font-bold text-[#0276D3] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Mock Test
                </span>
              )}
              {effectiveType === "ASSESSMENT" && (
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Assessment
                </span>
              )}
              {effectiveType === "CERTIFICATION" && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="w-3 h-3" /> Certification
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-1">
              {test.subject?.name || test.test_series?.title || "General Test"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {isTeacherOrAdmin && (
            <>
              <Button
                variant={test.is_published ? "outline" : "default"}
                onClick={handleTogglePublish}
                className={!test.is_published ? "bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 text-xs font-bold" : "rounded-xl h-9 text-xs border-slate-200"}
                size="sm"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                {test.is_published ? "Unpublish" : "Publish Test"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tests/${testId}/edit`)}
                className="rounded-xl h-9 text-xs border-slate-200 font-medium text-slate-700 hover:bg-slate-50"
              >
                <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Test
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tests/${testId}/attempts`)}
                className="rounded-xl h-9 text-xs border-slate-200 font-medium text-slate-700 hover:bg-slate-50"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" /> Attempts ({test._count?.test_attempts || 0})
              </Button>
            </>
          )}

          {isTeacherOrAdmin && effectiveType === "CERTIFICATION" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tests/${testId}/attempts?filter=certificates`)}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 rounded-xl h-9 text-xs font-bold"
              >
                <Award className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Issued Certificates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-[#0276D3] border-blue-200 hover:bg-blue-50 rounded-xl h-9 text-xs font-medium"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Public Link
              </Button>
            </>
          )}

          {isStudent && status.canAttempt && (
            <Button
              onClick={() => openInstructions("test")}
              className="bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl h-9 px-4 text-xs font-bold shadow-sm"
              size="sm"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Start Test
            </Button>
          )}

          {isStudent && status.canPractice && (
            <Button
              variant="outline"
              onClick={() => openInstructions("practice")}
              size="sm"
              className="border-[#FF7A00] text-[#FF7A00] hover:bg-amber-50 rounded-xl h-9 px-4 text-xs font-bold"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Practice Set
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards - Unified Blue & Orange Palette */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#0276D3] rounded-xl">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Questions</p>
            <p className="text-xl font-black text-slate-900">{test.questions?.length || test._count?.questions || 0}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-[#FF7A00] rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Duration</p>
            <p className="text-xl font-black text-slate-900">
              {test.duration_minutes > 0 ? `${test.duration_minutes}m` : "Self-Paced"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#0276D3] rounded-xl">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Marks</p>
            <p className="text-xl font-black text-slate-900">{test.total_marks}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pass Marks</p>
            <p className="text-xl font-black text-slate-900">{test.passing_marks}</p>
          </div>
        </div>
      </div>

      {/* Test Overview Info */}
      <Card className="shadow-xs border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/60 border-b border-slate-200 py-3.5 px-5">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Test Specifications</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-slate-800 leading-relaxed">{test.description || "No description provided."}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3 text-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-500 font-medium">Available From</p>
                <p className="font-bold text-slate-800">{new Date(test.available_from).toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-slate-500 font-medium">Available Until</p>
                <p className="font-bold text-slate-800">{new Date(test.available_until).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          {test.instructions && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Instructions for Students</p>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line">
                {test.instructions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certification Details & Whitelist Info (Teacher/Admin View) */}
      {isTeacherOrAdmin && effectiveType === "CERTIFICATION" && (
        <Card className="shadow-xs border-2 border-emerald-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-emerald-50/70 border-b border-emerald-100 py-3.5 px-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                Certification & Candidate Access Control
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/tests/${testId}/attempts?filter=certificates`)}
                  className="rounded-xl h-7 px-2.5 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100 bg-white"
                >
                  <Award className="w-3.5 h-3.5 mr-1 text-emerald-600" /> View Issued Certificates
                </Button>
                <Badge className={`font-bold px-2.5 py-0.5 text-xs ${
                  parsedAllowedCandidates.length > 0
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}>
                  {parsedAllowedCandidates.length > 0
                    ? `${parsedAllowedCandidates.length} Whitelisted Candidates (Protected)`
                    : "Whitelist Required — Exam Locked"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Public Link Copy Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-200">
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Public Certification Link:</span>
                <span className="font-mono text-[11px] text-slate-600 break-all">
                  {window.location.origin}/certification/{test.id}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="rounded-xl h-8 text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
                </Button>
                <a
                  href={`/certification/${test.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl h-8 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Page
                </a>
              </div>
            </div>

            {/* Certificate Template Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Certificate Title / Heading
                </p>
                <p className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {test.certificate_title || "Certificate of Completion"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Certificate Body Template
                </p>
                <p className="text-xs font-mono text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 break-words">
                  {test.certificate_template ||
                    "has successfully completed the assessment for {test_title} with a score of {score}/{total_marks} ({percentage}) on {date}."}
                </p>
              </div>
            </div>

            {/* Allowed Candidates Table / Badge */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Allowed Candidates ({parsedAllowedCandidates.length})
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/tests/${testId}/edit`)}
                  className="h-7 text-xs font-bold text-[#0276D3] hover:bg-blue-50"
                >
                  <Edit className="w-3 h-3 mr-1" /> Manage Whitelist
                </Button>
              </div>

              {parsedAllowedCandidates.length > 0 ? (
                <div className="rounded-xl border border-slate-200 overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Candidate Name</th>
                        <th className="py-2 px-3">Email Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedAllowedCandidates.map((cand, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{cand.name || "—"}</td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{cand.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Candidate Whitelist Required (Exam Locked)</strong>
                    <p className="mt-0.5 text-amber-800">
                      Certification exams strictly require authorized candidate emails. Because no candidates have been whitelisted yet, the public certification exam page is currently locked and will reject all attempt attempts. Click <strong>Manage Whitelist</strong> to add candidates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions List (Teacher View) with Search, Filter, and Pagination */}
      {isTeacherOrAdmin && test.questions && test.questions.length > 0 && (
        <Card className="shadow-xs border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 py-3.5 px-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0276D3]" />
                  Questions
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {test.questions.length}
                  </span>
                </CardTitle>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/tests/${testId}/edit`)}
                  className="h-8 text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" /> Full Question Editor
                </Button>
              </div>
            </div>

            {/* Search, Type Filter & Per Page Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 mt-1 border-t border-slate-200">
              {/* Question Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search questions or keywords..."
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  className="pl-8 h-8 rounded-xl border-slate-200 bg-white text-xs focus-visible:ring-[#0276D3]"
                />
              </div>

              {/* Question Type Filter */}
              <div>
                <Select value={questionTypeFilter} onValueChange={(v) => setQuestionTypeFilter(v)}>
                  <SelectTrigger className="h-8 rounded-xl border-slate-200 text-xs bg-white">
                    <SelectValue placeholder="All Question Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Question Types ({test.questions.length})</SelectItem>
                    <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                    <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                    <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                    <SelectItem value="LONG_ANSWER">Long Answer</SelectItem>
                    <SelectItem value="MATCH_THE_FOLLOWING">Match the Following</SelectItem>
                    <SelectItem value="CASE_STUDY">Case Study</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Per Page Selector */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Per Page:</span>
                <Select value={questionPageSize.toString()} onValueChange={(v) => setQuestionPageSize(Number(v))}>
                  <SelectTrigger className="h-8 w-20 rounded-xl border-slate-200 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="-1">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {paginatedQuestions.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <p className="text-xs font-bold text-slate-500">No questions match your search or filter.</p>
                <button
                  type="button"
                  onClick={resetQuestionFilters}
                  className="text-xs text-[#0276D3] font-bold hover:underline inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paginatedQuestions.map((question: Question, idx: number) => {
                  const globalIndex = (questionPage - 1) * (questionPageSize === -1 ? totalQuestionCount : questionPageSize) + idx;

                  return (
                    <div
                      key={question.id}
                      className={`p-5 hover:bg-slate-50/50 transition-colors ${
                        question.parent_id ? 'ml-6 border-l-4 border-l-[#0276D3] bg-blue-50/10' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-xs font-black text-slate-700 shrink-0 mt-0.5 border border-slate-200">
                            {globalIndex + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 text-sm">
                              {question.question_text ? (
                                <MathRenderer text={question.question_text} />
                              ) : (
                                <span className="text-slate-400 italic">(No question text)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#0276D3] border border-blue-200">
                                {question.question_type.replace(/_/g, " ")}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">{question.marks} marks</span>
                              {test.has_negative_marking && question.negative_marks > 0 && (
                                <span className="text-xs text-red-500 font-medium">-{question.negative_marks} on wrong</span>
                              )}
                              {question.is_autograded !== false ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  Auto-Checked
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  Manual Review
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#0276D3] hover:bg-blue-50 rounded-lg"
                            onClick={() => handleEditQuestion(question)}
                            title="Quick Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            onClick={() => handleDeleteQuestion(question.id, question.question_text || `Question ${globalIndex + 1}`)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Media */}
                      {question.media_url && (
                        <div className="ml-10 mt-3 border border-slate-200 rounded-xl p-2 bg-slate-50 max-w-md">
                          {question.media_type === 'image' && (
                            <img src={question.media_url} alt="Question" className="max-w-full max-h-48 rounded-lg object-contain" />
                          )}
                          {question.media_type === 'pdf' && (
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-red-500" />
                              <a href={question.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0276D3] font-semibold hover:underline">
                                View Attached PDF
                              </a>
                            </div>
                          )}
                          {question.media_type === 'video' && (
                            <video src={question.media_url} controls className="max-w-full max-h-48 rounded-lg" />
                          )}
                        </div>
                      )}

                      {/* MCQ Options */}
                      {question.question_type === "MCQ" && question.options && (
                        <div className="ml-10 mt-3 space-y-1.5">
                          {(question.options as any[]).map((option: any, optIndex: number) => {
                            const optionText = typeof option === 'string' ? option : option?.text || '';
                            const optionMediaUrl = typeof option === 'object' ? option?.media_url : null;
                            const optionLetter = String.fromCharCode(65 + optIndex);
                            const isCorrect = optionText === question.correct_answer || optionLetter === question.correct_answer || (optionText === '' && question.correct_answer === optionLetter);

                            return (
                              <div
                                key={optIndex}
                                className={`p-2.5 rounded-xl text-xs border ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <span className="font-bold text-slate-500">{optionLetter}.</span>
                                    <MathRenderer text={optionText} inline={true} />
                                  </span>
                                  {isCorrect && (
                                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Correct Answer
                                    </span>
                                  )}
                                </div>
                                {optionMediaUrl && (
                                  <img
                                    src={optionMediaUrl}
                                    alt={`Option ${optionLetter}`}
                                    className="mt-2 ml-6 max-h-24 rounded-lg border border-slate-200 object-contain bg-white p-0.5"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* True / False Option Previews */}
                      {question.question_type === "TRUE_FALSE" && (
                        <div className="ml-10 mt-3 flex items-center gap-2">
                          {["True", "False"].map((tf) => {
                            const isCorrect = question.correct_answer?.toLowerCase() === tf.toLowerCase();
                            return (
                              <div
                                key={tf}
                                className={`flex-1 p-2 rounded-xl text-xs font-bold border flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <span>{tf}</span>
                                {isCorrect && (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-black">
                                    Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Match the Following Preview */}
                      {question.question_type === "MATCH_THE_FOLLOWING" && (
                        <div className="ml-10 mt-3 space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Matching Pairs
                          </p>
                          {(() => {
                            try {
                              let parsed = question.options || [];
                              if (typeof parsed === "string") parsed = JSON.parse(parsed);
                              if (Array.isArray(parsed)) {
                                return parsed.map((p: any, pIdx: number) => {
                                  const pairObj = typeof p === "string" ? JSON.parse(p) : p;
                                  return (
                                    <div
                                      key={pIdx}
                                      className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                                    >
                                      <span className="font-semibold text-slate-800">{pairObj.left || `Item ${pIdx + 1}`}</span>
                                      <span className="text-slate-400 font-bold">&rarr;</span>
                                      <span className="font-semibold text-emerald-700">{pairObj.right || `Match ${pIdx + 1}`}</span>
                                    </div>
                                  );
                                });
                              }
                            } catch (e) {
                              console.error("Error rendering match preview", e);
                            }
                            return <p className="text-xs text-slate-600">{question.correct_answer}</p>;
                          })()}
                        </div>
                      )}

                      {/* Short / Long Answer / Case Study Rubric Preview */}
                      {(question.question_type === "SHORT_ANSWER" ||
                        question.question_type === "LONG_ANSWER" ||
                        question.question_type === "CASE_STUDY") &&
                        question.correct_answer && (
                          <div className="ml-10 mt-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs text-slate-800">
                            <span className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] block mb-1">
                              Model Answer / Evaluation Criteria:
                            </span>
                            <MathRenderer text={question.correct_answer} />
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>

          {/* Questions Pagination Controls Footer */}
          {totalQuestionPages > 1 && (
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Showing questions <span className="font-bold text-slate-800">{(questionPage - 1) * questionPageSize + 1}</span> to{" "}
                <span className="font-bold text-slate-800">{Math.min(questionPage * questionPageSize, totalQuestionCount)}</span> of{" "}
                <span className="font-bold text-slate-800">{totalQuestionCount}</span>
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuestionPage(1)}
                  disabled={questionPage === 1}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuestionPage((prev) => Math.max(prev - 1, 1))}
                  disabled={questionPage === 1}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>

                {Array.from({ length: totalQuestionPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalQuestionPages || Math.abs(page - questionPage) <= 1)
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const hasGap = prev && page - prev > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {hasGap && <span className="px-1 text-slate-300 text-xs">...</span>}
                        <Button
                          size="sm"
                          variant={questionPage === page ? "default" : "outline"}
                          onClick={() => setQuestionPage(page)}
                          className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${
                            questionPage === page
                              ? "bg-[#0276D3] text-white border-[#0276D3] shadow-xs"
                              : "border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuestionPage((prev) => Math.min(prev + 1, totalQuestionPages))}
                  disabled={questionPage === totalQuestionPages}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setQuestionPage(totalQuestionPages)}
                  disabled={questionPage === totalQuestionPages}
                  className="h-8 w-8 rounded-lg border-slate-200 text-slate-600 disabled:opacity-40"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}


      {/* Quick Edit Question Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 bg-white border border-slate-200">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900">
                Edit Question
              </DialogTitle>
              {editingQuestion && (
                <Badge variant="outline" className="text-[11px] font-bold border-slate-200 bg-slate-50 text-slate-700">
                  {editingQuestion.question_type.replace("_", " ")}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Modify question statement, answer choices, correct key, and marks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Question Statement</Label>
              <Textarea
                value={editFormData.question_text}
                onChange={(e) => setEditFormData({ ...editFormData, question_text: e.target.value })}
                rows={3}
                placeholder="Enter question text (LaTeX formulas like $x^2$ supported)..."
                className="mt-1 text-xs rounded-xl border-slate-200"
              />
            </div>

            {/* Question Media Attachment Section */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  Question Attachment (Image / Diagram / PDF)
                </Label>
                {editQuestionMediaUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditQuestionMediaUrl(null);
                      setEditQuestionMediaType(null);
                      setEditQuestionMediaFile(null);
                      setRemoveQuestionMedia(true);
                    }}
                    className="text-xs h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remove Attachment
                  </Button>
                )}
              </div>

              {!editQuestionMediaUrl ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload Image or PDF</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const toastId = toast.loading("Uploading attachment...");
                        try {
                          const res = await uploadService.uploadFile(file, "test-questions");
                          const url = res.url;
                          const type = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "other";
                          setEditQuestionMediaUrl(url);
                          setEditQuestionMediaType(type);
                          setEditQuestionMediaFile(file);
                          setRemoveQuestionMedia(false);
                          toast.success("Attachment uploaded successfully!", { id: toastId });
                        } catch (err: any) {
                          toast.error(err.message || "Failed to upload file", { id: toastId });
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">Supported: Images (.png, .jpg), PDF documents</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 max-w-md">
                  {editQuestionMediaType === "image" && (
                    <img
                      src={editQuestionMediaUrl}
                      alt="Question attachment"
                      className="max-h-48 rounded-lg object-contain bg-white border border-slate-200 p-1"
                    />
                  )}
                  {editQuestionMediaType === "pdf" && (
                    <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                      <FileText className="w-7 h-7 text-red-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">PDF Attachment</p>
                        <a
                          href={editQuestionMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#0276D3] hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>Open PDF in new tab</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  {editQuestionMediaType !== "image" && editQuestionMediaType !== "pdf" && (
                    <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                      <FileText className="w-5 h-5 text-slate-500" />
                      <a
                        href={editQuestionMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#0276D3] hover:underline font-semibold"
                      >
                        View Attached File
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Marks</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={editFormData.marks}
                  onChange={(e) => setEditFormData({ ...editFormData, marks: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Negative Marks</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.25}
                  value={editFormData.negative_marks}
                  onChange={(e) => setEditFormData({ ...editFormData, negative_marks: Number(e.target.value) })}
                  className="mt-1 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Evaluation Mode</Label>
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, is_autograded: !editFormData.is_autograded })}
                  className={`mt-1 w-full h-9 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    editFormData.is_autograded
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100/70"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/60"
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${editFormData.is_autograded ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>{editFormData.is_autograded ? "Auto-Check: ON" : "Manual Review"}</span>
                </button>
              </div>
            </div>

            {/* MCQ Options with Selectable Correct Answer */}
            {editingQuestion?.question_type === "MCQ" && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Options (Click option letter to mark Correct Answer)
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleAddEditOption}
                    className="text-[#0276D3] text-xs h-7 px-2 hover:bg-blue-50 font-bold"
                  >
                    + Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editFormData.options as any[] || []).map((opt: any, optIdx: number) => {
                    const optText = typeof opt === "string" ? opt : (opt?.text || "");
                    const optMedia = typeof opt === "object" && opt !== null ? opt.media_url : null;
                    const optionLetter = String.fromCharCode(65 + optIdx);
                    const isCorrect = (editFormData.correct_answer === optText && optText.trim().length > 0) || (editFormData.correct_answer === optionLetter);

                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isCorrect ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-slate-50/50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const chosenAns = optText.trim() ? optText : optionLetter;
                              setEditFormData({ ...editFormData, correct_answer: chosenAns });
                            }}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                              isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                            title="Click to mark as Correct Answer"
                          >
                            {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : optionLetter}
                          </button>
                          <Input
                            value={optText}
                            onChange={(e) => updateEditOptionText(optIdx, e.target.value)}
                            placeholder={`Option ${optionLetter}`}
                            className="border-none shadow-none text-xs bg-transparent focus-visible:ring-0 p-0 h-8 flex-1"
                          />
                          {/* Option Image Upload */}
                          <label
                            className="cursor-pointer p-1 text-slate-400 hover:text-[#0276D3] rounded-md hover:bg-white transition-colors shrink-0"
                            title="Attach Image to Option"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const toastId = toast.loading("Uploading option image...");
                                try {
                                  const res = await uploadService.uploadFile(file, "test-questions");
                                  updateEditOptionMedia(optIdx, res.url, "image");
                                  toast.success("Option image uploaded!", { id: toastId });
                                } catch (err: any) {
                                  toast.error(err.message || "Upload failed", { id: toastId });
                                }
                              }}
                            />
                          </label>
                          {(editFormData.options?.length || 0) > 2 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveEditOption(optIdx)}
                              className="h-6 w-6 text-slate-400 hover:text-red-600 rounded-md shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        {/* Option Image Preview if attached */}
                        {optMedia && (
                          <div className="mt-2 pl-9 flex items-center gap-2">
                            <div className="relative inline-block border border-slate-200 rounded-lg p-1 bg-white">
                              <img
                                src={optMedia}
                                alt={`Option ${optionLetter} attachment`}
                                className="h-16 w-auto object-contain rounded"
                              />
                              <button
                                type="button"
                                onClick={() => updateEditOptionMedia(optIdx, null)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-xs"
                                title="Remove Option Image"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400">Attached image for Option {optionLetter}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* True / False Selector */}
            {editingQuestion?.question_type === "TRUE_FALSE" && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Correct Answer
                </Label>
                <div className="flex items-center gap-3">
                  {["True", "False"].map((tf) => {
                    const isSelected = editFormData.correct_answer === tf;
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, correct_answer: tf })}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Match the Following Editor */}
            {editingQuestion?.question_type === "MATCH_THE_FOLLOWING" && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Matching Pairs (Column A &rarr; Column B)
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={addEditMatchPair}
                    className="text-[#0276D3] text-xs h-6 px-2 font-bold hover:bg-blue-50"
                  >
                    + Add Pair
                  </Button>
                </div>

                <div className="space-y-2">
                  {getParsedEditPairs().map((pair, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="w-5 h-5 rounded-md bg-[#0276D3]/10 text-[#0276D3] font-bold text-[10px] flex items-center justify-center">
                        {pIdx + 1}
                      </span>
                      <Input
                        value={pair.left}
                        onChange={(e) => updateEditMatchPair(pIdx, "left", e.target.value)}
                        placeholder={`Column A Item ${pIdx + 1}`}
                        className="text-xs h-8 rounded-lg bg-white border-slate-200 flex-1"
                      />
                      <span className="text-slate-400 font-bold">&rarr;</span>
                      <Input
                        value={pair.right}
                        onChange={(e) => updateEditMatchPair(pIdx, "right", e.target.value)}
                        placeholder={`Matching Column B ${pIdx + 1}`}
                        className="text-xs h-8 rounded-lg bg-white border-slate-200 flex-1"
                      />
                      {getParsedEditPairs().length > 2 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeEditMatchPair(pIdx)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-lg shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Short / Long Answer / Case Study Model Answer Rubric */}
            {(editingQuestion?.question_type === "SHORT_ANSWER" || editingQuestion?.question_type === "LONG_ANSWER" || editingQuestion?.question_type === "CASE_STUDY") && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Model Answer / Evaluation Criteria
                </Label>
                <Textarea
                  value={editFormData.correct_answer}
                  onChange={(e) => setEditFormData({ ...editFormData, correct_answer: e.target.value })}
                  placeholder="Enter sample correct answer or grading rubric..."
                  rows={3}
                  className="mt-1 text-xs rounded-xl border-slate-200"
                />
              </div>
            )}

          </div>

          <DialogFooter className="flex gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveQuestion}
              className="bg-[#0276D3] text-white hover:bg-[#015bb5] rounded-xl text-xs font-bold shadow-xs"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
