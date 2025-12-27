import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/authStore';
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

// Enrollment imports
import EnrollmentsPage from '@/pages/enrollments/EnrollmentsPage';
import CreateEnrollmentPage from '@/pages/enrollments/CreateEnrollmentPage';
import BulkEnrollmentPage from '@/pages/enrollments/BulkEnrollmentPage';
import EnrollmentDetailPage from '@/pages/enrollments/EnrollmentDetailPage';

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

// Test Series imports
import TestSeriesPage from '@/pages/test-series/TestSeriesPage';
import TestSeriesFormPage from '@/pages/test-series/TestSeriesFormPage';
import TestSeriesDetailPage from '@/pages/test-series/TestSeriesDetailPage';

// Activity imports
import ActivityGroupsPage from '@/pages/activities/ActivityGroupsPage';
import ActivitiesPage from '@/pages/activities/ActivitiesPage';
import StudentActivitiesPage from '@/pages/activities/StudentActivitiesPage';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirects to dashboard if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Website Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="career" element={<CareerPage />} />
          <Route path="blog" element={<BlogPage />} />
        </Route>

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

          {/* Enrollment Routes */}
          <Route path="enrollments" element={<EnrollmentsPage />} />
          <Route path="enrollments/new" element={<CreateEnrollmentPage />} />
          <Route path="enrollments/bulk" element={<BulkEnrollmentPage />} />
          <Route path="enrollments/:id" element={<EnrollmentDetailPage />} />

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
          <Route path="class-sessions/:id/edit" element={<CreateClassSessionPage />} />

          {/* Test Series Routes */}
          <Route path="test-series" element={<TestSeriesPage />} />
          <Route path="test-series/new" element={<TestSeriesFormPage />} />
          <Route path="test-series/:id" element={<TestSeriesDetailPage />} />
          <Route path="test-series/:id/edit" element={<TestSeriesFormPage />} />

          {/* Activity Routes */}
          <Route path="activity-groups" element={<ActivityGroupsPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="student-activities" element={<StudentActivitiesPage />} />

          <Route path="profile" element={<div>Profile Page - Coming Soon</div>} />
          <Route path="settings" element={<div>Settings Page - Coming Soon</div>} />
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
          path="/test-attempts/:attemptId/grade"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<GradeTestPage />} />
        </Route>

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
      <Toaster />
    </Router>
  );
}

export default App;