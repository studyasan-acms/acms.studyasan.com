import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { createPaymentSchedule, createOneTimePayment } from '../utils/payment.utils.js';
import { sendEnrollmentNotification } from '../services/notification.service.js';

const prisma = new PrismaClient();

// Extended Request type with user info
interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        role: string;
    };
}

// Get all test series
export const getAllTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip } = getPaginationParams(
            req.query.page as string,
            req.query.limit as string || '12'
        );

        const { search, is_published, status, sort } = req.query;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        const where: any = {};

        // Role-based filtering
        if (userRole === 'STUDENT') {
            // Students see only published test series they are enrolled in
            where.is_published = true;
            if (userId) {
                const student = await prisma.student.findUnique({
                    where: { user_id: userId },
                });
                if (student) {
                    where.enrollments = {
                        some: {
                            student_id: student.id,
                            type: 'TEST_SERIES',
                        },
                    };
                } else {
                    where.id = -1;
                }
            } else {
                where.id = -1;
            }
        } else if (userRole === 'TEACHER') {
            if (userId) {
                const teacher = await prisma.teacher.findUnique({
                    where: { user_id: userId },
                    include: { role: true },
                });
                if (teacher) {
                    const permissions = teacher.role?.permissions as any;
                    const hasViewAllPermission = teacher.role?.is_active && permissions?.testSeries?.view === true;
                    if (!hasViewAllPermission) {
                        where.teacher_junctions = {
                            some: {
                                teacher_id: teacher.id,
                            },
                        };
                    }
                } else {
                    where.id = -1;
                }
            } else {
                where.id = -1;
            }
        }

        // Status & Published filter (for Admin / Teacher)
        if (status === 'published' || is_published === 'true') {
            where.is_published = true;
        } else if (status === 'draft' || is_published === 'false') {
            where.is_published = false;
        }

        if (search && typeof search === 'string' && search.trim()) {
            where.OR = [
                { title: { contains: search.trim(), mode: 'insensitive' } },
                { description: { contains: search.trim(), mode: 'insensitive' } },
            ];
        }

        // Dynamic sorting
        let orderBy: any = { created_at: 'desc' };
        if (sort === 'title_asc') orderBy = { title: 'asc' };
        else if (sort === 'title_desc') orderBy = { title: 'desc' };
        else if (sort === 'oldest') orderBy = { created_at: 'asc' };
        else if (sort === 'newest') orderBy = { created_at: 'desc' };

        const baseWhereForStats = { ...where };
        delete baseWhereForStats.is_published;

        const [testSeries, total, totalPublished, totalDraft] = await Promise.all([
            prisma.testSeries.findMany({
                where,
                skip,
                take: limit,
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    currency: true,
                    teacher_junctions: {
                        include: {
                            teacher: {
                                include: {
                                    user: {
                                        select: {
                                            id: true,
                                            name: true,
                                            email: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            tests: true,
                            enrollments: true,
                        },
                    },
                },
                orderBy,
            }),
            prisma.testSeries.count({ where }),
            prisma.testSeries.count({ where: { ...baseWhereForStats, is_published: true } }),
            prisma.testSeries.count({ where: { ...baseWhereForStats, is_published: false } }),
        ]);

        const response: any = createPaginatedResponse(testSeries, total, page, limit);
        response.stats = {
            total: totalPublished + totalDraft,
            published: totalPublished,
            draft: totalDraft,
        };
        sendSuccess(res, response);
    } catch (error: any) {
        console.error('Error fetching test series:', error);
        sendError(res, error.message, 500);
    }
};

// Get all test series enrollments (global admin view)
export const getAllGlobalTestSeriesEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const { page, limit, skip } = getPaginationParams(
            req.query.page as string,
            req.query.limit as string
        );

        const { student_id, test_series_id } = req.query;

        // Only ADMIN can access this
        if (req.user?.role !== 'ADMIN') {
            return sendError(res, 'Access denied', 403);
        }

        const where: any = {
            type: 'TEST_SERIES',
        };
        if (student_id) where.student_id = parseInt(student_id as string);
        if (test_series_id) where.test_series_id = parseInt(test_series_id as string);

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where,
                skip,
                take: limit,
                include: {
                    test_series: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                            actual_price: true,
                        }
                    },
                    student: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                    payments: true,
                },
                orderBy: { created_on: 'desc' },
            }),
            prisma.enrollment.count({ where }),
        ]);

        const response = createPaginatedResponse(enrollments, total, page, limit);
        sendSuccess(res, response);
    } catch (error: any) {
        console.error('Error fetching all test series enrollments:', error);
        sendError(res, error.message, 500);
    }
};

