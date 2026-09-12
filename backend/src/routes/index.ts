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
import * as idCardController from '../controllers/idCard.controller.js';
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
import * as couponController from '../controllers/coupon.controller.js';
import * as homeworkController from '../controllers/homework.controller.js';
import * as videoRoomController from '../controllers/videoRoom.controller.js';
import * as paymentController from '../controllers/payment.controller.js';
import * as analyticsController from '../controllers/analytics.controller.js';
import * as profileController from '../controllers/profile.controller.js';
import * as deletionController from '../controllers/deletion.controller.js';
import * as pushNotificationController from '../controllers/pushNotification.controller.js';
import * as teacherRoleController from '../controllers/teacherRole.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import * as jobController from '../controllers/job.controller.js';
import * as knowYourChildController from '../controllers/knowYourChild.controller.js';
import * as brainQuestController from '../controllers/brainQuest.controller.js';
import * as agencyController from '../controllers/agency.controller.js';
import * as whiteboardController from '../controllers/whiteboard.controller.js';
import * as invoiceController from '../controllers/invoice.controller.js';
import * as recordingController from '../controllers/recording.controller.js';
import * as sectionController from '../controllers/section.controller.js';
import * as adminMaintenanceController from '../controllers/adminMaintenance.controller.js';
import * as paymentGatewayController from '../controllers/paymentGateway.controller.js';
import * as holidayController from '../controllers/holiday.controller.js';
import announcementRoutes from './announcement.routes.js';
import { authenticate, authorize, authorizeStrict } from '../middleware/auth.middleware.js';


// Configure multer for memory storage (files will be uploaded to S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

const router = express.Router();

// ================== GENERIC UPLOAD ROUTE ==================
router.post('/upload', authenticate, authorizeStrict('ADMIN', 'TEACHER'), upload.single('file'), uploadController.uploadFile);

// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/verify', authenticate, authController.verifyToken);

// OTP verification routes for signup
router.post('/auth/request-otp', authController.requestOTP);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/resend-otp', authController.resendOTP);
router.post('/auth/check-password-strength', authController.checkPasswordStrength);

// Password reset routes
router.post('/auth/request-password-reset', authController.requestPasswordReset);
router.post('/auth/verify-password-reset-otp', authController.verifyPasswordResetOTP);
router.post('/auth/reset-password', authController.resetPassword);

// Teacher Role Management routes (ADMIN only)
router.get('/teacher-roles', authenticate, authorize('ADMIN'), teacherRoleController.getAllRoles);
router.get('/teacher-roles/:id', authenticate, authorize('ADMIN'), teacherRoleController.getRoleById);
router.post('/teacher-roles', authenticate, authorize('ADMIN'), teacherRoleController.createRole);
router.put('/teacher-roles/:id', authenticate, authorize('ADMIN'), teacherRoleController.updateRole);
router.delete('/teacher-roles/:id', authenticate, authorize('ADMIN'), teacherRoleController.deleteRole);
router.post('/teacher-roles/assign', authenticate, authorize('ADMIN'), teacherRoleController.assignRoleToTeacher);

// Get current teacher's permissions (for frontend)
router.get('/my-permissions', authenticate, authorize('TEACHER'), teacherRoleController.getTeacherPermissions);

// Profile routes
router.get('/profile', authenticate, profileController.getProfile);
router.put('/profile', authenticate, upload.single('profileImage'), profileController.updateProfile);
router.put('/profile/student', authenticate, authorize('STUDENT'), profileController.updateStudentDetails);
router.put('/profile/teacher', authenticate, authorize('TEACHER'), profileController.updateTeacherDetails);

// Account deletion routes
router.post('/account/request-deletion', authenticate, authorize('STUDENT', 'TEACHER'), deletionController.requestDeletion);
router.post('/account/cancel-deletion', authenticate, authorize('STUDENT', 'TEACHER'), deletionController.cancelDeletion);
router.get('/admin/deletion-requests', authenticate, authorize('ADMIN'), deletionController.getDeletionRequests);
router.post('/admin/verify-deletion/:userId', authenticate, authorize('ADMIN'), deletionController.verifyDeletion);
router.delete('/admin/delete-user/:userId', authenticate, authorize('ADMIN'), deletionController.deleteUserAccount);

