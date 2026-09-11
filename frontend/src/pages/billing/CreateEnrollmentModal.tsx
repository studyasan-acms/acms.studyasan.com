import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  Search,
  BookOpen,
  Activity,
  ClipboardList,
  Check,
  Tag,
  Percent,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  studentService,
  subjectService,
  testSeriesService,
  activityGroupService,
  enrollmentService,
} from '@/services/api';
import type { Student, BillingFrequency, CreateEnrollmentItemData, Enrollment } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ItemType = 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';
type PaymentOption = 'UNPAID' | 'PARTIAL' | 'FULL';
type DiscountType = 'FIXED' | 'PERCENTAGE';

interface ItemRow {
  id: string; // local uuid
  type: ItemType;
  subject_id?: number;
  test_series_id?: number;
  activity_group_id?: number;
  itemName: string;
  price: string;
  actual_price?: string;
  frequency: BillingFrequency;
}

interface Props {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingEnrollment?: Enrollment | null; // for edit mode (single enrollment)
}

// ─── Helpers & Constants ─────────────────────────────────────────────────────

const FREQ_OPTIONS: { value: BillingFrequency; label: string }[] = [
  { value: 'one_time', label: 'One Time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_yearly', label: 'Semi-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const TYPE_OPTIONS: { value: ItemType; label: string; icon: React.ReactNode }[] = [
  { value: 'SUBJECT', label: 'Subject', icon: <BookOpen size={14} /> },
  { value: 'TEST_SERIES', label: 'Test Series', icon: <ClipboardList size={14} /> },
  { value: 'ACTIVITY_GROUP', label: 'Activity Group', icon: <Activity size={14} /> },
];

const PAYMENT_METHODS = [
  { value: 'UPI', label: 'UPI (GPay / PhonePe / Paytm / BHIM)' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer (NEFT / IMPS / RTGS)' },
  { value: 'Card', label: 'Debit / Credit Card' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Net Banking', label: 'Net Banking' },
];

function genId() {
  return Math.random().toString(36).slice(2);
}

// ─── Component ───────────────────────────────────────────────────────────────

const CreateEnrollmentModal: React.FC<Props> = ({ open, isOpen, onClose, onSuccess, editingEnrollment }) => {
  const isVisible = open ?? isOpen ?? false;
  const isEditMode = !!editingEnrollment;

  // Student selection
  const [studentSearch, setStudentSearch] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Catalog data
  const [subjects, setSubjects] = useState<any[]>([]);
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Enrollment items
  const [items, setItems] = useState<ItemRow[]>([
    { id: genId(), type: 'SUBJECT', itemName: '', price: '', frequency: 'monthly' },
  ]);

  // Discount options
  const [discountType, setDiscountType] = useState<DiscountType>('FIXED');
  const [discountValue, setDiscountValue] = useState<string>('');

  // Payment / Partial Payment options
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('UNPAID');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI');
  const [transactionId, setTransactionId] = useState<string>('');
  const [paidDate, setPaidDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Invoice options
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close student dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load students on search ─────────────────────────────────────────────────
  const fetchStudents = useCallback(async (q: string) => {
    setLoadingStudents(true);
    try {
      const res = await studentService.getAll({ search: q, limit: 30 });
      const list = (res as any)?.data?.data || (res as any)?.data || [];
      setStudents(Array.isArray(list) ? list : []);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      fetchStudents('');
    }
  }, [isVisible, fetchStudents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (studentSearch !== '') fetchStudents(studentSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearch, fetchStudents]);

  // ── Load catalog ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) return;
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const [subRes, tsRes, agRes] = await Promise.all([
          subjectService.getAll({ limit: 500 }),
          testSeriesService.getAll({ limit: 500 }),
          activityGroupService.getAll({ limit: 500 }),
        ]);

        const rawSubs = (subRes as any)?.data?.data || (subRes as any)?.data || [];
        const rawTests = (tsRes as any)?.data?.data || (tsRes as any)?.data || [];
        const rawActs = (agRes as any)?.data?.activityGroups || (agRes as any)?.data?.data || (agRes as any)?.data || [];

        setSubjects(Array.isArray(rawSubs) ? rawSubs : []);
        setTestSeries(Array.isArray(rawTests) ? rawTests : []);
        setActivityGroups(Array.isArray(rawActs) ? rawActs : []);
      } catch (err) {
        console.error('Failed to load catalog items:', err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, [isVisible]);

  // ── Populate edit mode ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && editingEnrollment) {
      setSelectedStudent({
        id: editingEnrollment.student.id,
        user: editingEnrollment.student.user,
      } as any);

      const en = editingEnrollment;
      const item: ItemRow = {
        id: genId(),
        type: en.type,
        subject_id: en.subject_id ?? undefined,
        test_series_id: en.test_series_id ?? undefined,
        activity_group_id: en.activity_group_id ?? undefined,
        itemName: en.subject?.name || en.test_series?.title || en.activity_group?.name || '',
        price: String(en.price ?? ''),
        frequency: en.frequency || 'one_time',
      };
      setItems([item]);
      setNotes(en.notes || '');
      setInvoiceDate(en.invoice_date ? en.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    }
  }, [isEditMode, editingEnrollment]);

  // ── Calculations ───────────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);

  const numericDiscountVal = parseFloat(discountValue) || 0;
  const calculatedDiscount =
    discountType === 'PERCENTAGE'
      ? Math.round((subtotal * Math.min(100, Math.max(0, numericDiscountVal))) / 100)
      : Math.min(subtotal, Math.max(0, numericDiscountVal));

  const netPayable = Math.max(0, subtotal - calculatedDiscount);

  // Sync amount paid with payment option
  const numericAmountPaid =
    paymentOption === 'FULL'
      ? netPayable
      : paymentOption === 'PARTIAL'
      ? Math.min(netPayable, Math.max(0, parseFloat(amountPaid) || 0))
      : 0;

  const balanceDue = Math.max(0, netPayable - numericAmountPaid);

  // Handle changing payment option
  const handlePaymentOptionChange = (option: PaymentOption) => {
    setPaymentOption(option);
    if (option === 'FULL') {
      setAmountPaid(String(netPayable));
      setGenerateInvoice(true);
    } else if (option === 'PARTIAL') {
      const current = parseFloat(amountPaid);
      if (!current || current >= netPayable || current <= 0) {
        setAmountPaid(String(Math.round(netPayable / 2)));
      }
      setGenerateInvoice(true);
    } else {
      setAmountPaid('0');
    }
  };

  // ── Reset on close ─────────────────────────────────────────────────────────
  const handleClose = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setStudentDropdownOpen(false);
    setItems([{ id: genId(), type: 'SUBJECT', itemName: '', price: '', frequency: 'monthly' }]);
    setDiscountType('FIXED');
    setDiscountValue('');
    setPaymentOption('UNPAID');
    setAmountPaid('');
    setPaymentMethod('UPI');
    setTransactionId('');
    setPaidDate(new Date().toISOString().split('T')[0]);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);
    setNotes('');
    setGenerateInvoice(false);
    setSendEmail(false);
    setError(null);
    onClose();
  };

  // ── Item helpers ───────────────────────────────────────────────────────────
  const addItem = () => {
    setItems((prev) => [...prev, { id: genId(), type: 'SUBJECT', itemName: '', price: '', frequency: 'monthly' }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (patch.type) {
          updated.subject_id = undefined;
          updated.test_series_id = undefined;
          updated.activity_group_id = undefined;
          updated.itemName = '';
          updated.price = '';
        }
        return updated;
      })
    );
  };

  const selectCatalogItem = (rowId: string, type: ItemType, item: any) => {
    const name = type === 'SUBJECT' ? item.name : type === 'TEST_SERIES' ? item.title : item.name;
    const price = String(item.price ?? item.actual_price ?? '');
    const actualPrice = item.actual_price !== undefined && item.actual_price !== null ? String(item.actual_price) : undefined;
    updateItem(rowId, {
      ...(type === 'SUBJECT' && { subject_id: item.id }),
      ...(type === 'TEST_SERIES' && { test_series_id: item.id }),
      ...(type === 'ACTIVITY_GROUP' && { activity_group_id: item.id }),
      itemName: name,
      price,
      actual_price: actualPrice,
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one enrollment item');
      return;
    }
    const invalidItem = items.find((i) => {
      if (i.type === 'SUBJECT' && !i.subject_id) return true;
      if (i.type === 'TEST_SERIES' && !i.test_series_id) return true;
      if (i.type === 'ACTIVITY_GROUP' && !i.activity_group_id) return true;
      return false;
    });
    if (invalidItem) {
      setError('Please select an item for each row');
      return;
    }

    if (!isEditMode && paymentOption === 'PARTIAL') {
      const parsed = parseFloat(amountPaid);
      if (isNaN(parsed) || parsed <= 0) {
        setError('Please enter a valid partial payment amount greater than ₹0');
        return;
      }
      if (parsed > netPayable) {
        setError(`Partial payment amount cannot exceed net payable of ₹${netPayable.toLocaleString('en-IN')}`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEditMode && editingEnrollment) {
        await enrollmentService.update(editingEnrollment.id, {
          price: items[0]?.price ? parseFloat(items[0].price) : undefined,
          frequency: items[0]?.frequency,
          is_recurring: items[0]?.frequency !== 'one_time',
          notes: notes || undefined,
          invoice_date: invoiceDate,
        });
      } else {
        const enrollmentItems: CreateEnrollmentItemData[] = items.map((row) => ({
          type: row.type,
          subject_id: row.subject_id,
          test_series_id: row.test_series_id,
          activity_group_id: row.activity_group_id,
          price: row.price ? parseFloat(row.price) : undefined,
          frequency: row.frequency,
          is_recurring: row.frequency !== 'one_time',
        }));

        const isPaymentMade = paymentOption !== 'UNPAID';
        const finalAmountPaid =
          paymentOption === 'FULL'
            ? netPayable
            : paymentOption === 'PARTIAL'
            ? parseFloat(amountPaid) || 0
            : 0;

        await enrollmentService.create({
          student_id: selectedStudent.id,
          items: enrollmentItems,
          invoice_date: invoiceDate,
          due_date: dueDate,
          notes: notes || undefined,
          generate_invoice: generateInvoice || isPaymentMade,
          send_email: sendEmail,
          discount_amount: calculatedDiscount,
          amount_paid: finalAmountPaid,
          payment_method: isPaymentMade ? paymentMethod : undefined,
          transaction_id: isPaymentMade && transactionId.trim() ? transactionId.trim() : undefined,
          paid_date: isPaymentMade ? paidDate : undefined,
          payment_status: paymentOption === 'FULL' ? 'PAID' : paymentOption === 'PARTIAL' ? 'PARTIALLY_PAID' : 'PENDING',
        });
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Catalog dropdown for an item row ──────────────────────────────────────
  const CatalogDropdown = ({ row }: { row: ItemRow }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const catalog =
      row.type === 'SUBJECT'
        ? subjects
        : row.type === 'TEST_SERIES'
        ? testSeries
        : activityGroups;

    const filtered = catalog.filter((c) => {
      const name = c.name || c.title || '';
      return name.toLowerCase().includes(search.toLowerCase());
    });

    return (
      <div ref={dropdownRef} className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white hover:border-[#0276D3] transition-all text-left shadow-xs focus:ring-2 focus:ring-blue-100"
        >
          <span className={`truncate font-medium ${row.itemName ? 'text-gray-900' : 'text-gray-400'}`}>
            {row.itemName || `Select ${TYPE_OPTIONS.find((t) => t.value === row.type)?.label}...`}
          </span>
          <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
        </button>

        {open && (
          <div className="absolute z-50 top-full left-0 mt-1.5 min-w-[320px] sm:min-w-[380px] w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Search Box */}
            <div className="p-3 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl shadow-xs focus-within:border-[#0276D3]">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${TYPE_OPTIONS.find((t) => t.value === row.type)?.label.toLowerCase()}...`}
                  className="flex-1 text-xs sm:text-sm outline-none bg-transparent"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="overflow-y-auto max-h-56 p-1.5 space-y-0.5">
              {loadingCatalog ? (
                <div className="p-4 text-center text-xs text-gray-400">Loading catalog items...</div>
              ) : filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">No items found</div>
              ) : (
                filtered.map((item) => {
                  const name = item.name || item.title;
                  const price = item.price ?? item.actual_price;
                  const actualPrice = item.actual_price;
                  const hasDiscount = actualPrice && price && actualPrice > price;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        selectCatalogItem(row.id, row.type, item);
                        setOpen(false);
                        setSearch('');
                      }}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl hover:bg-blue-50/80 transition-colors text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-[#0276D3]">
                          {name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.class?.name && (
                            <span className="text-[11px] text-gray-400">
                              {item.class.name} {item.board?.name ? `• ${item.board.name}` : ''}
                            </span>
                          )}
                          {hasDiscount && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {Math.round(((actualPrice - price) / actualPrice) * 100)}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {price !== undefined && price !== null && (
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0276D3] font-bold text-xs block">
                            ₹{Number(price).toLocaleString('en-IN')}
                          </span>
                        )}
                        {hasDiscount && (
                          <span className="text-[10px] text-gray-400 line-through block mt-0.5">
                            ₹{Number(actualPrice).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? 'Edit Enrollment' : 'New Enrollment'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {isEditMode ? 'Update student enrollment & billing details' : 'Enroll a student in subjects, test series, or activities'}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Student Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select Student <span className="text-red-500">*</span>
            </label>
            {selectedStudent ? (
              <div className="flex items-center gap-3.5 p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-[#0276D3] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  {selectedStudent.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm">{selectedStudent.user.name}</div>
                  <div className="text-xs text-gray-500 truncate">{selectedStudent.user.email}</div>
                </div>
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="p-2 rounded-xl hover:bg-blue-100 text-[#0276D3] transition-colors"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div ref={studentDropdownRef} className="relative">
                <div className="flex items-center gap-2.5 border border-gray-200 rounded-2xl px-3.5 py-3 focus-within:border-[#0276D3] focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white shadow-xs">
                  <Search size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setStudentDropdownOpen(true);
                    }}
                    onFocus={() => setStudentDropdownOpen(true)}
                    placeholder="Search by student name or email..."
                    className="flex-1 text-sm outline-none bg-transparent"
                  />
                </div>
                {studentDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1.5 w-full bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1.5">
                    {loadingStudents ? (
                      <div className="p-4 text-center text-xs text-gray-400">Searching students...</div>
                    ) : students.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">No students found</div>
                    ) : (
                      students.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentDropdownOpen(false);
                            setStudentSearch('');
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-blue-50/70 rounded-xl transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#0276D3] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {s.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm truncate">{s.user.name}</div>
                            <div className="text-xs text-gray-400 truncate">{s.user.email}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enrollment Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Enrollment Items <span className="text-red-500">*</span>
              </label>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0276D3] hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={13} />
                  Add Another Item
                </button>
              )}
            </div>

            <div className="space-y-4">
              {items.map((row) => (
                <div key={row.id} className="border border-gray-200 rounded-2xl p-4 bg-gray-50/80 space-y-3.5 shadow-xs">
                  {/* Row Top: Type pills & Remove button */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl">
                      {TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => !isEditMode && updateItem(row.id, { type: opt.value })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                            row.type === opt.value
                              ? 'bg-[#0276D3] text-white shadow-xs'
                              : 'text-gray-600 hover:bg-gray-100'
                          } ${isEditMode ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {!isEditMode && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(row.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Row Inputs: Item Dropdown (6 cols), Price (3 cols), Frequency (3 cols) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-6">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                        Select {TYPE_OPTIONS.find((t) => t.value === row.type)?.label}
                      </label>
                      <CatalogDropdown row={row} />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                        Price (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₹</span>
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) => updateItem(row.id, { price: e.target.value })}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0276D3] focus:ring-2 focus:ring-blue-100 bg-white"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">
                        Billing Cycle
                      </label>
                      <select
                        value={row.frequency}
                        onChange={(e) => updateItem(row.id, { frequency: e.target.value as BillingFrequency })}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0276D3] bg-white cursor-pointer"
                      >
                        {FREQ_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject MRP discount savings badge */}
                  {row.actual_price && parseFloat(row.actual_price) > (parseFloat(row.price) || 0) && (
                    <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <span className="font-bold">Subject Discount Applied:</span>
                      <span>MRP ₹{Number(row.actual_price).toLocaleString('en-IN')}</span>
                      <span>→</span>
                      <span className="font-semibold">Discount ₹{(parseFloat(row.actual_price) - (parseFloat(row.price) || 0)).toLocaleString('en-IN')}</span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-bold px-1.5 py-0.5 rounded ml-auto">
                        {Math.round(((parseFloat(row.actual_price) - (parseFloat(row.price) || 0)) / parseFloat(row.actual_price)) * 100)}% SAVED
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* DISCOUNTS & SPECIAL OFFERS (NEW)                                   */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {!isEditMode && subtotal > 0 && (
            <div className="border border-emerald-200/80 rounded-2xl p-4 sm:p-5 bg-emerald-50/40 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                  <Tag size={16} className="text-emerald-600" />
                  <span>Discounts & Special Offers</span>
                </div>
                {calculatedDiscount > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    -₹{calculatedDiscount.toLocaleString('en-IN')} Applied
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Discount Type Toggle */}
                <div className="sm:col-span-5 flex items-center p-1 bg-white border border-emerald-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDiscountType('FIXED')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      discountType === 'FIXED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-emerald-700'
                    }`}
                  >
                    <span>₹ Fixed Amount</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENTAGE')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      discountType === 'PERCENTAGE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-emerald-700'
                    }`}
                  >
                    <Percent size={12} />
                    <span>Percentage (%)</span>
                  </button>
                </div>

                {/* Discount Value Input */}
                <div className="sm:col-span-7">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700 font-bold text-xs">
                      {discountType === 'FIXED' ? '₹' : '%'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'PERCENTAGE' ? '100' : String(subtotal)}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'FIXED' ? 'Enter discount in ₹ (e.g. 500)' : 'Enter discount in % (e.g. 10)'}
                      className="w-full pl-8 pr-3.5 py-2.5 border border-emerald-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PAYMENT & PARTIAL PAYMENTS SECTION (NEW)                          */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {!isEditMode && (
            <div className="border border-blue-200 rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-blue-50/60 to-white space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <Wallet size={16} className="text-[#0276D3]" />
                  <span>Payment Status & Advance Recording</span>
                </div>
                {paymentOption === 'PARTIAL' && balanceDue > 0 && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Remaining: ₹{balanceDue.toLocaleString('en-IN')}
                  </span>
                )}
                {paymentOption === 'FULL' && (
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Paid in Full
                  </span>
                )}
              </div>

              {/* 3 Payment Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Pay Later */}
                <button
                  type="button"
                  onClick={() => handlePaymentOptionChange('UNPAID')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentOption === 'UNPAID'
                      ? 'bg-white border-[#0276D3] ring-2 ring-blue-100 shadow-xs'
                      : 'bg-white/80 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className={paymentOption === 'UNPAID' ? 'text-[#0276D3]' : 'text-gray-400'} />
                    <span className="text-xs font-bold text-gray-900">Pay Later (Pending)</span>
                  </div>
                  <p className="text-[11px] text-gray-500">Invoice due on scheduled date</p>
                </button>

                {/* 2. Partial Payment */}
                <button
                  type="button"
                  onClick={() => handlePaymentOptionChange('PARTIAL')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentOption === 'PARTIAL'
                      ? 'bg-amber-50/60 border-amber-500 ring-2 ring-amber-100 shadow-xs'
                      : 'bg-white/80 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet size={14} className={paymentOption === 'PARTIAL' ? 'text-amber-600' : 'text-gray-400'} />
                    <span className="text-xs font-bold text-amber-900">Partial Payment</span>
                  </div>
                  <p className="text-[11px] text-gray-500">Record token / advance amount</p>
                </button>

                {/* 3. Full Payment */}
                <button
                  type="button"
                  onClick={() => handlePaymentOptionChange('FULL')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentOption === 'FULL'
                      ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-100 shadow-xs'
                      : 'bg-white/80 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className={paymentOption === 'FULL' ? 'text-emerald-600' : 'text-gray-400'} />
                    <span className="text-xs font-bold text-emerald-900">Full Payment (100%)</span>
                  </div>
                  <p className="text-[11px] text-gray-500">Mark fully paid & issue receipt</p>
                </button>
              </div>

              {/* Payment Details Drawer (When Partial or Full Payment is chosen) */}
              {paymentOption !== 'UNPAID' && (
                <div className="p-4 bg-white rounded-2xl border border-blue-200/80 space-y-3.5 shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {/* Amount Paid */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 block">
                        Amount Paid (₹) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">₹</span>
                        <input
                          type="number"
                          min="1"
                          max={String(netPayable)}
                          value={paymentOption === 'FULL' ? String(netPayable) : amountPaid}
                          disabled={paymentOption === 'FULL'}
                          onChange={(e) => setAmountPaid(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#0276D3] focus:ring-2 focus:ring-blue-100 bg-white disabled:bg-gray-50 disabled:text-gray-700"
                        />
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 block">
                        Payment Method <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0276D3] bg-white cursor-pointer"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Payment Date */}
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 block">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#0276D3] bg-white"
                      />
                    </div>
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1 block">
                      Transaction / Reference ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. UPI UTR No., Bank Ref, or Cheque number"
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#0276D3] bg-white"
                    />
                  </div>

                  {/* Partial Payment Summary Alert */}
                  {paymentOption === 'PARTIAL' && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                        <span>
                          Advance of <strong>₹{numericAmountPaid.toLocaleString('en-IN')}</strong> recorded. Remaining balance is <strong>₹{balanceDue.toLocaleString('en-IN')}</strong>.
                        </span>
                      </div>
                      <span className="font-bold text-[11px] bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 flex-shrink-0">
                        Due: {dueDate}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dates & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0276D3] focus:ring-2 focus:ring-blue-100 bg-white"
              />
            </div>
            {!isEditMode && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0276D3] focus:ring-2 focus:ring-blue-100 bg-white"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notes / Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Add optional notes or remarks for this enrollment..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0276D3] focus:ring-2 focus:ring-blue-100 resize-none bg-white"
            />
          </div>

          {/* Invoice Generation & Email Options */}
          {!isEditMode && (
            <div className="border border-blue-200/80 rounded-2xl p-4 bg-blue-50/50 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => paymentOption === 'UNPAID' && setGenerateInvoice((v) => !v)}
                  disabled={paymentOption !== 'UNPAID'}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                    generateInvoice || paymentOption !== 'UNPAID'
                      ? 'bg-[#0276D3] border-[#0276D3]'
                      : 'bg-white border-gray-300'
                  } ${paymentOption !== 'UNPAID' ? 'opacity-80 cursor-not-allowed' : ''}`}
                >
                  {(generateInvoice || paymentOption !== 'UNPAID') && <Check size={12} color="white" strokeWidth={3} />}
                </button>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Generate official invoice & receipt immediately
                  </div>
                  <div className="text-xs text-gray-500">
                    {paymentOption !== 'UNPAID'
                      ? 'Automatically enabled because payment was recorded (issues invoice & receipt)'
                      : 'Creates a sequential SA-YYYY-XXXXX invoice for these enrolled items'}
                  </div>
                </div>
              </div>

              {(generateInvoice || paymentOption !== 'UNPAID') && (
                <div className="flex items-center gap-3 pl-8">
                  <button
                    type="button"
                    onClick={() => setSendEmail((v) => !v)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      sendEmail ? 'bg-[#eca209] border-[#eca209]' : 'bg-white border-gray-300'
                    }`}
                  >
                    {sendEmail && <Check size={12} color="white" strokeWidth={3} />}
                  </button>
                  <div className="text-sm font-medium text-gray-700">Dispatch invoice & receipt email to student automatically</div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* COMPREHENSIVE FINANCIAL SUMMARY CARD                              */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {subtotal > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-xs font-bold tracking-wider uppercase text-slate-400">
                <span>Billing Summary</span>
                <span>Amount (₹)</span>
              </div>

              <div className="space-y-1.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Subtotal ({items.length} item{items.length > 1 ? 's' : ''})</span>
                  <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {calculatedDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-400 font-semibold">
                    <span>Discount Applied ({discountType === 'PERCENTAGE' ? `${discountValue}%` : 'Fixed'})</span>
                    <span>-₹{calculatedDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm sm:text-base font-black text-white">
                  <span>Net Total Payable</span>
                  <span className="text-[#eca209]">₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {paymentOption !== 'UNPAID' && (
                  <>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-emerald-400 font-semibold">
                      <span>Amount Paid Now ({paymentMethod})</span>
                      <span>₹{numericAmountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-amber-300">
                      <span>Remaining Balance Due</span>
                      <span>₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-xs sm:text-sm text-red-700 font-medium flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 sm:px-8 py-4 border-t border-gray-100 bg-gray-50/50">
          <Button variant="outline" onClick={handleClose} disabled={submitting} className="rounded-xl px-5">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-[#0276D3] hover:bg-blue-700 text-white font-semibold rounded-xl px-6 shadow-sm"
          >
            {submitting
              ? isEditMode ? 'Saving...' : 'Enrolling...'
              : isEditMode
              ? 'Save Changes'
              : paymentOption === 'FULL'
              ? 'Enroll & Record Full Payment'
              : paymentOption === 'PARTIAL'
              ? 'Enroll & Record Advance Payment'
              : generateInvoice
              ? 'Enroll & Generate Invoice'
              : 'Enroll Student'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateEnrollmentModal;
