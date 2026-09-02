import type { Request, Response } from 'express';
import { PrismaClient, EnrollmentType, InvoiceStatus } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { sendInvoiceEmailNotification } from '../services/email.service.js';

const prisma = new PrismaClient();

// ─── Helpers ───────────────────────────────────────────────────────────────

const ENROLLMENT_INCLUDE = {
  student: {
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      class: { select: { id: true, name: true } },
      board: { select: { id: true, name: true } },
    },
  },
  subject: { select: { id: true, name: true, price: true, actual_price: true } },
  test_series: { select: { id: true, title: true, price: true } },
  activity_group: { select: { id: true, name: true, price: true } },
  invoice: {
    select: {
      id: true,
      invoice_number: true,
      status: true,
      total_amount: true,
      due_date: true,
      paid_date: true,
    },
  },
};

async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const nextNum = count + 1;
  return `SA-${currentYear}-${String(nextNum).padStart(5, '0')}`;
}

// ─── GET ALL ENROLLMENTS ────────────────────────────────────────────────────

export const getAllEnrollments = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { student_id, subject_id, test_series_id, activity_group_id, type, search, sortBy = 'created_on', sortOrder = 'desc' } = req.query;

    const where: any = {};

    if (student_id) where.student_id = parseInt(student_id as string);
    if (subject_id) where.subject_id = parseInt(subject_id as string);
    if (test_series_id) where.test_series_id = parseInt(test_series_id as string);
    if (activity_group_id) where.activity_group_id = parseInt(activity_group_id as string);
    if (type) where.type = type as string;

    // Search across student name/email, subject name, test series title, activity group name
    if (search && (search as string).trim() !== '') {
      const s = (search as string).trim();
      where.OR = [
        { student: { user: { name: { contains: s, mode: 'insensitive' } } } },
        { student: { user: { email: { contains: s, mode: 'insensitive' } } } },
        { subject: { name: { contains: s, mode: 'insensitive' } } },
        { test_series: { title: { contains: s, mode: 'insensitive' } } },
        { activity_group: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Sort
    const orderBy: any = {};
    if (sortBy === 'student') {
      orderBy.student = { user: { name: sortOrder === 'asc' ? 'asc' : 'desc' } };
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.created_on = sortOrder === 'asc' ? 'asc' : 'desc';
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: ENROLLMENT_INCLUDE,
        orderBy,
      }),
      prisma.enrollment.count({ where }),
    ]);

    const response = createPaginatedResponse(enrollments, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── GET BY ID ──────────────────────────────────────────────────────────────

export const getEnrollmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: parseInt(id!) },
      include: ENROLLMENT_INCLUDE,
    });

    if (!enrollment) {
      return sendError(res, 'Enrollment not found', 404);
    }

    sendSuccess(res, enrollment);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── GET ENROLLMENTS BY STUDENT ID ─────────────────────────────────────────

export const getEnrollmentsByStudentId = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    const enrollments = await prisma.enrollment.findMany({
      where: { student_id: parseInt(studentId!) },
      include: ENROLLMENT_INCLUDE,
      orderBy: { created_on: 'desc' },
    });

    sendSuccess(res, enrollments);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── CREATE ENROLLMENT (multi-item) ─────────────────────────────────────────

