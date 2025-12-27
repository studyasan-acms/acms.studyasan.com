import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Trash2, Users, BookOpen } from "lucide-react";
import {
  enrollmentService,
  studentService,
  subjectService,
} from "@/services/api";
import type { Enrollment, Student, Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { useAuthStore } from "@/store/authStore";

const EnrollmentsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentFilter, setStudentFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  useEffect(() => {
const fetchEnrollments = async () => {
  try {
    setLoading(true);
    const params: Record<string, string | number> = { page: currentPage, limit: 10 };
    if (searchTerm) params.search = searchTerm;
    if (studentFilter !== "all") params.student_id = parseInt(studentFilter);
    if (subjectFilter !== "all") params.subject_id = parseInt(subjectFilter);
    if (isStudent) params.student_id = user?.id || 0;

    const response = await enrollmentService.getAll(params);
    setEnrollments(response.data.data);
    setTotalPages(response.data.pagination.totalPages);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
  } finally {
    setLoading(false);
  }
};


    const fetchStudents = async () => {
      try {
        const response = await studentService.getAll({ limit: 100 });
        setStudents(response.data.data);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };

const fetchSubjects = async () => {
  try {
    const params: Record<string, string | number> = { limit: 100 };
    if (isTeacher && user?.id) {
      params.user_id = user.id;
      // Optional: params.role = user.role; // if your API expects a string
    }
    const response = await subjectService.getAll(params);
    setSubjects(response.data.data);
  } catch (error) {
    console.error("Error fetching subjects:", error);
  }
};
    fetchEnrollments();
    fetchStudents();
    fetchSubjects();
  }, [
    currentPage,
    searchTerm,
    studentFilter,
    subjectFilter,
    isStudent,
    isTeacher,
    user,
  ]);

  const handleDeleteClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEnrollment) return;
    try {
      await enrollmentService.delete(selectedEnrollment.id);
      setEnrollments(enrollments.filter((e) => e.id !== selectedEnrollment.id));
      setDeleteModalOpen(false);
      setSelectedEnrollment(null);
    } catch (error) {
      console.error("Error deleting enrollment:", error);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading && enrollments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enrollments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
            Enrollments
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage student subject enrollments
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Link to="/dashboard/enrollments/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2">
                <Plus className="h-4 w-4" /> Create Enrollment
              </Button>
            </Link>
            <Link to="/dashboard/enrollments/bulk" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2"
              >
                <Users className="h-4 w-4" /> Bulk Enrollment
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by student or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {!isStudent && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student
            </label>
            <Select value={studentFilter} onValueChange={setStudentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject
          </label>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Enrollment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {enrollments.length === 0 ? (
          <Card className="col-span-full text-center py-12">
            <CardContent>
              <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No enrollments found
              </h3>
              <p className="text-gray-600">
                {isAdmin
                  ? "Get started by creating your first enrollment."
                  : "No enrollments available."}
              </p>
            </CardContent>
          </Card>
        ) : (
          enrollments.map((enrollment) => (
            <Card
              key={enrollment.id}
              className="cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="relative bg-saBlueLight/60 text-gray-600 p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-md sm:text-lg font-semibold">
                    {enrollment.student.user.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{enrollment.subject.name}</Badge>
                    {enrollment.subject.is_course && (
                      <Badge variant="outline">Course</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <CardContent className="bg-gray-100 rounded-b-2xl pt-6 sm:pt-8 p-4 sm:p-5 space-y-3 sm:space-y-4 text-gray-700 flex-1 flex flex-col justify-between">
                <p className="text-sm sm:text-base">
                  <strong>Class:</strong>{" "}
                  {enrollment.student.class?.name || "N/A"}
                </p>
                <p className="text-sm sm:text-base">
                  <strong>Board:</strong>{" "}
                  {enrollment.student.board?.name || "N/A"}
                </p>
                <p className="text-sm sm:text-base">
                  <strong>Enrolled on:</strong>{" "}
                  {formatDate(enrollment.created_on)}
                </p>

                <div className="pt-2 sm:pt-3 border-t border-gray-200 flex justify-end items-center text-xs sm:text-sm gap-2">
                  <Link
                    to={`/dashboard/enrollments/${enrollment.id}`}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-300 text-gray-800 hover:bg-saBlue hover:text-white w-full sm:w-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Button
                      size="sm"
                      className="bg-saVividOrange text-white hover:bg-saBlueDarkHover w-full sm:w-auto"
                      onClick={() => handleDeleteClick(enrollment)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

<DeleteConfirmationModal
  open={deleteModalOpen}
  onClose={() => setDeleteModalOpen(false)}
  onCancel={() => setDeleteModalOpen(false)}
  title={
    selectedEnrollment
      ? `Delete Enrollment for ${selectedEnrollment.student.user.name}?`
      : "Delete Enrollment"
  }
  message={
    selectedEnrollment && (
      <div className="grid grid-cols-2 gap-3 text-left text-xs sm:text-sm text-gray-700">
        {/* Column 1: Student Info */}
        <div className="space-y-1">
          <p className="font-medium text-gray-600">Student</p>
          <p className="font-semibold text-gray-600">
            {selectedEnrollment.student.user.name}
          </p>
          <p className="text-gray-500">{selectedEnrollment.student.user.email}</p>

          <p className="font-medium text-gray-600 mt-2">Class</p>
          <p className="font-semibold text-gray-600">
            {selectedEnrollment.student.class?.name || "N/A"}
          </p>

          <p className="font-medium text-gray-600 mt-2">Board</p>
          <p className="font-semibold text-gray-600">
            {selectedEnrollment.student.board?.name || "N/A"}
          </p>
        </div>

        {/* Column 2: Subject Info */}
        <div className="space-y-1">
          <p className="font-medium text-gray-600">Subject</p>
          <p className="font-semibold text-gray-600">{selectedEnrollment.subject.name}</p>
          <div className="flex gap-1 flex-wrap mt-1">
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              Class: {selectedEnrollment.subject.class?.name || "N/A"}
            </Badge>
            {selectedEnrollment.subject.is_course && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                Course
              </Badge>
            )}
          </div>

          <p className="font-medium text-gray-600 mt-2">Enrolled On</p>
          <p className="font-semibold text-gray-600 text-[10px] sm:text-sm">
            {new Date(selectedEnrollment.created_on).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    )
  }
  footer={
    <div className="flex justify-end gap-3 mt-6">
      <button
        onClick={() => setDeleteModalOpen(false)}
        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        onClick={confirmDelete}
        className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  }
/>

    </div>
  );
};

export default EnrollmentsPage;
