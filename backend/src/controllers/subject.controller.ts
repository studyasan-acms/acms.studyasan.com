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

    const { search, class_id, board_id, is_course, teacher_id, student_id, user_id, role, sort, order, letter } = req.query;

    console.log('🔍 [GET_ALL_SUBJECTS] Query params:', req.query);

    const where: any = {};

    if (letter) {
      const l = (letter as string).trim().toUpperCase();
      if (l.length === 1) {
        where.name = { startsWith: l, mode: 'insensitive' };
      }
    }

    if (search) {
      if (where.name) {
        where.AND = [
          { name: where.name },
          { name: { contains: search as string, mode: 'insensitive' } }
        ];
        delete where.name;
      } else {
        where.name = { contains: search as string, mode: 'insensitive' };
      }
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

    // Dynamic sorting
    let orderBy: any = { created_at: 'desc' };
    const sortStr = sort as string;
    const orderStr = (order as string)?.toLowerCase();

    if (sortStr === 'name') {
      orderBy = { name: orderStr === 'desc' ? 'desc' : 'asc' };
    } else if (sortStr === 'created_at') {
      orderBy = { created_at: orderStr === 'asc' ? 'asc' : 'desc' };
    }

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
        orderBy,
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

const parseSyllabusHelper = (raw: any): { units: any[]; modules: any[] } | null => {
  if (!raw) return null;
  let parsed = raw;
  while (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;

  if (Array.isArray(parsed)) {
    const units = parsed.map((item: any, idx: number) => ({
      name: item?.name || item?.title || `Unit ${idx + 1}`,
      content: item?.content || item?.description || '',
    }));
    return {
      units,
      modules: units.map((u: any, idx: number) => ({
        module_id: idx + 1,
        title: u.name,
        description: u.content,
        order: idx + 1,
        content: [],
        estimated_time_minutes: 0,
      })),
    };
  }

  const units = Array.isArray(parsed.units) ? parsed.units : [];
  let modules = Array.isArray(parsed.modules) ? parsed.modules : [];

  if (modules.length === 0 && units.length > 0) {
    modules = units.map((unit: any, index: number) => ({
      module_id: index + 1,
      title: unit.name || `Unit ${index + 1}`,
      description: unit.content || unit.name || '',
      order: index + 1,
      content: [],
      estimated_time_minutes: 0,
    }));
  }

  return { units, modules };
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, class_id, board_id, syllabus, is_course, end_date, price, actual_price, currency_id } = req.body;
    let cover_image: string | undefined;

    // Handle file upload
    if (req.file) {
      const uploadResult = await uploadToS3(req.file);
      cover_image = uploadResult.key;
    }

    let parsedSyllabus: any = null;
    if (syllabus) {
      parsedSyllabus = parseSyllabusHelper(syllabus);
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        ...(cover_image && { cover_image }),
        ...(class_id && { class_id: parseInt(class_id) }),
        ...(board_id && { board_id: parseInt(board_id) }),
        ...(parsedSyllabus && { syllabus: parsedSyllabus }),
        ...(end_date && { end_date: new Date(end_date) }),
        ...(price !== undefined && price !== '' && { price: parseFloat(price) }),
        ...(actual_price !== undefined && actual_price !== '' && { actual_price: parseFloat(actual_price) }),
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
    const { name, class_id, board_id, syllabus, is_course, end_date, price, actual_price, currency_id } = req.body;
    let cover_image: string | undefined;

    // Handle file upload
    if (req.file) {
      const uploadResult = await uploadToS3(req.file);
      cover_image = uploadResult.key;
    }

    const existingSubject = await prisma.subject.findUnique({
      where: { id: parseInt(id!) },
      select: { syllabus: true },
    });

    const existingSyllabus = parseSyllabusHelper(existingSubject?.syllabus) || { units: [], modules: [] };
    const existingModules: any[] = Array.isArray(existingSyllabus.modules) ? existingSyllabus.modules : [];
    let finalSyllabus: any = undefined;

    if (syllabus !== undefined) {
      if (syllabus === '' || syllabus === null) {
        finalSyllabus = { units: [], modules: existingModules };
      } else {
        const parsedSyllabus = parseSyllabusHelper(syllabus);
        if (parsedSyllabus) {
          const units = Array.isArray(parsedSyllabus.units) ? parsedSyllabus.units : [];
          
          let modules: any[] = [];
          if (existingModules.length > 0) {
            // If there are existing modules in the DB, preserve all their content, PDFs, and metadata
            if (Array.isArray(parsedSyllabus.modules) && parsedSyllabus.modules.length > 0) {
              const incomingModules = parsedSyllabus.modules;
              const mergedMap = new Map<number, any>();

              // Seed with existing modules from database
              existingModules.forEach((em: any) => {
                if (em.module_id) mergedMap.set(em.module_id, { ...em });
              });

              // Merge incoming updates without losing uploaded content/PDFs
              incomingModules.forEach((im: any) => {
                if (im.module_id && mergedMap.has(im.module_id)) {
                  const existing = mergedMap.get(im.module_id);
                  mergedMap.set(im.module_id, {
                    ...existing,
                    ...im,
                    content: (Array.isArray(im.content) && im.content.length > 0) ? im.content : (existing.content || []),
                  });
                } else if (im.module_id) {
                  mergedMap.set(im.module_id, im);
                }
              });

              modules = Array.from(mergedMap.values()).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            } else {
              // Retain all existing modules intact
              modules = existingModules;
            }
          } else {
            // No existing modules in DB yet
            if (Array.isArray(parsedSyllabus.modules) && parsedSyllabus.modules.length > 0) {
              modules = parsedSyllabus.modules;
            } else {
              modules = units.map((u: any, i: number) => ({
                module_id: i + 1,
                title: u.name || `Unit ${i + 1}`,
                description: u.content || '',
                order: i + 1,
                content: [],
                estimated_time_minutes: 0,
              }));
            }
          }

          finalSyllabus = { units, modules };
        }
      }
    }

    const subject = await prisma.subject.update({
      where: { id: parseInt(id!) },
      data: {
        ...(name && { name }),
        ...(cover_image && { cover_image }),
        ...(class_id && { class_id: parseInt(class_id) }),
        ...(board_id && { board_id: parseInt(board_id) }),
        ...(finalSyllabus !== undefined && { syllabus: finalSyllabus }),
        ...(end_date !== undefined && { end_date: end_date ? new Date(end_date) : null }),
        ...(price !== undefined && { price: price !== '' && price !== null ? parseFloat(price) : null }),
        ...(actual_price !== undefined && { actual_price: actual_price !== '' && actual_price !== null ? parseFloat(actual_price) : null }),
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