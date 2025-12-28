import express from 'express';
import multer from 'multer';
import * as authController from '../controllers/auth.controller.js';
import * as boardController from '../controllers/board.controller.js';
import * as classController from '../controllers/class.controller.js';
import * as studentController from '../controllers/student.controller.js';
import * as subjectController from '../controllers/subject.controller.js';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import * as teacherController from '../controllers/teacher.controller.js';
import * as notificationController from '../controllers/notification.controller.js';
import * as classSessionController from '../controllers/classSession.controller.js';
import * as attendanceController from '../controllers/attendance.controller.js';
import * as moduleController from '../controllers/module.controller.js';
import * as moduleProgressController from '../controllers/moduleProgress.controller.js';
import * as testController from '../controllers/test.controller.js';
import * as testAttemptController from '../controllers/testAttempt.controller.js';
import * as chatController from '../controllers/chat.controller.js';
import * as locationController from '../controllers/location.controller.js';
import currencyController from '../controllers/currency.controller.js';
import * as testSeriesController from '../controllers/testSeries.controller.js';
import * as activityGroupController from '../controllers/activityGroup.controller.js';
import * as activityController from '../controllers/activity.controller.js';
import * as activityEnrollmentController from '../controllers/activityEnrollment.controller.js';
import * as activityAttemptController from '../controllers/activityAttempt.controller.js';
import * as homeController from '../controllers/home.controller.js';
import * as enquiryController from '../controllers/enquiry.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';


// Configure multer for memory storage (files will be uploaded to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

const router = express.Router();

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Board routes
router.get('/boards', boardController.getAllBoards);
router.get('/boards/:id', boardController.getBoardById);
router.post('/boards', authenticate, authorize('ADMIN'), boardController.createBoard);
router.put('/boards/:id', authenticate, authorize('ADMIN'), boardController.updateBoard);
router.delete('/boards/:id', authenticate, authorize('ADMIN'), boardController.deleteBoard);

// Class routes
router.get('/classes', classController.getAllClasses);
router.get('/classes/:id', classController.getClassById);
router.post('/classes', authenticate, authorize('ADMIN'), classController.createClass);
router.put('/classes/:id', authenticate, authorize('ADMIN'), classController.updateClass);
router.delete('/classes/:id', authenticate, authorize('ADMIN'), classController.deleteClass);

// Student routes
router.get('/students', authenticate, studentController.getAllStudents);
router.get('/students/:id', authenticate, studentController.getStudentById);
router.post('/students', authenticate, authorize('ADMIN'), studentController.createStudent);
router.put('/students/:id', authenticate, authorize('ADMIN', 'STUDENT'), studentController.updateStudent);
router.delete('/students/:id', authenticate, authorize('ADMIN'), studentController.deleteStudent);

// Subject routes
router.get('/subjects', subjectController.getAllSubjects);
router.get('/subjects/:id', subjectController.getSubjectById);
router.post('/subjects', authenticate, authorize('ADMIN'), upload.single('cover_image'), subjectController.createSubject);
router.put('/subjects/:id', authenticate, authorize('ADMIN'), upload.single('cover_image'), subjectController.updateSubject);
router.delete('/subjects/:id', authenticate, authorize('ADMIN'), subjectController.deleteSubject);

// Enrollment routes
router.get('/enrollments', authenticate, enrollmentController.getAllEnrollments);
router.get('/enrollments/:id', authenticate, enrollmentController.getEnrollmentById);
router.post('/enrollments', authenticate, enrollmentController.createEnrollment);
router.delete('/enrollments/:id', authenticate, authorize('ADMIN', 'STUDENT'), enrollmentController.deleteEnrollment);

// Teacher routes
router.get('/teachers', authenticate, teacherController.getAllTeachers);
router.get('/teachers/:id', authenticate, teacherController.getTeacherById);
router.post('/teachers', authenticate, authorize('ADMIN'), teacherController.createTeacher);
router.put('/teachers/:id', authenticate, authorize('ADMIN', 'TEACHER'), teacherController.updateTeacher);
router.delete('/teachers/:id', authenticate, authorize('ADMIN'), teacherController.deleteTeacher);
router.post('/teachers/assign-subject', authenticate, authorize('ADMIN'), teacherController.assignSubjectToTeacher);
router.delete('/teachers/remove-subject/:id', authenticate, authorize('ADMIN'), teacherController.removeSubjectFromTeacher);
router.get('/subjects/:subjectId/teachers', authenticate, teacherController.getTeachersBySubject);

