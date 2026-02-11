import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { jobService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Job } from '@/types';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Upload,
  Send,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'ADMIN';

  usePageTitle('Job Details');

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    if (id) {
      fetchJob();
    }
  }, [id]);

  const fetchJob = async () => {
    try {
      setIsLoading(true);
      const response = await jobService.getJobById(parseInt(id!));
      setJob(response.data);
    } catch (error: any) {
      console.error('Failed to fetch job:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch job');
      navigate('/dashboard/jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!cvFile || !coverLetter.trim()) {
      toast.error('Please upload your CV and write a cover letter');
      return;
    }

    try {
      setIsApplying(true);
      await jobService.applyForJob(parseInt(id!), coverLetter, cvFile);
      toast.success('Application submitted successfully!');
      setShowApplyForm(false);
      setCvFile(null);
      setCoverLetter('');
    } catch (error: any) {
      console.error('Failed to apply:', error);
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setIsApplying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF or Word document');
        return;
      }
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setCvFile(file);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">Loading...</p>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard/jobs')}
          className="h-9 px-3 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
            {job.title}
          </h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            Job Details
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => navigate(`/dashboard/jobs/${job.id}/edit`)}
            className="bg-saBlue hover:bg-saBlue/90 rounded-xl"
          >
            Edit Job
          </Button>
        )}
      </div>

      {/* Job Details */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Header Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
              <p className="text-lg text-gray-600">{job.company}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={job.type === 'JOB' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
              {job.type === 'JOB' ? 'Job' : 'Internship'}
            </Badge>
            <Badge className={job.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {job.status}
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          {job.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Location</p>
                <p className="text-sm text-gray-900 font-semibold">{job.location}</p>
              </div>
            </div>
          )}
          
          {job.salary_range && (
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Salary Range</p>
                <p className="text-sm text-gray-900 font-semibold">{job.salary_range}</p>
              </div>
            </div>
          )}

          {job.duration && (
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Duration</p>
                <p className="text-sm text-gray-900 font-semibold">{job.duration}</p>
              </div>
            </div>
          )}

          {job.application_deadline && (
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Application Deadline</p>
                <p className="text-sm text-gray-900 font-semibold">
                  {format(new Date(job.application_deadline), 'MMMM dd, yyyy')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2 pt-4 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Description</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
        </div>

        {/* Requirements */}
        {job.requirements && (
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">Requirements</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
          </div>
        )}

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-lg font-bold text-gray-800">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <Badge key={skill} variant="outline" className="px-3 py-1 rounded-lg">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Apply Section (for students) */}
        {isStudent && job.status === 'OPEN' && (
          <div className="pt-4 border-t border-gray-100">
            {!showApplyForm ? (
              <Button
                onClick={() => setShowApplyForm(true)}
                className="w-full bg-saBlue hover:bg-saBlue/90 rounded-xl h-12 text-base font-bold"
              >
                <Send className="mr-2 h-5 w-5" />
                Apply Now
              </Button>
            ) : (
              <div className="space-y-4 bg-blue-50/50 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-gray-800">Submit Your Application</h3>
                
                {/* CV Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Upload CV/Resume <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      id="cv-upload"
                    />
                    <label
                      htmlFor="cv-upload"
                      className="flex items-center justify-center gap-2 w-full h-12 px-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-saBlue hover:bg-blue-50/50 transition-all"
                    >
                      <Upload className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600 font-medium">
                        {cvFile ? cvFile.name : 'Click to upload CV (PDF, DOC, DOCX - Max 5MB)'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Cover Letter <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={6}
                    placeholder="Tell us why you're a great fit for this position..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saBlue/20 resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApplyForm(false);
                      setCvFile(null);
                      setCoverLetter('');
                    }}
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={isApplying || !cvFile || !coverLetter.trim()}
                    className="flex-1 bg-saBlue hover:bg-saBlue/90 rounded-xl"
                  >
                    {isApplying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Application
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Admin: View Applications */}
        {isAdmin && (
          <div className="pt-4 border-t border-gray-100">
            <Button
              onClick={() => navigate(`/dashboard/jobs/${job.id}/applications`)}
              variant="outline"
              className="w-full rounded-xl h-12"
            >
              <FileText className="mr-2 h-5 w-5" />
              View Applications ({job._count?.applications || 0})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
