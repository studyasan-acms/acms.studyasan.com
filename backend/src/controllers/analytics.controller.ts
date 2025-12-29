import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get analytics for a specific student (for teachers/admins)
export const getStudentAnalytics = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required' });
        }
        const studentIdNum = parseInt(studentId);
        if (isNaN(studentIdNum)) {
            return res.status(400).json({ error: 'Invalid student ID' });
        }
        const analytics = await calculateStudentAnalytics(studentIdNum);
        res.json(analytics);
    } catch (error) {
        console.error('Error fetching student analytics:', error);
        res.status(500).json({ error: 'Failed to fetch student analytics' });
    }
};

// Get analytics for the logged-in student
export const getMyAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // Get student record
        const student = await prisma.student.findUnique({
            where: { user_id: userId }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const analytics = await calculateStudentAnalytics(student.id);
        res.json(analytics);
    } catch (error) {
        console.error('Error fetching my analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

// Get analytics for all students taught by the logged-in teacher
export const getTeacherStudentsAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        // Get teacher record
        const teacher = await prisma.teacher.findUnique({
            where: { user_id: userId },
            include: {
                teacher_subject_junctions: {
                    include: {
                        subject: {
                            include: {
                                enrollments: {
                                    include: {
                                        student: {
                                            include: {
                                                user: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        // Get unique students from all subjects taught
        const studentMap = new Map();
        teacher.teacher_subject_junctions.forEach(junction => {
            junction.subject.enrollments.forEach(enrollment => {
                if (!studentMap.has(enrollment.student.id)) {
                    studentMap.set(enrollment.student.id, enrollment.student);
                }
            });
        });

        // Calculate analytics for each student
        const studentsAnalytics = await Promise.all(
            Array.from(studentMap.values()).map(async (student: any) => {
                const analytics = await calculateStudentAnalytics(student.id);
                return {
                    studentId: student.id,
                    studentName: student.user.name,
                    studentEmail: student.user.email,
                    ...analytics
                };
            })
        );

        res.json(studentsAnalytics);
    } catch (error) {
        console.error('Error fetching teacher students analytics:', error);
        res.status(500).json({ error: 'Failed to fetch teacher students analytics' });
    }
};

// Get analytics for students in a specific subject (for teachers)
export const getTeacherSubjectAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { subjectId } = req.params;

        if (!subjectId) {
            return res.status(400).json({ error: 'Subject ID is required' });
        }
        const subjectIdNum = parseInt(subjectId);
        if (isNaN(subjectIdNum)) {
            return res.status(400).json({ error: 'Invalid subject ID' });
        }

        // Verify teacher teaches this subject
        const teacher = await prisma.teacher.findUnique({
            where: { user_id: userId }
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const junction = await prisma.teacherSubjectJunction.findFirst({
            where: {
                teacher_id: teacher.id,
                subject_id: subjectIdNum
            }
        });

        if (!junction) {
            return res.status(403).json({ error: 'You do not teach this subject' });
        }

        // Get students enrolled in this subject
        const enrollments = await prisma.enrollment.findMany({
            where: { subject_id: subjectIdNum },
            include: {
                student: {
                    include: {
                        user: true
                    }
                }
            }
        });

        // Calculate analytics for each student
        const studentsAnalytics = await Promise.all(
            enrollments.map(async (enrollment) => {
                const analytics = await calculateStudentAnalytics(enrollment.student.id);
                return {
                    studentId: enrollment.student.id,
                    studentName: enrollment.student.user.name,
                    studentEmail: enrollment.student.user.email,
                    ...analytics
                };
            })
        );

        res.json(studentsAnalytics);
    } catch (error) {
        console.error('Error fetching teacher subject analytics:', error);
        res.status(500).json({ error: 'Failed to fetch teacher subject analytics' });
    }
};

// Get analytics for all students (for admins)
export const getAdminStudentsAnalytics = async (req: Request, res: Response) => {
    try {
        const students = await prisma.student.findMany({
            include: {
                user: true
            }
        });

        const studentsAnalytics = await Promise.all(
            students.map(async (student) => {
                const analytics = await calculateStudentAnalytics(student.id);
                return {
                    studentId: student.id,
                    studentName: student.user.name,
                    studentEmail: student.user.email,
                    ...analytics
                };
            })
        );

        res.json(studentsAnalytics);
    } catch (error) {
        console.error('Error fetching admin students analytics:', error);
        res.status(500).json({ error: 'Failed to fetch admin students analytics' });
    }
};

// Get analytics for all teachers (for admins)
export const getAdminTeachersAnalytics = async (req: Request, res: Response) => {
    try {
        const teachers = await prisma.teacher.findMany({
            include: {
                user: true,
                teacher_subject_junctions: {
                    include: {
                        subject: {
                            include: {
                                enrollments: true
                            }
                        }
                    }
                }
            }
        });

        const teachersAnalytics = teachers.map(teacher => {
            // Calculate unique students taught
            const studentIds = new Set();
            teacher.teacher_subject_junctions.forEach(junction => {
                junction.subject.enrollments.forEach(enrollment => {
                    studentIds.add(enrollment.student_id);
                });
            });

            return {
                teacherId: teacher.id,
                teacherName: teacher.user.name,
                teacherEmail: teacher.user.email,
                subjectsCount: teacher.teacher_subject_junctions.length,
                studentsCount: studentIds.size,
                subjects: teacher.teacher_subject_junctions.map(junction => ({
                    id: junction.subject.id,
                    name: junction.subject.name,
                    studentsEnrolled: junction.subject.enrollments.length
                }))
            };
        });

        res.json(teachersAnalytics);
    } catch (error) {
        console.error('Error fetching admin teachers analytics:', error);
        res.status(500).json({ error: 'Failed to fetch admin teachers analytics' });
    }
};

// Get business analytics (for admins)
export const getAdminBusinessAnalytics = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // New students
        const [totalStudents, newStudentsLast30Days, newStudentsLast7Days, newStudentsToday] = await Promise.all([
            prisma.student.count(),
            prisma.student.count({ where: { created_at: { gte: thirtyDaysAgo } } }),
            prisma.student.count({ where: { created_at: { gte: sevenDaysAgo } } }),
            prisma.student.count({ where: { created_at: { gte: oneDayAgo } } })
        ]);

        // Payment analytics
        const [totalRevenue, paidPayments, pendingPayments, totalPayments] = await Promise.all([
            prisma.enrollmentPayment.aggregate({
                where: { is_paid: true },
                _sum: { amount: true }
            }),
            prisma.enrollmentPayment.count({ where: { is_paid: true } }),
            prisma.enrollmentPayment.count({ where: { is_paid: false } }),
            prisma.enrollmentPayment.count()
        ]);

        // Revenue last 30 days
        const revenueLast30Days = await prisma.enrollmentPayment.aggregate({
            where: {
                is_paid: true,
                paid_date: { gte: thirtyDaysAgo }
            },
            _sum: { amount: true }
        });

        // Enrollment trends
        const [totalEnrollments, enrollmentsLast30Days] = await Promise.all([
            prisma.enrollment.count(),
            prisma.enrollment.count({ where: { created_on: { gte: thirtyDaysAgo } } })
        ]);

        // Get new students by day for the last 30 days
        const newStudentsByDay = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM students
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

        // Get revenue by day for the last 30 days
        const revenueByDay = await prisma.$queryRaw<Array<{ date: Date; total: number }>>`
      SELECT DATE(paid_date) as date, SUM(amount) as total
      FROM enrollment_payments
      WHERE is_paid = true AND paid_date >= ${thirtyDaysAgo}
      GROUP BY DATE(paid_date)
      ORDER BY date ASC
    `;

        res.json({
            students: {
                total: totalStudents,
                newLast30Days: newStudentsLast30Days,
                newLast7Days: newStudentsLast7Days,
                newToday: newStudentsToday,
                byDay: newStudentsByDay.map(row => ({
                    date: row.date,
                    count: Number(row.count)
                }))
            },
            payments: {
                totalRevenue: totalRevenue._sum.amount || 0,
                revenueLast30Days: revenueLast30Days._sum.amount || 0,
                paidCount: paidPayments,
                pendingCount: pendingPayments,
                totalCount: totalPayments,
                byDay: revenueByDay.map(row => ({
                    date: row.date,
                    total: row.total
                }))
            },
            enrollments: {
                total: totalEnrollments,
                last30Days: enrollmentsLast30Days
            }
        });
    } catch (error) {
        console.error('Error fetching admin business analytics:', error);
        res.status(500).json({ error: 'Failed to fetch admin business analytics' });
    }
};

// Helper function to calculate analytics for a student
async function calculateStudentAnalytics(studentId: number) {
    // Get user_id for the student
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { user_id: true }
    });

    if (!student) {
        throw new Error('Student not found');
    }

    // Classes attended
    const classesAttended = await prisma.classSessionAttendance.findMany({
        where: {
            user_id: student.user_id,
            role: 'STUDENT'
        },
        include: {
            class_session: true
        }
    });

    const totalClassesAttended = classesAttended.length;
    const totalClassHours = classesAttended.reduce((sum, attendance) => {
        return sum + (attendance.duration_minutes || 0);
    }, 0) / 60; // Convert to hours

    // Tests attempted
    const testAttempts = await prisma.testAttempt.findMany({
        where: {
            student_id: studentId,
            is_practice: false,
            submitted_at: { not: null }
        }
    });

    const totalTestsAttempted = testAttempts.length;
    const averageTestScore = testAttempts.length > 0
        ? testAttempts.reduce((sum, attempt) => sum + ((attempt.score || 0) / attempt.total_marks) * 100, 0) / testAttempts.length
        : 0;

    // Activities played
    const activityAttempts = await prisma.activityAttempt.findMany({
        where: {
            student_id: studentId,
            is_completed: true
        }
    });

    const totalActivitiesPlayed = activityAttempts.length;
    const averageActivityScore = activityAttempts.length > 0
        ? activityAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.max_score) * 100, 0) / activityAttempts.length
        : 0;
    const totalActivityTime = activityAttempts.reduce((sum, attempt) => sum + (attempt.time_taken || 0), 0) / 3600; // Convert to hours

    // Modules completed
    const moduleProgress = await prisma.studentModuleProgress.findMany({
        where: { student_id: studentId }
    });

    const totalModulesCompleted = moduleProgress.filter(m => m.is_completed).length;
    const totalModules = moduleProgress.length;
    const averageModuleProgress = totalModules > 0
        ? moduleProgress.reduce((sum, m) => sum + m.progress_percent, 0) / totalModules
        : 0;
    const totalModuleTime = moduleProgress.reduce((sum, m) => sum + m.time_spent_minutes, 0) / 60; // Convert to hours

    // Homework submitted
    const homeworkResponses = await prisma.homeworkResponse.findMany({
        where: { student_id: studentId }
    });

    const totalHomeworkSubmitted = homeworkResponses.length;
    const homeworkChecked = homeworkResponses.filter(h => h.is_checked).length;

    // Total hours spent
    const totalHoursSpent = totalClassHours + totalActivityTime + totalModuleTime;

    return {
        classes: {
            attended: totalClassesAttended,
            totalHours: Math.round(totalClassHours * 10) / 10
        },
        tests: {
            attempted: totalTestsAttempted,
            averageScore: Math.round(averageTestScore * 10) / 10
        },
        activities: {
            played: totalActivitiesPlayed,
            averageScore: Math.round(averageActivityScore * 10) / 10,
            totalHours: Math.round(totalActivityTime * 10) / 10
        },
        modules: {
            completed: totalModulesCompleted,
            total: totalModules,
            averageProgress: Math.round(averageModuleProgress * 10) / 10,
            totalHours: Math.round(totalModuleTime * 10) / 10
        },
        homework: {
            submitted: totalHomeworkSubmitted,
            checked: homeworkChecked
        },
        totalHoursSpent: Math.round(totalHoursSpent * 10) / 10
    };
}
