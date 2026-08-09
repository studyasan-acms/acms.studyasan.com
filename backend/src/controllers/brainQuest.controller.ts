import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { uploadToS3 } from '../utils/s3.js';
import { sendNotificationAllChannels } from '../services/notification.service.js';

const prisma = new PrismaClient();

// 1. Create a new Brain Quest test paper (Teachers & Admins)
export const createBrainQuest = async (req: Request, res: Response) => {
  try {
    const { title, description, subject_id, total_marks, due_date, target_class_id, document_url: body_doc_url } = req.body;
    const user = (req as any).user;

    if (!title || !subject_id) {
      return sendError(res, 'Title and subject_id are required.', 400);
    }

    let teacher = null;
    if (user.role === 'TEACHER') {
      teacher = await prisma.teacher.findUnique({
        where: { user_id: user.id }
      });
      if (!teacher) {
        teacher = await prisma.teacher.create({
          data: {
            user_id: user.id,
            qualification: 'Teacher',
            experience: '0'
          }
        });
      }
    } else if (user.role === 'ADMIN') {
      teacher = await prisma.teacher.findFirst();
      if (!teacher) {
        teacher = await prisma.teacher.create({
          data: {
            user_id: user.id,
            qualification: 'Admin',
            experience: '0'
          }
        });
      }
    } else {
      return sendError(res, 'Unauthorized to create Brain Quest tests.', 403);
    }

    let document_url = body_doc_url || '';
    let document_type = 'pdf';

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'brain-quest-documents');
      document_url = uploadResult.url;
      document_type = req.file.mimetype;
    }

    if (!document_url) {
      return sendError(res, 'Please upload a PDF of the test paper.', 400);
    }

    const brainQuest = await (prisma as any).brainQuest.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        subject_id: parseInt(subject_id),
        teacher_id: teacher.id,
        target_class_id: target_class_id ? parseInt(target_class_id) : null,
        document_url,
        document_type,
        total_marks: total_marks ? parseFloat(total_marks) : 100,
        due_date: due_date ? new Date(due_date) : null,
      },
      include: {
        subject: true,
        teacher: {
          include: { user: true }
        }
      }
    });

    return sendSuccess(res, brainQuest, 'Brain Quest created successfully.', 201);
  } catch (error: any) {
    console.error('Error creating Brain Quest:', error);
    return sendError(res, error.message || 'Failed to create Brain Quest.', 500);
  }
};

// 2. Get all Brain Quest tests (Paginated & Filtered)
export const getAllBrainQuests = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const where: any = {};

    if (req.query.subject_id && req.query.subject_id !== 'all') {
      where.subject_id = parseInt(req.query.subject_id as string);
    }

    if (req.query.search) {
      const search = (req.query.search as string).trim();
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { subject: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }
    }

    let studentRecord = null;
    if (user.role === 'STUDENT') {
      studentRecord = await prisma.student.findUnique({
        where: { user_id: user.id }
      });
    }

    const total = await (prisma as any).brainQuest.count({ where });

    const brainQuests = await (prisma as any).brainQuest.findMany({
      where,
      skip,
      take: limit,
      include: {
        subject: true,
        teacher: {
          include: {
            user: { select: { name: true, profile_url: true } }
          }
        },
        _count: {
          select: { submissions: true }
        },
        ...(studentRecord
          ? {
              submissions: {
                where: { student_id: studentRecord.id },
                take: 1
              }
            }
          : {})
      },
      orderBy: { created_at: 'desc' }
    });

    const response = createPaginatedResponse(brainQuests, total, page, limit);
    return sendSuccess(res, response, 'Brain Quests retrieved successfully.');
  } catch (error: any) {
    console.error('Error fetching Brain Quests:', error);
    return sendError(res, error.message || 'Failed to retrieve Brain Quests.', 500);
  }
};

