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
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";

import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SubjectsPage() {
  usePageTitle("Subjects");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

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
        console.log('🔍 [SUBJECTS_PAGE] Fetching teacher subjects with params:', params);
      }

      // Student filter
      if (user?.role === "STUDENT" && user.id) {
        params.user_id = user.id;
        params.role = "STUDENT";
        console.log('🔍 [SUBJECTS_PAGE] Fetching student subjects with params:', params);
      }

      const response = await subjectService.getAll(params);
      console.log('✅ [SUBJECTS_PAGE] Subjects response:', response);

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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedClass("");
    setSelectedBoard("");
    setSelectedType("");
    setCurrentPage(1);
  };

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
            Subjects
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage subjects and courses
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => navigate("/dashboard/subjects/new")}
            className="w-full md:w-auto flex justify-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-gray-600">
            All Subjects ({total})
          </CardTitle>
          <CardDescription className="text-gray-400">
            A list of all subjects in the system
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 mb-4 items-end">
            {/* Search */}
            <div className="md:col-span-5">
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Class filter */}
            <div className="md:col-span-2">
              <Select
                value={selectedClass}
                onValueChange={(val) => {
                  setSelectedClass(val === "all" ? "" : val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Board filter */}
            <div className="md:col-span-2">
              <Select
                value={selectedBoard}
                onValueChange={(val) => {
                  setSelectedBoard(val === "all" ? "" : val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Boards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boards</SelectItem>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type filter */}
            <div className="md:col-span-2">
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  setSelectedType(val === "all" ? "" : val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="course">Course</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters */}
            <div className="md:col-span-1 flex justify-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={
                  !searchTerm &&
                  !selectedClass &&
                  !selectedBoard &&
                  !selectedType
                }
                className="w-full md:w-auto"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Table / Cards */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No subjects found</p>
              <p className="text-sm">Try adjusting your filters</p>
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
                          Type
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Teachers
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Enrollments
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {subjects.map((subject, index) => (
                        <TableRow
                          key={subject.id}
                          className={
                            index % 2 === 0
                              ? "bg-saBlueLight/20"
                              : "bg-saBlueLight/10"
                          }
                        >
                          <TableCell className="font-medium">
                            {subject.name}
                          </TableCell>

                          <TableCell>{subject.class?.name || "-"}</TableCell>

                          <TableCell>{subject.board?.name || "-"}</TableCell>

                          <TableCell>
                            {subject.is_course ? "Course" : "Subject"}
                          </TableCell>

                          <TableCell>
                            {subject._count?.teacher_subject_junctions || 0}
                          </TableCell>

                          <TableCell>
                            {subject._count?.enrollments || 0}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-saBlue hover:text-saBlueDarkHover cursor-pointer"
                                onClick={() =>
                                  navigate(`/dashboard/subjects/${subject.id}`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {isAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-saVividOrange hover:text-[#d18a00] cursor-pointer"
                                    onClick={() =>
                                      navigate(
                                        `/dashboard/subjects/${subject.id}/edit`
                                      )
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600 hover:text-red-800 cursor-pointer"
                                    onClick={() =>
                                      setDeleteSubject(subject)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
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

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4 px-0">
                  {subjects.map((subject) => (
                    <div
                      key={subject.id}
                      className="rounded-xl overflow-hidden shadow-sm transition hover:shadow-md duration-200"
                    >
                      {/* Header */}
                      <div className="bg-saBlueLight/60 p-4 flex justify-between items-center">
                        <div className="font-semibold text-lg text-gray-900 truncate">
                          {subject.name}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-saBlue hover:text-saBlueDarkHover"
                            onClick={() =>
                              navigate(`/dashboard/subjects/${subject.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {isAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-saVividOrange hover:text-[#d18a00]"
                                onClick={() =>
                                  navigate(
                                    `/dashboard/subjects/${subject.id}/edit`
                                  )
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => setDeleteSubject(subject)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4 bg-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Class</span>
                            <p>{subject.class?.name || "-"}</p>
                          </div>

                          <div>
                            <span className="font-medium">Board</span>
                            <p>{subject.board?.name || "-"}</p>
                          </div>

                          <div>
                            <span className="font-medium">Type</span>
                            <p>{subject.is_course ? "Course" : "Subject"}</p>
                          </div>

                          <div>
                            <span className="font-medium">Teachers</span>
                            <p>
                              {subject._count?.teacher_subject_junctions || 0}
                            </p>
                          </div>

                          <div className="col-span-2">
                            <span className="font-medium">Enrollments</span>
                            <p>{subject._count?.enrollments || 0}</p>
                          </div>
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
                  {Math.min(currentPage * limit, total)} of {total} subjects
                </p>

                <div className="flex items-center space-x-2 justify-center w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
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
      {isAdmin && (
        <DeleteConfirmationModal
          open={!!deleteSubject}
          title="Delete Subject"
          message={
            <p>
              Are you sure you want to delete <b>{deleteSubject?.name}</b>?
            </p>
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