// Admin Maintenance & Automated Cron Triggers
router.post('/admin/backups/run', authenticate, authorize('ADMIN'), adminMaintenanceController.triggerDatabaseBackup);
router.post('/admin/retention-cleanup/run', authenticate, authorize('ADMIN'), adminMaintenanceController.triggerRetentionCleanup);

// Push Notification routes
router.post('/notifications/subscribe', authenticate, pushNotificationController.subscribeToNotifications);
router.post('/notifications/unsubscribe', authenticate, pushNotificationController.unsubscribeFromNotifications);
router.post('/notifications/test', authenticate, pushNotificationController.sendTestNotification);
router.post('/notifications/send-to-users', authenticate, authorize('ADMIN', 'TEACHER'), pushNotificationController.sendNotificationToUsers);
router.post('/notifications/send-to-role', authenticate, authorize('ADMIN'), pushNotificationController.sendNotificationToRole);

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
router.post('/students', authenticate, authorize('ADMIN'), upload.single('profileImage'), studentController.createStudent);
router.put('/students/:id', authenticate, authorize('ADMIN', 'STUDENT'), upload.single('profileImage'), studentController.updateStudent);
router.delete('/students/:id', authenticate, authorize('ADMIN'), studentController.deleteStudent);

// Subject routes
router.get('/subjects', subjectController.getAllSubjects);
router.get('/subjects/:id', subjectController.getSubjectById);
router.post('/subjects', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('cover_image'), subjectController.createSubject);
router.put('/subjects/:id', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('cover_image'), subjectController.updateSubject);
router.delete('/subjects/:id', authenticate, authorize('ADMIN', 'TEACHER'), subjectController.deleteSubject);

// Enrollment routes
router.get('/enrollments', authenticate, enrollmentController.getAllEnrollments);
router.get('/enrollments/student/:studentId', authenticate, enrollmentController.getEnrollmentsByStudentId);
router.get('/enrollments/:id', authenticate, enrollmentController.getEnrollmentById);
router.post('/enrollments', authenticate, authorize('ADMIN'), enrollmentController.createEnrollment);
router.post('/enrollments/bulk', authenticate, authorize('ADMIN', 'TEACHER'), enrollmentController.bulkEnroll);
router.post('/enrollments/generate-invoice', authenticate, authorize('ADMIN'), enrollmentController.generateInvoiceFromEnrollments);
router.put('/enrollments/:id', authenticate, authorize('ADMIN'), enrollmentController.updateEnrollment);
router.delete('/enrollments/:id', authenticate, authorize('ADMIN', 'TEACHER', 'STUDENT'), enrollmentController.deleteEnrollment);


// Payment routes
router.get('/payments', authenticate, paymentController.getAllPayments);
router.get('/payments/:id', authenticate, paymentController.getPaymentById);
router.put('/payments/:id', authenticate, authorize('ADMIN'), paymentController.updatePayment);
router.put('/payments/:id/pay', authenticate, authorize('ADMIN'), paymentController.markPaymentAsPaid);
router.delete('/payments/:id', authenticate, authorize('ADMIN'), paymentController.deletePayment);
router.get('/payments/overdue', authenticate, authorize('ADMIN'), paymentController.getOverduePayments);

// Teacher routes
router.get('/teachers', authenticate, teacherController.getAllTeachers);
router.get('/teachers/:id', authenticate, teacherController.getTeacherById);
router.post('/teachers', authenticate, authorize('ADMIN'), upload.single('profileImage'), teacherController.createTeacher);
router.put('/teachers/:id', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('profileImage'), teacherController.updateTeacher);
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
router.post('/class-sessions/bulk-delete', authenticate, authorize('ADMIN', 'TEACHER'), classSessionController.bulkDeleteClassSessions);
router.put('/class-sessions/:id', authenticate, authorizeStrict('ADMIN'), classSessionController.updateClassSession);
router.delete('/class-sessions/:id', authenticate, authorize('ADMIN', 'TEACHER'), classSessionController.deleteClassSession);

// Session Recording routes (30-day retention)
router.post('/class-sessions/:id/recording', authenticate, authorize('ADMIN', 'TEACHER'), recordingController.uploadRecordingMiddleware.single('video'), recordingController.uploadSessionRecording);
router.get('/class-sessions/:id/recording', authenticate, recordingController.getSessionRecording);
router.get('/class-sessions/:id/recording/stream', authenticate, recordingController.streamSessionRecording);
router.delete('/class-sessions/:id/recording/:recordingId', authenticate, authorize('ADMIN', 'TEACHER'), recordingController.deleteSessionRecording);

