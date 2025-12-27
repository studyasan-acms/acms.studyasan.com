import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  Settings,
  UserCheck,
  ArrowUpRight,
} from "lucide-react";

interface QuickAction {
  title: string;
  icon: React.ElementType;
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
      icon: UserCheck,
      action: () => navigate("/dashboard/teachers/new"),
      roles: ["ADMIN"],
    },
    {
      title: "Add Subject",
      icon: BookOpen,
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
      icon: GraduationCap,
      action: () => navigate("/dashboard/enrollments"),
      roles: ["ADMIN"],
    },
    {
      title: "My Subjects",
      icon: FileText,
      action: () => navigate("/dashboard/subjects"),
      roles: ["STUDENT"],
    },
    {
      title: "Settings",
      icon: Settings,
      action: () => navigate("/dashboard/settings"),
      roles: ["ADMIN", "TEACHER", "STUDENT"],
    },
  ];

  const filteredActions = quickActions.filter((action) =>
    action.roles.includes(user?.role || "")
  );

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl text-gray-600">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible">
          {filteredActions.map((action) => (
            <Button
              key={action.title}
              onClick={action.action}
              className="flex items-center justify-between w-full px-4 py-3 relative z-10 bg-saBlue hover:bg-saBlueDarkHover text-white border-none shadow-lg transition-shadow duration-200"
            >
              {/* Left part: Icon + Title */}
              <div className="flex items-center space-x-2">
                <action.icon className="w-5 h-5" />
                <span className="font-semibold">{action.title}</span>
              </div>

              {/* Divider positioned relative to arrow */}
              <div className="absolute h-6 w-px right-12 bg-saBlueLight" />

              {/* Right part: Arrow up-right */}
              <ArrowUpRight className="w-5 h-5 ml-6 text-saVividOrange" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
