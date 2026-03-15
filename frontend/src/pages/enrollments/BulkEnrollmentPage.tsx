import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Check } from 'lucide-react';
import { enrollmentService, studentService, subjectService } from '@/services/api';
import type { Student, Subject, BulkEnrollmentData } from '@/types';
import type { AxiosError } from 'axios';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from "@/hooks/usePageTitle";

import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';

const BulkEnrollmentPage: React.FC = () => {
  usePageTitle("Bulk Enrollment");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('all');
  const [studentBoardFilter, setStudentBoardFilter] = useState('all');
  const [subjectClassFilter, setSubjectClassFilter] = useState('all');
  const [subjectBoardFilter, setSubjectBoardFilter] = useState('all');
  const [subjectCourseFilter, setSubjectCourseFilter] = useState<'all' | 'course' | 'non-course'>('all');
  const [subjectStatusFilter, setSubjectStatusFilter] = useState<'active' | 'all'>('active');

  const [formData, setFormData] = useState<BulkEnrollmentData>({
    student_ids: [],
    subject_id: 0,
  });

  const [errors, setErrors] = useState<Partial<BulkEnrollmentData>>({});
  const isAdmin = user?.role === 'ADMIN';

  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
  // Validation
  // ----------------------------
  const validateForm = (): boolean => {
    const newErrors: Partial<BulkEnrollmentData> = {};

    if (formData.student_ids.length === 0) newErrors.student_ids = [];
    if (!formData.subject_id) newErrors.subject_id = 0;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ----------------------------
  // Submit Form
  // ----------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await enrollmentService.bulkCreate(formData);
      setSuccessOpen(true);
    } catch (err: unknown) {
      let message = 'Failed to create enrollments. Please try again.';
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

  // ----------------------------
  // Student Selection Logic
  // ----------------------------
  const handleStudentToggle = (studentId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      student_ids: checked
        ? [...prev.student_ids, studentId]
        : prev.student_ids.filter(id => id !== studentId),
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      student_ids: checked ? filteredStudents.map(s => s.id) : [],
    }));
  };

  const studentClassOptions = Array.from(new Set(students.map(s => s.class?.name).filter(Boolean))) as string[];
  const studentBoardOptions = Array.from(new Set(students.map(s => s.board?.name).filter(Boolean))) as string[];
  const subjectClassOptions = Array.from(new Set(subjects.map(s => s.class?.name).filter(Boolean))) as string[];
  const subjectBoardOptions = Array.from(new Set(subjects.map(s => s.board?.name).filter(Boolean))) as string[];

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.user.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.user.email.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesClass = studentClassFilter === 'all' || (s.class?.name ?? '') === studentClassFilter;
    const matchesBoard = studentBoardFilter === 'all' || (s.board?.name ?? '') === studentBoardFilter;

    return matchesSearch && matchesClass && matchesBoard;
  });

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(subjectSearch.toLowerCase());
    const matchesClass = subjectClassFilter === 'all' || (s.class?.name ?? '') === subjectClassFilter;
    const matchesBoard = subjectBoardFilter === 'all' || (s.board?.name ?? '') === subjectBoardFilter;

    const isEndedCourse = Boolean(s.is_course && s.end_date && new Date(s.end_date) < new Date());
    const matchesStatus = subjectStatusFilter === 'all' || !isEndedCourse;

    const matchesCourseType =
      subjectCourseFilter === 'all' ||
      (subjectCourseFilter === 'course' && s.is_course) ||
      (subjectCourseFilter === 'non-course' && !s.is_course);

    return matchesSearch && matchesClass && matchesBoard && matchesStatus && matchesCourseType;
  });

  const selectedSubject = subjects.find(s => s.id === formData.subject_id);
  const selectedStudents = students.filter(s => formData.student_ids.includes(s.id));

  return (
    <div className="space-y-6 px-3 sm:px-4 md:px-6 lg:px-8">

      {/* SUCCESS MODAL */}
      <SuccessModal
        open={successOpen}
        title="Bulk Enrollment Successful"
        description={`Successfully enrolled ${formData.student_ids.length} students.`}
        okText="OK"
        showButtons={true}
        onConfirm={() => navigate('/dashboard/enrollments')}
        onClose={() => navigate('/dashboard/enrollments')}
      />

      {/* ERROR MODAL */}
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        okText="Close"
        showButtons={true}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Bulk Enrollment</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Enroll multiple students in a subject
          </p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-full md:max-w-4xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-gray-600">
            Bulk Enrollment Details
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Subject Dropdown */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>

              <Select
                value={formData.subject_id.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, subject_id: parseInt(value) })
                }
              >
                <SelectTrigger className={`h-11 ${errors.subject_id ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>

                <SelectContent>
                  <div className="px-2 py-1.5 sticky top-0 bg-popover border-b">
                    <Input
                      placeholder="Search subject..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-7 text-xs"
                    />
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={subjectClassFilter}
                        onChange={(e) => setSubjectClassFilter(e.target.value)}
                        className="h-8 rounded-md border border-gray-300 px-2 text-xs bg-white"
                      >
                        <option value="all">All Classes</option>
                        {subjectClassOptions.map((className) => (
                          <option key={className} value={className}>{className}</option>
                        ))}
                      </select>
                      <select
                        value={subjectBoardFilter}
                        onChange={(e) => setSubjectBoardFilter(e.target.value)}
                        className="h-8 rounded-md border border-gray-300 px-2 text-xs bg-white"
                      >
                        <option value="all">All Boards</option>
                        {subjectBoardOptions.map((boardName) => (
                          <option key={boardName} value={boardName}>{boardName}</option>
                        ))}
                      </select>
                      <select
                        value={subjectCourseFilter}
                        onChange={(e) => setSubjectCourseFilter(e.target.value as 'all' | 'course' | 'non-course')}
                        className="h-8 rounded-md border border-gray-300 px-2 text-xs bg-white"
                      >
                        <option value="all">All Types</option>
                        <option value="course">Courses Only</option>
                        <option value="non-course">Non-courses</option>
                      </select>
                      <select
                        value={subjectStatusFilter}
                        onChange={(e) => setSubjectStatusFilter(e.target.value as 'active' | 'all')}
                        className="h-8 rounded-md border border-gray-300 px-2 text-xs bg-white"
                      >
                        <option value="active">Active Only</option>
                        <option value="all">Include Ended</option>
                      </select>
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                  {filteredSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id.toString()} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-xs text-gray-500">
                          Class: {subject.class?.name ?? 'N/A'} • Board: {subject.board?.name ?? 'N/A'}
                          {subject.is_course && ' • Course'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {filteredSubjects.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">No subjects found</p>
                  )}
                  </div>
                </SelectContent>
              </Select>

              {errors.subject_id && (
                <p className="text-red-600 text-sm mt-1">Please select a subject</p>
              )}
            </div>

            {/* Students List */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                <label className="block text-sm font-medium text-gray-700">Students *</label>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={filteredStudents.length > 0 && filteredStudents.every(s => formData.student_ids.includes(s.id))}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                  />
                  <label htmlFor="select-all" className="text-sm text-gray-700">
                    Select All ({filteredStudents.length})
                  </label>
                </div>
              </div>

              <div className={`border rounded-lg p-4 max-h-80 sm:max-h-96 overflow-y-auto bg-white
                ${errors.student_ids ? 'border-red-500' : ''}`}>

                <div className="mb-3">
                  <Input
                    placeholder="Search by name or email..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={studentClassFilter}
                    onChange={(e) => setStudentClassFilter(e.target.value)}
                    className="h-8 rounded-md border border-gray-300 px-2 text-xs bg-white"
                  >
                    <option value="all">All Classes</option>
                    {studentClassOptions.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>

                  <select
                    value={studentBoardFilter}
                    onChange={(e) => setStudentBoardFilter(e.target.value)}
                    className="h-8 rounded-md border border-gray-300 px-2 text-xs bg-white"
                  >
                    <option value="all">All Boards</option>
                    {studentBoardOptions.map((boardName) => (
                      <option key={boardName} value={boardName}>{boardName}</option>
                    ))}
                  </select>
                </div>

                {students.length === 0 ? (
                  <p className="text-center text-gray-500">No students available</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm">No students match your search</p>
                ) : (
                  <div className="space-y-3">
                    {filteredStudents.map(student => (
                      <div
                        key={student.id}
                        className="flex items-start sm:items-center gap-3 p-2 rounded hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={formData.student_ids.includes(student.id)}
                          onCheckedChange={(checked) =>
                            handleStudentToggle(student.id, checked as boolean)
                          }
                        />

                        <div>
                          <p className="font-medium text-sm sm:text-base">{student.user.name}</p>
                          <p className="text-xs text-gray-500">
                            {student.user.email} • Class: {student.class?.name ?? 'N/A'} • Board: {student.board?.name ?? 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {errors.student_ids && (
                <p className="text-red-600 text-sm mt-1">
                  Please select at least one student
                </p>
              )}
            </div>

            {/* Preview Section */}
            {selectedSubject && selectedStudents.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Preview</h3>

                <p className="text-sm text-gray-700 mb-2">
                  <strong>Subject:</strong> {selectedSubject.name}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedStudents.map(student => (
                    <Badge
                      key={student.id}
                      variant="secondary"
                      className="text-xs py-1 px-2 flex items-center"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {student.user.name}
                    </Badge>
                  ))}
                </div>

                <p className="text-sm text-gray-700">
                  <strong>Total:</strong> {selectedStudents.length} students
                </p>
              </div>
            )}

            {/* Action Buttons */}
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
                    Create {formData.student_ids.length} Enrollment
                    {formData.student_ids.length !== 1 ? 's' : ''}
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

export default BulkEnrollmentPage;
