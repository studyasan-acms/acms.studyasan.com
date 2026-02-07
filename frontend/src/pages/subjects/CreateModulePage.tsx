import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Save, BookOpen, Clock, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { moduleService } from '@/services/api';
import type { CreateModuleData } from '@/types';
import { usePageTitle } from "@/hooks/usePageTitle";
import ErrorModal from '@/components/ui/errorModal';
import SuccessModal from '@/components/ui/successModal';

export default function CreateModulePage() {
  usePageTitle("Add Module");
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<CreateModuleData>({
    title: '',
    description: '',
    estimated_time_minutes: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please fill in both the module title and description.');
      return;
    }

    try {
      setLoading(true);
      await moduleService.createModule(parseInt(subjectId!), formData);
      setSuccess('Learning module created successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create module');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateModuleData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* PREMIUM HEADER SECTION */}
      <div className="relative overflow-hidden bg-slate-50 rounded-b-[40px] mb-12 shadow-sm border-b border-slate-100 group">
        {/* Animated Background Elements */}
        <div className="absolute top-[-20%] right-[-5%] w-[400px] h-[400px] bg-saBlue/10 rounded-full blur-[100px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[80px]" />

        <div className="max-w-4xl mx-auto px-6 pt-12 pb-16 relative z-10">
          <Link
            to={`/dashboard/subjects/${subjectId}/modules`}
            className="group inline-flex items-center text-xs font-black text-slate-400 hover:text-saBlue uppercase tracking-widest transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Modules List
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-saBlue/10 rounded-2xl text-saBlue animate-in zoom-in duration-500 shadow-sm border border-saBlue/5">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <Badge variant="outline" className="border-saBlue/20 text-saBlue text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1 bg-saBlue/5 rounded-full mb-1">
                  Curriculum Asset Builder
                </Badge>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Educational Module</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="rounded-[32px] border-none shadow-xl shadow-gray-200/50 overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <FileText className="w-4 h-4 text-saBlue" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Module Information</CardTitle>
                  <CardDescription className="text-xs">Define the core identity of this learning module.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid gap-8">
                <div className="space-y-3">
                  <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Module Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="e.g., Introduction to Algebraic Expressions"
                    className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-saBlue/5 transition-all px-6 text-sm font-medium"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    Learning Description <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Provide a detailed overview of what students will learn in this module..."
                    rows={5}
                    className="rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-saBlue/5 transition-all p-6 text-sm font-medium resize-none"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="estimated_time_minutes" className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                      Estimated Duration (Minutes)
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="estimated_time_minutes"
                        type="number"
                        min="0"
                        value={formData.estimated_time_minutes}
                        onChange={(e) => handleChange('estimated_time_minutes', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-4 focus:ring-saBlue/5 transition-all pl-12 pr-6 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="bg-saBlue/5 rounded-2xl p-6 border border-saBlue/10 flex items-center gap-4 group">
                    <div className="p-3 bg-white rounded-xl text-saBlue shadow-sm group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-saBlue uppercase tracking-widest mb-1">Quick Tip</p>
                      <p className="text-xs text-saBlue/70 font-medium">Add content resources after creating the module.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
              className="flex-1 sm:flex-none sm:min-w-[200px] h-14 rounded-2xl border-gray-200 font-bold text-xs uppercase tracking-[0.2em] hover:bg-gray-50 transition-all"
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none sm:min-w-[200px] h-14 bg-saBlue hover:bg-saBlue/90 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-saBlue/20 transition-all active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  Creating Module...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-3" />
                  Create Module
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <ErrorModal
        open={!!error}
        onConfirm={() => setError('')}
        title="Creation Failed"
        description={error}
      />

      <SuccessModal
        open={!!success}
        onConfirm={() => {
          setSuccess('');
          navigate(`/dashboard/subjects/${subjectId}/modules`);
        }}
        title="Success!"
        description={success}
        okText="View Modules"
      />
    </div>
  );
}