export const createEnrollment = async (req: Request, res: Response) => {
  try {
    const {
      student_id,
      items, // Array of { type, subject_id?, test_series_id?, activity_group_id?, price, frequency, is_recurring }
      invoice_date,
      due_date,
      notes,
      generate_invoice = false,
      send_email = false,
    } = req.body;

    if (!student_id) {
      return sendError(res, 'Student is required', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one enrollment item is required', 400);
    }

    const student = await prisma.student.findUnique({
      where: { id: parseInt(student_id, 10) },
      include: { user: true },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    const createdEnrollments: any[] = [];
    const skippedItems: string[] = [];

    for (const item of items) {
      const type = (item.type as EnrollmentType) || EnrollmentType.SUBJECT;
      const price = typeof item.price === 'number' ? item.price : null;
      const frequency = item.frequency || null;
      const is_recurring = item.is_recurring ?? (frequency && frequency !== 'one_time');

      try {
        let existing: any = null;
        let data: any = {
          type,
          student_id: student.id,
          price,
          is_recurring,
          frequency,
          notes: notes || null,
          invoice_date: invoice_date ? new Date(invoice_date) : null,
          end_date: item.end_date ? new Date(item.end_date) : null,
        };

        if (type === 'SUBJECT' && item.subject_id) {
          existing = await prisma.enrollment.findFirst({
            where: { student_id: student.id, subject_id: item.subject_id },
          });
          if (existing) {
            skippedItems.push(`Subject ID ${item.subject_id} (already enrolled)`);
            createdEnrollments.push(existing);
            continue;
          }
          data.subject_id = item.subject_id;
        } else if (type === 'TEST_SERIES' && item.test_series_id) {
          existing = await prisma.enrollment.findFirst({
            where: { student_id: student.id, test_series_id: item.test_series_id },
          });
          if (existing) {
            skippedItems.push(`Test Series ID ${item.test_series_id} (already enrolled)`);
            createdEnrollments.push(existing);
            continue;
          }
          data.test_series_id = item.test_series_id;
        } else if (type === 'ACTIVITY_GROUP' && item.activity_group_id) {
          existing = await prisma.enrollment.findFirst({
            where: { student_id: student.id, activity_group_id: item.activity_group_id },
          });
          if (existing) {
            skippedItems.push(`Activity Group ID ${item.activity_group_id} (already enrolled)`);
            createdEnrollments.push(existing);
            continue;
          }
          data.activity_group_id = item.activity_group_id;
        } else {
          skippedItems.push(`Invalid item (missing ID for type ${type})`);
          continue;
        }

        const enrollment = await prisma.enrollment.create({ data });
        createdEnrollments.push(enrollment);
      } catch (itemErr: any) {
        console.warn('Enrollment item error:', itemErr.message);
        skippedItems.push(`Item error: ${itemErr.message}`);
      }
    }

    // Optionally generate a combined invoice for all created enrollments
    let invoice: any = null;
    if (generate_invoice && createdEnrollments.length > 0) {
      invoice = await _generateInvoiceForEnrollments(
        createdEnrollments.map((e) => e.id),
        student,
        invoice_date ? new Date(invoice_date) : new Date(),
        due_date ? new Date(due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes,
        send_email
      );
    }

    const message = skippedItems.length > 0
      ? `Enrolled in ${createdEnrollments.length} item(s). Skipped: ${skippedItems.join(', ')}`
      : `Successfully enrolled in ${createdEnrollments.length} item(s)`;

    sendSuccess(
      res,
      { enrollments: createdEnrollments, invoice, skipped: skippedItems },
      message,
      201
    );
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── UPDATE ENROLLMENT ──────────────────────────────────────────────────────

export const updateEnrollment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const enrollmentId = parseInt(id!, 10);

    const existing = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!existing) {
      return sendError(res, 'Enrollment not found', 404);
    }

    const { price, frequency, is_recurring, end_date, invoice_date, notes } = req.body;

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        ...(price !== undefined && { price }),
        ...(frequency !== undefined && { frequency }),
        ...(is_recurring !== undefined && { is_recurring }),
        ...(end_date !== undefined && { end_date: end_date ? new Date(end_date) : null }),
        ...(invoice_date !== undefined && { invoice_date: invoice_date ? new Date(invoice_date) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: ENROLLMENT_INCLUDE,
    });

    sendSuccess(res, updated, 'Enrollment updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── GENERATE INVOICE FROM ENROLLMENT IDs ──────────────────────────────────

export const generateInvoiceFromEnrollments = async (req: Request, res: Response) => {
  try {
    const { enrollment_ids, due_date, invoice_date, notes, send_email = false } = req.body;

    if (!enrollment_ids || !Array.isArray(enrollment_ids) || enrollment_ids.length === 0) {
      return sendError(res, 'enrollment_ids array is required', 400);
    }

    // Load enrollments with full relations
    const enrollments = await prisma.enrollment.findMany({
      where: { id: { in: enrollment_ids.map((id: any) => parseInt(id, 10)) } },
      include: {
        student: { include: { user: true } },
        subject: true,
        test_series: true,
        activity_group: true,
      },
    });

    if (enrollments.length === 0) {
      return sendError(res, 'No valid enrollments found', 404);
    }

    // All enrollments must belong to the same student
    const studentIds = [...new Set(enrollments.map((e) => e.student_id))];
    if (studentIds.length > 1) {
      return sendError(res, 'All enrollments must belong to the same student', 400);
    }

    const student = enrollments[0]?.student;
    if (!student) {
      return sendError(res, 'Could not resolve student for enrollment', 400);
    }

    const invoice = await _generateInvoiceForEnrollments(
      enrollments.map((e) => e.id),
      student,
      invoice_date ? new Date(invoice_date) : new Date(),
      due_date ? new Date(due_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes,
      send_email,
      enrollments
    );

    sendSuccess(res, invoice, 'Invoice generated successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── DELETE ENROLLMENT ──────────────────────────────────────────────────────

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

// ─── BULK ENROLL ────────────────────────────────────────────────────────────

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

// ─── INTERNAL HELPER: Generate Invoice ─────────────────────────────────────

async function _generateInvoiceForEnrollments(
  enrollmentIds: number[],
  student: any,
  issueDate: Date,
  dueDate: Date,
  notes: string | undefined,
  sendEmail: boolean,
  preloadedEnrollments?: any[]
): Promise<any> {
  // Load enrollments if not pre-loaded
  const enrollments = preloadedEnrollments ?? await prisma.enrollment.findMany({
    where: { id: { in: enrollmentIds } },
    include: {
      subject: true,
      test_series: true,
      activity_group: true,
    },
  });

  const invoice_number = await generateInvoiceNumber();
  let subtotal = 0;
  let totalDiscount = 0;
  const invoiceItems: any[] = [];

  for (const enrollment of enrollments) {
    let itemName = '';
    let finalPrice = typeof enrollment.price === 'number' ? enrollment.price : 0;
    let actualPrice = finalPrice;
    let itemDiscount = 0;

    if (enrollment.type === 'SUBJECT' && enrollment.subject) {
      itemName = enrollment.subject.name;
      finalPrice = typeof enrollment.price === 'number' ? enrollment.price : (enrollment.subject.price ?? 0);
      actualPrice = enrollment.subject.actual_price ?? finalPrice;
      if (actualPrice > finalPrice) {
        itemDiscount = actualPrice - finalPrice;
      }
    } else if (enrollment.type === 'TEST_SERIES' && enrollment.test_series) {
      itemName = enrollment.test_series.title;
      finalPrice = typeof enrollment.price === 'number' ? enrollment.price : (enrollment.test_series.price ?? 0);
      actualPrice = finalPrice;
    } else if (enrollment.type === 'ACTIVITY_GROUP' && enrollment.activity_group) {
      itemName = enrollment.activity_group.name;
      finalPrice = typeof enrollment.price === 'number' ? enrollment.price : (enrollment.activity_group.price ?? 0);
      actualPrice = finalPrice;
    } else {
      itemName = 'Learning Item';
    }

    const lineTotal = finalPrice;
    subtotal += (itemDiscount > 0 ? actualPrice : finalPrice);
    totalDiscount += itemDiscount;

    invoiceItems.push({
      type: enrollment.type,
      subject_id: enrollment.subject_id ?? null,
      test_series_id: enrollment.test_series_id ?? null,
      activity_group_id: enrollment.activity_group_id ?? null,
      item_name: itemName,
      unit_price: itemDiscount > 0 ? actualPrice : finalPrice,
      actual_price: actualPrice,
      quantity: 1,
      discount: itemDiscount,
      total: lineTotal,
    });
  }

  const totalAmount = Math.max(0, subtotal - totalDiscount);

  const invoice = await prisma.invoice.create({
    data: {
      invoice_number,
      student_id: student.id,
      status: InvoiceStatus.PENDING,
      issue_date: issueDate,
      due_date: dueDate,
      subtotal,
      discount_amount: totalDiscount,
      total_amount: totalAmount,
      notes: notes || null,
      items: { create: invoiceItems },
    },

    include: {
      student: { include: { user: true, class: true, board: true } },
      items: true,
    },
  });

  // Link enrollments back to this invoice
  await prisma.enrollment.updateMany({
    where: { id: { in: enrollmentIds } },
    data: { invoice_id: invoice.id },
  });

  // Send email if requested
  if (sendEmail && student.user?.email) {
    sendInvoiceEmailNotification(student.user.email, student.user.name, {
      invoice_number: invoice.invoice_number,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status,
      subtotal: invoice.subtotal,
      discount_amount: invoice.discount_amount,
      total_amount: invoice.total_amount,
      items: invoice.items.map((i) => ({
        item_name: i.item_name,
        type: i.type,
        unit_price: i.unit_price,
        quantity: i.quantity,
        discount: i.discount,
        total: i.total,
      })),
      notes: invoice.notes,
    }).catch(console.error);
  }

  return invoice;
}