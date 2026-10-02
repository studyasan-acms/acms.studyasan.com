import { usePageTitle } from '@/hooks/usePageTitle';

export default function TermsConditionsPage() {
  usePageTitle('Terms & Conditions - StudyAsan');

  return (
    <div className="py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-12 text-slate-800 leading-relaxed space-y-8">
          
          {/* Document Header */}
          <div className="border-b border-slate-200 pb-6 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Terms & Conditions
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              StudyAsan (Android, iOS & Web ACMS Platform) • Last Updated: October 2, 2026 • Effective Date: October 2, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              1. Acceptance & Legal Binding Nature
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              By downloading, installing, accessing, or using the <strong>StudyAsan mobile applications (Google Play Store and Apple App Store)</strong> or our web portal at <a href="https://acms.studyasan.com" className="text-[#0276D3] underline">https://acms.studyasan.com</a> and <a href="https://www.studyasan.com" className="text-[#0276D3] underline">https://www.studyasan.com</a>, you agree to be bound by these Terms & Conditions. If you do not agree, you must immediately cease accessing and delete the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              2. Eligibility & Target Audience (Age 9 and Older)
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              StudyAsan provides educational courses and tutoring for students aged <strong>9 and older</strong>. Minors under 18 years of age must register and enroll under the supervision and verifiable consent of a parent, legal guardian, or authorized institution. Parents/guardians assume full legal responsibility for actions performed by minor users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              3. Classroom Code of Conduct & Prohibition on Recording
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              Users must maintain respectful decorum during live interactive classroom sessions, chats, and whiteboard discussions.
            </p>
            <ul className="space-y-1.5 text-sm sm:text-base text-slate-700 list-disc list-inside pl-2">
              <li><strong>Zero Tolerance for Abuse:</strong> Abusive, harassing, vulgar, or disruptive behavior towards teachers or fellow students will result in immediate permanent suspension without refund.</li>
              <li><strong>Strict Prohibition on Screen Recording:</strong> Recording, screen-capturing, downloading, or redistributing live lectures, teacher video feeds, or whiteboard notes using any external tool or software is strictly illegal and constitutes copyright infringement under the Copyright Act, 1957.</li>
              <li><strong>Academic Integrity:</strong> Cheating, impersonation, or using automated answering bots during mock tests and certification exams is strictly prohibited.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              4. Intellectual Property Rights
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              All curriculum, test papers, video lectures, question banks, study notes, graphics, software code, and trademarks belong exclusively to StudyAsan. Users are granted a limited, personal, non-exclusive license for personal educational study only. No content may be copied, modified, resold, or redistributed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              5. Fees, Billing & Refund Policy
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              Course fees and subscription pricing are displayed at checkout and billed via automated digital invoices. All payments are subject to our <strong><a href="/refund-policy" className="text-[#0276D3] underline">Refund & Cancellation Policy</a></strong>. Refund requests must be made within 7 calendar days of course commencement, provided fewer than 25% of lectures have been attended.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              6. Limitation of Liability & Warranty Disclaimers
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              StudyAsan provides educational content on an "as is" and "as available" basis. While we provide high quality education, StudyAsan does not guarantee specific examination results, marks, or competitive ranks. To the maximum extent permitted by law, StudyAsan's total aggregate liability shall not exceed the actual fee paid by the user in the preceding 3 months.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 border-l-4 border-[#0276D3] pl-3">
              7. Governing Law & Dispute Resolution
            </h2>
            <p className="text-sm sm:text-base text-slate-700">
              These Terms shall be governed by the laws of <strong>India</strong>. Any dispute arising out of this Agreement shall be subject to binding arbitration under the Arbitration and Conciliation Act, 1996 in <strong>Haldwani / Nainital, Uttarakhand, India</strong>. Competent courts in <strong>Nainital District, Uttarakhand, India</strong> shall have exclusive jurisdiction.
            </p>
          </section>

          <section className="space-y-3 border-t border-slate-200 pt-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              8. Contact & Legal Notices
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
