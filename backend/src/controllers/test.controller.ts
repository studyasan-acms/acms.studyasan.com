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

// Helper to normalize any AI-generated question into robust schema format
export const normalizeAIQuestion = (rawQ: any, fallbackMarks: number = 2) => {
  const typeStr = String(rawQ.type || rawQ.question_type || 'MCQ').toUpperCase();
  let question_type: QuestionType = 'MCQ';
  if (typeStr.includes('TRUE') || typeStr.includes('TF') || typeStr === 'TRUE_FALSE') {
    question_type = 'TRUE_FALSE';
  } else if (typeStr.includes('MATCH') || typeStr === 'MATCH_THE_FOLLOWING') {
    question_type = 'MATCH_THE_FOLLOWING';
  } else if (typeStr.includes('SHORT') || typeStr === 'SHORT_ANSWER') {
    question_type = 'SHORT_ANSWER';
  } else if (typeStr.includes('LONG') || typeStr.includes('ESSAY') || typeStr === 'LONG_ANSWER') {
    question_type = 'LONG_ANSWER';
  } else if (typeStr.includes('CASE') || typeStr === 'CASE_STUDY') {
    question_type = 'CASE_STUDY';
  } else {
    question_type = 'MCQ';
  }

  const question_text = String(rawQ.question || rawQ.question_text || '').trim();
  const marks = Number(rawQ.marks) || fallbackMarks || (question_type === 'TRUE_FALSE' ? 1 : question_type === 'LONG_ANSWER' || question_type === 'CASE_STUDY' ? 5 : question_type === 'MATCH_THE_FOLLOWING' ? 4 : 2);

  if (question_type === 'MCQ') {
    // Ensure 4 clean options
    let rawOptions: string[] = Array.isArray(rawQ.options) ? rawQ.options : [];
    let cleanOptions = rawOptions.map(opt => {
      let s = String(opt || '').trim();
      s = s.replace(/^(\([A-Da-d1-4]\)|[A-Da-d1-4][\.\)]|Option\s+[A-Da-d1-4]:?)\s*/i, '').trim();
      return s;
    }).filter(Boolean);

    while (cleanOptions.length < 4) {
      cleanOptions.push(`Option ${String.fromCharCode(65 + cleanOptions.length)}`);
    }
    if (cleanOptions.length > 4) {
      cleanOptions = cleanOptions.slice(0, 4);
    }

    // Determine correct answer
    const rawCorrect = String(rawQ.correctAnswer || rawQ.correct_answer || '').trim();
    let correct_answer = cleanOptions[0]; // default fallback

    // 1. Check letter match
    const letterMatch = rawCorrect.match(/^Option\s*([A-Da-d])|^([A-Da-d])[\.\)]?$|^\(([A-Da-d])\)/i);
    if (letterMatch) {
      const letter = (letterMatch[1] || letterMatch[2] || letterMatch[3] || 'A').toUpperCase();
      const idx = letter.charCodeAt(0) - 65;
      if (idx >= 0 && idx < cleanOptions.length) {
        correct_answer = cleanOptions[idx];
      }
    } else {
      // 2. Check number match
      const numMatch = rawCorrect.match(/^Option\s*([1-4])|^([1-4])[\.\)]?$/i);
      if (numMatch) {
        const idx = parseInt(numMatch[1] || numMatch[2] || '1', 10) - 1;
        if (idx >= 0 && idx < cleanOptions.length) {
          correct_answer = cleanOptions[idx];
        }
      } else {
        // 3. String match
        const cleanCorrect = rawCorrect.replace(/^(\([A-Da-d1-4]\)|[A-Da-d1-4][\.\)]|Option\s+[A-Da-d1-4]:?)\s*/i, '').trim().toLowerCase();
        const matchedOpt = cleanOptions.find(opt => opt.toLowerCase() === cleanCorrect || opt.toLowerCase().includes(cleanCorrect) || cleanCorrect.includes(opt.toLowerCase()));
        if (matchedOpt) {
          correct_answer = matchedOpt;
        } else if (cleanOptions.length > 0) {
          correct_answer = cleanOptions[0];
        }
      }
    }

    return {
      type: 'MCQ',
      question_type: 'MCQ' as QuestionType,
      question: question_text,
      question_text,
      options: cleanOptions,
      correctAnswer: correct_answer,
      correct_answer,
      marks,
      is_autograded: true,
    };
  }

  if (question_type === 'TRUE_FALSE') {
    const rawCorrect = String(rawQ.correctAnswer || rawQ.correct_answer || '').trim().toLowerCase();
    const isTrue = rawCorrect.startsWith('t') || rawCorrect === '1' || rawCorrect === 'yes' || rawCorrect.includes('true');
    const ans = isTrue ? 'True' : 'False';
    return {
      type: 'TRUE_FALSE',
      question_type: 'TRUE_FALSE' as QuestionType,
      question: question_text,
      question_text,
      options: ['True', 'False'],
      correctAnswer: ans,
      correct_answer: ans,
      marks,
      is_autograded: true,
    };
  }

  if (question_type === 'MATCH_THE_FOLLOWING') {
    let pairs: { left: string; right: string }[] = [];
    if (Array.isArray(rawQ.pairs)) {
      pairs = rawQ.pairs.map((p: any) => ({ left: String(p.left || ''), right: String(p.right || '') })).filter((p: any) => p.left || p.right);
    } else if (Array.isArray(rawQ.options)) {
      pairs = rawQ.options.map((opt: any, idx: number) => {
        if (typeof opt === 'object' && opt && (opt.left || opt.right)) {
          return { left: String(opt.left || ''), right: String(opt.right || '') };
        }
        if (typeof opt === 'string') {
          try {
            const p = JSON.parse(opt);
            if (p.left || p.right) return { left: String(p.left || ''), right: String(p.right || '') };
          } catch {}
          const parts = opt.split(/[-:–=]/);
          if (parts.length >= 2 && parts[0]) {
            return { left: parts[0].trim(), right: parts.slice(1).join('-').trim() };
          }
        }
        return { left: `Item ${idx + 1}`, right: `Match ${idx + 1}` };
      });
    }

    if (pairs.length === 0) {
      pairs = [
        { left: 'Item 1', right: 'Match 1' },
        { left: 'Item 2', right: 'Match 2' },
        { left: 'Item 3', right: 'Match 3' },
      ];
    }

    const stringifiedPairs = pairs.map(p => JSON.stringify(p));
    return {
      type: 'MATCH_THE_FOLLOWING',
      question_type: 'MATCH_THE_FOLLOWING' as QuestionType,
      question: question_text,
      question_text,
      options: stringifiedPairs,
      pairs,
      correctAnswer: JSON.stringify(pairs),
      correct_answer: JSON.stringify(pairs),
      marks,
      is_autograded: true,
    };
  }

  // SHORT_ANSWER, LONG_ANSWER, CASE_STUDY
  const sampleAnswer = String(rawQ.correctAnswer || rawQ.correct_answer || rawQ.sample_answer || '').trim();
  return {
    type: question_type,
    question_type: question_type as QuestionType,
    question: question_text,
    question_text,
    options: [],
    correctAnswer: sampleAnswer,
    correct_answer: sampleAnswer,
    marks,
    is_autograded: false,
  };
};

