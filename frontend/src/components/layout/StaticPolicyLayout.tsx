import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, LogIn } from 'lucide-react';

export default function StaticPolicyLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Clean Minimal Header: ONLY StudyAsan Logo and simple back/login link */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <img
              src="/studyasan-logo.png"
              alt="StudyAsan Logo"
              className="h-10 sm:h-12 w-auto object-contain"
            />
          </Link>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-saBlue hover:bg-saBlueDark text-white text-xs sm:text-sm font-semibold shadow-sm transition-all duration-200"
            >
              <LogIn size={15} />
              <span>Login to App</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Clean Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <p>© {new Date().getFullYear()} StudyAsan. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/privacy" className="hover:text-saBlue hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/terms-and-conditions" className="hover:text-saBlue hover:underline">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-saBlue hover:underline">
              Refund Policy
            </Link>
            <span>•</span>
            <Link to="/data-deletion" className="hover:text-saBlue hover:underline">
              Data Deletion
            </Link>
            <span>•</span>
            <a href="mailto:contact@studyasan.com" className="hover:text-saBlue hover:underline">
              contact@studyasan.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
