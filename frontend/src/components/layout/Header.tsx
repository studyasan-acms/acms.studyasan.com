import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import {
  Bell,
  LogOut,
  User,
  Settings,
  Menu,
  Languages,
  Globe,
  Megaphone,
  ChevronRight,
} from "lucide-react";
import NotificationPanel from "@/components/dashboard/NotificationPanel";
import AnnouncementPanel from "@/components/dashboard/AnnouncementPanel";

// Language options
const languages = [
  { code: "en", name: "English",    flag: "🇺🇸" },
  { code: "hi", name: "हिन्दी",      flag: "🇮🇳" },
  { code: "es", name: "Español",    flag: "🇪🇸" },
  { code: "fr", name: "Français",   flag: "🇫🇷" },
  { code: "de", name: "Deutsch",    flag: "🇩🇪" },
  { code: "zh", name: "中文",        flag: "🇨🇳" },
  { code: "ja", name: "日本語",      flag: "🇯🇵" },
  { code: "ko", name: "한국어",      flag: "🇰🇷" },
  { code: "ar", name: "العربية",    flag: "🇸🇦" },
  { code: "pt", name: "Português",  flag: "🇵🇹" },
  { code: "ru", name: "Русский",    flag: "🇷🇺" },
  { code: "it", name: "Italiano",   flag: "🇮🇹" },
];

// Map known route prefixes to human-readable page names
const routeLabels: { prefix: string; label: string }[] = [
  { prefix: "/dashboard/students",       label: "Students" },
  { prefix: "/dashboard/teachers",       label: "Teachers" },
  { prefix: "/dashboard/offerings",      label: "Curriculum" },
  { prefix: "/dashboard/subjects",       label: "Curriculum" },
  { prefix: "/dashboard/class-sessions", label: "Class Sessions" },
  { prefix: "/dashboard/whiteboard",     label: "Whiteboard" },
  { prefix: "/dashboard/homework",       label: "Homework" },
  { prefix: "/dashboard/activities",     label: "Activities" },
  { prefix: "/dashboard/student-activities", label: "Learning Games" },
  { prefix: "/dashboard/enrollments",    label: "Billing & Invoices" },
  { prefix: "/dashboard/enquiries",      label: "Enquiries" },
  { prefix: "/dashboard/chats",          label: "Chats" },
  { prefix: "/dashboard/admin/chats",    label: "All Chats" },
  { prefix: "/dashboard/admin/roles",    label: "Role Management" },
  { prefix: "/dashboard/admin/coupons",  label: "Coupons" },
  { prefix: "/dashboard/admin/agencies", label: "Agencies & Referrers" },
  { prefix: "/dashboard/announcements",  label: "Announcements" },
  { prefix: "/dashboard/jobs",           label: "Jobs & Internships" },
  { prefix: "/dashboard/explore",        label: "Explore" },
  { prefix: "/dashboard/know-your-child", label: "Know Your Child" },
  { prefix: "/dashboard/profile",        label: "Profile" },
  { prefix: "/dashboard/settings",       label: "Settings" },
  { prefix: "/dashboard/home",           label: "Home" },
  { prefix: "/dashboard/analytics",      label: "Analytics" },
  { prefix: "/tests",                    label: "Tests" },
  { prefix: "/dashboard",                label: "Dashboard" },
];

