import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
  Camera,
  CameraOff,
  Shield,
  ShieldAlert,
  Eye,
  EyeOff,
  Flag,
  Menu,
  X,
  AlertCircle,
} from 'lucide-react';
import { testAttemptService } from '@/services/api';
import type { TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MediaUpload from '@/components/ui/MediaUpload';
import ConfirmModal from '@/components/ui/confirmationModal';
import MathRenderer from '@/components/ui/MathRenderer';
import { usePageTitle } from "@/hooks/usePageTitle";
import { initFaceDetector, detectFaceInCanvas } from '@/utils/faceDetector';

const DEFAULT_MAX_VIOLATIONS = 3;

// ============================================================
// Types
// ============================================================
interface Violation {
  type: 'tab_switch' | 'fullscreen_exit' | 'face_not_detected' | 'multiple_faces' | 'copy_attempt' | 'keyboard_shortcut';
  timestamp: Date;
  message: string;
}

// ============================================================
// Face Detection Hook — Multi-Tier Detection Engine
// ============================================================
function useFaceDetection(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'ok' | 'no_face' | 'not_looking' | 'checking' | 'error'>('checking');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Consecutive counters for debounced state transitions
  const consecutiveNoFaceRef    = useRef(0);
  const consecutiveNotLookingRef = useRef(0);
  const consecutiveOkRef        = useRef(0);
  const onViolationRef = useRef<((v: Violation) => void) | null>(null);
  const isCheckingRef  = useRef(false);

  // Pre-load cascade model on hook mount
  useEffect(() => {
    initFaceDetector().catch(() => {});
  }, []);

  const startCamera = useCallback(async () => {
    if (!enabled) return;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        try { await videoRef.current.play(); } catch { /* autoplay may already be playing */ }
      }
      setCameraActive(true);
      setCameraError(null);
      setFaceStatus('checking');
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Camera permission required. Please allow camera access.');
      setCameraActive(false);
      setFaceStatus('error');
    }
  }, [enabled]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setCameraActive(false);
  }, []);

  /**
   * Evaluates camera frame using multi-tier detection:
   * 1. Native Shape Detection API (if supported by browser)
   * 2. Pico Decision-tree Cascade Classifier (never triggers on blank walls/backgrounds)
   * 3. Multi-gate Sobel Edge & Chrominance Fallback (strictly rejects flat surfaces)
   */
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive || isCheckingRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.readyState < 2) return;

    isCheckingRef.current = true;
    try {
      const canvas = canvasRef.current;
      canvas.width  = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 160, 120);

      const result = await detectFaceInCanvas(canvas);

      if (result.status === 'no_face') {
        consecutiveNoFaceRef.current++;
        consecutiveNotLookingRef.current = 0;
        consecutiveOkRef.current = 0;
        setFaceStatus('no_face');

        if (consecutiveNoFaceRef.current >= 3) {
          onViolationRef.current?.({
            type: 'face_not_detected',
            timestamp: new Date(),
            message: result.message || 'No face detected — please look directly at the screen!',
          });
          consecutiveNoFaceRef.current = 0;
        }
      } else if (result.status === 'not_looking') {
        consecutiveNotLookingRef.current++;
        consecutiveNoFaceRef.current = 0;
        consecutiveOkRef.current = 0;
        setFaceStatus('not_looking');

        if (consecutiveNotLookingRef.current >= 3) {
          onViolationRef.current?.({
            type: 'face_not_detected',
            timestamp: new Date(),
            message: result.message || 'Face not looking at screen — please look directly at the screen!',
          });
          consecutiveNotLookingRef.current = 0;
        }
      } else {
        // 'ok'
        consecutiveOkRef.current++;
        consecutiveNoFaceRef.current = 0;

        // Require 2 consecutive frames before clearing warning state
        if (consecutiveOkRef.current >= 2) {
          consecutiveNotLookingRef.current = 0;
          setFaceStatus('ok');
        }
      }
    } catch (err) {
      console.warn('[FaceDetection] Error analyzing frame:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [cameraActive]);

  useEffect(() => {
    if (enabled) { startCamera(); } else { stopCamera(); }
    return () => stopCamera();
  }, [enabled, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive && enabled) {
      // Start detecting after 1.5s so video stream stabilizes
      const t = setTimeout(() => {
        intervalRef.current = setInterval(detectFace, 1000);
      }, 1500);
      return () => {
        clearTimeout(t);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [cameraActive, enabled, detectFace]);

  return { videoRef, canvasRef, cameraActive, faceStatus, cameraError, onViolationRef, stopCamera, startCamera };
}

// ============================================================
// Match the Following Interactive Component
// ============================================================
function MatchTheFollowingInteractive({
  pairs,
  currentAnswer,
  onAnswerChange,
}: {
  pairs: { left: string; right: string }[];
  currentAnswer: { left: string; right: string }[];
  onAnswerChange: (newAnswer: { left: string; right: string }[]) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  const rightChoices = useMemo(() => {
    return [...new Set(pairs.map((p) => p.right))].sort();
  }, [pairs]);

  const handleLeftClick = (left: string) => {
    if (selectedLeft === left) setSelectedLeft(null);
    else setSelectedLeft(left);
  };

  const handleRightClick = (right: string) => {
    if (!selectedLeft) return;
    const newAnswer = currentAnswer.filter((a) => a.left !== selectedLeft && a.right !== right);
    newAnswer.push({ left: selectedLeft, right });
    onAnswerChange(newAnswer);
    setSelectedLeft(null);
  };

  const handleUnmatch = (left: string) => {
    onAnswerChange(currentAnswer.filter((a) => a.left !== left));
  };

  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const updateLines = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newLines = [];

      for (const match of currentAnswer) {
        const leftEl = leftRefs.current[match.left];
        const rightEl = rightRefs.current[match.right];

        if (leftEl && rightEl) {
          const lRect = leftEl.getBoundingClientRect();
          const rRect = rightEl.getBoundingClientRect();

          newLines.push({
            x1: lRect.right - containerRect.left,
            y1: lRect.top + lRect.height / 2 - containerRect.top,
            x2: rRect.left - containerRect.left,
            y2: rRect.top + rRect.height / 2 - containerRect.top,
          });
        }
      }
      setLines(newLines);
    };

    updateLines();
    // Use timeout to handle post-render positioning
    const t = setTimeout(updateLines, 50);
    window.addEventListener('resize', updateLines);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateLines);
    };
  }, [currentAnswer, pairs, rightChoices]);

  return (
    <div className="relative flex justify-between gap-10 p-4 select-none min-h-[200px]" ref={containerRef}>
      <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
        {lines.map((line, i) => (
          <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
        ))}
      </svg>

      {/* Left Column */}
      <div className="flex flex-col gap-4 w-1/2 z-10">
        {pairs.map((p, i) => {
          const isMatched = currentAnswer.some((a) => a.left === p.left);
          const isSelected = selectedLeft === p.left;
          return (
            <div
              key={i}
              ref={(el) => { leftRefs.current[p.left] = el; }}
              onClick={() => handleLeftClick(p.left)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSelected
                  ? 'border-saBlue bg-blue-50 ring-2 ring-blue-200 shadow-md transform scale-[1.02]'
                  : isMatched
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-saBlue'
                }`}
            >
              <span className="font-medium text-gray-800"><MathRenderer text={p.left} inline={true} /></span>
              {isMatched && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnmatch(p.left);
                  }}
                  className="text-red-500 text-xs font-bold hover:underline bg-white/50 px-2 py-1 rounded"
                >
                  Unmatch
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-4 w-1/2 z-10">
        {rightChoices.map((choice, i) => {
          const matchedBy = currentAnswer.find((a) => a.right === choice)?.left;
          const isMatched = !!matchedBy;

          return (
            <div
              key={i}
              ref={(el) => { rightRefs.current[choice] = el; }}
              onClick={() => handleRightClick(choice)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedLeft && !isMatched
                  ? 'border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-100 hover:border-solid hover:border-saBlue'
                  : isMatched
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-white opacity-90'
                }`}
            >
              <span className="font-medium text-gray-800"><MathRenderer text={choice} inline={true} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export default function TestAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  usePageTitle(attempt ? `Test: ${attempt.test?.title || ""}` : "Test in Progress");
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [reviewQuestionIds, setReviewQuestionIds] = useState<Set<number>>(new Set());
  const [visitedQuestionIds, setVisitedQuestionIds] = useState<Set<number>>(new Set());
  const [answerMediaFiles, setAnswerMediaFiles] = useState<{ [questionId: number]: File | null }>({});
  const [answerMediaUrls, setAnswerMediaUrls] = useState<{ [questionId: number]: string | null }>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [showViolationBanner, setShowViolationBanner] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showViolationLog, setShowViolationLog] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [maxViolations, setMaxViolations] = useState(DEFAULT_MAX_VIOLATIONS);
  const [enforceWarningAttempts, setEnforceWarningAttempts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const violationCountRef = useRef(0);
  const hasAutoSubmittedRef = useRef(false);
  const isFilePickingRef = useRef(false);
  const lastFilePickerTimeRef = useRef(0);
  const violationBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Practice Mode Check
  const isPractice = Boolean(
    attempt?.is_practice ||
    (attempt?.test as any)?.test_type === 'PRACTICE' ||
    (attempt?.test as any)?.is_practice
  );

  // Face Detection & Camera Proctoring - ALWAYS enabled for active tests
  const proctoringEnabled = Boolean(!loading && !!attempt && !attempt.submitted_at);
  const faceDetection = useFaceDetection(proctoringEnabled);

  // Track file dialog interactions to prevent false violations or modal gate popups
  useEffect(() => {
    const handleFileInputClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isFileInput = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'file';
      const isFileLabel = !!target.closest('label[for*="file"]') || !!target.closest('[data-file-upload]');
      const isFileBtn = !!target.closest('button') && (target.closest('button')?.innerText?.toLowerCase().includes('upload') || false);

      if (isFileInput || isFileLabel || isFileBtn) {
        isFilePickingRef.current = true;
        lastFilePickerTimeRef.current = Date.now();
      }
    };

    const handleWindowFocus = () => {
      if (isFilePickingRef.current) {
        lastFilePickerTimeRef.current = Date.now();
        setTimeout(() => {
          isFilePickingRef.current = false;
        }, 2500);
      }
    };

    window.addEventListener('click', handleFileInputClick, true);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('click', handleFileInputClick, true);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const addViolation = useCallback((violation: Violation) => {
    if (loading || !attempt || attempt.submitted_at) return;
    if (isFilePickingRef.current || (Date.now() - lastFilePickerTimeRef.current < 3000)) return;

    setViolations(prev => {
      const updated = [...prev, violation];
      const newCount = updated.length;
      violationCountRef.current = newCount;

      // Build the banner message using the UPDATED count
      const msg = newCount >= maxViolations
        ? `⛔ Final warning! You have reached ${maxViolations} violations. (${violation.message})`
        : `⚠️ Warning ${newCount}/${maxViolations}: ${violation.message}`;

      setViolationMessage(msg);
      setShowViolationBanner(true);
      if (violationBannerTimeoutRef.current) clearTimeout(violationBannerTimeoutRef.current);
      violationBannerTimeoutRef.current = setTimeout(() => setShowViolationBanner(false), 5000);

      return updated;
    });
  }, [loading, attempt, maxViolations]);

  // Auto-submit after configured max violations ONLY for official exams with auto-submit enabled (NEVER in practice mode or when auto-submit is disabled)
  useEffect(() => {
    const shouldAutoSubmit =
      !isPractice &&
      (attempt?.test as any)?.enforce_warning_attempts !== false &&
      enforceWarningAttempts;

    if (
      !loading &&
      attempt &&
      !attempt.submitted_at &&
      shouldAutoSubmit &&
      violations.length >= maxViolations &&
      !hasAutoSubmittedRef.current &&
      !autoSubmitting
    ) {
      hasAutoSubmittedRef.current = true;
      setAutoSubmitting(true);
      // Small delay so the user sees the final warning
      setTimeout(() => {
        handleSubmitTest(true);
      }, 1500);
    }
  }, [violations, autoSubmitting, maxViolations, enforceWarningAttempts, loading, attempt, isPractice]);

  // Wire up face detection violations
  useEffect(() => {
    faceDetection.onViolationRef.current = addViolation;
  }, [addViolation]);

  // ---- Fetch Attempt ----
  useEffect(() => {
    if (attemptId) {
      fetchAttempt();
    }
    return () => { exitFullscreen(); faceDetection.stopCamera(); };
  }, [attemptId]);

  // ---- Fullscreen Helpers ----
  const enterFullscreen = () => {
    const docEl = document.documentElement as any;
    const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
    if (req) {
      req.call(docEl).then(() => {
        setIsFullscreen(true);
      }).catch((err: any) => {
        console.warn("Fullscreen request error:", err);
      });
    }
  };

  const exitFullscreen = () => {
    const doc = document as any;
    const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement) {
      exit?.call(doc);
      setIsFullscreen(false);
    }
  };

  // ---- Screen Lock: Fullscreen Change Listener ----
  useEffect(() => {
    const checkFs = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement
      );
      setIsFullscreen(isFs);

      // Do not trigger violations when picking files
      if (isFilePickingRef.current || (Date.now() - lastFilePickerTimeRef.current < 3000)) {
        return;
      }

      if (!isFs && !loading && attempt && !attempt.submitted_at) {
        addViolation({ type: 'fullscreen_exit', timestamp: new Date(), message: 'Fullscreen exited — please return to fullscreen mode.' });
      }
    };
    document.addEventListener('fullscreenchange', checkFs);
    document.addEventListener('webkitfullscreenchange', checkFs);
    document.addEventListener('mozfullscreenchange', checkFs);
    return () => {
      document.removeEventListener('fullscreenchange', checkFs);
      document.removeEventListener('webkitfullscreenchange', checkFs);
      document.removeEventListener('mozfullscreenchange', checkFs);
    };
  }, [loading, attempt, addViolation]);

  // ---- Screen Lock: Visibility / Tab Switch (only true document.hidden) ----
  useEffect(() => {
    const handleVisibility = () => {
      // Do not trigger violations when picking files
      if (isFilePickingRef.current || (Date.now() - lastFilePickerTimeRef.current < 3000)) {
        return;
      }

      if (document.hidden && !loading && attempt && !attempt.submitted_at) {
        addViolation({ type: 'tab_switch', timestamp: new Date(), message: 'Tab switch detected — stay on this page!' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loading, attempt, addViolation]);

  // ---- Screen Lock: Keyboard Shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!attempt || attempt.submitted_at) return;
      // Allow normal typing / editing inside textarea and input elements
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');

      if (
        (e.ctrlKey && ['p', 'u', 's'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
        e.key === 'PrintScreen' ||
        (!isInput && e.ctrlKey && ['c', 'v', 'a'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        addViolation({ type: 'keyboard_shortcut', timestamp: new Date(), message: `Blocked shortcut: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}` });
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [attempt, addViolation]);

  // ---- Screen Lock: Context Menu & Copy ----
  useEffect(() => {
    const preventContext = (e: MouseEvent) => {
      if (!attempt || attempt.submitted_at) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return;
      }
      e.preventDefault();
    };
    const preventCopy = (e: ClipboardEvent) => {
      if (!attempt || attempt.submitted_at) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return;
      }
      e.preventDefault();
      addViolation({ type: 'copy_attempt', timestamp: new Date(), message: 'Copy attempt blocked' });
    };
    const preventPaste = (e: ClipboardEvent) => {
      if (!attempt || attempt.submitted_at) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
        return;
      }
      e.preventDefault();
    };
    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventPaste);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventPaste);
    };
  }, [attempt, addViolation]);

  // ---- Prevent beforeunload ----
  useEffect(() => {
    const handle = (e: BeforeUnloadEvent) => {
      if (!attempt?.submitted_at) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [attempt]);

  // ---- Fetch ----

  const fetchAttempt = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getAttempt(parseInt(attemptId!));
      setAttempt(response.data);
      const existingAnswers: { [key: number]: string } = {};
      const existingMediaUrls: { [key: number]: string | null } = {};
      response.data.answers?.forEach((answer) => {
        if (answer.answer_text) existingAnswers[answer.question_id] = answer.answer_text;
        if (answer.answer_media_url) existingMediaUrls[answer.question_id] = answer.answer_media_url;
      });
      setAnswers(existingAnswers);
      setAnswerMediaUrls(existingMediaUrls);
      const configuredMax = response.data.test?.max_warning_attempts;
      if (typeof configuredMax === 'number' && Number.isInteger(configuredMax) && configuredMax > 0) {
        setMaxViolations(configuredMax);
      }
      const isPracticeAttempt = Boolean(
        response.data.is_practice ||
        (response.data.test as any)?.test_type === 'PRACTICE' ||
        (response.data.test as any)?.is_practice
      );
      const enforceWarnings = (response.data.test as any)?.enforce_warning_attempts !== false;
      setEnforceWarningAttempts(enforceWarnings);

      const durationMins = response.data.test?.duration_minutes;
      const isTimed = typeof durationMins === 'number' && durationMins > 0;

      if (response.data.started_at) {
        const startedAt = new Date(response.data.started_at).getTime();
        const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        setElapsedSeconds(elapsed);

        if (isTimed) {
          const totalDurationSec = durationMins * 60;
          const remaining = Math.max(0, totalDurationSec - elapsed);
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(null);
        }
      } else {
        if (isTimed) {
          setTimeRemaining(durationMins * 60);
        } else {
          setTimeRemaining(null);
        }
      }
    } catch (error) {
      console.error('Error fetching test attempt:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  // ---- Timer Countdown & Elapsed Time ----
  useEffect(() => {
    if (!attempt || attempt.submitted_at) return;

    const durationMins = attempt.test?.duration_minutes;
    const isTimed = typeof durationMins === 'number' && durationMins > 0;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (isTimed) {
        setTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            if (!isPractice && !hasAutoSubmittedRef.current && !autoSubmitting) {
              hasAutoSubmittedRef.current = true;
              setAutoSubmitting(true);
              handleSubmitTest(true);
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, autoSubmitting, isPractice]);

  // ---- Answer Change ----
  const handleAnswerChange = async (questionId: number, answerText: string, mediaFile?: File | null, mediaUrl?: string | null) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerText }));
    try {
      setSavingAnswer(true);
      if (mediaFile || mediaUrl) {
        const formData = new FormData();
        formData.append("question_id", questionId.toString());
        formData.append("answer_text", answerText || "");
        if (mediaFile) {
          setAnswerMediaFiles(prev => ({ ...prev, [questionId]: mediaFile }));
          formData.append("answer_media", mediaFile);
        } else if (mediaUrl) {
          setAnswerMediaUrls(prev => ({ ...prev, [questionId]: mediaUrl }));
          formData.append("answer_media_url", mediaUrl);
        }
        await testAttemptService.submitAnswerWithMedia(parseInt(attemptId!), formData);
      } else {
        if (mediaFile === null || mediaUrl === null || mediaUrl === '') {
          setAnswerMediaFiles(prev => {
            const copy = { ...prev };
            delete copy[questionId];
            return copy;
          });
          setAnswerMediaUrls(prev => {
            const copy = { ...prev };
            delete copy[questionId];
            return copy;
          });
        }
        await testAttemptService.submitAnswer(parseInt(attemptId!), { question_id: questionId, answer_text: answerText });
      }
    } catch (error) {
      console.error('Error saving answer:', error);
    } finally {
      setSavingAnswer(false);
    }
  };

  // ---- Submit ----
  const handleSubmitTest = async (_auto = false) => {
    try {
      await testAttemptService.submitTest(parseInt(attemptId!));
      exitFullscreen();
      faceDetection.stopCamera();
      navigate(`/test-attempts/${attemptId}/results`);
    } catch (error) {
      console.error('Error submitting test:', error);
    }
  };

  // ---- Format Time ----
  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '0:00';
    const totalSecs = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const durationMins = attempt?.test?.duration_minutes;
  const isTimed = Boolean(typeof durationMins === 'number' && durationMins > 0);
  const isTimeWarning = Boolean(isTimed && timeRemaining !== null && timeRemaining < 300 && timeRemaining > 0);
  const isTimeCritical = Boolean(isTimed && timeRemaining !== null && timeRemaining < 60 && timeRemaining > 0);

  const hasAnswerForQuestion = (questionId: number) => {
    const answerText = answers[questionId];
    const hasText = typeof answerText === 'string' && answerText.trim().length > 0;
    const hasMedia = Boolean(answerMediaUrls[questionId] || answerMediaFiles[questionId]);
    return hasText || hasMedia;
  };

  const getQuestionStatusClass = (questionId: number, idx: number) => {
    const isActive = idx === currentQuestionIndex;
    const isAnswered = hasAnswerForQuestion(questionId);
    const isMarkedForReview = reviewQuestionIds.has(questionId);
    const isVisited = visitedQuestionIds.has(questionId);

    if (isActive) {
      return 'bg-saBlue text-white ring-2 ring-saBlue/40 ring-offset-2 scale-105 shadow-md shadow-saBlue/25';
    }
    if (isMarkedForReview) {
      return 'bg-saVividOrange text-white hover:bg-saOrangeDark shadow-sm shadow-orange-500/20';
    }
    if (isAnswered) {
      return 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-xs';
    }
    if (isVisited) {
      return 'bg-rose-500 text-white hover:bg-rose-600 shadow-xs';
    }
    return 'bg-slate-100 text-slate-600 hover:bg-slate-200';
  };

  const toggleMarkForReview = (questionId: number) => {
    setReviewQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // ---- Loading State ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFD] flex flex-col items-center justify-center gap-5 p-6">
        <img
          src="/studyasan-logo.png"
          alt="StudyAsan"
          className="h-10 sm:h-12 w-auto object-contain"
        />
        <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-semibold text-sm">Preparing your test environment...</p>
      </div>
    );
  }

  if (!attempt || !attempt.test?.questions) {
    return (
      <div className="min-h-screen bg-[#F8FAFD] flex flex-col items-center justify-center gap-5 p-6">
        <img
          src="/studyasan-logo.png"
          alt="StudyAsan"
          className="h-10 sm:h-12 w-auto object-contain mb-2"
        />
        <FileText className="w-16 h-16 text-gray-300" />
        <p className="text-gray-700 font-semibold text-base">Test not found</p>
        <Button
          variant="outline"
          onClick={() => navigate('/tests')}
          className="border-saBlue text-saBlue hover:bg-saBlueSubtle rounded-xl font-bold"
        >
          Back to Tests
        </Button>
      </div>
    );
  }

  if (attempt.submitted_at) {
    return (
      <div className="min-h-screen bg-[#F8FAFD] flex flex-col items-center justify-center gap-6 p-6 text-center">
        <img
          src="/studyasan-logo.png"
          alt="StudyAsan"
          className="h-11 w-auto object-contain mb-2"
        />
        <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center shadow-md shadow-green-100">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-800 tracking-tight">Test Submitted!</h2>
          <p className="text-gray-500 text-sm max-w-md mt-1 leading-relaxed">
            Your answers have been securely recorded. Results will be available once grading is complete.
          </p>
        </div>
        <Button
          onClick={() => navigate(`/test-attempts/${attemptId}/results`)}
          className="bg-saBlue hover:bg-saBlueDarkHover text-white px-8 py-2.5 rounded-2xl font-bold shadow-lg shadow-saBlue/25 text-sm"
        >
          View Results
        </Button>
      </div>
    );
  }

  // ---- Auto-submitting overlay ----
  if (autoSubmitting) {
    return (
      <div className="min-h-screen bg-[#F8FAFD] flex flex-col items-center justify-center gap-6 p-6 text-center">
        <img
          src="/studyasan-logo.png"
          alt="StudyAsan"
          className="h-11 w-auto object-contain mb-2"
        />
        <div className="w-20 h-20 rounded-3xl bg-red-100 flex items-center justify-center animate-pulse shadow-md shadow-red-100">
          <ShieldAlert className="w-10 h-10 text-red-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-800">Test Auto-Submitted</h2>
          <p className="text-gray-500 text-sm max-w-md mt-1 leading-relaxed">
            Your test has been automatically submitted due to reaching <strong>{maxViolations} violations</strong>.
          </p>
        </div>
        <div className="w-8 h-8 border-3 border-saBlue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const questions = attempt.test.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const answerableQuestions = questions;
  const answeredCount = answerableQuestions.filter((q) => hasAnswerForQuestion(q.id)).length;
  const reviewCount = questions.filter((q) => reviewQuestionIds.has(q.id)).length;
  const progress = answerableQuestions.length > 0 ? (answeredCount / answerableQuestions.length) * 100 : 100;
  const submitBg = isPractice ? 'bg-saVividOrange hover:bg-saOrangeDark' : 'bg-saBlue hover:bg-saBlueDarkHover';

  return (
    <div className="min-h-screen bg-[#F8FAFD] text-gray-800 select-none" style={{ userSelect: 'none' }}>
      {/* Fullscreen Gate Modal (Only shown for official exams upon initial entry, NEVER in practice mode or during file upload) */}
      {!isPractice && !hasStartedExam && !isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm mb-4">
            <img src="/studyasan-logo.png" alt="StudyAsan" className="h-9 sm:h-11 w-auto object-contain" />
          </div>
          <div className="w-16 h-16 rounded-3xl bg-saBlue/20 border border-saBlue/40 flex items-center justify-center text-saBlue mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Secure Examination Mode</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            {attempt.test.title}
            <br />
            Please click below to enter distraction-free fullscreen mode and begin your test.
          </p>
          <Button
            onClick={() => {
              setHasStartedExam(true);
              enterFullscreen();
            }}
            className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-2xl px-8 py-3 text-sm font-bold shadow-xl shadow-saBlue/30 flex items-center gap-2 transform active:scale-95 transition-all"
          >
            <Eye className="w-4 h-4" /> Enter Fullscreen & Start
          </Button>
        </div>
      )}

      {/* Confirm Submit Modal */}
      <ConfirmModal
        open={confirmSubmit}
        title="Submit Test"
        description={`You have answered ${answeredCount} out of ${answerableQuestions.length} questions. ${answeredCount < answerableQuestions.length ? `⚠️ ${answerableQuestions.length - answeredCount} question(s) are unanswered.` : ''} Are you sure you want to submit?`}
        onConfirm={() => { setConfirmSubmit(false); handleSubmitTest(); }}
        onClose={() => setConfirmSubmit(false)}
        confirmText="Submit"
        cancelText="Continue Test"
      />

      {/* Violation Top Banner */}
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ${showViolationBanner ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <span className="text-sm font-medium text-center">{violationMessage}</span>
          <button onClick={() => setShowViolationBanner(false)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Violation Log Modal */}
      {showViolationLog && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Proctoring Warnings</h3>
                  <p className="text-[11px] text-gray-500">{violations.length} of {maxViolations} warnings recorded</p>
                </div>
              </div>
              <button
                onClick={() => setShowViolationLog(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 max-h-60 overflow-y-auto space-y-2">
              {violations.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No violations recorded.</p>
              ) : (
                violations.map((v, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-red-50/60 border border-red-100 text-xs">
                    <div className="flex items-center justify-between text-red-800 font-semibold mb-0.5">
                      <span>Warning #{i + 1}</span>
                      <span className="text-[10px] text-red-500 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-600 text-[11px]">{v.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowViolationLog(false)}
                className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs px-4 font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============== TOP BAR ============== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-saBlue border-b border-saBlueDarkHover shadow-sm text-white">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2">
          {/* Left: Mobile menu toggle + StudyAsan Logo + Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="lg:hidden p-1.5 -ml-1 rounded-xl text-white hover:bg-white/15 transition-colors"
              onClick={() => setShowDrawer(!showDrawer)}
              title="Toggle question panel"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <img
                src="/studyasan-logo.png"
                alt="StudyAsan"
                className="h-7 sm:h-8 w-auto object-contain hidden sm:block"
              />
              <img
                src="/studyasan-logo-lady.png"
                alt="StudyAsan"
                className="h-7 w-7 object-contain sm:hidden"
              />
              <div className="hidden md:block h-5 w-px bg-white/20 mx-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-bold text-white truncate max-w-[110px] sm:max-w-[200px] md:max-w-[320px]">
                  {attempt.test.title}
                </h1>
                {isPractice && (
                  <span className="text-[10px] font-bold bg-saVividOrange text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                    Practice Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-100 hidden sm:block font-medium">
                Q {currentQuestionIndex + 1}/{questions.length} · {answeredCount}/{answerableQuestions.length} answered
              </p>
            </div>
          </div>

          {/* Center: Timer */}
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full font-mono text-sm sm:text-base font-bold transition-all border
            ${isTimeCritical
              ? 'bg-red-600 text-white border-red-400 animate-pulse shadow-sm'
              : isTimeWarning
              ? 'bg-saVividOrange text-white border-saOrangeLight animate-pulse shadow-sm'
              : 'bg-white text-saBlue border-white/40 shadow-sm'}`}>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>
              {isTimed
                ? formatTime(timeRemaining ?? (durationMins ? durationMins * 60 : 0))
                : formatTime(elapsedSeconds)}
            </span>
            {isTimed && durationMins && durationMins > 0 ? (
              <span className={`text-[10px] sm:text-[11px] font-sans font-bold tracking-wide px-1.5 sm:px-2 py-0.5 rounded-md border ${
                isTimeCritical || isTimeWarning
                  ? 'bg-white/20 text-white border-white/30'
                  : 'bg-saBlueSubtle text-saBlue border-saBlue/20'
              }`}>
                / {durationMins}m
              </span>
            ) : (
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-saBlue bg-saBlueSubtle px-1.5 py-0.5 rounded border border-saBlue/20">
                Elapsed
              </span>
            )}
            {isTimeWarning && <AlertTriangle className="w-3.5 h-3.5 text-white hidden sm:inline" />}
          </div>

          {/* Right: Fullscreen + Violations + Camera Status + Submit */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              className="hidden sm:flex rounded-xl text-xs font-bold border-white/30 text-white hover:bg-white/15 hover:text-white items-center gap-1 bg-white/10"
            >
              <span>{isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}</span>
            </Button>

            {/* Violation Counter */}
            {violations.length > 0 && (
              <button
                onClick={() => setShowViolationLog(!showViolationLog)}
                className="relative p-1.5 sm:p-2 rounded-xl bg-saVividOrange text-white border border-white/30 hover:bg-saOrangeDark transition-colors"
                title="View violation warnings"
              >
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-red-600 rounded-full text-[10px] font-bold flex items-center justify-center text-white border border-white">
                  {violations.length}/{maxViolations}
                </span>
              </button>
            )}

            {/* Camera Status */}
            {attempt && !attempt.submitted_at && (
              <div
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-all ${
                  faceDetection.faceStatus === 'ok'
                    ? 'bg-white/15 text-white border-white/25'
                    : faceDetection.faceStatus === 'not_looking'
                    ? 'bg-saVividOrange text-white border-white/40 animate-pulse'
                    : faceDetection.faceStatus === 'no_face'
                    ? 'bg-red-600 text-white border-white/40 animate-pulse'
                    : 'bg-white/10 text-white/80 border-white/20'
                }`}
                title={
                  faceDetection.faceStatus === 'ok'
                    ? 'Proctoring Active — Looking at screen'
                    : faceDetection.faceStatus === 'not_looking'
                    ? 'Please look directly at the screen!'
                    : faceDetection.faceStatus === 'no_face'
                    ? 'No face detected in camera'
                    : 'Proctoring checking...'
                }
              >
                {faceDetection.cameraActive ? (
                  faceDetection.faceStatus === 'ok' ? (
                    <Camera className="w-3.5 h-3.5 text-white flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-white flex-shrink-0" />
                  )
                ) : (
                  <CameraOff className="w-3.5 h-3.5 text-red-200 flex-shrink-0" />
                )}
                <span className="hidden md:inline font-bold">
                  {faceDetection.cameraActive
                    ? faceDetection.faceStatus === 'ok'
                      ? 'Looking at screen'
                      : faceDetection.faceStatus === 'not_looking'
                      ? 'Look at screen!'
                      : faceDetection.faceStatus === 'no_face'
                      ? 'No face detected'
                      : 'Detecting...'
                    : 'Camera Off'}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={() => setConfirmSubmit(true)}
              className={`${
                isPractice
                  ? 'bg-saVividOrange hover:bg-saOrangeDark text-white'
                  : 'bg-white hover:bg-blue-50 text-saBlue'
              } text-xs sm:text-sm px-3 sm:px-5 h-8 sm:h-9 rounded-xl font-bold shadow-sm transition-all`}
              size="sm"
            >
              <Send className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Submit</span>
            </Button>
          </div>
        </div>

        {/* Progress bar below header */}
        <div className="h-[3px] bg-black/20">
          <div
            className="h-full bg-saVividOrange transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN LAYOUT
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex pt-[55px] sm:pt-[59px] min-h-screen">

        {/* ── Mobile backdrop ─────────────────────────────────────────── */}
        {showDrawer && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs"
            onClick={() => setShowDrawer(false)}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════
            SIDEBAR (Desktop fixed, Mobile drawer)
        ══════════════════════════════════════════════════════════════ */}
        <aside className={`
          fixed lg:sticky top-[55px] sm:top-[59px] left-0 z-40 h-[calc(100vh-55px)] sm:h-[calc(100vh-59px)]
          w-[280px] bg-white border-r border-gray-200 shadow-xl lg:shadow-none
          flex flex-col overflow-hidden transition-transform duration-300 lg:translate-x-0
          ${showDrawer ? 'translate-x-0' : '-translate-x-full'}
        `}>

          {/* Mobile drawer header */}
          <div className="lg:hidden flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 bg-gray-50/80">
            <div className="flex items-center gap-2">
              <img src="/studyasan-logo.png" alt="StudyAsan" className="h-6 w-auto object-contain" />
              <span className="text-xs font-bold text-gray-700">Question Panel</span>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera proctoring section */}
          {attempt && !attempt.submitted_at && (
            <div className="px-3 pt-3 pb-2.5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Proctoring</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  faceDetection.faceStatus === 'ok'
                    ? 'bg-saBlueSubtle text-saBlue border-saBlue/30'
                    : faceDetection.faceStatus === 'not_looking'
                    ? 'bg-saOrangeSubtle text-saOrangeDark border-saVividOrange/50 animate-pulse'
                    : faceDetection.faceStatus === 'no_face'
                    ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                    : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    faceDetection.faceStatus === 'ok' ? 'bg-saBlue animate-pulse' :
                    faceDetection.faceStatus === 'not_looking' ? 'bg-saVividOrange animate-pulse' :
                    faceDetection.faceStatus === 'no_face' ? 'bg-red-500 animate-pulse' :
                    'bg-yellow-500'
                  }`} />
                  {faceDetection.faceStatus === 'ok' ? 'Active' :
                   faceDetection.faceStatus === 'not_looking' ? 'Look at screen' :
                   faceDetection.faceStatus === 'no_face' ? 'No face' : 'Starting...'}
                </span>
              </div>

              {/* Video feed */}
              <div className={`relative rounded-2xl overflow-hidden bg-slate-900 border-2 transition-colors duration-500 ${
                faceDetection.faceStatus === 'ok' ? 'border-saBlue/60' :
                faceDetection.faceStatus === 'not_looking' ? 'border-saVividOrange' :
                faceDetection.faceStatus === 'no_face' ? 'border-red-500/70' :
                'border-slate-600/30'
              }`} style={{ aspectRatio: '4/3' }}>
                <video
                  ref={faceDetection.videoRef}
                  className="w-full h-full object-cover scale-x-[-1]"
                  autoPlay muted playsInline
                />
                <canvas ref={faceDetection.canvasRef} className="hidden" />

                {!faceDetection.cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900 p-3 text-center">
                    <CameraOff className="w-6 h-6 text-red-400" />
                    <p className="text-[10px] text-slate-400 leading-tight">{faceDetection.cameraError || 'Camera permission required'}</p>
                    <button
                      type="button"
                      onClick={() => faceDetection.startCamera()}
                      className="px-3 py-1 bg-saBlue hover:bg-saBlueDarkHover text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm"
                    >
                      Allow Camera
                    </button>
                  </div>
                )}

                {faceDetection.cameraActive && faceDetection.faceStatus !== 'checking' && (
                  <div className={`absolute bottom-0 inset-x-0 py-1.5 text-center text-[10px] font-bold ${
                    faceDetection.faceStatus === 'ok'
                      ? 'bg-saBlue/90 text-white'
                      : faceDetection.faceStatus === 'not_looking'
                      ? 'bg-saVividOrange/95 text-white animate-pulse'
                      : 'bg-red-600/90 text-white animate-pulse'
                  }`}>
                    {faceDetection.faceStatus === 'ok'
                      ? '✓ Looking at screen'
                      : faceDetection.faceStatus === 'not_looking'
                      ? '⚠ Please look at the screen!'
                      : '⚠ No face detected!'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Violation bar in sidebar */}
          {violations.length > 0 && (
            <div
              className={`mx-3 mt-2 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer border transition-colors ${
                violations.length >= maxViolations
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-saOrangeSubtle text-saOrangeDark border-saVividOrange/30'
              }`}
              onClick={() => setShowViolationLog(true)}
            >
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{violations.length} violation{violations.length !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-[10px] opacity-60 font-medium">{violations.length}/{maxViolations}</span>
            </div>
          )}

          {/* Question legend + grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Questions</p>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3">
              {[
                { color: 'bg-saBlue', label: 'Current' },
                { color: 'bg-emerald-500', label: 'Answered' },
                { color: 'bg-saVividOrange', label: 'Review' },
                { color: 'bg-rose-500', label: 'Unanswered' },
                { color: 'bg-slate-200', label: 'Not visited' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  {label}
                </div>
              ))}
            </div>

            {/* Grid — 6 cols */}
            <div className="grid grid-cols-6 gap-1.5">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => { setCurrentQuestionIndex(idx); setShowDrawer(false); }}
                  className={`w-full aspect-square rounded-lg text-xs font-bold transition-all hover:scale-105 ${getQuestionStatusClass(q.id, idx)}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar footer: progress stats */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/60 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">Answered</span>
              <span className="text-saBlue font-bold">{answeredCount}/{answerableQuestions.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-500 font-medium">For Review</span>
              <span className="text-saVividOrange font-bold">{reviewCount}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-saBlue rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════
            MAIN CONTENT
        ══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 lg:px-8 py-5">
            <div className="max-w-3xl mx-auto space-y-4">

              {/* Case Study parent paragraph */}
              {currentQuestion.parent_id && (() => {
                const parent = questions.find(q => q.id === currentQuestion.parent_id);
                if (!parent) return null;
                return (
                  <div className="bg-saBlueSubtle border border-saBlue/20 rounded-2xl p-4 sm:p-5 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-saBlue text-white px-2 py-0.5 rounded-full">Case Study</span>
                      <span className="text-xs text-saBlue/70 font-medium">Read the context below</span>
                    </div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      <MathRenderer text={parent.question_text} />
                    </div>
                  </div>
                );
              })()}

              {/* ── Question Card ──────────────────────────────────── */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden">

                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-saBlueSubtle/40">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-saBlue text-white text-sm font-black shadow-sm shadow-saBlue/30">
                      {currentQuestionIndex + 1}
                    </span>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </p>
                      <span className="inline-flex items-center mt-0.5 text-[10px] font-bold bg-saBlueSubtle text-saBlue border border-saBlue/20 px-2 py-0.5 rounded-full">
                        {currentQuestion.question_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-xs font-bold bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30 px-3 py-1 rounded-full">
                    {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Card body */}
                <div className="p-4 sm:p-6 space-y-5">

                  {/* Question text */}
                  <div className="text-base sm:text-[17px] font-medium text-gray-800 leading-relaxed border-l-4 border-saBlue/40 pl-3.5">
                    <MathRenderer text={currentQuestion.question_text} />
                  </div>

                  {/* Question media */}
                  {currentQuestion.media_url && (
                    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                      {currentQuestion.media_type === 'image' && (
                        <img src={currentQuestion.media_url} alt="Question" className="max-w-full max-h-80 mx-auto" />
                      )}
                      {currentQuestion.media_type === 'pdf' && (
                        <div className="flex items-center gap-3 p-4">
                          <FileText className="w-7 h-7 text-red-500" />
                          <a href={currentQuestion.media_url} target="_blank" rel="noopener noreferrer" className="text-saBlue hover:underline text-sm font-semibold">View PDF Document</a>
                        </div>
                      )}
                      {currentQuestion.media_type === 'video' && (
                        <video src={currentQuestion.media_url} controls className="max-w-full max-h-80 mx-auto rounded" />
                      )}
                    </div>
                  )}

                  {/* ── Case Study Response ── */}
                  {currentQuestion.question_type === 'CASE_STUDY' && (
                    <div className="space-y-4">
                      <div className="bg-saBlueSubtle border border-saBlue/20 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-saBlue/15 flex items-center justify-center text-saBlue shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-slate-700 leading-relaxed">
                          <p className="font-bold text-slate-900 text-sm mb-0.5">Case Study Response</p>
                          <p className="text-slate-500">Review the scenario above, then write your detailed analysis below.</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-gray-400 font-medium px-1">
                          <span>Your Written Response</span>
                          <span>{answers[currentQuestion.id]?.length || 0} chars</span>
                        </div>
                        <textarea
                          value={answers[currentQuestion.id] || ''}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                          className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-saBlue/30 focus:border-saBlue resize-y transition-all min-h-[180px] text-sm leading-relaxed"
                          rows={8}
                          placeholder="Write your response here..."
                        />
                      </div>
                      <MediaUpload
                        key={`media-${currentQuestion.id}`}
                        label="Upload Supporting Document (Optional)"
                        value={answerMediaUrls[currentQuestion.id]}
                        onChange={(file, url) => {
                          if (file || url) {
                            handleAnswerChange(currentQuestion.id, answers[currentQuestion.id] || '', file, url);
                          } else {
                            handleAnswerChange(currentQuestion.id, answers[currentQuestion.id] || '', null, null);
                          }
                        }}
                        acceptTypes="image/*,application/pdf"
                        maxSize={10}
                      />
                    </div>
                  )}

                  {/* ── MCQ Options ── */}
                  {currentQuestion.question_type === 'MCQ' && currentQuestion.options && (
                    <div className="space-y-2.5">
                      {(currentQuestion.options as any[]).map((option, index) => {
                        const optionText = typeof option === 'string' ? option : option?.text || '';
                        const optionMediaUrl = typeof option === 'object' ? option?.media_url : null;
                        const optionMediaType = typeof option === 'object' ? option?.media_type : null;
                        const letter = String.fromCharCode(65 + index);
                        const isSelected = answers[currentQuestion.id] === letter;
                        return (
                          <label
                            key={index}
                            className={`flex flex-col p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                              isSelected
                                ? 'bg-saBlueSubtle border-saBlue shadow-sm shadow-saBlue/10'
                                : 'bg-white border-gray-200 hover:border-saBlue/40 hover:bg-saBlueSubtle/40'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 transition-all ${
                                isSelected ? 'bg-saBlue text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                              }`}>
                                {letter}
                              </div>
                              <span className={`flex-1 text-sm leading-relaxed ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                                <MathRenderer text={optionText} inline={true} />
                              </span>
                              <input type="radio" name={`q-${currentQuestion.id}`} value={letter} checked={isSelected}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="sr-only" />
                              {isSelected && <CheckCircle className="w-5 h-5 text-saBlue flex-shrink-0" />}
                            </div>
                            {optionMediaUrl && optionMediaType === 'image' && (
                              <img src={optionMediaUrl} alt={`Option ${letter}`} className="mt-3 ml-12 max-w-xs max-h-32 rounded-xl border border-gray-200" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* ── True / False ── */}
                  {currentQuestion.question_type === 'TRUE_FALSE' && (
                    <div className="grid grid-cols-2 gap-3">
                      {['True', 'False'].map((option) => {
                        const isSelected = answers[currentQuestion.id] === option;
                        return (
                          <label
                            key={option}
                            className={`flex items-center justify-center gap-2.5 p-5 rounded-2xl cursor-pointer transition-all border-2 text-base font-bold ${
                              isSelected
                                ? 'bg-saBlueSubtle border-saBlue text-saBlue shadow-sm'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-saBlue/40 hover:bg-saBlueSubtle/30'
                            }`}
                          >
                            <input type="radio" name={`q-${currentQuestion.id}`} value={option} checked={isSelected}
                              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)} className="sr-only" />
                            {isSelected && <CheckCircle className="w-5 h-5 text-saBlue" />}
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Match the Following ── */}
                  {currentQuestion.question_type === 'MATCH_THE_FOLLOWING' && (() => {
                    let pairs: { left: string; right: string }[] = [];
                    try {
                      const rawOptions = typeof currentQuestion.options === 'string'
                        ? JSON.parse(currentQuestion.options)
                        : (currentQuestion.options as any || []);
                      if (Array.isArray(rawOptions)) {
                        pairs = rawOptions.map(opt => {
                          if (typeof opt === 'string') { try { return JSON.parse(opt); } catch { return { left: '', right: '' }; } }
                          return opt;
                        });
                      }
                    } catch { }
                    let currentAnswer: { left: string; right: string }[] = [];
                    try { currentAnswer = answers[currentQuestion.id] ? JSON.parse(answers[currentQuestion.id]!) : []; } catch { }
                    return (
                      <MatchTheFollowingInteractive
                        pairs={pairs}
                        currentAnswer={currentAnswer}
                        onAnswerChange={(newAnswer) => handleAnswerChange(currentQuestion.id, JSON.stringify(newAnswer))}
                      />
                    );
                  })()}

                  {/* ── Short / Long Answer ── */}
                  {(currentQuestion.question_type === 'SHORT_ANSWER' || currentQuestion.question_type === 'LONG_ANSWER') && (
                    <div className="space-y-4">
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-saBlue/30 focus:border-saBlue resize-y transition-all text-sm leading-relaxed"
                        rows={currentQuestion.question_type === 'LONG_ANSWER' ? 8 : 4}
                        placeholder="Type your answer here..."
                      />
                      <MediaUpload
                        key={`media-${currentQuestion.id}`}
                        label="Upload Answer Media (Optional)"
                        value={answerMediaUrls[currentQuestion.id]}
                        onChange={(file, url) => {
                          if (file || url) {
                            handleAnswerChange(currentQuestion.id, answers[currentQuestion.id] || '', file, url);
                          } else {
                            handleAnswerChange(currentQuestion.id, answers[currentQuestion.id] || '', null, null);
                          }
                        }}
                        acceptTypes="image/*,application/pdf"
                        maxSize={10}
                      />
                    </div>
                  )}

                  {/* Auto-save indicator */}
                  {savingAnswer && (
                    <div className="flex items-center gap-2 text-xs text-saBlue/70 font-medium">
                      <div className="w-3 h-3 border-2 border-saBlue/30 border-t-saBlue rounded-full animate-spin" />
                      Saving answer...
                    </div>
                  )}

                </div>
              </div>

              {/* ── Navigation Row ──────────────────────────────────── */}
              <div className="flex items-center justify-between gap-2 pb-6">

                {/* Previous */}
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="border-gray-300 text-gray-700 hover:bg-saBlueSubtle hover:border-saBlue hover:text-saBlue disabled:opacity-30 rounded-xl font-semibold"
                >
                  <ChevronLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                {/* Mark Review */}
                <Button
                  variant="outline"
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={`rounded-xl font-semibold ${
                    reviewQuestionIds.has(currentQuestion.id)
                      ? 'border-saVividOrange bg-saOrangeSubtle text-saOrangeDark hover:bg-saOrangeSubtle'
                      : 'border-gray-300 text-gray-700 hover:bg-saOrangeSubtle hover:border-saVividOrange hover:text-saOrangeDark'
                  }`}
                >
                  <Flag className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">
                    {reviewQuestionIds.has(currentQuestion.id) ? 'Review Marked' : 'Mark Review'}
                  </span>
                </Button>

                {/* Mobile question strip */}
                <div className="flex gap-1 overflow-x-auto px-1 lg:hidden max-w-[35vw] sm:max-w-[45vw]" style={{ scrollbarWidth: 'none' }}>
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold flex-shrink-0 transition-all ${getQuestionStatusClass(q.id, idx)}`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Next / Submit Test */}
                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={() => setConfirmSubmit(true)}
                    className={`${submitBg} text-white rounded-xl font-bold shadow-sm`}
                  >
                    <Send className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Submit Test</span>
                    <span className="sm:hidden">Submit</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl font-bold shadow-sm"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4 sm:ml-1" />
                  </Button>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
