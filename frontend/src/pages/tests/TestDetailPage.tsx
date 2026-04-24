import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { testService, testAttemptService } from "@/services/api";
import type { Test, Question, UpdateQuestionData, QuestionType } from "@/types";
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
import { useAuthStore } from "@/store/authStore";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import ConfirmModal from "@/components/ui/confirmationModal";
import MediaUpload from "@/components/ui/MediaUpload";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TestDetailPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  usePageTitle(test ? `Test Details: ${test.title}` : "Test Details");
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

  const fetchTest = useCallback(async () => {
    if (!testId) return;
    try {
      setLoading(true);
      const response = await testService.getById(Number(testId));
      setTest(response.data);
      if (isStudent) {
        try {
          const attemptsResponse = await testAttemptService.getMyAttempts({ test_id: Number(testId) });
          setHasAttempted(attemptsResponse.data && attemptsResponse.data.length > 0);
        } catch { setHasAttempted(false); }
      }
    } catch (error: unknown) {
      console.error("Error fetching test:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to load test");
      setErrorOpen(true);
      navigate("/tests");
    } finally {
      setLoading(false);
    }
  }, [testId, navigate, isStudent]);

  useEffect(() => { fetchTest(); }, [fetchTest]);

  const handleStartTest = async () => {
    if (!testId) return;
    try {
      const response = await testAttemptService.startAttempt(Number(testId));
      navigate(`/test-attempts/${response.data.id}`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start test");
      setErrorOpen(true);
    }
  };

  const handlePracticeTest = async () => {
    if (!testId) return;
    try {
      const response = await testAttemptService.startPracticeAttempt(Number(testId));
      navigate(`/test-attempts/${response.data.id}`);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to start practice");
      setErrorOpen(true);
    }
  };

  const handleTogglePublish = () => {
    if (!test) return;
    const action = test.is_published ? "unpublish" : "publish";
    setConfirmMessage(`Are you sure you want to ${action} "${test.title}"?`);
    setConfirmAction(() => async () => {
      try {
        await testService.update(test.id, { is_published: !test.is_published });
        setSuccessMessage(`Test "${test.title}" ${action}ed successfully!`);
        setSuccessOpen(true);
        fetchTest();
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : `Failed to ${action} test`);
        setErrorOpen(true);
      } finally { setConfirmOpen(false); }
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
      } finally { setConfirmOpen(false); }
    });
    setConfirmOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setEditFormData({
      question_text: question.question_text,
      options: question.options || ["", "", "", ""],
      correct_answer: question.correct_answer || "",
      marks: question.marks,
      negative_marks: question.negative_marks || 0,
    });
    setEditQuestionMediaFile(null);
    setEditQuestionMediaUrl(question.media_url || null);
    setEditQuestionMediaType(question.media_type || null);
    setRemoveQuestionMedia(false);
    setRemoveOptionMedia({});
    setEditModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    try {
      setLoading(true);
      const updateData = {
        question_type: editingQuestion.question_type,
        ...editFormData,
      };
      if (editQuestionMediaFile || removeQuestionMedia) {
        const formData = new FormData();
        formData.append("question_type", editingQuestion.question_type);
        formData.append("question_text", editFormData.question_text || "");
        formData.append("correct_answer", editFormData.correct_answer || "");
        formData.append("marks", (editFormData.marks || 2).toString());
        formData.append("negative_marks", (editFormData.negative_marks || 0).toString());
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
    } finally { setLoading(false); }
  };

  const isCertificationTest = (test: Test) => {
    return test.is_certification ||
      test.title.includes('[CERTIFICATION]') ||
      test.description?.includes('[CERTIFICATION]');
  };

  const handleCopyLink = () => {
    if (!test) return;
    const link = `${window.location.origin}/certification/${test.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public test link copied to clipboard");
  };

  const getTestStatus = () => {
    if (!test) return { label: "Unknown", color: "bg-gray-400", canAttempt: false, canPractice: false };
    const isTestSeriesTest = !!test.test_series_id;
    if (!test.is_published) return { label: "Draft", color: "bg-gray-500", canAttempt: false, canPractice: false };
    if (hasAttempted) return { label: "Attempted", color: "bg-purple-500", canAttempt: false, canPractice: true };
    if (isTestSeriesTest) return { label: "Available", color: "bg-green-500", canAttempt: true, canPractice: false };
    const now = new Date();
    const availableFrom = new Date(test.available_from);
    const availableUntil = new Date(test.available_until);
    if (now < availableFrom) return { label: "Upcoming", color: "bg-blue-500", canAttempt: false, canPractice: false };
    if (now > availableUntil) return { label: "Closed", color: "bg-red-500", canAttempt: false, canPractice: true };
    return { label: "Active", color: "bg-green-500", canAttempt: true, canPractice: false };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading test...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500">Test not found</p>
        <Button variant="link" className="text-saBlue mt-2" onClick={() => navigate("/tests")}>Back to Tests</Button>
      </div>
    );
  }

  const status = getTestStatus();

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20">
      {/* Modals */}
      <SuccessModal open={successOpen} title={test.title} description={successMessage} showButtons okText="OK" onConfirm={() => setSuccessOpen(false)} onClose={() => setSuccessOpen(false)} />
      <ErrorModal open={errorOpen} title={test?.title || "Error"} description={errorMessage} showButtons okText="Close" onConfirm={() => setErrorOpen(false)} onClose={() => setErrorOpen(false)} />
      <ConfirmModal open={confirmOpen} title={test?.title || "Confirm Action"} description={confirmMessage} onConfirm={confirmAction} onClose={() => setConfirmOpen(false)} confirmText="Yes" cancelText="No" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tests")} className="text-gray-500 hover:text-saBlue">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{test.title}</h1>
              <Badge className={`${status.color} text-white border-none`}>{status.label}</Badge>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              {test.subject?.name || test.test_series?.title || "General Test"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isTeacherOrAdmin && (
            <>
              <Button
                variant={test.is_published ? "outline" : "default"}
                onClick={handleTogglePublish}
                className={!test.is_published ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                size="sm"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {test.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/tests/${testId}/edit`)}>
                <Edit className="w-4 h-4 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/tests/${testId}/attempts`)}>
                <Users className="w-4 h-4 mr-1" /> Attempts
              </Button>
            </>
          )}
          {isTeacherOrAdmin && (isCertificationTest(test) || test.title.includes('[CERTIFICATION]')) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              <Copy className="w-4 h-4 mr-1" /> Copy Link
            </Button>
          )}
          {isStudent && status.canAttempt && (
            <Button onClick={handleStartTest} className="bg-saBlue hover:bg-saBlueDarkHover text-white" size="sm">
              <Play className="w-4 h-4 mr-1" /> Start Test
            </Button>
          )}
          {isStudent && status.canPractice && (
            <Button variant="outline" onClick={handlePracticeTest} size="sm" className="border-saBlue text-saBlue hover:bg-blue-50">
              <BookOpen className="w-4 h-4 mr-1" /> Practice
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><FileText className="h-5 w-5 text-saBlue" /></div>
          <div>
            <p className="text-xs text-gray-500">Questions</p>
            <p className="text-xl font-bold text-gray-800">{test._count?.questions || 0}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Duration</p>
            <p className="text-xl font-bold text-gray-800">{test.duration_minutes}m</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><Award className="h-5 w-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Marks</p>
            <p className="text-xl font-bold text-gray-800">{test.total_marks}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg"><CheckCircle className="h-5 w-5 text-purple-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Pass Marks</p>
            <p className="text-xl font-bold text-gray-800">{test.passing_marks}</p>
          </div>
        </div>
      </div>

      {/* Test Info */}
      <Card className="shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-lg text-gray-800">Test Details</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Description</p>
            <p className="text-gray-700">{test.description || "No description provided."}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Available From</p>
                <p className="font-medium text-gray-800">{new Date(test.available_from).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Available Until</p>
                <p className="font-medium text-gray-800">{new Date(test.available_until).toLocaleString()}</p>
              </div>
            </div>
          </div>
          {isTeacherOrAdmin && (
            <div className="flex items-center gap-2 text-sm text-gray-500 pt-2 border-t border-gray-100">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{test._count?.test_attempts || 0} students have attempted this test</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions */}
      {isTeacherOrAdmin && test.questions && test.questions.length > 0 && (
        <Card className="shadow-sm border border-gray-100 rounded-xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-800">
                Questions <Badge variant="secondary" className="ml-2">{test.questions.length}</Badge>
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate(`/tests/${testId}/edit`)}>
                <Edit className="w-4 h-4 mr-1" /> Add/Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {test.questions.map((question: Question, index: number) => {
                const typeColors: Record<string, string> = {
                  MCQ: "bg-blue-100 text-blue-700",
                  TRUE_FALSE: "bg-orange-100 text-orange-700",
                  SHORT_ANSWER: "bg-green-100 text-green-700",
                  LONG_ANSWER: "bg-purple-100 text-purple-700",
                };
                return (
                  <div key={question.id} className="p-5 hover:bg-gray-50/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-bold text-gray-600 flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {question.question_text || <span className="text-gray-400 italic">(No text)</span>}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`${typeColors[question.question_type] || 'bg-gray-100'} text-xs border-none`}>
                              {question.question_type.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-gray-400">{question.marks} marks</span>
                            {test.has_negative_marking && (
                              <span className="text-xs text-red-500">-{question.negative_marks || 0} on wrong</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-saBlue hover:text-saBlue hover:bg-blue-50" onClick={() => handleEditQuestion(question)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteQuestion(question.id, question.question_text || `Question ${index + 1}`)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Media */}
                    {question.media_url && (
                      <div className="ml-10 mt-3 border rounded-lg p-2 bg-gray-50 max-w-md">
                        {question.media_type === 'image' && <img src={question.media_url} alt="Question" className="max-w-full max-h-48 rounded" />}
                        {question.media_type === 'pdf' && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-6 h-6 text-red-500" />
                            <a href={question.media_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View PDF</a>
                          </div>
                        )}
                        {question.media_type === 'video' && <video src={question.media_url} controls className="max-w-full max-h-48 rounded" />}
                      </div>
                    )}

                    {/* MCQ Options */}
                    {question.question_type === "MCQ" && question.options && (
                      <div className="ml-10 mt-3 space-y-1.5">
                        {(question.options as any[]).map((option: any, optIndex: number) => {
                          const optionText = typeof option === 'string' ? option : option?.text || '';
                          const optionMediaUrl = typeof option === 'object' && option !== null ? option.media_url : null;
                          const optionMediaType = typeof option === 'object' && option !== null ? option.media_type : null;
                          const optionLetter = String.fromCharCode(65 + optIndex);
                          const isCorrect = optionText === question.correct_answer || optionLetter === question.correct_answer || (optionText === '' && question.correct_answer === optionLetter);
                          return (
                            <div key={optIndex} className={`p-2 rounded-lg text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
                              <span className={`${isCorrect ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                                {optionLetter}. {optionText} {isCorrect && <CheckCircle className="inline w-3.5 h-3.5 ml-1 text-green-500" />}
                              </span>
                              {optionMediaUrl && optionMediaType === 'image' && (
                                <img src={optionMediaUrl} alt={`Option ${optionLetter}`} className="mt-1 ml-4 max-w-xs max-h-24 rounded border" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.question_type === "TRUE_FALSE" && (
                      <p className="ml-10 mt-2 text-sm text-green-600 font-medium bg-green-50 inline-block px-3 py-1 rounded-lg">
                        Answer: {question.correct_answer}
                      </p>
                    )}
                    {(question.question_type === "SHORT_ANSWER" || question.question_type === "LONG_ANSWER") && (
                      <p className="ml-10 mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="text-xs text-gray-400 uppercase tracking-wider block mb-1">Sample Answer</span>
                        {question.correct_answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Question Modal */}
      {editModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Edit Question</h2>
                <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Type */}
              <div>
                <Label className="text-gray-700">Question Type</Label>
                <Select value={editingQuestion.question_type} onValueChange={(value) => {
                  setEditingQuestion({ ...editingQuestion, question_type: value as QuestionType });
                  // Reset options if switching away from MCQ
                  if (value !== "MCQ") {
                    setEditFormData({ ...editFormData, options: [] });
                  } else if (!editFormData.options || editFormData.options.length === 0) {
                    setEditFormData({ ...editFormData, options: ["", "", "", ""] });
                  }
                }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">Multiple Choice</SelectItem>
                    <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                    <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                    <SelectItem value="LONG_ANSWER">Long Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text */}
              <div>
                <Label className="text-gray-700">Question Text *</Label>
                <Textarea value={editFormData.question_text} onChange={(e) => setEditFormData({ ...editFormData, question_text: e.target.value })} rows={3} className="mt-1" />
              </div>

              {/* Media */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-700">Media (Optional)</Label>
                  {(editQuestionMediaUrl || editingQuestion.media_url) && !removeQuestionMedia && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { setRemoveQuestionMedia(true); setEditQuestionMediaFile(null); setEditQuestionMediaUrl(null); setEditQuestionMediaType(null); }} className="text-red-600">
                      Remove
                    </Button>
                  )}
                </div>
                {!removeQuestionMedia && (
                  <MediaUpload label="" value={editQuestionMediaUrl} mediaType={editQuestionMediaType} onChange={(file, url, type) => { setEditQuestionMediaFile(file); setEditQuestionMediaUrl(url); setEditQuestionMediaType(type); setRemoveQuestionMedia(false); }} />
                )}
                {removeQuestionMedia && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">Media will be removed on save.</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { setRemoveQuestionMedia(false); setEditQuestionMediaUrl(editingQuestion.media_url || null); setEditQuestionMediaType(editingQuestion.media_type || null); }}>
                      Undo
                    </Button>
                  </div>
                )}
              </div>

              {/* MCQ Options */}
              {editingQuestion.question_type === "MCQ" && (
                <div>
                  <Label className="text-gray-700">Options *</Label>
                  <div className="space-y-3 mt-2">
                    {editFormData.options?.map((option: any, idx) => {
                      const optionText = typeof option === 'string' ? option : option?.text || '';
                      const optionMediaUrl = typeof option === 'object' && option !== null ? option.media_url : null;
                      const optionMediaType = typeof option === 'object' && option !== null ? option.media_type : null;
                      const hasMedia = optionMediaUrl && !removeOptionMedia[idx];
                      return (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-gray-500 w-6">{String.fromCharCode(65 + idx)}.</span>
                            <Input
                              value={optionText}
                              onChange={(e) => {
                                const newOptions = [...(editFormData.options || [])];
                                if (typeof option === 'object' && option !== null) { newOptions[idx] = { ...option, text: e.target.value }; }
                                else { newOptions[idx] = e.target.value; }
                                setEditFormData({ ...editFormData, options: newOptions });
                              }}
                              placeholder="Option text"
                              className="flex-1"
                            />
                            {hasMedia && (
                              <Button type="button" variant="outline" size="sm" onClick={() => {
                                setRemoveOptionMedia({ ...removeOptionMedia, [idx]: true });
                                const newOpts = [...(editFormData.options || [])];
                                if (typeof option === 'object' && option !== null) { newOpts[idx] = { ...option, media_url: null, media_type: null }; setEditFormData({ ...editFormData, options: newOpts }); }
                              }} className="text-red-600 text-xs">Remove Image</Button>
                            )}
                          </div>
                          {hasMedia && optionMediaType === 'image' && <img src={optionMediaUrl} alt={`Option ${String.fromCharCode(65 + idx)}`} className="ml-8 max-w-xs max-h-24 rounded border" />}
                          {removeOptionMedia[idx] && <p className="ml-8 text-xs text-red-500 mt-1">Image will be removed on save.</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Correct Answer */}
              <div>
                <Label className="text-gray-700">
                  {editingQuestion.question_type === "MCQ" ? "Correct Answer *" : editingQuestion.question_type === "TRUE_FALSE" ? "Correct Answer *" : "Sample Answer"}
                </Label>
                {editingQuestion.question_type === "MCQ" ? (
                  <Select value={editFormData.correct_answer || "unset"} onValueChange={(v) => setEditFormData({ ...editFormData, correct_answer: v === "unset" ? "" : v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Select correct answer</SelectItem>
                      {editFormData.options?.map((option: any, idx) => {
                        const optionText = typeof option === 'string' ? option : option?.text || '';
                        const letter = String.fromCharCode(65 + idx);
                        return <SelectItem key={idx} value={optionText || letter}>{letter}. {optionText || '(Image only)'}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                ) : editingQuestion.question_type === "TRUE_FALSE" ? (
                  <Select value={editFormData.correct_answer || "unset"} onValueChange={(v) => setEditFormData({ ...editFormData, correct_answer: v === "unset" ? "" : v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select answer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Select answer</SelectItem>
                      <SelectItem value="True">True</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Textarea value={editFormData.correct_answer} onChange={(e) => setEditFormData({ ...editFormData, correct_answer: e.target.value })} rows={3} className="mt-1" />
                )}
              </div>

              {/* Marks */}
              <div className={`grid gap-4 ${test.has_negative_marking ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <Label className="text-gray-700">Marks *</Label>
                  <Input type="number" min="1" value={editFormData.marks} onChange={(e) => setEditFormData({ ...editFormData, marks: Number(e.target.value) })} className="mt-1" />
                </div>
                {test.has_negative_marking && (
                  <div>
                    <Label className="text-red-600">Negative Marks (wrong answer)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={editFormData.negative_marks || 0}
                      onChange={(e) => setEditFormData({ ...editFormData, negative_marks: Number(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5 rounded-b-xl flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={loading}>Cancel</Button>
              <Button onClick={handleSaveQuestion} disabled={loading} className="bg-saBlue hover:bg-saBlueDarkHover text-white">
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
