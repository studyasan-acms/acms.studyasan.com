import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all home items (courses, subjects, activity groups, test series)
export const getHomeItems = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Get student info
        const student = await prisma.student.findUnique({
            where: { user_id: userId },
            include: {
                class: true,
                board: true,
            },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Fetch all subjects/courses
        const subjects = await prisma.subject.findMany({
            where: {
                OR: [
                    { is_course: true }, // All courses
                    { is_course: false } // All regular subjects
                ]
            },
            include: {
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
                currency: {
                    select: {
                        code: true,
                        symbol: true,
                    },
                },
                _count: {
                    select: {
                        tests: true,
                    },
                },
            },
        });

        // Fetch all published activity groups
        const activityGroups = await prisma.activityGroup.findMany({
            where: {
                is_active: true,
            },
            include: {
                currency: {
                    select: {
                        code: true,
                        symbol: true,
                    },
                },
                _count: {
                    select: {
                        activities: {
                            where: {
                                is_published: true,
                            },
                        },
                    },
                },
            },
        });

        // Fetch all published test series
        const testSeries = await prisma.testSeries.findMany({
            where: {
                is_published: true,
            },
            include: {
                currency: {
                    select: {
                        code: true,
                        symbol: true,
                    },
                },
                _count: {
                    select: {
                        tests: {
                            where: {
                                is_published: true,
                            },
                        },
                    },
                },
            },
        });

        // Format the response
        const formattedSubjects = subjects.map((subject) => ({
            id: subject.id,
            type: subject.is_course ? 'COURSE' : 'SUBJECT',
            name: subject.name,
            description: null,
            cover_image: subject.cover_image,
            price: subject.price,
            actual_price: subject.actual_price,
            currency: subject.currency,
            syllabus: subject.syllabus,
            class: subject.class?.name || null,
            board: subject.board?.name || null,
            item_count: subject._count.tests,
            item_count_label: 'tests',
        }));

        const formattedActivityGroups = activityGroups.map((group) => ({
            id: group.id,
            type: 'ACTIVITY_GROUP',
            name: group.name,
            description: group.description,
            cover_image: group.cover_image,
            price: group.price,
            currency: group.currency,
            syllabus: null,
            class: null,
            board: null,
            item_count: group._count.activities,
            item_count_label: 'activities',
        }));

        const formattedTestSeries = testSeries.map((series) => ({
            id: series.id,
            type: 'TEST_SERIES',
            name: series.title,
            description: series.description,
            cover_image: series.cover_image,
            price: series.price,
            currency: series.currency,
            syllabus: null,
            class: null,
            board: null,
            item_count: series._count.tests,
            item_count_label: 'tests',
        }));

        const allItems = [
            ...formattedSubjects,
            ...formattedActivityGroups,
            ...formattedTestSeries,
        ];

        res.json({
            data: allItems,
            total: allItems.length,
        });
    } catch (error) {
        console.error('Error fetching home items:', error);
        res.status(500).json({ error: 'Failed to fetch home items' });
    }
};
