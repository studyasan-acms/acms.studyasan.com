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
import { studentService } from "@/services/api";
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
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import InvoiceModal from "@/components/InvoiceModal";

export default function StudentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

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

        {/* Second Row: Name + Edit button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          {/* Student Name */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
              {student.user.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Student profile and details
            </p>
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
                  <div className="flex items-center space-x-3 mb-2">
                    <BookOpen className="h-5 w-5 text-saBlue/50" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Subject Enrollments ({student._count?.enrollments || 0})
                      </p>
                    </div>
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

                {/* Activity Groups */}
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <Users className="h-5 w-5 text-saBlue/50" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Activity Groups ({student.activity_enrollments ? 
                          new Set(student.activity_enrollments.map(e => e.activity.group.id)).size : 0})
                      </p>
                    </div>
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