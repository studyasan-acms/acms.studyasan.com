import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient, QuestionType } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadToS3, getFileType } from '../utils/s3.js';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const parseMaxWarningAttempts = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) return null;
  return parsed;
};

const DEFAULT_TEST_INSTRUCTIONS =
  'This test is proctored. Follow the question color coding and do not switch tabs, copy, or use unauthorized materials.';

// AI Question Generation using Google Gemini
const generateQuestionsWithAI = async (
  testDetails: {
    subject: string;
    className: string;
    topic: string;
    description?: string;
    totalMarks: number;
  },
  numQuestions: { mcq: number; trueFalse: number; shortAnswer: number; longAnswer?: number },
  marks: { mcqMarks?: number; trueFalseMarks?: number; shortAnswerMarks?: number; longAnswerMarks?: number } = {}
) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyApprDVA4wKBVDMmHHnx2dBPImZOLAS5R8';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const totalQuestions = numQuestions.mcq + numQuestions.trueFalse + numQuestions.shortAnswer + (numQuestions.longAnswer || 0);

  // Use provided marks or default values
  const mcqMarks = marks.mcqMarks || 1;
  const trueFalseMarks = marks.trueFalseMarks || 1;
  const shortAnswerMarks = marks.shortAnswerMarks || 2;
  const longAnswerMarks = marks.longAnswerMarks || 5;

  // Calculate expected total marks
  const expectedTotalMarks = 
    (numQuestions.mcq * mcqMarks) +
    (numQuestions.trueFalse * trueFalseMarks) +
    (numQuestions.shortAnswer * shortAnswerMarks) +
    ((numQuestions.longAnswer || 0) * longAnswerMarks);

  const subjectLine = testDetails.subject ? `- Subject: ${testDetails.subject}` : '';
  const classLine = testDetails.className ? `- Class: ${testDetails.className}` : '';

  const prompt = `You are an expert educational test creator. Create high-quality test questions based on the following context:

**Test Context:**
${subjectLine}
${classLine}
- Topic: ${testDetails.topic}
${testDetails.description ? `- Description: ${testDetails.description}` : ''}
- Total Marks Available: ${testDetails.totalMarks}
- Total Questions to Generate: ${totalQuestions}

**Questions to Generate with Specific Marks:**
- ${numQuestions.mcq} Multiple Choice Questions (MCQ) - ${mcqMarks} marks each = ${numQuestions.mcq * mcqMarks} marks total
- ${numQuestions.trueFalse} True/False Questions - ${trueFalseMarks} marks each = ${numQuestions.trueFalse * trueFalseMarks} marks total
${numQuestions.shortAnswer > 0 ? `- ${numQuestions.shortAnswer} Short Answer Questions - ${shortAnswerMarks} marks each = ${numQuestions.shortAnswer * shortAnswerMarks} marks total` : ''}
${numQuestions.longAnswer ? `- ${numQuestions.longAnswer} Long Answer Questions - ${longAnswerMarks} marks each = ${(numQuestions.longAnswer || 0) * longAnswerMarks} marks total` : ''}

**IMPORTANT: Mark Distribution (MUST USE EXACTLY AS SPECIFIED):**
- EVERY MCQ must have exactly ${mcqMarks} marks
- EVERY True/False question must have exactly ${trueFalseMarks} marks
${numQuestions.shortAnswer > 0 ? `- EVERY Short Answer question must have exactly ${shortAnswerMarks} marks` : ''}
${numQuestions.longAnswer ? `- EVERY Long Answer question must have exactly ${longAnswerMarks} marks` : ''}
- The sum of all marks must equal exactly ${expectedTotalMarks} marks
- Do NOT deviate from these mark values

**Quality Requirements:**
- Questions must be appropriate for ${testDetails.className} level
- Each question should test understanding, not just memorization
- Provide clear, unambiguous wording
- For MCQ: Include 4 options with only one correct answer
- Ensure educational value and relevance to the topic

**Response Format (MUST be valid JSON without markdown wrapping or trailing commas):**
{
  "questions": [
    {
      "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER",
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQ, omit for others
      "correctAnswer": "Correct answer text",
      "marks": <use the exact marks value specified above for this question type>
    }
  ]
}

Ensure your response contains ONLY the raw JSON object and nothing else. No explanation, no markdown ticks.
Generate the questions now:`;

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;

    // Clean up markdown code blocks if present
    let cleanText = generatedText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
    
    // In case there's text before/after, try to extract just the JSON
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    try {
      const parsedData = JSON.parse(cleanText);
      return parsedData.questions;
    } catch (parseError) {
      console.error('Error parsing JSON from AI response:', parseError);
      console.error('Raw text was:', generatedText);
      console.error('Cleaned text was:', cleanText);
      throw new Error('Could not parse JSON from AI response');
    }
  } catch (error) {
    console.error('Error generating questions with AI:', error);
    throw new Error('Failed to generate questions with AI');
  }
};

