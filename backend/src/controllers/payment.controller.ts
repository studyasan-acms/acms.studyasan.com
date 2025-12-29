import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { NotificationProcessorService } from '../services/notificationProcessor.service.js';

const prisma = new PrismaClient();

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { is_paid, enrollment_id } = req.query;

    const where: any = {};

    if (is_paid !== undefined) where.is_paid = is_paid === 'true';
    if (enrollment_id) where.enrollment_id = parseInt(enrollment_id as string);

    const [payments, total] = await Promise.all([
      prisma.enrollmentPayment.findMany({
        where,
        skip,
        take: limit,
        include: {
          enrollment: {
            include: {
              student: {
                include: {
                  user: true,
                },
              },
              subject: true,
            },
          },
        },
        orderBy: { due_date: 'asc' },
      }),
      prisma.enrollmentPayment.count({ where }),
    ]);

    const response = createPaginatedResponse(payments, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.enrollmentPayment.findUnique({
      where: { id: parseInt(id!) },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            subject: true,
          },
        },
      },
    });

    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    sendSuccess(res, payment);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const markPaymentAsPaid = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paid_date } = req.body;

    const payment = await prisma.enrollmentPayment.findUnique({
      where: { id: parseInt(id!) },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            subject: true,
          },
        },
      },
    });

    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    // Update the payment
    const updatedPayment = await prisma.enrollmentPayment.update({
      where: { id: parseInt(id!) },
      data: {
        is_paid: true,
        paid_date: paid_date ? new Date(paid_date) : new Date(),
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            subject: true,
          },
        },
      },
    });

    // Cancel corresponding pending notification
    const notificationTitle = `Payment Due: ${payment.enrollment.subject.name} - ${payment.period}`;
    await NotificationProcessorService.cancelPendingNotifications(
      payment.enrollment.student.user_id,
      notificationTitle
    );

    sendSuccess(res, updatedPayment, 'Payment marked as paid successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getOverduePayments = async (req: Request, res: Response) => {
  try {
    const overduePayments = await prisma.enrollmentPayment.findMany({
      where: {
        is_paid: false,
        due_date: {
          lt: new Date(),
        },
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            subject: true,
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });

    sendSuccess(res, overduePayments);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};