// AI Question Generation using Google Gemini
const generateQuestionsWithAI = async (
  testDetails: {
    subject: string;
    className: string;
    topic: string;
    description?: string;
    difficulty?: string;
    totalMarks?: number;
  },
  numQuestions: {
    mcq: number;
    trueFalse: number;
    shortAnswer?: number;
    longAnswer?: number;
    matchFollowing?: number;
    caseStudy?: number;
  },
  marks: {
    mcqMarks?: number;
    trueFalseMarks?: number;
    shortAnswerMarks?: number;
    longAnswerMarks?: number;
    matchFollowingMarks?: number;
    caseStudyMarks?: number;
  } = {}
) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyApprDVA4wKBVDMmHHnx2dBPImZOLAS5R8';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const mcqMarks = marks.mcqMarks || 2;
  const trueFalseMarks = marks.trueFalseMarks || 1;
  const shortAnswerMarks = marks.shortAnswerMarks || 2;
  const longAnswerMarks = marks.longAnswerMarks || 5;
  const matchFollowingMarks = marks.matchFollowingMarks || 4;
  const caseStudyMarks = marks.caseStudyMarks || 5;

  const subjectLine = testDetails.subject ? `- Subject: ${testDetails.subject}` : '';
  const classLine = testDetails.className ? `- Class: ${testDetails.className}` : '';
  const diffLine = testDetails.difficulty ? `- Difficulty: ${testDetails.difficulty}` : '';

  const requestedTypes: string[] = [];
  if (numQuestions.mcq > 0) requestedTypes.push(`- ${numQuestions.mcq} Multiple Choice Questions (MCQ) (${mcqMarks} marks each)`);
  if (numQuestions.trueFalse > 0) requestedTypes.push(`- ${numQuestions.trueFalse} True/False Questions (${trueFalseMarks} marks each)`);
  if ((numQuestions.shortAnswer || 0) > 0) requestedTypes.push(`- ${numQuestions.shortAnswer} Short Answer Questions (${shortAnswerMarks} marks each)`);
  if ((numQuestions.longAnswer || 0) > 0) requestedTypes.push(`- ${numQuestions.longAnswer} Long Answer Questions (${longAnswerMarks} marks each)`);
  if ((numQuestions.matchFollowing || 0) > 0) requestedTypes.push(`- ${numQuestions.matchFollowing} Match the Following Questions (${matchFollowingMarks} marks each)`);
  if ((numQuestions.caseStudy || 0) > 0) requestedTypes.push(`- ${numQuestions.caseStudy} Case Study Questions (${caseStudyMarks} marks each)`);

  const prompt = `You are an expert educational question generator.
Generate high quality academic questions based on the following context:

**Context:**
${subjectLine}
${classLine}
- Topic: ${testDetails.topic}
${diffLine}
${testDetails.description ? `- Description: ${testDetails.description}` : ''}

**Questions Required:**
${requestedTypes.join('\n')}

**Formatting & Validation Rules:**
1. For MCQ: Provide "options" as an array of exactly 4 strings without "A)" or "1." prefixes. "correctAnswer" MUST be the exact matching string of the correct option from "options".
2. For TRUE_FALSE: "options" MUST be ["True", "False"]. "correctAnswer" MUST be either "True" or "False".
3. For MATCH_THE_FOLLOWING: "pairs" MUST be an array of 3 to 4 objects with "left" and "right" keys (e.g. [{"left": "Concept A", "right": "Definition A"}]).
4. For SHORT_ANSWER, LONG_ANSWER, CASE_STUDY: Provide clear question statement and key marking criteria/solution in "correctAnswer".

**Response Format (Return ONLY raw valid JSON without markdown wrapping or code blocks):**
{
  "questions": [
    {
      "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "LONG_ANSWER" | "MATCH_THE_FOLLOWING" | "CASE_STUDY",
      "question": "Question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "pairs": [{"left": "Left 1", "right": "Right 1"}],
      "correctAnswer": "Exact matching option text or answer explanation",
      "marks": 2
    }
  ]
}`;

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
          maxOutputTokens: 4096,
        },
      }),
    });

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    let cleanText = generatedText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    const parsedData = JSON.parse(cleanText);
    const rawQuestions: any[] = Array.isArray(parsedData.questions) ? parsedData.questions : [];

    return rawQuestions.map((q) => normalizeAIQuestion(q));
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
      allowed_candidates,
      certificate_template,
      certificate_title,
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
        allowed_candidates: allowed_candidates ? (typeof allowed_candidates === 'string' ? JSON.parse(allowed_candidates) : allowed_candidates) : [],
        certificate_template: certificate_template?.trim() || null,
        certificate_title: certificate_title?.trim() || 'Certificate of Completion',
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
            question_type: q.question_type as QuestionType,
            question_text: q.question_text,
            options: q.options || null,
            correct_answer: q.correct_answer,
            marks: q.marks || 2,
            // @ts-ignore
            is_autograded: q.is_autograded,
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

