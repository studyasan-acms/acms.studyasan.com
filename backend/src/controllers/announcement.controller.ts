import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import type { AuthRequest } from '../types/index.js';
import { uploadToS3, deleteFromS3, extractS3KeyFromUrl } from '../utils/s3.js';

const prisma = new PrismaClient();

// Helper to safely parse JSON strings from multipart/form-data
const parseJsonField = (field: any) => {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch {
            return field;
        }
    }
    return field;
};

// Helper to check if array intersects
const intersect = (arr1: any[] | null | undefined, arr2: any[] | null | undefined) => {
    if (!arr1 || !arr1.length) return true; // If target is null/empty, it means "All"
    if (!arr2 || !arr2.length) return false; // If user has no items but target requires items, false
    return arr1.some(item => arr2.includes(item));
};

export const getAnnouncements = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user!;
        
        let announcements = await prisma.announcement.findMany({
            orderBy: { created_at: 'desc' },
            include: { creator: { select: { name: true, email: true } } }
        });

        if (user.role === 'ADMIN') {
            return sendSuccess(res, { announcements }, 'Announcements retrieved successfully');
        }

        // For Teacher and Student, filter based on targets
        let filteredAnnouncements = announcements;

        if (user.role === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { user_id: user.id },
                include: {
                    enrollments: true
                }
            });

            if (!student) {
                return sendError(res, 'Student profile not found', 404);
            }

            const subjectIds = student.enrollments.filter(e => e.type === 'SUBJECT' && e.subject_id).map(e => e.subject_id);
            const groupIds = student.enrollments.filter(e => e.type === 'ACTIVITY_GROUP' && e.activity_group_id).map(e => e.activity_group_id);

            filteredAnnouncements = announcements.filter(a => {
                const targetRoles = a.target_roles as string[] | null;
                const targetBoards = a.target_boards as number[] | null;
                const targetClasses = a.target_classes as number[] | null;
                const targetSubjects = a.target_subjects as number[] | null;
                const targetGroups = a.target_groups as number[] | null;

                // Role check
                if (targetRoles && targetRoles.length > 0 && !targetRoles.includes('STUDENT')) return false;
                
                // Board check
                if (targetBoards && targetBoards.length > 0 && (!student.board_id || !targetBoards.includes(student.board_id))) return false;
                
                // Class check
                if (targetClasses && targetClasses.length > 0 && (!student.class_id || !targetClasses.includes(student.class_id))) return false;
                
                // Subjects check
                if (targetSubjects && targetSubjects.length > 0 && !intersect(targetSubjects, subjectIds)) return false;

                // Groups check
                if (targetGroups && targetGroups.length > 0 && !intersect(targetGroups, groupIds)) return false;

                return true;
            });
        } else if (user.role === 'TEACHER') {
            // First check if teacher has manage_announcements permission
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: user.id },
                include: { role: true, teacher_subject_junctions: true, activity_group_junctions: true }
            });

            const permissions = (teacher?.role?.permissions as Record<string, any>) || {};
            if (permissions.announcements?.manage) {
                // Can manage, so see all
                return sendSuccess(res, { announcements }, 'Announcements retrieved successfully');
            }

            if (!teacher) {
                return sendError(res, 'Teacher profile not found', 404);
            }

            const subjectIds = teacher.teacher_subject_junctions.map(j => j.subject_id);
            const groupIds = teacher.activity_group_junctions.map(j => j.activity_group_id);

            filteredAnnouncements = announcements.filter(a => {
                const targetRoles = a.target_roles as string[] | null;
                const targetSubjects = a.target_subjects as number[] | null;
                const targetGroups = a.target_groups as number[] | null;

                // Role check
                if (targetRoles && targetRoles.length > 0 && !targetRoles.includes('TEACHER')) return false;
                
                // Subjects check
                if (targetSubjects && targetSubjects.length > 0 && !intersect(targetSubjects, subjectIds)) return false;

                // Groups check
                if (targetGroups && targetGroups.length > 0 && !intersect(targetGroups, groupIds)) return false;

                return true;
            });
        }

        return sendSuccess(res, { announcements: filteredAnnouncements }, 'Announcements retrieved successfully');
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return sendError(res, 'Failed to fetch announcements');
    }
};

