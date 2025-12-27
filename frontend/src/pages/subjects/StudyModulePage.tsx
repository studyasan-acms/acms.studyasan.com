import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle, FileText, Clock } from 'lucide-react';
import { moduleService, progressService } from '@/services/api';
import type { Module, StudentModuleProgress, UpdateProgressData } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function StudyModulePage() {
  const { subjectId, moduleId } = useParams<{ subjectId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [module, setModule] = useState<Module | null>(null);
  const [progress, setProgress] = useState<StudentModuleProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);

  useEffect(() => {
    if (subjectId && moduleId && user) {
      loadData();
    }
  }, [subjectId, moduleId, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [moduleResponse, progressResponse] = await Promise.all([
        moduleService.getModuleById(parseInt(subjectId!), parseInt(moduleId!)),
        progressService.getStudentProgress(user!.id, parseInt(subjectId!))
      ]);

      setModule(moduleResponse.data);
      const moduleProgress = progressResponse.data.find(p => p.module_id === parseInt(moduleId!));
      setProgress(moduleProgress || null);

      // If no progress exists, start the module
      if (!moduleProgress) {
        await startModule();
      }
      // Don't update if progress already exists - let the user control it
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load module');
      navigate(`/dashboard/subjects/${subjectId}/modules`);
    } finally {
      setLoading(false);
    }
  };

  const startModule = async () => {
    try {
      console.log('🔍 [STUDY_MODULE] Starting module...');
      const progressData = await progressService.updateProgress(
        user!.id,
        parseInt(subjectId!),
        parseInt(moduleId!),
        { progress_percent: 0, is_completed: false }
      );
      console.log('✅ [STUDY_MODULE] Module started:', progressData);
      setProgress(progressData.data);
    } catch (err: any) {
      console.error('❌ [STUDY_MODULE] Failed to start module:', err);
      console.error('❌ [STUDY_MODULE] Error details:', err.response?.data);
    }
  };

  const updateProgress = async (data: UpdateProgressData) => {
    try {
      console.log('🔍 [STUDY_MODULE] updateProgress called with data:', data);
      console.log('🔍 [STUDY_MODULE] Current user:', user);
      console.log('🔍 [STUDY_MODULE] Params:', { subjectId, moduleId });
      setUpdating(true);
      debugger;
      const progressData = await progressService.updateProgress(
        user!.id,
        parseInt(subjectId!),
        parseInt(moduleId!),
        data
      );
      console.log('✅ [STUDY_MODULE] Progress updated successfully:', progressData);
      setProgress(progressData.data);
    } catch (err: any) {
      console.error('❌ [STUDY_MODULE] Failed to update progress:', err);
      console.error('❌ [STUDY_MODULE] Error response:', err.response?.data);
      console.error('❌ [STUDY_MODULE] Error message:', err.response?.data?.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteModule = async () => {
    console.log('🔍 [STUDY_MODULE] Completing module...');
    await updateProgress({ progress_percent: 100, is_completed: true });
    alert('Congratulations! Module completed!');
    navigate(`/dashboard/subjects/${subjectId}/modules`);
  };

  const handleNext = async () => {
    if (currentContentIndex < (module?.content.length || 0) - 1) {
      const newIndex = currentContentIndex + 1;
      setCurrentContentIndex(newIndex);
      
      // Update progress based on content viewed
      if (module && !progress?.is_completed) {
        const progressPercent = Math.round(((newIndex + 1) / module.content.length) * 100);
        console.log(`🔍 [STUDY_MODULE] Updating progress to ${progressPercent}%`);
        await updateProgress({ progress_percent: progressPercent });
      }
    }
  };

  const handlePrevious = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
    }
  };

  const renderContent = (content: any) => {
    switch (content.type) {
      case 'text':
        return (
          <div className="prose max-w-none bg-white p-6 rounded-lg">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {content.text_content}
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="flex justify-center bg-white p-6 rounded-lg">
            <img
              src={content.s3_url || content.url}
              alt={content.filename || content.file_name || 'Image'}
              className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm"
              onError={(e) => {
                console.error('Image failed to load');
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage unavailable%3C/text%3E%3C/svg%3E';
              }}
              onContextMenu={(e) => e.preventDefault()} // Prevent right-click download
            />
          </div>
        );

      case 'video':
        return (
          <div className="flex justify-center bg-black rounded-lg overflow-hidden">
            <video
              controls
              controlsList="nodownload" // Disable download button
              className="max-w-full max-h-[600px] w-full"
              onContextMenu={(e) => e.preventDefault()} // Prevent right-click download
              onError={() => {
                console.error('Video failed to load');
              }}
            >
              <source src={content.s3_url || content.url} />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'pdf':
        return (
          <div className="bg-white p-8 rounded-lg">
            <div className="flex flex-col items-center">
              <FileText className="w-20 h-20 text-red-500 mb-4" />
              <p className="text-xl font-semibold mb-2">
                {content.filename || content.file_name || 'PDF Document'}
              </p>
              <p className="text-gray-600 mb-6">PDF Document - View Only</p>
              
              {/* Embed PDF viewer */}
              <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                <iframe
                  src={`${content.s3_url || content.url}#toolbar=0&navpanes=0`}
                  className="w-full h-full"
                  title={content.filename || content.file_name || 'PDF Viewer'}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Downloads are disabled for learning materials
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white p-8 rounded-lg">
            <div className="flex flex-col items-center">
              <FileText className="w-20 h-20 text-gray-400 mb-4" />
              <p className="text-xl font-semibold mb-2">
                {content.filename || content.file_name || 'Document'}
              </p>
              <p className="text-gray-600 mb-4">
                {content.type ? content.type.toUpperCase() : 'Document'} - View Only
              </p>
              
              {/* For other document types, try to display in iframe */}
              {(content.s3_url || content.url) && (
                <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                  <iframe
                    src={content.s3_url || content.url}
                    className="w-full h-full"
                    title={content.filename || content.file_name || 'Document Viewer'}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-4">
                Downloads are disabled for learning materials
              </p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading module...</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Module not found</div>
      </div>
    );
  }

  const currentContent = module.content[currentContentIndex];
  const progressPercent = module.content.length > 0
    ? ((currentContentIndex + 1) / module.content.length) * 100
    : 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold">{module.title}</h1>
                <p className="text-sm text-gray-600">
                  Content {currentContentIndex + 1} of {module.content.length}
                </p>
              </div>
            </div>

            {progress?.is_completed && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium text-sm">Completed</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2 text-xs text-gray-600">
              <span>Your Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {module.content.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-20 h-20 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No content available</h3>
              <p className="text-gray-600 mb-6">This module doesn't have any content yet.</p>
              <Button onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}>
                Back to Modules
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-5xl mx-auto">
            {/* Content Card */}
            <Card className="mb-6">
              <CardContent className="p-8">
                {renderContent(currentContent)}
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm">
              <Button
                onClick={handlePrevious}
                disabled={currentContentIndex === 0}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex-1 text-center">
                <p className="text-sm text-gray-600 mb-1">Content Progress</p>
                <div className="flex items-center justify-center gap-2">
                  {module.content.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index < currentContentIndex
                          ? 'w-8 bg-green-500'
                          : index === currentContentIndex
                          ? 'w-10 bg-blue-500'
                          : 'w-6 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!progress?.is_completed && currentContentIndex === module.content.length - 1 && (
                  <Button
                    onClick={handleCompleteModule}
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {updating ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Complete
                      </>
                    )}
                  </Button>
                )}

                {currentContentIndex < module.content.length - 1 && (
                  <Button onClick={handleNext} size="lg">
                    Next
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                )}

                {currentContentIndex === module.content.length - 1 && progress?.is_completed && (
                  <Button 
                    onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
                    size="lg"
                  >
                    Back to Modules
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}