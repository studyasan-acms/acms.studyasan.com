import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { activityEnrollmentAPI } from "@/services/activity.service";
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
  FileText
} from "lucide-react";
import { format } from "date-fns";
import InvoiceModal from "@/components/InvoiceModal";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function StudentDetailPage() {
  usePageTitle("Student Details");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

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
      const response = await import("@/services/api").then(m => m.activityGroupService.getAll({ limit: 100, is_active: true }));
      setActivityGroups(response.data.activityGroups);
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
    const alreadyEnrolled = student.enrollments?.some(e => e.subject.id === selectedSubjectId);
    if (alreadyEnrolled) {
      alert('Student is already enrolled in this subject');
      return;
    }

    try {
      await import("@/services/api").then(m => m.enrollmentService.create({
        student_id: student.id,
        subject_id: selectedSubjectId
      }));
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
    const alreadyEnrolled = student.test_series_enrollments?.some(e => e.test_series.id === selectedTestSeriesId);
    if (alreadyEnrolled) {
      alert('Student is already enrolled in this test series');
      return;
    }

    try {
      await testSeriesService.enroll(selectedTestSeriesId, student.id);
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
    const alreadyEnrolled = student.activity_enrollments?.some(e => e.activity.group.id === selectedActivityGroupId);
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Student not found</h1>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        {/* First Row: Back button */}
        <div>
          <button
            onClick={() => navigate("/dashboard/students")}
            className="flex items-center text-blue-600 text-sm hover:underline w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Students
          </button>
        </div>

        {/* Second Row: Profile Picture + Name + Edit button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Profile Picture and Student Name */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img
                src={student.user.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.user.name)}&background=f97316&color=ffffff&size=80`}
                alt={student.user.name}
                className="w-20 h-20 rounded-full object-cover border border-gray-300"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
                {student.user.name}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Student profile and details
              </p>
            </div>
          </div>

          {/* Edit Button - Admin only */}
          {isAdmin && (
            <div className="flex-shrink-0 flex space-x-2">
              <Button
                onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Student
              </Button>
              <Button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="w-full sm:w-auto"
              >
                <Receipt className="mr-2 h-4 w-4" />
                Invoice
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Contact Information - Admin only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">
                Contact Information
              </CardTitle>
              <CardDescription>Student contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-saBlue/50 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {student.user.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-saBlue/50 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-sm text-muted-foreground">
                    {student.user.phone}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Academic Information
            </CardTitle>
            <CardDescription>Class and board details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <BookOpen className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Class</p>
                {student.class ? (
                  <p className="text-sm text-muted-foreground">
                    {student.class.name}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Board</p>
                {student.board ? (
                  <p className="text-sm text-muted-foreground">
                    {student.board.name}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Not assigned</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <School className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">School</p>
                <p className="text-sm text-muted-foreground">
                  {student.school || "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Personal Information
            </CardTitle>
            <CardDescription>Personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Gender</p>
                <p className="text-sm text-muted-foreground">
                  {getGenderDisplay(student.gender)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Date of Birth
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(student.date_of_birth)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Droplet className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Blood Group</p>
                <p className="text-sm text-muted-foreground">
                  {getBloodGroupDisplay(student.blood_group)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information - Admin only */}
        {isAdmin && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">
                Address Information
              </CardTitle>
              <CardDescription>
                {student.address ? "Student address details" : "No address added"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {student.address ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-start space-x-3">
                    <Home className="h-5 w-5 text-saBlue/50 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {student.address.addressLine || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-saBlue/50 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">City</p>
                      <p className="text-sm text-muted-foreground">
                        {student.address.city?.name || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Map className="h-5 w-5 text-saBlue/50 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">State</p>
                      <p className="text-sm text-muted-foreground">
                        {student.address.state?.name || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Globe className="h-5 w-5 text-saBlue/50 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Country</p>
                      <p className="text-sm text-muted-foreground">
                        {student.address.country?.name || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Hash className="h-5 w-5 text-saBlue/50 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Postal Code</p>
                      <p className="text-sm text-muted-foreground">
                        {student.address.postalCode || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No address information available</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}
                    >
                      Add Address
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}


      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Enrollment Statistics - Admin only */}
        {isAdmin && (
          <Card className="md:col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">
                Enrollment Statistics
              </CardTitle>
              <CardDescription>Subject enrollment information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Subject Enrollments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="h-5 w-5 text-saBlue/50" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Subject Enrollments ({student._count?.enrollments || 0})
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={openSubjectModal}>
                      <Plus className="mr-1 h-3 w-3" />
                      Enroll
                    </Button>
                  </div>
                  {student.enrollments && student.enrollments.length > 0 ? (
                    <div className="ml-8 space-y-1">
                      {student.enrollments.map((enrollment) => (
                        <p key={enrollment.id} className="text-sm text-muted-foreground">
                          • {enrollment.subject.name}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-8">No subject enrollments</p>
                  )}
                </div>

                {/* Test Series Enrollments */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-saBlue/50" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Test Series Enrollments ({student._count?.test_series_enrollments || 0})
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={openTestSeriesModal}>
                      <Plus className="mr-1 h-3 w-3" />
                      Enroll
                    </Button>
                  </div>
                  {(student.test_series_enrollments || []).length > 0 ? (
                    <div className="ml-8 space-y-1">
                      {(student.test_series_enrollments || []).map((enrollment) => (
                        <p key={enrollment.id} className="text-sm text-muted-foreground">
                          • {enrollment.test_series?.title || 'Unknown Test Series'}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-8">No test series enrollments</p>
                  )}
                </div>

                {/* Activity Groups */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-saBlue/50" />
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Activity Groups ({student.activity_enrollments ?
                            new Set(student.activity_enrollments.map(e => e.activity.group.id)).size : 0})
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={openActivityGroupModal}>
                      <Plus className="mr-1 h-3 w-3" />
                      Enroll
                    </Button>
                  </div>
                  {student.activity_enrollments && student.activity_enrollments.length > 0 ? (
                    <div className="ml-8 space-y-1">
                      {Array.from(new Set(student.activity_enrollments.map(e => e.activity.group.name)))
                        .map((groupName) => (
                          <p key={groupName} className="text-sm text-muted-foreground">
                            • {groupName}
                          </p>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground ml-8">No activity group enrollments</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full text-gray-600 border-saBlue/50 mt-4"
                onClick={() =>
                  navigate(`/dashboard/enrollments?student_id=${student.id}`)
                }
              >
                View Enrollments
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Timeline */}
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Account Timeline
            </CardTitle>
            <CardDescription>Important dates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Account Created
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {format(new Date(student.created_at), "PPP")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium text-muted-foreground">
                {format(new Date(student.updated_at), "PPP")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ENROLL SUBJECT MODAL */}
      {showSubjectModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowSubjectModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Enroll in Subject</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject-select">Select Subject</Label>
                <Select
                  value={selectedSubjectId?.toString() || ""}
                  onValueChange={(value) => setSelectedSubjectId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSubjects ? (
                      <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowSubjectModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnrollSubject}
                disabled={!selectedSubjectId || loadingSubjects}
              >
                Enroll
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLL TEST SERIES MODAL */}
      {showTestSeriesModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowTestSeriesModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Enroll in Test Series</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-series-select">Select Test Series</Label>
                <Select
                  value={selectedTestSeriesId?.toString() || ""}
                  onValueChange={(value) => setSelectedTestSeriesId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a test series" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingTestSeries ? (
                      <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                      testSeries.map((ts) => (
                        <SelectItem key={ts.id} value={ts.id.toString()}>
                          {ts.title}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTestSeriesModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnrollTestSeries}
                disabled={!selectedTestSeriesId || loadingTestSeries}
              >
                Enroll
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ENROLL ACTIVITY GROUP MODAL */}
      {showActivityGroupModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowActivityGroupModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Enroll in Activity Group</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="activity-group-select">Select Activity Group</Label>
                <Select
                  value={selectedActivityGroupId?.toString() || ""}
                  onValueChange={(value) => setSelectedActivityGroupId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an activity group" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingActivityGroups ? (
                      <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                    ) : (
                      activityGroups.map((ag) => (
                        <SelectItem key={ag.id} value={ag.id.toString()}>
                          {ag.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowActivityGroupModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEnrollActivityGroup}
                disabled={!selectedActivityGroupId || loadingActivityGroups}
              >
                Enroll
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {student && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          student={student}
        />
      )}
    </div>
  );
}