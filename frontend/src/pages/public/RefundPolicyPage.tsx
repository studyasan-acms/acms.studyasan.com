import { RefreshCw, CheckCircle2, AlertCircle, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function RefundPolicyPage() {
  usePageTitle('Refund & Cancellation Policy');

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <RefreshCw size={16} /> Fee & Payment Policy
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Refund & Cancellation Policy
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl mx-auto">
            Transparent, fair, and clear guidelines regarding subscription fees, course enrollments, and refund requests.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-blue-200/80 pt-2">
            <span>Last Updated: October 2, 2026</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">1</span>
              General Policy
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              StudyAsan strives to provide high quality online tutoring, live interactive classroom sessions, and comprehensive study materials. We understand that circumstances may change, and we offer a clear, transparent refund and cancellation policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">2</span>
              Course & Subscription Cancellations
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-slate-600 list-disc list-inside">
              <li><strong>Free Trial / Demo Sessions:</strong> We encourage students to attend demo sessions or trial classes prior to paid enrollments.</li>
              <li><strong>Cancellation within 7 Days:</strong> If a student is unsatisfied with a course, a refund request can be submitted within <strong>7 days</strong> of the course commencement date, provided fewer than 25% of the live lectures have been attended.</li>
              <li><strong>Monthly Recurring Tuition:</strong> For recurring monthly batches, students may cancel anytime before the next billing cycle begins to prevent future charges.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">3</span>
              Non-Refundable Items
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-slate-600 list-disc list-inside">
              <li>Downloaded digital study materials, past question papers, or PDF books.</li>
              <li>One-time registration or administrative application fees.</li>
              <li>Test series or certification exams that have already been attempted or evaluated.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">4</span>
              Refund Processing & Timeline
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Approved refunds are credited back to the original source payment method (bank account, UPI, credit/debit card) within <strong>5 to 7 business days</strong> from the date of approval.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">How to Apply for a Refund</h2>
            <p className="text-sm text-slate-600">
              To request a refund or raise a payment query, please contact our billing department:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Mail className="text-blue-600 flex-shrink-0" size={18} />
                <span className="truncate">contact@studyasan.com</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Phone className="text-blue-600 flex-shrink-0" size={18} />
                <span>+91 74098 88805</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Clock className="text-blue-600 flex-shrink-0" size={18} />
                <span>Mon - Sat: 10 AM - 7 PM</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
