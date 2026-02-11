import React, { useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Home,
  Users,
  BookOpen,
  GraduationCap,
  UserCheck,
  LayoutDashboard,
  ClipboardList,
  FileText,
  Award,
  MessageCircle,
  MessagesSquare,
  X,
  ChevronsLeft,
  ChevronsRight,
  Video,
  Library,
  Gamepad2,
  FolderOpen,
  Play,
  DollarSign,
  TrendingUp,
  Settings,
  Shield,
  Briefcase,
} from "lucide-react";
import { createPortal } from "react-dom";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  permission?: { resource: string; action: string }; // Optional permission check for teachers
}

const navItems: NavItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: Home,
    roles: ["STUDENT"],
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Curriculum",
    href: "/dashboard/offerings",
    icon: BookOpen,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Curriculum",
    href: "/dashboard/subjects",
    icon: BookOpen,
    roles: ["STUDENT"],
  },
  {
    title: "Students",
    href: "/dashboard/students",
    icon: Users,
    roles: ["ADMIN", "TEACHER"],
    permission: { resource: "students", action: "view" },
  },
  {
    title: "Teachers",
    href: "/dashboard/teachers",
    icon: UserCheck,
    roles: ["ADMIN"],
    permission: { resource: "teachers", action: "view" },
  },
  {
    title: "Class Sessions",
    href: "/dashboard/class-sessions",
    icon: Video,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
  },
  {
    title: "Tests",
    href: "/tests",
    icon: FileText,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
  },
  {
    title: "Activities",
    href: "/dashboard/activities",
    icon: Gamepad2,
    roles: ["ADMIN", "TEACHER"],
  },
  {
    title: "Learning Games",
    href: "/dashboard/student-activities",
    icon: Play,
    roles: ["STUDENT"],
  },
  {
    title: "Homework",
    href: "/dashboard/homework",
    icon: FileText,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
  },
  {
    title: "Jobs & Internships",
    href: "/dashboard/jobs",
    icon: Briefcase,
    roles: ["ADMIN", "STUDENT"],
  },
  {
    title: "Chats",
    href: "/dashboard/chats",
    icon: MessageCircle,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
  },
  {
    title: "All Chats",
    href: "/dashboard/admin/chats",
    icon: MessagesSquare,
    roles: ["ADMIN"],
  },
  {
    title: "Enrollments",
    href: "/dashboard/enrollments",
    icon: GraduationCap,
    roles: ["ADMIN"],
    permission: { resource: "enrollments", action: "view" },
  },
  {
    title: "Enquiries",
    href: "/dashboard/enquiries",
    icon: GraduationCap,
    roles: ["ADMIN"],
    permission: { resource: "enquiries", action: "view" },
  },
  {
    title: "Role Management",
    href: "/dashboard/admin/roles",
    icon: Shield,
    roles: ["ADMIN"],
    permission: { resource: "roles", action: "view" },
  },
];

export default function Sidebar({
  isMobileOpen,
  closeMobile,
  collapsed,
  setCollapsed,
}: {
  isMobileOpen: boolean;
  closeMobile: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const user = useAuthStore((state) => state.user);
  const { hasPermission } = usePermissions();
  const [tooltip, setTooltip] = useState<{ title: string; top: number } | null>(
    null
  );
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);

  const filteredNavItems = navItems.filter((item) => {
    // Check if user has the base role
    const hasRole = item.roles.includes(user?.role || "");

    // If user is a teacher and item requires ADMIN, check permissions
    if (user?.role === "TEACHER" && item.roles.includes("ADMIN") && !hasRole) {
      // If item has permission requirement, check if teacher has that permission
      if (item.permission) {
        return hasPermission(item.permission.resource, item.permission.action);
      }
      return false;
    }

    return hasRole;
  });

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 text-white transform transition-all duration-300 flex flex-col border-r border-saBlueLight",
          collapsed ? "w-14" : "w-56",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "overflow-hidden bg-saBlue"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-saBlueLight">
          <div className="flex items-center justify-center flex-1">
            {collapsed ? (
              <img
                src="/studyasan-logo-lady.png"
                alt="StudyAsan Logo Mini"
                className="h-8 w-8"
              />
            ) : (
              <img
                src="/studyasan-logo.png"
                alt="StudyAsan Logo"
                className="h-10 w-auto max-w-[80%] object-contain"
              />
            )}
          </div>

          <button
            onClick={closeMobile}
            className="lg:hidden p-1 rounded hover:bg-saBlueLight/30"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 px-1 py-2 space-y-1 overflow-y-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {filteredNavItems.map((item, index) => (
            <div
              key={item.href}
              className="group relative flex items-center"
              onMouseEnter={() => {
                if (collapsed && iconRefs.current[index]) {
                  const rect = iconRefs.current[index]!.getBoundingClientRect();
                  setTooltip({
                    title: item.title,
                    top: rect.top + rect.height / 2,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <NavLink
                to={item.href}
                end={item.href === "/dashboard"}
                onClick={closeMobile}
                className={({ isActive }) =>
                  cn(
                    "flex items-center w-full h-10 px-3 rounded-md transition-all duration-200",
                    isActive
                      ? "text-saVividOrange bg-saBlue font-semibold text-[0.95rem]"
                      : "text-white hover:bg-saBlueDarkHover/20 text-sm",
                    collapsed ? "justify-center" : "justify-start"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      ref={(el) => {
                        iconRefs.current[index] = el ?? null;
                      }}
                      className="flex-shrink-0"
                    >
                      <item.icon
                        className={cn(
                          "transition-all",
                          isActive ? "h-6 w-6" : "h-5 w-5"
                        )}
                      />
                    </div>

                    {!collapsed && (
                      <span
                        className={cn(
                          "ml-4 transition-all",
                          isActive ? "font-semibold text-[0.95rem]" : "text-sm"
                        )}
                      >
                        {item.title}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </div>
          ))}

          <style>
            {`
              nav::-webkit-scrollbar {
                display: none;
              }
            `}
          </style>
        </nav>

        {/* Bottom collapse button */}
        {!isMobileOpen && (
          <div className="border-t border-saBlueLight">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center justify-center p-2 rounded-md hover:bg-saBlueDarkHover/20"
            >
              {collapsed ? (
                <ChevronsRight className="h-5 w-5 text-white" />
              ) : (
                <ChevronsLeft className="h-5 w-5 text-white" />
              )}
              {!collapsed && <span className="ml-2 text-white">Collapse</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Tooltip */}
      {tooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: "3.7rem",
              top: tooltip.top,
              transform: "translateY(-50%)",
            }}
            className="px-2 py-1 bg-saBlue text-white text-xs rounded shadow-lg z-50"
          >
            {tooltip.title}
          </div>,
          document.body
        )}
    </>
  );
}
