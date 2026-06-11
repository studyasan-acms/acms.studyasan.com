import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendCertificateEmail } from '../services/email.service.js';
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

    // Auto-grade MCQ and True/False questions
    const answers = await prisma.answer.findMany({
      where: { test_attempt_id: parseInt(attemptId) },
      include: { question: true },
    });

    const isAutograded = (attempt.test as any)?.is_autograded ?? true;
    let hasShortAnswers = !isAutograded;
    const testHasNegativeMarking = !!(attempt.test as any)?.has_negative_marking;

    if (isAutograded) {
      const manualQuestionsCount = await prisma.question.count({
        where: {
          test_id: attempt.test_id,
          question_type: {
            notIn: ['MCQ', 'TRUE_FALSE', 'MATCH_THE_FOLLOWING', 'CASE_STUDY']
          }
        }
      });
      if (manualQuestionsCount > 0) {
        hasShortAnswers = true;
      }
    }

    let autoGradedScore = 0;
    for (const answer of answers) {
      if (
        isAutograded &&
        (answer.question.question_type === 'MCQ' ||
        answer.question.question_type === 'TRUE_FALSE')
      ) {
        const isCorrect =
          answer.answer_text?.trim().toLowerCase() ===
          answer.question.correct_answer?.trim().toLowerCase();

        const questionNegativeMarks = testHasNegativeMarking
          ? Number((answer.question as any).negative_marks || 0)
          : 0;

        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            is_correct: isCorrect,
            marks_obtained: isCorrect
              ? answer.question.marks
              : (testHasNegativeMarking ? -questionNegativeMarks : 0),
          },
        });

        if (isCorrect) {
          autoGradedScore += answer.question.marks;
        } else if (testHasNegativeMarking) {
          autoGradedScore -= questionNegativeMarks;
        }
      } else if (isAutograded && answer.question.question_type === 'MATCH_THE_FOLLOWING') {
        let correctPairs = 0;
        let totalPairs = 0;
        try {
          let correctOptions = typeof answer.question.options === 'string'
            ? JSON.parse(answer.question.options)
            : answer.question.options;
            
          if (Array.isArray(correctOptions)) {
            correctOptions = correctOptions.map((opt: any) => {
              if (typeof opt === 'string') {
                try { return JSON.parse(opt); } catch(e) { return opt; }
              }
              return opt;
            });
          }
          const studentAnswers = answer.answer_text ? JSON.parse(answer.answer_text) : [];

          if (Array.isArray(correctOptions) && Array.isArray(studentAnswers)) {
            totalPairs = correctOptions.length;
            studentAnswers.forEach(ansPair => {
              const correctPair = correctOptions.find(opt => opt.left === ansPair.left);
              if (correctPair && correctPair.right === ansPair.right) {
                correctPairs++;
              }
            });
          }
        } catch (e) {
          console.error('Error parsing MATCH_THE_FOLLOWING answers', e);
        }

        const isCorrect = totalPairs > 0 && correctPairs === totalPairs;
        const marksObtained = totalPairs > 0 ? (answer.question.marks / totalPairs) * correctPairs : 0;

        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            is_correct: isCorrect,
            marks_obtained: marksObtained,
          },
        });

        autoGradedScore += marksObtained;
      } else if (answer.question.question_type === 'CASE_STUDY') {
        // Case Study is just a parent container/paragraph, it doesn't need grading.
        // We set marks to 0 and mark as correct so it doesn't fail any checks.
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            is_correct: true,
            marks_obtained: 0,
          },
        });
      } else {
        hasShortAnswers = true;
      }
    }

    // Update test attempt
    const finalScore = hasShortAnswers ? null : Math.round(autoGradedScore);
    const updatedAttempt = await prisma.testAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        submitted_at: new Date(),
        score: finalScore,
        is_graded: !hasShortAnswers,
        is_passed: hasShortAnswers ? null : (finalScore !== null && finalScore >= attempt.test.passing_marks),
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
    if (userRole === 'STUDENT' && attempt.student?.user.id !== userId) {
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
        test: {
          include: {
            subject: true,
            test_series: true,
          },
        },
      },
    });

    if (!attempt) {
      return sendError(res, 'Test attempt not found', 404);
    }

    if (attempt.is_graded) {
      return sendError(res, 'Test attempt already graded', 403);
    }

    // Authorization check: Verify teacher can grade this test
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    console.log('🔍 [GRADE] User role:', user?.role, 'UserId:', userId);

    if (user?.role !== 'ADMIN') {
      // Not an admin, check teacher permissions
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        include: {
          role: true,
          teacher_subject_junctions: {
            select: { subject_id: true },
          },
          test_series_junctions: {
            select: { test_series_id: true },
          },
        },
      });

      console.log('🔍 [GRADE] Teacher found:', !!teacher, 'Role:', teacher?.role?.name);

      if (!teacher) {
        return sendError(res, 'Teacher profile not found', 404);
      }

      // Check if teacher has "subjects and tests" permission
      const permissions = (teacher.role?.permissions as Record<string, any>) || {};
      const hasGradeAllPermission = permissions.tests?.grade_all === true;

      console.log('🔍 [GRADE] Permissions:', JSON.stringify(permissions));
      console.log('🔍 [GRADE] Has grade_all:', hasGradeAllPermission);

      if (!hasGradeAllPermission) {
        // Teacher doesn't have grade_all permission, check subject/test series access
        const testHasSubject = !!attempt.test.subject_id;
        const testHasTestSeries = !!attempt.test.test_series_id;
        
        const teachesSubject =
          testHasSubject &&
          teacher.teacher_subject_junctions.some(
            (tj) => tj.subject_id === attempt.test.subject_id
          );

        const managesTestSeries =
          testHasTestSeries &&
          teacher.test_series_junctions.some(
            (tj) => tj.test_series_id === attempt.test.test_series_id
          );

        console.log('🔍 [GRADE] Test subject_id:', attempt.test.subject_id, 'Teaches:', teachesSubject);
        console.log('🔍 [GRADE] Test test_series_id:', attempt.test.test_series_id, 'Manages:', managesTestSeries);
        console.log('🔍 [GRADE] Teacher subjects:', teacher.teacher_subject_junctions.map(t => t.subject_id));
        console.log('🔍 [GRADE] Teacher test_series:', teacher.test_series_junctions.map(t => t.test_series_id));

        const canGradeTest = teachesSubject || managesTestSeries;

        if (!canGradeTest) {
          return sendError(
            res,
            'You do not have permission to grade this test. You must either teach the subject or manage the test series.',
            403
          );
        }
      }
    }

    // Update answer grades
    for (const grade of grades) {
      if (grade.answer_id) {
        await prisma.answer.update({
          where: { id: grade.answer_id },
          data: {
            marks_obtained: grade.marks_obtained,
            is_correct: grade.is_correct,
          },
        });
      } else if (grade.question_id) {
        await prisma.answer.upsert({
          where: {
            test_attempt_id_question_id: {
              test_attempt_id: parseInt(attemptId),
              question_id: grade.question_id,
            }
          },
          update: {
            marks_obtained: grade.marks_obtained,
            is_correct: grade.is_correct,
          },
          create: {
            test_attempt_id: parseInt(attemptId),
            question_id: grade.question_id,
            marks_obtained: grade.marks_obtained,
            is_correct: grade.is_correct,
            answer_text: null,
          }
        });
      }
    }

    // Calculate total score
    const updatedAnswers = await prisma.answer.findMany({
      where: { test_attempt_id: parseInt(attemptId) },
    });

    const rawTotalScore = updatedAnswers.reduce(
      (sum, answer) => sum + (answer.marks_obtained || 0),
      0
    );
    const totalScore = Math.round(rawTotalScore);

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

