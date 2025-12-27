import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, FileText, Trash2, Image, Video, File } from 'lucide-react';
import { moduleService } from '@/services/api';
import type { Module, UpdateModuleData } from '@/types';

export default function EditModulePage() {
  const { subjectId, moduleId } = useParams<{ subjectId: string; moduleId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [module, setModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState<UpdateModuleData>({
    title: '',
    description: '',
    estimated_time_minutes: 0,
  });
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (subjectId && moduleId) {
      loadModule();
    }
  }, [subjectId, moduleId]);

  const loadModule = async () => {
    try {
      setLoading(true);
      const response = await moduleService.getModuleById(parseInt(subjectId!), parseInt(moduleId!));
      setModule(response.data);
      setFormData({
        title: response.data.title,
        description: response.data.description,
        estimated_time_minutes: response.data.estimated_time_minutes,
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load module');
      navigate(`/dashboard/subjects/${subjectId}/modules`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      await moduleService.updateModule(parseInt(subjectId!), parseInt(moduleId!), formData);
      navigate(`/dashboard/subjects/${subjectId}/modules`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      await moduleService.uploadContent(parseInt(subjectId!), parseInt(moduleId!), files);
      // Reload module to show new content
      await loadModule();
      // Reset file input
      e.target.value = '';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleAddTextContent = async () => {
    if (!textContent.trim()) {
      alert('Please enter some text content');
      return;
    }

    try {
      await moduleService.addTextContent(parseInt(subjectId!), parseInt(moduleId!), {
        text_content: textContent,
      });
      setTextContent('');
      await loadModule();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add text content');
    }
  };

  const handleRemoveContent = async (contentId: number) => {
    if (!confirm('Are you sure you want to remove this content?')) return;

    try {
      await moduleService.removeContent(parseInt(subjectId!), parseInt(moduleId!), contentId);
      await loadModule();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove content');
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'image': return <Image className="w-5 h-5 text-green-500" />;
      case 'video': return <Video className="w-5 h-5 text-purple-500" />;
      case 'pdf': return <File className="w-5 h-5 text-red-500" />;
      default: return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/subjects/${subjectId}/modules`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Modules
          </Button>
          <h1 className="text-3xl font-bold mt-4">Edit Module</h1>
          <p className="text-gray-600 mt-2">Update module details and manage content</p>
        </div>

        <div className="grid gap-6">
          {/* Module Details */}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter module title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_time_minutes: parseInt(e.target.value) || 0 }))}
                    placeholder="Enter estimated time in minutes"
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Content Management */}
          <Card>
            <CardHeader>
              <CardTitle>Module Content</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Upload videos, PDFs, images and add text content for students to learn
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload Files */}
              <div>
                <Label htmlFor="file-upload">Upload Files</Label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Choose Files'}
                  </Button>
                  {uploading && <span className="text-sm text-gray-600">Uploading files...</span>}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Supported: Images (JPG, PNG), Videos (MP4, WebM), PDFs, Documents (DOC, DOCX, PPT, PPTX)
                </p>
              </div>

              {/* Add Text Content */}
              <div>
                <Label htmlFor="text-content">Add Text Content</Label>
                <div className="space-y-2 mt-2">
                  <Textarea
                    id="text-content"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter text content for this module..."
                    rows={4}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTextContent}
                    disabled={!textContent.trim()}
                    variant="outline"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Add Text
                  </Button>
                </div>
              </div>

              {/* Existing Content */}
              {module.content && module.content.length > 0 && (
                <div>
                  <Label>Existing Content ({module.content.length} items)</Label>
                  <div className="space-y-2 mt-3">
                    {module.content.map((content) => (
                      <div 
                        key={content.content_id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {getContentIcon(content.type)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {content.type === 'text' 
                                ? (content.text_content?.substring(0, 60) + (content.text_content && content.text_content.length > 60 ? '...' : ''))
                                : content.file_name || 'Untitled'}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-3">
                              <span className="capitalize">{content.type}</span>
                              {content.file_size && <span>{formatFileSize(content.file_size)}</span>}
                              {content.uploaded_at && (
                                <span>Added {new Date(content.uploaded_at).toLocaleDateString()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContent(content.content_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!module.content || module.content.length === 0) && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No content added yet</p>
                  <p className="text-sm text-gray-500 mt-1">Upload files or add text to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}