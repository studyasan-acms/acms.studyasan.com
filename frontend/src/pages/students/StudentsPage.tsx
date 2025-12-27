import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { studentService, boardService, classService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { Student, Board, Class } from "@/types";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";

interface StudentQueryParams {
  page: number;
  limit: number;
  search?: string;
  class_id?: number;
  board_id?: number;
  gender?: string;
  user_id?: number;
  role?: string;
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const isTeacher = user?.role === "TEACHER";

  const [students, setStudents] = useState<Student[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [selectedGender, setSelectedGender] = useState<string>("");

  useEffect(() => {
    fetchBoards();
    fetchClasses();
  }, []);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: StudentQueryParams = { page: currentPage, limit };
      if (searchTerm) params.search = searchTerm;
      if (selectedClass) params.class_id = parseInt(selectedClass);
      if (selectedBoard) params.board_id = parseInt(selectedBoard);
      if (selectedGender) params.gender = selectedGender;

      // For teachers, filter by their subjects
      if (isTeacher && user?.id) {
        params.user_id = user.id;
        params.role = "TEACHER";
      }

      const response = await studentService.getAll(params);
      setStudents(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, selectedClass, selectedBoard, selectedGender, isTeacher, user?.id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const fetchBoards = async () => {
    try {
      const response = await boardService.getAll({ limit: 100 });
      setBoards(response.data.data);
    } catch (error) {
      console.error("Failed to fetch boards:", error);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll({ limit: 100 });
      setClasses(response.data.data);
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteStudent) return;
    try {
      await studentService.delete(deleteStudent.id);
      setDeleteStudent(null);
      fetchStudents();
    } catch (error) {
      console.error("Failed to delete student:", error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = () => setCurrentPage(1);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedClass("");
    setSelectedBoard("");
    setSelectedGender("");
    setCurrentPage(1);
  };

  const getGenderSpan = (gender: string | null) => {
    if (!gender) return null;
    const label = gender === "M" ? "Male" : gender === "F" ? "Female" : "Other";
    return <span>{label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
            Students
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage student accounts and information
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => navigate("/dashboard/students/new")}
            className="w-full md:w-auto mt-2 md:mt-0 md:ml-4 flex justify-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        )}
      </div>

      {/* Students Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-gray-600">
            All Students ({total})
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isTeacher
              ? "Students enrolled in your subjects"
              : "A list of all students in the system"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 mb-4 items-end">
            <div className="md:col-span-5">
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                value={selectedClass}
                onValueChange={(value) => {
                  setSelectedClass(value === "all-classes" ? "" : value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-classes">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select
                value={selectedBoard}
                onValueChange={(value) => {
                  setSelectedBoard(value === "all-boards" ? "" : value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Boards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-boards">All Boards</SelectItem>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id.toString()}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Select
                value={selectedGender}
                onValueChange={(value) => {
                  setSelectedGender(value === "all-genders" ? "" : value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-genders">All Genders</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex justify-end">
              <Button
                size="default"
                variant="outline"
                onClick={clearFilters}
                disabled={
                  !searchTerm &&
                  !selectedClass &&
                  !selectedBoard &&
                  !selectedGender
                }
                className="w-full md:w-auto"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No students found</p>
              <p className="text-sm">
                Try adjusting your filters or add a new student
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md overflow-hidden border-none lg:border">
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-saBlue/40 hover:bg-saBlue/40">
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Name
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Class
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Board
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Gender
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          School
                        </TableHead>
                        {isAdmin && (
                          <TableHead className="text-gray-900 font-semibold text-md">
                            Enrollments
                          </TableHead>
                        )}
                        <TableHead className="text-gray-900 font-semibold text-md text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student, index) => (
                        <TableRow
                          key={student.id}
                          className={
                            index % 2 === 0
                              ? "bg-saBlueLight/20"
                              : "bg-saBlueLight/10"
                          }
                        >
                          <TableCell className="font-medium">
                            {student.user.name}
                          </TableCell>
                          <TableCell>
                            {student.class ? student.class.name : "-"}
                          </TableCell>
                          <TableCell>
                            {student.board ? student.board.name : "-"}
                          </TableCell>
                          <TableCell>{getGenderSpan(student.gender)}</TableCell>
                          <TableCell>{student.school || "-"}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              {student._count?.enrollments || 0}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-saBlue hover:text-saBlueDarkHover cursor-pointer"
                                onClick={() =>
                                  navigate(`/dashboard/students/${student.id}`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-saVividOrange hover:text-[#d18a00] cursor-pointer"
                                  onClick={() =>
                                    navigate(
                                      `/dashboard/students/${student.id}/edit`
                                    )
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-800 cursor-pointer"
                                  onClick={() => setDeleteStudent(student)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile & Tablet Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4 px-0">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="rounded-xl overflow-hidden shadow-sm transition hover:shadow-md duration-200"
                    >
                      <div className="bg-saBlueLight/60 p-4 flex justify-between items-center">
                        <div className="font-semibold text-lg text-gray-900 truncate">
                          {student.user.name}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-saBlue hover:text-saBlueDarkHover cursor-pointer"
                            onClick={() =>
                              navigate(`/dashboard/students/${student.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-saVividOrange hover:text-[#d18a00] cursor-pointer"
                              onClick={() =>
                                navigate(`/dashboard/students/${student.id}/edit`)
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 cursor-pointer"
                              onClick={() => setDeleteStudent(student)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              Class
                            </span>
                            <span>{student.class?.name || "-"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              Board
                            </span>
                            <span>{student.board?.name || "-"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              Gender
                            </span>
                            <span>{getGenderSpan(student.gender)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              School
                            </span>
                            <span>{student.school || "-"}</span>
                          </div>
                          {isAdmin && (
                            <div className="flex flex-col col-span-2">
                              <span className="font-medium text-gray-800">
                                Enrollments
                              </span>
                              <span>{student._count?.enrollments || 0}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
                <p className="text-sm text-muted-foreground text-center sm:text-left w-full sm:w-auto">
                  Showing {(currentPage - 1) * limit + 1} to{" "}
                  {Math.min(currentPage * limit, total)} of {total} students
                </p>
                <div className="flex items-center space-x-2 justify-center w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={!!deleteStudent}
        title="Delete Student"
        message={
          <span>
            Are you sure you want to delete <strong>{deleteStudent?.user.name}</strong>?
          </span>
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteStudent(null)}
      />
    </div>
  );
}
