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
  type: "subject" | "activity_group";
  price: number;
  selected: boolean;
}

export default function InvoiceModal({ isOpen, onClose, student }: InvoiceModalProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [isGenerating, setIsGenerating] = useState(false);

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

      // Add subject enrollments
      if (student.enrollments) {
        student.enrollments.forEach((enrollment) => {
          invoiceItems.push({
            id: `subject-${enrollment.id}`,
            name: enrollment.subject.name,
            type: "subject",
            price: 0, // Default price, user can set
            selected: true,
          });
        });
      }

      // Add unique activity groups
      if (student.activity_enrollments) {
        const uniqueGroups = new Map<number, string>();
        student.activity_enrollments.forEach((enrollment) => {
          if (!uniqueGroups.has(enrollment.activity.group.id)) {
            uniqueGroups.set(enrollment.activity.group.id, enrollment.activity.group.name);
          }
        });

        uniqueGroups.forEach((groupName, groupId) => {
          invoiceItems.push({
            id: `activity-${groupId}`,
            name: groupName,
            type: "activity_group",
            price: 0, // Default price, user can set
            selected: true,
          });
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
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF();

      // Set up colors and fonts
      const primaryColor: [number, number, number] = [41, 128, 185]; // Blue
      const secondaryColor: [number, number, number] = [52, 73, 94]; // Dark gray
      const accentColor: [number, number, number] = [149, 165, 166]; // Light gray

      // Header with company info
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, 210, 40, 'F'); // Increased height to accommodate centered layout

      // Try to add logo
      try {
        const logoResponse = await fetch('/studyasan-logo.png');
        if (logoResponse.ok) {
          const logoBlob = await logoResponse.blob();
          const logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(logoBlob);
          });
          // Center the logo (210mm page width / 2 - logo width / 2 = center position)
          pdf.addImage(logoDataUrl, 'PNG', 75, 5, 60, 30); // Centered at x=90, width=30
        }
      } catch (error) {
        console.log('Logo loading failed, using text logo');
        // Fallback to text logo
        pdf.setFillColor(255, 255, 255);
        pdf.circle(105, 15, 8, 'F'); // Centered
        pdf.setTextColor(...primaryColor);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('AMS', 101, 18); // Centered
      }

      // Company details - centered below company name
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Phone: +91 7983758633 | Email: studyasaneducation@gmail.com', 105, 35, { align: 'center' });

      // Invoice details box
      pdf.setFillColor(248, 249, 250);
      pdf.rect(120, 75, 70, 25, 'F');
      pdf.setDrawColor(...accentColor);
      pdf.rect(120, 75, 70, 25, 'S');

      // Invoice details
      pdf.setTextColor(...secondaryColor);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice Number:', 125, 82);
      pdf.text('Invoice Date:', 125, 89);
      pdf.text('Due Date:', 125, 96);

      pdf.setFont('helvetica', 'normal');
      const invoiceNumber = `INV-${Date.now()}`;
      const invoiceDate = new Date().toLocaleDateString();
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

      pdf.text(invoiceNumber, 155, 82);
      pdf.text(invoiceDate, 155, 89);
      pdf.text(dueDate, 155, 96);

      // Bill To section
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bill To:', 20, 110);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.text(student.user.name, 20, 120);
      pdf.text(`Email: ${student.user.email}`, 20, 128);
      pdf.text(`Phone: ${student.user.phone}`, 20, 136);
      if (student.class) {
        pdf.text(`Class: ${student.class.name}`, 20, 144);
      }

      // Items table - manual drawing
      let tableY = 160;

      // Table header
      pdf.setFillColor(...primaryColor);
      pdf.rect(20, tableY, 170, 12, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description', 25, tableY + 8);
      pdf.text('Type', 100, tableY + 8);
      pdf.text('Amount', 165, tableY + 8, { align: 'right' });

      tableY += 12;

      // Table rows
      pdf.setTextColor(...secondaryColor);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      selectedItems.forEach((item, index) => {
        const rowHeight = 12;
        const fillColor = index % 2 === 0 ? [248, 249, 250] : [255, 255, 255];

        // Row background
        pdf.setFillColor(...(fillColor as [number, number, number]));
        pdf.rect(20, tableY, 170, rowHeight, 'F');

        // Row border
        pdf.setDrawColor(...accentColor);
        pdf.rect(20, tableY, 170, rowHeight, 'S');

        // Content with better alignment
        const maxDescWidth = 65; // Max width for description
        const descText = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name;
        pdf.text(descText, 25, tableY + 8);

        const typeText = item.type === 'subject' ? 'Subject Enrollment' : 'Activity Group';
        pdf.text(typeText, 100, tableY + 8);

        pdf.text(`${currencies[currency as keyof typeof currencies].symbol}${item.price.toFixed(2)}`, 165, tableY + 8, { align: 'right' });

        tableY += rowHeight;
      });

      // Table border
      pdf.setDrawColor(...secondaryColor);
      pdf.setLineWidth(0.5);
      pdf.rect(20, 148, 170, tableY - 148, 'S');

      // Totals section
      const finalY = tableY + 10;

      // Subtotal
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Subtotal:`, 140, finalY);
      pdf.text(`${currencies[currency as keyof typeof currencies].symbol}${subtotal.toFixed(2)}`, 180, finalY, { align: 'right' });

      let currentY = finalY + 8;

      // Discount
      if (discount > 0) {
        pdf.setTextColor(34, 197, 94); // Green
        pdf.text(`Discount (${discount}%):`, 140, currentY);
        pdf.text(`-${currencies[currency as keyof typeof currencies].symbol}${discountAmount.toFixed(2)}`, 180, currentY, { align: 'right' });
        currentY += 8;
        pdf.setTextColor(...secondaryColor);
      }

      // Total
      pdf.setDrawColor(...primaryColor);
      pdf.setLineWidth(0.5);
      pdf.line(120, currentY - 2, 190, currentY - 2);

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...primaryColor);
      pdf.text('TOTAL:', 140, currentY + 8);
      pdf.text(`${currencies[currency as keyof typeof currencies].symbol}${total.toFixed(2)}`, 180, currentY + 8, { align: 'right' });

      // Footer
      const footerY = currentY + 30;
      pdf.setTextColor(...secondaryColor);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      // Thank you message
      pdf.text('Thank you for your business!', 105, footerY, { align: 'center' });

      // Payment terms
      pdf.setFontSize(9);
      pdf.text('Payment is due within 30 days. Please include the invoice number on your payment.', 105, footerY + 8, { align: 'center' });

      // Terms and conditions
      pdf.setFontSize(8);
      pdf.text('Terms & Conditions: All sales are final. Late payments may incur additional charges.', 105, footerY + 20, { align: 'center' });

      // Download
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
                      <p className="text-sm text-muted-foreground capitalize">
                        {item.type.replace('_', ' ')}
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
                  <span>{currencies[currency as keyof typeof currencies].symbol}{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%):</span>
                    <span>-{currencies[currency as keyof typeof currencies].symbol}{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{currencies[currency as keyof typeof currencies].symbol}{total.toFixed(2)}</span>
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
              disabled={selectedItems.length === 0 || isGenerating}
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