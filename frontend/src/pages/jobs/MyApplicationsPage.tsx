import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  Building2,
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MyApplicationsPage() {
  usePageTitle('My Applications');
  const navigate = useNavigate();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteApplication, setDeleteApplication] = useState<JobApplication | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page: currentPage, limit };
      if (selectedStatus) params.status = selectedStatus;

      const response = await jobService.getMyApplications(params);
      setApplications(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error: any) {
      console.error('Failed to fetch applications:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch applications');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedStatus, limit]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleWithdraw = async () => {
    if (!deleteApplication) return;
    try {
      await jobService.withdrawApplication(deleteApplication.id);
      toast.success('Application withdrawn successfully');
      setDeleteApplication(null);
      fetchApplications();
    } catch (error: any) {
      console.error('Failed to withdraw application:', error);
      toast.error(error.response?.data?.error || 'Failed to withdraw application');
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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
            My Applications
          </h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            Track your job applications
          </p>
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
          <h3 className="text-lg font-bold text-gray-600">No applications yet</h3>
          <p className="text-gray-400 text-xs mt-1">Start applying to jobs and internships</p>
          <Button
            onClick={() => navigate('/dashboard/jobs')}
            className="mt-4 bg-saBlue hover:bg-saBlue/90 rounded-xl"
          >
            Browse Jobs
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-500 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-gray-100">
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 min-w-[250px]">
                    Position
                  </TableHead>
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
                          {application.job?.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Building2 className="h-3 w-3" />
                          {application.job?.company}
                          {application.job?.location && (
                            <>
                              <span>•</span>
                              {application.job.location}
                            </>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(application.applied_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-50"
                          onClick={() => navigate(`/dashboard/jobs/${application.job_id}`)}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        {application.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-50"
                            onClick={() => setDeleteApplication(application)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
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
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 p-0 text-xs rounded-lg ${
                            page === currentPage
                              ? 'bg-saBlue hover:bg-saBlue/90 text-white'
                              : ''
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="px-1 text-gray-400">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={!!deleteApplication}
        title="Withdraw Application"
        message={`Are you sure you want to withdraw your application for "${deleteApplication?.job?.title}"?`}
        onClose={() => setDeleteApplication(null)}
        onConfirm={handleWithdraw}
        onCancel={() => setDeleteApplication(null)}
      />
    </div>
  );
}
