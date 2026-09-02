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
import { teacherService, teacherRoleService } from "@/services/api";
import type { Teacher, Currency, TeacherRole } from "@/types";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Search,
  Briefcase,
  GraduationCap,
  Shield,
  Users,
  ArrowUpDown,
  LayoutGrid,
  List,
  Filter,
  X,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { formatEmployeeId } from "@/utils/idUtils";

export default function TeachersPage() {
  usePageTitle("Teachers & Faculty");
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  // Data State
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rolesList, setRolesList] = useState<TeacherRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  // Filters & Sorting State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("name_asc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  /** Fetch Teacher Roles for Filter */
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await teacherRoleService.getAll();
        setRolesList(res.data?.roles || []);
      } catch (err) {
        console.error("Failed to fetch teacher roles:", err);
      }
    };
    fetchRoles();
  }, []);

  /** Fetch Teachers */
  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page: currentPage, limit };

      if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
      if (selectedGender && selectedGender !== "all") params.gender = selectedGender;
      if (selectedRoleId && selectedRoleId !== "all") params.role_id = Number(selectedRoleId);

      // Sorting
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

      const response = await teacherService.getAll(params);
      setTeachers(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, selectedGender, selectedRoleId, sortOption]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedGender, selectedRoleId, sortOption]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleDelete = async () => {
    if (!deleteTeacher) return;
    try {
      await teacherService.delete(deleteTeacher.id);
      setDeleteTeacher(null);
      fetchTeachers();
    } catch (error) {
      console.error("Failed to delete teacher:", error);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatSalary = (salary: number | null, currency?: Currency | null) => {
    if (!salary) return "-";
    if (currency && currency.symbol) {
      return `${currency.symbol} ${salary.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.code}`;
    }
    return `₹ ${salary.toLocaleString("en-IN")}`;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedGender("all");
    setSelectedRoleId("all");
    setSortOption("name_asc");
  };

  const hasActiveFilters =
    debouncedSearchTerm ||
    selectedGender !== "all" ||
    selectedRoleId !== "all" ||
    sortOption !== "name_asc";

  // Stats calculation
  const maleCount = teachers.filter((t) => t.gender === "M").length;
  const femaleCount = teachers.filter((t) => t.gender === "F").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teachers & Faculty</h1>
            <Badge className="bg-saBlue/10 text-saBlue hover:bg-saBlue/15 font-semibold px-2.5 py-0.5 rounded-full text-xs border border-saBlue/20">
              {total} Total Staff
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage academic faculty, qualifications, experience, and permissions.
          </p>
        </div>
        <Button
          className="bg-saBlue hover:bg-saBlueDarkHover text-white shadow-md shadow-saBlue/20 rounded-xl px-4 py-2 font-semibold transition-all"
          onClick={() => navigate("/dashboard/teachers/new")}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* BRAND UNIFIED STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Faculty</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{total}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Active teaching staff</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saVividOrange/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Male Teachers</p>
              <h3 className="text-2xl font-black text-saVividOrange mt-1">{maleCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saVividOrange/10 rounded-xl flex items-center justify-center text-saVividOrange">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Male faculty members</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Female Teachers</p>
              <h3 className="text-2xl font-black text-saBlue mt-1">{femaleCount}</h3>
            </div>
            <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Female faculty members</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Roles Configured</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{rolesList.length || 1}</h3>
            </div>
            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <Shield className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Permission roles</p>
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
              placeholder="Search teachers by name or email..."
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
            {/* Gender Filter */}
            <div className="min-w-[130px]">
              <Select value={selectedGender} onValueChange={setSelectedGender}>
                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="M">Male</SelectItem>
                  <SelectItem value="F">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Filter */}
            {rolesList.length > 0 && (
              <div className="min-w-[130px]">
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {rolesList.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              {selectedGender !== "all" && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Gender: {selectedGender === "M" ? "Male" : selectedGender === "F" ? "Female" : "Other"}
                </Badge>
              )}
              {selectedRoleId !== "all" && (
                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                  Role: {rolesList.find((r) => r.id.toString() === selectedRoleId)?.name || selectedRoleId}
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
          <p className="text-slate-600 font-medium text-sm">Loading teachers...</p>
        </div>
      ) : teachers.length === 0 ? (
        <Card className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
          <CardContent>
            <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Teachers Found</h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4">
              {hasActiveFilters
                ? "Try adjusting your search or filter options"
                : "Add your first teacher to get started"}
            </p>
            <Button onClick={() => navigate("/dashboard/teachers/new")} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold">
              <Plus className="mr-2 h-4 w-4" /> Add Teacher
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* LIST TABLE VIEW */
        <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-b border-slate-100">
                  <TableHead className="font-bold text-slate-700 text-xs pl-6 min-w-[220px]">Teacher</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs hidden md:table-cell">Qualification</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs hidden md:table-cell">Experience</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs hidden lg:table-cell">Gender</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs hidden lg:table-cell">Role</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs hidden xl:table-cell">Salary</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-right pr-6 min-w-[110px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-slate-100">
                          <AvatarImage
                            src={teacher.user.profile_url}
                            alt={teacher.user.name}
                          />
                          <AvatarFallback className="bg-saVividOrange text-white text-xs font-bold">
                            {getInitials(teacher.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm leading-tight">{teacher.user.name}</span>
                            <span className="text-[10px] font-mono font-bold text-saBlue bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                              {formatEmployeeId(teacher.id)}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">{teacher.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                        <GraduationCap className="w-3.5 h-3.5 text-saVividOrange" />
                        <span>{teacher.qualification || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                        <Briefcase className="w-3.5 h-3.5 text-saBlue" />
                        <span>{teacher.experience || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs font-medium text-slate-600">
                        {teacher.gender === "M" ? "Male" : teacher.gender === "F" ? "Female" : teacher.gender || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-saVividOrange" />
                        <span className="text-xs font-medium text-slate-700">
                          {(teacher as any).role?.name || "Teacher"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-xs font-semibold text-slate-700">{formatSalary(teacher.salary, teacher.salary_currency)}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-lg" onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-saVividOrange hover:bg-saVividOrange/10 rounded-lg" onClick={() => navigate(`/dashboard/teachers/${teacher.id}/edit`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => setDeleteTeacher(teacher)}>
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
          {teachers.map((teacher) => (
            <Card
              key={teacher.id}
              className="group hover:shadow-xl transition-all duration-300 overflow-hidden bg-white border border-slate-200/80 hover:border-saBlue/50 cursor-pointer rounded-2xl flex flex-col justify-between"
              onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}
            >
              {/* Header Gradient */}
              <div className="h-20 bg-gradient-to-br from-saBlue via-saBlueLight to-blue-400 relative p-4 flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-0 text-[10px] font-bold">
                    {(teacher as any).role?.name || "Faculty"}
                  </Badge>
                  <span className="text-[10px] font-mono font-bold text-white/90 bg-black/20 px-1.5 py-0.5 rounded">
                    {formatEmployeeId(teacher.id)}
                  </span>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20 rounded-lg" onClick={() => navigate(`/dashboard/teachers/${teacher.id}/edit`)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-red-200 hover:bg-white/20 rounded-lg" onClick={() => setDeleteTeacher(teacher)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-5 pt-0 relative space-y-4 flex-1 flex flex-col justify-between">
                <div className="flex items-end gap-3 -mt-8 mb-2">
                  <Avatar className="h-16 w-16 ring-4 ring-white shadow-md">
                    <AvatarImage src={teacher.user.profile_url} alt={teacher.user.name} />
                    <AvatarFallback className="bg-saVividOrange text-white font-bold text-lg">
                      {getInitials(teacher.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mb-1">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{teacher.user.name}</h3>
                    <p className="text-xs text-slate-400">{teacher.user.email}</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Qualification:</span>
                    <span className="font-semibold text-slate-700">{teacher.qualification || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Experience:</span>
                    <span className="font-semibold text-slate-700">{teacher.experience || "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Gender:</span>
                    <span className="font-semibold text-slate-700">
                      {teacher.gender === "M" ? "Male" : teacher.gender === "F" ? "Female" : teacher.gender || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Salary:</span>
                    <span className="font-bold text-saBlue">{formatSalary(teacher.salary, teacher.salary_currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {teachers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3 sm:gap-0">
          <p className="text-xs text-slate-500 font-medium">
            Showing {Math.min(currentPage * limit, total)} of {total} Teachers
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
        open={!!deleteTeacher}
        title="Delete Teacher"
        message={
          <span>
            Are you sure you want to delete <strong>{deleteTeacher?.user.name}</strong>?
          </span>
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTeacher(null)}
      />
    </div>
  );
}
