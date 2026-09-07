import { spawn, exec, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import puppeteer from 'puppeteer-core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RECORDINGS_DIR = process.env.RECORDINGS_DIR
  ? path.resolve(process.env.RECORDINGS_DIR)
  : path.resolve(process.cwd(), 'uploads/recordings');

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
   * Find available Chrome/Chromium executable path
   */
  private static getChromiumPath(): string {
    const candidatePaths = [
      process.env.CHROME_BIN,
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
    ].filter(Boolean) as string[];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return '/usr/bin/chromium-browser';
  }

  /**
   * Generate a valid signed ADMIN JWT token for the recording bot
   */
  private static generateBotToken(): string {
    const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
    return jwt.sign(
      {
        id: 1,
        email: 'admin@studyasan.com',
        role: 'ADMIN',
      },
      secret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Ensure Xvfb and PulseAudio are running on the server
   */
  private static async ensureDisplayAndAudio(display = ':99'): Promise<string> {
    process.env.DISPLAY = display;

    // 1. Ensure Xvfb is running
    await new Promise<void>((resolve) => {
      exec(`pgrep -f "Xvfb ${display}"`, (_err, stdout) => {
        if (!stdout || stdout.trim() === '') {
          console.log(`[RecordingBot] Xvfb on ${display} not detected. Spawning Xvfb...`);
          try {
            const xvfbProcess = spawn('Xvfb', [display, '-screen', '0', '1280x720x24', '-ac'], {
              detached: true,
              stdio: 'ignore',
            });
            xvfbProcess.unref();
          } catch (e) {
            console.warn('[RecordingBot] Notice spawning Xvfb:', e);
          }
          setTimeout(resolve, 1000);
        } else {
          resolve();
        }
      });
    });

    // 2. Ensure PulseAudio is running and find available source
    return new Promise<string>((resolve) => {
      exec('pactl list sources short', (err, stdout) => {
        if (err || !stdout || stdout.trim() === '') {
          // Attempt to start pulseaudio daemon
          exec('pulseaudio --start --exit-idle-time=-1', () => {
            setTimeout(() => {
              exec('pactl list sources short', (_e2, out2) => {
                if (out2 && out2.includes('auto_null.monitor')) {
                  resolve('auto_null.monitor');
                } else if (out2 && out2.includes('.monitor')) {
                  const match = out2.match(/(\S+\.monitor)/);
                  resolve(match && match[1] ? match[1] : 'default');
                } else {
                  resolve('default');
                }
              });
            }, 800);
          });
        } else {
          if (stdout.includes('auto_null.monitor')) {
            resolve('auto_null.monitor');
          } else if (stdout.includes('.monitor')) {
            const match = stdout.match(/(\S+\.monitor)/);
            resolve(match && match[1] ? match[1] : 'default');
          } else {
            resolve('default');
          }
        }
      });
    });
  }

  /**
   * Start recording a class session using Headless Chromium + FFmpeg on Linux
   */
  static async startRecording(sessionId: number, appUrl?: string, botToken?: string) {
    if (activeRecordings.has(sessionId)) {
      console.log(`[RecordingBot] Recording already active for session #${sessionId}`);
      return;
    }

    console.log(`[RecordingBot] 🚀 Initializing Recording Bot for session #${sessionId}...`);

    const outputFileName = `recording_session_${sessionId}_${Date.now()}.mp4`;
    const outputFilePath = path.join(RECORDINGS_DIR, outputFileName);
    const displayNum = process.env.DISPLAY || ':99';
    process.env.DISPLAY = displayNum;
    const chromiumPath = this.getChromiumPath();
    const baseUrl = appUrl || process.env.APP_URL || 'http://localhost:3000';
    const token = botToken || this.generateBotToken();

    try {
      // 1. Ensure Xvfb & Audio are running
      const audioSource = await this.ensureDisplayAndAudio(displayNum);
      console.log(`[RecordingBot] Display: ${displayNum}, Audio source: ${audioSource}`);

      // 2. Launch Chromium via Puppeteer connected to Virtual Display
      const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        headless: false, // Runs inside Xvfb virtual screen
        ignoreDefaultArgs: ['--enable-automation'],
        env: {
          ...process.env,
          DISPLAY: displayNum,
        },
        args: [
          `--display=${displayNum}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--kiosk',
          '--start-fullscreen',
          '--window-position=0,0',
          '--window-size=1280,720',
          '--autoplay-policy=no-user-gesture-required',
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
          '--disable-gpu',
          '--hide-scrollbars',
          '--mute-audio=false',
          '--no-default-browser-check',
          '--disable-infobars',
          '--disable-blink-features=AutomationControlled',
          '--test-type',
        ],
        defaultViewport: { width: 1280, height: 720 },
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      // Auto-dismiss any unexpected dialogs or alerts
      page.on('dialog', async (dialog) => {
        console.log('[RecordingBot] Auto-dismissing dialog:', dialog.message());
        await dialog.dismiss().catch(() => {});
      });

      // 3. Open Classroom with Bot Token
      const classroomUrl = `${baseUrl}/classroom/${sessionId}?bot=true&token=${token}`;
      console.log(`[RecordingBot] Navigating to: ${classroomUrl}`);

      await page.goto(classroomUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch((err) => {
        console.warn(`[RecordingBot] Page navigation notice for session #${sessionId}:`, err.message);
      });

      // 4. Spawn Linux FFmpeg with storage-efficient settings (CRF 28, 15fps, 64k aac, +faststart)
      const ffmpegArgs = [
        '-y',
        '-f', 'x11grab',
        '-draw_mouse', '0',
        '-video_size', '1280x720',
        '-framerate', '15',
        '-i', `${displayNum}.0`,
        '-f', 'pulse',
        '-i', audioSource,
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

      ffmpegProcess.stderr?.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('Error') || msg.includes('error') || msg.includes('fatal')) {
          console.warn(`[RecordingBot FFmpeg] ${msg.trim()}`);
        }
      });

      activeRecordings.set(sessionId, {
        sessionId,
        browser,
        ffmpegProcess,
        outputFilePath,
        startTime: new Date(),
      });

      console.log(`[RecordingBot] 🔴 Recording ACTIVE for session #${sessionId} -> ${outputFilePath}`);
    } catch (error: any) {
      console.error(`[RecordingBot] Failed to start recording for session #${sessionId}:`, error);
    }
  }

  /**
   * Stop recording when class ends and save to database
   */
  static async stopRecording(sessionId: number) {
    const active = activeRecordings.get(sessionId);
    if (!active) {
      console.log(`[RecordingBot] No active recording found for session #${sessionId}`);
      return;
    }

    console.log(`[RecordingBot] ⏹️ Stopping recording for session #${sessionId}...`);

    try {
      // 1. Close browser
      try {
        await active.browser.close();
      } catch (e: any) {
        console.warn(`[RecordingBot] Error closing browser for session #${sessionId}:`, e.message);
      }

      // 2. Stop FFmpeg gracefully (send SIGINT so MP4 headers and +faststart index are written)
      active.ffmpegProcess.kill('SIGINT');

      // Wait 3 seconds for FFmpeg to finalize file
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const durationSeconds = Math.max(1, Math.round((Date.now() - active.startTime.getTime()) / 1000));
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

      console.log(`[RecordingBot] ✅ Session #${sessionId} recording saved. Duration: ${durationSeconds}s, Size: ${fileSizeBytes} bytes. Expires: ${expiresAt.toISOString()}`);
    } catch (err) {
      console.error(`[RecordingBot] Error finalizing recording for session #${sessionId}:`, err);
    } finally {
      activeRecordings.delete(sessionId);
    }
  }

  /**
   * Check if a session is currently being recorded by the bot
   */
  static isRecording(sessionId: number): boolean {
    return activeRecordings.has(sessionId);
  }
}
