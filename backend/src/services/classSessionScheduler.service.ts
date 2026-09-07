import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { RecordingBotService } from './recordingBot.service.js';

const prisma = new PrismaClient();

export class ClassSessionScheduler {
  /**
   * Start the 1-minute interval scheduler for automated recording
   */
  static start() {
    console.log('[ClassSessionScheduler] Class Session Recording Scheduler started (checks every minute)...');

    cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const twoMinutesAhead = new Date(now.getTime() + 2 * 60 * 1000);
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

        // 1. Find all online sessions currently in progress or starting soon
        const activeSessions = await prisma.classSession.findMany({
          where: {
            start_time: { lte: twoMinutesAhead },
            end_time: { gt: now },
            mode: 'ONLINE',
          },
        });

        for (const session of activeSessions) {
          if (!RecordingBotService.isRecording(session.id)) {
            const appUrl = process.env.APP_URL || 'http://localhost:3000';
            RecordingBotService.startRecording(session.id, appUrl);
          }
        }

        // 2. Find sessions that have ended
        const endingSessions = await prisma.classSession.findMany({
          where: {
            end_time: { lte: now },
          },
        });

        for (const session of endingSessions) {
          if (RecordingBotService.isRecording(session.id)) {
            await RecordingBotService.stopRecording(session.id);
          }
        }
      } catch (err) {
        console.error('[ClassSessionScheduler] Error checking sessions:', err);
      }
    });
  }
}
