import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import type { AuthRequest } from '../types/index.js';
import { googleMeetService } from '../utils/googleMeet.js';

const prisma = new PrismaClient();

// Helper function to create notifications for enrolled students
async function notifyEnrolledStudents(
  subjectId: number,
  classId: number | null,
  boardId: number | null,
  title: string,
  description: string
) {
  try {
    // Get enrolled students based on subject, and optionally filter by class and board
    const enrollments = await prisma.enrollment.findMany({
      where: {
        subject_id: subjectId,
        student: {
          ...(classId && { class_id: classId }),
          ...(boardId && { board_id: boardId }),
        },
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    // Create notifications for each enrolled student
    const notifications = enrollments.map((enrollment) => ({
      user_id: enrollment.student.user_id,
      type: 'INFO' as const,
      title,
      description,
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications,
      });
    }

    return notifications.length;
  } catch (error) {
    console.error('Error notifying students:', error);
    return 0;
  }
}

// Helper function to get allowed participant emails
async function getAllowedParticipantEmails(
  subjectId: number,
  classId: number | null,
  boardId: number | null
): Promise<string[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      subject_id: subjectId,
      student: {
        ...(classId && { class_id: classId }),
        ...(boardId && { board_id: boardId }),
      },
    },
    include: {
      student: {
        include: {
          user: {
            select: { email: true },
          },
        },
      },
    },
  });

  return enrollments.map((e) => e.student.user.email);
}