// 3. Get Brain Quest details by ID
export const getBrainQuestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    let studentRecord = null;
    if (user.role === 'STUDENT') {
      studentRecord = await prisma.student.findUnique({
        where: { user_id: user.id }
      });
    }

    const brainQuest = await (prisma as any).brainQuest.findUnique({
      where: { id: parseInt(id) },
      include: {
        subject: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true, profile_url: true } }
          }
        },
        submissions: user.role === 'STUDENT'
          ? {
              where: { student_id: studentRecord?.id || 0 },
              include: {
                student: { include: { user: true } },
                grader: { select: { name: true } }
              }
            }
          : {
              include: {
                student: { include: { user: true, class: true } },
                grader: { select: { name: true } }
              },
              orderBy: { submitted_at: 'desc' }
            }
      }
    });

    if (!brainQuest) {
      return sendError(res, 'Brain Quest test not found.', 404);
    }

    return sendSuccess(res, brainQuest, 'Brain Quest details retrieved successfully.');
  } catch (error: any) {
    console.error('Error fetching Brain Quest details:', error);
    return sendError(res, error.message || 'Failed to retrieve Brain Quest details.', 500);
  }
};

// 4. Update Brain Quest test paper
export const updateBrainQuest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, subject_id, total_marks, due_date, document_url: body_doc_url } = req.body;
    const user = (req as any).user;

    const existing = await (prisma as any).brainQuest.findUnique({
      where: { id: parseInt(id) },
      include: { teacher: true }
    });

    if (!existing) {
      return sendError(res, 'Brain Quest test not found.', 404);
    }

    if (user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { user_id: user.id } });
      if (!teacher || existing.teacher_id !== teacher.id) {
        return sendError(res, 'Access denied. You can only edit your own Brain Quest tests.', 403);
      }
    } else if (user.role !== 'ADMIN') {
      return sendError(res, 'Unauthorized to update Brain Quest tests.', 403);
    }

    let document_url = existing.document_url;
    let document_type = existing.document_type;

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'brain-quest-documents');
      document_url = uploadResult.url;
      document_type = req.file.mimetype;
    } else if (body_doc_url) {
      document_url = body_doc_url;
    }

    const updated = await (prisma as any).brainQuest.update({
      where: { id: parseInt(id) },
      data: {
        title: title ? title.trim() : existing.title,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        subject_id: subject_id ? parseInt(subject_id) : existing.subject_id,
        total_marks: total_marks ? parseFloat(total_marks) : existing.total_marks,
        due_date: due_date ? new Date(due_date) : existing.due_date,
        document_url,
        document_type
      },
      include: {
        subject: true,
        teacher: { include: { user: true } }
      }
    });

    return sendSuccess(res, updated, 'Brain Quest updated successfully.');
  } catch (error: any) {
    console.error('Error updating Brain Quest:', error);
    return sendError(res, error.message || 'Failed to update Brain Quest.', 500);
  }
};

// 5. Delete Brain Quest test paper
export const deleteBrainQuest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const existing = await (prisma as any).brainQuest.findUnique({
      where: { id: parseInt(id) },
      include: { teacher: true }
    });

    if (!existing) {
      return sendError(res, 'Brain Quest test not found.', 404);
    }

    if (user.role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({ where: { user_id: user.id } });
      if (!teacher || existing.teacher_id !== teacher.id) {
        return sendError(res, 'Access denied. You can only delete your own Brain Quest tests.', 403);
      }
    } else if (user.role !== 'ADMIN') {
      return sendError(res, 'Unauthorized to delete Brain Quest tests.', 403);
    }

    await (prisma as any).brainQuest.delete({
      where: { id: parseInt(id) }
    });

    return sendSuccess(res, null, 'Brain Quest deleted successfully.');
  } catch (error: any) {
    console.error('Error deleting Brain Quest:', error);
    return sendError(res, error.message || 'Failed to delete Brain Quest.', 500);
  }
};

