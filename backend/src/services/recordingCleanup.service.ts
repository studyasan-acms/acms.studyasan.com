import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RecordingCleanupService {
  /**
   * Start the daily midnight cron job to purge expired recordings (>30 days old)
   */
  static start() {
    console.log('[RecordingCleanup] Starting Recording cleanup service (30-day retention)...');

    // Run once on server startup
    this.purgeExpiredRecordings().catch((err) => {
      console.error('[RecordingCleanup] Startup purge error:', err);
    });

    // Schedule cron job to run every day at midnight ('0 0 * * *')
    cron.schedule('0 0 * * *', async () => {
      console.log('[RecordingCleanup] Running scheduled daily purge for expired recordings (>30 days old)...');
      await this.purgeExpiredRecordings();
    });

    console.log('[RecordingCleanup] Cron job registered: Running daily at midnight (00:00)');
  }

  /**
   * Main cleanup logic:
   * 1. Query recordings where expires_at <= NOW() and status is READY or PROCESSING
   * 2. Delete the actual video file from disk
   * 3. Update database record status to EXPIRED
   */
  static async purgeExpiredRecordings() {
    try {
      const now = new Date();

      const expiredRecordings = await (prisma as any).sessionRecording.findMany({
        where: {
          expires_at: { lte: now },
          status: { not: 'EXPIRED' },
        },
      });

      if (expiredRecordings.length === 0) {
        console.log('[RecordingCleanup] No expired recordings found.');
        return;
      }

      console.log(`[RecordingCleanup] Found ${expiredRecordings.length} expired recording(s) to purge.`);
      let deletedFilesCount = 0;

      for (const recording of expiredRecordings) {
        // Delete physical file from disk
        if (recording.file_path) {
          try {
            await fs.unlink(recording.file_path);
            deletedFilesCount++;
            console.log(`[RecordingCleanup] Deleted video file: ${recording.file_path}`);
          } catch (err: any) {
            if (err.code !== 'ENOENT') {
              console.warn(`[RecordingCleanup] Warning deleting file ${recording.file_path}:`, err.message);
            }
          }
        }

        // Mark database record as EXPIRED
        await (prisma as any).sessionRecording.update({
          where: { id: recording.id },
          data: { status: 'EXPIRED' },
        });
      }

      console.log(`[RecordingCleanup] ✅ Purge complete. Cleaned up ${deletedFilesCount} file(s) and marked ${expiredRecordings.length} recording(s) as EXPIRED.`);
    } catch (error) {
      console.error('[RecordingCleanup] Error during recordings purge:', error);
    }
  }
}
