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

interface OneTimePaymentParams {
    enrollmentId: number;
    amount: number;
    userId: number;
    itemName: string;
    type: 'SUBJECT' | 'TEST_SERIES' | 'ACTIVITY_GROUP';
    dueDate?: Date | undefined;
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
        } else if (frequency === 'semi_yearly') {
            periodIncrement = 6;
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
                : frequency === 'semi_yearly'
                    ? `H${dueDate.getMonth() < 6 ? 1 : 2}-${dueDate.getFullYear()}`
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

export const createOneTimePayment = async ({
    enrollmentId,
    amount,
    userId,
    itemName,
    type,
    dueDate,
}: OneTimePaymentParams) => {
    try {
        const now = new Date();
        const paymentDueDate = dueDate || new Date(now); // Due date from params or immediately

        // Create single payment record
        await prisma.payment.create({
            data: {
                enrollment_id: enrollmentId,
                type,
                period: 'ONE_TIME',
                due_date: paymentDueDate,
                amount,
                is_paid: false,
            },
        });

        // Send immediate notification only for non-zero amounts
        if (amount <= 0) {
            return { paymentCreated: true, notificationSent: false };
        }

        const notificationTitle = `Payment Due: ${itemName}`;
        const notificationDesc = `Payment of ₹${amount} for ${itemName} is due immediately.`;

        await sendNotificationAllChannels({
            user_id: userId,
            type: 'WARNING',
            title: notificationTitle,
            description: notificationDesc,
        });

        return {
            paymentCreated: true,
            notificationSent: true,
        };

    } catch (error) {
        console.error('Error creating one-time payment:', error);
        throw error;
    }
};

/**
 * Helper to generate unique sequential invoice number (e.g. SA-2026-00001).
 * Inspects existing invoice numbers for the current year to find the true max sequence,
 * ensuring no duplicate key errors if invoices were deleted or created concurrently.
 */
export async function generateInvoiceNumber(prismaClient?: PrismaClient): Promise<string> {
    const db = prismaClient || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `SA-${currentYear}-`;

    const recentInvoices = await db.invoice.findMany({
        where: {
            invoice_number: {
                startsWith: prefix,
            },
        },
        orderBy: {
            id: 'desc',
        },
        take: 50,
        select: {
            invoice_number: true,
        },
    });

    let maxSeq = 0;
    for (const inv of recentInvoices) {
        if (inv.invoice_number) {
            const parts = inv.invoice_number.split('-');
            const lastPart = parts[parts.length - 1] ?? '';
            const num = parseInt(lastPart, 10);
            if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
            }
        }
    }

    const totalCount = await db.invoice.count({
        where: {
            invoice_number: {
                startsWith: prefix,
            },
        },
    });

    let candidateSeq = Math.max(maxSeq, totalCount) + 1;
    let invoiceNumber = `${prefix}${String(candidateSeq).padStart(5, '0')}`;

    let existing = await db.invoice.findUnique({
        where: { invoice_number: invoiceNumber },
        select: { id: true },
    });

    while (existing) {
        candidateSeq++;
        invoiceNumber = `${prefix}${String(candidateSeq).padStart(5, '0')}`;
        existing = await db.invoice.findUnique({
            where: { invoice_number: invoiceNumber },
            select: { id: true },
        });
    }

    return invoiceNumber;
}

/**
 * Helper to generate unique sequential receipt number (e.g. RCP-2026-00001).
 */
export async function generateReceiptNumber(prismaClient?: PrismaClient): Promise<string> {
    const db = prismaClient || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `RCP-${currentYear}-`;

    const recentInvoices = await db.invoice.findMany({
        where: {
            receipt_number: {
                startsWith: prefix,
            },
        },
        orderBy: {
            id: 'desc',
        },
        take: 50,
        select: {
            receipt_number: true,
        },
    });

    let maxSeq = 0;
    for (const inv of recentInvoices) {
        if (inv.receipt_number) {
            const parts = inv.receipt_number.split('-');
            const lastPart = parts[parts.length - 1] ?? '';
            const num = parseInt(lastPart, 10);
            if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
            }
        }
    }

    const totalCount = await db.invoice.count({
        where: {
            receipt_number: {
                startsWith: prefix,
            },
        },
    });

    let candidateSeq = Math.max(maxSeq, totalCount) + 1;
    let receiptNumber = `${prefix}${String(candidateSeq).padStart(5, '0')}`;
    return receiptNumber;
}

