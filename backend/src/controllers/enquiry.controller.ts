import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create enquiry
export const createEnquiry = async (req: Request, res: Response) => {
    try {
        const { item_type, item_id, student_name, student_email, student_phone, message } = req.body;
        const userId = req.user?.id;

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

        const enquiry = await prisma.enquiry.create({
            data: {
                student_id: student.id,
                item_type,
                item_id,
                student_name,
                student_email,
                student_phone,
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

        res.status(201).json({
            message: 'Enquiry submitted successfully',
            data: enquiry,
        });
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
