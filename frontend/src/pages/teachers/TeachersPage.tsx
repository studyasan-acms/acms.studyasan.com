import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { teacherService } from "@/services/api";
import type { Teacher, Currency } from "@/types";
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
  Shield
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TeachersPage() {
  usePageTitle("Teachers");
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGender, setSelectedGender] = useState<string>("");

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page: currentPage, limit };
      if (searchTerm) params.search = searchTerm;
      if (selectedGender && selectedGender !== "all")
        params.gender = selectedGender;

      const response = await teacherService.getAll(params);
      setTeachers(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, selectedGender]);

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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = () => setCurrentPage(1);

  const getGenderSpan = (gender: string | null | undefined) => {
    if (!gender) return null;
    const text = gender === "M" ? "Male" : gender === "F" ? "Female" : "Other";
    return <span className="text-gray-600 font-medium text-xs">{text}</span>;
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(salary);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Teachers</h1>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
            Faculty & Staff
          </p>
        </div>
        <Button
          className="bg-saBlue hover:bg-saBlue/90 text-white h-10 px-5 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm rounded-xl"
          onClick={() => navigate("/dashboard/teachers/new")}
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Add Teacher
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
        {/* Search */}
        <div className="relative flex-1 w-full md:w-auto min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-saBlue/10 transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Dropdowns Container */}
        <div className="flex flex-wrap flex-1 gap-2 w-full md:w-auto justify-end">
          <Select
            value={selectedGender || "all"}
            onValueChange={(value) => {
              setSelectedGender(value === "all" ? "" : value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 focus:outline-none focus:ring-2 focus:ring-saBlue/10 cursor-pointer min-w-[120px]">
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
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold text-xs tracking-widest uppercase">Loading Teachers...</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-600">No teachers found</h3>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-500 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-gray-100">
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 min-w-[200px]">Teacher</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider hidden md:table-cell">Qualification</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider hidden md:table-cell">Experience</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider hidden lg:table-cell">Gender</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider hidden lg:table-cell">Role</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider hidden xl:table-cell">Salary</TableHead>
                  <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id} className="hover:bg-blue-50/30 border-b-gray-50 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 ring-2 ring-gray-50">
                          <AvatarImage
                            src={teacher.user.profile_url}
                            alt={teacher.user.name}
                          />
                          <AvatarFallback className="bg-saVividOrange text-white text-xs">
                            {getInitials(teacher.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-sm leading-tight">{teacher.user.name}</span>
                          <span className="text-[10px] text-gray-400">{teacher.user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <GraduationCap className="w-3.5 h-3.5 text-saVividOrange/70" />
                        <span>{teacher.qualification || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                        <Briefcase className="w-3.5 h-3.5 text-saBlue/50" />
                        <span>{teacher.experience || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getGenderSpan(teacher.gender)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-saVividOrange/70" />
                        <span className="text-xs font-medium text-gray-600">
                          {(teacher as any).role?.name || "Teacher"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <span className="text-xs font-mono text-gray-600">{formatSalary(teacher.salary, teacher.salary_currency)}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-saBlue" onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-saVividOrange" onClick={() => navigate(`/dashboard/teachers/${teacher.id}/edit`)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50" onClick={() => setDeleteTeacher(teacher)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
      {teachers.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {Math.min(currentPage * limit, total)} of {total} Teachers
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
