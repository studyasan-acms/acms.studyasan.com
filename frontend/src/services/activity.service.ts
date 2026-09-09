import api from './api';
import type {
  ActivityGroup,
  Activity,
  ActivityEnrollment,
  ActivityAttempt,
  CreateActivityGroupInput,
  CreateActivityInput,
  ActivityGroupTeacherJunction,
} from '../types/activity';

// Activity Group APIs
export const activityGroupAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    is_active?: boolean;
    status?: string;
    search?: string;
    sort?: string;
  }) =>
    api.get<{
      data: {
        activityGroups: ActivityGroup[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
        stats?: {
          total: number;
          active: number;
          inactive: number;
        };
      };
    }>('/activity-groups', { params }),

  getById: (id: number) => api.get<{ data: ActivityGroup }>(`/activity-groups/${id}`),

  create: (data: CreateActivityGroupInput) =>
    api.post<{ data: ActivityGroup }>('/activity-groups', data),

  update: (id: number, data: Partial<CreateActivityGroupInput>) =>
    api.put<{ data: ActivityGroup }>(`/activity-groups/${id}`, data),

  delete: (id: number) => api.delete(`/activity-groups/${id}`),

  assignTeacher: (data: { activity_group_id: number; teacher_id: number }) =>
    api.post('/activity-groups/assign-teacher', data),

  removeTeacher: (junctionId: number) =>
    api.delete(`/activity-groups/remove-teacher/${junctionId}`),

  getTeachers: (groupId: number) =>
    api.get<{ data: ActivityGroupTeacherJunction[] }>(`/activity-groups/${groupId}/teachers`),
};

// Activity APIs
export const activityAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    group_id?: number;
    activity_type?: string;
    difficulty?: string;
    is_published?: boolean;
  }) =>
    api.get<{
      data: {
        activities: Activity[];
        pagination: any;
      };
    }>('/activities', { params }),

  getById: (id: number) => api.get<{ data: Activity }>(`/activities/${id}`),

  getForStudent: (params?: {
    page?: number;
    limit?: number;
    activity_type?: string;
    difficulty?: string;
    group_id?: number;
  }) =>
    api.get<{
      data: {
        activities: Activity[];
        activityGroups?: ActivityGroup[];
        pagination: any;
      };
    }>('/activities/student/available', { params }),

  create: (data: CreateActivityInput) => api.post<{ data: Activity }>('/activities', data),

  update: (id: number, data: Partial<CreateActivityInput>) =>
    api.put<{ data: Activity }>(`/activities/${id}`, data),

  delete: (id: number) => api.delete(`/activities/${id}`),

  togglePublish: (id: number, is_published: boolean) =>
    api.patch<{ data: Activity }>(`/activities/${id}/publish`, { is_published }),

  generateContent: (data: {
    activity_type: string;
    topic: string;
    difficulty: string;
    count?: number;
  }) => api.post<{ data: { items: any[] } }>('/activities/generate-content', data),
};

// Activity Enrollment APIs
export const activityEnrollmentAPI = {
  enroll: (activity_id: number, student_id: number) =>
    api.post<ActivityEnrollment>('/activity-enrollments', {
      activity_id,
      student_id,
    }),

  bulkEnroll: (activity_id: number, student_ids: number[]) =>
    api.post('/activity-enrollments/bulk', { activity_id, student_ids }),

  enrollToGroup: (group_id: number, student_ids: number[]) =>
    api.post('/activity-enrollments/group', { group_id, student_ids }),

  getGroupEnrollments: (groupId: number) =>
    api.get<{ data: number[] }>(`/activity-groups/${groupId}/enrollments`),

  unenrollFromGroup: (groupId: number, student_id: number) =>
    api.delete(`/activity-groups/${groupId}/enrollments`, { data: { student_id } }),

  getByActivity: (activityId: number, params?: { page?: number; limit?: number }) =>
    api.get<{
      enrollments: ActivityEnrollment[];
      pagination: any;
    }>(`/activities/${activityId}/enrollments`, { params }),

  getMyEnrollments: () =>
    api.get<ActivityEnrollment[]>('/activity-enrollments/my-enrollments'),

  unenroll: (id: number) => api.delete(`/activity-enrollments/${id}`),
};

// Activity Attempt APIs
export const activityAttemptAPI = {
  start: (activity_id: number, quiz_session_id?: number) =>
    api.post<{ data: ActivityAttempt }>('/activity-attempts/start', { activity_id, quiz_session_id }),

  submitResponse: (data: {
    attempt_id: number;
    item_id: number;
    response: any;
    is_correct?: boolean;
    time_taken?: number;
  }) => api.post('/activity-attempts/response', data),

  complete: (id: number, time_taken: number, score?: number) =>
    api.patch<{ data: ActivityAttempt }>(`/activity-attempts/${id}/complete`, {
      time_taken,
      score,
    }),

  getById: (id: number) => api.get<{ data: ActivityAttempt }>(`/activity-attempts/${id}`),

  getMyAttempts: (params?: { activity_id?: number; is_completed?: boolean }) =>
    api.get<{ data: ActivityAttempt[] }>('/activity-attempts/my-attempts', { params }),

  getByActivity: (
    activityId: number,
    params?: { page?: number; limit?: number; is_completed?: boolean }
  ) =>
    api.get<{
      data: {
        attempts: ActivityAttempt[];
        pagination: any;
      };
    }>(`/activities/${activityId}/attempts`, { params }),

  getLeaderboard: (activityId: number, limit?: number) =>
    api.get<{ data: ActivityAttempt[] }>(`/activities/${activityId}/leaderboard`, {
      params: { limit },
    }),
};

// Quiz Session APIs
export const quizSessionAPI = {
  create: (activity_id: number) =>
    api.post<{ data: any }>('/quiz-sessions', { activity_id }),

  join: (join_code: string) =>
    api.post<{ data: any }>('/quiz-sessions/join', { join_code }),

  start: (id: number) =>
    api.post<{ data: any }>(`/quiz-sessions/${id}/start`),

  nextQuestion: (id: number) =>
    api.post<{ data: any }>(`/quiz-sessions/${id}/next`),

  end: (id: number) =>
    api.post<{ data: any }>(`/quiz-sessions/${id}/end`),
};
