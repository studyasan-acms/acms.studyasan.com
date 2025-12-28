import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

// Create Activity Group
export const createActivityGroup = async (req: Request, res: Response) => {
  try {
    const { name, description, cover_image } = req.body;
    const userId = (req as any).user.id;

    const activityGroup = await prisma.activityGroup.create({
      data: {
        name,
        description,
        cover_image,
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

    const where: any = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
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
        activities: {
          include: {
            _count: {
              select: {
                enrollments: true,
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
    const { name, description, cover_image, is_active } = req.body;

    const activityGroup = await prisma.activityGroup.update({
      where: { id: Number(id) },
      data: {
        name,
        description,
        cover_image,
        is_active,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
