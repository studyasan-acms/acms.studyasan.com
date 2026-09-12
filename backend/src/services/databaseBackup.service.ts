import cron from 'node-cron';
import { spawn } from 'child_process';
import zlib from 'zlib';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { uploadBufferToS3, deleteMultipleFromS3, BUCKET_NAME, getS3Client } from '../utils/s3.js';

export interface BackupResult {
  success: boolean;
  s3Key?: string;
  url?: string;
  sizeBytes?: number;
  durationMs?: number;
  error?: string;
}

export class DatabaseBackupService {
  private static isRunning = false;
  private static cronJob: any = null;

  // Default: Run daily at 02:00 AM ('0 2 * * *')
  private static readonly CRON_SCHEDULE = process.env.DB_BACKUP_CRON_SCHEDULE || '0 2 * * *';
  private static readonly S3_PREFIX = 'backups/database/';
  private static readonly MAX_BACKUPS_TO_KEEP = parseInt(process.env.DB_BACKUP_RETENTION_COUNT || '30', 10);

  /**
   * Start the in-project database backup cron job
   */
  static start() {
    console.log(`[DatabaseBackup] 🔄 Initializing in-project database backup service (Schedule: "${this.CRON_SCHEDULE}", S3 Bucket: "${BUCKET_NAME}")...`);

    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.cronJob = cron.schedule(this.CRON_SCHEDULE, async () => {
      console.log(`[DatabaseBackup] ⏰ Scheduled cron triggered: Starting PostgreSQL database backup...`);
      await this.runBackupNow();
    });

    console.log(`[DatabaseBackup] ✅ Cron job successfully registered inside application: Running at "${this.CRON_SCHEDULE}"`);
  }

  /**
   * Run database backup to AWS S3 immediately
   */
  static async runBackupNow(): Promise<BackupResult> {
    if (this.isRunning) {
      console.warn('[DatabaseBackup] ⚠️ A database backup is already currently in progress. Skipping duplicate run.');
      return { success: false, error: 'Backup already in progress' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `db_backup_${dateStr}.sql.gz`;
    const s3Key = `${this.S3_PREFIX}${fileName}`;
    const tempFilePath = path.join(os.tmpdir(), fileName);

    console.log(`[DatabaseBackup] 🚀 Starting PostgreSQL backup to S3 [${s3Key}]...`);

    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable is not defined.');
      }

      // Step 1: Dump and gzip database to temporary file
      await this.createGzippedDump(databaseUrl, tempFilePath);

      const stats = await fs.promises.stat(tempFilePath);
      const sizeBytes = stats.size;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

      console.log(`[DatabaseBackup] 📦 Database dump created and compressed (${sizeMB} MB). Uploading to AWS S3...`);

      // Step 2: Read file buffer and upload to AWS S3
      const fileBuffer = await fs.promises.readFile(tempFilePath);
      const uploadResult = await uploadBufferToS3(fileBuffer, s3Key, 'application/gzip');

      const durationMs = Date.now() - startTime;
      console.log(`[DatabaseBackup] ✅ Database backup successfully uploaded to S3: ${uploadResult.url} (${sizeMB} MB in ${durationMs}ms)`);

      // Step 3: Remove temporary file
      try {
        await fs.promises.unlink(tempFilePath);
      } catch (unlinkErr) {
        console.warn('[DatabaseBackup] Warning deleting temp dump file:', unlinkErr);
      }

      // Step 4: Prune old database backups from S3 beyond retention threshold
      await this.pruneOldBackupsFromS3();

      return {
        success: true,
        s3Key,
        url: uploadResult.url,
        sizeBytes,
        durationMs,
      };
    } catch (error: any) {
      console.error('[DatabaseBackup] ❌ Failed to complete database backup:', error);

      // Clean up temp file on failure if it exists
      if (fs.existsSync(tempFilePath)) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {}
      }

      return {
        success: false,
        error: error?.message || 'Database backup failed',
        durationMs: Date.now() - startTime,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute pg_dump and pipe through gzip compression to destination path
   */
  private static createGzippedDump(databaseUrl: string, destinationPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(destinationPath);
      const gzip = zlib.createGzip({ level: 9 });

      // Clean URI from Prisma-specific query params (like ?schema=public) for libpq compatibility
      let cleanUri = databaseUrl;
      const args = ['--no-owner', '--no-privileges'];

      try {
        const parsed = new URL(databaseUrl);
        const searchParams = new URLSearchParams(parsed.search);
        const schema = searchParams.get('schema');
        if (schema) {
          args.push(`--schema=${schema}`);
          searchParams.delete('schema');
        }
        parsed.search = searchParams.toString() ? `?${searchParams.toString()}` : '';
        cleanUri = parsed.toString();
      } catch {}

      args.push(cleanUri);

      const pgDump = spawn('pg_dump', args, {
        env: {
          ...process.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      pgDump.stdout.pipe(gzip).pipe(writeStream);

      let stderrOutput = '';
      pgDump.stderr.on('data', (chunk) => {
        stderrOutput += chunk.toString();
      });

      pgDump.on('error', (err) => {
        reject(new Error(`Failed to spawn pg_dump: ${err.message}`));
      });

      gzip.on('error', (err) => {
        reject(new Error(`Gzip compression error: ${err.message}`));
      });

      writeStream.on('error', (err) => {
        reject(new Error(`File write error: ${err.message}`));
      });

      writeStream.on('finish', () => {
        if (pgDump.exitCode !== null && pgDump.exitCode !== 0) {
          reject(new Error(`pg_dump exited with error code ${pgDump.exitCode}: ${stderrOutput}`));
        } else {
          resolve();
        }
      });

      pgDump.on('close', (code) => {
        if (code !== 0 && !writeStream.writableEnded) {
          reject(new Error(`pg_dump process terminated with code ${code}: ${stderrOutput}`));
        }
      });
    });
  }

  /**
   * Maintain S3 database backup retention (keep the newest MAX_BACKUPS_TO_KEEP backups)
   */
  private static async pruneOldBackupsFromS3(): Promise<void> {
    try {
      const client = getS3Client(BUCKET_NAME);
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: this.S3_PREFIX,
      });

      const response = await client.send(listCommand);
      const contents = response.Contents || [];

      if (contents.length <= this.MAX_BACKUPS_TO_KEEP) {
        return;
      }

      // Sort by LastModified ascending (oldest first)
      contents.sort((a, b) => {
        const timeA = a.LastModified ? a.LastModified.getTime() : 0;
        const timeB = b.LastModified ? b.LastModified.getTime() : 0;
        return timeA - timeB;
      });

      const countToDelete = contents.length - this.MAX_BACKUPS_TO_KEEP;
      const itemsToDelete = contents.slice(0, countToDelete);
      const keysToDelete = itemsToDelete.map((item) => item.Key!).filter(Boolean);

      if (keysToDelete.length > 0) {
        console.log(`[DatabaseBackup] 🧹 Pruning ${keysToDelete.length} old database backup(s) from S3 (Retention limit: ${this.MAX_BACKUPS_TO_KEEP})...`);
        const deletedCount = await deleteMultipleFromS3(keysToDelete);
        console.log(`[DatabaseBackup] ✅ Pruned ${deletedCount} old database backup file(s) from AWS S3.`);
      }
    } catch (err: any) {
      console.warn('[DatabaseBackup] Warning while pruning old S3 backups:', err?.message || err);
    }
  }
}
