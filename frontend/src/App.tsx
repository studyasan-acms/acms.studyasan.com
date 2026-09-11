import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/api';
import { PWAUpdatePrompt } from '@/components/PWAUpdatePrompt';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardPage from '@/pages/DashboardPage';

// Public Layout and Pages
import PublicLayout from '@/components/layout/PublicLayout';
import HomePage from '@/pages/public/HomePage';
import AboutPage from '@/pages/public/AboutPage';
import ContactPage from '@/pages/public/ContactPage';
import CareerPage from '@/pages/public/CareerPage';
import BlogPage from '@/pages/public/BlogPage';
import CertificationPage from '@/pages/public/CertificationPage';

// Student imports
import StudentsPage from '@/pages/students/StudentsPage';
import CreateStudentPage from '@/pages/students/CreateStudentPage';
import EditStudentPage from '@/pages/students/EditStudentPage';
import StudentDetailPage from '@/pages/students/StudentDetailPage';

// Teacher imports
import TeachersPage from '@/pages/teachers/TeachersPage';
import CreateTeacherPage from '@/pages/teachers/CreateTeacherPage';
import EditTeacherPage from '@/pages/teachers/EditTeacherPage';
import TeacherDetailPage from '@/pages/teachers/TeacherDetailPage';

// Subject imports
import SubjectsPage from '@/pages/subjects/SubjectsPage';
import CreateSubjectPage from '@/pages/subjects/CreateSubjectPage';
import EditSubjectPage from '@/pages/subjects/EditSubjectPage';
import SubjectDetailPage from '@/pages/subjects/SubjectDetailPage';
import SubjectModulesPage from '@/pages/subjects/SubjectModulesPage';
import CreateModulePage from '@/pages/subjects/CreateModulePage';
import EditModulePage from '@/pages/subjects/EditModulePage';
import StudentModulesPage from '@/pages/subjects/StudentModulesPage';
import StudyModulePage from '@/pages/subjects/StudyModulePage';
import SubjectProgressPage from '@/pages/subjects/SubjectProgressPage';

// Enrollment and Billing imports
import EnrollmentsInvoicesPage from '@/pages/billing/EnrollmentsInvoicesPage';
import CreateEnrollmentPage from '@/pages/enrollments/CreateEnrollmentPage';
import BulkEnrollmentPage from '@/pages/enrollments/BulkEnrollmentPage';
import EnrollmentDetailPage from '@/pages/enrollments/EnrollmentDetailPage';
import PaymentsPage from '@/pages/PaymentsPage';

// Board imports
import BoardsPage from '@/pages/boards/BoardsPage';
import CreateBoardPage from '@/pages/boards/CreateBoardPage';

// Class imports
import ClassesPage from '@/pages/classes/ClassesPage';
import CreateClassPage from '@/pages/classes/CreateClassPage';

// Test imports
import TestsPage from '@/pages/tests/TestsPage';
import CreateTestPage from '@/pages/tests/CreateTestPage';
import TestDetailPage from '@/pages/tests/TestDetailPage';
import TestAttemptPage from '@/pages/tests/TestAttemptPage';
import TestResultsPage from '@/pages/tests/TestResultsPage';
import TestAttemptsListPage from '@/pages/tests/TestAttemptsListPage';
import GradeTestPage from '@/pages/tests/GradeTestPage';
import MyResultsPage from '@/pages/tests/MyResultsPage';

// Chat imports
import ChatsPageNew from '@/pages/chats/ChatsPageNew';
import AdminChatsPage from '@/pages/chats/AdminChatsPage';

// Class Session imports
import ClassSessionsPage from '@/pages/class-sessions/ClassSessionsPage';
import ClassSessionDetailPage from '@/pages/class-sessions/ClassSessionDetailPage';
import CreateClassSessionPage from '@/pages/class-sessions/CreateClassSessionPage';

// Sections import
import SectionsPage from '@/pages/sections/SectionsPage';

// Classroom import (integrated video conferencing)
import ClassroomPage from '@/pages/classroom/ClassroomPage';

// Attendance imports
import ClassAttendancePage from '@/pages/attendance/ClassAttendancePage';
import AttendanceListPage from '@/pages/attendance/AttendanceListPage';

// Test Series imports
import TestSeriesPage from '@/pages/test-series/TestSeriesPage';
import TestSeriesFormPage from '@/pages/test-series/TestSeriesFormPage';
import TestSeriesDetailPage from '@/pages/test-series/TestSeriesDetailPage';

