import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useAuthStore } from '@/store/authStore';
import type { Job, JobApplication } from '@/types';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Search,
  MapPin,
  Calendar,
  Building2,
  FileText,
  ClipboardList,
} from 'lucide-react';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { isStudentTillClass12 } from '@/utils/studentUtils';
import { toast } from 'sonner';
import { format } from 'date-fns';

type TabType = 'jobs' | 'applications';

export default function JobsPage() {
  usePageTitle('Jobs & Internships');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT';
  const isRestrictedStudent = isStudent && isStudentTillClass12(user);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'jobs');

  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [deleteJob, setDeleteJob] = useState<Job | null>(null);

  // Applications state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [deleteApplication, setDeleteApplication] = useState<JobApplication | null>(null);

  // Jobs Pagination
  const [jobsCurrentPage, setJobsCurrentPage] = useState(1);
  const [jobsTotalPages, setJobsTotalPages] = useState(1);
  const [jobsTotal, setJobsTotal] = useState(0);

  // Applications Pagination
  const [appsCurrentPage, setAppsCurrentPage] = useState(1);
  const [appsTotalPages, setAppsTotalPages] = useState(1);
  const [appsTotal, setAppsTotal] = useState(0);

  const limit = 10;

  // Jobs Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [jobsSelectedStatus, setJobsSelectedStatus] = useState<string>('');

  // Applications Filters
  const [appsSelectedStatus, setAppsSelectedStatus] = useState<string>('');

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    try {
      const params: any = { page: jobsCurrentPage, limit };
      if (searchTerm) params.search = searchTerm;
      if (selectedType) params.type = selectedType;
      if (jobsSelectedStatus) params.status = jobsSelectedStatus;

      const response = await jobService.getAllJobs(params);
      setJobs(response.data.data);
      setJobsTotalPages(response.data.pagination.totalPages);
      setJobsTotal(response.data.pagination.total);
    } catch (error: any) {
      console.error('Failed to fetch jobs:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch jobs');
    } finally {
      setIsLoadingJobs(false);
    }
  }, [jobsCurrentPage, searchTerm, selectedType, jobsSelectedStatus, limit]);

  // Fetch Applications
  const fetchApplications = useCallback(async () => {
    if (!isStudent) return;
    setIsLoadingApplications(true);
    try {
      const params: any = { page: appsCurrentPage, limit };
      if (appsSelectedStatus) params.status = appsSelectedStatus;

      const response = await jobService.getMyApplications(params);
      setApplications(response.data.data);
      setAppsTotalPages(response.data.pagination.totalPages);
      setAppsTotal(response.data.pagination.total);
    } catch (error: any) {
      console.error('Failed to fetch applications:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch applications');
    } finally {
      setIsLoadingApplications(false);
    }
  }, [appsCurrentPage, appsSelectedStatus, limit, isStudent]);

  useEffect(() => {
    if (activeTab === 'jobs') {
      fetchJobs();
    } else if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [activeTab, fetchJobs, fetchApplications]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleDeleteJob = async () => {
    if (!deleteJob) return;
    try {
      await jobService.deleteJob(deleteJob.id);
      toast.success('Job deleted successfully');
      setDeleteJob(null);
      fetchJobs();
    } catch (error: any) {
      console.error('Failed to delete job:', error);
      toast.error(error.response?.data?.error || 'Failed to delete job');
    }
  };

  const handleWithdrawApplication = async () => {
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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setJobsCurrentPage(1);
  };

  const handleJobsFilterChange = () => setJobsCurrentPage(1);
  const handleAppsFilterChange = () => setAppsCurrentPage(1);

  const getJobTypeBadge = (type: string) => {
    return type === 'JOB' ? (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Job</Badge>
    ) : (
      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Internship</Badge>
    );
  };

  const getJobStatusBadge = (status: string) => {
    return status === 'OPEN' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Open</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Closed</Badge>
    );
  };

  const getApplicationStatusBadge = (status: string) => {
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

  if (isRestrictedStudent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Briefcase className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
          <p className="text-sm text-slate-500">
            The Jobs & Internships section is available for college, graduate, and higher-education students.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="bg-saBlue hover:bg-saBlue/90 rounded-xl">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
            Jobs & Internships
          </h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            Career Opportunities
          </p>
        </div>
        {isAdmin && activeTab === 'jobs' && (
          <Button
            className="bg-saBlue hover:bg-saBlue/90 text-white h-10 px-5 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm rounded-xl"
            onClick={() => navigate('/dashboard/jobs/new')}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Post Job
          </Button>
        )}
      </div>

      {/* Tabs (only for students) */}
      {isStudent && (
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => handleTabChange('jobs')}
            className={`px-4 py-2 font-semibold text-sm transition-all ${
              activeTab === 'jobs'
                ? 'border-b-2 border-saBlue text-saBlue'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Browse Jobs
            </div>
          </button>
          <button
            onClick={() => handleTabChange('applications')}
            className={`px-4 py-2 font-semibold text-sm transition-all ${
              activeTab === 'applications'
                ? 'border-b-2 border-saBlue text-saBlue'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              My Applications
            </div>
          </button>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            {/* Search */}
            <div className="relative flex-1 w-full md:w-auto min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs by title, department, skills..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-xl border border-slate-200/80 bg-slate-50/50 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-saBlue/20 focus:border-saBlue transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Dropdowns Container */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  handleJobsFilterChange();
                }}
                className="h-10 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-saBlue/20 cursor-pointer min-w-[130px]"
              >
                <option value="">All Types</option>
                <option value="JOB">Jobs</option>
                <option value="INTERNSHIP">Internships</option>
              </select>

              <select
                value={jobsSelectedStatus}
                onChange={(e) => {
                  setJobsSelectedStatus(e.target.value);
                  handleJobsFilterChange();
                }}
                className="h-10 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-saBlue/20 cursor-pointer min-w-[130px]"
              >
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          {isLoadingJobs ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
              <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">
                Loading Jobs...
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-bold text-gray-600">No jobs found</h3>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
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
                      <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[150px] hidden md:table-cell">
                        Company
                      </TableHead>
                      <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[100px] hidden lg:table-cell">
                        Type
                      </TableHead>
                      <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[100px] hidden lg:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[120px] hidden xl:table-cell">
                        Deadline
                      </TableHead>
                      <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[100px]">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className="hover:bg-blue-50/30 border-b-gray-50 transition-colors"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm text-gray-900">{job.title}</span>
                            {job.location && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{job.company}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{getJobTypeBadge(job.type)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{getJobStatusBadge(job.status)}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {job.application_deadline ? (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(job.application_deadline), 'MMM dd, yyyy')}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No deadline</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-blue-50"
                              onClick={() => navigate(`/dashboard/jobs/${job.id}`)}
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-yellow-50"
                                  onClick={() => navigate(`/dashboard/jobs/${job.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4 text-yellow-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-red-50"
                                  onClick={() => setDeleteJob(job)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {jobsTotalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing {(jobsCurrentPage - 1) * limit + 1} to {Math.min(jobsCurrentPage * limit, jobsTotal)} of{' '}
                    {jobsTotal} jobs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobsCurrentPage(jobsCurrentPage - 1)}
                      disabled={jobsCurrentPage === 1}
                      className="h-8 px-3 text-xs rounded-lg"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(jobsTotalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === jobsTotalPages ||
                          (page >= jobsCurrentPage - 1 && page <= jobsCurrentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={page === jobsCurrentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setJobsCurrentPage(page)}
                              className={`h-8 w-8 p-0 text-xs rounded-lg ${page === jobsCurrentPage
                                ? 'bg-saBlue hover:bg-saBlue/90 text-white'
                                : ''
                                }`}
                            >
                              {page}
                            </Button>
                          );
                        } else if (page === jobsCurrentPage - 2 || page === jobsCurrentPage + 2) {
                          return <span key={page} className="px-1 text-gray-400">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setJobsCurrentPage(jobsCurrentPage + 1)}
                      disabled={jobsCurrentPage === jobsTotalPages}
                      className="h-8 px-3 text-xs rounded-lg"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Applications Tab (Students only) */}
      {activeTab === 'applications' && isStudent && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <select
              value={appsSelectedStatus}
              onChange={(e) => {
                setAppsSelectedStatus(e.target.value);
                handleAppsFilterChange();
              }}
              className="h-10 px-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-saBlue/20 cursor-pointer min-w-[160px]"
            >
              <option value="">All Application Status</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {isLoadingApplications ? (
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
                onClick={() => handleTabChange('jobs')}
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
                        <TableCell>{getApplicationStatusBadge(application.status)}</TableCell>
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
              {appsTotalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">
                    Showing {(appsCurrentPage - 1) * limit + 1} to {Math.min(appsCurrentPage * limit, appsTotal)} of{' '}
                    {appsTotal} applications
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAppsCurrentPage(appsCurrentPage - 1)}
                      disabled={appsCurrentPage === 1}
                      className="h-8 px-3 text-xs rounded-lg"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {[...Array(appsTotalPages)].map((_, i) => {
                        const page = i + 1;
                        if (
                          page === 1 ||
                          page === appsTotalPages ||
                          (page >= appsCurrentPage - 1 && page <= appsCurrentPage + 1)
                        ) {
                          return (
                            <Button
                              key={page}
                              variant={page === appsCurrentPage ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setAppsCurrentPage(page)}
                              className={`h-8 w-8 p-0 text-xs rounded-lg ${
                                page === appsCurrentPage
                                  ? 'bg-saBlue hover:bg-saBlue/90 text-white'
                                  : ''
                              }`}
                            >
                              {page}
                            </Button>
                          );
                        } else if (page === appsCurrentPage - 2 || page === appsCurrentPage + 2) {
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
                      onClick={() => setAppsCurrentPage(appsCurrentPage + 1)}
                      disabled={appsCurrentPage === appsTotalPages}
                      className="h-8 px-3 text-xs rounded-lg"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Delete Job Confirmation Modal */}
      <DeleteConfirmationModal
        open={!!deleteJob}
        title="Delete Job"
        message={`Are you sure you want to delete "${deleteJob?.title}"? This will also remove all associated applications.`}
        onClose={() => setDeleteJob(null)}
        onConfirm={handleDeleteJob}
        onCancel={() => setDeleteJob(null)}
      />

      {/* Withdraw Application Confirmation Modal */}
      <DeleteConfirmationModal
        open={!!deleteApplication}
        title="Withdraw Application"
        message={`Are you sure you want to withdraw your application for "${deleteApplication?.job?.title}"?`}
        onClose={() => setDeleteApplication(null)}
        onConfirm={handleWithdrawApplication}
        onCancel={() => setDeleteApplication(null)}
      />
    </div>
  );
}
