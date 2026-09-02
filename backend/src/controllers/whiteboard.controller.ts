import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

/**
 * Get all saved whiteboards (filtered by role)
 */
export const getSavedWhiteboards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;
    const { search, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {};

    if (userRole === 'ADMIN') {
      if (search) {
        whereClause.title = { contains: (search as string).trim(), mode: 'insensitive' };
      }
    } else if (userRole === 'TEACHER') {
      whereClause.user_id = userId;
      if (search) {
        whereClause.title = { contains: (search as string).trim(), mode: 'insensitive' };
      }
    } else {
      return sendError(res, 'Access denied: Admin or Teacher role required', 403);
    }

    const [whiteboards, total] = await Promise.all([
      prisma.savedWhiteboard.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          updated_at: 'desc',
        },
        skip,
        take: limitNum,
      }),
      prisma.savedWhiteboard.count({ where: whereClause }),
    ]);

    return sendSuccess(
      res,
      {
        whiteboards,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
      'Saved whiteboards fetched successfully'
    );
  } catch (error) {
    console.error('Error fetching saved whiteboards:', error);
    return sendError(res, 'Failed to fetch saved whiteboards');
  }
};

/**
 * Get a single saved whiteboard by ID with full stroke data
 */
export const getSavedWhiteboardById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    if (!id) {
      return sendError(res, 'Whiteboard ID is required', 400);
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return sendError(res, 'Valid Whiteboard ID is required', 400);
    }

    const whiteboard = await prisma.savedWhiteboard.findUnique({
      where: { id: parsedId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!whiteboard) {
      return sendError(res, 'Whiteboard not found', 404);
    }

    if (userRole !== 'ADMIN' && whiteboard.user_id !== userId) {
      return sendError(res, 'You do not have access to this whiteboard', 403);
    }

    return sendSuccess(res, whiteboard, 'Whiteboard fetched successfully');
  } catch (error) {
    console.error('Error fetching whiteboard by id:', error);
    return sendError(res, 'Failed to fetch whiteboard');
  }
};

/**
 * Create a new saved whiteboard
 */
export const createSavedWhiteboard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { title, strokes, thumbnail } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return sendError(res, 'Title is required', 400);
    }

    const whiteboard = await prisma.savedWhiteboard.create({
      data: {
        title: title.trim(),
        user_id: userId,
        strokes: strokes || [],
        thumbnail: thumbnail || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return sendSuccess(res, whiteboard, 'Whiteboard created successfully', 201);
  } catch (error) {
    console.error('Error creating saved whiteboard:', error);
    return sendError(res, 'Failed to create whiteboard');
  }
};

/**
 * Update an existing saved whiteboard (strokes, title, thumbnail)
 */
export const updateSavedWhiteboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;
    const { title, strokes, thumbnail } = req.body;

    if (!id) {
      return sendError(res, 'Whiteboard ID is required', 400);
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return sendError(res, 'Valid Whiteboard ID is required', 400);
    }

    const existing = await prisma.savedWhiteboard.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return sendError(res, 'Whiteboard not found', 404);
    }

    if (userRole !== 'ADMIN' && existing.user_id !== userId) {
      return sendError(res, 'You are not authorized to update this whiteboard', 403);
    }

    const updateData: any = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return sendError(res, 'Title cannot be empty', 400);
      }
      updateData.title = title.trim();
    }

    if (strokes !== undefined) {
      updateData.strokes = strokes;
    }

    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail;
    }

    const updated = await prisma.savedWhiteboard.update({
      where: { id: parsedId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return sendSuccess(res, updated, 'Whiteboard updated successfully');
  } catch (error) {
    console.error('Error updating saved whiteboard:', error);
    return sendError(res, 'Failed to update whiteboard');
  }
};

/**
 * Delete a saved whiteboard
 */
export const deleteSavedWhiteboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    if (!id) {
      return sendError(res, 'Whiteboard ID is required', 400);
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return sendError(res, 'Valid Whiteboard ID is required', 400);
    }

    const existing = await prisma.savedWhiteboard.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return sendError(res, 'Whiteboard not found', 404);
    }

    if (userRole !== 'ADMIN' && existing.user_id !== userId) {
      return sendError(res, 'Only Admin or the creator can delete this whiteboard', 403);
    }

    await prisma.savedWhiteboard.delete({
      where: { id: parsedId },
    });

    return sendSuccess(res, { id: parsedId }, 'Whiteboard deleted successfully');
  } catch (error) {
    console.error('Error deleting saved whiteboard:', error);
    return sendError(res, 'Failed to delete whiteboard');
  }
};
