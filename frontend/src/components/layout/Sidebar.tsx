import React, { useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { isStudentTillClass12 } from "@/utils/studentUtils";
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
  Building2,
  TrendingUp,
  Settings,
  Shield,
  Briefcase,
  PenTool,
  Bell,
  Search,
  Puzzle,
  Compass,
  ChevronDown,
  Layers,
} from "lucide-react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  permission?: { resource: string; action: string };
  group?: string;
}

// Nav items grouped by section
const navItems: NavItem[] = [
  // ── Overview
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["STUDENT", "ADMIN", "TEACHER"],
    group: "Overview",
  },
  {
    title: "Explore",
    href: "/dashboard/explore",
    icon: Compass,
    roles: ["STUDENT"],
    group: "Overview",
  },

  // ── Learning
  {
    title: "Curriculum",
    href: "/dashboard/offerings",
    icon: BookOpen,
    roles: ["ADMIN", "TEACHER"],
    group: "Learning",
  },
  {
    title: "Curriculum",
    href: "/dashboard/subjects",
    icon: BookOpen,
    roles: ["STUDENT"],
    group: "Learning",
  },
  {
    title: "Class Sessions",
    href: "/dashboard/class-sessions",
    icon: Video,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    group: "Learning",
  },
  {
    title: "Sections",
    href: "/dashboard/sections",
    icon: Layers,
    roles: ["ADMIN"],
    permission: { resource: "sections", action: "view" },
    group: "Learning",
  },
  {
    title: "Whiteboard",
    href: "/dashboard/whiteboard",
    icon: PenTool,
    roles: ["ADMIN", "TEACHER"],
    group: "Learning",
  },
  {
    title: "Tests",
    href: "/tests",
    icon: FileText,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    group: "Learning",
  },
  {
    title: "Homework",
    href: "/dashboard/homework",
    icon: ClipboardList,
    roles: ["ADMIN", "TEACHER", "STUDENT"],
    group: "Learning",
  },
  {
    title: "Activities",
    href: "/dashboard/activities",
    icon: Gamepad2,
    roles: ["ADMIN", "TEACHER"],
    group: "Learning",
  },
  {
    title: "Learning Games",
    href: "/dashboard/student-activities",
    icon: Play,
    roles: ["STUDENT"],
    group: "Learning",
  },

  // ── People
  {
    title: "Students",
    href: "/dashboard/students",
    icon: Users,
    roles: ["ADMIN", "TEACHER"],
    group: "People",
  },
  {
    title: "Teachers",
    href: "/dashboard/teachers",
    icon: UserCheck,
    roles: ["ADMIN"],
    permission: { resource: "teachers", action: "view" },
    group: "People",
  },
  {
    title: "Know Your Child",
    href: "/dashboard/know-your-child",
    icon: GraduationCap,
    roles: ["STUDENT"],
    group: "People",
  },
  {
    title: "Chats",
    href: "/dashboard/chats",
    icon: MessageCircle,
    roles: ["TEACHER", "STUDENT"],
    group: "People",
  },
  {
    title: "All Chats",
    href: "/dashboard/admin/chats",
    icon: MessagesSquare,
    roles: ["ADMIN"],
    group: "People",
  },

  // ── Admin / Finance
  {
    title: "Billing & Invoices",
    href: "/dashboard/enrollments",
    icon: DollarSign,
    roles: ["ADMIN", "TEACHER"],
    permission: { resource: "enrollments", action: "view" },
    group: "Finance",
  },
  {
    title: "Enquiries",
    href: "/dashboard/enquiries",
    icon: GraduationCap,
    roles: ["ADMIN", "TEACHER"],
    permission: { resource: "enquiries", action: "view" },
    group: "Finance",
  },
  {
    title: "Jobs & Internships",
    href: "/dashboard/jobs",
    icon: Briefcase,
    roles: ["ADMIN", "STUDENT"],
    group: "Finance",
  },

  // ── System
  {
    title: "Role Management",
    href: "/dashboard/admin/roles",
    icon: Shield,
    roles: ["ADMIN"],
    permission: { resource: "roles", action: "view" },
    group: "System",
  },
  {
    title: "Coupons",
    href: "/dashboard/admin/coupons",
    icon: DollarSign,
    roles: ["ADMIN"],
    group: "System",
  },
  {
    title: "Agencies & Referrers",
    href: "/dashboard/admin/agencies",
    icon: Building2,
    roles: ["ADMIN"],
    group: "System",
  },
  {
    title: "Announcements",
    href: "/dashboard/announcements",
    icon: Bell,
    roles: ["ADMIN"],
    group: "System",
  },
];

