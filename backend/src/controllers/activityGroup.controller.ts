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
