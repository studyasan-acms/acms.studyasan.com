import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import type { AuthRequest } from '../types/index.js';
import janusAdmin from '../services/janusAdmin.service.js';
import { whiteboardCache } from '../services/whiteboardCache.service.js';

const prisma = new PrismaClient();

/**
 * Create a Janus room using admin API
 * This endpoint securely creates rooms on Janus server using admin key
 */
export const createJanusRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, description } = req.body;

    if (!roomId) {
      return sendError(res, 'Room ID is required', 400);
    }

    const janusApiUrl = process.env.JANUS_HTTP_API || '';
    const adminKey = process.env.JANUS_ADMIN_KEY;

    console.log(`[Backend] Creating Janus room: ${roomId}`);
    console.log(`[Backend] Janus API URL: ${janusApiUrl}`);

    // Create session first
    const sessionResponse = await fetch(janusApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        janus: 'create',
        transaction: `txn_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      }),
    });

    const sessionData = await sessionResponse.json();
    console.log('[Backend] Session response:', sessionData);

    if (!sessionData.data?.id) {
      console.error('[Backend] Failed to create session:', sessionData);
      return sendError(res, 'Failed to create Janus session', 500);
    }

    const sessionId = sessionData.data.id;

    // Attach to VideoRoom plugin
    const attachResponse = await fetch(janusApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        janus: 'attach',
        session_id: sessionId,
        plugin: 'janus.plugin.videoroom',
        transaction: `txn_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      }),
    });

    const attachData = await attachResponse.json();
    console.log('[Backend] Attach response:', attachData);

    if (!attachData.data?.id) {
      console.error('[Backend] Failed to attach plugin:', attachData);
      return sendError(res, 'Failed to attach VideoRoom plugin', 500);
    }

    const handleId = attachData.data.id;

    // Create room with admin key
    const createResponse = await fetch(janusApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        janus: 'message',
        session_id: sessionId,
        handle_id: handleId,
        transaction: `txn_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        body: {
          request: 'create',
          room: roomId,
          admin_key: adminKey,
          permanent: false,
          description: description || `StudyAsan Classroom ${roomId}`,
          publishers: 100,
          bitrate: 512000,
          fir_freq: 10,
          audiocodec: 'opus',
          videocodec: 'vp8,h264',
          record: false,
          is_private: false,
        },
      }),
    });

    const createData = await createResponse.json();
    console.log('[Backend] Create room response:', createData);

    const responseData = createData.plugindata?.data;

    if (responseData?.videoroom === 'created') {
      console.log(`[Backend] ✅ Room created successfully: ${roomId}`);
      return sendSuccess(res, { roomId, created: true }, 'Room created successfully');
    } else if (responseData?.error_code === 427) {
      console.log(`[Backend] ✅ Room already exists: ${roomId}`);
      return sendSuccess(res, { roomId, created: false, exists: true }, 'Room already exists');
    } else if (responseData?.error_code) {
      console.error(`[Backend] ❌ Room creation failed:`, responseData);
      return sendError(res, responseData.error || 'Failed to create room', 400);
    } else {
      console.log(`[Backend] ⚠️ Unexpected response, assuming success`);
      return sendSuccess(res, { roomId, created: true }, 'Room creation request accepted');
    }
  } catch (error: any) {
    console.error('[Backend] Error creating Janus room:', error);
    return sendError(res, error.message || 'Internal server error', 500);
  }
};

/**
 * Generate a unique numeric room ID based on class session ID
 * Creates a large number that's unique per session
 */
function generateJanusRoomId(classSessionId: number): bigint {
  // Use class session ID + timestamp to ensure uniqueness
  const timestamp = Date.now();
  // Create a large number: classSessionId * 10^12 + timestamp
  return BigInt(classSessionId) * BigInt(1000000000000) + BigInt(timestamp % 1000000000000);
}

/**
 * Check if user has access to a class session
 * - Admin: Always has access (observer/moderator — NOT pinned as teacher)
 * - Teacher: Has access if they are assigned to the session
 * - Student: Has access if enrolled in the subject OR is a member of the session's section
 */
async function checkRoomAccess(
  userId: number,
  userRole: string,
  classSession: {
    teacher_id: number;
    subject_id: number;
    class_id: number | null;
    board_id: number | null;
    section_id?: number | null;
  }
): Promise<{ hasAccess: boolean; reason?: string; isTeacher?: boolean; isAdmin?: boolean }> {
  // Admin always has access — but they are NOT the teacher (do not pin them as teacher)
  if (userRole === 'ADMIN') {
    return { hasAccess: true, isTeacher: false, isAdmin: true };
  }

  // Check if user is the assigned teacher
  if (userRole === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { user_id: userId },
    });
    if (teacher && teacher.id === classSession.teacher_id) {
      return { hasAccess: true, isTeacher: true, isAdmin: false };
    }
    return { hasAccess: false, reason: 'You are not assigned to this class session' };
  }

  // For students, check enrollment OR section membership
  if (userRole === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
      include: {
        enrollments: {
          where: { subject_id: classSession.subject_id },
        },
        section_memberships: {
          include: {
            section: true,
          },
        },
      },
    });

    if (!student) {
      return { hasAccess: false, reason: 'Student profile not found' };
    }

    // Check 1: Direct subject enrollment
    if (student.enrollments.length > 0) {
      return { hasAccess: true, isTeacher: false, isAdmin: false };
    }

    // Check 2: If the session is for a specific section, check section membership
    if (classSession.section_id) {
      const inSection = student.section_memberships.some(
        (m) => m.section_id === classSession.section_id
      );
      if (inSection) {
        return { hasAccess: true, isTeacher: false, isAdmin: false };
      }
    }

    // Check 3: Student belongs to any section of this subject (for subject-scoped sessions)
    if (!classSession.section_id) {
      const inSubjectSection = student.section_memberships.some(
        (m) => m.section.subject_id === classSession.subject_id
      );
      if (inSubjectSection) {
        return { hasAccess: true, isTeacher: false, isAdmin: false };
      }
    }

    return { hasAccess: false, reason: 'You are not enrolled in this subject or assigned to this class section' };
  }

  return { hasAccess: false, reason: 'Invalid user role' };
}

/**
 * Get or create a video room for a class session
 */
export const getOrCreateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!sessionId) {
      return sendError(res, 'Session ID is required', 400);
    }

    // Get class session
    const classSession = await prisma.classSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        video_room: true,
        teacher: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      },
    });

    if (!classSession) {
      return sendError(res, 'Class session not found', 404);
    }

    // Check access
    const access = await checkRoomAccess(userId, userRole, classSession);
    if (!access.hasAccess) {
      return sendError(res, access.reason || 'Access denied', 403);
    }

    // Get or create video room
    let videoRoom = classSession.video_room;

    if (!videoRoom) {
      const janusRoomId = generateJanusRoomId(classSession.id);

      // Create room in database
      videoRoom = await prisma.videoRoom.create({
        data: {
          class_session_id: classSession.id,
          janus_room_id: janusRoomId,
          is_created: false, // Will be set to true when first participant joins
        },
      });

      console.log(`[VideoRoom] Created room record with Janus ID: ${janusRoomId}`);
    }

    sendSuccess(res, {
      janusRoomId: videoRoom.janus_room_id.toString(), // Send as string for JS BigInt compatibility
      sessionId: classSession.id,
      isTeacher: access.isTeacher || false,
      isAdmin: access.isAdmin || false,
      isCreated: videoRoom.is_created,
      subject: classSession.subject_id,
      teacherName: classSession.teacher?.user?.name || null,
      teacherUserId: classSession.teacher?.user?.id || null,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Mark room as created on Janus (called by frontend after successful creation)
 */
export const markRoomCreated = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    const videoRoom = await prisma.videoRoom.update({
      where: { janus_room_id: BigInt(janusRoomId) },
      data: { is_created: true },
    });

    console.log(`[VideoRoom] Marked room ${janusRoomId} as created on Janus`);

    sendSuccess(res, { janusRoomId: videoRoom.janus_room_id.toString() });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Validate user access to a room
 */
export const validateAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    const videoRoom = await prisma.videoRoom.findUnique({
      where: { janus_room_id: BigInt(janusRoomId) },
      include: { class_session: true },
    });

    if (!videoRoom) {
      return sendError(res, 'Room not found', 404);
    }

    const access = await checkRoomAccess(userId, userRole, videoRoom.class_session);

    sendSuccess(res, {
      hasAccess: access.hasAccess,
      reason: access.reason,
      isTeacher: access.isTeacher,
      janusRoomId: videoRoom.janus_room_id.toString(),
      isCreated: videoRoom.is_created,
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Get chat messages for a room
 */
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;
    const { since } = req.query;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    const videoRoom = await prisma.videoRoom.findUnique({
      where: { janus_room_id: BigInt(janusRoomId) },
      include: { class_session: true },
    });

    if (!videoRoom) {
      return sendError(res, 'Room not found', 404);
    }

    // Check access
    const access = await checkRoomAccess(userId, userRole, videoRoom.class_session);
    if (!access.hasAccess) {
      return sendError(res, access.reason || 'Access denied', 403);
    }

    // Get messages, optionally filtered by timestamp
    const where: any = { room_id: videoRoom.id };
    if (since) {
      where.created_at = { gt: new Date(since as string) };
    }

    const messages = await prisma.roomChatMessage.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 100,
    });

    sendSuccess(res, {
      messages: messages.map((m) => ({
        id: m.id.toString(),
        sender: m.sender.name,
        senderId: m.sender.id,
        text: m.content,
        timestamp: m.created_at.getTime(),
      })),
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Send a chat message
 */
export const sendChatMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    if (!content || !content.trim()) {
      return sendError(res, 'Message content is required', 400);
    }

    const videoRoom = await prisma.videoRoom.findUnique({
      where: { janus_room_id: BigInt(janusRoomId) },
      include: { class_session: true },
    });

    if (!videoRoom) {
      return sendError(res, 'Room not found', 404);
    }

    // Check access
    const access = await checkRoomAccess(userId, userRole, videoRoom.class_session);
    if (!access.hasAccess) {
      return sendError(res, access.reason || 'Access denied', 403);
    }

    const message = await prisma.roomChatMessage.create({
      data: {
        room_id: videoRoom.id,
        sender_id: userId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });

    sendSuccess(res, {
      id: message.id.toString(),
      sender: message.sender.name,
      senderId: message.sender.id,
      text: message.content,
      timestamp: message.created_at.getTime(),
    }, 'Message sent', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Get whiteboard strokes (fast in-memory cached)
 */
export const getWhiteboardStrokes = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    const strokes = whiteboardCache.getStrokes(janusRoomId);
    return sendSuccess(res, { strokes });
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Add or update a whiteboard stroke (fast in-memory cached)
 */
export const addWhiteboardStroke = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;
    const { stroke } = req.body;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    if (!stroke || !stroke.id) {
      return sendError(res, 'Stroke data is required', 400);
    }

    const saved = whiteboardCache.addStroke(janusRoomId, stroke);
    return sendSuccess(res, { id: saved.id }, 'Stroke saved', 201);
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete specific whiteboard strokes (fast in-memory cached)
 */
export const deleteWhiteboardStrokes = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;
    const { strokeIds, strokeId } = req.body;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    const idsToDelete: string[] = strokeIds || (strokeId ? [strokeId] : []);
    if (!idsToDelete || idsToDelete.length === 0) {
      return sendError(res, 'Stroke IDs are required', 400);
    }

    const deletedCount = whiteboardCache.deleteStrokes(janusRoomId, idsToDelete);
    return sendSuccess(res, { deletedCount }, 'Strokes deleted');
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Clear whiteboard (fast in-memory cached)
 */
export const clearWhiteboard = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;

    if (!janusRoomId) {
      return sendError(res, 'Janus room ID is required', 400);
    }

    whiteboardCache.clearWhiteboard(janusRoomId);
    return sendSuccess(res, null, 'Whiteboard cleared');
  } catch (error: any) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Mute/unmute a participant (teacher action)
 * Note: This stores the mute state and clients poll to check
 */
export const muteParticipant = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId, participantId } = req.params;
    const { muted } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!janusRoomId || !participantId) {
      return sendError(res, 'Janus room ID and participant ID are required', 400);
    }

    const videoRoom = await prisma.videoRoom.findUnique({
      where: { janus_room_id: BigInt(janusRoomId) },
      include: { class_session: true },
    });

    if (!videoRoom) {
      return sendError(res, 'Room not found', 404);
    }

    // Only teacher can mute
    const access = await checkRoomAccess(userId, userRole, videoRoom.class_session);
    if (!access.hasAccess || !access.isTeacher) {
      return sendError(res, 'Only the teacher can mute participants', 403);
    }

    // Return action for frontend to send via Janus data channel
    sendSuccess(res, {
      action: 'mute',
      participantId: parseInt(participantId),
      muted: muted === true,
      janusRoomId: videoRoom.janus_room_id.toString(),
    }, `Participant ${muted ? 'muted' : 'unmuted'}`);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Kick a participant from the room (teacher action)
 */
export const kickParticipant = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId, participantId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!janusRoomId || !participantId) {
      return sendError(res, 'Janus room ID and participant ID are required', 400);
    }

    const videoRoom = await prisma.videoRoom.findUnique({
      where: { janus_room_id: BigInt(janusRoomId) },
      include: { class_session: true },
    });

    if (!videoRoom) {
      return sendError(res, 'Room not found', 404);
    }

    // Only teacher can kick
    const access = await checkRoomAccess(userId, userRole, videoRoom.class_session);
    if (!access.hasAccess || !access.isTeacher) {
      return sendError(res, 'Only the teacher can remove participants', 403);
    }

    // Call Janus to actually kick participant from the VideoRoom plugin
    try {
      await janusAdmin.kickParticipantFromRoom(videoRoom.janus_room_id.toString(), parseInt(participantId));
    } catch (janusErr) {
      console.warn('[VideoRoom] Error kicking participant via Janus admin:', janusErr);
    }

    // Return action for frontend to send via Janus
    sendSuccess(res, {
      action: 'kick',
      participantId: parseInt(participantId),
      kicked: true,
      janusRoomId: videoRoom.janus_room_id.toString(),
    }, 'Participant removed from room');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Record user joining the video room
 */
export const recordJoin = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!janusRoomId) {
      return sendError(res, 'Room ID is required', 400);
    }

    console.log(`[Attendance] User ${userId} (${userRole}) joining room ${janusRoomId}`);

    // Strip "room-" prefix if present and convert to BigInt
    const numericRoomId = BigInt(janusRoomId.replace(/^room-/, ''));

    const videoRoom = await prisma.videoRoom.findUnique({
      where: { janus_room_id: numericRoomId },
      include: { class_session: true },
    });

    if (!videoRoom) {
      return sendError(res, 'Video room not found', 404);
    }

    // Find or create attendance record
    let attendance = await prisma.classSessionAttendance.findUnique({
      where: {
        class_session_id_user_id: {
          class_session_id: videoRoom.class_session_id,
          user_id: userId,
        },
      },
    });

    if (!attendance) {
      const attendanceRole: 'TEACHER' | 'STUDENT' = userRole === 'STUDENT' ? 'STUDENT' : 'TEACHER';
      attendance = await prisma.classSessionAttendance.create({
        data: {
          class_session_id: videoRoom.class_session_id,
          user_id: userId,
          role: attendanceRole as any,
          joined_at: new Date(),
        },
      });
      console.log(`[Attendance] Created new attendance record for user ${userId} with role ${attendanceRole}`);
    }

    // Create attendance log entry
    const log = await prisma.videoRoomAttendanceLog.create({
      data: {
        attendance_id: attendance.id,
        joined_at: new Date(),
      },
    });

    console.log(`[Attendance] ✅ Join logged: User ${userId}, Log ID ${log.id}`);
    sendSuccess(res, { logId: log.id, attendanceId: attendance.id }, 'Join recorded');
  } catch (error: any) {
    console.error('[Attendance] Error recording join:', error);
    sendError(res, error.message, 500);
  }
};

/**
 * Record user leaving the video room
 */
export const recordLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { janusRoomId } = req.params;
    const userId = req.user!.id;

    if (!janusRoomId) {
      return sendError(res, 'Room ID is required', 400);
    }

    console.log(`[Attendance] User ${userId} leaving room ${janusRoomId}`);

    // Strip "room-" prefix if present and convert to BigInt
    const numericRoomId = BigInt(janusRoomId.replace(/^room-/, ''));

    const videoRoom = await prisma.videoRoom.findUnique({
      where: { janus_room_id: numericRoomId },
    });

    if (!videoRoom) {
      return sendError(res, 'Video room not found', 404);
    }

    const attendance = await prisma.classSessionAttendance.findUnique({
      where: {
        class_session_id_user_id: {
          class_session_id: videoRoom.class_session_id,
          user_id: userId,
        },
      },
    });

    if (!attendance) {
      return sendError(res, 'Attendance record not found', 404);
    }

    // Find the most recent open log entry
    const openLog = await prisma.videoRoomAttendanceLog.findFirst({
      where: {
        attendance_id: attendance.id,
        left_at: null,
      },
      orderBy: {
        joined_at: 'desc',
      },
    });

    if (!openLog) {
      return sendError(res, 'No open attendance log found', 404);
    }

    // Update the log with leave time and calculate duration
    const leftAt = new Date();
    const durationMinutes = Math.floor((leftAt.getTime() - openLog.joined_at.getTime()) / 60000);

    await prisma.videoRoomAttendanceLog.update({
      where: { id: openLog.id },
      data: {
        left_at: leftAt,
        duration_minutes: durationMinutes,
      },
    });

    // Update overall attendance record
    const totalDuration = await prisma.videoRoomAttendanceLog.aggregate({
      where: {
        attendance_id: attendance.id,
        duration_minutes: { not: null },
      },
      _sum: {
        duration_minutes: true,
      },
    });

    await prisma.classSessionAttendance.update({
      where: { id: attendance.id },
      data: {
        left_at: leftAt,
        duration_minutes: totalDuration._sum.duration_minutes || durationMinutes,
      },
    });

    console.log(`[Attendance] ✅ Leave logged: User ${userId}, Duration ${durationMinutes}min`);
    sendSuccess(res, { durationMinutes }, 'Leave recorded');
  } catch (error: any) {
    console.error('[Attendance] Error recording leave:', error);
    sendError(res, error.message, 500);
  }
};

/**
 * Get detailed attendance for a class session
 */
export const getSessionAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!sessionId) {
      return sendError(res, 'Session ID is required', 400);
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        subject: true,
        teacher: { include: { user: true } },
      },
    });

    if (!classSession) {
      return sendError(res, 'Class session not found', 404);
    }

    // Auto-mark all participants as left if the class session has ended
    const isClassOver = new Date(classSession.end_time) <= new Date();
    if (isClassOver) {
      const sessionEndTime = new Date(classSession.end_time);

      // 1. Close open logs
      const openLogs = await prisma.videoRoomAttendanceLog.findMany({
        where: {
          attendance: { class_session_id: parseInt(sessionId) },
          left_at: null,
        },
      });

      for (const log of openLogs) {
        const leaveTime = sessionEndTime > log.joined_at ? sessionEndTime : new Date();
        const durationMins = Math.max(1, Math.floor((leaveTime.getTime() - log.joined_at.getTime()) / 60000));
        await prisma.videoRoomAttendanceLog.update({
          where: { id: log.id },
          data: {
            left_at: leaveTime,
            duration_minutes: durationMins,
          },
        });
      }

      // 2. Close open attendance records
      const openAttendances = await prisma.classSessionAttendance.findMany({
        where: {
          class_session_id: parseInt(sessionId),
          left_at: null,
        },
        include: {
          attendance_logs: true,
        },
      });

      for (const att of openAttendances) {
        const leaveTime = sessionEndTime > (att.joined_at || sessionEndTime) ? sessionEndTime : new Date();
        const totalDuration = att.attendance_logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
        const fallbackDuration = att.joined_at
          ? Math.max(1, Math.floor((leaveTime.getTime() - new Date(att.joined_at).getTime()) / 60000))
          : 0;

        await prisma.classSessionAttendance.update({
          where: { id: att.id },
          data: {
            left_at: leaveTime,
            duration_minutes: totalDuration > 0 ? totalDuration : fallbackDuration,
          },
        });
      }
    }

    // Check access permissions
    const access = await checkRoomAccess(userId, userRole, classSession);
    const isTeacher = access.isTeacher;
    const isStudent = userRole === 'STUDENT';

    let attendances;

    if (userRole === 'ADMIN' || isTeacher) {
      // Admin and teacher can see all attendances
      attendances = await prisma.classSessionAttendance.findMany({
        where: { class_session_id: parseInt(sessionId) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          attendance_logs: {
            orderBy: { joined_at: 'asc' },
          },
        },
        orderBy: { created_at: 'asc' },
      });
    } else if (isStudent) {
      // Students can only see their own attendance
      attendances = await prisma.classSessionAttendance.findMany({
        where: {
          class_session_id: parseInt(sessionId),
          user_id: userId,
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
          attendance_logs: {
            orderBy: { joined_at: 'asc' },
          },
        },
      });
    } else {
      return sendError(res, 'Access denied', 403);
    }

    // Calculate statistics
    const stats = attendances.map((att) => ({
      ...att,
      total_joins: att.attendance_logs.length,
      total_duration: att.duration_minutes || 0,
      attendance_logs: att.attendance_logs.map((log) => ({
        id: log.id,
        joined_at: log.joined_at,
        left_at: log.left_at,
        duration_minutes: log.duration_minutes,
      })),
    }));

    sendSuccess(res, {
      session: {
        id: classSession.id,
        subject: classSession.subject.name,
        start_time: classSession.start_time,
        end_time: classSession.end_time,
        teacher: classSession.teacher.user.name,
      },
      attendances: stats,
      canViewAll: userRole === 'ADMIN' || isTeacher,
    });
  } catch (error: any) {
    console.error('[Attendance] Error fetching session attendance:', error);
    sendError(res, error.message, 500);
  }
};

/**
 * Explicitly mark all active participants in a class session as left
 */
export const markAllAsLeft = async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!sessionId) {
      return sendError(res, 'Session ID is required', 400);
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: parseInt(sessionId) },
      include: {
        teacher: { include: { user: true } },
      },
    });

    if (!classSession) {
      return sendError(res, 'Class session not found', 404);
    }

    const access = await checkRoomAccess(userId, userRole, classSession);
    if (!access.hasAccess || !access.isTeacher) {
      return sendError(res, 'Only teachers or admins can mark attendance as left', 403);
    }

    const now = new Date();
    const sessionEndTime = new Date(classSession.end_time);
    const effectiveLeaveTime = sessionEndTime < now ? sessionEndTime : now;

    // 1. Close open logs
    const openLogs = await prisma.videoRoomAttendanceLog.findMany({
      where: {
        attendance: { class_session_id: parseInt(sessionId) },
        left_at: null,
      },
    });

    for (const log of openLogs) {
      const leaveTime = effectiveLeaveTime > log.joined_at ? effectiveLeaveTime : now;
      const durationMins = Math.max(1, Math.floor((leaveTime.getTime() - log.joined_at.getTime()) / 60000));
      await prisma.videoRoomAttendanceLog.update({
        where: { id: log.id },
        data: {
          left_at: leaveTime,
          duration_minutes: durationMins,
        },
      });
    }

    // 2. Close open attendance records
    const openAttendances = await prisma.classSessionAttendance.findMany({
      where: {
        class_session_id: parseInt(sessionId),
        left_at: null,
      },
      include: {
        attendance_logs: true,
      },
    });

    for (const att of openAttendances) {
      const leaveTime = effectiveLeaveTime > (att.joined_at || effectiveLeaveTime) ? effectiveLeaveTime : now;
      const totalDuration = att.attendance_logs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
      const fallbackDuration = att.joined_at
        ? Math.max(1, Math.floor((leaveTime.getTime() - new Date(att.joined_at).getTime()) / 60000))
        : 0;

      await prisma.classSessionAttendance.update({
        where: { id: att.id },
        data: {
          left_at: leaveTime,
          duration_minutes: totalDuration > 0 ? totalDuration : fallbackDuration,
        },
      });
    }

    sendSuccess(res, { count: openAttendances.length }, 'All active participants marked as left');
  } catch (error: any) {
    console.error('[Attendance] Error marking all as left:', error);
    sendError(res, error.message, 500);
  }
};
