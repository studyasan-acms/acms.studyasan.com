import { usePageTitle } from '@/hooks/usePageTitle';

export default function PrivacyPolicyPage() {
  usePageTitle('Privacy Policy - StudyAsan');

  return (
    <div className="py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-12 text-slate-800 leading-relaxed space-y-8">
          
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              StudyAsan (Android, iOS & Web ACMS Platform) • Last Updated: October 2, 2026 • Effective Date: October 2, 2026
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              1. Introduction & Scope
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              Welcome to <strong>StudyAsan</strong> ("we," "our," "Company," or "Platform"). StudyAsan provides educational coaching, classroom management systems, live video lectures, online test series, quizzes, assignments, and academic performance tracking through our mobile applications (on Google Play Store and Apple App Store) and our web portal at <a href="https://acms.studyasan.com" className="text-[#0276D3] underline">https://acms.studyasan.com</a> and <a href="https://www.studyasan.com" className="text-[#0276D3] underline">https://www.studyasan.com</a>.
            </p>
            <p className="text-sm sm:text-base text-slate-700">
              This Privacy Policy explains how we collect, process, store, disclose, and safeguard user data in strict adherence with the Information Technology Act 2000 (India), Digital Personal Data Protection Act 2023 (DPDP), Children's Online Privacy Protection Act (COPPA), GDPR, and Google Play Store & Apple App Store Developer Data Safety Policies.
            </p>
          </section>

          {/* Section 2 - Children's Privacy */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              2. Target Age & Children’s Privacy (COPPA & Families Policy)
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              StudyAsan offers academic curricula for learners aged <strong>9 and older</strong>. Because our service serves children and minors (specifically under 13 years of age):
            </p>
            <ul className="space-y-2 text-sm sm:text-base text-slate-700 list-disc list-inside pl-2">
              <li><strong>Parental Consent:</strong> Children under the age of 18 (and specifically under 13) may only register with verified consent and supervision from a parent, legal guardian, or authorized school representative.</li>
              <li><strong>Zero Targeted Advertising:</strong> We DO NOT serve personalized, behavioural, or commercial advertisements to students. We never sell or rent children’s personal data.</li>
              <li><strong>Limited Data Collection:</strong> We collect only information strictly necessary for the student to attend live virtual classes, submit homework, take tests, and review performance reports.</li>
              <li><strong>Parental Rights:</strong> Parents and guardians retain the right to review their child's data, request corrections, or demand complete account deletion at any time by contacting <a href="mailto:contact@studyasan.com" className="text-[#0276D3] underline">contact@studyasan.com</a>.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              3. Categories of Information Collected
            </h2>
            <div className="space-y-3 text-sm sm:text-base text-slate-700">
              <p><strong>A. Information Provided by Users:</strong></p>
              <ul className="list-disc list-inside pl-4 space-y-1 text-slate-600">
                <li><strong>Account Credentials:</strong> Full Name, Email Address, Phone Number, Password (cryptographically hashed), and Profile Picture.</li>
                <li><strong>Student Profile:</strong> Class/Grade, Educational Board, School Name, Date of Birth, Gender, Blood Group (optional), and Residential Address.</li>
                <li><strong>Teacher Profile:</strong> Academic Qualifications, Teaching Experience, Subject Specializations, and Payout Details.</li>
                <li><strong>Classroom & Academic Data:</strong> Homework files (PDFs/Images), test attempts & answers, doubt queries, quiz scores, and live WebRTC class audio/video.</li>
                <li><strong>Billing Information:</strong> Invoice records, transaction IDs, payment methods, and fee receipts. (Card details and bank PINs are handled securely by RBI-authorized payment gateways).</li>
              </ul>

              <p className="pt-2"><strong>B. Technical & Device Information:</strong></p>
              <ul className="list-disc list-inside pl-4 space-y-1 text-slate-600">
                <li>Device model, OS version, IP address, app performance logs, and Firebase Cloud Messaging (FCM) tokens for push notifications.</li>
                <li>Virtual classroom attendance logs (join time, leave time, duration).</li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              4. Mobile App Permissions (Android & iOS)
            </h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">Permission</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-800">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">INTERNET / NETWORK</td>
                    <td className="px-4 py-2.5">To connect to servers, stream live classes, and synchronize study modules.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">CAMERA (Optional)</td>
                    <td className="px-4 py-2.5">To broadcast student/teacher video during live classes and scan homework.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">MICROPHONE (Optional)</td>
                    <td className="px-4 py-2.5">To allow verbal questions and two-way audio participation in live classes.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">STORAGE / PHOTOS (Optional)</td>
                    <td className="px-4 py-2.5">To upload homework documents and download notes/certificates.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">NOTIFICATIONS</td>
                    <td className="px-4 py-2.5">To deliver schedule alerts, live class reminders, and exam notifications.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              5. How Information is Shared
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              We never sell or monetize user data. Information is shared only with:
            </p>
            <ul className="space-y-1.5 text-sm sm:text-base text-slate-700 list-disc list-inside pl-2">
              <li><strong>Assigned Teachers & Mentors:</strong> Strictly for instruction, attendance verification, and academic evaluation.</li>
              <li><strong>Cloud Infrastructure Providers:</strong> AWS S3 (encrypted file storage), Janus WebRTC (live conferencing), and Firebase (push notifications).</li>
              <li><strong>Statutory Authorities:</strong> Only when strictly required by applicable law, court order, or judicial process.</li>
            </ul>
          </section>

          {/* Section 6 - Account Deletion */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              6. Account & Data Deletion Policy (Play Store & App Store Compliant)
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              All users have the absolute right to request permanent account deletion:
            </p>
            <ul className="space-y-1.5 text-sm sm:text-base text-slate-700 list-disc list-inside pl-2">
              <li><strong>In-App Deletion:</strong> Go to <strong>Dashboard &gt; Settings &gt; Profile</strong>, click <strong>"Request Account Deletion"</strong>, and verify with email OTP.</li>
              <li><strong>Email Deletion Request:</strong> Email <a href="mailto:contact@studyasan.com" className="text-[#0276D3] underline">contact@studyasan.com</a> with the subject *"Account Deletion Request"*.</li>
              <li><strong>Timeline:</strong> All personal credentials, chat history, and academic files are permanently purged within <strong>30 calendar days</strong>.</li>
            </ul>
          </section>

          {/* Section 7 - Contact */}
          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              7. Grievance Redressal & Contact Information
            </h2>
            <div className="space-y-1 text-sm sm:text-base text-slate-700">
              <p><strong>Entity Name:</strong> StudyAsan</p>
              <p><strong>Grievance & Privacy Officer:</strong> Compliance Team</p>
              <p><strong>Email:</strong> <a href="mailto:contact@studyasan.com" className="text-[#0276D3] underline">contact@studyasan.com</a></p>
              <p><strong>Phone:</strong> +91 74098 88805</p>
              <p><strong>Registered Office:</strong> Haldwani, Nainital District, Uttarakhand, India</p>
              <p><strong>Website:</strong> <a href="https://www.studyasan.com" className="text-[#0276D3] underline">https://www.studyasan.com</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