// Helper function to generate recurring session instances
function generateRecurringInstances(
  startTime: Date,
  endTime: Date,
  recurrenceRule: any,
  maxInstances: number = 52 // Max 1 year of weekly instances
): { startTime: Date; endTime: Date }[] {
  const instances: { startTime: Date; endTime: Date }[] = [];
  const duration = endTime.getTime() - startTime.getTime();

  const { frequency, interval = 1, daysOfWeek, endDate, count } = recurrenceRule;

  let currentDate = new Date(startTime);
  const finalEndDate = endDate ? new Date(endDate) : null;
  const maxCount = count || maxInstances;

  while (instances.length < maxCount) {
    if (finalEndDate && currentDate > finalEndDate) break;

    if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
      // For weekly recurrence with specific days
      const currentDay = currentDate.getDay();
      if (daysOfWeek.includes(currentDay)) {
        instances.push({
          startTime: new Date(currentDate),
          endTime: new Date(currentDate.getTime() + duration),
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
      
      // Skip to next week if we've passed all days
      if (currentDate.getDay() === 0 && interval > 1) {
        currentDate.setDate(currentDate.getDate() + 7 * (interval - 1));
      }
    } else if (frequency === 'daily') {
      instances.push({
        startTime: new Date(currentDate),
        endTime: new Date(currentDate.getTime() + duration),
      });
      currentDate.setDate(currentDate.getDate() + interval);
    } else if (frequency === 'weekly') {
      instances.push({
        startTime: new Date(currentDate),
        endTime: new Date(currentDate.getTime() + duration),
      });
      currentDate.setDate(currentDate.getDate() + 7 * interval);
    } else if (frequency === 'monthly') {
      instances.push({
        startTime: new Date(currentDate),
        endTime: new Date(currentDate.getTime() + duration),
      });
      currentDate.setMonth(currentDate.getMonth() + interval);
    }
  }

  return instances;
}

export const getAllClassSessions = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const {
      teacher_id,
      subject_id,
      class_id,
      board_id,
      mode,
      start_date,
      end_date,
    } = req.query;

    const where: any = {};

    if (teacher_id) where.teacher_id = parseInt(teacher_id as string);
    if (subject_id) where.subject_id = parseInt(subject_id as string);
    if (class_id) where.class_id = parseInt(class_id as string);
    if (board_id) where.board_id = parseInt(board_id as string);
    if (mode) where.mode = mode;

    // Date range filter
    if (start_date || end_date) {
      where.start_time = {};
      if (start_date) where.start_time.gte = new Date(start_date as string);
      if (end_date) where.start_time.lte = new Date(end_date as string);
    }

    const [sessions, total] = await Promise.all([
      prisma.classSession.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacher: {
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
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          board: {
            select: {
              id: true,
              name: true,
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
            select: { attendances: true },
          },
        },
        orderBy: { start_time: 'desc' },
      }),
      prisma.classSession.count({ where }),
    ]);

    const response = createPaginatedResponse(sessions, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getClassSessionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.classSession.findUnique({
      where: { id: parseInt(id!) },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            is_course: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { joined_at: 'asc' },
        },
      },
    });

    if (!session) {
      return sendError(res, 'Class session not found', 404);
    }

    sendSuccess(res, session);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createClassSession = async (req: AuthRequest, res: Response) => {
  try {
    const {
      teacher_id,
      subject_id,
      class_id,
      board_id,
      mode,
      location,
      start_time,
      end_time,
      is_recurring,
      recurrence_rule,
      title,
      description,
      create_google_meet,
    } = req.body;

    // Validate required fields
    if (!teacher_id || !subject_id || !mode || !start_time || !end_time) {
      return sendError(res, 'Missing required fields', 400);
    }

    if (mode === 'OFFLINE' && !location) {
      return sendError(res, 'Location is required for offline sessions', 400);
    }

    // Validate time
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    if (startTime >= endTime) {
      return sendError(res, 'End time must be after start time', 400);
    }

    // Get teacher info
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacher_id },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!teacher) {
      return sendError(res, 'Teacher not found', 404);
    }

    // Get subject info
    const subject = await prisma.subject.findUnique({
      where: { id: subject_id },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    let meetingLink = null;
    let googleEventId = null;

    // Create Google Meet if requested for online sessions
    if (mode === 'ONLINE' && create_google_meet) {
      const allowedEmails = await getAllowedParticipantEmails(subject_id, class_id, board_id);
      const sessionTitle = title || `${subject.name} Class Session`;
      const sessionDescription = description || `Class session for ${subject.name}`;

      try {
        if (is_recurring && recurrence_rule) {
          const meetResponse = await googleMeetService.createRecurringMeeting({
            title: sessionTitle,
            description: sessionDescription,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            recurrenceRule: recurrence_rule,
            allowedParticipants: allowedEmails,
            teacherEmail: teacher.user.email,
          });

          if (meetResponse.success && meetResponse.data) {
            meetingLink = meetResponse.data.meetLink;
            googleEventId = meetResponse.data.eventId;
          }
        } else {
          const meetResponse = await googleMeetService.createMeeting({
            title: sessionTitle,
            description: sessionDescription,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            allowedParticipants: allowedEmails,
            teacherEmail: teacher.user.email,
          });

          if (meetResponse.success && meetResponse.data) {
            meetingLink = meetResponse.data.meetLink;
            googleEventId = meetResponse.data.eventId;
          }
        }
      } catch (meetError: any) {
        console.error('Failed to create Google Meet:', meetError.message);
        // Continue without Google Meet link
      }
    }

    const session = await prisma.classSession.create({
      data: {
        teacher_id,
        subject_id,
        class_id,
        board_id,
        mode,
        location,
        meeting_link: meetingLink || req.body.meeting_link,
        google_event_id: googleEventId,
        start_time: startTime,
        end_time: endTime,
        is_recurring: is_recurring || false,
        recurrence_rule,
        created_by: req.user!.id,
      },
      include: {
        teacher: {
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
        subject: true,
        class: true,
        board: true,
      },
    });

    // Send notifications to enrolled students
    const notificationTitle = `New Class Scheduled: ${subject.name}`;
    const notificationDesc = `A new ${mode.toLowerCase()} class has been scheduled for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}. ${is_recurring ? 'This is a recurring class.' : ''}`;
    
    await notifyEnrolledStudents(
      subject_id,
      class_id,
      board_id,
      notificationTitle,
      notificationDesc
    );

    sendSuccess(res, session, 'Class session created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateClassSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      teacher_id,
      subject_id,
      class_id,
      board_id,
      mode,
      location,
      meeting_link,
      start_time,
      end_time,
      is_recurring,
      recurrence_rule,
    } = req.body;

    // Validate time if provided
    if (start_time && end_time) {
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);

      if (startTime >= endTime) {
        return sendError(res, 'End time must be after start time', 400);
      }
    }

    const updateData: any = {};
    if (teacher_id !== undefined) updateData.teacher_id = teacher_id;
    if (subject_id !== undefined) updateData.subject_id = subject_id;
    if (class_id !== undefined) updateData.class_id = class_id;
    if (board_id !== undefined) updateData.board_id = board_id;
    if (mode !== undefined) updateData.mode = mode;
    if (location !== undefined) updateData.location = location;
    if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
    if (start_time !== undefined) updateData.start_time = new Date(start_time);
    if (end_time !== undefined) updateData.end_time = new Date(end_time);
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (recurrence_rule !== undefined) updateData.recurrence_rule = recurrence_rule;

    const session = await prisma.classSession.update({
      where: { id: parseInt(id!) },
      data: updateData,
      include: {
        teacher: {
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
        subject: true,
        class: true,
        board: true,
      },
    });

    sendSuccess(res, session, 'Class session updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteClassSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.classSession.delete({
      where: { id: parseInt(id!) },
    });

    sendSuccess(res, null, 'Class session deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get upcoming sessions
export const getUpcomingSessions = async (req: Request, res: Response) => {
  try {
    const { teacher_id, subject_id, limit } = req.query;
    const limitNum = parseInt(limit as string) || 10;

    const where: any = {
      start_time: {
        gte: new Date(),
      },
    };

    if (teacher_id) where.teacher_id = parseInt(teacher_id as string);
    if (subject_id) where.subject_id = parseInt(subject_id as string);

    const sessions = await prisma.classSession.findMany({
      where,
      take: limitNum,
      include: {
        teacher: {
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
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        class: true,
        board: true,
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    sendSuccess(res, sessions);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get past sessions
export const getPastSessions = async (req: Request, res: Response) => {
  try {
    const { teacher_id, subject_id, limit } = req.query;
    const limitNum = parseInt(limit as string) || 10;

    const where: any = {
      end_time: {
        lt: new Date(),
      },
    };

    if (teacher_id) where.teacher_id = parseInt(teacher_id as string);
    if (subject_id) where.subject_id = parseInt(subject_id as string);

    const sessions = await prisma.classSession.findMany({
      where,
      take: limitNum,
      include: {
        teacher: {
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
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        class: true,
        board: true,
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { start_time: 'desc' },
    });

    sendSuccess(res, sessions);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get my scheduled sessions (for students)
export const getMyScheduledSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );
    const { upcoming_only, subject_id } = req.query;

    // Get the student profile
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
      include: {
        enrollments: {
          select: { subject_id: true },
        },
      },
    });

    if (!student) {
      return sendError(res, 'Student profile not found', 404);
    }

    // Get subject IDs the student is enrolled in
    const enrolledSubjectIds = student.enrollments.map((e) => e.subject_id);

    if (enrolledSubjectIds.length === 0) {
      return sendSuccess(res, createPaginatedResponse([], 0, 1, limit));
    }

    const where: any = {
      subject_id: { in: enrolledSubjectIds },
      OR: [
        { class_id: null },
        { class_id: student.class_id },
      ],
    };

    // Filter by specific subject if provided
    if (subject_id) {
      where.subject_id = parseInt(subject_id as string);
    }

    // Filter upcoming sessions only
    if (upcoming_only === 'true') {
      where.start_time = { gte: new Date() };
    }

    const [sessions, total] = await Promise.all([
      prisma.classSession.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacher: {
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
          subject: {
            select: {
              id: true,
              name: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          board: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { attendances: true },
          },
        },
        orderBy: { start_time: 'asc' },
      }),
      prisma.classSession.count({ where }),
    ]);

    const response = createPaginatedResponse(sessions, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get today's sessions for a student
export const getTodaysSessions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let where: any = {
      start_time: {
        gte: today,
        lt: tomorrow,
      },
    };

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: userId },
        include: {
          enrollments: {
            select: { subject_id: true },
          },
        },
      });

      if (student) {
        const enrolledSubjectIds = student.enrollments.map((e) => e.subject_id);
        where.subject_id = { in: enrolledSubjectIds };
        where.OR = [
          { class_id: null },
          { class_id: student.class_id },
        ];
      }
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
      });

      if (teacher) {
        where.teacher_id = teacher.id;
      }
    }

    const sessions = await prisma.classSession.findMany({
      where,
      include: {
        teacher: {
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
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        class: true,
        board: true,
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    sendSuccess(res, sessions);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get weekly schedule for a student
export const getWeeklySchedule = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { week_offset } = req.query;

    const offset = parseInt(week_offset as string) || 0;
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + (offset * 7));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    let where: any = {
      start_time: {
        gte: startOfWeek,
        lt: endOfWeek,
      },
    };

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: userId },
        include: {
          enrollments: {
            select: { subject_id: true },
          },
        },
      });

      if (student) {
        const enrolledSubjectIds = student.enrollments.map((e) => e.subject_id);
        where.subject_id = { in: enrolledSubjectIds };
        where.OR = [
          { class_id: null },
          { class_id: student.class_id },
        ];
      }
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
      });

      if (teacher) {
        where.teacher_id = teacher.id;
      }
    }

    const sessions = await prisma.classSession.findMany({
      where,
      include: {
        teacher: {
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
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        class: true,
        board: true,
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { start_time: 'asc' },
    });

    // Group sessions by day
    const groupedSessions: { [key: string]: typeof sessions } = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    sessions.forEach((session) => {
      const dayIndex = new Date(session.start_time).getDay();
      const dayName = dayNames[dayIndex] as string;
      if (!groupedSessions[dayName]) {
        groupedSessions[dayName] = [];
      }
      groupedSessions[dayName].push(session);
    });

    sendSuccess(res, {
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      sessions: groupedSessions,
      totalSessions: sessions.length,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Check if user can join a session
export const canJoinSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const session = await prisma.classSession.findUnique({
      where: { id: parseInt(id!) },
      include: {
        teacher: true,
        subject: true,
      },
    });

    if (!session) {
      return sendError(res, 'Session not found', 404);
    }

    // Check if session is happening now or soon (15 minutes before)
    const now = new Date();
    const sessionStart = new Date(session.start_time);
    const sessionEnd = new Date(session.end_time);
    const fifteenMinsBefore = new Date(sessionStart.getTime() - 15 * 60 * 1000);

    const isTimeValid = now >= fifteenMinsBefore && now <= sessionEnd;

    let canJoin = false;
    let reason = '';

    if (userRole === 'ADMIN') {
      canJoin = isTimeValid;
      reason = isTimeValid ? '' : 'Session is not active yet or has ended';
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
      });
      canJoin = isTimeValid && teacher?.id === session.teacher_id;
      reason = !isTimeValid ? 'Session is not active yet or has ended' : 
               teacher?.id !== session.teacher_id ? 'You are not the assigned teacher for this session' : '';
    } else if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: userId },
        include: {
          enrollments: {
            where: { subject_id: session.subject_id },
          },
        },
      });

      const isEnrolled = student && student.enrollments.length > 0;
      const classMatches = !session.class_id || session.class_id === student?.class_id;
      const boardMatches = !session.board_id || session.board_id === student?.board_id;

      canJoin = isTimeValid && !!isEnrolled && !!classMatches && !!boardMatches;
      
      if (!isTimeValid) {
        reason = 'Session is not active yet or has ended';
      } else if (!isEnrolled) {
        reason = 'You are not enrolled in this subject';
      } else if (!classMatches || !boardMatches) {
        reason = 'This session is not for your class/board';
      }
    }

    sendSuccess(res, {
      canJoin,
      reason,
      session: {
        id: session.id,
        start_time: session.start_time,
        end_time: session.end_time,
        mode: session.mode,
        meeting_link: canJoin ? session.meeting_link : null,
        location: session.location,
      },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};