// ================== USER & AUTH ==================
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_url?: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  created_at: string;
  updated_at: string;
  student?: {
    id: number;
    class_id: number | null;
    board_id: number | null;
    class?: { id: number; name: string } | null;
    board?: { id: number; name: string } | null;
  } | null;
  teacher?: {
    id: number;
    role_id: number | null;
  } | null;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
}

// ================== NOTIFICATIONS ==================
export interface Notification {
  id: number;
  user_id: number;
  type: 'INFO' | 'WARNING' | 'SUCCESS';
  title: string;
  description: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// ================== PAGINATION & ERRORS ==================
export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: any;
}

// ================== LOCATION TYPES ==================
export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface State {
  id: number;
  name: string;
  countryId?: number;
}

export interface City {
  id: number;
  name: string;
  stateId?: number;
}

export type BloodGroup =
  | 'A_POS'
  | 'A_NEG'
  | 'B_POS'
  | 'B_NEG'
  | 'AB_POS'
  | 'AB_NEG'
  | 'O_POS'
  | 'O_NEG';

// ================== STUDENT TYPES ==================
export interface Student {
  id: number;
  user_id: number;
  class_id: number | null;
  board_id: number | null;
  id_valid_through?: string | null;
  date_of_birth: string | null;
  gender: 'M' | 'F' | 'OTHER' | null;
  school: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    profile_url?: string;
  };
  class: { id: number; name: string } | null;
  board: { id: number; name: string } | null;
  enrollments?: Enrollment[];
  activity_enrollments?: Array<{
    id: number;
    activity: {
      id: number;
      group: { id: number; name: string };
    };
  }>;
  address?: {
    id: number;
    addressLine: string;
    postalCode?: string | null;
    country: { id: number; name: string };
    state: { id: number; name: string };
    city: { id: number; name: string };
  };
  _count?: {
    enrollments: number;
    activity_enrollments: number;
  };
  blood_group?: BloodGroup | null;
}


// ================== CREATE & UPDATE STUDENT ==================
export interface CreateStudentData {
  name: string;
  email: string;
  phone: string;
  password: string;

  class_id: number | null;
  board_id: number | null;
  id_valid_through?: string | null;

  date_of_birth: string | null;
  gender: 'M' | 'F' | 'OTHER' | null;
  school: string | null;
  blood_group?: BloodGroup | null;

  addressLine: string;
  countryId: number;
  stateId: number;
  cityId: number;
  postalCode: string;
}


export interface UpdateStudentData {
  class_id?: number | null;
  board_id?: number | null;
  id_valid_through?: string | null;

  date_of_birth?: string | null;
  gender?: 'M' | 'F' | 'OTHER' | null;
  school?: string | null;
  blood_group?: BloodGroup | null;

  addressLine?: string | null;
  postalCode?: string | null;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
}


