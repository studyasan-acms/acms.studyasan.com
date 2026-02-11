import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Student } from "@/types";
import { Download, Calculator } from "lucide-react";
import { jsPDF } from "jspdf";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
}

interface InvoiceItem {
  id: string;
  name: string;
  type: "subject" | "activity_group" | "test_series";
  price: number;
  selected: boolean;
}

export default function InvoiceModal({ isOpen, onClose, student }: InvoiceModalProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(() => `#${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`);
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [taxAmount, setTaxAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [applyDiscountOnTax, setApplyDiscountOnTax] = useState(false);

  const currencies = {
    INR: { symbol: '₹', name: 'Indian Rupee' },
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    GBP: { symbol: '£', name: 'British Pound' },
    JPY: { symbol: '¥', name: 'Japanese Yen' },
  };

  // Initialize items when modal opens
  useEffect(() => {
    if (isOpen && student) {
      const invoiceItems: InvoiceItem[] = [];

      // Add unified enrollments
      if (student.enrollments) {
        student.enrollments.forEach((enrollment) => {
          if (enrollment.type === 'SUBJECT' && enrollment.subject) {
            invoiceItems.push({
              id: `subject-${enrollment.id}`,
              name: enrollment.subject.name,
              type: "subject",
              price: 0,
              selected: true,
            });
          } else if (enrollment.type === 'TEST_SERIES' && enrollment.test_series) {
            invoiceItems.push({
              id: `test-series-${enrollment.id}`,
              name: enrollment.test_series.title,
              type: "test_series",
              price: 0,
              selected: true,
            });
          } else if (enrollment.type === 'ACTIVITY_GROUP' && enrollment.activity_group) {
            // Avoid duplicates if added multiple times?
            // Use group ID as key suffix to match legacy behavior
            const itemId = `activity-${enrollment.activity_group.id}`;
            if (!invoiceItems.some(i => i.id === itemId)) {
              invoiceItems.push({
                id: itemId,
                name: enrollment.activity_group.name,
                type: "activity_group",
                price: 0,
                selected: true,
              });
            }
          }
        });
      }

      // Add unique activity groups from legacy activity_enrollments (if any not covered above)
      if (student.activity_enrollments) {
        const uniqueGroups = new Map<number, string>();
        student.activity_enrollments.forEach((enrollment) => {
          if (!uniqueGroups.has(enrollment.activity.group.id)) {
            uniqueGroups.set(enrollment.activity.group.id, enrollment.activity.group.name);
          }
        });

        uniqueGroups.forEach((groupName, groupId) => {
          const itemId = `activity-${groupId}`;
          if (!invoiceItems.some(i => i.id === itemId)) {
            invoiceItems.push({
              id: itemId,
              name: groupName,
              type: "activity_group",
              price: 0,
              selected: true,
            });
          }
        });
      }

      setItems(invoiceItems);
    }
  }, [isOpen, student]);

  const updateItemPrice = (id: string, price: number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, price: Math.max(0, price) } : item
    ));
  };

  const toggleItemSelection = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const selectedItems = items.filter(item => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  // discount can apply to subtotal or to (subtotal + tax) depending on toggle
  const discountBase = applyDiscountOnTax ? (subtotal + Number(taxAmount || 0)) : subtotal;
  const discountAmount = (discountBase * discount) / 100;
  const totalBeforeTax = applyDiscountOnTax ? subtotal + Number(taxAmount || 0) - discountAmount : subtotal - discountAmount;
  const finalTotal = applyDiscountOnTax ? subtotal + Number(taxAmount || 0) - discountAmount : subtotal - discountAmount + Number(taxAmount || 0);
  const balanceDue = finalTotal - Number(amountPaid || 0);

  const formatAmount = (val: number) => {
    if (currency === 'INR') {
      return `${currencies.INR.symbol}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${(currencies as any)[currency]?.symbol || ''}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      // Colors to match sample
      const headerBlue: [number, number, number] = [13, 100, 164];
      const darkText: [number, number, number] = [34, 40, 49];
      const lightGrey: [number, number, number] = [230, 235, 240];

      // (formatAmount is defined outside and reused)

      // Try to load logo from public folder
      const toDataURL = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const blob = await res.blob();
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (err) {
          return null;
        }
      };

      const logoUrl = await toDataURL('/logo.jpg') || await toDataURL('/studyasan-logo.png') || await toDataURL('/studyasan-logo-lady.png');

      // Place logo at top-left and company info below it (no blue background)
      const logoY = 12;
      if (logoUrl) {
        try {
          pdf.addImage(logoUrl, 'PNG', margin, logoY, 36, 36);
        } catch (e) {
          // ignore
        }
      }

      // Company name & contact below logo
      const companyInfoY = logoY + 42;
      pdf.setFontSize(12);
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.text('StudyAsan', margin, companyInfoY);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Uttarakhand, India', margin, companyInfoY + 6);
      pdf.text('info@studyasan.com | +91 7983758633', margin, companyInfoY + 12);

      // Invoice meta box (top-right)
      const metaW = 78;
      const metaX = pageWidth - margin - metaW;
      const metaY = 12;
      pdf.setFillColor(245, 247, 249);
      pdf.roundedRect(metaX, metaY, metaW, 34, 2, 2, 'F');
      pdf.setDrawColor(...lightGrey);
      pdf.roundedRect(metaX, metaY, metaW, 34, 2, 2, 'S');

      // use editable invoice fields from state
      const invoiceDate = new Date(issueDate).toLocaleDateString();
      const dueDateText = new Date(dueDate).toLocaleDateString();

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkText);
      pdf.text('Invoice Number:', metaX + 6, metaY + 10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoiceNumber, metaX + 6, metaY + 16);
      pdf.setFontSize(9);
      pdf.text(`Issue Date: ${invoiceDate}`, metaX + 6, metaY + 23);
      pdf.text(`Due Date: ${dueDateText}`, metaX + 6, metaY + 30);

      // Horizontal rule under header/company info
      pdf.setDrawColor(...lightGrey);
      pdf.setLineWidth(0.5);
      pdf.line(margin, companyInfoY + 18, pageWidth - margin, companyInfoY + 18);

      // Billing info
      let cursorY = companyInfoY + 26;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkText);
      pdf.text('Bill To:', margin, cursorY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(student.user.name || '-', margin, cursorY + 6);
      pdf.text(`Email: ${student.user.email || '-'}`, margin, cursorY + 11);
      pdf.text(`Phone: ${student.user.phone || '-'}`, margin, cursorY + 16);
      if (student.class) pdf.text(`Class: ${student.class.name}`, margin, cursorY + 21);

      // Additional customer info on right side of billing
      const infoX = pageWidth / 2 + 10;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Additional Customer Info:', infoX, cursorY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(student.user.email || '-', infoX, cursorY + 6);
      pdf.text(`Phone: ${student.user.phone || '-'}`, infoX, cursorY + 11);

      // Table header
      const tableTop = cursorY + 32;
      const tableLeft = margin;
      const tableWidth = pageWidth - margin * 2;
      // Columns: description, qty, price (no line total)
      const colQty = tableLeft + tableWidth * 0.65;
      const colPrice = tableLeft + tableWidth * 0.85;

      // Header background
      pdf.setFillColor(224, 236, 249);
      pdf.rect(tableLeft, tableTop, tableWidth, 12, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(...darkText);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Product or Service', tableLeft + 6, tableTop + 8);
      pdf.text('Quantity', colQty, tableTop + 8);
      pdf.text('Price', colPrice, tableTop + 8);

      // Rows
      let y = tableTop + 12;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      selectedItems.forEach((item, idx) => {
        const rowH = 14;
        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(tableLeft, y, tableWidth, rowH, 'F');
        }

        const qty = 1;
        const lineTotal = item.price * qty;

        pdf.setTextColor(...darkText);
        const desc = item.name.length > 80 ? item.name.substring(0, 77) + '...' : item.name;
        pdf.text(desc, tableLeft + 6, y + 9);
        pdf.text(String(qty), colQty, y + 9);
        pdf.text(formatAmount(item.price), colPrice, y + 9);

        y += rowH;
      });

      // Light border under table
      pdf.setDrawColor(...lightGrey);
      pdf.setLineWidth(0.4);
      pdf.line(tableLeft, y, tableLeft + tableWidth, y);

      // Totals box on the right
      const totalsX = pageWidth - margin - 78;
      let totalsY = y + 8;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Subtotal', totalsX, totalsY);
      pdf.text(formatAmount(subtotal), pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 6;

      // Discount (show negative)
      pdf.text(`Discount (${discount}%)`, totalsX, totalsY);
      pdf.text(`-${formatAmount(discountAmount)}`, pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 6;

      // Taxes (left-aligned next to label)
      pdf.text('Taxes', totalsX, totalsY);
      pdf.text(formatAmount(Number(taxAmount || 0)), pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 8;

      pdf.setDrawColor(...headerBlue);
      pdf.setLineWidth(0.6);
      pdf.line(totalsX, totalsY, pageWidth - margin, totalsY);
      totalsY += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...darkText);
      pdf.text('Invoice Total', totalsX, totalsY);
      pdf.text(formatAmount(finalTotal), pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 10;

      // Amount Paid
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...darkText);
      pdf.text('Amount Paid', totalsX, totalsY);
      pdf.text(formatAmount(Number(amountPaid || 0)), pageWidth - margin, totalsY, { align: 'right' });
      totalsY += 10;

      // Balance due highlighted
      pdf.setFillColor(237, 246, 255);
      pdf.roundedRect(totalsX - 2, totalsY - 6, 82, 14, 2, 2, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...headerBlue);
      pdf.text('Balance Due', totalsX, totalsY + 4);
      pdf.text(formatAmount(balanceDue), pageWidth - margin, totalsY + 4, { align: 'right' });

      // Footer notes and terms (small) at bottom
      const footerStart = pageHeight - 48;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 125, 130);
      pdf.text('Thank you for choosing StudyAsan!', margin, footerStart);
      pdf.text('Payment is due within 30 days. Please include the invoice number on your payment.', margin, footerStart + 6);
      pdf.text('This invoice is valid for the enrolled courses/activities as per the selected package.', margin, footerStart + 12);

      pdf.setFontSize(8);
      const terms = [
        'The fee submitted shall not be refunded/reversed under any circumstances for any refund/reversal/chargeback or other reasons.'
      ];
      terms.forEach((t, i) => pdf.text(t, margin, footerStart + 18 + (i * 5)));

      // Save
      pdf.save(`invoice-${student.user.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Select enrollments and set prices to generate an invoice for {student.user.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <Label className="text-sm">Invoice Number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col">
                <Label className="text-sm">Issue Date</Label>
                <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <Label className="text-sm">Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex flex-col">
                <Label className="text-sm">Tax Amount</Label>
                <Input type="number" min="0" step="0.01" value={taxAmount} onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)} className="w-40" />
              </div>
              <div className="flex flex-col">
                <Label className="text-sm">Amount Paid</Label>
                <Input type="number" min="0" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)} className="w-40" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <input id="applyDiscountOnTax" type="checkbox" checked={applyDiscountOnTax} onChange={(e) => setApplyDiscountOnTax(e.target.checked)} />
                <Label htmlFor="applyDiscountOnTax" className="text-sm">Apply discount on taxed amount</Label>
              </div>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" onClick={() => setShowPreview((s) => !s)}>
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
          </div>

          {showPreview && (
            <div className="border rounded p-4 bg-white">
              {/* Simple HTML preview of the invoice using current editable values */}
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-4">
                  <img src="/studyasan-logo.png" alt="logo" className="h-16 w-16 object-contain" />
                  <div>
                    <div className="font-bold">StudyAsan</div>
                    <div className="text-sm">Uttarakhand, India</div>
                    <div className="text-sm">info@studyasan.com | +91 7983758633</div>
                  </div>
                </div>
                <div className="bg-gray-100 rounded p-3 text-sm">
                  <div className="font-semibold">Invoice</div>
                  <div>{invoiceNumber}</div>
                  <div>Issue: {new Date(issueDate).toLocaleDateString()}</div>
                  <div>Due: {new Date(dueDate).toLocaleDateString()}</div>
                </div>
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-semibold">Bill To:</div>
                  <div>{student.user.name}</div>
                  <div className="text-sm">Email: {student.user.email}</div>
                  <div className="text-sm">Phone: {student.user.phone}</div>
                </div>
                <div>
                  <div className="font-semibold">Additional Customer Info:</div>
                  <div className="text-sm">{student.user.email}</div>
                  <div className="text-sm">Phone: {student.user.phone}</div>
                </div>
              </div>

              <table className="w-full mt-4 table-auto">
                <thead>
                  <tr className="bg-slate-100 text-left">
                    <th className="px-2 py-2">Product or Service</th>
                    <th className="px-2 py-2 text-right">Quantity</th>
                    <th className="px-2 py-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((it) => (
                    <tr key={it.id} className="border-t">
                      <td className="px-2 py-3">{it.name}</td>
                      <td className="px-2 py-3 text-right">1</td>
                      <td className="px-2 py-3 text-right">{formatAmount(it.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mt-4">
                <div className="w-64">
                  <div className="flex justify-between"><div>Subtotal</div><div>{formatAmount(subtotal)}</div></div>
                  <div className="flex justify-between"><div>Discount ({discount}%)</div><div>-{formatAmount(discountAmount)}</div></div>
                  <div className="flex justify-between"><div>Taxes</div><div>{formatAmount(Number(taxAmount || 0))}</div></div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg"><div>Invoice Total</div><div>{formatAmount(finalTotal)}</div></div>
                  <div className="flex justify-between mt-2"><div>Amount Paid</div><div>{formatAmount(Number(amountPaid || 0))}</div></div>
                  <div className="bg-slate-100 rounded p-2 mt-3 flex justify-between"><div>Balance Due</div><div className="font-semibold">{formatAmount(balanceDue)}</div></div>
                </div>
              </div>
            </div>
          )}
          {/* Items List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Enrollments</h3>
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      id={item.id}
                      checked={item.selected}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={item.id} className="font-medium">
                        {item.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {item.type === 'subject' ? 'Subject Enrollment' : item.type === 'test_series' ? 'Test Series' : 'Activity Group'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`price-${item.id}`} className="text-sm">
                        Price ({currencies[currency as keyof typeof currencies].symbol}):
                      </Label>
                      <Input
                        id={`price-${item.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-24"
                        disabled={!item.selected}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <hr className="my-6" />

          {/* Discount and Total */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="currency" className="text-sm font-medium">
                  Currency:
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(currencies).map(([code, { symbol, name }]) => (
                      <SelectItem key={code} value={code}>
                        {symbol} {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-4">
                <Label htmlFor="discount" className="text-sm font-medium">
                  Discount (%):
                </Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatAmount(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%):</span>
                    <span>-{formatAmount(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes:</span>
                  <span>{formatAmount(Number(taxAmount || 0))}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{formatAmount(finalTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>{formatAmount(Number(amountPaid || 0))}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-semibold">Balance Due:</span>
                  <span className="font-semibold">{formatAmount(balanceDue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedItems.length === 0 || isGenerating || !showPreview}
            >
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}