// Group label icons
const groupIcons: Record<string, React.ElementType> = {
  Overview: LayoutDashboard,
  Learning: BookOpen,
  People: Users,
  Finance: DollarSign,
  System: Settings,
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const filteredNavItems = navItems.filter((item) => {
    const hasRole = item.roles.includes(user?.role || "");

    if (user?.role === "TEACHER") {
      if (item.roles.includes("ADMIN")) {
        if (item.permission) {
          return hasPermission(item.permission.resource, item.permission.action);
        }
        return hasRole;
      }
      return hasRole;
    }

    if (
      item.href === "/dashboard/jobs" ||
      item.title.toLowerCase().includes("job")
    ) {
      if (user?.role === "STUDENT" && isStudentTillClass12(user)) {
        return false;
      }
    }

    return hasRole;
  });

  const searchedNavItems = filteredNavItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build groups from filtered items
  const groupedItems = searchedNavItems.reduce(
    (acc, item) => {
      const group = item.group || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>
  );

  const groupOrder = ["Overview", "Learning", "People", "Finance", "System", "Other"];
  const orderedGroups = groupOrder.filter((g) => groupedItems[g]?.length > 0);

  let flatIndex = 0;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 text-white flex flex-col transition-all duration-300 ease-in-out bg-saBlue",
          "border-r border-white/10 shadow-lg",
          collapsed ? "w-14" : "w-56",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* ── Logo / Brand Header */}
        <div
          className={cn(
            "flex items-center border-b border-white/10 flex-shrink-0",
            collapsed ? "h-16 justify-center px-2" : "h-16 px-4 justify-between"
          )}
        >
          {collapsed ? (
            <img
              src="/studyasan-logo-lady.png"
              alt="StudyAsan"
              className="h-8 w-8 object-contain"
            />
          ) : (
            <>
              <img
                src="/studyasan-logo.png"
                alt="StudyAsan"
                className="h-9 w-auto max-w-[80%] object-contain"
              />
              {/* Mobile close button */}
              <button
                onClick={closeMobile}
                className="lg:hidden p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </>
          )}
        </div>

        {/* ── Search bar (only when expanded) */}
        {!collapsed && (
          <div className="px-3 py-2.5 border-b border-white/10 flex-shrink-0 bg-black/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/50 pointer-events-none" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 
                           border border-white/10 focus:border-white/25
                           text-white text-xs rounded-lg pl-8 pr-7 py-1.5
                           outline-none transition-all placeholder:text-white/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/15 text-white/50 hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation */}
        <nav
          className="flex-1 overflow-y-auto py-2 scrollbar-thin"
          style={{ scrollbarColor: "rgba(255,255,255,0.15) transparent" }}
        >
          {searchedNavItems.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/40">
              No results found
            </div>
          ) : (
            orderedGroups.map((groupName) => {
              const items = groupedItems[groupName];
              const isGroupCollapsed = collapsedGroups[groupName];

              return (
                <div key={groupName} className="mb-1">
                  {/* Group header — only when sidebar is expanded and no active search */}
                  {!collapsed && !searchQuery && (
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center justify-between px-3 py-1.5 mt-1 group"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">
                        {groupName}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3 w-3 text-white/30 group-hover:text-white/50 transition-all",
                          isGroupCollapsed ? "-rotate-90" : ""
                        )}
                      />
                    </button>
                  )}

                  {/* Nav items in group */}
                  {!isGroupCollapsed &&
                    items.map((item) => {
                      const currentIndex = flatIndex++;
                      return (
                        <div
                          key={`${item.title}-${item.href}`}
                          className="relative flex items-center mx-1.5 my-0.5"
                          onMouseEnter={() => {
                            if (collapsed && iconRefs.current[currentIndex]) {
                              const rect =
                                iconRefs.current[currentIndex]!.getBoundingClientRect();
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
                                "flex items-center w-full rounded-xl transition-all duration-150 group relative overflow-hidden",
                                collapsed
                                  ? "h-10 justify-center px-0"
                                  : "h-9 px-3 gap-3",
                                isActive
                                  ? "bg-saVividOrange text-white font-bold shadow-xs"
                                  : "text-white/80 hover:text-white hover:bg-white/10"
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>

                                <div
                                  ref={(el) => {
                                    iconRefs.current[currentIndex] = el ?? null;
                                  }}
                                  className="flex-shrink-0"
                                >
                                  <item.icon
                                    className={cn(
                                      "transition-all",
                                      isActive
                                        ? "h-5 w-5 text-white"
                                        : "h-4.5 w-4.5",
                                      collapsed ? "h-5 w-5" : ""
                                    )}
                                    style={{
                                      width: collapsed ? "1.25rem" : isActive ? "1.15rem" : "1.1rem",
                                      height: collapsed ? "1.25rem" : isActive ? "1.15rem" : "1.1rem",
                                    }}
                                  />
                                </div>

                                {!collapsed && (
                                  <span
                                    className={cn(
                                      "text-sm truncate transition-all",
                                      isActive ? "font-semibold" : "font-medium"
                                    )}
                                  >
                                    {item.title}
                                  </span>
                                )}
                              </>
                            )}
                          </NavLink>
                        </div>
                      );
                    })}
                </div>
              );
            })
          )}
        </nav>

        {/* ── User mini-profile at bottom */}
        {!collapsed && user && (
          <div className="border-t border-white/10 px-3.5 py-3 flex-shrink-0 bg-black/10">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 flex-shrink-0 ring-1 ring-white/20">
                <AvatarImage src={user.profile_url} alt={user.name} />
                <AvatarFallback className="bg-saVividOrange text-white text-xs font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate leading-tight">
                  {user.name}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 bg-white/15 text-white/90">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Collapse toggle */}
        <div className="border-t border-white/10 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden lg:flex w-full items-center p-2.5 hover:bg-white/10 transition-colors",
              collapsed ? "justify-center" : "justify-end pr-3 gap-2"
            )}
          >
            {!collapsed && (
              <span className="text-xs text-white/50">Collapse</span>
            )}
            {collapsed ? (
              <ChevronsRight className="h-4 w-4 text-white/60" />
            ) : (
              <ChevronsLeft className="h-4 w-4 text-white/60" />
            )}
          </button>
        </div>
      </aside>

      {/* Tooltip (collapsed mode) */}
      {tooltip &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: "3.7rem",
              top: tooltip.top,
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
            className="px-2.5 py-1 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[9999] animate-scaleIn whitespace-nowrap"
          >
            {tooltip.title}
          </div>,
          document.body
        )}
    </>
  );
}