// ================== SECTION ROUTES ==================
router.get('/sections', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.getAllSections);
router.get('/sections/:id', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.getSectionById);
router.post('/sections', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.createSection);
router.put('/sections/:id', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.updateSection);
router.delete('/sections/:id', authenticate, authorize('ADMIN'), sectionController.deleteSection);
router.get('/sections/:id/students', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.getSectionStudents);
router.post('/sections/:id/students', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.addStudentToSection);
router.delete('/sections/:id/students/:studentId', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.removeStudentFromSection);
router.get('/sections/:id/available-students', authenticate, authorize('ADMIN', 'TEACHER'), sectionController.getAvailableStudents);

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

// ========== PUBLIC CERTIFICATION ROUTES ==========
router.get('/public/tests/:testId', testController.getPublicTestById);
router.post('/public/tests/:testId/start', testAttemptController.startPublicTestAttempt);
router.post('/public/test-attempts/:attemptId/submit', testAttemptController.submitPublicTest);

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

// Duplicate test
router.post('/tests/:testId/duplicate', authenticate, authorize('ADMIN', 'TEACHER'), testController.duplicateTest);

// Generate questions using AI
router.post('/tests/:testId/generate-questions', authenticate, authorize('ADMIN', 'TEACHER'), testController.generateTestQuestions);
router.post('/tests/ai-generate-preview', authenticate, authorize('ADMIN', 'TEACHER'), testController.generateAIQuestionsPreview);

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

// Grade test attempt (teachers/admin) - Custom authorization in controller
router.post('/test-attempts/:attemptId/grade', authenticate, authorizeStrict('ADMIN', 'TEACHER'), testAttemptController.gradeTestAttempt);

// Get all issued certificates (teachers/admin)
router.get('/certificates', authenticate, authorize('ADMIN', 'TEACHER'), testAttemptController.getAllCertificates);

// ========== CHAT ROUTES ==========
// Start a new chat
router.post('/chats', authenticate, chatController.startChat);

// Send a message (with optional multiple file uploads)
router.post('/chats/:chatId/messages', authenticate, upload.any(), chatController.sendMessage);

// Upload chat attachment(s) immediately
router.post('/chats/upload', authenticate, upload.any(), chatController.uploadChatAttachment);

// Get messages for a chat
router.get('/chats/:chatId/messages', authenticate, chatController.getChatMessages);

// Get all chats for the current user
router.get('/chats', authenticate, chatController.getUserChats);

// Get all chats (Admin only)
router.get('/admin/chats', authenticate, authorize('ADMIN'), chatController.getAllChats);

// Delete a message in a chat
router.delete('/chats/:chatId/messages/:messageId', authenticate, chatController.deleteMessage);
router.delete('/chats/messages/:messageId', authenticate, chatController.deleteMessage);


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

// Get ALL test series enrollments (global admin)
router.get('/test-series/enrollments/global', authenticate, authorize('ADMIN'), testSeriesController.getAllGlobalTestSeriesEnrollments);

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

// Get ALL activity group enrollments (global admin)
router.get('/activity-groups/enrollments/global', authenticate, authorize('ADMIN'), activityGroupController.getAllGlobalActivityGroupEnrollments);

// Get activity group by ID
router.get('/activity-groups/:id', authenticate, activityGroupController.getActivityGroupById);

// Create activity group
router.post('/activity-groups', authenticate, authorize('ADMIN'), activityGroupController.createActivityGroup);

// Update activity group
router.put('/activity-groups/:id', authenticate, authorize('ADMIN'), activityGroupController.updateActivityGroup);

// Delete activity group
router.delete('/activity-groups/:id', authenticate, authorize('ADMIN'), activityGroupController.deleteActivityGroup);

// Enroll student in activity group
router.post('/activity-groups/:id/enroll', authenticate, activityGroupController.enrollStudentInActivityGroup);

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

// Create activity — any teacher can create for their assigned groups (enforced in controller)
router.post('/activities', authenticate, authorizeStrict('ADMIN', 'TEACHER'), activityController.createActivity);

// Update activity
router.put('/activities/:id', authenticate, authorizeStrict('ADMIN', 'TEACHER'), activityController.updateActivity);

