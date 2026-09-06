import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  FileText,
  Clock,
  Award,
  BookOpen,
  ClipboardList,
  Save,
  Check,
  Copy,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Layers,
  Wand2,
  Image as ImageIcon,
  Upload,
  X,
  ExternalLink,
  Users,
  UserPlus,
  Mail,
  Info,
} from "lucide-react";
import { testService, subjectService, testSeriesService, uploadService } from "@/services/api";
import type { TestSeries, Subject, CreateTestData, QuestionType, TestType, AllowedCandidate } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import SearchablePaginatedSelect from "@/components/ui/searchablePaginatedSelect";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";

export interface MatchPair {
  left: string;
  right: string;
}

export interface OptionObject {
  text: string;
  media_url?: string | null;
  media_type?: string | null;
}

export const getOptionText = (opt: string | OptionObject | any): string => {
  if (!opt) return "";
  if (typeof opt === "string") return opt;
  return opt.text || "";
};

export const getOptionMediaUrl = (opt: string | OptionObject | any): string | null => {
  if (!opt || typeof opt === "string") return null;
  return opt.media_url || null;
};

interface LocalQuestion {
  id: string; // client UUID
  backendId?: number;
  question_type: QuestionType;
  question_text: string;
  media_url?: string | null;
  media_type?: string | null;
  options: (string | OptionObject)[];
  correct_answer: string;
  marks: number;
  negative_marks: number;
  is_autograded: boolean;
}

