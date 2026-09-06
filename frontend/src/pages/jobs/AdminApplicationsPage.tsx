import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { jobService } from '@/services/api';
import type { JobApplication } from '@/types';
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  User,
  Download,
  Check,
  X,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminApplicationsPage() {
  const { job_id } = useParams();
  const navigate = useNavigate();
  const isSpecificJob = !!job_id;

  usePageTitle(isSpecificJob ? 'Job Applications' : 'All Applications');

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page: currentPage, limit };
      if (selectedStatus) params.status = selectedStatus;

      const response = isSpecificJob
        ? await jobService.getJobApplications(parseInt(job_id!), params)
        : await jobService.getAllApplications(params);

      setApplications(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error: any) {
      console.error('Failed to fetch applications:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch applications');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedStatus, limit, isSpecificJob, job_id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleReview = async (applicationId: number, status: 'REVIEWED' | 'ACCEPTED' | 'REJECTED') => {
    try {
      setIsReviewing(true);
      await jobService.reviewApplication(applicationId, status, reviewFeedback || undefined);
      toast.success(`Application ${status.toLowerCase()} successfully`);
      setSelectedApplication(null);
      setReviewFeedback('');
      fetchApplications();
    } catch (error: any) {
      console.error('Failed to review application:', error);
      toast.error(error.response?.data?.error || 'Failed to review application');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleFilterChange = () => setCurrentPage(1);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'REVIEWED':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Reviewed</Badge>;
      case 'ACCEPTED':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Accepted</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isSpecificJob && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/jobs')}
              className="h-9 px-3 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
              {isSpecificJob ? 'Job Applications' : 'All Applications'}
            </h1>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
              Review and manage applications
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            handleFilterChange();
          }}
          className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 focus:outline-none focus:ring-2 focus:ring-saBlue/10 cursor-pointer min-w-[150px]"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">
            Loading Applications...
          </p>
        </div>
      ) : applications.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-600">No applications found</h3>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-500 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-gray-100">
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 min-w-[200px]">
                    Student
                  </TableHead>
                  {!isSpecificJob && (
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[200px] hidden lg:table-cell">
                      Position
                    </TableHead>
                  )}
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[120px] hidden md:table-cell">
                    Applied On
                  </TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[120px]">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow
                    key={application.id}
                    className="hover:bg-blue-50/30 border-b-gray-50 transition-colors"
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-900">
                          {application.student?.user?.name || application.teacher?.user?.name}
                        </span>
                        <span className="text-xs text-gray-500">{application.student?.user?.email || application.teacher?.user?.email}</span>
                      </div>
                    </TableCell>
                    {!isSpecificJob && (
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-gray-900">{application.job?.title}</span>
                          <span className="text-xs text-gray-500">{application.job?.company}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(application.applied_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 hover:bg-blue-50 text-blue-600 font-medium"
                        onClick={() => setSelectedApplication(application)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium">
                Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of{' '}
                {total} applications
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 px-3 text-xs rounded-lg"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 px-3 text-xs rounded-lg"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Application Review</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedApplication.student?.user?.name || selectedApplication.teacher?.user?.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedApplication(null);
                    setReviewFeedback('');
                  }}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>

              {/* Application Details */}
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Position
                  </h3>
                  <p className="text-base font-semibold text-gray-900">{selectedApplication.job?.title}</p>
                  <p className="text-sm text-gray-500">{selectedApplication.job?.company}</p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Applicant Info
                  </h3>
                  <p className="text-sm text-gray-700">{selectedApplication.student?.user?.email || selectedApplication.teacher?.user?.email}</p>
                  <p className="text-sm text-gray-700">{selectedApplication.student?.user?.phone || selectedApplication.teacher?.user?.phone}</p>
                  {selectedApplication.teacher && (
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg">Teacher</span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Cover Letter
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">
                    {selectedApplication.cover_letter}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                    CV/Resume
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedApplication.cv_url, '_blank')}
                    className="rounded-xl"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CV
                  </Button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Current Status
                  </h3>
                  {getStatusBadge(selectedApplication.status)}
                </div>

                {selectedApplication.feedback && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Previous Feedback
                    </h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl">
                      {selectedApplication.feedback}
                    </p>
                  </div>
                )}
              </div>

              {/* Review Actions */}
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Feedback (Optional)
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    rows={4}
                    placeholder="Add feedback for the applicant..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saBlue/20 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleReview(selectedApplication.id, 'REVIEWED')}
                    disabled={isReviewing}
                    variant="outline"
                    className="flex-1 rounded-xl"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Mark as Reviewed
                  </Button>
                  <Button
                    onClick={() => handleReview(selectedApplication.id, 'ACCEPTED')}
                    disabled={isReviewing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleReview(selectedApplication.id, 'REJECTED')}
                    disabled={isReviewing}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
