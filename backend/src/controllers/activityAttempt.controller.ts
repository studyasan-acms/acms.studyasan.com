import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

// Start Activity Attempt
export const startAttempt = async (req: Request, res: Response) => {
  try {
    const { activity_id, quiz_session_id } = req.body;
    console.log(`[startAttempt] Request body: activity_id=${activity_id}, quiz_session_id=${quiz_session_id}`);

    const userId = (req as any).user.id;
    console.log(`[startAttempt] User ID: ${userId}`);

    // Get student
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Get activity
    const activity = await prisma.activity.findUnique({
      where: { id: Number(activity_id) },
      include: {
        items: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!activity) {
      return sendError(res, 'Activity not found', 404);
    }

    if (!activity.is_published) {
      return sendError(res, 'Activity is not published yet', 400);
    }

    // Check for existing attempt for this session
    if (quiz_session_id) {
      const existingAttempt = await prisma.activityAttempt.findFirst({
        where: {
          activity_id: Number(activity_id),
          student_id: student.id,
          quiz_session_id: Number(quiz_session_id)
        },
        include: {
          activity: {
            include: {
              items: {
                orderBy: {
                  order: 'asc',
                },
              },
            },
          },
        },
      });

      if (existingAttempt) {
        return sendSuccess(res, existingAttempt, 'Resuming session attempt', 200);
      }
    }

    // Calculate max score
    const maxScore = activity.items.reduce((sum, item) => sum + item.points, 0);

    // Create attempt
    const attempt = await prisma.activityAttempt.create({
      data: {
        activity_id: Number(activity_id),
        student_id: student.id,
        max_score: maxScore,
        ...(quiz_session_id && { quiz_session_id: Number(quiz_session_id) }),
      },
      include: {
        activity: {
          include: {
            items: {
              orderBy: {
                order: 'asc',
              },
            },
          },
        },
      },
    });

    return sendSuccess(res, attempt, 'Activity attempt started', 201);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Submit Response
export const submitResponse = async (req: Request, res: Response) => {
  try {
    const { attempt_id, item_id, response, time_taken } = req.body;
    let { is_correct } = req.body; // Allow client override but prefer server check

    // Get item
    const item = await prisma.activityItem.findUnique({
      where: { id: Number(item_id) },
    });

    if (!item) {
      return sendError(res, 'Activity item not found', 404);
    }

    // Server-side validation for Quizzes and True/False
    let content = item.content as any;
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch (e) {}
    }

    if (content && content.correctAnswer !== undefined && response && response.answer !== undefined) {
      if (typeof content.correctAnswer === 'number' && typeof response.answer === 'number') {
        is_correct = content.correctAnswer === response.answer;
      } else if (typeof content.correctAnswer === 'boolean' || typeof response.answer === 'boolean') {
        const normExpected = String(content.correctAnswer).toLowerCase() === 'true' || content.correctAnswer === 1;
        const normActual = String(response.answer).toLowerCase() === 'true' || response.answer === 1;
        is_correct = normExpected === normActual;
      }
    }

    // Calculate points
    const points = is_correct ? item.points : 0;

    // Create or update response
    const activityResponse = await prisma.activityResponse.upsert({
      where: {
        attempt_id_item_id: {
          attempt_id: Number(attempt_id),
          item_id: Number(item_id),
        },
      },
      create: {
        attempt_id: Number(attempt_id),
        item_id: Number(item_id),
        response,
        is_correct,
        points,
        time_taken,
      },
      update: {
        response,
        is_correct,
        points,
        time_taken,
      },
    });

    // Update attempt score
    const responses = await prisma.activityResponse.findMany({
      where: { attempt_id: Number(attempt_id) },
    });

    const totalScore = responses.reduce((sum, r) => sum + r.points, 0);

    await prisma.activityAttempt.update({
      where: { id: Number(attempt_id) },
      data: {
        score: totalScore,
      },
    });

    return sendSuccess(res, activityResponse, 'Response submitted successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Complete Attempt
export const completeAttempt = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { time_taken } = req.body;

    // Get attempt with responses
    const attempt = await prisma.activityAttempt.findUnique({
      where: { id: Number(id) },
      include: {
        responses: true,
      },
    });

    if (!attempt) {
      return sendError(res, 'Attempt not found', 404);
    }

    if (attempt.is_completed) {
      return sendError(res, 'Attempt already completed', 400);
    }

    // Calculate final score: support client-submitted score for game types (Chess, Sudoku, etc.)
    const calculatedScore = attempt.responses.reduce((sum, r) => sum + r.points, 0);
    const score = (req.body.score !== undefined && req.body.score !== null && !isNaN(Number(req.body.score)))
      ? Number(req.body.score)
      : calculatedScore;
    const max_score = Math.max(attempt.max_score, score);

    // Update attempt
    const updatedAttempt = await prisma.activityAttempt.update({
      where: { id: Number(id) },
      data: {
        is_completed: true,
        completed_at: new Date(),
        score,
        max_score,
        time_taken,
      },
      include: {
        activity: true,
        responses: {
          include: {
            item: true,
          },
        },
      },
    });

    return sendSuccess(res, updatedAttempt, 'Activity completed successfully');
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Attempt by ID
export const getAttemptById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attempt = await prisma.activityAttempt.findUnique({
      where: { id: Number(id) },
      include: {
        activity: {
          include: {
            group: true,
            items: {
              orderBy: {
                order: 'asc',
              },
            },
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
        responses: {
          include: {
            item: true,
          },
          orderBy: {
            item: {
              order: 'asc',
            },
          },
        },
      },
    });

    if (!attempt) {
      return sendError(res, 'Attempt not found', 404);
    }

    return sendSuccess(res, attempt);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Student's Attempts
export const getStudentAttempts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { activity_id, is_completed } = req.query;

    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    const where: any = {
      student_id: student.id,
    };
    if (activity_id) where.activity_id = Number(activity_id);
    if (is_completed !== undefined) where.is_completed = is_completed === 'true';

    const attempts = await prisma.activityAttempt.findMany({
      where,
      include: {
        activity: {
          include: {
            group: true,
          },
        },
      },
      orderBy: {
        started_at: 'desc',
      },
    });

    return sendSuccess(res, attempts);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Activity Attempts (for admin/teacher)
export const getActivityAttempts = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const { page = 1, limit = 20, is_completed } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      activity_id: Number(activityId),
    };
    if (is_completed !== undefined) where.is_completed = is_completed === 'true';

    const [attempts, total] = await Promise.all([
      prisma.activityAttempt.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
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
          activity: true,
        },
        orderBy: {
          started_at: 'desc',
        },
      }),
      prisma.activityAttempt.count({ where }),
    ]);

    return sendSuccess(res, {
      attempts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    return sendError(res, error.message);
  }
};

// Get Leaderboard for Activity
export const getActivityLeaderboard = async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const { limit = 10 } = req.query;

    const leaderboard = await prisma.activityAttempt.findMany({
      where: {
        activity_id: Number(activityId),
        is_completed: true,
      },
      take: Number(limit),
      include: {
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
      orderBy: [
        {
          score: 'desc',
        },
        {
          time_taken: 'asc',
        },
      ],
    });

    return sendSuccess(res, leaderboard);
  } catch (error: any) {
    return sendError(res, error.message);
  }
};