// Create a new test
export const createTest = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      instructions,
      test_type,
      subject_id,
      test_series_id,
      total_marks,
      passing_marks,
      duration_minutes,
      max_warning_attempts,
      enforce_warning_attempts,
      available_from,
      available_until,
      is_published,
      is_certification,
      has_negative_marking,
      is_autograded,
    } = req.body;

    const userId = (req as any).user!.id;
    const resolvedTestType = test_type || (is_certification ? 'CERTIFICATION' : 'MOCK_TEST');

    // Verify the subject exists if provided
    if (subject_id) {
      const subject = await prisma.subject.findUnique({
        where: { id: subject_id },
      });

      if (!subject) {
        return sendError(res, 'Subject not found', 404);
      }
    }

    // Verify the test series exists if provided
    if (test_series_id) {
      const testSeries = await prisma.testSeries.findUnique({
        where: { id: test_series_id },
      });

      if (!testSeries) {
        return sendError(res, 'Test series not found', 404);
      }
    }

    const parsedMaxWarningAttempts = parseMaxWarningAttempts(max_warning_attempts);
    if (max_warning_attempts !== undefined && parsedMaxWarningAttempts === null) {
      return sendError(res, 'max_warning_attempts must be an integer between 1 and 20', 400);
    }

    const test = await prisma.test.create({
      data: {
        title,
        description,
        instructions: instructions?.trim() ? instructions.trim() : DEFAULT_TEST_INSTRUCTIONS,
        // @ts-ignore
        test_type: resolvedTestType,
        subject_id: subject_id || null,
        test_series_id: test_series_id || null,
        created_by: userId,
        total_marks,
        passing_marks,
        duration_minutes,
        max_warning_attempts: parsedMaxWarningAttempts ?? 3,
        enforce_warning_attempts: enforce_warning_attempts !== false,
        available_from: new Date(available_from),
        available_until: new Date(available_until),
        is_published: is_published || false,
        is_certification: resolvedTestType === 'CERTIFICATION' || is_certification || false,
        has_negative_marking: !!has_negative_marking,
        // @ts-ignore - Prisma client needs generation
        is_autograded: is_autograded !== false, // default true
      },

      include: {
        subject: true,
        test_series: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(res, test, 'Test created successfully', 201);
  } catch (error) {
    console.error('Error creating test:', error);
    return sendError(res, 'Failed to create test');
  }
};

// Generate questions using AI
export const generateTestQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const { 
      topic, 
      numMCQ = 5, 
      numTrueFalse = 3, 
      numShortAnswer = 2, 
      numLongAnswer = 0,
      mcqMarks = 1,
      trueFalseMarks = 1,
      shortAnswerMarks = 2,
      longAnswerMarks = 5
    } = req.body;

    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: {
        subject: {
          include: {
            class: true,
          },
        },
        test_series: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    const subjectName = test.subject?.name || test.test_series?.title || 'General';
    const className = test.subject?.class?.name || 'General';

    // Prepare test details for AI
    const testDetails = {
      subject: subjectName,
      className: className,
      topic: topic,
      ...(test.description && { description: test.description }),
      totalMarks: test.total_marks,
    };

    // Generate questions using AI with teacher-specified marks
    const aiQuestions = await generateQuestionsWithAI(testDetails, {
      mcq: numMCQ,
      trueFalse: numTrueFalse,
      shortAnswer: numShortAnswer,
      longAnswer: numLongAnswer,
    }, {
      mcqMarks,
      trueFalseMarks,
      shortAnswerMarks,
      longAnswerMarks,
    });

    // Get the current max order
    const maxOrderQuestion = await prisma.question.findFirst({
      where: { test_id: parseInt(testId) },
      orderBy: { order: 'desc' },
    });

    let currentOrder = maxOrderQuestion ? maxOrderQuestion.order + 1 : 1;

    // Create questions in database
    const createdQuestions = await Promise.all(
      aiQuestions.map(async (q: any) => {
        const question = await prisma.question.create({
          data: {
            test_id: parseInt(testId),
            question_type: q.type as QuestionType,
            question_text: q.question,
            options: q.options || null,
            correct_answer: q.correctAnswer,
            marks: q.marks || 2,
            order: currentOrder++,
          },
        });
        return question;
      })
    );

    return sendSuccess(res, createdQuestions, 'Questions generated successfully', 201);
  } catch (error) {
    console.error('Error generating questions:', error);
    return sendError(res, 'Failed to generate questions');
  }
};

