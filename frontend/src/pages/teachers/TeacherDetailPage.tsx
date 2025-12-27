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
import { teacherService, subjectService } from "@/services/api";
import type { Teacher, Subject } from "@/types";
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
  MapPin,
  Home,
  Globe,
  Map,
  Hash,
  Plus,
  X,
  IndianRupee,
  Users,
} from "lucide-react";
import { format } from "date-fns";

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

// Custom modals
import SuccessModal from "@/components/ui/successModal";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeacherDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Teacher not found</h1>
        <Button
          onClick={() => navigate("/dashboard/teachers")}
          className="mt-4"
        >
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER - Matching Student Detail Layout */}
      <div className="flex flex-col space-y-4">
        {/* First Row: Back button */}
        <div>
          <button
            onClick={() => navigate("/dashboard/teachers")}
            className="flex items-center text-blue-600 text-sm hover:underline w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Teachers
          </button>
        </div>

        {/* Second Row: Name + Edit button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          {/* Teacher Name */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
              {teacher.user.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Teacher profile and details
            </p>
          </div>

          {/* Edit Button */}
          <div className="flex-shrink-0">
            <Button
              onClick={() => navigate(`/dashboard/teachers/${teacher.id}/edit`)}
              className="w-full sm:w-auto"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Teacher
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Matching Student Detail Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Contact Information
            </CardTitle>
            <CardDescription>Teacher contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-sm text-muted-foreground">
                  {teacher.user.email}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Phone</p>
                <p className="text-sm text-muted-foreground">
                  {teacher.user.phone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Professional Information
            </CardTitle>
            <CardDescription>Teacher professional details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <GraduationCap className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Qualification</p>
                <p className="text-sm text-muted-foreground">
                  {teacher.qualification || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Briefcase className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Experience</p>
                <p className="text-sm text-muted-foreground">
                  {teacher.experience || "-"}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Gender</p>
                <p className="text-sm text-muted-foreground">
                  {getGenderDisplay(teacher.gender)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Salary Information
            </CardTitle>
            <CardDescription>Monthly salary details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <IndianRupee className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Salary</p>
                <p className="text-sm text-muted-foreground">
                  {formatSalary(teacher.salary)}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <BookOpen className="h-5 w-5 text-saBlue/50 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-600">Currency</p>
                <p className="text-sm text-muted-foreground">
                  {teacher.salary_currency
                    ? `${teacher.salary_currency.name} (${teacher.salary_currency.code})`
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Address Information
            </CardTitle>
            <CardDescription>
              {teacher.address ? "Teacher address details" : "No address added"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teacher.address ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-start space-x-3">
                  <Home className="h-5 w-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Address</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.address.addressLine || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">City</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.address.city?.name || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Map className="h-5 w-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">State</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.address.state?.name || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Globe className="h-5 w-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Country</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.address.country?.name || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Hash className="h-5 w-5 text-saBlue/50 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Postal Code</p>
                    <p className="text-sm text-muted-foreground">
                      {teacher.address.postalCode || "-"}
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
                    onClick={() => navigate(`/dashboard/teachers/${teacher.id}/edit`)}
                  >
                    Add Address
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row Grid - Matching Student Detail Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Assigned Subjects Statistics */}
        <Card className="md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">
              Assigned Subjects
            </CardTitle>
            <CardDescription>Subjects assigned to this teacher</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 mb-4">
              <BookOpen className="h-5 w-5 text-saBlue/50" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Subjects Assigned
                </p>
                <p className="text-lg font-semibold text-muted-foreground">
                  {teacher.teacher_subject_junctions?.length || 0}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full text-gray-600 border-saBlue/50"
              onClick={openAssignModal}
            >
              <Plus className="mr-2 h-4 w-4" />
              Assign New Subject
            </Button>
          </CardContent>
        </Card>

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
                {safeFormat(teacher.created_at, "PPP")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium text-muted-foreground">
                {safeFormat(teacher.updated_at, "PPP")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Subjects Detailed View */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-xl text-gray-600">Assigned Subjects</CardTitle>
              <CardDescription>
                {teacher.teacher_subject_junctions?.length || 0} subjects assigned
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAssignModal}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Subject
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {teacher.teacher_subject_junctions?.length ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {teacher.teacher_subject_junctions.map((junction) => (
                <Card key={junction.id} className="border-saBlue/20">
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div className="flex items-start space-x-3">
                        <BookOpen className="h-5 w-5 text-saBlue/50 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-600">{junction.subject.name}</p>
                          {junction.subject.class && (
                            <Badge 
                              variant="outline" 
                              className="mt-1 border-saBlue/50 text-saBlue"
                            >
                              {junction.subject.class.name}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Assigned on: {safeFormat(junction.created_on, "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteJunctionId(junction.id);
                          setShowDeleteModal(true);
                        }}
                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No subjects assigned yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={openAssignModal}
              >
                <Plus className="mr-2 h-4 w-4" />
                Assign First Subject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ASSIGN SUBJECT MODAL */}
      {showAssignModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowAssignModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <h2 className="text-xl font-semibold text-gray-800">Assign Subject</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a subject to assign to {teacher.user.name}.
            </p>

            {/* Error */}
            {assignError && (
              <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md mt-3">
                {assignError}
              </div>
            )}

            {/* Subject Selection */}
            <div className="mt-5">
              <Label className="font-medium">Subject</Label>

              {subjectListLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                  disabled={assignLoading}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name} {subject.class ? `(${subject.class.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                disabled={assignLoading}
              >
                Cancel
              </Button>

              <Button onClick={handleAssignSubject} disabled={assignLoading}>
                {assignLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Subject"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        open={showSuccessModal}
        title="Subject Assigned!"
        description="The subject has been successfully assigned to this teacher."
        okText="OK"
        onConfirm={() => setShowSuccessModal(false)}
        showButtons={true}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={showDeleteModal}
        title="Remove Subject?"
        message="Are you sure you want to remove this subject from the teacher?"
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveSubject}
        onCancel={() => setShowDeleteModal(false)}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}