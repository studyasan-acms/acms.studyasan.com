import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Edit2,
  PenTool,
  Maximize2,
  Minimize2,
  Loader2,
  RefreshCw,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Whiteboard } from '@/components/classroom/Whiteboard';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { whiteboardService } from '@/services/api';
import type { SavedWhiteboard } from '@/types';
import type { WhiteboardMessage } from '@/types/videoRoom';
import { format } from 'date-fns';

export default function WhiteboardPage() {
  usePageTitle('Saved Whiteboards');
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id?: string }>();
  const user = useAuthStore((state) => state.user);

  const isAllowed = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  // State
  const [whiteboards, setWhiteboards] = useState<SavedWhiteboard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeBoard, setActiveBoard] = useState<SavedWhiteboard | null>(null);
  const [loadingActiveBoard, setLoadingActiveBoard] = useState<boolean>(false);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalError, setModalError] = useState<string>('');
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [boardToEdit, setBoardToEdit] = useState<SavedWhiteboard | null>(null);

  // Delete modal
  const [boardToDelete, setBoardToDelete] = useState<SavedWhiteboard | null>(null);

  // Drawing View State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<boolean>(false);
  const whiteboardContainerRef = useRef<HTMLDivElement>(null);

  // Fetch whiteboards list
  const fetchWhiteboards = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 20,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await whiteboardService.getAll(params);
      if (res && res.data) {
        setWhiteboards(res.data.whiteboards || []);
        setTotalPages(res.data.pagination.pages || 1);
        setTotalCount(res.data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch whiteboards:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  // Load active whiteboard by ID if route param exists
  const loadBoardById = useCallback(async (id: number) => {
    setLoadingActiveBoard(true);
    try {
      const res = await whiteboardService.getById(id);
      if (res && res.data) {
        setActiveBoard(res.data);
        setLastSavedTime(format(new Date(res.data.updated_at), 'h:mm a'));
      }
    } catch (err) {
      console.error('Failed to load whiteboard:', err);
      navigate('/dashboard/whiteboard');
    } finally {
      setLoadingActiveBoard(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (isAllowed && !routeId) {
      fetchWhiteboards();
    }
  }, [isAllowed, fetchWhiteboards, routeId]);

  useEffect(() => {
    if (routeId) {
      const parsed = parseInt(routeId);
      if (!isNaN(parsed)) {
        loadBoardById(parsed);
      }
    } else {
      setActiveBoard(null);
    }
  }, [routeId, loadBoardById]);

  // Handle Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        if (whiteboardContainerRef.current?.requestFullscreen) {
          await whiteboardContainerRef.current.requestFullscreen();
        }
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, []);

  // Save whiteboard callback from drawing view
  const handleSaveWhiteboard = async (strokes: any[], thumbnail?: string) => {
    if (!activeBoard) return;
    setIsSaving(true);
    try {
      await whiteboardService.update(activeBoard.id, {
        strokes,
        thumbnail: thumbnail || null,
      });
      // IMPORTANT: Do NOT call setActiveBoard(res.data) here.
      // Replacing activeBoard changes the `initialStrokes` prop passed to <Whiteboard>,
      // which triggers useWhiteboard's useEffect([initialStrokes]) to clear and reload
      // all strokes from the server — wiping erases, deleted objects, new text, images,
      // and tables that the user has drawn since the last save.
      // We only need to update the save timestamp UI.
      const nowStr = format(new Date(), 'h:mm a');
      setLastSavedTime(nowStr);
      setSaveSuccessMsg(true);
      setTimeout(() => setSaveSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Failed to save whiteboard:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalTitle('');
    setModalError('');
    setShowCreateModal(true);
  };

  // Submit Create Whiteboard
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      setModalError('Please enter a title for the whiteboard');
      return;
    }

    setModalLoading(true);
    setModalError('');
    try {
      const res = await whiteboardService.create({
        title: modalTitle.trim(),
        strokes: [],
      });

      if (res && res.data) {
        setShowCreateModal(false);
        navigate(`/dashboard/whiteboard/${res.data.id}`);
      }
    } catch (err: any) {
      console.error('Failed to create whiteboard:', err);
      setModalError(err.response?.data?.message || 'Failed to create whiteboard');
    } finally {
      setModalLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (board: SavedWhiteboard, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBoardToEdit(board);
    setModalTitle(board.title);
    setModalError('');
    setShowEditModal(true);
  };

  // Submit Edit Whiteboard
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardToEdit) return;
    if (!modalTitle.trim()) {
      setModalError('Please enter a title');
      return;
    }

    setModalLoading(true);
    setModalError('');
    try {
      const res = await whiteboardService.update(boardToEdit.id, {
        title: modalTitle.trim(),
      });

      if (res && res.data) {
        setShowEditModal(false);
        if (activeBoard && activeBoard.id === boardToEdit.id) {
          // Only update the title metadata, not the strokes, to avoid
          // triggering the initialStrokes reload that wipes local canvas state.
          setActiveBoard(prev => prev ? { ...prev, title: res.data.title, updated_at: res.data.updated_at } : res.data);
        }
        fetchWhiteboards();
      }
    } catch (err: any) {
      console.error('Failed to update whiteboard:', err);
      setModalError(err.response?.data?.message || 'Failed to update whiteboard');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Whiteboard
  const handleDeleteConfirm = async () => {
    if (!boardToDelete) return;
    try {
      await whiteboardService.delete(boardToDelete.id);
      setBoardToDelete(null);
      fetchWhiteboards();
    } catch (err) {
      console.error('Failed to delete whiteboard:', err);
    }
  };

  const handleSendMessage = useCallback((_message: WhiteboardMessage) => {}, []);

  if (!isAllowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Access Denied</h1>
          <p className="text-slate-500 text-sm">This whiteboard feature is only available for Admin and Teacher accounts.</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="mt-2">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: DRAWING MODE (Active Board Opened)
  // ==========================================
  if (activeBoard || loadingActiveBoard) {
    if (loadingActiveBoard) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-saBlue mx-auto" />
            <p className="text-slate-500 text-sm font-medium">Loading whiteboard...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Drawing View Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/whiteboard')}
              className="gap-1.5 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Table</span>
            </Button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-800">{activeBoard?.title}</h1>
                <button
                  onClick={(e) => activeBoard && openEditModal(activeBoard, e)}
                  className="text-slate-400 hover:text-saBlue transition-colors p-1"
                  title="Rename Whiteboard"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <span>Created by {activeBoard?.user?.name || 'You'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Last saved status indicator */}
            <div className="text-xs text-slate-500 flex items-center gap-1.5 mr-2 hidden sm:flex">
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-saBlue" />
                  <span>Saving changes...</span>
                </>
              ) : saveSuccessMsg ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-medium">Saved</span>
                </>
              ) : lastSavedTime ? (
                <span>Last saved at {lastSavedTime}</span>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="gap-1.5 rounded-xl border-slate-200"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4 text-slate-600" />}
              <span className="hidden md:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </Button>
          </div>
        </div>

        {/* Interactive Whiteboard Canvas Container */}
        <div
          ref={whiteboardContainerRef}
          className="relative h-[calc(100vh-230px)] min-h-[580px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm data-[fullscreen=true]:h-screen data-[fullscreen=true]:min-h-screen data-[fullscreen=true]:rounded-none"
          data-fullscreen={isFullscreen}
        >
          <Whiteboard
            isActive={true}
            onClose={() => navigate('/dashboard/whiteboard')}
            sendMessage={handleSendMessage}
            canEdit={true}
            initialStrokes={Array.isArray(activeBoard?.strokes) ? activeBoard?.strokes : []}
            onSave={handleSaveWhiteboard}
            isSaving={isSaving}
          />
        </div>

        {/* Edit Modal in Drawing View */}
        {showEditModal && renderEditModal()}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SAVED WHITEBOARDS TABLE
  // ==========================================
  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Saved Whiteboards</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Create, view and manage your whiteboard drawings
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl shadow-xs h-10 px-5 font-bold text-xs uppercase tracking-wider gap-2 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Whiteboard
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search whiteboard by title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-11 rounded-xl border-slate-200 focus-visible:ring-saBlue"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="rounded-xl text-slate-500 hover:text-slate-800 h-10 px-3"
            >
              Reset
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={fetchWhiteboards}
            disabled={loading}
            className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-saBlue mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading whiteboards...</p>
          </div>
        ) : whiteboards.length === 0 ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-saBlue flex items-center justify-center mx-auto shadow-inner">
              <PenTool className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Whiteboards Found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {searchQuery
                  ? 'Try searching with a different keyword.'
                  : 'Start by creating your first whiteboard to draw, teach, and persist your notes.'}
              </p>
            </div>
            <Button
              onClick={openCreateModal}
              className="bg-saBlue hover:bg-saBlue/90 text-white rounded-xl shadow-md shadow-saBlue/20 px-5"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Whiteboard
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[12px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Whiteboard Title</th>
                  <th className="py-4 px-6">Created By</th>
                  <th className="py-4 px-6">Last Updated</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {whiteboards.map((board) => {
                  const strokesCount = Array.isArray(board.strokes) ? board.strokes.length : 0;
                  return (
                    <tr
                      key={board.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/dashboard/whiteboard/${board.id}`)}
                    >
                      {/* Title & Preview */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-saBlue/10 to-sky-100 text-saBlue flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-sky-100">
                            <PenTool className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-saBlue transition-colors">
                              {board.title}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {strokesCount > 0 ? `${strokesCount} drawing element${strokesCount > 1 ? 's' : ''}` : 'Empty canvas'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Author */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {board.user?.name ? board.user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{board.user?.name || 'Unknown'}</p>
                            <span className="text-[10px] uppercase font-bold text-slate-400">{board.user?.role}</span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6">
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{format(new Date(board.updated_at), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/dashboard/whiteboard/${board.id}`)}
                            className="bg-saBlue/10 hover:bg-saBlue text-saBlue hover:text-white rounded-lg h-8 px-3 text-xs font-semibold shadow-none transition-all"
                            title="Open & Draw"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Open
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => openEditModal(board, e)}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Rename Whiteboard"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBoardToDelete(board);
                            }}
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete Whiteboard"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-slate-50/50">
            <span>
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg h-8 px-3"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE WHITEBOARD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-saBlue/10 text-saBlue rounded-2xl">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create New Whiteboard</h2>
                <p className="text-xs text-slate-500">Give your board a title to start drawing</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Whiteboard Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="e.g., Physics - Ray Optics & Lenses"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 focus-visible:ring-saBlue"
                  autoFocus
                />
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl h-11 text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading}
                  className="rounded-xl h-11 bg-saBlue hover:bg-saBlue/90 text-white font-semibold px-5 shadow-md shadow-saBlue/20"
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                  Create & Open Board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WHITEBOARD MODAL */}
      {showEditModal && renderEditModal()}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        open={Boolean(boardToDelete)}
        onClose={() => setBoardToDelete(null)}
        onCancel={() => setBoardToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Whiteboard"
        message={`Are you sure you want to delete "${boardToDelete?.title}"? All strokes and drawings in this whiteboard will be permanently removed.`}
      />
    </div>
  );

  // Reusable Edit Modal Render function
  function renderEditModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rename Whiteboard</h2>
              <p className="text-xs text-slate-500">Update the title of this whiteboard</p>
            </div>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Whiteboard Title <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                className="h-11 rounded-xl border-slate-200 focus-visible:ring-saBlue"
              />
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                {modalError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEditModal(false)}
                className="rounded-xl h-11 text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={modalLoading}
                className="rounded-xl h-11 bg-saBlue hover:bg-saBlue/90 text-white font-semibold px-5 shadow-md shadow-saBlue/20"
              >
                {modalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}