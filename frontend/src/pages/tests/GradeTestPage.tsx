import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
  User,
  Award,
  BookOpen,
  FileText,
  Sparkles,
  Check,
  RotateCcw,
  Maximize2,
} from "lucide-react";
import { testAttemptService } from "@/services/api";
import type { TestAttempt, GradeAnswerData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SuccessModal from "@/components/ui/successModal";
import MathRenderer from "@/components/ui/MathRenderer";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";

export default function GradeTestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  usePageTitle(
    attempt
      ? `Grade: ${attempt.test?.title || ""} — ${attempt.student?.user?.name || ""}`
      : "Grade Attempt"
  );
  const [grades, setGrades] = useState<{ [questionId: number]: GradeAnswerData }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (attemptId) fetchAttempt();
  }, [attemptId]);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getAttempt(parseInt(attemptId!));
      const data: TestAttempt = response.data;
      setAttempt(data);

      const initialGrades: { [key: number]: GradeAnswerData } = {};
      data.test?.questions?.forEach((q) => {
        const answer = data.answers?.find((a) => a.question_id === q.id);
        if (answer) {
          initialGrades[q.id] = {
            answer_id: answer.id,
            question_id: q.id,
            marks_obtained: answer.marks_obtained ?? 0,
            is_correct: answer.is_correct ?? false,
          };
        } else {
          initialGrades[q.id] = {
            question_id: q.id,
            marks_obtained: 0,
            is_correct: false,
          };
        }
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error("Error fetching test attempt:", error);
      toast.error("Failed to load test attempt");
      navigate("/tests");
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (
    questionId: number,
    marks: number,
    maxMarks: number,
    answerId?: number
  ) => {
    const validMarks = Math.min(Math.max(0, marks), maxMarks);
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        answer_id: answerId || prev[questionId]?.answer_id,
        question_id: questionId,
        marks_obtained: validMarks,
        is_correct: validMarks > 0,
      },
    }));
  };

  const awardQuickMarks = (questionId: number, maxMarks: number, ratio: number, answerId?: number) => {
    const marks = Math.round(maxMarks * ratio * 2) / 2; // round to nearest 0.5
    handleGradeChange(questionId, marks, maxMarks, answerId);
  };

  const awardAllAutoGraded = () => {
    if (!attempt?.test?.questions) return;
    const newGrades = { ...grades };
    let count = 0;

    attempt.test.questions.forEach((q) => {
      const isAuto =
        q.question_type === "MCQ" ||
        q.question_type === "TRUE_FALSE" ||
        q.question_type === "MATCH_THE_FOLLOWING";
      const answer = attempt.answers?.find((a) => a.question_id === q.id);

      if (isAuto && answer && answer.is_correct) {
        newGrades[q.id] = {
          answer_id: answer.id,
          question_id: q.id,
          marks_obtained: q.marks,
          is_correct: true,
        };
        count++;
      }
    });

    setGrades(newGrades);
    toast.success(`Synced ${count} auto-evaluated question(s) with full marks!`);
  };

  const handleSaveGrades = async () => {
    try {
      setSaving(true);
      const gradesList = Object.values(grades);
      await testAttemptService.gradeAttempt(parseInt(attemptId!), { grades: gradesList });
      setSuccessOpen(true);
    } catch (error: any) {
      console.error("Error saving grades:", error);
      toast.error(error.response?.data?.message || "Failed to save grades");
    } finally {
      setSaving(false);
    }
  };

  const totalScore = Object.values(grades).reduce((sum, g) => sum + (g.marks_obtained || 0), 0);
  const totalMarks = attempt?.test?.total_marks ?? attempt?.total_marks ?? 100;
  const isPassed = totalScore >= (attempt?.test?.passing_marks || 0);
  const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 max-w-5xl mx-auto">
        <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading attempt...</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center py-32 max-w-5xl mx-auto text-center">
        <p className="text-sm font-bold text-slate-500">Attempt not found</p>
        <Button
          onClick={() => navigate("/tests")}
          className="mt-4 bg-[#0276D3] text-white rounded-xl text-xs font-bold"
        >
          Back to Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-1 sm:p-4 pb-28 max-w-5xl mx-auto">
      {/* Success Modal */}
      <SuccessModal
        open={successOpen}
        title="Grades Saved Successfully"
        description={`Student score of ${totalScore} / ${totalMarks} (${percentage}%) has been recorded.`}
        showButtons
        okText="Back to Attempts List"
        onConfirm={() => {
          setSuccessOpen(false);
          navigate(`/tests/${attempt.test_id}/attempts`);
        }}
        onClose={() => setSuccessOpen(false)}
      />

      {/* STICKY TOP ACTION BAR */}
      <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/tests/${attempt.test_id}/attempts`)}
            className="h-9 w-9 rounded-xl text-slate-500 hover:text-[#0276D3] hover:bg-blue-50 shrink-0"
            title="Back to Attempts List"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {attempt.is_graded ? "Review & Edit Grades" : "Grade Test Attempt"}
              </h1>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  isPassed
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-red-50 text-red-700 border-red-300"
                }`}
              >
                {isPassed ? "Pass" : "Fail"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium line-clamp-1">
              {attempt.student?.user?.name} · {attempt.test?.title}
            </p>
          </div>
        </div>

        {/* Live Score Tally & Primary Save Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-3 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Score
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900">
                {totalScore} <span className="text-slate-400 text-xs font-bold">/ {totalMarks}</span>
              </span>
            </div>
            <span className="text-xs font-black text-[#0276D3] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              {percentage}%
            </span>
          </div>

          <Button
            onClick={handleSaveGrades}
            disabled={saving}
            className="bg-[#0276D3] hover:bg-[#015bb5] text-white font-bold rounded-xl text-xs h-10 px-5 shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Grades"}
          </Button>
        </div>
      </div>

      {/* STUDENT DETAILS & METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Student Profile Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0276D3] flex items-center justify-center font-black text-sm shrink-0 border border-blue-100">
            {attempt.student?.user?.name?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate">{attempt.student?.user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{attempt.student?.user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                {attempt.is_practice ? "Practice Set" : "Official Exam"}
              </span>
            </div>
          </div>
        </div>

        {/* Submission Details Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-[#eca209] flex items-center justify-center shrink-0 border border-amber-100">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Submitted</p>
            <p className="text-xs font-bold text-slate-800">
              {attempt.submitted_at
                ? new Date(attempt.submitted_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Not submitted"}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Passing criteria: {attempt.test?.passing_marks} marks
            </p>
          </div>
        </div>

        {/* Quick Batch Actions Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-center gap-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Grading Tools
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={awardAllAutoGraded}
            className="h-8 rounded-xl text-xs font-bold text-[#0276D3] border-blue-200 bg-blue-50/50 hover:bg-blue-50 w-full flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Full Marks for Correct Auto-Graded
          </Button>
        </div>
      </div>

      {/* QUESTION-BY-QUESTION GRADING CARDS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0276D3]" />
            Questions & Student Submissions ({attempt.test?.questions?.length || 0})
          </h2>
        </div>

        {attempt.test?.questions
          ?.sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((question, index) => {
            const answer = attempt.answers?.find((a) => a.question_id === question.id);
            const currentGrade = grades[question.id] || {
              marks_obtained: 0,
              is_correct: false,
            };
            const isAutoGraded =
              attempt.test?.is_autograded !== false &&
              (question.question_type === "MCQ" ||
                question.question_type === "TRUE_FALSE" ||
                question.question_type === "MATCH_THE_FOLLOWING");

            return (
              <div
                key={question.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Case Study Context if sub-question */}
                {question.parent_id && (() => {
                  const parent = attempt.test?.questions?.find((q) => q.id === question.parent_id);
                  if (!parent) return null;
                  return (
                    <div className="bg-blue-50/60 border-b border-blue-100 p-4">
                      <span className="text-[10px] font-black text-[#0276D3] uppercase tracking-wider block mb-1">
                        Case Study Context
                      </span>
                      <div className="text-xs text-slate-700 leading-relaxed">
                        <MathRenderer text={parent.question_text} />
                      </div>
                    </div>
                  );
                })()}

                <div className="p-4 sm:p-5 space-y-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-800 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                        {index + 1}
                      </span>
                      <div className="space-y-1 flex-1">
                        <div className="text-sm font-bold text-slate-900 leading-relaxed">
                          <MathRenderer text={question.question_text} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            {question.question_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-[10px] font-bold text-[#0276D3] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            Max {question.marks} marks
                          </span>
                          {question.negative_marks ? (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                              -{question.negative_marks} neg
                            </span>
                          ) : null}
                          {isAutoGraded && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                              Auto Evaluated
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MCQ Options Display */}
                  {question.question_type === "MCQ" && question.options && (
                    <div className="space-y-1.5 pl-0 sm:pl-10">
                      {(question.options as any[]).map((opt, optIdx) => {
                        const optText = typeof opt === "string" ? opt : opt?.text || "";
                        const optionLetter = String.fromCharCode(65 + optIdx);
                        const isCorrectAnswer =
                          optText === question.correct_answer ||
                          optionLetter === question.correct_answer;
                        const isStudentChoice =
                          answer?.answer_text === optText ||
                          answer?.answer_text === optionLetter;

                        return (
                          <div
                            key={optIdx}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                              isCorrectAnswer
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                                : isStudentChoice
                                ? "bg-amber-50 border-amber-300 text-amber-900"
                                : "bg-slate-50/50 border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isCorrectAnswer
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {optionLetter}
                              </span>
                              <MathRenderer text={optText} inline />
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isCorrectAnswer && (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Correct Key
                                </span>
                              )}
                              {isStudentChoice && (
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                    isCorrectAnswer
                                      ? "bg-emerald-600 text-white"
                                      : "bg-amber-600 text-white"
                                  }`}
                                >
                                  Student Choice
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Options Display */}
                  {question.question_type === "TRUE_FALSE" && (
                    <div className="flex items-center gap-2 pl-0 sm:pl-10">
                      {["True", "False"].map((tf) => {
                        const isCorrectAnswer =
                          question.correct_answer?.toLowerCase() === tf.toLowerCase();
                        const isStudentChoice =
                          answer?.answer_text?.toLowerCase() === tf.toLowerCase();

                        return (
                          <div
                            key={tf}
                            className={`flex-1 p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                              isCorrectAnswer
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                : isStudentChoice
                                ? "bg-amber-50 border-amber-300 text-amber-900"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <span>{tf}</span>
                            <div className="flex items-center gap-1">
                              {isCorrectAnswer && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  Correct
                                </span>
                              )}
                              {isStudentChoice && (
                                <span className="text-[10px] text-white bg-amber-600 px-1.5 py-0.5 rounded">
                                  Student Pick
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Match the Following Comparison */}
                  {question.question_type === "MATCH_THE_FOLLOWING" && (
                    <div className="space-y-2 pl-0 sm:pl-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Student Matches */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            Student Matched Pairs
                          </p>
                          {(() => {
                            try {
                              let parsed = answer?.answer_text ? JSON.parse(answer.answer_text) : [];
                              if (typeof parsed === "string") parsed = JSON.parse(parsed);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                return parsed.map((p: any, pI: number) => {
                                  const pairObj = typeof p === "string" ? JSON.parse(p) : p;
                                  return (
                                    <div
                                      key={pI}
                                      className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200 font-medium"
                                    >
                                      <span>{pairObj.left || "—"}</span>
                                      <span className="text-slate-400 font-bold">&rarr;</span>
                                      <span className="text-slate-900 font-bold">{pairObj.right || "—"}</span>
                                    </div>
                                  );
                                });
                              }
                            } catch (e) {
                              console.error("Match parse error", e);
                            }
                            return (
                              <p className="text-xs text-red-500 italic">No matches provided or unattempted</p>
                            );
                          })()}
                        </div>

                        {/* Correct Key */}
                        <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 space-y-2">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                            Official Correct Matching Key
                          </p>
                          {(() => {
                            try {
                              let parsed = question.options || [];
                              if (typeof parsed === "string") parsed = JSON.parse(parsed);
                              if (Array.isArray(parsed)) {
                                return parsed.map((p: any, pI: number) => {
                                  const pairObj = typeof p === "string" ? JSON.parse(p) : p;
                                  return (
                                    <div
                                      key={pI}
                                      className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-emerald-200 font-medium"
                                    >
                                      <span className="text-slate-800">{pairObj.left || "—"}</span>
                                      <span className="text-emerald-500 font-bold">&rarr;</span>
                                      <span className="text-emerald-700 font-bold">{pairObj.right || "—"}</span>
                                    </div>
                                  );
                                });
                              }
                            } catch (e) {
                              console.error("Match key error", e);
                            }
                            return <p className="text-xs text-emerald-700">{question.correct_answer}</p>;
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Student Answer Text & Rubric for Short / Long / Case Study */}
                  {(question.question_type === "SHORT_ANSWER" ||
                    question.question_type === "LONG_ANSWER" ||
                    question.question_type === "CASE_STUDY") && (
                    <div className="space-y-3 pl-0 sm:pl-10">
                      {/* Student Submission Box */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            Student Written Response
                          </p>
                          {!answer?.answer_text && !answer?.answer_media_url && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              Not Attempted
                            </span>
                          )}
                        </div>

                        {answer?.answer_text ? (
                          <div className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                            <MathRenderer text={answer.answer_text} />
                          </div>
                        ) : null}

                        {/* Media attachment if any */}
                        {answer?.answer_media_url && (
                          <div className="pt-2">
                            {answer.answer_media_type === "image" && (
                              <img
                                src={answer.answer_media_url}
                                alt="Student submission"
                                className="max-h-60 rounded-xl border border-slate-200 object-contain"
                              />
                            )}
                            {answer.answer_media_type === "pdf" && (
                              <a
                                href={answer.answer_media_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0276D3] bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-100"
                              >
                                <FileText className="w-4 h-4" /> View Submitted PDF
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Official Evaluation Rubric / Model Answer */}
                      {question.correct_answer && (
                        <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200 space-y-1">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">
                            Model Answer & Evaluation Rubric
                          </p>
                          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                            <MathRenderer text={question.correct_answer} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TEACHER GRADING CONTROLS TOOLBAR */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 pl-0 sm:pl-10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Quick Grade:</span>

                      {/* 1-Click Full Marks */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => awardQuickMarks(question.id, question.marks, 1, answer?.id)}
                        className={`h-7 px-2.5 rounded-lg text-xs font-bold ${
                          currentGrade.marks_obtained === question.marks
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        Full ({question.marks})
                      </Button>

                      {/* 1-Click Half Marks */}
                      {question.marks > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => awardQuickMarks(question.id, question.marks, 0.5, answer?.id)}
                          className={`h-7 px-2.5 rounded-lg text-xs font-bold ${
                            currentGrade.marks_obtained === Math.round(question.marks * 0.5 * 2) / 2
                              ? "bg-[#0276D3] text-white border-[#0276D3] shadow-xs"
                              : "border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-[#0276D3]"
                          }`}
                        >
                          Half ({Math.round(question.marks * 0.5 * 2) / 2})
                        </Button>
                      )}

                      {/* 1-Click Zero Marks */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => awardQuickMarks(question.id, question.marks, 0, answer?.id)}
                        className={`h-7 px-2.5 rounded-lg text-xs font-bold ${
                          currentGrade.marks_obtained === 0
                            ? "bg-red-600 text-white border-red-600 shadow-xs"
                            : "border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-700"
                        }`}
                      >
                        0 Marks
                      </Button>
                    </div>

                    {/* Numeric Marks Input with Steppers */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Marks Awarded:</span>
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            handleGradeChange(
                              question.id,
                              Math.max(0, currentGrade.marks_obtained - 0.5),
                              question.marks,
                              answer?.id
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 font-black text-xs hover:bg-slate-200 flex items-center justify-center shadow-xs"
                        >
                          -
                        </button>
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max={question.marks}
                          value={currentGrade.marks_obtained}
                          onChange={(e) =>
                            handleGradeChange(
                              question.id,
                              parseFloat(e.target.value) || 0,
                              question.marks,
                              answer?.id
                            )
                          }
                          className="w-14 h-6 text-center font-black text-xs p-0 border-none bg-transparent shadow-none focus-visible:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleGradeChange(
                              question.id,
                              Math.min(question.marks, currentGrade.marks_obtained + 0.5),
                              question.marks,
                              answer?.id
                            )
                          }
                          className="w-6 h-6 rounded-lg bg-white text-slate-700 font-black text-xs hover:bg-slate-200 flex items-center justify-center shadow-xs"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-bold text-slate-400">/ {question.marks}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* BOTTOM ACTION FOOTER */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/tests/${attempt.test_id}/attempts`)}
            className="rounded-xl text-xs font-bold border-slate-200"
          >
            Cancel & Back
          </Button>
          <span className="text-xs text-slate-500 font-medium">
            Reviewing <span className="font-bold text-slate-800">{attempt.test?.questions?.length}</span> question items
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2 hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Awarded</span>
            <span className="text-sm font-black text-slate-900">{totalScore} / {totalMarks}</span>
          </div>

          <Button
            onClick={handleSaveGrades}
            disabled={saving}
            className="bg-[#0276D3] hover:bg-[#015bb5] text-white font-bold rounded-xl text-xs h-10 px-6 shadow-xs flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Grades..." : "Save & Finalize Grades"}
          </Button>
        </div>
      </div>
    </div>
  );
}
