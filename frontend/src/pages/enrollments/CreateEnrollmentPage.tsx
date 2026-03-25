import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { enrollmentService, studentService, subjectService, testSeriesService, activityGroupService } from '@/services/api';
import type { Student, Subject, TestSeries, ActivityGroup } from '@/types';
import type { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import { usePageTitle } from "@/hooks/usePageTitle";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type EnrollmentType = 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_yearly', label: 'Semi-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const CreateEnrollmentPage: React.FC = () => {
  usePageTitle("New Enrollment");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>('SUBJECT');

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);

  const [loading, setLoading] = useState(false);

  // SUCCESS MODAL
  const [successOpen, setSuccessOpen] = useState(false);

  // ERROR MODAL
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    student_id: 0,
    item_id: 0,
    price: null as number | null,
    is_recurring: false,
    frequency: null as string | null,
    end_date: null as string | null,
    one_time_amount: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, any>>({});
  const isAdmin = user?.role === 'ADMIN';

  const [studentSearch, setStudentSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectPage, setSubjectPage] = useState(1);

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'test-series') setEnrollmentType('TEST_SERIES');
    else if (typeParam === 'activity-groups') setEnrollmentType('ACTIVITY_GROUP');
    else setEnrollmentType('SUBJECT');
  }, [searchParams]);

  // ----------------------------
  // Fetch Data
  // ----------------------------
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch Students
      const studentRes = await studentService.getAll({ limit: 100 });
      setStudents(studentRes.data.data);

      // Fetch Items based on type
      if (enrollmentType === 'SUBJECT') {
        const params: Record<string, unknown> = { limit: 100 };
        if (user?.role === 'TEACHER' && user.id) {
          params.user_id = user.id;
          params.role = user.role;
        }
        const subjectRes = await subjectService.getAll(params);
        setSubjects(subjectRes.data.data);
      } else if (enrollmentType === 'TEST_SERIES') {
        const testRes = await testSeriesService.getAll({ limit: 100 });
        setTestSeries(testRes.data.data);
      } else if (enrollmentType === 'ACTIVITY_GROUP') {
        const activityRes = await activityGroupService.getAll({ limit: 100 });
        setActivityGroups(activityRes.data.activityGroups);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setErrorMessage('Failed to load data.');
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  }, [enrollmentType, user]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard/enrollments');
      return;
    }
    fetchData();
  }, [isAdmin, navigate, fetchData]);

  // Reset item_id when type changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, item_id: 0 }));
  }, [enrollmentType]);

  // ----------------------------
  // Validate Form
  // ----------------------------
  const validateForm = (): boolean => {
    const newErrors: Record<string, any> = {};

    if (!formData.student_id) newErrors.student_id = true;
    if (!formData.item_id) newErrors.item_id = true;

    // If recurring is enabled, price and frequency are required
    if (formData.is_recurring) {
      if (!formData.price || formData.price <= 0) {
        newErrors.price = true;
      }
      if (!formData.frequency) {
        newErrors.frequency = true;
      }
    } else {
      // If not recurring, one-time amount is required (0 is allowed for free enrollments)
      if (formData.one_time_amount === null || formData.one_time_amount === undefined || formData.one_time_amount < 0) {
        newErrors.one_time_amount = true;
      }
    }

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
      const commonData = {
        student_id: formData.student_id,
        price: formData.price,
        is_recurring: formData.is_recurring,
        frequency: formData.frequency,
        end_date: formData.end_date,
        one_time_amount: formData.one_time_amount,
      };

      if (enrollmentType === 'SUBJECT') {
        await enrollmentService.create({
          ...commonData,
          subject_id: formData.item_id,
        });
      } else if (enrollmentType === 'TEST_SERIES') {
        await testSeriesService.enroll(formData.item_id, commonData);
      } else if (enrollmentType === 'ACTIVITY_GROUP') {
        await activityGroupService.enroll(formData.item_id, commonData);
      }

      setSuccessOpen(true);
    } catch (err: unknown) {
      let message = "Failed to create enrollment. Please try again.";

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

  const filteredStudents = students.filter(s =>
    s.user.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.user.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredSubjects = subjects.filter(s => {
    if (s.is_course && s.end_date && new Date(s.end_date) < new Date()) return false;
    return s.name.toLowerCase().includes(subjectSearch.toLowerCase());
  });

  const subjectPageSize = 10;
  const totalSubjectPages = Math.max(1, Math.ceil(filteredSubjects.length / subjectPageSize));
  const pagedSubjects = filteredSubjects.slice((subjectPage - 1) * subjectPageSize, subjectPage * subjectPageSize);

  useEffect(() => {
    setSubjectPage(1);
  }, [subjectSearch, enrollmentType]);

  useEffect(() => {
    if (subjectPage > totalSubjectPages) {
      setSubjectPage(totalSubjectPages);
    }
  }, [subjectPage, totalSubjectPages]);

  const selectedStudent = students.find((s) => s.id === formData.student_id);

  let selectedItem: any = null;
  if (enrollmentType === 'SUBJECT') selectedItem = subjects.find(s => s.id === formData.item_id);
  else if (enrollmentType === 'TEST_SERIES') selectedItem = testSeries.find(s => s.id === formData.item_id);
  else if (enrollmentType === 'ACTIVITY_GROUP') selectedItem = activityGroups.find(s => s.id === formData.item_id);

  return (
    <div className="relative space-y-6">

      {/* SUCCESS MODAL */}
      <SuccessModal
        open={successOpen}
        title="Enrollment Successful"
        description={
          selectedStudent && selectedItem
            ? `${selectedStudent.user.name} has been enrolled in ${selectedItem.name || selectedItem.title} successfully.${
                !formData.is_recurring && formData.one_time_amount && formData.one_time_amount > 0
                  ? ' A payment notification has been sent to the student.'
                  : ''
              }`
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
            Enroll a student in a Subject, Test Series, or Activity Group
          </p>
        </div>
      </div>

      {/* Card */}
      <Card className="w-full max-w-full md:max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="sm:text-xl text-xl text-gray-600">Enrollment Details</CardTitle>
        </CardHeader>

        <CardContent>

          {/* Enrollment Type Tabs */}
          <Tabs
            value={enrollmentType}
            onValueChange={(val) => setEnrollmentType(val as EnrollmentType)}
            className="mb-6"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="SUBJECT">Subject</TabsTrigger>
              <TabsTrigger value="TEST_SERIES">Test Series</TabsTrigger>
              <TabsTrigger value="ACTIVITY_GROUP">Activity Group</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Student Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>

              <Select
                value={formData.student_id ? formData.student_id.toString() : ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, student_id: parseInt(value) })
                }
              >
                <SelectTrigger className={`${errors.student_id ? 'border-red-500' : ''} h-11`}>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>

                <SelectContent>
                  <div className="px-2 py-1.5 sticky top-0 bg-popover border-b">
                    <Input
                      placeholder="Search student..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{student.user.name}</span>
                          <span className="text-xs text-gray-500">
                            {student.user.email} • Class: {student.class?.name ?? 'N/A'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                    {filteredStudents.length === 0 && (
                      <p className="py-4 text-center text-xs text-gray-400">No students found</p>
                    )}
                  </div>
                </SelectContent>
              </Select>

              {errors.student_id && (
                <p className="text-red-600 text-sm mt-1">Please select a student</p>
              )}
            </div>

            {/* Item Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {enrollmentType === 'SUBJECT' ? 'Subject' : enrollmentType === 'TEST_SERIES' ? 'Test Series' : 'Activity Group'} *
              </label>

              <Select
                value={formData.item_id ? formData.item_id.toString() : ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, item_id: parseInt(value) })
                }
              >
                <SelectTrigger className={`${errors.item_id ? 'border-red-500' : ''} h-11`}>
                  <SelectValue placeholder={`Select a ${enrollmentType === 'SUBJECT' ? 'subject' : enrollmentType === 'TEST_SERIES' ? 'test series' : 'activity group'}`} />
                </SelectTrigger>

                <SelectContent>
                  {enrollmentType === 'SUBJECT' && (
                    <div className="px-2 py-1.5 sticky top-0 bg-popover border-b">
                      <Input
                        placeholder="Search subject..."
                        value={subjectSearch}
                        onChange={(e) => setSubjectSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="h-7 text-xs"
                      />
                    </div>
                  )}
                  <div className="max-h-52 overflow-y-auto">
                  {enrollmentType === 'SUBJECT' && pagedSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{subject.name}</span>
                        <span className="text-xs text-gray-500">
                          Class: {subject.class?.name ?? 'N/A'} • {subject.is_course && 'Course'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {enrollmentType === 'SUBJECT' && filteredSubjects.length === 0 && (
                    <p className="py-4 text-center text-xs text-gray-400">No subjects found</p>
                  )}
                  {enrollmentType === 'TEST_SERIES' && testSeries.map((series) => (
                    <SelectItem key={series.id} value={series.id.toString()}>
                      {series.title}
                    </SelectItem>
                  ))}
                  {enrollmentType === 'ACTIVITY_GROUP' && activityGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                  </div>
                  {enrollmentType === 'SUBJECT' && filteredSubjects.length > subjectPageSize && (
                    <div className="sticky bottom-0 bg-popover border-t px-2 py-1.5 flex items-center justify-between">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSubjectPage((prev) => Math.max(1, prev - 1));
                        }}
                        disabled={subjectPage === 1}
                      >
                        Prev
                      </Button>
                      <span className="text-[10px] text-gray-500">Page {subjectPage} / {totalSubjectPages}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[10px]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSubjectPage((prev) => Math.min(totalSubjectPages, prev + 1));
                        }}
                        disabled={subjectPage === totalSubjectPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </SelectContent>
              </Select>

              {errors.item_id && (
                <p className="text-red-600 text-sm mt-1">Please select an item</p>
              )}
            </div>

            {/* Payment Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Payment Settings</h3>

              {/* Recurring Payment Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                  className="h-4 w-4 text-saBlue focus:ring-saBlue border-gray-300 rounded"
                />
                <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">
                  Enable Recurring Payments
                </label>
              </div>

              {!formData.is_recurring && (
                <>
                  {/* One-time Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">One-time Amount (₹) *</label>
                    <input
                      type="number"
                      value={formData.one_time_amount ?? ''}
                      onChange={(e) => setFormData({ ...formData, one_time_amount: e.target.value === '' ? null : parseFloat(e.target.value) })}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-saBlue focus:border-saBlue ${errors.one_time_amount ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter one-time payment amount"
                      min="0"
                      step="0.01"
                    />
                    {errors.one_time_amount && (
                      <p className="text-red-600 text-sm mt-1">Please enter a valid amount</p>
                    )}
                  </div>
                </>
              )}

              {formData.is_recurring && (
                <>
                  {/* Price Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
                    <input
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || null })}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-saBlue focus:border-saBlue ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter price per period"
                      min="0"
                      step="0.01"
                    />
                    {errors.price && (
                      <p className="text-red-600 text-sm mt-1">Please enter a valid price</p>
                    )}
                  </div>

                  {/* Frequency Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency *</label>
                    <Select
                      value={formData.frequency || ''}
                      onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                    >
                      <SelectTrigger className={`${errors.frequency ? 'border-red-500' : 'border-gray-300'} h-11 bg-white focus:ring-saBlue focus:border-saBlue`}>
                        <SelectValue placeholder="Select payment frequency" />
                      </SelectTrigger>
                      <SelectContent className="border border-gray-200 bg-white shadow-lg">
                        {FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="py-2.5">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.frequency && (
                      <p className="text-red-600 text-sm mt-1">Please select a frequency</p>
                    )}
                  </div>

                  {/* End Date (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                    <input
                      type="date"
                      value={formData.end_date || ''}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-saBlue focus:border-saBlue"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for ongoing payments</p>
                  </div>
                </>
              )}
            </div>

            {/* Preview */}
            {selectedStudent && selectedItem && (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Enrollment Preview</h3>

                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Student:</strong> {selectedStudent.user.name}</p>
                  <p><strong>Email:</strong> {selectedStudent.user.email}</p>
                  <p><strong>Type:</strong> {enrollmentType.replace('_', ' ')}</p>
                  <p><strong>Item:</strong> {selectedItem.name || selectedItem.title}</p>
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

              <Button type="submit" className="w-full sm:w-auto bg-saBlue hover:bg-saBlueDarkHover" disabled={loading}>
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