// Delete activity
router.delete('/activities/:id', authenticate, authorizeStrict('ADMIN', 'TEACHER'), activityController.deleteActivity);

// Publish/Unpublish activity
router.patch('/activities/:id/publish', authenticate, authorizeStrict('ADMIN', 'TEACHER'), activityController.togglePublishActivity);

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

// Quiz Sessions (Real-time gameplay)
router.get('/quiz-sessions/:id', authenticate, quizSessionController.getSessionById);

// Host
router.post('/quiz-sessions', authenticate, authorizeStrict('ADMIN', 'TEACHER'), quizSessionController.createSession);

// Join (Student)
// NOTE: Replaced duplicate getSessionById below with just joinSession
router.post('/quiz-sessions/join', authenticate, quizSessionController.joinSession);

// Controls
router.post('/quiz-sessions/:id/start', authenticate, authorizeStrict('ADMIN', 'TEACHER'), quizSessionController.startSession);

router.post('/quiz-sessions/:id/next', authenticate, authorizeStrict('ADMIN', 'TEACHER'), quizSessionController.nextQuestion);

router.post('/quiz-sessions/:id/end', authenticate, authorizeStrict('ADMIN', 'TEACHER'), quizSessionController.endSession);


// ================== HOME ROUTES (STUDENT) ==================

// Get all home items (courses, subjects, activity groups, test series)
router.get('/home/items', authenticate, authorize('STUDENT'), homeController.getHomeItems);


// ================== ENQUIRY ROUTES ==================

// Create enquiry (Student)
router.post('/enquiries', authenticate, authorize('STUDENT'), enquiryController.createEnquiry);

// Get all enquiries (Admin/Teacher with permission)
router.get('/enquiries', authenticate, authorize('ADMIN', 'TEACHER'), enquiryController.getAllEnquiries);

// Update enquiry status (Admin/Teacher with permission)
router.patch('/enquiries/:id/status', authenticate, authorize('ADMIN', 'TEACHER'), enquiryController.updateEnquiryStatus);

// Delete enquiry (Admin/Teacher with permission)
router.delete('/enquiries/:id', authenticate, authorize('ADMIN', 'TEACHER'), enquiryController.deleteEnquiry);

// ================== COUPON ROUTES ==================
router.post('/coupons/validate', couponController.validateCoupon);
router.get('/coupons', authenticate, authorize('ADMIN'), couponController.getAllCoupons);
router.get('/coupons/:id', authenticate, authorize('ADMIN'), couponController.getCouponById);
router.post('/coupons', authenticate, authorize('ADMIN'), couponController.createCoupon);
router.put('/coupons/:id', authenticate, authorize('ADMIN'), couponController.updateCoupon);
router.delete('/coupons/:id', authenticate, authorize('ADMIN'), couponController.deleteCoupon);

// ================== HOMEWORK ROUTES ==================

// Create homework (Teacher/Admin)
router.post('/homework', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('document'), homeworkController.createHomework);

// Get homework by subject
router.get('/subjects/:subject_id/homework', authenticate, homeworkController.getHomeworkBySubject);

// Get teacher's homework
router.get('/homework/teacher', authenticate, authorize('ADMIN', 'TEACHER'), homeworkController.getTeacherHomework);

// Get student's homework
router.get('/homework/student', authenticate, authorize('STUDENT'), homeworkController.getStudentHomework);

// Get homework by ID
router.get('/homework/:id', authenticate, homeworkController.getHomeworkById);

// Update homework (Teacher/Admin)
router.put('/homework/:id', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('document'), homeworkController.updateHomework);

// Delete homework (Teacher/Admin)
router.delete('/homework/:id', authenticate, authorize('ADMIN', 'TEACHER'), homeworkController.deleteHomework);

// Submit homework response (Student)
router.post('/homework/:homework_id/response', authenticate, authorize('STUDENT'), upload.array('response_media', 10), homeworkController.submitHomeworkResponse);

// Get homework responses (Teacher/Admin)
router.get('/homework/:homework_id/responses', authenticate, authorize('ADMIN', 'TEACHER'), homeworkController.getHomeworkResponses);

// Check homework response (Teacher/Admin)
router.patch('/homework/responses/:response_id/check', authenticate, authorize('ADMIN', 'TEACHER'), upload.array('feedback_media', 10), homeworkController.checkHomeworkResponse);

