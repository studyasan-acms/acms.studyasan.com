// ---------------- DashboardPage.tsx ----------------

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  UserCheck,
  GraduationCap,
  Plus,
} from "lucide-react";
import {
  studentService,
  teacherService,
  subjectService,
  enrollmentService,
} from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import StatsCard from "@/components/dashboard/StatsCard";
import QuickActions from '@/components/dashboard/QuickActions';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    subjects: 0,
    enrollments: 0,
  });
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "ADMIN";
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [studentsRes, teachersRes, subjectsRes, enrollmentsRes] =
        await Promise.all([
          studentService.getAll({ limit: 1 }),
          teacherService.getAll({ limit: 1 }),
          subjectService.getAll({
            limit: 1,
            ...(isTeacher && { teacher_id: user?.id }),
            ...(isStudent && { student_id: user?.id }),
          }),
          enrollmentService.getAll({
            limit: 1,
            ...(isStudent && { student_id: user?.id }),
          }),
        ]);

      setStats({
        students: studentsRes.data.pagination.total || 0,
        teachers: teachersRes.data.pagination.total || 0,
        subjects: subjectsRes.data.pagination.total || 0,
        enrollments: enrollmentsRes.data.pagination.total || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Students",
      value: loading ? "..." : stats.students.toString(),
      icon: Users,
      show: true,
    },
    {
      title: "Total Teachers",
      value: loading ? "..." : stats.teachers.toString(),
      icon: GraduationCap,
      show: isAdmin,
    },
    {
      title: "Total Subjects",
      value: loading ? "..." : stats.subjects.toString(),
      icon: BookOpen,
      show: true,
    },
    {
      title: "Total Enrollments",
      value: loading ? "..." : stats.enrollments.toString(),
      icon: UserCheck,
      show: true,
    },
  ].filter((card) => card.show);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Welcome back, {user?.name}!
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Link to="/dashboard/students/new" className="flex-1 md:flex-none">
              <Button variant="outline" className="border border-saBlue w-full md:w-auto justify-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </Link>

            <Link to="/dashboard/enrollments/new" className="flex-1 md:flex-none">
              <Button className="w-full md:w-auto justify-center">
                <UserCheck className="h-4 w-4 mr-2" />
                New Enrollment
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((card, index) => (
          <Link key={index} to="#">
            <StatsCard title={card.title} value={card.value} icon={card.icon} />
          </Link>
        ))}
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

  <QuickActions />
      </div>
    </div>
  );
}
