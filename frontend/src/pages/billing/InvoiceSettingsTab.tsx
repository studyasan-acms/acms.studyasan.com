import React, { useState, useEffect } from 'react';
import {
  Save,
  Building2,
  Landmark,
  QrCode,
  Receipt,
  Percent,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { invoiceService } from '@/services/api';
import type { InvoiceSetting } from '@/types';

interface Props {
  onSaved?: () => void;
}

const InvoiceSettingsTab: React.FC<Props> = ({ onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState<InvoiceSetting>({
    business_name: 'StudyAsan Academy',
    address:
      'Jawahar jyoti , damuadhunga, behind hydil Devkhadi, Kathgodam, Haldwani, Bamori Malli, Uttarakhand 263126',
    email: 'contact@studyasan.com',
    phone: '',
    website: 'www.studyasan.com',
    include_gst: false,
    gst_percentage: 18,
    gst_number: '',
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    ifsc_code: '',
    branch_name: '',
    upi_id: '',
    upi_name: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await invoiceService.getSettings();
      if (res.data) {
        setFormData({
          business_name: res.data.business_name || 'StudyAsan Academy',
          address:
            res.data.address ||
            'Jawahar jyoti , damuadhunga, behind hydil Devkhadi, Kathgodam, Haldwani, Bamori Malli, Uttarakhand 263126',
          email: res.data.email || 'contact@studyasan.com',
          phone: res.data.phone || '',
          website: res.data.website || 'www.studyasan.com',
          include_gst: Boolean(res.data.include_gst),
          gst_percentage: res.data.gst_percentage || 18,
          gst_number: res.data.gst_number || '',
          bank_name: res.data.bank_name || '',
          account_number: res.data.account_number || '',
          account_holder_name: res.data.account_holder_name || '',
          ifsc_code: res.data.ifsc_code || '',
          branch_name: res.data.branch_name || '',
          upi_id: res.data.upi_id || '',
          upi_name: res.data.upi_name || '',
        });
      }
    } catch {
      showToast('Failed to load settings from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await invoiceService.updateSettings(formData);
      showToast('Invoice & GST settings updated successfully');
      onSaved?.();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-saBlue" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* 1. GST Configuration Card */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-slate-900">GST Configuration</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Control whether GST applies to student invoices and specify the tax rate.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">
                {formData.include_gst ? 'GST Enabled' : 'GST Disabled'}
              </span>
              <Switch
                checked={formData.include_gst}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, include_gst: checked }))
                }
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                GSTIN / Tax Identification Number
              </label>
              <Input
                value={formData.gst_number || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, gst_number: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. 05AAAAA0000A1Z5"
                disabled={!formData.include_gst}
                className="h-9 text-xs rounded-lg border-slate-200 uppercase tracking-wider font-mono disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Shown prominently on the invoice header when GST is included.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                GST Percentage (%)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.gst_percentage}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    gst_percentage: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="18"
                disabled={!formData.include_gst}
                className="h-9 text-xs rounded-lg border-slate-200 font-bold disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Standard education / service GST is usually 18%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Academy Business Details Card */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-saVividOrange/10 flex items-center justify-center text-saVividOrange">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900">
                Academy Details (Printed on Invoices)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Contact information and physical address printed on generated invoice receipts.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Organization / Academy Name
              </label>
              <Input
                value={formData.business_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, business_name: e.target.value }))
                }
                placeholder="StudyAsan Academy"
                required
                className="h-9 text-xs rounded-lg border-slate-200 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Billing / Support Email
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="contact@studyasan.com"
                required
                className="h-9 text-xs rounded-lg border-slate-200 text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Phone Number (Optional)
              </label>
              <Input
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+91 9876543210"
                className="h-9 text-xs rounded-lg border-slate-200 text-slate-900"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Website
              </label>
              <Input
                value={formData.website || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder="www.studyasan.com"
                className="h-9 text-xs rounded-lg border-slate-200 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Registered Address
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Enter full address..."
              required
              className="w-full p-2.5 text-xs rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:border-saBlue resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. Bank Account & UPI Details Card */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900">
                Bank & UPI Payment Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Displayed in the invoice payment instructions for direct bank transfer and UPI remittances.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Bank Details */}
          <div>
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-saBlue" /> Bank Transfer Information
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Bank Name
                </label>
                <Input
                  value={formData.bank_name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bank_name: e.target.value }))
                  }
                  placeholder="e.g. State Bank of India"
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Account Number
                </label>
                <Input
                  value={formData.account_number || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_number: e.target.value }))
                  }
                  placeholder="e.g. 123456789012"
                  className="h-9 text-xs rounded-lg border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Account Holder Name
                </label>
                <Input
                  value={formData.account_holder_name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, account_holder_name: e.target.value }))
                  }
                  placeholder="e.g. StudyAsan Academy"
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  IFSC Code
                </label>
                <Input
                  value={formData.ifsc_code || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. SBIN0001234"
                  className="h-9 text-xs rounded-lg border-slate-200 uppercase font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Branch Name
                </label>
                <Input
                  value={formData.branch_name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, branch_name: e.target.value }))
                  }
                  placeholder="e.g. Haldwani Main Branch"
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>
          </div>

          {/* UPI Details */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-saVividOrange" /> UPI Remittance Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  UPI ID (VPA)
                </label>
                <Input
                  value={formData.upi_id || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, upi_id: e.target.value }))
                  }
                  placeholder="e.g. studyasan@okhdfcbank"
                  className="h-9 text-xs rounded-lg border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Payee / Account Name
                </label>
                <Input
                  value={formData.upi_name || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, upi_name: e.target.value }))
                  }
                  placeholder="e.g. StudyAsan Academy"
                  className="h-9 text-xs rounded-lg border-slate-200"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={fetchSettings}
          disabled={saving}
          className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 font-bold text-xs"
        >
          Reset
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="h-10 px-6 rounded-xl bg-saBlue hover:bg-saBlueDarkHover text-white font-bold text-xs uppercase tracking-wider shadow-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}
    </form>
  );
};

export default InvoiceSettingsTab;
