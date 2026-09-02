import React, { useState } from 'react';
import { Mail, Printer, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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
              margin: 12mm 15mm;
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
        <body class="p-4 bg-white">
          <div style="width: 100%; max-width: 100%;">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 300);
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
      setEmailStatusMessage('Invoice email sent successfully to student!');
      setTimeout(() => setEmailStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to send invoice email:', err);
      alert(err?.response?.data?.message || 'Failed to send email. Please verify SMTP settings.');
    } finally {
      setSendingEmail(false);
    }
  };

  const isPaid = invoice.status === 'PAID';
  const isOverdue = !isPaid && (invoice.is_overdue || new Date(invoice.due_date) < new Date());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 border border-gray-300 shadow-2xl bg-white [&>button:last-child]:no-print">
        {/* Full-Page Print Media Styles */}
        <style>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
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

        {/* Professional Invoice Sheet Container */}
        <div id="invoice-printable-area" className="p-8 sm:p-10 space-y-7 bg-white text-slate-900 w-full font-sans">
          
          {/* 1. Header: Logo & Academy Info (Left) | INVOICE Title, Meta & Status (Right) */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-6">
            
            {/* Left: Organization Header */}
            <div className="space-y-2 max-w-sm">
              <div className="flex items-center gap-2">
                <img
                  src="/studyasan-logo.png"
                  alt="StudyAsan Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="text-xs text-gray-600 leading-relaxed pt-1">
                <p className="font-bold text-gray-900 text-sm">StudyAsan Academy</p>
                <p className="mt-0.5">
                  Jawahar jyoti , damuadhunga, behind hydil Devkhadi, Kathgodam, Haldwani, Bamori Malli, Uttarakhand 263126
                </p>
                <p className="mt-1 text-gray-500">
                  <span className="font-medium text-gray-700">Email:</span> billing@studyasan.com &nbsp;|&nbsp; <span className="font-medium text-gray-700">Web:</span> www.studyasan.com
                </p>
              </div>
            </div>

            {/* Right: Invoice Label & Document Meta */}
            <div className="text-left sm:text-right space-y-1.5 flex-shrink-0">
              <div className="flex items-center sm:justify-end gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">INVOICE</h1>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 size={12} /> PAID
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                    <AlertTriangle size={12} /> OVERDUE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock size={12} /> PENDING
                  </span>
                )}
              </div>

              <p className="font-mono text-sm font-bold text-gray-800 pt-1">
                <span className="text-gray-400 font-sans font-normal text-xs uppercase tracking-wider">Invoice No:&nbsp;</span>
                {invoice.invoice_number}
              </p>

              <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                <p>
                  <span className="text-gray-500">Invoice Date:</span>{' '}
                  <span className="font-semibold text-gray-800">{formatDate(invoice.issue_date)}</span>
                </p>
                <p>
                  <span className="text-gray-500">Due Date:</span>{' '}
                  <span className="font-semibold text-gray-800">{formatDate(invoice.due_date)}</span>
                </p>
                {invoice.paid_date && (
                  <p>
                    <span className="text-gray-500">Payment Date:</span>{' '}
                    <span className="font-semibold text-emerald-700">{formatDate(invoice.paid_date)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Email dispatch alert */}
          {emailStatusMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium p-3 rounded-lg flex items-center gap-2 no-print">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {emailStatusMessage}
            </div>
          )}

          {/* 2. Billing Meta: Billed To (Left) & Payment Details (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            {/* Student Details */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Billed To (Student)</p>
              <h3 className="text-base font-bold text-gray-900">
                {invoice.student?.user?.name || 'Student Name'}
              </h3>
              <div className="text-xs text-gray-600 space-y-0.5 pt-0.5">
                <p>
                  <span className="text-gray-500">Email:</span> {invoice.student?.user?.email || 'N/A'}
                </p>
                {invoice.student?.user?.phone && (
                  <p>
                    <span className="text-gray-500">Phone:</span> {invoice.student.user.phone}
                  </p>
                )}
                <p className="text-gray-700 font-medium pt-1">
                  {[
                    invoice.student?.class?.name ? `Class: ${invoice.student.class.name}` : null,
                    invoice.student?.board?.name ? `Board: ${invoice.student.board.name}` : null,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
                {invoice.student?.school && (
                  <p className="text-gray-500 text-[11px]">
                    School: {invoice.student.school}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Meta */}
            <div className="sm:text-right space-y-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payment Details</p>
              <div className="text-xs text-gray-600 space-y-1 pt-1">
                <p>
                  <span className="text-gray-500">Payment Status:</span>{' '}
                  <span className="font-semibold text-gray-900">{isPaid ? 'Paid in Full' : 'Payment Awaited'}</span>
                </p>
                {invoice.payment_method && (
                  <p>
                    <span className="text-gray-500">Method:</span>{' '}
                    <span className="font-semibold text-gray-900">{invoice.payment_method}</span>
                  </p>
                )}
                {invoice.transaction_id && (
                  <p>
                    <span className="text-gray-500">Ref / Txn ID:</span>{' '}
                    <span className="font-mono text-gray-800">{invoice.transaction_id}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Items Table: Standard Clean Corporate Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-t-2 border-b-2 border-gray-900 bg-gray-50 text-gray-800 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-8 text-center text-gray-500">#</th>
                  <th className="py-2.5 px-3">Item / Service Description</th>
                  <th className="py-2.5 px-3 text-center w-12">Qty</th>
                  <th className="py-2.5 px-3 text-right w-24">Rate / MRP</th>
                  <th className="py-2.5 px-3 text-right w-24">Discount</th>
                  <th className="py-2.5 px-3 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, index) => {
                    const originalPrice = item.actual_price || item.unit_price || 0;
                    const lineTotal = item.total ?? (item.unit_price * (item.quantity || 1) - (item.discount || 0));
                    const discountAmt = item.discount > 0 ? item.discount : (originalPrice > lineTotal ? originalPrice - lineTotal : 0);

                    return (
                      <tr key={item.id || index} className="text-gray-800">
                        <td className="py-3 px-3 text-center text-gray-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-gray-900 text-xs sm:text-sm">{item.item_name}</div>
                          <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                            {item.type ? item.type.replace('_', ' ') : 'ENROLLMENT'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-gray-700">
                          {item.quantity || 1}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-gray-700">
                          ₹{originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-medium">
                          {discountAmt > 0 ? (
                            <span className="text-emerald-700 font-semibold">
                              - ₹{discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-gray-900 text-xs sm:text-sm">
                          ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No line items recorded for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Bottom Section: Terms & Notes (Left) | Financial Totals (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2 items-start border-t border-gray-200">
            {/* Left: Notes and Terms */}
            <div className="space-y-3 text-xs text-gray-600">
              {invoice.notes && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wider mb-0.5">Notes:</p>
                  <p className="leading-relaxed">{invoice.notes}</p>
                </div>
              )}

              <div className="text-[11px] text-gray-500 space-y-1">
                <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Terms & Conditions:</p>
                <p>1. Payments are due by the specified due date.</p>
                <p>2. Online payments can be made via UPI, Net Banking, or Cards.</p>
                <p className="italic pt-2 text-gray-400">
                  This is a computer-generated invoice and requires no physical signature.
                </p>
              </div>
            </div>

            {/* Right: Subtotal, Discount & Total Amount */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
                <span>Subtotal (MRP):</span>
                <span className="font-semibold text-gray-900">
                  ₹{(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {invoice.discount_amount > 0 && (
                <div className="flex justify-between py-1 text-emerald-700 border-b border-gray-100">
                  <span>Total Discount:</span>
                  <span className="font-semibold">
                    - ₹{invoice.discount_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 border-b-2 border-gray-900 text-sm font-bold text-gray-900">
                <span className="uppercase tracking-wider text-xs">Total Amount Due:</span>
                <span className="text-base sm:text-lg font-black text-[#0276D3]">
                  ₹{(invoice.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 5. Modal Footer Action Bar (Hidden during Print) */}
        <div className="no-print px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="h-9 px-4 text-xs rounded-lg border-gray-300 text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
            >
              <Mail className="w-3.5 h-3.5 text-[#0276D3]" />
              {sendingEmail ? 'Sending...' : 'Mail Invoice to Student'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-4 text-xs rounded-lg border-gray-300 text-gray-700 hover:bg-gray-100 font-medium flex items-center gap-2"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600" /> Print / Save PDF
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-5 text-xs rounded-lg border-gray-300 text-gray-700 hover:bg-gray-100 w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDetailModal;
