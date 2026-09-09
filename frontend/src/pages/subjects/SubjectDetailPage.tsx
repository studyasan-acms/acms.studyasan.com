import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveImageUrl, normalizeSyllabus } from "@/lib/utils";
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

  // ⚠️ Hooks must be called before any early returns (Rules of Hooks)
  const normalizedSyllabus = useMemo(() => normalizeSyllabus(subject?.syllabus), [subject?.syllabus]);
  const isCourseEnded = subject?.is_course && subject?.end_date && new Date(subject.end_date) < new Date();

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
      className="w-full h-11 justify-between px-4 rounded-xl border-gray-100 hover:border-saBlue/30 hover:bg-saBlue/5 group transition-all"
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-lg bg-${variant}/10 text-${variant}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-bold text-gray-700 text-xs">{label}</span>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-saBlue transition-colors" />
    </Button>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Course Ended Banner */}
      {isCourseEnded && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4">
          <CalendarDays className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">This course has ended</p>
            <p className="text-xs text-red-500 mt-0.5">The course end date was {format(new Date(subject.end_date!), 'PPP')}. Content is still accessible but no new enrolments are expected.</p>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER SECTION */}
      <div className="relative overflow-hidden bg-slate-50 rounded-[32px] border border-slate-100 shadow-sm group">
        {/* Animated Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-saBlue/5 rounded-full blur-[100px] animate-pulse duration-[4000ms]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-[80px]" />

        <div className="px-6 sm:px-8 pt-6 pb-6 relative z-10">
          <Button
            variant="ghost"
            className="mb-4 text-slate-500 hover:text-saBlue hover:bg-saBlue/5 rounded-xl transition-all h-9 px-3 group/back"
            onClick={() => navigate("/dashboard/subjects")}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover/back:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Back to Subjects</span>
          </Button>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="relative group/img shrink-0">
              <div className="w-32 h-32 rounded-[2rem] border-[4px] border-white bg-white shadow-xl overflow-hidden relative z-10 transition-transform duration-500 group-hover/img:scale-105">
                <img
                  src={resolveImageUrl(subject.cover_image) || `https://placehold.co/400x300/f3f4f6/3b82f6?text=${encodeURIComponent(subject.name)}`}
                  alt={subject.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -inset-4 bg-saBlue/10 rounded-[3rem] blur-2xl opacity-0 group-hover/img:opacity-100 transition-opacity duration-500" />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-3">
              <div className="space-y-1">
                <Badge variant="outline" className="border-saBlue/20 text-saBlue text-[9px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 bg-saBlue/5 rounded-full mb-1">
                  Academic Catalog
                </Badge>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                  {subject.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Badge variant="secondary" className="bg-slate-200/50 text-slate-700 border-none rounded-lg py-1 px-3 font-bold text-[10px] uppercase tracking-wider">
                  <LayoutGrid className="w-3 h-3 mr-1.5 text-saBlue" />
                  {subject.is_course ? "Course" : "Subject"}
                </Badge>
                {subject.class && (
                  <Badge variant="outline" className="border-slate-200 text-slate-500 bg-white rounded-lg py-1 px-3 shadow-sm font-bold text-[10px] uppercase tracking-wider">
                    <School className="w-3 h-3 mr-1.5 text-saBlue" />
                    {subject.class.name}
                  </Badge>
                )}
                {subject.board && (
                  <Badge variant="outline" className="border-slate-200 text-slate-500 bg-white rounded-lg py-1 px-3 shadow-sm font-bold text-[10px] uppercase tracking-wider">
                    <Globe className="w-3 h-3 mr-1.5 text-saBlue" />
                    {subject.board.name}
                  </Badge>
                )}
              </div>
            </div>

            {isAdmin && (
              <Button
                onClick={() => navigate(`/dashboard/subjects/${subject.id}/edit`)}
                className="rounded-xl bg-saBlue h-11 px-6 shadow-xl shadow-saBlue/20 hover:bg-saBlue/90 font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-95 group/edit"
              >
                <Edit className="mr-2 h-3.5 w-3.5 group-hover/edit:rotate-12 transition-transform" />
                Edit Configuration
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-2">
        {/* BASIC INFO */}
        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <SectionTitle icon={BookOpen} title="Information" description="Standard Details" />
            <div className="space-y-2">
              <InfoItem label="Subject Name" value={subject.name} icon={BookOpen} />
              <InfoItem label="Type" value={subject.is_course ? "Course" : "Regular Subject"} icon={GraduationCap} />
              {/* Pricing with Discount */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2.5 text-xs font-semibold text-gray-500">
                  <Coins className="w-4 h-4 text-saBlue" />
                  <span>Price</span>
                </div>
                <div className="text-right">
                  {subject.price || subject.actual_price ? (
                    <div className="flex items-center gap-1.5 justify-end flex-wrap">
                      {subject.actual_price && subject.price && subject.actual_price > subject.price ? (
                        <>
                          <span className="text-xs text-gray-400 line-through font-semibold">
                            {subject.currency?.symbol || '₹'}{subject.actual_price.toLocaleString()}
                          </span>
                          <span className="text-sm font-black text-gray-900">
                            {subject.currency?.symbol || '₹'}{subject.price.toLocaleString()}
                          </span>
                          <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-1.5 py-0.2 border-none">
                            {Math.round(((subject.actual_price - subject.price) / subject.actual_price) * 100)}% OFF
                          </Badge>
                        </>
                      ) : (
                        <span className="text-sm font-black text-gray-900">
                          {subject.currency?.symbol || '₹'}{(subject.price ?? subject.actual_price)?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-green-600">Free</span>
                  )}
                </div>
              </div>
              {subject.is_course && subject.end_date && (
                <InfoItem label="End Date" value={format(new Date(subject.end_date), 'PPP')} icon={CalendarDays} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* STATISTICS - Hidden for Students */}
        {user?.role !== "STUDENT" && (
          <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <SectionTitle icon={LayoutGrid} title="Activity" description="Internal Stats" />
              <div className="space-y-2">
                <InfoItem label="Total Enrolled" value={`${subject._count?.enrollments || 0} Students`} icon={Users} />
                <InfoItem label="Assigned Teachers" value={`${subject._count?.teacher_subject_junctions || 0} Educators`} icon={UserCheck} />
                <InfoItem label="Creation Date" value={format(new Date(subject.created_at), "PPP")} icon={CalendarDays} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* OPERATIONS / MODULES */}
        <Card className="rounded-2xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <SectionTitle icon={GraduationCap} title="Management" description="Course Content" />
            <div className="space-y-2">
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
                <div className="text-center py-4 text-gray-400 text-xs italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
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
          <Card className="rounded-2xl border-gray-100 shadow-sm h-full">
            <CardHeader className="p-5 pb-0">
              <SectionTitle icon={BookOpen} title="Course Syllabus" description="Curriculum Structure" />
            </CardHeader>
            <CardContent className="p-5">
              {normalizedSyllabus.units.length > 0 ? (
                <div className="space-y-4">
                  {normalizedSyllabus.units.map((unit: { name: string; content: string }, index: number) => (
                    <div key={index} className="flex gap-4 p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-sm transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-saBlue font-bold text-xs shadow-sm shrink-0 group-hover:bg-saBlue group-hover:text-white transition-colors">
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
                  <h4 className="font-bold text-gray-400">
                    {user?.role === "STUDENT" ? "Curriculum details pending" : "No Syllabus Defined"}
                  </h4>
                  <p className="text-xs text-gray-300 mt-1">
                    {user?.role === "STUDENT"
                      ? "Stay tuned as we update the learning pathway for this subject."
                      : "Visit the edit page to add curriculum units"}
                  </p>
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
                  <div
                    key={junction.id}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl transition-colors border border-transparent ${isAdmin ? "hover:bg-gray-50 hover:border-gray-100 cursor-pointer" : "cursor-default"}`}
                    onClick={() => isAdmin && navigate(`/dashboard/teachers/${junction.teacher.id}`)}
                  >
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                      <AvatarImage src={resolveImageUrl(junction.teacher.user.profile_url)} />
                      <AvatarFallback className="bg-saBlue text-white text-[10px] uppercase font-bold">{getInitials(junction.teacher.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-700 text-xs truncate">{junction.teacher.user.name}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* STUDENTS */}
          {(isAdmin || user?.role === "TEACHER") && (subject.enrollments?.length ?? 0) > 0 && (
            <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-0">
                <SectionTitle icon={Users} title="Top Students" description="Active Enrollees" />
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {subject.enrollments?.slice(0, 5).map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer" onClick={() => navigate(`/dashboard/students/${enrollment.student.id}`)}>
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm ring-1 ring-gray-100">
                      <AvatarImage src={resolveImageUrl(enrollment.student.user.profile_url)} />
                      <AvatarFallback className="bg-green-500 text-white text-[10px] uppercase font-bold">{getInitials(enrollment.student.user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-700 text-xs truncate">{enrollment.student.user.name}</p>
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
