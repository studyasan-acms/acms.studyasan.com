import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { subjectService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

import type { Subject } from "@/types";

import { ArrowLeft, Upload, Loader2, Users } from "lucide-react";

interface Student {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function CreateHomeworkPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    subject_id: "",
    title: "",
    description: "",
    due_date: "",
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const fetchSubjects = async () => {
    try {
      const params: any = {};
      // Don't filter by teacher - allow teachers to see all subjects for homework creation
      // Backend will validate permissions during creation
      const response = await subjectService.getAll(params);
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error("Failed to load subjects");
    }
  };

  const fetchStudentsForSubject = async (subjectId: string) => {
    try {
      // Get enrollments for the subject using the enrollments endpoint
      const response = await fetch(`/api/enrollments?subject_id=${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const enrolledStudents = data.data.data.map((enrollment: any) => enrollment.student);
        setStudents(enrolledStudents);
        // By default, select all enrolled students
        setSelectedStudents(enrolledStudents.map((s: Student) => s.id));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubjectChange = (subjectId: string) => {
    setFormData(prev => ({ ...prev, subject_id: subjectId }));
    if (subjectId) {
      fetchStudentsForSubject(subjectId);
    } else {
      setStudents([]);
      setSelectedStudents([]);
    }
  };

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject_id || !formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('subject_id', formData.subject_id);
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('due_date', formData.due_date);
      submitData.append('assigned_student_ids', JSON.stringify(selectedStudents));

      if (documentFile) {
        submitData.append('document', documentFile);
      }

      const response = await fetch('/api/homework', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: submitData
      });

      if (response.ok) {
        toast.success("Homework created successfully");
        navigate('/dashboard/homework');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create homework');
      }
    } catch (error: any) {
      console.error('Error creating homework:', error);
      toast.error(error.message || "Failed to create homework");
    } finally {
      setLoading(false);
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Homework</h1>
          <p className="text-muted-foreground">
            Assign homework to students in your subjects
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Homework Details</CardTitle>
            <CardDescription>
              Provide the basic information for the homework assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select value={formData.subject_id} onValueChange={handleSubjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter homework title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter homework description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document">Document (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="document"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('document')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {documentFile ? documentFile.name : 'Upload Document'}
                </Button>
                {documentFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDocumentFile(null)}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Supported formats: PDF, DOC, DOCX, TXT
              </p>
            </div>
          </CardContent>
        </Card>

        {students.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Assign to Students</CardTitle>
                  <CardDescription>
                    Select which students should receive this homework
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllStudents}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAllStudents}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => handleStudentToggle(student.id)}
                    />
                    <Label
                      htmlFor={`student-${student.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {student.user.name}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <Users className="h-4 w-4 inline mr-1" />
                {selectedStudents.length} of {students.length} students selected
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/homework')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Homework
          </Button>
        </div>
      </form>
    </div>
  );
}