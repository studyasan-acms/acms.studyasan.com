import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, Users, FileText, Calendar, Trash2, Award, Search, Filter, MoreHorizontal, Eye, Edit, Copy, ExternalLink, CheckCheck } from "lucide-react";
import { testService, subjectService } from "@/services/api";
import type { Test, Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { toast } from "sonner";

interface FetchParams {
  user_id?: number;
  role?: string;
  subject_id?: number;
}

export default function TestsPage() {
  usePageTitle("Tests");
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";
  const isStudent = user?.role === "STUDENT";

  const fetchSubjects = useCallback(async () => {
    try {
      const params: any = {};
      if (user?.id && user?.role) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data.data);
    } catch (error) {
      console.error("❌ [TESTS_PAGE] Error fetching subjects:", error);
    }
  }, [user]);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const params: FetchParams = {};
      if (selectedSubject && selectedSubject !== "ALL") params.subject_id = parseInt(selectedSubject);
      if ((isStudent || user?.role === "TEACHER") && user?.id) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await testService.getAll(params);
      setTests(response.data);
    } catch (error) {
      console.error("Error fetching tests:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedSubject, user, isStudent]);

  useEffect(() => {
    fetchSubjects();
    fetchTests();
  }, [fetchSubjects, fetchTests]);

  const handleDeleteClick = (test: Test) => {
    setSelectedTest(test);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTest) return;
    try {
      await testService.delete(selectedTest.id);
      setTests(tests.filter((t) => t.id !== selectedTest.id));
      setDeleteModalOpen(false);
      setSelectedTest(null);
    } catch (error) {
      console.error("Error deleting test:", error);
      toast.error("Failed to delete test.");
    }
  };

  const handleCopyLink = (test: Test) => {
    const link = `${window.location.origin}/certification/${test.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Public test link copied to clipboard");
  };

  const isCertificationTest = (test: Test) => {
    return test.is_certification ||
      test.title.includes('[CERTIFICATION]') ||
      test.description?.includes('[CERTIFICATION]');
  };

  const getTestStatus = (test: Test) => {
    const now = new Date();
    const availableFrom = new Date(test.available_from);
    const availableUntil = new Date(test.available_until);

    if (!test.is_published) return { label: "Draft", color: "bg-gray-500 hover:bg-gray-600" };
    if (now < availableFrom) return { label: "Upcoming", color: "bg-blue-500 hover:bg-blue-600" };
    if (now > availableUntil) return { label: "Closed", color: "bg-red-500 hover:bg-red-600" };
    return { label: "Active", color: "bg-green-500 hover:bg-green-600" };
  };

  const filteredTests = tests.filter(test =>
    test.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Tests</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and view all your tests and assessments</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {isTeacherOrAdmin && (
            <Button
              className="bg-saBlue hover:bg-saBlueDarkHover text-white flex items-center justify-center shadow-md transition-all hover:scale-105"
              onClick={() => navigate("/tests/create")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
          )}
          {isStudent && (
            <Button
              variant="outline"
              className="border-saBlue text-saBlue hover:bg-blue-50 flex items-center justify-center"
              onClick={() => navigate("/tests/my-results")}
            >
              <Award className="w-4 h-4 mr-2" />
              My Results
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full"
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="h-10 w-full">
              <Filter className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tests Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading tests...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No tests found</h3>
          <p className="text-gray-500 mt-1 max-w-sm text-center">
            {searchQuery || selectedSubject !== "ALL"
              ? "Try adjusting your search or filters to find what you're looking for."
              : "There are no tests available at the moment."}
          </p>
          {isTeacherOrAdmin && (
            <Button
              variant="link"
              className="text-saBlue mt-2"
              onClick={() => navigate("/tests/create")}
            >
              Create a new test
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="w-[300px] font-semibold text-gray-700">Test Title</TableHead>
                  <TableHead className="font-semibold text-gray-700">Subject</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700">Questions</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700">Duration</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700">Marks</TableHead>
                  <TableHead className="font-semibold text-gray-700 hidden lg:table-cell">Availability</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map((test) => {
                  const status = getTestStatus(test);
                  return (
                    <TableRow
                      key={test.id}
                      className="cursor-pointer hover:bg-blue-50/30 transition-colors"
                      onClick={() => navigate(`/tests/${test.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col py-1">
                          <span className="text-base font-semibold text-gray-900">{test.title}</span>
                          <span className="text-xs text-gray-500 line-clamp-1 lg:hidden mt-0.5">
                            {new Date(test.available_from).toLocaleDateString()} - {new Date(test.available_until).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal bg-gray-100 text-gray-700 hover:bg-gray-200">
                          {test.subject?.name || test.test_series?.title || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} border-none text-white whitespace-nowrap shadow-sm`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-gray-600 text-sm">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>{test._count?.questions || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-gray-600 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{test.duration_minutes}m</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-gray-600 text-sm">
                          <Award className="w-4 h-4 text-gray-400" />
                          <span>{test.total_marks}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-gray-500 text-sm">
                        <div className="flex flex-col text-xs space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="w-8 text-gray-400">From:</span>
                            <span className="font-medium text-gray-700">{new Date(test.available_from).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-8 text-gray-400">Until:</span>
                            <span className="font-medium text-gray-700">{new Date(test.available_until).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-gray-500 hover:text-saBlue hover:bg-blue-50" onClick={(e) => e.stopPropagation()}>
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tests/${test.id}`); }}>
                              <Eye className="mr-2 h-4 w-4 text-saBlue" /> View Details
                            </DropdownMenuItem>
                            {isCertificationTest(test) && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(test); }}>
                                <Copy className="mr-2 h-4 w-4 text-purple-600" /> Copy Public Link
                              </DropdownMenuItem>
                            )}
                            {isTeacherOrAdmin && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tests/${test.id}/edit`); }}>
                                  <Edit className="mr-2 h-4 w-4 text-gray-600" /> Edit Test
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(test); }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Test
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title="Delete Test"
        message={
          selectedTest ? (
            <span className="text-sm text-gray-600">
              Are you sure you want to delete <span className="font-bold text-gray-900">{selectedTest.title}</span>? This action cannot be undone.
            </span>
          ) : undefined
        }
        footer={
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </Button>
          </div>
        }
      />
    </div>
  );
}
