import type { Request } from 'express';
import type {
  Role,
  Gender,
  BloodGroup,
  Currency,
  Country,
  State,
  City,
} from '@prisma/client';

/** Extend Express Request with authenticated user info */
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: Role;
  };
}

/** Pagination query parameters */
export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Generic paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Currency type for frontend */
export interface CurrencyType {
  id: number;
  code: string;
  name: string;
  symbol: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Teacher address type */
export interface TeacherAddressType {
  id: number;
  teacherId: number;
  addressLine: string;
  postalCode: string;
  country: Country;
  state: State;
  city: City;
  createdAt: Date;
  updatedAt: Date;
}

/** Subject type for frontend */
export interface SubjectType {
  id: number;
  name: string;
  coverImage?: string | null;
  isCourse: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Teacher-Subject junction type */
export interface TeacherSubjectJunctionType {
  id: number;
  subjectId: number;
  createdOn: Date;
  updatedOn: Date;
  subject: SubjectType;
}

/** Activity Group Teacher junction type */
export interface ActivityGroupTeacherJunctionType {
  id: number;
  activityGroupId: number;
  teacherId: number;
  assignedAt: Date;
  teacher: TeacherType;
}

/** User type for frontend */
export interface UserType {
  id: number;
  name: string;
  email: string;
  phone: string;
}

/** Teacher type for frontend */
export interface TeacherType {
  id: number;
  userId: number;
  salary?: number;
  salaryCurrency?: CurrencyType | null; // Maps to salary_currency relation
  qualification?: string;
  gender?: Gender | null;
  experience?: string;
  address?: TeacherAddressType | null;
  createdAt: Date;
  updatedAt: Date;
  user?: UserType;
  teacher_subject_junctions?: TeacherSubjectJunctionType[];
}

/** DTO for creating a teacher */
export interface TeacherCreateDTO {
  userId: number;
  salary?: number;
  salaryCurrencyId?: number; // Maps to salary_currency_id
  qualification?: string;
  gender?: Gender;
  experience?: string;
  address?: {
    addressLine: string;
    postalCode: string;
    countryId: number;
    stateId: number;
    cityId: number;
  };
}

/** DTO for updating a teacher */
export interface TeacherUpdateDTO {
  salary?: number;
  salaryCurrencyId?: number; // Maps to salary_currency_id
  qualification?: string;
  gender?: Gender;
  experience?: string;
  address?: {
    addressLine?: string;
    postalCode?: string;
    countryId?: number;
    stateId?: number;
    cityId?: number;
  };
}
