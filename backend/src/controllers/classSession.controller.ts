import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { sendNotificationAllChannels } from '../services/notification.service.js';
import type { AuthRequest } from '../types/index.js';
import { googleMeetService } from '../utils/googleMeet.js';

const prisma = new PrismaClient();
const MAX_CLASS_DURATION_MINUTES = 120; // Maximum allowed class duration is 2 hours (120 minutes)
const MAX_SESSION_DURATION_HOURS = 2;

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

    // Send notifications via all channels (in-app, FCM, email)
    if (notifications.length > 0) {
      const notificationPromises = notifications.map(notification =>
        sendNotificationAllChannels(notification)
      );
      await Promise.allSettled(notificationPromises);
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

// Helper to schedule future class reminders (PendingNotification)
async function schedulePendingNotifications(
  subjectId: number,
  classId: number | null,
  boardId: number | null,
  subjectName: string,
  teacherId: number,
  instances: { startTime: Date; endTime: Date }[]
) {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        subject_id: subjectId,
        student: {
          ...(classId && { class_id: classId }),
          ...(boardId && { board_id: boardId }),
        },
      },
      select: { student: { select: { user_id: true } } }
    });

    // Get the teacher's user_id
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { user_id: true }
    });

    const recipientUserIds = enrollments.map(e => e.student.user_id);
    if (teacher) recipientUserIds.push(teacher.user_id);

    if (recipientUserIds.length === 0) return;

    const now = new Date();
    const pendingData: any[] = [];

    instances.forEach((inst) => {
      const timeStr = inst.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 1. Schedule reminder 15 minutes before the class
      const deliveryTime15 = new Date(inst.startTime.getTime() - 15 * 60 * 1000);
      if (deliveryTime15 > now) {
        recipientUserIds.forEach((userId) => {
          pendingData.push({
            user_id: userId,
            type: 'INFO',
            title: `Class Starting Soon: ${subjectName}`,
            description: `Your ${subjectName} class starts in 15 minutes (${timeStr}).`,
            delivery_time: deliveryTime15,
            status: 'PENDING',
          });
        });
      }

      // 2. Schedule reminder at the exact start time
      if (inst.startTime > now) {
        recipientUserIds.forEach((userId) => {
          pendingData.push({
            user_id: userId,
            type: 'INFO',
            title: `Class Starting Now: ${subjectName}`,
            description: `Your ${subjectName} class is starting now. Click to join the session!`,
            delivery_time: inst.startTime,
            status: 'PENDING',
          });
        });
      }
    });

    if (pendingData.length > 0) {
      await prisma.pendingNotification.createMany({
        data: pendingData,
      });
    }
    return pendingData.length;
  } catch (error) {
    console.error('Error scheduling pending notifications:', error);
    return 0;
  }
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
      search,
    } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { subject: { name: { contains: search as string, mode: 'insensitive' } } },
        { teacher: { user: { name: { contains: search as string, mode: 'insensitive' } } } },
      ];
    }

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
          section: { select: { id: true, title: true } },
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
      section_id,
      mode,
      location,
      start_time,
      end_time,
      is_recurring,
      recurrence_rule,
      title,
      description,
      create_google_meet,
      emergency_meeting_link,
    } = req.body;

    // Validate required fields
    if (!teacher_id || !subject_id || !mode || !start_time || !end_time) {
      return sendError(res, 'Missing required fields', 400);
    }

    if (mode === 'OFFLINE' && !location) {
      return sendError(res, 'Location is required for offline sessions', 400);
    }

    // Validate time and duration (Max 2 hours)
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    if (startTime >= endTime) {
      return sendError(res, 'End time must be after start time', 400);
    }

    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes > MAX_CLASS_DURATION_MINUTES) {
      return sendError(res, `Single class session duration cannot exceed 2 hours (${MAX_CLASS_DURATION_MINUTES} minutes). Your duration: ${Math.round(durationMinutes)} mins.`, 400);
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

    // If it's recurring, generate multiple instances grouped by a recurrence_group_id
    if (is_recurring && recurrence_rule) {
      const instances = generateRecurringInstances(startTime, endTime, recurrence_rule);
      const recurrenceGroupId = `rec_${uuidv4()}`;

      // Create all instances
      const sessionData = instances.map((inst) => ({
        teacher_id,
        subject_id,
        class_id,
        board_id,
        section_id: section_id ? parseInt(section_id) : null,
        mode,
        location,
        meeting_link: meetingLink || req.body.meeting_link,
        emergency_meeting_link: emergency_meeting_link || null,
        google_event_id: googleEventId,
        start_time: inst.startTime,
        end_time: inst.endTime,
        is_recurring: true,
        recurrence_rule,
        recurrence_group_id: recurrenceGroupId,
        created_by: req.user!.id,
      }));

      await prisma.classSession.createMany({
        data: sessionData,
      });

      // Get the first session to return as response
      const firstSession = await prisma.classSession.findFirst({
        where: {
          recurrence_group_id: recurrenceGroupId,
          start_time: startTime,
        },
        include: {
          teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
          subject: true,
          class: true,
          board: true,
        },
      });

      // Send notifications
      const notificationTitle = `New Recurring Class Scheduled: ${subject.name}`;
      const notificationDesc = `A new recurring ${mode.toLowerCase()} class has been scheduled. Check your schedule for all instances.`;

      await notifyEnrolledStudents(
        subject_id,
        class_id,
        board_id,
        notificationTitle,
        notificationDesc
      );

      // Schedule future reminders for each instance
      await schedulePendingNotifications(
        subject_id,
        class_id,
        board_id,
        subject.name,
        teacher_id,
        instances
      );

      return sendSuccess(res, firstSession, `Recurring class series (${instances.length} sessions) created successfully`, 201);
    }

    // Single session creation
    const session = await prisma.classSession.create({
      data: {
        teacher_id,
        subject_id,
        class_id,
        board_id,
        section_id: section_id ? parseInt(section_id) : null,
        mode,
        location,
        meeting_link: meetingLink || req.body.meeting_link,
        emergency_meeting_link: emergency_meeting_link || null,
        google_event_id: googleEventId,
        start_time: startTime,
        end_time: endTime,
        is_recurring: false,
        created_by: req.user!.id,
      },
      include: {
        teacher: { include: { user: { select: { id: true, name: true, email: true } } } },
        subject: true,
        class: true,
        board: true,
      },
    });

    // Send notifications to enrolled students
    const notificationTitle = `New Class Scheduled: ${subject.name}`;
    const notificationDesc = `A new ${mode.toLowerCase()} class has been scheduled for ${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString()}.`;

    await notifyEnrolledStudents(
      subject_id,
      class_id,
      board_id,
      notificationTitle,
      notificationDesc
    );

    // Schedule a reminder for this session
    await schedulePendingNotifications(
      subject_id,
      class_id,
      board_id,
      subject.name,
      teacher_id,
      [{ startTime, endTime }]
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
      section_id,
      mode,
      location,
      meeting_link,
      emergency_meeting_link,
      start_time,
      end_time,
      is_recurring,
      recurrence_rule,
      apply_to_all_recurring,
    } = req.body;

    const existingSession = await prisma.classSession.findUnique({
      where: { id: parseInt(id!) },
    });

    if (!existingSession) {
      return sendError(res, 'Class session not found', 404);
    }

    // Validate time if provided
    if (start_time && end_time) {
      const startTime = new Date(start_time);
      const endTime = new Date(end_time);

      if (startTime >= endTime) {
        return sendError(res, 'End time must be after start time', 400);
      }

      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      if (durationMinutes > MAX_CLASS_DURATION_MINUTES) {
        return sendError(res, `Single class session duration cannot exceed 2 hours (${MAX_CLASS_DURATION_MINUTES} minutes). Your duration: ${Math.round(durationMinutes)} mins.`, 400);
      }
    }

    const updateData: any = {};
    if (teacher_id !== undefined) updateData.teacher_id = teacher_id;
    if (subject_id !== undefined) updateData.subject_id = subject_id;
    if (class_id !== undefined) updateData.class_id = class_id;
    if (board_id !== undefined) updateData.board_id = board_id;
    if (section_id !== undefined) updateData.section_id = section_id ? parseInt(section_id) : null;
    if (mode !== undefined) updateData.mode = mode;
    if (location !== undefined) updateData.location = location;
    if (meeting_link !== undefined) updateData.meeting_link = meeting_link;
    if (emergency_meeting_link !== undefined) updateData.emergency_meeting_link = emergency_meeting_link;
    if (start_time !== undefined) updateData.start_time = new Date(start_time);
    if (end_time !== undefined) updateData.end_time = new Date(end_time);
    if (is_recurring !== undefined) updateData.is_recurring = is_recurring;
    if (recurrence_rule !== undefined) updateData.recurrence_rule = recurrence_rule;

    // If admin/teacher wants to apply changes across all recurring sessions in the series
    if (apply_to_all_recurring && (existingSession.recurrence_group_id || existingSession.is_recurring)) {
      const whereFilter = existingSession.recurrence_group_id
        ? { recurrence_group_id: existingSession.recurrence_group_id }
        : {
            teacher_id: existingSession.teacher_id,
            subject_id: existingSession.subject_id,
            is_recurring: true,
          };

      const commonUpdateData: any = { ...updateData };
      delete commonUpdateData.start_time;
      delete commonUpdateData.end_time;

      if (start_time && end_time) {
        const newStartTime = new Date(start_time);
        const newEndTime = new Date(end_time);
        const durationMs = newEndTime.getTime() - newStartTime.getTime();

        const matchingSessions = await prisma.classSession.findMany({
          where: whereFilter,
        });

        for (const s of matchingSessions) {
          const instanceStart = new Date(s.start_time);
          instanceStart.setUTCHours(newStartTime.getUTCHours(), newStartTime.getUTCMinutes(), newStartTime.getUTCSeconds(), 0);
          const instanceEnd = new Date(instanceStart.getTime() + durationMs);

          await prisma.classSession.update({
            where: { id: s.id },
            data: {
              ...commonUpdateData,
              start_time: instanceStart,
              end_time: instanceEnd,
            },
          });
        }
      } else {
        await prisma.classSession.updateMany({
          where: whereFilter,
          data: commonUpdateData,
        });
      }

      const updated = await prisma.classSession.findUnique({
        where: { id: parseInt(id!) },
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

      return sendSuccess(res, updated, 'All recurring sessions in series updated successfully');
    }

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
    const deleteRecurring = req.query.delete_recurring === 'true' || req.body?.delete_recurring === true;

    const session = await prisma.classSession.findUnique({
      where: { id: parseInt(id!) },
    });

    if (!session) {
      return sendError(res, 'Class session not found', 404);
    }

    if (deleteRecurring && (session.recurrence_group_id || session.is_recurring)) {
      const whereFilter = session.recurrence_group_id
        ? { recurrence_group_id: session.recurrence_group_id }
        : {
            teacher_id: session.teacher_id,
            subject_id: session.subject_id,
            is_recurring: true,
          };

      const deleted = await prisma.classSession.deleteMany({
        where: whereFilter,
      });

      return sendSuccess(res, null, `Deleted ${deleted.count} recurring sessions in series successfully`);
    }

    await prisma.classSession.delete({
      where: { id: parseInt(id!) },
    });

    sendSuccess(res, null, 'Class session deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Batch delete class sessions
export const bulkDeleteClassSessions = async (req: Request, res: Response) => {
  try {
    const { session_ids, delete_recurring_series } = req.body;

    if (!Array.isArray(session_ids) || session_ids.length === 0) {
      return sendError(res, 'Array of session IDs is required', 400);
    }

    const ids = session_ids.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id));

    if (delete_recurring_series) {
      const selectedSessions = await prisma.classSession.findMany({
        where: { id: { in: ids } },
        select: { id: true, recurrence_group_id: true, is_recurring: true },
      });

      const recurrenceGroupIds = selectedSessions
        .map((s) => s.recurrence_group_id)
        .filter(Boolean) as string[];

      const whereOr: any[] = [{ id: { in: ids } }];
      if (recurrenceGroupIds.length > 0) {
        whereOr.push({ recurrence_group_id: { in: recurrenceGroupIds } });
      }

      const deleted = await prisma.classSession.deleteMany({
        where: { OR: whereOr },
      });

      return sendSuccess(res, { count: deleted.count }, `Successfully deleted ${deleted.count} sessions`);
    }

    const deleted = await prisma.classSession.deleteMany({
      where: { id: { in: ids } },
    });

    sendSuccess(res, { count: deleted.count }, `Successfully deleted ${deleted.count} sessions`);
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
    const { upcoming_only, subject_id, search } = req.query;

    // Get the student profile with enrollments and section memberships
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
      include: {
        enrollments: { select: { subject_id: true } },
        section_memberships: { select: { section_id: true } },
      },
    });

    if (!student) {
      return sendError(res, 'Student profile not found', 404);
    }

    // Get subject IDs the student is enrolled in
    const enrolledSubjectIds = student.enrollments
      .map((e) => e.subject_id)
      .filter((id) => id !== null);

    if (enrolledSubjectIds.length === 0) {
      return sendSuccess(res, createPaginatedResponse([], 0, 1, limit));
    }

    const mySectionIds = student.section_memberships.map((m) => m.section_id);

    // Session visibility rules:
    // 1. No section_id (subject-wide) → visible to all enrolled students
    // 2. Has section_id → only visible if student is in that section
    const where: any = {
      subject_id: { in: enrolledSubjectIds },
      OR: [
        { section_id: null },
        { section_id: { in: mySectionIds } },
      ],
    };

    if (search) {
      where.AND = [{
        OR: [
          { subject: { name: { contains: search as string, mode: 'insensitive' } } },
          { teacher: { user: { name: { contains: search as string, mode: 'insensitive' } } } },
        ]
      }];
    }

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
              user: { select: { id: true, name: true, email: true } },
            },
          },
          subject: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
          board: { select: { id: true, name: true } },
          section: { select: { id: true, title: true } },
          _count: { select: { attendances: true } },
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
          enrollments: { select: { subject_id: true } },
          section_memberships: { select: { section_id: true } },
        },
      });

      if (student) {
        const enrolledSubjectIds = student.enrollments
          .map((e) => e.subject_id)
          .filter((id) => id !== null);
        const mySectionIds = student.section_memberships.map((m) => m.section_id);
        where.subject_id = { in: enrolledSubjectIds };
        where.OR = [
          { section_id: null },
          { section_id: { in: mySectionIds } },
        ];
      }
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
      });

      if (teacher) {
        // Teacher sees: sessions they teach that are either subject-wide OR their section
        where.teacher_id = teacher.id;
      }
    }

    const sessions = await prisma.classSession.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        subject: { select: { id: true, name: true } },
        class: true,
        board: true,
        section: { select: { id: true, title: true } },
        _count: { select: { attendances: true } },
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
    startOfWeek.setDate(startOfWeek.getDate() + (offset * 7));
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
          enrollments: { select: { subject_id: true } },
          section_memberships: { select: { section_id: true } },
        },
      });

      if (student) {
        const enrolledSubjectIds = student.enrollments
          .map((e) => e.subject_id)
          .filter((id) => id !== null);
        const mySectionIds = student.section_memberships.map((m) => m.section_id);
        where.subject_id = { in: enrolledSubjectIds };
        where.OR = [
          { section_id: null },
          { section_id: { in: mySectionIds } },
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
            user: { select: { id: true, name: true, email: true } },
          },
        },
        subject: { select: { id: true, name: true } },
        class: true,
        board: true,
        section: { select: { id: true, title: true } },
        _count: { select: { attendances: true } },
      },
      orderBy: { start_time: 'asc' },
    });

    sendSuccess(res, {
      weekStart: startOfWeek.toISOString(),
      weekEnd: endOfWeek.toISOString(),
      sessions: sessions,
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

    const now = new Date();
    const sessionStart = new Date(session.start_time);
    const sessionEnd = new Date(session.end_time);
    const maxEnd = new Date(sessionStart.getTime() + MAX_SESSION_DURATION_HOURS * 60 * 60 * 1000);
    const effectiveSessionEnd = sessionEnd > maxEnd ? maxEnd : sessionEnd;
    const isTimeValid = now <= effectiveSessionEnd;

    let canJoin = false;
    let reason = '';

    if (userRole === 'ADMIN') {
      canJoin = isTimeValid;
      reason = isTimeValid ? '' : 'Session has ended';
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: userId },
      });
      canJoin = isTimeValid && teacher?.id === session.teacher_id;
      reason = !isTimeValid ? 'Session has ended' :
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

      canJoin = isTimeValid && !!isEnrolled;

      if (!isTimeValid) {
        reason = 'Session has ended';
      } else if (!isEnrolled) {
        reason = 'You are not enrolled in this subject';
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
        emergency_meeting_link: canJoin ? session.emergency_meeting_link : null,
        location: session.location,
      },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};