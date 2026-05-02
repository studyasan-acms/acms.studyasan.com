import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { uploadToS3, deleteFromS3 } from '../utils/s3.js';

const prisma = new PrismaClient();

const parseDateField = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = new Date(String(value));
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

export const getAllStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { search, class_id, board_id, gender, user_id, role } = req.query;
    const where: any = {};

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    if (class_id) where.class_id = parseInt(class_id as string);
    if (board_id) where.board_id = parseInt(board_id as string);
    if (gender) where.gender = gender;

    // Filter by teacher's subjects if user_id and role are provided
    // BUT only if the teacher doesn't have explicit students.view permission
    if (user_id && role === 'TEACHER') {
      // Find the teacher by user_id with their role
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: parseInt(user_id as string) },
        include: {
          role: true,
          teacher_subject_junctions: {
            select: { subject_id: true }
          }
        }
      });

      // Check if teacher has custom role with students.view permission
      let hasStudentsViewPermission = false;
      if (teacher?.role && teacher.role.is_active) {
        const permissions = teacher.role.permissions as any;
        hasStudentsViewPermission = permissions?.students?.view === true;
      }

      // Only filter by subjects if teacher doesn't have students.view permission
      if (!hasStudentsViewPermission) {
        if (teacher && teacher.teacher_subject_junctions.length > 0) {
          // Get subject IDs the teacher teaches
          const subjectIds = teacher.teacher_subject_junctions.map(j => j.subject_id);

          // Filter students who are enrolled in any of these subjects
          where.enrollments = {
            some: {
              subject_id: { in: subjectIds }
            }
          };
        } else {
          // Teacher has no subjects assigned and no custom permission, return empty list
          const response = createPaginatedResponse([], 0, page, limit);
          return sendSuccess(res, response);
        }
      }
      // If hasStudentsViewPermission is true, don't add any filtering - show all students
      }

      // Determine whether the requester (from JWT) is a teacher and whether they should see emails
      const requesterId = req.user?.id as number | undefined;
      const requesterRole = req.user?.role as string | undefined;
      let requesterIsTeacher = requesterRole === 'TEACHER';
      let requesterHasStudentsViewPermission = false;
      if (requesterIsTeacher && requesterId) {
        try {
          const teacherReq = await prisma.teacher.findUnique({ where: { user_id: requesterId }, include: { role: true } });
          if (teacherReq?.role && teacherReq.role.is_active) {
            const permissions = teacherReq.role.permissions as any;
            requesterHasStudentsViewPermission = permissions?.students?.view === true;
          }
        } catch (e) {
          console.error('Error fetching teacher permissions for requester:', e);
        }
      }

    // Build user select based on requester permissions — hide email for teachers without explicit view permission
    let userSelect: any = { id: true, name: true, profile_url: true, phone: true };
    if (!requesterIsTeacher || requesterHasStudentsViewPermission) {
      userSelect.email = true;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: userSelect },
          class: true,
          board: true,
          address: {
            include: {
              country: true,
              state: true,
              city: true,
            },
          },
          _count: { select: { enrollments: true } },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.student.count({ where }),
    ]);

    const response = createPaginatedResponse(students, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(id!) },
      select: {
        id: true,
        user_id: true,
        class_id: true,
        board_id: true,
        id_valid_through: true,
        date_of_birth: true,
        gender: true,
        school: true,
        blood_group: true,
        created_at: true,
        updated_at: true,
        user: { select: { id: true, name: true, email: true, phone: true, profile_url: true } },
        class: true,
        board: true,
        enrollments: {
          include: {
            subject: true,
            test_series: true,
            activity_group: true,
          },
        },
        address: { include: { country: true, state: true, city: true } },
        activity_enrollments: {
          include: {
            activity: {
              include: {
                group: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            activity_enrollments: true,
          },
        },
      },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    sendSuccess(res, student);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      user_id,
      class_id,
      board_id,
      id_valid_through,
      date_of_birth,
      gender,
      school,
      blood_group,
      addressLine,
      countryId,
      stateId,
      cityId,
      postalCode,
    } = req.body;

    if (email) req.body.email = email.toLowerCase();

    const profileImage = req.file;
    const parsedIdValidThrough = parseDateField(id_valid_through);

    // Check if we're creating a new user or using existing user_id
    if (user_id) {
      // Existing flow for admin creating student from existing user
      return createStudentFromExistingUser();
    }

    // New flow: Create user and student in a single transaction
    if (!name || !email || !phone || !password) {
      return sendError(res, 'Name, email, phone, and password are required', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, 'A user with this email already exists', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle profile image upload if provided
    let profileUrl: string | undefined;
    if (profileImage) {
      const uploadResult = await uploadToS3(profileImage, 'profiles');
      profileUrl = uploadResult.url;
    }

    const hasAnyAddressField = addressLine || countryId || stateId || cityId || postalCode;
    const hasAllAddressFields = addressLine && countryId && stateId && cityId && postalCode;

    if (hasAnyAddressField && !hasAllAddressFields) {
      return sendError(
        res,
        'If providing address, all address fields (addressLine, countryId, stateId, cityId, postalCode) are required',
        400
      );
    }

    const addressData = hasAllAddressFields
      ? {
        create: {
          addressLine,
          postalCode,
          country: { connect: { id: parseInt(countryId.toString()) } },
          state: { connect: { id: parseInt(stateId.toString()) } },
          city: { connect: { id: parseInt(cityId.toString()) } },
        },
      }
      : undefined;

    // Create user and student in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user first
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          profile_url: profileUrl || null,
          role: 'STUDENT',
        },
      });

      // Create student profile
      const student = await tx.student.create({
        data: {
          user: { connect: { id: user.id } },
          ...(class_id && { class: { connect: { id: parseInt(class_id.toString()) } } }),
          ...(board_id && { board: { connect: { id: parseInt(board_id.toString()) } } }),
          ...(parsedIdValidThrough !== undefined && { id_valid_through: parsedIdValidThrough }),
          ...(date_of_birth && { date_of_birth: new Date(date_of_birth) }),
          ...(gender && { gender }),
          ...(school && { school }),
          ...(blood_group && { blood_group }),
          ...(addressData && { address: addressData }),
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, profile_url: true } },
          class: true,
          board: true,
          address: { include: { country: true, state: true, city: true } },
        },
      });

      return student;
    });

    sendSuccess(res, result, 'Student created successfully', 201);

    async function createStudentFromExistingUser() {
      // Original logic for creating student from existing user
      const hasAnyAddressField = addressLine || countryId || stateId || cityId || postalCode;
      const hasAllAddressFields = addressLine && countryId && stateId && cityId && postalCode;

      if (hasAnyAddressField && !hasAllAddressFields) {
        return sendError(
          res,
          'If providing address, all address fields (addressLine, countryId, stateId, cityId, postalCode) are required',
          400
        );
      }

      // Handle profile image upload if provided
      let profileUrl: string | undefined;
      if (profileImage) {
        const uploadResult = await uploadToS3(profileImage, 'profiles');
        profileUrl = uploadResult.url;

        // Update user with profile image
        await prisma.user.update({
          where: { id: user_id },
          data: { profile_url: profileUrl },
        });
      }

      const addressData = hasAllAddressFields
        ? {
          create: {
            addressLine,
            postalCode,
            country: { connect: { id: parseInt(countryId.toString()) } },
            state: { connect: { id: parseInt(stateId.toString()) } },
            city: { connect: { id: parseInt(cityId.toString()) } },
          },
        }
        : undefined;

      const student = await prisma.student.create({
        data: {
          user: { connect: { id: user_id } },
          ...(class_id && { class: { connect: { id: parseInt(class_id.toString()) } } }),
          ...(board_id && { board: { connect: { id: parseInt(board_id.toString()) } } }),
          ...(parsedIdValidThrough !== undefined && { id_valid_through: parsedIdValidThrough }),
          ...(date_of_birth && { date_of_birth: new Date(date_of_birth) }),
          ...(gender && { gender }),
          ...(school && { school }),
          ...(blood_group && { blood_group }),
          ...(addressData && { address: addressData }),
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, profile_url: true } },
          class: true,
          board: true,
          address: { include: { country: true, state: true, city: true } },
        },
      });

      sendSuccess(res, student, 'Student created successfully', 201);
    }
  } catch (error: any) {
    console.error('Error creating student:', error);

    if (error.code === 'P2002') {
      return sendError(res, 'A user with this email already exists', 400);
    }

    if (error.code === 'P2003') {
      return sendError(
        res,
        'Invalid foreign key (class_id, board_id, countryId, stateId, or cityId)',
        400
      );
    }

    sendError(res, error.message || 'Internal server error', 500);
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profileImage = req.file;

    // Extract data from either req.body (JSON) or req.body (FormData fields)
    // When FormData is sent, multer parses the fields into req.body
    const {
      class_id,
      board_id,
      id_valid_through,
      date_of_birth,
      gender,
      school,
      blood_group,
      addressLine,
      countryId,
      stateId,
      cityId,
      postalCode,
      name,
      email,
      phone,
    } = req.body;

    const parsedIdValidThrough = parseDateField(id_valid_through);

    if (email) req.body.email = email.toLowerCase();

    const existingStudent = await prisma.student.findUnique({
      where: { id: parseInt(id!) },
      include: { address: true },
    });

    if (!existingStudent) {
      return sendError(res, 'Student not found', 404);
    }

    // Handle profile image upload if provided
    let profileUrl: string | undefined;
    if (profileImage) {
      const uploadResult = await uploadToS3(profileImage, 'profiles');
      profileUrl = uploadResult.url;
    }

    // Update user information if provided
    if (name !== undefined || email !== undefined || phone !== undefined || profileUrl) {
      await prisma.user.update({
        where: { id: existingStudent.user_id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(profileUrl && { profile_url: profileUrl }),
        },
      });
    }

    const hasAnyAddressField =
      addressLine !== undefined ||
      countryId !== undefined ||
      stateId !== undefined ||
      cityId !== undefined ||
      postalCode !== undefined;
    const hasAllAddressFields =
      addressLine !== undefined &&
      countryId !== undefined &&
      stateId !== undefined &&
      cityId !== undefined &&
      postalCode !== undefined;

    if (hasAnyAddressField && !hasAllAddressFields) {
      return sendError(
        res,
        'If updating address, all address fields (addressLine, countryId, stateId, cityId, postalCode) must be provided',
        400
      );
    }

    const addressData = hasAllAddressFields
      ? {
        upsert: {
          create: {
            addressLine,
            postalCode,
            country: { connect: { id: countryId } },
            state: { connect: { id: stateId } },
            city: { connect: { id: cityId } },
          },
          update: {
            addressLine,
            postalCode,
            country: { connect: { id: countryId } },
            state: { connect: { id: stateId } },
            city: { connect: { id: cityId } },
          },
        },
      }
      : undefined;

    const student = await prisma.student.update({
      where: { id: parseInt(id!) },
      data: {
        ...(class_id !== undefined && {
          class: class_id ? { connect: { id: class_id } } : { disconnect: true },
        }),
        ...(board_id !== undefined && {
          board: board_id ? { connect: { id: board_id } } : { disconnect: true },
        }),
        ...(parsedIdValidThrough !== undefined && { id_valid_through: parsedIdValidThrough }),
        ...(date_of_birth !== undefined && {
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        }),
        ...(gender !== undefined && { gender }),
        ...(school !== undefined && { school }),
        ...(blood_group !== undefined && { blood_group }),
        ...(addressData && { address: addressData }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, profile_url: true } },
        class: true,
        board: true,
        address: { include: { country: true, state: true, city: true } },
      },
    });

    sendSuccess(res, student, 'Student updated successfully');
  } catch (error: any) {
    console.error('Error updating student:', error);

    if (error.code === 'P2025') {
      return sendError(res, 'Student not found', 404);
    }
    if (error.code === 'P2003') {
      return sendError(
        res,
        'Invalid foreign key (class_id, board_id, countryId, stateId, or cityId)',
        400
      );
    }

    sendError(res, error.message || 'Internal server error', 500);
  }
};

export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(id!) },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Delete both student and associated user in a transaction
    await prisma.$transaction(async (tx) => {
      // First delete the student record
      await tx.student.delete({
        where: { id: parseInt(id!) },
      });

      // Then delete the associated user
      await tx.user.delete({
        where: { id: student.user_id },
      });
    });

    sendSuccess(res, null, 'Student deleted successfully');
  } catch (error: any) {
    console.error('Error deleting student:', error);

    if (error.code === 'P2025') {
      return sendError(res, 'Student not found', 404);
    }

    sendError(res, error.message || 'Internal server error', 500);
  }
};
