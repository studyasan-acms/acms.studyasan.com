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
  Sparkles,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
import { invoiceService } from '@/services/api';
import type { Invoice, InvoiceStats } from '@/types';
import CreateEditInvoiceModal from './CreateEditInvoiceModal';
import InvoiceDetailModal from './InvoiceDetailModal';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';

export const BillingInvoicesPage: React.FC = () => {
  usePageTitle('Billing & Invoices');
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Data & loading state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partially_paid' | 'pending' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  // Modals state
  const [createEditModalOpen, setCreateEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailModalMode, setDetailModalMode] = useState<'INVOICE' | 'QUOTATION' | 'RECEIPT'>('INVOICE');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  // Record Installment / Partial Payment Modal State
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentMethod, setInstallmentMethod] = useState('UPI');
  const [installmentTxnId, setInstallmentTxnId] = useState('');
  const [installmentNotes, setInstallmentNotes] = useState('');
  const [installmentNextDueDate, setInstallmentNextDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Action status loading
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceService.getAll({
        page: currentPage,
        limit,
        search: searchTerm,
        status: statusFilter,
        sortBy,
        sortOrder,
      });

      setInvoices(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRecords(res.data.pagination?.total || 0);
      if (res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle Quick Status Toggle
  const handleToggleStatus = async (inv: Invoice) => {
    const newStatus = inv.status === 'PAID' ? 'PENDING' : 'PAID';
    setActionLoadingId(inv.id);
    try {
      await invoiceService.markStatus(inv.id, {
        status: newStatus,
        paid_date: newStatus === 'PAID' ? new Date().toISOString() : undefined,
      });
      showToast(`Invoice #${inv.invoice_number} marked as ${newStatus}`);
      fetchInvoices();
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update invoice status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Send Email
  const handleSendEmail = async (inv: Invoice) => {
    setActionLoadingId(inv.id);
    try {
      await invoiceService.sendEmail(inv.id);
      showToast(`Invoice email dispatched to ${inv.student?.user?.email || 'student'}!`);
    } catch (err: any) {
      console.error('Failed to send invoice email:', err);
      alert(err?.response?.data?.message || 'Failed to dispatch email. Please verify SMTP settings.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deletingInvoice) return;
    try {
      await invoiceService.delete(deletingInvoice.id);
      setDeleteModalOpen(false);
      setDeletingInvoice(null);
      showToast('Invoice deleted successfully');
      fetchInvoices();
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      alert('Failed to delete invoice.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-gray-700 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-4 h-4 text-saOrange" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">Billing & Invoices</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manage student enrollments, issue invoices, track dues, and dispatch email receipts.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInvoices}
              className="h-10 text-xs rounded-2xl border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingInvoice(null);
                setCreateEditModalOpen(true);
              }}
              className="h-10 text-xs px-5 rounded-2xl bg-saBlue hover:bg-saBlue/90 text-white font-bold shadow-md shadow-saBlue/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Invoice / Enrollment
            </Button>
          </div>
        )}
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <Card className="rounded-3xl border-gray-100 shadow-sm bg-gradient-to-br from-blue-50/60 to-white overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Invoiced</p>
              <h3 className="text-2xl font-black text-saBlue mt-1">₹{stats.totalInvoiced.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-gray-500 mt-1">{stats.totalCount} total invoice(s)</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-saBlue/10 flex items-center justify-center text-saBlue">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Collected / Paid */}
        <Card className="rounded-3xl border-gray-100 shadow-sm bg-gradient-to-br from-blue-50/40 to-white overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Collected Revenue</p>
              <h3 className="text-2xl font-black text-saBlue mt-1">₹{stats.totalPaid.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-saBlue font-semibold mt-1">Paid Invoices</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100/60 flex items-center justify-center text-saBlue">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Amount */}
        <Card className="rounded-3xl border-gray-100 shadow-sm bg-gradient-to-br from-orange-50/60 to-white overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending Dues</p>
              <h3 className="text-2xl font-black text-saOrange mt-1">₹{stats.totalPending.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-saOrange font-semibold mt-1">Awaiting Payment</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-saOrange/10 flex items-center justify-center text-saOrange">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Amount */}
        <Card className="rounded-3xl border-gray-100 shadow-sm bg-gradient-to-br from-red-50/50 to-white overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Overdue Dues</p>
              <h3 className="text-2xl font-black text-red-600 mt-1">₹{stats.totalOverdue.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-red-500 font-semibold mt-1">Due Date Passed</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-100/60 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        {/* Status Filter Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-gray-50 rounded-2xl border border-gray-100">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'all'
                ? 'bg-saBlue text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            All Invoices
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('paid');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Paid
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('partially_paid');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'partially_paid'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Partially Paid
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('pending');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'pending'
                ? 'bg-saOrange text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('overdue');
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
              statusFilter === 'overdue'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            Overdue
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search student, invoice #, item..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 rounded-2xl border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-saBlue/10 focus:border-saBlue placeholder:text-gray-400 transition-all"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/70 hover:bg-gray-50/70 border-b-gray-100">
                <TableHead
                  onClick={() => handleSort('invoice_number')}
                  className="font-bold text-gray-400 text-[10px] uppercase tracking-wider pl-6 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1">
                    Invoice # <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[180px]">
                  Student
                </TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[200px]">
                  Enrolled Items
                </TableHead>
                <TableHead
                  onClick={() => handleSort('total_amount')}
                  className="font-bold text-gray-400 text-[10px] uppercase tracking-wider cursor-pointer select-none min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    Amount & Balance (₹) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('due_date')}
                  className="font-bold text-gray-400 text-[10px] uppercase tracking-wider cursor-pointer select-none min-w-[110px]"
                >
                  <div className="flex items-center gap-1">
                    Due Date <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider min-w-[110px]">
                  Status
                </TableHead>
                <TableHead className="font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right pr-6 min-w-[180px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-400 text-xs uppercase tracking-widest">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saBlue"></div>
                      <span>Loading Invoices...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-gray-400 text-xs">
                    <p className="font-bold text-gray-600">No invoices found</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Try clearing your filters or search terms.'
                        : 'Create your first invoice by clicking "+ Create Invoice / Enrollment".'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isPartiallyPaid = inv.status === 'PARTIALLY_PAID';
                  const isOverdue = !isPaid && !isPartiallyPaid && (inv.is_overdue || new Date(inv.due_date) < new Date());

                  return (
                    <TableRow
                      key={inv.id}
                      className="hover:bg-blue-50/20 border-b-gray-50 transition-colors group"
                    >
                      {/* Invoice Number */}
                      <TableCell className="pl-6 py-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-xs text-saBlue bg-blue-50/80 px-2.5 py-1 rounded-lg">
                            {inv.invoice_number}
                          </span>
                          {inv.receipt_number && (
                            <div className="text-[10px] font-mono text-emerald-700 font-semibold pl-1">
                              RCP: {inv.receipt_number}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Student Profile */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-xs">
                            {inv.student?.user?.name || 'Unknown'}
                          </span>
                          <span className="text-[11px] text-gray-400">{inv.student?.user?.email}</span>
                          {inv.student?.class && (
                            <span className="text-[10px] text-saBlue font-semibold mt-0.5">
                              {inv.student.class.name} {inv.student.board ? `• ${inv.student.board.name}` : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Enrolled Items */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {inv.items && inv.items.length > 0 ? (
                            inv.items.map((item, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-[10px] px-2 py-0.5 border-none ${
                                  item.type === 'SUBJECT'
                                    ? 'bg-blue-50 text-saBlue'
                                    : item.type === 'TEST_SERIES'
                                    ? 'bg-amber-50 text-saOrange'
                                    : 'bg-teal-50 text-teal-700'
                                }`}
                              >
                                {item.item_name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">No items</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Amount & Balance Due */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 text-sm">₹{inv.total_amount.toFixed(2)}</span>
                          {isPartiallyPaid && (
                            <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                              Paid: ₹{(inv.amount_paid || 0).toFixed(0)} | Due: ₹{(inv.balance_due ?? (inv.total_amount - (inv.amount_paid || 0))).toFixed(0)}
                            </div>
                          )}
                          {inv.discount_amount > 0 && !isPartiallyPaid && (
                            <span className="text-[10px] text-saOrange font-medium line-through">
                              ₹{inv.subtotal.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Due Date */}
                      <TableCell>
                        <span
                          className={`text-xs font-mono font-medium ${
                            isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'
                          }`}
                        >
                          {formatDate(inv.due_date)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isPaid ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2.5 py-0.5 font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> PAID
                          </Badge>
                        ) : isPartiallyPaid ? (
                          <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] px-2.5 py-0.5 font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> PARTIAL
                          </Badge>
                        ) : isOverdue ? (
                          <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] px-2.5 py-0.5 font-bold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> OVERDUE
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-saOrange border-saOrange/30 text-[10px] px-2.5 py-0.5 font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" /> PENDING
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {/* Record Payment / Advance Installment */}
                          {isAdmin && !isPaid && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Record Installment / Advance Payment"
                              onClick={() => {
                                setPaymentInvoice(inv);
                                const due = inv.balance_due ?? (inv.total_amount - (inv.amount_paid || 0));
                                setInstallmentAmount(due);
                                setInstallmentMethod('UPI');
                                setInstallmentTxnId('');
                                setInstallmentNotes('');
                                setRecordPaymentModalOpen(true);
                              }}
                              className="h-8 px-2 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1 font-bold"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline text-[11px]">Receive</span>
                            </Button>
                          )}

                          {/* Payment Receipt View / Print */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View / Download Payment Receipt"
                            onClick={() => {
                              setDetailModalMode('RECEIPT');
                              setViewingInvoice(inv);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Button>

                          {/* View / Download Quotation */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download / View Fee Quotation"
                            onClick={() => {
                              setDetailModalMode('QUOTATION');
                              setViewingInvoice(inv);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>

                          {/* View Invoice */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View / Print Tax Invoice"
                            onClick={() => {
                              setDetailModalMode('INVOICE');
                              setViewingInvoice(inv);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 w-8 text-gray-400 hover:text-saBlue rounded-lg"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {/* Mail to Student Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mail to Student"
                            disabled={actionLoadingId === inv.id}
                            onClick={() => handleSendEmail(inv)}
                            className="h-8 w-8 text-gray-400 hover:text-saBlue hover:bg-blue-50 rounded-lg"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </Button>

                          {/* Edit Invoice */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit Invoice"
                              onClick={() => {
                                setEditingInvoice(inv);
                                setCreateEditModalOpen(true);
                              }}
                              className="h-8 w-8 text-gray-400 hover:text-saBlue rounded-lg"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}

                          {/* Delete Invoice */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Invoice"
                              onClick={() => {
                                setDeletingInvoice(inv);
                                setDeleteModalOpen(true);
                              }}
                              className="h-8 w-8 text-gray-400 hover:text-red-600 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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
      </div>

      {/* Pagination Toolbar */}
      {invoices.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs font-semibold text-gray-400">
            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalRecords)} of {totalRecords}{' '}
            Invoices
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-8 text-xs font-semibold rounded-xl border-gray-200"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
            <div className="flex items-center px-3 text-xs font-bold text-saBlue bg-blue-50 rounded-xl">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-8 text-xs font-semibold rounded-xl border-gray-200"
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Record Payment / Installment Modal */}
      {recordPaymentModalOpen && paymentInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" /> Record Fee Payment
                </h3>
                <p className="text-xs text-slate-500">
                  Invoice {paymentInvoice.invoice_number} • {paymentInvoice.student?.user?.name}
                </p>
              </div>
            </div>

            {/* Balances Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Invoiced Fee:</span>
                <span className="font-mono font-bold text-slate-900">₹{paymentInvoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Already Paid:</span>
                <span className="font-mono font-bold">₹{(paymentInvoice.amount_paid || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-800 font-bold pt-1 border-t border-slate-200">
                <span>Current Balance Due:</span>
                <span className="font-mono text-sm">
                  ₹{(paymentInvoice.balance_due ?? (paymentInvoice.total_amount - (paymentInvoice.amount_paid || 0))).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Amount Receiving Now (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  max={paymentInvoice.balance_due ?? paymentInvoice.total_amount}
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl font-bold text-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={installmentMethod}
                  onChange={(e) => setInstallmentMethod(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-saBlue/10 font-medium text-gray-700"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Online">Online Gateway</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Transaction / Reference ID (Optional)</label>
                <Input
                  value={installmentTxnId}
                  onChange={(e) => setInstallmentTxnId(e.target.value)}
                  placeholder="e.g. UPI Ref / Bank Txn ID"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {installmentAmount < (paymentInvoice.balance_due ?? (paymentInvoice.total_amount - (paymentInvoice.amount_paid || 0))) && (
                <div>
                  <label className="text-xs font-bold text-amber-800 block mb-1">Next Balance Due Date</label>
                  <Input
                    type="date"
                    value={installmentNextDueDate}
                    onChange={(e) => setInstallmentNextDueDate(e.target.value)}
                    className="h-9 text-xs rounded-xl font-semibold border-amber-300"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Remarks / Note (Optional)</label>
                <Input
                  value={installmentNotes}
                  onChange={(e) => setInstallmentNotes(e.target.value)}
                  placeholder="e.g. Paid by father in cash at desk"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordPaymentModalOpen(false)}
                disabled={recordingPayment}
                className="h-9 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={recordingPayment || installmentAmount <= 0}
                onClick={async () => {
                  setRecordingPayment(true);
                  try {
                    await invoiceService.recordPayment(paymentInvoice.id, {
                      amount: Number(installmentAmount),
                      payment_method: installmentMethod,
                      transaction_id: installmentTxnId || undefined,
                      notes: installmentNotes || undefined,
                      next_due_date: installmentNextDueDate || undefined,
                    });
                    showToast(`Payment of ₹${installmentAmount} recorded! Receipt generated.`);
                    setRecordPaymentModalOpen(false);
                    fetchInvoices();
                  } catch (err: any) {
                    console.error('Failed to record payment:', err);
                    alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to record payment');
                  } finally {
                    setRecordingPayment(false);
                  }
                }}
                className="h-9 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4"
              >
                {recordingPayment ? 'Recording...' : `Confirm & Record ₹${installmentAmount}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      <CreateEditInvoiceModal
        open={createEditModalOpen}
        onClose={() => {
          setCreateEditModalOpen(false);
          setEditingInvoice(null);
        }}
        onSuccess={(createdInvoice, downloadImmediately, mode) => {
          showToast(
            editingInvoice
              ? 'Invoice updated successfully!'
              : mode === 'QUOTATION'
              ? 'Fee quotation generated!'
              : 'Invoice created & students enrolled!'
          );
          fetchInvoices();
          if (createdInvoice && downloadImmediately !== false) {
            setDetailModalMode(mode || 'INVOICE');
            setViewingInvoice(createdInvoice);
            setDetailModalOpen(true);
          }
        }}
        editingInvoice={editingInvoice}
      />

      {/* Invoice Detail / Print Modal */}
      <InvoiceDetailModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingInvoice(null);
        }}
        invoice={viewingInvoice}
        initialMode={detailModalMode}
        autoPrint={detailModalMode === 'QUOTATION'}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title={
          deletingInvoice
            ? `Delete Invoice ${deletingInvoice.invoice_number}?`
            : 'Delete Invoice'
        }
        message={
          deletingInvoice && (
            <div className="space-y-2 text-xs text-gray-600">
              <p>
                Are you sure you want to delete invoice{' '}
                <strong className="text-gray-800 font-mono">{deletingInvoice.invoice_number}</strong> for student{' '}
                <strong className="text-gray-800">{deletingInvoice.student?.user?.name}</strong>?
              </p>
              <p className="text-red-500 font-semibold">This action cannot be undone.</p>
            </div>
          )
        }
        footer={
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="h-8 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmDelete}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete Invoice
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default BillingInvoicesPage;
