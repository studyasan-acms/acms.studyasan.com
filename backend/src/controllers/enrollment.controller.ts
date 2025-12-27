import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const prisma = new PrismaClient();

export const getAllEnrollments = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );
    
    const { student_id, subject_id } = req.query;
    
    const where: any = {};
    
    if (student_id) where.student_id = parseInt(student_id as string);
    if (subject_id) where.subject_id = parseInt(subject_id as string);
    
    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: {
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
        orderBy: { created_on: 'desc' },
      }),
      prisma.enrollment.count({ where }),
    ]);
    
    const response = createPaginatedResponse(enrollments, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getEnrollmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: parseInt(id!) },
      include: {
        student: {
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
    
    if (!enrollment) {
      return sendError(res, 'Enrollment not found', 404);
    }
    
    sendSuccess(res, enrollment);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createEnrollment = async (req: Request, res: Response) => {
  try {
    const { student_id, subject_id } = req.body;
    
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        student_id,
        subject_id,
      },
    });
    
    if (existingEnrollment) {
      return sendError(res, 'Student already enrolled in this subject', 400);
    }
    
    const enrollment = await prisma.enrollment.create({
      data: {
        student_id,
        subject_id,
      },
      include: {
        student: {
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
    
    sendSuccess(res, enrollment, 'Enrollment created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteEnrollment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.enrollment.delete({
      where: { id: parseInt(id!) },
    });
    
    sendSuccess(res, null, 'Enrollment deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};