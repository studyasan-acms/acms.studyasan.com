import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendNotificationToMultipleUsers } from '../services/notification.service.js';

const prisma = new PrismaClient();

// Create enquiry
export const createEnquiry = async (req: Request, res: Response) => {
    try {
        const {
            item_type,
            item_id,
            student_name,
            student_email,
            student_phone,
            message,
            coupon_code,
            discount_type,
            discount_value,
        } = req.body;
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get student ID from user ID
        const student = await prisma.student.findUnique({
            where: { user_id: userId },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Validate item exists based on type
        let itemExists = false;
        switch (item_type) {
            case 'COURSE':
            case 'SUBJECT':
                const subject = await prisma.subject.findUnique({ where: { id: item_id } });
                itemExists = !!subject;
                break;
            case 'ACTIVITY_GROUP':
                const activityGroup = await prisma.activityGroup.findUnique({ where: { id: item_id } });
                itemExists = !!activityGroup;
                break;
            case 'TEST_SERIES':
                const testSeries = await prisma.testSeries.findUnique({ where: { id: item_id } });
                itemExists = !!testSeries;
                break;
        }

        if (!itemExists) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const normalizedCouponCode = typeof coupon_code === 'string' ? coupon_code.trim() : '';
        const hasCoupon = normalizedCouponCode.length > 0;
        const normalizedCode = hasCoupon ? normalizedCouponCode.toUpperCase() : null;

        let couponRecord: {
            id: number;
            code: string;
            discount_type: 'PERCENTAGE' | 'FLAT';
            discount_value: number;
            is_active: boolean;
            max_uses: number | null;
            used_count: number;
            valid_from: Date | null;
            valid_until: Date | null;
        } | null = null;

        if (normalizedCode) {
            couponRecord = await prisma.coupon.findUnique({
                where: { code: normalizedCode },
                select: {
                    id: true,
                    code: true,
                    discount_type: true,
                    discount_value: true,
                    max_uses: true,
                    used_count: true,
                    valid_from: true,
                    valid_until: true,
                    is_active: true,
                },
            });

            const now = new Date();
            if (
                !couponRecord ||
                !couponRecord.is_active ||
                (couponRecord.valid_from && couponRecord.valid_from > now) ||
                (couponRecord.valid_until && couponRecord.valid_until < now) ||
                (couponRecord.max_uses !== null && couponRecord.used_count >= couponRecord.max_uses)
            ) {
                return res.status(400).json({ error: 'Invalid or expired coupon code' });
            }
        }

        const enquiry = await prisma.$transaction(async (tx) => {
            const createdEnquiry = await tx.enquiry.create({
                data: {
                    student_id: student.id,
                    item_type,
                    item_id,
                    student_name,
                    student_email,
                    student_phone,
                    coupon_code: couponRecord?.code || null,
                    discount_type: couponRecord?.discount_type || null,
                    discount_value: couponRecord?.discount_value || null,
                    message,
                },
                include: {
                    student: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
            });

            if (couponRecord) {
                await tx.coupon.update({
                    where: { id: couponRecord.id },
                    data: { used_count: { increment: 1 } },
                });
            }

            return createdEnquiry;
        });

        res.status(201).json({
            message: 'Enquiry submitted successfully',
            data: enquiry,
        });

        // Send admin notifications asynchronously so the API response is not blocked
        // by push/email providers (which can be slow and trigger gateway timeouts).
        void (async () => {
            try {
                const admins = await prisma.user.findMany({
                    where: { role: 'ADMIN' },
                    select: { id: true, name: true, email: true },
                });

                console.log('Found admins:', admins.length, admins);

                if (admins.length > 0) {
                    const adminIds = admins.map(admin => admin.id);
                    console.log('Sending notifications to admin IDs:', adminIds);
                    await sendNotificationToMultipleUsers(adminIds, {
                        type: 'INFO',
                        title: 'New Enquiry Received',
                        description: `${student_name} has submitted an enquiry for ${item_type.toLowerCase().replace('_', ' ')}.`,
                    });
                    console.log('✓ Notifications sent to all admins');
                } else {
                    console.log('⚠ No admin users found in database');
                }
            } catch (notificationError) {
                console.error('Error sending notification to admins:', notificationError);
            }
        })();
    } catch (error) {
        console.error('Error creating enquiry:', error);
        res.status(500).json({ error: 'Failed to create enquiry' });
    }
};

// Get all enquiries (Admin only)
export const getAllEnquiries = async (req: Request, res: Response) => {
    try {
        const { status, item_type, page = 1, limit = 10 } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (item_type) where.item_type = item_type;

        const skip = (Number(page) - 1) * Number(limit);

        const [enquiries, total] = await Promise.all([
            prisma.enquiry.findMany({
                where,
                include: {
                    student: {
                        include: {
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                            class: {
                                select: {
                                    name: true,
                                },
                            },
                            board: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
                skip,
                take: Number(limit),
            }),
            prisma.enquiry.count({ where }),
        ]);

        // Fetch item details for each enquiry
        const enrichedEnquiries = await Promise.all(
            enquiries.map(async (enquiry) => {
                let itemDetails = null;
                switch (enquiry.item_type) {
                    case 'COURSE':
                    case 'SUBJECT':
                        itemDetails = await prisma.subject.findUnique({
                            where: { id: enquiry.item_id },
                            select: { name: true, cover_image: true },
                        });
                        break;
                    case 'ACTIVITY_GROUP':
                        itemDetails = await prisma.activityGroup.findUnique({
                            where: { id: enquiry.item_id },
                            select: { name: true, cover_image: true },
                        });
                        break;
                    case 'TEST_SERIES':
                        itemDetails = await prisma.testSeries.findUnique({
                            where: { id: enquiry.item_id },
                            select: { title: true, cover_image: true },
                        });
                        break;
                }

                return {
                    ...enquiry,
                    item_name: (itemDetails as any)?.name || (itemDetails as any)?.title || 'Unknown',
                    item_cover_image: itemDetails?.cover_image || null,
                };
            })
        );

        res.json({
            data: enrichedEnquiries,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching enquiries:', error);
        res.status(500).json({ error: 'Failed to fetch enquiries' });
    }
};

// Update enquiry status (Admin only)
export const updateEnquiryStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['PENDING', 'CONTACTED', 'RESOLVED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const enquiry = await prisma.enquiry.update({
            where: { id: Number(id) },
            data: { status },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });

        res.json({
            message: 'Enquiry status updated successfully',
            data: enquiry,
        });
    } catch (error) {
        console.error('Error updating enquiry status:', error);
        res.status(500).json({ error: 'Failed to update enquiry status' });
    }
};

// Delete enquiry (Admin only)
export const deleteEnquiry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.enquiry.delete({
            where: { id: Number(id) },
        });

        res.json({ message: 'Enquiry deleted successfully' });
    } catch (error) {
        console.error('Error deleting enquiry:', error);
        res.status(500).json({ error: 'Failed to delete enquiry' });
    }
};