// Get test series by ID
export const getTestSeriesById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        const testSeries = await prisma.testSeries.findUnique({
            where: { id: parseInt(id!) },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                currency: true,
                teacher_junctions: {
                    include: {
                        teacher: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
                tests: {
                    include: {
                        _count: {
                            select: {
                                questions: true,
                                test_attempts: true,
                            },
                        },
                    },
                    orderBy: { created_at: 'asc' },
                },
                _count: {
                    select: {
                        enrollments: true,
                    },
                },
            },
        });

        if (!testSeries) {
            return sendError(res, 'Test series not found', 404);
        }

        // Role-based access control
        if (userRole === 'STUDENT') {
            // Students can only access published test series they are enrolled in
            if (!testSeries.is_published) {
                return sendError(res, 'Test series not found', 404);
            }

            // Get student record
            if (!userId) {
                return sendError(res, 'User not authenticated', 401);
            }

            const student = await prisma.student.findUnique({
                where: { user_id: userId },
            });

            if (!student) {
                return sendError(res, 'Student record not found', 404);
            }

            // Check if student is enrolled
            const enrollment = await prisma.enrollment.findUnique({
                where: {
                    student_id_test_series_id: {
                        test_series_id: testSeries.id,
                        student_id: student.id,
                    },
                },
            });

            if (!enrollment) {
                return sendError(res, 'You are not enrolled in this test series', 403);
            }

            // Add enrollment status to response
            (testSeries as any).is_enrolled = true;

            // Filter to only published tests for students
            testSeries.tests = testSeries.tests.filter(test => test.is_published);
        } else if (userRole === 'TEACHER') {
            // Teachers can only access test series they are assigned to
            if (!userId) {
                return sendError(res, 'User not authenticated', 401);
            }

            const teacher = await prisma.teacher.findUnique({
                where: { user_id: userId },
            });

            if (!teacher) {
                return sendError(res, 'Teacher record not found', 404);
            }

            const isAssigned = testSeries.teacher_junctions.some(
                junction => junction.teacher_id === teacher.id
            );

            if (!isAssigned) {
                return sendError(res, 'Test series not found', 404);
            }
        }
        // Admins have access to all test series

        sendSuccess(res, testSeries);
    } catch (error: any) {
        console.error('Error fetching test series:', error);
        sendError(res, error.message, 500);
    }
};

// Create test series
export const createTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, cover_image, price, actual_price, currency_id, is_published } = req.body;
        const userId = req.user!.id;

        const testSeries = await prisma.testSeries.create({
            data: {
                title,
                description,
                cover_image,
                ...(price !== undefined && price !== '' && price !== null && { price: parseFloat(price) }),
                ...(actual_price !== undefined && actual_price !== '' && actual_price !== null && { actual_price: parseFloat(actual_price) }),
                ...(currency_id && { currency_id: parseInt(currency_id) }),
                is_published: is_published || false,
                created_by: userId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                currency: true,
            },
        });

        sendSuccess(res, testSeries, 'Test series created successfully', 201);
    } catch (error: any) {
        console.error('Error creating test series:', error);
        sendError(res, error.message, 500);
    }
};

