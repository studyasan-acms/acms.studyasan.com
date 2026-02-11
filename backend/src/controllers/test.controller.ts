import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient, QuestionType } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadToS3, getFileType } from '../utils/s3.js';

const prisma = new PrismaClient();

// AI Question Generation using Google Gemini
const generateQuestionsWithAI = async (
  testDetails: {
    subject: string;
    className: string;
    topic: string;
    description?: string;
    totalMarks: number;
  },
  numQuestions: { mcq: number; trueFalse: number; shortAnswer: number; longAnswer?: number }
) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyApprDVA4wKBVDMmHHnx2dBPImZOLAS5R8';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const totalQuestions = numQuestions.mcq + numQuestions.trueFalse + numQuestions.shortAnswer + (numQuestions.longAnswer || 0);

  const prompt = `You are an expert educational test creator. Create high-quality test questions based on the following context:

**Test Context:**
- Subject: ${testDetails.subject}
- Class: ${testDetails.className}
- Topic: ${testDetails.topic}
${testDetails.description ? `- Description: ${testDetails.description}` : ''}
- Total Marks Available: ${testDetails.totalMarks}
- Total Questions to Generate: ${totalQuestions}

**Questions to Generate:**
- ${numQuestions.mcq} Multiple Choice Questions (MCQ)
- ${numQuestions.trueFalse} True/False Questions
${numQuestions.shortAnswer > 0 ? `- ${numQuestions.shortAnswer} Short Answer Questions` : ''}
${numQuestions.longAnswer ? `- ${numQuestions.longAnswer} Long Answer Questions` : ''}

**Mark Distribution Guidelines:**
- MCQ questions: 1-2 marks each (simpler concepts)
- True/False questions: 1 mark each (quick recall)
- Short Answer questions: 2-3 marks each (brief explanation)
- Long Answer questions: 5-10 marks each (detailed explanation/analysis)
- Distribute marks intelligently so the sum approximately equals ${testDetails.totalMarks} marks
- Adjust marks based on question complexity and depth of knowledge required

**Quality Requirements:**
- Questions must be appropriate for ${testDetails.className} level
- Each question should test understanding, not just memorization
- Provide clear, unambiguous wording
- For MCQ: Include 4 options with only one correct answer
- Ensure educational value and relevance to the topic

**Response Format (MUST be valid JSON):**
{
  "questions": [
    {
      "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER",
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQ, omit for others
      "correctAnswer": "Correct answer text",
      "marks": <appropriate marks based on guidelines above>
    }
  ]
}

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

    // Extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return parsedData.questions;
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
      subject_id,
      test_series_id,
      total_marks,
      passing_marks,
      duration_minutes,
      available_from,
      available_until,
      is_published,
      is_certification,
    } = req.body;

    const userId = (req as any).user!.id;

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

    const test = await prisma.test.create({
      data: {
        title,
        description,
        subject_id: subject_id || null,
        test_series_id: test_series_id || null,
        created_by: userId,
        total_marks,
        passing_marks,
        duration_minutes,
        available_from: new Date(available_from),
        available_until: new Date(available_until),
        is_published: is_published || false,
        is_certification: is_certification || false,
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

    const { topic, numMCQ = 5, numTrueFalse = 3, numShortAnswer = 2, numLongAnswer = 0 } = req.body;

    const test = await prisma.test.findUnique({
      where: { id: parseInt(testId) },
      include: {
        subject: {
          include: {
            class: true
          }
        }
      },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    if (!test.subject) {
      return sendError(res, 'Subject not found for test. AI generation requires a subject.', 400);
    }

    if (!test.subject.class) {
      return sendError(res, 'Class not found for subject', 404);
    }

    // Prepare test details for AI
    const testDetails = {
      subject: test.subject.name,
      className: test.subject.class.name,
      topic: topic,
      ...(test.description && { description: test.description }),
      totalMarks: test.total_marks,
    };

    // Generate questions using AI
    const aiQuestions = await generateQuestionsWithAI(
      testDetails,
      { mcq: numMCQ, trueFalse: numTrueFalse, shortAnswer: numShortAnswer, longAnswer: numLongAnswer }
    );

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

    const { question_type, question_text, options, correct_answer, marks, media_url, media_type } = req.body;
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
        parsedOptions = await Promise.all(parsedOptions.map(async (option: any, index: number) => {
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
        }));
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
        order,
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

    if (!questionId) {
      return sendError(res, 'Question ID is required', 400);
    }

    const { question_text, options, correct_answer, marks, media_url, media_type } = req.body;
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
    };

    if (questionMediaUrl !== undefined) {
      updateData.media_url = questionMediaUrl;
    }
    if (questionMediaType !== undefined) {
      updateData.media_type = questionMediaType;
    }

    const question = await prisma.question.update({
      where: { id: parseInt(questionId) },
      data: updateData,
    });

    return sendSuccess(res, question, 'Question updated successfully');
  } catch (error) {
    console.error('Error updating question:', error);
    return sendError(res, 'Failed to update question');
  }
};

// Delete question
export const deleteQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { questionId } = req.params;

    if (!questionId) {
      return sendError(res, 'Question ID is required', 400);
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
    const { subject_id, is_published } = req.query;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    const where: any = {};

    if (is_published !== undefined) {
      where.is_published = is_published === 'true';
    }

    // Students can only see published tests from subjects they're enrolled in
    // Note: We don't filter by available_until so expired tests show up as practice sets
    if (userRole === 'STUDENT') {
      where.is_published = true;
      where.available_from = { lte: new Date() }; // Test must have started
      // Removed: where.available_until filter - expired tests should show for practice

      // Get student's enrolled subjects
      const student = await prisma.student.findUnique({
        where: { user_id: userId },
        include: {
          enrollments: {
            select: { subject_id: true }
          }
        }
      });

      if (student) {
        const enrolledSubjectIds = student.enrollments
          .map(e => e.subject_id)
          .filter(id => id !== null);

        // If subject_id filter is provided, ensure it's in enrolled subjects
        if (subject_id) {
          const requestedSubjectId = parseInt(subject_id as string);
          if (enrolledSubjectIds.includes(requestedSubjectId)) {
            where.subject_id = requestedSubjectId;
          } else {
            // Student is not enrolled in requested subject, return empty
            return sendSuccess(res, [], 'Tests fetched successfully');
          }
        } else {
          // No subject_id filter, show all tests from enrolled subjects
          where.subject_id = { in: enrolledSubjectIds };
        }
      } else {
        // If no student record found, return empty array
        return sendSuccess(res, [], 'Tests fetched successfully');
      }
    } else if (userRole === 'TEACHER') {
      // Teachers can only see tests from subjects they're assigned to
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
        include: {
          teacher_subject_junctions: {
            select: { subject_id: true }
          }
        }
      });

      if (teacher) {
        const assignedSubjectIds = teacher.teacher_subject_junctions.map(j => j.subject_id);

        // If subject_id filter is provided, ensure it's in assigned subjects
        if (subject_id) {
          const requestedSubjectId = parseInt(subject_id as string);
          if (assignedSubjectIds.includes(requestedSubjectId)) {
            where.subject_id = requestedSubjectId;
          } else {
            // Teacher is not assigned to requested subject, return empty
            return sendSuccess(res, [], 'Tests fetched successfully');
          }
        } else {
          // No subject_id filter, show all tests from assigned subjects
          where.subject_id = { in: assignedSubjectIds };
        }
      } else {
        // If no teacher record found, return empty array
        return sendSuccess(res, [], 'Tests fetched successfully');
      }
    } else {
      // For admins, apply subject_id filter if provided
      if (subject_id) {
        where.subject_id = parseInt(subject_id as string);
      }
    }

    const tests = await prisma.test.findMany({
      where,
      include: {
        subject: true,
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
            order: true, // No correct_answer
            media_url: true,
            media_type: true,
          }
        },
      },
    });

    if (!test) {
      return sendError(res, 'Test not found', 404);
    }

    // Check if it is a certification test
    const isCertification = test.is_certification ||
      (test.description && test.description.includes('[CERTIFICATION]')) ||
      test.title.includes('[CERTIFICATION]');

    if (!isCertification) {
      return sendError(res, 'This test is not available publicly', 403);
    }

    if (!test.is_published) {
      return sendError(res, 'This test is not currently active', 403);
    }

    // Check availability
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
      subject_id,
      test_series_id,
      total_marks,
      passing_marks,
      duration_minutes,
      available_from,
      available_until,
      is_published,
      is_certification,
    } = req.body;

    const data: any = {
      title,
      description,
      total_marks,
      passing_marks,
      duration_minutes,
      is_published,
      is_certification,
    };

    // Handle subject_id update (can be set to null)
    if (subject_id !== undefined) {
      data.subject_id = subject_id;
    }

    // Handle test_series_id update (can be set to null)
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
