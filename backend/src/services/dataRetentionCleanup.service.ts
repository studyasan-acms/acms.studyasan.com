import cron from 'node-cron';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { deleteMultipleFromS3, deleteFromS3, extractS3KeyFromUrl, BUCKET_NAME } from '../utils/s3.js';

const prisma = new PrismaClient();

export interface RetentionCleanupReport {
  success: boolean;
  chatsCleaned: number;
  chatS3FilesDeleted: number;
  testAttemptsCleaned: number;
  testS3FilesDeleted: number;
  recordingsCleaned: number;
  recordingFilesDeleted: number;
  totalS3FilesDeleted: number;
  durationMs: number;
  error?: string;
}

export class DataRetentionCleanupService {
  private static isRunning = false;
  private static cronJob: any = null;

  // Default: Daily at 03:00 AM ('0 3 * * *')
  private static readonly CRON_SCHEDULE = process.env.DATA_RETENTION_CRON_SCHEDULE || '0 3 * * *';

  /**
   * Start the in-project data retention cleanup service
   */
  static start() {
    console.log(`[DataRetention] 🔄 Initializing in-project data retention cleanup service (Schedule: "${this.CRON_SCHEDULE}", S3 Bucket: "${BUCKET_NAME}")...`);

    // Run once on server startup in background
    setTimeout(() => {
      this.runRetentionCleanupNow().catch((err) => {
        console.error('[DataRetention] ❌ Startup retention cleanup error:', err);
      });
    }, 10000); // 10s delay to allow other services to boot up cleanly

    if (this.cronJob) {
      this.cronJob.stop();
    }

    // Schedule daily retention purge
    this.cronJob = cron.schedule(this.CRON_SCHEDULE, async () => {
      console.log(`[DataRetention] ⏰ Scheduled cron triggered: Starting retention purge (Chats >1yr, Tests >1yr, Recordings >30d)...`);
      await this.runRetentionCleanupNow();
    });

    console.log(`[DataRetention] ✅ Cron job successfully registered inside application: Running at "${this.CRON_SCHEDULE}"`);
  }

