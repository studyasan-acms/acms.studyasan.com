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
  TeacherRole,
  Subject,
  CreateTeacherData,
  UpdateTeacherData,
  CreateSubjectData,
  UpdateSubjectData,
  TeacherSubjectAssignment,
  Enrollment,
  EnrollmentPayment,
  CreateEnrollmentData,
  UpdateEnrollmentData,
  BulkEnrollmentData,
  Invoice,
  InvoiceItem,
  InvoicesResponse,
  CreateInvoiceData,
  UpdateInvoiceData,
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
  MessageType,
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
  ActivityGroupEnrollment,
  SavedWhiteboard,
  CreateWhiteboardData,
  UpdateWhiteboardData,
  WhiteboardsResponse,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    // Don't redirect on 401 for auth endpoints (login/register/verify)
    const isAuthEndpoint = error.config?.url?.includes('/auth/');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired or invalid - clear auth and redirect to login
      // Only redirect if not already on login page to prevent loops
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage'); // Clear Zustand persisted state
        window.location.href = '/login';
      }
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

  /**
   * Verify token validity on app startup
   * Validates stored JWT token before rendering dashboard
   * Prevents flickering by catching expired tokens early
   */
  verifyToken: async (): Promise<{ user: any }> => {
    const response = await api.get<{ user: any }>('/auth/verify');
    return response.data;
  },

  // OTP-based registration methods
  requestOtp: async (data: RegisterData): Promise<{ success: boolean; data: { email: string }; message: string }> => {
    const response = await api.post('/auth/request-otp', data);
    return response.data;
  },

  verifyOtp: async (data: { email: string; otp: string }): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/verify-otp', data);
    return response.data;
  },

  resendOtp: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  checkPasswordStrength: async (password: string): Promise<{
    success: boolean;
    data: {
      isValid: boolean;
      score: number;
      errors: string[];
      suggestions: string[]
    }
  }> => {
    const response = await api.post('/auth/check-password-strength', { password });
    return response.data;
  },

  // Password reset methods
  requestPasswordReset: async (email: string): Promise<{ success: boolean; data: { email: string }; message: string }> => {
    const response = await api.post('/auth/request-password-reset', { email });
    return response.data;
  },

  verifyPasswordResetOtp: async (data: { email: string; otp: string }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/verify-password-reset-otp', data);
    return response.data;
  },

  resetPassword: async (data: { email: string; otp: string; newPassword: string }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
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

  create: async (data: CreateStudentData | FormData): Promise<{ success: boolean; data: Student }> => {
    // Send all data to backend endpoint - no longer need to create user separately
    if (data instanceof FormData) {
      // Create student with FormData (backend handles user creation in transaction)
      const studentResponse = await api.post('/students', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return studentResponse.data;
    } else {
      // Create student (backend handles user creation in transaction)
      const studentResponse = await api.post('/students', data);
      return studentResponse.data;
    }
  },

  update: async (
    id: number,
    data: UpdateStudentData | FormData
  ): Promise<{ success: boolean; data: Student }> => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await api.put(`/students/${id}`, data, { headers });
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
    sort?: string;
    order?: 'asc' | 'desc';
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
    sort?: string;
    order?: 'asc' | 'desc';
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
    user_id?: number;
    role?: string;
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

  create: async (data: CreateTeacherData | FormData): Promise<{ success: boolean; data: Teacher }> => {
    // Send all data to backend endpoint - no longer need to create user separately
    if (data instanceof FormData) {
      // Create teacher with FormData (backend handles user creation in transaction)
      const teacherResponse = await api.post('/teachers', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return teacherResponse.data;
    } else {
      // Create teacher (backend handles user creation in transaction)
      const teacherResponse = await api.post('/teachers', data);
      return teacherResponse.data;
    }
  },

  update: async (
    id: number,
    data: UpdateTeacherData | FormData
  ): Promise<{ success: boolean; data: Teacher }> => {
    if (data instanceof FormData) {
      const response = await api.put(`/teachers/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } else {
      const payload: any = { ...data };
      // if address is present, send nested address object
      if (data.address) payload.address = data.address;

      const response = await api.put(`/teachers/${id}`, payload);
      return response.data;
    }
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

export const teacherRoleService = {
  getAll: async (): Promise<{ success: boolean; data: { roles: any[] } }> => {
    const response = await api.get('/teacher-roles');
    return response.data;
  },
  getById: async (id: number): Promise<{ success: boolean; data: { role: any } }> => {
    const response = await api.get(`/teacher-roles/${id}`);
    return response.data;
  },
  create: async (data: { name: string; description?: string; permissions: Record<string, any> }): Promise<{ success: boolean; data: any; message?: string }> => {
    const response = await api.post('/teacher-roles', data);
    return response.data;
  },
  update: async (id: number, data: { name?: string; description?: string; permissions?: Record<string, any>; is_active?: boolean }): Promise<{ success: boolean; data: any; message?: string }> => {
    const response = await api.put(`/teacher-roles/${id}`, data);
    return response.data;
  },
  delete: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete(`/teacher-roles/${id}`);
    return response.data;
  },
  assignRole: async (teacherId: number, roleId: number | null): Promise<{ success: boolean; data: any; message?: string }> => {
    const response = await api.post('/teacher-roles/assign', { teacher_id: teacherId, role_id: roleId });
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
    user_id?: number;
    role?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    letter?: string;
  }): Promise<PaginatedResponse<Subject>> => {
    const response = await api.get<PaginatedResponse<Subject>>('/subjects', {
      params: { limit: 1000, ...params },
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
    if (data.end_date !== null && data.end_date !== undefined) formData.append('end_date', data.end_date);
    if (data.cover_image) formData.append('cover_image', data.cover_image);
    if (data.price !== null && data.price !== undefined) formData.append('price', data.price.toString());
    if (data.actual_price !== null && data.actual_price !== undefined) formData.append('actual_price', data.actual_price.toString());
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
    if (data.end_date !== undefined) formData.append('end_date', data.end_date ?? '');
    if (data.cover_image !== undefined && data.cover_image) formData.append('cover_image', data.cover_image);
    if (data.price !== undefined) formData.append('price', data.price !== null ? data.price.toString() : '');
    if (data.actual_price !== undefined) formData.append('actual_price', data.actual_price !== null ? data.actual_price.toString() : '');
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
    test_series_id?: number;
    activity_group_id?: number;
    type?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ success: boolean; data: { data: Enrollment[]; pagination: { page: number; limit: number; total: number; totalPages: number } } }> => {
    const response = await api.get('/enrollments', { params });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: Enrollment }> => {
    const response = await api.get(`/enrollments/${id}`);
    return response.data;
  },

  getByStudentId: async (studentId: number): Promise<{ success: boolean; data: Enrollment[] }> => {
    const response = await api.get(`/enrollments/student/${studentId}`);
    return response.data;
  },

  create: async (data: CreateEnrollmentData): Promise<{ success: boolean; data: { enrollments: Enrollment[]; invoice: any; skipped: string[] }; message?: string }> => {
    const response = await api.post('/enrollments', data);
    return response.data;
  },

  update: async (id: number, data: UpdateEnrollmentData): Promise<{ success: boolean; data: Enrollment; message?: string }> => {
    const response = await api.put(`/enrollments/${id}`, data);
    return response.data;
  },

  generateInvoice: async (data: {
    enrollment_ids: number[];
    due_date?: string;
    invoice_date?: string;
    notes?: string;
    send_email?: boolean;
  }): Promise<{ success: boolean; data: any; message?: string }> => {
    const response = await api.post('/enrollments/generate-invoice', data);
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
    status?: string;
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

  update: async (id: number, data: { amount?: number; due_date?: string; is_paid?: boolean; paid_date?: string | null }): Promise<{ success: boolean; data: EnrollmentPayment }> => {
    const response = await api.put(`/payments/${id}`, data);
    return response.data;
  },

  markAsPaid: async (id: number, paidDate?: string): Promise<{ success: boolean; data: EnrollmentPayment }> => {
    const response = await api.put(`/payments/${id}/mark-paid`, { paid_date: paidDate });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/payments/${id}`);
  },

  getOverdue: async (): Promise<{ success: boolean; data: EnrollmentPayment[] }> => {
    const response = await api.get('/payments/overdue');
    return response.data;
  },
};

export const invoiceService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    student_id?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ success: boolean; data: InvoicesResponse }> => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getById: async (id: number | string): Promise<{ success: boolean; data: Invoice }> => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  create: async (data: CreateInvoiceData): Promise<{ success: boolean; data: Invoice; message?: string }> => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  update: async (id: number, data: UpdateInvoiceData): Promise<{ success: boolean; data: Invoice; message?: string }> => {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data;
  },

  markStatus: async (
    id: number,
    data: { status: 'PAID' | 'PENDING'; paid_date?: string; payment_method?: string }
  ): Promise<{ success: boolean; data: Invoice; message?: string }> => {
    const response = await api.patch(`/invoices/${id}/status`, data);
    return response.data;
  },

  sendEmail: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post(`/invoices/${id}/send-email`);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const response = await api.delete(`/invoices/${id}`);
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

  // Get public test by ID
  getPublicById: async (testId: number): Promise<{ success: boolean; data: Test }> => {
    const response = await api.get(`/public/tests/${testId}`);
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

  // Duplicate test
  duplicate: async (testId: number): Promise<{ success: boolean; data: Test }> => {
    const response = await api.post(`/tests/${testId}/duplicate`);
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

  // Public Certification Methods
  startPublicAttempt: async (testId: number, data: { candidateName: string; candidateEmail?: string }): Promise<{ success: boolean; data: { attempt: TestAttempt; candidateName: string } }> => {
    const response = await api.post(`/public/tests/${testId}/start`, data);
    return response.data;
  },

  submitPublicTest: async (attemptId: number, data: { answers: any[]; candidateName: string }): Promise<{ success: boolean; data: any }> => {
    const response = await api.post(`/public/test-attempts/${attemptId}/submit`, data);
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
    search?: string;
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
    search?: string;
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

export const attendanceService = {
  markJoinTime: async (classSessionId: number) => {
    const response = await api.post('/attendances/join', { class_session_id: classSessionId });
    return response.data;
  },
  markLeaveTime: async (classSessionId: number) => {
    const response = await api.post('/attendances/leave', { class_session_id: classSessionId });
    return response.data;
  },
  getBySession: async (sessionId: number) => {
    const response = await api.get(`/attendances/session/${sessionId}`);
    return response.data;
  },
};

export const chatService = {
  // Start a new chat
  startChat: async (data: StartChatData): Promise<{ success: boolean; data: Chat }> => {
    const response = await api.post('/chats', data);
    return response.data;
  },

  // Upload attachment(s) immediately before sending
  uploadAttachment: async (
    files: File | File[]
  ): Promise<{
    success: boolean;
    data: {
      attachments: Array<{
        originalName: string;
        filename: string;
        url: string;
        key: string;
        size: number;
        messageType: MessageType;
      }>;
    };
  }> => {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((f) => formData.append('files', f));
    } else {
      formData.append('files', files);
    }
    const response = await api.post('/chats/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Send a message (with optional single/multiple file uploads or pre-uploaded attachment URLs)
  sendMessage: async (
    chatId: number,
    data: SendMessageData,
    file?: File | File[] | null
  ): Promise<{ success: boolean; data: Message | Message[] }> => {
    const formData = new FormData();

    if (data.content) {
      formData.append('content', data.content);
    }

    if (data.messageType) {
      formData.append('messageType', data.messageType);
    }

    if (data.attachments && data.attachments.length > 0) {
      formData.append('attachments', JSON.stringify(data.attachments));
    }

    if (file) {
      if (Array.isArray(file)) {
        file.forEach((f) => {
          formData.append('files', f);
        });
      } else {
        formData.append('file', file);
        formData.append('files', file);
      }
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

  // Delete a message in a chat
  deleteMessage: async (chatId: number, messageId: number): Promise<{ success: boolean; message: string; data: { messageId: number; chatId: number } }> => {
    const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
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

  // Enroll in test series
  enroll: async (id: number, data: { student_id?: number; price?: number | null; is_recurring?: boolean; frequency?: string | null; end_date?: string | null; one_time_amount?: number | null }): Promise<{ success: boolean; data: TestSeriesEnrollment }> => {
    const response = await api.post(`/test-series/${id}/enroll`, data);
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

  // Enroll in activity group
  enroll: async (id: number, data: { student_id?: number; price?: number | null; is_recurring?: boolean; frequency?: string | null; end_date?: string | null; one_time_amount?: number | null }): Promise<{ success: boolean; data: ActivityGroupEnrollment }> => {
    const response = await api.post(`/activity-groups/${id}/enroll`, data);
    return response.data;
  },

  // Unenroll from activity group
  unenroll: async (id: number, studentId?: number): Promise<void> => {
    await api.delete(`/activity-groups/${id}/enroll`, { data: studentId ? { student_id: studentId } : {} });
  },

  // Get enrollments for an activity group (admin)
  getEnrollments: async (id: number): Promise<{ success: boolean; data: ActivityGroupEnrollment[] }> => {
    const response = await api.get(`/activity-groups/${id}/enrollments`);
    return response.data;
  },
};

// Home service - Get all items for student home page
export const homeService = {
  getItems: async (): Promise<{ data: any[]; total: number }> => {
    const response = await api.get('/home/items');
    return response.data;
  },
  
  getPerformance: async (): Promise<{
    daily: { label: string; score: number; total: number }[];
    weekly: { label: string; score: number; total: number }[];
    monthly: { label: string; score: number; total: number }[];
  }> => {
    const response = await api.get('/analytics/performance');
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
    coupon_code?: string;
    discount_type?: 'PERCENTAGE' | 'FLAT';
    discount_value?: number;
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

export const couponService = {
  getAll: async (params?: { is_active?: boolean }): Promise<{ data: any[] }> => {
    const response = await api.get('/coupons', { params });
    return response.data;
  },

  getById: async (id: number): Promise<{ data: any }> => {
    const response = await api.get(`/coupons/${id}`);
    return response.data;
  },

  create: async (data: {
    code: string;
    discount_type: 'PERCENTAGE' | 'FLAT';
    discount_value: number;
    is_active?: boolean;
    valid_from?: string | null;
    valid_until?: string | null;
    max_uses?: number | null;
  }): Promise<{ message: string; data: any }> => {
    const response = await api.post('/coupons', data);
    return response.data;
  },

  update: async (
    id: number,
    data: {
      code?: string;
      discount_type?: 'PERCENTAGE' | 'FLAT';
      discount_value?: number;
      is_active?: boolean;
      valid_from?: string | null;
      valid_until?: string | null;
      max_uses?: number | null;
    }
  ): Promise<{ message: string; data: any }> => {
    const response = await api.put(`/coupons/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/coupons/${id}`);
    return response.data;
  },
};

export const profileService = {
  getProfile: async (): Promise<{ success: boolean; data: any }> => {
    const response = await api.get('/profile');
    return response.data;
  },
  updateProfile: async (data: any | FormData): Promise<{ success: boolean; data: any }> => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response = await api.put('/profile', data, { headers });
    return response.data;
  },
  updateStudentDetails: async (data: any): Promise<{ success: boolean; data: any }> => {
    const response = await api.put('/profile/student', data);
    return response.data;
  },
  updateTeacherDetails: async (data: any): Promise<{ success: boolean; data: any }> => {
    const response = await api.put('/profile/teacher', data);
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

export const deletionService = {
  // Request account deletion (Students/Teachers)
  requestDeletion: async (): Promise<any> => {
    const response = await api.post('/account/request-deletion');
    return response.data;
  },

  // Cancel deletion request (Students/Teachers)
  cancelDeletion: async (): Promise<any> => {
    const response = await api.post('/account/cancel-deletion');
    return response.data;
  },

  // Get all deletion requests (Admin only)
  getDeletionRequests: async (): Promise<any> => {
    const response = await api.get('/admin/deletion-requests');
    return response.data;
  },

  // Verify/approve deletion (Admin only)
  verifyDeletion: async (userId: number): Promise<any> => {
    const response = await api.post(`/admin/verify-deletion/${userId}`);
    return response.data;
  },

  // Delete user account (Admin only)
  deleteUserAccount: async (userId: number): Promise<any> => {
    const response = await api.delete(`/admin/delete-user/${userId}`);
    return response.data;
  },
};

export const idCardService = {
  sendEmail: async (data: { userId: string | number; userType: 'STUDENT' | 'TEACHER'; imageData: string }): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/id-cards/send-email', data);
    return response.data;
  },
};

export const uploadService = {
  /**
   * Upload a single file to S3 via the backend.
   * @param file - The File object to upload
   * @param folder - Optional S3 folder name (default: 'uploads')
   * @returns The public S3 URL of the uploaded file
   */
  uploadFile: async (file: File, folder: string = 'uploads'): Promise<{ url: string; key: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/upload?folder=${encodeURIComponent(folder)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};

// ================== JOB/INTERNSHIP SERVICE ==================
export const jobService = {
  // Get all jobs (with filters)
  getAllJobs: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: 'JOB' | 'INTERNSHIP';
    status?: 'OPEN' | 'CLOSED';
  }) => {
    const response = await api.get('/jobs', { params });
    return response.data;
  },

  // Get job by ID
  getJobById: async (id: number) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  // Create job (Admin)
  createJob: async (data: any) => {
    const response = await api.post('/jobs', data);
    return response.data;
  },

  // Update job (Admin)
  updateJob: async (id: number, data: any) => {
    const response = await api.put(`/jobs/${id}`, data);
    return response.data;
  },

  // Delete job (Admin)
  deleteJob: async (id: number) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },

  // Apply for job (Student)
  applyForJob: async (jobId: number, coverLetter: string, cvFile: File) => {
    const formData = new FormData();
    formData.append('job_id', jobId.toString());
    formData.append('cover_letter', coverLetter);
    formData.append('cv', cvFile);

    const response = await api.post('/jobs/apply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get my applications (Student)
  getMyApplications: async (params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
  }) => {
    const response = await api.get('/jobs/applications/my', { params });
    return response.data;
  },

  // Withdraw application (Student)
  withdrawApplication: async (id: number) => {
    const response = await api.delete(`/jobs/applications/${id}`);
    return response.data;
  },

  // Get all applications (Admin)
  getAllApplications: async (params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
    job_id?: number;
  }) => {
    const response = await api.get('/jobs/applications/all', { params });
    return response.data;
  },

  // Get applications for a specific job (Admin)
  getJobApplications: async (jobId: number, params?: {
    page?: number;
    limit?: number;
    status?: 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
  }) => {
    const response = await api.get(`/jobs/${jobId}/applications`, { params });
    return response.data;
  },

  // Get application by ID (Admin)
  getApplicationById: async (id: number) => {
    const response = await api.get(`/jobs/applications/${id}`);
    return response.data;
  },

  // Review application (Admin)
  reviewApplication: async (id: number, status: 'REVIEWED' | 'ACCEPTED' | 'REJECTED', feedback?: string) => {
    const response = await api.patch(`/jobs/applications/${id}/review`, { status, feedback });
    return response.data;
  },
};

export const announcementService = {
  getAnnouncements: async () => {
    const response = await api.get('/announcements');
    return response.data;
  },
  createAnnouncement: async (data: any) => {
    const response = await api.post('/announcements', data);
    return response.data;
  },
  updateAnnouncement: async (id: number, data: any) => {
    const response = await api.put(`/announcements/${id}`, data);
    return response.data;
  },
  deleteAnnouncement: async (id: number) => {
    const response = await api.delete(`/announcements/${id}`);
    return response.data;
  }
};

export const knowYourChildService = {
  getStudentReports: async (
    studentId: number,
    params?: {
      page?: number;
      limit?: number;
      subject_id?: number;
      month?: string;
      week_start_date?: string;
      feedback_status?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<any>> => {
    const response = await api.get<PaginatedResponse<any>>(`/know-your-child/student/${studentId}`, { params });
    return response.data;
  },
  createReport: async (data: {
    student_id: number;
    subject_id?: number;
    month: string;
    week_start_date: string;
    week_end_date: string;
    ratings: any[];
    teacher_comment?: string;
  }): Promise<{ success: boolean; data: any }> => {
    const response = await api.post('/know-your-child', data);
    return response.data;
  },
  addParentFeedback: async (id: number, parent_feedback: string): Promise<{ success: boolean; data: any }> => {
    const response = await api.patch(`/know-your-child/${id}/feedback`, { parent_feedback });
    return response.data;
  },
  deleteReport: async (id: number): Promise<{ success: boolean; data: any }> => {
    const response = await api.delete(`/know-your-child/${id}`);
    return response.data;
  },
};

export const brainQuestService = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    subject_id?: number;
    search?: string;
  }): Promise<PaginatedResponse<any>> => {
    const response = await api.get<PaginatedResponse<any>>('/brain-quest', { params });
    return response.data;
  },
  getById: async (id: number): Promise<{ success: boolean; data: any }> => {
    const response = await api.get(`/brain-quest/${id}`);
    return response.data;
  },
  create: async (formData: FormData): Promise<{ success: boolean; data: any }> => {
    const response = await api.post('/brain-quest', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  update: async (id: number, formData: FormData): Promise<{ success: boolean; data: any }> => {
    const response = await api.put(`/brain-quest/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  delete: async (id: number): Promise<{ success: boolean; data: any }> => {
    const response = await api.delete(`/brain-quest/${id}`);
    return response.data;
  },
  submitAnswer: async (id: number, formData: FormData): Promise<{ success: boolean; data: any }> => {
    const response = await api.post(`/brain-quest/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  gradeSubmission: async (submissionId: number, data: { marks_obtained?: number; feedback?: string }): Promise<{ success: boolean; data: any }> => {
    const response = await api.post(`/brain-quest/submission/${submissionId}/grade`, data);
    return response.data;
  },
};

// ================== WHITEBOARD SERVICE ==================
export const whiteboardService = {
  getAll: async (params?: {
    subject_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<WhiteboardsResponse> => {
    const response = await api.get<WhiteboardsResponse>('/whiteboards', { params });
    return response.data;
  },

  getById: async (id: number): Promise<{ success: boolean; data: SavedWhiteboard; message: string }> => {
    const response = await api.get<{ success: boolean; data: SavedWhiteboard; message: string }>(`/whiteboards/${id}`);
    return response.data;
  },

  create: async (data: CreateWhiteboardData): Promise<{ success: boolean; data: SavedWhiteboard; message: string }> => {
    const response = await api.post<{ success: boolean; data: SavedWhiteboard; message: string }>('/whiteboards', data);
    return response.data;
  },

  update: async (id: number, data: UpdateWhiteboardData): Promise<{ success: boolean; data: SavedWhiteboard; message: string }> => {
    const response = await api.put<{ success: boolean; data: SavedWhiteboard; message: string }>(`/whiteboards/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete<{ success: boolean; message: string }>(`/whiteboards/${id}`);
    return response.data;
  },
};

export default api;
export { api as apiService };