// Add manual question
export const addQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const { question_type, question_text, options, correct_answer, marks, negative_marks, media_url, media_type, parent_id } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    // Handle file upload if present
    let questionMediaUrl = media_url || null;
    let questionMediaType = media_type || null;

    // Check for question media in files['media']
    const questionMediaFile = files?.['media']?.[0];
    if (questionMediaFile) {
      const uploadResult = await uploadToS3(questionMediaFile, 'test-questions');
      questionMediaUrl = uploadResult.url;
      questionMediaType = getFileType(uploadResult.filename);
    }

    // Parse options if it's a JSON string and handle option media
    let parsedOptions = null;
    if (options) {
      parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;

      // If options have media, upload the files
      if (Array.isArray(parsedOptions) && files) {
        parsedOptions = await Promise.all(
          parsedOptions.map(async (option: any, index: number) => {
            const optionFile = files[`option_media_${index}`]?.[0];
            if (optionFile) {
              const uploadResult = await uploadToS3(optionFile, 'test-questions');
              return {
                ...option,
                media_url: uploadResult.url,
                media_type: getFileType(uploadResult.filename),
              };
            }
            return option;
          })
        );
      }
    }

    // Get the current max order
    const maxOrderQuestion = await prisma.question.findFirst({
      where: { test_id: parseInt(testId) },
      orderBy: { order: 'desc' },
    });

    const order = maxOrderQuestion ? maxOrderQuestion.order + 1 : 1;

    const question = await prisma.question.create({
      data: {
        test_id: parseInt(testId),
        question_type: question_type as QuestionType,
        question_text,
        media_url: questionMediaUrl,
        media_type: questionMediaType,
        options: parsedOptions,
        correct_answer,
        marks: parseInt(marks),
        negative_marks: parseFloat(negative_marks) || 0,
        order,
        parent_id: parent_id ? parseInt(parent_id) : null,
      },
    });

    return sendSuccess(res, question, 'Question added successfully', 201);
  } catch (error) {
    console.error('Error adding question:', error);
    return sendError(res, 'Failed to add question');
  }
};

