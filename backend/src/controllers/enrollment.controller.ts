import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { NotificationProcessorService } from '../services/notificationProcessor.service.js';
import { sendNotificationAllChannels } from '../services/notification.service.js';
import { createOneTimePayment } from '../utils/payment.utils.js';

const prisma = new PrismaClient();

export const getAllEnrollments = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { student_id, subject_id, test_series_id, activity_group_id, type } = req.query;

    const where: any = {};

    if (student_id) where.student_id = parseInt(student_id as string);
    if (subject_id) where.subject_id = parseInt(subject_id as string);
    if (test_series_id) where.test_series_id = parseInt(test_series_id as string);
    if (activity_group_id) where.activity_group_id = parseInt(activity_group_id as string);
    if (type) where.type = type as string;

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
          test_series: true,
          activity_group: true,
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
        test_series: true,
        activity_group: true,
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
    const { student_id, subject_id, price, is_recurring, frequency, end_date, one_time_amount, due_date } = req.body;

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
        type: 'SUBJECT',
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

    // If this is a paid enrollment, create payment schedule or one-time payment
    if (is_recurring && price && frequency) {
      await createPaymentSchedule(enrollment.id, price, frequency, end_date ? new Date(end_date) : null, student.user_id, subject, due_date ? new Date(due_date) : new Date());
    } else if (!is_recurring && one_time_amount !== undefined && one_time_amount !== null) {
      await createOneTimePayment({
        enrollmentId: enrollment.id,
        amount: one_time_amount,
        userId: student.user_id,
        itemName: subject.name,
        type: 'SUBJECT',
        dueDate: due_date ? new Date(due_date) : undefined,
      });
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

export const bulkEnroll = async (req: Request, res: Response) => {
  try {
    const { student_ids, subject_id } = req.body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return sendError(res, 'student_ids must be a non-empty array', 400);
    }

    if (!subject_id) {
      return sendError(res, 'subject_id is required', 400);
    }

    const subject = await prisma.subject.findUnique({ where: { id: subject_id } });
    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const created: number[] = [];
    const skipped: number[] = [];

    for (const student_id of student_ids) {
      const existing = await prisma.enrollment.findFirst({
        where: { student_id, subject_id },
      });

      if (existing) {
        skipped.push(student_id);
        continue;
      }

      await prisma.enrollment.create({
        data: {
          type: 'SUBJECT',
          student_id,
          subject_id,
          is_recurring: false,
        },
      });

      created.push(student_id);
    }

    sendSuccess(
      res,
      { created: created.length, skipped: skipped.length },
      `Enrolled ${created.length} student(s). ${skipped.length} already enrolled.`,
      201
    );
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
  subject: any,
  startDate: Date = new Date()
) {
  try {
    const now = startDate;
    const paymentRecords = [];
    const immediateNotifications = [];
    const pendingNotifications = [];

    // Calculate period increment based on frequency
    let periodIncrement = 1; // months
    if (frequency === 'yearly') {
      periodIncrement = 12;
    } else if (frequency === 'semi_yearly') {
      periodIncrement = 6;
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
        : frequency === 'semi_yearly'
          ? `H${dueDate.getMonth() < 6 ? 1 : 2}-${dueDate.getFullYear()}`
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

      const subjectName = subject?.name || 'Subject';
      const notificationTitle = `Payment Due: ${subjectName} - ${period}`;
      const notificationDesc = `Payment of ₹${price} for ${subjectName} (${period}) is due on ${dueDate.toLocaleDateString()}.`;

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
      // Map to Payment model
      await prisma.payment.createMany({
        data: paymentRecords.map(r => ({
          ...r,
          type: 'SUBJECT' // Default for this controller which handles Subjects
        })),
      });
    }

    // Send immediate notifications via all channels (in-app, FCM, email)
    if (immediateNotifications.length > 0) {
      // Use map to return promises
      const notificationPromises = immediateNotifications.map(notification =>
        sendNotificationAllChannels(notification)
      );
      await Promise.allSettled(notificationPromises);
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