// ================== VIDEO ROOM ROUTES ==================

// Get or create video room for session
router.get('/video-rooms/session/:sessionId', authenticate, videoRoomController.getOrCreateRoom);

// Create Janus room (secure endpoint with admin key)
router.post('/video-rooms/janus/create', authenticate, videoRoomController.createJanusRoom);

// Mark room as created on Janus (called by frontend)
router.post('/video-rooms/:janusRoomId/created', authenticate, videoRoomController.markRoomCreated);

// Validate access to room
router.get('/video-rooms/:janusRoomId/access', authenticate, videoRoomController.validateAccess);

// Chat endpoints
router.get('/video-rooms/:janusRoomId/chat', authenticate, videoRoomController.getChatMessages);
router.post('/video-rooms/:janusRoomId/chat', authenticate, videoRoomController.sendChatMessage);

// Whiteboard endpoints (Live classroom)
router.get('/video-rooms/:janusRoomId/whiteboard', authenticate, videoRoomController.getWhiteboardStrokes);
router.post('/video-rooms/:janusRoomId/whiteboard', authenticate, videoRoomController.addWhiteboardStroke);
router.post('/video-rooms/:janusRoomId/whiteboard/sync', authenticate, videoRoomController.syncWhiteboard);
router.post('/video-rooms/:janusRoomId/whiteboard/board', authenticate, videoRoomController.setWhiteboardBoard);
router.delete('/video-rooms/:janusRoomId/whiteboard/strokes', authenticate, videoRoomController.deleteWhiteboardStrokes);
router.post('/video-rooms/:janusRoomId/whiteboard/strokes/delete', authenticate, videoRoomController.deleteWhiteboardStrokes);
router.delete('/video-rooms/:janusRoomId/whiteboard', authenticate, videoRoomController.clearWhiteboard);

// Saved Whiteboards (Admin & Teacher)
router.get('/whiteboards', authenticate, authorizeStrict('ADMIN', 'TEACHER'), whiteboardController.getSavedWhiteboards);
router.get('/whiteboards/:id', authenticate, authorizeStrict('ADMIN', 'TEACHER'), whiteboardController.getSavedWhiteboardById);
router.post('/whiteboards', authenticate, authorizeStrict('ADMIN', 'TEACHER'), whiteboardController.createSavedWhiteboard);
router.put('/whiteboards/:id', authenticate, authorizeStrict('ADMIN', 'TEACHER'), whiteboardController.updateSavedWhiteboard);
router.delete('/whiteboards/:id', authenticate, authorizeStrict('ADMIN', 'TEACHER'), whiteboardController.deleteSavedWhiteboard);

// Teacher admin actions
router.post('/video-rooms/:janusRoomId/participants/:participantId/mute', authenticate, videoRoomController.muteParticipant);
router.post('/video-rooms/:janusRoomId/participants/:participantId/kick', authenticate, videoRoomController.kickParticipant);

// Attendance tracking
router.post('/video-rooms/:janusRoomId/join', authenticate, videoRoomController.recordJoin);
router.post('/video-rooms/:janusRoomId/leave', authenticate, videoRoomController.recordLeave);
router.get('/class-sessions/:sessionId/attendance', authenticate, videoRoomController.getSessionAttendance);
router.post('/class-sessions/:sessionId/attendance/mark-all-left', authenticate, videoRoomController.markAllAsLeft);

// ================== INVOICE & BILLING ROUTES ==================
router.get('/invoices/settings', authenticate, invoiceController.getInvoiceSettings);
router.put('/invoices/settings', authenticate, authorize('ADMIN'), invoiceController.updateInvoiceSettings);
router.get('/invoices', authenticate, invoiceController.getAllInvoices);
router.get('/invoices/:id', authenticate, invoiceController.getInvoiceById);
router.post('/invoices', authenticate, authorize('ADMIN'), invoiceController.createInvoice);
router.put('/invoices/:id', authenticate, authorize('ADMIN'), invoiceController.updateInvoice);
router.post('/invoices/:id/record-payment', authenticate, authorize('ADMIN'), invoiceController.recordInvoicePayment);
router.patch('/invoices/:id/status', authenticate, authorize('ADMIN'), invoiceController.markInvoiceStatus);
router.post('/invoices/:id/send-email', authenticate, authorize('ADMIN'), invoiceController.sendInvoiceEmail);
router.delete('/invoices/:id', authenticate, authorize('ADMIN'), invoiceController.deleteInvoice);

