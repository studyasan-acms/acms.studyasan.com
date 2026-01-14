import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import Header from "./Header";
import Sidebar from "./Sidebar";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/login");
    } else if (!isAuthLoading && isAuthenticated) {
      // Only fetch notifications after auth is fully loaded
      useNotificationStore.getState().fetchNotifications();
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // Show skeleton while auth is hydrating from localStorage
  if (isAuthLoading) {
    return <DashboardSkeleton />;
  }

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
