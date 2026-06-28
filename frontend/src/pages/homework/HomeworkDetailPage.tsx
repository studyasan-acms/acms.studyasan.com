import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { useAuthStore } from "@/store/authStore";

import {
  ArrowLeft,
  Download,
  Upload,
  CheckCircle,
  Clock,
  FileText,
  MessageSquare,
  Loader2,
  Calendar,
  BookOpen,
  User,
  Users,
  AlertCircle,
  Send,
  X,
  FileSearch,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Homework {
  id: number;
  title: string;
  description?: string;
  document_url?: string;
  document_type?: string;
  due_date?: string;
  created_at: string;
  subject: {
    id: number;
    name: string;
  };
  teacher: {
    user: {
      id: number;
      name: string;
    };
  };
  assignments: {
    student: {
      user: {
        id: number;
        name: string;
      };
    };
  }[];
  responses: {
    id: number;
    student: {
      user: {
        id: number;
        name: string;
      };
    };
    response_text?: string;
    response_media_url?: string;
    response_media_type?: string;
    submitted_at: string;
    is_checked: boolean;
    checked_by?: number;
    checked_at?: string;
    feedback?: string;
    feedback_media_url?: string;
    feedback_media_type?: string;
    checker?: {
      id: number;
      name: string;
    };
  }[];
}

export default function HomeworkDetailPage() {
  usePageTitle("Assignment Detail");
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackFiles, setFeedbackFiles] = useState<File[]>([]);

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const fetchHomework = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/homework/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHomework(data.data);
      } else {
        throw new Error('Failed to fetch homework');
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
      toast.error("Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckResponse = async (responseId: number, feedback: string, isChecked: boolean, files?: File[]) => {
    try {
      const formData = new FormData();
      formData.append('feedback', feedback);
      formData.append('is_checked', isChecked.toString());
      if (files && files.length > 0) {
        files.forEach((file) => {
          formData.append(`feedback_media`, file);
        });
      }

      const response = await fetch(`/api/homework/responses/${responseId}/check`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (response.ok) {
        toast.success("Response checked successfully");
        fetchHomework();
      } else {
        throw new Error('Failed to check response');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (id) {
      fetchHomework();
    }
  }, [id]);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim() && responseFiles.length === 0) {
      toast.error("Please add content or a file before submitting");
      return;
    }
    setSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('response_text', responseText);
      responseFiles.forEach((file) => {
        submitData.append('response_media', file);
      });

      const response = await fetch(`/api/homework/${id}/response`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: submitData
      });

      if (response.ok) {
        toast.success("Assignment submitted!");
        fetchHomework();
        setResponseText("");
        setResponseFiles([]);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Submission failed');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getUserResponse = () => {
    if (!homework || !isStudent) return null;
    return homework.responses.find(r => r.student.user.id === user?.id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="h-10 w-10 rounded-full border-4 border-blue-50 border-t-saBlue animate-spin" />
        <p className="text-gray-500 font-medium text-sm">Opening assignment...</p>
      </div>
    );
  }

  if (!homework) return null;

  const result = getUserResponse();
  const overDue = homework.due_date && new Date(homework.due_date) < new Date();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Simple Header */}
      <div className="bg-saBlue rounded-2xl p-6 md:p-8 text-white shadow-sm overflow-hidden relative">
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/homework')}
              className="text-white hover:bg-white/10 rounded-lg h-8 px-3 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {(isAdmin || isTeacher) && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/dashboard/homework/${id}/edit`)}
                  className="text-white hover:bg-white/10 rounded-lg h-8 px-3"
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Delete this assignment? This cannot be undone.')) return;
                    try {
                      const resp = await fetch(`/api/homework/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                      });
                      if (resp.ok) {
                        toast.success('Assignment deleted');
                        navigate('/dashboard/homework');
                      } else {
                        const err = await resp.json();
                        throw new Error(err.message || 'Delete failed');
                      }
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to delete');
                    }
                  }}
                  className="rounded-lg h-8 px-3"
                >
                  Delete
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-white/20 text-white rounded-full px-3 py-0.5 border-none text-[10px] font-bold">
                {homework.subject.name}
              </Badge>
              {overDue && !result && (
                <Badge variant="destructive" className="rounded-full px-3 py-0.5 border-none text-[10px] font-bold">
                  LATE SUBMISSION
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {homework.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-blue-50">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span> {homework.teacher.user.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Due: {homework.due_date ? new Date(homework.due_date).toLocaleDateString() : "No limit"}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-gray-50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-saBlue" />
                Homework
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {homework.description ? (
                <div className="text-gray-600 font-medium whitespace-pre-wrap">
                  {homework.description}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 italic text-sm">No instructions provided.</div>
              )}

              {homework.document_url && (
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between gap-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-saBlue">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Material File</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reference</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(homework.document_url, '_blank')}
                    className="rounded-lg h-9 px-4 border-blue-100 text-saBlue font-bold hover:bg-saBlue hover:text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submission Section */}
          {isStudent && (
            <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-5 pb-3 border-b border-gray-50">
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-saBlue" />
                  Your Submission
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {result ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        <div>
                          <p className="text-emerald-900 font-bold text-sm">Submitted</p>
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{new Date(result.submitted_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {result.is_checked ?
                        <Badge className="bg-emerald-500 text-[9px] font-bold tracking-wider">CHECKED</Badge> :
                        <Badge className="bg-blue-500 text-[9px] font-bold tracking-wider">WAITING</Badge>
                      }
                    </div>

                    {result.response_text && (
                      <div className="p-4 bg-gray-50 rounded-xl text-gray-700 font-medium text-sm">
                        <MathRenderer text={result.response_text} />
                      </div>
                    )}

                    {result.response_media_url && (
                      <div className="space-y-2">
                        {(() => {
                          try {
                            const urls = JSON.parse(result.response_media_url);
                            if (Array.isArray(urls)) {
                              return urls.map((url, idx) => (
                                <Button key={idx} variant="outline" size="sm" className="rounded-lg font-bold w-full justify-start" onClick={() => window.open(url, '_blank')}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Attachment {urls.length > 1 ? `(${idx + 1})` : ''}
                                </Button>
                              ));
                            }
                          } catch {
                            // If not JSON, treat as single URL
                            return (
                              <Button variant="outline" size="sm" className="rounded-lg font-bold" onClick={() => window.open(result.response_media_url, '_blank')}>
                                <Download className="h-4 w-4 mr-2" />
                                View Attachment
                              </Button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {result.feedback && (
                      <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/50 space-y-2">
                        <div className="flex items-center gap-2 text-saBlue font-bold text-xs uppercase tracking-wider">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Feedback
                        </div>
                        <p className="text-gray-800 font-medium italic text-sm">
                          "<MathRenderer text={result.feedback} />"
                        </p>
                        {result.feedback_media_url && (
                          <div className="pt-3 border-t border-blue-100 space-y-2">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Teacher attachments:</p>
                            <div className="space-y-2">
                              {(() => {
                                try {
                                  const urls = JSON.parse(result.feedback_media_url);
                                  if (Array.isArray(urls)) {
                                    return urls.map((url, idx) => (
                                      <Button key={idx} variant="outline" size="sm" className="rounded-lg font-bold w-full justify-start h-8 text-[11px]" onClick={() => window.open(url, '_blank')}>
                                        <Download className="h-3 w-3 mr-1.5" />
                                        Download {urls.length > 1 ? `(${idx + 1})` : ''}
                                      </Button>
                                    ));
                                  }
                                } catch {
                                  // If not JSON, treat as single URL
                                  return (
                                    <Button variant="outline" size="sm" className="rounded-lg font-bold w-full justify-start h-8 text-[11px]" onClick={() => window.open(result.feedback_media_url, '_blank')}>
                                      <Download className="h-3 w-3 mr-1.5" /> Download Feedback File
                                    </Button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitResponse} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="font-bold text-gray-800 text-sm">Response Body</Label>
                      <Textarea
                        placeholder="Complete your work here..."
                        rows={8}
                        className="rounded-xl border-gray-100 bg-gray-50/50 p-4 focus:ring-1 focus:ring-saBlue tracking-tight font-medium"
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <Input
                        type="file"
                        id="file-up"
                        className="hidden"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setResponseFiles([...responseFiles, ...files]);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('file-up')?.click()}
                        className="h-12 rounded-xl border-dashed border-gray-300 hover:border-saBlue hover:bg-blue-50 font-bold text-gray-500 text-xs"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {responseFiles.length > 0 ? `${responseFiles.length} file(s) selected` : "Attach files"}
                      </Button>

                      {responseFiles.length > 0 && (
                        <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Selected files:</p>
                          <div className="space-y-2">
                            {responseFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="h-4 w-4 text-saBlue flex-shrink-0" />
                                  <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                                  <span className="text-[10px] text-gray-400 flex-shrink-0">({(file.size / 1024).toFixed(1)}KB)</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setResponseFiles(responseFiles.filter((_, i) => i !== index))}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={submitting}
                        className="h-10 rounded-xl bg-saBlue text-white font-bold text-sm shadow-sm"
                      >
                        {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Submit Assignment"}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Teacher View */}
          {(isAdmin || isTeacher) && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 ml-2">Submissions</h2>
              {homework.responses.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <Users className="h-10 w-10 text-gray-100 mx-auto mb-3" />
                  <p className="text-gray-400 font-bold text-sm">No submissions yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {homework.responses.map(res => (
                    <Card key={res.id} className="rounded-xl border border-gray-100 shadow-sm bg-white">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-saBlue font-bold text-sm">
                              {res.student.user.name[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">{res.student.user.name}</h4>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(res.submitted_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge className={res.is_checked ? "bg-emerald-500 text-[10px]" : "bg-amber-500 text-[10px]"}>
                            {res.is_checked ? "CHECKED" : "PENDING"}
                          </Badge>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl text-gray-700 font-medium text-sm">
                          {res.response_text || "No text body."}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {res.response_media_url && (
                            <div className="flex flex-wrap gap-2 w-full">
                              {(() => {
                                try {
                                  const urls = JSON.parse(res.response_media_url);
                                  if (Array.isArray(urls)) {
                                    return urls.map((url, idx) => (
                                      <Button key={idx} variant="outline" size="sm" className="rounded-lg font-bold h-8 text-[11px]" onClick={() => window.open(url, '_blank')}>
                                        <Download className="h-3 w-3 mr-1.5" /> Download {urls.length > 1 ? `(${idx + 1})` : ''}
                                      </Button>
                                    ));
                                  }
                                } catch {
                                  // If not JSON, treat as single URL
                                  return (
                                    <Button variant="outline" size="sm" className="rounded-lg font-bold h-8 text-[11px]" onClick={() => window.open(res.response_media_url, '_blank')}>
                                      <Download className="h-3 w-3 mr-1.5" /> Download
                                    </Button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                          {!res.is_checked && (
                            <Button
                              size="sm"
                              onClick={() => { setSelectedResponseId(res.id); setFeedbackModalOpen(true); }}
                              className="rounded-lg bg-saBlue font-bold h-8 text-[11px]"
                            >
                              Check now
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-2xl border border-gray-100 shadow-sm bg-white p-6 space-y-6 sticky top-6">
            {(isAdmin || isTeacher) && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Insights</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-500 font-bold text-xs uppercase tracking-tight">Assigned</span>
                      <span className="text-base font-bold text-gray-900">{homework.assignments.length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <span className="text-saBlue font-bold text-xs uppercase tracking-tight">Received</span>
                      <span className="text-base font-bold text-saBlue">{homework.responses.length}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <span>Progress</span>
                    <span>{Math.round((homework.responses.length / (homework.assignments.length || 1)) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-saBlue rounded-full transition-all duration-700"
                      style={{ width: `${(homework.responses.length / (homework.assignments.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100" />
              </>
            )}

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-gray-900">Need help?</h5>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">Ask teacher</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Grade Dialog */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-lg bg-white">
          <div className="bg-saBlue p-6 text-white">
            <DialogTitle className="text-lg font-bold">Grade submission</DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-gray-800 text-sm">Feedback Message</Label>
              <Textarea
                placeholder="Good work! Just check your..."
                rows={4}
                className="rounded-xl bg-gray-50 border-gray-200 font-medium text-sm"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-gray-800 text-sm">Return Files (Optional)</Label>
              <Input
                type="file"
                id="feedback-file-input"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setFeedbackFiles([...feedbackFiles, ...files]);
                }}
                multiple
                className="rounded-xl border-gray-100 text-xs"
              />

              {feedbackFiles.length > 0 && (
                <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Selected files:</p>
                  <div className="space-y-2">
                    {feedbackFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-saBlue flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">({(file.size / 1024).toFixed(1)}KB)</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFeedbackFiles(feedbackFiles.filter((_, i) => i !== index))}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 bg-gray-50 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFeedbackModalOpen(false);
                setFeedbackFiles([]);
              }}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedResponseId) {
                  await handleCheckResponse(selectedResponseId, feedbackText, true, feedbackFiles.length > 0 ? feedbackFiles : undefined);
                  setFeedbackModalOpen(false);
                  setFeedbackFiles([]);
                  setFeedbackText("");
                }
              }}
              className="rounded-xl bg-saBlue font-bold text-xs px-6"
            >
              Finish Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}