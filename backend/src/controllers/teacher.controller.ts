import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const prisma = new PrismaClient();

export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { search, gender } = req.query;

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
    const { user_id, salary, salary_currency_id, qualification, gender, experience, address } = req.body;

    // normalize IDs
    const userIdNum = typeof user_id === 'string' ? parseInt(user_id, 10) : user_id;
    const salaryCurrencyIdNum = typeof salary_currency_id === 'string' ? parseInt(salary_currency_id, 10) : salary_currency_id;

    const createData: any = { user: { connect: { id: Number(userIdNum) } } };
    if (typeof salary !== 'undefined') createData.salary = salary;
    if (salaryCurrencyIdNum !== undefined && salaryCurrencyIdNum !== null) {
      createData.salary_currency = { connect: { id: Number(salaryCurrencyIdNum) } };
    }
    if (typeof qualification !== 'undefined') createData.qualification = qualification;
    if (typeof gender !== 'undefined') createData.gender = gender;
    if (typeof experience !== 'undefined') createData.experience = experience;
    if (address) {
      createData.address = {
        create: {
          addressLine: address.addressLine,
          postalCode: address.postalCode,
          countryId: address.countryId,
          stateId: address.stateId,
          cityId: address.cityId,
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
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { salary, salary_currency_id, qualification, gender, experience, address } = req.body;

    const salaryCurrencyIdNumUp = typeof salary_currency_id === 'string' ? parseInt(salary_currency_id, 10) : salary_currency_id;

    const updateData: any = {};
    if (typeof salary !== 'undefined') updateData.salary = salary;
    if (typeof qualification !== 'undefined') updateData.qualification = qualification;
    if (typeof gender !== 'undefined') updateData.gender = gender;
    if (typeof experience !== 'undefined') updateData.experience = experience;
    if (salaryCurrencyIdNumUp !== undefined) {
      if (salaryCurrencyIdNumUp === null) {
        updateData.salary_currency = { disconnect: true };
      } else {
        updateData.salary_currency = { connect: { id: Number(salaryCurrencyIdNumUp) } };
      }
    }
    if (address) {
      updateData.address = {
        upsert: {
          create: {
            addressLine: address.addressLine,
            postalCode: address.postalCode,
            countryId: address.countryId,
            stateId: address.stateId,
            cityId: address.cityId,
          },
          update: {
            addressLine: address.addressLine,
            postalCode: address.postalCode,
            countryId: address.countryId,
            stateId: address.stateId,
            cityId: address.cityId,
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
