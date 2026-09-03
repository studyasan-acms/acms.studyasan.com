import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import type { AuthRequest } from '../types/index.js';

const prisma = new PrismaClient();

const SECTION_INCLUDE = {
  subject: { select: { id: true, name: true } },
  teacher: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
  creator: { select: { id: true, name: true } },
  _count: { select: { memberships: true, class_sessions: true } },
} as const;

// ─── GET ALL SECTIONS ────────────────────────────────────────────────────────

export const getAllSections = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { subject_id, search } = req.query;
    const user = req.user!;

    const where: any = {};

    if (subject_id) where.subject_id = parseInt(subject_id as string);

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { subject: { name: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    // Teachers can only see their own sections
    if (user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { user_id: user.id } });
      if (!teacher) return sendError(res, 'Teacher profile not found', 404);
      where.teacher_id = teacher.id;
    }

    const [sections, total] = await Promise.all([
      prisma.section.findMany({
        where,
        skip,
        take: limit,
        include: SECTION_INCLUDE,
        orderBy: { created_at: 'desc' },
      }),
      prisma.section.count({ where }),
    ]);

    sendSuccess(res, createPaginatedResponse(sections, total, page, limit));
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── GET SECTION BY ID ───────────────────────────────────────────────────────

export const getSectionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id: parseInt(id!) },
      include: {
        ...SECTION_INCLUDE,
        memberships: {
          include: {
            student: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!section) return sendError(res, 'Section not found', 404);

    sendSuccess(res, section);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── CREATE SECTION ──────────────────────────────────────────────────────────

export const createSection = async (req: AuthRequest, res: Response) => {
  try {
    const { title, subject_id, teacher_id } = req.body;

    if (!title || !subject_id || !teacher_id) {
      return sendError(res, 'title, subject_id, and teacher_id are required', 400);
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({ where: { id: parseInt(subject_id) } });
    if (!subject) return sendError(res, 'Subject not found', 404);

    // Verify teacher exists
    const teacher = await prisma.teacher.findUnique({ where: { id: parseInt(teacher_id) } });
    if (!teacher) return sendError(res, 'Teacher not found', 404);

    const section = await prisma.section.create({
      data: {
        title: (title as string).trim(),
        subject_id: parseInt(subject_id),
        teacher_id: parseInt(teacher_id),
        created_by: req.user!.id,
      },
      include: SECTION_INCLUDE,
    });

    sendSuccess(res, section, 'Section created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── UPDATE SECTION ──────────────────────────────────────────────────────────

export const updateSection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, teacher_id, subject_id } = req.body;

    const existing = await prisma.section.findUnique({ where: { id: parseInt(id!) } });
    if (!existing) return sendError(res, 'Section not found', 404);

    const updateData: any = {};
    if (title !== undefined) updateData.title = (title as string).trim();
    if (teacher_id !== undefined) {
      const teacher = await prisma.teacher.findUnique({ where: { id: parseInt(teacher_id) } });
      if (!teacher) return sendError(res, 'Teacher not found', 404);
      updateData.teacher_id = parseInt(teacher_id);
    }
    if (subject_id !== undefined) {
      const subject = await prisma.subject.findUnique({ where: { id: parseInt(subject_id) } });
      if (!subject) return sendError(res, 'Subject not found', 404);
      updateData.subject_id = parseInt(subject_id);
    }

    const section = await prisma.section.update({
      where: { id: parseInt(id!) },
      data: updateData,
      include: SECTION_INCLUDE,
    });

    sendSuccess(res, section, 'Section updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── DELETE SECTION ──────────────────────────────────────────────────────────

export const deleteSection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.section.findUnique({ where: { id: parseInt(id!) } });
    if (!existing) return sendError(res, 'Section not found', 404);

    await prisma.section.delete({ where: { id: parseInt(id!) } });

    sendSuccess(res, null, 'Section deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── GET STUDENTS IN SECTION ─────────────────────────────────────────────────

export const getSectionStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({ where: { id: parseInt(id!) } });
    if (!section) return sendError(res, 'Section not found', 404);

    const memberships = await prisma.sectionStudent.findMany({
      where: { section_id: parseInt(id!) },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    sendSuccess(res, memberships);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── ADD STUDENT TO SECTION ──────────────────────────────────────────────────

export const addStudentToSection = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { student_id } = req.body;

    if (!student_id) return sendError(res, 'student_id is required', 400);

    const sectionId = parseInt(id!);
    const studentId = parseInt(student_id);

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) return sendError(res, 'Section not found', 404);

    // Verify student is enrolled in the subject
    const enrollment = await prisma.enrollment.findFirst({
      where: { student_id: studentId, subject_id: section.subject_id },
    });
    if (!enrollment) {
      return sendError(res, 'Student is not enrolled in this subject', 400);
    }

    // Check if student is already in another section for the same subject
    const conflictingSection = await prisma.sectionStudent.findFirst({
      where: {
        student_id: studentId,
        section: { subject_id: section.subject_id },
        section_id: { not: sectionId },
      },
    });
    if (conflictingSection) {
      return sendError(res, 'Student is already in a section for this subject', 409);
    }

    // Check if already in this section
    const alreadyMember = await prisma.sectionStudent.findUnique({
      where: { section_id_student_id: { section_id: sectionId, student_id: studentId } },
    });
    if (alreadyMember) {
      return sendError(res, 'Student is already in this section', 409);
    }

    const membership = await prisma.sectionStudent.create({
      data: { section_id: sectionId, student_id: studentId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    sendSuccess(res, membership, 'Student added to section', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── REMOVE STUDENT FROM SECTION ─────────────────────────────────────────────

export const removeStudentFromSection = async (req: AuthRequest, res: Response) => {
  try {
    const { id, studentId } = req.params;

    const membership = await prisma.sectionStudent.findFirst({
      where: { section_id: parseInt(id!), student_id: parseInt(studentId!) },
    });
    if (!membership) return sendError(res, 'Student is not in this section', 404);

    await prisma.sectionStudent.delete({ where: { id: membership.id } });

    sendSuccess(res, null, 'Student removed from section');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// ─── GET AVAILABLE STUDENTS (enrolled in subject but not in any section for it) ─

export const getAvailableStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({ where: { id: parseInt(id!) } });
    if (!section) return sendError(res, 'Section not found', 404);

    // Students enrolled in this subject
    const enrollments = await prisma.enrollment.findMany({
      where: { subject_id: section.subject_id },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Students already in any section for this subject
    const alreadyInSection = await prisma.sectionStudent.findMany({
      where: { section: { subject_id: section.subject_id } },
      select: { student_id: true },
    });
    const usedStudentIds = new Set(alreadyInSection.map((s) => s.student_id));

    const available = enrollments
      .filter((e) => !usedStudentIds.has(e.student_id))
      .map((e) => e.student);

    sendSuccess(res, available);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
