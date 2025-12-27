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
import { teacherService } from "@/services/api";
import type { Teacher, Currency } from "@/types";
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";

export default function TeachersPage() {
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

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedGender("");
    setCurrentPage(1);
  };

  const getGenderSpan = (gender: string | null | undefined) => {
    if (!gender) return null;
    const text = gender === "M" ? "Male" : gender === "F" ? "Female" : "Other";
    return <span className="text-gray-700 font-medium">{text}</span>;
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
            Teachers
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage teacher accounts and information
          </p>
        </div>
        <Button
          onClick={() => navigate("/dashboard/teachers/new")}
          className="w-full md:w-auto mt-2 md:mt-0 md:ml-4 flex justify-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* Teachers Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-gray-600">
            All Teachers ({total})
          </CardTitle>
          <CardDescription className="text-gray-400">
            A list of all teachers in the system
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
                value={selectedGender || "all"}
                onValueChange={(value) => {
                  setSelectedGender(value === "all" ? "" : value);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
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
            <div className="md:col-span-1 flex justify-end">
              <Button
                size="default"
                variant="outline"
                onClick={clearFilters}
                disabled={!searchTerm && !selectedGender}
                className="w-full md:w-auto"
              >
                Clear
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <UserCheck className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No teachers found</p>
              <p className="text-sm">
                Try adjusting your filters or add a new teacher
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="rounded-md overflow-hidden border-none lg:border">
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-saBlue/40 hover:bg-saBlue/40">
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Name
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Qualification
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Experience
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Gender
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Salary
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md">
                          Subjects
                        </TableHead>
                        <TableHead className="text-gray-900 font-semibold text-md text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.map((teacher, index) => (
                        <TableRow
                          key={teacher.id}
                          className={
                            index % 2 === 0
                              ? "bg-saBlueLight/20"
                              : "bg-saBlueLight/10"
                          }
                        >
                          <TableCell className="font-medium">
                            {teacher.user.name}
                          </TableCell>
                          <TableCell>{teacher.qualification || "-"}</TableCell>
                          <TableCell>{teacher.experience || "-"}</TableCell>
                          <TableCell>{getGenderSpan(teacher.gender)}</TableCell>
                          <TableCell>{formatSalary(teacher.salary, teacher.salary_currency ?? null)}</TableCell>
                          <TableCell>
                            {teacher._count?.teacher_subject_junctions || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-saBlue hover:text-saBlueDarkHover cursor-pointer"
                                onClick={() =>
                                  navigate(`/dashboard/teachers/${teacher.id}`)
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-saVividOrange hover:text-[#d18a00] cursor-pointer"
                                onClick={() =>
                                  navigate(
                                    `/dashboard/teachers/${teacher.id}/edit`
                                  )
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-800 cursor-pointer"
                                onClick={() => setDeleteTeacher(teacher)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile & Tablet Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4 px-0">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="rounded-xl overflow-hidden shadow-sm transition hover:shadow-md duration-200"
                    >
                      <div className="bg-saBlueLight/60 p-4 flex justify-between items-center">
                        <div className="font-semibold text-lg text-gray-900 truncate">
                          {teacher.user.name}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-saBlue hover:text-saBlueDarkHover cursor-pointer"
                            onClick={() =>
                              navigate(`/dashboard/teachers/${teacher.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-saVividOrange hover:text-[#d18a00] cursor-pointer"
                            onClick={() =>
                              navigate(`/dashboard/teachers/${teacher.id}/edit`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-800 cursor-pointer"
                            onClick={() => setDeleteTeacher(teacher)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-100">
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              Qualification
                            </span>
                            <span>{teacher.qualification || "-"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              Experience
                            </span>
                            <span>{teacher.experience || "-"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              Gender
                            </span>
                            <span>{getGenderSpan(teacher.gender)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">
                              Salary
                            </span>
                            <span>{formatSalary(teacher.salary, teacher.salary_currency ?? null)}</span>
                          </div>
                          <div className="flex flex-col col-span-2">
                            <span className="font-medium text-gray-800">
                              Subjects
                            </span>
                            <span>
                              {teacher._count?.teacher_subject_junctions || 0}
                            </span>
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
                  {Math.min(currentPage * limit, total)} of {total} teachers
                </p>
                <div className="flex items-center space-x-2 justify-center w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
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
        open={!!deleteTeacher}
        title="Delete Teacher"
        message={
          <span>
            Are you sure you want to delete{" "}
            <strong>{deleteTeacher?.user.name}</strong>?
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
