import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Trash2, Users, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentsPage from "../PaymentsPage";

const EnrollmentsPage: React.FC = () => {
  usePageTitle("Enrollments");
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("SUBJECT");

  // Subject Enrollments State
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Test Series State
  const [testSeriesList, setTestSeriesList] = useState<any[]>([]);

  // Activity Group State
  const [activityGroupList, setActivityGroupList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters for Subject Enrollments
  const [studentFilter, setStudentFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<Enrollment | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  const [allEnrollments, setAllEnrollments] = useState<any[]>([]);




  // Unified fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enrollmentService.getAll({
        page: currentPage,
        limit,
        type: activeTab, // backend expects SUBJECT, TEST_SERIES, ACTIVITY_GROUP
        search: searchTerm
      });

      // Map to a display format if needed, or use directly
      const mappedData = res.data.data.map(e => ({
        id: e.id,
        type: e.type,
        student_name: e.student.user.name,
        student_email: e.student.user.email,
        student: e.student,
        // Determine item name based on type
        item_name: e.subject?.name || e.test_series?.title || e.activity_group?.name || 'Unknown Item',
        enrolled_at: e.created_on,
        original: e
      }));

      setAllEnrollments(mappedData);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, currentPage, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteClick = (item: any) => {
    setSelectedEnrollment(item.original);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEnrollment) return;
    try {
      const enrollmentId = selectedEnrollment.id;
      await enrollmentService.delete(enrollmentId);

      setDeleteModalOpen(false);
      setSelectedEnrollment(null);
      fetchData();
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

  if (loading && allEnrollments.length === 0) {
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
      <Tabs defaultValue="enrollments" className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="enrollments" className="rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Enrollments</TabsTrigger>
            <TabsTrigger
              value="payments"
              className="rounded-md px-4 py-2 text-sm font-medium transition-all bg-orange-50 text-orange-700 hover:bg-orange-100 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-sm"
            >
              Payments
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="enrollments" className="space-y-6 mt-0">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
                Enrollments
              </h1>
              <p className="text-gray-400 mt-1 text-sm sm:text-base">
                Manage student enrollments across Subjects, Test Series, and Activity Groups
              </p>
            </div>
            {isAdmin && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link to={`/dashboard/enrollments/new?type=${activeTab === 'SUBJECT' ? 'subject' : activeTab === 'TEST_SERIES' ? 'test-series' : 'activity-groups'}`} className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-saBlue hover:bg-saBlueDarkHover text-white">
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



          <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2">Type:</span>
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === 'SUBJECT' ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs rounded-xl ${activeTab === 'SUBJECT' ? 'bg-saBlue text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => { setActiveTab('SUBJECT'); setCurrentPage(1); }}
                >
                  Subjects
                </Button>
                <Button
                  variant={activeTab === 'TEST_SERIES' ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs rounded-xl ${activeTab === 'TEST_SERIES' ? 'bg-saBlue text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => { setActiveTab('TEST_SERIES'); setCurrentPage(1); }}
                >
                  Test Series
                </Button>
                <Button
                  variant={activeTab === 'ACTIVITY_GROUP' ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs rounded-xl ${activeTab === 'ACTIVITY_GROUP' ? 'bg-saBlue text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => { setActiveTab('ACTIVITY_GROUP'); setCurrentPage(1); }}
                >
                  Activity Groups
                </Button>
              </div>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search enrollments..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-saBlue/10 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>



          {/* Enrollment Cards */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm animate-in fade-in duration-500 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b-gray-100">
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 min-w-[200px]">Student</TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[150px]">Enrolled Item</TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[100px]">Type</TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[120px]">Enrolled On</TableHead>
                    <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-gray-400 text-xs uppercase tracking-widest">
                        Loading Enrollments...
                      </TableCell>
                    </TableRow>
                  ) : allEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-gray-400 text-xs uppercase tracking-widest">
                        No enrollments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allEnrollments.map((item) => (
                      <TableRow key={`${item.type}-${item.id}`} className="hover:bg-blue-50/30 border-b-gray-50 transition-colors">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800 text-sm leading-tight">{item.student_name}</span>
                              <span className="text-[10px] text-gray-400">{item.student_email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-700 text-sm">{item.item_name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`w-fit text-[10px] border-none ${item.type === 'SUBJECT' ? 'bg-blue-50 text-blue-600' :
                            item.type === 'TEST_SERIES' ? 'bg-orange-50 text-orange-600' :
                              'bg-teal-50 text-teal-600'
                            }`}>
                            {item.type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-600 font-mono">{formatDate(item.enrolled_at)}</span>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex gap-1 justify-end">
                            {/* View Details could go to a specific detail page, for now just placeholder or delete */}
                            {isAdmin && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => handleDeleteClick(item)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Styled */}
          {allEnrollments.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {Math.min(currentPage * limit, total)} of {total} Enrollments
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

                  {/* Column 2: Item Info */}
                  <div className="space-y-1">
                    <p className="font-medium text-gray-600">{selectedEnrollment.type === 'SUBJECT' ? 'Subject' : selectedEnrollment.type === 'TEST_SERIES' ? 'Test Series' : 'Activity Group'}</p>
                    <p className="font-semibold text-gray-600">
                      {selectedEnrollment.subject?.name || selectedEnrollment.test_series?.title || selectedEnrollment.activity_group?.name || 'N/A'}
                    </p>

                    {selectedEnrollment.type === 'SUBJECT' && selectedEnrollment.subject && (
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
                    )}

                    <p className="font-medium text-gray-600 mt-2">Enrolled On</p>
                    <p className="font-semibold text-gray-600 text-[10px] sm:text-sm">
                      {new Date(selectedEnrollment.created_on || new Date().toISOString()).toLocaleDateString("en-US", {
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
        </TabsContent>

        <TabsContent value="payments" className="mt-0">
          <PaymentsPage />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default EnrollmentsPage;