// Update test series
export const updateTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, cover_image, price, actual_price, currency_id, is_published } = req.body;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        const existing = await prisma.testSeries.findUnique({
            where: { id: parseInt(id!) },
            include: {
                teacher_junctions: true,
            },
        });

        if (!existing) {
            return sendError(res, 'Test series not found', 404);
        }

        // Role-based access control for updates
        if (userRole === 'STUDENT') {
            return sendError(res, 'Access denied', 403);
        } else if (userRole === 'TEACHER') {
            // Teachers can only update test series they are assigned to
            if (!userId) {
                return sendError(res, 'User not authenticated', 401);
            }

            const teacher = await prisma.teacher.findUnique({
                where: { user_id: userId },
            });

            if (!teacher) {
                return sendError(res, 'Teacher record not found', 404);
            }

            const isAssigned = existing.teacher_junctions.some(
                junction => junction.teacher_id === teacher.id
            );

            if (!isAssigned) {
                return sendError(res, 'Test series not found', 404);
            }
        }
        // Admins can update all test series

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (cover_image !== undefined) updateData.cover_image = cover_image;
        if (price !== undefined) updateData.price = price !== '' && price !== null ? parseFloat(price) : null;
        if (actual_price !== undefined) updateData.actual_price = actual_price !== '' && actual_price !== null ? parseFloat(actual_price) : null;
        if (currency_id !== undefined) updateData.currency_id = currency_id ? parseInt(currency_id) : null;
        if (is_published !== undefined) updateData.is_published = is_published;

        const testSeries = await prisma.testSeries.update({
            where: { id: parseInt(id!) },
            data: updateData,
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                currency: true,
                _count: {
                    select: {
                        tests: true,
                        enrollments: true,
                    },
                },
            },
        });

        sendSuccess(res, testSeries, 'Test series updated successfully');
    } catch (error: any) {
        console.error('Error updating test series:', error);
        sendError(res, error.message, 500);
    }
};

// Delete test series
export const deleteTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        const existing = await prisma.testSeries.findUnique({
            where: { id: parseInt(id!) },
            include: {
                teacher_junctions: true,
            },
        });

        if (!existing) {
            return sendError(res, 'Test series not found', 404);
        }

        // Role-based access control for deletion
        if (userRole === 'STUDENT') {
            return sendError(res, 'Access denied', 403);
        } else if (userRole === 'TEACHER') {
            // Teachers can only delete test series they are assigned to
            if (!userId) {
                return sendError(res, 'User not authenticated', 401);
            }

            const teacher = await prisma.teacher.findUnique({
                where: { user_id: userId },
            });

            if (!teacher) {
                return sendError(res, 'Teacher record not found', 404);
            }

            const isAssigned = existing.teacher_junctions.some(
                junction => junction.teacher_id === teacher.id
            );

            if (!isAssigned) {
                return sendError(res, 'Test series not found', 404);
            }
        }
        // Admins can delete all test series

        await prisma.testSeries.delete({
            where: { id: parseInt(id!) },
        });

        sendSuccess(res, null, 'Test series deleted successfully');
    } catch (error: any) {
        console.error('Error deleting test series:', error);
        sendError(res, error.message, 500);
    }
};

