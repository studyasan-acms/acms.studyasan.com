import axios, { AxiosError } from 'axios';
import type {
  LoginCredentials,
  AuthResponse,
  RegisterData,
  ApiError,
  PaginatedResponse,
  Notification,
  Student,
  CreateStudentData,
  UpdateStudentData,
  Board,
  Class,
  Teacher,
  Subject,
  CreateTeacherData,
  UpdateTeacherData,
  CreateSubjectData,
  UpdateSubjectData,
  TeacherSubjectAssignment,
  Enrollment,
  EnrollmentPayment,
  CreateEnrollmentData,
  BulkEnrollmentData,
  CreateBoardData,
  UpdateBoardData,
  CreateClassData,
  UpdateClassData,
  Module,
  ModuleContent,
  StudentModuleProgress,
  CreateModuleData,
  UpdateModuleData,
  AddTextContentData,
  UpdateContentData,
  UpdateProgressData,
  Test,
  TestAttempt,
  CreateTestData,
  UpdateTestData,
  GenerateQuestionsData,
  CreateQuestionData,
  UpdateQuestionData,
  SubmitAnswerData,
  GradeTestData,
  Question,
  Answer,
  Chat,
  Message,
  StartChatData,
  SendMessageData,
  ClassSession,
  CreateClassSessionData,
  UpdateClassSessionData,
  WeeklyScheduleResponse,
  CanJoinSessionResponse,
  ChatMessagesResponse,
  Country,
  Currency,
  State,
  City,
  ActivityGroup,
  ActivityGroupTeacherJunction,
  TestSeries,
  TestSeriesTeacherJunction,
  TestSeriesEnrollment,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Don't redirect on 401 for auth endpoints (login/register)
    const isAuthEndpoint = error.config?.url?.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export const notificationService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    is_read?: boolean;
    type?: string;
  }): Promise<PaginatedResponse<Notification>> => {
    const response = await api.get<PaginatedResponse<Notification>>(
      '/notifications',
      { params }
    );
    return response.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};

// ... previous imports and code ...

