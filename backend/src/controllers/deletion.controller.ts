import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendNotificationAllChannels } from '../services/notification.service.js';

const prisma = new PrismaClient();

// Request account deletion (for students/teachers)
export const requestDeletion = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        delete_requested: true,
        delete_verified: true 
      },
    });

    if (!existingUser) {
      return sendError(res, 'User not found', 404);
    }

    if (existingUser.role === 'ADMIN') {
      return sendError(res, 'Admin accounts cannot request deletion', 403);
    }

    if (existingUser.delete_requested) {
      return sendError(res, 'Deletion already requested for this account', 400);
    }

    // Update user to mark deletion as requested
    await prisma.user.update({
      where: { id: userId },
      data: {
        delete_requested: true,
        delete_requested_at: new Date(),
      },
    });

    // Get all admin users to notify them
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    // Create notifications for all admins
    const adminNotifications = admins.map(admin => ({
      user_id: admin.id,
      type: 'INFO' as const,
      title: 'Account Deletion Request',
      description: `${existingUser.name} (${existingUser.email}) has requested to delete their account.`,
    }));

    // Send notifications to all admins via all channels (in-app, FCM, email)
    const notificationPromises = adminNotifications.map(notification =>
      sendNotificationAllChannels(notification)
    );
    await Promise.allSettled(notificationPromises);

    sendSuccess(res, null, 'Account deletion requested successfully. Admins have been notified.');
  } catch (error: any) {
    console.error('Request deletion error:', error);
    sendError(res, 'Failed to request account deletion', 500);
  }
};

// Get all deletion requests (for admins)
export const getDeletionRequests = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;

    if (userRole !== 'ADMIN') {
      return sendError(res, 'Access denied. Admin role required.', 403);
    }

    const deletionRequests = await prisma.user.findMany({
      where: {
        delete_requested: true,
        role: { not: 'ADMIN' }, // Don't include admin accounts
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        delete_requested: true,
        delete_verified: true,
        delete_requested_at: true,
        created_at: true,
      },
      orderBy: {
        delete_requested_at: 'desc',
      },
    });

    sendSuccess(res, deletionRequests, 'Deletion requests retrieved successfully');
  } catch (error: any) {
    console.error('Get deletion requests error:', error);
    sendError(res, 'Failed to retrieve deletion requests', 500);
  }
};

// Verify/approve account deletion (for admins)
export const verifyDeletion = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const { userId } = req.params;

    if (userRole !== 'ADMIN') {
      return sendError(res, 'Access denied. Admin role required.', 403);
    }

    if (!userId) {
      return sendError(res, 'User ID is required', 400);
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        delete_requested: true,
        delete_verified: true,
      },
    });

    if (!userToDelete) {
      return sendError(res, 'User not found', 404);
    }

    if (!userToDelete.delete_requested) {
      return sendError(res, 'No deletion request found for this user', 400);
    }

    if (userToDelete.delete_verified) {
      return sendError(res, 'Deletion already verified for this user', 400);
    }

    if (userToDelete.role === 'ADMIN') {
      return sendError(res, 'Admin accounts cannot be deleted', 403);
    }

    if (!userId) {
      return sendError(res, 'User ID is required', 400);
    }

    // Mark deletion as verified
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        delete_verified: true,
      },
    });

    // Notify the user via all channels (in-app, FCM, email)
    await sendNotificationAllChannels({
      user_id: parseInt(userId),
      type: 'SUCCESS',
      title: 'Account Deletion Approved',
      description: 'Your account deletion request has been approved. Your account will be deleted permanently.',
    });

    sendSuccess(res, null, 'Account deletion verified successfully');
  } catch (error: any) {
    console.error('Verify deletion error:', error);
    sendError(res, 'Failed to verify account deletion', 500);
  }
};

// Cancel deletion request
export const cancelDeletion = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        delete_requested: true,
        delete_verified: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (!user.delete_requested) {
      return sendError(res, 'No deletion request found to cancel', 400);
    }

    if (user.delete_verified) {
      return sendError(res, 'Cannot cancel verified deletion request', 400);
    }

    // Cancel the deletion request
    await prisma.user.update({
      where: { id: userId },
      data: {
        delete_requested: false,
        delete_requested_at: null,
      },
    });

    sendSuccess(res, null, 'Deletion request cancelled successfully');
  } catch (error: any) {
    console.error('Cancel deletion error:', error);
    sendError(res, 'Failed to cancel deletion request', 500);
  }
};

// Delete user account (final step - for admins only)
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const { userId } = req.params;

    if (userRole !== 'ADMIN') {
      return sendError(res, 'Access denied. Admin role required.', 403);
    }

    if (!userId) {
      return sendError(res, 'User ID is required', 400);
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        delete_requested: true,
        delete_verified: true,
      },
    });

    if (!userToDelete) {
      return sendError(res, 'User not found', 404);
    }

    if (!userToDelete.delete_requested || !userToDelete.delete_verified) {
      return sendError(res, 'User deletion must be requested and verified before deletion', 400);
    }

    if (userToDelete.role === 'ADMIN') {
      return sendError(res, 'Admin accounts cannot be deleted', 403);
    }

    // Delete the user account (cascade will handle related records)
    await prisma.user.delete({
      where: { id: parseInt(userId) },
    });

    sendSuccess(res, null, `User account ${userToDelete.email} deleted successfully`);
  } catch (error: any) {
    console.error('Delete user account error:', error);
    sendError(res, 'Failed to delete user account', 500);
  }
};