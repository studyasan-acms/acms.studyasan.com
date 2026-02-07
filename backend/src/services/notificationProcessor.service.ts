import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendNotificationAllChannels } from './notification.service.js';

const prisma = new PrismaClient();

export class NotificationProcessorService {
  static start() {
    // Run every minute to check for pending notifications ready for delivery
    cron.schedule('* * * * *', async () => {
      await this.processPendingNotifications();
    });

    console.log('Notification processor started - Checking for pending notifications every minute');
  }

  static async processPendingNotifications() {
    try {
      const now = new Date();

      // Get all pending notifications that are ready for delivery
      const pendingNotifications = await prisma.pendingNotification.findMany({
        where: {
          delivery_time: {
            lte: now,
          },
          status: 'PENDING',
        },
      });

      if (pendingNotifications.length === 0) {
        return;
      }

      console.log(`Processing ${pendingNotifications.length} pending notifications`);

      // Send each notification via all channels (in-app, push, email)
      const promises = pendingNotifications.map(pending =>
        sendNotificationAllChannels({
          user_id: pending.user_id,
          type: pending.type,
          title: pending.title,
          description: pending.description || '',
        })
      );

      // Process all notifications concurrently
      await Promise.allSettled(promises);

      // Mark pending notifications as delivered
      const pendingIds = pendingNotifications.map(p => p.id);
      await prisma.pendingNotification.updateMany({
        where: {
          id: {
            in: pendingIds,
          },
        },
        data: {
          status: 'DELIVERED',
        },
      });

      console.log(`Delivered ${pendingNotifications.length} notifications via all channels`);
    } catch (error) {
      console.error('Error processing pending notifications:', error);
    }
  }

  // Method to cancel pending notifications (when payment is made)
  static async cancelPendingNotifications(userId: number, title: string) {
    try {
      await prisma.pendingNotification.updateMany({
        where: {
          user_id: userId,
          title: title,
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
        },
      });
      console.log(`Cancelled pending notifications for user ${userId} with title: ${title}`);
    } catch (error) {
      console.error('Error cancelling pending notifications:', error);
    }
  }
}