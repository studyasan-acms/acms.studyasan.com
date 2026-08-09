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
import { cn } from "@/lib/utils";

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
  Eye,
} from "lucide-react";
import MathRenderer from "@/components/ui/MathRenderer";
import { usePageTitle } from "@/hooks/usePageTitle";
import FilePreviewModal from "@/components/FilePreviewModal";

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
  const [previewUrl, setPreviewUrl] = useState<string | null | undefined>(null);
  const [previewTitle, setPreviewTitle] = useState("");

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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-500">
      {/* Clean Navigation & Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/homework')}
              className="h-8 px-3 text-slate-600 border-slate-200 rounded-lg text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
            <Badge className="bg-saBlue/10 text-saBlue border-saBlue/20 text-xs font-bold">
              {homework.subject.name}
            </Badge>
            {overDue && !result && (
              <Badge variant="destructive" className="text-xs font-bold">
                LATE SUBMISSION
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{homework.title}</h1>
          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" /> {homework.teacher.user.name}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Due: {homework.due_date ? new Date(homework.due_date).toLocaleDateString() : "No limit"}
            </span>
          </div>
        </div>

        {(isAdmin || isTeacher) && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/dashboard/homework/${id}/edit`)}
              className="h-9 px-4 rounded-lg border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
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
              className="rounded-lg h-9 px-4 font-semibold text-xs"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Insights Row for Teachers/Admins */}
      {(isAdmin || isTeacher) && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-slate-200/80 shadow-sm rounded-xl bg-white">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Assigned</p>
                <p className="text-lg font-extrabold text-slate-900 leading-none mt-1">{homework.assignments.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/80 shadow-sm rounded-xl bg-white">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 bg-sky-50 rounded-lg flex items-center justify-center text-saBlue shrink-0">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Received</p>
                <p className="text-lg font-extrabold text-slate-900 leading-none mt-1">{homework.responses.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200/80 shadow-sm rounded-xl bg-white">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Submission Rate</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-extrabold text-slate-900 leading-none">{Math.round((homework.responses.length / (homework.assignments.length || 1)) * 100)}%</span>
                  <div className="flex-1 h-1.5 bg-slate-150 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-saBlue rounded-full"
                      style={{ width: `${(homework.responses.length / (homework.assignments.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Homework Instructions */}
        <Card className="rounded-xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-4 pb-3 border-b border-slate-150 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-saBlue" />
              Homework Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {homework.description ? (
              <div className="text-slate-700 font-medium text-sm whitespace-pre-wrap leading-relaxed">
                {homework.description}
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400 italic text-xs">No instructions provided.</div>
            )}

            {homework.document_url && (
              <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-3 border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-saBlue border border-slate-200/60">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">Material File</h4>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reference Attachment</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPreviewUrl(homework.document_url);
                    setPreviewTitle("Material File");
                  }}
                  className="rounded-lg h-8 px-3 border-saBlue/30 text-saBlue font-bold text-xs hover:bg-saBlue hover:text-white transition-all"
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Preview
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Submission View */}
        {isStudent && (
          <Card className="rounded-xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Upload className="h-4 w-4 text-saBlue" />
                Your Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {result ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-100">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-saBlue" />
                      <div>
                        <p className="text-slate-900 font-bold text-xs">Submitted</p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{new Date(result.submitted_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {result.is_checked ?
                      <Badge className="bg-saBlue text-white text-[10px] font-bold px-2 py-0.5 rounded">CHECKED</Badge> :
                      <Badge className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">PENDING REVIEW</Badge>
                    }
                  </div>

                  {result.response_text && (
                    <div className="p-3 bg-slate-50 rounded-lg text-slate-700 font-medium text-xs border border-slate-100">
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
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="rounded-lg font-bold h-8 text-xs w-full justify-start border-slate-200"
                                onClick={() => {
                                  setPreviewUrl(url);
                                  setPreviewTitle(`Submission Attachment ${urls.length > 1 ? idx + 1 : ''}`);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-saBlue" />
                                Preview Attachment {urls.length > 1 ? `(${idx + 1})` : ''}
                              </Button>
                            ));
                          }
                        } catch {
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg font-bold h-8 text-xs w-full justify-start border-slate-200"
                              onClick={() => {
                                setPreviewUrl(result.response_media_url);
                                setPreviewTitle("Submission Attachment");
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-2 text-saBlue" />
                              Preview Attachment
                            </Button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmitResponse} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Answer / Text Body</Label>
                    <Textarea
                      placeholder="Write your response here..."
                      rows={4}
                      className="rounded-lg bg-slate-50 border-slate-200 text-xs font-medium focus-visible:ring-1 focus-visible:ring-saBlue"
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col space-y-3">
                    <input
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
                      className="h-9 rounded-lg border-dashed border-slate-300 hover:border-saBlue hover:bg-sky-50 font-bold text-slate-600 text-xs"
                    >
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      {responseFiles.length > 0 ? `${responseFiles.length} file(s) selected` : "Attach Files"}
                    </Button>

                    {responseFiles.length > 0 && (
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selected files:</p>
                        <div className="space-y-1.5">
                          {responseFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200/80">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-3.5 w-3.5 text-saBlue flex-shrink-0" />
                                <span className="text-xs font-medium text-slate-700 truncate">{file.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setResponseFiles(responseFiles.filter((_, i) => i !== index))}
                                className="h-5 w-5 p-0 text-slate-400 hover:text-red-500"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-9 rounded-lg bg-saBlue text-white font-bold text-xs shadow-sm hover:bg-sky-700"
                    >
                      {submitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Submit Assignment"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Teacher/Admin View: Submissions Data Table */}
        {(isAdmin || isTeacher) && (
          <Card className="rounded-xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-saBlue" />
                Student Submissions ({homework.responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {homework.responses.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/50">
                  <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 font-semibold text-xs">No submissions received yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-4">Submitted At</th>
                        <th className="py-2.5 px-4">Response</th>
                        <th className="py-2.5 px-4">Files</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {homework.responses.map((res) => (
                        <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-saBlue/10 text-saBlue font-bold text-xs flex items-center justify-center border border-saBlue/20">
                                {res.student.user.name[0]}
                              </div>
                              <span className="font-bold text-slate-900">{res.student.user.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-medium">
                            {new Date(res.submitted_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                            {res.response_text || <span className="text-slate-400 italic">No text</span>}
                          </td>
                          <td className="py-3 px-4">
                            {res.response_media_url ? (
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  try {
                                    const urls = JSON.parse(res.response_media_url);
                                    if (Array.isArray(urls)) {
                                      return urls.map((url, idx) => (
                                        <Button
                                          key={idx}
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 text-[10px] text-saBlue font-bold hover:bg-sky-50"
                                          onClick={() => {
                                            setPreviewUrl(url);
                                            setPreviewTitle(`${res.student.user.name}'s Attachment ${urls.length > 1 ? idx + 1 : ''}`);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" /> Preview {urls.length > 1 ? `#${idx + 1}` : 'Attachment'}
                                        </Button>
                                      ));
                                    }
                                  } catch {
                                    return (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1.5 text-[10px] text-saBlue font-bold hover:bg-sky-50"
                                        onClick={() => {
                                          setPreviewUrl(res.response_media_url);
                                          setPreviewTitle(`${res.student.user.name}'s Attachment`);
                                        }}
                                      >
                                        <Eye className="h-3 w-3 mr-1" /> Preview File
                                      </Button>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {res.is_checked ? (
                              <Badge className="bg-saBlue text-white text-[10px] font-bold px-2 py-0.5 rounded">CHECKED</Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded">PENDING</Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!res.is_checked ? (
                              <Button
                                size="sm"
                                onClick={() => { setSelectedResponseId(res.id); setFeedbackModalOpen(true); }}
                                className="h-7 px-3 rounded-lg bg-saBlue hover:bg-sky-700 text-white font-bold text-[11px]"
                              >
                                Check Now
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSelectedResponseId(res.id); setFeedbackModalOpen(true); }}
                                className="h-7 px-2.5 rounded-lg text-slate-600 font-bold text-[11px] hover:bg-slate-100"
                              >
                                Review
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
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

      <FilePreviewModal
        isOpen={!!previewUrl}
        onClose={() => setPreviewUrl(null)}
        url={previewUrl || undefined}
        title={previewTitle}
      />
    </div>
  );
}