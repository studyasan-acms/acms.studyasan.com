import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { uploadToS3 } from '../utils/s3.js';

const prisma = new PrismaClient();

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { search, class_id, board_id, is_course, teacher_id, student_id, user_id, role } = req.query;

    console.log('🔍 [GET_ALL_SUBJECTS] Query params:', req.query);

    const where: any = {};

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (class_id) where.class_id = parseInt(class_id as string);
    if (board_id) where.board_id = parseInt(board_id as string);
    if (is_course !== undefined) where.is_course = is_course === 'true';

    // Filter by teacher if teacher_id is provided
    if (teacher_id) {
      where.teacher_subject_junctions = {
        some: {
          teacher_id: parseInt(teacher_id as string)
        }
      };
    }

    // Filter by student if student_id is provided
    if (student_id) {
      const parsedStudentId = parseInt(student_id as string);
      // Check if it's a user_id and get the student record
      const student = await prisma.student.findUnique({
        where: { user_id: parsedStudentId }
      });

      if (student) {
        where.enrollments = {
          some: {
            student_id: student.id
          }
        };
      } else {
        // If not found by user_id, assume it's already a student_id
        where.enrollments = {
          some: {
            student_id: parsedStudentId
          }
        };
      }
    }

    // Filter by user_id - handle both students and teachers
    if (user_id && role) {
      console.log(`🔍 [GET_ALL_SUBJECTS] Filtering by user_id: ${user_id}, role: ${role}`);
      if (role === 'STUDENT') {
        const student = await prisma.student.findUnique({
          where: { user_id: parseInt(user_id as string) }
        });
        console.log('🔍 [GET_ALL_SUBJECTS] Student found:', student);

        if (student) {
          where.enrollments = {
            some: {
              student_id: student.id
            }
          };
        } else {
          console.log('❌ [GET_ALL_SUBJECTS] Student not found');
          const response = createPaginatedResponse([], 0, page, limit);
          return sendSuccess(res, response);
        }
      } else if (role === 'TEACHER') {
        const teacher = await prisma.teacher.findUnique({
          where: { user_id: parseInt(user_id as string) }
        });
        console.log('🔍 [GET_ALL_SUBJECTS] Teacher found:', teacher);

        if (teacher) {
          where.teacher_subject_junctions = {
            some: {
              teacher_id: teacher.id
            }
          };
          console.log('🔍 [GET_ALL_SUBJECTS] Teacher where clause:', JSON.stringify(where, null, 2));
        } else {
          console.log('❌ [GET_ALL_SUBJECTS] Teacher not found');
          const response = createPaginatedResponse([], 0, page, limit);
          return sendSuccess(res, response);
        }
      }
    }

    console.log('🔍 [GET_ALL_SUBJECTS] Final where clause:', JSON.stringify(where, null, 2));

    const [subjects, total] = await Promise.all([
      prisma.subject.findMany({
        where,
        skip,
        take: limit,
        include: {
          class: true,
          board: true,
          currency: true,
          _count: {
            select: { enrollments: true, teacher_subject_junctions: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.subject.count({ where }),
    ]);

    console.log(`✅ [GET_ALL_SUBJECTS] Found ${total} subjects, returning ${subjects.length} items`);

    const response = createPaginatedResponse(subjects, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getSubjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(id!) },
      include: {
        class: true,
        board: true,
        currency: true,
        _count: {
          select: {
            enrollments: true,
            teacher_subject_junctions: true,
          },
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profile_url: true,
                  },
                },
              },
            },
          },
        },
        teacher_subject_junctions: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profile_url: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    sendSuccess(res, subject);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, class_id, board_id, syllabus, is_course, end_date, price, currency_id } = req.body;
    let cover_image: string | undefined;

    // Handle file upload
    if (req.file) {
      const uploadResult = await uploadToS3(req.file);
      cover_image = uploadResult.key;
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        ...(cover_image && { cover_image }),
        ...(class_id && { class_id: parseInt(class_id) }),
        ...(board_id && { board_id: parseInt(board_id) }),
        ...(syllabus && { syllabus: JSON.parse(syllabus) }),
        ...(end_date && { end_date: new Date(end_date) }),
        ...(price && { price: parseFloat(price) }),
        ...(currency_id && { currency_id: parseInt(currency_id) }),
        is_course: is_course === 'true',
      },
      include: {
        class: true,
        board: true,
        currency: true,
      },
    });

    sendSuccess(res, subject, 'Subject created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, class_id, board_id, syllabus, is_course, end_date, price, currency_id } = req.body;
    let cover_image: string | undefined;

    // Handle file upload
    if (req.file) {
      const uploadResult = await uploadToS3(req.file);
      cover_image = uploadResult.key;
    }

    const subject = await prisma.subject.update({
      where: { id: parseInt(id!) },
      data: {
        ...(name && { name }),
        ...(cover_image && { cover_image }),
        ...(class_id && { class_id: parseInt(class_id) }),
        ...(board_id && { board_id: parseInt(board_id) }),
        ...(syllabus && { syllabus: JSON.parse(syllabus) }),
        ...(end_date !== undefined && { end_date: end_date ? new Date(end_date) : null }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(currency_id !== undefined && { currency_id: currency_id ? parseInt(currency_id) : null }),
        ...(is_course !== undefined && { is_course: is_course === 'true' }),
      },
      include: {
        class: true,
        board: true,
        currency: true,
      },
    });

    sendSuccess(res, subject, 'Subject updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.subject.delete({
      where: { id: parseInt(id!) },
    });

    sendSuccess(res, null, 'Subject deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};