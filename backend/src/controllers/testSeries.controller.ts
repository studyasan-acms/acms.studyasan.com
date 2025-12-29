import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

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
            req.query.limit as string
        );

        const { search, is_published } = req.query;
        const userRole = req.user?.role;
        const userId = req.user?.id;

        const where: any = {};

        // Role-based filtering
        if (userRole === 'STUDENT') {
            // Students see only published test series they are enrolled in
            where.is_published = true;
            // Get student record
            if (userId) {
                const student = await prisma.student.findUnique({
                    where: { user_id: userId },
                });
                if (student) {
                    where.enrollments = {
                        some: {
                            student_id: student.id,
                        },
                    };
                } else {
                    // If no student record, return no results
                    where.id = -1;
                }
            } else {
                where.id = -1;
            }
        } else if (userRole === 'TEACHER') {
            // Teachers see only test series they are assigned to
            if (userId) {
                const teacher = await prisma.teacher.findUnique({
                    where: { user_id: userId },
                });
                if (teacher) {
                    where.teacher_junctions = {
                        some: {
                            teacher_id: teacher.id,
                        },
                    };
                } else {
                    // If no teacher record, return no results
                    where.id = -1;
                }
            } else {
                where.id = -1;
            }
        }
        // Admins see all test series, with optional is_published filter
        else if (is_published !== undefined) {
            where.is_published = is_published === 'true';
        }

        if (search) {
            where.OR = [
                { title: { contains: search as string, mode: 'insensitive' } },
                { description: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const [testSeries, total] = await Promise.all([
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
                orderBy: { created_at: 'desc' },
            }),
            prisma.testSeries.count({ where }),
        ]);

        const response = createPaginatedResponse(testSeries, total, page, limit);
        sendSuccess(res, response);
    } catch (error: any) {
        console.error('Error fetching test series:', error);
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
            const enrollment = await prisma.testSeriesEnrollment.findUnique({
                where: {
                    test_series_id_student_id: {
                        test_series_id: testSeries.id,
                        student_id: student.id,
                    },
                },
            });

            if (!enrollment) {
                return sendError(res, 'Test series not found', 404);
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
        const { title, description, cover_image, price, currency_id, is_published } = req.body;
        const userId = req.user!.id;

        const testSeries = await prisma.testSeries.create({
            data: {
                title,
                description,
                cover_image,
                price: price ? parseInt(price) : null,
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
        const { title, description, cover_image, price, currency_id, is_published } = req.body;
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
        if (price !== undefined) updateData.price = price ? parseInt(price) : null;
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
        const existingEnrollment = await prisma.testSeriesEnrollment.findUnique({
            where: {
                test_series_id_student_id: {
                    test_series_id: parseInt(id!),
                    student_id: studentId,
                },
            },
        });

        if (existingEnrollment) {
            return sendError(res, 'Already enrolled in this test series', 400);
        }

        const enrollment = await prisma.testSeriesEnrollment.create({
            data: {
                test_series_id: parseInt(id!),
                student_id: studentId,
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

        const enrollment = await prisma.testSeriesEnrollment.findUnique({
            where: {
                test_series_id_student_id: {
                    test_series_id: parseInt(id!),
                    student_id: studentId,
                },
            },
        });

        if (!enrollment) {
            return sendError(res, 'Enrollment not found', 404);
        }

        await prisma.testSeriesEnrollment.delete({
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

        const enrollments = await prisma.testSeriesEnrollment.findMany({
            where: { student_id: student.id },
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
            orderBy: { enrolled_at: 'desc' },
        });

        const testSeries = enrollments.map(e => ({
            ...e.test_series,
            enrolled_at: e.enrolled_at,
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

        const enrollments = await prisma.testSeriesEnrollment.findMany({
            where: { test_series_id: parseInt(id!) },
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
            orderBy: { enrolled_at: 'desc' },
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
