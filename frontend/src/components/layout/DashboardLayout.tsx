import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchNotifications = useNotificationStore(
    (state) => state.fetchNotifications
  );

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // NEW: sidebar collapsed state managed here
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      fetchNotifications();
    }
  }, [isAuthenticated, navigate, fetchNotifications]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white lg:bg-gray-50">
      <Header toggleSidebar={() => setMobileSidebarOpen(true)} />

      <div className="flex">
        <Sidebar
          isMobileOpen={mobileSidebarOpen}
          closeMobile={() => setMobileSidebarOpen(false)}
          collapsed={sidebarCollapsed}              // <- NEW
          setCollapsed={setSidebarCollapsed}        // <- NEW
        />

        <main
          className={cn(
            "flex-1 p-6 transition-all duration-300",
            sidebarCollapsed ? "lg:ml-14" : "lg:ml-56" // <- ADJUST WIDTH
          )}
        >
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
