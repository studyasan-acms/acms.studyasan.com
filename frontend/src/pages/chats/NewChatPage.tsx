import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatService, enrollmentService, subjectService, teacherService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Subject, Teacher, Enrollment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, BookOpen, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface SubjectWithTeachers extends Subject {
  teachers: Teacher[];
}

const NewChatPage = () => {
  const [subjects, setSubjects] = useState<SubjectWithTeachers[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'STUDENT') {
      loadStudentSubjects();
    } else {
      // For teachers and admins, show all subjects they teach
      loadTeacherSubjects();
    }
  }, [user]);

  const loadStudentSubjects = async () => {
    try {
      // Get student's enrollments
      const enrollmentsResponse = await enrollmentService.getAll({ student_id: user?.id });
      const enrolledSubjectIds = enrollmentsResponse.data.data.map((e: Enrollment) => e.subject_id);

      if (enrolledSubjectIds.length > 0) {
        // Get subject details with teachers
        const subjectsWithTeachers = await Promise.all(
          enrolledSubjectIds.map(async (subjectId) => {
            const [subjectResponse, teachersResponse] = await Promise.all([
              subjectService.getById(subjectId),
              teacherService.getBySubject(subjectId)
            ]);
            
            return {
              ...subjectResponse.data,
              teachers: teachersResponse.data
            };
          })
        );
        
        setSubjects(subjectsWithTeachers);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherSubjects = async () => {
    try {
      // For teachers, get subjects they teach
      const subjectsResponse = await subjectService.getAll();
      const subjectsWithTeachers = await Promise.all(
        subjectsResponse.data.data.map(async (subject: Subject) => {
          const teachersResponse = await teacherService.getBySubject(subject.id);
          return {
            ...subject,
            teachers: teachersResponse.data
          };
        })
      );
      setSubjects(subjectsWithTeachers);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const startChatWithTeacher = async (teacherId: number) => {
    if (startingChat) return;
    
    setStartingChat(true);
    try {
      const response = await chatService.startChat({
        participantIds: [teacherId]
      });

      toast.success('Chat started successfully!');
      navigate(`/dashboard/chats/${response.data.id}`);
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast.error(error.response?.data?.message || 'Failed to start chat');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Start New Chat</h1>
          <p className="text-muted-foreground">
            {user?.role === 'STUDENT'
              ? 'Connect with your subject teachers'
              : 'Start conversations with students or colleagues'
            }
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/chats')}>
          Back to Chats
        </Button>
      </div>

      {subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No subjects found</h3>
            <p className="text-muted-foreground text-center">
              {user?.role === 'STUDENT'
                ? 'You are not enrolled in any subjects yet.'
                : 'No subjects available.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {subjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>{subject.name}</span>
                  {subject.class && (
                    <Badge variant="secondary">
                      {subject.class.name}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Available Teachers ({subject.teachers.length})</span>
                  </h4>

                  {subject.teachers.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      No teachers assigned to this subject yet.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {subject.teachers.map((teacher) => (
                        <Card key={teacher.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {teacher.user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{teacher.user.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {teacher.user.email}
                                </p>
                                {teacher.qualification && (
                                  <p className="text-xs text-muted-foreground">
                                    {teacher.qualification}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => startChatWithTeacher(teacher.user.id)}
                              size="sm"
                              disabled={startingChat}
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              {startingChat ? 'Starting...' : 'Start Chat'}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewChatPage;