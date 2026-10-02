import { usePageTitle } from '@/hooks/usePageTitle';

export default function RefundPolicyPage() {
  usePageTitle('Refund & Cancellation Policy - StudyAsan');

  return (
    <div className="py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-12 text-slate-800 leading-relaxed space-y-8">
          
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Refund & Cancellation Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              StudyAsan (Android, iOS & Web ACMS Platform) • Last Updated: October 2, 2026 • Effective Date: October 2, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              1. General Refund Policy
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              StudyAsan is committed to providing outstanding educational experiences through our live interactive classrooms, recorded courses, and comprehensive study materials. We maintain a transparent and student-friendly refund policy across our mobile applications and web platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              2. Eligibility for Refund & Cancellation
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-slate-700 list-disc list-inside pl-2">
              <li><strong>Demo & Trial Lectures:</strong> We encourage all prospective students to attend demo sessions or trial lectures prior to enrolling.</li>
              <li><strong>7-Day Refund Window:</strong> For batch course enrollments, students may apply for a refund within <strong>7 calendar days</strong> from the official course start date, provided the student has attended fewer than 25% of the live lectures.</li>
              <li><strong>Monthly Recurring Tuition:</strong> Students enrolled in monthly recurring batches may cancel future renewal charges anytime prior to the generation of the next monthly invoice.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              3. Non-Refundable Items
            </h2>
            <ul className="space-y-1.5 text-sm sm:text-base text-slate-700 list-disc list-inside pl-2">
              <li>Downloaded digital study materials, e-books, and solved question papers.</li>
              <li>One-time registration, application, or administrative verification fees.</li>
              <li>Test series or mock assessment packages that have already been attempted, evaluated, or completed.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              4. Processing Timeline
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              Approved refunds are credited back to the original payment source (UPI ID, bank account, or debit/credit card) within <strong>5 to 7 business days</strong> from the date of formal approval.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              5. How to Submit a Refund Request
            </h2>
            <div className="space-y-1 text-sm sm:text-base text-slate-700">
              <p>Email your request with your registered email and invoice number to:</p>
              <p><strong>Email:</strong> <a href="mailto:contact@studyasan.com" className="text-[#0276D3] underline">contact@studyasan.com</a></p>
              <p><strong>Phone:</strong> +91 74098 88805</p>
              <p><strong>Support Hours:</strong> Monday – Saturday, 10:00 AM – 7:00 PM IST</p>
              <p><strong>Office Address:</strong> Haldwani, Nainital District, Uttarakhand, India</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
