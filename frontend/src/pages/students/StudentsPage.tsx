import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SearchablePaginatedSelect from "@/components/ui/searchablePaginatedSelect";
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
  UserCheck,
  GraduationCap,
  BookOpen,
  ArrowUpDown,
  LayoutGrid,
  List,
  Filter,
  X,
  Phone,
  Mail,
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { formatStudentId } from "@/utils/idUtils";

interface StudentQueryParams {
  page: number;
  limit: number;
  search?: string;
  class_id?: number;
  board_id?: number;
  gender?: string;
  user_id?: number;
  role?: string;
  sort?: string;
  order?: string;
}

export default function StudentsPage() {
  usePageTitle("Students Directory");
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
  const limit = 12;

  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("name_asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    fetchBoards();
    fetchClasses();
  }, []);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: StudentQueryParams = { page: currentPage, limit };
      if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
      if (selectedClass && selectedClass !== "all") params.class_id = parseInt(selectedClass);
      if (selectedBoard && selectedBoard !== "all") params.board_id = parseInt(selectedBoard);
      if (selectedGender && selectedGender !== "all") params.gender = selectedGender;

      // Dynamic Sorting
      if (sortOption === "name_asc") {
        params.sort = "name";
        params.order = "asc";
      } else if (sortOption === "name_desc") {
        params.sort = "name";
        params.order = "desc";
      } else if (sortOption === "newest") {
        params.sort = "created_at";
        params.order = "desc";
      } else if (sortOption === "oldest") {
        params.sort = "created_at";
        params.order = "asc";
      }

      // For teachers, filter by their assigned subjects
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
  }, [currentPage, debouncedSearchTerm, selectedClass, selectedBoard, selectedGender, sortOption, isTeacher, user?.id, limit]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedClass, selectedBoard, selectedGender, sortOption]);

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

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedClass("all");
    setSelectedBoard("all");
    setSelectedGender("all");
    setSortOption("name_asc");
  };

  const hasActiveFilters =
    debouncedSearchTerm ||
    selectedClass !== "all" ||
    selectedBoard !== "all" ||
    selectedGender !== "all" ||
    sortOption !== "name_asc";

  // Quick stats calculations
  const maleCount = students.filter((s) => s.gender === "M").length;
  const femaleCount = students.filter((s) => s.gender === "F").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Students Directory</h1>
            <Badge className="bg-saBlue/10 text-saBlue hover:bg-saBlue/15 font-semibold px-2.5 py-0.5 rounded-full text-xs border border-saBlue/20">
              {total} Total Students
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage student enrollments, academic levels, and contact details.
          </p>
        </div>
        {isAdmin && (
          <Button
            className="bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-saBlue/20 rounded-xl px-4 py-2 font-semibold transition-all"
            onClick={() => navigate("/dashboard/students/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Student
          </Button>
        )}
      </div>

      {/* BRAND UNIFIED STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{total}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Enrolled in institution</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saVividOrange/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Male Students</p>
              <h3 className="text-2xl font-black text-saVividOrange mt-1">{maleCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saVividOrange/10 rounded-xl flex items-center justify-center text-saVividOrange">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Male student count</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Female Students</p>
              <h3 className="text-2xl font-black text-saBlue mt-1">{femaleCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Female student count</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Academic Levels</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{classes.length}</h3>
            </div>
            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <GraduationCap className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Active grade levels</p>
        </Card>
      </div>

      {/* SEARCH, SORTING & MULTI-FILTER TOOLBAR */}
      <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-3.5">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search students by name, email or phone..."
              className="pl-10 h-10 border-slate-200/80 rounded-xl bg-slate-50/50 focus:bg-white text-sm focus:ring-saBlue focus:border-saBlue"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Class Filter */}
            <div className="min-w-[140px]">
              <SearchablePaginatedSelect
                value={selectedClass}
                onValueChange={setSelectedClass}
                placeholder="All Classes"
                searchPlaceholder="Search class..."
                triggerClassName="h-10 px-3 rounded-xl border-slate-200/80 bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue"
                options={[
                  { value: "all", label: "All Classes" },
                  ...classes.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>

            {/* Board Filter */}
            <div className="min-w-[130px]">
              <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
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

            {/* Gender Filter */}
            <div className="min-w-[120px]">
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="Gender: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Gender: All</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Selection */}
            <div className="flex items-center gap-1.5 min-w-[170px]">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Alphabetical: A → Z</SelectItem>
                  <SelectItem value="name_desc">Alphabetical: Z → A</SelectItem>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-lg transition-all text-slate-600",
                  viewMode === "list" ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                )}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-lg transition-all text-slate-600",
                  viewMode === "grid" ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                )}
                title="Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Filter className="h-3 w-3 text-saBlue" /> Active Filters:
              </span>
              {debouncedSearchTerm && (
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                  Search: "{debouncedSearchTerm}"
                </Badge>
              )}
              {selectedClass !== "all" && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Class: {classes.find((c) => c.id.toString() === selectedClass)?.name || selectedClass}
                </Badge>
              )}
              {selectedBoard !== "all" && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Board: {boards.find((b) => b.id.toString() === selectedBoard)?.name || selectedBoard}
                </Badge>
              )}
              {selectedGender !== "all" && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Gender: {selectedGender === "M" ? "Male" : selectedGender === "F" ? "Female" : "Other"}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 font-semibold"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </Card>

      {/* CONTENT DISPLAY */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium text-sm">Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <Card className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <CardContent>
            <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Students Found</h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filter criteria"
                : "Add your first student to get started"}
            </p>
            {isAdmin && (
              <Button onClick={() => navigate("/dashboard/students/new")} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold">
                <Plus className="mr-2 h-4 w-4" /> New Student
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* LIST TABLE VIEW */
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="font-bold text-slate-700 text-xs pl-6 min-w-[220px]">Student</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs min-w-[150px] hidden md:table-cell">Class & Board</TableHead>
                  {!isTeacher && <TableHead className="font-bold text-slate-700 text-xs min-w-[130px] hidden lg:table-cell">Phone</TableHead>}
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[110px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-slate-100">
                          <AvatarImage src={student.user.profile_url} alt={student.user.name} />
                          <AvatarFallback className="bg-saVividOrange text-white text-xs font-bold">{getInitials(student.user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm leading-tight">{student.user.name}</span>
                            <span className="text-[10px] font-mono font-bold text-saBlue bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                              {formatStudentId(student.id)}
                            </span>
                          </div>
                          {!isTeacher && <span className="text-xs text-slate-400">{student.user.email}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit text-[10px] font-bold border-saBlue/20 text-saBlue bg-saBlue/10 rounded-full px-2.5">
                          {student.class?.name || "No Class"}
                        </Badge>
                        <span className="text-xs text-slate-400 ml-1">{student.board?.name}</span>
                      </div>
                    </TableCell>
                    {!isTeacher && (
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-xs text-slate-700 font-mono flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          {student.user.phone || "-"}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-lg" onClick={() => navigate(`/dashboard/students/${student.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-saVividOrange hover:bg-saVividOrange/10 rounded-lg" onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setDeleteStudent(student)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full">
          {students.map((student) => (
            <Card
              key={student.id}
              className="group hover:shadow-xl transition-all duration-300 overflow-hidden bg-white border border-slate-200/80 hover:border-saBlue/50 cursor-pointer rounded-2xl flex flex-col justify-between"
              onClick={() => navigate(`/dashboard/students/${student.id}`)}
            >
              {/* Header Gradient */}
              <div className="h-20 bg-gradient-to-br from-saBlue via-saBlueLight to-blue-400 relative px-4 pt-3 pb-2 flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-0 text-[10px] font-bold">
                    {student.class?.name || "Student"}
                  </Badge>
                  <span className="text-[10px] font-mono font-bold text-white/90 bg-black/20 px-1.5 py-0.5 rounded">
                    {formatStudentId(student.id)}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20 rounded-lg" onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-red-200 hover:bg-white/20 rounded-lg" onClick={() => setDeleteStudent(student)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <CardContent className="p-4 pt-0 relative space-y-3 flex-1 flex flex-col justify-between">
                <div className="flex items-start gap-3.5 -mt-9 mb-2">
                  <Avatar className="h-16 w-16 ring-4 ring-white shadow-md shrink-0">
                    <AvatarImage src={student.user.profile_url} alt={student.user.name} />
                    <AvatarFallback className="bg-saVividOrange text-white font-bold text-lg">
                      {getInitials(student.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="pt-9 min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900 leading-snug truncate">{student.user.name}</h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{student.user.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Class:</span>
                    <span className="font-semibold text-slate-700">{student.class?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Board:</span>
                    <span className="font-semibold text-slate-700">{student.board?.name || "N/A"}</span>
                  </div>
                  {!isTeacher && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-700">{student.user.phone || "N/A"}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Gender:</span>
                    <span className="font-semibold text-slate-700">
                      {student.gender === "M" ? "Male" : student.gender === "F" ? "Female" : student.gender || "N/A"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {students.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3 sm:gap-0">
          <p className="text-xs text-slate-500 font-medium">
            Showing {Math.min(currentPage * limit, total)} of {total} Students
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-xl text-xs border-slate-200/80 hover:border-saBlue hover:text-saBlue"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-bold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-xl text-xs border-slate-200/80 hover:border-saBlue hover:text-saBlue"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
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