// Notification routes
router.get('/notifications', authenticate, notificationController.getAllNotifications);
router.get('/notifications/:id', authenticate, notificationController.getNotificationById);
router.post('/notifications', authenticate, authorize('ADMIN'), notificationController.createNotification);
router.patch('/notifications/:id/read', authenticate, notificationController.markAsRead);
router.patch('/notifications/read-all', authenticate, notificationController.markAllAsRead);
router.delete('/notifications/:id', authenticate, notificationController.deleteNotification);

// Class Session routes
router.get('/class-sessions', authenticate, classSessionController.getAllClassSessions);
router.get('/class-sessions/upcoming', authenticate, classSessionController.getUpcomingSessions);
router.get('/class-sessions/past', authenticate, classSessionController.getPastSessions);
router.get('/class-sessions/my-schedule', authenticate, classSessionController.getMyScheduledSessions);
router.get('/class-sessions/today', authenticate, classSessionController.getTodaysSessions);
router.get('/class-sessions/weekly', authenticate, classSessionController.getWeeklySchedule);
router.get('/class-sessions/:id', authenticate, classSessionController.getClassSessionById);
router.get('/class-sessions/:id/can-join', authenticate, classSessionController.canJoinSession);
router.post('/class-sessions', authenticate, authorize('ADMIN', 'TEACHER'), classSessionController.createClassSession);
router.put('/class-sessions/:id', authenticate, authorize('ADMIN', 'TEACHER'), classSessionController.updateClassSession);
router.delete('/class-sessions/:id', authenticate, authorize('ADMIN', 'TEACHER'), classSessionController.deleteClassSession);

// Attendance routes
router.get('/attendances', authenticate, attendanceController.getAllAttendances);
router.get('/attendances/report', authenticate, authorize('ADMIN', 'TEACHER'), attendanceController.getAttendanceReport);
router.get('/attendances/:id', authenticate, attendanceController.getAttendanceById);
router.get('/attendances/session/:sessionId', authenticate, attendanceController.getAttendanceBySession);
router.get('/attendances/user/:userId', authenticate, attendanceController.getAttendanceByUser);
router.post('/attendances', authenticate, authorize('ADMIN', 'TEACHER'), attendanceController.recordAttendance);
router.post('/attendances/join', authenticate, attendanceController.markJoinTime);
router.post('/attendances/leave', authenticate, attendanceController.markLeaveTime);
router.put('/attendances/:id', authenticate, authorize('ADMIN', 'TEACHER'), attendanceController.updateAttendance);
router.delete('/attendances/:id', authenticate, authorize('ADMIN', 'TEACHER'), attendanceController.deleteAttendance);

// ========== MODULE ROUTES ==========
// Get all modules for a subject
router.get('/subjects/:subjectId/modules', authenticate, moduleController.getModulesBySubject);

// Get single module
router.get('/subjects/:subjectId/modules/:moduleId', authenticate, moduleController.getModuleById);

// Create module (no files)
router.post('/subjects/:subjectId/modules', authenticate, authorize('ADMIN', 'TEACHER'), moduleController.createModule);

// Update module metadata
router.put('/subjects/:subjectId/modules/:moduleId', authenticate, authorize('ADMIN', 'TEACHER'), moduleController.updateModule);

// Delete module (also deletes S3 files)
router.delete('/subjects/:subjectId/modules/:moduleId', authenticate, authorize('ADMIN', 'TEACHER'), moduleController.deleteModule);

// Reorder modules
router.put('/subjects/:subjectId/modules/reorder', authenticate, authorize('ADMIN', 'TEACHER'), moduleController.reorderModules);

// ========== MODULE CONTENT ROUTES ==========
// Upload files to module (supports multiple files)
router.post(
  '/subjects/:subjectId/modules/:moduleId/content/upload',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  upload.array('files', 10), // Max 10 files at once
  moduleController.uploadContentToModule
);

// Add text content to module
router.post(
  '/subjects/:subjectId/modules/:moduleId/content/text',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleController.addTextContent
);

// Update content metadata
router.put(
  '/subjects/:subjectId/modules/:moduleId/content/:contentId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleController.updateContent
);

// Delete content from module (also deletes from S3)
router.delete(
  '/subjects/:subjectId/modules/:moduleId/content/:contentId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleController.removeContentFromModule
);

// ========== MODULE PROGRESS ROUTES (Admin/Teacher) ==========
// Get student's progress for all modules in a subject
router.get(
  '/progress/students/:studentId/subjects/:subjectId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.getStudentProgressBySubject
);

// Get student's progress for specific module
router.get(
  '/progress/students/:studentId/subjects/:subjectId/modules/:moduleId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.getStudentModuleProgress
);

