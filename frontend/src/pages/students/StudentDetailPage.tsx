import { useState, useEffect } from "react";
import { resolveImageUrl } from "@/lib/utils";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { studentService, subjectService, testSeriesService, knowYourChildService, teacherService } from "@/services/api";
import { activityEnrollmentAPI, activityGroupAPI } from "@/services/activity.service";
import { useAuthStore } from "@/store/authStore";
import type { Student } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Loader2,
  Mail,
  Phone,
  Calendar,
  School,
  Users,
  User,
  BookOpen,
  MapPin,
  Home,
  Droplet,
  Globe,
  Map as MapIcon,
  Hash,
  Receipt,
  Plus,
  FileText,
  CreditCard,
  CalendarDays,
  Check,
  X,
  GraduationCap,
  Download,
  Search,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import InvoiceModal from "@/components/InvoiceModal";
import IDCardModal from "@/components/students/IDCardModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import { cn } from "@/lib/utils";

export default function StudentDetailPage() {
  usePageTitle("Student Details");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // ID Card Modal State
  const [showIDCardModal, setShowIDCardModal] = useState(false);

  // Enrollment modals
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTestSeriesModal, setShowTestSeriesModal] = useState(false);
  const [showActivityGroupModal, setShowActivityGroupModal] = useState(false);

  // Data for selects
  const [subjects, setSubjects] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTestSeries, setLoadingTestSeries] = useState(false);
  const [loadingActivityGroups, setLoadingActivityGroups] = useState(false);

  // Selected items
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTestSeriesId, setSelectedTestSeriesId] = useState<number | null>(null);
  const [selectedActivityGroupId, setSelectedActivityGroupId] = useState<number | null>(null);

  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const isTeacher = user?.role === "TEACHER";

  useEffect(() => {
    if (id) {
      fetchStudent(parseInt(id));
    }
  }, [id]);

  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportsTotal, setReportsTotal] = useState(0);

  // Reports Filter States
  const [reportsSubjectFilter, setReportsSubjectFilter] = useState("all");
  const [reportsMonthFilter, setReportsMonthFilter] = useState("all");
  const [reportsStatusFilter, setReportsStatusFilter] = useState("all");
  const [reportsWeekFilter, setReportsWeekFilter] = useState("all");
  const [allWeeks, setAllWeeks] = useState<string[]>([]);
  const [reportsSearchTerm, setReportsSearchTerm] = useState("");

  const fetchReports = async (
    studentId: number,
    pageNum = 1,
    subjId = reportsSubjectFilter,
    month = reportsMonthFilter,
    status = reportsStatusFilter,
    weekStartDate = reportsWeekFilter,
    search = reportsSearchTerm
  ) => {
    try {
      setLoadingReports(true);
      const params: any = { page: pageNum, limit: 10 };
      if (subjId !== "all") params.subject_id = parseInt(subjId);
      if (month !== "all") params.month = month;
      if (status !== "all") params.feedback_status = status;
      if (weekStartDate !== "all") params.week_start_date = weekStartDate;
      if (search.trim()) params.search = search.trim();

      const res = await knowYourChildService.getStudentReports(studentId, params);
      setReports(res.data.data);
      setReportsPage(res.data.pagination.page);
      setReportsTotalPages(res.data.pagination.totalPages);
      setReportsTotal(res.data.pagination.total);

      // Populate weeks list if empty
      if (allWeeks.length === 0) {
        const allRes = await knowYourChildService.getStudentReports(studentId, { limit: 100 });
        const uniqueWeeks = Array.from(new Set(allRes.data.data.map((r: any) => r.week_start_date))) as string[];
        uniqueWeeks.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        setAllWeeks(uniqueWeeks);
      }
    } catch (err) {
      console.error("Failed to fetch student reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleClearReportsFilters = (studentId: number) => {
    setReportsSubjectFilter("all");
    setReportsMonthFilter("all");
    setReportsStatusFilter("all");
    setReportsWeekFilter("all");
    setReportsSearchTerm("");
    fetchReports(studentId, 1, "all", "all", "all", "all", "");
  };

  const hasActiveReportsFilters =
    reportsSubjectFilter !== "all" ||
    reportsMonthFilter !== "all" ||
    reportsStatusFilter !== "all" ||
    reportsWeekFilter !== "all" ||
    reportsSearchTerm.trim() !== "";

  // Weekly reports creation & preview state
  const [showReportCreateModal, setShowReportCreateModal] = useState(false);
  const [selectedPreviewReport, setSelectedPreviewReport] = useState<any>(null);
  const [viewFeedbackReport, setViewFeedbackReport] = useState<any>(null);
  
  // Create Report form state
  const [reportMonth, setReportMonth] = useState("AUGUST");
  const [weekStartDate, setWeekStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weekEndDate, setWeekEndDate] = useState(format(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [ratings, setRatings] = useState<{ subject: string; rating: string }[]>([]);
  const [newTraitName, setNewTraitName] = useState("");
  const [teacherComment, setTeacherComment] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Subject selection for report
  const [selectedReportSubjectId, setSelectedReportSubjectId] = useState<number | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);

  // Fetch teacher subjects if user is a teacher
  useEffect(() => {
    const fetchTeacherData = async () => {
      const isTeacherUser = user?.role === "TEACHER" || (typeof user?.role === "object" && (user?.role as any)?.name === "TEACHER");
      if (isTeacherUser && user?.id) {
        try {
          const res = await teacherService.getAll({ user_id: user.id });
          const teacherRecord = res.data?.data?.[0];
          if (teacherRecord) {
            const junctions = (teacherRecord as any)?.teacher_subject_junctions || [];
            let subjectsList = junctions.map((j: any) => j.subject || j).filter(Boolean);
            
            if (subjectsList.length === 0) {
              const detailRes = await teacherService.getById(teacherRecord.id);
              const teacherDetail = (detailRes as any).data?.data || (detailRes as any).data || detailRes;
              const detailJunctions = (teacherDetail as any)?.teacher_subject_junctions || [];
              subjectsList = detailJunctions.map((j: any) => j.subject || j).filter(Boolean);
            }
            setTeacherSubjects(subjectsList);
          }
        } catch (err) {
          console.error("Failed to load teacher subjects:", err);
        }
      }
    };
    fetchTeacherData();
  }, [user]);

  // Compute available subjects for review based on student enrollments & teacher assignments
  const studentSubjects: any[] = (() => {
    if (!student || !Array.isArray(student.enrollments)) return [];
    const subjectsMap = new Map<number, any>();
    
    student.enrollments.forEach((e: any) => {
      if (e.subject) {
        subjectsMap.set(e.subject.id, e.subject);
      } else if (e.type === "SUBJECT" && e.subject_id) {
        subjectsMap.set(e.subject_id, { id: e.subject_id, name: `Subject #${e.subject_id}` });
      }
    });

    return Array.from(subjectsMap.values());
  })();

  const isUserAdmin = isAdmin || user?.role === "ADMIN" || (typeof user?.role === "object" && (user?.role as any)?.name === "ADMIN");

  const availableSubjects: any[] = isUserAdmin
    ? studentSubjects
    : studentSubjects.filter((ss: any) =>
        teacherSubjects.some((ts: any) => 
          String(ts.id) === String(ss.id) || 
          String(ts.subject_id) === String(ss.id) || 
          String(ts.id) === String(ss.subject_id)
        )
      );

  useEffect(() => {
    if (showReportCreateModal && student) {
      // 8 soft traits/constraints requested
      const softConstraints = [
        "Attention",
        "Behaviour",
        "Understanding",
        "Reading",
        "Speaking",
        "Homework",
        "Discipline",
        "Participation"
      ];
      
      const defaultRatings = softConstraints.map((trait: string) => ({
        subject: trait,
        rating: "GOOD"
      }));
      
      setRatings(defaultRatings);
      setTeacherComment("");
      
      // Select first available subject by default
      if (availableSubjects.length > 0) {
        setSelectedReportSubjectId((availableSubjects[0] as any).id);
      } else {
        setSelectedReportSubjectId(null);
      }
      
      // Set default month
      const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
      const currentMonthIndex = new Date().getMonth();
      setReportMonth(months[currentMonthIndex]);
    }
  }, [showReportCreateModal, student, teacherSubjects]);

  const handleRatingChange = (index: number, rating: string) => {
    const updated = [...ratings];
    updated[index].rating = rating;
    setRatings(updated);
  };

  const handleAddCustomTrait = () => {
    if (!newTraitName.trim()) return;
    if (ratings.some(r => r.subject.toLowerCase() === newTraitName.trim().toLowerCase())) {
      toast.error("This subject or trait already exists in the list.");
      return;
    }
    setRatings([...ratings, { subject: newTraitName.trim(), rating: "GOOD" }]);
    setNewTraitName("");
  };

  const handleRemoveTrait = (index: number) => {
    const updated = [...ratings];
    updated.splice(index, 1);
    setRatings(updated);
  };

  const handleCreateReport = async () => {
    if (!student) return;
    if (!selectedReportSubjectId) {
      toast.error("Please select a subject to submit the weekly review.");
      return;
    }
    try {
      setSubmittingReport(true);
      await knowYourChildService.createReport({
        student_id: student.id,
        subject_id: selectedReportSubjectId,
        month: reportMonth,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        ratings: ratings,
        teacher_comment: teacherComment
      });
      toast.success("Weekly report card created successfully!");
      setShowReportCreateModal(false);
      await fetchReports(student.id, 1); // Refresh reports list and reset to page 1
    } catch (err: any) {
      console.error("Failed to create report:", err);
      toast.error(err.response?.data?.error || "Failed to create weekly report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("weekly-report-card-print");
    if (!element) return;
    
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f0f4ff"
      });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Weekly_Report_${student?.user?.name || "Student"}_${selectedPreviewReport?.month || "Month"}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to download PDF.");
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!window.confirm("Are you sure you want to delete this weekly report card?")) return;
    try {
      await knowYourChildService.deleteReport(reportId);
      toast.success("Weekly report card deleted successfully!");
      if (student) {
        await fetchReports(student.id, reportsPage);
      }
    } catch (err: any) {
      console.error("Failed to delete report:", err);
      toast.error(err.response?.data?.error || "Failed to delete weekly report card.");
    }
  };

  const fetchStudent = async (studentId: number) => {
    setIsLoading(true);
    try {
      const response = await studentService.getById(studentId);
      setStudent(response.data);
      await fetchReports(studentId, 1);
    } catch (error) {
      console.error("Failed to fetch student:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch subjects for enrollment
  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const response = await subjectService.getAll({ limit: 100 });
      setSubjects(response.data.data);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch test series for enrollment
  const fetchTestSeries = async () => {
    setLoadingTestSeries(true);
    try {
      const response = await testSeriesService.getAll({ limit: 100 });
      setTestSeries(response.data.data);
    } catch (error) {
      console.error("Failed to fetch test series:", error);
    } finally {
      setLoadingTestSeries(false);
    }
  };

  // Fetch activity groups for enrollment
  const fetchActivityGroups = async () => {
    setLoadingActivityGroups(true);
    try {
      const response = await activityGroupAPI.getAll({ limit: 100, is_active: true });
      // @ts-ignore
      setActivityGroups(response.data.data.activityGroups || []);
    } catch (error) {
      console.error("Failed to fetch activity groups:", error);
    } finally {
      setLoadingActivityGroups(false);
    }
  };

  // Handle subject enrollment
  const handleEnrollSubject = async () => {
    if (!selectedSubjectId || !student) return;

    // Check if already enrolled
    // @ts-ignore
    const alreadyEnrolled = student.enrollments?.some(e => e.type === 'SUBJECT' && e.subject?.id === selectedSubjectId);
    if (alreadyEnrolled) {
      alert('Student is already enrolled in this subject');
      return;
    }

    try {
      // Dynamic import to avoid circular dependency issues if any, or just strictly typed service call
      const { enrollmentService } = await import("@/services/api");
      await enrollmentService.create({
        student_id: student.id,
        subject_id: selectedSubjectId
      });
      setShowSubjectModal(false);
      setSelectedSubjectId(null);
      fetchStudent(student.id); // Refresh data
    } catch (error) {
      console.error("Failed to enroll in subject:", error);
      alert('Failed to enroll student in subject');
    }
  };

  // Handle test series enrollment
  const handleEnrollTestSeries = async () => {
    if (!selectedTestSeriesId || !student) return;

    // Check if already enrolled
    const alreadyEnrolled = student.enrollments?.some(e => e.type === 'TEST_SERIES' && e.test_series?.id === selectedTestSeriesId);
    if (alreadyEnrolled) {
      alert('Student is already enrolled in this test series');
      return;
    }

    try {
      await testSeriesService.enroll(selectedTestSeriesId, { student_id: student.id });
      setShowTestSeriesModal(false);
      setSelectedTestSeriesId(null);
      fetchStudent(student.id); // Refresh data
    } catch (error) {
      console.error("Failed to enroll in test series:", error);
      alert('Failed to enroll student in test series');
    }
  };

  // Handle activity group enrollment
  const handleEnrollActivityGroup = async () => {
    if (!selectedActivityGroupId || !student) return;

    // Check if already enrolled
    const alreadyEnrolled = student.enrollments?.some(e => e.type === 'ACTIVITY_GROUP' && e.activity_group?.id === selectedActivityGroupId);
    if (alreadyEnrolled) {
      alert('Student is already enrolled in this activity group');
      return;
    }

    try {
      await activityEnrollmentAPI.enrollToGroup(selectedActivityGroupId, [student.id]);
      setShowActivityGroupModal(false);
      setSelectedActivityGroupId(null);
      fetchStudent(student.id); // Refresh data
    } catch (error) {
      console.error("Failed to enroll in activity group:", error);
      alert('Failed to enroll student in activity group');
    }
  };

  // Modal open handlers
  const openSubjectModal = () => {
    setShowSubjectModal(true);
    fetchSubjects();
  };

  const openTestSeriesModal = () => {
    setShowTestSeriesModal(true);
    fetchTestSeries();
  };

  const openActivityGroupModal = () => {
    setShowActivityGroupModal(true);
    fetchActivityGroups();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4 text-gray-700">Student not found</h1>
        <Button
          onClick={() => navigate("/dashboard/students")}
          className="mt-4"
        >
          Back to Students
        </Button>
      </div>
    );
  }

  const getGenderDisplay = (gender: string | null) => {
    if (!gender) return "-";
    return gender === "M" ? "Male" : gender === "F" ? "Female" : "Other";
  };

  const getBloodGroupDisplay = (bloodGroup: string | null | undefined) => {
    if (!bloodGroup) return "-";
    return bloodGroup.replace('_POS', '+').replace('_NEG', '-');
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "PPP");
    } catch (error) {
      return "-";
    }
  };

  const SectionTitle = ({ icon: Icon, title, description }: { icon: any, title: string, description?: string }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-saBlue/10 rounded-xl text-saBlue">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        {description && <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{description}</p>}
      </div>
    </div>
  );

  const InfoItem = ({ label, value, icon: Icon }: { label: string, value: React.ReactNode, icon?: any }) => (
    <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all duration-300">
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</span>
        <span className="text-sm font-semibold text-gray-700 truncate max-w-[200px]" title={typeof value === 'string' ? value : undefined}>
          {value || '-'}
        </span>
      </div>
      {Icon && <Icon className="w-4 h-4 text-gray-300 group-hover:text-saBlue transition-colors" />}
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* 1. TOP HEADER SECTION */}
      <div className="relative">
        {/* Background gradient banner */}
        <div className="h-28 w-full bg-gradient-to-r from-saBlue to-blue-400 rounded-3xl relative overflow-hidden shadow-lg shadow-blue-900/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3"></div>

          {/* Back button */}
          <Button
            variant="ghost"
            className="absolute top-4 left-4 text-white hover:bg-white/20 hover:text-white rounded-xl"
            onClick={() => navigate("/dashboard/students")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        {/* Profile Content overlapping banner */}
        <div className="px-6 sm:px-10 pb-4">
          <div className="flex flex-col sm:flex-row items-end gap-6">
            {/* Avatar */}
            <div className="relative group -mt-16 sm:shrink-0">
              <div className="w-32 h-32 rounded-full border-[6px] border-white bg-white shadow-xl overflow-hidden relative z-10">
                <img
                  src={resolveImageUrl(student.user.profile_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.user.name)}`}
                  alt={student.user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-2 right-2 z-20 bg-green-500 w-5 h-5 rounded-full border-4 border-white shadow-sm"></div>
            </div>

            {/* Name & Basic Info */}
            <div className="w-full min-w-0 flex-1 pb-2 text-center sm:text-left sm:pr-4">
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-tight break-words [overflow-wrap:anywhere]">
                {student.user.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100">
                  <School className="w-3 h-3 mr-1" />
                  {student.school || "School Not Set"}
                </Badge>
                <Badge variant="outline" className="border-gray-200 text-gray-500">
                  ID: {student.id}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            {isAdmin && (
              <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-center sm:shrink-0">
                <Button onClick={() => setShowIDCardModal(true)} variant="outline" className="rounded-xl border-gray-200 h-10 shadow-sm bg-white">
                  <CreditCard className="mr-2 h-4 w-4" /> ID Card
                </Button>
                <Button onClick={() => setIsInvoiceModalOpen(true)} variant="outline" className="rounded-xl border-gray-200 h-10 shadow-sm bg-white">
                  <Receipt className="mr-2 h-4 w-4" /> Invoice
                </Button>
                <Button onClick={() => navigate(`/dashboard/students/${student.id}/edit`)} className="rounded-xl bg-saBlue h-10 shadow-md shadow-saBlue/20 hover:bg-saBlue/90">
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-2">

        {/* CONTACT INFO */}
        {!isTeacher && (
          <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <SectionTitle icon={Phone} title="Contact Info" description="Reach out" />
              <div className="space-y-3">
                <InfoItem label="Email" value={student.user.email} icon={Mail} />
                <InfoItem label="Phone" value={student.user.phone} icon={Phone} />
                {/* Address in summary */}
                <InfoItem label="Location" value={student.address?.city?.name || 'Unknown'} icon={MapPin} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACADEMIC INFO */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <SectionTitle icon={BookOpen} title="Academic" description="Current Standing" />
            <div className="space-y-3">
              <InfoItem label="Class" value={student.class?.name} icon={Users} />
              <InfoItem label="Board" value={student.board?.name} icon={Globe} />
              <InfoItem label="School" value={student.school} icon={School} />
            </div>
          </CardContent>
        </Card>

        {/* PERSONAL INFO */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <SectionTitle icon={User} title="Personal" description="Identity Stats" />
            <div className="space-y-3">
              <InfoItem label="Gender" value={getGenderDisplay(student.gender)} icon={User} />
              <InfoItem label="Date of Birth" value={formatDate(student.date_of_birth)} icon={Calendar} />
              <InfoItem label="Blood Group" value={getBloodGroupDisplay(student.blood_group)} icon={Droplet} />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 3. DETAILED SECTIONS */}
      <div className="grid gap-6 md:grid-cols-3 px-2">

        {/* ADDRESS DETAILS */}
        {isAdmin && (
          <Card className="rounded-3xl border-gray-100 shadow-sm md:col-span-1">
            <CardContent className="p-6">
              <SectionTitle icon={MapPin} title="Full Address" description="Resident" />
              {student.address ? (
                <div className="space-y-4">
                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-gray-800 text-sm font-medium leading-relaxed">
                      {student.address.addressLine}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {student.address.city?.name && <Badge variant="outline" className="bg-white">{student.address.city?.name}</Badge>}
                      {student.address.state?.name && <Badge variant="outline" className="bg-white">{student.address.state?.name}</Badge>}
                      {student.address.postalCode && <Badge variant="outline" className="bg-white">{student.address.postalCode}</Badge>}
                    </div>
                    {student.address.country?.name && (
                      <p className="text-[10px] uppercase font-bold text-gray-400 mt-2 tracking-wider">{student.address.country?.name}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 text-sm bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  No address found
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ENROLLMENTS */}
        {isAdmin && (
          <Card className="rounded-3xl border-gray-100 shadow-sm md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={FileText} title="Enrollments" description="Active Courses" />
                <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/enrollments?student_id=${student.id}`)} className="text-xs font-bold uppercase text-saBlue hover:bg-blue-50">
                  View All
                </Button>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                {/* Subjects */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subjects ({student.enrollments?.filter(e => e.type === 'SUBJECT').length || 0})</h4>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-blue-50" onClick={openSubjectModal}><Plus className="w-3 h-3 text-saBlue" /></Button>
                  </div>
                  <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 min-h-[100px]">
                    {student.enrollments && student.enrollments.filter(e => e.type === 'SUBJECT').length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {student.enrollments.filter(e => e.type === 'SUBJECT').map(e => (
                          <Badge key={e.id} variant="secondary" className="bg-white border-gray-200 text-gray-700 shadow-sm">
                            {e.subject?.name}
                          </Badge>
                        ))}
                      </div>
                    ) : <p className="text-gray-300 text-xs italic">No subjects enrolled</p>}
                  </div>
                </div>

                {/* Test Series */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Test Series ({student.enrollments?.filter(e => e.type === 'TEST_SERIES').length || 0})</h4>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-blue-50" onClick={openTestSeriesModal}><Plus className="w-3 h-3 text-saBlue" /></Button>
                  </div>
                  <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 min-h-[100px]">
                    {(student.enrollments?.filter(e => e.type === 'TEST_SERIES') || []).length > 0 ? (
                      <ul className="space-y-1.5">
                        {(student.enrollments?.filter(e => e.type === 'TEST_SERIES') || []).map(e => (
                          <li key={e.id} className="text-xs font-medium text-gray-600 truncate flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-saVividOrange flex-shrink-0"></div>
                            <span className="truncate" title={e.test_series?.title}>{e.test_series?.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-gray-300 text-xs italic">No test series enrolled</p>}
                  </div>
                </div>

                {/* Activity Groups */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activity Groups ({student.enrollments?.filter(e => e.type === 'ACTIVITY_GROUP').length || 0})</h4>
                    <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-blue-50" onClick={openActivityGroupModal}><Plus className="w-3 h-3 text-saBlue" /></Button>
                  </div>
                  <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 min-h-[100px]">
                    {(student.enrollments?.filter(e => e.type === 'ACTIVITY_GROUP') || []).length > 0 ? (
                      <ul className="space-y-1.5">
                        {(student.enrollments?.filter(e => e.type === 'ACTIVITY_GROUP') || []).map(e => (
                          <li key={e.id} className="text-xs font-medium text-gray-600 truncate flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                            <span className="truncate" title={e.activity_group?.name}>{e.activity_group?.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-gray-300 text-xs italic">No activity groups</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* KNOW YOUR CHILD (WEEKLY REPORTS) - REPORT HISTORY LOG */}
      <div className="px-2">
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-saBlue/10 to-blue-100/50 rounded-xl text-saBlue">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-xl tracking-tight">Report History Log</h3>
                  <p className="text-xs text-gray-400 mt-0.5">View and download all weekly performance cards</p>
                </div>
              </div>
              
              {(isTeacher || isAdmin) && (
                <Button
                  onClick={() => setShowReportCreateModal(true)}
                  className="bg-saBlue hover:bg-saBlue/90 text-white font-bold rounded-xl h-10 px-4 flex items-center gap-1.5 shadow-md shadow-saBlue/10 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" /> Submit Weekly Review
                </Button>
              )}
            </div>

            {/* FILTERS BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search teacher, remarks..."
                  value={reportsSearchTerm}
                  onChange={(e) => {
                    setReportsSearchTerm(e.target.value);
                    fetchReports(student.id, 1, reportsSubjectFilter, reportsMonthFilter, reportsStatusFilter, reportsWeekFilter, e.target.value);
                  }}
                  className="pl-9 h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>

              {/* Subject Filter */}
              <Select
                value={reportsSubjectFilter}
                onValueChange={(val) => {
                  setReportsSubjectFilter(val);
                  fetchReports(student.id, 1, val, reportsMonthFilter, reportsStatusFilter, reportsWeekFilter, reportsSearchTerm);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {studentSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month Filter */}
              <Select
                value={reportsMonthFilter}
                onValueChange={(val) => {
                  setReportsMonthFilter(val);
                  fetchReports(student.id, 1, reportsSubjectFilter, val, reportsStatusFilter, reportsWeekFilter, reportsSearchTerm);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Week Filter */}
              <Select
                value={reportsWeekFilter}
                onValueChange={(val) => {
                  setReportsWeekFilter(val);
                  fetchReports(student.id, 1, reportsSubjectFilter, reportsMonthFilter, reportsStatusFilter, val, reportsSearchTerm);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white">
                  <SelectValue placeholder="All Weeks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Weeks</SelectItem>
                  {allWeeks.map((week) => (
                    <SelectItem key={week} value={week}>
                      Week of {format(new Date(week), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Feedback Reply Status Filter */}
              <Select
                value={reportsStatusFilter}
                onValueChange={(val) => {
                  setReportsStatusFilter(val);
                  fetchReports(student.id, 1, reportsSubjectFilter, reportsMonthFilter, val, reportsWeekFilter, reportsSearchTerm);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white">
                  <SelectValue placeholder="All Feedback Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveReportsFilters && (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleClearReportsFilters(student.id)}
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl flex items-center gap-1 font-bold"
                >
                  <X className="h-3.5 w-3.5" /> Clear All Filters
                </Button>
              </div>
            )}

            {loadingReports ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                No weekly reports matching your filter criteria.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-100 hover:bg-transparent">
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Month</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Week Duration</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Subject</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Teacher In-charge</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Feedback Reply</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {reports.map((report) => (
                        <TableRow
                          key={report.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <TableCell className="py-3.5 font-bold uppercase text-xs">
                            <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-600 font-extrabold px-2.5 py-0.5 rounded-lg">
                              {report.month}
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3.5 font-semibold text-slate-700 text-xs">
                            Week of {format(new Date(report.week_start_date), "MMM d")}
                          </TableCell>

                          <TableCell className="py-3.5 text-xs">
                            {report.subject ? (
                              <Badge variant="secondary" className="bg-blue-50 border-blue-200 text-blue-700 font-bold px-2.5 py-0.5 rounded-lg">
                                {report.subject.name}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 italic">General</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 text-slate-700 font-medium text-xs">
                            {report.teacher?.user?.name || "Teacher"}
                          </TableCell>

                          <TableCell className="py-3.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setViewFeedbackReport(report)}
                              className="cursor-pointer group text-left"
                              title="Click to view parent feedback"
                            >
                              {report.parent_feedback ? (
                                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit group-hover:bg-emerald-100 transition-colors">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                  Submitted
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit group-hover:bg-amber-100 transition-colors">
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                  Pending
                                </Badge>
                              )}
                            </button>
                          </TableCell>

                          <TableCell className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPreviewReport(report)}
                                className="rounded-xl px-3.5 h-8 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-saBlue transition-all shadow-sm"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> View Card
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewFeedbackReport(report)}
                                className={cn(
                                  "rounded-xl px-2.5 h-8 text-xs font-bold transition-all shadow-xs",
                                  report.parent_feedback
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                                title="View Parent Feedback"
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-1 text-saBlue" /> Feedback
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={async () => {
                                  setSelectedPreviewReport(report);
                                  setTimeout(async () => {
                                    const element = document.getElementById("weekly-report-card-print");
                                    if (element) {
                                      try {
                                        toast.info("Generating PDF...");
                                        const canvas = await html2canvas(element, {
                                          scale: 2,
                                          useCORS: true,
                                          logging: false,
                                          backgroundColor: "#f0f4ff"
                                        });
                                        const imgData = canvas.toDataURL("image/png");
                                        const pdf = new jsPDF({
                                          orientation: "portrait",
                                          unit: "px",
                                          format: [canvas.width / 2, canvas.height / 2]
                                        });
                                        pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
                                        pdf.save(`Weekly_Report_${student?.user?.name || "Student"}_${report.month}.pdf`);
                                        toast.success("PDF downloaded successfully!");
                                      } catch (err) {
                                        console.error("PDF error:", err);
                                        toast.error("Failed to download PDF.");
                                      }
                                    }
                                  }, 300);
                                }}
                                className="rounded-xl border-slate-200 h-8 w-8 text-slate-500 hover:text-saBlue hover:bg-blue-50"
                                title="Download PDF"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              {(isTeacher || isAdmin) && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteReport(report.id)}
                                  className="rounded-xl border-red-200 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete Report"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {reportsTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500 font-medium">
                      Showing page <span className="font-bold text-slate-700">{reportsPage}</span> of <span className="font-bold text-slate-700">{reportsTotalPages}</span> ({reportsTotal} reviews)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-8 px-3 rounded-lg text-xs"
                        disabled={reportsPage <= 1 || loadingReports}
                        onClick={() => fetchReports(student.id, reportsPage - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 px-3 rounded-lg text-xs"
                        disabled={reportsPage >= reportsTotalPages || loadingReports}
                        onClick={() => fetchReports(student.id, reportsPage + 1)}
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ACCOUNT TIMELINE */}
      <div className="px-2">
        <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-100/50 flex flex-wrap gap-6 items-center justify-center text-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays className="w-4 h-4 text-saBlue" />
            Joined: <span className="font-bold text-gray-700">{format(new Date(student.created_at), "PPP")}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            Status: <span className="font-bold text-green-600">Active</span>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showIDCardModal && (
        <IDCardModal
          isOpen={showIDCardModal}
          onClose={() => setShowIDCardModal(false)}
          data={student}
          type="STUDENT"
        />
      )}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        student={student}
      />

      {/* Subject Enrollment Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowSubjectModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto relative border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">Enroll in Subject</h3>
              <p className="text-gray-400 text-sm mb-6">Select a subject to add to this student's learning path.</p>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Subject</Label>
                <SearchablePaginatedSelect
                  value={selectedSubjectId?.toString() || ""}
                  onValueChange={(value) => setSelectedSubjectId(parseInt(value))}
                  placeholder="Choose Subject"
                  searchPlaceholder="Search subject..."
                  triggerClassName="h-12 rounded-xl border-gray-200 bg-gray-50"
                  options={subjects.map((s) => ({ value: s.id.toString(), label: s.name }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowSubjectModal(false)} className="rounded-xl h-12 text-gray-500 hover:text-gray-700 hover:bg-gray-100">Cancel</Button>
                <Button onClick={handleEnrollSubject} disabled={!selectedSubjectId || loadingSubjects} className="rounded-xl h-12 bg-saBlue hover:bg-saBlue/90 shadow-md shadow-saBlue/20">Enroll Now</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Series Modal */}
      {showTestSeriesModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTestSeriesModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto relative border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">Enroll in Test Series</h3>
              <p className="text-gray-400 text-sm mb-6">Assign a test series evaluation.</p>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Test Series</Label>
                <Select value={selectedTestSeriesId?.toString() || ""} onValueChange={(value) => setSelectedTestSeriesId(parseInt(value))}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50"><SelectValue placeholder="Choose Series" /></SelectTrigger>
                  <SelectContent>
                    {testSeries.map(ts => <SelectItem key={ts.id} value={ts.id.toString()}>{ts.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowTestSeriesModal(false)} className="rounded-xl h-12 text-gray-500 hover:text-gray-700 hover:bg-gray-100">Cancel</Button>
                <Button onClick={handleEnrollTestSeries} disabled={!selectedTestSeriesId || loadingTestSeries} className="rounded-xl h-12 bg-saBlue hover:bg-saBlue/90 shadow-md shadow-saBlue/20">Enroll Now</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Group Modal */}
      {showActivityGroupModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowActivityGroupModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto relative border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">Join Activity Group</h3>
              <p className="text-gray-400 text-sm mb-6">Enroll the student in an activity group.</p>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Activity Group</Label>
                <Select value={selectedActivityGroupId?.toString() || ""} onValueChange={(value) => setSelectedActivityGroupId(parseInt(value))}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50"><SelectValue placeholder="Choose Group" /></SelectTrigger>
                  <SelectContent>
                    {activityGroups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <Button variant="ghost" onClick={() => setShowActivityGroupModal(false)} className="rounded-xl h-12 text-gray-500 hover:text-gray-700 hover:bg-gray-100">Cancel</Button>
                <Button onClick={handleEnrollActivityGroup} disabled={!selectedActivityGroupId || loadingActivityGroups} className="rounded-xl h-12 bg-saBlue hover:bg-saBlue/90 shadow-md shadow-saBlue/20">Enroll Now</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE WEEKLY REPORT DIALOG MODAL */}
      {showReportCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200" onClick={() => setShowReportCreateModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative border border-gray-100 my-8" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Submit Weekly Performance Review</h3>
                <p className="text-slate-400 text-xs mt-0.5">Evaluate subjects and traits for {student?.user?.name}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setShowReportCreateModal(false)}>
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
              {/* Subject, Month and week inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Subject</Label>
                  {availableSubjects.length === 0 ? (
                    <div className="text-xs text-red-500 font-bold bg-red-50 border border-red-100 p-2.5 rounded-xl">
                      No assigned enrolled subjects found.
                    </div>
                  ) : (
                    <Select
                      value={selectedReportSubjectId?.toString() || ""}
                      onValueChange={(val) => setSelectedReportSubjectId(parseInt(val))}
                    >
                      <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjects.map((s: any) => (
                          <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Report Month</Label>
                  <Select value={reportMonth} onValueChange={setReportMonth}>
                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Week Start Date</Label>
                  <input
                    type="date"
                    value={weekStartDate}
                    onChange={(e) => setWeekStartDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-saBlue"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Week End Date</Label>
                  <input
                    type="date"
                    value={weekEndDate}
                    onChange={(e) => setWeekEndDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:border-saBlue"
                  />
                </div>
              </div>

              {/* Subject ratings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Evaluations & Ratings</h4>
                  <span className="text-[10px] text-slate-400">Choose rating for each subject</span>
                </div>
                
                <div className="space-y-2.5">
                  {ratings.map((rating, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          type="button"
                          onClick={() => handleRemoveTrait(idx)}
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
                          title="Remove trait"
                        >
                          <X className="h-3.5 h-3.5" />
                        </Button>
                        <span className="text-sm font-bold text-slate-700">{rating.subject}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {["AVERAGE", "SATISFACTORY", "GOOD", "VERY_GOOD"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleRatingChange(idx, val)}
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                              rating.rating === val
                                ? val === "VERY_GOOD" ? "bg-green-500 border-green-500 text-white"
                                  : val === "GOOD" ? "bg-blue-500 border-blue-500 text-white"
                                  : val === "SATISFACTORY" ? "bg-orange-500 border-orange-500 text-white"
                                  : "bg-red-500 border-red-500 text-white"
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100/50"
                            }`}
                          >
                            {val.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Custom Trait */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl space-y-3">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block">Add Custom Subject or Trait</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTraitName}
                    onChange={(e) => setNewTraitName(e.target.value)}
                    placeholder="E.g., Hindi, Olympiad, Reading, Speaking..."
                    className="flex-1 h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white outline-none focus:border-saBlue"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCustomTrait}
                    className="bg-slate-800 text-white font-bold px-4 h-10 rounded-xl hover:bg-slate-700"
                  >
                    Add Trait
                  </Button>
                </div>
              </div>

              {/* Teacher Comment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Teacher's Note / Remarks</Label>
                <textarea
                  rows={3}
                  value={teacherComment}
                  onChange={(e) => setTeacherComment(e.target.value)}
                  placeholder="Write feedback remarks for the week..."
                  className="w-full rounded-2xl border-slate-200 focus:border-saBlue bg-slate-50/50 p-4 text-sm outline-none transition-colors border focus:ring-1 focus:ring-saBlue"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 grid grid-cols-2 gap-3 bg-slate-50">
              <Button variant="ghost" onClick={() => setShowReportCreateModal(false)} className="rounded-xl h-11 text-slate-500 hover:text-slate-700 hover:bg-gray-100">
                Cancel
              </Button>
              <Button
                onClick={handleCreateReport}
                disabled={submittingReport || ratings.length === 0 || availableSubjects.length === 0}
                className="rounded-xl h-11 bg-saBlue hover:bg-saBlue/90 shadow-md shadow-saBlue/20 text-white font-bold"
              >
                {submittingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                ) : null}
                Publish Report Card
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW REPORT CARD DIALOG MODAL */}
      {selectedPreviewReport && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" 
          onClick={() => setSelectedPreviewReport(null)}
        >
          <div 
            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-md w-full relative animate-in zoom-in-95 duration-200 max-h-[96vh] flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedPreviewReport(null)}
              className="absolute top-3 right-3 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full z-20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Content Scrollable Container */}
            <div className="p-3 sm:p-4 space-y-3 overflow-y-auto max-h-[92vh]">
              {/* Action Bar */}
              <div className="flex justify-between items-center bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Evaluation Card</span>
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-[#002fbe] hover:bg-[#002fbe]/90 text-white font-bold rounded-xl h-8 px-3 flex items-center gap-1 text-[11px] shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Download PDF Card
                </Button>
              </div>

              {/* PRINT CONTAINER */}
              <div id="weekly-report-card-print" className="bg-[#f0f4ff] p-3 sm:p-3.5 rounded-2xl font-sans">
                <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 max-w-sm mx-auto">
                  {/* 1. Top Blue Bar */}
                  <div className="bg-[#002fbe] px-3.5 py-1.5 flex items-center justify-between">
                    <div className="flex items-center h-5">
                      <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-4 w-auto object-contain" />
                    </div>
                    <span className="text-white font-bold text-[8px] tracking-wider">www.studyasan.com</span>
                  </div>

                  {/* 2. Main Header Block: Orange */}
                  <div className="bg-[#f06418] px-3.5 py-2.5 flex items-center justify-between border-b border-white/10">
                    <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider leading-none">WEEKLY REPORT</h2>
                    <div className="flex items-center justify-center bg-[#f06418] border border-white/20 p-0.5 rounded-lg w-9 h-9 shadow-inner shrink-0">
                      <img src="/studyasan-logo-lady.png" alt="StudyAsan Lady Logo" className="w-7 h-7 object-contain" />
                    </div>
                  </div>

                  {/* 3. Meta Details Section */}
                  <div className="p-3 space-y-2.5">
                    <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold">
                      <div className="space-y-0.5">
                        <span className="text-slate-500 block uppercase tracking-wide text-[8px]">Student:</span>
                        <div className="bg-[#1e1e4f] text-white py-1 px-1.5 rounded-md text-center shadow-inner truncate font-extrabold uppercase text-[9px]">
                          {student?.user?.name}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-slate-500 block uppercase tracking-wide text-[8px]">Class:</span>
                        <div className="bg-[#1e1e4f] text-white py-1 px-1.5 rounded-md text-center shadow-inner font-extrabold uppercase text-[9px]">
                          {student?.class?.name || "N/A"}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-slate-500 block uppercase tracking-wide text-[8px]">Month:</span>
                        <div className="bg-[#1e1e4f] text-white py-1 px-1.5 rounded-md text-center shadow-inner font-extrabold uppercase text-[9px]">
                          {selectedPreviewReport.month}
                        </div>
                      </div>
                    </div>

                    {/* 4. Subheader */}
                    <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5 pt-0.5 text-[#002fbe]">
                      <Sparkles className="w-4 h-4 text-[#002fbe] shrink-0" />
                      <span className="text-xs font-black uppercase tracking-wider text-[#002fbe]">REPORT</span>
                    </div>

                    {/* 5. Rating Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-[#f06418] text-white">
                            <th className="py-2 px-2 text-left text-[9px] sm:text-[10px] font-black uppercase tracking-wider border-r border-orange-600/10 w-[30%] align-middle">Subject</th>
                            <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-r border-orange-600/10 align-middle">Average</th>
                            <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-r border-orange-600/10 align-middle">Satisfactory</th>
                            <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-r border-orange-600/10 align-middle">Good</th>
                            <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider align-middle">Very Good</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {(() => {
                            const ratingsList = Array.isArray(selectedPreviewReport.ratings) 
                              ? selectedPreviewReport.ratings 
                              : JSON.parse(selectedPreviewReport.ratings || "[]");

                            return ratingsList.map((item: any, idx: number) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors h-7">
                                <td className="py-1 px-2 text-[9px] sm:text-[10px] font-bold text-slate-700 border-r border-slate-200 bg-slate-50/20 align-middle">{item.subject}</td>
                                <td className="py-0.5 px-1 text-center border-r border-slate-200 align-middle">
                                  {item.rating === "AVERAGE" && (
                                    <div className="flex items-center justify-center w-full h-full">
                                      <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-0.5 px-1 text-center border-r border-slate-200 align-middle">
                                  {item.rating === "SATISFACTORY" && (
                                    <div className="flex items-center justify-center w-full h-full">
                                      <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-0.5 px-1 text-center border-r border-slate-200 align-middle">
                                  {item.rating === "GOOD" && (
                                    <div className="flex items-center justify-center w-full h-full">
                                      <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-0.5 px-1 text-center align-middle">
                                  {item.rating === "VERY_GOOD" && (
                                    <div className="flex items-center justify-center w-full h-full">
                                      <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* 6. Teacher Note Box */}
                    {selectedPreviewReport.teacher_comment && (
                      <div className="flex gap-2 items-center bg-[#002fbe] rounded-xl p-2 text-white border border-[#002fbe]/10 shadow-xs relative overflow-hidden">
                        <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-[#f06418] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                          <img src="/studyasan-logo-lady.png" alt="StudyAsan Lady Logo" className="w-6 h-6 object-contain" />
                        </div>
                        <div className="space-y-0.5 z-10 pr-1">
                          <p className="text-white text-[9px] sm:text-[10px] leading-snug font-semibold">
                            {selectedPreviewReport.teacher_comment}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 7. Parent's Feedback Box */}
                    {selectedPreviewReport.parent_feedback && (
                      <div className="flex gap-2 items-start bg-emerald-50 rounded-xl p-2.5 text-slate-800 border border-emerald-200 shadow-xs relative overflow-hidden">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 text-white font-bold text-xs mt-0.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="space-y-0.5 z-10 pr-1">
                          <span className="text-[9px] font-extrabold uppercase text-emerald-800 tracking-wider block">Parent's Feedback</span>
                          <p className="text-slate-700 text-[9px] sm:text-[10px] leading-snug font-medium">
                            "{selectedPreviewReport.parent_feedback}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PARENT FEEDBACK MODAL DIALOG */}
      {viewFeedbackReport && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setViewFeedbackReport(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Parent's Feedback & Response</h3>
                  <p className="text-xs text-slate-400">
                    Week of {format(new Date(viewFeedbackReport.week_start_date), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setViewFeedbackReport(null)}>
                <X className="h-4 w-4 text-slate-500" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Report Meta Pill */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-600 font-extrabold">{viewFeedbackReport.month}</Badge>
                  {viewFeedbackReport.subject && (
                    <Badge variant="secondary" className="bg-blue-50 border-blue-200 text-blue-700 font-bold">{viewFeedbackReport.subject.name}</Badge>
                  )}
                </div>
                <span className="text-slate-500 font-semibold">Student: {student?.user?.name}</span>
              </div>

              {/* Feedback Content */}
              {viewFeedbackReport.parent_feedback ? (
                <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      Parent's Response
                    </span>
                    <Badge variant="outline" className="bg-emerald-100 border-emerald-300 text-emerald-800 font-bold text-[10px]">
                      Submitted
                    </Badge>
                  </div>
                  <p className="text-slate-800 text-sm font-medium leading-relaxed italic bg-white/60 p-3 rounded-xl border border-emerald-100">
                    "{viewFeedbackReport.parent_feedback}"
                  </p>
                </div>
              ) : (
                <div className="bg-amber-50/70 rounded-2xl p-5 border border-amber-200/70 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-amber-900 text-sm">Feedback Pending</h4>
                  <p className="text-xs text-amber-700 max-w-xs mx-auto">
                    The parent has not submitted feedback for this weekly performance report yet.
                  </p>
                </div>
              )}

              {/* Teacher Comment context */}
              {viewFeedbackReport.teacher_comment && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Teacher's Note</span>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600">
                    {viewFeedbackReport.teacher_comment}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <Button onClick={() => setViewFeedbackReport(null)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl h-10 px-5 text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}