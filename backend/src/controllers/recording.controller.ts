import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendSuccess, sendError } from '../utils/response.js';
import type { AuthRequest } from '../types/index.js';

const prisma = new PrismaClient();

// Configure local disk directory for recordings
const RECORDINGS_DIR = process.env.RECORDINGS_DIR 
  ? path.resolve(process.env.RECORDINGS_DIR)
  : path.resolve(process.cwd(), 'uploads/recordings');

if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

// Multer disk storage for streaming directly to disk (prevents memory exhaustion)
const recordingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
    }
    cb(null, RECORDINGS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype === 'video/mp4' ? '.mp4' : '.webm');
    const sessionId = (req.params.sessionId || req.params.id || 'unknown') as string;
    const filename = `recording_session_${sessionId}_${Date.now()}${ext}`;
    cb(null, filename);
  },
});

export const uploadRecordingMiddleware = multer({
  storage: recordingStorage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 2, // 2GB max file size
  },
});

/**
 * Check if user has permission to access the class session
 */
async function checkSessionAccess(
  userId: number,
  userRole: string,
  classSession: {
    id: number;
    teacher_id: number;
    subject_id: number;
  }
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  if (userRole === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { user_id: userId },
    });
    return !!teacher && teacher.id === classSession.teacher_id;
  }

  if (userRole === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
      include: {
        enrollments: {
          where: { subject_id: classSession.subject_id },
        },
      },
    });
    return !!student && student.enrollments.length > 0;
  }

  return false;
}

/**
 * Upload a browser-recorded class session video
 * POST /api/class-sessions/:sessionId/recording
 */
export const uploadSessionRecording = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = (req.params.sessionId || req.params.id || '') as string;
    const sessionId = parseInt(rawId, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!sessionId || isNaN(sessionId)) {
      return sendError(res, 'Valid Session ID is required', 400);
    }

    if (!req.file) {
      return sendError(res, 'No recording video file provided', 400);
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!classSession) {
      // Remove uploaded file if session not found
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return sendError(res, 'Class session not found', 404);
    }

    // Only Admin or Assigned Teacher can upload recordings
    const hasAccess = await checkSessionAccess(userId, userRole, classSession);
    if (!hasAccess || userRole === 'STUDENT') {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return sendError(res, 'Only teachers or admins can upload recordings', 403);
    }

    const durationSeconds = req.body.duration_seconds ? parseInt(String(req.body.duration_seconds), 10) : null;
    const mimeType = req.file.mimetype || 'video/webm';
    const fileSize = req.file.size;

    // Set 30-day retention period (auto-expire)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const recording = await (prisma as any).sessionRecording.create({
      data: {
        class_session_id: classSession.id,
        file_name: req.file.filename,
        file_path: req.file.path,
        file_size_bytes: BigInt(fileSize),
        duration_seconds: durationSeconds,
        mime_type: mimeType,
        status: 'READY',
        expires_at: expiresAt,
      },
    });

    console.log(`[Recording] ✅ Saved recording #${recording.id} for session #${sessionId}. Expires on: ${expiresAt.toISOString()}`);

    return sendSuccess(
      res,
      {
        recordingId: recording.id,
        sessionId: recording.class_session_id,
        fileName: recording.file_name,
        fileSizeBytes: recording.file_size_bytes ? recording.file_size_bytes.toString() : null,
        durationSeconds: recording.duration_seconds,
        status: recording.status,
        expiresAt: recording.expires_at,
      },
      'Class session recording uploaded successfully'
    );
  } catch (error: any) {
    console.error('[Recording] Error uploading recording:', error);
    return sendError(res, error.message || 'Failed to save recording', 500);
  }
};

/**
 * Get recording metadata for a class session
 * GET /api/class-sessions/:sessionId/recording
 */
