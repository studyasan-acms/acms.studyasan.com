import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  FileText,
  BookOpen,
  Sparkles,
  ClipboardList,
  RotateCcw,
  Download,
} from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePageTitle } from "@/hooks/usePageTitle";
import MathRenderer from "@/components/ui/MathRenderer";
import { getEffectiveTestType } from "./TestsPage";

export default function TestResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  usePageTitle(attempt ? `Results: ${attempt.test?.title || ""}` : "Test Results");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attemptId) {
      fetchAttempt();
    }
  }, [attemptId]);

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getAttempt(parseInt(attemptId!));
      setAttempt(response.data);
    } catch (error) {
      console.error('Error fetching test attempt:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-8 h-8 border-3 border-[#0276D3]/20 border-t-[#0276D3] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading results...</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 p-8 max-w-md mx-auto mt-10 text-center">
        <FileText className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-600 font-semibold mb-4">Results not found.</p>
        <Button
          className="bg-[#0276D3] text-white hover:bg-[#015bb5] rounded-xl text-xs"
          onClick={() => navigate('/tests')}
        >
          Back to Tests
        </Button>
      </div>
    );
  }

  const percentage = attempt.score !== null && attempt.total_marks > 0
    ? (attempt.score / attempt.total_marks) * 100
    : 0;

  const effectiveType = attempt.test ? getEffectiveTestType(attempt.test) : 'MOCK_TEST';
  const isPassed = attempt.is_passed ?? (attempt.score !== null && attempt.test?.passing_marks ? attempt.score >= attempt.test.passing_marks : false);

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/tests/my-results')}
            className="text-slate-500 hover:text-[#0276D3] hover:bg-slate-100 rounded-xl h-10 w-10 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Test Scorecard</h1>
              {effectiveType === "PRACTICE" && (
                <span className="text-[11px] font-bold text-[#eca209] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
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
            <p className="text-slate-500 text-xs mt-1">{attempt.test?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {attempt.test && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tests/${attempt.test?.id}`)}
              className="rounded-xl text-xs border-slate-200 text-slate-700 hover:bg-slate-50 w-full sm:w-auto"
            >
              Test Overview
            </Button>
          )}
          {effectiveType === "CERTIFICATION" && isPassed && (
            <Button
              size="sm"
              onClick={() => navigate('/certificates')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold w-full sm:w-auto flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" /> View Certificate
            </Button>
          )}
        </div>
      </div>

      {/* Practice Set Notice Banner */}
      {(attempt.is_practice || effectiveType === 'PRACTICE') && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl text-[#eca209]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs text-amber-900">
            <p className="font-bold">Self-Paced Practice Completed</p>
            <p className="text-amber-700 mt-0.5">
              This was a practice run for learning. Detailed answer keys and explanations are available below.
            </p>
          </div>
        </div>
      )}

      {/* Score Summary Card */}
      <Card className="shadow-xs border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <CardContent className="p-0">
          {!attempt.is_graded ? (
            <div className="text-center py-12 px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 text-[#eca209] mb-3">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Grading Under Review</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your subjective submissions are being evaluated by your teacher. Your final scorecard will update shortly.
              </p>
            </div>
          ) : (
            <div className="text-center py-10 px-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3 ${isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {isPassed ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">
                {isPassed ? 'Passed Successfully!' : 'Needs Improvement'}
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                {isPassed
                  ? (effectiveType === 'CERTIFICATION' ? 'Congratulations! You qualified for certification.' : 'Great job on this attempt!')
                  : `Passing threshold was ${attempt.test?.passing_marks || 0} marks. Keep practicing!`}
              </p>

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Score</p>
                  <p className="text-3xl sm:text-4xl font-black text-[#0276D3] mt-0.5">{attempt.score || 0}</p>
                </div>
                <div className="text-3xl text-slate-300 font-light">/</div>
                <div className="text-center">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Marks</p>
                  <p className="text-3xl sm:text-4xl font-black text-slate-800 mt-0.5">{attempt.total_marks}</p>
                </div>
              </div>

              <div className="max-w-xs mx-auto">
                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
                <p className="text-sm font-bold text-slate-700">{percentage.toFixed(1)}% Accuracy</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 border-t border-slate-100 bg-slate-50/50 text-xs">
            <div className="text-center">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Test Type</p>
              <p className="font-bold text-slate-800 mt-0.5">{effectiveType.replace('_', ' ')}</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Submitted Date</p>
              <p className="font-bold text-slate-800 mt-0.5">
                {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString('en-IN') : 'In Progress'}
              </p>
            </div>
            {attempt.is_graded && attempt.grader && (
              <div className="text-center">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Reviewed By</p>
                <p className="font-bold text-slate-800 mt-0.5">{attempt.grader?.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Question Review */}
      {attempt.is_graded && attempt.answers && (
        <Card className="shadow-xs border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-200 py-3.5 px-5">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-700">Detailed Answer Review</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {attempt.answers.map((answer, index) => {
                const isSubQuestion = answer.question?.parent_id != null;
                const parentQuestion = isSubQuestion ? attempt.test?.questions?.find((q: any) => q.id === answer.question?.parent_id) : null;
                
                return (
                  <div key={answer.id} className="p-5">
                    {/* Render Case Study context for sub-questions */}
                    {isSubQuestion && parentQuestion && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 mb-4 text-xs">
                        <div className="mb-1">
                          <span className="text-[10px] font-bold text-[#0276D3] uppercase tracking-wider">Case Study Context</span>
                        </div>
                        <div className="text-slate-700">
                          <MathRenderer text={parentQuestion.question_text} />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="font-semibold text-slate-900 text-sm">
                          <MathRenderer text={answer.question?.question_text || ''} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          answer.is_correct
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {answer.marks_obtained || 0} / {answer.question?.marks} marks
                        </span>
                        {answer.is_correct ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>

                    <div className="ml-10 space-y-2.5 text-xs">
                      {/* Student's response */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your Submission</p>
                        {!answer.answer_text && !answer.answer_media_url ? (
                          <p className="text-slate-400 italic">Not answered</p>
                        ) : (
                          <>
                            {answer.answer_text && answer.question?.question_type !== 'MATCH_THE_FOLLOWING' && (
                              <div className="text-slate-800 font-medium">
                                <MathRenderer text={answer.answer_text} />
                              </div>
                            )}
                            {answer.answer_media_url && (
                              <img src={answer.answer_media_url} alt="Your answer" className="mt-2 max-w-md max-h-48 rounded-lg border" />
                            )}
                          </>
                        )}
                      </div>

                      {/* Correct answer */}
                      {answer.question?.question_type !== 'SHORT_ANSWER' && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Correct Answer</p>
                          <div className="text-emerald-900 font-bold">
                            <MathRenderer text={answer.question?.correct_answer || ''} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
