import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { testService, testAttemptService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Award, Clock, ArrowRight, User, Mail } from 'lucide-react';
import type { Test, TestAttempt } from '@/types';
import { toast } from 'sonner';

export default function CertificationPage() {
    const { testId } = useParams<{ testId: string }>();
    const [loading, setLoading] = useState(true);
    const [test, setTest] = useState<Test | null>(null);
    const [step, setStep] = useState<'landing' | 'taking' | 'result'>('landing');

    // Landing Form
    const [candidateName, setCandidateName] = useState('');
    const [candidateEmail, setCandidateEmail] = useState('');
    const [starting, setStarting] = useState(false);

    // Taking Test
    const [attempt, setAttempt] = useState<TestAttempt | null>(null);
    const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Result
    const [result, setResult] = useState<{ score: number; total_marks: number; is_passed: boolean } | null>(null);

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

    const handleStart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!candidateName.trim()) {
            toast.error('Please enter your full name');
            return;
        }

        try {
            setStarting(true);
            const response = await testAttemptService.startPublicAttempt(parseInt(testId!), {
                candidateName,
                candidateEmail
            });

            setAttempt(response.data.attempt);
            setTimeRemaining(response.data.attempt.test!.duration_minutes * 60);
            setStep('taking');
        } catch (error) {
            console.error('Error starting test:', error);
            toast.error('Failed to start test. Please try again.');
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
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

            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-primary" />
                    <span className="font-bold text-lg">StudyAsan Certification</span>
                </div>
                {step === 'taking' && (
                    <div className="flex items-center gap-2 font-mono font-bold text-lg bg-gray-100 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4" />
                        {formatTime(timeRemaining)}
                    </div>
                )}
            </header>

            <main className="container mx-auto px-4 py-8 max-w-4xl">
                {step === 'landing' && (
                    <div className="max-w-md mx-auto">
                        <Card className="shadow-lg border-primary/10">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Award className="w-8 h-8 text-primary" />
                                </div>
                                <CardTitle className="text-2xl">{test.title}</CardTitle>
                                <CardDescription className="mt-2 text-base">
                                    {test.description?.replace(/\[CERTIFICATION\]/g, '') || 'Complete this test to earn your certificate.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-4 bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Duration</span>
                                        <span className="font-medium">{test.duration_minutes} minutes</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Questions</span>
                                        <span className="font-medium">{test.questions?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Marks</span>
                                        <span className="font-medium">{test.total_marks}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Passing Marks</span>
                                        <span className="font-medium">{test.passing_marks}</span>
                                    </div>
                                </div>

                                <form onSubmit={handleStart} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name (for Certificate)</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <Input
                                                id="name"
                                                placeholder="e.g. John Doe"
                                                className="pl-9"
                                                value={candidateName}
                                                onChange={(e) => setCandidateName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="e.g. john@example.com"
                                                className="pl-9"
                                                value={candidateEmail}
                                                onChange={(e) => setCandidateEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full text-lg h-12" disabled={starting}>
                                        {starting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Start Certification Test'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {step === 'taking' && attempt && (
                    <div className="space-y-8">
                        <div className="space-y-6">
                            {attempt.test?.questions?.map((q, index) => (
                                <Card key={q.id} className="overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex gap-4">
                                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div>
                                                    <p className="font-medium text-lg text-gray-800">{q.question_text}</p>
                                                    <span className="text-xs text-muted-foreground mt-1 inline-block bg-secondary px-2 py-0.5 rounded">
                                                        {q.marks} marks
                                                    </span>
                                                </div>

                                                {q.media_url && q.media_type === 'image' && (
                                                    <img src={q.media_url} alt="Question" className="max-w-full max-h-64 rounded-lg border" />
                                                )}

                                                <div className="space-y-3 pt-2">
                                                    {q.question_type === 'MCQ' && (q.options as any[])?.map((opt: any, i: number) => {
                                                        const optText = typeof opt === 'string' ? opt : opt.text || opt;
                                                        return (
                                                            <label key={i} className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${answers[q.id] === optText ? 'border-primary bg-primary/5' : ''}`}>
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${q.id}`}
                                                                    value={optText}
                                                                    checked={answers[q.id] === optText}
                                                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                                    className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                                                                />
                                                                <span className="ml-3 text-gray-700">{optText}</span>
                                                            </label>
                                                        );
                                                    })}

                                                    {q.question_type === 'TRUE_FALSE' && ['True', 'False'].map((opt) => (
                                                        <label key={opt} className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${answers[q.id] === opt ? 'border-primary bg-primary/5' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                name={`q-${q.id}`}
                                                                value={opt}
                                                                checked={answers[q.id] === opt}
                                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                                                            />
                                                            <span className="ml-3 text-gray-700">{opt}</span>
                                                        </label>
                                                    ))}

                                                    {(q.question_type === 'SHORT_ANSWER' || q.question_type === 'LONG_ANSWER') && (
                                                        <Input
                                                            placeholder="Type your answer here..."
                                                            value={answers[q.id] || ''}
                                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
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
                            <Button onClick={handleSubmitTest} disabled={submitting} size="lg" className="shadow-lg">
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Submit Certification Test'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'result' && result && (
                    <div className="max-w-2xl mx-auto text-center space-y-8">
                        <Card>
                            <CardContent className="pt-8 pb-8 space-y-6">
                                {result.is_passed ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                            <CheckCircle className="w-10 h-10 text-green-600" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-800">Congratulations!</h2>
                                        <p className="text-gray-600 mt-2">You have successfully passed the certification test.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                            <XCircle className="w-10 h-10 text-red-600" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-800">Certification Not Awarded</h2>
                                        <p className="text-gray-600 mt-2">Unfortunately, you did not meet the passing criteria.</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-center gap-8 py-4 border-t border-b">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 uppercase tracking-wider">Your Score</p>
                                        <p className="text-3xl font-bold text-primary">{result.score} <span className="text-sm text-gray-400 font-normal">/ {result.total_marks}</span></p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 uppercase tracking-wider">Result</p>
                                        <p className={`text-2xl font-bold ${result.is_passed ? 'text-green-600' : 'text-red-600'}`}>
                                            {result.is_passed ? 'PASSED' : 'FAILED'}
                                        </p>
                                    </div>
                                </div>

                                {result.is_passed ? (
                                    <div className="space-y-4">
                                        <p className="text-gray-600">Your certificate has been generated. You can download or print it now.</p>
                                        <Button onClick={printCertificate} size="lg" className="bg-green-600 hover:bg-green-700">
                                            <Award className="w-5 h-5 mr-2" /> Download Certificate
                                        </Button>
                                    </div>
                                ) : (
                                    <Button onClick={() => window.location.reload()} variant="outline">
                                        Try Again
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Certificate View (Hidden unless printing) */}
                        {result.is_passed && (
                            <div id="certificate-view" className="hidden flex-col items-center justify-center bg-white w-full h-full box-border relative p-12">
                                {/* Load Fonts */}
                                <style>{`
                                    @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Outfit:wght@400;600;700&display=swap');
                                `}</style>

                                {/* Border Frame */}
                                <div className="absolute inset-4 border-4 border-double border-gray-300 pointer-events-none"></div>

                                {/* Watermark/Icon */}
                                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                                    <Award className="w-[500px] h-[500px] text-gray-900" />
                                </div>

                                {/* Top Logo */}
                                <div className="mb-12 flex flex-col items-center">
                                    <div className="flex items-center justify-center w-16 h-16 bg-[#0076CE] rounded-xl mb-3 shadow-sm">
                                        <Award className="w-10 h-10 text-white" />
                                    </div>
                                    <h2 className="text-3xl font-bold text-[#0076CE] tracking-tight font-['Outfit']">StudyAsan</h2>
                                </div>

                                {/* Header: CERTIFICATE OF COMPLETION */}
                                <h1 className="text-5xl font-serif font-bold text-gray-900 mb-8 uppercase tracking-[0.2em]">
                                    Certificate of Completion
                                </h1>

                                <p className="text-xl text-gray-500 mb-6 font-serif italic">This implies that</p>

                                {/* Candidate Name */}
                                <h2 className="text-6xl font-bold text-[#0076CE] mb-4 pb-2 px-10 inline-block font-['Outfit']">
                                    {candidateName}
                                </h2>
                                <div className="w-64 h-0.5 bg-gray-300 mb-8"></div>

                                <p className="text-lg text-gray-500 mb-8 font-serif leading-relaxed">
                                    has successfully completed the assessment for
                                </p>

                                {/* Test Title */}
                                <h3 className="text-4xl font-bold text-gray-800 mb-16 uppercase tracking-wide font-['Outfit']">
                                    {test.title}
                                </h3>

                                {/* Signatures Section */}
                                <div className="flex justify-between w-full max-w-4xl mt-12 px-20 items-end">
                                    {/* Provider Signature */}
                                    <div className="text-center flex flex-col items-center min-w-[200px]">
                                        <div className="mb-2 h-16 flex items-end justify-center">
                                            <span className="text-4xl text-gray-800" style={{ fontFamily: '"Great Vibes", cursive' }}>Deepak</span>
                                        </div>
                                        <div className="w-56 h-px bg-gray-400 mb-2"></div>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Authorized Signature</p>
                                    </div>

                                    {/* Date */}
                                    <div className="text-center flex flex-col items-center justify-end min-w-[200px]">
                                        <div className="mb-2 h-16 flex items-end justify-center">
                                            <span className="text-xl font-medium text-gray-800 font-['Outfit']">{new Date().toLocaleDateString()}</span>
                                        </div>
                                        <div className="w-56 h-px bg-gray-400 mb-2"></div>
                                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Date Issued</p>
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
