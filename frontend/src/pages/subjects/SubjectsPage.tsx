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
import { Badge } from "@/components/ui/badge";
import {
  subjectService,
  boardService,
  classService,
} from "@/services/api";
import type { Subject, Board, Class } from "@/types";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Search,
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SubjectsPage() {
  usePageTitle("Subjects");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedBoard, setSelectedBoard] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");

  /** Fetch subjects */
  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);

    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedClass) params.class_id = parseInt(selectedClass);
      if (selectedBoard) params.board_id = parseInt(selectedBoard);
      if (selectedType)
        params.is_course = selectedType === "course" ? true : false;

      // Teacher filter
      if (user?.role === "TEACHER" && user.id) {
        params.user_id = user.id;
        params.role = "TEACHER";
      }

      // Student filter
      if (user?.role === "STUDENT" && user.id) {
        params.user_id = user.id;
        params.role = "STUDENT";
      }

      const response = await subjectService.getAll(params);

      setSubjects(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    searchTerm,
    selectedClass,
    selectedBoard,
    selectedType,
    user,
  ]);

  /** Initial fetch: boards & classes */
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await boardService.getAll({ limit: 100 });
        setBoards(res.data.data);
      } catch (err) {
        console.error("Failed to fetch boards:", err);
      }
    };

    const fetchClasses = async () => {
      try {
        const res = await classService.getAll({ limit: 100 });
        setClasses(res.data.data);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
      }
    };

    fetchBoards();
    fetchClasses();
  }, []);

  /** Fetch subjects on filter/pagination change */
  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleDelete = async () => {
    if (!deleteSubject) return;
    try {
      await subjectService.delete(deleteSubject.id);
      setDeleteSubject(null);
      fetchSubjects();
    } catch (error) {
      console.error("Failed to delete subject:", error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = () => setCurrentPage(1);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
            Subjects
          </h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            Manage subjects & courses
          </p>
        </div>
        {isAdmin && (
          <Button
            className="bg-saBlue hover:bg-saBlue/90 text-white h-10 px-5 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm rounded-xl"
            onClick={() => navigate("/dashboard/subjects/new")}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            New Subject
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
            placeholder="Search subjects..."
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
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              handleFilterChange();
            }}
            className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 focus:outline-none focus:ring-2 focus:ring-saBlue/10 cursor-pointer min-w-[100px]"
          >
            <option value="">All Types</option>
            <option value="subject">Subject</option>
            <option value="course">Course</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">
            Loading Subjects...
          </p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-600">No subjects found</h3>
          <p className="text-gray-400 text-xs mt-1">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-500 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-gray-100">
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 min-w-[200px]">
                    Subject Name
                  </TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[120px] hidden md:table-cell">
                    Class & Board
                  </TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[100px] hidden md:table-cell">
                    Type
                  </TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[100px] hidden lg:table-cell">
                    Enrollments
                  </TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow
                    key={subject.id}
                    className="hover:bg-blue-50/30 border-b-gray-50 transition-colors"
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-saBlue">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-sm leading-tight">
                            {subject.name}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {subject._count?.teacher_subject_junctions || 0} Teachers
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[10px] border-blue-100 text-saBlue bg-blue-50/50">
                          {subject.class?.name || "No Class"}
                        </Badge>
                        <span className="text-[10px] text-gray-400 ml-1">{subject.board?.name || 'No Board'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-[10px] font-medium bg-gray-100 text-gray-600">
                        {subject.is_course ? "Course" : "Subject"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center space-x-1">
                        <div className="h-6 w-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                          <span className="text-[10px] font-bold text-gray-600">{subject._count?.enrollments || 0}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">students</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-saBlue"
                          onClick={() =>
                            navigate(`/dashboard/subjects/${subject.id}`)
                          }
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-saVividOrange"
                              onClick={() =>
                                navigate(
                                  `/dashboard/subjects/${subject.id}/edit`
                                )
                              }
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600"
                              onClick={() => setDeleteSubject(subject)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
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
      {subjects.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {Math.min(currentPage * limit, total)} of {total} Subjects
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-8 text-xs font-medium rounded-lg"
            >
              <ChevronLeft className="w-3 h-3 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-8 text-xs font-medium rounded-lg"
            >
              Next <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isAdmin && (
        <DeleteConfirmationModal
          open={!!deleteSubject}
          title="Delete Subject"
          message={
            <span>
              Are you sure you want to delete <strong>{deleteSubject?.name}</strong>?
            </span>
          }
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDelete}
          onCancel={() => setDeleteSubject(null)}
          onClose={() => setDeleteSubject(null)}
        />
      )}
    </div>
  );
}