function usePageLabel() {
  const { pathname } = useLocation();
  // Sort by length descending so more specific prefixes match first
  const sorted = [...routeLabels].sort((a, b) => b.prefix.length - a.prefix.length);
  const match = sorted.find((r) => pathname.startsWith(r.prefix));
  return match?.label ?? "Dashboard";
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function Header({
  toggleSidebar,
}: {
  toggleSidebar: () => void;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { unreadCount } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const pageLabel = usePageLabel();

  const [currentLanguage, setCurrentLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
      };
      const googtrans = getCookie("googtrans");
      if (googtrans) {
        const parts = googtrans.split("/");
        const lang = parts[parts.length - 1];
        if (lang && languages.find((l) => l.code === lang)) return lang;
      }
      const saved = localStorage.getItem("preferredLanguage");
      if (saved && languages.find((lang) => lang.code === saved)) return saved;
    }
    return "en";
  });

  const handleLanguageChange = (langCode: string) => {
    localStorage.setItem("preferredLanguage", langCode);
    setCurrentLanguage(langCode);
    const cookieValue = langCode === "en" ? "/en/en" : `/en/${langCode}`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=${cookieValue}; path=/;`;
    window.location.reload();
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const currentLang = languages.find((l) => l.code === currentLanguage);

  return (
    <>
      <header
        className="sticky top-0 z-40 h-16 flex-shrink-0 flex items-center"
        style={{
          background: "linear-gradient(180deg, #0276D3 0%, #025AA3 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 1px 8px 0 rgba(2,86,163,0.18)",
        }}
      >
        <div className="flex items-center w-full h-full px-3 sm:px-4 gap-2">

          {/* ── LEFT: Hamburger (mobile) + Logo (mobile) */}
          <div className="flex items-center gap-2 lg:hidden">
            {/* Hamburger */}
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-white/15 transition-colors text-white"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo — visible on mobile ONLY */}
            <img
              src="/studyasan-logo.png"
              alt="StudyAsan"
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* ── CENTER / DESKTOP LEFT: Page title breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
            <span className="text-white/60 text-sm font-medium">StudyAsan</span>
            <ChevronRight className="h-3.5 w-3.5 text-white/30 flex-shrink-0" />
            <span className="text-white text-sm font-semibold truncate">
              {pageLabel}
            </span>
          </div>

          {/* Mobile: flex spacer */}
          <div className="flex-1 lg:hidden" />

          {/* ── RIGHT: Action icons */}
          <div className="flex items-center gap-0.5 sm:gap-1">

            {/* Language */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative p-2 rounded-lg hover:bg-white/15 transition-colors text-white"
                  title={`Language: ${currentLang?.name}`}
                >
                  <Globe className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none">
                    {currentLang?.flag}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 max-h-72 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl p-1"
              >
                <DropdownMenuLabel className="text-slate-500 font-semibold text-xs uppercase tracking-wider pb-2 px-2 flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5" />
                  Language
                </DropdownMenuLabel>
                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`cursor-pointer flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-sm ${
                      currentLanguage === language.code
                        ? "bg-saBlueSubtle text-saBlue font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base">{language.flag}</span>
                    <span>{language.name}</span>
                    {currentLanguage === language.code && (
                      <span className="ml-auto text-saBlue text-xs">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <DropdownMenuItem
                    onClick={() => handleLanguageChange("en")}
                    className="cursor-pointer flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-base">🔄</span>
                    <span>Back to English</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notifications */}
            <div className="relative">
              <button
                className="relative p-2 rounded-lg hover:bg-white/15 transition-colors text-white"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowAnnouncements(false);
                }}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center text-[10px] font-bold rounded-full text-white"
                    style={{ background: "#eca209" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Announcements */}
            <div className="relative">
              <button
                className="relative p-2 rounded-lg hover:bg-white/15 transition-colors text-white"
                onClick={() => {
                  setShowAnnouncements(!showAnnouncements);
                  setShowNotifications(false);
                }}
                aria-label="Announcements"
              >
                <Megaphone className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full border-2"
                  style={{ background: "#eca209", borderColor: "#025AA3" }} />
              </button>
            </div>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 pl-1 pr-2 rounded-lg hover:bg-white/15 transition-colors ml-0.5">
                  <Avatar className="h-8 w-8 ring-2 ring-white/30">
                    <AvatarImage
                      src={user?.profile_url}
                      alt={user?.name || "User"}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <AvatarFallback
                      className="text-white text-xs font-bold"
                      style={{ background: "#eca209" }}
                    >
                      {user && getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-semibold text-white max-w-[120px] truncate">
                    {user?.name}
                  </span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-1.5"
              >
                {/* User info */}
                <div className="px-3 py-2 mb-1 rounded-lg bg-saBlueSubtle">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: "#0276D3" }}>
                    {user?.role}
                  </span>
                </div>

                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/profile")}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-slate-700 hover:bg-saBlueSubtle hover:text-saBlue transition-colors text-sm"
                >
                  <User className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/settings")}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-slate-700 hover:bg-saBlueSubtle hover:text-saBlue transition-colors text-sm"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>

                <div className="border-t border-slate-100 my-1" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      <AnnouncementPanel
        isOpen={showAnnouncements}
        onClose={() => setShowAnnouncements(false)}
      />
    </>
  );
}
