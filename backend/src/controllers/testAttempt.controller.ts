import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendCertificateEmail } from '../services/email.service.js';
import { uploadToS3, getFileType } from '../utils/s3.js';

const prisma = new PrismaClient();

/**
 * Helper to robustly compare student's MCQ answer with correct answer key.
 * Handles cases where student submitted letter ("C") and correct_answer is option text,
 * or student submitted text and correct_answer is letter, or both are letters/text.
 */
export function isMCQAnswerCorrect(
  studentAnswer: string | null | undefined,
  correctAnswer: string | null | undefined,
  optionsRaw: any
): boolean {
  if (!studentAnswer || !correctAnswer) return false;

  const sAns = studentAnswer.trim().toLowerCase();
  const cAns = correctAnswer.trim().toLowerCase();

  // Direct exact match (case-insensitive)
  if (sAns === cAns) return true;

  // Normalize options array
  let options: string[] = [];
  try {
    const parsed = typeof optionsRaw === 'string' ? JSON.parse(optionsRaw) : optionsRaw;
    if (Array.isArray(parsed)) {
      options = parsed.map((opt: any) => {
        if (!opt) return '';
        if (typeof opt === 'string') return opt.trim().toLowerCase();
        if (typeof opt === 'object' && opt.text) return String(opt.text).trim().toLowerCase();
        return String(opt).trim().toLowerCase();
      });
    }
  } catch (e) {
    // ignore parse error
  }

  // Find 0-based index of student answer
  let studentIdx = -1;
  if (/^[a-z]$/i.test(sAns)) {
    studentIdx = sAns.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1, 'c' -> 2
  } else if (/^option\s+[a-z]$/i.test(sAns)) {
    const letter = sAns.replace(/^option\s+/, '').trim();
    studentIdx = letter.charCodeAt(0) - 97;
  } else if (/^\d+$/.test(sAns)) {
    const n = parseInt(sAns, 10);
    if (n >= 0 && n < options.length) studentIdx = n;
    else if (n >= 1 && n <= options.length) studentIdx = n - 1;
  } else if (options.length > 0) {
    studentIdx = options.findIndex((opt) => opt === sAns);
  }

  // Find 0-based index of correct answer
  let correctIdx = -1;
  if (/^[a-z]$/i.test(cAns)) {
    correctIdx = cAns.charCodeAt(0) - 97;
  } else if (/^option\s+[a-z]$/i.test(cAns)) {
    const letter = cAns.replace(/^option\s+/, '').trim();
    correctIdx = letter.charCodeAt(0) - 97;
  } else if (/^\d+$/.test(cAns)) {
    const n = parseInt(cAns, 10);
    if (n >= 0 && n < options.length) correctIdx = n;
    else if (n >= 1 && n <= options.length) correctIdx = n - 1;
  } else if (options.length > 0) {
    correctIdx = options.findIndex((opt) => opt === cAns);
  }

  // Both indices match (e.g. both resolved to option C / index 2)
  if (studentIdx !== -1 && correctIdx !== -1 && studentIdx === correctIdx) {
    return true;
  }

  // If studentIdx was found (e.g. index 2 for "C"), check if option[2] equals cAns
  if (studentIdx >= 0 && studentIdx < options.length) {
    if (options[studentIdx] === cAns) return true;
  }

  // If correctIdx was found (e.g. index 2 for "favorite_colors..."), check if option[2] equals sAns or if sAns is letter
  if (correctIdx >= 0 && correctIdx < options.length) {
    if (options[correctIdx] === sAns) return true;
    const correctLetter = String.fromCharCode(65 + correctIdx).toLowerCase();
    if (sAns === correctLetter) return true;
  }

  return false;
}

/**
 * Render certificate text by replacing variables like {name}, {date}, {test_title}, etc.
 */
