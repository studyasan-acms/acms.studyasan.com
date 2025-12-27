import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

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

// Enroll Students to Activity Group (all activities in the group)
export const enrollStudentsToGroup = async (req: Request, res: Response) => {
  try {
    const { group_id, student_ids } = req.body;

    // Check if group exists
    const group = await prisma.activityGroup.findUnique({
      where: { id: Number(group_id) },
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

    if (group.activities.length === 0) {
      return sendError(res, 'No published activities in this group', 400);
    }

    let totalEnrolled = 0;

    // Enroll each student to all published activities in the group
    for (const activity of group.activities) {
      // Get existing enrollments for this activity
      const existingEnrollments = await prisma.activityEnrollment.findMany({
        where: {
          activity_id: activity.id,
          student_id: {
            in: student_ids.map(Number),
          },
        },
        select: {
          student_id: true,
        },
      });

      const existingStudentIds = existingEnrollments.map((e) => e.student_id);
      const newStudentIds = student_ids.filter(
        (id: number) => !existingStudentIds.includes(Number(id))
      );

      if (newStudentIds.length > 0) {
        await prisma.activityEnrollment.createMany({
          data: newStudentIds.map((student_id: number) => ({
            activity_id: activity.id,
            student_id: Number(student_id),
          })),
        });
        totalEnrolled += newStudentIds.length;
      }
    }

    return sendSuccess(
      res,
      {
        group_id: group.id,
        activities_count: group.activities.length,
        enrolled_count: totalEnrolled,
      },
      `Students enrolled to ${group.activities.length} activities in the group`,
      201
    );
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get enrolled students for a group
export const getGroupEnrollments = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    // Get all activities in the group
    const activities = await prisma.activity.findMany({
      where: {
        group_id: Number(groupId),
        is_published: true,
      },
      select: {
        id: true,
      },
    });

    if (activities.length === 0) {
      return sendSuccess(res, []);
    }

    const activityIds = activities.map((a) => a.id);

    // Get all enrollments for these activities
    const enrollments = await prisma.activityEnrollment.findMany({
      where: {
        activity_id: {
          in: activityIds,
        },
      },
      select: {
        student_id: true,
      },
      distinct: ['student_id'],
    });

    const enrolledStudentIds = enrollments.map((e) => e.student_id);
    return sendSuccess(res, enrolledStudentIds);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Unenroll student from activity group
export const unenrollStudentFromGroup = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { student_id } = req.body;

    // Get all activities in the group
    const activities = await prisma.activity.findMany({
      where: {
        group_id: Number(groupId),
      },
      select: {
        id: true,
      },
    });

    if (activities.length === 0) {
      return sendError(res, 'No activities found in this group', 404);
    }

    const activityIds = activities.map((a) => a.id);

    // Delete all enrollments for this student in all activities of the group
    await prisma.activityEnrollment.deleteMany({
      where: {
        student_id: Number(student_id),
        activity_id: {
          in: activityIds,
        },
      },
    });

    return sendSuccess(res, null, 'Student unenrolled from group successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};