// ================== BOARD & CLASS TYPES ==================
export interface Board {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherRole {
  id: number;
  name: string;
  description?: string | null;
}

export interface Class {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardData { name: string; }
export interface UpdateBoardData { name: string; }
export interface CreateClassData { name: string; }
export interface UpdateClassData { name: string; }

// ================== CURRENCY TYPES ==================
export interface Currency {
  id: number;
  code: string;      // e.g., "USD", "INR"
  name: string;      // e.g., "United States Dollar"
  symbol: string;    // e.g., "$"
  created_at?: string;
  updated_at?: string;
}

// ================== TEACHER TYPES ==================
export interface Teacher {
  id: number;
  user_id: number;
  id_valid_through?: string | null;
  salary: number | null;
  salary_currency?: Currency | null;
  qualification: string | null;
  gender: 'M' | 'F' | 'OTHER' | null;
  blood_group?: BloodGroup | null;
  experience: string | null;
  address?: {
    id: number;
    addressLine: string;
    postalCode: string;
    country: { id: number; name: string };
    state: { id: number; name: string };
    city: { id: number; name: string };
  } | null;
  role_id: number | null;
  role?: {
    id: number;
    name: string;
    description?: string;
  } | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    profile_url?: string;
  };
  _count?: { teacher_subject_junctions: number; test_series_junctions: number; activity_group_junctions: number };
  teacher_subject_junctions?: {
    id: number;
    subject_id: number;
    created_on?: string; // timestamp when the subject was assigned
    updated_on?: string;
    subject: {
      id: number;
      name: string;
      class: { id: number; name: string } | null;
      board: { id: number; name: string } | null;
    };
  }[];
  test_series_junctions?: {
    id: number;
    test_series_id: number;
    assigned_at: string;
    test_series: {
      id: number;
      title: string;
      is_published: boolean;
    };
  }[];
  activity_group_junctions?: {
    id: number;
    activity_group_id: number;
    assigned_at: string;
    activity_group: {
      id: number;
      name: string;
      description?: string;
      is_active: boolean;
    };
  }[];
}

export interface CreateTeacherData {
  name: string;
  email: string;
  phone: string;
  password: string;
  id_valid_through?: string | null;
  salary: number | null;
  salary_currency_id?: number | null;
  qualification: string | null;
  gender: 'M' | 'F' | 'OTHER' | null;
  blood_group?: BloodGroup | null;
  experience: string | null;
  // optional address object for teacher
  address?: {
    addressLine: string;
    postalCode: string;
    countryId: number;
    stateId: number;
    cityId: number;
  };
}

export interface UpdateTeacherData {
  id_valid_through?: string | null;
  salary?: number | null;
  salary_currency_id?: number | null;
  qualification?: string | null;
  gender?: 'M' | 'F' | 'OTHER' | null;
  blood_group?: BloodGroup | null;
  experience?: string | null;
  address?: {
    addressLine?: string | null;
    postalCode?: string | null;
    countryId?: number | null;
    stateId?: number | null;
    cityId?: number | null;
  };
}

export interface TeacherSubjectAssignment {
  teacher_id: number;
  subject_id: number;
}

// ================== SUBJECT TYPES ==================
export interface Subject {
  id: number;
  name: string;
  cover_image: string | null;
  class_id: number | null;
  board_id: number | null;
  syllabus: any;
  is_course: boolean;
  end_date: string | null;
  price: number | null;
  actual_price?: number | null;
  currency_id: number | null;
  created_at: string;
  updated_at: string;
  class: { id: number; name: string } | null;
  board: { id: number; name: string } | null;
  currency: { id: number; name: string; code: string; symbol: string } | null;
  _count?: { enrollments: number; teacher_subject_junctions: number };
  enrollments?: {
    id: number;
    student: { id: number; user: { id: number; name: string; email: string; profile_url?: string } };
  }[];
  teacher_subject_junctions?: {
    id: number;
    teacher: { id: number; user: { id: number; name: string; email: string; profile_url?: string } };
  }[];
}

export interface CreateSubjectData {
  name: string;
  cover_image: string | File | null;
  class_id: number | null;
  board_id: number | null;
  syllabus: any;
  is_course: boolean;
  end_date: string | null;
  price: number | null;
  actual_price?: number | null;
  currency_id: number | null;
}

export interface UpdateSubjectData {
  name?: string;
  cover_image?: string | File | null;
  class_id?: number | null;
  board_id?: number | null;
  syllabus?: any;
  is_course?: boolean;
  end_date?: string | null;
  price?: number | null;
  actual_price?: number | null;
  currency_id?: number | null;
}

// ================== ENROLLMENTS ==================
export type EnrollmentType = 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';
export type BillingFrequency = 'one_time' | 'monthly' | 'quarterly' | 'semi_yearly' | 'yearly';

export interface EnrollmentInvoiceSummary {
  id: number;
  invoice_number: string;
  status: InvoiceStatus;
  total_amount: number;
  due_date: string;
  paid_date: string | null;
}

export interface Enrollment {
  id: number;
  type: EnrollmentType;
  student_id: number;
  subject_id: number | null;
  test_series_id: number | null;
  activity_group_id: number | null;
  invoice_id: number | null;
  price: number | null;
  is_recurring: boolean;
  frequency: BillingFrequency | null;
  end_date: string | null;
  invoice_date: string | null;
  notes: string | null;
  created_on: string;
  updated_on: string;
  student: {
    id: number;
    user: { id: number; name: string; email: string; phone: string };
    class: { id: number; name: string } | null;
    board: { id: number; name: string } | null;
  };
  subject: {
    id: number;
    name: string;
    price: number | null;
    actual_price: number | null;
    // legacy fields from old pages
    is_course?: boolean;
    class?: { id: number; name: string } | null;
    board?: { id: number; name: string } | null;
  } | null;
  test_series: { id: number; title: string; price: number | null } | null;
  activity_group: { id: number; name: string; price: number | null } | null;
  invoice: EnrollmentInvoiceSummary | null;
  // legacy compat
  payments?: EnrollmentPayment[];
}

export interface EnrollmentPayment {
  id: number;
  enrollment_id: number;
  period: string;
  due_date: string;
  amount: number;
  is_paid: boolean;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
  enrollment?: Enrollment;
  type?: EnrollmentType;
  original_price?: number | null;
}

export interface CreateEnrollmentItemData {
  type: EnrollmentType;
  subject_id?: number;
  test_series_id?: number;
  activity_group_id?: number;
  price?: number;
  frequency?: BillingFrequency;
  is_recurring?: boolean;
  end_date?: string;
}

export interface CreateEnrollmentData {
  student_id: number;
  items: CreateEnrollmentItemData[];
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  generate_invoice?: boolean;
  send_email?: boolean;
}

export interface UpdateEnrollmentData {
  price?: number;
  frequency?: BillingFrequency;
  is_recurring?: boolean;
  end_date?: string;
  invoice_date?: string;
  notes?: string;
}

export interface EnrollmentsResponse {
  data: Enrollment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkEnrollmentData {
  student_ids: number[];
  subject_id: number;
}

export interface ClassSession {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id: number | null;
  board_id: number | null;
  mode: 'ONLINE' | 'OFFLINE';
  location: string | null;
  meeting_link: string | null;
  emergency_meeting_link: string | null;
  google_event_id: string | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  teacher?: {
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  subject?: {
    id: number;
    name: string;
  };
  class?: {
    id: number;
    name: string;
  } | null;
  board?: {
    id: number;
    name: string;
  } | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  _count?: {
    attendances: number;
  };
  attendances?: ClassSessionAttendance[];
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
}

export interface ClassSessionAttendance {
  id: number;
  class_session_id: number;
  user_id: number;
  role: 'TEACHER' | 'STUDENT';
  joined_at: string | null;
  left_at: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  class_session?: ClassSession;
}

export interface CreateClassSessionData {
  teacher_id: number;
  subject_id: number;
  class_id?: number | null;
  board_id?: number | null;
  mode: 'ONLINE' | 'OFFLINE';
  location?: string | null;
  meeting_link?: string | null;
  emergency_meeting_link?: string | null;
  start_time: string;
  end_time: string;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule | null;
  title?: string;
  description?: string;
  create_google_meet?: boolean;
}

export interface UpdateClassSessionData {
  teacher_id?: number;
  subject_id?: number;
  class_id?: number | null;
  board_id?: number | null;
  mode?: 'ONLINE' | 'OFFLINE';
  location?: string | null;
  meeting_link?: string | null;
  emergency_meeting_link?: string | null;
  start_time?: string;
  end_time?: string;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule | null;
}

export interface WeeklyScheduleResponse {
  weekStart: string;
  weekEnd: string;
  sessions: ClassSession[];
  totalSessions: number;
}

export interface CanJoinSessionResponse {
  canJoin: boolean;
  reason: string;
  session: {
    id: number;
    start_time: string;
    end_time: string;
    mode: 'ONLINE' | 'OFFLINE';
    meeting_link: string | null;
    emergency_meeting_link: string | null;
    location: string | null;
  };
}

export interface RecordAttendanceData {
  class_session_id: number;
  user_id: number;
  role: 'TEACHER' | 'STUDENT';
  joined_at?: string;
  left_at?: string;
}

export interface UpdateAttendanceData {
  joined_at?: string;
  left_at?: string;
}

// Module-related types
export interface ModuleContent {
  content_id: number;
  type: 'text' | 'image' | 'video' | 'pdf' | 'document';
  text_content?: string;
  file_name?: string;
  file_size?: number;
  s3_key?: string;
  s3_url?: string;
  uploaded_at?: string;
}

export interface Module {
  module_id: number;
  title: string;
  description: string;
  order: number;
  content: ModuleContent[];
  estimated_time_minutes: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudentModuleProgress {
  id: number;
  student_id: number;
  subject_id: number;
  module_id: number;
  progress_percent: number;
  is_completed: boolean;
  time_spent_minutes: number;
  completed_on: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  module?: Module;
}

export interface CreateModuleData {
  title: string;
  description: string;
  estimated_time_minutes?: number;
}

export interface UpdateModuleData {
  title?: string;
  description?: string;
  estimated_time_minutes?: number;
  order?: number;
}

export interface AddTextContentData {
  text_content: string;
}

export interface UpdateContentData {
  type?: 'text' | 'image' | 'video' | 'pdf' | 'document';
  text_content?: string;
}

export interface UpdateProgressData {
  progress_percent?: number;
  time_spent_minutes?: number;
  is_completed?: boolean;
}

// Test module types
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'MATCH_THE_FOLLOWING' | 'CASE_STUDY';

export interface Question {
  id: number;
  test_id: number;
  question_type: QuestionType;
  question_text: string;
  media_url?: string | null;
  media_type?: string | null;
  options: string[] | null;
  correct_answer: string | null;
  marks: number;
  negative_marks: number;
  order: number;
  parent_id?: number | null;
  sub_questions?: Question[];
  created_at: string;
  updated_at: string;
}

export type TestType = 'MOCK_TEST' | 'PRACTICE' | 'ASSESSMENT' | 'CERTIFICATION';

export interface Test {
  id: number;
  title: string;
  description: string | null;
  instructions?: string | null;
  test_type?: TestType;
  subject_id: number | null;
  test_series_id?: number | null;
  created_by: number;
  total_marks: number;
  passing_marks: number;
  has_negative_marking: boolean;
  is_autograded: boolean;
  max_warning_attempts: number;
  duration_minutes: number;
  available_from: string;
  available_until: string;
  is_published: boolean;
  is_certification: boolean;
  created_at: string;
  updated_at: string;
  subject?: {
    id: number;
    name: string;
    cover_image: string | null;
  } | null;
  test_series?: {
    id: number;
    title: string;
  } | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  questions?: Question[];
  _count?: {
    questions: number;
    test_attempts: number;
  };
}

export interface Answer {
  id: number;
  test_attempt_id: number;
  question_id: number;
  answer_text: string | null;
  answer_media_url?: string | null;
  answer_media_type?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  marks_obtained: number | null;
  is_correct: boolean | null;
  created_at: string;
  updated_at: string;
  question?: Question;
}

export interface TestAttempt {
  id: number;
  test_id: number;
  student_id: number;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number;
  is_passed: boolean | null;
  is_practice: boolean;
  is_graded: boolean;
  graded_by: number | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
  test?: Test;
  student?: {
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  grader?: {
    id: number;
    name: string;
    email: string;
  } | null;
  answers?: Answer[];
}

export interface CreateTestData {
  title: string;
  description?: string;
  instructions?: string;
  test_type?: TestType;
  subject_id?: number | null;
  test_series_id?: number | null;
  total_marks: number;
  passing_marks: number;
  has_negative_marking?: boolean;
  is_autograded?: boolean;
  max_warning_attempts?: number;
  enforce_warning_attempts?: boolean;
  duration_minutes: number;
  available_from: string;
  available_until: string;
  is_published?: boolean;
  is_certification?: boolean;
}

export interface UpdateTestData {
  title?: string;
  description?: string;
  instructions?: string;
  test_type?: TestType;
  subject_id?: number | null;
  test_series_id?: number | null;
  total_marks?: number;
  passing_marks?: number;
  has_negative_marking?: boolean;
  is_autograded?: boolean;
  max_warning_attempts?: number;
  enforce_warning_attempts?: boolean;
  duration_minutes?: number;
  available_from?: string;
  available_until?: string;
  is_published?: boolean;
  is_certification?: boolean;
}

export interface GenerateQuestionsData {
  topic: string;
  numMCQ?: number;
  numTrueFalse?: number;
  numShortAnswer?: number;
  numLongAnswer?: number;
  mcqMarks?: number;
  trueFalseMarks?: number;
  shortAnswerMarks?: number;
  longAnswerMarks?: number;
}

export interface CreateQuestionData {
  question_type: QuestionType;
  question_text: string;
  media_url?: string;
  media_type?: string;
  options?: string[];
  correct_answer: string;
  marks: number;
  negative_marks?: number;
}

export interface UpdateQuestionData {
  question_text?: string;
  media_url?: string;
  media_type?: string;
  options?: string[];
  correct_answer?: string;
  marks?: number;
  negative_marks?: number;
}

export interface SubmitAnswerData {
  question_id: number;
  answer_text: string;
  answer_media_url?: string;
  answer_media_type?: string;
}

export interface GradeAnswerData {
  answer_id?: number;
  question_id?: number;
  marks_obtained: number;
  is_correct: boolean;
}

export interface GradeTestData {
  grades: GradeAnswerData[];
}

// Chat Types
export interface ChatParticipant {
  id: number;
  chat_id: number;
  user_id: number;
  joined_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: 'ADMIN' | 'TEACHER' | 'STUDENT';
    created_at: string;
    updated_at: string;
  };
}

export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string | null;
  message_type: MessageType;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  sender: {
    id: number;
    name: string;
    email: string;
  };
}

export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'PDF' | 'FILE';

export interface Chat {
  id: number;
  created_at: string;
  updated_at: string;
  participants: ChatParticipant[];
  messages: Message[];
  _count: {
    messages: number;
  };
}

export interface StartChatData {
  participantIds: number[];
}

export interface SendMessageData {
  content?: string;
  messageType?: MessageType;
  attachments?: Array<{ url: string; messageType?: MessageType }>;
}

export interface ChatMessagesResponse {
  success: boolean;
  message: string;
  data: {
    messages: Message[];
    can_send?: boolean;
    can_send_reason?: string | null;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// ================== ACTIVITY GROUP TYPES ==================
export interface ActivityGroup {
  id: number;
  name: string;
  description?: string;
  cover_image?: string;
  is_active: boolean;
  price: number | null;
  currency_id: number | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  currency: { id: number; name: string; code: string; symbol: string } | null;
  teacher_junctions?: ActivityGroupTeacherJunction[];
  activities?: any[];
  _count?: {
    activities: number;
  };
}

export interface ActivityGroupTeacherJunction {
  id: number;
  activity_group_id: number;
  teacher_id: number;
  assigned_at: string;
  teacher: {
    id: number;
    user_id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  activity_group?: {
    id: number;
    name: string;
  };
}

// ================== TEST SERIES TYPES ==================
export interface TestSeries {
  id: number;
  title: string;
  description?: string;
  cover_image?: string;
  price?: number;
  currency_id: number | null;
  is_published: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  currency: { id: number; name: string; code: string; symbol: string } | null;
  teacher_junctions?: TestSeriesTeacherJunction[];
  tests?: Test[];
  _count?: {
    tests: number;
    enrollments: number;
  };
  is_enrolled?: boolean;
  enrolled_at?: string;
}

export interface TestSeriesTeacherJunction {
  id: number;
  test_series_id: number;
  teacher_id: number;
  assigned_at: string;
  teacher: {
    id: number;
    user_id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}

// ================== TEST SERIES ENROLLMENT TYPES ==================
export interface TestSeriesEnrollment {
  id: number;
  test_series_id: number;
  student_id: number;
  enrolled_at: string;
  test_series?: TestSeries;
  student?: Student;
}

export interface ActivityGroupEnrollment {
  id: number;
  activity_group_id: number;
  student_id: number;
  enrolled_at: string;
  activity_group?: ActivityGroup;
  student?: Student;
}

// ================== JOBS & INTERNSHIPS ==================
export type JobType = 'JOB' | 'INTERNSHIP';
export type JobStatus = 'OPEN' | 'CLOSED';
export type ApplicationStatus = 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';

export interface Job {
  id: number;
  title: string;
  company: string;
  location?: string;
  type: JobType;
  description: string;
  requirements?: string;
  skills?: string[];
  salary_range?: string;
  duration?: string;
  application_deadline?: string;
  status: JobStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
  _count?: {
    applications: number;
  };
}

export interface JobApplication {
  id: number;
  job_id: number;
  student_id: number;
  cv_url: string;
  cover_letter: string;
  status: ApplicationStatus;
  reviewed_by?: number;
  reviewed_at?: string;
  feedback?: string;
  applied_at: string;
  updated_at: string;
  job?: {
    id: number;
    title: string;
    company: string;
    location?: string;
    type: JobType;
    status: JobStatus;
  };
  student?: Student;
}

export interface CreateJobData {
  title: string;
  company: string;
  location?: string;
  type: JobType;
  description: string;
  requirements?: string;
  skills?: string[];
  salary_range?: string;
  duration?: string;
  application_deadline?: string;
}

export interface UpdateJobData extends Partial<CreateJobData> {
  status?: JobStatus;
}

export interface ApplyJobData {
  job_id: number;
  cover_letter: string;
}

export interface ReviewApplicationData {
  status: ApplicationStatus;
  feedback?: string;
}

// ================== SAVED WHITEBOARD TYPES ==================
export interface SavedWhiteboard {
  id: number;
  title: string;
  subject_id: number | null;
  user_id: number;
  strokes: any;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  subject?: {
    id: number;
    name: string;
    class?: { id: number; name: string } | null;
    board?: { id: number; name: string } | null;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreateWhiteboardData {
  title: string;
  subject_id?: number | null;
  strokes?: any;
  thumbnail?: string | null;
}

export interface UpdateWhiteboardData {
  title?: string;
  subject_id?: number | null;
  strokes?: any;
  thumbnail?: string | null;
}

export interface WhiteboardsResponse {
  success: boolean;
  message: string;
  data: {
    whiteboards: SavedWhiteboard[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// ================== ANNOUNCEMENT TYPES ==================
export type AnnouncementType = 'NOTICE' | 'NEWS' | 'EVENT' | 'HOLIDAY' | 'EXAM' | 'GENERAL';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  created_by: number;
  created_at: string;
  updated_at?: string;
  creator?: { name: string; email: string };
  target_roles?: string[];
  target_boards?: number[];
  target_classes?: number[];
  target_subjects?: number[];
  target_courses?: number[];
  target_groups?: number[];
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  type?: AnnouncementType;
  target_roles?: string[] | null;
  target_boards?: number[] | null;
  target_classes?: number[] | null;
  target_subjects?: number[] | null;
  target_courses?: number[] | null;
  target_groups?: number[] | null;
}

// ================== INVOICE & BILLING TYPES ==================
export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  type: 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';
  subject_id?: number | null;
  test_series_id?: number | null;
  activity_group_id?: number | null;
  item_name: string;
  unit_price: number;
  actual_price?: number | null;
  quantity: number;
  discount: number;
  total: number;
  subject?: Subject | null;
  test_series?: any | null;
  activity_group?: any | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  student_id: number;
  status: InvoiceStatus;
  display_status?: string;
  is_overdue?: boolean;
  issue_date: string;
  due_date: string;
  paid_date?: string | null;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  notes?: string | null;
  payment_method?: string | null;
  transaction_id?: string | null;
  created_at: string;
  updated_at: string;
  student?: {
    id: number;
    user_id: number;
    user: {
      id: number;
      name: string;
      email: string;
      phone?: string;
    };
    class?: { id: number; name: string } | null;
    board?: { id: number; name: string } | null;
    school?: string | null;
  };
  items: InvoiceItem[];
}

export interface InvoiceStats {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  totalCount: number;
}

export interface InvoicesResponse {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: InvoiceStats;
}

export interface CreateInvoiceData {
  student_id: number;
  due_date: string;
  issue_date?: string;
  items: {
    type: 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';
    subject_id?: number;
    test_series_id?: number;
    activity_group_id?: number;
    item_name?: string;
    unit_price: number;
    actual_price?: number;
    quantity?: number;
    discount?: number;
  }[];
  discount_amount?: number;
  notes?: string;
  payment_method?: string;
  transaction_id?: string;
  status?: 'PAID' | 'PENDING';
  paid_date?: string;
  send_email?: boolean;
}

export interface UpdateInvoiceData {
  student_id?: number;
  due_date?: string;
  issue_date?: string;
  status?: 'PAID' | 'PENDING';
  paid_date?: string;
  discount_amount?: number;
  notes?: string;
  payment_method?: string;
  transaction_id?: string;
  items?: {
    type: 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';
    subject_id?: number;
    test_series_id?: number;
    activity_group_id?: number;
    item_name?: string;
    unit_price: number;
    actual_price?: number;
    quantity?: number;
    discount?: number;
  }[];
}
