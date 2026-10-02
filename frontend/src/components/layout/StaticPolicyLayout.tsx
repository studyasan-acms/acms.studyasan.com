import { Link, Outlet } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export default function StaticPolicyLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafd]">
      {/* Solid Blue Header with StudyAsan Logo */}
      <header className="bg-[#0276D3] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/studyasan-logo.png"
              alt="StudyAsan"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </Link>

          {/* Solid Orange Login Button */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#eca209] hover:bg-[#d49108] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <LogIn size={15} />
            <span>Login to App</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Solid Clean Footer */}
      <footer className="bg-[#0f172a] text-slate-400 py-6 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-center sm:text-left">
          <p>© {new Date().getFullYear()} StudyAsan. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/privacy" className="hover:text-white hover:underline transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms-and-conditions" className="hover:text-white hover:underline transition-colors">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-white hover:underline transition-colors">
              Refund Policy
            </Link>
            <span>•</span>
            <Link to="/data-deletion" className="hover:text-white hover:underline transition-colors">
              Data Deletion
            </Link>
            <span>•</span>
            <a href="mailto:contact@studyasan.com" className="hover:text-white hover:underline transition-colors">
              contact@studyasan.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
