import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { Bell, LogOut, User, Settings, Menu } from "lucide-react";
import NotificationPanel from "@/components/dashboard/NotificationPanel";

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
          {/* LEFT — Menu + Logo */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-saBlueDarkHover/20"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6 text-white" />
            </Button>

            {/* Mobile Logo (matches sidebar logo area) */}
            <div className="flex items-center gap-2 lg:hidden">
              <img
                src="/studyasan-logo.png"
                alt="StudyAsan Logo"
                className="h-10"
              />
            </div>
          </div>

          {/* RIGHT — Notifications + User Menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
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

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 hover:bg-saBlueDarkHover/20"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-saVividOrange text-white">
                      {user && getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline font-medium text-white">
                    {user?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 bg-saBlue border border-saBlueLight text-white"
              >
                {/* Border above Profile */}
                <div className="border-b border-saBlueLight">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1 text-white p-2">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-saBlueLight">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                </div>

                {/* Profile item */}
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/profile")}
                  className="text-white cursor-pointer data-[highlighted]:bg-saBlueDarkHover/20 data-[highlighted]:text-white"
                >
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>

                {/* Settings item */}
                <DropdownMenuItem
                  onClick={() => navigate("/dashboard/settings")}
                  className="text-white cursor-pointer data-[highlighted]:bg-saBlueDarkHover/20 data-[highlighted]:text-white"
                >
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>

                {/* Border below Settings */}
                <div className="border-t border-saBlueLight my-1" />

                {/* Logout item */}
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
    </>
  );
}
