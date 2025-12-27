import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { subjectService, teacherService, studentService } from "@/services/api";
import type { Subject } from "@/types";
import {
  ArrowLeft,
  Edit,
  Loader2,
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/authStore";

export default function SubjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTeacherId, setCurrentTeacherId] = useState<number | null>(null);
  const [currentStudentId, setCurrentStudentId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.role === "TEACHER") {
      fetchCurrentTeacher();
    } else if (user?.role === "STUDENT") {
      fetchCurrentStudent();
    }

    const shouldFetch =
      (user?.role !== "TEACHER" && user?.role !== "STUDENT") ||
      (user?.role === "TEACHER" && currentTeacherId !== null) ||
      (user?.role === "STUDENT" && currentStudentId !== null);

    if (id && shouldFetch) {
      fetchSubject(parseInt(id));
    }
  }, [id, user, currentTeacherId, currentStudentId]);

  const fetchCurrentTeacher = async () => {
    if (!user) return;

    try {
      // We need to find the teacher profile for the current user
      // Since we don't have a direct endpoint, we'll search teachers by user email
      const response = await teacherService.getAll({
        search: user.email,
        limit: 1,
      });

      if (response.data.data.length > 0) {
        setCurrentTeacherId(response.data.data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch current teacher:", error);
    }
  };

  const fetchCurrentStudent = async () => {
    if (!user) return;

    try {
      // We need to find the student profile for the current user
      // Since we don't have a direct endpoint, we'll search students by user email
      const response = await studentService.getAll({
        search: user.email,
        limit: 1,
      });

      if (response.data.data.length > 0) {
        setCurrentStudentId(response.data.data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch current student:", error);
    }
  };

  const fetchSubject = async (subjectId: number) => {
    setIsLoading(true);
    try {
      const response = await subjectService.getById(subjectId);
      const subjectData = response.data;

      // Check permissions for teachers
      if (user?.role === "TEACHER" && currentTeacherId) {
        const isAssigned = subjectData.teacher_subject_junctions?.some(
          (junction) => junction.teacher.id === currentTeacherId
        );
        if (!isAssigned) {
          navigate("/dashboard/subjects");
          return;
        }
      }

      // Check permissions for students
      if (user?.role === "STUDENT" && currentStudentId) {
        const isEnrolled = subjectData.enrollments?.some(
          (enrollment) => enrollment.student.id === currentStudentId
        );
        if (!isEnrolled) {
          navigate("/dashboard/subjects");
          return;
        }
      }

      setSubject(subjectData);
    } catch (error) {
      console.error("Failed to fetch subject:", error);
      navigate("/dashboard/subjects");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg font-medium">Subject not found</p>
        <Button
          onClick={() => navigate("/dashboard/subjects")}
          className="mt-4"
        >
          Back to Subjects
        </Button>
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col space-y-4">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard/subjects")}
          className="flex items-center text-blue-600 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Subjects
        </button>

        {/* Subject Details */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-600">{subject.name}</h1>
            <p className="text-muted-foreground mt-1">Subject Details</p>
          </div>

          {isAdmin && (
            <Button
              onClick={() => navigate(`/dashboard/subjects/${subject.id}/edit`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Subject
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Basic Information
            </CardTitle>
            <CardDescription>Subject details</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Subject Name */}
            <div className="flex items-center space-x-3">
              <BookOpen className="h-5 w-5 text-saBlue/50" />
              <div>
                <p className="font-medium text-gray-600 mb-1">Subject Name</p>
                <p className="text-muted-foreground">{subject.name}</p>
              </div>
            </div>

            {/* Type */}
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-5 w-5 text-saBlue/50" />
              <div>
                <p className="font-medium text-gray-600 mb-1">Type</p>
                <p className="text-muted-foreground">
                  {subject.is_course ? "Course" : "Subject"}
                </p>
              </div>
            </div>

            {/* Cover Image */}
            {subject.cover_image && (
              <div className="flex items-center space-x-3">
                <BookOpen className="h-5 w-5 text-saBlue/50" />
                <div className="flex-1">
                  <p className="font-medium text-gray-600 mb-2">Cover Image</p>
                  <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
                    <img
                      src={subject.cover_image}
                      alt={subject.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement!.innerHTML =
                          '<div class="flex items-center justify-center h-full"><Image class="h-12 w-12 text-muted-foreground" /></div>';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Classification
            </CardTitle>
            <CardDescription>Class and board information</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Class */}
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-saBlue/50" />

              <div>
                <p className="font-medium text-gray-600 mb-1">Class</p>
                {subject.class ? (
                  <p className="text-muted-foreground">{subject.class.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>

            {/* Board */}
            <div className="flex items-center space-x-3">
              <BookOpen className="h-5 w-5 text-saBlue/50" />

              <div>
                <p className="font-medium text-gray-600 mb-1">Board</p>
                {subject.board ? (
                  <p className="text-muted-foreground">{subject.board.name}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">Statistics</CardTitle>
            <CardDescription>
              Enrollment and teacher information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-saBlue/50" />
                <span className="text-gray-600 font-medium">
                  Total Enrollments
                </span>
              </div>
              <Badge className="bg-saBlue/50">
                {subject._count?.enrollments || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-gray-600">
                <UserCheck className="h-5 w-5 text-saBlue/50" />
                <span className="text-gray-600 font-medium">
                  Assigned Teachers
                </span>
              </div>
              <Badge className="bg-saBlue/50">
                {subject._count?.teacher_subject_junctions || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">Modules</CardTitle>
            <CardDescription>
              Course content and learning materials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.role === "TEACHER" || user?.role === "ADMIN" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-saBlue/50" />
                  <span className="text-gray-600 font-medium">
                    Manage Modules
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/dashboard/subjects/${subject.id}/modules`)
                  }
                  className="text-gray-600 border-saBlue/50"
                >
                  View Modules
                </Button>
              </div>
            ) : user?.role === "STUDENT" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="h-5 w-5 text-saBlue/50" />
                  <span className="text-gray-600 font-medium">
                    Study Modules
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/dashboard/subjects/${subject.id}/student-modules`
                    )
                  }
                >
                  Start Learning
                </Button>
              </div>
            ) : null}
            {user?.role === "TEACHER" || user?.role === "ADMIN" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-saBlue/50" />
                  <span className="text-gray-600 font-medium">
                    Student Progress
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/dashboard/subjects/${subject.id}/progress`)
                  }
                  className="text-gray-600 border-saBlue/50"
                >
                  View Progress
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">Timeline</CardTitle>
            <CardDescription>Important dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm font-medium text-gray-600">
                {format(new Date(subject.created_at), "PPP")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Last Updated
              </span>
              <span className="text-sm font-medium text-gray-600">
                {format(new Date(subject.updated_at), "PPP")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Syllabus */}
      {subject.syllabus &&
        subject.syllabus.units &&
        subject.syllabus.units.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">Syllabus</CardTitle>
              <CardDescription>
                Subject curriculum ({subject.syllabus.units.length} units)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subject.syllabus.units.map(
                  (unit: { name: string; content: string }, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted rounded-md"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">{unit.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {unit.content}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Assigned Teachers */}
      {subject.teacher_subject_junctions &&
        subject.teacher_subject_junctions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-600 text-xl">Assigned Teachers</CardTitle>
              <CardDescription>
                Teachers teaching this subject (
                {subject.teacher_subject_junctions.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {subject.teacher_subject_junctions.map((junction) => (
                  <Card key={junction.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(junction.teacher.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-600">
                            {junction.teacher.user.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {junction.teacher.user.email}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Enrolled Students */}
      {subject.enrollments && subject.enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-600 text-xl">Enrolled Students</CardTitle>
            <CardDescription>
              Students enrolled in this subject ({subject.enrollments.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {subject.enrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback className="bg-saBlue/50 text-white">
                          {getInitials(enrollment.student.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-600">
                          {enrollment.student.user.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {enrollment.student.user.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