export const studentService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    class_id?: number;
    board_id?: number;
    gender?: string;
    user_id?: number;
    role?: string;
  }): Promise<PaginatedResponse<Student>> => {
    const response = await api.get<PaginatedResponse<Student>>('/students', {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: Student }> => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (data: CreateStudentData): Promise<{ success: boolean; data: Student }> => {
    // First create the user
    const userResponse = await api.post('/auth/register', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: 'STUDENT',
    });

    // Then create the student profile with ALL fields including address
    const studentResponse = await api.post('/students', {
      user_id: userResponse.data.data.user.id,
      class_id: data.class_id,
      board_id: data.board_id,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      school: data.school,
      blood_group: data.blood_group, // Add blood_group
      addressLine: data.addressLine, // Add address fields
      countryId: data.countryId,
      stateId: data.stateId,
      cityId: data.cityId,
      postalCode: data.postalCode,
    });

    return studentResponse.data;
  },

  update: async (
    id: number,
    data: UpdateStudentData
  ): Promise<{ success: boolean; data: Student }> => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/students/${id}`);
  },
};
export const boardService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Board>> => {
    const response = await api.get<PaginatedResponse<Board>>('/boards', {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: Board }> => {
    const response = await api.get(`/boards/${id}`);
    return response.data;
  },

  create: async (data: CreateBoardData): Promise<{ success: boolean; data: Board }> => {
    const response = await api.post('/boards', data);
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateBoardData
  ): Promise<{ success: boolean; data: Board }> => {
    const response = await api.put(`/boards/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/boards/${id}`);
  },
};

export const classService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<PaginatedResponse<Class>> => {
    const response = await api.get<PaginatedResponse<Class>>('/classes', {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: Class }> => {
    const response = await api.get(`/classes/${id}`);
    return response.data;
  },

  create: async (data: CreateClassData): Promise<{ success: boolean; data: Class }> => {
    const response = await api.post('/classes', data);
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateClassData
  ): Promise<{ success: boolean; data: Class }> => {
    const response = await api.put(`/classes/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/classes/${id}`);
  },
};

export const teacherService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    gender?: string;
  }): Promise<PaginatedResponse<Teacher>> => {
    const response = await api.get<PaginatedResponse<Teacher>>('/teachers', {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: Teacher }> => {
    const response = await api.get(`/teachers/${id}`);
    // normalize: if backend wraps response as { success, message, data }, return data, else return response.data
    return (response.data && (response.data.data ?? response.data)) as any;
  },

  create: async (data: CreateTeacherData): Promise<{ success: boolean; data: Teacher }> => {
    // First create the user
    const userResponse = await api.post('/auth/register', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: 'TEACHER',
    });

    // Then create the teacher profile
    const teacherPayload: any = {
      user_id: userResponse.data.data.user.id,
      salary: data.salary,
      salary_currency_id: data.salary_currency_id,
      qualification: data.qualification,
      gender: data.gender,
      experience: data.experience,
    };

    if (data.address) teacherPayload.address = data.address;

    const teacherResponse = await api.post('/teachers', teacherPayload);

    return teacherResponse.data;
  },

  update: async (
    id: number,
    data: UpdateTeacherData
  ): Promise<{ success: boolean; data: Teacher }> => {
    const payload: any = { ...data };
    // if address is present, send nested address object
    if (data.address) payload.address = data.address;

    const response = await api.put(`/teachers/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/teachers/${id}`);
  },

  assignSubject: async (
    data: TeacherSubjectAssignment
  ): Promise<{ success: boolean; data: any }> => {
    const response = await api.post('/teachers/assign-subject', data);
    return response.data;
  },

  removeSubject: async (junctionId: number): Promise<void> => {
    await api.delete(`/teachers/remove-subject/${junctionId}`);
  },

  getBySubject: async (subjectId: number): Promise<{ success: boolean; data: Teacher[] }> => {
    const response = await api.get(`/subjects/${subjectId}/teachers`);
    return response.data;
  },
};

export const subjectService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    class_id?: number;
    board_id?: number;
    is_course?: boolean;
    teacher_id?: number;
    student_id?: number;
  }): Promise<PaginatedResponse<Subject>> => {
    const response = await api.get<PaginatedResponse<Subject>>('/subjects', {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: Subject }> => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  },

  create: async (data: CreateSubjectData): Promise<{ success: boolean; data: Subject }> => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.class_id !== null) formData.append('class_id', data.class_id.toString());
    if (data.board_id !== null) formData.append('board_id', data.board_id.toString());
    if (data.syllabus !== null) formData.append('syllabus', JSON.stringify(data.syllabus));
    formData.append('is_course', data.is_course.toString());
    if (data.cover_image) formData.append('cover_image', data.cover_image);
    if (data.price !== null && data.price !== undefined) formData.append('price', data.price.toString());
    if (data.currency_id !== null && data.currency_id !== undefined) formData.append('currency_id', data.currency_id.toString());

    const response = await api.post('/subjects', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  update: async (
    id: number,
    data: UpdateSubjectData
  ): Promise<{ success: boolean; data: Subject }> => {
    const formData = new FormData();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.class_id !== undefined) formData.append('class_id', data.class_id !== null ? data.class_id.toString() : '');
    if (data.board_id !== undefined) formData.append('board_id', data.board_id !== null ? data.board_id.toString() : '');
    if (data.syllabus !== undefined) formData.append('syllabus', JSON.stringify(data.syllabus));
    if (data.is_course !== undefined) formData.append('is_course', data.is_course.toString());
    if (data.cover_image !== undefined && data.cover_image) formData.append('cover_image', data.cover_image);
    if (data.price !== undefined) formData.append('price', data.price !== null ? data.price.toString() : '');
    if (data.currency_id !== undefined) formData.append('currency_id', data.currency_id !== null ? data.currency_id.toString() : '');

    const response = await api.put(`/subjects/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/subjects/${id}`);
  },
};

export const enrollmentService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    student_id?: number;
    subject_id?: number;
  }): Promise<PaginatedResponse<Enrollment>> => {
    const response = await api.get<PaginatedResponse<Enrollment>>('/enrollments', {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: Enrollment }> => {
    const response = await api.get(`/enrollments/${id}`);
    return response.data;
  },

  create: async (data: CreateEnrollmentData): Promise<{ success: boolean; data: Enrollment }> => {
    const response = await api.post('/enrollments', data);
    return response.data;
  },

  bulkCreate: async (data: BulkEnrollmentData): Promise<{ success: boolean; data: Enrollment[] }> => {
    const response = await api.post('/enrollments/bulk', data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/enrollments/${id}`);
  },
};

