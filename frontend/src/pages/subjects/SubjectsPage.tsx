import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  subjectService,
} from "@/services/api";
import type { Subject } from "@/types";
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Users,
  GraduationCap,
  PlayCircle,
  Star,
  BookMarked,
  Target,
  Award,
  Search,
} from "lucide-react";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function SubjectsPage({ embedded = false }: { embedded?: boolean }) {
  usePageTitle("Subjects");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  /** Fetch subjects */
  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);

    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit,
      };

      if (debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim();
      }

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
  }, [currentPage, user, debouncedSearchTerm]);

  // Debounce search input to avoid too many API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

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

  return (
    <div className={cn(
      !embedded && "min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 pb-10"
    )}>
      {/* Simple, Fun Header - Only show if not embedded */}
      {!embedded && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 sm:px-6 py-6 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-saBlue to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">My Subjects</h1>
                  <p className="text-sm text-gray-500">Let's learn something awesome today!</p>
                </div>
              </div>
              {isAdmin && (
                <Button
                  className="bg-gradient-to-r from-saBlue to-cyan-500 hover:from-saBlue/90 hover:to-cyan-600 text-white shadow-lg"
                  onClick={() => navigate("/dashboard/subjects/new")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Subject
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={cn(
        "space-y-6 w-full max-w-full",
        !embedded && "max-w-7xl mx-auto px-4 sm:px-6 py-8"
      )}>
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search subjects by name..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Embedded Title/Actions */}
        {embedded && (
          <div className="flex items-center justify-between mb-6">
            <div className="hidden sm:block">
              {/* Empty placeholder or small title if needed */}
            </div>
            {isAdmin && (
              <Button
                size="sm"
                className="bg-saBlue hover:bg-saBlue/90 text-white"
                onClick={() => navigate("/dashboard/subjects/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Subject
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-gray-600 font-medium">Loading your subjects...</p>
          </div>
        ) : subjects.length === 0 ? (
          <Card className="py-12 text-center bg-white/60 backdrop-blur-sm border-2 border-dashed border-gray-300">
            <CardContent>
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-700 mb-2">No subjects found</h3>
              <p className="text-gray-500 text-xs">Try adjusting your filtering criteria</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full">
              {subjects.map((subject, index) => {
                const isCourseEnded = subject.is_course && subject.end_date && new Date(subject.end_date) < new Date();
                const colors = [
                  { bg: "from-blue-500 to-cyan-500", badge: "bg-blue-100 text-blue-700 border-blue-200" },
                  { bg: "from-cyan-500 to-teal-500", badge: "bg-cyan-100 text-cyan-700 border-cyan-200" },
                  { bg: "from-orange-500 to-amber-500", badge: "bg-orange-100 text-orange-700 border-orange-200" },
                  { bg: "from-green-500 to-emerald-500", badge: "bg-green-100 text-green-700 border-green-200" },
                  { bg: "from-saBlue to-blue-600", badge: "bg-blue-100 text-blue-700 border-blue-200" },
                ];
                const colorScheme = colors[index % colors.length];

                return (
                  <Card
                    key={subject.id}
                    className="group hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white border-2 border-gray-100 hover:border-gray-200 cursor-pointer"
                    onClick={() => navigate(`/dashboard/subjects/${subject.id}`)}
                  >
                    {/* Card Header with Gradient */}
                    <div className={`h-24 bg-gradient-to-br ${colorScheme.bg} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        {subject.is_course && (
                          <Badge className="bg-white/90 text-gray-800 border-0 shadow-sm text-[9px] px-2 py-0.5">
                            <Star className="h-2.5 w-2.5 mr-1" />
                            Course
                          </Badge>
                        )}
                        {isCourseEnded && (
                          <Badge className="bg-red-500 text-white border-0 shadow-sm text-[9px] px-2 py-0.5">
                            Ended
                          </Badge>
                        )}
                      </div>
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-lg font-bold text-white drop-shadow-md line-clamp-1">
                          {subject.name}
                        </h3>
                      </div>
                      {/* Decorative circles */}
                      <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full"></div>
                      <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-white/10 rounded-full"></div>
                    </div>

                    <CardContent className="p-5 space-y-4">
                      {/* Class and Board Info */}
                      {/* Class and Board Info */}
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`${colorScheme.badge} text-[10px] px-2 py-0.5`}>
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {subject.class?.name || "No Class"}
                        </Badge>
                        {subject.board && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] px-2 py-0.5">
                            {subject.board.name}
                          </Badge>
                        )}
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center justify-between text-sm">
                        {user?.role !== "STUDENT" ? (
                          <>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Users className="h-4 w-4" />
                              <span className="font-medium">
                                {subject._count?.enrollments || 0} students
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Target className="h-3.5 w-3.5" />
                              <span className="font-bold text-xs">
                                {subject._count?.teacher_subject_junctions || 0} teachers
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Award className="h-4 w-4" />
                            <span className="font-medium">Start Learning</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="pt-3 border-t border-gray-100 space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 group/btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/subjects/${subject.id}/modules`);
                          }}
                        >
                          <BookMarked className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                          View Modules
                        </Button>

                        <Button
                          className={`w-full h-9 bg-gradient-to-r ${colorScheme.bg} text-white hover:opacity-90 text-xs uppercase font-bold tracking-wider`}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/subjects/${subject.id}/student-modules`);
                          }}
                        >
                          <PlayCircle className="h-3.5 w-3.5 mr-2" />
                          Start Learning
                        </Button>

                        {/* Admin Actions */}
                        {isAdmin && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/subjects/${subject.id}/edit`);
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteSubject(subject);
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4 sm:gap-0">
              <p className="text-sm text-gray-600 font-medium">
                Showing {Math.min(currentPage * limit, total)} of {total} subjects
              </p>
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border-2 border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-lg"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
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
    </div>
  );
}
