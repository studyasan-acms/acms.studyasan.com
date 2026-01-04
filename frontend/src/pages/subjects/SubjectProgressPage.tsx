import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Users, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { progressService, subjectService, moduleService } from '@/services/api';
import type { Subject, Module, StudentModuleProgress } from '@/types';
import { usePageTitle } from "@/hooks/usePageTitle";

interface StudentProgress {
  student_id: number;
  student_name: string;
  student_email: string;
  modules: StudentModuleProgress[];
  total_modules: number;
  completed_modules: number;
  average_progress: number;
  total_time_spent: number;
}

export default function SubjectProgressPage() {
  usePageTitle("Subject Progress");
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
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
      const [subjectResponse, modulesResponse, progressResponse] = await Promise.all([
        subjectService.getById(parseInt(subjectId!)),
        moduleService.getModulesBySubject(parseInt(subjectId!)),
        progressService.getSubjectProgress(parseInt(subjectId!))
      ]);

      setSubject(subjectResponse.data);
      const moduleData = modulesResponse.data;
      setModules(Array.isArray(moduleData) ? moduleData : []);

      // Backend returns { data: { students: [...] } }
      const studentsData = progressResponse.data?.students || [];
      setStudentProgress(Array.isArray(studentsData) ? studentsData : []);
    } catch (err: any) {
      console.error('Error loading progress data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStudentModuleProgress = (studentId: number, moduleId: number) => {
    const student = studentProgress.find(sp => sp.student_id === studentId);
    return student?.modules.find(p => p.module_id === moduleId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS': return <Clock className="w-4 h-4 text-blue-500" />;
      default: return <BookOpen className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading progress data...</div>
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modules
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{subject?.name} - Student Progress</h1>
            <p className="text-gray-600 mt-2">Track student learning progress</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{studentProgress.length} students</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>{modules.length} modules</span>
          </div>
        </div>
      </div>

      {studentProgress.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No students enrolled</h3>
            <p className="text-gray-600">No students have started this subject yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold">{studentProgress.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed All Modules</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(studentProgress)
                        ? studentProgress.filter(sp => sp.completed_modules === sp.total_modules && sp.total_modules > 0).length
                        : 0}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Progress</p>
                    <p className="text-2xl font-bold">
                      {Array.isArray(studentProgress) && studentProgress.length > 0
                        ? Math.round(studentProgress.reduce((sum, sp) => sum + sp.average_progress, 0) / studentProgress.length)
                        : 0}%
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Progress Table */}
          <Card>
            <CardHeader>
              <CardTitle>Student Progress Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {studentProgress.map((studentData) => {
                  const overallProgress = studentData.average_progress;

                  return (
                    <div key={studentData.student_id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{studentData.student_name}</h3>
                          <p className="text-sm text-gray-600">{studentData.student_email}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{overallProgress}%</div>
                          <div className="text-sm text-gray-600">{studentData.completed_modules} of {studentData.total_modules} Complete</div>
                        </div>
                      </div>

                      <Progress value={overallProgress} className="mb-4" />

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {modules.map((module) => {
                          const progress = getStudentModuleProgress(studentData.student_id, module.module_id);
                          const progressStatus = progress?.is_completed ? 'COMPLETED' : (progress?.progress_percent ?? 0) > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

                          return (
                            <div key={module.module_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(progressStatus)}
                                <div>
                                  <p className="font-medium text-sm">{module.title}</p>
                                  <p className="text-xs text-gray-600">
                                    {progress && progress.progress_percent > 0 && `Progress: ${progress.progress_percent}%`}
                                    {progress?.completed_on && ` • Completed: ${new Date(progress.completed_on).toLocaleDateString()}`}
                                  </p>
                                </div>
                              </div>
                              {getStatusBadge(progressStatus)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}