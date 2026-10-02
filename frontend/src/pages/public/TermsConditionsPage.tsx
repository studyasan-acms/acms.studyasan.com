import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function TermsConditionsPage() {
  usePageTitle('Terms & Conditions');

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <FileText size={16} /> Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl mx-auto">
            Please read these terms and conditions carefully before using the StudyAsan Platform.
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
            <h2 className="text-xl font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-sm sm:text-base text-slate-600">
              By accessing, browsing, downloading, or using the StudyAsan mobile application or website, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, do not use the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">2. User Accounts & Responsibilities</h2>
            <p className="text-sm sm:text-base text-slate-600">
              Users are responsible for maintaining the confidentiality of their login credentials. Any activity occurring under your account is your responsibility. Users agree to provide accurate, current, and complete registration information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">3. Live Classes & Classroom Code of Conduct</h2>
            <p className="text-sm sm:text-base text-slate-600">
              StudyAsan strives to provide a safe, respectful learning environment. Any abusive language, harassment, unauthorized recording, or disruptive behavior during live sessions may result in immediate suspension or termination of account access without refund.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">4. Intellectual Property</h2>
            <p className="text-sm sm:text-base text-slate-600">
              All curriculum, test papers, video lectures, notes, graphics, and software code belong exclusively to StudyAsan. Unauthorized copying, distribution, or commercial exploitation is strictly prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">5. Fee Payments & Refunds</h2>
            <p className="text-sm sm:text-base text-slate-600">
              Course fees and subscription rates are specified at the time of enrollment. Payment receipts and invoices are generated automatically. Refund requests are subject to our institutional refund policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">6. Contact Information</h2>
            <p className="text-sm sm:text-base text-slate-600">
              For any questions regarding these Terms & Conditions, please contact us at:
            </p>
            <p className="text-sm font-semibold text-slate-800">
              Email: <a href="mailto:studyasaneducation@gmail.com" className="text-blue-600 underline">studyasaneducation@gmail.com</a> | Phone: +91 7983758633
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