// Activity imports
import ActivityGroupsPage from '@/pages/activities/ActivityGroupsPage';
import ActivitiesPage from '@/pages/activities/ActivitiesPage';
import StudentActivitiesPage from '@/pages/activities/StudentActivitiesPage';
import ActivityFormPage from '@/pages/activities/ActivityFormPage';

// Home and Enquiry imports
import StudentHomePage from '@/pages/StudentHomePage';
import StudentExplorePage from '@/pages/StudentExplorePage';
import StudentDashboardPage from '@/pages/StudentDashboardPage';
import AdminEnquiriesPage from '@/pages/AdminEnquiriesPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';

// Homework imports
import HomeworkPage from '@/pages/homework/HomeworkPage';
import CreateHomeworkPage from '@/pages/homework/CreateHomeworkPage';
import HomeworkDetailPage from '@/pages/homework/HomeworkDetailPage';

// Brain Quest imports
import BrainQuestListPage from '@/pages/brainQuest/BrainQuestListPage';
import CreateBrainQuestPage from '@/pages/brainQuest/CreateBrainQuestPage';
import BrainQuestDetailPage from '@/pages/brainQuest/BrainQuestDetailPage';

// Job imports
import JobsPage from '@/pages/jobs/JobsPage';
import JobFormPage from '@/pages/jobs/JobFormPage';
import JobDetailPage from '@/pages/jobs/JobDetailPage';
import AdminApplicationsPage from '@/pages/jobs/AdminApplicationsPage';

// Analytics imports
import StudentAnalyticsPage from '@/pages/analytics/StudentAnalyticsPage';
import TeacherAnalyticsPage from '@/pages/analytics/TeacherAnalyticsPage';
import AdminAnalyticsPage from '@/pages/analytics/AdminAnalyticsPage';
import WhiteboardPage from '@/pages/whiteboard/WhiteboardPage';