// ================== PAYMENT GATEWAY & RAZORPAY ROUTES ==================
router.get('/payment-gateway/config', paymentGatewayController.getPublicGatewayConfig);
router.get('/settings/payment-gateway', authenticate, authorize('ADMIN'), paymentGatewayController.getAdminGatewaySettings);
router.put('/settings/payment-gateway', authenticate, authorize('ADMIN'), paymentGatewayController.updateGatewaySettings);
router.post('/payments/razorpay/create-order', authenticate, paymentGatewayController.createRazorpayOrder);
router.post('/payments/razorpay/verify-payment', authenticate, paymentGatewayController.verifyRazorpayPayment);

// ================== ENROLLMENT ROUTES ==================
router.get('/enrollments', authenticate, enrollmentController.getAllEnrollments);
router.get('/enrollments/:id', authenticate, enrollmentController.getEnrollmentById);
router.post('/enrollments', authenticate, authorize('ADMIN'), enrollmentController.createEnrollment);
router.delete('/enrollments/:id', authenticate, authorize('ADMIN'), enrollmentController.deleteEnrollment);

// ================== PAYMENT ROUTES ==================
router.get('/payments', authenticate, authorize('ADMIN'), paymentController.getAllPayments);
router.get('/payments/:id', authenticate, authorize('ADMIN'), paymentController.getPaymentById);
router.put('/payments/:id', authenticate, authorize('ADMIN'), paymentController.updatePayment);
router.put('/payments/:id/mark-paid', authenticate, authorize('ADMIN'), paymentController.markPaymentAsPaid);
router.delete('/payments/:id', authenticate, authorize('ADMIN'), paymentController.deletePayment);
router.get('/payments/overdue', authenticate, authorize('ADMIN'), paymentController.getOverduePayments);

// ================== ANALYTICS ROUTES ==================

// Student analytics
router.get('/analytics/my-analytics', authenticate, authorize('STUDENT'), analyticsController.getMyAnalytics);
router.get('/analytics/performance', authenticate, authorize('STUDENT'), analyticsController.getPerformanceTimeseries);

// Teacher analytics
router.get('/analytics/teacher/students', authenticate, authorize('TEACHER'), analyticsController.getTeacherStudentsAnalytics);
router.get('/analytics/teacher/subject/:subjectId', authenticate, authorize('TEACHER'), analyticsController.getTeacherSubjectAnalytics);

// Admin analytics
router.get('/analytics/student/:studentId', authenticate, authorize('ADMIN', 'TEACHER'), analyticsController.getStudentAnalytics);
router.get('/analytics/admin/students', authenticate, authorize('ADMIN'), analyticsController.getAdminStudentsAnalytics);
router.get('/analytics/admin/teachers', authenticate, authorize('ADMIN'), analyticsController.getAdminTeachersAnalytics);
router.get('/analytics/admin/business', authenticate, authorize('ADMIN'), analyticsController.getAdminBusinessAnalytics);

// ================== ID CARD ROUTES ==================
router.post('/id-cards/send-email', authenticate, idCardController.sendIDCardEmail);

// ================== JOB/INTERNSHIP ROUTES ==================

// Public job listings (Admin & Students can view)
router.get('/jobs', authenticate, jobController.getAllJobs);
router.get('/jobs/:id', authenticate, jobController.getJobById);

// Admin: Manage jobs
router.post('/jobs', authenticate, authorize('ADMIN'), jobController.createJob);
router.put('/jobs/:id', authenticate, authorize('ADMIN'), jobController.updateJob);
router.delete('/jobs/:id', authenticate, authorize('ADMIN'), jobController.deleteJob);

// Student/Teacher: Apply for jobs
router.post('/jobs/apply', authenticate, authorize('STUDENT', 'TEACHER'), upload.single('cv'), jobController.applyForJob);
router.get('/jobs/applications/my', authenticate, authorize('STUDENT', 'TEACHER'), jobController.getMyApplications);
router.delete('/jobs/applications/:id', authenticate, authorize('STUDENT', 'TEACHER'), jobController.withdrawApplication);

