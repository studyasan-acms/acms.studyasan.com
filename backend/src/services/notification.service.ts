/**
 * Notification Service
 * 
 * This service handles sending notifications through multiple channels:
 * 1. In-app notifications (stored in database)
 * 2. Push notifications via Firebase Cloud Messaging (FCM)
 * 3. Email notifications via SMTP
 * 
 * How it works:
 * - When a notification is created, it automatically sends through all available channels
 * - In-app notifications are always created
 * - Push notifications are sent if the user has an FCM token registered
 * - Email notifications are sent to the user's registered email address
 * 
 * Usage:
 * - For immediate notifications: Use sendNotificationAllChannels()
 * - For scheduled notifications: Create PendingNotification, processed by NotificationProcessorService
 * - For bulk notifications: Use sendNotificationToMultipleUsers()
 */

import { PrismaClient, NotificationType } from '@prisma/client';
import { sendPushNotification, isFirebaseInitialized } from './firebase.service.js';
import { sendNotificationEmail } from './email.service.js';

const prisma = new PrismaClient();

interface NotificationData {
  user_id: number;
  type: NotificationType;
  title: string;
  description?: string;
}

/**
 * Send notification through all available channels:
 * 1. In-app notification (stored in database)
 * 2. Push notification via FCM (if user has FCM token)
 * 3. Email notification
 */
export const sendNotificationAllChannels = async (
  notificationData: NotificationData
): Promise<void> => {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: notificationData.user_id },
      select: {
        name: true,
        email: true,
        fcm_token: true,
      },
    });

    if (!user) {
      console.error(`User with ID ${notificationData.user_id} not found`);
      return;
    }

    // 1. Create in-app notification (database)
    await prisma.notification.create({
      data: notificationData,
    });
    console.log(`✓ In-app notification created for user ${user.name}`);

    // 2. Send push notification via FCM (if available)
    if (user.fcm_token && isFirebaseInitialized()) {
      try {
        const pushSent = await sendPushNotification(
          user.fcm_token,
          notificationData.title,
          notificationData.description || '',
          { 
            type: notificationData.type,
            url: '/' 
          }
        );
        
        if (pushSent) {
          console.log(`✓ Push notification sent to ${user.name}`);
        } else {
          console.log(`✗ Failed to send push notification to ${user.name}`);
        }
      } catch (error) {
        console.error(`Error sending push notification to ${user.name}:`, error);
      }
    } else {
      console.log(`⊘ Push notification skipped for ${user.name} (${!user.fcm_token ? 'no FCM token' : 'Firebase not initialized'})`);
    }

    // 3. Send email notification
    try {
      const emailSent = await sendNotificationEmail(
        user.email,
        user.name,
        notificationData.title,
        notificationData.description || '',
        notificationData.type
      );
      
      if (emailSent) {
        console.log(`✓ Email notification sent to ${user.email}`);
      } else {
        console.log(`✗ Failed to send email notification to ${user.email}`);
      }
    } catch (error) {
      console.error(`Error sending email notification to ${user.email}:`, error);
    }

  } catch (error) {
    console.error('Error in sendNotificationAllChannels:', error);
    throw error;
  }
};

/**
 * Send notifications to multiple users
 */
export const sendNotificationToMultipleUsers = async (
  userIds: number[],
  notificationData: Omit<NotificationData, 'user_id'>
): Promise<void> => {
  const promises = userIds.map(userId =>
    sendNotificationAllChannels({
      ...notificationData,
      user_id: userId,
    })
  );

  await Promise.allSettled(promises);
};

/**
 * Send enrollment notification to a student across all channels (In-app, Push, Email)
 */
export const sendEnrollmentNotification = async (
  studentId: number,
  entityType: string,
  entityName: string
): Promise<void> => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      include: { user: true },
    });

    if (!student || !student.user) {
      console.warn(`Cannot send enrollment notification: Student ID ${studentId} or user not found`);
      return;
    }

    await sendNotificationAllChannels({
      user_id: student.user.id,
      type: NotificationType.SUCCESS,
      title: `Enrolled in ${entityType}`,
      description: `You have been enrolled in ${entityType}: "${entityName}". You can now access your learning resources and activities.`,
    });
  } catch (error) {
    console.error(`Error sending enrollment notification for student ${studentId}:`, error);
  }
};

/**
 * Send enrollment notifications to multiple students across all channels
 */
export const sendBulkEnrollmentNotifications = async (
  studentIds: number[],
  entityType: string,
  entityName: string
): Promise<void> => {
  try {
    const numericIds = studentIds.map(Number).filter((id) => !isNaN(id) && id > 0);
    if (numericIds.length === 0) return;

    const students = await prisma.student.findMany({
      where: { id: { in: numericIds } },
      include: { user: true },
    });

    const promises = students
      .filter((s) => s.user)
      .map((student) =>
        sendNotificationAllChannels({
          user_id: student.user.id,
          type: NotificationType.SUCCESS,
          title: `Enrolled in ${entityType}`,
          description: `You have been enrolled in ${entityType}: "${entityName}". You can now access your learning resources and activities.`,
        }).catch((err) => {
          console.error(`Error sending notification to student ${student.id}:`, err);
        })
      );

    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error in sendBulkEnrollmentNotifications:', error);
  }
};