// Update question
export const updateQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const userId = req.user?.id;

    if (!questionId) {
      return sendError(res, 'Question ID is required', 400);
    }

    // Get the question with its test to verify ownership
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) },
      include: {
        test: true,
      },
    });

    if (!question) {
      return sendError(res, 'Question not found', 404);
    }

    // If user is a teacher, verify they own the test
    if (req.user?.role === 'TEACHER' && userId) {
      const isTeacherOwner = await prisma.test.findFirst({
        where: {
          id: question.test_id,
          created_by: userId,
        },
      });

      if (!isTeacherOwner) {
        return sendError(res, 'You do not have permission to update this question', 403);
      }
    }

    const { question_text, question_type, options, correct_answer, marks, negative_marks, media_url, media_type } = req.body;
    const file = req.file;

    // Handle file upload if present
    let questionMediaUrl = media_url || undefined;
    let questionMediaType = media_type || undefined;

    if (file) {
      const uploadResult = await uploadToS3(file, 'test-questions');
      questionMediaUrl = uploadResult.url;
      questionMediaType = getFileType(uploadResult.filename);
    }

    // Parse options if it's a JSON string
    let parsedOptions = undefined;
    if (options !== undefined) {
      parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
    }

    const updateData: any = {
      question_text,
      options: parsedOptions,
      correct_answer,
      marks: marks ? parseInt(marks) : undefined,
      negative_marks: negative_marks !== undefined ? parseFloat(negative_marks) : undefined,
    };

    if (question_type !== undefined) {
      updateData.question_type = question_type;
    }

    if (questionMediaUrl !== undefined) {
      updateData.media_url = questionMediaUrl;
    }
    if (questionMediaType !== undefined) {
      updateData.media_type = questionMediaType;
    }

    const updatedQuestion = await prisma.question.update({
      where: { id: parseInt(questionId) },
      data: updateData,
    });

    return sendSuccess(res, updatedQuestion, 'Question updated successfully');
  } catch (error) {
    console.error('Error updating question:', error);
    return sendError(res, 'Failed to update question');
  }
};

// Delete question
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const userId = req.user?.id;

    if (!questionId) {
      return sendError(res, 'Question ID is required', 400);
    }

    // Get the question with its test to verify ownership
    const question = await prisma.question.findUnique({
      where: { id: parseInt(questionId) },
      include: {
        test: true,
      },
    });

    if (!question) {
      return sendError(res, 'Question not found', 404);
    }

    // If user is a teacher, verify they own the test
    if (req.user?.role === 'TEACHER' && userId) {
      const isTeacherOwner = await prisma.test.findFirst({
        where: {
          id: question.test_id,
          created_by: userId,
        },
      });

      if (!isTeacherOwner) {
        return sendError(res, 'You do not have permission to delete this question', 403);
      }
    }

    await prisma.question.delete({
      where: { id: parseInt(questionId) },
    });

    return sendSuccess(res, null, 'Question deleted successfully');
  } catch (error) {
    console.error('Error deleting question:', error);
    return sendError(res, 'Failed to delete question');
  }
};