// Admin imports
import DeletionRequestsPage from '@/pages/admin/DeletionRequestsPage';
import CurriculumPage from '@/pages/admin/CurriculumPage';
import RoleManagementPage from '@/pages/admin/RoleManagementPage';
import CouponManagementPage from '@/pages/admin/CouponManagementPage';
import { AdminAgenciesPage } from '@/pages/admin/AdminAgenciesPage';
import { AgencyLoginPage } from '@/pages/agency/AgencyLoginPage';
import { AgencyDashboardPage } from '@/pages/agency/AgencyDashboardPage';
import AnnouncementsPage from '@/pages/announcements/AnnouncementsPage';
import KnowYourChildPage from '@/pages/KnowYourChildPage';
import HolidayManagementPage from '@/pages/admin/HolidayManagementPage';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const setAuth = useAuthStore((state) => state.setAuth);

  const searchParams = new URLSearchParams(window.location.search);
  const urlToken = searchParams.get('token');
  const isBot = searchParams.get('bot') === 'true';

  if (urlToken && !localStorage.getItem('token')) {
    localStorage.setItem('token', urlToken);
  }

  useEffect(() => {
    if (urlToken && (!isAuthenticated || isBot)) {
      setAuth(
        {
          id: isBot ? 999999 : 1,
          name: isBot ? 'Recording Bot' : 'User',
          email: isBot ? 'recording-bot@studyasan.com' : 'admin@studyasan.com',
          role: isBot ? 'RECORDING_BOT' : 'ADMIN',
          isBot: isBot,
        } as any,
        urlToken
      );
    }
  }, [urlToken, isBot, isAuthenticated, setAuth]);

  // Don't render children until auth state is fully determined
  if (isAuthLoading && !urlToken) {
    return null;
  }

  if (!isAuthenticated && !urlToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (isAuthenticated && user) {
    if (user.role === 'STUDENT') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  /**
   * Verify stored auth token on app startup
   * This prevents the dashboard from rendering with an expired token
   * Catches auth issues early before the user sees the flickering dashboard
   */
  useEffect(() => {
    const verifyAuth = async () => {
      // Wait for rehydration to complete before verifying
      if (isAuthLoading) {
        return; // Will re-run when isAuthLoading changes
      }

      // Only verify if we have a token and auth is marked as authenticated
      if (isAuthenticated) {
        try {
          // Call the verify endpoint - this will fail with 401 if token is expired
          await authService.verifyToken();
          // Token is valid, no action needed
        } catch (error: any) {
          // Token is invalid/expired - clear auth to redirect to login
          clearAuth();
        }
      }
    };

    verifyAuth();
  }, [isAuthLoading, isAuthenticated, clearAuth]);

  return (
    <Router>
      <Routes>
        {/* Redirect home page to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Website Routes */}
        <Route element={<PublicLayout />}>
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="career" element={<CareerPage />} />
          <Route path="blog" element={<BlogPage />} />
        </Route>

        {/* Standalone Public Certification Route (No public header/footer) */}
        <Route path="/certification/:testId" element={<CertificationPage />} />

        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Agency Portal Routes */}
        <Route path="/agency/login" element={<AgencyLoginPage />} />
        <Route path="/agency/dashboard" element={<AgencyDashboardPage />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />

          {/* Student Routes */}
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/new" element={<CreateStudentPage />} />
          <Route path="students/:id" element={<StudentDetailPage />} />
          <Route path="students/:id/edit" element={<EditStudentPage />} />
          <Route path="know-your-child" element={<KnowYourChildPage />} />

          {/* Teacher Routes */}
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="teachers/new" element={<CreateTeacherPage />} />
          <Route path="teachers/:id" element={<TeacherDetailPage />} />
          <Route path="teachers/:id/edit" element={<EditTeacherPage />} />

          {/* Subject Routes */}
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subjects/new" element={<CreateSubjectPage />} />
          <Route path="subjects/:id" element={<SubjectDetailPage />} />
          <Route path="subjects/:id/edit" element={<EditSubjectPage />} />
          <Route path="subjects/:subjectId/modules" element={<SubjectModulesPage />} />
          <Route path="subjects/:subjectId/modules/create" element={<CreateModulePage />} />
          <Route path="subjects/:subjectId/modules/:moduleId/edit" element={<EditModulePage />} />
          <Route path="subjects/:subjectId/student-modules" element={<StudentModulesPage />} />
          <Route path="subjects/:subjectId/modules/:moduleId/study" element={<StudyModulePage />} />
          <Route path="subjects/:subjectId/progress" element={<SubjectProgressPage />} />

          {/* New Curriculum Management Route */}
          <Route path="offerings" element={<CurriculumPage />} />

          {/* Billing & Enrollment Routes (Unified Two-Tab Page) */}
          <Route path="enrollments" element={<EnrollmentsInvoicesPage />} />
          <Route path="billing" element={<EnrollmentsInvoicesPage />} />
          <Route path="enrollments/new" element={<CreateEnrollmentPage />} />
          <Route path="enrollments/bulk" element={<BulkEnrollmentPage />} />
          <Route path="enrollments/:id" element={<EnrollmentDetailPage />} />

          {/* Payment Route redirects to Unified Billing */}
          <Route path="payments" element={<EnrollmentsInvoicesPage />} />


          {/* Board Routes */}
          <Route path="boards" element={<BoardsPage />} />
          <Route path="boards/new" element={<CreateBoardPage />} />

          {/* Class Routes */}
          <Route path="classes" element={<ClassesPage />} />
          <Route path="classes/new" element={<CreateClassPage />} />

          {/* Chat Routes */}
          <Route path="chats" element={<ChatsPageNew />} />
          <Route path="chats/:chatId" element={<ChatsPageNew />} />

          {/* Admin Chat Routes */}
          <Route path="admin/chats" element={<AdminChatsPage />} />

          {/* Class Session Routes */}
          <Route path="class-sessions" element={<ClassSessionsPage />} />
          <Route path="class-sessions/create" element={<CreateClassSessionPage />} />
          <Route path="class-sessions/:id" element={<ClassSessionDetailPage />} />
          <Route path="class-sessions/:sessionId/attendance" element={<ClassAttendancePage />} />
          <Route path="class-sessions/:id/edit" element={<CreateClassSessionPage />} />

          {/* Sections Route */}
          <Route path="sections" element={<SectionsPage />} />

          {/* Standalone Whiteboard Route */}
          <Route path="whiteboard" element={<WhiteboardPage />} />
          <Route path="whiteboard/:id" element={<WhiteboardPage />} />

          {/* Test Series Routes */}
          <Route path="test-series" element={<TestSeriesPage />} />
          <Route path="test-series/new" element={<TestSeriesFormPage />} />
          <Route path="test-series/:id" element={<TestSeriesDetailPage />} />
          <Route path="test-series/:id/edit" element={<TestSeriesFormPage />} />

          {/* Activity Routes */}
          <Route path="activity-groups" element={<ActivityGroupsPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="activities/create" element={<ActivityFormPage />} />
          <Route path="activities/:id/edit" element={<ActivityFormPage />} />
          <Route path="student-activities" element={<StudentActivitiesPage />} />

          {/* Homework Routes */}
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="homework/create" element={<CreateHomeworkPage />} />
          <Route path="homework/:id" element={<HomeworkDetailPage />} />
          <Route path="homework/:id/edit" element={<CreateHomeworkPage />} />

          {/* Brain Quest Routes */}
          <Route path="brain-quest" element={<BrainQuestListPage />} />
          <Route path="brain-quest/create" element={<CreateBrainQuestPage />} />
          <Route path="brain-quest/:id" element={<BrainQuestDetailPage />} />
          <Route path="brain-quest/:id/edit" element={<CreateBrainQuestPage />} />

          {/* Job/Internship Routes */}
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/new" element={<JobFormPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="jobs/:id/edit" element={<JobFormPage />} />
          <Route path="jobs/:job_id/applications" element={<AdminApplicationsPage />} />
          <Route path="applications/my" element={<Navigate to="/dashboard/jobs?tab=applications" replace />} />
          <Route path="applications/all" element={<AdminApplicationsPage />} />

          {/* Student Explore & Dashboard Routes */}
          <Route path="explore" element={<StudentExplorePage />} />
          <Route path="student-dashboard" element={<StudentDashboardPage />} />
          <Route path="home" element={<StudentExplorePage />} />

          {/* Admin Enquiries Route */}
          <Route path="enquiries" element={<AdminEnquiriesPage />} />

          {/* Admin Deletion Requests Route */}
          <Route path="admin/deletion-requests" element={<DeletionRequestsPage />} />

          {/* Admin Role Management Route */}
          <Route path="admin/roles" element={<RoleManagementPage />} />

          {/* Admin Coupon Management Route */}
          <Route path="admin/coupons" element={<CouponManagementPage />} />

          {/* Admin Agencies & Referrers Route */}
          <Route path="admin/agencies" element={<AdminAgenciesPage />} />

          {/* Holiday Management Routes */}
          <Route path="admin/holidays" element={<HolidayManagementPage />} />
          <Route path="holidays" element={<HolidayManagementPage />} />

          {/* Analytics Routes */}
          <Route path="analytics" element={<StudentAnalyticsPage />} />
          <Route path="analytics/teacher" element={<TeacherAnalyticsPage />} />
          <Route path="analytics/admin" element={<AdminAnalyticsPage />} />

          {/* Attendance Routes */}
          <Route path="attendance" element={<AttendanceListPage />} />

          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
        </Route>

        {/* Test Routes (outside dashboard layout for fullscreen test attempt) */}
        <Route
          path="/tests"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TestsPage />} />
          <Route path="my-results" element={<MyResultsPage />} />
          <Route path="create" element={<CreateTestPage />} />
          <Route path=":testId" element={<TestDetailPage />} />
          <Route path=":testId/edit" element={<CreateTestPage />} />
          <Route path=":testId/attempts" element={<TestAttemptsListPage />} />
        </Route>

        {/* Test Attempt Routes - Fullscreen */}
        <Route
          path="/test-attempts/:attemptId"
          element={
            <ProtectedRoute>
              <TestAttemptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tests/:testId/attempt/:attemptId"
          element={
            <ProtectedRoute>
              <TestAttemptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-attempts/:attemptId/results"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TestResultsPage />} />
        </Route>
        <Route
          path="/tests/:testId/attempt/:attemptId/results"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TestResultsPage />} />
        </Route>
        <Route
          path="/test-attempts/:attemptId/grade"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GradeTestPage />} />
        </Route>
        <Route
          path="/tests/:testId/attempt/:attemptId/grade"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GradeTestPage />} />
        </Route>


        {/* Classroom Route - Fullscreen video conferencing */}
        <Route
          path="/classroom/:sessionId"
          element={
            <ProtectedRoute>
              <ClassroomPage />
            </ProtectedRoute>
          }
        />

        {/* Class Attendance Detail Route - Fullscreen */}
        <Route
          path="/class-sessions/:sessionId/attendance"
          element={
            <ProtectedRoute>
              <ClassAttendancePage />
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found */}
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold">404</h1>
              <p className="text-muted-foreground mt-2">Page not found</p>
            </div>
          </div>
        } />
      </Routes>
      <PWAUpdatePrompt />
      <Toaster />
    </Router >
  );
}

export default App;