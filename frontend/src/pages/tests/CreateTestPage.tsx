import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { testService, subjectService, testSeriesService } from "@/services/api";
import type { TestSeries } from "@/services/api";
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
import { useAuthStore } from "@/store/authStore";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import MediaUpload from "@/components/ui/MediaUpload";

export default function CreateTestPage() {
  const navigate = useNavigate();

  const { testId: paramTestId } = useParams();
  const isEditing = !!paramTestId;

  const { user } = useAuthStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [testSeriesList, setTestSeriesList] = useState<TestSeries[]>([]);
  const [loading, setLoading] = useState(false);

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
  });

  const [aiTopic, setAiTopic] = useState("");
  const [aiQuestions, setAiQuestions] = useState({
    mcq: 5,
    trueFalse: 3,
    shortAnswer: 2,
    longAnswer: 0,
  });

  const [manualQuestion, setManualQuestion] = useState<CreateQuestionData>({
    question_type: "MCQ",
    question_text: "",
    options: ["", "", "", ""],
    correct_answer: "",
    marks: 2,
  });

  const [questionMediaFile, setQuestionMediaFile] = useState<File | null>(null);
  const [questionMediaUrl, setQuestionMediaUrl] = useState<string | null>(null);
  const [questionMediaType, setQuestionMediaType] = useState<string | null>(null);
  
  const [optionMedia, setOptionMedia] = useState<{
    [index: number]: { file: File | null; url: string | null; type: string | null };
  }>({});

  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // -------------------------
  // LOAD SUBJECTS
  // -------------------------
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const params: Record<string, any> = {};

        if (user?.role) {
          if (user.role === "TEACHER") {
            params.user_id = user.id;
            params.role = "TEACHER";
          } else if (user.role === "STUDENT") {
            params.user_id = user.id;
            params.role = "STUDENT";
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


  // -------------------------
  // EDIT MODE: LOAD EXISTING TEST
  // -------------------------
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
        });

        setTestId(test.id);
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

  // -------------------------
  // CREATE OR UPDATE TEST
  // -------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (isEditing && paramTestId) {
        await testService.update(Number(paramTestId), formData);
        setSuccessMessage("Test updated successfully!");
        setSuccessOpen(true);
      } else {
        const response = await testService.create(formData);
        setTestId(response.data.id);

        setSuccessMessage(
          "Test created successfully! You can now add questions."
        );
        setSuccessOpen(true);
      }
    } catch (error) {
      console.error("Error saving test:", error);
      setErrorMessage("Failed to save test.");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // GENERATE QUESTIONS
  // -------------------------
  const handleGenerateQuestions = async () => {
    if (!testId) {
      setErrorMessage("Please create/update the test first.");
      setErrorOpen(true);
      return;
    }

    if (!aiTopic.trim()) {
      setErrorMessage("Please enter a topic.");
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

      setSuccessMessage("Questions generated successfully!");
      setSuccessOpen(true);
    } catch (error) {
      console.error("Error generating questions:", error);
      setErrorMessage("Failed to generate questions.");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // ADD MANUAL QUESTION
  // -------------------------
  const handleAddManualQuestion = async () => {
    if (!testId) {
      setErrorMessage("Please create/update the test first.");
      setErrorOpen(true);
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("question_type", manualQuestion.question_type);
      formData.append("question_text", manualQuestion.question_text);
      formData.append("correct_answer", manualQuestion.correct_answer);
      formData.append("marks", manualQuestion.marks.toString());

      // Build options with media
      if (manualQuestion.options && manualQuestion.question_type === "MCQ") {
        const optionsWithMedia = manualQuestion.options.map((text, index) => {
          const media = optionMedia[index];
          return {
            text,
            media_url: media?.url || null,
            media_type: media?.type || null,
          };
        });
        formData.append("options", JSON.stringify(optionsWithMedia));

        // Append option media files
        Object.keys(optionMedia).forEach((key) => {
          const index = parseInt(key);
          const media = optionMedia[index];
          if (media?.file) {
            formData.append(`option_media_${index}`, media.file);
          }
        });
      } else if (manualQuestion.options) {
        formData.append("options", JSON.stringify(manualQuestion.options));
      }

      if (questionMediaFile) {
        formData.append("media", questionMediaFile);
      } else if (questionMediaUrl) {
        formData.append("media_url", questionMediaUrl);
        if (questionMediaType) {
          formData.append("media_type", questionMediaType);
        }
      }

      // Debug logging
      console.log("=== Question Form Data ===");
      console.log("Question Text:", manualQuestion.question_text);
      console.log("Question Media File:", questionMediaFile);
      console.log("Question Media URL:", questionMediaUrl);
      console.log("Question Media Type:", questionMediaType);
      console.log("Options:", manualQuestion.options);
      console.log("Option Media:", optionMedia);
      console.log("FormData entries:");
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
      
      await testService.addQuestionWithMedia(testId, formData);

      setSuccessMessage("Question added successfully!");
      setSuccessOpen(true);

      setManualQuestion({
        question_type: "MCQ",
        question_text: "",
        options: ["", "", "", ""],
        correct_answer: "",
        marks: 2,
      });
      setQuestionMediaFile(null);
      setQuestionMediaUrl(null);
      setQuestionMediaType(null);
      setOptionMedia({});
    } catch (error) {
      console.error("Error adding question:", error);
      setErrorMessage("Failed to add question.");
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === formData.subject_id);
  const selectedTestSeries = testSeriesList.find((ts) => ts.id === formData.test_series_id);

  // -------------------------
  // RENDER
  // -------------------------
  return (
    <div className="space-y-6">

      {/* SUCCESS MODAL */}
      <SuccessModal
        open={successOpen}
        title="Success"
        description={
          testId && !isEditing
            ? `Test "${formData.title}"${selectedSubject ? ` for subject "${selectedSubject.name}"` : ''}${selectedTestSeries ? ` in test series "${selectedTestSeries.title}"` : ''} was created successfully!`
            : successMessage
        }
        showButtons
        okText="OK"
        onConfirm={() => {
          setSuccessOpen(false);
          navigate(`/tests/${testId ?? paramTestId}`);
        }}
        onClose={() => setSuccessOpen(false)}
      />

      {/* ERROR MODAL */}
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        showButtons
        okText="Close"
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <div
          onClick={() => navigate("/tests")}
          className="inline-flex items-center text-blue-600 hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Tests
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-600">
            {isEditing ? "Edit Test" : "Create New Test"}
          </h1>
          <p className="text-gray-400 text-sm">
            {isEditing
              ? "Update details of the test"
              : "Fill in the details and add questions"}
          </p>
        </div>
      </div>

      {/* STEP 1 */}
      <Card className="mb-6">
        <CardHeader className="pb-1">
          <CardTitle className="text-xl text-gray-600">
            Step 1: Test Details
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* TITLE */}
            <div>
              <Label>Test Title</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* SUBJECT & TEST SERIES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Subject (optional)</Label>
                <select
                  value={formData.subject_id ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subject_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Test Series (optional)</Label>
                <select
                  value={formData.test_series_id ?? ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      test_series_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a test series</option>
                  {testSeriesList.map((series) => (
                    <option key={series.id} value={series.id}>
                      {series.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* MARKS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Total Marks</Label>
                <Input
                  type="number"
                  value={formData.total_marks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_marks: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label>Passing Marks</Label>
                <Input
                  type="number"
                  value={formData.passing_marks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passing_marks: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* DURATION */}
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_minutes: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* AVAILABLE FROM / UNTIL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Available From</Label>
                <Input
                  type="datetime-local"
                  value={formData.available_from}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      available_from: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Available Until</Label>
                <Input
                  type="datetime-local"
                  value={formData.available_until}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      available_until: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* PUBLISHED */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_published: e.target.checked,
                  })
                }
              />
              <Label>Publish test immediately</Label>
            </div>

            {/* SUBMIT */}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                    ? "Update Test"
                    : "Create Test"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* STEP 2 & 3 */}
      {testId && (
        <>
          {/* STEP 2: AI QUESTIONS */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Step 2: Generate Questions with AI
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Label>Topic *</Label>
              <Input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Photosynthesis, Algebra, World War II..."
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label>MCQ</Label>
                  <Input
                    type="number"
                    min="0"
                    value={aiQuestions.mcq}
                    onChange={(e) =>
                      setAiQuestions({
                        ...aiQuestions,
                        mcq: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>True / False</Label>
                  <Input
                    type="number"
                    min="0"
                    value={aiQuestions.trueFalse}
                    onChange={(e) =>
                      setAiQuestions({
                        ...aiQuestions,
                        trueFalse: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Short Answer</Label>
                  <Input
                    type="number"
                    min="0"
                    value={aiQuestions.shortAnswer}
                    onChange={(e) =>
                      setAiQuestions({
                        ...aiQuestions,
                        shortAnswer: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Long Answer</Label>
                  <Input
                    type="number"
                    min="0"
                    value={aiQuestions.longAnswer}
                    onChange={(e) =>
                      setAiQuestions({
                        ...aiQuestions,
                        longAnswer: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleGenerateQuestions} disabled={loading}>
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? "Generating..." : "Generate Questions"}
              </Button>
            </CardContent>
          </Card>

          {/* STEP 3: MANUAL QUESTIONS */}
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Add Manual Questions</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Label>Question Type</Label>
              <select
                value={manualQuestion.question_type}
                onChange={(e) =>
                  setManualQuestion({
                    ...manualQuestion,
                    question_type: e.target.value as QuestionType,
                  })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="MCQ">Multiple Choice</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="LONG_ANSWER">Long Answer</option>
              </select>

              <Label>Question *</Label>
              <Textarea
                rows={3}
                value={manualQuestion.question_text}
                onChange={(e) =>
                  setManualQuestion({
                    ...manualQuestion,
                    question_text: e.target.value,
                  })
                }
              />

              <MediaUpload
                label="Question Media (Optional)"
                value={questionMediaUrl}
                mediaType={questionMediaType}
                onChange={(file, url, type) => {
                  setQuestionMediaFile(file);
                  setQuestionMediaUrl(url);
                  setQuestionMediaType(type);
                }}
              />

              {manualQuestion.question_type === "MCQ" && (
                <>
                  <Label>Options</Label>
                  {manualQuestion.options?.map((opt, index) => (
                    <div key={index} className="mb-4 p-3 border rounded-lg bg-gray-50">
                      <Label className="text-sm text-gray-600 mb-1">
                        Option {String.fromCharCode(65 + index)}
                      </Label>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...(manualQuestion.options || [])];
                          newOptions[index] = e.target.value;
                          setManualQuestion({
                            ...manualQuestion,
                            options: newOptions,
                          });
                        }}
                        className="mb-2"
                        placeholder={`Option ${String.fromCharCode(65 + index)} text`}
                      />
                      <MediaUpload
                        label={`Option ${String.fromCharCode(65 + index)} Media (Optional)`}
                        value={optionMedia[index]?.url}
                        mediaType={optionMedia[index]?.type}
                        onChange={(file, url, type) => {
                          setOptionMedia({
                            ...optionMedia,
                            [index]: { file, url, type },
                          });
                        }}
                        acceptTypes="image/*"
                        maxSize={5}
                      />
                    </div>
                  ))}
                </>
              )}

              <Label>Correct Answer *</Label>
              {manualQuestion.question_type === "MCQ" ? (
                <select
                  value={manualQuestion.correct_answer}
                  onChange={(e) =>
                    setManualQuestion({
                      ...manualQuestion,
                      correct_answer: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select correct answer</option>
                  {manualQuestion.options?.map((opt, idx) => {
                    const optionText = opt || '';
                    const optionLetter = String.fromCharCode(65 + idx);
                    // If option is empty, use just the letter as both label and value
                    const displayLabel = optionText ? `${optionLetter}. ${optionText}` : `${optionLetter}. (Image only)`;
                    const optionValue = optionText || optionLetter;
                    return (
                      <option key={idx} value={optionValue}>
                        {displayLabel}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <Input
                  value={manualQuestion.correct_answer}
                  onChange={(e) =>
                    setManualQuestion({
                      ...manualQuestion,
                      correct_answer: e.target.value,
                    })
                  }
                />
              )}

              <Label>Marks</Label>
              <Input
                type="number"
                value={manualQuestion.marks}
                onChange={(e) =>
                  setManualQuestion({
                    ...manualQuestion,
                    marks: Number(e.target.value),
                  })
                }
              />

              <Button onClick={handleAddManualQuestion} disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
