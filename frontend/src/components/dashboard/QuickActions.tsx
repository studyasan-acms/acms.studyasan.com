import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  GraduationCap,
  BookPlus,
  Users,
  UserCheck,
  CreditCard,
  Settings,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface QuickAction {
  title: string;
  icon: any;
  action: () => void;
  roles: string[];
}

export default function QuickActions() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const quickActions: QuickAction[] = [
    {
      title: "Add Student",
      icon: UserPlus,
      action: () => navigate("/dashboard/students/new"),
      roles: ["ADMIN"],
    },
    {
      title: "Add Teacher",
      icon: GraduationCap,
      action: () => navigate("/dashboard/teachers/new"),
      roles: ["ADMIN"],
    },
    {
      title: "Add Subject",
      icon: BookPlus,
      action: () => navigate("/dashboard/subjects/new"),
      roles: ["ADMIN"],
    },
    {
      title: "View Students",
      icon: Users,
      action: () => navigate("/dashboard/students"),
      roles: ["ADMIN", "TEACHER"],
    },
    {
      title: "View Teachers",
      icon: UserCheck,
      action: () => navigate("/dashboard/teachers"),
      roles: ["ADMIN"],
    },
    {
      title: "Enrollments",
      icon: CreditCard,
      action: () => navigate("/dashboard/enrollments"),
      roles: ["ADMIN"],
    },
    {
      title: "Settings",
      icon: Settings,
      action: () => navigate("/dashboard/profile"),
      roles: ["ADMIN", "TEACHER", "STUDENT"],
    },
  ];

  const filteredActions = quickActions.filter((action) =>
    action.roles.includes(user?.role || "")
  );

  return (
    <Card className="rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden bg-white">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-saBlue" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-2 gap-2.5">
          {filteredActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.title}
                onClick={action.action}
                className="flex items-center justify-between p-2.5 rounded-xl border border-saBlue/15 bg-saBlue/5 text-saBlue hover:bg-saBlue hover:text-white text-xs font-bold transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span className="truncate">{action.title}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
