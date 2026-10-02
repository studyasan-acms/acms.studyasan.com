import { Trash2, ShieldAlert, CheckCircle2, Mail, Phone, MapPin, AlertCircle, HelpCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function DataDeletionPage() {
  usePageTitle('User Data & Account Deletion');

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-red-950 via-red-900 to-slate-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-200 text-xs font-semibold uppercase tracking-wider">
            <Trash2 size={16} /> Google Play & App Store User Data Policy
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            User Data & Account Deletion Request
          </h1>
          <p className="text-red-100/90 text-sm sm:text-base max-w-2xl mx-auto">
            StudyAsan respects your right to privacy and data erasure. Learn how to request permanent deletion of your account and personal data.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-red-200/80 pt-2">
            <span>Last Updated: October 2, 2026</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          
          {/* Overview */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">1</span>
              Overview & Your Rights
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              In full compliance with <strong>Google Play Store's User Data & Account Deletion Policy</strong> and <strong>Apple App Store Guideline 5.1.1</strong>, StudyAsan allows all registered users (students, parents, teachers, and guardians) to request complete and permanent deletion of their account and all associated personal data at any time.
            </p>
          </section>

          {/* Methods to delete */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">2</span>
              How to Request Account & Data Deletion
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Option 1: In App */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  📱
                </div>
                <h3 className="text-lg font-bold text-slate-900">Method 1: Direct In-App Deletion</h3>
                <p className="text-xs text-slate-500">Fastest and immediate automated verification</p>
                <ol className="space-y-2 text-xs sm:text-sm text-slate-600 list-decimal list-inside pt-2">
                  <li>Open the <strong>StudyAsan App</strong> or web portal.</li>
                  <li>Log in to your account.</li>
                  <li>Click on your <strong>Profile Avatar &gt; Settings</strong>.</li>
                  <li>Scroll to the <strong>Account Security / Deletion</strong> section.</li>
                  <li>Click <strong>"Request Account Deletion"</strong> and confirm via the OTP sent to your registered email.</li>
                </ol>
              </div>

              {/* Option 2: Web / Email */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  ✉️
                </div>
                <h3 className="text-lg font-bold text-slate-900">Method 2: Web & Email Request</h3>
                <p className="text-xs text-slate-500">For users without active app access</p>
                <p className="text-xs sm:text-sm text-slate-600">
                  Send an email directly from your registered email address to:
                </p>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs sm:text-sm">
                  <p><strong>To:</strong> <a href="mailto:contact@studyasan.com" className="text-blue-600 underline">contact@studyasan.com</a></p>
                  <p><strong>Subject:</strong> Account Deletion Request - [Your Name / Email]</p>
                  <p className="text-slate-500 mt-1">Please include your registered phone number or student/teacher ID for verification.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Types of Data Deleted vs Retained */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">3</span>
              Data Retention & Deletion Scope
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm pt-2">
              <div className="p-4 rounded-xl bg-green-50/60 border border-green-200 space-y-2">
                <h4 className="font-bold text-green-900 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-green-600" /> What is Permanently Deleted
                </h4>
                <ul className="space-y-1.5 text-green-800 list-disc list-inside">
                  <li>Full name, email address, phone number, and password.</li>
                  <li>Profile photos, school name, date of birth, and residential address.</li>
                  <li>Class chat messages, doubt questions, and uploaded homework attachments.</li>
                  <li>Active enrollment records and push notification tokens.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle size={16} className="text-amber-600" /> What May Be Temporarily Retained
                </h4>
                <ul className="space-y-1.5 text-amber-800 list-disc list-inside">
                  <li>Financial tax invoices and statutory payment receipts (retained strictly for statutory auditing and tax compliance as mandated by Indian Law).</li>
                  <li>Anonymized aggregate test statistics (stripped of any personally identifying information).</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="space-y-3 p-5 bg-blue-50/70 rounded-xl border border-blue-200 text-sm sm:text-base text-blue-950">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldAlert size={18} className="text-blue-600" />
              Deletion Timeline & Irreversibility
            </h3>
            <p>
              Once your deletion request is verified, access to the platform will be immediately terminated. All personal data will be completely purged from our active and backup databases within <strong>30 calendar days</strong>. This process is permanent and cannot be undone.
            </p>
          </section>

          {/* Contact Support */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Need Assistance with Data Deletion?</h2>
            <p className="text-sm text-slate-600">
              Our Data Protection & Privacy Team is available to assist you:
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
                <MapPin className="text-blue-600 flex-shrink-0" size={18} />
                <span>Nainital, Uttarakhand, India</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
