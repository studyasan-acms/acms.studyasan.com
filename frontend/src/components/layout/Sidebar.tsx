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
  PenTool,
  Bell,
  Search,
  Puzzle,
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
    title: "Whiteboard",
    href: "/dashboard/whiteboard",
    icon: PenTool,
    roles: ["ADMIN", "TEACHER"],
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
    title: "Know Your Child",
    href: "/dashboard/know-your-child",
    icon: GraduationCap,
    roles: ["STUDENT"],
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
    roles: ["TEACHER", "STUDENT"],
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
    roles: ["ADMIN", "TEACHER"],
    permission: { resource: "enrollments", action: "view" },
  },
  {
    title: "Enquiries",
    href: "/dashboard/enquiries",
    icon: GraduationCap,
    roles: ["ADMIN", "TEACHER"],
    permission: { resource: "enquiries", action: "view" },
  },
  {
    title: "Role Management",
    href: "/dashboard/admin/roles",
    icon: Shield,
    roles: ["ADMIN"],
    permission: { resource: "roles", action: "view" },
  },
  {
    title: "Coupons",
    href: "/dashboard/admin/coupons",
    icon: DollarSign,
    roles: ["ADMIN"],
  },
  {
    title: "Announcements",
    href: "/dashboard/announcements",
    icon: Bell,
    roles: ["ADMIN"],
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
  const [searchQuery, setSearchQuery] = useState("");
  const [tooltip, setTooltip] = useState<{ title: string; top: number } | null>(
    null
  );
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);

  const filteredNavItems = navItems.filter((item) => {
    // Check if user has the base role
    const hasRole = item.roles.includes(user?.role || "");

    if (user?.role === "TEACHER") {
      // If the item has ADMIN in its roles, teachers need permission
      if (item.roles.includes("ADMIN")) {
        if (item.permission) {
          return hasPermission(item.permission.resource, item.permission.action);
        }
        // No permission specified but requires ADMIN — show if TEACHER is also in roles
        // (e.g. Curriculum, which is always visible to teachers)
        return hasRole;
      }
      // TEACHER-only item (no ADMIN), always show
      return hasRole;
    }

    return hasRole;
  });

  const searchedNavItems = filteredNavItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* Search */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-saBlueLight bg-saBlueDarkHover/10">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-white/50" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/10 focus:border-white/20 text-white rounded-md pl-8 pr-7 py-1 text-xs outline-none transition-all placeholder:text-white/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          className="flex-1 px-1 py-2 space-y-1 overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}
        >
          {searchedNavItems.length === 0 ? (
            <div className="text-center py-4 text-xs text-white/40">
              No results found
            </div>
          ) : (
            searchedNavItems.map((item, index) => (
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
          )))}

          <style>
            {`
              nav::-webkit-scrollbar {
                width: 4px;
              }
              nav::-webkit-scrollbar-track {
                background: transparent;
              }
              nav::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 4px;
              }
              nav::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.3);
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
