import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Calendar, DollarSign, User, BookOpen, Layers, Trophy, Search, Printer, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  studentService,
  subjectService,
  testSeriesService,
  activityGroupService,
  invoiceService,
} from '@/services/api';
import type { Student, Subject, Invoice } from '@/types';

interface CreateEditInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (createdInvoice?: Invoice, downloadImmediately?: boolean, mode?: 'INVOICE' | 'QUOTATION') => void;
  editingInvoice?: Invoice | null;
}

interface LineItemForm {
  type: 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';
  id: number;
  name: string;
  unit_price: number;
  actual_price?: number;
  quantity: number;
  discount: number;
}

export const CreateEditInvoiceModal: React.FC<CreateEditInvoiceModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingInvoice,
}) => {
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Available options
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [testSeriesList, setTestSeriesList] = useState<any[]>([]);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);

  // Form states
  const [studentId, setStudentId] = useState<number>(0);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'PENDING' | 'PAID'>('PENDING');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [openDownloadAfterSave, setOpenDownloadAfterSave] = useState(true);

  // Line items
  const [items, setItems] = useState<LineItemForm[]>([]);

  // Add Item selector state
  const [selectedItemType, setSelectedItemType] = useState<'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP'>('SUBJECT');
  const [selectedItemId, setSelectedItemId] = useState<number>(0);

  // Load students and inventory items
  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      setDataLoading(true);
      try {
        const [studentRes, subjectRes, testRes, actRes] = await Promise.all([
          studentService.getAll({ limit: 200 }),
          subjectService.getAll({ limit: 200 }),
          testSeriesService.getAll({ limit: 200 }),
          activityGroupService.getAll({ limit: 200 }),
        ]);

        setStudents(studentRes.data.data || []);
        setSubjects(subjectRes.data.data || []);
        setTestSeriesList(testRes.data.data || []);
        setActivityGroups(actRes.data.activityGroups || []);
      } catch (err) {
        console.error('Error loading inventory for invoice:', err);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [open]);

  // If editing, populate form
  useEffect(() => {
    if (editingInvoice) {
      setStudentId(editingInvoice.student_id);
      setIssueDate(editingInvoice.issue_date.split('T')[0]);
      setDueDate(editingInvoice.due_date.split('T')[0]);
      setStatus(editingInvoice.status === 'PAID' ? 'PAID' : 'PENDING');
      setPaidDate(
        editingInvoice.paid_date ? editingInvoice.paid_date.split('T')[0] : new Date().toISOString().split('T')[0]
      );
      setPaymentMethod(editingInvoice.payment_method || 'UPI');
      setOverallDiscount(editingInvoice.discount_amount || 0);
      setNotes(editingInvoice.notes || '');
      setSendEmail(false);

      if (editingInvoice.items && editingInvoice.items.length > 0) {
        setItems(
          editingInvoice.items.map((i) => ({
            type: i.type,
            id: i.subject_id || i.test_series_id || i.activity_group_id || 0,
            name: i.item_name,
            unit_price: i.unit_price,
            actual_price: i.actual_price || i.unit_price,
            quantity: i.quantity || 1,
            discount: i.discount || 0,
          }))
        );
      }
    } else {
      // Reset form for create
      setStudentId(0);
      setStudentSearch('');
      setIssueDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setStatus('PENDING');
      setPaidDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('UPI');
      setOverallDiscount(0);
      setNotes('');
      setSendEmail(true);
      setItems([]);
    }
  }, [editingInvoice, open]);

  // Handle adding an item to the line items table
  const handleAddItem = () => {
    if (!selectedItemId) return;

    let itemName = '';
    let unitPrice = 0;
    let actualPrice = 0;

    if (selectedItemType === 'SUBJECT') {
      const sub = subjects.find((s) => s.id === selectedItemId);
      if (sub) {
        itemName = sub.name;
        unitPrice = sub.price ?? 0;
        actualPrice = sub.actual_price ?? sub.price ?? 0;
      }
    } else if (selectedItemType === 'TEST_SERIES') {
      const ts = testSeriesList.find((t) => t.id === selectedItemId);
      if (ts) {
        itemName = ts.title;
        unitPrice = ts.price ?? 0;
        actualPrice = ts.actual_price ?? ts.price ?? 0;
      }
    } else if (selectedItemType === 'ACTIVITY_GROUP') {
      const ag = activityGroups.find((a) => a.id === selectedItemId);
      if (ag) {
        itemName = ag.name;
        unitPrice = ag.price ?? 0;
        actualPrice = ag.actual_price ?? ag.price ?? 0;
      }
    }

    // Check if already in list
    const exists = items.some((i) => i.type === selectedItemType && i.id === selectedItemId);
    if (exists) {
      alert('This item is already added to the invoice.');
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        type: selectedItemType,
        id: selectedItemId,
        name: itemName,
        unit_price: unitPrice,
        actual_price: actualPrice,
        quantity: 1,
        discount: 0,
      },
    ]);

    setSelectedItemId(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemPriceChange = (index: number, newPrice: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index].unit_price = Math.max(0, newPrice);
      return updated;
    });
  };

  const handleItemDiscountChange = (index: number, newDiscount: number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index].discount = Math.max(0, newDiscount);
      return updated;
    });
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => {
    const lineTotal = Math.max(0, item.unit_price * item.quantity - item.discount);
    return acc + lineTotal;
  }, 0);

  const totalAmount = Math.max(0, subtotal - Number(overallDiscount || 0));

  const filteredStudents = students.filter((st) => {
    const name = st.user?.name?.toLowerCase() || '';
    const email = st.user?.email?.toLowerCase() || '';
    const q = studentSearch.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const saveInvoice = async (
    triggerDownload: boolean = true,
    targetMode: 'INVOICE' | 'QUOTATION' = 'INVOICE'
  ) => {
    if (!studentId) {
      alert('Please select a student.');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item (Subject, Test Series, or Activity Group).');
      return;
    }

    setLoading(true);
    try {
      const preparedItems = items.map((i) => ({
        type: i.type,
        subject_id: i.type === 'SUBJECT' ? i.id : undefined,
        test_series_id: i.type === 'TEST_SERIES' ? i.id : undefined,
        activity_group_id: i.type === 'ACTIVITY_GROUP' ? i.id : undefined,
        item_name: i.name,
        unit_price: i.unit_price,
        actual_price: i.actual_price,
        quantity: i.quantity,
        discount: i.discount,
      }));

      let resultInvoice: Invoice | undefined;

      if (editingInvoice) {
        const res = await invoiceService.update(editingInvoice.id, {
          student_id: studentId,
          issue_date: issueDate,
          due_date: dueDate,
          status,
          paid_date: status === 'PAID' ? paidDate : undefined,
          discount_amount: Number(overallDiscount || 0),
          payment_method: status === 'PAID' ? paymentMethod : undefined,
          notes,
          items: preparedItems,
        });
        resultInvoice = res.data;
      } else {
        const res = await invoiceService.create({
          student_id: studentId,
          issue_date: issueDate,
          due_date: dueDate,
          status,
          paid_date: status === 'PAID' ? paidDate : undefined,
          discount_amount: Number(overallDiscount || 0),
          payment_method: status === 'PAID' ? paymentMethod : undefined,
          notes,
          send_email: sendEmail,
          items: preparedItems,
        });
        resultInvoice = res.data;
      }

      onSuccess(resultInvoice, triggerDownload, targetMode);
      onClose();
    } catch (err: any) {
      console.error('Failed to save invoice:', err);
      alert(err?.response?.data?.message || 'Failed to save invoice. Please check all fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveInvoice(openDownloadAfterSave, 'INVOICE');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 border-gray-100 shadow-2xl">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-saBlue" />
            {editingInvoice ? `Edit Invoice: ${editingInvoice.invoice_number}` : 'Create Enrollment Invoice'}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            {editingInvoice
              ? 'Update enrolled items, prices, discounts, due dates, and status for this invoice.'
              : 'Combine multiple subjects, test series, and activity groups into a single invoice for a student.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Section 1: Student Selection */}
          <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
            <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-saBlue" /> Select Student <span className="text-red-500">*</span>
            </Label>

            {(() => {
              const selectedStudent = students.find((st) => st.id === studentId) || (editingInvoice?.student as any);

              if (selectedStudent && studentId > 0) {
                return (
                  <div className="flex items-center gap-3.5 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-[#0276D3] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {selectedStudent.user?.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-xs sm:text-sm truncate">
                        {selectedStudent.user?.name}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {selectedStudent.user?.email} • {selectedStudent.class?.name || 'No Class'} {selectedStudent.board?.name ? `(${selectedStudent.board.name})` : ''}
                      </div>
                    </div>
                    {!editingInvoice && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentId(0);
                          setStudentSearch('');
                        }}
                        className="p-1.5 rounded-lg hover:bg-blue-100 text-[#0276D3] transition-colors"
                        title="Change Student"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div ref={studentDropdownRef} className="relative">
                  <div className="flex items-center gap-2.5 border border-gray-200 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-[#0276D3] focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-xs">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setStudentDropdownOpen(true);
                      }}
                      onFocus={() => setStudentDropdownOpen(true)}
                      placeholder="Search and select student by name or email..."
                      className="flex-1 text-xs outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
                    />
                    {studentSearch && (
                      <button
                        type="button"
                        onClick={() => setStudentSearch('')}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {studentDropdownOpen && (
                    <div className="absolute z-50 top-full left-0 mt-1.5 w-full bg-white border border-gray-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto p-1.5 animate-in fade-in-50 zoom-in-95">
                      {filteredStudents.length === 0 ? (
                        <div className="p-3 text-center text-xs text-gray-400">No matching students found</div>
                      ) : (
                        filteredStudents.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              setStudentId(st.id);
                              setStudentDropdownOpen(false);
                              setStudentSearch('');
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50/80 rounded-xl transition-colors text-left"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[#0276D3] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                              {st.user?.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-800 text-xs truncate">{st.user?.name}</div>
                              <div className="text-[11px] text-gray-400 truncate">
                                {st.user?.email} • {st.class?.name || 'No Class'}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>


          {/* Section 2: Items Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-saBlue" /> Enrolled Items (Subjects, Activities, Test Series){' '}
                <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] font-semibold text-saBlue">{items.length} item(s) selected</span>
            </div>

            {/* Add Item Bar */}
            <div className="flex flex-col sm:flex-row gap-2 bg-blue-50/40 p-3 rounded-2xl border border-blue-100/60 items-end sm:items-center">
              {/* Type Switcher */}
              <div className="w-full sm:w-44">
                <Label className="text-[10px] text-gray-500 font-semibold mb-1 block">Item Category</Label>
                <select
                  value={selectedItemType}
                  onChange={(e) => {
                    setSelectedItemType(e.target.value as any);
                    setSelectedItemId(0);
                  }}
                  className="w-full h-8 px-2 text-xs rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-saBlue text-gray-700 font-medium"
                >
                  <option value="SUBJECT">Subject / Course</option>
                  <option value="TEST_SERIES">Test Series</option>
                  <option value="ACTIVITY_GROUP">Activity Group</option>
                </select>
              </div>

              {/* Item Dropdown */}
              <div className="flex-1 w-full">
                <Label className="text-[10px] text-gray-500 font-semibold mb-1 block">Select Item</Label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(Number(e.target.value))}
                  className="w-full h-8 px-2 text-xs rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-saBlue text-gray-700 font-medium"
                >
                  <option value={0}>-- Choose item to add --</option>
                  {selectedItemType === 'SUBJECT' &&
                    subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.class ? `(${sub.class.name})` : ''} - ₹{sub.price ?? 0}
                      </option>
                    ))}
                  {selectedItemType === 'TEST_SERIES' &&
                    testSeriesList.map((ts) => (
                      <option key={ts.id} value={ts.id}>
                        {ts.title} - ₹{ts.price ?? 0}
                      </option>
                    ))}
                  {selectedItemType === 'ACTIVITY_GROUP' &&
                    activityGroups.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} - ₹{ag.price ?? 0}
                      </option>
                    ))}
                </select>
              </div>

              {/* Add Button */}
              <Button
                type="button"
                size="sm"
                onClick={handleAddItem}
                disabled={!selectedItemId}
                className="h-8 px-4 text-xs bg-saBlue hover:bg-saBlue/90 text-white rounded-lg flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>

            {/* Selected Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-gray-400 text-xs">
                No items added to this invoice yet. Use the selector above to add subjects, test series, or activity groups.
              </div>
            ) : (
              <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3 w-28">Price (₹)</th>
                      <th className="py-2.5 px-3 w-28">Discount (₹)</th>
                      <th className="py-2.5 px-3 text-right w-24">Line Total</th>
                      <th className="py-2.5 px-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map((item, idx) => {
                      const lineTotal = Math.max(0, item.unit_price * item.quantity - item.discount);
                      return (
                        <tr key={`${item.type}-${item.id}-${idx}`} className="hover:bg-blue-50/20">
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0.5 border-none ${
                                item.type === 'SUBJECT'
                                  ? 'bg-blue-50 text-saBlue'
                                  : item.type === 'TEST_SERIES'
                                  ? 'bg-amber-50 text-saOrange'
                                  : 'bg-teal-50 text-teal-700'
                              }`}
                            >
                              {item.type.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-800">{item.name}</td>
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              min={0}
                              value={item.unit_price}
                              onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                              className="h-7 text-xs rounded-lg px-2 w-24 bg-white"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <Input
                              type="number"
                              min={0}
                              value={item.discount}
                              onChange={(e) => handleItemDiscountChange(idx, Number(e.target.value))}
                              className="h-7 text-xs rounded-lg px-2 w-24 bg-white text-saOrange"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-800">₹{lineTotal.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Dates, Status & Discounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
            <div>
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                Issue Date
              </Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-9 text-xs rounded-xl bg-white border-gray-200"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="h-9 text-xs rounded-xl bg-white border-gray-200 font-semibold"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                Overall Discount (₹)
              </Label>
              <Input
                type="number"
                min={0}
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs rounded-xl bg-white border-gray-200 text-saOrange font-semibold"
              />
            </div>

            <div>
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                Payment Status
              </Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 px-3 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-saBlue/10 font-bold text-gray-700"
              >
                <option value="PENDING">PENDING (Unpaid)</option>
                <option value="PAID">PAID (Mark Received)</option>
              </select>
            </div>

            {status === 'PAID' && (
              <>
                <div>
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                    Paid Date
                  </Label>
                  <Input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="h-9 text-xs rounded-xl bg-white border-gray-200"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                    Payment Method
                  </Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-saBlue/10 font-medium text-gray-700"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Online">Online Gateway</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Section 4: Notes & Email Toggle */}
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1 block">
                Notes / Terms (Optional)
              </Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add special instructions or invoice remarks..."
                rows={2}
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-saBlue/10 font-medium text-gray-700"
              />
            </div>

            {!editingInvoice && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="openDownloadCheck"
                    checked={openDownloadAfterSave}
                    onChange={(e) => setOpenDownloadAfterSave(e.target.checked)}
                    className="rounded border-gray-300 text-saBlue focus:ring-saBlue h-4 w-4"
                  />
                  <label htmlFor="openDownloadCheck" className="text-xs font-semibold text-gray-700 cursor-pointer flex items-center gap-1.5">
                    <span>Open download / print pop up immediately after creation</span>
                    <span className="text-[10px] bg-blue-100 text-saBlue font-bold px-1.5 py-0.5 rounded-md">Default</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmailCheck"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="rounded border-gray-300 text-saBlue focus:ring-saBlue h-4 w-4"
                  />
                  <label htmlFor="sendEmailCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Send itemized invoice email to student upon creation
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Totals Summary Footer */}
          <div className="bg-gradient-to-r from-blue-50/50 to-orange-50/30 p-4 rounded-2xl border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-gray-500">
              <span>Subtotal: </span>
              <strong className="text-gray-700">₹{subtotal.toFixed(2)}</strong>
              {overallDiscount > 0 && (
                <span className="ml-3 text-saOrange">
                  Discount: <strong>-₹{Number(overallDiscount).toFixed(2)}</strong>
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs uppercase font-bold text-gray-500">Total Invoiced:</span>
              <span className="text-2xl font-black text-saBlue">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 text-xs rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100 w-full sm:w-auto"
            >
              Cancel
            </Button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {!editingInvoice ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || dataLoading}
                    onClick={() => saveInvoice(false)}
                    className="h-10 text-xs px-4 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                  >
                    Create Only
                  </Button>
                  <Button
                    type="button"
                    disabled={loading || dataLoading}
                    onClick={() => saveInvoice(true, 'QUOTATION')}
                    className="h-10 text-xs px-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold shadow-xs flex items-center gap-1.5"
                    title="Generate invoice and download / view as official Fee Quotation"
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    {loading ? 'Creating...' : 'Download Quotation'}
                  </Button>
                  <Button
                    type="button"
                    disabled={loading || dataLoading}
                    onClick={() => saveInvoice(true, 'INVOICE')}
                    className="h-10 text-xs px-5 rounded-xl bg-saBlue hover:bg-saBlueDarkHover text-white font-bold shadow-md shadow-saBlue/20 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    {loading ? 'Creating...' : 'Create & Download / Print'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading || dataLoading}
                    onClick={() => saveInvoice(true, 'QUOTATION')}
                    className="h-10 text-xs px-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-amber-600" />
                    Download Quotation
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || dataLoading}
                    className="h-10 text-xs px-6 rounded-xl bg-saBlue hover:bg-saBlueDarkHover text-white font-bold shadow-md shadow-saBlue/20"
                  >
                    {loading ? 'Saving...' : 'Update Invoice'}
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEditInvoiceModal;
