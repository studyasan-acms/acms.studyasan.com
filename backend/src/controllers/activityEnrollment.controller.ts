import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendEnrollmentNotification, sendBulkEnrollmentNotifications } from '../services/notification.service.js';

const prisma = new PrismaClient();

// Enroll Student in Activity
export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const { activity_id, student_id } = req.body;

    // Check if activity exists and is published
    const activity = await prisma.activity.findUnique({
      where: { id: Number(activity_id) },
    });

    if (!activity) {
      return sendError(res, 'Activity not found', 404);
    }

    if (!activity.is_published) {
      return sendError(res, 'Activity is not published yet', 400);
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.activityEnrollment.findUnique({
      where: {
        activity_id_student_id: {
          activity_id: Number(activity_id),
          student_id: Number(student_id),
        },
      },
    });

    if (existingEnrollment) {
      return sendError(res, 'Student already enrolled in this activity', 400);
    }

    const enrollment = await prisma.activityEnrollment.create({
      data: {
        activity_id: Number(activity_id),
        student_id: Number(student_id),
      },
      include: {
        activity: {
          include: {
            group: true,
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

    // Send notification to student across all channels
    sendEnrollmentNotification(Number(student_id), 'Activity', activity.title).catch(console.error);

    return sendSuccess(res, enrollment, 'Student enrolled successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Bulk Enroll Students
export const bulkEnrollStudents = async (req: Request, res: Response) => {
  try {
    const { activity_id, student_ids } = req.body;

    // Check if activity exists and is published
    const activity = await prisma.activity.findUnique({
      where: { id: Number(activity_id) },
    });

    if (!activity) {
      return sendError(res, 'Activity not found', 404);
    }

    if (!activity.is_published) {
      return sendError(res, 'Activity is not published yet', 400);
    }

    // Get existing enrollments
    const existingEnrollments = await prisma.activityEnrollment.findMany({
      where: {
        activity_id: Number(activity_id),
        student_id: {
          in: student_ids.map(Number),
        },
      },
      select: {
        student_id: true,
      },
    });

    const existingStudentIds = existingEnrollments.map((e) => e.student_id);
    const newStudentIds = student_ids.filter((id: number) => !existingStudentIds.includes(Number(id)));

    if (newStudentIds.length === 0) {
      return sendError(res, 'All students are already enrolled', 400);
    }

    // Create enrollments
    await prisma.activityEnrollment.createMany({
      data: newStudentIds.map((student_id: number) => ({
        activity_id: Number(activity_id),
        student_id: Number(student_id),
      })),
    });

    // Send notification to newly enrolled students
    sendBulkEnrollmentNotifications(newStudentIds, 'Activity', activity.title).catch(console.error);

    return sendSuccess(
      res,
      { enrolled_count: newStudentIds.length },
      `${newStudentIds.length} student(s) enrolled successfully`,
      201
    );
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Enrollments for Activity
export const getActivityEnrollments = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [enrollments, total] = await Promise.all([
      prisma.activityEnrollment.findMany({
        where: {
          activity_id: Number(activityId),
        },
        skip,
        take: Number(limit),
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
        },
        orderBy: {
          enrolled_at: 'desc',
        },
      }),
      prisma.activityEnrollment.count({
        where: {
          activity_id: Number(activityId),
        },
      }),
    ]);

    return sendSuccess(res, {
      enrollments,
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

// Get Student's Enrollments
export const getStudentEnrollments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    const enrollments = await prisma.activityEnrollment.findMany({
      where: {
        student_id: student.id,
      },
      include: {
        activity: {
          include: {
            group: true,
            _count: {
              select: {
                items: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolled_at: 'desc',
      },
    });

    return sendSuccess(res, enrollments);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Unenroll Student
export const unenrollStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.activityEnrollment.delete({
      where: { id: Number(id) },
    });

    return sendSuccess(res, null, 'Student unenrolled successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Enroll Students to Activity Group (both group enrollment and individual activities)
export const enrollStudentsToGroup = async (req: Request, res: Response) => {
  try {
    const { group_id, student_ids } = req.body;
    const gId = Number(group_id);

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return sendError(res, 'student_ids must be a non-empty array', 400);
    }

    // Check if group exists
    const group = await prisma.activityGroup.findUnique({
      where: { id: gId },
      include: {
        activities: {
          where: {
            is_published: true,
          },
        },
      },
    });

    if (!group) {
      return sendError(res, 'Activity group not found', 404);
    }

    const numericStudentIds = student_ids.map(Number).filter((id: number) => !isNaN(id) && id > 0);

    // 1. Create/ensure Enrollment record exists for each student (type: ACTIVITY_GROUP)
    const existingGroupEnrollments = await prisma.enrollment.findMany({
      where: {
        activity_group_id: gId,
        student_id: { in: numericStudentIds },
        type: 'ACTIVITY_GROUP',
      },
      select: { student_id: true },
    });

    const existingGroupStudentIds = existingGroupEnrollments.map((e) => e.student_id);
    const newGroupStudentIds = numericStudentIds.filter(
      (id: number) => !existingGroupStudentIds.includes(id)
    );

    if (newGroupStudentIds.length > 0) {
      await prisma.enrollment.createMany({
        data: newGroupStudentIds.map((student_id: number) => ({
          type: 'ACTIVITY_GROUP',
          activity_group_id: gId,
          student_id,
        })),
      });
    }

    // 2. Enroll each student to all published activities in the group
    let totalActivityEnrolled = 0;
    if (group.activities.length > 0) {
      for (const activity of group.activities) {
        const existingEnrollments = await prisma.activityEnrollment.findMany({
          where: {
            activity_id: activity.id,
            student_id: {
              in: numericStudentIds,
            },
          },
          select: {
            student_id: true,
          },
        });

        const existingStudentIds = existingEnrollments.map((e) => e.student_id);
        const newStudentIds = numericStudentIds.filter(
          (id: number) => !existingStudentIds.includes(id)
        );

        if (newStudentIds.length > 0) {
          await prisma.activityEnrollment.createMany({
            data: newStudentIds.map((student_id: number) => ({
              activity_id: activity.id,
              student_id,
            })),
          });
          totalActivityEnrolled += newStudentIds.length;
        }
      }
    }

    // 3. Send notification to all enrolled students across all channels
    sendBulkEnrollmentNotifications(numericStudentIds, 'Activity Group', group.name).catch(console.error);

    return sendSuccess(
      res,
      {
        group_id: group.id,
        activities_count: group.activities.length,
        enrolled_group_students: newGroupStudentIds.length,
        enrolled_activity_count: totalActivityEnrolled,
      },
      `Students enrolled in activity group "${group.name}" successfully`,
      201
    );
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get enrolled students for a group (from both Enrollment table and ActivityEnrollment)
export const getGroupEnrollments = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const gId = Number(groupId);

    // 1. Get students enrolled directly in the activity group
    const groupEnrollments = await prisma.enrollment.findMany({
      where: {
        activity_group_id: gId,
        type: 'ACTIVITY_GROUP',
      },
      select: {
        student_id: true,
      },
    });

    // 2. Get students enrolled in any activities in this group
    const activities = await prisma.activity.findMany({
      where: {
        group_id: gId,
      },
      select: {
        id: true,
      },
    });

    let activityStudentIds: number[] = [];
    if (activities.length > 0) {
      const activityIds = activities.map((a) => a.id);
      const enrollments = await prisma.activityEnrollment.findMany({
        where: {
          activity_id: {
            in: activityIds,
          },
        },
        select: {
          student_id: true,
        },
      });
      activityStudentIds = enrollments.map((e) => e.student_id);
    }

    const enrolledStudentIds = Array.from(
      new Set([...groupEnrollments.map((e) => e.student_id), ...activityStudentIds])
    );

    return sendSuccess(res, enrolledStudentIds);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Unenroll student from activity group (removes from both Enrollment and ActivityEnrollment)
export const unenrollStudentFromGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { student_id } = req.body;
    const gId = Number(groupId);
    const sId = Number(student_id);

    // 1. Delete group enrollment
    await prisma.enrollment.deleteMany({
      where: {
        activity_group_id: gId,
        student_id: sId,
        type: 'ACTIVITY_GROUP',
      },
    });

    // 2. Get all activities in the group
    const activities = await prisma.activity.findMany({
      where: {
        group_id: gId,
      },
      select: {
        id: true,
      },
    });

    if (activities.length > 0) {
      const activityIds = activities.map((a) => a.id);

      // Delete all enrollments for this student in all activities of the group
      await prisma.activityEnrollment.deleteMany({
        where: {
          student_id: sId,
          activity_id: {
            in: activityIds,
          },
        },
      });
    }

    return sendSuccess(res, null, 'Student unenrolled from group successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};
