import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { createPaymentSchedule, createOneTimePayment } from '../utils/payment.utils.js';
import { sendEnrollmentNotification } from '../services/notification.service.js';

// Extended Request type with user info
interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}
const prisma = new PrismaClient();

// Create Activity Group
export const createActivityGroup = async (req: Request, res: Response) => {
  try {
    const { name, description, cover_image, price, currency_id } = req.body;
    const userId = (req as any).user.id;

    const activityGroup = await prisma.activityGroup.create({
      data: {
        name,
        description,
        cover_image,
        ...(price && { price: parseFloat(price) }),
        ...(currency_id && { currency_id: parseInt(currency_id) }),
        created_by: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currency: true,
      },
    });

    return sendSuccess(res, activityGroup, 'Activity group created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get all Activity Groups
export const getAllActivityGroups = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, is_active } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const where: any = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    // If user is TEACHER, check if they have the elevated 'activityGroups.view' permission.
    // If they do, show all groups (same as admin). Otherwise, filter to only their assigned groups.
    if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        include: { role: true },
      });
      if (!teacher) {
        return sendError(res, 'Teacher profile not found', 404);
      }

      const permissions = teacher.role?.permissions as any;
      const hasViewAllPermission = teacher.role?.is_active && permissions?.activityGroups?.view === true;

      // Teachers with the 'activityGroups.view' role permission see all groups (admin-level view).
      // All other teachers see only the groups they are explicitly assigned to.
      if (!hasViewAllPermission) {
        where.teacher_junctions = {
          some: {
            teacher_id: teacher.id,
          },
        };
      }
    }

    const [activityGroups, total] = await Promise.all([
      prisma.activityGroup.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          currency: true,
          teacher_junctions: {
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
            },
          },
          _count: {
            select: {
              activities: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.activityGroup.count({ where }),
    ]);

    return sendSuccess(res, {
      activityGroups,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Activity Group by ID
export const getActivityGroupById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activityGroup = await prisma.activityGroup.findUnique({
      where: { id: Number(id) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currency: true,
        teacher_junctions: {
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
          },
        },
        enrollments: { // Assuming enrollments can be included via relation, but might be 'enrollments' generic
          where: { type: 'ACTIVITY_GROUP' },
          include: {
            student: true,
          }
        },
        activities: {
          include: {
            _count: {
              select: {
                attempts: true,
              },
            },
          },
        },
      },
    });

    if (!activityGroup) {
      return sendError(res, 'Activity group not found', 404);
    }

    return sendSuccess(res, activityGroup);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Update Activity Group
export const updateActivityGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, cover_image, is_active, price, currency_id } = req.body;

    const activityGroup = await prisma.activityGroup.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        cover_image,
        is_active,
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(currency_id !== undefined && { currency_id: currency_id ? parseInt(currency_id) : null }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        currency: true,
      },
    });

    return sendSuccess(res, activityGroup, 'Activity group updated successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Delete Activity Group
export const deleteActivityGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.activityGroup.delete({
      where: { id: Number(id) },
    });

    return sendSuccess(res, null, 'Activity group deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Assign Teacher to Activity Group
export const assignTeacherToActivityGroup = async (req: Request, res: Response) => {
  try {
    const { activity_group_id, teacher_id } = req.body;

    const existing = await prisma.activityGroupTeacherJunction.findFirst({
      where: {
        activity_group_id,
        teacher_id,
      },
    });

    if (existing) {
      return sendError(res, 'Teacher already assigned to this activity group', 400);
    }

    const assignment = await prisma.activityGroupTeacherJunction.create({
      data: {
        activity_group_id,
        teacher_id,
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
        activity_group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return sendSuccess(res, assignment, 'Teacher assigned to activity group successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Remove Teacher from Activity Group
export const removeTeacherFromActivityGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // junction id

    const junction = await prisma.activityGroupTeacherJunction.findUnique({
      where: { id: Number(id) },
    });

    if (!junction) {
      return sendError(res, 'Assignment not found', 404);
    }

    await prisma.activityGroupTeacherJunction.delete({
      where: { id: Number(id) },
    });

    return sendSuccess(res, null, 'Teacher removed from activity group successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Teachers by Activity Group
export const getTeachersByActivityGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activityGroup = await prisma.activityGroup.findUnique({
      where: { id: Number(id) },
      include: {
        teacher_junctions: {
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
          },
        },
      },
    });

    if (!activityGroup) {
      return sendError(res, 'Activity group not found', 404);
    }

    return sendSuccess(res, activityGroup.teacher_junctions);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Enroll student in activity group
export const enrollStudentInActivityGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Get student record
    let studentId: number;

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: userId },
      });

      if (!student) {
        return sendError(res, 'Student record not found', 404);
      }
      studentId = student.id;
    } else {
      // Admin can enroll any student
      const { student_id } = req.body;
      if (!student_id) {
        return sendError(res, 'Student ID is required', 400);
      }
      studentId = parseInt(student_id);
    }

    // Check if group exists
    const activityGroup = await prisma.activityGroup.findUnique({
      where: { id: parseInt(id!) },
      include: {
        activities: {
          where: { is_published: true }
        }
      }
    });

    if (!activityGroup) {
      return sendError(res, 'Activity group not found', 404);
    }

    // Check if already enrolled in group
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        student_id_activity_group_id: {
          activity_group_id: parseInt(id!),
          student_id: studentId,
        },
      },
    });

    if (existingEnrollment) {
      return sendError(res, 'Already enrolled in this activity group', 400);
    }

    const { price, is_recurring, frequency, payment_count, one_time_amount } = req.body;

    // Calculate end_date based on payment_count and frequency if recurring
    let end_date: Date | null = null;
    if (is_recurring && frequency && payment_count) {
      const now = new Date();
      let monthsToAdd = 0;
      if (frequency === 'monthly') monthsToAdd = 1;
      else if (frequency === 'quarterly') monthsToAdd = 3;
      else if (frequency === 'semi_yearly') monthsToAdd = 6;
      else if (frequency === 'yearly') monthsToAdd = 12;

      const totalMonths = monthsToAdd * (parseInt(payment_count) || 12);
      end_date = new Date(now.setMonth(now.getMonth() + totalMonths));
    }

    // Create Group Enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        type: 'ACTIVITY_GROUP',
        activity_group_id: parseInt(id!),
        student_id: studentId,
        price: price ? parseFloat(price) : null,
        is_recurring: is_recurring || false,
        frequency: frequency || null,
        end_date: end_date,
      },
      include: {
        activity_group: {
          select: {
            id: true,
            name: true,
          },
        },
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
      },
    });

    // Create payment schedule if recurring
    if (price && is_recurring && frequency) {
      await createPaymentSchedule({
        userId: enrollment.student.user.id,
        itemName: enrollment.activity_group?.name || 'Activity Group',
        price: parseFloat(price),
        frequency,
        paymentCount: parseInt(payment_count) || 12,
        createPaymentRecords: async (records) => {
          await prisma.payment.createMany({
            data: records.map(r => ({
              ...r,
              enrollment_id: enrollment.id,
              type: 'ACTIVITY_GROUP',
            })),
          });
        }
      });
    } else if (!is_recurring && one_time_amount) {
      // Create one-time payment
      await createOneTimePayment({
        enrollmentId: enrollment.id,
        amount: parseFloat(one_time_amount),
        userId: enrollment.student.user.id,
        itemName: enrollment.activity_group?.name || 'Activity Group',
        type: 'ACTIVITY_GROUP',
      });
    }

    // Also enroll in all underlying activities (legacy/access support)
    if (activityGroup.activities.length > 0) {
      // Get existing activity enrollments to avoid duplicates
      const existingActivityEnrollments = await prisma.activityEnrollment.findMany({
        where: {
          student_id: studentId,
          activity_id: { in: activityGroup.activities.map(a => a.id) }
        },
        select: { activity_id: true }
      });
      const existingIds = existingActivityEnrollments.map(e => e.activity_id);

      const newActivities = activityGroup.activities.filter(a => !existingIds.includes(a.id));

      if (newActivities.length > 0) {
        await prisma.activityEnrollment.createMany({
          data: newActivities.map(a => ({
            activity_id: a.id,
            student_id: studentId
          }))
        });
      }
    }

    // Send notification across all channels
    sendEnrollmentNotification(studentId, 'Activity Group', activityGroup.name).catch(console.error);

    sendSuccess(res, enrollment, 'Enrolled in activity group successfully', 201);
  } catch (error: any) {
    console.error('Error enrolling in activity group:', error);
    sendError(res, error.message, 500);
  }
};

// Get all activity group enrollments (global admin view)
export const getAllGlobalActivityGroupEnrollments = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { student_id, activity_group_id } = req.query;

    // Only ADMIN can access this
    if (req.user?.role !== 'ADMIN') {
      return sendError(res, 'Access denied', 403);
    }

    const where: any = {
      type: 'ACTIVITY_GROUP'
    };
    if (student_id) where.student_id = parseInt(student_id as string);
    if (activity_group_id) where.activity_group_id = parseInt(activity_group_id as string);

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          activity_group: {
            select: {
              id: true,
              name: true,
              price: true,
            }
          },
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          payments: true,
        },
        orderBy: { created_on: 'desc' },
      }),
      prisma.enrollment.count({ where }),
    ]);

    const response = createPaginatedResponse(enrollments, total, page, limit);
    sendSuccess(res, response);

  } catch (error: any) {
    console.error('Error fetching all activity group enrollments:', error);
    sendError(res, error.message, 500);
  }
};
