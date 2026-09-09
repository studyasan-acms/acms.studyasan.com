import React, { useState, useEffect } from 'react';
import { Mail, Printer, CheckCircle2, Landmark, QrCode, FileText, Receipt, Download, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { invoiceService } from '@/services/api';
import type { Invoice, InvoiceSetting } from '@/types';

interface InvoiceDetailModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onStatusChange?: () => void;
  initialMode?: 'INVOICE' | 'QUOTATION' | 'RECEIPT';
  autoPrint?: boolean;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  open,
  onClose,
  invoice,
  initialMode = 'INVOICE',
  autoPrint = false,
}) => {
  const [mode, setMode] = useState<'INVOICE' | 'QUOTATION' | 'RECEIPT'>(initialMode);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<InvoiceSetting | null>(null);

  useEffect(() => {
    if (open) {
      // If invoice is paid or partially paid and no specific initialMode passed, default to RECEIPT or initialMode
      if (initialMode) {
        setMode(initialMode);
      } else if (invoice?.status === 'PAID' || invoice?.status === 'PARTIALLY_PAID') {
        setMode('RECEIPT');
      } else {
        setMode('INVOICE');
      }

      invoiceService
        .getSettings()
        .then((res) => {
          if (res.data) setSettings(res.data);
        })
        .catch(() => {});
    }
  }, [open, initialMode, invoice?.status]);

  const isQuotation = mode === 'QUOTATION';
  const isReceipt = mode === 'RECEIPT';

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

  const docNumber = invoice
    ? isReceipt
      ? (invoice.receipt_number || invoice.invoice_number.replace(/^INV-/, 'RCP-'))
      : isQuotation
      ? invoice.invoice_number.replace(/^INV-/, 'QT-')
      : invoice.invoice_number
    : '';

  const handlePrint = () => {
    if (!invoice) return;
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

    const docTitle = isReceipt
      ? `Payment Receipt - ${docNumber} - ${invoice.student?.user?.name || 'Student'}`
      : isQuotation
      ? `Quotation - ${docNumber} - ${invoice.student?.user?.name || 'Student'}`
      : `Invoice - ${invoice.invoice_number} - ${invoice.student?.user?.name || 'Student'}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${docTitle}</title>
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

  // Auto-print if requested (e.g. from immediate Download Quotation / Receipt)
  useEffect(() => {
    if (open && autoPrint && settings && invoice) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [open, autoPrint, Boolean(settings), Boolean(invoice)]);

  const handleSendEmail = async () => {
    if (!invoice) return;
    setSendingEmail(true);
    setEmailStatusMessage(null);
    try {
      if (isReceipt) {
        await invoiceService.sendReceiptEmail(invoice.id);
        setEmailStatusMessage('Payment receipt email dispatched to student successfully!');
      } else {
        await invoiceService.sendEmail(invoice.id, { is_quotation: isQuotation });
        setEmailStatusMessage(
          isQuotation
            ? 'Quotation email dispatched to student successfully!'
            : 'Invoice email dispatched to student successfully!'
        );
      }
      setTimeout(() => setEmailStatusMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to send email:', err);
      alert(err?.response?.data?.message || 'Failed to send email. Please verify SMTP settings.');
    } finally {
      setSendingEmail(false);
    }
  };

  if (!invoice) return null;

  const isPaid = invoice.status === 'PAID';
  const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID';

  // Financial calculations with optional GST
  const subtotal = invoice.subtotal || 0;
  const discount = invoice.discount_amount || 0;
  const taxableAmount = Math.max(0, subtotal - discount);
  const includeGst = Boolean(settings?.include_gst);
  const gstRate = settings?.gst_percentage ?? 18;
  const gstAmount = includeGst ? (taxableAmount * gstRate) / 100 : 0;
  const finalTotal = includeGst ? taxableAmount + gstAmount : (invoice.total_amount || taxableAmount);

  const amountPaid = isPaid
    ? finalTotal
    : isPartiallyPaid
    ? (invoice.amount_paid ?? 0)
    : 0;

  const balanceDue = Math.max(0, finalTotal - amountPaid);

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

        {/* Mode Switcher Tabs (Hidden during Print) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 sm:px-8 py-3.5 border-b border-gray-200 bg-slate-50/80">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('INVOICE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isQuotation && !isReceipt
                  ? 'bg-white text-saBlue shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Tax Invoice
            </button>
            <button
              type="button"
              onClick={() => setMode('RECEIPT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isReceipt
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Payment Receipt
            </button>
            <button
              type="button"
              onClick={() => setMode('QUOTATION')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isQuotation
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Fee Quotation
            </button>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Displaying as:{' '}
            <span
              className={
                isReceipt
                  ? 'text-emerald-700 font-bold'
                  : isQuotation
                  ? 'text-amber-800 font-bold'
                  : 'text-saBlue font-bold'
              }
            >
              {isReceipt ? 'Official Fee Payment Receipt' : isQuotation ? 'Official Fee Quotation' : 'Standard Tax Invoice'}
            </span>
          </div>
        </div>

        {/* Printable Sheet Container */}
        <div id="invoice-printable-area" className="p-8 sm:p-10 space-y-7 bg-white text-slate-900 w-full font-sans">
          
          {/* 1. Header: Logo & Academy Info (Left) | INVOICE / RECEIPT / QUOTATION Title & Meta (Right) */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-gray-200 pb-6">
            
            {/* Left: Organization Header */}
            <div className="space-y-2 max-w-sm">
              <div className="flex items-center gap-2">
                {settings?.logo_url ? (
                  <div className="h-12 max-w-[180px] inline-flex items-center justify-start">
                    <img
                      src={settings.logo_url}
                      alt={settings.business_name || 'Organization Logo'}
                      className="max-h-12 max-w-[180px] object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="bg-[#0276D3] px-3.5 py-2 rounded-xl inline-flex items-center justify-center shadow-xs">
                    <img
                      src="/studyasan-logo.png"
                      alt="StudyAsan Logo"
                      className="h-8 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600 leading-relaxed pt-1">
                <p className="font-extrabold text-gray-900 text-base tracking-tight">
                  {settings?.business_name || 'StudyAsan Academy'}
                </p>
                {settings?.org_subtitle && (
                  <p className="text-[11px] font-semibold text-saBlueDark italic -mt-0.5 mb-1">
                    {settings.org_subtitle}
                  </p>
                )}
                <p className="mt-0.5">
                  {settings?.address ||
                    'Jawahar jyoti , damuadhunga, behind hydil Devkhadi, Kathgodam, Haldwani, Bamori Malli, Uttarakhand 263126'}
                </p>
                <p className="mt-1 text-gray-500">
                  <span className="font-medium text-gray-700">Email:</span>{' '}
                  {settings?.email || 'contact@studyasan.com'} &nbsp;|&nbsp;{' '}
                  <span className="font-medium text-gray-700">Web:</span>{' '}
                  {settings?.website || 'www.studyasan.com'}
                </p>
                {settings?.phone && (
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-700">Phone:</span> {settings.phone}
                  </p>
                )}
                {includeGst && settings?.gst_number && (
                  <p className="mt-1">
                    <span className="font-bold text-gray-900">GSTIN:</span>{' '}
                    <span className="font-mono font-semibold text-gray-700">{settings.gst_number}</span>
                  </p>
                )}
                {settings?.hsn_sac_code && (
                  <p className="mt-0.5">
                    <span className="font-bold text-gray-900">HSN/SAC:</span>{' '}
                    <span className="font-mono font-semibold text-gray-700">{settings.hsn_sac_code}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right: Title & Document Meta */}
            <div className="text-left sm:text-right space-y-1.5 flex-shrink-0">
              <div className="flex items-center sm:justify-end">
                <h1
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    isReceipt ? 'text-emerald-700' : isQuotation ? 'text-amber-800' : 'text-slate-900'
                  }`}
                >
                  {isReceipt ? 'PAYMENT RECEIPT' : isQuotation ? 'QUOTATION' : 'TAX INVOICE'}
                </h1>
              </div>

              {isReceipt && (
                <div className="sm:text-right">
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {isPartiallyPaid ? 'Advance Fee Receipt' : 'Full Payment Received'}
                  </span>
                </div>
              )}

              {isQuotation && (
                <div className="sm:text-right">
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-200">
                    Fee Quotation & Estimate
                  </span>
                </div>
              )}

              <p className="font-mono text-sm font-bold text-gray-800 pt-1">
                <span className="text-gray-400 font-sans font-normal text-xs uppercase tracking-wider">
                  {isReceipt ? 'Receipt No:\u00A0' : isQuotation ? 'Quotation No:\u00A0' : 'Invoice No:\u00A0'}
                </span>
                <span className={isReceipt ? 'text-emerald-800' : isQuotation ? 'text-amber-900' : 'text-gray-800'}>
                  {docNumber}
                </span>
              </p>

              <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                <p>
                  <span className="text-gray-500">
                    {isReceipt ? 'Receipt Date:' : isQuotation ? 'Quotation Date:' : 'Invoice Date:'}
                  </span>{' '}
                  <span className="font-semibold text-gray-800">
                    {formatDate(isReceipt && invoice.paid_date ? invoice.paid_date : invoice.issue_date)}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">
                    {isPartiallyPaid ? 'Next Due Date:' : isQuotation ? 'Valid Until:' : 'Due Date:'}
                  </span>{' '}
                  <span className="font-semibold text-gray-800">{formatDate(invoice.due_date)}</span>
                </p>
                {invoice.paid_date && (
                  <p>
                    <span className="text-gray-500">Payment Received On:</span>{' '}
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

          {/* 2. Billing Meta: Student & Payment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-1">
            {/* Student Details */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {isReceipt ? 'Received From (Student)' : isQuotation ? 'Quotation Prepared For' : 'Billed To (Student)'}
              </p>
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

            {/* Payment / Validity Meta */}
            <div className="sm:text-right space-y-1">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {isReceipt ? 'Payment & Settlement Summary' : isQuotation ? 'Quotation Status' : 'Payment Status'}
              </p>
              <div className="text-xs text-gray-600 space-y-1 pt-1">
                <p>
                  <span className="text-gray-500">Status:</span>{' '}
                  <span className="font-semibold text-gray-900">
                    {isPaid
                      ? 'Fully Paid (Settled)'
                      : isPartiallyPaid
                      ? 'Partially Paid (Advance Received)'
                      : isQuotation
                      ? 'Fee Estimate (Valid for Admission)'
                      : 'Payment Awaited'}
                  </span>
                </p>
                {invoice.payment_method && (
                  <p>
                    <span className="text-gray-500">Payment Mode:</span>{' '}
                    <span className="font-semibold text-gray-900">{invoice.payment_method}</span>
                  </p>
                )}
                {invoice.transaction_id && (
                  <p>
                    <span className="text-gray-500">Txn / Ref ID:</span>{' '}
                    <span className="font-mono text-gray-800">{invoice.transaction_id}</span>
                  </p>
                )}
                {isPartiallyPaid && (
                  <p className="text-amber-800 font-bold">
                    Next Due Date: {formatDate(invoice.due_date)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Items Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-t-2 border-b-2 border-gray-900 bg-gray-50 text-gray-800 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-8 text-center text-gray-500">#</th>
                  <th className="py-2.5 px-3">Item / Course Description</th>
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
                          <div className="text-[10px] text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                            <span>{item.type ? item.type.replace('_', ' ') : 'ENROLLMENT'}</span>
                            {settings?.hsn_sac_code && (
                              <span className="text-gray-400 font-mono font-normal">| HSN/SAC: {settings.hsn_sac_code}</span>
                            )}
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
                        <td className="py-3 px-3 text-right font-bold text-gray-900 text-xs sm:text-sm font-mono">
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

          {/* 4. Bottom Section: Notes & Bank/UPI Remittance (Left) | Totals with Advance Paid & Balance Due (Right) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2 items-start border-t border-gray-200">
            {/* Left: Notes, Bank/UPI Remittance, and Terms */}
            <div className="space-y-3 text-xs text-gray-600">
              {/* Bank & UPI Details */}
              {(settings?.bank_name || settings?.upi_id) && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-saBlue" />{' '}
                    {isReceipt ? 'Institute Bank & UPI Details:' : 'Payment Remittance Details:'}
                  </p>
                  {settings.bank_name && (
                    <div className="space-y-0.5 text-slate-700">
                      <p><span className="font-semibold text-slate-500">Bank:</span> {settings.bank_name} {settings.branch_name && `(${settings.branch_name})`}</p>
                      {settings.account_number && <p><span className="font-semibold text-slate-500">A/C No:</span> <span className="font-mono font-bold text-slate-900">{settings.account_number}</span></p>}
                      {settings.account_holder_name && <p><span className="font-semibold text-slate-500">A/C Name:</span> {settings.account_holder_name}</p>}
                      {settings.ifsc_code && <p><span className="font-semibold text-slate-500">IFSC:</span> <span className="font-mono font-bold text-slate-900">{settings.ifsc_code}</span></p>}
                    </div>
                  )}
                  {settings.upi_id && (
                    <div className="pt-1.5 mt-1 border-t border-slate-200 flex items-center gap-1 text-slate-700">
                      <QrCode className="w-3.5 h-3.5 text-saVividOrange" />
                      <span className="font-semibold text-slate-500">UPI ID:</span>
                      <span className="font-mono font-bold text-saBlue">{settings.upi_id}</span>
                      {settings.upi_name && <span className="text-slate-400">({settings.upi_name})</span>}
                    </div>
                  )}
                </div>
              )}

              {invoice.notes && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wider mb-0.5">Notes:</p>
                  <p className="leading-relaxed">{invoice.notes}</p>
                </div>
              )}

              <div className="text-[11px] text-gray-500 space-y-1">
                <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Terms & Conditions:</p>
                {isReceipt ? (
                  <>
                    <p>1. This payment receipt serves as official proof of fee acknowledgment.</p>
                    {isPartiallyPaid && (
                      <p>2. Please clear remaining balance dues of ₹{balanceDue.toFixed(2)} on or before {formatDate(invoice.due_date)}.</p>
                    )}
                    <p className="italic pt-2 text-gray-400">
                      This is a computer-generated fee payment receipt and requires no physical signature.
                    </p>
                  </>
                ) : isQuotation ? (
                  <>
                    <p>1. This fee quotation is valid until the specified date ({formatDate(invoice.due_date)}).</p>
                    <p>2. Batch seat reservation and admission will be confirmed upon fee remittance.</p>
                    <p className="italic pt-2 text-gray-400">
                      This is a computer-generated fee quotation and requires no physical signature.
                    </p>
                  </>
                ) : (
                  <>
                    <p>1. Payments are due by the specified due date.</p>
                    <p>2. Online payments can be made via UPI, Net Banking, or Cards.</p>
                    <p className="italic pt-2 text-gray-400">
                      This is a computer-generated invoice and requires no physical signature.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Right: Subtotal, Discount, Total, Amount Received, and Remaining Balance Due */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
                <span>Subtotal (MRP):</span>
                <span className="font-semibold text-gray-900 font-mono">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between py-1 text-emerald-700 border-b border-gray-100">
                  <span>Total Discount:</span>
                  <span className="font-semibold font-mono">
                    - ₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {includeGst && (
                <>
                  <div className="flex justify-between py-1 text-gray-600 border-b border-gray-100">
                    <span>Taxable Amount:</span>
                    <span className="font-semibold text-gray-900 font-mono">
                      ₹{taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-slate-700 border-b border-gray-100">
                    <span>GST ({gstRate}%):</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between py-2 border-t-2 border-b border-gray-900 text-sm font-bold text-gray-900">
                <span className="uppercase tracking-wider text-xs">
                  {isQuotation
                    ? 'Total Quoted Fee:'
                    : isReceipt
                    ? 'Total Invoiced Fee:'
                    : 'Total Amount Due:'}
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
                  ₹{finalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Advance Paid & Remaining Balance Breakdown for Invoices/Receipts */}
              {(isReceipt || isPaid || isPartiallyPaid) && (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 space-y-1 mt-2">
                  <div className="flex justify-between text-emerald-900 font-bold text-xs">
                    <span>Amount Received / Paid:</span>
                    <span className="font-mono text-sm text-emerald-700">
                      ₹{amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {balanceDue > 0 && (
                    <div className="flex justify-between text-amber-900 font-bold text-xs pt-1 border-t border-emerald-200/60">
                      <span>Remaining Balance Due:</span>
                      <span className="font-mono text-sm text-amber-700">
                        ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 5. Modal Footer Action Bar (Hidden during Print) */}
        <div className="no-print px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className={`h-9 px-4 text-xs rounded-lg font-medium flex items-center gap-2 ${
                isReceipt
                  ? 'border-emerald-300 text-emerald-900 hover:bg-emerald-50'
                  : isQuotation
                  ? 'border-amber-300 text-amber-900 hover:bg-amber-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Mail
                className={`w-3.5 h-3.5 ${
                  isReceipt ? 'text-emerald-600' : isQuotation ? 'text-amber-600' : 'text-[#0276D3]'
                }`}
              />
              {sendingEmail
                ? 'Sending...'
                : isReceipt
                ? 'Email Receipt to Student'
                : isQuotation
                ? 'Mail Quotation to Student'
                : 'Mail Invoice to Student'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className={`h-9 px-4 text-xs rounded-lg font-bold flex items-center gap-2 ${
                isReceipt
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : isQuotation
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                  : 'bg-saBlue hover:bg-saBlueDarkHover text-white shadow-xs'
              }`}
            >
              {isReceipt ? <Download className="w-3.5 h-3.5" /> : isQuotation ? <Download className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
              {isReceipt ? 'Print / Download Receipt' : isQuotation ? 'Download Quotation (PDF)' : 'Print / Save PDF'}
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