// Get all tests (with filters)
export const getTests = async (req: AuthRequest, res: Response) => {
  try {
    const { subject_id, is_published, test_type } = req.query;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    const where: any = {};

    if (is_published !== undefined) {
      where.is_published = is_published === 'true';
    }

    if (test_type && typeof test_type === 'string' && test_type !== 'ALL') {
      where.test_type = test_type;
    }

    if (userRole === 'STUDENT') {
      where.is_published = true;
      where.OR = [
        { test_series_id: { not: null } },
        { available_from: { lte: new Date() } },
      ];

      const student = await prisma.student.findUnique({
        where: { user_id: userId },
        include: {
          enrollments: {
            select: { subject_id: true, test_series_id: true },
          },
        },
      });

      if (student) {
        const enrolledSubjectIds = student.enrollments
          .map((e) => e.subject_id)
          .filter((id) => id !== null);
        const enrolledTestSeriesIds = student.enrollments
          .map((e) => e.test_series_id)
          .filter((id) => id !== null);

        if (subject_id) {
          const requestedSubjectId = parseInt(subject_id as string);
          if (enrolledSubjectIds.includes(requestedSubjectId)) {
            where.subject_id = requestedSubjectId;
          } else {
            return sendSuccess(res, [], 'Tests fetched successfully');
          }
        } else {
          const accessFilters: any[] = [];
          if (enrolledSubjectIds.length > 0) {
            accessFilters.push({ subject_id: { in: enrolledSubjectIds } });
          }
          if (enrolledTestSeriesIds.length > 0) {
            accessFilters.push({ test_series_id: { in: enrolledTestSeriesIds } });
          }

          if (accessFilters.length === 0) {
            return sendSuccess(res, [], 'Tests fetched successfully');
          }

          where.AND = [...(where.AND || []), { OR: accessFilters }];
        }
      } else {
        return sendSuccess(res, [], 'Tests fetched successfully');
      }
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        include: {
          teacher_subject_junctions: {
            select: { subject_id: true },
          },
          test_series_junctions: {
            select: { test_series_id: true },
          },
        },
      });

      if (teacher) {
        const assignedSubjectIds = teacher.teacher_subject_junctions.map((j) => j.subject_id);
        const assignedTestSeriesIds = teacher.test_series_junctions.map((j) => j.test_series_id);

        if (subject_id) {
          const requestedSubjectId = parseInt(subject_id as string);
          if (assignedSubjectIds.includes(requestedSubjectId)) {
            where.subject_id = requestedSubjectId;
          } else {
            return sendSuccess(res, [], 'Tests fetched successfully');
          }
        } else {
          const accessFilters: any[] = [];
          if (assignedSubjectIds.length > 0) {
            accessFilters.push({ subject_id: { in: assignedSubjectIds } });
          }
          if (assignedTestSeriesIds.length > 0) {
            accessFilters.push({ test_series_id: { in: assignedTestSeriesIds } });
          }

          if (accessFilters.length === 0) {
            return sendSuccess(res, [], 'Tests fetched successfully');
          }

          where.OR = accessFilters;
        }
      } else {
        return sendSuccess(res, [], 'Tests fetched successfully');
      }
    } else {
      if (subject_id) {
        where.subject_id = parseInt(subject_id as string);
      }
    }

    const tests = await prisma.test.findMany({
      where,
      include: {
        subject: true,
        test_series: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
            test_attempts: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return sendSuccess(res, tests, 'Tests fetched successfully');
  } catch (error) {
    console.error('Error fetching tests:', error);
    return sendError(res, 'Failed to fetch tests');
  }
};

// Get test by ID
export const getTestById = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const userId = (req as any).user!.id;
    const userRole = (req as any).userRole;

    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: {
        subject: true,
        test_series: {
          select: {
            id: true,
            title: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            test_attempts: true,
          },
        },
      },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    // For students, hide correct answers
    if (userRole === 'STUDENT') {
      test.questions = test.questions.map((q) => ({
        ...q,
        correct_answer: null,
      }));
    }

    return sendSuccess(res, test, 'Test fetched successfully');
  } catch (error) {
    console.error('Error fetching test:', error);
    return sendError(res, 'Failed to fetch test');
  }
};

// Get Public Test by ID (No Auth)
export const getPublicTestById = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: {
        subject: true,
        creator: {
          select: {
            name: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question_type: true,
            question_text: true,
            options: true,
            marks: true,
            order: true,
            media_url: true,
            media_type: true,
          },
        },
      },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    const isCertification =
      test.is_certification ||
      (test.description && test.description.includes('[CERTIFICATION]')) ||
      test.title.includes('[CERTIFICATION]');

    if (!isCertification) {
      return sendError(res, 'This test is not available publicly', 403);
    }

    if (!test.is_published) {
      return sendError(res, 'This test is not currently active', 403);
    }

    const now = new Date();
    if (now < new Date(test.available_from) || now > new Date(test.available_until)) {
      return sendError(res, 'This test is not currently available', 403);
    }

    return sendSuccess(res, test, 'Test fetched successfully');
  } catch (error) {
    console.error('Error fetching public test:', error);
    return sendError(res, 'Failed to fetch test');
  }
};

