import type { Response, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import type { AuthRequest } from '../types/index.js';
import { sendNotificationAllChannels } from '../services/notification.service.js';

const prisma = new PrismaClient();

export const getAllNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );
    
    const { is_read, type } = req.query;
    
    const where: any = {
      user_id: req.user!.id,
    };
    
    if (is_read !== undefined) where.is_read = is_read === 'true';
    if (type) where.type = type;
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);
    
    const response = createPaginatedResponse(notifications, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getNotificationById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id!),
        user_id: req.user!.id,
      },
    });
    
    if (!notification) {
      return sendError(res, 'Notification not found', 404);
    }
    
    sendSuccess(res, notification);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const { user_id, type, title, description } = req.body;
    
    // Send notification through all channels (in-app, push, email)
    await sendNotificationAllChannels({
      user_id,
      type,
      title,
      description,
    });
    
    sendSuccess(res, null, 'Notification sent successfully via all channels', 201);
  } catch (error: any) {
    console.error('Create notification error:', error);
    sendError(res, error.message, 500);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.updateMany({
      where: {
        id: parseInt(id!),
        user_id: req.user!.id,
      },
      data: {
        is_read: true,
      },
    });
    
    if (notification.count === 0) {
      return sendError(res, 'Notification not found', 404);
    }
    
    sendSuccess(res, null, 'Notification marked as read');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: {
        user_id: req.user!.id,
        is_read: false,
      },
      data: {
        is_read: true,
      },
    });
    
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const notification = await prisma.notification.deleteMany({
      where: {
        id: parseInt(id!),
        user_id: req.user!.id,
      },
    });
    
    if (notification.count === 0) {
      return sendError(res, 'Notification not found', 404);
    }
    
    sendSuccess(res, null, 'Notification deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};