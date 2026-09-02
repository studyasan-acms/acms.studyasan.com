import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import StudentDashboardPage from "@/pages/StudentDashboardPage";
import PageHeader from "@/components/ui/PageHeader";
import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  usePageTitle("Dashboard");
  const { user } = useAuthStore();

  const isAdmin = user?.role === "ADMIN";
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  if (isStudent) {
    return <StudentDashboardPage />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name}!`}
        icon={LayoutDashboard}
        iconColor="bg-saBlueSubtle"
        iconTextColor="text-saBlue"
      />

      {isAdmin && <AdminDashboard />}
      {isTeacher && <TeacherDashboard />}

      {!isAdmin && !isTeacher && !isStudent && (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
          <p>Welcome! Your role privileges are being set up or are not recognized.</p>
        </div>
      )}
    </div>
  );
}

