import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadToS3, getFileType } from '../utils/s3.js';

const prisma = new PrismaClient();

// Start a test attempt
export const startTestAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const userId = (req as any).user!.id;

    // Get student ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user?.student) {
      return sendError(res, 'Student profile not found', 404);
    }

    // Check if test exists and is available
    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: { questions: true },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    if (!test.is_published) {
      return sendError(res, 'Test is not published', 403);
    }

    // Time restrictions only apply to subject-based tests, not test series tests
    const isTestSeriesTest = !!test.test_series_id;
    const now = new Date();
    if (!isTestSeriesTest && (now < test.available_from || now > test.available_until)) {
      return sendError(res, 'Test is not available at this time', 403);
    }

    // Check if student has already attempted this test (non-practice attempt)
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        test_id: parseInt(testId),
        student_id: user.student.id,
        is_practice: false,
      },
    });

    if (existingAttempt) {
      return sendError(res, 'You have already attempted this test', 403);
    }

    // Create test attempt
    const testAttempt = await prisma.testAttempt.create({
      data: {
        test_id: parseInt(testId),
        student_id: user.student.id,
        total_marks: test.total_marks,
      },
      include: {
        test: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                question_type: true,
                question_text: true,
                options: true,
                marks: true,
                order: true,
              },
            },
          },
        },
      },
    });

    return sendSuccess(res, testAttempt, 'Test attempt started successfully', 201);
  } catch (error) {
    console.error('Error starting test attempt:', error);
    return sendError(res, 'Failed to start test attempt');
  }
};

// Start a practice attempt (for closed/already-attempted tests)
export const startPracticeAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const userId = (req as any).user!.id;

    // Get student ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user?.student) {
      return sendError(res, 'Student profile not found', 404);
    }

    // Check if test exists
    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: { questions: true },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    if (!test.is_published) {
      return sendError(res, 'Test is not published', 403);
    }

    // Create practice attempt (unlimited practice attempts allowed)
    const testAttempt = await prisma.testAttempt.create({
      data: {
        test_id: parseInt(testId),
        student_id: user.student.id,
        total_marks: test.total_marks,
        is_practice: true,
      },
      include: {
        test: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                question_type: true,
                question_text: true,
                options: true,
                marks: true,
                order: true,
                correct_answer: true, // Include correct answers for practice mode
              },
            },
          },
        },
      },
    });

    return sendSuccess(res, testAttempt, 'Practice attempt started successfully', 201);
  } catch (error) {
    console.error('Error starting practice attempt:', error);
    return sendError(res, 'Failed to start practice attempt');
  }
};

// Submit answer for a question
export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return sendError(res, 'Attempt ID is required', 400);
    }

    const { question_id, answer_text, answer_media_url, answer_media_type } = req.body;
    const file = req.file;

    // Parse question_id to ensure it's a number
    const parsedQuestionId = parseInt(question_id);
    if (isNaN(parsedQuestionId)) {
      return sendError(res, 'Invalid question ID', 400);
    }

    // Verify the attempt exists and belongs to the user
    const userId = (req as any).user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user?.student) {
      return sendError(res, 'Student profile not found', 404);
    }

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: parseInt(attemptId),
        student_id: user.student.id,
      },
      include: {
        test: true,
      },
    });

    if (!attempt) {
      return sendError(res, 'Test attempt not found', 404);
    }

    if (attempt.submitted_at) {
      return sendError(res, 'Test already submitted', 403);
    }

    // Check if question belongs to this test
    const question = await prisma.question.findFirst({
      where: {
        id: parsedQuestionId,
        test_id: attempt.test_id,
      },
    });

    if (!question) {
      return sendError(res, 'Question not found', 404);
    }

    // Handle file upload if present
    let answerMediaUrl = answer_media_url || null;
    let answerMediaType = answer_media_type || null;

    if (file) {
      const uploadResult = await uploadToS3(file, 'test-answers');
      answerMediaUrl = uploadResult.url;
      answerMediaType = getFileType(uploadResult.filename);
    }

    // Create or update answer
    const answer = await prisma.answer.upsert({
      where: {
        test_attempt_id_question_id: {
          test_attempt_id: parseInt(attemptId),
          question_id: parsedQuestionId,
        },
      },
      update: {
        answer_text,
        answer_media_url: answerMediaUrl,
        answer_media_type: answerMediaType,
      },
      create: {
        test_attempt_id: parseInt(attemptId),
        question_id: parsedQuestionId,
        answer_text,
        answer_media_url: answerMediaUrl,
        answer_media_type: answerMediaType,
      },
    });

    return sendSuccess(res, answer, 'Answer submitted successfully');
  } catch (error) {
    console.error('Error submitting answer:', error);
    return sendError(res, 'Failed to submit answer');
  }
};

