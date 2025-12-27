import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, BookOpen, Search } from "lucide-react";
import { boardService } from "@/services/api";
import type { Board } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import DeleteConfirmationModal from "@/components/ui/deleteConfirmationModal";

interface FetchParams {
  page: number;
  limit: number;
  search?: string;
}

const BoardsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const params: FetchParams = {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
      };
      const response = await boardService.getAll(params);
      setBoards(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching boards:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleDeleteClick = (board: Board) => {
    setSelectedBoard(board);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBoard) return;
    try {
      await boardService.delete(selectedBoard.id);
      setBoards(boards.filter((b) => b.id !== selectedBoard.id));
      setDeleteModalOpen(false);
      setSelectedBoard(null);
    } catch (error) {
      console.error("Error deleting board:", error);
      alert("Failed to delete board. It may be in use.");
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading && boards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Boards</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage educational boards</p>
        </div>
        {isAdmin && (
          <Link to="/dashboard/boards/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2">
              <Plus className="h-4 w-4" />
              Create Board
            </Button>
          </Link>
        )}
      </div>

      {/* Boards Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl text-gray-600">
            <BookOpen className="h-5 w-5" />
            Boards ({boards.length})
          </CardTitle>
        </CardHeader>

        {/* Search */}
        <CardContent className="pb-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search boards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>

        {/* Boards List */}
        <CardContent>
          {boards.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No boards found</h3>
              <p className="text-gray-600">
                {isAdmin ? 'Get started by creating your first board.' : 'No boards available.'}
              </p>
              {isAdmin && (
                <Link to="/dashboard/boards/new" className="mt-4 inline-block w-full sm:w-auto">
                  <Button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2">
                    <Plus className="h-4 w-4" />
                    Create Board
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  className="border rounded-lg bg-gray-50 p-4 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{board.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Created on: {formatDate(board.created_at)}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(board)}
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
            <div className="flex justify-center mt-6 flex-wrap gap-2">
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
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title={
          selectedBoard ? `Delete Board "${selectedBoard.name}"?` : "Delete Board"
        }
        message={
          selectedBoard && (
            <div className="text-left text-gray-700 text-sm">
              Are you sure you want to delete the board <strong>{selectedBoard.name}</strong>?
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

export default BoardsPage;
