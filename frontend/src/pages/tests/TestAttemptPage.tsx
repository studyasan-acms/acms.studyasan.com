import { useState, useEffect, useRef, useCallback } from 'react';
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
import { usePageTitle } from "@/hooks/usePageTitle";

const MAX_VIOLATIONS = 3;

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
  const [answerMediaFiles, setAnswerMediaFiles] = useState<{ [questionId: number]: File | null }>({});
  const [answerMediaUrls, setAnswerMediaUrls] = useState<{ [questionId: number]: string | null }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [showViolationBanner, setShowViolationBanner] = useState(false);
  const [violationMessage, setViolationMessage] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showViolationLog, setShowViolationLog] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const violationCountRef = useRef(0);
  const hasAutoSubmittedRef = useRef(false);

  // Face Detection
  const faceDetection = useFaceDetection(true);

  const addViolation = useCallback((violation: Violation) => {
    setViolations(prev => {
      const updated = [...prev, violation];
      violationCountRef.current = updated.length;
      return updated;
    });
    setViolationMessage(
      violationCountRef.current + 1 >= MAX_VIOLATIONS
        ? `⛔ Final warning! Test will be auto-submitted. (${violation.message})`
        : `⚠️ Warning ${violationCountRef.current + 1}/${MAX_VIOLATIONS}: ${violation.message}`
    );
    setShowViolationBanner(true);
    setTimeout(() => setShowViolationBanner(false), 4000);
  }, []);

  // Auto-submit after MAX_VIOLATIONS
  useEffect(() => {
    if (violations.length >= MAX_VIOLATIONS && !hasAutoSubmittedRef.current && !autoSubmitting) {
      hasAutoSubmittedRef.current = true;
      setAutoSubmitting(true);
      // Small delay so the user sees the final warning
      setTimeout(() => {
        handleSubmitTest(true);
      }, 1500);
    }
  }, [violations]);

  // Wire up face detection violations
  useEffect(() => {
    faceDetection.onViolationRef.current = addViolation;
  }, [addViolation]);

  // ---- Fetch Attempt ----
  useEffect(() => {
    if (attemptId) {
      fetchAttempt();
      enterFullscreen();
    }
    return () => { exitFullscreen(); faceDetection.stopCamera(); };
  }, [attemptId]);

  // ---- Timer ----
  useEffect(() => {
    if (!attempt || attempt.submitted_at) return;
    const startTime = new Date(attempt.started_at).getTime();
    const durationMs = attempt.test!.duration_minutes * 60 * 1000;
    const timer = setInterval(() => {
      const remaining = Math.max(0, durationMs - (Date.now() - startTime));
      setTimeRemaining(Math.floor(remaining / 1000));
      if (remaining <= 0) handleSubmitTest(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  // ---- Screen Lock: Fullscreen Change ----
  useEffect(() => {
    const handle = () => {
      if (!document.fullscreenElement && !attempt?.submitted_at) {
        addViolation({ type: 'fullscreen_exit', timestamp: new Date(), message: 'Fullscreen exited — re-entering...' });
        enterFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handle);
    return () => document.removeEventListener('fullscreenchange', handle);
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

  // ---- Fullscreen Helpers ----
  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(console.error);
  };
  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
  };

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
    } catch (error) {
      console.error('Error fetching test attempt:', error);
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

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
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimeWarning = timeRemaining < 300 && timeRemaining > 0;
  const isTimeCritical = timeRemaining < 60 && timeRemaining > 0;

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
          Your test has been automatically submitted due to <strong>{MAX_VIOLATIONS} violations</strong>.
        </p>
        <div className="w-10 h-10 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const questions = attempt.test.questions;
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = questions.filter(q => answers[q.id]).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 select-none" style={{ userSelect: 'none' }}>
      {/* Confirm Submit Modal */}
      <ConfirmModal
        open={confirmSubmit}
        title="Submit Test"
        description={`You have answered ${answeredCount} out of ${questions.length} questions. ${answeredCount < questions.length ? `⚠️ ${questions.length - answeredCount} question(s) are unanswered.` : ''} Are you sure you want to submit?`}
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
                Q {currentQuestionIndex + 1}/{questions.length} · {answeredCount} answered
              </p>
            </div>
          </div>

          {/* Center: Timer */}
          <div className={`flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-mono text-base sm:text-lg font-bold transition-all
            ${isTimeCritical ? 'bg-red-600 text-white animate-pulse' : isTimeWarning ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{formatTime(timeRemaining)}</span>
            {isTimeWarning && <AlertTriangle className="w-4 h-4" />}
          </div>

          {/* Right: Proctoring + Submit */}
          <div className="flex items-center gap-2">
            {/* Violation Counter */}
            {violations.length > 0 && (
              <button
                onClick={() => setShowViolationLog(!showViolationLog)}
                className="relative p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <ShieldAlert className="w-5 h-5 text-red-500" />
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                  {violations.length}/{MAX_VIOLATIONS}
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
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Violations ({violations.length}/{MAX_VIOLATIONS})</h3>
              <button onClick={() => setShowViolationLog(false)} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-3 bg-red-50 border-b border-red-100">
              <p className="text-xs text-red-600 text-center font-medium">
                ⚠️ After {MAX_VIOLATIONS} violations, your test will be automatically submitted.
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
            <div className={`mx-3 mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${violations.length >= MAX_VIOLATIONS - 1 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{violations.length}/{MAX_VIOLATIONS} violations</span>
            </div>
          )}

          {/* Question Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Questions</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isActive = idx === currentQuestionIndex;
                const isAnswered = !!answers[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => { setCurrentQuestionIndex(idx); setShowDrawer(false); }}
                    className={`
                      w-full aspect-square rounded-lg text-sm font-bold transition-all
                      ${isActive
                        ? 'bg-saBlue text-white ring-2 ring-blue-300 ring-offset-2 scale-105'
                        : isAnswered
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }
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
              <span className="text-gray-800 font-bold">{answeredCount}/{questions.length}</span>
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
                  <p className="text-base sm:text-lg font-medium text-gray-800 leading-relaxed">{currentQuestion.question_text}</p>

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

                  {/* ---- MCQ Options ---- */}
                  {currentQuestion.question_type === 'MCQ' && currentQuestion.options && (
                    <div className="space-y-2.5">
                      {(currentQuestion.options as any[]).map((option, index) => {
                        const optionText = typeof option === 'string' ? option : option?.text || '';
                        const optionMediaUrl = typeof option === 'object' ? option?.media_url : null;
                        const optionMediaType = typeof option === 'object' ? option?.media_type : null;
                        const optionLetter = String.fromCharCode(65 + index);
                        const optionValue = optionText || optionLetter;
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
                              <span className={`flex-1 ${isSelected ? 'text-gray-800 font-medium' : 'text-gray-700'}`}>{optionText}</span>
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

                {/* Mobile: Question number jumping */}
                <div className="flex gap-1.5 overflow-x-auto px-2 lg:hidden max-w-[50vw] scrollbar-hide">
                  {questions.map((q, idx) => {
                    const isActive = idx === currentQuestionIndex;
                    const isAnswered = !!answers[q.id];
                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`
                          w-8 h-8 rounded-lg text-xs font-bold flex-shrink-0 transition-all
                          ${isActive ? 'bg-saBlue text-white' : isAnswered ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
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
