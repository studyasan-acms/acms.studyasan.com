import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useNotifications } from "@/hooks/useNotifications";
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

  // Initialize push notifications for all authenticated users
  useNotifications();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/login");
    } else if (!isAuthLoading && isAuthenticated) {
      useNotificationStore.getState().fetchNotifications();
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // Show skeleton while auth is hydrating from localStorage
  if (isAuthLoading) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header — fixed at top, dynamically offset for sidebar on desktop */}
      <Header
        toggleSidebar={() => setMobileSidebarOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          isMobileOpen={mobileSidebarOpen}
          closeMobile={() => setMobileSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Main content area */}
        <main
          className={cn(
            "flex-1 min-h-[calc(100vh-4rem)] transition-all duration-300 overflow-x-hidden",
            "p-4 sm:p-5 lg:p-6",
            // Desktop: offset for sidebar width
            sidebarCollapsed ? "lg:ml-14" : "lg:ml-56"
          )}
        >
          <div className="max-w-full animate-fadeUp">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