export const isQuestionEmpty = (q: LocalQuestion): boolean => {
  if (q.backendId) return false;
  const hasText = !!q.question_text?.trim();
  const hasMedia = !!q.media_url;
  const hasOptions = Array.isArray(q.options) && q.options.some((opt) => {
    if (typeof opt === "string") return !!opt.trim();
    if (typeof opt === "object" && opt !== null) return !!opt.text?.trim() || !!opt.media_url;
    return false;
  });
  return !hasText && !hasMedia && !hasOptions;
};

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function convertUTCToLocal(utcDateTimeString: string): string {
  if (!utcDateTimeString) return "";
  const date = new Date(utcDateTimeString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const TEST_TYPES: {
  type: TestType;
  title: string;
  subtitle: string;
  icon: any;
  defaultDuration: number;
  description: string;
  color: string;
  borderColor: string;
  badgeBg: string;
}[] = [
  {
    type: "MOCK_TEST",
    title: "Mock Test",
    subtitle: "Timed Exam Simulation",
    icon: Clock,
    defaultDuration: 60,
    description: "Strict timer, full-length test simulation with proctoring & ranking.",
    color: "text-[#0276D3]",
    borderColor: "border-[#0276D3]/30",
    badgeBg: "bg-blue-50 text-[#0276D3]",
  },
  {
    type: "PRACTICE",
    title: "Practice Set",
    subtitle: "Self-Paced Learning",
    icon: Sparkles,
    defaultDuration: 0,
    description: "Self-paced chapter practice with unlimited attempts & instant explanations.",
    color: "text-[#eca209]",
    borderColor: "border-[#eca209]/30",
    badgeBg: "bg-amber-50 text-[#eca209]",
  },
  {
    type: "ASSESSMENT",
    title: "Assessment",
    subtitle: "Graded Class Evaluation",
    icon: ClipboardList,
    defaultDuration: 45,
    description: "Periodic evaluations with passing thresholds and teacher grading.",
    color: "text-slate-700",
    borderColor: "border-slate-300",
    badgeBg: "bg-slate-100 text-slate-700",
  },
  {
    type: "CERTIFICATION",
    title: "Certification",
    subtitle: "Qualifying Certificate Exam",
    icon: Award,
    defaultDuration: 90,
    description: "Issues an official, verifiable digital certificate upon achieving passing marks.",
    color: "text-emerald-700",
    borderColor: "border-emerald-300",
    badgeBg: "bg-emerald-50 text-emerald-700",
  },
];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: "Multiple Choice",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short Answer",
  LONG_ANSWER: "Long Answer",
  MATCH_THE_FOLLOWING: "Match the Following",
  CASE_STUDY: "Case Study",
};

export default function CreateTestPage() {
  const navigate = useNavigate();
  const { testId: paramTestId } = useParams();
  const isEditing = !!paramTestId;
  usePageTitle(isEditing ? "Edit Test" : "Create New Test");
  const { user } = useAuthStore();

  // Tab State: 'details' | 'questions'
  const [activeTab, setActiveTab] = useState<"details" | "questions">("details");

  // Loading States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Metadata dropdowns
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [testSeriesList, setTestSeriesList] = useState<TestSeries[]>([]);

  // Candidate whitelist inputs
  const [candidateNameInput, setCandidateNameInput] = useState("");
  const [candidateEmailInput, setCandidateEmailInput] = useState("");
  const [bulkCandidatesOpen, setBulkCandidatesOpen] = useState(false);
  const [bulkCandidatesText, setBulkCandidatesText] = useState("");

  // Test Details Form State
  const [formData, setFormData] = useState<CreateTestData>({
    title: "",
    description: "",
    instructions: "",
    subject_id: null,
    test_series_id: null,
    total_marks: 50,
    passing_marks: 20,
    duration_minutes: 60,
    available_from: "",
    available_until: "",
    is_published: true,
    is_autograded: true,
    has_negative_marking: false,
    max_warning_attempts: 3,
    enforce_warning_attempts: true,
    test_type: "MOCK_TEST",
    allowed_candidates: [],
    certificate_template: "has successfully completed the assessment for {test_title} with a score of {score}/{total_marks} ({percentage}) on {date}.",
    certificate_title: "Certificate of Completion",
  });

  // Questions List State
  const [questions, setQuestions] = useState<LocalQuestion[]>([
    {
      id: generateId(),
      question_type: "MCQ",
      question_text: "",
      options: ["", "", "", ""],
      correct_answer: "",
      marks: 2,
      negative_marks: 0,
      is_autograded: true,
    },
  ]);

  // AI Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Breakdown counts for AI generation
  const [aiCounts, setAiCounts] = useState({
    mcq: 5,
    mcqMarks: 2,
    trueFalse: 3,
    trueFalseMarks: 1,
    shortAnswer: 2,
    shortAnswerMarks: 2,
    longAnswer: 0,
    longAnswerMarks: 5,
    matchFollowing: 0,
    matchFollowingMarks: 4,
    caseStudy: 0,
    caseStudyMarks: 5,
  });

  // Batch Template Generator Modal
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateReplaceExisting, setTemplateReplaceExisting] = useState(true);
  const [templateCounts, setTemplateCounts] = useState({
    mcq: 5,
    mcqMarks: 2,
    trueFalse: 2,
    trueFalseMarks: 1,
    shortAnswer: 2,
    shortAnswerMarks: 3,
    longAnswer: 1,
    longAnswerMarks: 5,
    matchFollowing: 1,
    matchFollowingMarks: 4,
    caseStudy: 0,
    caseStudyMarks: 5,
  });

  const [aiReplaceExisting, setAiReplaceExisting] = useState(true);

  // Deleted Question IDs tracker for editing
  const [deletedBackendQuestionIds, setDeletedBackendQuestionIds] = useState<number[]>([]);

  // Load existing test for editing
  useEffect(() => {
    fetchMetadata();
    if (isEditing && paramTestId) {
      loadTest(parseInt(paramTestId));
    } else {
      const now = new Date();
      const inOneMonth = new Date();
      inOneMonth.setDate(now.getDate() + 30);
      setFormData((prev) => ({
        ...prev,
        available_from: convertUTCToLocal(now.toISOString()),
        available_until: convertUTCToLocal(inOneMonth.toISOString()),
      }));
    }
  }, [paramTestId, isEditing, user?.id, user?.role]);

  const fetchMetadata = async () => {
    try {
      const subjectParams: any = { limit: 1000 };
      if (user?.id && user?.role) {
        subjectParams.user_id = user.id;
        subjectParams.role = user.role;
      }
      const [subjectsRes, testSeriesRes] = await Promise.all([
        subjectService.getAll(subjectParams),
        testSeriesService.getAll({ limit: 1000 }),
      ]);
      const subjectsData = Array.isArray(subjectsRes.data?.data)
        ? subjectsRes.data.data
        : Array.isArray((subjectsRes.data as any)?.data?.data)
          ? (subjectsRes.data as any).data.data
          : Array.isArray(subjectsRes.data)
            ? subjectsRes.data
            : [];
      setSubjects(subjectsData);
      setTestSeriesList(Array.isArray(testSeriesRes.data) ? testSeriesRes.data : (testSeriesRes.data as any)?.data || []);
    } catch (err) {
      console.warn("Error loading metadata:", err);
    }
  };

  const loadTest = async (id: number) => {
    try {
      setLoading(true);
      const res = await testService.getById(id);
      const t = res.data;

      let loadedAllowedCandidates: AllowedCandidate[] = [];
      try {
        const rawCandidates = typeof (t as any).allowed_candidates === "string"
          ? JSON.parse((t as any).allowed_candidates)
          : (t as any).allowed_candidates;
        if (Array.isArray(rawCandidates)) {
          loadedAllowedCandidates = rawCandidates;
        }
      } catch (e) {}

      setFormData({
        title: t.title || "",
        description: t.description || "",
        instructions: t.instructions || "",
        subject_id: t.subject_id || null,
        test_series_id: t.test_series_id || null,
        total_marks: t.total_marks || 50,
        passing_marks: t.passing_marks || 20,
        duration_minutes: t.duration_minutes ?? 60,
        available_from: convertUTCToLocal(t.available_from),
        available_until: convertUTCToLocal(t.available_until),
        is_published: t.is_published,
        is_autograded: t.is_autograded ?? true,
        has_negative_marking: t.has_negative_marking ?? false,
        max_warning_attempts: t.max_warning_attempts ?? 3,
        enforce_warning_attempts: (t as any).enforce_warning_attempts ?? true,
        test_type: t.test_type || (t.is_certification ? "CERTIFICATION" : "MOCK_TEST"),
        allowed_candidates: loadedAllowedCandidates,
        certificate_template: t.certificate_template || "has successfully completed the assessment for {test_title} with a score of {score}/{total_marks} ({percentage}) on {date}.",
        certificate_title: t.certificate_title || "Certificate of Completion",
      });

      if (t.questions && t.questions.length > 0) {
        setQuestions(
          t.questions.map((q) => ({
            id: generateId(),
            backendId: q.id,
            question_type: q.question_type,
            question_text: q.question_text || "",
            media_url: q.media_url || null,
            media_type: q.media_type || null,
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : (q.question_type === "MCQ" ? ["", "", "", ""] : []),
            correct_answer: q.correct_answer || "",
            marks: q.marks || 2,
            negative_marks: q.negative_marks || 0,
            is_autograded: q.is_autograded !== undefined
              ? q.is_autograded
              : (q.question_type === "MCQ" || q.question_type === "TRUE_FALSE" || q.question_type === "MATCH_THE_FOLLOWING"),
          }))
        );
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to load test details");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Test Type Selection Helper
  const handleSelectTestType = (type: TestType) => {
    const config = TEST_TYPES.find((t) => t.type === type);
    if (!config) return;

    setFormData((prev) => ({
      ...prev,
      test_type: type,
      duration_minutes: config.defaultDuration,
      is_autograded: type !== "ASSESSMENT",
      max_warning_attempts: type === "PRACTICE" ? 10 : 3,
    }));
  };

  // Candidate whitelist handlers
  const handleAddCandidate = () => {
    if (!candidateEmailInput.trim()) {
      toast.error("Candidate email address is required");
      return;
    }
    const email = candidateEmailInput.trim().toLowerCase();
    const currentList: AllowedCandidate[] = Array.isArray(formData.allowed_candidates)
      ? (formData.allowed_candidates as AllowedCandidate[])
      : [];

    if (currentList.some((c) => c.email.toLowerCase() === email)) {
      toast.error("This email is already in the allowed list");
      return;
    }

    const newCandidate: AllowedCandidate = {
      name: candidateNameInput.trim() || email.split("@")[0],
      email,
      added_at: new Date().toISOString(),
    };

    setFormData((prev) => ({
      ...prev,
      allowed_candidates: [...currentList, newCandidate],
    }));

    setCandidateNameInput("");
    setCandidateEmailInput("");
    toast.success(`Added ${newCandidate.name} to allowed candidates`);
  };

  const handleRemoveCandidate = (indexToRemove: number) => {
    const currentList: AllowedCandidate[] = Array.isArray(formData.allowed_candidates)
      ? (formData.allowed_candidates as AllowedCandidate[])
      : [];

    setFormData((prev) => ({
      ...prev,
      allowed_candidates: currentList.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleBulkAddCandidates = () => {
    if (!bulkCandidatesText.trim()) return;

    const lines = bulkCandidatesText.split("\n").map((l) => l.trim()).filter(Boolean);
    const currentList: AllowedCandidate[] = Array.isArray(formData.allowed_candidates)
      ? [...(formData.allowed_candidates as AllowedCandidate[])]
      : [];

    let addedCount = 0;
    for (const line of lines) {
      let name = "";
      let email = "";

      if (line.includes(",") || line.includes(";") || line.includes("\t")) {
        const parts = line.split(/[,;\t]+/).map((p) => p.trim());
        if (parts.length >= 2) {
          if (parts[0].includes("@")) {
            email = parts[0];
            name = parts[1];
          } else {
            name = parts[0];
            email = parts[1];
          }
        } else {
          email = parts[0];
        }
      } else {
        email = line;
      }

      email = email.trim().toLowerCase();
      if (email.includes("@") && !currentList.some((c) => c.email.toLowerCase() === email)) {
        currentList.push({
          name: name || email.split("@")[0],
          email,
          added_at: new Date().toISOString(),
        });
        addedCount++;
      }
    }

    setFormData((prev) => ({ ...prev, allowed_candidates: currentList }));
    setBulkCandidatesText("");
    setBulkCandidatesOpen(false);
    toast.success(`Added ${addedCount} candidate(s) successfully`);
  };

  const handleInsertVariable = (variable: string) => {
    const currentText = formData.certificate_template || "";
    setFormData((prev) => ({
      ...prev,
      certificate_template: currentText ? `${currentText} {${variable}}` : `{${variable}}`,
    }));
  };

  const previewCertificateText = useMemo(() => {
    const template =
      formData.certificate_template ||
      "has successfully completed the assessment for {test_title} with a score of {score}/{total_marks} ({percentage}) on {date}.";
    return template
      .replace(/\{name\}|\{candidate_name\}/gi, "John Doe")
      .replace(/\{test_title\}|\{test_name\}|\{exam_title\}/gi, formData.title || "Certification Exam")
      .replace(
        /\{date\}|\{issue_date\}|\{completion_date\}/gi,
        new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      )
      .replace(/\{score\}|\{marks_obtained\}/gi, String(formData.passing_marks || 45))
      .replace(/\{total_marks\}|\{max_marks\}/gi, String(formData.total_marks || 50))
      .replace(/\{percentage\}|\{percent\}/gi, "90.0%")
      .replace(/\{certificate_id\}|\{certificate_code\}|\{code\}/gi, "SA-CERT-6-12-8F92A1");
  }, [formData.certificate_template, formData.title, formData.total_marks, formData.passing_marks]);

  // Calculate total marks dynamically
  const calculatedTotalMarks = useMemo(() => {
    return questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
  }, [questions]);

  // Question Management Helpers
  const handleAddQuestion = (type: QuestionType = "MCQ") => {
    let defaultOpts: string[] = [];
    let defaultAns = "";
    let defaultMarks = 2;

    if (type === "MCQ") {
      defaultOpts = ["", "", "", ""];
      defaultMarks = 2;
    } else if (type === "TRUE_FALSE") {
      defaultOpts = ["True", "False"];
      defaultAns = "True";
      defaultMarks = 1;
    } else if (type === "SHORT_ANSWER") {
      defaultMarks = 2;
    } else if (type === "LONG_ANSWER") {
      defaultMarks = 5;
    } else if (type === "MATCH_THE_FOLLOWING") {
      defaultOpts = [
        JSON.stringify({ left: "Column A Item 1", right: "Column B Match 1" }),
        JSON.stringify({ left: "Column A Item 2", right: "Column B Match 2" }),
        JSON.stringify({ left: "Column A Item 3", right: "Column B Match 3" }),
      ];
      defaultAns = JSON.stringify([
        { left: "Column A Item 1", right: "Column B Match 1" },
        { left: "Column A Item 2", right: "Column B Match 2" },
        { left: "Column A Item 3", right: "Column B Match 3" },
      ]);
      defaultMarks = 4;
    } else if (type === "CASE_STUDY") {
      defaultMarks = 5;
    }

    const isObjective = type === "MCQ" || type === "TRUE_FALSE" || type === "MATCH_THE_FOLLOWING";
    const newQ: LocalQuestion = {
      id: generateId(),
      question_type: type,
      question_text: "",
      options: defaultOpts,
      correct_answer: defaultAns,
      marks: defaultMarks,
      negative_marks: formData.has_negative_marking ? 0.5 : 0,
      is_autograded: isObjective,
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleDuplicateQuestion = (index: number) => {
    const target = questions[index];
    const duplicated: LocalQuestion = {
      ...target,
      id: generateId(),
      backendId: undefined,
      question_text: `${target.question_text} (Copy)`,
    };
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicated);
    setQuestions(updated);
    toast.success("Question duplicated");
  };

  const handleDeleteQuestion = (index: number) => {
    const target = questions[index];
    if (target.backendId) {
      setDeletedBackendQuestionIds((prev) => [...prev, target.backendId!]);
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === questions.length - 1)) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
  };

  const updateQuestionField = (index: number, field: keyof LocalQuestion, value: any) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleChangeQuestionType = (qIndex: number, newType: QuestionType) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const current = copy[qIndex];
      let options: string[] = [];
      let correct_answer = "";
      let marks = current.marks;

      if (newType === "MCQ") {
        options = ["", "", "", ""];
      } else if (newType === "TRUE_FALSE") {
        options = ["True", "False"];
        correct_answer = "True";
        marks = 1;
      } else if (newType === "MATCH_THE_FOLLOWING") {
        options = [
          JSON.stringify({ left: "Item 1", right: "Match 1" }),
          JSON.stringify({ left: "Item 2", right: "Match 2" }),
        ];
        correct_answer = JSON.stringify([
          { left: "Item 1", right: "Match 1" },
          { left: "Item 2", right: "Match 2" },
        ]);
        marks = 4;
      }

      const isObjective = newType === "MCQ" || newType === "TRUE_FALSE" || newType === "MATCH_THE_FOLLOWING";
      copy[qIndex] = {
        ...current,
        question_type: newType,
        options,
        correct_answer,
        marks,
        is_autograded: isObjective,
      };
      return copy;
    });
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIndex].options];
      const curr = opts[optIndex];
      if (typeof curr === "object" && curr !== null) {
        opts[optIndex] = { ...curr, text };
      } else {
        opts[optIndex] = text;
      }
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const updateOptionMedia = (qIndex: number, optIndex: number, media_url: string | null, media_type: string | null = "image") => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIndex].options];
      const curr = opts[optIndex];
      const currentText = typeof curr === "string" ? curr : (curr?.text || "");
      if (!media_url) {
        opts[optIndex] = currentText;
      } else {
        opts[optIndex] = {
          text: currentText,
          media_url,
          media_type: media_type || "image",
        };
      }
      copy[qIndex] = { ...copy[qIndex], options: opts };
      return copy;
    });
  };

  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = {
        ...copy[qIndex],
        options: [...copy[qIndex].options, ""],
      };
      return copy;
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const current = copy[qIndex];
      const opts = current.options.filter((_, i) => i !== optIndex);
      const removedOptText = getOptionText(current.options[optIndex]);
      const newCorrect = current.correct_answer === removedOptText ? (getOptionText(opts[0]) || "") : current.correct_answer;
      copy[qIndex] = {
        ...current,
        options: opts,
        correct_answer: newCorrect,
      };
      return copy;
    });
  };

  // Match the Following helpers
  const getParsedPairs = (q: LocalQuestion): MatchPair[] => {
    return (q.options || []).map((opt) => {
      try {
        const parsed = typeof opt === "string" ? JSON.parse(opt) : opt;
        return { left: parsed.left || "", right: parsed.right || "" };
      } catch {
        return { left: "", right: "" };
      }
    });
  };

  const updateMatchPair = (qIndex: number, pairIndex: number, field: "left" | "right", value: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      const pairs = getParsedPairs(q);
      if (pairs[pairIndex]) {
        pairs[pairIndex][field] = value;
      }
      const newOptions = pairs.map((p) => JSON.stringify(p));
      copy[qIndex] = {
        ...q,
        options: newOptions,
        correct_answer: JSON.stringify(pairs),
      };
      return copy;
    });
  };

  const addMatchPair = (qIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      const pairs = getParsedPairs(q);
      const newPair: MatchPair = { left: `Item ${pairs.length + 1}`, right: `Match ${pairs.length + 1}` };
      const updatedPairs = [...pairs, newPair];
      copy[qIndex] = {
        ...q,
        options: updatedPairs.map((p) => JSON.stringify(p)),
        correct_answer: JSON.stringify(updatedPairs),
      };
      return copy;
    });
  };

  const removeMatchPair = (qIndex: number, pairIndex: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIndex];
      const pairs = getParsedPairs(q).filter((_, idx) => idx !== pairIndex);
      copy[qIndex] = {
        ...q,
        options: pairs.map((p) => JSON.stringify(p)),
        correct_answer: JSON.stringify(pairs),
      };
      return copy;
    });
  };

  // AI Question Generation Handler
  const handleGenerateAIQuestions = async () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter a topic or chapter name");
      return;
    }
    try {
      setAiGenerating(true);
      let generatedQuestions: LocalQuestion[] = [];

      try {
        const res = await testService.generateQuestionsPreview({
          topic: aiTopic.trim(),
          difficulty: aiDifficulty,
          subject_id: formData.subject_id ? Number(formData.subject_id) : undefined,
          counts: aiCounts,
          marks: {
            mcqMarks: aiCounts.mcqMarks,
            trueFalseMarks: aiCounts.trueFalseMarks,
            shortAnswerMarks: aiCounts.shortAnswerMarks,
            longAnswerMarks: aiCounts.longAnswerMarks,
            matchFollowingMarks: aiCounts.matchFollowingMarks,
            caseStudyMarks: aiCounts.caseStudyMarks,
          },
        });

        const rawList = res.data || [];
        if (Array.isArray(rawList) && rawList.length > 0) {
          generatedQuestions = rawList.map((q: any) => {
            const isObjective = q.question_type === "MCQ" || q.question_type === "TRUE_FALSE" || q.question_type === "MATCH_THE_FOLLOWING";
            return {
              id: generateId(),
              question_type: q.question_type,
              question_text: q.question_text || q.question || "",
              options: Array.isArray(q.options) ? q.options : [],
              correct_answer: q.correct_answer || q.correctAnswer || (q.options?.[0] || ""),
              marks: Number(q.marks) || (q.question_type === "TRUE_FALSE" ? 1 : 2),
              negative_marks: formData.has_negative_marking && isObjective ? 0.5 : 0,
              is_autograded: q.is_autograded !== undefined ? q.is_autograded : isObjective,
            };
          });
        }
      } catch (apiErr) {
        console.warn("API AI generation error, using rich contextual generator fallback:", apiErr);
      }

      // Fallback if API couldn't generate
      if (generatedQuestions.length === 0) {
        // Generate MCQs
        for (let i = 1; i <= (aiCounts.mcq || 0); i++) {
          const opts = [
            `Key fundamental definition and principle of ${aiTopic}`,
            `Standard property observed under non-standard conditions`,
            `Inverse secondary factor affecting ${aiTopic}`,
            `Edge-case boundary condition of ${aiTopic}`,
          ];
          generatedQuestions.push({
            id: generateId(),
            question_type: "MCQ",
            question_text: `Which of the following best describes the core characteristic of ${aiTopic}?`,
            options: opts,
            correct_answer: opts[0],
            marks: aiCounts.mcqMarks || 2,
            negative_marks: formData.has_negative_marking ? 0.5 : 0,
            is_autograded: true,
          });
        }

        // Generate True/False
        for (let i = 1; i <= (aiCounts.trueFalse || 0); i++) {
          generatedQuestions.push({
            id: generateId(),
            question_type: "TRUE_FALSE",
            question_text: `${aiTopic} plays an essential role in system stability under standard operating conditions.`,
            options: ["True", "False"],
            correct_answer: "True",
            marks: aiCounts.trueFalseMarks || 1,
            negative_marks: formData.has_negative_marking ? 0.25 : 0,
            is_autograded: true,
          });
        }

        // Generate Short Answers
        for (let i = 1; i <= (aiCounts.shortAnswer || 0); i++) {
          generatedQuestions.push({
            id: generateId(),
            question_type: "SHORT_ANSWER",
            question_text: `Explain the fundamental working mechanism of ${aiTopic} in 2-3 sentences.`,
            options: [],
            correct_answer: `Key points: Definition, primary working mechanism, and practical significance of ${aiTopic}.`,
            marks: aiCounts.shortAnswerMarks || 2,
            negative_marks: 0,
            is_autograded: false,
          });
        }

        // Generate Long Answers
        for (let i = 1; i <= (aiCounts.longAnswer || 0); i++) {
          generatedQuestions.push({
            id: generateId(),
            question_type: "LONG_ANSWER",
            question_text: `Provide a detailed explanation and analysis of ${aiTopic}, including its key concepts and real-world applications.`,
            options: [],
            correct_answer: `Evaluation criteria: Complete conceptual definition, detailed explanation of mechanisms, diagrams where applicable, and real-world examples.`,
            marks: aiCounts.longAnswerMarks || 5,
            negative_marks: 0,
            is_autograded: false,
          });
        }

        // Generate Match the Following
        for (let i = 1; i <= (aiCounts.matchFollowing || 0); i++) {
          const pairs: MatchPair[] = [
            { left: `${aiTopic} Principle`, right: `Core theoretical foundation` },
            { left: `${aiTopic} Application`, right: `Practical domain implementation` },
            { left: `${aiTopic} Parameter`, right: `Measurable system variable` },
          ];
          generatedQuestions.push({
            id: generateId(),
            question_type: "MATCH_THE_FOLLOWING",
            question_text: `Match each concept related to ${aiTopic} in Column A with its corresponding description in Column B.`,
            options: pairs.map((p) => JSON.stringify(p)),
            correct_answer: JSON.stringify(pairs),
            marks: aiCounts.matchFollowingMarks || 4,
            negative_marks: 0,
            is_autograded: true,
          });
        }

        // Generate Case Study
        for (let i = 1; i <= (aiCounts.caseStudy || 0); i++) {
          generatedQuestions.push({
            id: generateId(),
            question_type: "CASE_STUDY",
            question_text: `Case Scenario: An experimental setup involving ${aiTopic} is evaluated under differing operational parameters. \n\nQuestion: Analyze the contributing factors to the observed behavior and recommend optimal conditions.`,
            options: [],
            correct_answer: `Evaluation points: Accurate analysis of the experimental factors, validation of theoretical principles of ${aiTopic}, and justified recommendations.`,
            marks: aiCounts.caseStudyMarks || 5,
            negative_marks: 0,
            is_autograded: false,
          });
        }
      }

      setQuestions((prev) => {
        const isInitialBlank = prev.length === 1 && isQuestionEmpty(prev[0]);
        if (aiReplaceExisting || isInitialBlank) {
          return generatedQuestions;
        }
        return [...prev, ...generatedQuestions];
      });
      setAiModalOpen(false);
      setAiTopic("");
      toast.success(`Generated ${generatedQuestions.length} questions with auto-grading rules!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions");
    } finally {
      setAiGenerating(false);
    }
  };

  // Batch Template Generator Handler
  const handleGenerateTemplate = () => {
    const generated: LocalQuestion[] = [];

    for (let i = 1; i <= (templateCounts.mcq || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "MCQ",
        question_text: "",
        options: ["", "", "", ""],
        correct_answer: "",
        marks: templateCounts.mcqMarks || 2,
        negative_marks: formData.has_negative_marking ? 0.5 : 0,
        is_autograded: true,
      });
    }

    for (let i = 1; i <= (templateCounts.trueFalse || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "TRUE_FALSE",
        question_text: "",
        options: ["True", "False"],
        correct_answer: "True",
        marks: templateCounts.trueFalseMarks || 1,
        negative_marks: formData.has_negative_marking ? 0.25 : 0,
        is_autograded: true,
      });
    }

    for (let i = 1; i <= (templateCounts.shortAnswer || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "SHORT_ANSWER",
        question_text: "",
        options: [],
        correct_answer: "",
        marks: templateCounts.shortAnswerMarks || 2,
        negative_marks: 0,
        is_autograded: false,
      });
    }

    for (let i = 1; i <= (templateCounts.longAnswer || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "LONG_ANSWER",
        question_text: "",
        options: [],
        correct_answer: "",
        marks: templateCounts.longAnswerMarks || 5,
        negative_marks: 0,
        is_autograded: false,
      });
    }

    for (let i = 1; i <= (templateCounts.matchFollowing || 0); i++) {
      const pairs: MatchPair[] = [
        { left: "", right: "" },
        { left: "", right: "" },
      ];
      generated.push({
        id: generateId(),
        question_type: "MATCH_THE_FOLLOWING",
        question_text: "",
        options: pairs.map((p) => JSON.stringify(p)),
        correct_answer: JSON.stringify(pairs),
        marks: templateCounts.matchFollowingMarks || 4,
        negative_marks: 0,
        is_autograded: true,
      });
    }

    for (let i = 1; i <= (templateCounts.caseStudy || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "CASE_STUDY",
        question_text: "",
        options: [],
        correct_answer: "",
        marks: templateCounts.caseStudyMarks || 5,
        negative_marks: 0,
        is_autograded: false,
      });
    }

    setQuestions((prev) => {
      const isInitialBlank = prev.length === 1 && isQuestionEmpty(prev[0]);
      if (templateReplaceExisting || isInitialBlank) {
        return generated;
      }
      return [...prev, ...generated];
    });
    setTemplateModalOpen(false);
    toast.success(`Added ${generated.length} template questions!`);
  };

  // Master Save Handler
  const handleSaveFullTest = async (publishImmediate = false) => {
    if (!formData.title.trim()) {
      setActiveTab("details");
      setErrorMessage("Please enter a Test Title before saving.");
      setErrorOpen(true);
      return;
    }

    if (questions.length === 0) {
      setActiveTab("questions");
      setErrorMessage("Please add at least one question to the test.");
      setErrorOpen(true);
      return;
    }

    const emptyQIndex = questions.findIndex((q) => !q.question_text.trim());
    if (emptyQIndex !== -1) {
      setActiveTab("questions");
      setErrorMessage(`Question #${emptyQIndex + 1} is missing question text.`);
      setErrorOpen(true);
      return;
    }

    const isPublishing = publishImmediate || formData.is_published;

    if (isPublishing) {
      if (formData.total_marks !== calculatedTotalMarks) {
        setActiveTab("details");
        setErrorMessage(
          `Cannot publish test: Test Total Marks (${formData.total_marks}) does not match the sum of Question Marks (${calculatedTotalMarks}). Total marks must equal the sum of question marks before publishing.`
        );
        setErrorOpen(true);
        return;
      }
    }

    try {
      setSaving(true);
      const totalMarksToSave = calculatedTotalMarks > 0 ? calculatedTotalMarks : formData.total_marks;

      const payload: CreateTestData = {
        ...formData,
        total_marks: totalMarksToSave,
        is_published: isEditing ? (publishImmediate || formData.is_published) : false, // Create as draft first so questions are created before publishing validation
        available_from: formData.available_from ? new Date(formData.available_from).toISOString() : new Date().toISOString(),
        available_until: formData.available_until
          ? new Date(formData.available_until).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString(),
        allowed_candidates: formData.allowed_candidates || [],
        certificate_template: formData.certificate_template?.trim() || null,
        certificate_title: formData.certificate_title?.trim() || "Certificate of Completion",
      };

      let savedTestId: number;

      if (isEditing && paramTestId) {
        savedTestId = parseInt(paramTestId);
        await testService.update(savedTestId, payload);
      } else {
        const createRes = await testService.create(payload);
        savedTestId = createRes.data.id;
      }

      for (const bId of deletedBackendQuestionIds) {
        try {
          await testService.deleteQuestion(bId);
        } catch (delErr) {
          console.warn("Error deleting question ID:", bId, delErr);
        }
      }

      const questionPromises = questions.map(async (q) => {
        const qData = {
          question_type: q.question_type,
          question_text: q.question_text,
          media_url: q.media_url || null,
          media_type: q.media_type || null,
          options: q.options,
          correct_answer: q.correct_answer || (q.options.length > 0 ? getOptionText(q.options[0]) : (q.question_type === "TRUE_FALSE" ? "True" : "")),
          marks: Number(q.marks) || 1,
          negative_marks: Number(q.negative_marks) || 0,
          is_autograded: q.is_autograded,
        };

        if (q.backendId) {
          return testService.updateQuestion(q.backendId, qData);
        } else {
          return testService.addQuestion(savedTestId, qData as any);
        }
      });

      await Promise.all(questionPromises);

      // If creating new test and publish was requested, publish now that all questions are saved in the database
      if (!isEditing && isPublishing) {
        await testService.update(savedTestId, { is_published: true, total_marks: totalMarksToSave });
      }

      setSuccessMessage(
        isEditing
          ? (isPublishing ? "Test updated and published successfully!" : "Test draft updated successfully!")
          : (isPublishing ? "Test created and published successfully!" : "Test saved as draft successfully!")
      );
      setSuccessOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save test. Please check all required fields.");
      setErrorOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const formatSubjectFilterLabel = (s: Subject) => {
    const parts = [s.name];
    if (s.class?.name) parts.push(s.class.name);
    if (s.board?.name) parts.push(s.board.name);
    return parts.join(" - ");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading test editor...</p>
      </div>
    );
  }

  const selectedTypeConfig = TEST_TYPES.find((t) => t.type === formData.test_type) || TEST_TYPES[0];

  return (
    <div className="p-2 sm:p-6 max-w-5xl mx-auto space-y-6 pb-24">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tests")}
            className="text-slate-500 hover:text-[#0276D3] hover:bg-slate-100 rounded-xl h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isEditing ? "Edit Test" : "Create Test"}
              </h1>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${selectedTypeConfig.badgeBg} ${selectedTypeConfig.borderColor}`}>
                {selectedTypeConfig.title}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {questions.length} Question{questions.length !== 1 ? "s" : ""} • {calculatedTotalMarks} Total Marks • {formData.duration_minutes || 0} Mins
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => handleSaveFullTest(false)}
            disabled={saving}
            className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 w-full sm:w-auto flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
          <Button
            onClick={() => handleSaveFullTest(true)}
            disabled={saving}
            className="bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl text-xs font-bold w-full sm:w-auto shadow-md shadow-[#0276D3]/10 flex items-center gap-1.5"
          >
            {saving ? "Saving..." : isEditing ? "Update & Publish" : "Publish Test"}
          </Button>
        </div>
      </div>

      {/* Modern Two-Step Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("details")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "details"
              ? "bg-[#0276D3] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
          Test Settings & Rules
        </button>

        <button
          onClick={() => setActiveTab("questions")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "questions"
              ? "bg-[#0276D3] text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
          Question Paper Builder ({questions.length})
        </button>
      </div>

      {/* TAB 1: TEST SETTINGS & RULES */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* 1. Test Type Selection */}
          <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
                1. Select Test Format
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Choose how this test will be presented and evaluated for students.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TEST_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = formData.test_type === t.type;
                  return (
                    <div
                      key={t.type}
                      onClick={() => handleSelectTestType(t.type)}
                      className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? `border-[#0276D3] bg-blue-50/40 shadow-xs ring-2 ring-[#0276D3]/10`
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-xl bg-white border border-slate-100 shadow-xs ${t.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[#0276D3] text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{t.subtitle}</p>
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">{t.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Default: {t.defaultDuration > 0 ? `${t.defaultDuration} Mins` : "Self-paced"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 2. Basic Test Details */}
          <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
                2. Test Title & Subject Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Test Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Chapter 4 — Thermodynamics Periodic Assessment"
                  className="mt-1 rounded-xl text-sm border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject</Label>
                  <SearchablePaginatedSelect
                    value={formData.subject_id?.toString() || "none"}
                    onValueChange={(v) => setFormData({ ...formData, subject_id: v === "none" ? null : Number(v) })}
                    placeholder="Assign to a subject..."
                    searchPlaceholder="Search subjects..."
                    triggerClassName="mt-1 rounded-xl"
                    options={[
                      { value: "none", label: "None / General" },
                      ...subjects.map((s) => ({
                        value: s.id.toString(),
                        label: formatSubjectFilterLabel(s),
                        searchText: `${s.name} ${s.class?.name || ""} ${s.board?.name || ""}`,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Test Series (Optional)</Label>
                  <Select
                    value={formData.test_series_id?.toString() || "none"}
                    onValueChange={(v) => setFormData({ ...formData, test_series_id: v === "none" ? null : Number(v) })}
                  >
                    <SelectTrigger className="mt-1 rounded-xl">
                      <SelectValue placeholder="Select test series..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Independent</SelectItem>
                      {testSeriesList.map((ts) => (
                        <SelectItem key={ts.id} value={ts.id.toString()}>
                          {ts.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Instructions for Students</Label>
                <Textarea
                  value={formData.instructions || ""}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={3}
                  placeholder="Specify guidelines e.g. Attempt all questions. Rough work allowed."
                  className="mt-1 rounded-xl text-xs border-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Duration, Marks & Proctoring */}
          <Card className="rounded-2xl border border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-5 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">
                3. Timing & Grading Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Marks *</Label>
                    {calculatedTotalMarks > 0 && formData.total_marks !== calculatedTotalMarks && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, total_marks: calculatedTotalMarks }))}
                        className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded hover:bg-amber-100 flex items-center gap-1"
                        title="Click to sync total marks with questions"
                      >
                        ⚡ Auto-Sync ({calculatedTotalMarks})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={formData.total_marks}
                    onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })}
                    className={`mt-1 rounded-xl text-sm ${formData.total_marks !== calculatedTotalMarks ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'}`}
                  />
                  <div className="flex items-center justify-between text-[10px] mt-1">
                    <span className="text-slate-500">From questions: <strong>{calculatedTotalMarks} marks</strong></span>
                    {formData.total_marks === calculatedTotalMarks ? (
                      <span className="text-emerald-600 font-bold">✓ Matched</span>
                    ) : (
                      <span className="text-amber-600 font-bold">⚠️ Must match to publish</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Passing Marks *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.passing_marks}
                    onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) })}
                    className="mt-1 rounded-xl text-sm border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Minimum score required to pass</p>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Duration (Minutes)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    placeholder="0 for untimed"
                    className="mt-1 rounded-xl text-sm border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">0 for untimed practice</p>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Max Warnings</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.max_warning_attempts ?? 3}
                    onChange={(e) => setFormData({ ...formData, max_warning_attempts: Number(e.target.value) })}
                    className="mt-1 rounded-xl text-sm border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Auto-submits on violation limit</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer border border-slate-200/80 hover:bg-slate-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.has_negative_marking}
                    onChange={(e) => setFormData({ ...formData, has_negative_marking: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0276D3]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Negative Marking</span>
                    <p className="text-[11px] text-slate-500">Deduct penalty marks for incorrect answers.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer border border-slate-200/80 hover:bg-slate-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.enforce_warning_attempts === false}
                    onChange={(e) => setFormData({ ...formData, enforce_warning_attempts: !e.target.checked })}
                    className="w-4 h-4 rounded text-[#0276D3]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Disable Proctoring Auto-Submit</span>
                    <p className="text-[11px] text-slate-500">Allow student to continue test even after warnings.</p>
                  </div>
                </label>
              </div>

              {/* Schedule Availability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available From</Label>
                  <Input
                    type="datetime-local"
                    value={formData.available_from}
                    onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                    className="mt-1 rounded-xl text-xs border-slate-200"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Available Until</Label>
                  <Input
                    type="datetime-local"
                    value={formData.available_until}
                    onChange={(e) => setFormData({ ...formData, available_until: e.target.value })}
                    className="mt-1 rounded-xl text-xs border-slate-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Certification & Candidate Access Control (when test_type is CERTIFICATION) */}
          {formData.test_type === "CERTIFICATION" && (
            <Card className="rounded-2xl border-2 border-emerald-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-emerald-50/70 p-5 pb-4 border-b border-emerald-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-emerald-950">
                        4. Certificate Customization & Candidate Whitelist
                      </CardTitle>
                      <CardDescription className="text-xs text-emerald-700 mt-0.5">
                        Define custom certificate wording and manage eligible candidate emails.
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold px-3 py-1">
                    Certification Mode Active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Certificate Title & Wording */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Certificate Heading / Title
                    </Label>
                    <Input
                      value={formData.certificate_title || ""}
                      onChange={(e) => setFormData({ ...formData, certificate_title: e.target.value })}
                      placeholder="e.g. Certificate of Completion, Certificate of Excellence"
                      className="mt-1.5 rounded-xl text-sm border-slate-200"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Certificate Body Text (with Variables)
                      </Label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Click tags below to insert placeholders
                      </span>
                    </div>

                    {/* Variable Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      {[
                        { label: "{name}", desc: "Candidate Name" },
                        { label: "{date}", desc: "Issued Date" },
                        { label: "{test_title}", desc: "Test Title" },
                        { label: "{score}", desc: "Candidate Score" },
                        { label: "{total_marks}", desc: "Total Marks" },
                        { label: "{percentage}", desc: "Percentage" },
                        { label: "{certificate_id}", desc: "Certificate ID" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleInsertVariable(item.label.replace(/[{}]/g, ""))}
                          className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                          title={`Insert ${item.desc}`}
                        >
                          <span>{item.label}</span>
                          <span className="text-[10px] text-emerald-600">({item.desc})</span>
                        </button>
                      ))}
                    </div>

                    <Textarea
                      rows={3}
                      value={formData.certificate_template || ""}
                      onChange={(e) => setFormData({ ...formData, certificate_template: e.target.value })}
                      placeholder="has successfully completed the assessment for {test_title} with a score of {score}/{total_marks} ({percentage}) on {date}."
                      className="rounded-xl text-xs font-mono border-slate-200"
                    />

                    {/* Live Preview Box */}
                    <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Live Certificate Preview:
                      </span>
                      <p className="text-slate-700 italic font-serif leading-relaxed">
                        "{previewCertificateText}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate Whitelist Section */}
                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#0276D3]" />
                        <h4 className="text-sm font-bold text-slate-800">
                          Candidate Whitelist / Allowed Emails
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Only candidates entering these whitelisted emails will be permitted to attempt the exam.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setBulkCandidatesOpen(true)}
                        className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk Import
                      </Button>
                      <Badge
                        className={`text-xs font-bold ${
                          (formData.allowed_candidates as any[])?.length > 0
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {(formData.allowed_candidates as any[])?.length > 0
                          ? `${(formData.allowed_candidates as any[]).length} Invited Candidate(s)`
                          : "Open Access (No restriction)"}
                      </Badge>
                    </div>
                  </div>

                  {/* Add Single Candidate Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="sm:col-span-5">
                      <Input
                        placeholder="Candidate Name (e.g. Jane Doe)"
                        value={candidateNameInput}
                        onChange={(e) => setCandidateNameInput(e.target.value)}
                        className="bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <Input
                        type="email"
                        placeholder="Candidate Email (e.g. jane@example.com) *"
                        value={candidateEmailInput}
                        onChange={(e) => setCandidateEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCandidate();
                          }
                        }}
                        className="bg-white rounded-xl text-xs h-9"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        onClick={handleAddCandidate}
                        className="w-full bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl text-xs font-bold h-9"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </div>

                  {/* Candidates List Table */}
                  {(formData.allowed_candidates as AllowedCandidate[])?.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">#</th>
                            <th className="py-2.5 px-3">Candidate Name</th>
                            <th className="py-2.5 px-3">Email Address</th>
                            <th className="py-2.5 px-3 w-16 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {(formData.allowed_candidates as AllowedCandidate[]).map((cand, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-medium text-slate-800">{cand.name || "—"}</td>
                              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{cand.email}</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCandidate(idx)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Remove candidate"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p>
                        <strong>Open Access Mode:</strong> No candidates have been whitelisted yet. Any person who opens the public certification link and inputs their name and email will be able to take the exam. Add emails above to enforce access control.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setActiveTab("questions")}
              className="bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl text-xs font-bold px-6 py-2.5"
            >
              Continue to Questions &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* TAB 2: QUESTIONS BUILDER */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {/* Action & Tools Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">Add:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion("MCQ")}
                className="rounded-xl text-xs font-bold border-blue-200 text-[#0276D3] hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> MCQ
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion("TRUE_FALSE")}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> True / False
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion("SHORT_ANSWER")}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Short Answer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion("LONG_ANSWER")}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Long Answer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion("MATCH_THE_FOLLOWING")}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Match the Following
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddQuestion("CASE_STUDY")}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Case Study
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTemplateModalOpen(true)}
                className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[#0276D3]" /> Batch Add by Type
              </Button>
              <Button
                size="sm"
                onClick={() => setAiModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> ✨ AI Generate Questions
              </Button>
            </div>
          </div>

          {/* Questions Stack */}
          {questions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No questions added yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Use "+ MCQ", "Batch Add by Type", or the AI Generator to add questions.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button onClick={() => handleAddQuestion("MCQ")} className="bg-[#0276D3] text-white rounded-xl text-xs font-bold">
                  + Add First Question
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, qIndex) => {
                const pairs = q.question_type === "MATCH_THE_FOLLOWING" ? getParsedPairs(q) : [];

                return (
                  <Card key={q.id} className="rounded-2xl border border-slate-200 shadow-xs bg-white overflow-hidden">
                    {/* Question Card Header */}
                    <div className="bg-slate-50/70 border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#0276D3] text-white text-xs font-black">
                          {qIndex + 1}
                        </span>

                        {/* Interactive Type Selector */}
                        <Select
                          value={q.question_type}
                          onValueChange={(val: QuestionType) => handleChangeQuestionType(qIndex, val)}
                        >
                          <SelectTrigger className="h-7 text-xs font-bold bg-white border-slate-200 rounded-lg w-[165px]">
                            <SelectValue>{QUESTION_TYPE_LABELS[q.question_type]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MCQ">Multiple Choice</SelectItem>
                            <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                            <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                            <SelectItem value="LONG_ANSWER">Long Answer</SelectItem>
                            <SelectItem value="MATCH_THE_FOLLOWING">Match the Following</SelectItem>
                            <SelectItem value="CASE_STUDY">Case Study</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Marks:</span>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={q.marks}
                            onChange={(e) => updateQuestionField(qIndex, "marks", Number(e.target.value))}
                            className="w-12 text-center font-bold text-slate-800 bg-transparent outline-none"
                          />
                        </div>

                        {formData.has_negative_marking && (
                          <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200 text-xs text-red-700">
                            <span className="text-[10px] font-bold uppercase">Penalty:</span>
                            <input
                              type="number"
                              min={0}
                              step={0.25}
                              value={q.negative_marks}
                              onChange={(e) => updateQuestionField(qIndex, "negative_marks", Number(e.target.value))}
                              className="w-12 text-center font-bold bg-transparent outline-none"
                            />
                          </div>
                        )}

                        {/* Per-Question Auto-Check Toggle */}
                        <button
                          type="button"
                          onClick={() => updateQuestionField(qIndex, "is_autograded", !q.is_autograded)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            q.is_autograded
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100/70"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/60"
                          }`}
                          title={q.is_autograded ? "Auto-checked on submission" : "Requires teacher manual grading"}
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${q.is_autograded ? "text-emerald-600" : "text-slate-400"}`} />
                          <span>{q.is_autograded ? "Auto-Check: ON" : "Manual Review"}</span>
                        </button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMoveQuestion(qIndex, "up")}
                          disabled={qIndex === 0}
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMoveQuestion(qIndex, "down")}
                          disabled={qIndex === questions.length - 1}
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDuplicateQuestion(qIndex)}
                          className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-lg"
                          title="Duplicate Question"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteQuestion(qIndex)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-lg"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Question Card Body */}
                    <CardContent className="p-4 sm:p-5 space-y-4">
                      <div>
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                          {q.question_type === "CASE_STUDY" ? "Case Study Context / Passage & Question" : "Question Statement (LaTeX formulas e.g. $E = mc^2$ supported)"}
                        </Label>
                        <Textarea
                          value={q.question_text}
                          onChange={(e) => updateQuestionField(qIndex, "question_text", e.target.value)}
                          placeholder={q.question_type === "CASE_STUDY" ? "Enter the case background story, dataset, and question prompt..." : "Type question here..."}
                          rows={q.question_type === "CASE_STUDY" ? 4 : 2}
                          className="rounded-xl text-xs sm:text-sm border-slate-200"
                        />
                      </div>

                      {/* Question Media Attachment Section */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                            Question Attachment (Image / Diagram / PDF)
                          </Label>
                          {q.media_url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateQuestionField(qIndex, "media_url", null);
                                updateQuestionField(qIndex, "media_type", null);
                              }}
                              className="text-xs h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold"
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Remove Attachment
                            </Button>
                          )}
                        </div>

                        {!q.media_url ? (
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
                                    updateQuestionField(qIndex, "media_url", url);
                                    updateQuestionField(qIndex, "media_type", type);
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
                            {q.media_type === "image" && (
                              <img
                                src={q.media_url}
                                alt="Question attachment"
                                className="max-h-56 rounded-lg object-contain bg-white border border-slate-200 p-1"
                              />
                            )}
                            {q.media_type === "pdf" && (
                              <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200">
                                <FileText className="w-7 h-7 text-red-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-800 truncate">PDF Attachment</p>
                                  <a
                                    href={q.media_url}
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
                            {q.media_type !== "image" && q.media_type !== "pdf" && (
                              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200">
                                <FileText className="w-5 h-5 text-slate-500" />
                                <a
                                  href={q.media_url}
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

                      {/* Options Builder for MCQ */}
                      {q.question_type === "MCQ" && (
                        <div className="space-y-2.5 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Options (Click letter to mark Correct Answer. Click icon to attach Option Image)
                            </Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddOption(qIndex)}
                              className="text-[#0276D3] text-xs h-6 px-2 hover:bg-blue-50 font-bold"
                            >
                              + Add Option
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((opt, optIdx) => {
                              const optText = getOptionText(opt);
                              const optMedia = getOptionMediaUrl(opt);
                              const optionLetter = String.fromCharCode(65 + optIdx);
                              const isCorrect = (q.correct_answer === optText && optText.trim().length > 0) || (q.correct_answer === optionLetter);

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
                                        updateQuestionField(qIndex, "correct_answer", chosenAns);
                                      }}
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                                        isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                      }`}
                                      title="Mark as Correct Answer"
                                    >
                                      {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : optionLetter}
                                    </button>
                                    <Input
                                      value={optText}
                                      onChange={(e) => {
                                        updateOptionText(qIndex, optIdx, e.target.value);
                                        if (isCorrect) {
                                          updateQuestionField(qIndex, "correct_answer", e.target.value);
                                        }
                                      }}
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
                                            updateOptionMedia(qIndex, optIdx, res.url, "image");
                                            toast.success("Option image uploaded!", { id: toastId });
                                          } catch (err: any) {
                                            toast.error(err.message || "Upload failed", { id: toastId });
                                          }
                                        }}
                                      />
                                    </label>
                                    {q.options.length > 2 && (
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleRemoveOption(qIndex, optIdx)}
                                        className="h-6 w-6 text-slate-400 hover:text-red-600 rounded-md shrink-0"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                  {optMedia && (
                                    <div className="relative inline-block mt-2 ml-8">
                                      <img
                                        src={optMedia}
                                        alt={`Option ${optionLetter}`}
                                        className="max-h-24 rounded-lg border border-slate-200 bg-white p-0.5 object-contain"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updateOptionMedia(qIndex, optIdx, null, null)}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-xs"
                                        title="Remove option image"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* True/False Buttons */}
                      {q.question_type === "TRUE_FALSE" && (
                        <div>
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                            Correct Answer
                          </Label>
                          <div className="flex items-center gap-3">
                            {["True", "False"].map((tf) => {
                              const isSelected = q.correct_answer === tf;
                              return (
                                <button
                                  key={tf}
                                  type="button"
                                  onClick={() => updateQuestionField(qIndex, "correct_answer", tf)}
                                  className={`px-5 py-2 rounded-xl text-xs font-bold border transition-all ${
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
                      {q.question_type === "MATCH_THE_FOLLOWING" && (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Matching Pairs (Column A &rarr; Column B)
                            </Label>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => addMatchPair(qIndex)}
                              className="text-[#0276D3] text-xs h-6 px-2 font-bold hover:bg-blue-50"
                            >
                              + Add Pair
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {pairs.map((pair, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="w-5 h-5 rounded-md bg-[#0276D3]/10 text-[#0276D3] font-bold text-[10px] flex items-center justify-center">
                                  {pIdx + 1}
                                </span>
                                <Input
                                  value={pair.left}
                                  onChange={(e) => updateMatchPair(qIndex, pIdx, "left", e.target.value)}
                                  placeholder={`Column A Item ${pIdx + 1}`}
                                  className="text-xs h-8 rounded-lg bg-white border-slate-200 flex-1"
                                />
                                <span className="text-slate-400 font-bold">&rarr;</span>
                                <Input
                                  value={pair.right}
                                  onChange={(e) => updateMatchPair(qIndex, pIdx, "right", e.target.value)}
                                  placeholder={`Matching Column B ${pIdx + 1}`}
                                  className="text-xs h-8 rounded-lg bg-white border-slate-200 flex-1"
                                />
                                {pairs.length > 2 && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeMatchPair(qIndex, pIdx)}
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

                      {/* Short / Long Answer / Case Study Expected Solution */}
                      {(q.question_type === "SHORT_ANSWER" || q.question_type === "LONG_ANSWER" || q.question_type === "CASE_STUDY") && (
                        <div>
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                            Model Answer / Grading Rubric (For Teacher Review)
                          </Label>
                          <Textarea
                            value={q.correct_answer}
                            onChange={(e) => updateQuestionField(qIndex, "correct_answer", e.target.value)}
                            placeholder="Provide sample solution or key evaluation criteria..."
                            rows={2}
                            className="rounded-xl text-xs border-slate-200"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Bottom Add Bar */}
          {questions.length > 0 && (
            <div className="flex justify-center py-4 gap-3 flex-wrap">
              <Button
                onClick={() => handleAddQuestion("MCQ")}
                variant="outline"
                className="rounded-xl border-dashed border-2 border-slate-300 text-slate-600 hover:border-[#0276D3] hover:text-[#0276D3] px-5 text-xs font-bold"
              >
                <Plus className="w-4 h-4 mr-1.5" /> MCQ
              </Button>
              <Button
                onClick={() => handleAddQuestion("MATCH_THE_FOLLOWING")}
                variant="outline"
                className="rounded-xl border-dashed border-2 border-slate-300 text-slate-600 hover:border-[#0276D3] hover:text-[#0276D3] px-5 text-xs font-bold"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Match Following
              </Button>
              <Button
                onClick={() => setTemplateModalOpen(true)}
                variant="outline"
                className="rounded-xl border-dashed border-2 border-slate-300 text-slate-600 hover:border-[#0276D3] hover:text-[#0276D3] px-5 text-xs font-bold"
              >
                <Layers className="w-4 h-4 mr-1.5" /> Batch Add Questions
              </Button>
            </div>
          )}
        </div>
      )}

      {/* AI Question Generation Modal with Full 6 Question Breakdown */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> AI Question Generator
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure question counts and marks for each question type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chapter / Topic *</Label>
              <Input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. Newton's Laws of Motion, Organic Chemistry Basics"
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Difficulty Level</Label>
              <Select value={aiDifficulty} onValueChange={(v: any) => setAiDifficulty(v)}>
                <SelectTrigger className="mt-1 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">
                Question Type Breakdown
              </Label>
              <div className="space-y-2.5">
                {/* MCQ Row */}
                <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800 flex-1">Multiple Choice (MCQ)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={aiCounts.mcq}
                      onChange={(e) => setAiCounts({ ...aiCounts, mcq: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={aiCounts.mcqMarks}
                      onChange={(e) => setAiCounts({ ...aiCounts, mcqMarks: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                  </div>
                </div>

                {/* True/False Row */}
                <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800 flex-1">True / False</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={aiCounts.trueFalse}
                      onChange={(e) => setAiCounts({ ...aiCounts, trueFalse: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={aiCounts.trueFalseMarks}
                      onChange={(e) => setAiCounts({ ...aiCounts, trueFalseMarks: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Short Answer Row */}
                <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800 flex-1">Short Answer</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={aiCounts.shortAnswer}
                      onChange={(e) => setAiCounts({ ...aiCounts, shortAnswer: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                    <input
                      type="number"
                      min={1}
                      value={aiCounts.shortAnswerMarks}
                      onChange={(e) => setAiCounts({ ...aiCounts, shortAnswerMarks: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Long Answer Row */}
                <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800 flex-1">Long Answer</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={aiCounts.longAnswer}
                      onChange={(e) => setAiCounts({ ...aiCounts, longAnswer: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                    <input
                      type="number"
                      min={1}
                      value={aiCounts.longAnswerMarks}
                      onChange={(e) => setAiCounts({ ...aiCounts, longAnswerMarks: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Match the Following Row */}
                <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800 flex-1">Match the Following</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={aiCounts.matchFollowing}
                      onChange={(e) => setAiCounts({ ...aiCounts, matchFollowing: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                    <input
                      type="number"
                      min={1}
                      value={aiCounts.matchFollowingMarks}
                      onChange={(e) => setAiCounts({ ...aiCounts, matchFollowingMarks: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                  </div>
                </div>

                {/* Case Study Row */}
                <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-800 flex-1">Case Study</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                    <input
                      type="number"
                      min={0}
                      value={aiCounts.caseStudy}
                      onChange={(e) => setAiCounts({ ...aiCounts, caseStudy: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                    <input
                      type="number"
                      min={1}
                      value={aiCounts.caseStudyMarks}
                      onChange={(e) => setAiCounts({ ...aiCounts, caseStudyMarks: Number(e.target.value) })}
                      className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={aiReplaceExisting}
                  onChange={(e) => setAiReplaceExisting(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span>Replace existing / initial blank questions</span>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAiModalOpen(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAIQuestions}
              disabled={aiGenerating || !aiTopic.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold"
            >
              {aiGenerating ? "Generating..." : "Generate Questions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Template Modal with all 6 Types */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0276D3]" /> Batch Add Questions by Type
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Instantly create pre-formatted question templates in bulk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* MCQ Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-800 flex-1">Multiple Choice (MCQ)</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                <input
                  type="number"
                  min={0}
                  value={templateCounts.mcq}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, mcq: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
                <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={templateCounts.mcqMarks}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, mcqMarks: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* True/False Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-800 flex-1">True / False</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                <input
                  type="number"
                  min={0}
                  value={templateCounts.trueFalse}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, trueFalse: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
                <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={templateCounts.trueFalseMarks}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, trueFalseMarks: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* Short Answer Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-800 flex-1">Short Answer</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                <input
                  type="number"
                  min={0}
                  value={templateCounts.shortAnswer}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, shortAnswer: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
                <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                <input
                  type="number"
                  min={1}
                  value={templateCounts.shortAnswerMarks}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, shortAnswerMarks: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* Long Answer Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-800 flex-1">Long Answer</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                <input
                  type="number"
                  min={0}
                  value={templateCounts.longAnswer}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, longAnswer: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
                <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                <input
                  type="number"
                  min={1}
                  value={templateCounts.longAnswerMarks}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, longAnswerMarks: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* Match the Following Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-800 flex-1">Match the Following</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                <input
                  type="number"
                  min={0}
                  value={templateCounts.matchFollowing}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, matchFollowing: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
                <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                <input
                  type="number"
                  min={1}
                  value={templateCounts.matchFollowingMarks}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, matchFollowingMarks: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
              </div>
            </div>

            {/* Case Study Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
              <span className="font-bold text-slate-800 flex-1">Case Study</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">Qty:</span>
                <input
                  type="number"
                  min={0}
                  value={templateCounts.caseStudy}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, caseStudy: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
                <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                <input
                  type="number"
                  min={1}
                  value={templateCounts.caseStudyMarks}
                  onChange={(e) => setTemplateCounts({ ...templateCounts, caseStudyMarks: Number(e.target.value) })}
                  className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-xs"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={templateReplaceExisting}
                  onChange={(e) => setTemplateReplaceExisting(e.target.checked)}
                  className="rounded border-slate-300 text-[#0276D3] focus:ring-[#0276D3]"
                />
                <span>Replace existing / initial blank questions</span>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setTemplateModalOpen(false)} className="rounded-xl text-xs font-bold">
              Cancel
            </Button>
            <Button
              onClick={handleGenerateTemplate}
              className="bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl text-xs font-bold"
            >
              Add Template Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Candidates Modal */}
      <Dialog open={bulkCandidatesOpen} onOpenChange={setBulkCandidatesOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Bulk Import Allowed Candidates
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Paste names and emails (one per line). Formats: "Name, email@domain.com" or just "email@domain.com".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              rows={8}
              value={bulkCandidatesText}
              onChange={(e) => setBulkCandidatesText(e.target.value)}
              placeholder={`Alice Smith, alice@example.com\nBob Jones, bob@example.com\ncharlie@example.com`}
              className="font-mono text-xs rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkCandidatesOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkAddCandidates}
              className="bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl text-xs font-bold"
            >
              Import Candidates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <SuccessModal
        open={successOpen}
        onClose={() => {
          setSuccessOpen(false);
          navigate("/tests");
        }}
        title="Test Saved!"
        description={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        open={errorOpen}
        onClose={() => setErrorOpen(false)}
        title="Error"
        description={errorMessage}
      />
    </div>
  );
}
