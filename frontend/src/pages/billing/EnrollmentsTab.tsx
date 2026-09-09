import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BookOpen,
  Activity,
  ClipboardList,
  ArrowUpDown,
  ReceiptText,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
        No Invoice
      </span>
    );
  }
  const { status } = e.invoice;
  const now = new Date();
  const isOverdue = status === 'PENDING' && new Date(e.invoice.due_date) < now;
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} />
        Paid
      </span>
    );
  }
  if (status === 'PARTIALLY_PAID') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
        <Clock size={10} />
        Partially Paid
      </span>
    );
  }
  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
        <AlertTriangle size={10} />
        Overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30">
      <Clock size={10} />
      Pending
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onInvoiceGenerated: () => void;
}

const EnrollmentsTab: React.FC<Props> = ({ onInvoiceGenerated }) => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP'>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'PAID' | 'PENDING' | 'OVERDUE' | 'NO_INVOICE'>('all');
  const [sortOption, setSortOption] = useState<string>('created_desc');

  // Sorting State for API
  const [sortBy, setSortBy] = useState('created_on');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingEnrollment, setDeletingEnrollment] = useState<Enrollment | null>(null);

  // Generate invoice inline state
  const [generatingFor, setGeneratingFor] = useState<Enrollment | null>(null);
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
      const params: any = {
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        sortBy,
        sortOrder,
      };
      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const res = await enrollmentService.getAll(params);
      const payload = (res as any)?.data;
      let items: Enrollment[] = payload?.data || [];

      // Filter by invoice status on client if chosen
      if (invoiceFilter !== 'all') {
        items = items.filter((e) => {
          if (invoiceFilter === 'NO_INVOICE') return !e.invoice;
          if (!e.invoice) return false;
          const now = new Date();
          const isOverdue = e.invoice.status === 'PENDING' && new Date(e.invoice.due_date) < now;
          if (invoiceFilter === 'OVERDUE') return isOverdue;
          if (invoiceFilter === 'PAID') return e.invoice.status === 'PAID';
          if (invoiceFilter === 'PENDING') return e.invoice.status === 'PENDING' && !isOverdue;
          return true;
        });
      }

      setEnrollments(items);
      setTotalPages(payload?.pagination?.totalPages || 1);
      setTotalRecords(payload?.pagination?.total || 0);
    } catch {
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortOrder, typeFilter, invoiceFilter]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, invoiceFilter]);

  const handleSortOptionChange = (value: string) => {
    setSortOption(value);
    switch (value) {
      case 'created_desc':
        setSortBy('created_on');
        setSortOrder('desc');
        break;
      case 'created_asc':
        setSortBy('created_on');
        setSortOrder('asc');
        break;
      case 'student_asc':
        setSortBy('student');
        setSortOrder('asc');
        break;
      case 'student_desc':
        setSortBy('student');
        setSortOrder('desc');
        break;
      case 'price_desc':
        setSortBy('price');
        setSortOrder('desc');
        break;
      case 'price_asc':
        setSortBy('price');
        setSortOrder('asc');
        break;
      default:
        setSortBy('created_on');
        setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder);
      setSortOption(`${col}_${newOrder}`);
    } else {
      setSortBy(col);
      setSortOrder('desc');
      setSortOption(`${col}_desc`);
    }
    setCurrentPage(1);
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

  const hasActiveFilters = searchTerm !== '' || typeFilter !== 'all' || invoiceFilter !== 'all' || sortOption !== 'created_desc';

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setInvoiceFilter('all');
    handleSortOptionChange('created_desc');
  };

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown
      size={12}
      className={`inline ml-1 ${sortBy === col ? 'text-saBlue' : 'text-slate-300'}`}
    />
  );

  const getSortOptionLabel = () => {
    switch (sortOption) {
      case 'created_desc': return 'Recently Enrolled';
      case 'created_asc': return 'Oldest Enrolled';
      case 'student_asc': return 'Student (A → Z)';
      case 'student_desc': return 'Student (Z → A)';
      case 'price_desc': return 'Price (High → Low)';
      case 'price_asc': return 'Price (Low → High)';
      default: return 'Default';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & Sort Toolbar */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3">
        <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, subject, activity..."
              className="pl-9 h-9 text-xs rounded-lg border-slate-200 bg-slate-50/60 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <Select value={sortOption} onValueChange={handleSortOptionChange}>
              <SelectTrigger className="h-9 w-44 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Recently Enrolled</SelectItem>
                <SelectItem value="created_asc">Oldest Enrolled</SelectItem>
                <SelectItem value="student_asc">Student (A → Z)</SelectItem>
                <SelectItem value="student_desc">Student (Z → A)</SelectItem>
                <SelectItem value="price_desc">Price (High → Low)</SelectItem>
                <SelectItem value="price_asc">Price (Low → High)</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
              <SelectTrigger className="h-9 w-36 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SUBJECT">Subjects</SelectItem>
                <SelectItem value="TEST_SERIES">Test Series</SelectItem>
                <SelectItem value="ACTIVITY_GROUP">Activities</SelectItem>
              </SelectContent>
            </Select>

            {/* Invoice Status Filter */}
            <Select value={invoiceFilter} onValueChange={(val: any) => setInvoiceFilter(val)}>
              <SelectTrigger className="h-9 w-36 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                <SelectValue placeholder="All Invoices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="NO_INVOICE">No Invoice</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchEnrollments}
              className="h-9 px-2.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-saBlue' : ''} />
            </Button>

            <Button
              size="sm"
              onClick={() => { setEditingEnrollment(null); setCreateModalOpen(true); }}
              className="h-9 bg-saBlue hover:bg-saBlueDarkHover text-white gap-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs px-4"
            >
              <Plus size={14} />
              Add Enrollment
            </Button>
          </div>
        </div>
      </Card>

      {/* Section Counter Header */}
      <div className="flex items-center justify-between text-xs px-1 text-slate-500">
        <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
          Showing {enrollments.length} of {totalRecords} Enrollments
        </span>
        <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">
          Sorted by: {getSortOptionLabel()}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <TableHead className="cursor-pointer select-none py-3 px-4" onClick={() => handleSort('student')}>
                Student <SortIcon col="student" />
              </TableHead>
              <TableHead className="py-3 px-4">Type</TableHead>
              <TableHead className="py-3 px-4">Item</TableHead>
              <TableHead className="cursor-pointer select-none py-3 px-4" onClick={() => handleSort('price')}>
                Price <SortIcon col="price" />
              </TableHead>
              <TableHead className="py-3 px-4">Frequency</TableHead>
              <TableHead className="py-3 px-4">Invoice</TableHead>
              <TableHead className="cursor-pointer select-none py-3 px-4" onClick={() => handleSort('created_on')}>
                Enrolled On <SortIcon col="created_on" />
              </TableHead>
              <TableHead className="text-right py-3 px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j} className="py-3 px-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : enrollments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen size={32} className="text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">No enrollments found</p>
                    <p className="text-xs text-slate-500">Create an enrollment or adjust your search filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((en) => (
                <React.Fragment key={en.id}>
                  <TableRow className="hover:bg-slate-50/70 transition-colors">
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {en.student.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{en.student.user.name}</div>
                          <div className="text-[11px] text-slate-400">{en.student.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-saBlue/10 text-saBlue border border-saBlue/20">
                        {TYPE_ICONS[en.type]}
                        {en.type === 'SUBJECT' ? 'Subject' : en.type === 'TEST_SERIES' ? 'Test Series' : 'Activity'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="font-bold text-slate-800">{getItemName(en)}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {en.price ? (
                        <div>
                          <span className="font-black text-slate-900">
                            ₹{en.price.toLocaleString('en-IN')}
                          </span>
                          {en.subject?.actual_price && en.subject.actual_price > en.price && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-slate-400 line-through">
                                ₹{en.subject.actual_price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                -₹{(en.subject.actual_price - en.price).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="text-slate-600 font-medium">
                        {en.frequency ? FREQ_LABELS[en.frequency] || en.frequency : <span className="text-slate-400">—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="space-y-1">
                        {getInvoiceStatusBadge(en)}
                        {en.invoice && (
                          <div className="text-[10px] font-mono text-slate-400">{en.invoice.invoice_number}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="text-slate-500 font-medium">
                        {new Date(en.created_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {!en.invoice && (
                          <button
                            onClick={() => setGeneratingFor(generatingFor?.id === en.id ? null : en)}
                            title="Generate Invoice"
                            className="p-1.5 rounded-lg hover:bg-saOrangeSubtle text-slate-400 hover:text-saVividOrange transition-colors"
                          >
                            <ReceiptText size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingEnrollment(en); setCreateModalOpen(true); }}
                          title="Edit"
                          className="p-1.5 rounded-lg hover:bg-saBlue/10 text-slate-400 hover:text-saBlue transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => { setDeletingEnrollment(en); setDeleteModalOpen(true); }}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
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
                        <div className="bg-slate-50 border-t border-b border-slate-200 px-6 py-4">
                          <p className="text-xs font-bold text-slate-900 mb-3">Generate Invoice for {en.student.user.name}</p>
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <label className="text-[11px] font-bold text-slate-500 block mb-1">Due Date</label>
                              <input
                                type="date"
                                value={genDueDate}
                                onChange={(e) => setGenDueDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-saBlue"
                              />
                            </div>
                            <div className="flex-1 min-w-40">
                              <label className="text-[11px] font-bold text-slate-500 block mb-1">Notes (optional)</label>
                              <input
                                value={genNotes}
                                onChange={(e) => setGenNotes(e.target.value)}
                                placeholder="Add invoice note..."
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-saBlue"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleGenerateInvoice(en)}
                                disabled={generatingInvoice === en.id}
                                className="bg-saBlue hover:bg-saBlueDarkHover text-white text-xs font-bold rounded-lg h-8"
                              >
                                {generatingInvoice === en.id ? 'Generating...' : 'Generate Invoice'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setGeneratingFor(null)}
                                className="text-xs font-bold rounded-lg h-8 border-slate-200"
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

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            Showing Page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({totalRecords} total enrollments)
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold border-slate-200 disabled:opacity-40"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                        currentPage === p
                          ? 'bg-saBlue text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-bold border-slate-200 disabled:opacity-40"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl text-xs font-bold animate-fade-in">
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