// Update student's module progress
router.put(
  '/progress/students/:studentId/subjects/:subjectId/modules/:moduleId',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.updateModuleProgress
);

// Increment time spent on module
router.post(
  '/progress/students/:studentId/subjects/:subjectId/modules/:moduleId/increment-time',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.incrementTimeSpent
);

// Mark module as completed
router.post(
  '/progress/students/:studentId/subjects/:subjectId/modules/:moduleId/complete',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.markModuleComplete
);

// Reset module progress
router.delete(
  '/progress/students/:studentId/subjects/:subjectId/modules/:moduleId/reset',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.resetModuleProgress
);

// Bulk update progress
router.put(
  '/progress/students/:studentId/subjects/:subjectId/bulk',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.bulkUpdateProgress
);

// Get progress statistics for all students in a subject
router.get(
  '/progress/subjects/:subjectId/stats',
  authenticate,
  authorize('ADMIN', 'TEACHER'),
  moduleProgressController.getSubjectProgressStats
);

// ========== MODULE PROGRESS ROUTES (Student Self-Service) ==========
// Get my progress for a subject
router.get(
  '/my-progress/subjects/:subjectId',
  authenticate,
  authorize('STUDENT'),
  moduleProgressController.getMyProgress
);

// Update my progress for a module
router.put(
  '/my-progress/subjects/:subjectId/modules/:moduleId',
  authenticate,
  authorize('STUDENT'),
  moduleProgressController.updateMyProgress
);

// ========== TEST ROUTES ==========
// Get all tests (with filters)
router.get('/tests', authenticate, testController.getTests);

// Get test by ID
router.get('/tests/:testId', authenticate, testController.getTestById);

// Create test
router.post('/tests', authenticate, authorize('ADMIN', 'TEACHER'), testController.createTest);

// Update test
router.put('/tests/:testId', authenticate, authorize('ADMIN', 'TEACHER'), testController.updateTest);

// Delete test
router.delete('/tests/:testId', authenticate, authorize('ADMIN', 'TEACHER'), testController.deleteTest);

// Generate questions using AI
router.post('/tests/:testId/generate-questions', authenticate, authorize('ADMIN', 'TEACHER'), testController.generateTestQuestions);

// Add manual question (with optional file upload for question and options)
router.post('/tests/:testId/questions', authenticate, authorize('ADMIN', 'TEACHER'), upload.fields([
  { name: 'media', maxCount: 1 },
  { name: 'option_media_0', maxCount: 1 },
  { name: 'option_media_1', maxCount: 1 },
  { name: 'option_media_2', maxCount: 1 },
  { name: 'option_media_3', maxCount: 1 }
]), testController.addQuestion);

// Update question (with optional file upload)
router.put('/questions/:questionId', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('media'), testController.updateQuestion);

// Delete question
router.delete('/questions/:questionId', authenticate, authorize('ADMIN', 'TEACHER'), testController.deleteQuestion);

// ========== TEST ATTEMPT ROUTES ==========
// Start test attempt (students)
router.post('/tests/:testId/start', authenticate, authorize('STUDENT'), testAttemptController.startTestAttempt);

// Start practice attempt (students) - for closed/already-attempted tests
router.post('/tests/:testId/practice', authenticate, authorize('STUDENT'), testAttemptController.startPracticeAttempt);

// Submit answer for a question (with optional file upload)
router.post('/test-attempts/:attemptId/answers', authenticate, authorize('STUDENT'), upload.single('answer_media'), testAttemptController.submitAnswer);

// Submit entire test
router.post('/test-attempts/:attemptId/submit', authenticate, authorize('STUDENT'), testAttemptController.submitTest);

// Get test attempt by ID
router.get('/test-attempts/:attemptId', authenticate, testAttemptController.getTestAttempt);

// Get all attempts for a test (teachers/admin)
router.get('/tests/:testId/attempts', authenticate, authorize('ADMIN', 'TEACHER'), testAttemptController.getTestAttempts);

// Get my test attempts
router.get('/my-test-attempts', authenticate, authorize('STUDENT'), testAttemptController.getMyTestAttempts);

// Grade test attempt (teachers/admin)
router.post('/test-attempts/:attemptId/grade', authenticate, authorize('ADMIN', 'TEACHER'), testAttemptController.gradeTestAttempt);

// ========== CHAT ROUTES ==========
// Start a new chat
router.post('/chats', authenticate, chatController.startChat);

// Send a message (with optional file upload)
router.post('/chats/:chatId/messages', authenticate, upload.single('file'), chatController.sendMessage);

