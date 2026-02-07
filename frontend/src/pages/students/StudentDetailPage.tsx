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
import { studentService, subjectService, testSeriesService } from "@/services/api";
import { activityEnrollmentAPI, activityGroupAPI } from "@/services/activity.service";
import { useAuthStore } from "@/store/authStore";
import type { Student } from "@/types";
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
  Map,
  Hash,
  Receipt,
  Plus,
  FileText,
  CreditCard,
  CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import InvoiceModal from "@/components/InvoiceModal";
import IDCardModal from "@/components/students/IDCardModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    if (id) {
      fetchStudent(parseInt(id));
    }
  }, [id]);

  const fetchStudent = async (studentId: number) => {
    setIsLoading(true);
    try {
      const response = await studentService.getById(studentId);
      setStudent(response.data);
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
          <div className="flex flex-col sm:flex-row items-end -mt-16 gap-6">
            {/* Avatar */}
            <div className="relative group">
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
            <div className="flex-1 pb-2 text-center sm:text-left">
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{student.user.name}</h1>
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
              <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-center">
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">Enroll in Subject</h3>
              <p className="text-gray-400 text-sm mb-6">Select a subject to add to this student's learning path.</p>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Subject</Label>
                <Select value={selectedSubjectId?.toString() || ""} onValueChange={(value) => setSelectedSubjectId(parseInt(value))}>
                  <SelectTrigger className="h-12 rounded-xl border-gray-200 bg-gray-50"><SelectValue placeholder="Choose Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100" onClick={e => e.stopPropagation()}>
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-gray-100" onClick={e => e.stopPropagation()}>
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

    </div>
  );
}