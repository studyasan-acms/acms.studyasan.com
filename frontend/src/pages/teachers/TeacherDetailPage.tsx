import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { teacherService, subjectService, testSeriesService, activityGroupService } from "@/services/api";
import type { Teacher, Subject, TestSeries, ActivityGroup } from "@/types";
import {
  ArrowLeft,
  Edit,
  Loader2,
  Mail,
  Phone,
  BookOpen,
  User,
  Calendar,
  Briefcase,
  GraduationCap,
  Droplet,
  MapPin,
  Globe,
  Map,
  Hash,
  Plus,
  X,
  IndianRupee,
  FileText,
  CreditCard,
  CalendarDays,
  LayoutGrid
} from "lucide-react";
import { format } from "date-fns";

// Custom modals
import SuccessModal from "@/components/ui/successModal";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import IDCardModal from "@/components/students/IDCardModal";
import { formatEmployeeId } from "@/utils/idUtils";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Label } from "@/components/ui/label";
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';

// Safely format dates — returns '-' for missing/invalid dates
const safeFormat = (dateValue: string | number | Date | undefined | null, fmt: string) => {
  if (!dateValue) return '-';
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue as any);
  if (isNaN(d.getTime())) return '-';
  try {
    return format(d, fmt);
  } catch (e) {
    return '-';
  }
};

