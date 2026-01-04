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
} from "lucide-react";
import { testService, testAttemptService } from "@/services/api";
import type { Test, Question, UpdateQuestionData, QuestionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [hasAttempted, setHasAttempted] = useState(false); // Track if student already attempted
  const { user } = useAuthStore();

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";

  // Modals state
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => { });

  // Edit question state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateQuestionData>({
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    marks: 2,
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

      // Check if student already attempted this test
      if (isStudent) {
        try {
          const attemptsResponse = await testAttemptService.getMyAttempts({ test_id: Number(testId) });
          setHasAttempted(attemptsResponse.data && attemptsResponse.data.length > 0);
        } catch {
          setHasAttempted(false);
        }
      }
    } catch (error: unknown) {
      console.error("Error fetching test:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load test"
      );
      setErrorOpen(true);
      navigate("/tests");
    } finally {
      setLoading(false);
    }
  }, [testId, navigate, isStudent]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  const handleStartTest = async () => {
    if (!testId) return;
    try {
      const response = await testAttemptService.startAttempt(Number(testId));
      navigate(`/test-attempts/${response.data.id}`);
    } catch (error: unknown) {
      console.error("Error starting test:", error);
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
      console.error("Error starting practice:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to start practice");
      setErrorOpen(true);
    }
  };

  const handleTogglePublish = () => {
    if (!test) return;
    const action = test.is_published ? "unpublish" : "publish";

    setConfirmMessage(
      `Are you sure you want to ${action} "${test.title}" of "${test.subject?.name || "-"}"?`
    );

    setConfirmAction(() => async () => {
      try {
        await testService.update(test.id, { is_published: !test.is_published });
        setSuccessMessage(
          `Test "${test.title}" of "${test.subject?.name || "-"}" ${action}ed successfully!`
        );
        setSuccessOpen(true);
        fetchTest();
      } catch (error: unknown) {
        console.error(`Error ${action}ing test:`, error);
        setErrorMessage(error instanceof Error ? error.message : `Failed to ${action} test`);
        setErrorOpen(true);
      } finally {
        setConfirmOpen(false);
      }
    });

    setConfirmOpen(true);
  };

  const handleDeleteQuestion = (questionId: number, questionText: string) => {
    setConfirmMessage(
      `Are you sure you want to delete this question: "${questionText.substring(0, 50)}..."?`
    );

    setConfirmAction(() => async () => {
      try {
        await testService.deleteQuestion(questionId);
        setSuccessMessage("Question deleted successfully!");
        setSuccessOpen(true);
        fetchTest();
      } catch (error: unknown) {
        console.error("Error deleting question:", error);
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
    setEditFormData({
      question_text: question.question_text,
      options: question.options || ["", "", "", ""],
      correct_answer: question.correct_answer || "",
      marks: question.marks,
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

      // If there's a media file or media removal, use FormData
      if (editQuestionMediaFile || removeQuestionMedia) {
        const formData = new FormData();
        formData.append("question_text", editFormData.question_text || "");
        formData.append("correct_answer", editFormData.correct_answer || "");
        formData.append("marks", (editFormData.marks || 2).toString());

        if (editFormData.options) {
          formData.append("options", JSON.stringify(editFormData.options));
        }

        if (removeQuestionMedia) {
          formData.append("media_url", "");
          formData.append("media_type", "");
        } else if (editQuestionMediaFile) {
          formData.append("media", editQuestionMediaFile);
        } else if (editQuestionMediaUrl) {
          formData.append("media_url", editQuestionMediaUrl);
          if (editQuestionMediaType) {
            formData.append("media_type", editQuestionMediaType);
          }
        }

        await testService.updateQuestionWithMedia(editingQuestion.id, formData);
      } else {
        await testService.updateQuestion(editingQuestion.id, editFormData);
      }

      setSuccessMessage("Question updated successfully!");
      setSuccessOpen(true);
      setEditModalOpen(false);
      fetchTest();
    } catch (error: unknown) {
      console.error("Error updating question:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to update question");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = () => {
    if (!test) return { label: "Unknown", color: "bg-gray-400", canAttempt: false, canPractice: false };

    // Tests in a test series are not time-restricted
    const isTestSeriesTest = !!test.test_series_id;

    if (!test.is_published)
      return { label: "Draft", color: "bg-gray-500", canAttempt: false, canPractice: false };

    // If student already attempted, show Practice instead of Start Test
    if (hasAttempted) {
      return { label: "Attempted", color: "bg-purple-500", canAttempt: false, canPractice: true };
    }

    // If it's a test series test, it's always available (no time restrictions)
    if (isTestSeriesTest) {
      return { label: "Available", color: "bg-green-500", canAttempt: true, canPractice: false };
    }

    // Subject-based tests have time restrictions
    const now = new Date();
    const availableFrom = new Date(test.available_from);
    const availableUntil = new Date(test.available_until);

    if (now < availableFrom)
      return { label: "Upcoming", color: "bg-blue-500", canAttempt: false, canPractice: false };
    if (now > availableUntil)
      return { label: "Closed", color: "bg-red-500", canAttempt: false, canPractice: true }; // Can practice closed tests
    return { label: "Active", color: "bg-green-500", canAttempt: true, canPractice: false };
  };

  if (loading) return <div className="p-6 text-center">Loading test...</div>;
  if (!test) return <div className="p-6 text-center">Test not found</div>;

  const status = getTestStatus();

  return (
    <div className="space-y-6">
      {/* SUCCESS MODAL */}
      <SuccessModal
        open={successOpen}
        title={test.title}
        description={successMessage}
        showButtons
        okText="OK"
        onConfirm={() => setSuccessOpen(false)}
        onClose={() => setSuccessOpen(false)}
      />

      {/* ERROR MODAL */}
      <ErrorModal
        open={errorOpen}
        title={test?.title || "Error"}
        description={errorMessage}
        showButtons
        okText="Close"
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* CONFIRM MODAL */}
      <ConfirmModal
        open={confirmOpen}
        title={test?.title || "Confirm Action"}
        description={confirmMessage}
        onConfirm={confirmAction}
        onClose={() => setConfirmOpen(false)}
        confirmText="Yes"
        cancelText="No"
      />

      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div
          onClick={() => navigate("/tests")}
          className="inline-flex items-center text-blue-600 hover:underline cursor-pointer text-sm mb-1"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Tests
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">{test.title}</h1>
              <Badge className={`${status.color} text-sm flex-shrink-0`}>{status.label}</Badge>
            </div>
            <p className="text-gray-600 text-sm md:mt-0 mt-1">
              {test.subject?.name || test.test_series?.title || ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
            {isTeacherOrAdmin && (
              <>
                <Button
                  variant={test.is_published ? "outline" : "default"}
                  onClick={handleTogglePublish}
                  className="flex items-center text-sm px-3 py-1"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {test.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/tests/${testId}/edit`)}
                  className="flex items-center text-sm px-3 py-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Add Questions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/tests/${testId}/attempts`)}
                  className="flex items-center text-sm px-3 py-1"
                >
                  <Users className="w-4 h-4 mr-1" />
                  View Attempts
                </Button>
              </>
            )}
            {isStudent && status.canAttempt && (
              <Button
                onClick={handleStartTest}
                className="flex items-center text-sm px-3 py-1"
              >
                <Play className="w-4 h-4 mr-1" />
                Start Test
              </Button>
            )}
            {isStudent && status.canPractice && (
              <Button
                variant="outline"
                onClick={handlePracticeTest}
                className="flex items-center text-sm px-3 py-1"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Practice
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Test Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl text-gray-600">Test Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-6">{test.description || "No description provided"}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-saBlue/50" />
              <div>
                <p className="text-sm text-gray-600">Questions</p>
                <p className="font-semibold">{test._count?.questions || 0}</p>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-saBlue/50" />
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-semibold">{test.duration_minutes} min</p>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-saBlue/50" />
              <div>
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="font-semibold">{test.total_marks}</p>
              </div>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-saBlue/50" />
              <div>
                <p className="text-sm text-gray-600">Passing Marks</p>
                <p className="font-semibold">{test.passing_marks}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t space-y-2">
            <div className="flex items-center text-sm text-gray-600 flex-wrap gap-2">
              <Calendar className="w-4 h-4 text-saBlue/50" />
              <span>
                Available from {new Date(test.available_from).toLocaleString()} to{" "}
                {new Date(test.available_until).toLocaleString()}
              </span>
            </div>
            {isTeacherOrAdmin && (
              <div className="flex items-center text-sm text-gray-600 gap-2 flex-wrap">
                <Users className="w-4 h-4 text-saBlue/50" />
                <span>{test._count?.test_attempts || 0} students have attempted this test</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions Preview */}
      {isTeacherOrAdmin && test.questions && test.questions.length > 0 && (
        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {test.questions.map((question: Question, index: number) => (
              <div key={question.id} className="border-b pb-4 last:border-b-0">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm sm:text-base">
                      {index + 1}. {question.question_text || <span className="text-gray-400 italic">(No question text)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{question.marks} marks</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQuestion(question)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id, question.question_text || `Question ${index + 1}`)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Type: {question.question_type.replace("_", " ")}
                </p>

                {/* Question Media Display */}
                {question.media_url && (
                  <div className="ml-4 mb-3 border rounded-lg p-2 bg-gray-50 max-w-md">
                    {question.media_type === 'image' && (
                      <img
                        src={question.media_url}
                        alt="Question"
                        className="max-w-full max-h-48 rounded"
                      />
                    )}
                    {question.media_type === 'pdf' && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-6 h-6 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">PDF Document</p>
                          <a
                            href={question.media_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View PDF
                          </a>
                        </div>
                      </div>
                    )}
                    {question.media_type === 'video' && (
                      <video
                        src={question.media_url}
                        controls
                        className="max-w-full max-h-48 rounded"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}
                  </div>
                )}

                {question.question_type === "MCQ" && question.options && question.options.length > 0 && (
                  <div className="ml-4 space-y-2">
                    {(question.options as any[]).map((option: any, optIndex: number) => {
                      const optionText = typeof option === 'string' ? option : option?.text || '';
                      const optionMediaUrl = typeof option === 'object' && option !== null ? option.media_url : null;
                      const optionMediaType = typeof option === 'object' && option !== null ? option.media_type : null;
                      const optionLetter = String.fromCharCode(65 + optIndex);
                      // Check if correct answer matches text OR letter (for image-only options)
                      const isCorrect = optionText === question.correct_answer ||
                        optionLetter === question.correct_answer ||
                        (optionText === '' && question.correct_answer === optionLetter);

                      return (
                        <div key={optIndex} className={`p-2 rounded ${isCorrect ? 'bg-green-50' : ''}`}>
                          <p
                            className={`text-sm ${isCorrect ? "text-green-600 font-medium" : "text-gray-700"}`}
                          >
                            {optionLetter}. {optionText}
                            {isCorrect && " ✓"}
                          </p>
                          {optionMediaUrl && optionMediaType === 'image' && (
                            <img
                              src={optionMediaUrl}
                              alt={`Option ${String.fromCharCode(65 + optIndex)}`}
                              className="mt-1 ml-4 max-w-xs max-h-24 rounded border"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {question.question_type === "TRUE_FALSE" && (
                  <p className="ml-4 text-sm text-green-600 font-medium">
                    Correct Answer: {question.correct_answer}
                  </p>
                )}

                {question.question_type === "SHORT_ANSWER" && (
                  <p className="ml-4 text-sm text-gray-600">
                    Sample Answer: {question.correct_answer}
                  </p>
                )}

                {question.question_type === "LONG_ANSWER" && (
                  <p className="ml-4 text-sm text-gray-600">
                    Sample Answer: {question.correct_answer}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit Question Modal */}
      {editModalOpen && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Question</h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Question Type (Read-only) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Question Type</label>
                  <input
                    type="text"
                    value={editingQuestion.question_type.replace("_", " ")}
                    disabled
                    className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600"
                  />
                </div>

                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium mb-1">Question Text *</label>
                  <textarea
                    value={editFormData.question_text}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, question_text: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Question Media Upload/Remove */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Question Media (Optional)</label>
                    {(editQuestionMediaUrl || editingQuestion.media_url) && !removeQuestionMedia && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRemoveQuestionMedia(true);
                          setEditQuestionMediaFile(null);
                          setEditQuestionMediaUrl(null);
                          setEditQuestionMediaType(null);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove Media
                      </Button>
                    )}
                  </div>
                  {!removeQuestionMedia && (
                    <div>
                      <MediaUpload
                        label=""
                        value={editQuestionMediaUrl}
                        mediaType={editQuestionMediaType}
                        onChange={(file, url, type) => {
                          setEditQuestionMediaFile(file);
                          setEditQuestionMediaUrl(url);
                          setEditQuestionMediaType(type);
                          setRemoveQuestionMedia(false);
                        }}
                      />
                    </div>
                  )}
                  {removeQuestionMedia && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600">Media will be removed when you save changes.</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRemoveQuestionMedia(false);
                          setEditQuestionMediaUrl(editingQuestion.media_url || null);
                          setEditQuestionMediaType(editingQuestion.media_type || null);
                        }}
                        className="mt-2"
                      >
                        Undo Remove
                      </Button>
                    </div>
                  )}
                </div>


                {editingQuestion.question_type === "MCQ" && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Options *</label>
                    <div className="space-y-3">
                      {editFormData.options?.map((option: any, idx) => {
                        const optionText = typeof option === 'string' ? option : option?.text || '';
                        const optionMediaUrl = typeof option === 'object' && option !== null ? option.media_url : null;
                        const optionMediaType = typeof option === 'object' && option !== null ? option.media_type : null;
                        const hasMedia = optionMediaUrl && !removeOptionMedia[idx];

                        return (
                          <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-sm font-medium w-6">{String.fromCharCode(65 + idx)}.</span>
                                <input
                                  type="text"
                                  value={optionText}
                                  onChange={(e) => {
                                    const newOptions = [...(editFormData.options || [])];
                                    if (typeof option === 'object' && option !== null) {
                                      newOptions[idx] = { ...option, text: e.target.value };
                                    } else {
                                      newOptions[idx] = e.target.value;
                                    }
                                    setEditFormData({ ...editFormData, options: newOptions });
                                  }}
                                  className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                                  placeholder="Option text (optional if using image)"
                                />
                              </div>
                              {hasMedia && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setRemoveOptionMedia({ ...removeOptionMedia, [idx]: true });
                                    const newOptions = [...(editFormData.options || [])];
                                    if (typeof option === 'object' && option !== null) {
                                      newOptions[idx] = { ...option, media_url: null, media_type: null };
                                      setEditFormData({ ...editFormData, options: newOptions });
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Remove Image
                                </Button>
                              )}
                            </div>
                            {hasMedia && optionMediaType === 'image' && (
                              <img
                                src={optionMediaUrl}
                                alt={`Option ${String.fromCharCode(65 + idx)}`}
                                className="ml-8 max-w-xs max-h-24 rounded border mt-2"
                              />
                            )}
                            {removeOptionMedia[idx] && (
                              <div className="ml-8 p-2 bg-red-50 border border-red-200 rounded-md mt-2">
                                <p className="text-sm text-red-600">Image will be removed when you save changes.</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {editingQuestion.question_type === "MCQ"
                      ? "Correct Answer (select from options) *"
                      : editingQuestion.question_type === "TRUE_FALSE"
                        ? "Correct Answer *"
                        : "Sample Answer"}
                  </label>
                  {editingQuestion.question_type === "MCQ" ? (
                    <select
                      value={editFormData.correct_answer}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, correct_answer: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select correct answer</option>
                      {editFormData.options?.map((option: any, idx) => {
                        const optionText = typeof option === 'string' ? option : option?.text || '';
                        const optionLetter = String.fromCharCode(65 + idx);
                        const optionValue = optionText || optionLetter;
                        const displayText = optionText || '(Image only)';
                        return (
                          <option key={idx} value={optionValue}>
                            {optionLetter}. {displayText}
                          </option>
                        );
                      })}
                    </select>
                  ) : editingQuestion.question_type === "TRUE_FALSE" ? (
                    <select
                      value={editFormData.correct_answer}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, correct_answer: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select answer</option>
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
                  ) : (
                    <textarea
                      value={editFormData.correct_answer}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, correct_answer: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Marks */}
                <div>
                  <label className="block text-sm font-medium mb-1">Marks *</label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.marks}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, marks: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveQuestion} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
