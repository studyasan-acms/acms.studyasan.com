import type { Request, Response } from 'express';
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

export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { search, gender, user_id, role } = req.query;

    const where: any = {};

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    if (gender) where.gender = gender;

    // Filter by student's enrolled subjects if user_id and role are provided
    if (user_id && role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: parseInt(user_id as string) },
        include: {
          enrollments: {
            select: { subject_id: true },
          },
        },
      });

      if (student && student.enrollments.length > 0) {
        const subjectIds = [
          ...new Set(
            student.enrollments
              .map((enrollment) => enrollment.subject_id)
              .filter((subjectId): subjectId is number => subjectId !== null)
          ),
        ];

        if (subjectIds.length > 0) {
          where.teacher_subject_junctions = {
            some: {
              subject_id: { in: subjectIds },
            },
          };
        } else {
          const response = createPaginatedResponse([], 0, page, limit);
          return sendSuccess(res, response);
        }
      } else {
        const response = createPaginatedResponse([], 0, page, limit);
        return sendSuccess(res, response);
      }
    }

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profile_url: true,
            },
          },
          salary_currency: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          address: {
            include: {
              country: { select: { id: true, name: true } },
              state: { select: { id: true, name: true } },
              city: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: { teacher_subject_junctions: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.teacher.count({ where }),
    ]);

    const response = createPaginatedResponse(teachers, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(id!) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile_url: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        teacher_subject_junctions: {
          include: {
            subject: true,
          },
        },
        test_series_junctions: {
          include: {
            test_series: {
              select: {
                id: true,
                title: true,
                is_published: true,
              },
            },
          },
        },
        activity_group_junctions: {
          include: {
            activity_group: {
              select: {
                id: true,
                name: true,
                description: true,
                is_active: true,
              },
            },
          },
        },
        salary_currency: true,
        address: {
          include: {
            country: { select: { id: true, name: true } },
            state: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!teacher) {
      return sendError(res, 'Teacher not found', 404);
    }

    sendSuccess(res, teacher);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      user_id,
      id_valid_through,
      salary,
      salary_currency_id,
      qualification,
      gender,
      blood_group,
      experience,
      address
    } = req.body;

    if (email) req.body.email = email.toLowerCase();

    const profileImage = req.file;
    const parsedIdValidThrough = parseDateField(id_valid_through);

    // Check if we're creating a new user or using existing user_id
    if (user_id) {
      // Existing flow for admin creating teacher from existing user
      return createTeacherFromExistingUser();
    }

    // New flow: Create user and teacher in a single transaction
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

    // Parse address if it's a JSON string (from FormData)
    let parsedAddress = address;
    if (typeof address === 'string') {
      try {
        parsedAddress = JSON.parse(address);
      } catch (error) {
        console.warn('Failed to parse address JSON:', error);
        parsedAddress = null;
      }
    }

    // Create user and teacher in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user first
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: hashedPassword,
          profile_url: profileUrl || null,
          role: 'TEACHER',
        },
      });

      // Prepare teacher data
      const createData: any = { user: { connect: { id: user.id } } };

      if (typeof parsedIdValidThrough !== 'undefined') {
        createData.id_valid_through = parsedIdValidThrough;
      }

      if (typeof salary !== 'undefined' && salary !== null && salary !== '') {
        const salaryNum = typeof salary === 'string' ? parseInt(salary, 10) : salary;
        if (!isNaN(salaryNum)) {
          createData.salary = salaryNum;
        }
      }
      if (salary_currency_id !== undefined && salary_currency_id !== null) {
        const salaryCurrencyIdNum = typeof salary_currency_id === 'string' ? parseInt(salary_currency_id, 10) : salary_currency_id;
        createData.salary_currency = { connect: { id: Number(salaryCurrencyIdNum) } };
      }
      if (typeof qualification !== 'undefined') createData.qualification = qualification;
      if (typeof gender !== 'undefined') createData.gender = gender;
      if (typeof blood_group !== 'undefined' && blood_group !== '') createData.blood_group = blood_group;
      if (typeof experience !== 'undefined') createData.experience = experience;
      if (parsedAddress) {
        createData.address = {
          create: {
            addressLine: parsedAddress.addressLine,
            postalCode: parsedAddress.postalCode,
            countryId: parsedAddress.countryId,
            stateId: parsedAddress.stateId,
            cityId: parsedAddress.cityId,
          },
        };
      }

      // Create teacher profile
      const teacher = await tx.teacher.create({
        data: createData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profile_url: true,
            },
          },
          salary_currency: true,
          address: {
            include: {
              country: { select: { id: true, name: true } },
              state: { select: { id: true, name: true } },
              city: { select: { id: true, name: true } },
            },
          },
        },
      });

      return teacher;
    });

    sendSuccess(res, result, 'Teacher created successfully', 201);

    async function createTeacherFromExistingUser() {
      // normalize IDs
      const userIdNum = typeof user_id === 'string' ? parseInt(user_id, 10) : user_id;
      const salaryCurrencyIdNum = typeof salary_currency_id === 'string' ? parseInt(salary_currency_id, 10) : salary_currency_id;

      // Handle profile image upload if provided
      let profileUrl: string | undefined;
      if (profileImage) {
        const uploadResult = await uploadToS3(profileImage, 'profiles');
        profileUrl = uploadResult.url;
      }

      // Update user with profile image if provided
      if (profileUrl) {
        await prisma.user.update({
          where: { id: userIdNum },
          data: { profile_url: profileUrl },
        });
      }

      // Parse address if it's a JSON string (from FormData)
      let parsedAddress = address;
      if (typeof address === 'string') {
        try {
          parsedAddress = JSON.parse(address);
        } catch (error) {
          console.warn('Failed to parse address JSON:', error);
          parsedAddress = null;
        }
      }

      const createData: any = { user: { connect: { id: Number(userIdNum) } } };

      if (typeof parsedIdValidThrough !== 'undefined') {
        createData.id_valid_through = parsedIdValidThrough;
      }

      if (typeof salary !== 'undefined' && salary !== null && salary !== '') {
        const salaryNum = typeof salary === 'string' ? parseInt(salary, 10) : salary;
        if (!isNaN(salaryNum)) {
          createData.salary = salaryNum;
        }
      }
      if (salaryCurrencyIdNum !== undefined && salaryCurrencyIdNum !== null) {
        createData.salary_currency = { connect: { id: Number(salaryCurrencyIdNum) } };
      }
      if (typeof qualification !== 'undefined') createData.qualification = qualification;
      if (typeof gender !== 'undefined') createData.gender = gender;
      if (typeof blood_group !== 'undefined' && blood_group !== '') createData.blood_group = blood_group;
      if (typeof experience !== 'undefined') createData.experience = experience;
      if (parsedAddress) {
        createData.address = {
          create: {
            addressLine: parsedAddress.addressLine,
            postalCode: parsedAddress.postalCode,
            countryId: parsedAddress.countryId,
            stateId: parsedAddress.stateId,
            cityId: parsedAddress.cityId,
          },
        };
      }

      const teacher = await prisma.teacher.create({
        data: createData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profile_url: true,
            },
          },
          salary_currency: true,
          address: {
            include: {
              country: { select: { id: true, name: true } },
              state: { select: { id: true, name: true } },
              city: { select: { id: true, name: true } },
            },
          },
        },
      });

      sendSuccess(res, teacher, 'Teacher created successfully', 201);
    }
  } catch (error: any) {
    console.error('Error creating teacher:', error);

    if (error.code === 'P2002') {
      return sendError(res, 'A user with this email already exists', 400);
    }

    if (error.code === 'P2003') {
      return sendError(
        res,
        'Invalid foreign key (salary_currency_id, countryId, stateId, or cityId)',
        400
      );
    }

    sendError(res, error.message || 'Internal server error', 500);
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Extract profile image if present
    const profileImage = req.file as Express.Multer.File | undefined;

    // Extract fields from req.body (may be FormData or JSON)
    const salary = req.body.salary;
    const salary_currency_id = req.body.salary_currency_id;
    const id_valid_through = req.body.id_valid_through;
    const qualification = req.body.qualification;
    const gender = req.body.gender;
    const blood_group = req.body.blood_group;
    const experience = req.body.experience;
    const address = req.body.address;
    const name = req.body.name;
    let email = req.body.email;
    if (email) email = email.toLowerCase();
    const phone = req.body.phone;
    const role_id = req.body.role_id;
    const parsedIdValidThrough = parseDateField(id_valid_through);

    const existingTeacher = await prisma.teacher.findUnique({
      where: { id: parseInt(id!) },
      include: {
        user: {
          select: {
            profile_url: true,
          },
        },
      },
    });

    if (!existingTeacher) {
      return sendError(res, 'Teacher not found', 404);
    }

    // Handle profile image upload if present
    let profileUrl = existingTeacher.user.profile_url;
    if (profileImage) {
      // Delete old profile image if it exists
      if (existingTeacher.user.profile_url) {
        await deleteFromS3(existingTeacher.user.profile_url);
      }
      // Upload new profile image
      const uploadResult = await uploadToS3(profileImage, `teacher-profiles`);
      profileUrl = uploadResult.url;
    }

    // Update user information if provided
    if (name !== undefined || email !== undefined || phone !== undefined || profileUrl !== undefined) {
      await prisma.user.update({
        where: { id: existingTeacher.user_id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(profileUrl !== undefined && { profile_url: profileUrl }),
        },
      });
    }

    const salaryCurrencyIdNumUp = typeof salary_currency_id === 'string' ? parseInt(salary_currency_id, 10) : salary_currency_id;

    const updateData: any = {};
    if (typeof parsedIdValidThrough !== 'undefined') updateData.id_valid_through = parsedIdValidThrough;
    if (typeof salary !== 'undefined') {
      const salaryNum = typeof salary === 'string' ? parseInt(salary, 10) : salary;
      if (!isNaN(salaryNum)) {
        updateData.salary = salaryNum;
      }
    }
    if (typeof qualification !== 'undefined') updateData.qualification = qualification;
    if (typeof gender !== 'undefined') updateData.gender = gender;
    if (typeof blood_group !== 'undefined') updateData.blood_group = blood_group === '' ? null : blood_group;
    if (typeof experience !== 'undefined') updateData.experience = experience;

    // Handle role assignment using Prisma relation
    if (role_id !== undefined) {
      if (role_id === null || role_id === 'null' || role_id === '') {
        updateData.role = { disconnect: true };
      } else {
        const roleIdNum = typeof role_id === 'string' ? parseInt(role_id, 10) : role_id;
        if (!isNaN(roleIdNum)) {
          updateData.role = { connect: { id: roleIdNum } };
        }
      }
    }

    if (salaryCurrencyIdNumUp !== undefined) {
      if (salaryCurrencyIdNumUp === null) {
        updateData.salary_currency = { disconnect: true };
      } else {
        updateData.salary_currency = { connect: { id: Number(salaryCurrencyIdNumUp) } };
      }
    }
    if (address) {
      // Handle address parsing for both JSON and FormData
      let addressData;
      if (typeof address === 'string') {
        try {
          addressData = JSON.parse(address);
        } catch (e) {
          return sendError(res, 'Invalid address format', 400);
        }
      } else {
        addressData = address;
      }

      updateData.address = {
        upsert: {
          create: {
            addressLine: addressData.addressLine,
            postalCode: addressData.postalCode,
            countryId: addressData.countryId,
            stateId: addressData.stateId,
            cityId: addressData.cityId,
          },
          update: {
            addressLine: addressData.addressLine,
            postalCode: addressData.postalCode,
            countryId: addressData.countryId,
            stateId: addressData.stateId,
            cityId: addressData.cityId,
          },
        },
      };
    }

    const teacher = await prisma.teacher.update({
      where: { id: parseInt(id!) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile_url: true,
          },
        },
        salary_currency: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        address: {
          include: {
            country: { select: { id: true, name: true } },
            state: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });

    sendSuccess(res, teacher, 'Teacher updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(id!) },
    });

    if (!teacher) {
      return sendError(res, 'Teacher not found', 404);
    }

    // Delete both teacher and associated user in a transaction
    await prisma.$transaction(async (tx) => {
      // First delete the teacher record
      await tx.teacher.delete({
        where: { id: parseInt(id!) },
      });

      // Then delete the associated user
      await tx.user.delete({
        where: { id: teacher.user_id },
      });
    });

    sendSuccess(res, null, 'Teacher deleted successfully');
  } catch (error: any) {
    console.error('Error deleting teacher:', error);

    if (error.code === 'P2025') {
      return sendError(res, 'Teacher not found', 404);
    }

    sendError(res, error.message || 'Internal server error', 500);
  }
};

