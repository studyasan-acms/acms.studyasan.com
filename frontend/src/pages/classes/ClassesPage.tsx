import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, GraduationCap, Search } from 'lucide-react';
import { classService } from '@/services/api';
import type { Class } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';

interface FetchParams {
  page: number;
  limit: number;
  search?: string;
}

const ClassesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const params: FetchParams = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
      };
      const response = await classService.getAll(params);
      setClasses(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleDeleteClick = (classItem: Class) => {
    setSelectedClass(classItem);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedClass) return;
    try {
      await classService.delete(selectedClass.id);
      setClasses(classes.filter((c) => c.id !== selectedClass.id));
      setDeleteModalOpen(false);
      setSelectedClass(null);
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Failed to delete class. It may be in use.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && classes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Classes</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage class levels</p>
        </div>
        {isAdmin && (
          <Link to="/dashboard/classes/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2">
              <Plus className="h-4 w-4" />
              Create Class
            </Button>
          </Link>
        )}
      </div>

      {/* Classes Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-gray-600">
            <GraduationCap className="h-5 w-5" />
            Classes ({classes.length})
          </CardTitle>
        </CardHeader>

        {/* Search inside Classes Card */}
        <CardContent className="pb-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>

        {/* Classes List */}
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
              <p className="text-gray-600">
                {isAdmin ? 'Get started by creating your first class.' : 'No classes available.'}
              </p>
              {isAdmin && (
                <Link to="/dashboard/classes/new" className="mt-4 inline-block">
                  <Button className="flex items-center gap-2 px-4 py-2">
                    <Plus className="h-4 w-4" />
                    Create Class
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classItem) => (
                <div
                  key={classItem.id}
                  className="border bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Created on: {formatDate(classItem.created_at)}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(classItem)}
                      className="mt-4 text-red-600 hover:text-red-700 w-full border-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 py-2 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title={selectedClass ? `Delete Class "${selectedClass.name}"?` : "Delete Class"}
        message={
          selectedClass && (
            <div className="text-left text-gray-700 text-sm">
              Are you sure you want to delete the class <strong>{selectedClass.name}</strong>?
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
};

export default ClassesPage;
