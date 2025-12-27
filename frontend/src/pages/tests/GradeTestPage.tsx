import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, XCircle } from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt, GradeAnswerData } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function GradeTestPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [grades, setGrades] = useState<{ [answerId: number]: GradeAnswerData }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

      // Initialize grades
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
      alert('Failed to load test attempt');
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (answerId: number, marks: number, maxMarks: number) => {
    const isCorrect = marks > 0;
    const validMarks = Math.min(Math.max(0, marks), maxMarks);
    
    setGrades({
      ...grades,
      [answerId]: {
        answer_id: answerId,
        marks_obtained: validMarks,
        is_correct: isCorrect,
      },
    });
  };

  const handleSaveGrades = async () => {
    if (!confirm('Are you sure you want to submit these grades?')) return;

    try {
      setSaving(true);
      const gradesList = Object.values(grades);
      await testAttemptService.gradeAttempt(parseInt(attemptId!), { grades: gradesList });
      alert('Grades saved successfully!');
      navigate(`/tests/${attempt?.test_id}/attempts`);
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalScore = () => {
    return Object.values(grades).reduce((sum, grade) => sum + grade.marks_obtained, 0);
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!attempt) {
    return <div className="p-6 text-center">Attempt not found</div>;
  }

  const totalScore = calculateTotalScore();
  const isPassed = totalScore >= (attempt.test?.passing_marks || 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => navigate(`/tests/${attempt.test_id}/attempts`)}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Attempts
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Grade Test Attempt</h1>
          <p className="text-gray-600">{attempt.test?.title}</p>
          <p className="text-sm text-gray-500">
            Student: {attempt.student?.user.name} ({attempt.student?.user.email})
          </p>
        </div>
        {!attempt.is_graded && (
          <Button onClick={handleSaveGrades} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Grades'}
          </Button>
        )}
      </div>

      {/* Score Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Score Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-sm text-gray-600">Current Score</p>
                <p className="text-3xl font-bold">{totalScore}</p>
              </div>
              <div className="text-2xl text-gray-300">/</div>
              <div>
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-3xl font-bold">{attempt.total_marks}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Status</p>
              <Badge variant={isPassed ? 'default' : 'destructive'} className="text-lg px-4 py-1">
                {isPassed ? 'Pass' : 'Fail'}
              </Badge>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${isPassed ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${(totalScore / attempt.total_marks) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Passing marks: {attempt.test?.passing_marks}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Questions and Answers */}
      <Card>
        <CardHeader>
          <CardTitle>Answers Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {attempt.answers?.map((answer, index) => {
              const question = answer.question;
              if (!question) return null;

              const isAutoGraded =
                question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE';

              return (
                <div key={answer.id} className="border-b pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-semibold text-lg">
                      {index + 1}. {question.question_text}
                    </p>
                    <Badge variant="outline">{question.marks} marks</Badge>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">
                    Type: {question.question_type.replace('_', ' ')}
                  </p>

                  {/* Display options for MCQ */}
                  {question.question_type === 'MCQ' && question.options && (
                    <div className="ml-4 mb-3 space-y-1">
                      {(question.options as string[]).map((option, optIndex) => (
                        <p
                          key={optIndex}
                          className={`text-sm ${
                            option === question.correct_answer
                              ? 'text-green-600 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                          {option === question.correct_answer && ' ✓ (Correct)'}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="ml-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <p className="text-sm font-medium text-gray-600 min-w-[120px]">
                        Student Answer:
                      </p>
                      <p className="text-sm flex-1">
                        {answer.answer_text || <span className="text-gray-400">Not answered</span>}
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <p className="text-sm font-medium text-green-600 min-w-[120px]">
                        Correct Answer:
                      </p>
                      <p className="text-sm text-green-600">{question.correct_answer}</p>
                    </div>
                  </div>

                  {/* Grading */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {isAutoGraded ? (
                          <>
                            {grades[answer.id]?.is_correct ? (
                              <CheckCircle className="w-6 h-6 text-green-500" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              {grades[answer.id]?.is_correct
                                ? 'Automatically graded as correct'
                                : 'Automatically graded as incorrect'}
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-4">
                            <label className="text-sm font-medium">Marks Awarded:</label>
                            <Input
                              type="number"
                              min="0"
                              max={question.marks}
                              value={grades[answer.id]?.marks_obtained || 0}
                              onChange={(e) =>
                                handleGradeChange(
                                  answer.id,
                                  parseFloat(e.target.value) || 0,
                                  question.marks
                                )
                              }
                              className="w-20"
                              disabled={attempt.is_graded}
                            />
                            <span className="text-sm text-gray-600">/ {question.marks}</span>
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={grades[answer.id]?.is_correct ? 'default' : 'destructive'}
                      >
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

      {!attempt.is_graded && (
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveGrades} disabled={saving} size="lg">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving Grades...' : 'Save & Submit Grades'}
          </Button>
        </div>
      )}
    </div>
  );
}