// Generate AI questions preview for frontend draft editor
export const generateAIQuestionsPreview = async (req: AuthRequest, res: Response) => {
  try {
    const {
      topic,
      difficulty = 'MEDIUM',
      subject_id,
      counts = {},
      marks = {},
    } = req.body;

    if (!topic || !topic.trim()) {
      return sendError(res, 'Topic is required', 400);
    }

    let subjectName = 'General';
    let className = 'General';

    if (subject_id) {
      const subj = await prisma.subject.findUnique({
        where: { id: Number(subject_id) },
        include: { class: true },
      });
      if (subj) {
        subjectName = subj.name;
        className = subj.class?.name || 'General';
      }
    }

    const testDetails = {
      subject: subjectName,
      className: className,
      topic: topic.trim(),
      difficulty,
      totalMarks: 100,
    };

    const numQuestions = {
      mcq: Number(counts.mcq) || 0,
      trueFalse: Number(counts.trueFalse) || 0,
      shortAnswer: Number(counts.shortAnswer) || 0,
      longAnswer: Number(counts.longAnswer) || 0,
      matchFollowing: Number(counts.matchFollowing) || 0,
      caseStudy: Number(counts.caseStudy) || 0,
    };

    const marksObj = {
      mcqMarks: Number(marks.mcqMarks) || 2,
      trueFalseMarks: Number(marks.trueFalseMarks) || 1,
      shortAnswerMarks: Number(marks.shortAnswerMarks) || 2,
      longAnswerMarks: Number(marks.longAnswerMarks) || 5,
      matchFollowingMarks: Number(marks.matchFollowingMarks) || 4,
      caseStudyMarks: Number(marks.caseStudyMarks) || 5,
    };

    const aiQuestions = await generateQuestionsWithAI(testDetails, numQuestions, marksObj);

    return sendSuccess(res, aiQuestions, 'Questions generated successfully');
  } catch (error: any) {
    console.error('Error generating preview questions:', error);
    return sendError(res, error.message || 'Failed to generate questions');
  }
};