// Enroll student in test series
export const enrollInTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Get student record
        let studentId: number;

        if (userRole === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { user_id: userId },
            });

            if (!student) {
                return sendError(res, 'Student record not found', 404);
            }
            studentId = student.id;
        } else {
            // Admin can enroll any student
            const { student_id } = req.body;
            if (!student_id) {
                return sendError(res, 'Student ID is required', 400);
            }
            studentId = parseInt(student_id);
        }

        // Check if test series exists
        const testSeries = await prisma.testSeries.findUnique({
            where: { id: parseInt(id!) },
            include: {
                teacher_junctions: true,
            },
        });

        if (!testSeries) {
            return sendError(res, 'Test series not found', 404);
        }

        // For teachers, check if they are assigned to this test series
        if (userRole === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: userId },
            });

            if (!teacher) {
                return sendError(res, 'Teacher record not found', 404);
            }

            const isAssigned = testSeries.teacher_junctions.some(
                junction => junction.teacher_id === teacher.id
            );

            if (!isAssigned) {
                return sendError(res, 'Test series not found', 404);
            }
        }

        // Check if already enrolled
        const existingEnrollment = await prisma.enrollment.findUnique({
            where: {
                student_id_test_series_id: {
                    test_series_id: parseInt(id!),
                    student_id: studentId,
                },
            },
        });

        if (existingEnrollment) {
            return sendError(res, 'Already enrolled in this test series', 400);
        }

        const { price, is_recurring, frequency, payment_count, one_time_amount } = req.body;

        // Calculate end_date based on payment_count and frequency if recurring
        let end_date: Date | null = null;
        if (is_recurring && frequency && payment_count) {
            const now = new Date();
            let monthsToAdd = 0;
            if (frequency === 'monthly') monthsToAdd = 1;
            else if (frequency === 'quarterly') monthsToAdd = 3;
            else if (frequency === 'semi_yearly') monthsToAdd = 6;
            else if (frequency === 'yearly') monthsToAdd = 12;

            const totalMonths = monthsToAdd * (parseInt(payment_count) || 12);
            end_date = new Date(now.setMonth(now.getMonth() + totalMonths));
        }

        const enrollment = await prisma.enrollment.create({
            data: {
                type: 'TEST_SERIES',
                test_series_id: parseInt(id!),
                student_id: studentId,
                price: price ? parseFloat(price) : null,
                is_recurring: is_recurring || false,
                frequency: frequency || null,
                end_date: end_date,
            },
            include: {
                test_series: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                student: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });

        // Create payment schedule if recurring
        if (price && is_recurring && frequency) {
            await createPaymentSchedule({
                userId: enrollment.student.user.id,
                itemName: enrollment.test_series?.title || 'Test Series',
                price: parseFloat(price),
                frequency,
                paymentCount: parseInt(payment_count) || 12, // Default to 12 if not provided
                createPaymentRecords: async (records) => {
                    await prisma.payment.createMany({
                        data: records.map(r => ({
                            ...r,
                            enrollment_id: enrollment.id,
                            type: 'TEST_SERIES',
                        })),
                    });
                }
            });
        } else if (!is_recurring && one_time_amount) {
            // Create one-time payment
            await createOneTimePayment({
                enrollmentId: enrollment.id,
                amount: parseFloat(one_time_amount),
                userId: enrollment.student.user.id,
                itemName: enrollment.test_series?.title || 'Test Series',
                type: 'TEST_SERIES',
            });
        }

        // Send notification across all channels
        sendEnrollmentNotification(studentId, 'Test Series', enrollment.test_series?.title || 'Test Series').catch(console.error);

        sendSuccess(res, enrollment, 'Enrolled successfully', 201);
    } catch (error: any) {
        console.error('Error enrolling in test series:', error);
        sendError(res, error.message, 500);
    }
};

// Unenroll student from test series
export const unenrollFromTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        let studentId: number;

        if (userRole === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { user_id: userId },
            });

            if (!student) {
                return sendError(res, 'Student record not found', 404);
            }
            studentId = student.id;
        } else {
            const { student_id } = req.body;
            if (!student_id) {
                return sendError(res, 'Student ID is required', 400);
            }
            studentId = parseInt(student_id);
        }

        // Check if test series exists and teacher has permission
        const testSeries = await prisma.testSeries.findUnique({
            where: { id: parseInt(id!) },
            include: {
                teacher_junctions: true,
            },
        });

        if (!testSeries) {
            return sendError(res, 'Test series not found', 404);
        }

        // For teachers, check if they are assigned to this test series
        if (userRole === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: userId },
            });

            if (!teacher) {
                return sendError(res, 'Teacher record not found', 404);
            }

            const isAssigned = testSeries.teacher_junctions.some(
                junction => junction.teacher_id === teacher.id
            );

            if (!isAssigned) {
                return sendError(res, 'Test series not found', 404);
            }
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                student_id_test_series_id: {
                    test_series_id: parseInt(id!),
                    student_id: studentId,
                },
            },
        });

        if (!enrollment) {
            return sendError(res, 'Enrollment not found', 404);
        }

        await prisma.enrollment.delete({
            where: { id: enrollment.id },
        });

        sendSuccess(res, null, 'Unenrolled successfully');
    } catch (error: any) {
        console.error('Error unenrolling from test series:', error);
        sendError(res, error.message, 500);
    }
};

// Get my enrolled test series (for students)
export const getMyTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const student = await prisma.student.findUnique({
            where: { user_id: userId },
        });

        if (!student) {
            return sendError(res, 'Student record not found', 404);
        }

        const enrollments = await prisma.enrollment.findMany({
            where: {
                student_id: student.id,
                type: 'TEST_SERIES'
            },
            include: {
                test_series: {
                    include: {
                        _count: {
                            select: {
                                tests: true,
                            },
                        },
                    },
                },
            },
            orderBy: { created_on: 'desc' }, // Updated from enrolled_at
        });

        const testSeries = enrollments.map(e => ({
            ...e.test_series,
            enrolled_at: e.created_on,
        }));

        sendSuccess(res, testSeries);
    } catch (error: any) {
        console.error('Error fetching enrolled test series:', error);
        sendError(res, error.message, 500);
    }
};

