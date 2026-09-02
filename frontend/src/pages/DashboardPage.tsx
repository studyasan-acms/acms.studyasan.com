import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import StudentDashboardPage from "@/pages/StudentDashboardPage";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Welcome back, {user?.name}!
          </p>
        </div>
      </div>

      {/* Role-based Dashboard Content */}
      <div className="mt-6">
        {isAdmin && <AdminDashboard />}
        {isTeacher && <TeacherDashboard />}

        {/* Fallback for unknown roles or if role is missing */}
        {!isAdmin && !isTeacher && !isStudent && (
          <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            <p>Welcome! Your role privileges are being set up or are not recognized.</p>
          </div>
        )}
      </div>
    </div>
  );
}