// Get messages for a chat
router.get('/chats/:chatId/messages', authenticate, chatController.getChatMessages);

// Get all chats for the current user
router.get('/chats', authenticate, chatController.getUserChats);

// Get all chats (Admin only)
router.get('/admin/chats', authenticate, authorize('ADMIN'), chatController.getAllChats);


// ================== LOCATION ROUTES ==================

// Get all countries
router.get('/locations/countries', locationController.getCountries);

// Get all states by country
router.get('/locations/countries/:countryId/states', locationController.getStatesByCountry);

// Get all cities by state
router.get('/locations/states/:stateId/cities', locationController.getCitiesByState);


// ================== CURRENCY ROUTES ==================

// Get all currencies
router.get('/currencies', currencyController.getCurrencies);


// ================== TEST SERIES ROUTES ==================

// Get all test series
router.get('/test-series', authenticate, testSeriesController.getAllTestSeries);

// Get my enrolled test series (students)
router.get('/test-series/my-enrollments', authenticate, testSeriesController.getMyTestSeries);

// Get test series by ID
router.get('/test-series/:id', authenticate, testSeriesController.getTestSeriesById);

// Get test series enrollments (admin)
router.get('/test-series/:id/enrollments', authenticate, authorize('ADMIN', 'TEACHER'), testSeriesController.getTestSeriesEnrollments);

// Create test series
router.post('/test-series', authenticate, authorize('ADMIN', 'TEACHER'), testSeriesController.createTestSeries);

// Update test series
router.put('/test-series/:id', authenticate, authorize('ADMIN', 'TEACHER'), testSeriesController.updateTestSeries);

// Delete test series
router.delete('/test-series/:id', authenticate, authorize('ADMIN'), testSeriesController.deleteTestSeries);

// Enroll in test series
router.post('/test-series/:id/enroll', authenticate, testSeriesController.enrollInTestSeries);

// Unenroll from test series
router.delete('/test-series/:id/enroll', authenticate, testSeriesController.unenrollFromTestSeries);

// Assign teacher to test series
router.post('/test-series/assign-teacher', authenticate, authorize('ADMIN'), testSeriesController.assignTeacherToTestSeries);

// Remove teacher from test series
router.delete('/test-series/remove-teacher/:id', authenticate, authorize('ADMIN'), testSeriesController.removeTeacherFromTestSeries);

// Get teachers by test series
router.get('/test-series/:id/teachers', authenticate, authorize('ADMIN', 'TEACHER'), testSeriesController.getTeachersByTestSeries);


// ================== ACTIVITY GROUP ROUTES ==================

// Get all activity groups
router.get('/activity-groups', authenticate, activityGroupController.getAllActivityGroups);

// Get activity group by ID
router.get('/activity-groups/:id', authenticate, activityGroupController.getActivityGroupById);

// Create activity group
router.post('/activity-groups', authenticate, authorize('ADMIN'), activityGroupController.createActivityGroup);

// Update activity group
router.put('/activity-groups/:id', authenticate, authorize('ADMIN'), activityGroupController.updateActivityGroup);

// Delete activity group
router.delete('/activity-groups/:id', authenticate, authorize('ADMIN'), activityGroupController.deleteActivityGroup);

// Assign teacher to activity group
router.post('/activity-groups/assign-teacher', authenticate, authorize('ADMIN'), activityGroupController.assignTeacherToActivityGroup);

// Remove teacher from activity group
router.delete('/activity-groups/remove-teacher/:id', authenticate, authorize('ADMIN'), activityGroupController.removeTeacherFromActivityGroup);

// Get teachers by activity group
router.get('/activity-groups/:id/teachers', authenticate, activityGroupController.getTeachersByActivityGroup);


// ================== ACTIVITY ROUTES ==================

// Get all activities
router.get('/activities', authenticate, activityController.getAllActivities);

// Get activities for students (published only)
router.get('/activities/student/available', authenticate, authorize('STUDENT'), activityController.getActivitiesForStudent);

// Get activity by ID
router.get('/activities/:id', authenticate, activityController.getActivityById);

// Create activity
router.post('/activities', authenticate, authorize('ADMIN', 'TEACHER'), activityController.createActivity);

// Update activity
router.put('/activities/:id', authenticate, authorize('ADMIN', 'TEACHER'), activityController.updateActivity);

// Delete activity
router.delete('/activities/:id', authenticate, authorize('ADMIN', 'TEACHER'), activityController.deleteActivity);

// Publish/Unpublish activity
router.patch('/activities/:id/publish', authenticate, authorize('ADMIN', 'TEACHER'), activityController.togglePublishActivity);

