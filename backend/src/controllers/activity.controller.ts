import type { Request, Response } from 'express';
import { PrismaClient, ActivityType } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

// Create Activity
export const createActivity = async (req: Request, res: Response) => {
  try {
    const {
      group_id,
      title,
      description,
      instructions,
      cover_image,
      activity_type,
      difficulty,
      estimated_time,
      points,
      items,
    } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // If user is TEACHER, check if they are assigned to the group
    if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      if (!teacher) {
        return sendError(res, 'Teacher profile not found', 404);
      }
      const isAssigned = await prisma.activityGroupTeacherJunction.findFirst({
        where: {
          activity_group_id: Number(group_id),
          teacher_id: teacher.id,
        },
      });
      if (!isAssigned) {
        return sendError(res, 'You are not assigned to this activity group', 403);
      }
    }

    const activity = await prisma.activity.create({
      data: {
        group_id: Number(group_id),
        title,
        description,
        instructions,
        cover_image,
        activity_type: activity_type as ActivityType,
        difficulty,
        estimated_time,
        points: points || 100,
        created_by: userId,
        items: {
          create: items.map((item: any, index: number) => ({
            content: item.content,
            order: index + 1,
            points: item.points || 10,
          })),
        },
      },
      include: {
        group: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return sendSuccess(res, activity, 'Activity created successfully', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get all Activities
export const getAllActivities = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, group_id, activity_type, difficulty, is_published } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    const where: any = {};
    if (group_id) where.group_id = Number(group_id);
    if (activity_type) where.activity_type = activity_type;
    if (difficulty) where.difficulty = difficulty;
    if (is_published !== undefined) where.is_published = is_published === 'true';

    // If user is TEACHER, check if they have 'activityGroups.view' permission (elevated access).
    // If they do, show all activities (same as admin). Otherwise restrict to their assigned groups.
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

      if (!hasViewAllPermission) {
        // Plain teacher: restrict to activities within their assigned groups only
        const teacherGroups = await prisma.activityGroupTeacherJunction.findMany({
          where: { teacher_id: teacher.id },
          select: { activity_group_id: true },
        });
        const groupIds = teacherGroups.map(tg => tg.activity_group_id);
        where.group_id = { in: groupIds };
      }
      // else: hasViewAllPermission — no group_id filter applied, teacher sees everything
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          group: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              items: true,
              enrollments: true,
              attempts: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return sendSuccess(res, {
      activities,
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

// Get Activity by ID
export const getActivityById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const activity = await prisma.activity.findUnique({
      where: { id: Number(id) },
      include: {
        group: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            enrollments: true,
            attempts: true,
          },
        },
      },
    });

    if (!activity) {
      return sendError(res, 'Activity not found', 404);
    }

    return sendSuccess(res, activity);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Update Activity
export const updateActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Get the activity to check group
    const existingActivity = await prisma.activity.findUnique({
      where: { id: Number(id) },
      select: { group_id: true },
    });

    if (!existingActivity) {
      return sendError(res, 'Activity not found', 404);
    }

    // If user is TEACHER, check if they are assigned to the group
    if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      if (!teacher) {
        return sendError(res, 'Teacher profile not found', 404);
      }
      const isAssigned = await prisma.activityGroupTeacherJunction.findFirst({
        where: {
          activity_group_id: existingActivity.group_id,
          teacher_id: teacher.id,
        },
      });
      if (!isAssigned) {
        return sendError(res, 'You are not assigned to this activity group', 403);
      }
    }

    const {
      title,
      description,
      instructions,
      cover_image,
      activity_type,
      difficulty,
      estimated_time,
      points,
      is_published,
      items,
    } = req.body;

    // Delete existing items if new items are provided
    if (items) {
      await prisma.activityItem.deleteMany({
        where: { activity_id: Number(id) },
      });
    }

    const activity = await prisma.activity.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        instructions,
        cover_image,
        activity_type,
        difficulty,
        estimated_time,
        points,
        is_published,
        ...(items && {
          items: {
            create: items.map((item: any, index: number) => ({
              content: item.content,
              order: index + 1,
              points: item.points || 10,
            })),
          },
        }),
      },
      include: {
        group: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return sendSuccess(res, activity, 'Activity updated successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Delete Activity
export const deleteActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Get the activity to check group
    const existingActivity = await prisma.activity.findUnique({
      where: { id: Number(id) },
      select: { group_id: true },
    });

    if (!existingActivity) {
      return sendError(res, 'Activity not found', 404);
    }

    // If user is TEACHER, check if they are assigned to the group
    if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      if (!teacher) {
        return sendError(res, 'Teacher profile not found', 404);
      }
      const isAssigned = await prisma.activityGroupTeacherJunction.findFirst({
        where: {
          activity_group_id: existingActivity.group_id,
          teacher_id: teacher.id,
        },
      });
      if (!isAssigned) {
        return sendError(res, 'You are not assigned to this activity group', 403);
      }
    }

    await prisma.activity.delete({
      where: { id: Number(id) },
    });

    return sendSuccess(res, null, 'Activity deleted successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Publish/Unpublish Activity
export const togglePublishActivity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;

    // Get the activity to check group
    const existingActivity = await prisma.activity.findUnique({
      where: { id: Number(id) },
      select: { group_id: true },
    });

    if (!existingActivity) {
      return sendError(res, 'Activity not found', 404);
    }

    // If user is TEACHER, check if they are assigned to the group
    if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        select: { id: true },
      });
      if (!teacher) {
        return sendError(res, 'Teacher profile not found', 404);
      }
      const isAssigned = await prisma.activityGroupTeacherJunction.findFirst({
        where: {
          activity_group_id: existingActivity.group_id,
          teacher_id: teacher.id,
        },
      });
      if (!isAssigned) {
        return sendError(res, 'You are not assigned to this activity group', 403);
      }
    }

    const activity = await prisma.activity.update({
      where: { id: Number(id) },
      data: {
        is_published,
      },
    });

    return sendSuccess(
      res,
      activity,
      `Activity ${is_published ? 'published' : 'unpublished'} successfully`
    );
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Activities for Student
export const getActivitiesForStudent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, activity_type, difficulty } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get student
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Find groups where student is enrolled in at least one published activity
    const enrolledGroups = await prisma.activityEnrollment.findMany({
      where: {
        student_id: student.id,
        activity: {
          is_published: true,
        },
      },
      select: {
        activity: {
          select: {
            group_id: true,
          },
        },
      },
    });

    // Find activity groups the student is directly enrolled in
    const groupEnrollments = await prisma.enrollment.findMany({
      where: {
        student_id: student.id,
        type: 'ACTIVITY_GROUP',
        activity_group_id: {
          not: null,
        },
      },
      select: {
        activity_group_id: true,
      },
    });

    const groupIdsFromActivities = enrolledGroups.map(eg => eg.activity.group_id);
    const groupIdsFromGroups = groupEnrollments.map(ge => ge.activity_group_id).filter((id): id is number => id !== null);
    
    const groupIds = [...new Set([...groupIdsFromActivities, ...groupIdsFromGroups])];

    const where: any = {
      is_published: true,
      group_id: {
        in: groupIds,
      },
    };
    if (activity_type) where.activity_type = activity_type;
    if (difficulty) where.difficulty = difficulty;

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          group: true,
          items: {
            orderBy: {
              order: 'asc',
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
          enrollments: {
            where: {
              student_id: student.id,
            },
          },
          attempts: {
            where: {
              student_id: student.id,
              is_completed: true,
            },
            select: {
              score: true,
              max_score: true,
              time_taken: true,
              completed_at: true,
            },
            orderBy: {
              score: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.activity.count({ where }),
    ]);

    return sendSuccess(res, {
      activities,
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

// Generate Activity Content with AI
export const generateActivityContent = async (req: Request, res: Response) => {
  try {
    const { activity_type, topic, difficulty, count } = req.body;

    if (!activity_type || !topic || !difficulty) {
      return sendError(res, "Activity type, topic, and difficulty are required", 400);
    }

    const { generateActivityContent } = await import("../utils/ai.js");

    const result = await generateActivityContent({
      activityType: activity_type,
      topic,
      difficulty,
      count: count || 5,
    });

    return sendSuccess(res, result);
  } catch (error: any) {
    console.error("AI generation error:", error);
    return sendError(res, error.message || "Failed to generate activity content");
  }
};