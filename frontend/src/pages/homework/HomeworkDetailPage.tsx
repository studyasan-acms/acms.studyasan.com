import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Eye,
} from "lucide-react";

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
    checker?: {
      id: number;
      name: string;
    };
  }[];
}

export default function HomeworkDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [responseFile, setResponseFile] = useState<File | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedResponseId, setSelectedResponseId] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

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
      toast.error("Failed to load homework details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchHomework();
    }
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResponseFile(file);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!responseText.trim() && !responseFile) {
      toast.error("Please provide a response text or upload a file");
      return;
    }

    setSubmitting(true);

    try {
      const submitData = new FormData();
      submitData.append('response_text', responseText);

      if (responseFile) {
        submitData.append('response_media', responseFile);
      }

      const response = await fetch(`/api/homework/${id}/response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });

      if (response.ok) {
        toast.success("Homework response submitted successfully");
        fetchHomework(); // Refresh the data
        setResponseText("");
        setResponseFile(null);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit response');
      }
    } catch (error: any) {
      console.error('Error submitting response:', error);
      toast.error(error.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckResponse = async (responseId: number, feedback: string, isChecked: boolean) => {
    try {
      const response = await fetch(`/api/homework/responses/${responseId}/check`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback, is_checked: isChecked })
      });

      if (response.ok) {
        toast.success("Response checked successfully");
        fetchHomework(); // Refresh the data
      } else {
        throw new Error('Failed to check response');
      }
    } catch (error: any) {
      console.error('Error checking response:', error);
      toast.error(error.message || "Failed to check response");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (selectedResponseId) {
      await handleCheckResponse(selectedResponseId, feedbackText, true);
      setFeedbackModalOpen(false);
      setFeedbackText("");
      setSelectedResponseId(null);
    }
  };

  const getUserResponse = () => {
    if (!homework || user?.role !== 'STUDENT') return null;
    return homework.responses.find(r => r.student.user.id === user.id);
  };

  const isOverdue = () => {
    if (!homework?.due_date) return false;
    return new Date(homework.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!homework) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium">Homework not found</h3>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard/homework')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Homework
        </Button>
      </div>
    );
  }

  const userResponse = getUserResponse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard/homework')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{homework.title}</h1>
          <p className="text-muted-foreground">
            Subject: {homework.subject.name} • Teacher: {homework.teacher.user.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Homework Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Homework Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {homework.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground">{homework.description}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(homework.created_at).toLocaleDateString()}
                </div>
                {homework.due_date && (
                  <div className={`flex items-center gap-1 ${isOverdue() ? 'text-red-600' : ''}`}>
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Due:</span>{" "}
                    {new Date(homework.due_date).toLocaleDateString()}
                    {isOverdue() && <Badge variant="destructive" className="ml-2">Overdue</Badge>}
                  </div>
                )}
              </div>

              {homework.document_url && (
                <div>
                  <h4 className="font-medium mb-2">Attached Document</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(homework.document_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Response Section */}
          {user?.role === 'STUDENT' && (
            <Card>
              <CardHeader>
                <CardTitle>Your Response</CardTitle>
                <CardDescription>
                  {userResponse ? 'Your submitted response' : 'Submit your homework response'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userResponse ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={userResponse.is_checked ? "default" : "secondary"}>
                        {userResponse.is_checked ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Checked
                          </>
                        ) : (
                          'Submitted'
                        )}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Submitted on {new Date(userResponse.submitted_at).toLocaleDateString()}
                      </span>
                    </div>

                    {userResponse.response_text && (
                      <div>
                        <h4 className="font-medium mb-2">Your Answer</h4>
                        <p className="text-muted-foreground">{userResponse.response_text}</p>
                      </div>
                    )}

                    {userResponse.response_media_url && (
                      <div>
                        <h4 className="font-medium mb-2">Attached File</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(userResponse.response_media_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Your File
                        </Button>
                      </div>
                    )}

                    {userResponse.is_checked && userResponse.feedback && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Teacher Feedback
                        </h4>
                        <p className="text-muted-foreground">{userResponse.feedback}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitResponse} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Your Answer</label>
                      <Textarea
                        placeholder="Write your response here..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Attach File (Optional)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          onChange={handleFileChange}
                          className="hidden"
                          id="response-file"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('response-file')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {responseFile ? responseFile.name : 'Upload File'}
                        </Button>
                        {responseFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setResponseFile(null)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: Images, PDF, DOC, DOCX, TXT
                      </p>
                    </div>

                    <Button type="submit" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit Response
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Teacher Responses View */}
          {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
            <Card>
              <CardHeader>
                <CardTitle>Student Responses ({homework.responses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {homework.responses.length === 0 ? (
                  <p className="text-muted-foreground">No responses submitted yet.</p>
                ) : (
                  <div className="space-y-4">
                    {homework.responses.map((response) => (
                      <Card key={response.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{response.student.user.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Submitted {new Date(response.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={response.is_checked ? "default" : "secondary"}>
                            {response.is_checked ? 'Checked' : 'Pending'}
                          </Badge>
                        </div>

                        {response.response_text && (
                          <div className="mb-2">
                            <p className="text-sm">{response.response_text}</p>
                          </div>
                        )}

                        {response.response_media_url && (
                          <div className="mb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(response.response_media_url, '_blank')}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download File
                            </Button>
                          </div>
                        )}

                        {response.is_checked && response.feedback && (
                          <div className="bg-muted p-3 rounded text-sm">
                            <strong>Feedback:</strong> {response.feedback}
                          </div>
                        )}

                        {!response.is_checked && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => handleCheckResponse(response.id, '', true)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark as Checked
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedResponseId(response.id);
                                setFeedbackModalOpen(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Check with Feedback
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Students:</span>
                <span className="font-medium">{homework.assignments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Submitted:</span>
                <span className="font-medium">{homework.responses.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending:</span>
                <span className="font-medium">
                  {homework.assignments.length - homework.responses.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Enter your feedback for this homework response (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackModalOpen(false);
                setFeedbackText("");
                setSelectedResponseId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleFeedbackSubmit}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}