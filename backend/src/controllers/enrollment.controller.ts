import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { NotificationProcessorService } from '../services/notificationProcessor.service.js';

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
    const { student_id, subject_id, price, is_recurring, frequency, end_date } = req.body;

    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        student_id,
        subject_id,
      },
    });

    if (existingEnrollment) {
      return sendError(res, 'Student already enrolled in this subject', 400);
    }

    // Get student and subject details for notifications
    const student = await prisma.student.findUnique({
      where: { id: student_id },
      include: { user: true },
    });

    const subject = await prisma.subject.findUnique({
      where: { id: subject_id },
    });

    if (!student || !subject) {
      return sendError(res, 'Student or subject not found', 404);
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        student_id,
        subject_id,
        price,
        is_recurring,
        frequency,
        end_date: end_date ? new Date(end_date) : null,
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
        payments: true,
      },
    });

    // If this is a paid enrollment with recurring payments, create payment schedule
    if (price && is_recurring && frequency) {
      await createPaymentSchedule(enrollment.id, price, frequency, end_date ? new Date(end_date) : null, student.user_id, subject);
    }

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

// Helper function to create payment schedule and notifications
async function createPaymentSchedule(
  enrollmentId: number,
  price: number,
  frequency: string,
  endDate: Date | null,
  userId: number,
  subject: any
) {
  try {
    const now = new Date();
    const paymentRecords = [];
    const immediateNotifications = [];
    const pendingNotifications = [];

    // Calculate period increment based on frequency
    let periodIncrement = 1; // months
    if (frequency === 'yearly') {
      periodIncrement = 12;
    } else if (frequency === 'quarterly') {
      periodIncrement = 3;
    }

    // Generate periods until end_date or default to 12 months
    let currentDate = new Date(now);
    let periodCount = 0;
    const maxPeriods = endDate ? 100 : 12; // Allow up to 100 periods if end_date is set, otherwise 12

    while (periodCount < maxPeriods) {
      if (endDate && currentDate > endDate) break;

      const dueDate = new Date(currentDate);

      const period = frequency === 'monthly'
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`
        : frequency === 'yearly'
        ? `${dueDate.getFullYear()}`
        : `Q${Math.ceil((dueDate.getMonth() + 1) / 3)}-${dueDate.getFullYear()}`;

      // Create payment record
      paymentRecords.push({
        enrollment_id: enrollmentId,
        period,
        due_date: dueDate,
        amount: price,
      });

      const notificationTitle = `Payment Due: ${subject.name} - ${period}`;
      const notificationDesc = `Payment of ₹${price} for ${subject.name} (${period}) is due on ${dueDate.toLocaleDateString()}.`;

      if (periodCount === 0) {
        // Immediate notification for current period
        immediateNotifications.push({
          user_id: userId,
          type: 'WARNING' as const,
          title: notificationTitle,
          description: notificationDesc,
        });
      } else {
        // Pending notification for future periods
        pendingNotifications.push({
          user_id: userId,
          type: 'WARNING' as const,
          title: notificationTitle,
          description: notificationDesc,
          delivery_time: dueDate,
        });
      }

      // Move to next period
      currentDate.setMonth(currentDate.getMonth() + periodIncrement);
      periodCount++;
    }

    // Create payment records
    if (paymentRecords.length > 0) {
      await prisma.enrollmentPayment.createMany({
        data: paymentRecords,
      });
    }

    // Create immediate notifications
    if (immediateNotifications.length > 0) {
      await prisma.notification.createMany({
        data: immediateNotifications,
      });
    }

    // Create pending notifications
    if (pendingNotifications.length > 0) {
      await prisma.pendingNotification.createMany({
        data: pendingNotifications,
      });
    }

    console.log(`Created payment schedule with ${paymentRecords.length} payments, ${immediateNotifications.length} immediate notifications, and ${pendingNotifications.length} pending notifications`);
  } catch (error) {
    console.error('Error creating payment schedule:', error);
  }
}