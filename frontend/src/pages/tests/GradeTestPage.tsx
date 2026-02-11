import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, XCircle, User, Award, BookOpen } from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt, GradeAnswerData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SuccessModal from '@/components/ui/successModal';
import { usePageTitle } from "@/hooks/usePageTitle";

export default function GradeTestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  usePageTitle(attempt ? `Grade: ${attempt.test?.title || ""} — ${attempt.student?.user?.name || ""}` : "Grade Attempt");
  const [grades, setGrades] = useState<{ [answerId: number]: GradeAnswerData }>({});
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
      setAttempt(response.data);
      const initialGrades: { [key: number]: GradeAnswerData } = {};
      response.data.answers?.forEach((answer) => {
        initialGrades[answer.id] = {
          answer_id: answer.id,
          marks_obtained: answer.marks_obtained ?? 0,
          is_correct: answer.is_correct ?? false,
        };
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error('Error fetching test attempt:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (answerId: number, marks: number, maxMarks: number) => {
    const validMarks = Math.min(Math.max(0, marks), maxMarks);
    setGrades({
      ...grades,
      [answerId]: {
        answer_id: answerId,
        marks_obtained: validMarks,
        is_correct: validMarks > 0,
      },
    });
  };

  const handleSaveGrades = async () => {
    try {
      setSaving(true);
      const gradesList = Object.values(grades);
      await testAttemptService.gradeAttempt(parseInt(attemptId!), { grades: gradesList });
      setSuccessOpen(true);
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const totalScore = Object.values(grades).reduce((sum, g) => sum + g.marks_obtained, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading attempt...</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-gray-500">Attempt not found</p>
      </div>
    );
  }

  const isPassed = totalScore >= (attempt.test?.passing_marks || 0);
  const percentage = attempt.total_marks > 0 ? (totalScore / attempt.total_marks) * 100 : 0;

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20 max-w-5xl mx-auto">
      {/* Success Modal */}
      <SuccessModal
        open={successOpen}
        title="Grades Saved"
        description="The grades have been submitted successfully."
        showButtons
        okText="Back to Attempts"
        onConfirm={() => {
          setSuccessOpen(false);
          navigate(`/tests/${attempt?.test_id}/attempts`);
        }}
        onClose={() => setSuccessOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/tests/${attempt.test_id}/attempts`)} className="text-gray-500 hover:text-saBlue">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              {attempt.is_graded ? 'View Grades' : 'Grade Test Attempt'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{attempt.test?.title}</p>
          </div>
        </div>
        {!attempt.is_graded && (
          <Button onClick={handleSaveGrades} disabled={saving} className="bg-saBlue hover:bg-saBlueDarkHover text-white">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Submit Grades'}
          </Button>
        )}
      </div>

      {/* Student Info & Score Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student Card */}
        <Card className="shadow-sm border border-gray-100 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-saBlue/10 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-saBlue" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{attempt.student?.user.name}</p>
              <p className="text-gray-500 text-sm">{attempt.student?.user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-400 text-xs">
                  Submitted: {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'N/A'}
                </p>
                {attempt.is_practice && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100 text-[10px] px-1.5 py-0">
                    <BookOpen className="w-3 h-3 mr-0.5" /> Practice
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Card */}
        <Card className="shadow-sm border border-gray-100 rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Score</p>
                  <p className="text-3xl font-extrabold text-gray-800">{totalScore}</p>
                </div>
                <div className="text-2xl text-gray-300">/</div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-3xl font-extrabold text-gray-800">{attempt.total_marks}</p>
                </div>
              </div>
              <Badge className={`${isPassed ? 'bg-green-500' : 'bg-red-500'} text-white border-none text-sm px-3 py-1`}>
                {isPassed ? 'Pass' : 'Fail'}
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Passing marks: {attempt.test?.passing_marks} · {percentage.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Answers */}
      <Card className="shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-lg text-gray-800">Answers Review</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {attempt.answers?.map((answer, index) => {
              const question = answer.question;
              if (!question) return null;
              const isAutoGraded = question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE';

              return (
                <div key={answer.id} className="p-5">
                  {/* Question */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-sm font-bold text-gray-600 flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-800">{question.question_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{question.question_type.replace('_', ' ')}</Badge>
                          <span className="text-xs text-gray-400">{question.marks} marks</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MCQ Options */}
                  {question.question_type === 'MCQ' && question.options && (
                    <div className="ml-10 mb-3 space-y-1.5">
                      {(question.options as any[]).map((option, optIndex) => {
                        const optionText = typeof option === 'string' ? option : option?.text || '';
                        const optionMediaUrl = typeof option === 'object' && option !== null ? option.media_url : null;
                        const optionMediaType = typeof option === 'object' && option !== null ? option.media_type : null;
                        const optionLetter = String.fromCharCode(65 + optIndex);
                        const isCorrect = optionText === question.correct_answer ||
                          optionLetter === question.correct_answer ||
                          (optionText === '' && question.correct_answer === optionLetter);

                        return (
                          <div key={optIndex} className={`p-2 rounded-lg text-sm ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
                            <span className={`${isCorrect ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                              {optionLetter}. {optionText}
                              {isCorrect && <CheckCircle className="inline w-3.5 h-3.5 ml-1 text-green-500" />}
                            </span>
                            {optionMediaUrl && optionMediaType === 'image' && (
                              <img src={optionMediaUrl} alt={`Option ${optionLetter}`} className="mt-1 max-w-xs max-h-24 rounded border" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Student Answer */}
                  <div className="ml-10 space-y-2">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Student's Answer</p>
                      {!answer.answer_text && !answer.answer_media_url ? (
                        <p className="text-sm text-gray-400 italic">Not answered</p>
                      ) : (
                        <>
                          {answer.answer_text && <p className="text-sm text-gray-700">{answer.answer_text}</p>}
                          {answer.answer_media_url && answer.answer_media_type === 'image' && (
                            <img src={answer.answer_media_url} alt="Student answer" className="mt-2 max-w-md max-h-48 rounded border" />
                          )}
                        </>
                      )}
                    </div>

                    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Correct Answer</p>
                      <p className="text-sm text-green-700 font-medium">{question.correct_answer}</p>
                    </div>
                  </div>

                  {/* Grading */}
                  <div className={`ml-10 mt-3 p-4 rounded-xl border ${isAutoGraded ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isAutoGraded ? (
                          <>
                            {grades[answer.id]?.is_correct ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                              Auto-graded: {grades[answer.id]?.is_correct ? 'Correct' : 'Incorrect'}
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <Award className="w-5 h-5 text-saBlue" />
                            <label className="text-sm font-medium text-gray-700">Marks:</label>
                            <Input
                              type="number"
                              min="0"
                              max={question.marks}
                              value={grades[answer.id]?.marks_obtained || 0}
                              onChange={(e) => handleGradeChange(answer.id, parseFloat(e.target.value) || 0, question.marks)}
                              className="w-20 h-8 text-center"
                              disabled={attempt.is_graded}
                            />
                            <span className="text-sm text-gray-500">/ {question.marks}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant={grades[answer.id]?.is_correct ? 'default' : 'destructive'} className="text-xs">
                        {grades[answer.id]?.marks_obtained || 0} / {question.marks}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Submit */}
      {!attempt.is_graded && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(`/tests/${attempt.test_id}/attempts`)}>Cancel</Button>
          <Button onClick={handleSaveGrades} disabled={saving} className="bg-saBlue hover:bg-saBlueDarkHover text-white px-8">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Submit Grades'}
          </Button>
        </div>
      )}
    </div>
  );
}
