import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { paymentGatewayService, couponService } from '@/services/api';
import {
  CreditCard,
  Tag,
  Loader2,
  CheckCircle2,
  Lock,
  Sparkles,
  Download,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Receipt,
  GraduationCap,
  Layers,
  Trophy,
  Gamepad2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ExploreCheckoutModalProps {
  item: {
    id: number;
    type: 'COURSE' | 'SUBJECT' | 'ACTIVITY_GROUP' | 'TEST_SERIES';
    name: string;
    description?: string | null;
    price: number | null;
    currency?: { symbol: string; code: string } | null;
    class?: string | null;
    board?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ExploreCheckoutModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: ExploreCheckoutModalProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [studentName, setStudentName] = useState(user?.name || '');
  const [studentEmail, setStudentEmail] = useState(user?.email || '');
  const [studentPhone, setStudentPhone] = useState(user?.phone || '');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment execution state
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);

  const unitPrice = item.price ?? 0;
  const discountAmount = appliedCoupon ? appliedCoupon.discount_amount || 0 : 0;
  const finalAmount = Math.max(0, unitPrice - discountAmount);

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await couponService.validate({
        code: couponCode.trim(),
        item_type: item.type,
        item_id: item.id,
        order_amount: unitPrice,
      });

      if (res.isValid) {
        setAppliedCoupon(res);
        toast.success(`Coupon ${couponCode.toUpperCase()} applied! You save ₹${res.discount_amount}`);
      } else {
        setAppliedCoupon(null);
        setCouponError(res.error || 'Invalid coupon code');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.response?.data?.error || 'Failed to validate coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  };

  // Launch Razorpay Payment
  const handleProceedToPayment = async () => {
    if (!studentName.trim() || !studentEmail.trim() || !studentPhone.trim()) {
      toast.error('Please enter your name, email, and phone number');
      return;
    }

    setProcessing(true);
    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay payment SDK. Please check your internet connection.');
        setProcessing(false);
        return;
      }

      // 2. Create order on backend
      const orderRes = await paymentGatewayService.createOrder({
        item_type: item.type,
        item_id: item.id,
        coupon_code: appliedCoupon ? couponCode.trim() : undefined,
      });

      const orderData = orderRes.data;

      // Handle zero-amount free redemption
      if (orderData.is_free) {
        toast.success('Course unlocked for free!');
        setPaymentSuccess({
          receipt_number: 'FREE-ENROLL',
          amount_paid: 0,
        });
        onSuccess?.();
        return;
      }

      // 3. Open Razorpay modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount_in_paise,
        currency: orderData.currency || 'INR',
        name: orderData.institute_name || 'StudyAsan Academy',
        description: `Enrollment for ${item.name}`,
        image: 'https://xdas-tech.sirv.com/studyasan-logo.png',
        order_id: orderData.order_id,
        prefill: {
          name: studentName,
          email: studentEmail,
          contact: studentPhone,
        },
        theme: {
          color: orderData.theme_color || '#0276D3',
        },
        handler: async (response: any) => {
          try {
            // 4. Verify payment on backend
            const verifyRes = await paymentGatewayService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              item_type: item.type,
              item_id: item.id,
              coupon_code: appliedCoupon ? couponCode.trim() : undefined,
              student_name: studentName,
              student_email: studentEmail,
              student_phone: studentPhone,
            });

            toast.success('Payment confirmed and enrollment activated!');
            setPaymentSuccess(verifyRes.data);
            onSuccess?.();
          } catch (verifyErr: any) {
            console.error('Verification error:', verifyErr);
            toast.error(verifyErr?.response?.data?.error || 'Payment verification failed');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessing(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', (failRes: any) => {
        toast.error(failRes?.error?.description || 'Payment transaction failed');
        setProcessing(false);
      });
      razorpayInstance.open();
    } catch (err: any) {
      console.error('Order creation error:', err);
      toast.error(err?.response?.data?.error || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const getItemIcon = () => {
    switch (item.type) {
      case 'COURSE':
      case 'SUBJECT':
        return <Layers className="w-5 h-5 text-saBlue" />;
      case 'TEST_SERIES':
        return <Trophy className="w-5 h-5 text-saVividOrange" />;
      case 'ACTIVITY_GROUP':
        return <Gamepad2 className="w-5 h-5 text-purple-600" />;
      default:
        return <GraduationCap className="w-5 h-5 text-saBlue" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-6 border-slate-200 shadow-2xl">
        {paymentSuccess ? (
          /* ─── SUCCESS CELEBRATION VIEW ─────────────────────────────── */
          <div className="relative overflow-hidden text-center py-2 space-y-6">
            {/* Animated confetti dots */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
              {[...Array(18)].map((_, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    width: i % 3 === 0 ? '10px' : i % 3 === 1 ? '7px' : '5px',
                    height: i % 3 === 0 ? '10px' : i % 3 === 1 ? '7px' : '5px',
                    borderRadius: i % 4 === 0 ? '50%' : '2px',
                    background: ['#0276D3','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4'][i % 6],
                    left: `${(i * 17 + 7) % 95}%`,
                    top: `${(i * 23 + 5) % 80}%`,
                    animation: `confettiFall ${1.2 + (i % 5) * 0.3}s ease-out ${(i % 7) * 0.1}s both`,
                    opacity: 0,
                  }}
                />
              ))}
            </div>

            <style>{`
              @keyframes confettiFall {
                0% { transform: translateY(-40px) rotate(0deg) scale(0); opacity: 1; }
                60% { opacity: 1; }
                100% { transform: translateY(60px) rotate(360deg) scale(1); opacity: 0; }
              }
              @keyframes successPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
                50% { box-shadow: 0 0 0 18px rgba(16,185,129,0); }
              }
              @keyframes checkPop {
                0% { transform: scale(0) rotate(-15deg); opacity: 0; }
                60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
              }
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>

            {/* Animated Check Ring */}
            <div className="flex justify-center mt-2">
              <div
                style={{ animation: 'successPulse 1.8s ease-in-out infinite' }}
                className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200"
              >
                <div style={{ animation: 'checkPop 0.5s cubic-bezier(.17,.67,.41,1.35) 0.15s both' }}>
                  <CheckCircle2 className="w-14 h-14 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Title */}
            <div style={{ animation: 'slideUp 0.4s ease-out 0.3s both' }}>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                🎉 Payment Successful!
              </h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                You're now enrolled in{' '}
                <strong className="text-slate-800 font-bold">{item.name}</strong>
              </p>
            </div>

            {/* Receipt Card */}
            <div
              style={{ animation: 'slideUp 0.4s ease-out 0.45s both' }}
              className="bg-gradient-to-br from-slate-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-3 shadow-sm"
            >
              {/* Receipt header */}
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Payment Receipt</span>
                <span className="ml-auto text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  PAID
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Receipt No.</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                    {paymentSuccess.receipt_number || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Invoice No.</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {paymentSuccess.invoice_number || '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Amount Paid</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">
                    ₹{paymentSuccess.amount_paid}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Payment Via</span>
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Razorpay
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status</span>
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
                    Enrollment Active
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ animation: 'slideUp 0.4s ease-out 0.6s both' }} className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`/dashboard/billing?receipt=${paymentSuccess.receipt_number}`, '_blank');
                  }}
                  className="flex-1 rounded-xl text-xs font-semibold h-10 border-slate-200 hover:border-saBlue hover:text-saBlue flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Receipt
                </Button>
                <Button
                  onClick={() => {
                    onClose();
                    navigate('/dashboard');
                  }}
                  className="flex-1 rounded-xl bg-saBlue hover:bg-saBlueDarkHover text-white text-xs font-bold h-10 flex items-center justify-center gap-1.5 shadow-md shadow-saBlue/20"
                >
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="w-full h-9 text-xs text-slate-400 hover:text-slate-600 font-medium rounded-xl"
              >
                Continue Exploring
              </Button>
            </div>
          </div>
        ) : (
          /* ─── CHECKOUT FORM VIEW ──────────────────────────────────── */
          <div className="space-y-5">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-saBlue" /> Secure Online Checkout
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Confirm your details, apply promo coupons, and complete instant online enrollment.
              </p>
            </DialogHeader>

            {/* Selected Item Summary Card */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  {getItemIcon()}
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug">{item.name}</h4>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {item.type.toLowerCase().replace('_', ' ')}
                    {item.class ? ` • ${item.class}` : ''}
                    {item.board ? ` • ${item.board}` : ''}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm sm:text-base font-black text-saBlue font-mono">
                  ₹{unitPrice}
                </span>
              </div>
            </div>

            {/* Contact Details Confirmation */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-slate-700 block">Student / Billing Details</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Input
                    placeholder="Full Name"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-200"
                    required
                  />
                </div>
                <div>
                  <Input
                    placeholder="Phone Number"
                    type="tel"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-200"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Email Address"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    className="h-9 text-xs rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Coupon Code Section */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-saBlue" /> Have a Promo Coupon?
              </Label>

              {appliedCoupon ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">
                        {couponCode.toUpperCase()} Applied
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Saved ₹{appliedCoupon.discount_amount} on your enrollment
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 font-bold"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Coupon Code"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    className="h-9 text-xs font-mono font-bold uppercase rounded-xl border-slate-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    className="h-9 rounded-xl text-xs font-bold px-3 shrink-0"
                  >
                    {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              )}

              {couponError && (
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {couponError}
                </p>
              )}
            </div>

            {/* Price Summary Breakdown */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Base Price:</span>
                <span className="font-mono font-medium">₹{unitPrice.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount:</span>
                  <span className="font-mono">- ₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Total Due:</span>
                <span className="text-base text-saBlue font-mono">₹{finalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Security Assurance & Pay Button */}
            <div className="space-y-2 pt-1">
              <Button
                onClick={handleProceedToPayment}
                disabled={processing}
                className="w-full h-11 rounded-xl bg-saBlue hover:bg-saBlueDarkHover text-white font-bold text-xs sm:text-sm shadow-md shadow-saBlue/20 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Initiating Gateway...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Pay ₹{finalAmount.toFixed(2)} via Razorpay
                  </>
                )}
              </Button>

              <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                256-Bit SSL Encrypted • Supports UPI, Cards, NetBanking & Wallets
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
