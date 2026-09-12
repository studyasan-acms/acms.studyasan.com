import { useState, useEffect } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { X, Play, RotateCcw, Code2, Users, Terminal, CheckCircle2, AlertCircle, RefreshCw, Star } from 'lucide-react';
import { executeCode } from '../../../lib/compiler';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface TestCase {
    input: string;
    expectedOutput: string;
}

interface TestCaseResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    error?: string;
}

interface Props {
    activity: Activity;
    attemptId: number | null;
    onComplete: (score: number, timeTaken: number) => void;
    onCancel: () => void;
}

export default function CodingLeetcodeGame({ activity, attemptId, onComplete, onCancel }: Props) {
    const leetConfig = activity.items?.[0]?.content || {};
    const [language, setLanguage] = useState(leetConfig.defaultLanguage || 'python');
    const [code, setCode] = useState('');
    
    // Manage code templates dynamically per language selection
    useEffect(() => {
        const templates = leetConfig.templates || {};
        setCode(templates[language] || '');
    }, [language]);

    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Console outputs for custom testing
    const [stdout, setStdout] = useState('');
    const [stderr, setStderr] = useState('');
    const [customInput, setCustomInput] = useState('');

    const [testResults, setTestResults] = useState<TestCaseResult[]>(() => {
        const cases = leetConfig.testCases || [];
        return cases.map((tc: TestCase) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: '',
            status: 'pending'
        }));
    });

    const [startTime] = useState(Date.now());

    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
    };

    // Run active code with custom input stdin
    const handleRunCustomCode = async () => {
        setIsRunning(true);
        setStdout('');
        setStderr('');

        const result = await executeCode(language, code, customInput);
        
        setStdout(result.stdout);
        setStderr(result.stderr);
        setIsRunning(false);
    };

    // Run against all validation test cases
    const handleSubmitSolution = async () => {
        setIsSubmitting(true);

        const newResults = [...testResults];
        let allPassed = true;

        for (let i = 0; i < newResults.length; i++) {
            newResults[i] = {
                ...newResults[i],
                status: 'running',
                actualOutput: ''
            };
            setTestResults([...newResults]);

            const runResult = await executeCode(language, code, newResults[i].input);
            const actualOut = runResult.stdout.trim();
            const expectedOut = newResults[i].expectedOutput.trim();

            const isMatch = actualOut === expectedOut && !runResult.hasError;
            if (!isMatch) allPassed = false;

            newResults[i] = {
                ...newResults[i],
                status: isMatch ? 'passed' : 'failed',
                actualOutput: runResult.stdout,
                error: runResult.stderr
            };
            setTestResults([...newResults]);
        }

        setIsSubmitting(false);

        if (allPassed) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            // Submit response API
            if (attemptId && activity.items?.[0]) {
                try {
                    await activityAttemptAPI.submitResponse({
                        attempt_id: attemptId,
                        item_id: activity.items[0].id,
                        response: { code, language },
                        is_correct: true,
                    });
                } catch (e) {}
            }

            // Auto advance
            setTimeout(() => {
                const timeTaken = Math.floor((Date.now() - startTime) / 1000);
                onComplete(activity.items?.[0]?.points || 120, timeTaken);
            }, 2500);

        } else {
            toast.error("Some test cases failed. Review outputs to debug!");
        }
    };

    const handleReset = () => {
        const templates = leetConfig.templates || {};
        setCode(templates[language] || '');
        setStdout('');
        setStderr('');
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35" />
            </div>

            {/* Header */}
            <div className="px-2.5 py-2 sm:px-6 sm:py-3 flex flex-row justify-between items-center gap-1.5 sm:gap-4 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                    <div className="flex items-center shrink-0">
                        <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-5 sm:h-7 w-auto object-contain" />
                    </div>
                    <div className="h-4 sm:h-6 w-px bg-white/25 hidden sm:block" />
                    <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate min-w-0">
                        Coding Challenge
                    </h2>
                </div>

                <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                    <div className="flex items-center bg-white/15 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/20 font-bold text-[11px] sm:text-sm shrink-0 whitespace-nowrap">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 fill-current text-amber-300" />
                        <span>{activity.items?.[0]?.points || 120}<span className="hidden xs:inline ml-0.5">EXP</span></span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel} className="hover:bg-white/10 text-white/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content Dashboard */}
            <div className="flex-1 p-4 sm:p-6 w-full max-w-7xl mx-auto flex flex-col justify-center min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch h-full min-h-0">
                    
                    {/* Left Column: Problem description */}
                    <div className="lg:col-span-1 flex flex-col min-h-0">
                        <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs font-black mb-3 text-saBlue uppercase tracking-wider border-b border-slate-100 pb-2">
                                {leetConfig.problemTitle || 'Challenge'}
                            </h3>
                            <pre className="text-xs text-slate-500 leading-relaxed font-sans font-medium whitespace-pre-wrap overflow-y-auto pr-1 flex-1">
                                {leetConfig.problemDescription || ''}
                            </pre>
                        </Card>
                    </div>

                    {/* Center Column: Editor */}
                    <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                        <Card className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col min-h-0 relative">
                            {/* Editor Header Bar */}
                            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                                    <span className="text-[11px] text-slate-500 font-bold ml-2 font-mono uppercase tracking-wider">
                                        solution.py
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2.5">
                                    <select
                                        value={language}
                                        onChange={(e) => handleLanguageChange(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg focus:ring-1 focus:ring-saBlue focus:outline-none"
                                    >
                                        <option value="python">Python 3</option>
                                        <option value="javascript">JavaScript (Node)</option>
                                        <option value="java">Java (OpenJDK)</option>
                                        <option value="cpp">C++ (GCC)</option>
                                    </select>
                                    <Button onClick={handleReset} variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg">
                                        <RotateCcw className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* TextArea Editor */}
                            <div className="flex-1 min-h-0 flex relative">
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Write code here..."
                                    className="flex-1 w-full bg-transparent text-slate-200 font-mono text-xs p-2 leading-relaxed resize-none focus:outline-none overflow-y-auto"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Editor actions */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-800 mt-3 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Custom input (stdin)..."
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none w-36 sm:w-48 font-mono"
                                    />
                                    <Button 
                                        onClick={handleRunCustomCode}
                                        disabled={isRunning || isSubmitting}
                                        className="bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 font-bold h-8 px-3 rounded-lg text-xs"
                                    >
                                        Run Input
                                    </Button>
                                </div>
                                <Button 
                                    onClick={handleSubmitSolution}
                                    disabled={isRunning || isSubmitting}
                                    className="bg-saBlue hover:bg-saBlueDarkHover text-white font-bold h-9 px-4 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/10 text-xs"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    {isSubmitting ? 'Validating...' : 'Submit Code'}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Console output and Test results */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        {/* Custom Run output */}
                        <Card className="bg-slate-950 border border-slate-900 rounded-2xl p-4 shadow-lg flex-1 flex flex-col min-h-0 text-slate-200">
                            <h3 className="text-xs font-black mb-3 text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                                <Terminal className="w-4 h-4" />
                                Custom Execution
                            </h3>
                            <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed p-1 space-y-2 select-text">
                                {stdout && (
                                    <div className="space-y-1">
                                        <div className="text-emerald-500 font-bold">STDOUT:</div>
                                        <pre className="whitespace-pre-wrap pl-2 bg-slate-900/40 p-2 rounded-lg border border-slate-900">{stdout}</pre>
                                    </div>
                                )}
                                {stderr && (
                                    <div className="space-y-1">
                                        <div className="text-red-400 font-bold">STDERR:</div>
                                        <pre className="whitespace-pre-wrap pl-2 text-red-300 bg-red-950/20 p-2 rounded-lg border border-red-950/40">{stderr}</pre>
                                    </div>
                                )}
                                {!stdout && !stderr && !isRunning && (
                                    <div className="text-slate-600 italic text-center py-6 font-sans">
                                        No custom executions run yet.
                                    </div>
                                )}
                                {isRunning && (
                                    <div className="flex items-center gap-2 text-saBlue animate-pulse py-4 font-sans text-xs justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                        Running...
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Test Cases outcomes */}
                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs font-black mb-3 text-saBlue uppercase tracking-wider border-b border-slate-100 pb-2">
                                Test Cases Output
                            </h3>
                            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                                {testResults.map((tr, idx) => (
                                    <div key={idx} className="border border-slate-150 rounded-xl p-2.5 bg-slate-50/50 text-[10px] space-y-1.5">
                                        <div className="flex justify-between items-center font-bold">
                                            <span className="text-slate-500">Case {idx + 1}</span>
                                            {tr.status === 'passed' && (
                                                <span className="flex items-center text-emerald-600 font-bold gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                                                </span>
                                            )}
                                            {tr.status === 'failed' && (
                                                <span className="flex items-center text-red-500 font-bold gap-1">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Failed
                                                </span>
                                            )}
                                            {tr.status === 'running' && (
                                                <span className="flex items-center text-saBlue font-bold gap-1 animate-pulse">
                                                    <RefreshCw className="w-3 h-3 animate-spin" /> Running
                                                </span>
                                            )}
                                            {tr.status === 'pending' && (
                                                <span className="text-slate-400 font-semibold">Pending</span>
                                            )}
                                        </div>
                                        <div className="font-mono text-[9px] text-slate-500 space-y-1">
                                            <div>Input: <code className="bg-slate-100 p-0.5 rounded text-slate-700">{tr.input.replace('\n', ' , ')}</code></div>
                                            <div>Expected: <code className="bg-slate-100 p-0.5 rounded text-slate-700">{tr.expectedOutput}</code></div>
                                            {tr.actualOutput && (
                                                <div>Actual: <code className={`p-0.5 rounded ${tr.status === 'passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{tr.actualOutput.trim()}</code></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
