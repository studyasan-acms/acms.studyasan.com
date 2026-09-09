import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { RecordingBotService } from './recordingBot.service.js';

const prisma = new PrismaClient();

export class JanusCleanupService {
  /**
   * Initialize hourly cron job and run cleanup immediately on backend startup
   */
  static start() {
    console.log('[JanusCleanup] Starting Janus session cleanup service...');

    // Run immediately on backend startup to delete empty/unused Janus sessions & rooms
    this.cleanupUnusedJanusSessions().catch((err) => {
      console.error('[JanusCleanup] Startup cleanup error:', err);
    });

    // Schedule cron job to run every hour at minute 0 ('0 * * * *')
    cron.schedule('0 * * * *', async () => {
      console.log('[JanusCleanup] Running scheduled hourly cleanup...');
      await this.cleanupUnusedJanusSessions();
    });

    console.log('[JanusCleanup] Cron job registered: Running hourly at minute 0');
  }

  /**
   * Main cleanup logic:
   * 1. Query Janus server for active video room participants/list
   * 2. Destroy Janus rooms that are empty (0 publishers/participants) or ended
   * 3. Clean up DB video_rooms records that have no active participants or whose class_session has ended
   */
  static async cleanupUnusedJanusSessions() {
    try {
      const janusApiUrl = process.env.JANUS_HTTP_API || '';
      const adminKey = process.env.JANUS_ADMIN_KEY || '';

      if (!janusApiUrl) {
        console.warn('[JanusCleanup] JANUS_HTTP_API environment variable not configured. Skipping remote Janus cleanup.');
        await this.cleanupDatabaseVideoRooms();
        return;
      }

      console.log('[JanusCleanup] Fetching active video rooms from Database & Janus...');

      // Get all video rooms from database
      const videoRooms = await prisma.videoRoom.findMany({
        include: {
          class_session: true,
        },
      });

      if (videoRooms.length === 0) {
        console.log('[JanusCleanup] No video rooms found in database.');
        return;
      }

      const now = new Date();
      let destroyedCount = 0;

      // Establish a temporary Janus Admin session for querying/destroying rooms
      const sessionRes = await fetch(janusApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'create',
          transaction: `cleanup_session_${Date.now()}`,
        }),
      });
      const sessionData = await sessionRes.json();
      const janusSessionId = sessionData?.data?.id;

      if (!janusSessionId) {
        console.error('[JanusCleanup] Failed to create temporary Janus session for cleanup');
        await this.cleanupDatabaseVideoRooms();
        return;
      }

      // Attach handle to VideoRoom plugin
      const attachRes = await fetch(janusApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'attach',
          session_id: janusSessionId,
          plugin: 'janus.plugin.videoroom',
          transaction: `cleanup_attach_${Date.now()}`,
        }),
      });
      const attachData = await attachRes.json();
      const janusHandleId = attachData?.data?.id;

      if (!janusHandleId) {
        console.error('[JanusCleanup] Failed to attach VideoRoom handle for cleanup');
        await this.destroyJanusSession(janusApiUrl, janusSessionId);
        await this.cleanupDatabaseVideoRooms();
        return;
      }

      for (const room of videoRooms) {
        const roomIdNumber = Number(room.janus_room_id);
        const sessionEndTime = new Date(room.class_session.end_time);
        const isSessionEnded = now > sessionEndTime;

        // Check active participants in Janus for this room
        let numParticipants = 0;
        try {
          const listParticipantsRes = await fetch(janusApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              janus: 'message',
              session_id: janusSessionId,
              handle_id: janusHandleId,
              transaction: `list_participants_${Date.now()}`,
              body: {
                request: 'listparticipants',
                room: roomIdNumber,
              },
            }),
          });
          const listData = await listParticipantsRes.json();
          const participants = listData?.plugindata?.data?.participants || [];
          const humanParticipants = participants.filter((p: any) => {
            const name = String(p?.display || '').toLowerCase();
            return !name.includes('recording bot') && !name.includes('[bot]');
          });
          numParticipants = humanParticipants.length;
        } catch (e) {
          console.warn(`[JanusCleanup] Could not query participants for room ${roomIdNumber}`);
        }

        // If session has ended OR room has no active participants, destroy room on Janus & reset DB state
        if (isSessionEnded || numParticipants === 0) {
          console.log(`[JanusCleanup] Room ${roomIdNumber} (Class Session #${room.class_session_id}) is empty/ended. Destroying...`);

          // Finalize active recording if any
          if (RecordingBotService.isRecording(room.class_session_id)) {
            await RecordingBotService.stopRecording(room.class_session_id);
          }

          // Destroy room on Janus server
          try {
            await fetch(janusApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                janus: 'message',
                session_id: janusSessionId,
                handle_id: janusHandleId,
                transaction: `destroy_room_${Date.now()}`,
                body: {
                  request: 'destroy',
                  room: roomIdNumber,
                  admin_key: adminKey,
                },
              }),
            });
          } catch (e) {
            console.warn(`[JanusCleanup] Janus room destroy request failed for room ${roomIdNumber}`);
          }

          // Reset DB video room status so it is cleanly recreated when a new live class starts
          await prisma.videoRoom.update({
            where: { id: room.id },
            data: { is_created: false },
          });

          destroyedCount++;
        }
      }

      // Cleanup temporary Janus admin session
      await this.destroyJanusSession(janusApiUrl, janusSessionId);

      console.log(`[JanusCleanup] ✅ Cleanup completed. Reset ${destroyedCount} empty/ended Janus video rooms.`);
    } catch (error) {
      console.error('[JanusCleanup] Error during Janus session cleanup:', error);
    }
  }

  /**
   * Helper to destroy temporary Janus HTTP session
   */
  private static async destroyJanusSession(janusApiUrl: string, sessionId: number) {
    try {
      await fetch(janusApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janus: 'destroy',
          session_id: sessionId,
          transaction: `destroy_session_${Date.now()}`,
        }),
      });
    } catch (e) {
      // Ignore session destroy errors
    }
  }

  /**
   * Fallback Database cleanup if Janus API is unreachable
   */
  private static async cleanupDatabaseVideoRooms() {
    try {
      const now = new Date();
      const endedRooms = await prisma.videoRoom.findMany({
        where: {
          class_session: {
            end_time: { lte: now },
          },
          is_created: true,
        },
      });

      if (endedRooms.length > 0) {
        const roomIds = endedRooms.map((r) => r.id);
        await prisma.videoRoom.updateMany({
          where: { id: { in: roomIds } },
          data: { is_created: false },
        });
        console.log(`[JanusCleanup] Reset ${endedRooms.length} ended DB video rooms to uncreated.`);
      }
    } catch (err) {
      console.error('[JanusCleanup] Error during DB video room fallback cleanup:', err);
    }
  }
}