// Generate activity content with AI
router.post('/activities/generate-content', authenticate, authorize('ADMIN'), activityController.generateActivityContent);


// ================== ACTIVITY ENROLLMENT ROUTES ==================

// Enroll student in activity
router.post('/activity-enrollments', authenticate, authorize('ADMIN'), activityEnrollmentController.enrollStudent);

// Bulk enroll students
router.post('/activity-enrollments/bulk', authenticate, authorize('ADMIN'), activityEnrollmentController.bulkEnrollStudents);

// Enroll students to activity group (all activities in the group)
router.post('/activity-enrollments/group', authenticate, authorize('ADMIN'), activityEnrollmentController.enrollStudentsToGroup);

// Get enrolled students for a group
router.get('/activity-groups/:groupId/enrollments', authenticate, authorize('ADMIN'), activityEnrollmentController.getGroupEnrollments);

// Unenroll student from activity group
router.delete('/activity-groups/:groupId/enrollments', authenticate, authorize('ADMIN'), activityEnrollmentController.unenrollStudentFromGroup);

// Get enrollments for activity
router.get('/activities/:activityId/enrollments', authenticate, authorize('ADMIN'), activityEnrollmentController.getActivityEnrollments);

// Get student's enrollments
router.get('/activity-enrollments/my-enrollments', authenticate, authorize('STUDENT'), activityEnrollmentController.getStudentEnrollments);

// Unenroll student
router.delete('/activity-enrollments/:id', authenticate, authorize('ADMIN'), activityEnrollmentController.unenrollStudent);


// ================== ACTIVITY ATTEMPT ROUTES ==================

// Start activity attempt
router.post('/activity-attempts/start', authenticate, authorize('STUDENT'), activityAttemptController.startAttempt);

// Submit response
router.post('/activity-attempts/response', authenticate, authorize('STUDENT'), activityAttemptController.submitResponse);

// Complete attempt
router.patch('/activity-attempts/:id/complete', authenticate, authorize('STUDENT'), activityAttemptController.completeAttempt);

// Get attempt by ID
router.get('/activity-attempts/:id', authenticate, activityAttemptController.getAttemptById);

// Get student's attempts
router.get('/activity-attempts/my-attempts', authenticate, authorize('STUDENT'), activityAttemptController.getStudentAttempts);

// Get activity attempts (admin)
router.get('/activities/:activityId/attempts', authenticate, authorize('ADMIN'), activityAttemptController.getActivityAttempts);

// Get activity leaderboard
// Get activity leaderboard
router.get('/activities/:activityId/leaderboard', authenticate, activityAttemptController.getActivityLeaderboard);


// ================== QUIZ SESSION ROUTES ==================
import * as quizSessionController from '../controllers/quizSession.controller.js';

// Get Session by ID
router.get('/quiz-sessions/:id', authenticate, quizSessionController.getSessionById);

// Create Session (Host)
router.post('/quiz-sessions', authenticate, authorize('ADMIN', 'TEACHER'), quizSessionController.createSession);

// Get Session by ID
router.get('/quiz-sessions/:id', authenticate, quizSessionController.getSessionById);

// Join Session (Student)
router.post('/quiz-sessions/join', authenticate, quizSessionController.joinSession);

// Start Session (Host)
router.post('/quiz-sessions/:id/start', authenticate, authorize('ADMIN', 'TEACHER'), quizSessionController.startSession);

// Next Question (Host)
router.post('/quiz-sessions/:id/next', authenticate, authorize('ADMIN', 'TEACHER'), quizSessionController.nextQuestion);

// End Session (Host)
router.post('/quiz-sessions/:id/end', authenticate, authorize('ADMIN', 'TEACHER'), quizSessionController.endSession);


// ================== HOME ROUTES (STUDENT) ==================

// Get all home items (courses, subjects, activity groups, test series)
router.get('/home/items', authenticate, authorize('STUDENT'), homeController.getHomeItems);


// ================== ENQUIRY ROUTES ==================

// Create enquiry (Student)
router.post('/enquiries', authenticate, authorize('STUDENT'), enquiryController.createEnquiry);

// Get all enquiries (Admin)
router.get('/enquiries', authenticate, authorize('ADMIN'), enquiryController.getAllEnquiries);

// Update enquiry status (Admin)
router.patch('/enquiries/:id/status', authenticate, authorize('ADMIN'), enquiryController.updateEnquiryStatus);

// Delete enquiry (Admin)
router.delete('/enquiries/:id', authenticate, authorize('ADMIN'), enquiryController.deleteEnquiry);

export default router;