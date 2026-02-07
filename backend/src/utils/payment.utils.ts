import { PrismaClient } from '@prisma/client';
import { sendNotificationAllChannels } from '../services/notification.service.js';

const prisma = new PrismaClient();

interface PaymentScheduleParams {
    userId: number;
    itemName: string;
    price: number;
    frequency: string;
    paymentCount: number; // Number of payments to schedule
    createPaymentRecords: (records: { period: string; due_date: Date; amount: number }[]) => Promise<any>;
}

export const createPaymentSchedule = async ({
    userId,
    itemName,
    price,
    frequency,
    paymentCount,
    createPaymentRecords,
}: PaymentScheduleParams) => {
    try {
        const now = new Date();
        const paymentRecords: { period: string; due_date: Date; amount: number }[] = [];
        const immediateNotifications = [];
        const pendingNotifications = [];

        // Calculate period increment based on frequency
        let periodIncrement = 1; // months
        if (frequency === 'yearly') {
            periodIncrement = 12;
        } else if (frequency === 'quarterly') {
            periodIncrement = 3;
        }

        let currentDate = new Date(now);

        // Default count to 1 if invalid
        const count = paymentCount > 0 ? paymentCount : 12;

        for (let i = 0; i < count; i++) {
            const dueDate = new Date(currentDate);

            const period = frequency === 'monthly'
                ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`
                : frequency === 'yearly'
                    ? `${dueDate.getFullYear()}`
                    : `Q${Math.ceil((dueDate.getMonth() + 1) / 3)}-${dueDate.getFullYear()}`;

            // Create payment record data
            paymentRecords.push({
                period,
                due_date: dueDate,
                amount: price,
            });

            const notificationTitle = `Payment Due: ${itemName} - ${period}`;
            const notificationDesc = `Payment of ₹${price} for ${itemName} (${period}) is due on ${dueDate.toLocaleDateString()}.`;

            if (i === 0) {
                // Immediate notification for first payment
                immediateNotifications.push({
                    user_id: userId,
                    type: 'WARNING' as const,
                    title: notificationTitle,
                    description: notificationDesc,
                });
            } else {
                // Pending notification for future periods
                pendingNotifications.push({
                    user_id: userId,
                    type: 'WARNING' as const,
                    title: notificationTitle,
                    description: notificationDesc,
                    delivery_time: dueDate,
                });
            }

            // Move to next period
            currentDate.setMonth(currentDate.getMonth() + periodIncrement);
        }

        // Execute callback to create payment records in DB (specific to model)
        if (paymentRecords.length > 0) {
            await createPaymentRecords(paymentRecords);
        }

        // Send immediate notifications
        if (immediateNotifications.length > 0) {
            const notificationPromises = immediateNotifications.map(notification =>
                sendNotificationAllChannels(notification)
            );
            await Promise.allSettled(notificationPromises);
        }

        // Create pending notifications
        if (pendingNotifications.length > 0) {
            await prisma.pendingNotification.createMany({
                data: pendingNotifications,
            });
        }

        return {
            paymentRecordsCount: paymentRecords.length,
            immediateNotificationsCount: immediateNotifications.length,
            pendingNotificationsCount: pendingNotifications.length
        };

    } catch (error) {
        console.error('Error creating payment schedule:', error);
        throw error;
    }
};