// Update test
export const updateTest = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const {
      title,
      description,
      instructions,
      test_type,
      subject_id,
      test_series_id,
      total_marks,
      passing_marks,
      duration_minutes,
      max_warning_attempts,
      enforce_warning_attempts,
      available_from,
      available_until,
      is_published,
      is_certification,
      has_negative_marking,
      is_autograded,
    } = req.body;

    const data: any = {
      title,
      description,
      ...(instructions !== undefined ? { instructions: instructions?.trim() ? instructions.trim() : DEFAULT_TEST_INSTRUCTIONS } : {}),
      total_marks,
      passing_marks,
      duration_minutes,
      is_published,
      is_certification,
    };

    if (test_type !== undefined) {
      data.test_type = test_type;
      if (test_type === 'CERTIFICATION') {
        data.is_certification = true;
      }
    }


    if (is_autograded !== undefined) {
      // @ts-ignore - Prisma client needs generation
      data.is_autograded = !!is_autograded;
    }

    if (has_negative_marking !== undefined) {
      data.has_negative_marking = !!has_negative_marking;
    }

    if (max_warning_attempts !== undefined) {
      const parsedMaxWarningAttempts = parseMaxWarningAttempts(max_warning_attempts);
      if (parsedMaxWarningAttempts === null) {
        return sendError(res, 'max_warning_attempts must be an integer between 1 and 20', 400);
      }
      data.max_warning_attempts = parsedMaxWarningAttempts;
    }

    if (enforce_warning_attempts !== undefined) {
      data.enforce_warning_attempts = !!enforce_warning_attempts;
    }

    if (subject_id !== undefined) {
      data.subject_id = subject_id;
    }

    if (test_series_id !== undefined) {
      data.test_series_id = test_series_id;
    }

    if (available_from) {
      data.available_from = new Date(available_from);
    }

    if (available_until) {
      data.available_until = new Date(available_until);
    }

    const test = await prisma.test.update({
      where: { id: parseInt(testId) },
      data,
      include: {
        subject: true,
        test_series: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(res, test, 'Test updated successfully');
  } catch (error) {
    console.error('Error updating test:', error);
    return sendError(res, 'Failed to update test');
  }
};

// Delete test
export const deleteTest = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    await prisma.test.delete({
      where: { id: parseInt(testId) },
    });

    return sendSuccess(res, null, 'Test deleted successfully');
  } catch (error) {
    console.error('Error deleting test:', error);
    return sendError(res, 'Failed to delete test');
  }
};

// Duplicate test
export const duplicateTest = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;
    const userId = req.user?.id;

    if (!testId || !userId) {
      return sendError(res, 'Test ID and user are required', 400);
    }

    // Fetch the original test with all questions
    const originalTest = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: { questions: true },
    });

    if (!originalTest) {
      return sendError(res, 'Test not found', 404);
    }

    // Create new test with copied data
    const duplicatedTest = await prisma.test.create({
      data: {
        title: `${originalTest.title} (Copy)`,
        description: originalTest.description,
        subject_id: originalTest.subject_id,
        test_series_id: originalTest.test_series_id,
        created_by: userId,
        total_marks: originalTest.total_marks,
        passing_marks: originalTest.passing_marks,
        duration_minutes: originalTest.duration_minutes,
        max_warning_attempts: originalTest.max_warning_attempts,
        available_from: originalTest.available_from,
        available_until: originalTest.available_until,
        is_published: false,
        is_certification: originalTest.is_certification,
        has_negative_marking: originalTest.has_negative_marking,
        // @ts-ignore - Prisma client needs generation
        is_autograded: originalTest.is_autograded,
        questions: {
          create: originalTest.questions.map((q) => ({
            question_type: q.question_type,
            question_text: q.question_text,
            media_url: q.media_url,
            media_type: q.media_type,
            options:
              q.options === null
                ? Prisma.JsonNull
                : (q.options as Prisma.InputJsonValue),
            correct_answer: q.correct_answer,
            marks: q.marks,
            negative_marks: q.negative_marks,
            order: q.order,
          })),
        },
      },
      include: {
        subject: true,
        test_series: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        questions: true,
        _count: {
          select: {
            questions: true,
            test_attempts: true,
          },
        },
      },
    });

    return sendSuccess(res, duplicatedTest, 'Test duplicated successfully', 201);
  } catch (error) {
    console.error('Error duplicating test:', error);
    return sendError(res, 'Failed to duplicate test');
  }
};