  /**
   * Run full data retention cleanup now
   */
  static async runRetentionCleanupNow(): Promise<RetentionCleanupReport> {
    if (this.isRunning) {
      console.warn('[DataRetention] ⚠️ Data retention cleanup is already in progress. Skipping duplicate run.');
      return {
        success: false,
        chatsCleaned: 0,
        chatS3FilesDeleted: 0,
        testAttemptsCleaned: 0,
        testS3FilesDeleted: 0,
        recordingsCleaned: 0,
        recordingFilesDeleted: 0,
        totalS3FilesDeleted: 0,
        durationMs: 0,
        error: 'Cleanup already running',
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    console.log(`[DataRetention] 🚀 Starting complete data retention and AWS S3 purge cycle...`);

    const report: RetentionCleanupReport = {
      success: true,
      chatsCleaned: 0,
      chatS3FilesDeleted: 0,
      testAttemptsCleaned: 0,
      testS3FilesDeleted: 0,
      recordingsCleaned: 0,
      recordingFilesDeleted: 0,
      totalS3FilesDeleted: 0,
      durationMs: 0,
    };

    try {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // =======================================================================
      // 1. PURGE OLD CHATS (> 1 YEAR) AND ASSOCIATED AWS S3 ATTACHMENTS
      // =======================================================================
      try {
        console.log(`[DataRetention] 🔍 Checking for chat messages older than 1 year (before ${oneYearAgo.toISOString()})...`);

        const oldMessages = await prisma.message.findMany({
          where: {
            created_at: { lt: oneYearAgo },
          },
          select: {
            id: true,
            attachment_url: true,
            content: true,
            chat_id: true,
          },
        });

        if (oldMessages.length > 0) {
          console.log(`[DataRetention] Found ${oldMessages.length} expired chat message(s) to purge.`);
          const s3KeysToDelete: string[] = [];

          for (const msg of oldMessages) {
            // Check attachment_url
            if (msg.attachment_url) {
              const key = extractS3KeyFromUrl(msg.attachment_url);
              if (key) s3KeysToDelete.push(key);
            }

            // Check if message content contains S3 URLs
            if (msg.content && (msg.content.includes('.s3.') || msg.content.includes(BUCKET_NAME))) {
              const key = extractS3KeyFromUrl(msg.content);
              if (key) s3KeysToDelete.push(key);
            }
          }

          // Delete from AWS S3
          if (s3KeysToDelete.length > 0) {
            console.log(`[DataRetention] 🗑️ Deleting ${s3KeysToDelete.length} chat attachment file(s) from AWS S3...`);
            const deletedS3Count = await deleteMultipleFromS3(s3KeysToDelete);
            report.chatS3FilesDeleted += deletedS3Count;
            report.totalS3FilesDeleted += deletedS3Count;
          }

          // Delete messages from database
          const deleteResult = await prisma.message.deleteMany({
            where: {
              created_at: { lt: oneYearAgo },
            },
          });
          report.chatsCleaned += deleteResult.count;
          console.log(`[DataRetention] ✅ Cleaned ${deleteResult.count} message(s) from database.`);
        }

        // Clean old RoomChatMessage (> 1 year)
        const oldRoomMessages = await prisma.roomChatMessage.deleteMany({
          where: {
            created_at: { lt: oneYearAgo },
          },
        });
        if (oldRoomMessages.count > 0) {
          console.log(`[DataRetention] ✅ Cleaned ${oldRoomMessages.count} video room chat message(s) older than 1 year.`);
          report.chatsCleaned += oldRoomMessages.count;
        }

        // Clean empty chats created > 1 year ago with no messages
        const emptyChats = await prisma.chat.deleteMany({
          where: {
            created_at: { lt: oneYearAgo },
            messages: { none: {} },
          },
        });
        if (emptyChats.count > 0) {
          console.log(`[DataRetention] ✅ Cleaned ${emptyChats.count} inactive empty chat thread(s).`);
        }
      } catch (chatErr: any) {
        console.error('[DataRetention] ❌ Error during chat retention cleanup:', chatErr);
      }

      // =======================================================================
      // 2. PURGE OLD TESTS / TEST ATTEMPTS (> 1 YEAR) AND AWS S3 TEST FILES
      // =======================================================================
      try {
        console.log(`[DataRetention] 🔍 Checking for test attempts & answers older than 1 year (before ${oneYearAgo.toISOString()})...`);

        const oldAttempts = await prisma.testAttempt.findMany({
          where: {
            created_at: { lt: oneYearAgo },
          },
          include: {
            answers: {
              select: {
                id: true,
                answer_media_url: true,
              },
            },
            certificate: {
              select: {
                id: true,
              },
            },
          },
        });

        if (oldAttempts.length > 0) {
          console.log(`[DataRetention] Found ${oldAttempts.length} test attempt(s) older than 1 year.`);
          const s3KeysToDelete: string[] = [];

          for (const attempt of oldAttempts) {
            for (const ans of attempt.answers) {
              if (ans.answer_media_url) {
                const key = extractS3KeyFromUrl(ans.answer_media_url);
                if (key) s3KeysToDelete.push(key);
              }
            }
          }

          // Delete media files from AWS S3
          if (s3KeysToDelete.length > 0) {
            console.log(`[DataRetention] 🗑️ Deleting ${s3KeysToDelete.length} test answer media file(s) from AWS S3...`);
            const deletedS3Count = await deleteMultipleFromS3(s3KeysToDelete);
            report.testS3FilesDeleted += deletedS3Count;
            report.totalS3FilesDeleted += deletedS3Count;
          }

          const attemptIds = oldAttempts.map((a) => a.id);

          // Delete certificates
          await prisma.certificate.deleteMany({
            where: {
              test_attempt_id: { in: attemptIds },
            },
          });

          // Delete answers
          await prisma.answer.deleteMany({
            where: {
              test_attempt_id: { in: attemptIds },
            },
          });

          // Delete test attempts
          const deleteAttemptsResult = await prisma.testAttempt.deleteMany({
            where: {
              id: { in: attemptIds },
            },
          });

          report.testAttemptsCleaned += deleteAttemptsResult.count;
          console.log(`[DataRetention] ✅ Cleaned ${deleteAttemptsResult.count} test attempt(s) and related answers from database.`);
        }

        // Clean old Homework Responses older than 1 year (> 1 year retention)
        const oldHomeworkResponses = await prisma.homeworkResponse.findMany({
          where: {
            submitted_at: { lt: oneYearAgo },
          },
          select: {
            id: true,
            response_media_url: true,
            feedback_media_url: true,
          },
        });

        if (oldHomeworkResponses.length > 0) {
          const hwS3Keys: string[] = [];
          for (const hw of oldHomeworkResponses) {
            if (hw.response_media_url) {
              const k = extractS3KeyFromUrl(hw.response_media_url);
              if (k) hwS3Keys.push(k);
            }
            if (hw.feedback_media_url) {
              const k = extractS3KeyFromUrl(hw.feedback_media_url);
              if (k) hwS3Keys.push(k);
            }
          }
          if (hwS3Keys.length > 0) {
            const delHwCount = await deleteMultipleFromS3(hwS3Keys);
            report.totalS3FilesDeleted += delHwCount;
          }
          await prisma.homeworkResponse.deleteMany({
            where: {
              id: { in: oldHomeworkResponses.map((h) => h.id) },
            },
          });
          console.log(`[DataRetention] ✅ Cleaned ${oldHomeworkResponses.length} homework response(s) older than 1 year.`);
        }
      } catch (testErr: any) {
        console.error('[DataRetention] ❌ Error during tests retention cleanup:', testErr);
      }

      // =======================================================================
      // 3. PURGE VIDEO RECORDINGS (> 30 DAYS) FROM DISK AND AWS S3
      // =======================================================================
      try {
        console.log(`[DataRetention] 🔍 Checking for video recordings older than 30 days or expired...`);

        const expiredRecordings = await (prisma as any).sessionRecording.findMany({
          where: {
            OR: [
              { expires_at: { lte: now } },
              { created_at: { lt: thirtyDaysAgo } },
            ],
            status: { not: 'EXPIRED' },
          },
        });

        if (expiredRecordings.length > 0) {
          console.log(`[DataRetention] Found ${expiredRecordings.length} expired recording(s) to purge.`);
          const s3RecordingKeys: string[] = [];

          for (const recording of expiredRecordings) {
            // 1. Delete physical video file from local filesystem if present
            if (recording.file_path) {
              try {
                await fs.unlink(recording.file_path);
                report.recordingFilesDeleted++;
                console.log(`[DataRetention] 🗑️ Deleted local video recording file: ${recording.file_path}`);
              } catch (unlinkErr: any) {
                if (unlinkErr.code !== 'ENOENT') {
                  console.warn(`[DataRetention] Warning deleting local recording file [${recording.file_path}]:`, unlinkErr.message);
                }
              }

              // Check if file_path is an S3 URL or S3 key
              const s3Key = extractS3KeyFromUrl(recording.file_path);
              if (s3Key) {
                s3RecordingKeys.push(s3Key);
              }
            }

            // 2. Check if file_name is in S3 recordings folder
            if (recording.file_name) {
              const fileNameKey = `recordings/${recording.file_name}`;
              s3RecordingKeys.push(fileNameKey);
            }

            // 3. Update database record to EXPIRED
            await (prisma as any).sessionRecording.update({
              where: { id: recording.id },
              data: { status: 'EXPIRED' },
            });
            report.recordingsCleaned++;
          }

          // Delete any corresponding video files from AWS S3
          if (s3RecordingKeys.length > 0) {
            console.log(`[DataRetention] 🗑️ Cleaning ${s3RecordingKeys.length} potential recording key(s) from AWS S3...`);
            const deletedS3Count = await deleteMultipleFromS3(s3RecordingKeys);
            report.totalS3FilesDeleted += deletedS3Count;
          }

          console.log(`[DataRetention] ✅ Cleaned ${report.recordingsCleaned} expired video recording(s).`);
        }
      } catch (recErr: any) {
        console.error('[DataRetention] ❌ Error during video recording retention cleanup:', recErr);
      }

      report.durationMs = Date.now() - startTime;
      console.log(`[DataRetention] 🏁 Retention cycle complete in ${report.durationMs}ms. Summary:`, {
        chatsCleaned: report.chatsCleaned,
        chatS3FilesDeleted: report.chatS3FilesDeleted,
        testAttemptsCleaned: report.testAttemptsCleaned,
        testS3FilesDeleted: report.testS3FilesDeleted,
        recordingsCleaned: report.recordingsCleaned,
        recordingFilesDeleted: report.recordingFilesDeleted,
        totalS3FilesDeleted: report.totalS3FilesDeleted,
      });

      return report;
    } catch (error: any) {
      console.error('[DataRetention] ❌ Fatal error during data retention cleanup:', error);
      report.success = false;
      report.error = error?.message || 'Data retention cleanup failed';
      report.durationMs = Date.now() - startTime;
      return report;
    } finally {
      this.isRunning = false;
    }
  }
}
