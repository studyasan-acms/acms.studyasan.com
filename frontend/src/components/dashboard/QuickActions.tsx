import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

interface QuickAction {
  title: string;
  action: () => void;
  roles: string[];
}

export default function QuickActions() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const quickActions: QuickAction[] = [
    {
      title: "Add Student",
      action: () => navigate("/dashboard/students/new"),
      roles: ["ADMIN"],
    },
    {
      title: "Add Teacher",
      action: () => navigate("/dashboard/teachers/new"),
      roles: ["ADMIN"],
    },
    {
      title: "Add Subject",
      action: () => navigate("/dashboard/subjects/new"),
      roles: ["ADMIN"],
    },
    {
      title: "View Students",
      action: () => navigate("/dashboard/students"),
      roles: ["ADMIN", "TEACHER"],
    },
    {
      title: "View Teachers",
      action: () => navigate("/dashboard/teachers"),
      roles: ["ADMIN"],
    },
    {
      title: "Enrollments",
      action: () => navigate("/dashboard/enrollments"),
      roles: ["ADMIN"],
    },
    {
      title: "My Subjects",
      action: () => navigate("/dashboard/subjects"),
      roles: ["STUDENT"],
    },
    {
      title: "Settings",
      action: () => navigate("/dashboard/profile"),
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
              className="flex w-full items-center justify-between px-4 py-3 bg-saBlue hover:bg-saBlueDarkHover text-white border-none shadow-lg transition-shadow duration-200"
            >
              <div className="flex min-w-0 items-center">
                <span className="font-semibold truncate">{action.title}</span>
              </div>

              <div className="ml-3 shrink-0 border-l border-saBlueLight pl-3">
                <ArrowUpRight className="w-5 h-5 text-saVividOrange" />
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