export const paymentService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    is_paid?: string;
    enrollment_id?: number;
    search?: string;
  }): Promise<PaginatedResponse<EnrollmentPayment>> => {
    const response = await api.get<PaginatedResponse<EnrollmentPayment>>('/payments', {
      params,
    });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: EnrollmentPayment }> => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  markAsPaid: async (id: number, paidDate?: string): Promise<{ success: boolean; data: EnrollmentPayment }> => {
    const response = await api.put(`/payments/${id}/mark-paid`, { paid_date: paidDate });
    return response.data;
  },

  getOverdue: async (): Promise<{ success: boolean; data: EnrollmentPayment[] }> => {
    const response = await api.get('/payments/overdue');
    return response.data;
  },
};

export const moduleService = {
  // Get all modules for a subject
  getModulesBySubject: async (subjectId: number): Promise<{ success: boolean; data: Module[] }> => {
    const response = await api.get(`/subjects/${subjectId}/modules`);
    // Backend returns { success, data: { modules: [...] } }
    const modules = response.data.data?.modules || [];
    return { success: response.data.success, data: modules };
  },

  // Get a specific module
  getModuleById: async (subjectId: number, moduleId: number): Promise<{ success: boolean; data: Module }> => {
    const response = await api.get(`/subjects/${subjectId}/modules/${moduleId}`);
    return response.data;
  },

  // Create a new module
  createModule: async (subjectId: number, data: CreateModuleData): Promise<{ success: boolean; data: Module }> => {
    const response = await api.post(`/subjects/${subjectId}/modules`, data);
    return response.data;
  },

  // Update a module
  updateModule: async (subjectId: number, moduleId: number, data: UpdateModuleData): Promise<{ success: boolean; data: Module }> => {
    const response = await api.put(`/subjects/${subjectId}/modules/${moduleId}`, data);
    return response.data;
  },

  // Delete a module
  deleteModule: async (subjectId: number, moduleId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/subjects/${subjectId}/modules/${moduleId}`);
    return response.data;
  },

  // Upload content files to a module
  uploadContent: async (subjectId: number, moduleId: number, files: FileList): Promise<{ success: boolean; data: ModuleContent[] }> => {
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    const response = await api.post(`/subjects/${subjectId}/modules/${moduleId}/content/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Add text content to a module
  addTextContent: async (subjectId: number, moduleId: number, data: AddTextContentData): Promise<{ success: boolean; data: ModuleContent }> => {
    const response = await api.post(`/subjects/${subjectId}/modules/${moduleId}/content/text`, data);
    return response.data;
  },

  // Update content
  updateContent: async (subjectId: number, moduleId: number, contentId: number, data: UpdateContentData): Promise<{ success: boolean; data: ModuleContent }> => {
    const response = await api.put(`/subjects/${subjectId}/modules/${moduleId}/content/${contentId}`, data);
    return response.data;
  },

  // Remove content from a module
  removeContent: async (subjectId: number, moduleId: number, contentId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/subjects/${subjectId}/modules/${moduleId}/content/${contentId}`);
    return response.data;
  },

  // Reorder modules
  reorderModules: async (subjectId: number, moduleOrders: { module_id: number; order: number }[]): Promise<{ success: boolean; data: Module[] }> => {
    const response = await api.put(`/subjects/${subjectId}/modules/reorder`, { module_orders: moduleOrders });
    return response.data;
  },
};

export const progressService = {
  // Get student's progress for a subject (Student self-service)
  getStudentProgress: async (_studentId: number, subjectId: number): Promise<{ success: boolean; data: StudentModuleProgress[] }> => {
    console.log('🔍 [FRONTEND] getStudentProgress called:', { _studentId, subjectId });
    // Use the student self-service endpoint
    const response = await api.get(`/my-progress/subjects/${subjectId}`);
    console.log('✅ [FRONTEND] getStudentProgress response:', response.data);
    return { success: response.data.success, data: response.data.data?.modules_progress || [] };
  },

  // Get all students' progress for a subject (for teachers)
  getSubjectProgress: async (subjectId: number): Promise<{ success: boolean; data: any }> => {
    const response = await api.get(`/progress/subjects/${subjectId}/stats`);
    // Backend returns { success, data: { subject_id, students: [...] } }
    return response.data;
  },

  // Update student's progress for a module (Student self-service)
  updateProgress: async (_studentId: number, subjectId: number, moduleId: number, data: UpdateProgressData): Promise<{ success: boolean; data: StudentModuleProgress }> => {
    console.log('🔍 [FRONTEND] updateProgress called:', { _studentId, subjectId, moduleId, data });
    debugger;
    const response = await api.put(`/my-progress/subjects/${subjectId}/modules/${moduleId}`, data);
    console.log('✅ [FRONTEND] updateProgress response:', response.data);
    return response.data;
  },

  // Get progress statistics for a subject
  getProgressStats: async (subjectId: number): Promise<{ success: boolean; data: { totalStudents: number; completedModules: { [moduleId: number]: number }; averageProgress: number } }> => {
    const response = await api.get(`/progress/subjects/${subjectId}/stats`);
    return response.data;
  },
};

export const testService = {
  // Get all tests
  getAll: async (params?: { subject_id?: number; is_published?: boolean }): Promise<{ success: boolean; data: Test[] }> => {
    const response = await api.get('/tests', { params });
    return response.data;
  },

  // Get test by ID
  getById: async (testId: number): Promise<{ success: boolean; data: Test }> => {
    const response = await api.get(`/tests/${testId}`);
    return response.data;
  },

  // Create test
  create: async (data: CreateTestData): Promise<{ success: boolean; data: Test }> => {
    const response = await api.post('/tests', data);
    return response.data;
  },

  // Update test
  update: async (testId: number, data: UpdateTestData): Promise<{ success: boolean; data: Test }> => {
    const response = await api.put(`/tests/${testId}`, data);
    return response.data;
  },

  // Delete test
  delete: async (testId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/tests/${testId}`);
    return response.data;
  },

  // Generate questions using AI
  generateQuestions: async (testId: number, data: GenerateQuestionsData): Promise<{ success: boolean; data: Question[] }> => {
    const response = await api.post(`/tests/${testId}/generate-questions`, data);
    return response.data;
  },

  // Add manual question
  addQuestion: async (testId: number, data: CreateQuestionData): Promise<{ success: boolean; data: Question }> => {
    const response = await api.post(`/tests/${testId}/questions`, data);
    return response.data;
  },

  // Add question with media upload
  addQuestionWithMedia: async (testId: number, formData: FormData): Promise<{ success: boolean; data: Question }> => {
    const response = await api.post(`/tests/${testId}/questions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update question
  updateQuestion: async (questionId: number, data: UpdateQuestionData): Promise<{ success: boolean; data: Question }> => {
    const response = await api.put(`/questions/${questionId}`, data);
    return response.data;
  },

  // Update question with media upload
  updateQuestionWithMedia: async (questionId: number, formData: FormData): Promise<{ success: boolean; data: Question }> => {
    const response = await api.put(`/questions/${questionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete question
  deleteQuestion: async (questionId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/questions/${questionId}`);
    return response.data;
  },
};

export const testAttemptService = {
  // Start test attempt
  startAttempt: async (testId: number): Promise<{ success: boolean; data: TestAttempt }> => {
    const response = await api.post(`/tests/${testId}/start`);
    return response.data;
  },

  // Start practice attempt (for closed/already-attempted tests)
  startPracticeAttempt: async (testId: number): Promise<{ success: boolean; data: TestAttempt }> => {
    const response = await api.post(`/tests/${testId}/practice`);
    return response.data;
  },

  // Submit answer
  submitAnswer: async (attemptId: number, data: SubmitAnswerData): Promise<{ success: boolean; data: Answer }> => {
    const response = await api.post(`/test-attempts/${attemptId}/answers`, data);
    return response.data;
  },

  // Submit answer with media upload
  submitAnswerWithMedia: async (attemptId: number, formData: FormData): Promise<{ success: boolean; data: Answer }> => {
    const response = await api.post(`/test-attempts/${attemptId}/answers`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Submit test
  submitTest: async (attemptId: number): Promise<{ success: boolean; data: TestAttempt }> => {
    const response = await api.post(`/test-attempts/${attemptId}/submit`);
    return response.data;
  },

  // Get test attempt
  getAttempt: async (attemptId: number): Promise<{ success: boolean; data: TestAttempt }> => {
    const response = await api.get(`/test-attempts/${attemptId}`);
    return response.data;
  },

  // Get all attempts for a test
  getTestAttempts: async (testId: number): Promise<{ success: boolean; data: TestAttempt[] }> => {
    const response = await api.get(`/tests/${testId}/attempts`);
    return response.data;
  },

  // Get my test attempts
  getMyAttempts: async (params?: { subject_id?: number; test_id?: number }): Promise<{ success: boolean; data: TestAttempt[] }> => {
    const response = await api.get('/my-test-attempts', { params });
    return response.data;
  },

  // Grade test attempt
  gradeAttempt: async (attemptId: number, data: GradeTestData): Promise<{ success: boolean; data: TestAttempt }> => {
    const response = await api.post(`/test-attempts/${attemptId}/grade`, data);
    return response.data;
  },
};

export const classSessionService = {
  // Get all class sessions
  getAll: async (params?: {
    page?: number;
    limit?: number;
    teacher_id?: number;
    subject_id?: number;
    class_id?: number;
    board_id?: number;
    mode?: 'ONLINE' | 'OFFLINE';
    start_date?: string;
    end_date?: string;
  }): Promise<PaginatedResponse<ClassSession>> => {
    const response = await api.get<PaginatedResponse<ClassSession>>('/class-sessions', { params });
    return response.data;
  },

  // Get session by ID
  getById: async (id: number): Promise<{ success: boolean; data: ClassSession }> => {
    const response = await api.get(`/class-sessions/${id}`);
    return response.data;
  },

  // Get upcoming sessions
  getUpcoming: async (params?: {
    teacher_id?: number;
    subject_id?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: ClassSession[] }> => {
    const response = await api.get('/class-sessions/upcoming', { params });
    return response.data;
  },

  // Get past sessions
  getPast: async (params?: {
    teacher_id?: number;
    subject_id?: number;
    limit?: number;
  }): Promise<{ success: boolean; data: ClassSession[] }> => {
    const response = await api.get('/class-sessions/past', { params });
    return response.data;
  },

  // Get my scheduled sessions (for students)
  getMySchedule: async (params?: {
    page?: number;
    limit?: number;
    upcoming_only?: boolean;
    subject_id?: number;
  }): Promise<PaginatedResponse<ClassSession>> => {
    const response = await api.get<PaginatedResponse<ClassSession>>('/class-sessions/my-schedule', { params });
    return response.data;
  },

  // Get today's sessions
  getToday: async (): Promise<{ success: boolean; data: ClassSession[] }> => {
    const response = await api.get('/class-sessions/today');
    return response.data;
  },

  // Get weekly schedule
  getWeeklySchedule: async (params?: {
    week_offset?: number;
  }): Promise<{ success: boolean; data: WeeklyScheduleResponse }> => {
    const response = await api.get('/class-sessions/weekly', { params });
    return response.data;
  },

  // Check if user can join session
  canJoin: async (id: number): Promise<{ success: boolean; data: CanJoinSessionResponse }> => {
    const response = await api.get(`/class-sessions/${id}/can-join`);
    return response.data;
  },

  // Create class session
  create: async (data: CreateClassSessionData): Promise<{ success: boolean; data: ClassSession }> => {
    const response = await api.post('/class-sessions', data);
    return response.data;
  },

  // Update class session
  update: async (id: number, data: UpdateClassSessionData): Promise<{ success: boolean; data: ClassSession }> => {
    const response = await api.put(`/class-sessions/${id}`, data);
    return response.data;
  },

  // Delete class session
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/class-sessions/${id}`);
    return response.data;
  },
};

export const chatService = {
  // Start a new chat
  startChat: async (data: StartChatData): Promise<{ success: boolean; data: Chat }> => {
    const response = await api.post('/chats', data);
    return response.data;
  },

  // Send a message
  sendMessage: async (chatId: number, data: SendMessageData, file?: File): Promise<{ success: boolean; data: Message }> => {
    const formData = new FormData();

    if (data.content) {
      formData.append('content', data.content);
    }

    if (data.messageType) {
      formData.append('messageType', data.messageType);
    }

    if (file) {
      formData.append('file', file);
    }

    const response = await api.post(`/chats/${chatId}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get chat messages
  getChatMessages: async (chatId: number, params?: { page?: number; limit?: number }): Promise<ChatMessagesResponse> => {
    const response = await api.get(`/chats/${chatId}/messages`, { params });
    return response.data;
  },

  // Get user chats
  getUserChats: async (): Promise<{ success: boolean; data: Chat[] }> => {
    const response = await api.get('/chats');
    return response.data;
  },

  // Get all chats (Admin only)
  getAllChats: async (): Promise<{ success: boolean; data: Chat[] }> => {
    const response = await api.get('/admin/chats');
    return response.data;
  },

};

// Location Service
export const locationService = {
  // Get all countries
  getCountries: async (): Promise<Country[]> => {
    const response = await api.get('/locations/countries');
    return response.data.data as Country[];
  },

  // Get all states in a country
  getStatesByCountry: async (countryId: number): Promise<State[]> => {
    const response = await api.get(`/locations/countries/${countryId}/states`);
    return response.data.data as State[];
  },

  // Get all cities in a state
  getCitiesByState: async (stateId: number): Promise<City[]> => {
    const response = await api.get(`/locations/states/${stateId}/cities`);
    return response.data.data as City[];
  },
};


// Currency Service
export const currencyService = {
  getAll: async (): Promise<Currency[]> => {
    const response = await api.get('/currencies');
    return response.data.data as Currency[];
  },
};


export const testSeriesService = {
  // Get all test series
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_published?: boolean;
  }): Promise<PaginatedResponse<TestSeries>> => {
    const response = await api.get<PaginatedResponse<TestSeries>>('/test-series', { params });
    return response.data;
  },

  // Get test series by ID
  getById: async (id: number): Promise<{ success: boolean; data: TestSeries }> => {
    const response = await api.get(`/test-series/${id}`);
    return response.data;
  },

  // Create test series
  create: async (data: {
    title: string;
    description?: string;
    cover_image?: string;
    price?: number;
    currency_id?: number | null;
    is_published?: boolean;
  }): Promise<{ success: boolean; data: TestSeries }> => {
    const response = await api.post('/test-series', data);
    return response.data;
  },

  // Update test series
  update: async (
    id: number,
    data: {
      title?: string;
      description?: string;
      cover_image?: string;
      price?: number;
      currency_id?: number | null;
      is_published?: boolean;
    }
  ): Promise<{ success: boolean; data: TestSeries }> => {
    const response = await api.put(`/test-series/${id}`, data);
    return response.data;
  },

  // Delete test series
  delete: async (id: number): Promise<void> => {
    await api.delete(`/test-series/${id}`);
  },

  // Enroll in test series (student enrolls self, or admin enrolls a student)
  enroll: async (id: number, studentId?: number): Promise<{ success: boolean; data: TestSeriesEnrollment }> => {
    const response = await api.post(`/test-series/${id}/enroll`, studentId ? { student_id: studentId } : {});
    return response.data;
  },

  // Unenroll from test series
  unenroll: async (id: number, studentId?: number): Promise<void> => {
    await api.delete(`/test-series/${id}/enroll`, { data: studentId ? { student_id: studentId } : {} });
  },

  // Get my enrolled test series (for students)
  getMyEnrollments: async (): Promise<{ success: boolean; data: TestSeries[] }> => {
    const response = await api.get('/test-series/my-enrollments');
    return response.data;
  },

  // Get enrollments for a test series (admin)
  getEnrollments: async (id: number): Promise<{ success: boolean; data: TestSeriesEnrollment[] }> => {
    const response = await api.get(`/test-series/${id}/enrollments`);
    return response.data;
  },

  // Assign teacher to test series
  assignTeacher: async (data: { test_series_id: number; teacher_id: number }): Promise<{ success: boolean; data: TestSeriesTeacherJunction }> => {
    const response = await api.post('/test-series/assign-teacher', data);
    return response.data;
  },

  // Remove teacher from test series
  removeTeacher: async (junctionId: number): Promise<void> => {
    await api.delete(`/test-series/remove-teacher/${junctionId}`);
  },

  // Get teachers by test series
  getTeachers: async (id: number): Promise<{ success: boolean; data: TestSeriesTeacherJunction[] }> => {
    const response = await api.get(`/test-series/${id}/teachers`);
    return response.data;
  },
};

export const activityGroupService = {
  // Get all activity groups
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<{ success: boolean; message: string; data: { activityGroups: ActivityGroup[]; pagination: any } }> => {
    const response = await api.get('/activity-groups', { params });
    return response.data;
  },

  // Get activity group by ID
  getById: async (id: number): Promise<{ success: boolean; data: ActivityGroup }> => {
    const response = await api.get(`/activity-groups/${id}`);
    return response.data;
  },

  // Create activity group
  create: async (data: {
    name: string;
    description?: string;
    cover_image?: string;
    price?: number | null;
    currency_id?: number | null;
  }): Promise<{ success: boolean; data: ActivityGroup }> => {
    const response = await api.post('/activity-groups', data);
    return response.data;
  },

  // Update activity group
  update: async (
    id: number,
    data: {
      name?: string;
      description?: string;
      cover_image?: string;
      is_active?: boolean;
      price?: number | null;
      currency_id?: number | null;
    }
  ): Promise<{ success: boolean; data: ActivityGroup }> => {
    const response = await api.put(`/activity-groups/${id}`, data);
    return response.data;
  },

  // Delete activity group
  delete: async (id: number): Promise<void> => {
    await api.delete(`/activity-groups/${id}`);
  },

  // Assign teacher to activity group
  assignTeacher: async (data: { activity_group_id: number; teacher_id: number }): Promise<{ success: boolean; data: ActivityGroupTeacherJunction }> => {
    const response = await api.post('/activity-groups/assign-teacher', data);
    return response.data;
  },

  // Remove teacher from activity group
  removeTeacher: async (junctionId: number): Promise<void> => {
    await api.delete(`/activity-groups/remove-teacher/${junctionId}`);
  },

  // Get teachers by activity group
  getTeachers: async (id: number): Promise<{ success: boolean; data: ActivityGroupTeacherJunction[] }> => {
    const response = await api.get(`/activity-groups/${id}/teachers`);
    return response.data;
  },
};

// Home service - Get all items for student home page
export const homeService = {
  getItems: async (): Promise<{ data: any[]; total: number }> => {
    const response = await api.get('/home/items');
    return response.data;
  },
};

// Enquiry service - Manage student enquiries
export const enquiryService = {
  create: async (data: {
    item_type: 'COURSE' | 'SUBJECT' | 'ACTIVITY_GROUP' | 'TEST_SERIES';
    item_id: number;
    student_name: string;
    student_email: string;
    student_phone: string;
    message?: string;
  }): Promise<{ message: string; data: any }> => {
    const response = await api.post('/enquiries', data);
    return response.data;
  },

  getAll: async (params?: {
    status?: 'PENDING' | 'CONTACTED' | 'RESOLVED';
    item_type?: 'COURSE' | 'SUBJECT' | 'ACTIVITY_GROUP' | 'TEST_SERIES';
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; pagination: any }> => {
    const response = await api.get('/enquiries', { params });
    return response.data;
  },

  updateStatus: async (id: number, status: 'PENDING' | 'CONTACTED' | 'RESOLVED'): Promise<{ message: string; data: any }> => {
    const response = await api.patch(`/enquiries/${id}/status`, { status });
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/enquiries/${id}`);
    return response.data;
  },
};

export const analyticsService = {
  // Student: Get my analytics
  getMyAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/my-analytics');
    return response.data;
  },

  // Teacher: Get students analytics
  getTeacherStudentsAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/teacher/students');
    return response.data;
  },

  // Teacher: Get subject analytics
  getTeacherSubjectAnalytics: async (subjectId: string): Promise<any> => {
    const response = await api.get(`/analytics/teacher/subject/${subjectId}`);
    return response.data;
  },

  // Admin: Get analytics
  getAdminStudentsAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/admin/students');
    return response.data;
  },

  getAdminTeachersAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/admin/teachers');
    return response.data;
  },

  getAdminBusinessAnalytics: async (): Promise<any> => {
    const response = await api.get('/analytics/admin/business');
    return response.data;
  },
};

export default api;