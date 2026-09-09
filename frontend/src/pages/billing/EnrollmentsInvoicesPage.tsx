import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Mail,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  FileText,
  RefreshCw,
  Users,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { invoiceService } from '@/services/api';
import type { Invoice, InvoiceStats } from '@/types';
import CreateEditInvoiceModal from './CreateEditInvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import EnrollmentsTab from './EnrollmentsTab';
import InvoiceSettingsTab from './InvoiceSettingsTab';

// ─── Status helpers ───────────────────────────────────────────────────────────

function getDisplayStatus(inv: Invoice): 'PAID' | 'PENDING' | 'OVERDUE' {
  const ds = (inv as any).display_status;
  if (ds) return ds;
  if (inv.status === 'PENDING' && new Date(inv.due_date) < new Date()) return 'OVERDUE';
  return inv.status as 'PAID' | 'PENDING';
}

function StatusBadge({ status }: { status: 'PAID' | 'PARTIALLY_PAID' | 'PENDING' | 'OVERDUE' | string }) {
  if (status === 'PAID')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} />
        Paid
      </span>
    );
  if (status === 'PARTIALLY_PAID')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
        <Clock size={10} />
        Partially Paid
      </span>
    );
  if (status === 'OVERDUE')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
        <AlertTriangle size={10} />
        Overdue
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30">
      <Clock size={10} />
      Pending
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EnrollmentsInvoicesPage: React.FC = () => {
  usePageTitle('Enrollments & Invoices');
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'enrollments' | 'invoices' | 'settings'>('enrollments');

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoiced: 0, totalPaid: 0, totalPending: 0, totalOverdue: 0, totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [sortOption, setSortOption] = useState<string>('created_desc');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  // Modals
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState<'INVOICE' | 'QUOTATION'>('INVOICE');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceService.getAll({
        page: currentPage, limit, search: searchTerm, status: statusFilter, sortBy, sortOrder,
      });
      setInvoices(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRecords(res.data.pagination?.total || 0);
      if (res.data.stats) setStats(res.data.stats);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

  const handleSortOptionChange = (value: string) => {
    setSortOption(value);
    switch (value) {
      case 'created_desc':
        setSortBy('created_at');
        setSortOrder('desc');
        break;
      case 'created_asc':
        setSortBy('created_at');
        setSortOrder('asc');
        break;
      case 'due_asc':
        setSortBy('due_date');
        setSortOrder('asc');
        break;
      case 'due_desc':
        setSortBy('due_date');
        setSortOrder('desc');
        break;
      case 'amount_desc':
        setSortBy('total_amount');
        setSortOrder('desc');
        break;
      case 'amount_asc':
        setSortBy('total_amount');
        setSortOrder('asc');
        break;
      case 'student_asc':
        setSortBy('student');
        setSortOrder('asc');
        break;
      default:
        setSortBy('created_at');
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

  const handleMarkStatus = async (inv: Invoice, newStatus: 'PAID' | 'PENDING') => {
    setActionLoadingId(inv.id);
    try {
      await invoiceService.markStatus(inv.id, { status: newStatus });
      showToast(`Invoice marked as ${newStatus}`);
      fetchInvoices();
    } catch {
      showToast('Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendEmail = async (inv: Invoice) => {
    setActionLoadingId(inv.id);
    try {
      await invoiceService.sendEmail(inv.id);
      showToast('Invoice emailed to student');
    } catch {
      showToast('Failed to send email');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    try {
      await invoiceService.delete(deletingInvoice.id);
      showToast('Invoice deleted');
      fetchInvoices();
    } catch {
      showToast('Failed to delete invoice');
    } finally {
      setDeleteModalOpen(false);
      setDeletingInvoice(null);
    }
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || sortOption !== 'created_desc';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    handleSortOptionChange('created_desc');
  };

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown size={12} className={`inline ml-1 ${sortBy === col ? 'text-saBlue' : 'text-slate-300'}`} />
  );

  const getSortOptionLabel = () => {
    switch (sortOption) {
      case 'created_desc': return 'Recently Issued';
      case 'created_asc': return 'Oldest Issued';
      case 'due_asc': return 'Due Date (Earliest First)';
      case 'due_desc': return 'Due Date (Latest First)';
      case 'amount_desc': return 'Amount (High → Low)';
      case 'amount_asc': return 'Amount (Low → High)';
      case 'student_asc': return 'Student (A → Z)';
      default: return 'Default';
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Enrollments & Invoices</h1>
          <p className="text-slate-500 text-xs sm:text-sm">Manage student course enrollments, subscription items, and generated billing invoices.</p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saBlue/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">₹{stats.totalInvoiced.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-8 w-8 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue shrink-0">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Total revenue invoiced</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saBlue/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">₹{stats.totalPaid.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-8 w-8 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Successfully cleared payments</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-saVividOrange/40 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Dues</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">₹{stats.totalPending.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-8 w-8 bg-saVividOrange/10 rounded-lg flex items-center justify-center text-saVividOrange shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Awaiting settlement</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue Amount</p>
              <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">₹{stats.totalOverdue.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Past scheduled due date</p>
        </Card>
      </div>

      {/* Pill-Style Tabs */}
      <div className="w-full overflow-x-auto pb-1 scrollbar-none">
        <div className="p-1 bg-slate-100/80 rounded-xl inline-flex items-center gap-1">
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`rounded-lg px-3.5 py-1.5 transition-all flex items-center gap-1.5 text-xs font-bold ${
              activeTab === 'enrollments'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Enrollments
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`rounded-lg px-3.5 py-1.5 transition-all flex items-center gap-1.5 text-xs font-bold ${
              activeTab === 'invoices'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Invoices
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`rounded-lg px-3.5 py-1.5 transition-all flex items-center gap-1.5 text-xs font-bold ${
                activeTab === 'settings'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Invoice Configuration
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'enrollments' && (
        <EnrollmentsTab onInvoiceGenerated={fetchInvoices} />
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Invoice Search, Sort & Filter Toolbar */}
          <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl p-3">
            <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student, invoice number, item..."
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
                    <SelectItem value="created_desc">Recently Issued</SelectItem>
                    <SelectItem value="created_asc">Oldest Issued</SelectItem>
                    <SelectItem value="due_asc">Due Date: Earliest First</SelectItem>
                    <SelectItem value="due_desc">Due Date: Latest First</SelectItem>
                    <SelectItem value="amount_desc">Amount (High → Low)</SelectItem>
                    <SelectItem value="amount_asc">Amount (Low → High)</SelectItem>
                    <SelectItem value="student_asc">Student (A → Z)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                  <SelectTrigger className="h-9 w-32 bg-slate-50 border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
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
                  onClick={fetchInvoices}
                  className="h-9 px-2.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50"
                  title="Refresh"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin text-saBlue' : ''} />
                </Button>

                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => { setEditingInvoice(null); setCreateEditModalOpen(true); }}
                    className="h-9 bg-saBlue hover:bg-saBlueDarkHover text-white gap-1.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs px-4"
                  >
                    <Plus size={14} />
                    New Invoice
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Section Counter Header */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
              Showing {invoices.length} of {totalRecords} Invoices
            </span>
            <span className="text-slate-400 text-[11px] font-medium hidden sm:inline">
              Sorted by: {getSortOptionLabel()}
            </span>
          </div>

          {/* Invoice Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableHead className="cursor-pointer select-none py-3 px-4" onClick={() => handleSort('invoice_number')}>
                    Invoice # <SortIcon col="invoice_number" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none py-3 px-4" onClick={() => handleSort('student')}>
                    Student <SortIcon col="student" />
                  </TableHead>
                  <TableHead className="py-3 px-4">Items</TableHead>
                  <TableHead className="cursor-pointer select-none py-3 px-4" onClick={() => handleSort('total_amount')}>
                    Amount <SortIcon col="total_amount" />
                  </TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="cursor-pointer select-none py-3 px-4" onClick={() => handleSort('due_date')}>
                    Due Date <SortIcon col="due_date" />
                  </TableHead>
                  <TableHead className="text-right py-3 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-3 px-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={32} className="text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">No invoices found</p>
                        <p className="text-xs text-slate-500">Create invoices from the Enrollments tab or use the button above.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const displayStatus = getDisplayStatus(inv);
                    return (
                      <TableRow key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-saBlue">
                            {inv.invoice_number}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {inv.student?.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{inv.student?.user?.name}</div>
                              <div className="text-[11px] text-slate-400">{inv.student?.user?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="space-y-0.5 max-w-48">
                            {inv.items?.length ? (
                              inv.items.map((item, idx) => (
                                <div key={idx} className="font-medium text-slate-800 truncate">
                                  {item.item_name}
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 font-normal">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div>
                            <div className="font-black text-slate-900">
                              ₹{(inv.total_amount || 0).toLocaleString('en-IN')}
                            </div>
                            {inv.discount_amount > 0 && (
                              <div className="text-[10px] text-slate-400">
                                -₹{inv.discount_amount.toLocaleString('en-IN')} disc.
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <StatusBadge status={displayStatus} />
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div>
                            <div className={`font-semibold ${displayStatus === 'OVERDUE' ? 'text-rose-600' : 'text-slate-700'}`}>
                              {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            {inv.paid_date && (
                              <div className="text-[10px] text-emerald-600 font-medium">
                                Paid {new Date(inv.paid_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setDetailModalMode('QUOTATION');
                                setViewingInvoice(inv);
                                setDetailModalOpen(true);
                              }}
                              title="Download / View Fee Quotation"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                            >
                              <FileText size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setDetailModalMode('INVOICE');
                                setViewingInvoice(inv);
                                setDetailModalOpen(true);
                              }}
                              title="View Invoice"
                              className="p-1.5 rounded-lg hover:bg-saBlue/10 text-slate-400 hover:text-saBlue transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            {displayStatus !== 'PAID' ? (
                              <button
                                onClick={() => handleMarkStatus(inv, 'PAID')}
                                disabled={actionLoadingId === inv.id}
                                title="Mark as Paid"
                                className="p-1.5 rounded-lg hover:bg-saBlue/10 text-slate-400 hover:text-saBlue transition-colors disabled:opacity-40"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkStatus(inv, 'PENDING')}
                                disabled={actionLoadingId === inv.id}
                                title="Mark as Pending"
                                className="p-1.5 rounded-lg hover:bg-saOrangeSubtle text-slate-400 hover:text-saVividOrange transition-colors disabled:opacity-40"
                              >
                                <Clock size={15} />
                              </button>
                            )}
                            <button
                              onClick={() => handleSendEmail(inv)}
                              disabled={actionLoadingId === inv.id}
                              title="Send Email"
                              className="p-1.5 rounded-lg hover:bg-saBlue/10 text-slate-400 hover:text-saBlue transition-colors disabled:opacity-40"
                            >
                              <Mail size={15} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => { setEditingInvoice(inv); setCreateEditModalOpen(true); }}
                                title="Edit"
                                className="p-1.5 rounded-lg hover:bg-saBlue/10 text-slate-400 hover:text-saBlue transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => { setDeletingInvoice(inv); setDeleteModalOpen(true); }}
                                title="Delete"
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <p className="text-xs font-medium text-slate-500">
                Showing Page <span className="font-bold text-slate-800">{currentPage}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({totalRecords} total invoices)
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
        </div>
      )}

      {activeTab === 'settings' && (
        <InvoiceSettingsTab onSaved={fetchInvoices} />
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm">
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      <CreateEditInvoiceModal
        open={createEditModalOpen}
        onClose={() => { setCreateEditModalOpen(false); setEditingInvoice(null); }}
        onSuccess={(createdInvoice, downloadImmediately, mode) => {
          fetchInvoices();
          showToast(
            editingInvoice
              ? 'Invoice updated'
              : mode === 'QUOTATION'
              ? 'Fee quotation generated!'
              : 'Invoice created successfully'
          );
          if (createdInvoice && downloadImmediately !== false) {
            setDetailModalMode(mode || 'INVOICE');
            setViewingInvoice(createdInvoice);
            setDetailModalOpen(true);
          }
        }}
        editingInvoice={editingInvoice}
      />
      <InvoiceDetailModal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setViewingInvoice(null); }}
        invoice={viewingInvoice}
        initialMode={detailModalMode}
        autoPrint={detailModalMode === 'QUOTATION'}
      />
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeletingInvoice(null); }}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Delete invoice ${deletingInvoice?.invoice_number}? This action cannot be undone.`}
      />
    </div>
  );
};

export default EnrollmentsInvoicesPage;
