import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { jobService } from '@/services/api';
import type { Job } from '@/types';
import { ArrowLeft, Briefcase, Save } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';

export default function JobFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  usePageTitle(isEdit ? 'Edit Job' : 'Create Job');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'JOB' as 'JOB' | 'INTERNSHIP',
    description: '',
    requirements: '',
    skills: [] as string[],
    salary_range: '',
    duration: '',
    application_deadline: '',
    status: 'OPEN' as 'OPEN' | 'CLOSED',
  });

  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      fetchJob();
    }
  }, [id, isEdit]);

  const fetchJob = async () => {
    try {
      setIsFetching(true);
      const response = await jobService.getJobById(parseInt(id!));
      const job: Job = response.data;
      setFormData({
        title: job.title,
        company: job.company,
        location: job.location || '',
        type: job.type,
        description: job.description,
        requirements: job.requirements || '',
        skills: Array.isArray(job.skills) ? job.skills : [],
        salary_range: job.salary_range || '',
        duration: job.duration || '',
        application_deadline: job.application_deadline
          ? new Date(job.application_deadline).toISOString().split('T')[0]
          : '',
        status: job.status,
      });
    } catch (error: any) {
      console.error('Failed to fetch job:', error);
      toast.error(error.response?.data?.error || 'Failed to fetch job');
      navigate('/dashboard/jobs');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        ...formData,
        application_deadline: formData.application_deadline || null,
      };

      if (isEdit && id) {
        await jobService.updateJob(parseInt(id), data);
        toast.success('Job updated successfully');
      } else {
        await jobService.createJob(data);
        toast.success('Job created successfully');
      }
      navigate('/dashboard/jobs');
    } catch (error: any) {
      console.error('Failed to save job:', error);
      toast.error(error.response?.data?.error || 'Failed to save job');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  if (isFetching) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">Loading...</p>
      </div>
    );
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
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
            {isEdit ? 'Edit Job' : 'Post New Job'}
          </h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            {isEdit ? 'Update job details' : 'Create a new job posting'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Job Title <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Software Developer"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Company <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'JOB' | 'INTERNSHIP' })}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saBlue/20"
              >
                <option value="JOB">Job</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Location
              </label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Remote, New York"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Salary Range
              </label>
              <Input
                value={formData.salary_range}
                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                placeholder="e.g. $50,000 - $70,000"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Duration {formData.type === 'INTERNSHIP' && '(for internships)'}
              </label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 3 months"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Application Deadline
              </label>
              <Input
                type="date"
                value={formData.application_deadline}
                onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                className="rounded-xl"
              />
            </div>

            {isEdit && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'OPEN' | 'CLOSED' })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={5}
            placeholder="Job description..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saBlue/20 resize-none"
          />
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Requirements
          </label>
          <textarea
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            rows={5}
            placeholder="Job requirements..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-saBlue/20 resize-none"
          />
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
            Required Skills
          </label>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
              placeholder="Add a skill..."
              className="rounded-xl"
            />
            <Button
              type="button"
              onClick={handleAddSkill}
              variant="outline"
              className="px-4 rounded-xl"
            >
              Add
            </Button>
          </div>
          {formData.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {formData.skills.map((skill) => (
                <div
                  key={skill}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/jobs')}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-saBlue hover:bg-saBlue/90 rounded-xl"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEdit ? 'Update Job' : 'Post Job'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