// Submit the entire test
export const submitTest = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return sendError(res, 'Attempt ID is required', 400);
    }

    // Verify the attempt exists and belongs to the user
    const userId = (req as any).user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user?.student) {
      return sendError(res, 'Student profile not found', 404);
    }

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: parseInt(attemptId),
        student_id: user.student.id,
      },
    });

    if (!attempt) {
      return sendError(res, 'Test attempt not found', 404);
    }

    if (attempt.submitted_at) {
      return sendError(res, 'Test already submitted', 403);
    }

    // Auto-grade MCQ and True/False questions
    const answers = await prisma.answer.findMany({
      where: { test_attempt_id: parseInt(attemptId) },
      include: { question: true },
    });

    let autoGradedScore = 0;
    let hasShortAnswers = false;

    for (const answer of answers) {
      if (
        answer.question.question_type === 'MCQ' ||
        answer.question.question_type === 'TRUE_FALSE'
      ) {
        const isCorrect =
          answer.answer_text?.trim().toLowerCase() ===
          answer.question.correct_answer?.trim().toLowerCase();

        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            is_correct: isCorrect,
            marks_obtained: isCorrect ? answer.question.marks : 0,
          },
        });

        if (isCorrect) {
          autoGradedScore += answer.question.marks;
        }
      } else {
        hasShortAnswers = true;
      }
    }

    // Update test attempt
    const updatedAttempt = await prisma.testAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        submitted_at: new Date(),
        score: hasShortAnswers ? null : autoGradedScore,
        is_graded: !hasShortAnswers,
        is_passed: hasShortAnswers ? null : autoGradedScore >= attempt.total_marks,
      },
      include: {
        test: true,
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    return sendSuccess(res, updatedAttempt, 'Test submitted successfully');
  } catch (error) {
    console.error('Error submitting test:', error);
    return sendError(res, 'Failed to submit test');
  }
};

// Get test attempt by ID
export const getTestAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return sendError(res, 'Attempt ID is required', 400);
    }
    const userId = (req as any).user!.id;
    const userRole = (req as any).userRole;

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: parseInt(attemptId) },
      include: {
        test: {
          include: {
            subject: true,
            questions: {
              orderBy: { order: 'asc' },
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
        answers: {
          include: {
            question: true,
          },
        },
        grader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!attempt) {
      return sendError(res, 'Test attempt not found', 404);
    }

    // Students can only view their own attempts
    if (userRole === 'STUDENT' && attempt.student.user.id !== userId) {
      return sendError(res, 'Unauthorized', 403);
    }

    // If student hasn't been graded yet, hide correct answers and scores
    if (userRole === 'STUDENT' && !attempt.is_graded) {
      attempt.answers = attempt.answers.map((a) => ({
        ...a,
        is_correct: null,
        marks_obtained: null,
        question: {
          ...a.question,
          correct_answer: null,
        },
      }));
    }

    return sendSuccess(res, attempt, 'Test attempt fetched successfully');
  } catch (error) {
    console.error('Error fetching test attempt:', error);
    return sendError(res, 'Failed to fetch test attempt');
  }
};

// Get all attempts for a test (teachers/admin)
export const getTestAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const attempts = await prisma.testAttempt.findMany({
      where: { test_id: parseInt(testId) },
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
        grader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submitted_at: 'desc',
      },
    });

    return sendSuccess(res, attempts, 'Test attempts fetched successfully');
  } catch (error) {
    console.error('Error fetching test attempts:', error);
    return sendError(res, 'Failed to fetch test attempts');
  }
};

// Get student's own test attempts
export const getMyTestAttempts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { subject_id, test_id } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user?.student) {
      return sendError(res, 'Student profile not found', 404);
    }

    const where: any = {
      student_id: user.student.id,
    };

    // Filter by specific test ID
    if (test_id) {
      where.test_id = parseInt(test_id as string);
    }

    // Filter by subject
    if (subject_id) {
      where.test = {
        subject_id: parseInt(subject_id as string),
      };
    }

    const attempts = await prisma.testAttempt.findMany({
      where,
      include: {
        test: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: {
        started_at: 'desc',
      },
    });

    return sendSuccess(res, attempts, 'Test attempts fetched successfully');
  } catch (error) {
    console.error('Error fetching test attempts:', error);
    return sendError(res, 'Failed to fetch test attempts');
  }
};

// Grade a test attempt (mark short answer questions)
export const gradeTestAttempt = async (req: AuthRequest, res: Response) => {
  try {
    const { attemptId } = req.params;

    if (!attemptId) {
      return sendError(res, 'Attempt ID is required', 400);
    }

    const { grades } = req.body; // Array of { answer_id, marks_obtained, is_correct }
    const userId = (req as any).user!.id;

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: parseInt(attemptId) },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
        test: true,
      },
    });

    if (!attempt) {
      return sendError(res, 'Test attempt not found', 404);
    }

    if (attempt.is_graded) {
      return sendError(res, 'Test attempt already graded', 403);
    }

    // Update answer grades
    for (const grade of grades) {
      await prisma.answer.update({
        where: { id: grade.answer_id },
        data: {
          marks_obtained: grade.marks_obtained,
          is_correct: grade.is_correct,
        },
      });
    }

    // Calculate total score
    const updatedAnswers = await prisma.answer.findMany({
      where: { test_attempt_id: parseInt(attemptId) },
    });

    const totalScore = updatedAnswers.reduce(
      (sum, answer) => sum + (answer.marks_obtained || 0),
      0
    );

    // Update test attempt
    const updatedAttempt = await prisma.testAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        score: totalScore,
        is_graded: true,
        is_passed: totalScore >= attempt.test.passing_marks,
        graded_by: userId,
        graded_at: new Date(),
      },
      include: {
        test: true,
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
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    return sendSuccess(res, updatedAttempt, 'Test graded successfully');
  } catch (error) {
    console.error('Error grading test:', error);
    return sendError(res, 'Failed to grade test');
  }
};