// Add manual question
export const addQuestion = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    if (!testId) {
      return sendError(res, 'Test ID is required', 400);
    }

    const { question_type, question_text, options, correct_answer, marks, negative_marks, is_autograded, media_url, media_type, parent_id } = req.body;
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

    const parsedIsAutograded = is_autograded !== undefined
      ? (is_autograded === true || is_autograded === 'true')
      : (question_type === 'MCQ' || question_type === 'TRUE_FALSE' || question_type === 'MATCH_THE_FOLLOWING');

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
        // @ts-ignore
        is_autograded: parsedIsAutograded,
        order,
        parent_id: parent_id ? parseInt(parent_id) : null,
      },
    });

    // Keep parent test total_marks in sync
    const allQuestions = await prisma.question.findMany({
      where: { test_id: parseInt(testId) },
      select: { marks: true },
    });
    const newTotalMarks = allQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    await prisma.test.update({
      where: { id: parseInt(testId) },
      data: { total_marks: newTotalMarks },
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

    const { question_text, question_type, options, correct_answer, marks, negative_marks, is_autograded, media_url, media_type } = req.body;
    const file = req.file;

    // Handle file upload if present
    let questionMediaUrl = media_url !== undefined ? (media_url === "" || media_url === null ? null : media_url) : undefined;
    let questionMediaType = media_type !== undefined ? (media_type === "" || media_type === null ? null : media_type) : undefined;

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

    if (is_autograded !== undefined) {
      updateData.is_autograded = is_autograded === true || is_autograded === 'true';
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

    // Keep parent test total_marks in sync
    const allQuestions = await prisma.question.findMany({
      where: { test_id: question.test_id },
      select: { marks: true },
    });
    const newTotalMarks = allQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    await prisma.test.update({
      where: { id: question.test_id },
      data: { total_marks: newTotalMarks },
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

    // Keep parent test total_marks in sync
    const allQuestions = await prisma.question.findMany({
      where: { test_id: question.test_id },
      select: { marks: true },
    });
    const newTotalMarks = allQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    await prisma.test.update({
      where: { id: question.test_id },
      data: { total_marks: newTotalMarks },
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
      (test as any).test_type === 'CERTIFICATION' ||
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
      allowed_candidates,
      certificate_template,
      certificate_title,
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

    if (allowed_candidates !== undefined) {
      data.allowed_candidates = typeof allowed_candidates === 'string' ? JSON.parse(allowed_candidates) : allowed_candidates;
    }

    if (certificate_template !== undefined) {
      data.certificate_template = certificate_template?.trim() || null;
    }

    if (certificate_title !== undefined) {
      data.certificate_title = certificate_title?.trim() || 'Certificate of Completion';
    }

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

    // Validate publishing constraints if test is being published
    if (is_published === true) {
      const existingQuestions = await prisma.question.findMany({
        where: { test_id: parseInt(testId) },
      });

      if (existingQuestions.length === 0) {
        return sendError(res, 'Cannot publish test: The test contains no questions. Please add questions before publishing.', 400);
      }

      const totalQuestionMarks = existingQuestions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

      // If total_marks was not explicitly sent, automatically sync it to totalQuestionMarks
      if (total_marks === undefined) {
        data.total_marks = totalQuestionMarks;
      } else {
        const targetTotalMarks = Number(total_marks);
        if (targetTotalMarks !== totalQuestionMarks) {
          return sendError(
            res,
            `Cannot publish test: Test total marks (${targetTotalMarks}) does not match the sum of question marks (${totalQuestionMarks}). Please adjust question marks or total marks to match before publishing.`,
            400
          );
        }
      }
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
            // @ts-ignore
            is_autograded: (q as any).is_autograded ?? true,
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
