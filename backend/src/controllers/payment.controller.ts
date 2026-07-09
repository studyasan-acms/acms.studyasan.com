import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { NotificationProcessorService } from '../services/notificationProcessor.service.js';
import { sendNotificationAllChannels } from '../services/notification.service.js';

const prisma = new PrismaClient();

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { is_paid, enrollment_id, status, search } = req.query;

    const where: any = {};

    if (is_paid !== undefined) where.is_paid = is_paid === 'true';
    if (enrollment_id) where.enrollment_id = parseInt(enrollment_id as string);

    // Handle status-based filtering
    if (status) {
      const now = new Date();
      switch (status) {
        case 'paid':
          where.is_paid = true;
          break;
        case 'pending':
          where.is_paid = false;
          where.due_date = { gte: now };
          break;
        case 'overdue':
          where.is_paid = false;
          where.due_date = { lt: now };
          break;
      }
    }

    // Handle search functionality
    if (search) {
      where.enrollment = {
        OR: [
          {
            student: {
              user: {
                name: {
                  contains: search as string,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            subject: {
              name: {
                contains: search as string,
                mode: 'insensitive',
              },
            },
          },
          {
            test_series: {
              title: {
                contains: search as string,
                mode: 'insensitive',
              },
            },
          },
          {
            activity_group: {
              name: {
                contains: search as string,
                mode: 'insensitive',
              },
            },
          },
        ],
      };
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
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
              test_series: true,
              activity_group: true,
            },
          },
        },
        orderBy: { due_date: 'asc' },
      }),
      prisma.payment.count({ where }),
    ]);

    // Add original_price to each payment based on the enrollment item
    const paymentsWithOriginalPrice = payments.map((payment) => {
      let original_price: number | null = null;

      if (payment.enrollment) {
        if (payment.enrollment.subject) {
          original_price = payment.enrollment.subject.price;
        } else if (payment.enrollment.test_series) {
          original_price = payment.enrollment.test_series.price;
        } else if (payment.enrollment.activity_group) {
          original_price = payment.enrollment.activity_group.price;
        }
      }

      return {
        ...payment,
        original_price,
      };
    });

    const response = createPaginatedResponse(paymentsWithOriginalPrice, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
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
            test_series: true,
            activity_group: true,
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

    const payment = await prisma.payment.findUnique({
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
            test_series: true,
            activity_group: true,
          },
        },
      },
    });

    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    // Update the payment
    const updatedPayment = await prisma.payment.update({
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
            test_series: true,
            activity_group: true,
          },
        },
      },
    });

    // Cancel corresponding pending notification
    let itemName = 'Unknown Item';
    const enrollment = payment.enrollment;

    if (enrollment.subject) itemName = enrollment.subject.name;
    else if (enrollment.test_series) itemName = enrollment.test_series.title;
    else if (enrollment.activity_group) itemName = enrollment.activity_group.name;

    // Fallback if relations are not loaded but type is known (though we loaded them above)
    if (itemName === 'Unknown Item' && enrollment.type) {
      itemName = enrollment.type.toString().replace('_', ' ');
    }

    const notificationTitle = `Payment Due: ${itemName} - ${payment.period}`;
    await NotificationProcessorService.cancelPendingNotifications(
      payment.enrollment.student.user_id,
      notificationTitle
    );

    // Notify student that payment has been received
    await sendNotificationAllChannels({
      user_id: payment.enrollment.student.user_id,
      type: 'SUCCESS',
      title: `Payment Received: ${itemName}`,
      description: `Your payment for ${itemName} (${payment.period}) was received successfully.`,
    });

    sendSuccess(res, updatedPayment, 'Payment marked as paid successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getOverduePayments = async (req: Request, res: Response) => {
  try {
    const overduePayments = await prisma.payment.findMany({
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
            test_series: true,
            activity_group: true,
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

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, due_date, is_paid, paid_date } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id!) },
    });

    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (due_date !== undefined) updateData.due_date = due_date ? new Date(due_date) : null;
    if (is_paid !== undefined) updateData.is_paid = is_paid;
    if (paid_date !== undefined) updateData.paid_date = paid_date ? new Date(paid_date) : null;

    const updatedPayment = await prisma.payment.update({
      where: { id: parseInt(id!) },
      data: updateData,
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            subject: true,
            test_series: true,
            activity_group: true,
          },
        },
      },
    });

    sendSuccess(res, updatedPayment, 'Payment updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(id!) },
    });

    if (!payment) {
      return sendError(res, 'Payment not found', 404);
    }

    await prisma.payment.delete({
      where: { id: parseInt(id!) },
    });

    sendSuccess(res, null, 'Payment deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};