import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { testService, testAttemptService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Award, Clock, ArrowRight, User, Mail, ShieldAlert, ShieldCheck, Download, Printer, ExternalLink } from 'lucide-react';
import type { Test, TestAttempt } from '@/types';
import { toast } from 'sonner';
import { printCertificateDocument } from '@/utils/printCertificate';

interface CertificationResult {
    score: number;
    total_marks: number;
    is_passed: boolean;
    candidateName: string;
    candidateEmail?: string;
    attemptId: number;
    testTitle: string;
    certificateDate?: string;
    certificateCode?: string;
    certificateId?: number;
    certificateText?: string;
    certificateTitle?: string;
}

// Interactive Match the Following Component
function MatchTheFollowingInteractive({
    options,
    currentAnswer,
    onAnswerChange,
}: {
    options: any;
    currentAnswer: { left: string; right: string }[];
    onAnswerChange: (newAnswer: { left: string; right: string }[]) => void;
}) {
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

    const pairs: { left: string; right: string }[] = useMemo(() => {
        try {
            const raw = typeof options === 'string' ? JSON.parse(options) : options || [];
            if (Array.isArray(raw)) {
                return raw
                    .map((opt) => {
                        if (typeof opt === 'string') {
                            try {
                                return JSON.parse(opt);
                            } catch (e) {
                                return { left: opt, right: '' };
                            }
                        }
                        if (typeof opt === 'object' && opt !== null) {
                            return { left: String(opt.left || ''), right: String(opt.right || '') };
                        }
                        return { left: String(opt || ''), right: '' };
                    })
                    .filter((p) => p.left || p.right);
            }
        } catch (e) {}
        return [];
    }, [options]);

    const rightChoices = useMemo(() => {
        return [...new Set(pairs.map((p) => p.right).filter(Boolean))].sort();
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
        const t = setTimeout(updateLines, 50);
        window.addEventListener('resize', updateLines);
        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', updateLines);
        };
    }, [currentAnswer, pairs, rightChoices]);

    if (pairs.length === 0) {
        return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
                No matching items defined for this question.
            </div>
        );
    }

    return (
        <div className="relative flex justify-between gap-6 sm:gap-10 p-2 sm:p-4 select-none min-h-[160px]" ref={containerRef}>
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
                {lines.map((line, i) => (
                    <line
                        key={i}
                        x1={line.x1}
                        y1={line.y1}
                        x2={line.x2}
                        y2={line.y2}
                        stroke="#0276D3"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                ))}
            </svg>

            {/* Left Column */}
            <div className="flex flex-col gap-2.5 w-1/2 z-10">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Column A (Click to Select)</span>
                {pairs.map((p, i) => {
                    const isMatched = currentAnswer.some((a) => a.left === p.left);
                    const isSelected = selectedLeft === p.left;
                    return (
                        <div
                            key={i}
                            ref={(el) => {
                                leftRefs.current[p.left] = el;
                            }}
                            onClick={() => handleLeftClick(p.left)}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex justify-between items-center text-xs ${
                                isSelected
                                    ? 'border-[#0276D3] bg-blue-50 ring-2 ring-blue-200 shadow-xs font-semibold'
                                    : isMatched
                                    ? 'border-emerald-300 bg-emerald-50/70 text-slate-800'
                                    : 'border-slate-200 bg-white hover:border-[#0276D3] text-slate-700'
                            }`}
                        >
                            <span>{p.left}</span>
                            {isMatched && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnmatch(p.left);
                                    }}
                                    className="text-red-500 text-[10px] font-bold hover:underline bg-white/70 px-1.5 py-0.5 rounded ml-2 shrink-0"
                                >
                                    Unmatch
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-2.5 w-1/2 z-10">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Column B (Click to Match)</span>
                {rightChoices.map((choice, i) => {
                    const matchedBy = currentAnswer.find((a) => a.right === choice)?.left;
                    const isMatched = !!matchedBy;

                    return (
                        <div
                            key={i}
                            ref={(el) => {
                                rightRefs.current[choice] = el;
                            }}
                            onClick={() => handleRightClick(choice)}
                            className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-xs ${
                                selectedLeft && !isMatched
                                    ? 'border-dashed border-blue-400 bg-blue-50/60 hover:bg-blue-100/70 hover:border-solid hover:border-[#0276D3]'
                                    : isMatched
                                    ? 'border-emerald-300 bg-emerald-50/70 text-slate-800 font-semibold'
                                    : 'border-slate-200 bg-white opacity-90 text-slate-700'
                            }`}
                        >
                            <span>{choice}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function CertificationPage() {
    const { testId } = useParams<{ testId: string }>();
    const [loading, setLoading] = useState(true);
    const [test, setTest] = useState<Test | null>(null);
    const [step, setStep] = useState<'landing' | 'taking' | 'result'>('landing');

    // Landing Form
    const [candidateName, setCandidateName] = useState('');
    const [candidateEmail, setCandidateEmail] = useState('');
    const [starting, setStarting] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);

    // Taking Test
    const [attempt, setAttempt] = useState<TestAttempt | null>(null);
    const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Result
    const [result, setResult] = useState<CertificationResult | null>(null);

    useEffect(() => {
        if (testId) fetchTest();
    }, [testId]);

    useEffect(() => {
        if (step === 'taking' && timeRemaining > 0) {
            const timer = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmitTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [step, timeRemaining]);

    const fetchTest = async () => {
        try {
            setLoading(true);
            const data = await testService.getPublicById(parseInt(testId!));
            setTest(data.data);
        } catch (error) {
            console.error('Error fetching test:', error);
            toast.error('Failed to load certification test');
        } finally {
            setLoading(false);
        }
    };

    const hasAllowedCandidates = useMemo(() => {
        if (!test?.allowed_candidates) return false;
        try {
            const raw = typeof test.allowed_candidates === 'string'
                ? JSON.parse(test.allowed_candidates)
                : test.allowed_candidates;
            return Array.isArray(raw) && raw.length > 0;
        } catch (e) {
            return false;
        }
    }, [test?.allowed_candidates]);

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        setStartError(null);

        if (!candidateName.trim()) {
            toast.error('Please enter your full name');
            return;
        }

        if (!candidateEmail.trim()) {
            toast.error('Please enter your email address');
            return;
        }

        try {
            setStarting(true);
            const response = await testAttemptService.startPublicAttempt(parseInt(testId!), {
                candidateName: candidateName.trim(),
                candidateEmail: candidateEmail.trim()
            });

            setAttempt(response.data.attempt);
            setTimeRemaining(response.data.attempt.test!.duration_minutes * 60);
            setStep('taking');
        } catch (error: any) {
            console.error('Error starting test:', error);
            const msg = error?.response?.data?.message || error?.message || 'Failed to start test. Please try again.';
            setStartError(msg);
            toast.error(msg);
        } finally {
            setStarting(false);
        }
    };

    const handleAnswerChange = (questionId: number, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleSubmitTest = async () => {
        if (!attempt) return;

        try {
            setSubmitting(true);
            const answerList = Object.entries(answers).map(([qId, text]) => ({
                question_id: parseInt(qId),
                answer_text: text
            }));

            const response = await testAttemptService.submitPublicTest(attempt.id, {
                answers: answerList,
                candidateName
            });

            setResult(response.data);
            setStep('result');
        } catch (error) {
            console.error('Error submitting test:', error);
            toast.error('Failed to submit test');
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const printCertificate = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-[#0276D3]" />
            </div>
        );
    }

    if (!test) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <XCircle className="w-12 h-12 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800">Test Not Found</h1>
                <p className="text-gray-600 mt-2">This certification test does not exist or is not available.</p>
            </div>
        );
    }

    const certificateTitleText = result?.certificateTitle || test.certificate_title || 'Certificate of Completion';
    const certificateBodyText = result?.certificateText || `has successfully completed the assessment for ${test.title} with a score of ${result?.score || 0}/${result?.total_marks || test.total_marks} on ${new Date().toLocaleDateString()}.`;

    const handlePrintCertificate = () => {
        if (!result) return;
        const name = result.candidateName || candidateName || 'Candidate';
        const certTitle = certificateTitleText;
        const certBody = certificateBodyText;
        const certCode = result.certificateCode || 'SA-CERT-VERIFIED';
        const dateStr = result.certificateDate
            ? new Date(result.certificateDate).toLocaleDateString()
            : new Date().toLocaleDateString();

        printCertificateDocument({
            title: test?.title || 'Certificate of Completion',
            candidateName: name,
            certificateTitle: certTitle,
            certificateBodyText: certBody,
            certificateCode: certCode,
            dateStr,
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
            <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          body * { visibility: hidden; }
          #certificate-view, #certificate-view * { visibility: visible; }
          #certificate-view {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 0;
            display: flex !important;
            align-items: center;
            justify-content: center;
            background: white;
            z-index: 9999;
          }
          .no-print { display: none !important; }
        }
      `}</style>

            {/* Header with Blue Background & Logo */}
            <header className="bg-blue-900 border-b border-blue-800/60 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md no-print">
                <div className="flex items-center gap-3">
                    <img
                        src="/studyasan-logo.png"
                        alt="StudyAsan"
                        className="h-11 sm:h-12 w-auto object-contain"
                    />
                </div>
                {step === 'taking' && (
                    <div className="flex items-center gap-2 font-mono font-bold text-sm bg-white/15 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/20 shadow-xs">
                        <Clock className="w-4 h-4 text-amber-300" />
                        {formatTime(timeRemaining)}
                    </div>
                )}
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {step === 'landing' && (
                    <div className="max-w-md mx-auto">
                        <Card className="shadow-md border border-slate-200 rounded-2xl bg-white overflow-hidden">
                            <div className="bg-gradient-to-r from-[#0276D3] to-blue-700 p-6 text-white text-center relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-10">
                                    <Award className="w-36 h-36" />
                                </div>
                                <div className="mx-auto w-14 h-14 bg-white/15 backdrop-blur-xs rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                                    <Award className="w-7 h-7 text-white" />
                                </div>
                                <h1 className="text-xl font-black tracking-tight">{test.title}</h1>
                                <p className="mt-1.5 text-xs text-blue-100 line-clamp-2">
                                    {test.description?.replace(/\[CERTIFICATION\]/g, '') || 'Official qualifying certification assessment.'}
                                </p>
                            </div>

                            <CardContent className="space-y-5 pt-5">
                                {/* Exam Parameters */}
                                <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Duration</span>
                                        <span className="font-bold text-slate-800">{test.duration_minutes > 0 ? `${test.duration_minutes} Mins` : 'Untimed'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Questions</span>
                                        <span className="font-bold text-slate-800">{test.questions?.length || 0} Questions</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Marks</span>
                                        <span className="font-bold text-slate-800">{test.total_marks} Marks</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Pass Threshold</span>
                                        <span className="font-bold text-emerald-600">{test.passing_marks} Marks</span>
                                    </div>
                                </div>

                                {hasAllowedCandidates && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#0276D3] flex items-start gap-2">
                                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p>
                                            <strong>Whitelist Protected Exam:</strong> Only candidates with pre-authorized emails can attempt this certification test.
                                        </p>
                                    </div>
                                )}

                                {startError && (
                                    <div
                                        className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                                            startError.includes('already completed') || startError.includes('already earned')
                                                ? 'bg-amber-50 border border-amber-200 text-amber-900'
                                                : 'bg-red-50 border border-red-200 text-red-800'
                                        }`}
                                    >
                                        {startError.includes('already completed') || startError.includes('already earned') ? (
                                            <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className="font-bold">
                                                {startError.includes('already completed') || startError.includes('already earned')
                                                    ? 'Already Certified'
                                                    : 'Access Denied'}
                                            </p>
                                            <p className="mt-0.5 text-[11px] leading-relaxed">{startError}</p>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleStart} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Full Name (Printed on Certificate) *
                                        </Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <Input
                                                id="name"
                                                placeholder="e.g. John Doe"
                                                className="pl-9 rounded-xl text-sm"
                                                value={candidateName}
                                                onChange={(e) => setCandidateName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                            Candidate Email Address *
                                        </Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="e.g. john@example.com"
                                                className="pl-9 rounded-xl text-sm"
                                                value={candidateEmail}
                                                onChange={(e) => setCandidateEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400">Your digital certificate link will be issued to this email.</p>
                                    </div>

                                    <Button type="submit" className="w-full text-sm font-bold h-11 rounded-xl bg-[#0276D3] hover:bg-[#015bb5]" disabled={starting}>
                                        {starting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Validating Candidate...
                                            </>
                                        ) : (
                                            'Start Certification Exam'
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {step === 'taking' && attempt && (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">{test.title}</h2>
                                <p className="text-xs text-slate-500">Candidate: <span className="font-semibold text-slate-700">{candidateName}</span> ({candidateEmail})</p>
                            </div>
                            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                                {Object.keys(answers).length} of {attempt.test?.questions?.length || 0} Answered
                            </div>
                        </div>

                        <div className="space-y-4">
                            {attempt.test?.questions?.map((q, index) => (
                                <Card key={q.id} className="overflow-hidden border border-slate-200 rounded-2xl shadow-xs bg-white">
                                    <CardContent className="p-5">
                                        <div className="flex gap-3.5">
                                            <div className="flex-shrink-0 w-7 h-7 bg-blue-50 text-[#0276D3] rounded-xl flex items-center justify-center font-bold text-xs">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium text-sm text-slate-900">{q.question_text}</p>
                                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                                                        {q.marks} marks
                                                    </span>
                                                </div>

                                                {q.media_url && q.media_type === 'image' && (
                                                    <img src={q.media_url} alt="Question" className="max-w-full max-h-64 rounded-xl border border-slate-200" />
                                                )}

                                                <div className="space-y-2 pt-1">
                                                    {q.question_type === 'MCQ' && (q.options as any[])?.map((opt: any, i: number) => {
                                                        const optText = typeof opt === 'string' ? opt : opt.text || opt;
                                                        const isSelected = answers[q.id] === optText;
                                                        return (
                                                            <label
                                                                key={i}
                                                                className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors text-xs ${
                                                                    isSelected ? 'border-[#0276D3] bg-blue-50/50 font-medium text-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${q.id}`}
                                                                    value={optText}
                                                                    checked={isSelected}
                                                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                                    className="h-4 w-4 text-[#0276D3] border-slate-300 focus:ring-[#0276D3]"
                                                                />
                                                                <span className="ml-2.5">{optText}</span>
                                                            </label>
                                                        );
                                                    })}

                                                    {q.question_type === 'TRUE_FALSE' && ['True', 'False'].map((opt) => {
                                                        const isSelected = answers[q.id] === opt;
                                                        return (
                                                            <label
                                                                key={opt}
                                                                className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors text-xs ${
                                                                    isSelected ? 'border-[#0276D3] bg-blue-50/50 font-medium text-slate-900' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${q.id}`}
                                                                    value={opt}
                                                                    checked={isSelected}
                                                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                                    className="h-4 w-4 text-[#0276D3] border-slate-300 focus:ring-[#0276D3]"
                                                                />
                                                                <span className="ml-2.5">{opt}</span>
                                                            </label>
                                                        );
                                                    })}

                                                    {q.question_type === 'MATCH_THE_FOLLOWING' && (
                                                        <MatchTheFollowingInteractive
                                                            options={q.options}
                                                            currentAnswer={(() => {
                                                                try {
                                                                    return answers[q.id] ? JSON.parse(answers[q.id]) : [];
                                                                } catch (e) {
                                                                    return [];
                                                                }
                                                            })()}
                                                            onAnswerChange={(newAnswer) => handleAnswerChange(q.id, JSON.stringify(newAnswer))}
                                                        />
                                                    )}

                                                    {q.question_type === 'CASE_STUDY' && (
                                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                                                            {q.options && Array.isArray(q.options) && q.options.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {q.options.map((opt: any, idx: number) => (
                                                                        <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200">
                                                                            {typeof opt === 'string' ? opt : opt.text || JSON.stringify(opt)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="italic text-slate-500">Read the case scenario above.</p>
                                                            )}
                                                        </div>
                                                    )}

                                                    {(q.question_type === 'SHORT_ANSWER' || q.question_type === 'LONG_ANSWER') && (
                                                        <Input
                                                            placeholder="Type your answer here..."
                                                            value={answers[q.id] || ''}
                                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                            className="rounded-xl text-xs"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <div className="sticky bottom-4 flex justify-end">
                            <Button onClick={handleSubmitTest} disabled={submitting} className="shadow-lg bg-[#0276D3] hover:bg-[#015bb5] text-white rounded-xl text-xs font-bold px-6 h-10">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Submit Certification Test'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'result' && result && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden text-center">
                            <CardContent className="pt-8 pb-8 space-y-6">
                                {result.is_passed ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                            <CheckCircle className="w-9 h-9" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900">Congratulations, {result.candidateName}!</h2>
                                        <p className="text-xs text-slate-600 mt-1 max-w-md">
                                            You have met the required passing criteria and successfully earned your official certificate.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                                            <XCircle className="w-9 h-9" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900">Certification Not Awarded</h2>
                                        <p className="text-xs text-slate-600 mt-1 max-w-md">
                                            Unfortunately, you did not meet the passing threshold of {test.passing_marks} marks. Keep practicing and try again!
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-8 py-4 border-t border-b border-slate-100">
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Score</p>
                                        <p className="text-2xl font-black text-[#0276D3]">
                                            {result.score} <span className="text-xs text-slate-400 font-normal">/ {result.total_marks}</span>
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Result</p>
                                        <p className={`text-xl font-black ${result.is_passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {result.is_passed ? 'PASSED' : 'FAILED'}
                                        </p>
                                    </div>
                                </div>

                                {result.is_passed ? (
                                    <div className="space-y-4">
                                        {result.certificateCode && (
                                            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-0.5">
                                                    Unique Certificate ID
                                                </span>
                                                <span className="font-mono font-bold text-emerald-950 text-sm">
                                                    {result.certificateCode}
                                                </span>
                                            </div>
                                        )}

                                        <p className="text-xs text-slate-600">Your official digital certificate is ready for download or printing.</p>

                                        <div className="flex items-center justify-center gap-3">
                                            <Button onClick={handlePrintCertificate} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-11 px-6">
                                                <Printer className="w-4 h-4 mr-2" /> Download / Print Certificate
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button onClick={() => window.location.reload()} variant="outline" className="rounded-xl text-xs font-bold">
                                        Try Again
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Certificate View (Styled for Print & Screen Preview) */}
                        {result.is_passed && (
                            <div
                                id="certificate-view"
                                className="hidden flex-col items-center justify-center bg-white w-full h-full box-border relative p-12 text-center"
                                style={{
                                    backgroundImage: 'radial-gradient(#0276D308 1px, transparent 1px)',
                                    backgroundSize: '24px 24px',
                                }}
                            >
                                {/* Fonts */}
                                <style>{`
                                    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Great+Vibes&family=Outfit:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap');
                                `}</style>

                                {/* Frame Border */}
                                <div className="absolute inset-5 border-[3px] border-[#0276D3]/40 rounded-3xl pointer-events-none"></div>
                                <div className="absolute inset-7 border border-[#0276D3]/20 rounded-2xl pointer-events-none"></div>

                                {/* Corner Accents */}
                                <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-[#0276D3] rounded-tl-xl pointer-events-none"></div>
                                <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-[#0276D3] rounded-tr-xl pointer-events-none"></div>
                                <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-[#0276D3] rounded-bl-xl pointer-events-none"></div>
                                <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-[#0276D3] rounded-br-xl pointer-events-none"></div>

                                {/* Watermark */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                                    <Award className="w-[500px] h-[500px] text-slate-900" />
                                </div>

                                {/* Header: Brand */}
                                <div className="mb-6 flex flex-col items-center">
                                    <div className="flex items-center justify-center w-14 h-14 bg-[#0276D3] rounded-2xl mb-2 shadow-sm text-white">
                                        <Award className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-2xl font-black text-[#0276D3] tracking-wider uppercase font-['Outfit']">
                                        StudyAsan
                                    </h2>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
                                        Academy of Continuous Mastery & Skills
                                    </span>
                                </div>

                                {/* Certificate Title */}
                                <h1
                                    className="text-4xl font-extrabold text-slate-900 mb-6 uppercase tracking-[0.18em]"
                                    style={{ fontFamily: '"Cinzel", serif' }}
                                >
                                    {certificateTitleText}
                                </h1>

                                <p className="text-sm text-slate-500 mb-4 font-serif italic">
                                    This is proudly presented to
                                </p>

                                {/* Candidate Name */}
                                <h2
                                    className="text-5xl font-bold text-[#0276D3] mb-3 pb-1 px-8 inline-block"
                                    style={{ fontFamily: '"Outfit", sans-serif' }}
                                >
                                    {result.candidateName || candidateName}
                                </h2>
                                <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#0276D3] to-transparent mb-6"></div>

                                {/* Certificate Custom Body Text */}
                                <p className="text-base text-slate-700 max-w-2xl mb-8 font-serif leading-relaxed px-6">
                                    {certificateBodyText}
                                </p>

                                {/* Footer Information: Signatures & Unique Certificate ID */}
                                <div className="flex justify-between w-full max-w-4xl mt-6 px-12 items-end">
                                    {/* Provider Signature */}
                                    <div className="text-center flex flex-col items-center min-w-[180px]">
                                        <div className="mb-1 h-12 flex items-end justify-center">
                                            <span className="text-3xl text-slate-800" style={{ fontFamily: '"Great Vibes", cursive' }}>
                                                Deepak
                                            </span>
                                        </div>
                                        <div className="w-44 h-px bg-slate-400 mb-1.5"></div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Authorized Signature</p>
                                    </div>

                                    {/* Unique Certificate ID & Verification Seal */}
                                    <div className="text-center flex flex-col items-center">
                                        <div className="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg mb-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                                                Certificate ID
                                            </span>
                                            <span className="font-mono font-bold text-xs text-[#0276D3]">
                                                {result.certificateCode || 'SA-CERT-VERIFIED'}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-slate-400">Verified & Recorded in StudyAsan Registry</p>
                                    </div>

                                    {/* Date */}
                                    <div className="text-center flex flex-col items-center justify-end min-w-[180px]">
                                        <div className="mb-1 h-12 flex items-end justify-center">
                                            <span className="text-sm font-semibold text-slate-800 font-['Outfit']">
                                                {result.certificateDate ? new Date(result.certificateDate).toLocaleDateString() : new Date().toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="w-44 h-px bg-slate-400 mb-1.5"></div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Date Issued</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

