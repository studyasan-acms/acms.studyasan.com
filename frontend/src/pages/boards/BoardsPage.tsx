import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit, Search, Book, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { boardService } from '@/services/api';
import type { Board } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePermissions } from '@/hooks/usePermissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import ConfirmModal from '@/components/ui/deleteConfirmationModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FetchParams {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

const BoardsPage: React.FC = () => {
  usePageTitle("Boards");
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const { canCreate, canUpdate, canDelete: canDeletePerm } = usePermissions();
  const canAddBoard = isAdmin || canCreate('boards');
  const canEditBoard = isAdmin || canUpdate('boards');
  const canDeleteBoard = isAdmin || canDeletePerm('boards');
  const canManageBoard = canEditBoard || canDeleteBoard;

  // Data State
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc',
  });

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Selection & Editing State
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const params: FetchParams = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        sort: sortConfig.key,
        order: sortConfig.direction,
      };
      const response = await boardService.getAll(params);
      setBoards(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortConfig]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCreate = () => {
    setSelectedBoard(null);
    setFormData({ name: '' });
    setShowFormModal(true);
  };

  const handleEdit = (board: Board) => {
    setSelectedBoard(board);
    setFormData({ name: board.name });
    setShowFormModal(true);
  };

  const handleDeleteClick = (board: Board) => {
    setSelectedBoard(board);
    setShowDeleteModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      if (selectedBoard) {
        await boardService.update(selectedBoard.id, { name: formData.name });
        setSuccessMessage('Board updated successfully');
      } else {
        await boardService.create({ name: formData.name });
        setSuccessMessage('Board created successfully');
      }
      setShowFormModal(false);
      setShowSuccessModal(true);
      fetchBoards();
    } catch (error) {
      console.error('Error saving board:', error);
      setErrorMessage('Failed to save board. Please try again.');
      setShowErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBoard) return;
    try {
      await boardService.delete(selectedBoard.id);
      setSuccessMessage('Board deleted successfully');
      setShowDeleteModal(false);
      setShowSuccessModal(true);

      // If deleting the last item on a page, accept it might be empty until refresh or handle page change
      if (boards.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchBoards();
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      setErrorMessage('Failed to delete board. It may be in use.');
      setShowErrorModal(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" />
      : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Boards</h1>
          <p className="text-gray-500 mt-1">Manage educational boards and syllabi</p>
        </div>
        {canAddBoard && (
          <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all hover:shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        )}
      </div>

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Book className="h-5 w-5 text-blue-500" />
              All Boards
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search boards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-gray-500 text-sm">Loading boards...</p>
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3 text-center p-4">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Book className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900">No boards found</p>
              <p className="text-gray-500 max-w-sm">
                {searchTerm ? 'Try a different search term.' : 'Get started by creating a new board.'}
              </p>
              {!searchTerm && canAddBoard && (
                <Button variant="outline" onClick={handleCreate} className="mt-2">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Board
                </Button>
              )}
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead
                      className="w-[100px] font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center">
                        ID
                        {renderSortIcon('id')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Board Name
                        {renderSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('created_at')}
                    >
                      <div className="flex items-center">
                        Created At
                        {renderSortIcon('created_at')}
                      </div>
                    </TableHead>
                    {canManageBoard && <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boards.map((item) => (
                    <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-gray-900">#{item.id}</TableCell>
                      <TableCell className="font-medium text-gray-800">{item.name}</TableCell>
                      <TableCell className="text-gray-500">{formatDate(item.created_at)}</TableCell>
                      {canManageBoard && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEditBoard && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            )}
                            {canDeleteBoard && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(item)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {totalPages > 1 && (
          <div className="border-t border-gray-100 p-4 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedBoard ? 'Edit Board' : 'Create Board'}</DialogTitle>
            <DialogDescription>
              {selectedBoard ? 'Update the details of the board.' : 'Add a new educational board.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name <span className="text-red-500">*</span></Label>
              <Input
                id="board-name"
                placeholder="e.g. CBSE"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                required
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowFormModal(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Board'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Board?"
        message={`Are you sure you want to delete "${selectedBoard?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Success / Error Modals */}
      <SuccessModal
        open={showSuccessModal}
        title="Success"
        description={successMessage}
        onConfirm={() => setShowSuccessModal(false)}
        onClose={() => setShowSuccessModal(false)}
      />
      <ErrorModal
        open={showErrorModal}
        title="Error"
        description={errorMessage}
        onConfirm={() => setShowErrorModal(false)}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  );
};

export default BoardsPage;
