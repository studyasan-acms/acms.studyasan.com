import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, Users, FileText, Calendar, Trash2 } from "lucide-react";
import { testService, subjectService } from "@/services/api";
import type { Test, Subject } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";

interface FetchParams {
  user_id?: number;
  role?: string;
  subject_id?: number;
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
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
        console.log('🔍 [TESTS_PAGE] Fetching subjects with params:', params);
      }
      const response = await subjectService.getAll(params);
      console.log('✅ [TESTS_PAGE] Subjects loaded:', response.data.data);
      setSubjects(response.data.data);
    } catch (error) {
      console.error("❌ [TESTS_PAGE] Error fetching subjects:", error);
    }
  }, [user]);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const params: FetchParams = {};
      if (selectedSubject) params.subject_id = selectedSubject;
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
      alert("Failed to delete test");
    }
  };

  const getTestStatus = (test: Test) => {
    const now = new Date();
    const availableFrom = new Date(test.available_from);
    const availableUntil = new Date(test.available_until);

    if (!test.is_published) return { label: "Draft", color: "bg-gray-500" };
    if (now < availableFrom) return { label: "Upcoming", color: "bg-blue-400" };
    if (now > availableUntil) return { label: "Closed", color: "bg-red-500" };
    return { label: "Active", color: "bg-green-500" };
  };

  return (
    <div className="p-2 sm:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
            Tests
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage and view all tests
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Button
            className="bg-saBlue hover:bg-saBlueDarkHover text-white w-full sm:w-auto flex items-center justify-center"
            onClick={() => navigate("/tests/create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium mb-2 text-gray-600">
                Filter by Subject
              </label>
              <select
                value={selectedSubject || ""}
                onChange={(e) =>
                  setSelectedSubject(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full p-2 border rounded-md text-sm sm:text-base"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Loading tests...</div>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No tests found</p>
            {isTeacherOrAdmin && (
              <Button
                className="bg-saBlue hover:bg-saBlueDarkHover text-white mt-2 w-full sm:w-auto"
                onClick={() => navigate("/tests/create")}
              >
                Create Your First Test
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {tests.map((test) => {
            const status = getTestStatus(test);
            return (
              <Card
                key={test.id}
                className="cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col"
                onClick={() => navigate(`/tests/${test.id}`)}
              >
                {/* Curved Header */}
                <div className="relative bg-saBlueLight/60 text-gray-900 p-4 sm:p-5">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-md sm:text-lg font-semibold">
                      {test.title}
                    </CardTitle>
                    <Badge
                      className={`text-white text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full ${
                        status.color === "bg-gray-500"
                          ? "bg-gray-600"
                          : status.color === "bg-blue-400"
                          ? "bg-saBlueLight"
                          : status.color === "bg-red-500"
                          ? "bg-red-600"
                          : "bg-green-600"
                      }`}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm mt-1 opacity-80">
                    {test.subject?.name}
                  </p>
                </div>

                {/* Body */}
                <CardContent className="bg-gray-100 rounded-b-2xl pt-8 sm:pt-10 p-4 sm:p-5 space-y-3 sm:space-y-4 text-gray-700 flex-1 flex flex-col justify-between">
                  <p className="text-sm sm:text-base line-clamp-3">
                    {test.description || "No description"}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-4 text-gray-700 text-xs sm:text-sm">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-saBlue" />
                      {test._count?.questions || 0} Questions
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-saBlue" />
                      {test.duration_minutes} Minutes
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-saBlue" />
                      {test._count?.test_attempts || 0} Attempts
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-saBlue" />
                      <span className="text-xs sm:text-sm">
                        {new Date(test.available_from).toLocaleDateString()} -{" "}
                        {new Date(test.available_until).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Marks/Pass Info moved above footer */}
                  {isTeacherOrAdmin && (
                    <div className="mt-4 text-sm sm:text-base text-gray-700">
                      Marks:{" "}
                      <span className="font-medium">{test.total_marks}</span>{" "}
                      (Pass: {test.passing_marks})
                    </div>
                  )}

                  {/* Footer Buttons */}
                  {isTeacherOrAdmin && (
                    <div className="pt-3 border-t border-gray-200 flex justify-end items-center text-xs sm:text-sm gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tests/${test.id}`);
                        }}
                      >
                        View
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-300 text-gray-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tests/${test.id}/edit`);
                        }}
                      >
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        className="bg-saVividOrange text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(test);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title={
          selectedTest ? `Delete Test "${selectedTest.title}"?` : "Delete Test"
        }
        message={
          selectedTest && (
            <div className="text-left text-gray-700 text-sm">
              Are you sure you want to delete the test{" "}
              <strong>{selectedTest.title}</strong>{" "}
              {selectedTest.subject && (
                <>
                  for <strong>{selectedTest.subject.name}</strong>
                </>
              )}
              ?
            </div>
          )
        }
        footer={
          <div className="flex justify-end gap-3 mt-4">
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
    </div>
  );
}
