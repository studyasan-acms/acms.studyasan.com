import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { subjectService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

import type { Subject } from "@/types";

import {
  Plus,
  Eye,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  User,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Homework {
  id: number;
  title: string;
  description?: string;
  document_url?: string;
  document_type?: string;
  due_date?: string;
  created_at: string;
  subject: Subject;
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
  _count: {
    assignments: number;
    responses: number;
  };
  response?: {
    id: number;
    response_text?: string;
    response_media_url?: string;
    response_media_type?: string;
    submitted_at: string;
    is_checked: boolean;
    feedback?: string;
  };
}

export default function HomeworkPage() {
  usePageTitle("Homework");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchHomework = useCallback(async () => {
    try {
      setLoading(true);
      let response;

      if (user?.role === 'STUDENT') {
        response = await fetch('/api/homework/student', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      } else {
        // For teachers and admins, get homework by subject or all
        const url = selectedSubject && selectedSubject !== 'all'
          ? `/api/subjects/${selectedSubject}/homework`
          : '/api/homework/teacher'; // We'll need to create this endpoint
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }

      if (response.ok) {
        const data = await response.json();
        let homeworkData = data.data.data || [];

        // For student homework, normalize the structure to match teacher homework
        if (user?.role === 'STUDENT') {
          homeworkData = homeworkData.map((item: any) => ({
            ...item.homework,
            response: item.response,
            student: item.student
          }));
        }

        setHomework(homeworkData);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.role, selectedSubject]);

  const fetchSubjects = useCallback(async () => {
    try {
      const params: any = {};
      if (user?.role === 'TEACHER') {
        params.teacher_id = user.id;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchHomework();
  }, [fetchHomework]);

  const handleCreateHomework = () => {
    navigate('/dashboard/homework/create');
  };

  const handleViewHomework = (homeworkId: number) => {
    navigate(`/dashboard/homework/${homeworkId}`);
  };

  const getStatusBadge = (homework: Homework) => {
    if (user?.role === 'STUDENT') {
      if (homework.response?.is_checked) {
        return <Badge variant="default" className="bg-green-500">Checked</Badge>;
      } else if (homework.response) {
        return <Badge variant="secondary">Submitted</Badge>;
      } else {
        return <Badge variant="destructive">Pending</Badge>;
      }
    }
    return null;
  };

  const getSubmissionStatus = (homework: Homework) => {
    const submitted = homework._count.responses;
    const total = homework._count.assignments;
    return `${submitted}/${total} submitted`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homework</h1>
          <p className="text-muted-foreground">
            {user?.role === 'STUDENT'
              ? 'View and submit your homework assignments'
              : 'Manage homework assignments for your subjects'
            }
          </p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
          <Button onClick={handleCreateHomework}>
            <Plus className="h-4 w-4 mr-2" />
            Create Homework
          </Button>
        )}
      </div>

      {/* Subject Filter for Teachers/Admins */}
      {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
        <Card>
          <CardHeader>
            <CardTitle>Filter by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id.toString()}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Homework List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'STUDENT' ? 'My Homework' : 'Homework Assignments'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {homework.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No homework found</h3>
              <p className="text-muted-foreground">
                {user?.role === 'STUDENT'
                  ? 'You have no homework assignments yet.'
                  : 'Create your first homework assignment.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {homework.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{item.title}</h3>
                        {getStatusBadge(item)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Subject: {item.subject?.name || 'Unknown Subject'}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        Teacher: {item.teacher?.user?.name || 'Unknown Teacher'}
                      </p>
                      {item.due_date && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Due: {new Date(item.due_date).toLocaleDateString()}
                        </p>
                      )}
                      {user?.role !== 'STUDENT' && (
                        <p className="text-sm text-muted-foreground">
                          {getSubmissionStatus(item)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewHomework(item.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}