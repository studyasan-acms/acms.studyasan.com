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
import { usePageTitle } from "@/hooks/usePageTitle";
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';

import { ArrowLeft, Upload, Loader2, Users, BookOpen, Calendar, FileText, Check, X, Send, Clock, Plus } from "lucide-react";

interface Student {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

// Convert datetime-local string to UTC ISO string
function convertLocalToUTC(localDateTimeString: string): string {
  if (!localDateTimeString) return "";
  // datetime-local input value is interpreted as local time by JavaScript
  // Simply creating a Date and converting to ISO gives us the UTC equivalent
  return new Date(localDateTimeString).toISOString();
}

export default function CreateHomeworkPage() {
  usePageTitle("Create Assignment");
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
      if (user?.id && user?.role) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data.data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error("Failed to load subjects");
    }
  };

  const fetchStudentsForSubject = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/enrollments?subject_id=${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const enrolledStudents = data.data.data.map((enrollment: any) => enrollment.student);
        setStudents(enrolledStudents);
        setSelectedStudents(enrolledStudents.map((s: Student) => s.id));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [user]);

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
      toast.error("Title and Subject are required");
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error("Select at least one student");
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('subject_id', formData.subject_id);
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('due_date', formData.due_date ? convertLocalToUTC(formData.due_date) : "");
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
        toast.success("Assignment published!");
        navigate('/dashboard/homework');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create');
      }
    } catch (error: any) {
      console.error('Error creating homework:', error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/homework')}
          className="hover:bg-gray-100 -ml-2 w-fit h-8 px-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Assignment</h1>
        <p className="text-gray-500 text-sm">Fill in the details to publish new work for your students.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-100 p-4">
                <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-saBlue" />
                  General Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs font-bold text-gray-700">Assignment Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g. History Project, Math Quiz"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="border-gray-100 bg-gray-50 focus-visible:ring-1 focus-visible:ring-saBlue rounded-xl h-10 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-bold text-gray-700">Instructions</Label>
                  <Textarea
                    id="description"
                    placeholder="What should students do?..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={6}
                    className="border-gray-100 bg-gray-50 focus-visible:ring-1 focus-visible:ring-saBlue rounded-xl resize-none text-sm font-medium"
                  />
                </div>
              </CardContent>
            </Card>

            {students.length > 0 ? (
              <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50 border-b border-gray-100 flex flex-row items-center justify-between p-4">
                  <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4 text-saBlue" />
                    Student Selection ({selectedStudents.length})
                  </CardTitle>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllStudents}
                      className="text-[10px] h-7 px-2 font-bold text-saBlue hover:bg-blue-50"
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAllStudents}
                      className="text-[10px] h-7 px-2 font-bold text-red-500 hover:bg-red-50"
                    >
                      None
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => handleStudentToggle(student.id)}
                        className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedStudents.includes(student.id)
                            ? "bg-blue-50 border-saBlue/20"
                            : "bg-white border-gray-50 hover:border-gray-200"
                          }`}
                      >
                        <div className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${selectedStudents.includes(student.id)
                            ? "bg-saBlue border-saBlue text-white"
                            : "bg-white border-gray-300"
                          }`}>
                          {selectedStudents.includes(student.id) && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">{student.user.name}</p>
                          <p className="text-[9px] text-gray-400 truncate">{student.user.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : formData.subject_id && (
              <div className="p-10 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
                <Users className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-500 font-bold text-sm">No students available</p>
                <p className="text-gray-400 text-xs">This subject has no enrolled students.</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-100 p-4">
                <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-saBlue" />
                  Parameters
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Academic Subject *</Label>
                  <Select value={formData.subject_id} onValueChange={handleSubjectChange}>
                    <SelectTrigger className="border-gray-100 bg-gray-50 rounded-xl h-10 text-xs font-medium">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-100">
                      <SearchablePaginatedSelect
                        searchPlaceholder="Search subject..."
                        options={subjects.map((subject) => {
                          const classPart = subject.class?.name ? ` (${subject.class.name})` : '';
                          const boardPart = subject.board?.name ? ` [${subject.board.name}]` : '';
                          return {
                            value: subject.id.toString(),
                            label: `${subject.name}${classPart}${boardPart}`,
                            searchText: `${subject.name} ${subject.class?.name || ''} ${subject.board?.name || ''}`
                          };
                        })}
                      />
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="border-gray-100 bg-gray-50 rounded-xl h-10 text-xs font-medium"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-100 p-4">
                <CardTitle className="text-base font-bold text-gray-700 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-saBlue" />
                  Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <input
                    id="document"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {!documentFile ? (
                    <div
                      onClick={() => document.getElementById('document')?.click()}
                      className="border-2 border-dashed border-gray-100 rounded-xl p-6 text-center hover:border-saBlue/30 hover:bg-blue-50/50 transition-all cursor-pointer group"
                    >
                      <Upload className="h-6 w-6 text-gray-200 mx-auto mb-2" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Attach file</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-saBlue/10 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-saBlue" />
                        <span className="text-[10px] font-bold text-saBlue truncate">{documentFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setDocumentFile(null)}
                        className="h-6 w-6 text-saBlue hover:bg-white/50"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2.5">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-saBlue hover:bg-saBlueDarkHover text-white h-11 rounded-xl shadow-sm font-bold text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Publish Work</>}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/dashboard/homework')}
                className="w-full text-gray-400 font-bold text-xs"
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}