export const assignSubjectToTeacher = async (req: Request, res: Response) => {
  try {
    const { teacher_id, subject_id } = req.body;

    const existing = await prisma.teacherSubjectJunction.findFirst({
      where: {
        teacher_id,
        subject_id,
      },
    });

    if (existing) {
      return sendError(res, 'Teacher already assigned to this subject', 400);
    }

    const assignment = await prisma.teacherSubjectJunction.create({
      data: {
        teacher_id,
        subject_id,
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profile_url: true,
              },
            },
          },
        },
        subject: true,
      },
    });

    sendSuccess(res, assignment, 'Subject assigned to teacher successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const removeSubjectFromTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.teacherSubjectJunction.delete({
      where: { id: parseInt(id!) },
    });

    sendSuccess(res, null, 'Subject removed from teacher successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getTeachersBySubject = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'Subject ID is required' });
    }

    const teachers = await prisma.teacher.findMany({
      where: {
        teacher_subject_junctions: {
          some: {
            subject_id: parseInt(subjectId),
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile_url: true,
          },
        },
        teacher_subject_junctions: {
          where: {
            subject_id: parseInt(subjectId),
          },
          include: {
            subject: true,
          },
        },
        salary_currency: true,
        address: {
          include: {
            country: { select: { id: true, name: true } },
            state: { select: { id: true, name: true } },
            city: { select: { id: true, name: true } },
          },
        },
      },
    });

    sendSuccess(res, teachers, 'Teachers fetched successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
