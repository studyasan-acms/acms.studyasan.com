import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendPushNotification, sendMulticastNotification, isFirebaseInitialized } from '../services/firebase.service.js';

const prisma = new PrismaClient();

/**
 * Subscribe to push notifications
 * Saves the FCM token to the user's profile
 */
export const subscribeToNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const { fcm_token } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    if (!fcm_token) {
      return sendError(res, 'FCM token is required', 400);
    }

    // Update user's FCM token
    await prisma.user.update({
      where: { id: userId },
      data: { fcm_token },
    });

    sendSuccess(res, null, 'Successfully subscribed to push notifications');
  } catch (error: any) {
    console.error('Subscribe to notifications error:', error);
    sendError(res, error.message, 500);
  }
};

/**
 * Unsubscribe from push notifications
 * Removes the FCM token from the user's profile
 */
export const unsubscribeFromNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    // Remove user's FCM token
    await prisma.user.update({
      where: { id: userId },
      data: { fcm_token: null },
    });

    sendSuccess(res, null, 'Successfully unsubscribed from push notifications');
  } catch (error: any) {
    console.error('Unsubscribe from notifications error:', error);
    sendError(res, error.message, 500);
  }
};

/**
 * Send a test notification to the current user
 */
export const sendTestNotification = async (req: AuthRequest, res: Response) => {
  try {
    // Check if Firebase is initialized
    if (!isFirebaseInitialized()) {
      return sendError(
        res, 
        'Push notifications are not configured. Please set up Firebase Admin SDK in the backend .env file with FIREBASE_SERVICE_ACCOUNT.', 
        503
      );
    }

    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    // Get user's FCM token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcm_token: true, name: true },
    });

    if (!user?.fcm_token) {
      return sendError(res, 'No FCM token found. Please enable notifications first.', 400);
    }

    // Send test notification
    const success = await sendPushNotification(
      user.fcm_token,
      'Test Notification',
      `Hi ${user.name}! Your push notifications are working correctly! 🎉`,
      { url: '/' }
    );

    if (success) {
      sendSuccess(res, null, 'Test notification sent successfully');
    } else {
      sendError(res, 'Failed to send test notification', 500);
    }
  } catch (error: any) {
    console.error('Send test notification error:', error);
    sendError(res, error.message, 500);
  }
};

/**
 * Send notification to specific users (Admin only)
 */
export const sendNotificationToUsers = async (req: AuthRequest, res: Response) => {
  try {
    // Check if Firebase is initialized
    if (!isFirebaseInitialized()) {
      return sendError(
        res, 
        'Push notifications are not configured. Please set up Firebase Admin SDK in the backend .env file with FIREBASE_SERVICE_ACCOUNT.', 
        503
      );
    }

    const { user_ids, title, body, url } = req.body;
    const senderRole = req.user?.role;

    if (senderRole !== 'ADMIN' && senderRole !== 'TEACHER') {
      return sendError(res, 'Unauthorized. Only admins and teachers can send notifications.', 403);
    }

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return sendError(res, 'User IDs array is required', 400);
    }

    if (!title || !body) {
      return sendError(res, 'Title and body are required', 400);
    }

    // Get FCM tokens for the specified users
    const users = await prisma.user.findMany({
      where: {
        id: { in: user_ids },
        fcm_token: { not: null },
      },
      select: { fcm_token: true },
    });

    const fcmTokens = users
      .map((u) => u.fcm_token)
      .filter((token): token is string => token !== null);

    if (fcmTokens.length === 0) {
      return sendError(res, 'No users with valid FCM tokens found', 404);
    }

    // Send multicast notification
    const result = await sendMulticastNotification(
      fcmTokens,
      title,
      body,
      url ? { url } : undefined
    );

    sendSuccess(
      res,
      result,
      `Notification sent to ${result.successCount} users. ${result.failureCount} failed.`
    );
  } catch (error: any) {
    console.error('Send notification to users error:', error);
    sendError(res, error.message, 500);
  }
};

/**
 * Send notification to all users by role (Admin only)
 */
export const sendNotificationToRole = async (req: AuthRequest, res: Response) => {
  try {
    // Check if Firebase is initialized
    if (!isFirebaseInitialized()) {
      return sendError(
        res, 
        'Push notifications are not configured. Please set up Firebase Admin SDK in the backend .env file with FIREBASE_SERVICE_ACCOUNT.', 
        503
      );
    }

    const { role, title, body, url } = req.body;
    const senderRole = req.user?.role;

    if (senderRole !== 'ADMIN') {
      return sendError(res, 'Unauthorized. Only admins can send role-based notifications.', 403);
    }

    if (!role) {
      return sendError(res, 'Role is required', 400);
    }

    if (!title || !body) {
      return sendError(res, 'Title and body are required', 400);
    }

    // Get FCM tokens for all users with the specified role
    const users = await prisma.user.findMany({
      where: {
        role,
        fcm_token: { not: null },
      },
      select: { fcm_token: true },
    });

    const fcmTokens = users
      .map((u) => u.fcm_token)
      .filter((token): token is string => token !== null);

    if (fcmTokens.length === 0) {
      return sendError(res, `No ${role} users with valid FCM tokens found`, 404);
    }

    // Send multicast notification
    const result = await sendMulticastNotification(
      fcmTokens,
      title,
      body,
      url ? { url } : undefined
    );

    sendSuccess(
      res,
      result,
      `Notification sent to ${result.successCount} ${role} users. ${result.failureCount} failed.`
    );
  } catch (error: any) {
    console.error('Send notification to role error:', error);
    sendError(res, error.message, 500);
  }
};
