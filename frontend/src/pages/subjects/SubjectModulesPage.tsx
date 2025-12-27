import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, BookOpen, ArrowLeft, Clock, FileText } from 'lucide-react';
import { moduleService, subjectService } from '@/services/api';
import type { Module, Subject } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function SubjectModulesPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subjectId) {
      loadData();
    }
  }, [subjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectResponse, modulesResponse] = await Promise.all([
        subjectService.getById(parseInt(subjectId!)),
        moduleService.getModulesBySubject(parseInt(subjectId!))
      ]);

      setSubject(subjectResponse.data);
      const moduleData = modulesResponse.data;
      setModules(Array.isArray(moduleData) ? moduleData : []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading modules:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: number) => {
    if (!confirm('Are you sure you want to delete this module? This will also delete all associated content.')) {
      return;
    }

    try {
      await moduleService.deleteModule(parseInt(subjectId!), moduleId);
      await loadData(); // Reload to get fresh data
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete module');
    }
  };

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => navigate('/dashboard/subjects')}
              variant="outline"
              className="mt-4"
            >
              Back to Subjects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard/subjects')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Subjects
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{subject?.name}</h1>
            <p className="text-gray-600 mt-2">
              {isTeacher ? 'Manage course modules and content' : 'Browse and study course modules'}
            </p>
          </div>

          {isTeacher && (
            <Button
              onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/create`)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Module
            </Button>
          )}
        </div>
      </div>

      {!Array.isArray(modules) || modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No modules yet</h3>
            <p className="text-gray-600 mb-4">
              {isTeacher ? 'Get started by creating your first module' : 'No learning modules are available yet'}
            </p>
            {isTeacher && (
              <Button onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/create`)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Module
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {(modules || [])
            .sort((a, b) => a.order - b.order)
            .map((module) => (
              <Card key={module.module_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-xl">{module.title}</CardTitle>
                        <Badge variant="outline" className="ml-auto">
                          Module {module.order}
                        </Badge>
                      </div>
                      <CardDescription className="mb-4">{module.description}</CardDescription>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{module.estimated_time_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{module.content?.length || 0} content {(module.content?.length || 0) !== 1 ? 'items' : 'item'}</span>
                        </div>
                      </div>
                    </div>

                    {isTeacher && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteModule(module.module_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {isTeacher ? (
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/edit`)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Module
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`)}
                      className="w-full"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Start Learning
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}