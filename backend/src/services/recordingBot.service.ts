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
  xvfbProcess?: ChildProcess | undefined;
  displayNum: string;
  pulseModuleId?: string | undefined;
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
   * Allocate a unique X11 display number per recording session
   */
  private static allocateDisplay(sessionId: number): string {
    const base = 100 + (sessionId % 500);
    let display = `:${base}`;
    const usedDisplays = new Set(Array.from(activeRecordings.values()).map(r => r.displayNum));
    let offset = 0;
    while (usedDisplays.has(display)) {
      offset++;
      display = `:${base + offset}`;
    }
    return display;
  }

  /**
   * Generate a valid signed RECORDING_BOT JWT token for the headless recorder
   */
  private static generateBotToken(): string {
    const secret = process.env.JWT_SECRET || 'your_super_secret_jwt_key';
    return jwt.sign(
      {
        id: 999999,
        name: 'Recording Bot',
        email: 'recording-bot@studyasan.com',
        role: 'RECORDING_BOT',
        isBot: true,
      },
      secret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Ensure PulseAudio daemon is running
   */
  private static ensurePulseDaemon(): Promise<void> {
    return new Promise((resolve) => {
      exec('pulseaudio --check', (err) => {
        if (err) {
          exec('pulseaudio --start --exit-idle-time=-1', () => {
            setTimeout(resolve, 500);
          });
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Start a dedicated Xvfb virtual display for this session
   */
  private static async startXvfb(displayNum: string): Promise<ChildProcess | undefined> {
    return new Promise((resolve) => {
      try {
        console.log(`[RecordingBot] Spawning dedicated Xvfb on display ${displayNum}...`);
        const xvfb = spawn('Xvfb', [displayNum, '-screen', '0', '1280x720x24', '-ac'], {
          detached: true,
          stdio: 'ignore',
        });
        xvfb.unref();
        setTimeout(() => resolve(xvfb), 800);
      } catch (err) {
        console.warn(`[RecordingBot] Warning spawning Xvfb on ${displayNum}:`, err);
        resolve(undefined);
      }
    });
  }

  /**
   * Create an isolated PulseAudio null sink for this specific session
   */
  private static async createSessionAudioSink(sessionId: number): Promise<{ sinkName: string; moduleId?: string }> {
    await this.ensurePulseDaemon();
    const sinkName = `rec_sink_${sessionId}_${Date.now()}`;
    return new Promise((resolve) => {
      exec(`pactl load-module module-null-sink sink_name=${sinkName} sink_properties=device.description=RecSink_${sessionId}`, (err, stdout) => {
        if (err || !stdout || stdout.trim() === '') {
          console.warn(`[RecordingBot] Warning creating isolated pulse sink:`, err?.message || 'Empty response');
          resolve({ sinkName: 'auto_null' });
        } else {
          const moduleId = stdout.trim();
          console.log(`[RecordingBot] Created isolated Pulse sink ${sinkName} (module ${moduleId})`);
          resolve({ sinkName, moduleId });
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

    console.log(`[RecordingBot] 🚀 Initializing Isolated Recording Bot for session #${sessionId}...`);

    const outputFileName = `recording_session_${sessionId}_${Date.now()}.mp4`;
    const outputFilePath = path.join(RECORDINGS_DIR, outputFileName);
    const displayNum = this.allocateDisplay(sessionId);
    const chromiumPath = this.getChromiumPath();
    const baseUrl = appUrl || process.env.APP_URL || 'http://localhost:3000';
    const token = botToken || this.generateBotToken();

    try {
      // 1. Start dedicated isolated Xvfb virtual display
      const xvfbProcess = await this.startXvfb(displayNum);

      // 2. Create dedicated isolated PulseAudio sink
      const { sinkName, moduleId: pulseModuleId } = await this.createSessionAudioSink(sessionId);
      const audioSource = sinkName === 'auto_null' ? 'auto_null.monitor' : `${sinkName}.monitor`;
      console.log(`[RecordingBot] Session #${sessionId} -> Display: ${displayNum}, Audio Sink: ${sinkName} (Monitor: ${audioSource})`);

      // 3. Launch Chromium via Puppeteer connected exclusively to the session's Virtual Display & Audio Sink
      const browser = await puppeteer.launch({
        executablePath: chromiumPath,
        headless: false, // Runs inside dedicated Xvfb virtual screen
        ignoreDefaultArgs: ['--enable-automation'],
        env: {
          ...process.env,
          DISPLAY: displayNum,
          PULSE_SINK: sinkName,
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

      // 4. Open Classroom with Bot Token & bot=true param
      const classroomUrl = `${baseUrl}/classroom/${sessionId}?bot=true&token=${token}`;
      console.log(`[RecordingBot] Navigating to: ${classroomUrl}`);

      await page.goto(classroomUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch((err) => {
        console.warn(`[RecordingBot] Page navigation notice for session #${sessionId}:`, err.message);
      });

      // 5. Spawn Linux FFmpeg capturing exclusively from this session's display and audio sink
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
          console.warn(`[RecordingBot FFmpeg #${sessionId}] ${msg.trim()}`);
        }
      });

      activeRecordings.set(sessionId, {
        sessionId,
        browser,
        ffmpegProcess,
        xvfbProcess,
        displayNum,
        pulseModuleId,
        outputFilePath,
        startTime: new Date(),
      });

      console.log(`[RecordingBot] 🔴 Recording ACTIVE for session #${sessionId} -> ${outputFilePath} on ${displayNum}`);
    } catch (error: any) {
      console.error(`[RecordingBot] Failed to start recording for session #${sessionId}:`, error);
    }
  }

  /**
   * Stop recording when class ends, clean up isolated display/audio sink, and save to database
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
      try {
        active.ffmpegProcess.kill('SIGINT');
      } catch (e: any) {
        console.warn(`[RecordingBot] Error killing FFmpeg for session #${sessionId}:`, e.message);
      }

      // Wait 3 seconds for FFmpeg to finalize file
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 3. Clean up isolated PulseAudio sink
      if (active.pulseModuleId) {
        exec(`pactl unload-module ${active.pulseModuleId}`, (err) => {
          if (err) console.warn(`[RecordingBot] Notice unloading pulse module ${active.pulseModuleId}:`, err.message);
          else console.log(`[RecordingBot] Unloaded PulseAudio module ${active.pulseModuleId}`);
        });
      }

      // 4. Clean up isolated Xvfb process
      if (active.xvfbProcess) {
        try {
          active.xvfbProcess.kill('SIGKILL');
        } catch (e) {}
      }
      exec(`pkill -f "Xvfb ${active.displayNum}"`, () => {});

      const durationSeconds = Math.max(1, Math.round((Date.now() - active.startTime.getTime()) / 1000));
      const stats = fs.existsSync(active.outputFilePath) ? fs.statSync(active.outputFilePath) : null;
      const fileSizeBytes = stats ? stats.size : 0;

      // 5. Save recording metadata in Database with 30-day retention
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