// ==========================================
// PUBLIC CERTIFICATION TEST METHODS
// ==========================================

// Helper to get Guest Student ID
const getGuestStudentId = async () => {
  let guestUser = await prisma.user.findUnique({ where: { email: 'guest@studyasan.com' } });

  if (!guestUser) {
    // Create Guest User if not exists
    const hashedPassword = await import('bcrypt').then(m => m.hash('GUEST_PWD_' + Date.now(), 10));
    guestUser = await prisma.user.create({
      data: {
        name: 'Guest User',
        email: 'guest@studyasan.com',
        password: hashedPassword,
        role: 'STUDENT',
        phone: '0000000000'
      }
    });
  }

  let guestStudent = await prisma.student.findUnique({ where: { user_id: guestUser.id } });
  if (!guestStudent) {
    guestStudent = await prisma.student.create({
      data: { user_id: guestUser.id }
    });
  }
  return guestStudent.id;
};

// Start Public Test Attempt
export const startPublicTestAttempt = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const { candidateName, candidateEmail } = req.body;

    if (!testId || !candidateName) {
      return sendError(res, 'Test ID and Name are required', 400);
    }

    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: { questions: true }
    });

    if (!test) return sendError(res, 'Test not found', 404);

    // Verify Certification Mode
    const isCertification = test.is_certification ||
      (test.description && test.description.includes('[CERTIFICATION]')) ||
      test.title.includes('[CERTIFICATION]');

    if (!isCertification) {
      return sendError(res, 'This test is not available publicly', 403);
    }

    if (!test.is_published) return sendError(res, 'Test is not active', 403);

    // Check dates
    const now = new Date();
    if (now < test.available_from || now > test.available_until) {
      return sendError(res, 'Test is not available at this time', 403);
    }

    // Get Guest Student ID
    const guestStudentId = await getGuestStudentId();

    // Create Attempt
    const testAttempt = await prisma.testAttempt.create({
      data: {
        test_id: parseInt(testId),
        student_id: guestStudentId,
        total_marks: test.total_marks,
        guest_info: { name: candidateName, email: candidateEmail },
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

    return sendSuccess(res, { attempt: testAttempt, candidateName }, 'Test started successfully', 201);
  } catch (error) {
    console.error('Error starting public test:', error);
    return sendError(res, 'Failed to start test');
  }
};

// Submit Public Test
export const submitPublicTest = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { answers, candidateName } = req.body; // array of { question_id, answer_text }

    if (!attemptId) return sendError(res, 'Attempt ID is required', 400);

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: parseInt(attemptId) },
      include: { test: true }
    });

    if (!attempt) return sendError(res, 'Attempt not found', 404);
    if (attempt.submitted_at) return sendError(res, 'Already submitted', 403);

    // Process Answers
    let score = 0;
    const processedAnswers = [];

    // Fetch all questions to grade
    const questions = await prisma.question.findMany({
      where: { test_id: attempt.test_id }
    });

    const testHasNegativeMarking = !!(attempt.test as any)?.has_negative_marking;
    const isAutograded = (attempt.test as any)?.is_autograded ?? true;

    for (const ans of answers) {
      const question = questions.find(q => q.id === parseInt(ans.question_id));
      if (!question) continue;

      let isCorrect = false;
      let marksObtained = 0;

      if (isAutograded && (question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE')) {
        if (ans.answer_text?.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase()) {
          isCorrect = true;
          marksObtained = question.marks;
        } else if (testHasNegativeMarking) {
          marksObtained = -Number((question as any).negative_marks || 0);
        }
      } else if (isAutograded && question.question_type === 'MATCH_THE_FOLLOWING') {
        let correctPairs = 0;
        let totalPairs = 0;
        try {
          let correctOptions = typeof question.options === 'string'
            ? JSON.parse(question.options)
            : question.options;
            
          if (Array.isArray(correctOptions)) {
            correctOptions = correctOptions.map((opt: any) => {
              if (typeof opt === 'string') {
                try { return JSON.parse(opt); } catch(e) { return opt; }
              }
              return opt;
            });
          }
          const studentAnswers = ans.answer_text ? JSON.parse(ans.answer_text) : [];

          if (Array.isArray(correctOptions) && Array.isArray(studentAnswers)) {
            totalPairs = correctOptions.length;
            studentAnswers.forEach(ansPair => {
              const correctPair = correctOptions.find(opt => opt.left === ansPair.left);
              if (correctPair && correctPair.right === ansPair.right) {
                correctPairs++;
              }
            });
          }
        } catch (e) {
          console.error('Error parsing MATCH_THE_FOLLOWING answers', e);
        }

        isCorrect = totalPairs > 0 && correctPairs === totalPairs;
        marksObtained = totalPairs > 0 ? (question.marks / totalPairs) * correctPairs : 0;
      }
      // Auto-pass descriptive for now or mark as 0? 
      // For certification, usually only MCQs are auto-graded. 
      // If manual grading needed, public test is tricky. We assume auto-grade for certification.

      score += marksObtained;

      // Create Answer Record
      await prisma.answer.create({
        data: {
          test_attempt_id: attempt.id,
          question_id: question.id,
          answer_text: ans.answer_text,
          is_correct: isCorrect,
          marks_obtained: marksObtained
        }
      });
    }

    const isPassed = score >= attempt.test.passing_marks;

    // Update Attempt
    const updatedAttempt = await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: {
        submitted_at: new Date(),
        score,
        is_graded: true, // Auto-graded
        is_passed: isPassed
      }
    });

    // Generate Certificate if passed
    let certificate = null;
    let certificateCode: string | undefined;

    if (isPassed) {
      // Generate Unique Code (e.g., SA-CERT-<TESTID>-<ATTEMPTID>-<RANDOM>)
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      certificateCode = `SA-CERT-${attempt.test_id}-${attempt.id}-${randomPart}`;

      certificate = await prisma.certificate.create({
        data: {
          test_id: attempt.test_id,
          test_attempt_id: attempt.id,
          recipient_name: candidateName,
          code: certificateCode,
        }
      });

      // Send Certificate Email (if email is available in guest_info)
      const guestInfo = attempt.guest_info as any;
      const candidateEmail = guestInfo?.email;

      if (candidateEmail) {
        // Send email asynchronously (don't await to block response)
        sendCertificateEmail(
          candidateEmail,
          candidateName,
          attempt.test.title,
          certificateCode,
          score,
          attempt.test.total_marks
        ).catch((err: any) => console.error('Failed to send certificate email:', err));
      }
    }

    return sendSuccess(res, {
      score,
      total_marks: attempt.test.total_marks,
      is_passed: isPassed,
      candidateName,
      attemptId: attempt.id,
      testTitle: attempt.test.title,
      certificateDate: new Date(),
      certificateCode: certificateCode
    }, 'Test submitted successfully');

  } catch (error) {
    console.error('Error submitting public test:', error);
    return sendError(res, 'Failed to submit test');
  }
};
