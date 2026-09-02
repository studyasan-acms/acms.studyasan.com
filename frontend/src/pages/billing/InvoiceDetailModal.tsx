import React, { useState } from 'react';
import { Mail, Printer, CheckCircle2, Clock, AlertTriangle, Building2, User } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { invoiceService } from '@/services/api';
import type { Invoice } from '@/types';

interface InvoiceDetailModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  open,
  onClose,
  invoice,
}) => {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

  if (!invoice) return null;

  const formatDate = (d: string | null | undefined) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-printable-area');
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Invoice - ${invoice.invoice_number}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 14mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #0f172a;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          </style>
        </head>
        <body class="p-2">
          <div style="width: 100%; max-width: 100%;">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 350);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    setEmailStatusMessage(null);
    try {
      await invoiceService.sendEmail(invoice.id);
      setEmailStatusMessage('Invoice email dispatched successfully to student!');
      setTimeout(() => setEmailStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to send invoice email:', err);
      alert(err?.response?.data?.message || 'Failed to dispatch email. Please verify SMTP settings.');
    } finally {
      setSendingEmail(false);
    }
  };

  const isPaid = invoice.status === 'PAID';
  const isOverdue = !isPaid && (invoice.is_overdue || new Date(invoice.due_date) < new Date());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl p-0 border border-gray-200 shadow-2xl bg-white [&>button:last-child]:no-print">
        {/* Full-Page Print Media Styles */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body * {
              visibility: hidden !important;
            }
            #invoice-printable-area,
            #invoice-printable-area * {
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #invoice-printable-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            div[role="dialog"] {
              position: static !important;
              transform: none !important;
              left: auto !important;
              top: auto !important;
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            div[role="dialog"] > button,
            button[class*="absolute"],
            .no-print,
            [data-radix-dialog-overlay] {
              display: none !important;
              visibility: hidden !important;
            }
          }
        `}</style>

        {/* Printable Invoice Container — Covers Full Page Width */}
        <div id="invoice-printable-area" className="p-6 sm:p-8 space-y-6 w-full">
          {/* Top Header Banner — Solid StudyAsan Blue */}
          <div
            style={{ backgroundColor: '#0276D3' }}
            className="rounded-2xl p-6 text-white shadow-md relative overflow-hidden"
          >
            {/* Ambient background decoration */}
            <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-lg pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              {/* Left Side: Transparent Logo on Blue + Company Info */}
              <div className="space-y-2.5">
                <div className="inline-flex items-center">
                  <img
                    src="/studyasan-logo.png"
                    alt="StudyAsan Logo"
                    className="h-11 sm:h-12 w-auto object-contain drop-shadow-sm"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">StudyAsan Academy</h3>
                  <p className="text-xs text-blue-100 font-medium">The Path To Success</p>
                  <p className="text-[11px] text-blue-200 mt-0.5 flex items-center gap-2">
                    <span>billing@studyasan.com</span>
                    <span>•</span>
                    <span>www.studyasan.com</span>
                  </p>
                </div>
              </div>

              {/* Right Side: INVOICE title, number, dates & status */}
              <div className="text-left sm:text-right space-y-2">
                <div className="flex items-center sm:justify-end gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black tracking-widest text-white">INVOICE</span>
                  {isPaid ? (
                    <span
                      style={{ backgroundColor: '#10B981' }}
                      className="px-3 py-1 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 size={12} /> PAID
                    </span>
                  ) : isOverdue ? (
                    <span
                      style={{ backgroundColor: '#EF4444' }}
                      className="px-3 py-1 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <AlertTriangle size={12} /> OVERDUE
                    </span>
                  ) : (
                    <span
                      style={{ backgroundColor: '#eca209' }}
                      className="px-3 py-1 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Clock size={12} /> PENDING
                    </span>
                  )}
                </div>

                <div className="inline-block bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-lg border border-white/30">
                  <span className="font-mono text-sm font-bold text-white tracking-wider">
                    {invoice.invoice_number}
                  </span>
                </div>

                <div className="text-xs text-blue-100 space-y-0.5 pt-1">
                  <p>
                    <span className="text-blue-200 font-medium">Invoice Date: </span>
                    <span className="font-semibold text-white">{formatDate(invoice.issue_date)}</span>
                  </p>
                  <p>
                    <span className="text-blue-200 font-medium">Due Date: </span>
                    <span className="font-semibold text-white">{formatDate(invoice.due_date)}</span>
                  </p>
                  {invoice.paid_date && (
                    <p>
                      <span className="text-blue-200 font-medium">Paid On: </span>
                      <span className="font-semibold text-emerald-200">{formatDate(invoice.paid_date)}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Email status feedback banner */}
          {emailStatusMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2 shadow-sm animate-fade-in no-print">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {emailStatusMessage}
            </div>
          )}

          {/* FROM & BILLED TO Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FROM Card */}
            <div className="bg-gray-50/90 rounded-2xl p-4 sm:p-5 border border-gray-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0276D3] uppercase tracking-wider">
                <Building2 size={13} />
                <span>From</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">StudyAsan Academy</h4>
                <p className="text-xs text-gray-500 mt-0.5">StudyAsan Learning Technologies Pvt. Ltd.</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  123 Education Hub, Knowledge Park<br />
                  New Delhi, India
                </p>
                <p className="text-xs text-gray-600 mt-1.5">
                  <span className="text-gray-400 font-medium">Email: </span>
                  billing@studyasan.com
                </p>
                <p className="text-xs text-gray-600">
                  <span className="text-gray-400 font-medium">Web: </span>
                  www.studyasan.com
                </p>
              </div>
            </div>

            {/* BILLED TO Card */}
            <div className="bg-blue-50/40 rounded-2xl p-4 sm:p-5 border border-blue-200/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0276D3] uppercase tracking-wider">
                <User size={13} />
                <span>Billed To (Student)</span>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">
                  {invoice.student?.user?.name || 'Student'}
                </h4>
                <p className="text-xs text-gray-600 mt-0.5">
                  <span className="text-gray-400 font-medium">Email: </span>
                  {invoice.student?.user?.email || 'N/A'}
                </p>
                {invoice.student?.user?.phone && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    <span className="text-gray-400 font-medium">Phone: </span>
                    <span className="font-mono">{invoice.student.user.phone}</span>
                  </p>
                )}

                <div className="mt-2.5 pt-2 border-t border-blue-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Class</span>
                    <span className="font-medium text-gray-800">{invoice.student?.class?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">Board</span>
                    <span className="font-medium text-gray-800">{invoice.student?.board?.name || 'N/A'}</span>
                  </div>
                  {invoice.student?.school && (
                    <div className="col-span-2">
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">School / Address</span>
                      <span className="font-medium text-gray-800">{invoice.student.school}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[11px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center text-gray-400">#</th>
                  <th className="py-3.5 px-4">Item Description</th>
                  <th className="py-3.5 px-3 text-center w-14">Qty</th>
                  <th className="py-3.5 px-4 text-right w-24">MRP / Price</th>
                  <th className="py-3.5 px-4 text-right w-24">Discount</th>
                  <th className="py-3.5 px-4 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => {
                    const itemDiscount = item.discount || 0;
                    const originalPrice = item.actual_price || item.unit_price || 0;
                    return (
                      <tr key={item.id || index} className="hover:bg-blue-50/30 transition-colors">
                        <td className="py-3.5 px-4 text-center text-gray-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm">{item.item_name}</span>
                            <span className="inline-block mt-0.5 text-[10px] font-semibold text-[#0276D3] uppercase tracking-wider">
                              {item.type ? item.type.replace('_', ' ') : 'ENROLLMENT'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-700 font-semibold text-sm">
                          {item.quantity || 1}
                        </td>
                        <td className="py-3.5 px-4 text-right text-gray-700 font-medium">
                          ₹{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          {itemDiscount > 0 ? (
                            <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              - ₹{itemDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900 text-sm">
                          ₹{(item.total || item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No line items specified.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Left: Notes & Payment details */}
            <div className="space-y-3">
              {invoice.notes && (
                <div className="bg-blue-50/50 border-l-4 border-[#0276D3] p-3.5 rounded-r-xl text-xs space-y-1">
                  <p className="font-bold text-[#0276D3] uppercase text-[10px] tracking-wider">Notes & Remarks</p>
                  <p className="text-gray-700 leading-relaxed">{invoice.notes}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-3.5 text-xs text-gray-500 space-y-1 border border-gray-100">
                <p className="font-semibold text-gray-700">Payment Terms</p>
                <p>Please make payment before the due date. Payments can be completed online via UPI, Net Banking, or Debit/Credit Card.</p>
                {invoice.payment_method && (
                  <p className="pt-1 text-[#0276D3] font-medium">
                    Payment Method: <span className="font-semibold text-gray-800">{invoice.payment_method}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right: Calculations Summary */}
            <div className="bg-gray-50/90 rounded-2xl p-5 border border-gray-200 text-xs space-y-2.5">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (MRP):</span>
                <span className="font-semibold text-gray-900">
                  ₹{(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <span>Total Discount Applied:</span>
                  <span className="font-bold">
                    - ₹{invoice.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t-2 border-gray-200 flex justify-between items-baseline">
                <span className="font-bold text-gray-900 text-sm">Total Payable:</span>
                <span className="font-black text-[#0276D3] text-xl">
                  ₹{(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Action Buttons Footer (Hidden during Print) */}
        <div className="no-print px-6 py-4 border-t border-gray-200 bg-gray-50/80 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="h-9 px-4 text-xs rounded-xl border-[#0276D3]/30 bg-blue-50 text-[#0276D3] hover:bg-blue-100 font-semibold flex items-center gap-2"
            >
              <Mail className="w-3.5 h-3.5" />
              {sendingEmail ? 'Sending...' : 'Mail to Student'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-4 text-xs rounded-xl border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold flex items-center gap-2"
            >
              <Printer className="w-3.5 h-3.5" /> Print Invoice
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-5 text-xs rounded-xl border-gray-200 text-gray-600 hover:bg-gray-100 w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailModal;