// Admin: Manage applications
router.get('/jobs/:job_id/applications', authenticate, authorize('ADMIN'), jobController.getJobApplications);
router.get('/jobs/applications/all', authenticate, authorize('ADMIN'), jobController.getAllApplications);
router.get('/jobs/applications/:id', authenticate, authorize('ADMIN'), jobController.getApplicationById);
router.patch('/jobs/applications/:id/review', authenticate, authorize('ADMIN'), jobController.reviewApplication);

// ================== ANNOUNCEMENT ROUTES ==================
router.use('/announcements', announcementRoutes);

// ================== KNOW YOUR CHILD ROUTES ==================
router.post('/know-your-child', authenticate, authorize('ADMIN', 'TEACHER'), knowYourChildController.createReport);
router.get('/know-your-child/student/:studentId', authenticate, knowYourChildController.getStudentReports);
router.patch('/know-your-child/:id/feedback', authenticate, knowYourChildController.addParentFeedback);
router.delete('/know-your-child/:id', authenticate, authorize('ADMIN', 'TEACHER'), knowYourChildController.deleteReport);

// ================== BRAIN QUEST ROUTES ==================
router.post('/brain-quest', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('document'), brainQuestController.createBrainQuest);
router.get('/brain-quest', authenticate, brainQuestController.getAllBrainQuests);
router.get('/brain-quest/:id', authenticate, brainQuestController.getBrainQuestById);
router.put('/brain-quest/:id', authenticate, authorize('ADMIN', 'TEACHER'), upload.single('document'), brainQuestController.updateBrainQuest);
router.delete('/brain-quest/:id', authenticate, authorize('ADMIN', 'TEACHER'), brainQuestController.deleteBrainQuest);
router.post('/brain-quest/:id/submit', authenticate, authorize('STUDENT'), upload.single('submission'), brainQuestController.submitBrainQuest);
router.post('/brain-quest/submission/:submissionId/grade', authenticate, authorize('ADMIN', 'TEACHER'), brainQuestController.gradeBrainQuestSubmission);

// ================== FILE PROXY ROUTE ==================
router.get('/upload/proxy-file', uploadController.proxyFile);

// ================== REFERRAL / AGENCY ROUTES ==================
router.post('/referral/validate-code', agencyController.validateReferralCode);

// Agency Auth & Portal
router.post('/agency/login', agencyController.agencyLogin);
router.get('/agency/profile', authenticate, agencyController.getAgencyProfile);
router.get('/agency/dashboard', authenticate, agencyController.getAgencyDashboard);
router.get('/agency/students', authenticate, agencyController.getAgencyStudents);
router.post('/agency/students', authenticate, agencyController.createStudentByAgency);
router.get('/agency/earnings', authenticate, agencyController.getAgencyEarnings);
router.post('/agency/payout-request', authenticate, agencyController.requestPayout);
router.get('/agency/payouts', authenticate, agencyController.getAgencyPayouts);
router.put('/agency/payout-details', authenticate, agencyController.updateAgencyPayoutDetails);

// Admin Agency Management
router.post('/admin/agencies', authenticate, authorize('ADMIN'), agencyController.createAgency);
router.get('/admin/agencies', authenticate, authorize('ADMIN'), agencyController.getAllAgencies);
router.get('/admin/agencies/:id', authenticate, authorize('ADMIN'), agencyController.getAgencyById);
router.put('/admin/agencies/:id', authenticate, authorize('ADMIN'), agencyController.updateAgency);
router.delete('/admin/agencies/:id', authenticate, authorize('ADMIN'), agencyController.deleteAgency);
router.get('/admin/agency-payouts', authenticate, authorize('ADMIN'), agencyController.getAgencyPayouts);
router.patch('/admin/agency-payouts/:payoutId', authenticate, authorize('ADMIN'), agencyController.handlePayoutRequest);

// ================== HOLIDAY MANAGEMENT ROUTES ==================
router.get('/holidays', authenticate, holidayController.getAllHolidays);
router.get('/holidays/upcoming', authenticate, holidayController.getUpcomingHolidays);
router.get('/holidays/:id', authenticate, holidayController.getHolidayById);
router.post('/holidays', authenticate, authorize('ADMIN'), holidayController.createHoliday);
router.put('/holidays/:id', authenticate, authorize('ADMIN'), holidayController.updateHoliday);
router.delete('/holidays/:id', authenticate, authorize('ADMIN'), holidayController.deleteHoliday);

export default router;
