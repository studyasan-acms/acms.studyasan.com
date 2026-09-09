import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Image as ImageIcon,
  Trash2,
  CreditCard,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Layers,
  Trophy,
  Gamepad2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { invoiceService, paymentGatewayService, uploadService } from '@/services/api';
import type { InvoiceSetting, PaymentGatewaySetting } from '@/types';

interface Props {
  onSaved?: () => void;
}

const InvoiceSettingsTab: React.FC<Props> = ({ onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showKeySecret, setShowKeySecret] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<InvoiceSetting>({
    business_name: 'StudyAsan Academy',
    org_subtitle: '',
    logo_url: '',
    hsn_sac_code: '',
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

  const [gatewayData, setGatewayData] = useState<PaymentGatewaySetting>({
    provider: 'RAZORPAY',
    is_enabled: false,
    enable_for_courses: true,
    enable_for_test_series: true,
    enable_for_activities: true,
    key_id: '',
    key_secret: '',
    webhook_secret: '',
    currency: 'INR',
    theme_color: '#0276D3',
    institute_name: 'StudyAsan Academy',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await uploadService.uploadFile(file, 'invoice-logos');
      if (res?.url) {
        setFormData((prev) => ({ ...prev, logo_url: res.url }));
        showToast('Logo uploaded successfully');
      }
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      showToast(err?.response?.data?.message || 'Failed to upload logo image');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [invRes, gwRes] = await Promise.all([
        invoiceService.getSettings(),
        paymentGatewayService.getAdminSettings().catch(() => ({ data: null })),
      ]);

      if (invRes.data) {
        setFormData({
          business_name: invRes.data.business_name || 'StudyAsan Academy',
          org_subtitle: invRes.data.org_subtitle || '',
          logo_url: invRes.data.logo_url || '',
          hsn_sac_code: invRes.data.hsn_sac_code || '',
          address:
            invRes.data.address ||
            'Jawahar jyoti , damuadhunga, behind hydil Devkhadi, Kathgodam, Haldwani, Bamori Malli, Uttarakhand 263126',
          email: invRes.data.email || 'contact@studyasan.com',
          phone: invRes.data.phone || '',
          website: invRes.data.website || 'www.studyasan.com',
          include_gst: Boolean(invRes.data.include_gst),
          gst_percentage: invRes.data.gst_percentage || 18,
          gst_number: invRes.data.gst_number || '',
          bank_name: invRes.data.bank_name || '',
          account_number: invRes.data.account_number || '',
          account_holder_name: invRes.data.account_holder_name || '',
          ifsc_code: invRes.data.ifsc_code || '',
          branch_name: invRes.data.branch_name || '',
          upi_id: invRes.data.upi_id || '',
          upi_name: invRes.data.upi_name || '',
        });
      }

      if (gwRes?.data) {
        setGatewayData({
          provider: gwRes.data.provider || 'RAZORPAY',
          is_enabled: Boolean(gwRes.data.is_enabled),
          enable_for_courses: gwRes.data.enable_for_courses !== undefined ? Boolean(gwRes.data.enable_for_courses) : true,
          enable_for_test_series: gwRes.data.enable_for_test_series !== undefined ? Boolean(gwRes.data.enable_for_test_series) : true,
          enable_for_activities: gwRes.data.enable_for_activities !== undefined ? Boolean(gwRes.data.enable_for_activities) : true,
          key_id: gwRes.data.key_id || '',
          key_secret: gwRes.data.key_secret || '',
          webhook_secret: gwRes.data.webhook_secret || '',
          currency: gwRes.data.currency || 'INR',
          theme_color: gwRes.data.theme_color || '#0276D3',
          institute_name: gwRes.data.institute_name || invRes?.data?.business_name || 'StudyAsan Academy',
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
      await Promise.all([
        invoiceService.updateSettings(formData),
        paymentGatewayService.updateSettings(gatewayData),
      ]);
      showToast('Invoice & Payment Gateway configuration saved successfully');
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
      {/* ─── 1. RAZORPAY PAYMENT GATEWAY SETTINGS CARD ───────────────────── */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-saBlue/10 flex items-center justify-center text-saBlue">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  Razorpay Payment Gateway Integration
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Enable online student checkouts, configure API keys, and toggle gateway per offering category.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {gatewayData.is_enabled ? 'Gateway Active' : 'Gateway Disabled'}
              </span>
              <Switch
                checked={gatewayData.is_enabled}
                onCheckedChange={(checked) =>
                  setGatewayData((prev) => ({ ...prev, is_enabled: checked }))
                }
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          {/* API Keys Grid */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-saBlue" /> API Credentials
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Razorpay Key ID <span className="text-red-500">*</span>
                </label>
                <Input
                  value={gatewayData.key_id || ''}
                  onChange={(e) =>
                    setGatewayData((prev) => ({ ...prev, key_id: e.target.value.trim() }))
                  }
                  placeholder="e.g. rzp_live_xxxxxxxx or rzp_test_xxxxxxxx"
                  className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Razorpay Key Secret <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showKeySecret ? 'text' : 'password'}
                    value={gatewayData.key_secret || ''}
                    onChange={(e) =>
                      setGatewayData((prev) => ({ ...prev, key_secret: e.target.value.trim() }))
                    }
                    placeholder="Enter Razorpay Key Secret"
                    className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeySecret(!showKeySecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Webhook Secret (Optional)
              </label>
              <Input
                value={gatewayData.webhook_secret || ''}
                onChange={(e) =>
                  setGatewayData((prev) => ({ ...prev, webhook_secret: e.target.value.trim() }))
                }
                placeholder="Razorpay Webhook Secret for background payment sync"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Granular Category Enable/Disable Toggles */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-saBlue" /> Category-Specific Gateway Toggles
            </p>
            <p className="text-xs text-slate-500">
              Select which sections will display the online "Buy Now / Checkout" button. If disabled, users can still submit Enquiries.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Courses & Subjects Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-saBlue flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Courses</p>
                    <p className="text-[10px] text-slate-500">Curriculum & Subjects</p>
                  </div>
                </div>
                <Switch
                  checked={gatewayData.enable_for_courses}
                  onCheckedChange={(checked) =>
                    setGatewayData((prev) => ({ ...prev, enable_for_courses: checked }))
                  }
                />
              </div>

              {/* Test Series Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Test Series</p>
                    <p className="text-[10px] text-slate-500">Mock Exams & Tests</p>
                  </div>
                </div>
                <Switch
                  checked={gatewayData.enable_for_test_series}
                  onCheckedChange={(checked) =>
                    setGatewayData((prev) => ({ ...prev, enable_for_test_series: checked }))
                  }
                />
              </div>

              {/* Activity Groups Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Activity Groups</p>
                    <p className="text-[10px] text-slate-500">Gamified learning clubs</p>
                  </div>
                </div>
                <Switch
                  checked={gatewayData.enable_for_activities}
                  onCheckedChange={(checked) =>
                    setGatewayData((prev) => ({ ...prev, enable_for_activities: checked }))
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 2. GST & TAX CONFIGURATION CARD ─────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-black text-slate-900">GST & Tax Configuration</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Control whether GST applies to student invoices, HSN/SAC code, and tax percentage.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
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

        {formData.include_gst && (
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  GST Number (GSTIN) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.gst_number || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gst_number: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. 05AAAAA0000A1Z5"
                  className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 uppercase font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  GST Rate (%) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.gst_percentage || 18}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gst_percentage: parseFloat(e.target.value) || 0 }))
                  }
                  className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  HSN / SAC Code
                </label>
                <Input
                  value={formData.hsn_sac_code || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hsn_sac_code: e.target.value }))
                  }
                  placeholder="e.g. 999293 (Coaching)"
                  className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─── 3. INSTITUTE BUSINESS & CONTACT PROFILE ──────────────────────── */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900">Institute Branding & Contact</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Details printed on invoices, receipts, and email communications.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Institute / Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.business_name || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, business_name: e.target.value }))
                }
                placeholder="StudyAsan Academy"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tagline / Subtitle
              </label>
              <Input
                value={formData.org_subtitle || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, org_subtitle: e.target.value }))
                }
                placeholder="The Path to Success"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Registered Address <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.address || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Institute address line..."
              className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Billing Email</label>
              <Input
                value={formData.email || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="billing@studyasan.com"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 7983758633"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Official Website</label>
              <Input
                value={formData.website || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                placeholder="www.studyasan.com"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 4. BANK REMITTANCE & UPI DETAILS ─────────────────────────────── */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-black text-slate-900">Direct Bank & UPI Remittance Details</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Printed on fee receipts and invoices for offline/NEFT/UPI payments.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
              <Input
                value={formData.bank_name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, bank_name: e.target.value }))}
                placeholder="e.g. State Bank of India"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Account Number</label>
              <Input
                value={formData.account_number || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, account_number: e.target.value }))
                }
                placeholder="e.g. 123456789012"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Account Holder Name</label>
              <Input
                value={formData.account_holder_name || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, account_holder_name: e.target.value }))
                }
                placeholder="e.g. StudyAsan Academy"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
              <Input
                value={formData.ifsc_code || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))
                }
                placeholder="e.g. SBIN0001234"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 uppercase font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">UPI ID (VPA)</label>
              <Input
                value={formData.upi_id || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, upi_id: e.target.value }))}
                placeholder="e.g. studyasan@okhdfcbank"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">UPI Payee Name</label>
              <Input
                value={formData.upi_name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, upi_name: e.target.value }))}
                placeholder="e.g. StudyAsan Academy"
                className="h-10 text-xs sm:text-sm rounded-xl border-slate-200"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── SAVE BUTTON BAR ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={fetchSettings}
          disabled={saving}
          className="h-11 px-5 rounded-xl border-slate-200 text-slate-700 font-bold text-xs"
        >
          Reset Changes
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="h-11 px-6 rounded-xl bg-saBlue hover:bg-saBlueDarkHover text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-saBlue/15 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving Configuration...' : 'Save All Settings'}
        </Button>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {toastMessage}
        </div>
      )}
    </form>
  );
};

export default InvoiceSettingsTab;
