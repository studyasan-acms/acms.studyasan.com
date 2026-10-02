import { usePageTitle } from '@/hooks/usePageTitle';

export default function DataDeletionPage() {
  usePageTitle('User Data & Account Deletion - StudyAsan');

  return (
    <div className="py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-12 text-slate-800 leading-relaxed space-y-8">
          
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              User Data & Account Deletion Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              StudyAsan (Google Play & Apple App Store User Data Erasure) • Effective: October 2, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              1. Overview & Deletion Rights
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              In full compliance with <strong>Google Play Store User Data & Account Deletion Policy</strong> and <strong>Apple App Store Guideline 5.1.1</strong>, StudyAsan provides all registered users (students, parents, and teachers) the right to permanently delete their account and all associated personal data at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              2. How to Request Account Deletion
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-slate-700">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900">Method 1: Direct In-App Deletion (Recommended)</h3>
                <ol className="list-decimal list-inside pl-2 space-y-1 text-slate-600">
                  <li>Log in to the <strong>StudyAsan App</strong> or web portal.</li>
                  <li>Click on your <strong>Profile Avatar &gt; Settings</strong>.</li>
                  <li>Go to the <strong>Account Security / Deletion</strong> section.</li>
                  <li>Click <strong>"Request Account Deletion"</strong> and enter the OTP sent to your registered email to confirm.</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900">Method 2: Email Deletion Request</h3>
                <p className="text-slate-600">
                  Send an email from your registered email address to <a href="mailto:contact@studyasan.com" className="text-[#0276D3] underline">contact@studyasan.com</a> with the subject <em>"Account Deletion Request - [Your Registered Email]"</em>.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              3. Scope of Data Purge & Timeline
            </h2>
            <ul className="space-y-1.5 text-sm sm:text-base text-slate-700 list-disc list-inside pl-2">
              <li><strong>Permanently Deleted:</strong> Full name, email, phone number, password hash, profile pictures, chat messages, doubt queries, homework submissions, and notification tokens.</li>
              <li><strong>Statutory Retention:</strong> Financial invoices and tax receipts are retained only as required by statutory financial audit laws.</li>
              <li><strong>Purge Timeline:</strong> All personal data is completely and irreversibly purged from our active and backup databases within <strong>30 calendar days</strong>.</li>
            </ul>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              4. Contact Privacy & Data Protection Team
            </h2>
            <div className="space-y-1 text-sm sm:text-base text-slate-700">
              <p><strong>Entity Name:</strong> StudyAsan</p>
              <p><strong>Email:</strong> <a href="mailto:contact@studyasan.com" className="text-[#0276D3] underline">contact@studyasan.com</a></p>
              <p><strong>Phone:</strong> +91 74098 88805</p>
              <p><strong>Registered Address:</strong> Haldwani, Nainital District, Uttarakhand, India</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
