import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Bell, LogOut, User, Settings, Menu, Languages, Globe, Megaphone } from "lucide-react";
import NotificationPanel from "@/components/dashboard/NotificationPanel";
import AnnouncementPanel from "@/components/dashboard/AnnouncementPanel";

// Add language options
const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
];

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
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check for Google Translate cookie
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };

      const googtrans = getCookie('googtrans');
      if (googtrans) {
        // Cookie format is usually /source/target or /auto/target
        // We want the target language (last part)
        const parts = googtrans.split('/');
        const lang = parts[parts.length - 1];
        if (lang && languages.find(l => l.code === lang)) {
          return lang;
        }
      }

      // Check localStorage for saved preference
      const saved = localStorage.getItem('preferredLanguage');
      if (saved && languages.find(lang => lang.code === saved)) {
        return saved;
      }
    }
    return 'en';
  });



  const handleLanguageChange = (langCode: string) => {
    const language = languages.find(lang => lang.code === langCode);
    if (!language) return;



    // Save preference
    localStorage.setItem('preferredLanguage', langCode);
    setCurrentLanguage(langCode);

    // Show loading feedback
    const button = document.querySelector('[title="Translate Page"]');
    if (button) {
      button.textContent = '⏳';
      setTimeout(() => {
        button.innerHTML = '';
        button.appendChild(document.createElement('div')); // Reset content
      }, 1000);
    }

    // Set the cookie for Google Translate
    const cookieValue = langCode === 'en' ? '/en/en' : `/en/${langCode}`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname}`;
    document.cookie = `googtrans=${cookieValue}; path=/;`; // Fallback for some browsers


    window.location.reload();
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <>
      {/* HEADER — Styled Like Sidebar Header */}
      <header className="bg-saBlue border-b border-saBlueLight h-16 flex items-center sticky top-0 z-40">
        <div className="flex items-center justify-between w-full px-4">
          {/* LEFT SECTION — Logo (Desktop Only) */}
          <div className="hidden lg:flex items-center gap-4">
            <img
              src="/studyasan-logo.png"
              alt="StudyAsan Logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* MAIN SECTION — 5 Icons (Equal width on mobile, right-aligned on desktop) */}
          <div className="grid grid-cols-5 w-full lg:flex lg:w-auto lg:items-center gap-0 lg:gap-3 items-center justify-items-center">
            {/* 1. Menu Button (Mobile Only) */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-saBlueDarkHover/20"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6 text-white" />
            </Button>

            {/* 2. Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-saBlueDarkHover/20 relative"
                  title={`Translate Page - Current: ${languages.find(lang => lang.code === currentLanguage)?.name || 'English'}`}
                >
                  <Globe className="h-5 w-5 text-white" />
                  <span className="absolute -bottom-1 -right-1 text-[10px]">
                    {languages.find(lang => lang.code === currentLanguage)?.flag}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-48 max-h-64 overflow-y-auto bg-white border border-gray-200 shadow-lg"
              >
                <DropdownMenuLabel className="text-gray-700 font-semibold border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    Choose Language
                  </div>
                </DropdownMenuLabel>

                {languages.map((language) => (
                  <DropdownMenuItem
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`cursor-pointer flex items-center gap-3 py-2 px-3 hover:bg-blue-50 transition-colors ${currentLanguage === language.code ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                      }`}
                  >
                    <span className="text-lg">{language.flag}</span>
                    <span className="font-medium">{language.name}</span>
                    {currentLanguage === language.code && (
                      <span className="ml-auto text-blue-600 text-xs font-bold">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}

                <div className="border-t border-gray-100 mt-2 pt-2">
                  <DropdownMenuItem
                    onClick={() => handleLanguageChange('en')}
                    className="cursor-pointer flex items-center gap-3 py-2 px-3 hover:bg-gray-50 text-gray-600 focus:text-gray-700 transition-colors"
                  >
                    <span className="text-lg">🔄</span>
                    <span className="font-medium">Back to English</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 3. Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-saBlueDarkHover/20"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5 text-white" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </div>

            {/* 4. Announcements */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-saBlueDarkHover/20"
                onClick={() => setShowAnnouncements(!showAnnouncements)}
                title="View Announcements"
              >
                <Megaphone className="h-5 w-5 text-white" />
                <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-600 rounded-full border-2 border-saBlue animate-pulse"></span>
              </Button>
            </div>

            {/* 5. User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-saBlueDarkHover/20 p-1 md:px-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.profile_url}
                      alt={user?.name || 'User'}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <AvatarFallback className="bg-saVividOrange text-white">
                      {user && getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline font-medium text-white">
                    {user?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 bg-saBlue border border-saBlueLight text-white"
              >
                <div className="border-b border-saBlueLight">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1 text-white p-2">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-saBlueLight">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </div>

                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/profile")}
                  className="text-white cursor-pointer data-[highlighted]:bg-saBlueDarkHover/20 data-[highlighted]:text-white"
                >
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/settings")}
                  className="text-white cursor-pointer data-[highlighted]:bg-saBlueDarkHover/20 data-[highlighted]:text-white"
                >
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>

                <div className="border-t border-saBlueLight my-1" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-white cursor-pointer data-[highlighted]:bg-saBlueDarkHover/20 data-[highlighted]:text-white"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
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