// 6. Submit student answer sheet for Brain Quest (Student only)
export const submitBrainQuest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // brain_quest_id
    const { remarks, submission_file_url: body_file_url } = req.body;
    const user = (req as any).user;

    const student = await prisma.student.findUnique({
      where: { user_id: user.id },
      include: { user: true }
    });

    if (!student) {
      return sendError(res, 'Student record not found.', 404);
    }

    const brainQuest = await (prisma as any).brainQuest.findUnique({
      where: { id: parseInt(id) },
      include: {
        teacher: { include: { user: true } }
      }
    });

    if (!brainQuest) {
      return sendError(res, 'Brain Quest test paper not found.', 404);
    }

    let submission_file_url = body_file_url || '';
    let submission_file_type = 'pdf';

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'brain-quest-submissions');
      submission_file_url = uploadResult.url;
      submission_file_type = req.file.mimetype;
    }

    if (!submission_file_url) {
      return sendError(res, 'Please upload an answer file (jpg, jpeg, png, doc, docx, or pdf).', 400);
    }

    const submission = await (prisma as any).brainQuestSubmission.upsert({
      where: {
        brain_quest_id_student_id: {
          brain_quest_id: parseInt(id),
          student_id: student.id
        }
      },
      create: {
        brain_quest_id: parseInt(id),
        student_id: student.id,
        submission_file_url,
        submission_file_type,
        remarks: remarks ? remarks.trim() : null,
        submitted_at: new Date()
      },
      update: {
        submission_file_url,
        submission_file_type,
        remarks: remarks ? remarks.trim() : null,
        submitted_at: new Date(),
        is_graded: false,
        marks_obtained: null,
        feedback: null
      },
      include: {
        brain_quest: true,
        student: { include: { user: true } }
      }
    });

    // Notify teacher of submission
    try {
      if (brainQuest.teacher?.user?.id) {
        await sendNotificationAllChannels({
          user_id: brainQuest.teacher.user.id,
          type: 'INFO',
          title: 'Brain Quest Submission Received',
          description: `Student ${student.user.name} has submitted their answer sheet for "${brainQuest.title}".`,
        });
      }
    } catch (notifErr) {
      console.error('Error sending submission notification:', notifErr);
    }

    return sendSuccess(res, submission, 'Brain Quest answer file submitted successfully.', 200);
  } catch (error: any) {
    console.error('Error submitting Brain Quest answer:', error);
    return sendError(res, error.message || 'Failed to submit Brain Quest answer.', 500);
  }
};

// 7. Grade student Brain Quest submission (Teachers & Admins)
export const gradeBrainQuestSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params;
    const { marks_obtained, feedback } = req.body;
    const user = (req as any).user;

    if (!submissionId) {
      return sendError(res, 'Submission ID is required.', 400);
    }

    const existingSubmission = await (prisma as any).brainQuestSubmission.findUnique({
      where: { id: parseInt(submissionId) },
      include: {
        brain_quest: true,
        student: { include: { user: true } }
      }
    });

    if (!existingSubmission) {
      return sendError(res, 'Brain Quest submission not found.', 404);
    }

    const updatedSubmission = await (prisma as any).brainQuestSubmission.update({
      where: { id: parseInt(submissionId) },
      data: {
        is_graded: true,
        marks_obtained: marks_obtained !== undefined && marks_obtained !== null ? parseFloat(marks_obtained) : null,
        feedback: feedback ? feedback.trim() : null,
        graded_by: user.id,
        graded_at: new Date()
      },
      include: {
        student: { include: { user: true } },
        brain_quest: true,
        grader: { select: { name: true } }
      }
    });

    // Notify student of graded test
    try {
      await sendNotificationAllChannels({
        user_id: existingSubmission.student.user.id,
        type: 'SUCCESS',
        title: 'Brain Quest Graded',
        description: `Your submission for "${existingSubmission.brain_quest.title}" has been graded by ${user.name}.`,
      });
    } catch (notifErr) {
      console.error('Error sending grading notification:', notifErr);
    }

    return sendSuccess(res, updatedSubmission, 'Brain Quest submission graded successfully.');
  } catch (error: any) {
    console.error('Error grading Brain Quest submission:', error);
    return sendError(res, error.message || 'Failed to grade Brain Quest submission.', 500);
  }
};
