import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendNotificationAllChannels } from '../services/notification.service.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const prisma = new PrismaClient();

// Create weekly report - Teachers and Admins only
export const createReport = async (req: Request, res: Response) => {
  try {
    const { student_id, subject_id, month, week_start_date, week_end_date, ratings, teacher_comment } = req.body;
    const user = (req as any).user;

    if (!student_id || !month || !week_start_date || !week_end_date || !ratings) {
      return sendError(res, 'Missing required fields: student_id, month, week_start_date, week_end_date, ratings are required.', 400);
    }

    // Resolve teacher record
    let teacher = null;
    if (user.role === 'TEACHER') {
      teacher = await prisma.teacher.findUnique({
        where: { user_id: user.id }
      });
      if (!teacher) {
        return sendError(res, 'Teacher record not found.', 404);
      }
    } else if (user.role === 'ADMIN') {
      // For Admin, find any teacher or assign a dummy/specific teacher ID.
      // Usually, admin can act as any teacher, or we assign the first teacher record.
      teacher = await prisma.teacher.findFirst();
      if (!teacher) {
        return sendError(res, 'No teacher record exists in system.', 400);
      }
    } else {
      return sendError(res, 'Unauthorized to create weekly report cards.', 403);
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: parseInt(student_id) },
      include: { user: true }
    });

    if (!student) {
      return sendError(res, 'Student not found.', 404);
    }

    // Create the weekly report
    const report = await prisma.knowYourChildReport.create({
      data: {
        student_id: parseInt(student_id),
        teacher_id: teacher.id,
        subject_id: subject_id ? parseInt(subject_id) : null,
        month,
        week_start_date: new Date(week_start_date),
        week_end_date: new Date(week_end_date),
        ratings: ratings, // Expected to be an array of evaluated subjects/traits
        teacher_comment,
      },
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        },
        subject: true
      }
    });

    // Notify the student / parent
    try {
      await sendNotificationAllChannels({
        user_id: student.user.id,
        type: 'SUCCESS',
        title: 'New Weekly Report Card Available',
        description: `Teacher ${user.name} has posted a new weekly "Know Your Child" report card for ${month}. Please review and leave your feedback.`,
      });
    } catch (notifErr) {
      console.error('Error sending report creation notification:', notifErr);
    }

    return sendSuccess(res, report, 'Weekly report card created successfully.', 201);
  } catch (error: any) {
    console.error('Error creating weekly report:', error);
    return sendError(res, error.message || 'Failed to create weekly report.', 500);
  }
};

// Get all weekly reports for a student
export const getStudentReports = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const user = (req as any).user;

    if (!studentId) {
      return sendError(res, 'Student ID is required.', 400);
    }

    // Authorization checks:
    // - Admin has access.
    // - Teacher has access.
    // - Student has access to their own reports.
    if (user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: user.id }
      });
      if (!student || student.id !== parseInt(studentId)) {
        return sendError(res, 'Access denied. You can only view your own report cards.', 403);
      }
    }

    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const where: any = { student_id: parseInt(studentId) };
    if (req.query.subject_id && req.query.subject_id !== 'all') {
      where.subject_id = parseInt(req.query.subject_id as string);
    }
    if (req.query.month && req.query.month !== 'all') {
      where.month = req.query.month as string;
    }
    if (req.query.week_start_date && req.query.week_start_date !== 'all') {
      where.week_start_date = new Date(req.query.week_start_date as string);
    }
    if (req.query.feedback_status && req.query.feedback_status !== 'all') {
      if (req.query.feedback_status === 'submitted') {
        where.parent_feedback = { not: null };
      } else if (req.query.feedback_status === 'pending') {
        where.parent_feedback = null;
      }
    }
    if (req.query.search) {
      const search = (req.query.search as string).trim();
      if (search) {
        where.OR = [
          { teacher_comment: { contains: search, mode: 'insensitive' } },
          { parent_feedback: { contains: search, mode: 'insensitive' } },
          { teacher: { user: { name: { contains: search, mode: 'insensitive' } } } },
          { subject: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }
    }

    const total = await prisma.knowYourChildReport.count({
      where
    });

    const reports = await prisma.knowYourChildReport.findMany({
      where,
      skip,
      take: limit,
      include: {
        teacher: {
          include: {
            user: {
              select: { name: true, profile_url: true }
            }
          }
        },
        student: {
          include: {
            user: {
              select: { name: true }
            },
            class: true
          }
        },
        subject: true
      },
      orderBy: { week_start_date: 'desc' }
    });

    const response = createPaginatedResponse(reports, total, page, limit);
    return sendSuccess(res, response, 'Weekly report cards retrieved successfully.');
  } catch (error: any) {
    console.error('Error fetching weekly reports:', error);
    return sendError(res, error.message || 'Failed to retrieve weekly reports.', 500);
  }
};

// Add parent feedback to a report
export const addParentFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { parent_feedback } = req.body;
    const user = (req as any).user;

    if (!id || parent_feedback === undefined) {
      return sendError(res, 'Report ID and parent_feedback are required.', 400);
    }

    // Find report and verify student access
    const report = await prisma.knowYourChildReport.findUnique({
      where: { id: parseInt(id) },
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        }
      }
    });

    if (!report) {
      return sendError(res, 'Report card not found.', 404);
    }

    if (user.role === 'STUDENT') {
      if (report.student.user_id !== user.id) {
        return sendError(res, 'Access denied. You can only add feedback to your own report cards.', 403);
      }
    }

    // Update parent feedback
    const updatedReport = await prisma.knowYourChildReport.update({
      where: { id: parseInt(id) },
      data: { parent_feedback },
      include: {
        student: {
          include: { user: true }
        },
        teacher: {
          include: { user: true }
        }
      }
    });

    // Notify the teacher
    try {
      await sendNotificationAllChannels({
        user_id: updatedReport.teacher.user.id,
        type: 'SUCCESS',
        title: 'New Parent Feedback',
        description: `The parent of ${updatedReport.student.user.name} has submitted feedback on the report card for ${updatedReport.month}.`,
      });
    } catch (notifErr) {
      console.error('Error sending feedback submission notification:', notifErr);
    }

    return sendSuccess(res, updatedReport, 'Parent feedback submitted successfully.');
  } catch (error: any) {
    console.error('Error submitting parent feedback:', error);
    return sendError(res, error.message || 'Failed to submit parent feedback.', 500);
  }
};
