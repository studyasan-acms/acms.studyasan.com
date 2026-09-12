import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { DatabaseBackupService } from '../services/databaseBackup.service.js';
import { DataRetentionCleanupService } from '../services/dataRetentionCleanup.service.js';

/**
 * Trigger on-demand database backup to AWS S3
 * POST /api/admin/backups/run
 */
export const triggerDatabaseBackup = async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[AdminMaintenance] Admin (${req.user?.email || req.user?.id}) requested manual DB backup.`);
    const result = await DatabaseBackupService.runBackupNow();

    if (!result.success) {
      return sendError(res, result.error || 'Database backup failed', 500);
    }

    return sendSuccess(res, result, 'Database backup successfully uploaded to AWS S3');
  } catch (error: any) {
    console.error('[AdminMaintenance] Error triggering manual DB backup:', error);
    return sendError(res, error.message || 'Failed to trigger database backup', 500);
  }
};

/**
 * Trigger on-demand data retention cleanup (Chats >1yr, Tests >1yr, Recordings >30d, AWS S3 Purge)
 * POST /api/admin/retention-cleanup/run
 */
export const triggerRetentionCleanup = async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[AdminMaintenance] Admin (${req.user?.email || req.user?.id}) requested manual retention cleanup.`);
    const result = await DataRetentionCleanupService.runRetentionCleanupNow();

    if (!result.success) {
      return sendError(res, result.error || 'Data retention cleanup failed', 500);
    }

    return sendSuccess(res, result, 'Data retention cleanup completed successfully');
  } catch (error: any) {
    console.error('[AdminMaintenance] Error triggering manual retention cleanup:', error);
    return sendError(res, error.message || 'Failed to trigger retention cleanup', 500);
  }
};
