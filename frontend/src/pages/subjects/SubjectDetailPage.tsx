import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  CalendarDays,
  Coins,
  LayoutGrid,
  ChevronRight,
  School,
  Globe
} from "lucide-react";
import { format } from "date-fns";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SubjectDetailPage() {
  usePageTitle("Subject Details");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";

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
      const response = await teacherService.getAll({ search: user.email, limit: 1 });
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
      const response = await studentService.getAll({ search: user.email, limit: 1 });
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
          (junction: any) => junction.teacher.id === currentTeacherId
        );
        if (!isAssigned) {
          navigate("/dashboard/subjects");
          return;
        }
      }

      // Check permissions for students
      if (user?.role === "STUDENT" && currentStudentId) {
        const isEnrolled = subjectData.enrollments?.some(
          (enrollment: any) => enrollment.student.id === currentStudentId
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
      <div className="flex items-center justify-center min-vh-screen">
        <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center min-vh-screen">
        <p className="text-lg font-medium text-gray-600">Subject not found</p>
        <Button onClick={() => navigate("/dashboard/subjects")} className="mt-4 rounded-xl">
          Back to Subjects
        </Button>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const SectionTitle = ({ icon: Icon, title, description }: { icon: any, title: string, description?: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-saBlue/10 rounded-xl text-saBlue">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        {description && <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider font-mono">{description}</p>}
      </div>
    </div>
  );

  const InfoItem = ({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon?: any }) => (
    <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all duration-300">
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</span>
        <span className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">
          {value || '-'}
        </span>
      </div>
      {Icon && <Icon className="w-4 h-4 text-gray-300 group-hover:text-saBlue transition-colors" />}
    </div>
  );

  const ModuleButton = ({ label, icon: Icon, onClick, variant = "saBlue" }: { label: string, icon: any, onClick: () => void, variant?: string }) => (
    <Button
      variant="outline"
      onClick={onClick}
      className="w-full h-14 justify-between px-4 rounded-2xl border-gray-100 hover:border-saBlue/30 hover:bg-saBlue/5 group transition-all"
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-${variant}/10 text-${variant}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-bold text-gray-700">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-saBlue transition-colors" />
    </Button>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* 1. TOP HEADER SECTION */}
      <div className="relative">
        <div className="h-28 w-full bg-gradient-to-r from-saBlue to-blue-400 rounded-3xl relative overflow-hidden shadow-lg shadow-blue-900/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3"></div>

          <Button
            variant="ghost"
            className="absolute top-4 left-4 text-white hover:bg-white/20 hover:text-white rounded-xl"
            onClick={() => navigate("/dashboard/subjects")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        <div className="px-6 sm:px-10 pb-4">
          <div className="flex flex-col sm:flex-row items-end -mt-16 gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[2rem] border-[6px] border-white bg-white shadow-xl overflow-hidden relative z-10">
                <img
                  src={resolveImageUrl(subject.cover_image) || `https://placehold.co/400x300/f3f4f6/3b82f6?text=${encodeURIComponent(subject.name)}`}
                  alt={subject.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
            </div>

            <div className="flex-1 pb-2 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{subject.name}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100 rounded-lg py-1 px-3">
                  <LayoutGrid className="w-3 h-3 mr-1.5" />
                  {subject.is_course ? "Course" : "Subject"}
                </Badge>
                {subject.class && (
                  <Badge variant="outline" className="border-gray-200 text-gray-500 bg-white rounded-lg py-1 px-3">
                    <School className="w-3 h-3 mr-1.5" />
                    {subject.class.name}
                  </Badge>
                )}
                {subject.board && (
                  <Badge variant="outline" className="border-gray-200 text-gray-500 bg-white rounded-lg py-1 px-3">
                    <Globe className="w-3 h-3 mr-1.5" />
                    {subject.board.name}
                  </Badge>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-center">
                <Button
                  onClick={() => navigate(`/dashboard/subjects/${subject.id}/edit`)}
                  className="rounded-xl bg-saBlue h-12 px-6 shadow-md shadow-saBlue/20 hover:bg-saBlue/90 font-bold uppercase tracking-wider text-xs"
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit Details
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-2">
        {/* BASIC INFO */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <SectionTitle icon={BookOpen} title="Information" description="Standard Details" />
            <div className="space-y-3">
              <InfoItem label="Subject Name" value={subject.name} icon={BookOpen} />
              <InfoItem label="Type" value={subject.is_course ? "Course" : "Regular Subject"} icon={GraduationCap} />
              <InfoItem label="Price" value={subject.price ? `${subject.currency?.symbol || '$'} ${subject.price.toLocaleString()}` : 'Free'} icon={Coins} />
            </div>
          </CardContent>
        </Card>

        {/* STATISTICS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <SectionTitle icon={LayoutGrid} title="Activity" description="Internal Stats" />
            <div className="space-y-3">
              <InfoItem label="Total Enrolled" value={`${subject._count?.enrollments || 0} Students`} icon={Users} />
              <InfoItem label="Assigned Teachers" value={`${subject._count?.teacher_subject_junctions || 0} Educators`} icon={UserCheck} />
              <InfoItem label="Creation Date" value={format(new Date(subject.created_at), "PPP")} icon={CalendarDays} />
            </div>
          </CardContent>
        </Card>

        {/* OPERATIONS / MODULES */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <SectionTitle icon={GraduationCap} title="Management" description="Course Content" />
            <div className="space-y-3">
              {(user?.role === "TEACHER" || user?.role === "ADMIN") ? (
                <>
                  <ModuleButton
                    label="Manage Modules"
                    icon={BookOpen}
                    onClick={() => navigate(`/dashboard/subjects/${subject.id}/modules`)}
                  />
                  <ModuleButton
                    label="Student Progress"
                    icon={Users}
                    onClick={() => navigate(`/dashboard/subjects/${subject.id}/progress`)}
                    variant="green"
                  />
                </>
              ) : (user?.role === "STUDENT") ? (
                <ModuleButton
                  label="Start Learning"
                  icon={GraduationCap}
                  onClick={() => navigate(`/dashboard/subjects/${subject.id}/student-modules`)}
                  variant="saVividOrange"
                />
              ) : (
                <div className="text-center py-4 text-gray-400 text-xs italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Login as teacher or student to see modules
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. SYLLABUS & PEOPLE */}
      <div className="grid gap-6 md:grid-cols-3 px-2">
        {/* SYLLABUS LIST */}
        <div className="md:col-span-2">
          <Card className="rounded-3xl border-gray-100 shadow-sm h-full">
            <CardHeader className="p-6 pb-0">
              <SectionTitle icon={BookOpen} title="Course Syllabus" description="Curriculum Structure" />
            </CardHeader>
            <CardContent className="p-6">
              {subject.syllabus?.units?.length > 0 ? (
                <div className="space-y-4">
                  {subject.syllabus.units.map((unit: { name: string; content: string }, index: number) => (
                    <div key={index} className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-saBlue font-bold text-sm shadow-sm shrink-0 group-hover:bg-saBlue group-hover:text-white transition-colors">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-700 mb-1">{unit.name}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">{unit.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50/50 rounded-3xl border border-dashed border-gray-100">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <BookOpen className="w-8 h-8 text-gray-200" />
                  </div>
                  <h4 className="font-bold text-gray-400">No Syllabus Defined</h4>
                  <p className="text-xs text-gray-300 mt-1">Visit the edit page to add curriculum units</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR - TEACHERS & RECENT STUDENTS */}
        <div className="space-y-6">
          {/* TEACHERS */}
          {(subject.teacher_subject_junctions?.length ?? 0) > 0 && (
            <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-0">
                <SectionTitle icon={UserCheck} title="Teachers" description="Educators" />
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {subject.teacher_subject_junctions?.map((junction) => (
                  <div key={junction.id} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer" onClick={() => navigate(`/dashboard/teachers/${junction.teacher.id}`)}>
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                      <AvatarImage src={resolveImageUrl((junction.teacher.user as any).profile_url)} />
                      <AvatarFallback className="bg-saBlue text-white text-[10px] uppercase font-bold">{getInitials(junction.teacher.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-700 text-xs truncate">{junction.teacher.user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{junction.teacher.user.email}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* STUDENTS */}
          {isAdmin && (subject.enrollments?.length ?? 0) > 0 && (
            <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-0">
                <SectionTitle icon={Users} title="Top Students" description="Active Enrollees" />
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {subject.enrollments?.slice(0, 5).map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer" onClick={() => navigate(`/dashboard/students/${enrollment.student.id}`)}>
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                      <AvatarImage src={resolveImageUrl((enrollment.student.user as any).profile_url)} />
                      <AvatarFallback className="bg-green-500 text-white text-[10px] uppercase font-bold">{getInitials(enrollment.student.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-700 text-xs truncate">{enrollment.student.user.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{enrollment.student.user.email}</p>
                    </div>
                  </div>
                ))}
                {(subject.enrollments?.length ?? 0) > 5 && (
                  <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-saBlue hover:bg-blue-50">
                    + {(subject.enrollments?.length ?? 0) - 5} More Students
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 4. FOOTER STATS */}
      <div className="px-2">
        <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-100/50 flex flex-wrap gap-6 items-center justify-center text-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays className="w-4 h-4 text-saBlue" />
            Created: <span className="font-bold text-gray-700">{format(new Date(subject.created_at), "PPP")}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <LayoutGrid className="w-4 h-4 text-saBlue" />
            Last Updated: <span className="font-bold text-gray-700">{format(new Date(subject.updated_at), "PPP")}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Status: <span className="font-bold text-green-600 uppercase tracking-tighter">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
