import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, BookOpen, Clock, Trash2 } from 'lucide-react';
import { enrollmentService } from '@/services/api';
import type { Enrollment } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { useAuthStore } from '@/store/authStore';

const EnrollmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';

  useEffect(() => {
    if (id) {
      fetchEnrollment(parseInt(id));
    }
  }, [id]);

  const fetchEnrollment = async (enrollmentId: number) => {
    try {
      setLoading(true);
      const response = await enrollmentService.getById(enrollmentId);
      const enrollmentData = response.data;

      if (isStudent && enrollmentData.student_id !== user?.id) {
        navigate('/dashboard/enrollments');
        return;
      }

      setEnrollment(enrollmentData);
    } catch (error) {
      console.error('Error fetching enrollment:', error);
      navigate('/dashboard/enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!enrollment) return;

    try {
      await enrollmentService.delete(enrollment.id);
      navigate('/dashboard/enrollments');
    } catch (error) {
      console.error('Error deleting enrollment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEnrollmentTimeline = () => {
    if (!enrollment) return [];

    return [
      {
        date: enrollment.created_on,
        event: 'Enrolled',
        description: `Student enrolled in ${enrollment.subject.name}`,
      },
      {
        date: enrollment.updated_on,
        event: 'Last Updated',
        description: 'Enrollment details were last modified',
      },
    ].filter((item, index, arr) => index === 0 || item.date !== arr[index - 1].date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enrollment details...</p>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-500 mb-2">Enrollment not found</h2>
        <p className="text-gray-600 mb-4">
          The enrollment you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Link to="/dashboard/enrollments">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Enrollments
          </Button>
        </Link>
      </div>
    );
  }

  const timeline = getEnrollmentTimeline();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Left Side: Back + Title */}
        <div className="sm:flex-row items-start sm:items-center gap-4">
          <div
            onClick={() => navigate('/dashboard/enrollments')}
            className="inline-flex items-center text-sm sm:text-base text-blue-600 hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1" />
            Back to Enrollments
          </div>

          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Enrollment Details</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              View and manage enrollment information
            </p>
          </div>
        </div>

        {/* Right Side: Admin Actions */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              variant="outline"
              onClick={handleDelete}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-saVividOrange text-white hover:text-white hover:bg-saVividOrange"
            >
              <Trash2 className="h-4 w-4" />
              Delete Enrollment
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-600">
                <User className="h-5 w-5" /> Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-lg font-semibold text-gray-500">{enrollment.student.user.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-500">{enrollment.student.user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-gray-500">{enrollment.student.user.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Class</label>
                  <p className="text-gray-500">{enrollment.student.class?.name || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Board</label>
                  <p className="text-gray-500">{enrollment.student.board?.name || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-600">
                <BookOpen className="h-5 w-5" /> Subject Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Subject Name</label>
                  <p className="text-lg font-semibold text-gray-500">{enrollment.subject.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <Badge variant={enrollment.subject.is_course ? 'default' : 'secondary'}>
                    {enrollment.subject.is_course ? 'Course' : 'Subject'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Class</label>
                  <p className="text-gray-500">{enrollment.subject.class?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Board</label>
                  <p className="text-gray-500">{enrollment.subject.board?.name || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline & Quick Actions */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-gray-600">
                <Clock className="h-5 w-5" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      {index < timeline.length - 1 && (
                        <div className="w-px h-8 bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">{item.event}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                      <p className="text-xs text-gray-600">{formatDate(item.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-gray-600">
                <Clock className="h-5 w-5" /> Quick Actions
              </CardTitle>
          
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={`/dashboard/students/${enrollment.student.id}`}>
                <Button variant="outline" className="w-full justify-start text-gray-500 border border-saBlue/50 mb-2">
                  <User className="h-4 w-4 mr-2" />
                  View Student Profile
                </Button>
              </Link>
              <Link to={`/dashboard/subjects/${enrollment.subject.id}`}>
                <Button variant="outline" className="w-full justify-start text-gray-500 border border-saBlue/50">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Subject Details
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title={`Delete Enrollment for ${enrollment.student.user.name}?`}
        message={
          <div className="grid grid-cols-2 gap-3 text-left text-xs sm:text-sm text-gray-700">
            {/* Column 1: Student Info */}
            <div className="space-y-1">
              <p className="font-medium text-gray-600">Student</p>
              <p className="font-semibold text-gray-600">{enrollment.student.user.name}</p>
              <p className="text-gray-600">{enrollment.student.user.email}</p>

              <p className="font-medium text-gray-600 mt-2">Class</p>
              <p className="font-semibold text-gray-600">{enrollment.student.class?.name || 'N/A'}</p>

              <p className="font-medium text-gray-600 mt-2">Board</p>
              <p className="font-semibold text-gray-600">{enrollment.student.board?.name || 'N/A'}</p>
            </div>

            {/* Column 2: Subject Info */}
            <div className="space-y-1">
              <p className="font-medium text-gray-600">Subject</p>
              <p className="font-semibold text-gray-600">{enrollment.subject.name}</p>
              <div className="flex gap-1 flex-wrap mt-1">
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  Class: {enrollment.subject.class?.name || 'N/A'}
                </Badge>
                {enrollment.subject.is_course && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    Course
                  </Badge>
                )}
              </div>

              <p className="font-medium text-gray-600 mt-2">Enrolled On</p>
              <p className="font-semibold text-gray-600 text-[10px] sm:text-sm">
                {formatDate(enrollment.created_on)}
              </p>

              <p className="text-red-600 text-xs mt-1">*This action cannot be undone</p>
            </div>
          </div>
        }
        footer={
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        }
      />
    </div>
  );
};

export default EnrollmentDetailPage;
