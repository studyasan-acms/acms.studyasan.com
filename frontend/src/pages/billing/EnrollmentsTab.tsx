import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Activity,
  ClipboardList,
  ArrowUpDown,
  ReceiptText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { enrollmentService } from '@/services/api';
import type { Enrollment } from '@/types';
import CreateEnrollmentModal from './CreateEnrollmentModal';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FREQ_LABELS: Record<string, string> = {
  one_time: 'One Time',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  semi_yearly: 'Semi-Yearly',
  yearly: 'Yearly',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  SUBJECT: <BookOpen size={12} />,
  TEST_SERIES: <ClipboardList size={12} />,
  ACTIVITY_GROUP: <Activity size={12} />,
};

function getItemName(e: Enrollment): string {
  return e.subject?.name || e.test_series?.title || e.activity_group?.name || '—';
}

function getInvoiceStatusBadge(e: Enrollment) {
  if (!e.invoice) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        No Invoice
      </span>
    );
  }
  const { status } = e.invoice;
  const now = new Date();
  const isOverdue = status === 'PENDING' && new Date(e.invoice.due_date) < now;
  if (status === 'PAID')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>;
  if (isOverdue)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Overdue</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onInvoiceGenerated: () => void;
}

const EnrollmentsTab: React.FC<Props> = ({ onInvoiceGenerated }) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_on');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingEnrollment, setDeletingEnrollment] = useState<Enrollment | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<Enrollment | null>(null);

  // Generate invoice inline state
  const [generatingInvoice, setGeneratingInvoice] = useState<number | null>(null);
  const [genDueDate, setGenDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0];
  });
  const [genNotes, setGenNotes] = useState('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enrollmentService.getAll({
        page: currentPage,
        limit,
        search: searchTerm,
        sortBy,
        sortOrder,
      });
      // enrollmentService.getAll returns { success, data: { data: Enrollment[], pagination: {...} } }
      const payload = (res as any)?.data;
      setEnrollments(payload?.data || []);
      setTotalPages(payload?.pagination?.totalPages || 1);
      setTotalRecords(payload?.pagination?.total || 0);
    } catch {
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder('desc'); }
  };

  const handleDelete = async () => {
    if (!deletingEnrollment) return;
    setDeletingId(deletingEnrollment.id);
    try {
      await enrollmentService.delete(deletingEnrollment.id);
      showToast('Enrollment removed');
      fetchEnrollments();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
      setDeleteModalOpen(false);
      setDeletingEnrollment(null);
    }
  };

  const handleGenerateInvoice = async (enrollment: Enrollment) => {
    setGeneratingInvoice(enrollment.id);
    try {
      await enrollmentService.generateInvoice({
        enrollment_ids: [enrollment.id],
        due_date: genDueDate,
        notes: genNotes || undefined,
      });
      showToast('Invoice generated successfully');
      fetchEnrollments();
      onInvoiceGenerated();
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(null);
      setGeneratingFor(null);
      setGenNotes('');
    }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown
      size={12}
      className={`inline ml-1 ${sortBy === col ? 'text-[#0276D3]' : 'text-gray-300'}`}
    />
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student, subject, activity..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0276D3] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEnrollments}
            className="h-10"
          >
            <RefreshCw size={14} />
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingEnrollment(null); setCreateModalOpen(true); }}
            className="h-10 bg-[#0276D3] hover:bg-blue-700 text-white gap-2"
          >
            <Plus size={14} />
            New Enrollment
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('student')}>
                Student <SortIcon col="student" />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('price')}>
                Price <SortIcon col="price" />
              </TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort('created_on')}>
                Enrolled On <SortIcon col="created_on" />
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : enrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen size={32} className="text-gray-200" />
                    <p className="font-medium">No enrollments found</p>
                    <p className="text-sm">Create the first enrollment using the button above</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((en) => (
                <React.Fragment key={en.id}>
                  <TableRow className="hover:bg-gray-50/80 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#0276D3] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                          {en.student.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{en.student.user.name}</div>
                          <div className="text-xs text-gray-400">{en.student.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-[#0276D3]">
                        {TYPE_ICONS[en.type]}
                        {en.type === 'SUBJECT' ? 'Subject' : en.type === 'TEST_SERIES' ? 'Test Series' : 'Activity'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-800 text-sm">{getItemName(en)}</span>
                    </TableCell>
                    <TableCell>
                      {en.price ? (
                        <div>
                          <span className="font-bold text-gray-900 text-sm">
                            ₹{en.price.toLocaleString('en-IN')}
                          </span>
                          {en.subject?.actual_price && en.subject.actual_price > en.price && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-gray-400 line-through">
                                ₹{en.subject.actual_price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                -₹{(en.subject.actual_price - en.price).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {en.frequency ? FREQ_LABELS[en.frequency] || en.frequency : <span className="text-gray-400">—</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getInvoiceStatusBadge(en)}
                        {en.invoice && (
                          <div className="text-xs text-gray-400">{en.invoice.invoice_number}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500">
                        {new Date(en.created_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!en.invoice && (
                          <button
                            onClick={() => setGeneratingFor(generatingFor?.id === en.id ? null : en)}
                            title="Generate Invoice"
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-gray-400 hover:text-[#eca209] transition-colors"
                          >
                            <ReceiptText size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingEnrollment(en); setCreateModalOpen(true); }}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#0276D3] transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => { setDeletingEnrollment(en); setDeleteModalOpen(true); }}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          disabled={deletingId === en.id}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Inline generate invoice row */}
                  {generatingFor?.id === en.id && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <div className="bg-amber-50 border-t border-b border-amber-200 px-6 py-4">
                          <p className="text-sm font-semibold text-amber-800 mb-3">Generate Invoice for {en.student.user.name}</p>
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Due Date</label>
                              <input
                                type="date"
                                value={genDueDate}
                                onChange={(e) => setGenDueDate(e.target.value)}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#eca209]"
                              />
                            </div>
                            <div className="flex-1 min-w-40">
                              <label className="text-xs text-gray-600 block mb-1">Notes (optional)</label>
                              <input
                                value={genNotes}
                                onChange={(e) => setGenNotes(e.target.value)}
                                placeholder="Add a note..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#eca209]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleGenerateInvoice(en)}
                                disabled={generatingInvoice === en.id}
                                className="bg-[#eca209] hover:bg-amber-600 text-white"
                              >
                                {generatingInvoice === en.id ? 'Generating...' : 'Generate Invoice'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setGeneratingFor(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Showing {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalRecords)} of {totalRecords}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) return null;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-[#0276D3] text-white'
                      : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      <CreateEnrollmentModal
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setEditingEnrollment(null); }}
        onSuccess={() => { fetchEnrollments(); showToast(editingEnrollment ? 'Enrollment updated' : 'Enrollment created successfully'); }}
        editingEnrollment={editingEnrollment}
      />

      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeletingEnrollment(null); }}
        onConfirm={handleDelete}
        title="Remove Enrollment"
        message={`Are you sure you want to remove this enrollment for ${deletingEnrollment?.student?.user?.name}? This will not delete the invoice if one exists.`}
      />
    </div>
  );
};

export default EnrollmentsTab;
