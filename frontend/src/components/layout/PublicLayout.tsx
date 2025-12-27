import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, Clock, MapPin, Facebook, Twitter, Instagram, Youtube, ChevronUp } from 'lucide-react';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
  { name: 'Career', path: '/career' },
  { name: 'Blog', path: '/blog' },
];

export default function PublicLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-2 text-sm hidden md:block">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <a href="tel:+917983758633" className="flex items-center gap-2 hover:text-blue-200 transition-colors">
              <Phone size={14} />
              <span>+91 7983758633</span>
            </a>
            <a href="mailto:studyasaneducation@gmail.com" className="flex items-center gap-2 hover:text-blue-200 transition-colors">
              <Mail size={14} />
              <span>studyasaneducation@gmail.com</span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} />
            <span>Working Hours: 10 AM - 7 PM</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${isScrolled
          ? 'bg-blue-900/95 backdrop-blur-md shadow-lg'
          : 'bg-blue-900'
          }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/studyasan-logo.png"
                alt="StudyAsan"
                className="h-14 w-auto object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative font-medium transition-colors hover:text-blue-300 ${location.pathname === link.path
                    ? 'text-blue-300'
                    : 'text-white/90'
                    }`}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-blue-400 rounded-full" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-4">
              <Link
                to="/login"
                className="px-5 py-2.5 font-medium text-white hover:text-blue-300 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-full shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 bg-gray-900 ${isMobileMenuOpen ? 'max-h-screen border-t border-white/10' : 'max-h-0'
            }`}
        >
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${location.pathname === link.path
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  {link.name}
                </Link>
              ))}
              <hr className="my-2 border-white/10" />
              <Link
                to="/login"
                className="px-4 py-3 rounded-lg font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg text-center"
              >
                Sign Up
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Main Footer */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* About Column */}
            <div className="space-y-6">
              <img
                src="/studyasan-logo.png"
                alt="StudyAsan"
                className="h-16 w-auto brightness-0 invert"
              />
              <p className="text-gray-400 leading-relaxed">
                StudyAsan is devoted to perfection in teaching and learning.
                "The Path to Success" - providing quality education to students across India.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Facebook size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-sky-500 transition-colors">
                  <Twitter size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors">
                  <Instagram size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <Youtube size={18} />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-6 relative">
                Quick Links
                <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-blue-500 -mb-2"></span>
              </h4>
              <ul className="space-y-3">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to="/login"
                    className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300"
                  >
                    Login
                  </Link>
                </li>
              </ul>
            </div>

            {/* Our Services */}
            <div>
              <h4 className="text-lg font-bold mb-6 relative">
                Our Services
                <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-blue-500 -mb-2"></span>
              </h4>
              <ul className="space-y-3">
                <li className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300 cursor-pointer">
                  Kids Classes
                </li>
                <li className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300 cursor-pointer">
                  Grade 4-8 Tuition
                </li>
                <li className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300 cursor-pointer">
                  Grade 9-10 Tuition
                </li>
                <li className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300 cursor-pointer">
                  Grade 11-12 Tuition
                </li>
                <li className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300 cursor-pointer">
                  NET/JRF Preparation
                </li>
                <li className="text-gray-400 hover:text-white hover:pl-2 transition-all duration-300 cursor-pointer">
                  Competitive Exams
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-lg font-bold mb-6 relative">
                Contact Us
                <span className="absolute bottom-0 left-0 w-12 h-0.5 bg-blue-500 -mb-2"></span>
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-400">Nainital, Uttarakhand, India</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                  <a href="tel:+917983758633" className="text-gray-400 hover:text-white transition-colors">
                    +91 7983758633
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Mail size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                  <a href="mailto:studyasaneducation@gmail.com" className="text-gray-400 hover:text-white transition-colors break-all">
                    studyasaneducation@gmail.com
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-400">10:00 AM - 7:00 PM</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700/50">
          <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} StudyAsan. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm">
                <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
                <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
          }`}
      >
        <ChevronUp size={24} />
      </button>
    </div>
  );
}
