import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Sparkles, Trash2, GripVertical, ChevronDown, ChevronUp, Check, FileText, Clock, Award } from "lucide-react";
import { testService, subjectService, testSeriesService } from "@/services/api";
import type { TestSeries } from "@/types";
import type {
  Subject,
  CreateTestData,
  CreateQuestionData,
  QuestionType,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuthStore } from "@/store/authStore";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import MediaUpload from "@/components/ui/MediaUpload";
import { usePageTitle } from "@/hooks/usePageTitle";

interface LocalQuestion {
  id: string; // local UUID
  question_type: QuestionType;
  question_text: string;
  options: string[];
  correct_answer: string;
  marks: number;
  mediaFile: File | null;
  mediaUrl: string | null;
  mediaType: string | null;
  optionMedia: { [index: number]: { file: File | null; url: string | null; type: string | null } };
  isCollapsed: boolean;
  isSaved: boolean; // true if already saved to backend
  backendId?: number;
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function CreateTestPage() {
  const navigate = useNavigate();
  const { testId: paramTestId } = useParams();
  const isEditing = !!paramTestId;
  const { user } = useAuthStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [testSeriesList, setTestSeriesList] = useState<TestSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingTest, setSavingTest] = useState(false);

  const [testId, setTestId] = useState<number | null>(
    paramTestId ? Number(paramTestId) : null
  );

  const [formData, setFormData] = useState<CreateTestData>({
    title: "",
    description: "",
    subject_id: null,
    test_series_id: null,
    total_marks: 0,
    passing_marks: 0,
    duration_minutes: 60,
    available_from: "",
    available_until: "",
    is_published: false,
    is_certification: false,
  });

  usePageTitle(isEditing ? (formData.title ? `Edit Test: ${formData.title}` : "Edit Test") : "Create Test");

