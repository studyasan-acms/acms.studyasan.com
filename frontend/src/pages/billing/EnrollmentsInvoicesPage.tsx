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
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import EnrollmentsTab from './EnrollmentsTab';

// ─── Status helpers ───────────────────────────────────────────────────────────

function getDisplayStatus(inv: Invoice): 'PAID' | 'PENDING' | 'OVERDUE' {
  const ds = (inv as any).display_status;
  if (ds) return ds;
  if (inv.status === 'PENDING' && new Date(inv.due_date) < new Date()) return 'OVERDUE';
  return inv.status as 'PAID' | 'PENDING';
}

function StatusBadge({ status }: { status: 'PAID' | 'PENDING' | 'OVERDUE' | string }) {
  if (status === 'PAID')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
        <CheckCircle2 size={11} />
        Paid
      </span>
    );
  if (status === 'OVERDUE')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
        <AlertTriangle size={11} />
        Overdue
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
      <Clock size={11} />
      Pending
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EnrollmentsInvoicesPage: React.FC = () => {
  usePageTitle('Enrollments & Invoices');
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'enrollments' | 'invoices'>('enrollments');

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoiced: 0, totalPaid: 0, totalPending: 0, totalOverdue: 0, totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
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

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder('desc'); }
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

  const SortIcon = ({ col }: { col: string }) => (
    <ArrowUpDown size={12} className={`inline ml-1 ${sortBy === col ? 'text-[#0276D3]' : 'text-gray-300'}`} />
  );

  const FILTER_PILLS = [
    { label: 'All', value: 'all' as const },
    { label: 'Paid', value: 'paid' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Overdue', value: 'overdue' as const },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments & Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage student enrollments and their billing invoices</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Invoiced',
            value: `₹${stats.totalInvoiced.toLocaleString('en-IN')}`,
            icon: <FileText size={18} className="text-[#0276D3]" />,
            bg: 'bg-blue-50',
          },
          {
            label: 'Collected Revenue',
            value: `₹${stats.totalPaid.toLocaleString('en-IN')}`,
            icon: <TrendingUp size={18} className="text-emerald-600" />,
            bg: 'bg-emerald-50',
          },
          {
            label: 'Pending Dues',
            value: `₹${stats.totalPending.toLocaleString('en-IN')}`,
            icon: <Clock size={18} className="text-amber-600" />,
            bg: 'bg-amber-50',
          },
          {
            label: 'Overdue Amount',
            value: `₹${stats.totalOverdue.toLocaleString('en-IN')}`,
            icon: <AlertTriangle size={18} className="text-red-500" />,
            bg: 'bg-red-50',
          },
        ].map((card) => (
          <Card key={card.label} className="border border-gray-200 shadow-none">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                {card.icon}
              </div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0">
          {[
            { id: 'enrollments', label: 'Enrollments', icon: <Users size={15} /> },
            { id: 'invoices', label: 'Invoices', icon: <FileText size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#0276D3] text-[#0276D3]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'enrollments' && (
        <EnrollmentsTab onInvoiceGenerated={fetchInvoices} />
      )}

      {activeTab === 'invoices' && (
        <div>
          {/* Invoice Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student, invoice number, item..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0276D3] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1">
              {FILTER_PILLS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === f.value
                      ? 'bg-white text-[#0276D3] shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchInvoices} className="h-10">
                <RefreshCw size={14} />
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => { setEditingInvoice(null); setCreateEditModalOpen(true); }}
                  className="h-10 bg-[#0276D3] hover:bg-blue-700 text-white gap-2"
                >
                  <Plus size={14} />
                  New Invoice
                </Button>
              )}
            </div>
          </div>

          {/* Invoice Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('invoice_number')}>
                    Invoice # <SortIcon col="invoice_number" />
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('student')}>
                    Student <SortIcon col="student" />
                  </TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('total_amount')}>
                    Amount <SortIcon col="total_amount" />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('due_date')}>
                    Due Date <SortIcon col="due_date" />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <FileText size={32} className="text-gray-200" />
                        <p className="font-medium">No invoices found</p>
                        <p className="text-sm">Create invoices from the Enrollments tab or create a new one above</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const displayStatus = getDisplayStatus(inv);
                    return (
                      <TableRow key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                        <TableCell>
                          <span className="font-mono text-sm font-semibold text-[#0276D3]">
                            {inv.invoice_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#0276D3] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              {inv.student?.user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{inv.student?.user?.name}</div>
                              <div className="text-xs text-gray-400">{inv.student?.user?.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 max-w-48">
                            {(inv.items || []).slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-600 truncate">{item.item_name}</div>
                            ))}
                            {(inv.items || []).length > 2 && (
                              <div className="text-xs text-gray-400">+{inv.items.length - 2} more</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-bold text-gray-900">
                              ₹{(inv.total_amount || 0).toLocaleString('en-IN')}
                            </div>
                            {inv.discount_amount > 0 && (
                              <div className="text-xs text-gray-400">
                                -{inv.discount_amount.toLocaleString('en-IN')} disc.
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={displayStatus} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className={`text-sm font-medium ${displayStatus === 'OVERDUE' ? 'text-red-600' : 'text-gray-700'}`}>
                              {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            {inv.paid_date && (
                              <div className="text-xs text-emerald-600">
                                Paid {new Date(inv.paid_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* View */}
                            <button
                              onClick={() => { setViewingInvoice(inv); setDetailModalOpen(true); }}
                              title="View"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#0276D3] transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                            {/* Toggle status */}
                            {displayStatus !== 'PAID' ? (
                              <button
                                onClick={() => handleMarkStatus(inv, 'PAID')}
                                disabled={actionLoadingId === inv.id}
                                title="Mark as Paid"
                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-40"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkStatus(inv, 'PENDING')}
                                disabled={actionLoadingId === inv.id}
                                title="Mark as Pending"
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors disabled:opacity-40"
                              >
                                <Clock size={15} />
                              </button>
                            )}
                            {/* Send email */}
                            <button
                              onClick={() => handleSendEmail(inv)}
                              disabled={actionLoadingId === inv.id}
                              title="Send Email"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#0276D3] transition-colors disabled:opacity-40"
                            >
                              <Mail size={15} />
                            </button>
                            {/* Edit */}
                            {isAdmin && (
                              <button
                                onClick={() => { setEditingInvoice(inv); setCreateEditModalOpen(true); }}
                                title="Edit"
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-[#0276D3] transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            {/* Delete */}
                            {isAdmin && (
                              <button
                                onClick={() => { setDeletingInvoice(inv); setDeleteModalOpen(true); }}
                                title="Delete"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
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
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
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
        onSuccess={() => { fetchInvoices(); showToast(editingInvoice ? 'Invoice updated' : 'Invoice created'); }}
        editingInvoice={editingInvoice}
      />
      <InvoiceDetailModal
        open={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setViewingInvoice(null); }}
        invoice={viewingInvoice}
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
