# StudyAsan Automated Linux Recording Bot & 30-Day Retention Guide

This document summarizes what has been implemented, how the system functions, and provides the step-by-step blueprint to run the **Headless Linux Recording Bot** directly on your Linux server.

---

## 1. Summary of What Has Been Implemented

### A. Database & Local Storage (Zero AWS S3)
* **Prisma Model**: `SessionRecording` in `backend/prisma/schema.prisma` tracking `file_path`, `duration_seconds`, `file_size_bytes`, `status`, and `expires_at` (set to `created_at + 30 days`).
* **Local Disk Storage**: Video files are saved directly on your server disk in `uploads/recordings/` (added to `.gitignore`).
* **Streaming Endpoint**: `GET /api/class-sessions/:id/recording/stream` with **HTTP 206 Partial Content Range Requests** for smooth seeking/scrubbing without loading the full video into RAM.
* **Daily 30-Day Auto-Purge**: `RecordingCleanupService` runs daily at midnight (`0 0 * * *`) via `node-cron`, permanently deleting physical video files older than 30 days (`fs.promises.unlink`) and marking database status as `EXPIRED`.

### B. UI & Frontend Updates
* **Classroom Indicator**: Simplified to a clean, non-intrusive badge: **`🔴 This class is being recorded`** for Teachers, Admins, and Students. No stop button, no timer, no "360p" text.
* **Class Session Cards**: Added a direct **`[🎬 Recording]`** button to the class cards on the Schedule page when a session has ended.
* **Playback Modal**: [RecordingPlayerModal.tsx](file:///d:/code/XDAS%20Technology/acms.studyasan.com/frontend/src/components/classroom/RecordingPlayerModal.tsx) with speed controls (`0.75x` – `2x`), duration, file size, and the 30-day auto-deletion notice.

---

## 2. Why the Video Appeared Black (The WebM Container Issue) & The Solution

In the screenshot, the player showed `0:00` and a black screen. This happens because browser-generated WebM blobs created via `MediaRecorder` often lack proper duration metadata headers (*cues*) in the container index.

### The Fix with the Linux Server Bot:
The Linux bot uses **FFmpeg** to encode directly to universal **H.264 MP4** with the `-movflags +faststart` flag:
* **H.264 Video + AAC Audio**: Works natively on all devices (Chrome, Safari, iOS, Android, Firefox).
* **`+faststart` Header**: Moves video index metadata to the front of the file so video playback and instant seeking start immediately without delay.

---

## 3. Headless Linux Recording Bot Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │           Linux VPS / Server                 │
                       │                                              │
[ Class Start Time ] ──┼──► 1. Node.js Scheduler spawns Bot           │
                       │                                              │
                       │    2. Xvfb creates Virtual Screen (:99)      │
                       │       PulseAudio creates Virtual Audio Sink  │
                       │                                              │
                       │    3. Headless Chromium (Puppeteer) opens:   │
                       │       https://acms.studyasan.com/classroom/  │
                       │                                              │
                       │    4. FFmpeg records :99 screen + audio sink │
                       │       directly into MP4                      │
                       │                                              │
[ Class End Time ]   ──┼──► 5. Bot closes Chromium & FFmpeg           │
                       │    6. MP4 saved to uploads/recordings/       │
                       │    7. SessionRecording record created in DB  │
                       └──────────────────────────────────────────────┘
```

---

## 4. Step-by-Step Linux Server Setup

### Step 1: Install Required Linux Packages
SSH into your Linux server and install the virtual display, audio drivers, Chromium, and FFmpeg:

```bash
sudo apt update
sudo apt install -y xvfb pulseaudio chromium-browser ffmpeg
```

---

### Step 2: Install Puppeteer on the Backend
In your backend project directory on the server:

```bash
cd /path/to/acms.studyasan.com/backend
npm install puppeteer-core
```

---

### Step 3: Headless Bot Worker Script (`recordingBot.service.ts`)

Create a background service in `backend/src/services/recordingBot.service.ts`:

```typescript
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RECORDINGS_DIR = path.resolve(process.cwd(), 'uploads/recordings');
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

interface ActiveRecording {
  sessionId: number;
  browser: any;
  ffmpegProcess: ChildProcess;
  outputFilePath: string;
  startTime: Date;
}

const activeRecordings = new Map<number, ActiveRecording>();

export class RecordingBotService {
  /**
   * Start recording a class session using Headless Chromium + FFmpeg on Linux
   */
  static async startRecording(sessionId: number, appUrl: string, botToken: string) {
    if (activeRecordings.has(sessionId)) {
      console.log(`[Bot] Recording already active for session #${sessionId}`);
      return;
    }

    console.log(`[Bot] 🚀 Starting Headless Recording Bot for session #${sessionId}...`);

    const outputFileName = `recording_session_${sessionId}_${Date.now()}.mp4`;
    const outputFilePath = path.join(RECORDINGS_DIR, outputFileName);
    const displayNum = ':99';

    // 1. Launch Headless Chromium via Puppeteer connected to Virtual Display :99
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
      headless: false, // Runs inside Xvfb virtual screen
      args: [
        `--display=${displayNum}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1280,720',
        '--autoplay-policy=no-user-gesture-required',
        '--use-fake-ui-for-media-stream',
      ],
      defaultViewport: { width: 1280, height: 720 },
    });

    const page = await browser.newPage();
    
    // 2. Open Classroom with Bot Token
    const classroomUrl = `${appUrl}/classroom/${sessionId}?bot=true&token=${botToken}`;
    await page.goto(classroomUrl, { waitUntil: 'networkidle2' });

    // 3. Spawn Linux FFmpeg to record the virtual screen and PulseAudio sink
    const ffmpegArgs = [
      '-y',
      '-f', 'x11grab',
      '-video_size', '1280x720',
      '-framerate', '15',
      '-i', `${displayNum}.0`,
      '-f', 'pulse',
      '-i', 'default',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '28',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '64k',
      '-movflags', '+faststart',
      outputFilePath,
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    activeRecordings.set(sessionId, {
      sessionId,
      browser,
      ffmpegProcess,
      outputFilePath,
      startTime: new Date(),
    });

    console.log(`[Bot] 🔴 Recording started for session #${sessionId} -> ${outputFilePath}`);
  }

  /**
   * Stop recording when class ends and save to database
   */
  static async stopRecording(sessionId: number) {
    const active = activeRecordings.get(sessionId);
    if (!active) {
      console.log(`[Bot] No active recording found for session #${sessionId}`);
      return;
    }

    console.log(`[Bot] ⏹️ Stopping recording for session #${sessionId}...`);

    try {
      // 1. Close browser
      await active.browser.close();

      // 2. Stop FFmpeg gracefully (send SIGINT so MP4 headers are written)
      active.ffmpegProcess.kill('SIGINT');

      // Wait 2 seconds for FFmpeg to finalize file
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const durationSeconds = Math.round((Date.now() - active.startTime.getTime()) / 1000);
      const stats = fs.existsSync(active.outputFilePath) ? fs.statSync(active.outputFilePath) : null;
      const fileSizeBytes = stats ? stats.size : 0;

      // 3. Save recording metadata in Database with 30-day retention
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await (prisma as any).sessionRecording.create({
        data: {
          class_session_id: sessionId,
          file_name: path.basename(active.outputFilePath),
          file_path: active.outputFilePath,
          file_size_bytes: BigInt(fileSizeBytes),
          duration_seconds: durationSeconds,
          mime_type: 'video/mp4',
          status: 'READY',
          expires_at: expiresAt,
        },
      });

      console.log(`[Bot] ✅ Session #${sessionId} recording saved. Duration: ${durationSeconds}s. Expires: ${expiresAt.toISOString()}`);
    } catch (err) {
      console.error(`[Bot] Error finalizing recording for session #${sessionId}:`, err);
    } finally {
      activeRecordings.delete(sessionId);
    }
  }
}
```

---

### Step 4: Class Scheduler Trigger (`classSessionScheduler.service.ts`)

A lightweight cron job checks upcoming classes every minute and starts/stops the bot:

```typescript
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { RecordingBotService } from './recordingBot.service.js';

const prisma = new PrismaClient();

export class ClassSessionScheduler {
  static start() {
    console.log('[Scheduler] Class Session Bot Scheduler started (checks every minute)...');

    cron.schedule('* * * * *', async () => {
      const now = new Date();
      const oneMinuteLater = new Date(now.getTime() + 60 * 1000);

      // 1. Find sessions starting NOW (within the current minute)
      const startingSessions = await prisma.classSession.findMany({
        where: {
          start_time: { gte: now, lte: oneMinuteLater },
        },
      });

      for (const session of startingSessions) {
        // Generate system bot token and start recording
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const botToken = process.env.BOT_ACCESS_TOKEN || 'system_bot_token';
        RecordingBotService.startRecording(session.id, appUrl, botToken);
      }

      // 2. Find sessions ending NOW
      const endingSessions = await prisma.classSession.findMany({
        where: {
          end_time: { lte: now },
        },
      });

      for (const session of endingSessions) {
        RecordingBotService.stopRecording(session.id);
      }
    });
  }
}
```

---

### Step 5: Start Virtual Display (`Xvfb`) on Linux

To ensure the virtual display is always running on your Linux server, start it in the background or add it to system startup:

```bash
# Start Xvfb virtual screen :99 in background
Xvfb :99 -screen 0 1280x720x24 &
```

Or via `systemd` service (`/etc/systemd/system/xvfb.service`):
```ini
[Unit]
Description=X Virtual Frame Buffer
After=network.target

[Service]
ExecStart=/usr/bin/Xvfb :99 -screen 0 1280x720x24
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

---

## 5. Summary Checklist Before Pushing to Server

1. [x] **Prisma Model**: `SessionRecording` created and migrated.
2. [x] **Local Storage**: `uploads/recordings/` configured for server-only storage.
3. [x] **HTTP 206 Streaming**: Video player seeks smoothly without loading full file into RAM.
4. [x] **Auto 30-Day Expiration**: `RecordingCleanupService` midnight cron purges expired files on day 31.
5. [x] **Classroom UI**: Clean `🔴 This class is being recorded` indicator for everyone.
6. [x] **Class Cards**: `[🎬 Recording]` button on ended class session cards.
7. [x] **Server Bot Setup**: Documented above and ready to run on Linux.