export const getSessionRecording = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = (req.params.sessionId || req.params.id || '') as string;
    const sessionId = parseInt(rawId, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!sessionId || isNaN(sessionId)) {
      return sendError(res, 'Valid Session ID is required', 400);
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!classSession) {
      return sendError(res, 'Class session not found', 404);
    }

    // Class recordings are strictly restricted to ADMIN role only
    if (userRole !== 'ADMIN') {
      return sendSuccess(res, { available: false }, 'Access restricted: Only administrators can view class recordings');
    }

    const recording = await (prisma as any).sessionRecording.findFirst({
      where: {
        class_session_id: sessionId,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!recording) {
      return sendSuccess(res, { available: false }, 'No recording found for this session');
    }

    const isExpired = recording.status === 'EXPIRED' || new Date() > new Date(recording.expires_at);

    return sendSuccess(res, {
      available: !isExpired && recording.status === 'READY',
      recordingId: recording.id,
      sessionId: recording.class_session_id,
      durationSeconds: recording.duration_seconds,
      fileSizeBytes: recording.file_size_bytes ? recording.file_size_bytes.toString() : null,
      mimeType: recording.mime_type,
      status: isExpired ? 'EXPIRED' : recording.status,
      createdAt: recording.created_at,
      expiresAt: recording.expires_at,
      streamUrl: `/api/class-sessions/${sessionId}/recording/stream`,
    });
  } catch (error: any) {
    console.error('[Recording] Error getting recording info:', error);
    return sendError(res, error.message || 'Failed to fetch recording info', 500);
  }
};

/**
 * Stream recording with HTTP 206 Partial Content (Supports fast-forward and seeking)
 * GET /api/class-sessions/:sessionId/recording/stream
 */
export const streamSessionRecording = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = (req.params.sessionId || req.params.id || '') as string;
    const sessionId = parseInt(rawId, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!sessionId || isNaN(sessionId)) {
      return sendError(res, 'Valid Session ID is required', 400);
    }

    const classSession = await prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!classSession) {
      return sendError(res, 'Class session not found', 404);
    }

    // Only ADMIN role can stream class session recordings
    if (userRole !== 'ADMIN') {
      return sendError(res, 'Access restricted: Only administrators can view or stream class recordings', 403);
    }

    const recording = await (prisma as any).sessionRecording.findFirst({
      where: {
        class_session_id: sessionId,
        status: 'READY',
      },
      orderBy: { created_at: 'desc' },
    });

    if (!recording) {
      return sendError(res, 'Recording not found or expired', 404);
    }

    if (new Date() > new Date(recording.expires_at)) {
      return sendError(res, 'This recording has expired (retained for 30 days)', 410);
    }

    const filePath = recording.file_path;
    if (!fs.existsSync(filePath)) {
      return sendError(res, 'Recording file not found on disk', 404);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const mimeType = recording.mime_type || (filePath.endsWith('.mp4') ? 'video/mp4' : 'video/webm');

    if (range) {
      // Parse Range Header: "bytes=12345-" or "bytes=12345-67890"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': mimeType,
      };

      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
      };

      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error: any) {
    console.error('[Recording] Error streaming recording:', error);
    if (!res.headersSent) {
      return sendError(res, error.message || 'Streaming failed', 500);
    }
  }
};

/**
 * Manually delete recording
 * DELETE /api/class-sessions/:sessionId/recording/:recordingId
 */
export const deleteSessionRecording = async (req: AuthRequest, res: Response) => {
  try {
    const rawSessionId = (req.params.sessionId || req.params.id || '') as string;
    const sessionId = parseInt(rawSessionId, 10);
    const rawRecordingId = (req.params.recordingId || '') as string;
    const recordingId = parseInt(rawRecordingId, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (userRole !== 'ADMIN') {
      return sendError(res, 'Access restricted: Only administrators can delete class recordings', 403);
    }

    const recording = await (prisma as any).sessionRecording.findUnique({
      where: { id: recordingId },
    });

    if (!recording || recording.class_session_id !== sessionId) {
      return sendError(res, 'Recording not found', 404);
    }

    if (recording.file_path && fs.existsSync(recording.file_path)) {
      try {
        fs.unlinkSync(recording.file_path);
      } catch (e) {
        console.warn('[Recording] Warning deleting file:', e);
      }
    }

    await (prisma as any).sessionRecording.update({
      where: { id: recordingId },
      data: { status: 'EXPIRED' },
    });

    return sendSuccess(res, null, 'Recording deleted successfully');
  } catch (error: any) {
    console.error('[Recording] Error deleting recording:', error);
    return sendError(res, error.message || 'Failed to delete recording', 500);
  }
};
