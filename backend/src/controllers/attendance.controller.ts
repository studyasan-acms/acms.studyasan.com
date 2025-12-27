import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import type { AuthRequest } from '../types/index.js';

const prisma = new PrismaClient();

export const getAllAttendances = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { class_session_id, user_id, role } = req.query;

    const where: any = {};

    if (class_session_id) where.class_session_id = parseInt(class_session_id as string);
    if (user_id) where.user_id = parseInt(user_id as string);
    if (role) where.role = role;

    const [attendances, total] = await Promise.all([
      prisma.classSessionAttendance.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          class_session: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                },
              },
              teacher: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.classSessionAttendance.count({ where }),
    ]);

    const response = createPaginatedResponse(attendances, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getAttendanceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.classSessionAttendance.findUnique({
      where: { id: parseInt(id!) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        class_session: {
          include: {
            subject: true,
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
            class: true,
            board: true,
          },
        },
      },
    });

    if (!attendance) {
      return sendError(res, 'Attendance record not found', 404);
    }

    sendSuccess(res, attendance);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const recordAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { class_session_id, user_id, role, joined_at, left_at } = req.body;

    if (!class_session_id || !user_id || !role) {
      return sendError(res, 'Missing required fields', 400);
    }

    // Check if session exists
    const session = await prisma.classSession.findUnique({
      where: { id: class_session_id },
    });

    if (!session) {
      return sendError(res, 'Class session not found', 404);
    }

    // Check if attendance already exists
    const existingAttendance = await prisma.classSessionAttendance.findFirst({
      where: {
        class_session_id,
        user_id,
      },
    });

    if (existingAttendance) {
      return sendError(res, 'Attendance already recorded for this user', 400);
    }

    // Calculate duration if both times provided
    let duration_minutes = null;
    if (joined_at && left_at) {
      const joinedTime = new Date(joined_at);
      const leftTime = new Date(left_at);
      duration_minutes = Math.round((leftTime.getTime() - joinedTime.getTime()) / (1000 * 60));
    }

    const attendance = await prisma.classSessionAttendance.create({
      data: {
        class_session_id,
        user_id,
        role,
        joined_at: joined_at ? new Date(joined_at) : null,
        left_at: left_at ? new Date(left_at) : null,
        duration_minutes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        class_session: {
          include: {
            subject: true,
          },
        },
      },
    });

    sendSuccess(res, attendance, 'Attendance recorded successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { joined_at, left_at } = req.body;

    const updateData: any = {};

    if (joined_at !== undefined) updateData.joined_at = joined_at ? new Date(joined_at) : null;
    if (left_at !== undefined) updateData.left_at = left_at ? new Date(left_at) : null;

    // Calculate duration if both times are provided
    if (joined_at && left_at) {
      const joinedTime = new Date(joined_at);
      const leftTime = new Date(left_at);
      updateData.duration_minutes = Math.round((leftTime.getTime() - joinedTime.getTime()) / (1000 * 60));
    }

    const attendance = await prisma.classSessionAttendance.update({
      where: { id: parseInt(id!) },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        class_session: {
          include: {
            subject: true,
          },
        },
      },
    });

    sendSuccess(res, attendance, 'Attendance updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.classSessionAttendance.delete({
      where: { id: parseInt(id!) },
    });

    sendSuccess(res, null, 'Attendance record deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get attendance by session
export const getAttendanceBySession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const attendances = await prisma.classSessionAttendance.findMany({
      where: {
        class_session_id: parseInt(sessionId!),
      },
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
    });

    // Calculate statistics
    const stats = {
      total: attendances.length,
      teachers: attendances.filter(a => a.role === 'TEACHER').length,
      students: attendances.filter(a => a.role === 'STUDENT').length,
      averageDuration: attendances
        .filter(a => a.duration_minutes)
        .reduce((sum, a) => sum + (a.duration_minutes || 0), 0) /
        attendances.filter(a => a.duration_minutes).length || 0,
    };

    sendSuccess(res, { attendances, stats });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get attendance by user
export const getAttendanceByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const [attendances, total] = await Promise.all([
      prisma.classSessionAttendance.findMany({
        where: {
          user_id: parseInt(userId!),
        },
        skip,
        take: limit,
        include: {
          class_session: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                },
              },
              teacher: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.classSessionAttendance.count({
        where: {
          user_id: parseInt(userId!),
        },
      }),
    ]);

    // Calculate statistics
    const totalDuration = attendances
      .filter(a => a.duration_minutes)
      .reduce((sum, a) => sum + (a.duration_minutes || 0), 0);

    const stats = {
      totalSessions: total,
      totalDuration,
      averageDuration: total > 0 ? totalDuration / total : 0,
    };

    const response = {
      ...createPaginatedResponse(attendances, total, page, limit),
      stats,
    };

    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Mark attendance (join session)
export const markJoinTime = async (req: AuthRequest, res: Response) => {
  try {
    const { class_session_id } = req.body;
    const user_id = req.user!.id;

    // Determine role based on user
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: {
        teacher: true,
        student: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const role = user.teacher ? 'TEACHER' : user.student ? 'STUDENT' : null;
    if (!role) {
      return sendError(res, 'User must be a teacher or student', 400);
    }

    // Check if already joined
    const existingAttendance = await prisma.classSessionAttendance.findFirst({
      where: {
        class_session_id,
        user_id,
      },
    });

    if (existingAttendance) {
      return sendError(res, 'Already marked attendance for this session', 400);
    }

    const attendance = await prisma.classSessionAttendance.create({
      data: {
        class_session_id,
        user_id,
        role,
        joined_at: new Date(),
      },
      include: {
        class_session: {
          include: {
            subject: true,
          },
        },
      },
    });

    sendSuccess(res, attendance, 'Joined session successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Mark leave time
export const markLeaveTime = async (req: AuthRequest, res: Response) => {
  try {
    const { class_session_id } = req.body;
    const user_id = req.user!.id;

    const attendance = await prisma.classSessionAttendance.findFirst({
      where: {
        class_session_id,
        user_id,
      },
    });

    if (!attendance) {
      return sendError(res, 'Attendance record not found', 404);
    }

    if (attendance.left_at) {
      return sendError(res, 'Already marked leave time', 400);
    }

    const leftAt = new Date();
    let duration_minutes = null;

    if (attendance.joined_at) {
      duration_minutes = Math.round(
        (leftAt.getTime() - new Date(attendance.joined_at).getTime()) / (1000 * 60)
      );
    }

    const updatedAttendance = await prisma.classSessionAttendance.update({
      where: { id: attendance.id },
      data: {
        left_at: leftAt,
        duration_minutes,
      },
      include: {
        class_session: {
          include: {
            subject: true,
          },
        },
      },
    });

    sendSuccess(res, updatedAttendance, 'Left session successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get attendance report
export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, subject_id, class_id } = req.query;

    const where: any = {};

    if (start_date || end_date) {
      where.class_session = {
        start_time: {},
      };
      if (start_date) where.class_session.start_time.gte = new Date(start_date as string);
      if (end_date) where.class_session.start_time.lte = new Date(end_date as string);
    }

    if (subject_id) {
      if (!where.class_session) where.class_session = {};
      where.class_session.subject_id = parseInt(subject_id as string);
    }

    if (class_id) {
      if (!where.class_session) where.class_session = {};
      where.class_session.class_id = parseInt(class_id as string);
    }

    const attendances = await prisma.classSessionAttendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        class_session: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
              },
            },
            teacher: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Generate report statistics
    const report = {
      totalAttendances: attendances.length,
      uniqueStudents: new Set(attendances.filter(a => a.role === 'STUDENT').map(a => a.user_id)).size,
      uniqueTeachers: new Set(attendances.filter(a => a.role === 'TEACHER').map(a => a.user_id)).size,
      totalDuration: attendances.reduce((sum, a) => sum + (a.duration_minutes || 0), 0),
      averageDuration: attendances.length > 0
        ? attendances.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) / attendances.length
        : 0,
      attendances,
    };

    sendSuccess(res, report);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};