// Get enrollments for a test series (admin view)
export const getTestSeriesEnrollments = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        // Check if test series exists and user has permission
        const testSeries = await prisma.testSeries.findUnique({
            where: { id: parseInt(id!) },
            include: {
                teacher_junctions: true,
            },
        });

        if (!testSeries) {
            return sendError(res, 'Test series not found', 404);
        }

        // Role-based access control
        if (userRole === 'STUDENT') {
            return sendError(res, 'Access denied', 403);
        } else if (userRole === 'TEACHER') {
            // Teachers can only see enrollments for test series they are assigned to
            if (!userId) {
                return sendError(res, 'User not authenticated', 401);
            }

            const teacher = await prisma.teacher.findUnique({
                where: { user_id: userId },
            });

            if (!teacher) {
                return sendError(res, 'Teacher record not found', 404);
            }

            const isAssigned = testSeries.teacher_junctions.some(
                junction => junction.teacher_id === teacher.id
            );

            if (!isAssigned) {
                return sendError(res, 'Test series not found', 404);
            }
        }
        // Admins can see enrollments for all test series

        const enrollments = await prisma.enrollment.findMany({
            where: { type: 'TEST_SERIES', test_series_id: parseInt(id!) },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: { created_on: 'desc' },
        });

        sendSuccess(res, enrollments);
    } catch (error: any) {
        console.error('Error fetching test series enrollments:', error);
        sendError(res, error.message, 500);
    }
};

// Assign Teacher to Test Series
export const assignTeacherToTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { test_series_id, teacher_id } = req.body;

        const existing = await prisma.testSeriesTeacherJunction.findFirst({
            where: {
                test_series_id,
                teacher_id,
            },
        });

        if (existing) {
            return sendError(res, 'Teacher already assigned to this test series', 400);
        }

        const assignment = await prisma.testSeriesTeacherJunction.create({
            data: {
                test_series_id,
                teacher_id,
            },
            include: {
                teacher: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                test_series: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        sendSuccess(res, assignment, 'Teacher assigned to test series successfully', 201);
    } catch (error: any) {
        console.error('Error assigning teacher to test series:', error);
        sendError(res, error.message, 500);
    }
};

// Remove Teacher from Test Series
export const removeTeacherFromTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // junction id

        const junction = await prisma.testSeriesTeacherJunction.findUnique({
            where: { id: parseInt(id!) },
        });

        if (!junction) {
            return sendError(res, 'Assignment not found', 404);
        }

        await prisma.testSeriesTeacherJunction.delete({
            where: { id: parseInt(id!) },
        });

        sendSuccess(res, null, 'Teacher removed from test series successfully');
    } catch (error: any) {
        console.error('Error removing teacher from test series:', error);
        sendError(res, error.message, 500);
    }
};

// Get Teachers by Test Series
export const getTeachersByTestSeries = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        const testSeries = await prisma.testSeries.findUnique({
            where: { id: parseInt(id!) },
            include: {
                teacher_junctions: {
                    include: {
                        teacher: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!testSeries) {
            return sendError(res, 'Test series not found', 404);
        }

        // Role-based access control
        if (userRole === 'STUDENT') {
            return sendError(res, 'Access denied', 403);
        } else if (userRole === 'TEACHER') {
            // Teachers can only see teachers for test series they are assigned to
            if (!userId) {
                return sendError(res, 'User not authenticated', 401);
            }

            const teacher = await prisma.teacher.findUnique({
                where: { user_id: userId },
            });

            if (!teacher) {
                return sendError(res, 'Teacher record not found', 404);
            }

            const isAssigned = testSeries.teacher_junctions.some(
                junction => junction.teacher_id === teacher.id
            );

            if (!isAssigned) {
                return sendError(res, 'Test series not found', 404);
            }
        }
        // Admins can see teachers for all test series

        sendSuccess(res, testSeries.teacher_junctions);
    } catch (error: any) {
        console.error('Error fetching teachers for test series:', error);
        sendError(res, error.message, 500);
    }
};