export default function TeacherDetailPage() {
  usePageTitle("Teacher Details");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ID Card Modal State
  const [showIDCardModal, setShowIDCardModal] = useState(false);

  // Assign Subject Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [subjectListLoading, setSubjectListLoading] = useState(false);

  // Success + Delete modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteJunctionId, setDeleteJunctionId] = useState<number | null>(null);

  // Test Series Assignment
  const [showTestSeriesModal, setShowTestSeriesModal] = useState(false);
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [selectedTestSeries, setSelectedTestSeries] = useState<string>("");
  const [testSeriesLoading, setTestSeriesLoading] = useState(false);
  const [testSeriesError, setTestSeriesError] = useState("");
  const [testSeriesListLoading, setTestSeriesListLoading] = useState(false);

  // Activity Group Assignment
  const [showActivityGroupModal, setShowActivityGroupModal] = useState(false);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [selectedActivityGroup, setSelectedActivityGroup] = useState<string>("");
  const [activityGroupLoading, setActivityGroupLoading] = useState(false);
  const [activityGroupError, setActivityGroupError] = useState("");
  const [activityGroupListLoading, setActivityGroupListLoading] = useState(false);

  // Fetch teacher
  useEffect(() => {
    if (id) fetchTeacher(parseInt(id));
  }, [id]);

  const fetchTeacher = async (teacherId: number) => {
    setIsLoading(true);
    try {
      const response = await teacherService.getById(teacherId);
      // teacherService.getById is normalized to return the teacher object
      setTeacher(response as any);
    } catch (error) {
      console.error("Failed to fetch teacher:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTestSeries = async () => {
    setTestSeriesListLoading(true);
    try {
      const response = await testSeriesService.getAll();
      setTestSeries(response.data.data);
    } catch (error) {
      console.error("Failed to fetch test series:", error);
      setTestSeriesError("Failed to load test series");
    } finally {
      setTestSeriesListLoading(false);
    }
  };

  const fetchActivityGroups = async () => {
    setActivityGroupListLoading(true);
    try {
      const response = await activityGroupService.getAll();
      setActivityGroups(response.data.activityGroups);
    } catch (error) {
      console.error("Failed to fetch activity groups:", error);
      setActivityGroupError("Failed to load activity groups");
    } finally {
      setActivityGroupListLoading(false);
    }
  };

  // ============= ASSIGN SUBJECT MODAL LOGIC ==================

  const openAssignModal = async () => {
    setShowAssignModal(true);
    setAssignError("");
    setSelectedSubject("");

    setSubjectListLoading(true);
    try {
      const res = await subjectService.getAll({ limit: 100 });
      setSubjects(res.data.data);
    } catch (err) {
      console.error("Failed to fetch subjects:", err);
    } finally {
      setSubjectListLoading(false);
    }
  };

  const handleAssignSubject = async () => {
    if (!selectedSubject) {
      setAssignError("Please select a subject");
      return;
    }

    setAssignLoading(true);
    setAssignError("");

    try {
      await teacherService.assignSubject({
        teacher_id: teacher!.id,
        subject_id: parseInt(selectedSubject),
      });

      setShowAssignModal(false);
      fetchTeacher(teacher!.id);
      setShowSuccessModal(true);
    } catch (err: any) {
      setAssignError(err.response?.data?.message || "Failed to assign subject");
    } finally {
      setAssignLoading(false);
    }
  };

  // ================= DELETE SUBJECT LOGIC ==================

  const handleRemoveSubject = async () => {
    if (!deleteJunctionId) return;

    try {
      await teacherService.removeSubject(deleteJunctionId);
      setShowDeleteModal(false);
      fetchTeacher(teacher!.id);
    } catch (err) {
      console.error("Failed to remove subject:", err);
    }
  };

  // ============= TEST SERIES ASSIGNMENT LOGIC ==================

  const openTestSeriesModal = async () => {
    setShowTestSeriesModal(true);
    setTestSeriesError("");
    setSelectedTestSeries("");

    setTestSeriesListLoading(true);
    try {
      const res = await testSeriesService.getAll({ limit: 100 });
      setTestSeries(res.data.data);
    } catch (err) {
      console.error("Failed to fetch test series:", err);
    } finally {
      setTestSeriesListLoading(false);
    }
  };

  const handleAssignTestSeries = async () => {
    if (!selectedTestSeries) {
      setTestSeriesError("Please select a test series");
      return;
    }

    setTestSeriesLoading(true);
    setTestSeriesError("");

    try {
      await testSeriesService.assignTeacher({ test_series_id: parseInt(selectedTestSeries), teacher_id: teacher!.id });
      setShowTestSeriesModal(false);
      fetchTeacher(teacher!.id);
      setShowSuccessModal(true);
    } catch (err: any) {
      setTestSeriesError(err.response?.data?.message || "Failed to assign test series");
    } finally {
      setTestSeriesLoading(false);
    }
  };

  const handleRemoveTestSeries = async (junctionId: number) => {
    try {
      await testSeriesService.removeTeacher(junctionId);
      fetchTeacher(teacher!.id);
    } catch (err) {
      console.error("Failed to remove test series:", err);
    }
  };

  // ============= ACTIVITY GROUP ASSIGNMENT LOGIC ==================

  const openActivityGroupModal = async () => {
    setShowActivityGroupModal(true);
    setActivityGroupError("");
    setSelectedActivityGroup("");

    setActivityGroupListLoading(true);
    try {
      const res = await activityGroupService.getAll({ limit: 100 });
      setActivityGroups(res.data.activityGroups);
    } catch (err) {
      console.error("Failed to fetch activity groups:", err);
    } finally {
      setActivityGroupListLoading(false);
    }
  };

  const handleAssignActivityGroup = async () => {
    if (!selectedActivityGroup) {
      setActivityGroupError("Please select an activity group");
      return;
    }

    setActivityGroupLoading(true);
    setActivityGroupError("");

    try {
      await activityGroupService.assignTeacher({ activity_group_id: parseInt(selectedActivityGroup), teacher_id: teacher!.id });
      setShowActivityGroupModal(false);
      fetchTeacher(teacher!.id);
      setShowSuccessModal(true);
    } catch (err: any) {
      setActivityGroupError(err.response?.data?.message || "Failed to assign activity group");
    } finally {
      setActivityGroupLoading(false);
    }
  };

  const handleRemoveActivityGroup = async (junctionId: number) => {
    try {
      await activityGroupService.removeTeacher(junctionId);
      fetchTeacher(teacher!.id);
    } catch (err) {
      console.error("Failed to remove activity group:", err);
    }
  };

  const getGenderDisplay = (gender: string | null) => {
    if (!gender) return "-";
    return gender === "M" ? "Male" : gender === "F" ? "Female" : "Other";
  };

  const formatSalary = (salary: number | null) => {
    if (!salary) return "-";
    const currencyCode = teacher?.salary_currency?.code || "USD";
    const currencySymbol = teacher?.salary_currency?.symbol || "$";

    return `${currencySymbol} ${salary.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currencyCode}`;
  };

  const getBloodGroupDisplay = (bloodGroup: string | null | undefined) => {
    if (!bloodGroup) return "-";
    return bloodGroup.replace('_POS', '+').replace('_NEG', '-').replaceAll('_', ' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4 text-gray-700">Teacher not found</h1>
        <Button
          onClick={() => navigate("/dashboard/teachers")}
          className="mt-4"
        >
          Back to Teachers
        </Button>
      </div>
    );
  }

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
        <div className="h-28 w-full bg-gradient-to-r from-saBlue to-blue-400 rounded-3xl relative overflow-hidden shadow-lg shadow-blue-900/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl transform -translate-x-1/3 translate-y-1/3"></div>

          <Button
            variant="ghost"
            className="absolute top-4 left-4 text-white hover:bg-white/20 hover:text-white rounded-xl"
            onClick={() => navigate("/dashboard/teachers")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        <div className="px-6 sm:px-10 pb-4">
          <div className="flex flex-col sm:flex-row items-end gap-6">
            <div className="relative group -mt-16 sm:shrink-0">
              <div className="w-32 h-32 rounded-full border-[6px] border-white bg-white shadow-xl overflow-hidden relative z-10">
                <img
                  src={resolveImageUrl(teacher.user.profile_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.user.name)}`}
                  alt={teacher.user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-2 right-2 z-20 bg-green-500 w-5 h-5 rounded-full border-4 border-white shadow-sm"></div>
            </div>

            <div className="w-full min-w-0 flex-1 pb-2 text-center sm:text-left sm:pr-4">
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight leading-tight break-words [overflow-wrap:anywhere]">
                {teacher.user.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100">
                  Teacher
                </Badge>
                <Badge variant="outline" className="border-gray-200 text-gray-700 font-semibold font-mono">
                  ID: {formatEmployeeId(teacher.id)}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto mt-4 sm:mt-0 justify-center sm:shrink-0">
              <Button onClick={() => setShowIDCardModal(true)} variant="outline" className="rounded-xl border-gray-200 h-10 shadow-sm bg-white">
                <CreditCard className="mr-2 h-4 w-4" /> ID Card
              </Button>
              <Button onClick={() => navigate(`/dashboard/teachers/${teacher.id}/edit`)} className="rounded-xl bg-saBlue h-10 shadow-md shadow-saBlue/20 hover:bg-saBlue/90">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </div>
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
              <InfoItem label="Email" value={teacher.user.email} icon={Mail} />
              <InfoItem label="Phone" value={teacher.user.phone} icon={Phone} />
              <InfoItem label="Location" value={teacher.address?.city?.name || 'Unknown'} icon={MapPin} />
            </div>
          </CardContent>
        </Card>

        {/* PROFESSIONAL INFO */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <SectionTitle icon={Briefcase} title="Professional" description="Career Details" />
            <div className="space-y-3">
              <InfoItem label="Qualification" value={teacher.qualification} icon={GraduationCap} />
              <InfoItem label="Experience" value={teacher.experience} icon={Briefcase} />
              <InfoItem label="Salary" value={formatSalary(teacher.salary)} icon={IndianRupee} />
            </div>
          </CardContent>
        </Card>

        {/* PERSONAL INFO */}
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <SectionTitle icon={User} title="Personal" description="Identity Stats" />
            <div className="space-y-3">
              <InfoItem label="Gender" value={getGenderDisplay(teacher.gender)} icon={User} />
              <InfoItem label="Blood Group" value={getBloodGroupDisplay(teacher.blood_group)} icon={Droplet} />
              <InfoItem label="Joined" value={format(new Date(teacher.created_at), "PPP")} icon={Calendar} />
              <InfoItem label="Updated" value={format(new Date(teacher.updated_at), "PPP")} icon={LayoutGrid} />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* 3. DETAILED SECTIONS */}
      <div className="grid gap-6 md:grid-cols-3 px-2">

        {/* ADDRESS DETAILS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm md:col-span-1">
          <CardContent className="p-6">
            <SectionTitle icon={MapPin} title="Full Address" description="Resident" />
            {teacher.address ? (
              <div className="space-y-4">
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-gray-800 text-sm font-medium leading-relaxed">
                    {teacher.address.addressLine}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {teacher.address.city?.name && <Badge variant="outline" className="bg-white">{teacher.address.city?.name}</Badge>}
                    {teacher.address.state?.name && <Badge variant="outline" className="bg-white">{teacher.address.state?.name}</Badge>}
                    {teacher.address.postalCode && <Badge variant="outline" className="bg-white">{teacher.address.postalCode}</Badge>}
                  </div>
                  {teacher.address.country?.name && (
                    <p className="text-[10px] uppercase font-bold text-gray-400 mt-2 tracking-wider">{teacher.address.country?.name}</p>
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

        {/* ASSIGNMENTS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle icon={FileText} title="Assignments" description="Responsibilities" />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Subjects */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subjects ({teacher.teacher_subject_junctions?.length || 0})</h4>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-blue-50" onClick={openAssignModal}><Plus className="w-3 h-3 text-saBlue" /></Button>
                </div>
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 min-h-[100px]">
                  {teacher.teacher_subject_junctions?.length ? (
                    <div className="flex flex-col gap-2">
                      {teacher.teacher_subject_junctions.map((junction) => (
                        <div
                          key={junction.id}
                          className="group relative flex items-center justify-between p-2.5 bg-white border border-gray-200/80 rounded-xl shadow-2xs hover:border-saBlue/40 transition-all"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {junction.subject.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {junction.subject.class ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50/80 text-blue-700 border-blue-200/60 font-medium">
                                  {junction.subject.class.name}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-400 border-gray-200">
                                  No Class
                                </Badge>
                              )}
                              {junction.subject.board ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50/80 text-purple-700 border-purple-200/60 font-medium">
                                  {junction.subject.board.name}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-400 border-gray-200">
                                  No Board
                                </Badge>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => { setDeleteJunctionId(junction.id); setShowDeleteModal(true); }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all ml-2 shrink-0"
                            title="Remove Subject"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-300 text-xs italic">No subjects assigned</p>}
                </div>
              </div>

              {/* Test Series */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Test Series ({teacher.test_series_junctions?.length || 0})</h4>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-blue-50" onClick={openTestSeriesModal}><Plus className="w-3 h-3 text-saBlue" /></Button>
                </div>
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 min-h-[100px]">
                  {teacher.test_series_junctions?.length ? (
                    <ul className="space-y-1.5">
                      {teacher.test_series_junctions.map((junction) => (
                        <li key={junction.id} className="text-xs font-medium text-gray-600 truncate flex items-center justify-between gap-1 group">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-1.5 h-1.5 rounded-full bg-saVividOrange flex-shrink-0"></div>
                            <span className="truncate" title={junction.test_series.title}>{junction.test_series.title}</span>
                          </div>
                          <button onClick={() => handleRemoveTestSeries(junction.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-300 text-xs italic">No test series assigned</p>}
                </div>
              </div>

              {/* Activity Groups */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activity Groups ({teacher.activity_group_junctions?.length || 0})</h4>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-blue-50" onClick={openActivityGroupModal}><Plus className="w-3 h-3 text-saBlue" /></Button>
                </div>
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100 min-h-[100px]">
                  {teacher.activity_group_junctions?.length ? (
                    <ul className="space-y-1.5">
                      {teacher.activity_group_junctions.map((junction) => (
                        <li key={junction.id} className="text-xs font-medium text-gray-600 truncate flex items-center justify-between gap-1 group">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                            <span className="truncate" title={junction.activity_group.name}>{junction.activity_group.name}</span>
                          </div>
                          <button onClick={() => handleRemoveActivityGroup(junction.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-300 text-xs italic">No activity groups assigned</p>}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACCOUNT TIMELINE */}
      <div className="px-2">
        <div className="bg-blue-50/30 rounded-2xl p-4 border border-blue-100/50 flex flex-wrap gap-6 items-center justify-center text-center">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CalendarDays className="w-4 h-4 text-saBlue" />
            Joined: <span className="font-bold text-gray-700">{format(new Date(teacher.created_at), "PPP")}</span>
          </div>
          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <LayoutGrid className="w-4 h-4 text-saBlue" />
            Last Updated: <span className="font-bold text-gray-700">{format(new Date(teacher.updated_at), "PPP")}</span>
          </div>
        </div>
      </div>

      {/* ID Card Modal */}
      {teacher && (
        <IDCardModal
          isOpen={showIDCardModal}
          onClose={() => setShowIDCardModal(false)}
          data={{
            ...teacher,
            class: undefined,
            board: undefined
          }}
          type="TEACHER"
        />
      )}

      {/* Modal - Assign Subject */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <span>Assign Subject</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Subject <span className="text-red-500">*</span>
              </Label>
              <SearchablePaginatedSelect
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                placeholder={subjectListLoading ? "Loading subjects..." : "Select a subject"}
                searchPlaceholder="Search subject by name, class, or board..."
                emptyLabel="No subjects found"
                triggerClassName="bg-slate-50 border-slate-200"
                options={subjects.map((s) => ({
                  value: s.id.toString(),
                  label: `${s.name}${s.class ? ` (${s.class.name})` : ''}`,
                  searchText: `${s.name} ${s.class?.name || ''} ${s.board?.name || ''}`,
                }))}
              />
            </div>

            {assignError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {assignError}
              </p>
            )}

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAssignSubject}
                disabled={assignLoading || !selectedSubject}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              >
                {assignLoading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Assign Subject
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal - Assign Test Series */}
      <Dialog open={showTestSeriesModal} onOpenChange={setShowTestSeriesModal}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <span>Assign Test Series</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Test Series <span className="text-red-500">*</span>
              </Label>
              <SearchablePaginatedSelect
                value={selectedTestSeries}
                onValueChange={setSelectedTestSeries}
                placeholder={testSeriesListLoading ? "Loading test series..." : "Select test series"}
                searchPlaceholder="Search test series..."
                emptyLabel="No test series found"
                triggerClassName="bg-slate-50 border-slate-200"
                options={testSeries.map((s) => ({
                  value: s.id.toString(),
                  label: s.title,
                  searchText: s.title,
                }))}
              />
            </div>

            {testSeriesError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {testSeriesError}
              </p>
            )}

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTestSeriesModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAssignTestSeries}
                disabled={testSeriesLoading || !selectedTestSeries}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm"
              >
                {testSeriesLoading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Assign Test Series
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal - Assign Activity Group */}
      <Dialog open={showActivityGroupModal} onOpenChange={setShowActivityGroupModal}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <span>Assign Activity Group</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Activity Group <span className="text-red-500">*</span>
              </Label>
              <SearchablePaginatedSelect
                value={selectedActivityGroup}
                onValueChange={setSelectedActivityGroup}
                placeholder={activityGroupListLoading ? "Loading activity groups..." : "Select activity group"}
                searchPlaceholder="Search activity group..."
                emptyLabel="No activity groups found"
                triggerClassName="bg-slate-50 border-slate-200"
                options={activityGroups.map((g) => ({
                  value: g.id.toString(),
                  label: g.name,
                  searchText: g.name,
                }))}
              />
            </div>

            {activityGroupError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {activityGroupError}
              </p>
            )}

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActivityGroupModal(false)}
                className="border-slate-300 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAssignActivityGroup}
                disabled={activityGroupLoading || !selectedActivityGroup}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              >
                {activityGroupLoading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                Assign Activity Group
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <SuccessModal
        open={showSuccessModal}
        title="Success"
        description="Assignment updated successfully"
        okText="Close"
        onConfirm={() => setShowSuccessModal(false)}
        onClose={() => setShowSuccessModal(false)}
      />

      <DeleteConfirmationModal
        open={showDeleteModal}
        title="Remove Assignment"
        message="Are you sure you want to remove this assignment?"
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveSubject}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}