# ⏰ Cron Jobs & Scheduled Tasks Reference

The backend executes automated background workers via `node-cron`, registered at startup in `backend/src/server.ts`.

---

## 1. Master Schedule Overview

| Service Name | Cron Expression | Schedule | Description |
| :--- | :--- | :--- | :--- |
| **`DatabaseBackupService`** | `0 2 * * *` | Daily at 02:00 AM | Dumps PostgreSQL DB, compresses with gzip, uploads to S3, and prunes backups older than 30 days. |
| **`DataRetentionCleanupService`** | `0 3 * * *` | Daily at 03:00 AM | Purges expired database records (classroom chats older than 1 year, temporary test attempts older than 1 year). |
| **`JanusCleanupService`** | `0 * * * *` | Hourly at minute 0 | Detects orphaned VideoRooms on Janus media gateway and cleans up inactive room handles. |
| **`RecordingCleanupService`** | `0 0 * * *` | Daily at Midnight | Purges classroom video recording metadata and S3 objects exceeding the 30-day retention limit. |
| **`ClassSessionScheduler`** | `* * * * *` | Every Minute | Evaluates scheduled class start/end times and transitions session states (`UPCOMING` → `LIVE` → `COMPLETED`). |
| **`NotificationProcessorService`** | `* * * * *` | Every Minute | Polls queued in-app notifications and delivers web push messages. |
| **`KnowYourChildScheduler`** | `0 9 * * *` | Daily at 09:00 AM | Generates daily student learning progress summaries and dispatches email/app alerts to parents. |

---

## 2. Detailed Service Documentation

### 2.1 Database Backup Service (`DatabaseBackupService.ts`)
* **File**: `backend/src/services/databaseBackup.service.ts`
* **Trigger**: `0 2 * * *` (Configurable via `DB_BACKUP_CRON_SCHEDULE`).
* **Behavior**: Uses `child_process.spawn` to run `pg_dump`, streams the output into a gzip stream, and uploads the compressed archive to AWS S3. Automatically queries S3 for backups with prefix `backups/database/` and deletes files beyond `DB_BACKUP_RETENTION_COUNT` (default 30).

### 2.2 Data Retention Cleanup Service (`DataRetentionCleanupService.ts`)
* **File**: `backend/src/services/dataRetentionCleanup.service.ts`
* **Trigger**: `0 3 * * *` (Configurable via `DATA_RETENTION_CRON_SCHEDULE`).
* **Purge Criteria**:
  * In-classroom text chat logs older than 365 days.
  * Practice test transient responses older than 365 days.

### 2.3 Janus Cleanup Service (`JanusCleanupService.ts`)
* **File**: `backend/src/services/janusCleanup.service.ts`
* **Trigger**: `0 * * * *` (Hourly).
* **Behavior**: Communicates with the Janus HTTP API to inspect active VideoRooms. For any room where all participants have left and the session has ended in ACMS, sends a `destroy` command to release server memory.

### 2.4 Class Session Scheduler (`ClassSessionScheduler.ts`)
* **File**: `backend/src/services/classSessionScheduler.service.ts`
* **Trigger**: `* * * * *` (Every minute).
* **Behavior**: Checks `ClassSession` records in PostgreSQL. Automatically marks sessions `LIVE` when start time is reached, and transitions them to `COMPLETED` when the scheduled end time passes.

---

## 3. Manual Triggers & Admin API Endpoints

Admins can trigger these background routines manually using authenticated REST endpoints:

* **Trigger DB Backup**: `POST /api/admin/maintenance/backup-database`
* **Trigger Data Retention Purge**: `POST /api/admin/maintenance/purge-retention`
* **Trigger Janus Cleanup**: `POST /api/admin/maintenance/cleanup-janus`
* **Trigger Session State Sync**: `POST /api/admin/maintenance/sync-sessions`
