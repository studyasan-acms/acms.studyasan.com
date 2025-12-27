import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { moduleService } from '@/services/api';
import type { CreateModuleData } from '@/types';

export default function CreateModulePage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateModuleData>({
    title: '',
    description: '',
    estimated_time_minutes: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await moduleService.createModule(parseInt(subjectId!), formData);
      navigate(`/dashboard/subjects/${subjectId}/modules`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create module');
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modules
          </Button>
          <h1 className="text-3xl font-bold">Create New Module</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Module Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Enter module title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter module description"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="estimated_time_minutes">Estimated Time (minutes)</Label>
                <Input
                  id="estimated_time_minutes"
                  type="number"
                  min="0"
                  value={formData.estimated_time_minutes}
                  onChange={(e) => handleChange('estimated_time_minutes', parseInt(e.target.value) || 0)}
                  placeholder="Enter estimated time in minutes"
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Module'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}