const VALID_ANNOUNCEMENT_TYPES = ['NOTICE', 'NEWS', 'EVENT', 'HOLIDAY', 'EXAM', 'GENERAL'];

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content, type, target_roles, target_boards, target_classes, target_subjects, target_courses, target_groups } = req.body;
        const user = req.user!;

        if (!title || !content) {
            return sendError(res, 'Title and content are required', 400);
        }

        if (user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: user.id },
                include: { role: true }
            });
            const permissions = (teacher?.role?.permissions as Record<string, any>) || {};
            if (!permissions.announcements?.manage) {
                return sendError(res, 'You do not have permission to create announcements', 403);
            }
        } else if (user.role !== 'ADMIN') {
            return sendError(res, 'Unauthorized', 403);
        }

        const announcementType = VALID_ANNOUNCEMENT_TYPES.includes(type) ? type : 'GENERAL';

        let image_url: string | null = null;
        if (req.file) {
            const uploadResult = await uploadToS3(req.file, 'announcements');
            image_url = uploadResult.url;
        } else if (req.body.image_url) {
            image_url = req.body.image_url;
        }

        const roles = parseJsonField(target_roles);
        const boards = parseJsonField(target_boards);
        const classes = parseJsonField(target_classes);
        const subjects = parseJsonField(target_subjects);
        const courses = parseJsonField(target_courses);
        const groups = parseJsonField(target_groups);

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                type: announcementType as any,
                image_url,
                created_by: user.id,
                target_roles: roles && roles.length > 0 ? roles : null,
                target_boards: boards && boards.length > 0 ? boards.map(Number) : null,
                target_classes: classes && classes.length > 0 ? classes.map(Number) : null,
                target_subjects: subjects && subjects.length > 0 ? subjects.map(Number) : null,
                target_courses: courses && courses.length > 0 ? courses.map(Number) : null,
                target_groups: groups && groups.length > 0 ? groups.map(Number) : null
            }
        });

        return sendSuccess(res, { announcement }, 'Announcement created successfully', 201);
    } catch (error) {
        console.error('Error creating announcement:', error);
        return sendError(res, 'Failed to create announcement');
    }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, content, type, target_roles, target_boards, target_classes, target_subjects, target_courses, target_groups, remove_image } = req.body;
        const user = req.user!;

        if (user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: user.id },
                include: { role: true }
            });
            const permissions = (teacher?.role?.permissions as Record<string, any>) || {};
            if (!permissions.announcements?.manage) {
                return sendError(res, 'You do not have permission to update announcements', 403);
            }
        } else if (user.role !== 'ADMIN') {
            return sendError(res, 'Unauthorized', 403);
        }

        const current = await prisma.announcement.findUnique({
            where: { id: parseInt(id!) }
        });
        if (!current) {
            return sendError(res, 'Announcement not found', 404);
        }

        let image_url: string | null | undefined = undefined;
        if (req.file) {
            const uploadResult = await uploadToS3(req.file, 'announcements');
            image_url = uploadResult.url;
            if (current.image_url) {
                const oldKey = extractS3KeyFromUrl(current.image_url);
                if (oldKey) {
                    deleteFromS3(oldKey).catch(err => console.error('Failed to delete old announcement image from S3:', err));
                }
            }
        } else if (remove_image === 'true' || remove_image === true) {
            image_url = null;
            if (current.image_url) {
                const oldKey = extractS3KeyFromUrl(current.image_url);
                if (oldKey) {
                    deleteFromS3(oldKey).catch(err => console.error('Failed to delete removed announcement image from S3:', err));
                }
            }
        } else if (req.body.image_url !== undefined) {
            image_url = req.body.image_url;
        }

        const roles = target_roles !== undefined ? parseJsonField(target_roles) : undefined;
        const boards = target_boards !== undefined ? parseJsonField(target_boards) : undefined;
        const classes = target_classes !== undefined ? parseJsonField(target_classes) : undefined;
        const subjects = target_subjects !== undefined ? parseJsonField(target_subjects) : undefined;
        const courses = target_courses !== undefined ? parseJsonField(target_courses) : undefined;
        const groups = target_groups !== undefined ? parseJsonField(target_groups) : undefined;

        const announcement = await prisma.announcement.update({
            where: { id: parseInt(id!) },
            data: {
                ...(title && { title }),
                ...(content && { content }),
                ...(type && VALID_ANNOUNCEMENT_TYPES.includes(type) && { type: type as any }),
                ...(image_url !== undefined && { image_url }),
                ...(roles !== undefined && { target_roles: roles && roles.length > 0 ? roles : null }),
                ...(boards !== undefined && { target_boards: boards && boards.length > 0 ? boards.map(Number) : null }),
                ...(classes !== undefined && { target_classes: classes && classes.length > 0 ? classes.map(Number) : null }),
                ...(subjects !== undefined && { target_subjects: subjects && subjects.length > 0 ? subjects.map(Number) : null }),
                ...(courses !== undefined && { target_courses: courses && courses.length > 0 ? courses.map(Number) : null }),
                ...(groups !== undefined && { target_groups: groups && groups.length > 0 ? groups.map(Number) : null }),
            }
        });

        return sendSuccess(res, { announcement }, 'Announcement updated successfully');
    } catch (error) {
        console.error('Error updating announcement:', error);
        return sendError(res, 'Failed to update announcement');
    }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = req.user!;

        if (user.role === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: user.id },
                include: { role: true }
            });
            const permissions = (teacher?.role?.permissions as Record<string, any>) || {};
            if (!permissions.announcements?.manage) {
                return sendError(res, 'You do not have permission to delete announcements', 403);
            }
        } else if (user.role !== 'ADMIN') {
            return sendError(res, 'Unauthorized', 403);
        }

        const current = await prisma.announcement.findUnique({
            where: { id: parseInt(id!) }
        });
        if (!current) {
            return sendError(res, 'Announcement not found', 404);
        }

        if (current.image_url) {
            const oldKey = extractS3KeyFromUrl(current.image_url);
            if (oldKey) {
                deleteFromS3(oldKey).catch(err => console.error('Failed to delete announcement image on delete:', err));
            }
        }

        await prisma.announcement.delete({
            where: { id: parseInt(id!) }
        });

        return sendSuccess(res, null, 'Announcement deleted successfully');
    } catch (error) {
        console.error('Error deleting announcement:', error);
        return sendError(res, 'Failed to delete announcement');
    }
};
