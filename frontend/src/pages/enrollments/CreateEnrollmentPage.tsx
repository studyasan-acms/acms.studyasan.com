import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { enrollmentService, studentService, subjectService } from '@/services/api';
import type { Student, Subject, CreateEnrollmentData } from '@/types';
import type { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';

const CreateEnrollmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  // SUCCESS MODAL
  const [successOpen, setSuccessOpen] = useState(false);

  // ERROR MODAL
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState<CreateEnrollmentData>({
    student_id: 0,
    subject_id: 0,
  });

  const [errors, setErrors] = useState<Partial<CreateEnrollmentData>>({});
  const isAdmin = user?.role === 'ADMIN';

  // ----------------------------
  // Fetch Students
  // ----------------------------
  const fetchStudents = useCallback(async () => {
    try {
      const response = await studentService.getAll({ limit: 100 });
      setStudents(response.data.data);
    } catch {
      setErrorMessage('Failed to load students.');
      setErrorOpen(true);
    }
  }, []);

  // ----------------------------
  // Fetch Subjects
  // ----------------------------
  const fetchSubjects = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { limit: 100 };

      if (user?.role === 'TEACHER' && user.id) {
        params.user_id = user.id;
        params.role = user.role;
      }

      const response = await subjectService.getAll(params);
      setSubjects(response.data.data);
    } catch {
      setErrorMessage('Failed to load subjects.');
      setErrorOpen(true);
    }
  }, [user]);

  // ----------------------------
  // useEffect
  // ----------------------------
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard/enrollments');
      return;
    }
    fetchStudents();
    fetchSubjects();
  }, [isAdmin, navigate, fetchStudents, fetchSubjects]);

  // ----------------------------
  // Validate Form
  // ----------------------------
  const validateForm = (): boolean => {
    const newErrors: Partial<CreateEnrollmentData> = {};

    if (!formData.student_id) newErrors.student_id = 0;
    if (!formData.subject_id) newErrors.subject_id = 0;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ----------------------------
  // Submit Handler
  // ----------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await enrollmentService.create(formData);
      setSuccessOpen(true);
    } catch (err: unknown) {
      let message = "Failed to create enrollment. Please try again.";

      // ---- FIX: NO ANY USED ----
      const axiosErr = err as AxiosError<{ message?: string }>;

      if (axiosErr.response?.data?.message) {
        message = axiosErr.response.data.message;
      }

      setErrorMessage(message);
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === formData.student_id);
  const selectedSubject = subjects.find((s) => s.id === formData.subject_id);

  return (
    <div className="relative space-y-6">

      {/* SUCCESS MODAL */}
      <SuccessModal
        open={successOpen}
        title="Enrollment Successful"
        description={
          selectedStudent && selectedSubject
            ? `${selectedStudent.user.name} has been enrolled in ${selectedSubject.name} successfully.`
            : "Enrollment completed successfully."
        }
        showButtons={true}
        cancelText=""
        okText="OK"
        onConfirm={() => navigate('/dashboard/enrollments')}
        onClose={() => navigate('/dashboard/enrollments')}
      />

      {/* ERROR MODAL */}
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        showButtons={true}
        cancelText=""
        okText="Close"
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col gap-3">
        <div
          onClick={() => navigate('/dashboard/enrollments')}
          className="inline-flex items-center text-sm sm:text-base text-blue-600 hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
          Back to Enrollments
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Create Enrollment</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Enroll a student in a subject
          </p>
        </div>
      </div>

      {/* Card */}
      <Card className="w-full max-w-full md:max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="sm:text-xl text-xl text-gray-600">Enrollment Details</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Student Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>

              <Select
                value={formData.student_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, student_id: parseInt(value) })
                }
              >
                <SelectTrigger className={`${errors.student_id ? 'border-red-500' : ''} h-11`}>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>

                <SelectContent className="max-h-60 overflow-y-auto">
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{student.user.name}</span>
                        <span className="text-xs text-gray-500">
                          {student.user.email} • Class: {student.class?.name ?? 'N/A'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.student_id && (
                <p className="text-red-600 text-sm mt-1">Please select a student</p>
              )}
            </div>

            {/* Subject Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>

              <Select
                value={formData.subject_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, subject_id: parseInt(value) })
                }
              >
                <SelectTrigger className={`${errors.subject_id ? 'border-red-500' : ''} h-11`}>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>

                <SelectContent className="max-h-60 overflow-y-auto">
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-xs text-gray-500">
                          Class: {subject.class?.name ?? 'N/A'} • Board: {subject.board?.name ?? 'N/A'}{' '}
                          {subject.is_course && '• Course'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.subject_id && (
                <p className="text-red-600 text-sm mt-1">Please select a subject</p>
              )}
            </div>

            {/* Preview */}
            {selectedStudent && selectedSubject && (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Enrollment Preview</h3>

                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Student:</strong> {selectedStudent.user.name}</p>
                  <p><strong>Email:</strong> {selectedStudent.user.email}</p>
                  <p><strong>Class:</strong> {selectedStudent.class?.name ?? 'N/A'}</p>
                  <p><strong>Board:</strong> {selectedStudent.board?.name ?? 'N/A'}</p>
                  <p><strong>Subject:</strong> {selectedSubject.name}</p>
                  <p><strong>Subject Class:</strong> {selectedSubject.class?.name ?? 'N/A'}</p>
                  <p><strong>Subject Board:</strong> {selectedSubject.board?.name ?? 'N/A'}</p>
                  <p><strong>Type:</strong> {selectedSubject.is_course ? 'Course' : 'Subject'}</p>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate('/dashboard/enrollments')}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Enrollment
                  </>
                )}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEnrollmentPage;
