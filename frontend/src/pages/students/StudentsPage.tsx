import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { studentService, boardService, classService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { Student, Board, Class } from "@/types";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Search,
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { usePageTitle } from "@/hooks/usePageTitle";

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
  usePageTitle("Students");
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
  }, [currentPage, searchTerm, selectedClass, selectedBoard, selectedGender, isTeacher, user?.id, limit]);

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

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Students</h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            Directory & Management
          </p>
        </div>
        {isAdmin && (
          <Button
            className="bg-saBlue hover:bg-saBlue/90 text-white h-10 px-5 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm rounded-xl"
            onClick={() => navigate("/dashboard/students/new")}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            New Student
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
        {/* Search */}
        <div className="relative flex-1 w-full md:w-auto min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-saBlue/10 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Dropdowns Container */}
        <div className="flex flex-wrap flex-1 gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              handleFilterChange();
            }}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 focus:outline-none focus:ring-2 focus:ring-saBlue/10 cursor-pointer min-w-[120px]"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select
            value={selectedBoard}
            onChange={(e) => {
              setSelectedBoard(e.target.value);
              handleFilterChange();
            }}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 focus:outline-none focus:ring-2 focus:ring-saBlue/10 cursor-pointer min-w-[120px]"
          >
            <option value="">All Boards</option>
            {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select
            value={selectedGender}
            onChange={(e) => {
              setSelectedGender(e.target.value);
              handleFilterChange();
            }}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 focus:outline-none focus:ring-2 focus:ring-saBlue/10 cursor-pointer min-w-[100px]"
          >
            <option value="">Gender: All</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">Loading Students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-600">No students found</h3>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-500 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-gray-100">
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 min-w-[200px]">Student</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[150px] hidden md:table-cell">Class Info</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[120px] hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-blue-50/30 border-b-gray-50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-gray-50">
                          <AvatarImage src={student.user.profile_url} />
                          <AvatarFallback className="bg-saVividOrange text-white text-xs">{getInitials(student.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-sm leading-tight">{student.user.name}</span>
                          <span className="text-[10px] text-gray-400">{student.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[10px] border-blue-100 text-saBlue bg-blue-50/50">{student.class?.name || 'No Class'}</Badge>
                        <span className="text-[10px] text-gray-400 ml-1">{student.board?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-xs text-gray-600 font-mono">{student.user.phone || '-'}</div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-saBlue" onClick={() => navigate(`/dashboard/students/${student.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-saVividOrange" onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination Styled */}
      {students.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {Math.min(currentPage * limit, total)} of {total} Students
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-8 text-xs font-medium rounded-lg"
            >
              <ChevronLeft className="w-3 h-3 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-8 text-xs font-medium rounded-lg"
            >
              Next <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

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
