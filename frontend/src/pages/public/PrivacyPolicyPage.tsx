import { ShieldCheck, Lock, Eye, FileText, UserX, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function PrivacyPolicyPage() {
  usePageTitle('Privacy Policy');

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck size={16} /> Privacy & User Data Protection
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            StudyAsan Privacy Policy
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base max-w-2xl mx-auto">
            Your privacy and data safety are of utmost importance. Learn how we handle, protect, and secure your information.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-blue-200/80 pt-2">
            <span>Last Updated: October 2, 2026</span>
            <span>•</span>
            <span>Effective Date: October 2, 2026</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-10 space-y-8 text-slate-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">1</span>
              Introduction
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Welcome to <strong>StudyAsan</strong> ("we," "our," or "us"). StudyAsan is an online educational academy and Classroom Management System (ACMS) designed to deliver interactive learning, live interactive classrooms, online test series, quizzes, assignments, and educational progress tracking for students, teachers, parents, and educational institutions.
            </p>
            <p className="text-sm sm:text-base text-slate-600">
              This Privacy Policy explains how we collect, use, store, disclose, and safeguard your personal information when you access or use our mobile application (<strong>StudyAsan</strong>) and our web services hosted at <a href="https://www.studyasan.com" className="text-blue-600 hover:underline">https://www.studyasan.com</a> and <a href="https://acms.studyasan.com" className="text-blue-600 hover:underline">https://acms.studyasan.com</a>.
            </p>
          </section>

          {/* Section 2 - Children's Privacy */}
          <section className="space-y-3 p-5 bg-amber-50/70 rounded-xl border border-amber-200">
            <h2 className="text-xl font-bold text-amber-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center font-bold text-sm">2</span>
              Target Age & Children’s Privacy (COPPA & Google Play Families Policy)
            </h2>
            <p className="text-sm sm:text-base text-amber-950/90">
              StudyAsan provides educational curriculum and services to students aged <strong>9 and older</strong>. Because our target audience includes children (under 13 years old), we strictly adhere to the <strong>Children's Online Privacy Protection Act (COPPA)</strong>, <strong>GDPR-K</strong>, and <strong>Google Play Developer Program Families Policy</strong>:
            </p>
            <ul className="space-y-2 text-sm text-amber-900 list-disc list-inside">
              <li><strong>Parental/School Consent:</strong> Children under 13 must register with verifiable consent from a parent, guardian, or authorized school teacher.</li>
              <li><strong>No Behavioral Ads or Profiling:</strong> We do NOT serve personalized advertising, tracking ads, or sell children's data to third parties.</li>
              <li><strong>Parental Rights:</strong> Parents and guardians can review, update, or request immediate deletion of their child's account and personal data at any time by contacting us at <a href="mailto:studyasaneducation@gmail.com" className="underline font-semibold">studyasaneducation@gmail.com</a>.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">3</span>
              Information We Collect
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <UserX size={18} className="text-blue-600" /> Account & Profile Data
                </h3>
                <p className="text-slate-600 text-xs">
                  Full Name, Email Address, Phone Number, Date of Birth, Gender, School Name, Class/Grade, Educational Board, Address, and Profile Picture.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" /> Academic & Classroom Data
                </h3>
                <p className="text-slate-600 text-xs">
                  Homework submissions, quiz responses, test attempts & scores, whiteboard notes, live classroom attendance logs, and chat messages/attachments.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Lock size={18} className="text-blue-600" /> Payment & Billing Data
                </h3>
                <p className="text-slate-600 text-xs">
                  Fee invoices, payment status, receipts, and transaction reference IDs. (Sensitive card or UPI PINs are processed securely by payment gateways and never stored on our servers).
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Eye size={18} className="text-blue-600" /> Device & Technical Logs
                </h3>
                <p className="text-slate-600 text-xs">
                  Device model, operating system version, network status, app diagnostics, and Firebase Cloud Messaging (FCM) tokens for push notifications.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">4</span>
              How We Use Your Information
            </h2>
            <ul className="space-y-2 text-sm sm:text-base text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Deliver interactive live video classes, study modules, quizzes, tests, and homework grading.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Track student academic progress, compute scores, and generate parent progress reports.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Send essential class reminders, homework alerts, fee receipts, and security verification codes.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={18} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>Maintain classroom discipline, data integrity, and diagnose application issues.</span>
              </li>
            </ul>
          </section>

          {/* Section 5 - Permissions */}
          <section className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">5</span>
              Mobile App Permissions
            </h2>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Permission</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-700">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">INTERNET</td>
                    <td className="px-4 py-2.5">To load curriculum, join live classes, and submit assignments.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">CAMERA & MICROPHONE (Optional)</td>
                    <td className="px-4 py-2.5">To participate in live video classes and capture homework photos.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">STORAGE / PHOTOS (Optional)</td>
                    <td className="px-4 py-2.5">To upload assignment PDFs/images and download certificates.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-medium text-slate-900">NOTIFICATIONS</td>
                    <td className="px-4 py-2.5">To receive class start notifications and exam notices.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 6 - Account Deletion */}
          <section id="account-deletion" className="space-y-3 p-5 bg-red-50/50 rounded-xl border border-red-200">
            <h2 className="text-xl font-bold text-red-950 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center font-bold text-sm">6</span>
              Account & Data Deletion (Google Play Compliant)
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              Users and parents can request complete permanent deletion of their account and all personal data:
            </p>
            <ul className="space-y-2 text-sm text-slate-700 list-disc list-inside">
              <li><strong>In-App Deletion:</strong> Go to <strong>Dashboard &gt; Settings &gt; Profile</strong>, click <strong>"Request Account Deletion"</strong>, and verify with the email OTP.</li>
              <li><strong>Web/Email Request:</strong> Email us directly at <a href="mailto:studyasaneducation@gmail.com" className="text-blue-600 font-semibold underline">studyasaneducation@gmail.com</a> with the subject <em>"Account Deletion Request"</em> from your registered email address.</li>
            </ul>
            <p className="text-xs text-slate-500 pt-1">
              Upon verification, all personal identifiers, account credentials, and submitted records will be permanently purged within 30 days.
            </p>
          </section>

          {/* Section 7 - Contact */}
          <section className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">7</span>
              Contact Us & Grievance Officer
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              For any questions, requests, or concerns regarding your privacy or this policy, please contact:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Mail className="text-blue-600 flex-shrink-0" size={18} />
                <span className="truncate">studyasaneducation@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Phone className="text-blue-600 flex-shrink-0" size={18} />
                <span>+91 7983758633</span>
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
