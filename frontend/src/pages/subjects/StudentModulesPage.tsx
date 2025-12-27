import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, CheckCircle, Clock, Play } from 'lucide-react';
import { moduleService, progressService, subjectService } from '@/services/api';
import type { Module, Subject, StudentModuleProgress } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function StudentModulesPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<StudentModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (subjectId && user) {
      loadData();
    }
  }, [subjectId, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectResponse, modulesResponse, progressResponse] = await Promise.all([
        subjectService.getById(parseInt(subjectId!)),
        moduleService.getModulesBySubject(parseInt(subjectId!)),
        progressService.getStudentProgress(user!.id, parseInt(subjectId!))
      ]);

      setSubject(subjectResponse.data);
      setModules(modulesResponse.data);
      setProgress(progressResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getModuleProgress = (moduleId: number) => {
    return progress.find(p => p.module_id === moduleId);
  };

  const getProgressStatus = (moduleId: number) => {
    const moduleProgress = getModuleProgress(moduleId);
    if (!moduleProgress) return 'NOT_STARTED';
    if (moduleProgress.is_completed) return 'COMPLETED';
    if (moduleProgress.progress_percent > 0) return 'IN_PROGRESS';
    return 'NOT_STARTED';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <BookOpen className="w-5 h-5 text-gray-400" />;
    }
  };

  const calculateOverallProgress = () => {
    if (modules.length === 0) return 0;
    const completedModules = progress.filter(p => p.is_completed).length;
    return Math.round((completedModules / modules.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{subject?.name}</h1>
        <p className="text-gray-600 mt-2">Complete your learning modules</p>

        {/* Progress Overview */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-600">{calculateOverallProgress()}%</span>
          </div>
          <Progress value={calculateOverallProgress()} className="h-3" />
          <p className="text-sm text-gray-600 mt-2">
            {progress.filter(p => p.is_completed).length} of {modules.length} modules completed
          </p>
        </div>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No modules available</h3>
            <p className="text-gray-600">Check back later for new content</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {modules
            .sort((a, b) => a.order - b.order)
            .map((module) => {
              const status = getProgressStatus(module.module_id);
              const moduleProgress = getModuleProgress(module.module_id);

              return (
                <Card key={module.module_id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(status)}
                          <CardTitle className="text-xl">{module.title}</CardTitle>
                          <Badge
                            variant={status === 'COMPLETED' ? 'default' : status === 'IN_PROGRESS' ? 'secondary' : 'outline'}
                          >
                            {status ? status.replace('_', ' ') : 'Not Started'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-4">{module.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{module.estimated_time_minutes} minutes</span>
                          <span>{module.content.length} content items</span>
                          {moduleProgress?.completed_on && (
                            <span>Completed: {new Date(moduleProgress.completed_on).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Button
                      onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules/${module.module_id}/study`)}
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {status === 'NOT_STARTED' ? 'Start Learning' :
                       status === 'IN_PROGRESS' ? 'Continue Learning' : 'Review Module'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}