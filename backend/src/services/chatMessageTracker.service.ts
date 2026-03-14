import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seenByMessage = new Map<number, Set<number>>();
const delayedNotificationTimers = new Map<string, NodeJS.Timeout>();

const timerKey = (messageId: number, userId: number) => `${messageId}:${userId}`;

export const markMessageSeen = (messageId: number, userId: number) => {
  if (!seenByMessage.has(messageId)) {
    seenByMessage.set(messageId, new Set<number>());
  }
  seenByMessage.get(messageId)!.add(userId);

  const key = timerKey(messageId, userId);
  const timer = delayedNotificationTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    delayedNotificationTimers.delete(key);
  }
};

export const scheduleUnreadMessageNotifications = (params: {
  messageId: number;
  senderId: number;
  senderName: string;
  content?: string | null;
  messageType?: string;
  recipientIds: number[];
}) => {
  const { messageId, senderId, senderName, content, messageType, recipientIds } = params;

  recipientIds
    .filter((recipientId) => recipientId !== senderId)
    .forEach((recipientId) => {
      const key = timerKey(messageId, recipientId);

      if (delayedNotificationTimers.has(key)) {
        clearTimeout(delayedNotificationTimers.get(key)!);
      }

      const timer = setTimeout(async () => {
        try {
          const seenUsers = seenByMessage.get(messageId);
          const hasSeen = !!seenUsers?.has(recipientId);

          if (!hasSeen) {
            const fallbackText = messageType && messageType !== 'TEXT'
              ? `Sent a ${messageType.toLowerCase()}`
              : 'Sent you a new message';

            const description = (content && content.trim())
              ? content.trim().slice(0, 180)
              : fallbackText;

            await prisma.notification.create({
              data: {
                user_id: recipientId,
                type: 'INFO',
                title: `New message from ${senderName}`,
                description,
                is_read: false,
              },
            });
          }
        } catch (error) {
          console.error('Failed to create delayed chat notification:', error);
        } finally {
          delayedNotificationTimers.delete(key);
          if (delayedNotificationTimers.size === 0) {
            seenByMessage.delete(messageId);
          }
        }
      }, 30_000);

      delayedNotificationTimers.set(key, timer);
    });
};
