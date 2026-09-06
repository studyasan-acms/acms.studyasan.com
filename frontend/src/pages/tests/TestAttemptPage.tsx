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
// Face Detection Hook (Frontend only — uses simple canvas analysis)
// ============================================================
function useFaceDetection(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'ok' | 'no_face' | 'checking' | 'error'>('checking');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const consecutiveNoFaceRef = useRef(0);
  const onViolationRef = useRef<((v: Violation) => void) | null>(null);

  const startCamera = useCallback(async () => {
    if (!enabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError('Camera access denied. Please allow camera access for proctoring.');
      setCameraActive(false);
    }
  }, [enabled]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Simple skin-tone based face detection using canvas pixel analysis
  const detectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    const imageData = ctx.getImageData(0, 0, 160, 120);
    const data = imageData.data;

    // Count skin-tone pixels in center region
    let skinPixels = 0;
    let totalCenter = 0;
    const centerX1 = 40, centerX2 = 120, centerY1 = 20, centerY2 = 100;

    for (let y = centerY1; y < centerY2; y++) {
      for (let x = centerX1; x < centerX2; x++) {
        const i = (y * 160 + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];

        // Skin tone detection (works across skin tones)
        const isSkin = (
          r > 60 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 10 &&
          r - b > 15 &&
          (r - g) < 130
        );

        if (isSkin) skinPixels++;
        totalCenter++;
      }
    }

    const skinRatio = skinPixels / totalCenter;

    // If > 8% skin-tone pixels in center region, consider face detected
    if (skinRatio > 0.08) {
      setFaceStatus('ok');
      consecutiveNoFaceRef.current = 0;
    } else {
      consecutiveNoFaceRef.current++;
      // Only flag after 5 consecutive misses (5 seconds)
      if (consecutiveNoFaceRef.current >= 5) {
        setFaceStatus('no_face');
        if (onViolationRef.current) {
          onViolationRef.current({
            type: 'face_not_detected',
            timestamp: new Date(),
            message: 'Face not detected — please look at the screen',
          });
        }
        consecutiveNoFaceRef.current = 0; // Reset to avoid flooding
      }
    }
  }, [cameraActive]);

  useEffect(() => {
    if (enabled) startCamera();
    return () => stopCamera();
  }, [enabled, startCamera, stopCamera]);

  useEffect(() => {
    if (cameraActive) {
      intervalRef.current = setInterval(detectFace, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cameraActive, detectFace]);

  return { videoRef, canvasRef, cameraActive, faceStatus, cameraError, onViolationRef, stopCamera };
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
  const [enforceWarningAttempts, setEnforceWarningAttempts] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const violationCountRef = useRef(0);
  const hasAutoSubmittedRef = useRef(false);

  // Face Detection
  const faceDetection = useFaceDetection(true);

  const addViolation = useCallback((violation: Violation) => {
    if (!enforceWarningAttempts) {
      return; // Don't track violations if enforcement is disabled
    }
    setViolations(prev => {
      const updated = [...prev, violation];
      violationCountRef.current = updated.length;
      return updated;
    });
    setViolationMessage(
      violationCountRef.current + 1 >= maxViolations
        ? `⛔ Final warning! Test will be auto-submitted. (${violation.message})`
        : `⚠️ Warning ${violationCountRef.current + 1}/${maxViolations}: ${violation.message}`
    );
    setShowViolationBanner(true);
    setTimeout(() => setShowViolationBanner(false), 4000);
  }, [maxViolations, enforceWarningAttempts]);

  // Auto-submit after configured max violations
  useEffect(() => {
    if (violations.length >= maxViolations && !hasAutoSubmittedRef.current && !autoSubmitting) {
      hasAutoSubmittedRef.current = true;
      setAutoSubmitting(true);
      // Small delay so the user sees the final warning
      setTimeout(() => {
        handleSubmitTest(true);
      }, 1500);
    }
  }, [violations, autoSubmitting, maxViolations]);

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
      if (!isFs && !attempt?.submitted_at && attempt && !attempt.is_practice) {
        addViolation({ type: 'fullscreen_exit', timestamp: new Date(), message: 'Fullscreen exited — return to fullscreen mode.' });
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
  }, [attempt, addViolation]);


  // ---- Screen Lock: Visibility / Tab Switch ----
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !attempt?.submitted_at) {
        addViolation({ type: 'tab_switch', timestamp: new Date(), message: 'Tab switch detected — stay on this page!' });
      }
    };
    const handleBlur = () => {
      if (!attempt?.submitted_at) {
        addViolation({ type: 'tab_switch', timestamp: new Date(), message: 'Window focus lost — stay on this page!' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [attempt, addViolation]);

  // ---- Screen Lock: Keyboard Shortcuts ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (attempt?.submitted_at) return;
      if (
        (e.ctrlKey && ['c', 'v', 'a', 'p', 'u', 's'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
        e.key === 'PrintScreen'
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
    const preventContext = (e: MouseEvent) => { e.preventDefault(); };
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      addViolation({ type: 'copy_attempt', timestamp: new Date(), message: 'Copy attempt blocked' });
    };
    const preventPaste = (e: ClipboardEvent) => { e.preventDefault(); };
    document.addEventListener('contextmenu', preventContext);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventPaste);
    return () => {
      document.removeEventListener('contextmenu', preventContext);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventPaste);
    };
  }, [addViolation]);

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
      const enforceWarnings = (response.data.test as any)?.enforce_warning_attempts ?? true;
      setEnforceWarningAttempts(enforceWarnings);

      const durationMins = response.data.test?.duration_minutes;
      const isTimed = !response.data.is_practice && typeof durationMins === 'number' && durationMins > 0;

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
    const isTimed = !attempt.is_practice && typeof durationMins === 'number' && durationMins > 0;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);

      if (isTimed) {
        setTimeRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(timer);
            if (!hasAutoSubmittedRef.current && !autoSubmitting) {
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
  }, [attempt, autoSubmitting]);

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

  const isTimed = Boolean(!attempt?.is_practice && attempt?.test?.duration_minutes && attempt.test.duration_minutes > 0);
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
      return 'bg-saBlue text-white ring-2 ring-blue-300 ring-offset-2 scale-105';
    }
    if (isMarkedForReview) {
      return 'bg-amber-500 text-white hover:bg-amber-600';
    }
    if (isAnswered) {
      return 'bg-green-500 text-white hover:bg-green-600';
    }
    if (isVisited) {
      return 'bg-red-500 text-white hover:bg-red-600';
    }
    return 'bg-gray-100 text-gray-500 hover:bg-gray-200';
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 border-4 border-saBlue border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading your test...</p>
      </div>
    );
  }

  if (!attempt || !attempt.test?.questions) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <FileText className="w-16 h-16 text-gray-300" />
        <p className="text-gray-500">Test not found</p>
        <Button variant="outline" onClick={() => navigate('/tests')}>Back to Tests</Button>
      </div>
    );
  }

  if (attempt.submitted_at) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-14 h-14 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Test Submitted!</h2>
        <p className="text-gray-500 text-center max-w-md">Your answers have been recorded. Results will be available once grading is complete.</p>
        <Button onClick={() => navigate(`/test-attempts/${attemptId}/results`)} className="bg-saBlue hover:bg-saBlueDarkHover text-white px-8 py-3 text-lg">
          View Results
        </Button>
      </div>
    );
  }

  // ---- Auto-submitting overlay ----
  if (autoSubmitting) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center animate-pulse">
          <ShieldAlert className="w-14 h-14 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Test Auto-Submitted</h2>
        <p className="text-gray-500 text-center max-w-md">
          Your test has been automatically submitted due to <strong>{maxViolations} violations</strong>.
        </p>
        <div className="w-10 h-10 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const questions = attempt.test.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const answerableQuestions = questions.filter(q => q.question_type !== 'CASE_STUDY');
  const answeredCount = answerableQuestions.filter((q) => hasAnswerForQuestion(q.id)).length;
  const reviewCount = questions.filter((q) => reviewQuestionIds.has(q.id)).length;
  const progress = answerableQuestions.length > 0 ? (answeredCount / answerableQuestions.length) * 100 : 100;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 select-none" style={{ userSelect: 'none' }}>
      {/* Fullscreen Gate Modal (Ensures proper browser user gesture to lock fullscreen) */}
      {!isFullscreen && !attempt.is_practice && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white select-none">
          <div className="w-16 h-16 rounded-3xl bg-[#0276D3]/20 border border-[#0276D3]/40 flex items-center justify-center text-[#0276D3] mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Secure Examination Mode</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
            {attempt.test.title}
            <br />
            Please click below to enter distraction-free fullscreen mode and begin your test.
          </p>
          <Button
            onClick={enterFullscreen}
            className="bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-2xl px-8 py-3 text-sm font-bold shadow-xl shadow-[#0276D3]/30 flex items-center gap-2 transform active:scale-95 transition-all"
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

      {/* Violation Banner */}
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ${showViolationBanner ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <span className="text-sm font-medium text-center">{violationMessage}</span>
          <button onClick={() => setShowViolationBanner(false)} className="ml-2 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============== TOP BAR ============== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5">
          {/* Left: Menu + Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setShowDrawer(!showDrawer)}>
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-gray-800 truncate">{attempt.test.title}</h1>
                {attempt.is_practice && (
                  <span className="text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">Practice Mode</span>
                )}
              </div>
              <p className="text-xs text-gray-400 hidden sm:block">
                Q {currentQuestionIndex + 1}/{questions.length} · {answeredCount}/{answerableQuestions.length} answered
              </p>
            </div>
          </div>

          {/* Center: Timer */}
          <div className={`flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-mono text-base sm:text-lg font-bold transition-all
            ${isTimeCritical ? 'bg-red-600 text-white animate-pulse' : isTimeWarning ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>
              {isTimed
                ? formatTime(timeRemaining ?? (attempt.test?.duration_minutes ? attempt.test.duration_minutes * 60 : 0))
                : formatTime(elapsedSeconds)}
            </span>
            {!isTimed && (
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-slate-500 bg-white/70 px-1.5 py-0.5 rounded">
                Elapsed
              </span>
            )}
            {isTimeWarning && <AlertTriangle className="w-4 h-4" />}
          </div>

          {/* Right: Proctoring + Fullscreen + Submit */}
          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              className="hidden sm:flex rounded-xl text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-100 items-center gap-1"
            >
              <span>{isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}</span>
            </Button>

            {/* Violation Counter */}
            {violations.length > 0 && (
              <button
                onClick={() => setShowViolationLog(!showViolationLog)}
                className="relative p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                  {violations.length}/{maxViolations}
                </span>
              </button>
            )}

            {/* Camera Status */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
              ${faceDetection.faceStatus === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : faceDetection.faceStatus === 'no_face' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
              {faceDetection.cameraActive ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">
                {faceDetection.faceStatus === 'ok' ? 'Proctored' : faceDetection.faceStatus === 'no_face' ? 'No face!' : 'Checking...'}
              </span>
            </div>

            <Button
              onClick={() => setConfirmSubmit(true)}
              className="bg-saBlue hover:bg-saBlueDarkHover text-white text-xs sm:text-sm px-3 sm:px-5"
              size="sm"
            >
              <Send className="w-3.5 h-3.5 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Submit</span>
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-100">
          <div className="h-1 bg-saBlue transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>


      {/* ============== VIOLATION LOG ============== */}
      {showViolationLog && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowViolationLog(false)}>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Violations ({violations.length}/{maxViolations})</h3>
              <button onClick={() => setShowViolationLog(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-3 bg-red-50 border-b border-red-100">
              <p className="text-xs text-red-600 text-center font-medium">
                ⚠️ After {maxViolations} violations, your test will be automatically submitted.
              </p>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
              {violations.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No violations recorded</p>
              ) : (
                violations.map((v, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-800">{v.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{v.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============== MAIN LAYOUT ============== */}
      <div className="flex pt-[52px] min-h-screen">

        {/* ---- Sidebar (Desktop) / Drawer (Mobile) ---- */}
        <aside className={`
          fixed lg:sticky top-[52px] left-0 z-40 h-[calc(100vh-52px)]
          w-72 bg-white/95 backdrop-blur-md border-r border-gray-200
          transition-transform duration-300 lg:translate-x-0 flex flex-col shadow-lg lg:shadow-none
          ${showDrawer ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Backdrop for mobile */}
          {showDrawer && (
            <div className="fixed inset-0 bg-black/30 lg:hidden -z-10" onClick={() => setShowDrawer(false)} />
          )}

          {/* Camera Preview */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-inner">
              <video ref={faceDetection.videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              <canvas ref={faceDetection.canvasRef} className="hidden" />
              {!faceDetection.cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-100">
                  <CameraOff className="w-8 h-8 text-gray-400" />
                  <p className="text-xs text-gray-500 text-center px-2">{faceDetection.cameraError || 'Camera off'}</p>
                </div>
              )}
              {/* Face status indicator */}
              <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ring-2 ring-white ${faceDetection.faceStatus === 'ok' ? 'bg-green-400' : faceDetection.faceStatus === 'no_face' ? 'bg-red-400 animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
              <div className="absolute bottom-2 left-2">
                <span className="text-[10px] bg-black/50 px-2 py-0.5 rounded-full text-white/90">
                  {faceDetection.cameraActive ? (faceDetection.faceStatus === 'ok' ? '✓ Face detected' : '⚠ Look at screen') : 'Camera off'}
                </span>
              </div>
            </div>
          </div>

          {/* Violation Warning Bar in Sidebar */}
          {violations.length > 0 && (
            <div className={`mx-3 mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${violations.length >= maxViolations - 1 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{violations.length}/{maxViolations} violations</span>
            </div>
          )}

          {/* Question Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Questions</p>
            <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] text-gray-500">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-saBlue" /> Current</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Answered</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Review</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Not answered</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Not visited</div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                return (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentQuestionIndex(idx); setShowDrawer(false); }}
                    className={`
                      w-full aspect-square rounded-lg text-sm font-bold transition-all
                      ${getQuestionStatusClass(q.id, idx)}
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Answered</span>
              <span className="text-gray-800 font-bold">{answeredCount}/{answerableQuestions.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Review</span>
              <span className="text-amber-600 font-bold">{reviewCount}</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </aside>

        {/* ---- Main Content ---- */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6">
            <div className="max-w-3xl mx-auto">

              {/* Case Study Parent Paragraph */}
              {currentQuestion.parent_id && (() => {
                const parent = questions.find(q => q.id === currentQuestion.parent_id);
                if (!parent) return null;
                return (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className="bg-indigo-100 text-indigo-700 border-none">Case Study</Badge>
                      <span className="text-xs font-medium text-indigo-400">Read the context below to answer this question.</span>
                    </div>
                    <div className="text-sm text-gray-800 leading-relaxed">
                      <MathRenderer text={parent.question_text} />
                    </div>
                  </div>
                );
              })()}

              {/* Question Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Question Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-saBlue text-white text-sm font-bold">
                      {currentQuestionIndex + 1}
                    </span>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Question {currentQuestionIndex + 1} of {questions.length}</p>
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">{currentQuestion.question_type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                    {currentQuestion.marks} marks
                  </Badge>
                </div>

                {/* Question Body */}
                <div className="p-5 sm:p-7 space-y-6">
                  {/* Question Text */}
                  <div className="text-base sm:text-lg font-medium text-gray-800 leading-relaxed">
                    <MathRenderer text={currentQuestion.question_text} />
                  </div>

                  {/* Question Media */}
                  {currentQuestion.media_url && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                      {currentQuestion.media_type === 'image' && (
                        <img src={currentQuestion.media_url} alt="Question" className="max-w-full max-h-80 mx-auto rounded" />
                      )}
                      {currentQuestion.media_type === 'pdf' && (
                        <div className="flex items-center gap-3 p-4">
                          <FileText className="w-8 h-8 text-red-500" />
                          <a href={currentQuestion.media_url} target="_blank" rel="noopener noreferrer" className="text-saBlue hover:underline text-sm">View PDF Document</a>
                        </div>
                      )}
                      {currentQuestion.media_type === 'video' && (
                        <video src={currentQuestion.media_url} controls className="max-w-full max-h-80 mx-auto rounded" />
                      )}
                    </div>
                  )}

                  {/* ---- Case Study ---- */}
                  {currentQuestion.question_type === 'CASE_STUDY' && (
                    <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-center">
                      <p className="text-gray-500 font-medium">This is a Case Study.</p>
                      <p className="text-sm text-gray-400 mt-1">Please read the text above carefully. The questions that follow will be based on this case study. Click "Next" to proceed to the questions.</p>
                    </div>
                  )}

                  {/* ---- MCQ Options ---- */}
                  {currentQuestion.question_type === 'MCQ' && currentQuestion.options && (
                    <div className="space-y-2.5">
                      {(currentQuestion.options as any[]).map((option, index) => {
                        const optionText = typeof option === 'string' ? option : option?.text || '';
                        const optionMediaUrl = typeof option === 'object' ? option?.media_url : null;
                        const optionMediaType = typeof option === 'object' ? option?.media_type : null;
                        const optionLetter = String.fromCharCode(65 + index);
                        const optionValue = optionLetter; // Save the letter to match correct_answer
                        const isSelected = answers[currentQuestion.id] === optionValue;

                        return (
                          <label
                            key={index}
                            className={`
                              flex flex-col p-4 rounded-xl cursor-pointer transition-all border-2
                              ${isSelected
                                ? 'bg-blue-50 border-saBlue ring-1 ring-blue-200'
                                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all
                                ${isSelected ? 'bg-saBlue text-white' : 'bg-gray-100 text-gray-500'}
                              `}>
                                {optionLetter}
                              </div>
                              <span className={`flex-1 ${isSelected ? 'text-gray-800 font-medium' : 'text-gray-700'}`}>
                                <MathRenderer text={optionText} inline={true} />
                              </span>
                              <input
                                type="radio"
                                name={`question-${currentQuestion.id}`}
                                value={optionValue}
                                checked={isSelected}
                                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                                className="sr-only"
                              />
                              {isSelected && <CheckCircle className="w-5 h-5 text-saBlue flex-shrink-0" />}
                            </div>
                            {optionMediaUrl && optionMediaType === 'image' && (
                              <img src={optionMediaUrl} alt={`Option ${optionLetter}`} className="mt-3 ml-12 max-w-xs max-h-32 rounded-lg border border-gray-200" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* ---- True/False ---- */}
                  {currentQuestion.question_type === 'TRUE_FALSE' && (
                    <div className="grid grid-cols-2 gap-3">
                      {['True', 'False'].map((option) => {
                        const isSelected = answers[currentQuestion.id] === option;
                        return (
                          <label
                            key={option}
                            className={`
                              flex items-center justify-center gap-2 p-5 rounded-xl cursor-pointer transition-all border-2 text-center text-lg font-semibold
                              ${isSelected
                                ? 'bg-blue-50 border-saBlue text-gray-800 ring-1 ring-blue-200'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                              }
                            `}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestion.id}`}
                              value={option}
                              checked={isSelected}
                              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                              className="sr-only"
                            />
                            {isSelected && <CheckCircle className="w-5 h-5 text-saBlue" />}
                            {option}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* ---- Match the Following ---- */}
                  {currentQuestion.question_type === 'MATCH_THE_FOLLOWING' && (
                    (() => {
                      let pairs: { left: string; right: string }[] = [];
                      try {
                        const rawOptions = typeof currentQuestion.options === 'string'
                          ? JSON.parse(currentQuestion.options)
                          : (currentQuestion.options as any || []);
                        if (Array.isArray(rawOptions)) {
                          pairs = rawOptions.map(opt => {
                            if (typeof opt === 'string') {
                              try { return JSON.parse(opt); } catch (e) { return { left: '', right: '' }; }
                            }
                            return opt;
                          });
                        }
                      } catch (e) { }

                      let currentAnswer: { left: string; right: string }[] = [];
                      try {
                        currentAnswer = answers[currentQuestion.id]
                          ? JSON.parse(answers[currentQuestion.id]!)
                          : [];
                      } catch (e) { }

                      return (
                        <MatchTheFollowingInteractive
                          pairs={pairs}
                          currentAnswer={currentAnswer}
                          onAnswerChange={(newAnswer) => handleAnswerChange(currentQuestion.id, JSON.stringify(newAnswer))}
                        />
                      );
                    })()
                  )}

                  {/* ---- Short/Long Answer ---- */}
                  {(currentQuestion.question_type === 'SHORT_ANSWER' || currentQuestion.question_type === 'LONG_ANSWER') && (
                    <div className="space-y-4">
                      <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        className="w-full p-4 sm:p-5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-saBlue focus:border-transparent resize-y transition-all"
                        rows={currentQuestion.question_type === 'LONG_ANSWER' ? 8 : 4}
                        placeholder="Type your answer here..."
                      />
                      <MediaUpload
                        label="Upload Answer Media (Optional)"
                        value={answerMediaUrls[currentQuestion.id]}
                        onChange={(file, url) => {
                          if (file || url) handleAnswerChange(currentQuestion.id, answers[currentQuestion.id] || '', file, url);
                        }}
                        acceptTypes="image/*,application/pdf"
                        maxSize={10}
                      />
                    </div>
                  )}

                  {/* Auto-save indicator */}
                  {savingAnswer && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                      Saving...
                    </div>
                  )}
                </div>
              </div>

              {/* ---- Navigation ---- */}
              <div className="flex items-center justify-between mt-6 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={`${reviewQuestionIds.has(currentQuestion.id)
                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Flag className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {reviewQuestionIds.has(currentQuestion.id) ? 'Review Marked' : 'Mark Review'}
                  </span>
                </Button>

                {/* Mobile: Question number jumping */}
                <div className="flex gap-1.5 overflow-x-auto px-2 lg:hidden max-w-[50vw] scrollbar-hide">
                  {questions.map((q, idx) => {
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`
                          w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0 transition-all
                          ${getQuestionStatusClass(q.id, idx)}
                        `}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={() => setConfirmSubmit(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Submit Test</span>
                    <span className="sm:hidden">Submit</span>
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    className="bg-saBlue hover:bg-saBlueDarkHover text-white"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
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