export function renderCertificateText(
  template: string | null | undefined,
  variables: {
    name: string;
    test_title: string;
    date: string;
    score: number;
    total_marks: number;
    percentage: string;
    certificate_id: string;
  }
): string {
  const defaultText =
    'has successfully completed the assessment for {test_title} with a score of {score}/{total_marks} ({percentage}) on {date}.';
  let text = template?.trim() || defaultText;

  text = text
    .replace(/\{name\}|\{candidate_name\}/gi, variables.name)
    .replace(/\{test_title\}|\{test_name\}|\{exam_title\}/gi, variables.test_title)
    .replace(/\{date\}|\{issue_date\}|\{completion_date\}/gi, variables.date)
    .replace(/\{score\}|\{marks_obtained\}/gi, String(variables.score))
    .replace(/\{total_marks\}|\{max_marks\}/gi, String(variables.total_marks))
    .replace(/\{percentage\}|\{percent\}/gi, variables.percentage)
    .replace(/\{certificate_id\}|\{certificate_code\}|\{code\}/gi, variables.certificate_id);

  return text;
}

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

    const isPracticeAttempt = test.test_type === 'PRACTICE' || Boolean(req.body?.is_practice);

    // Check if student has already attempted this test (non-practice attempt) or earned a certificate
    if (!isPracticeAttempt) {
      const existingAttempt = await prisma.testAttempt.findFirst({
        where: {
          test_id: parseInt(testId),
          student_id: user.student.id,
          is_practice: false,
        },
        include: {
          certificate: true,
        },
      });

      if (existingAttempt) {
        if (existingAttempt.certificate) {
          return sendError(
            res,
            `You have already completed this assessment and earned your official certificate (Certificate ID: ${existingAttempt.certificate.code}). You cannot re-attempt this exam.`,
            403
          );
        }
        return sendError(res, 'You have already attempted this test', 403);
      }
    }

    // Calculate actual total marks from test questions if available
    const questionTotalMarks = test.questions?.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) || 0;
    const effectiveTotalMarks = questionTotalMarks > 0 ? questionTotalMarks : test.total_marks;

    // Create test attempt
    const testAttempt = await prisma.testAttempt.create({
      data: {
        test_id: parseInt(testId),
        student_id: user.student.id,
        total_marks: effectiveTotalMarks,
        is_practice: isPracticeAttempt,
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

    // Auto-grade questions based on each question's is_autograded setting
    const answers = await prisma.answer.findMany({
      where: { test_attempt_id: parseInt(attemptId) },
      include: { question: true },
    });

    const testHasNegativeMarking = !!(attempt.test as any)?.has_negative_marking;

    // Check if test contains questions that require manual grading
    const allQuestions = await prisma.question.findMany({
      where: { test_id: attempt.test_id },
    });

    let hasManualQuestions = allQuestions.some((q: any) => {
      const isAutograded = q.is_autograded !== undefined
        ? q.is_autograded
        : (q.question_type === 'MCQ' || q.question_type === 'TRUE_FALSE' || q.question_type === 'MATCH_THE_FOLLOWING');
      return !isAutograded;
    });

    let autoGradedScore = 0;
    for (const answer of answers) {
      const q = answer.question as any;
      const isAutograded = q.is_autograded !== undefined
        ? q.is_autograded
        : (q.question_type === 'MCQ' || q.question_type === 'TRUE_FALSE' || q.question_type === 'MATCH_THE_FOLLOWING');

      if (isAutograded) {
        if (q.question_type === 'MCQ') {
          const isCorrect = isMCQAnswerCorrect(answer.answer_text, q.correct_answer, q.options);
          const questionNegativeMarks = testHasNegativeMarking
            ? Number(q.negative_marks || 0)
            : 0;

          const marksObtained = isCorrect
            ? q.marks
            : (testHasNegativeMarking ? -questionNegativeMarks : 0);

          await prisma.answer.update({
            where: { id: answer.id },
            data: {
              is_correct: isCorrect,
              marks_obtained: marksObtained,
            },
          });

          autoGradedScore += marksObtained;
        } else if (q.question_type === 'TRUE_FALSE') {
          const isCorrect =
            answer.answer_text?.trim().toLowerCase() ===
            q.correct_answer?.trim().toLowerCase();

          const questionNegativeMarks = testHasNegativeMarking
            ? Number(q.negative_marks || 0)
            : 0;

          const marksObtained = isCorrect
            ? q.marks
            : (testHasNegativeMarking ? -questionNegativeMarks : 0);

          await prisma.answer.update({
            where: { id: answer.id },
            data: {
              is_correct: isCorrect,
              marks_obtained: marksObtained,
            },
          });

          autoGradedScore += marksObtained;
        } else if (q.question_type === 'MATCH_THE_FOLLOWING') {
          let correctPairs = 0;
          let totalPairs = 0;
          try {
            let correctOptions = typeof q.options === 'string'
              ? JSON.parse(q.options)
              : q.options;
              
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
          const marksObtained = totalPairs > 0 ? (q.marks / totalPairs) * correctPairs : 0;

          await prisma.answer.update({
            where: { id: answer.id },
            data: {
              is_correct: isCorrect,
              marks_obtained: marksObtained,
            },
          });

          autoGradedScore += marksObtained;
        } else if (q.question_type === 'CASE_STUDY' && q.marks === 0) {
          await prisma.answer.update({
            where: { id: answer.id },
            data: {
              is_correct: true,
              marks_obtained: 0,
            },
          });
        } else if (q.correct_answer && q.correct_answer.trim()) {
          // Short answer with auto-check enabled and correct answer defined
          const isCorrect =
            answer.answer_text?.trim().toLowerCase() ===
            q.correct_answer?.trim().toLowerCase();

          const marksObtained = isCorrect ? q.marks : 0;

          await prisma.answer.update({
            where: { id: answer.id },
            data: {
              is_correct: isCorrect,
              marks_obtained: marksObtained,
            },
          });

          autoGradedScore += marksObtained;
        } else {
          hasManualQuestions = true;
          await prisma.answer.update({
            where: { id: answer.id },
            data: {
              is_correct: null,
              marks_obtained: null,
            },
          });
        }
      } else {
        hasManualQuestions = true;
        await prisma.answer.update({
          where: { id: answer.id },
          data: {
            is_correct: null,
            marks_obtained: null,
          },
        });
      }
    }

    // Update test attempt
    const finalScore = hasManualQuestions ? null : Math.max(0, Math.round(autoGradedScore));
    const isGraded = !hasManualQuestions;
    const isPassed = isGraded && finalScore !== null ? finalScore >= attempt.test.passing_marks : null;
    const allQuestionsSum = allQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    const effectiveAttemptTotal = allQuestionsSum > 0 ? allQuestionsSum : attempt.test.total_marks;

    const updatedAttempt = await prisma.testAttempt.update({
      where: { id: parseInt(attemptId) },
      data: {
        submitted_at: new Date(),
        score: finalScore,
        is_graded: isGraded,
        is_passed: isPassed,
        total_marks: effectiveAttemptTotal,
      },
      include: {
        test: true,
        student: {
          include: {
            user: true,
          },
        },
        answers: {
          include: {
            question: true,
          },
        },
      },
    });

    // Generate Certificate for internal tests if certified & passed
    if (isPassed && (attempt.test.is_certification || (attempt.test as any).test_type === 'CERTIFICATION')) {
      try {
        const studentName = (updatedAttempt.student as any)?.user?.name || 'Student';
        const studentEmail = (updatedAttempt.student as any)?.user?.email;
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        const certificateCode = `SA-CERT-${attempt.test_id}-${attempt.id}-${randomPart}`;
        const pct = effectiveAttemptTotal > 0 ? `${((finalScore! / effectiveAttemptTotal) * 100).toFixed(1)}%` : '100%';
        const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const renderedText = renderCertificateText(
          (attempt.test as any)?.certificate_template,
          {
            name: studentName,
            test_title: attempt.test.title,
            date: formattedDate,
            score: finalScore || 0,
            total_marks: effectiveAttemptTotal,
            percentage: pct,
            certificate_id: certificateCode,
          }
        );

        await prisma.certificate.upsert({
          where: { test_attempt_id: attempt.id },
          update: {
            recipient_name: studentName,
            recipient_email: studentEmail || null,
            code: certificateCode,
            certificate_text: renderedText,
          },
          create: {
            test_id: attempt.test_id,
            test_attempt_id: attempt.id,
            recipient_name: studentName,
            recipient_email: studentEmail || null,
            code: certificateCode,
            certificate_text: renderedText,
          },
        });

        if (studentEmail) {
          sendCertificateEmail(
            studentEmail,
            studentName,
            attempt.test.title,
            certificateCode,
            finalScore || 0,
            effectiveAttemptTotal
          ).catch((err) => console.error('Failed to send certificate email:', err));
        }
      } catch (certErr) {
        console.error('Error creating certificate for internal test attempt:', certErr);
      }
    }

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
        certificate: true,
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
        test: {
          select: {
            total_marks: true,
            title: true,
            is_certification: true,
            certificate_title: true,
            certificate_template: true,
            passing_marks: true,
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
        grader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        certificate: true,
      },
      orderBy: {
        submitted_at: 'desc',
      },
    });

    // Normalize total_marks to the current test value so all attempts
    // show a consistent denominator even if the test was edited after
    // some students had already started their attempts.
    const normalizedAttempts = attempts.map(attempt => ({
      ...attempt,
      total_marks: attempt.test.total_marks,
    }));

    return sendSuccess(res, normalizedAttempts, 'Test attempts fetched successfully');
  } catch (error) {
    console.error('Error fetching test attempts:', error);
    return sendError(res, 'Failed to fetch test attempts');
  }
};

// Get all issued certificates (teachers/admin)
export const getAllCertificates = async (req: AuthRequest, res: Response) => {
  try {
    const { testId, search } = req.query;

    const where: any = {};
    if (testId) {
      where.test_id = parseInt(testId as string);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { recipient_name: { contains: q, mode: 'insensitive' } },
        { recipient_email: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const certificates = await prisma.certificate.findMany({
      where,
      include: {
        test: {
          select: {
            id: true,
            title: true,
            total_marks: true,
            passing_marks: true,
            certificate_title: true,
            certificate_template: true,
          },
        },
        attempt: {
          select: {
            id: true,
            score: true,
            total_marks: true,
            submitted_at: true,
            started_at: true,
            is_passed: true,
            guest_info: true,
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
        },
      },
      orderBy: {
        issued_at: 'desc',
      },
    });

    return sendSuccess(res, certificates, 'Certificates fetched successfully');
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return sendError(res, 'Failed to fetch certificates');
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

    // Allow regrading by authorized teachers/admins

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
        total_marks: attempt.test.total_marks, // Sync to current test value in case test was edited after attempt started
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

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    if (!candidateName || !candidateName.trim()) {
      return sendError(res, 'Candidate Full Name is required', 400);
    }

    if (!candidateEmail || !candidateEmail.trim()) {
      return sendError(res, 'Candidate Email address is required', 400);
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

    // Whitelist check: STRICTLY ENFORCE candidate whitelist
    let allowedList: { name?: string; email: string }[] = [];
    try {
      const raw = typeof (test as any).allowed_candidates === 'string'
        ? JSON.parse((test as any).allowed_candidates)
        : (test as any).allowed_candidates;
      if (Array.isArray(raw)) {
        allowedList = raw.filter((c: any) => c && typeof c.email === 'string' && c.email.trim().length > 0);
      }
    } catch (e) {}

    // If whitelist does not exist or has 0 candidates, do NOT allow anyone!
    if (allowedList.length === 0) {
      return sendError(
        res,
        'Access Denied: This certification exam requires candidate whitelisting, and no candidates are currently whitelisted. Please contact the exam administrator to get access.',
        403
      );
    }

    const normalizedEmail = candidateEmail.trim().toLowerCase();
    const matchedCandidate = allowedList.find(
      (c) => c.email && c.email.trim().toLowerCase() === normalizedEmail
    );
    if (!matchedCandidate) {
      return sendError(
        res,
        `Access Denied: The email "${candidateEmail.trim()}" is not authorized to take this certification exam. Only invited candidate emails are permitted. Please contact the administrator.`,
        403
      );
    }

    // Check dates
    const now = new Date();
    if (now < test.available_from || now > test.available_until) {
      return sendError(res, 'Test is not available at this time', 403);
    }

    const finalCandidateName = (matchedCandidate.name && matchedCandidate.name.trim())
      ? matchedCandidate.name.trim()
      : candidateName.trim();

    // Check if candidate has already completed this exam and earned a certificate
    const existingCertificate = await prisma.certificate.findFirst({
      where: {
        test_id: parseInt(testId),
        OR: [
          { recipient_email: { equals: normalizedEmail, mode: 'insensitive' as const } },
          { recipient_name: { equals: finalCandidateName.toLowerCase(), mode: 'insensitive' as const } },
        ],
      },
      include: {
        attempt: true,
      },
    });

    if (existingCertificate) {
      return sendError(
        res,
        `You have already completed this certification exam and earned your official certificate (Certificate ID: ${existingCertificate.code}). You cannot re-attempt this exam.`,
        400
      );
    }

    // Get Guest Student ID
    const guestStudentId = await getGuestStudentId();

    const questionTotalMarks = test.questions?.reduce((sum, q) => sum + (Number(q.marks) || 0), 0) || 0;
    const effectiveTotalMarks = questionTotalMarks > 0 ? questionTotalMarks : test.total_marks;

    // Create Attempt
    const testAttempt = await prisma.testAttempt.create({
      data: {
        test_id: parseInt(testId),
        student_id: guestStudentId,
        total_marks: effectiveTotalMarks,
        guest_info: { name: finalCandidateName, email: normalizedEmail },
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

    return sendSuccess(res, { attempt: testAttempt, candidateName: finalCandidateName }, 'Test started successfully', 201);
  } catch (error) {
    console.error('Error starting public test:', error);
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
    let hasManualQuestions = questions.some((q: any) => {
      const isAutograded = q.is_autograded !== undefined
        ? q.is_autograded
        : (q.question_type === 'MCQ' || q.question_type === 'TRUE_FALSE' || q.question_type === 'MATCH_THE_FOLLOWING');
      return !isAutograded;
    });

    for (const ans of answers) {
      const question = questions.find(q => q.id === parseInt(ans.question_id)) as any;
      if (!question) continue;

      let isCorrect: boolean | null = false;
      let marksObtained: number | null = 0;

      const isAutograded = question.is_autograded !== undefined
        ? question.is_autograded
        : (question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE' || question.question_type === 'MATCH_THE_FOLLOWING');

      if (isAutograded && question.question_type === 'MCQ') {
        isCorrect = isMCQAnswerCorrect(ans.answer_text, question.correct_answer, question.options);
        if (isCorrect) {
          marksObtained = question.marks;
        } else if (testHasNegativeMarking) {
          marksObtained = -Number(question.negative_marks || 0);
        }
      } else if (isAutograded && question.question_type === 'TRUE_FALSE') {
        if (ans.answer_text?.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase()) {
          isCorrect = true;
          marksObtained = question.marks;
        } else if (testHasNegativeMarking) {
          marksObtained = -Number(question.negative_marks || 0);
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
      } else if (question.question_type === 'CASE_STUDY' && question.marks === 0) {
        isCorrect = true;
        marksObtained = 0;
      } else if (isAutograded && question.correct_answer && question.correct_answer.trim()) {
        isCorrect = ans.answer_text?.trim().toLowerCase() === question.correct_answer?.trim().toLowerCase();
        marksObtained = isCorrect ? question.marks : 0;
      } else {
        hasManualQuestions = true;
        isCorrect = null;
        marksObtained = null;
      }

      if (marksObtained !== null) {
        score += marksObtained;
      }

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

    const finalScore = hasManualQuestions ? null : Math.max(0, Math.round(score));
    const isGraded = !hasManualQuestions;
    const isPassed = isGraded && finalScore !== null ? finalScore >= attempt.test.passing_marks : null;

    const allQuestionsSum = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    const effectiveAttemptTotal = allQuestionsSum > 0 ? allQuestionsSum : attempt.test.total_marks;

    // Update Attempt
    const updatedAttempt = await prisma.testAttempt.update({
      where: { id: attempt.id },
      data: {
        submitted_at: new Date(),
        score: finalScore,
        is_graded: isGraded,
        is_passed: isPassed,
        total_marks: effectiveAttemptTotal,
      }
    });

    // Generate Certificate if passed
    let certificate: any = null;
    let certificateCode: string | undefined;
    let renderedCertificateText: string | undefined;
    const guestInfo = attempt.guest_info as any;
    const candidateEmail = guestInfo?.email;
    const verifiedCandidateName = guestInfo?.name || candidateName;

    if (isPassed) {
      // Generate Unique Code (e.g., SA-CERT-<TESTID>-<ATTEMPTID>-<RANDOM>)
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      certificateCode = `SA-CERT-${attempt.test_id}-${attempt.id}-${randomPart}`;

      const pct = effectiveAttemptTotal > 0 ? `${((score / effectiveAttemptTotal) * 100).toFixed(1)}%` : '100%';
      const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      renderedCertificateText = renderCertificateText(
        (attempt.test as any)?.certificate_template,
        {
          name: verifiedCandidateName,
          test_title: attempt.test.title,
          date: formattedDate,
          score,
          total_marks: effectiveAttemptTotal,
          percentage: pct,
          certificate_id: certificateCode,
        }
      );

      certificate = await prisma.certificate.upsert({
        where: { test_attempt_id: attempt.id },
        update: {
          recipient_name: verifiedCandidateName,
          recipient_email: candidateEmail || null,
          code: certificateCode,
          certificate_text: renderedCertificateText,
        },
        create: {
          test_id: attempt.test_id,
          test_attempt_id: attempt.id,
          recipient_name: verifiedCandidateName,
          recipient_email: candidateEmail || null,
          code: certificateCode,
          certificate_text: renderedCertificateText,
        },
      });

      if (candidateEmail) {
        // Send email asynchronously (don't await to block response)
        sendCertificateEmail(
          candidateEmail,
          verifiedCandidateName,
          attempt.test.title,
          certificateCode,
          score,
          effectiveAttemptTotal
        ).catch((err: any) => console.error('Failed to send certificate email:', err));
      }
    }

    return sendSuccess(res, {
      score,
      total_marks: effectiveAttemptTotal,
      is_passed: isPassed,
      candidateName,
      candidateEmail,
      attemptId: attempt.id,
      testTitle: attempt.test.title,
      certificateDate: new Date(),
      certificateCode,
      certificateId: certificate?.id,
      certificateText: renderedCertificateText,
      certificateTitle: (attempt.test as any)?.certificate_title || 'Certificate of Completion',
    }, 'Test submitted successfully');

  } catch (error) {
    console.error('Error submitting public test:', error);
    return sendError(res, 'Failed to submit test');
  }
};