  // AI Generation
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestions, setAiQuestions] = useState({
    mcq: 5,
    trueFalse: 3,
    shortAnswer: 2,
    longAnswer: 0,
  });
  const [showAiSection, setShowAiSection] = useState(false);

  // Local questions list
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);

  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ---- Load Subjects + Test Series ----
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const params: Record<string, any> = {};
        if (user?.role) {
          if (user.role === "TEACHER" || user.role === "STUDENT") {
            params.user_id = user.id;
            params.role = user.role;
          }
        }
        const response = await subjectService.getAll(params);
        setSubjects(response.data.data);
      } catch (error) {
        console.error("Error fetching subjects:", error);
      }
    };
    const fetchTestSeries = async () => {
      try {
        const response = await testSeriesService.getAll({ limit: 100 });
        setTestSeriesList(response.data.data);
      } catch (error) {
        console.error("Error fetching test series:", error);
      }
    };
    fetchSubjects();
    fetchTestSeries();
  }, [user]);

  // ---- Edit Mode: Load Existing Test ----
  useEffect(() => {
    if (!isEditing || !paramTestId) return;
    const loadTest = async () => {
      try {
        setLoading(true);
        const response = await testService.getById(Number(paramTestId));
        const test = response.data;
        setFormData({
          title: test.title,
          description: test.description ?? "",
          subject_id: test.subject_id ?? null,
          test_series_id: test.test_series_id ?? null,
          total_marks: test.total_marks,
          passing_marks: test.passing_marks,
          duration_minutes: test.duration_minutes,
          available_from: test.available_from.replace("Z", ""),
          available_until: test.available_until.replace("Z", ""),
          is_published: test.is_published,
          is_certification: test.is_certification ?? false,
        });
        setTestId(test.id);

        // Load existing questions
        if (test.questions && test.questions.length > 0) {
          const loadedQuestions: LocalQuestion[] = test.questions.map((q: any) => ({
            id: generateId(),
            question_type: q.question_type,
            question_text: q.question_text || "",
            options: Array.isArray(q.options) ? q.options.map((o: any) => typeof o === 'string' ? o : o?.text || '') : ["", "", "", ""],
            correct_answer: q.correct_answer || "",
            marks: q.marks,
            mediaFile: null,
            mediaUrl: q.media_url || null,
            mediaType: q.media_type || null,
            optionMedia: {},
            isCollapsed: true,
            isSaved: true,
            backendId: q.id,
          }));
          setQuestions(loadedQuestions);
        }
      } catch (error) {
        console.error("Error loading test:", error);
        setErrorMessage("Failed to load test details.");
        setErrorOpen(true);
      } finally {
        setLoading(false);
      }
    };
    loadTest();
  }, [isEditing, paramTestId]);

  // ---- Save Test (Step 1) ----
  const handleSaveTest = async () => {
    if (!formData.title.trim()) {
      setErrorMessage("Please enter a test title.");
      setErrorOpen(true);
      return;
    }
    try {
      setSavingTest(true);
      if (isEditing && paramTestId) {
        await testService.update(Number(paramTestId), formData);
        setSuccessMessage("Test details updated!");
      } else if (testId) {
        await testService.update(testId, formData);
        setSuccessMessage("Test details updated!");
      } else {
        const response = await testService.create(formData);
        setTestId(response.data.id);
        setSuccessMessage("Test created! Now add your questions below.");
      }
      setSuccessOpen(true);
    } catch (error) {
      console.error("Error saving test:", error);
      setErrorMessage("Failed to save test.");
      setErrorOpen(true);
    } finally {
      setSavingTest(false);
    }
  };

  // ---- Add New Question Locally ----
  const addQuestion = (type: QuestionType = "MCQ") => {
    const newQ: LocalQuestion = {
      id: generateId(),
      question_type: type,
      question_text: "",
      options: type === "MCQ" ? ["", "", "", ""] : [],
      correct_answer: "",
      marks: 2,
      mediaFile: null,
      mediaUrl: null,
      mediaType: null,
      optionMedia: {},
      isCollapsed: false,
      isSaved: false,
    };
    setQuestions(prev => [...prev, newQ]);
  };

  // ---- Update Question Locally ----
  const updateQuestion = (id: string, updates: Partial<LocalQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates, isSaved: false } : q));
  };

  // ---- Remove Question ----
  const removeQuestion = async (id: string) => {
    const q = questions.find(q => q.id === id);
    if (q?.backendId && testId) {
      try {
        await testService.deleteQuestion(q.backendId);
      } catch { }
    }
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // ---- Save Individual Question ----
  const saveQuestion = async (localQ: LocalQuestion) => {
    if (!testId) {
      setErrorMessage("Please save the test details first.");
      setErrorOpen(true);
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("question_type", localQ.question_type);
      fd.append("question_text", localQ.question_text);
      fd.append("correct_answer", localQ.correct_answer);
      fd.append("marks", localQ.marks.toString());

      if (localQ.options && localQ.question_type === "MCQ") {
        const optionsWithMedia = localQ.options.map((text, index) => {
          const media = localQ.optionMedia[index];
          return { text, media_url: media?.url || null, media_type: media?.type || null };
        });
        fd.append("options", JSON.stringify(optionsWithMedia));
        Object.keys(localQ.optionMedia).forEach((key) => {
          const index = parseInt(key);
          const media = localQ.optionMedia[index];
          if (media?.file) {
            fd.append(`option_media_${index}`, media.file);
          }
        });
      } else if (localQ.options) {
        fd.append("options", JSON.stringify(localQ.options));
      }

      if (localQ.mediaFile) {
        fd.append("media", localQ.mediaFile);
      } else if (localQ.mediaUrl) {
        fd.append("media_url", localQ.mediaUrl);
        if (localQ.mediaType) fd.append("media_type", localQ.mediaType);
      }

      const response = await testService.addQuestionWithMedia(testId, fd);

      // Mark as saved
      setQuestions(prev => prev.map(q => q.id === localQ.id ? { ...q, isSaved: true, isCollapsed: true, backendId: response.data?.id } : q));
      setSuccessMessage("Question saved!");
      setSuccessOpen(true);
    } catch (error) {
      console.error("Error adding question:", error);
      setErrorMessage("Failed to save question.");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // ---- AI Generate ----
  const handleGenerateQuestions = async () => {
    if (!testId) {
      setErrorMessage("Please save the test details first.");
      setErrorOpen(true);
      return;
    }
    if (!aiTopic.trim()) {
      setErrorMessage("Please enter a topic for AI generation.");
      setErrorOpen(true);
      return;
    }
    try {
      setLoading(true);
      await testService.generateQuestions(testId, {
        topic: aiTopic,
        numMCQ: aiQuestions.mcq,
        numTrueFalse: aiQuestions.trueFalse,
        numShortAnswer: aiQuestions.shortAnswer,
        numLongAnswer: aiQuestions.longAnswer,
      });
      setSuccessMessage("Questions generated! Refreshing...");
      setSuccessOpen(true);
      // Reload the test to get the AI-generated questions
      const response = await testService.getById(testId);
      if (response.data.questions) {
        const loadedQuestions: LocalQuestion[] = response.data.questions.map((q: any) => ({
          id: generateId(),
          question_type: q.question_type,
          question_text: q.question_text || "",
          options: Array.isArray(q.options) ? q.options.map((o: any) => typeof o === 'string' ? o : o?.text || '') : ["", "", "", ""],
          correct_answer: q.correct_answer || "",
          marks: q.marks,
          mediaFile: null,
          mediaUrl: q.media_url || null,
          mediaType: q.media_type || null,
          optionMedia: {},
          isCollapsed: true,
          isSaved: true,
          backendId: q.id,
        }));
        setQuestions(loadedQuestions);
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      setErrorMessage("Failed to generate questions.");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // ---- Finish & Navigate ----
  const handleFinish = () => {
    const unsaved = questions.filter(q => !q.isSaved);
    if (unsaved.length > 0) {
      setErrorMessage(`You have ${unsaved.length} unsaved question(s). Please save them before finishing.`);
      setErrorOpen(true);
      return;
    }
    navigate(`/tests/${testId ?? paramTestId}`);
  };

  const totalQuestionsMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20">
      {/* Modals */}
      <SuccessModal
        open={successOpen}
        title="Success"
        description={successMessage}
        showButtons
        okText="OK"
        onConfirm={() => setSuccessOpen(false)}
        onClose={() => setSuccessOpen(false)}
      />
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        showButtons
        okText="Close"
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tests")} className="text-gray-500 hover:text-saBlue">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {isEditing ? "Edit Test" : "Create New Test"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isEditing ? "Update test details and manage questions" : "Set up your test and add questions in one go"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {testId && (
            <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
              <Check className="w-3 h-3 mr-1" /> Test Saved
            </Badge>
          )}
          {testId && (
            <Button onClick={handleFinish} className="bg-saBlue hover:bg-saBlueDarkHover text-white">
              Finish & View Test
            </Button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {testId && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><FileText className="h-5 w-5 text-saBlue" /></div>
            <div>
              <p className="text-xs text-gray-500">Questions</p>
              <p className="text-xl font-bold text-gray-800">{questions.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><Award className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Marks</p>
              <p className="text-xl font-bold text-gray-800">{totalQuestionsMarks}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-xl font-bold text-gray-800">{formData.duration_minutes}m</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Award className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Pass Marks</p>
              <p className="text-xl font-bold text-gray-800">{formData.passing_marks}</p>
            </div>
          </div>
        </div>
      )}

      {/* ========== SECTION 1: Test Details ========== */}
      <Card className="shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-saBlue text-white text-sm font-bold">1</span>
            Test Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Title */}
          <div>
            <Label className="text-gray-700">Test Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Chapter 5 — Physics Mid-term"
              className="mt-1"
            />
          </div>

          {/* Subject & Test Series */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">Subject (optional)</Label>
              <Select
                value={formData.subject_id?.toString() || "none"}
                onValueChange={(v) => setFormData({ ...formData, subject_id: v === "none" ? null : Number(v) })}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">Test Series (optional)</Label>
              <Select
                value={formData.test_series_id?.toString() || "none"}
                onValueChange={(v) => setFormData({ ...formData, test_series_id: v === "none" ? null : Number(v) })}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a test series" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {testSeriesList.map(ts => <SelectItem key={ts.id} value={ts.id.toString()}>{ts.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-gray-700">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Brief description of this test..."
              className="mt-1"
            />
          </div>

          {/* Marks & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-700">Total Marks</Label>
              <Input type="number" value={formData.total_marks} onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-gray-700">Passing Marks</Label>
              <Input type="number" value={formData.passing_marks} onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label className="text-gray-700">Duration (minutes)</Label>
              <Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })} className="mt-1" />
            </div>
          </div>

          {/* Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700">Available From</Label>
              <Input type="datetime-local" value={formData.available_from} onChange={(e) => setFormData({ ...formData, available_from: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-gray-700">Available Until</Label>
              <Input type="datetime-local" value={formData.available_until} onChange={(e) => setFormData({ ...formData, available_until: e.target.value })} className="mt-1" />
            </div>
          </div>

          {/* Published */}
          <div className="flex flex-col sm:flex-row gap-6">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className={`relative w-10 h-6 rounded-full transition-colors ${formData.is_published ? 'bg-green-500' : 'bg-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="sr-only"
                />
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_published ? 'translate-x-[18px]' : 'translate-x-[0.5px]'}`} />
              </div>
              <span className="text-sm text-gray-700">Publish test immediately</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className={`relative w-10 h-6 rounded-full transition-colors ${formData.is_certification ? 'bg-saBlue' : 'bg-gray-300'}`}>
                <input
                  type="checkbox"
                  checked={formData.is_certification || false}
                  onChange={(e) => setFormData({ ...formData, is_certification: e.target.checked })}
                  className="sr-only"
                />
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.is_certification ? 'translate-x-[18px]' : 'translate-x-[0.5px]'}`} />
              </div>
              <span className="text-sm text-gray-700 font-medium flex items-center gap-1">
                <Award className="w-4 h-4 text-saBlue" /> Certification Test
              </span>
            </label>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveTest} disabled={savingTest} className="bg-saBlue hover:bg-saBlueDarkHover text-white px-8">
              {savingTest ? "Saving..." : testId ? "Update Details" : "Save & Continue"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========== SECTION 2: Questions ========== */}
      {testId && (
        <Card className="shadow-sm border border-gray-100 rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-saBlue text-white text-sm font-bold">2</span>
                Questions
                {questions.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{questions.length} added</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setShowAiSection(!showAiSection)} className="text-purple-700 border-purple-300 hover:bg-purple-50">
                  <Sparkles className="w-4 h-4 mr-1" /> AI Generate
                </Button>
                <Button size="sm" onClick={() => addQuestion("MCQ")} className="bg-saBlue hover:bg-saBlueDarkHover text-white">
                  <Plus className="w-4 h-4 mr-1" /> Add Question
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* AI Section (Collapsible) */}
            {showAiSection && (
              <div className="border border-purple-200 bg-purple-50/50 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">AI Question Generator</h3>
                </div>
                <div>
                  <Label className="text-gray-700">Topic *</Label>
                  <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. Photosynthesis, Quadratic Equations..." className="mt-1 bg-white" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">MCQ</Label>
                    <Input type="number" min="0" value={aiQuestions.mcq} onChange={(e) => setAiQuestions({ ...aiQuestions, mcq: Number(e.target.value) })} className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">True/False</Label>
                    <Input type="number" min="0" value={aiQuestions.trueFalse} onChange={(e) => setAiQuestions({ ...aiQuestions, trueFalse: Number(e.target.value) })} className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Short Answer</Label>
                    <Input type="number" min="0" value={aiQuestions.shortAnswer} onChange={(e) => setAiQuestions({ ...aiQuestions, shortAnswer: Number(e.target.value) })} className="bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Long Answer</Label>
                    <Input type="number" min="0" value={aiQuestions.longAnswer} onChange={(e) => setAiQuestions({ ...aiQuestions, longAnswer: Number(e.target.value) })} className="bg-white" />
                  </div>
                </div>
                <Button onClick={handleGenerateQuestions} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  {loading ? "Generating..." : "Generate Questions"}
                </Button>
              </div>
            )}

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-300 rounded-xl">
                <FileText className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No questions added yet</p>
                <p className="text-gray-400 text-sm mt-1">Click "Add Question" or use AI to generate questions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <QuestionEditor
                    key={q.id}
                    question={q}
                    index={index}
                    onUpdate={(updates) => updateQuestion(q.id, updates)}
                    onRemove={() => removeQuestion(q.id)}
                    onSave={() => saveQuestion(q)}
                    loading={loading}
                  />
                ))}
              </div>
            )}

            {/* Quick Add Buttons */}
            {questions.length > 0 && (
              <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500 self-center mr-2">Quick add:</span>
                <Button variant="outline" size="sm" onClick={() => addQuestion("MCQ")} className="text-xs">+ MCQ</Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion("TRUE_FALSE")} className="text-xs">+ True/False</Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion("SHORT_ANSWER")} className="text-xs">+ Short Answer</Button>
                <Button variant="outline" size="sm" onClick={() => addQuestion("LONG_ANSWER")} className="text-xs">+ Long Answer</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Actions */}
      {testId && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate("/tests")}>Cancel</Button>
          <Button onClick={handleFinish} className="bg-saBlue hover:bg-saBlueDarkHover text-white px-8">
            Finish & View Test
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Question Editor Component
// ============================================================
function QuestionEditor({
  question, index, onUpdate, onRemove, onSave, loading,
}: {
  question: LocalQuestion;
  index: number;
  onUpdate: (updates: Partial<LocalQuestion>) => void;
  onRemove: () => void;
  onSave: () => void;
  loading: boolean;
}) {
  const typeLabels: Record<QuestionType, string> = {
    MCQ: "Multiple Choice",
    TRUE_FALSE: "True / False",
    SHORT_ANSWER: "Short Answer",
    LONG_ANSWER: "Long Answer",
  };

  const typeColors: Record<QuestionType, string> = {
    MCQ: "bg-blue-100 text-blue-700",
    TRUE_FALSE: "bg-orange-100 text-orange-700",
    SHORT_ANSWER: "bg-green-100 text-green-700",
    LONG_ANSWER: "bg-purple-100 text-purple-700",
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${question.isSaved ? 'border-green-200 bg-green-50/20' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors"
        onClick={() => onUpdate({ isCollapsed: !question.isCollapsed })}
      >
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-bold text-gray-600">Q{index + 1}</span>
          <Badge className={`${typeColors[question.question_type]} text-xs border-none`}>
            {typeLabels[question.question_type]}
          </Badge>
          {question.question_text && (
            <span className="text-sm text-gray-500 truncate max-w-[200px] hidden sm:inline">
              {question.question_text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {question.isSaved && (
            <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
              <Check className="w-3 h-3 mr-1" /> Saved
            </Badge>
          )}
          <span className="text-xs text-gray-500">{question.marks} marks</span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {question.isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Body */}
      {!question.isCollapsed && (
        <div className="p-4 space-y-4 border-t border-gray-100">
          {/* Question Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-600">Question Type</Label>
              <Select value={question.question_type} onValueChange={(v) => onUpdate({ question_type: v as QuestionType, options: v === "MCQ" ? ["", "", "", ""] : [] })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MCQ">Multiple Choice</SelectItem>
                  <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                  <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                  <SelectItem value="LONG_ANSWER">Long Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Marks</Label>
              <Input type="number" min="1" value={question.marks} onChange={(e) => onUpdate({ marks: Number(e.target.value) })} className="mt-1" />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <Label className="text-xs text-gray-600">Question Text *</Label>
            <Textarea rows={2} value={question.question_text} onChange={(e) => onUpdate({ question_text: e.target.value })} className="mt-1" placeholder="Enter your question..." />
          </div>

          {/* Media Upload */}
          <MediaUpload
            label="Question Media (Optional)"
            value={question.mediaUrl}
            mediaType={question.mediaType}
            onChange={(file, url, type) => onUpdate({ mediaFile: file, mediaUrl: url, mediaType: type })}
          />

          {/* MCQ Options */}
          {question.question_type === "MCQ" && (
            <div className="space-y-3">
              <Label className="text-xs text-gray-600">Options</Label>
              {question.options.map((opt, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="mt-2 text-sm font-bold text-gray-500 w-6">{String.fromCharCode(65 + idx)}.</span>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...question.options];
                        newOpts[idx] = e.target.value;
                        onUpdate({ options: newOpts });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                    <MediaUpload
                      label={`Option ${String.fromCharCode(65 + idx)} Image (Optional)`}
                      value={question.optionMedia[idx]?.url}
                      mediaType={question.optionMedia[idx]?.type}
                      onChange={(file, url, type) => onUpdate({ optionMedia: { ...question.optionMedia, [idx]: { file, url, type } } })}
                      acceptTypes="image/*"
                      maxSize={5}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Correct Answer */}
          <div>
            <Label className="text-xs text-gray-600">Correct Answer *</Label>
            {question.question_type === "MCQ" ? (
              <Select value={question.correct_answer || "unset"} onValueChange={(v) => onUpdate({ correct_answer: v === "unset" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Select correct answer</SelectItem>
                  {question.options.map((opt, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    const val = opt || letter;
                    return <SelectItem key={idx} value={val}>{letter}. {opt || "(Image only)"}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            ) : question.question_type === "TRUE_FALSE" ? (
              <Select value={question.correct_answer || "unset"} onValueChange={(v) => onUpdate({ correct_answer: v === "unset" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select answer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Select answer</SelectItem>
                  <SelectItem value="True">True</SelectItem>
                  <SelectItem value="False">False</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Textarea rows={2} value={question.correct_answer} onChange={(e) => onUpdate({ correct_answer: e.target.value })} className="mt-1" placeholder="Sample/expected answer..." />
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button onClick={onSave} disabled={loading || question.isSaved} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-1" />
              {question.isSaved ? "Saved" : "Save Question"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
