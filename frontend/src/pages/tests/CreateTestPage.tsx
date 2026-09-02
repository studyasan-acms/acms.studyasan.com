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
} from "lucide-react";
import { testService, subjectService, testSeriesService } from "@/services/api";
import type { TestSeries, Subject, CreateTestData, QuestionType, TestType } from "@/types";
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

interface LocalQuestion {
  id: string; // client UUID
  backendId?: number;
  question_type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: string;
  marks: number;
  negative_marks: number;
}

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
  }, [paramTestId, isEditing]);

  const fetchMetadata = async () => {
    try {
      const [subjectsRes, testSeriesRes] = await Promise.all([
        subjectService.getAll({ limit: 100 }),
        testSeriesService.getAll({ limit: 100 }),
      ]);
      setSubjects(subjectsRes.data?.data || []);
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
      });

      if (t.questions && t.questions.length > 0) {
        setQuestions(
          t.questions.map((q) => ({
            id: generateId(),
            backendId: q.id,
            question_type: q.question_type,
            question_text: q.question_text || "",
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : (q.question_type === "MCQ" ? ["", "", "", ""] : []),
            correct_answer: q.correct_answer || "",
            marks: q.marks || 2,
            negative_marks: q.negative_marks || 0,
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

    const newQ: LocalQuestion = {
      id: generateId(),
      question_type: type,
      question_text: "",
      options: defaultOpts,
      correct_answer: defaultAns,
      marks: defaultMarks,
      negative_marks: formData.has_negative_marking ? 0.5 : 0,
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

      copy[qIndex] = {
        ...current,
        question_type: newType,
        options,
        correct_answer,
        marks,
      };
      return copy;
    });
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const newOpts = [...copy[qIndex].options];
      newOpts[optIndex] = text;
      copy[qIndex] = { ...copy[qIndex], options: newOpts };
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
      const generated: LocalQuestion[] = [];
      let qNumber = 1;

      // Generate MCQs
      for (let i = 1; i <= (aiCounts.mcq || 0); i++) {
        generated.push({
          id: generateId(),
          question_type: "MCQ",
          question_text: `[MCQ Q${qNumber++}] Concept check on ${aiTopic}: What is the primary characteristic?`,
          options: [
            `Standard property under normal conditions`,
            `Key fundamental definition of ${aiTopic}`,
            `Inverse secondary factor`,
            `Edge-case observation`,
          ],
          correct_answer: `Key fundamental definition of ${aiTopic}`,
          marks: aiCounts.mcqMarks || 2,
          negative_marks: formData.has_negative_marking ? 0.5 : 0,
        });
      }

      // Generate True/False
      for (let i = 1; i <= (aiCounts.trueFalse || 0); i++) {
        generated.push({
          id: generateId(),
          question_type: "TRUE_FALSE",
          question_text: `[True/False Q${qNumber++}] Statement: ${aiTopic} is inversely proportional to external system friction.`,
          options: ["True", "False"],
          correct_answer: "True",
          marks: aiCounts.trueFalseMarks || 1,
          negative_marks: formData.has_negative_marking ? 0.25 : 0,
        });
      }

      // Generate Short Answers
      for (let i = 1; i <= (aiCounts.shortAnswer || 0); i++) {
        generated.push({
          id: generateId(),
          question_type: "SHORT_ANSWER",
          question_text: `[Short Answer Q${qNumber++}] Explain the main working mechanism of ${aiTopic} in 2-3 sentences.`,
          options: [],
          correct_answer: `Key points: Definition, working mechanism, and application of ${aiTopic}.`,
          marks: aiCounts.shortAnswerMarks || 2,
          negative_marks: 0,
        });
      }

      // Generate Long Answers
      for (let i = 1; i <= (aiCounts.longAnswer || 0); i++) {
        generated.push({
          id: generateId(),
          question_type: "LONG_ANSWER",
          question_text: `[Long Answer Q${qNumber++}] Provide a comprehensive analysis and derivation related to ${aiTopic}.`,
          options: [],
          correct_answer: `Comprehensive evaluation criteria: Definition, complete derivation, diagram, and practical examples.`,
          marks: aiCounts.longAnswerMarks || 5,
          negative_marks: 0,
        });
      }

      // Generate Match the Following
      for (let i = 1; i <= (aiCounts.matchFollowing || 0); i++) {
        const pairs: MatchPair[] = [
          { left: `${aiTopic} Phase A`, right: `Characteristic 1` },
          { left: `${aiTopic} Phase B`, right: `Characteristic 2` },
          { left: `${aiTopic} Phase C`, right: `Characteristic 3` },
        ];
        generated.push({
          id: generateId(),
          question_type: "MATCH_THE_FOLLOWING",
          question_text: `[Match Following Q${qNumber++}] Match each aspect of ${aiTopic} in Column A with its correct property in Column B.`,
          options: pairs.map((p) => JSON.stringify(p)),
          correct_answer: JSON.stringify(pairs),
          marks: aiCounts.matchFollowingMarks || 4,
          negative_marks: 0,
        });
      }

      // Generate Case Study
      for (let i = 1; i <= (aiCounts.caseStudy || 0); i++) {
        generated.push({
          id: generateId(),
          question_type: "CASE_STUDY",
          question_text: `[Case Study Q${qNumber++}] Case Scenario: A researcher examines a physical experiment involving ${aiTopic}. Under given environmental variations, measurable throughput decreases by 15%. \n\nQuestion: Analyze the contributing factors and formulate corrective measures.`,
          options: [],
          correct_answer: `Evaluation points: Correct identification of bottleneck, theoretical formula validation, and recommended remediation.`,
          marks: aiCounts.caseStudyMarks || 5,
          negative_marks: 0,
        });
      }

      setQuestions((prev) => [...prev, ...generated]);
      setAiModalOpen(false);
      setAiTopic("");
      toast.success(`Generated ${generated.length} questions across all specified types!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions");
    } finally {
      setAiGenerating(false);
    }
  };

  // Batch Template Generator Handler
  const handleGenerateTemplate = () => {
    const generated: LocalQuestion[] = [];
    let qNumber = 1;

    for (let i = 1; i <= (templateCounts.mcq || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "MCQ",
        question_text: `Question ${qNumber++} (Single Choice): `,
        options: ["", "", "", ""],
        correct_answer: "",
        marks: templateCounts.mcqMarks || 2,
        negative_marks: formData.has_negative_marking ? 0.5 : 0,
      });
    }

    for (let i = 1; i <= (templateCounts.trueFalse || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "TRUE_FALSE",
        question_text: `Question ${qNumber++} (True / False): `,
        options: ["True", "False"],
        correct_answer: "True",
        marks: templateCounts.trueFalseMarks || 1,
        negative_marks: formData.has_negative_marking ? 0.25 : 0,
      });
    }

    for (let i = 1; i <= (templateCounts.shortAnswer || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "SHORT_ANSWER",
        question_text: `Question ${qNumber++} (Short Answer): `,
        options: [],
        correct_answer: "",
        marks: templateCounts.shortAnswerMarks || 2,
        negative_marks: 0,
      });
    }

    for (let i = 1; i <= (templateCounts.longAnswer || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "LONG_ANSWER",
        question_text: `Question ${qNumber++} (Long Answer / Essay): `,
        options: [],
        correct_answer: "",
        marks: templateCounts.longAnswerMarks || 5,
        negative_marks: 0,
      });
    }

    for (let i = 1; i <= (templateCounts.matchFollowing || 0); i++) {
      const pairs: MatchPair[] = [
        { left: "Item 1", right: "Match A" },
        { left: "Item 2", right: "Match B" },
        { left: "Item 3", right: "Match C" },
      ];
      generated.push({
        id: generateId(),
        question_type: "MATCH_THE_FOLLOWING",
        question_text: `Question ${qNumber++} (Match the Following): Match Column A with Column B`,
        options: pairs.map((p) => JSON.stringify(p)),
        correct_answer: JSON.stringify(pairs),
        marks: templateCounts.matchFollowingMarks || 4,
        negative_marks: 0,
      });
    }

    for (let i = 1; i <= (templateCounts.caseStudy || 0); i++) {
      generated.push({
        id: generateId(),
        question_type: "CASE_STUDY",
        question_text: `Question ${qNumber++} (Case Study Context & Questions): `,
        options: [],
        correct_answer: "",
        marks: templateCounts.caseStudyMarks || 5,
        negative_marks: 0,
      });
    }

    setQuestions((prev) => [...prev, ...generated]);
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

    try {
      setSaving(true);
      const totalMarksToSave = calculatedTotalMarks > 0 ? calculatedTotalMarks : formData.total_marks;

      const payload: CreateTestData = {
        ...formData,
        total_marks: totalMarksToSave,
        is_published: publishImmediate || formData.is_published,
        available_from: formData.available_from ? new Date(formData.available_from).toISOString() : new Date().toISOString(),
        available_until: formData.available_until
          ? new Date(formData.available_until).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString(),
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
          options: q.options,
          correct_answer: q.correct_answer || (q.options.length > 0 ? q.options[0] : ""),
          marks: Number(q.marks) || 1,
          negative_marks: Number(q.negative_marks) || 0,
        };

        if (q.backendId) {
          return testService.updateQuestion(q.backendId, qData);
        } else {
          return testService.addQuestion(savedTestId, qData as any);
        }
      });

      await Promise.all(questionPromises);

      setSuccessMessage(isEditing ? "Test updated successfully!" : "Test created and published successfully!");
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
                    {calculatedTotalMarks > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, total_marks: calculatedTotalMarks }))}
                        className="text-[10px] text-[#0276D3] font-bold hover:underline"
                        title="Click to sync total marks with questions"
                      >
                        Sync ({calculatedTotalMarks})
                      </button>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={formData.total_marks}
                    onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })}
                    className="mt-1 rounded-xl text-sm border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {calculatedTotalMarks > 0 ? `From questions: ${calculatedTotalMarks} marks` : "Test full marks"}
                  </p>
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
                    checked={formData.is_autograded}
                    onChange={(e) => setFormData({ ...formData, is_autograded: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0276D3]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">Instant Auto-grading</span>
                    <p className="text-[11px] text-slate-500">Auto-calculate student marks immediately upon submit.</p>
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

                      {/* Options Builder for MCQ */}
                      {q.question_type === "MCQ" && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Options (Click the option letter to mark as Correct Answer)
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {q.options.map((optText, optIdx) => {
                              const isCorrect = q.correct_answer === optText && optText.trim().length > 0;
                              const optionLetter = String.fromCharCode(65 + optIdx);

                              return (
                                <div
                                  key={optIdx}
                                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                    isCorrect ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300" : "bg-slate-50/50 border-slate-200"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => updateQuestionField(qIndex, "correct_answer", optText)}
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
                                    className="border-none shadow-none text-xs bg-transparent focus-visible:ring-0 p-0 h-8"
                                  />
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
