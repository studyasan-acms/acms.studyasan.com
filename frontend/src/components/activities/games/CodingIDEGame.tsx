import { useState, useEffect, useRef } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { X, Play, RotateCcw, Code2, Users, Terminal } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { executeCode } from '../../../lib/compiler';
import { toast } from 'sonner';

interface Props {
    activity: Activity;
    attemptId: number | null;
    onComplete: (score: number, timeTaken: number) => void;
    onCancel: () => void;
}

export default function CodingIDEGame({ activity, attemptId, onComplete, onCancel }: Props) {
    const ideConfig = activity.items?.[0]?.content || {};
    const [code, setCode] = useState(ideConfig.starterCode || '');
    const [language, setLanguage] = useState(ideConfig.defaultLanguage || 'python');
    const [stdout, setStdout] = useState('');
    const [stderr, setStderr] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);

    const isTeacher = !attemptId; // If no attemptId, they are previewing/teacher

    // Connect socket for collaborative session if playing
    useEffect(() => {
        const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
        const newSocket = io(baseUrl);
        setSocket(newSocket);

        // Join room
        const roomId = `session_ide_${activity.id}`;
        let guestName = 'Student';
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                guestName = user.name || user.email || 'Student';
            }
        } catch (e) {}

        newSocket.on('connect', () => {
            newSocket.emit('join_session', {
                join_code: `ide_${activity.id}`,
                guest_name: guestName
            });
        });

        // Collaborative sync listeners
        newSocket.on('code_update', (data: { code: string }) => {
            setCode(data.code);
        });

        newSocket.on('language_update', (data: { language: string }) => {
            setLanguage(data.language);
        });

        newSocket.on('output_update', (data: { output: any; isRunning: boolean }) => {
            setStdout(data.output.stdout || '');
            setStderr(data.output.stderr || '');
            setIsRunning(data.isRunning);
        });

        newSocket.on('student_joined', (data: { name: string; socketId: string }) => {
            setParticipants(prev => {
                if (prev.some(p => p.name === data.name)) return prev;
                return [...prev, { id: data.socketId || Math.random().toString(), name: data.name }];
            });
            toast.info(`${data.name} joined the IDE session`);
        });

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const handleCodeChange = (val: string) => {
        setCode(val);
        if (socket) {
            socket.emit('code_change', {
                session_id: `ide_${activity.id}`,
                code: val
            });
        }
    };

    const handleLanguageChange = (lang: string) => {
        setLanguage(lang);
        if (socket) {
            socket.emit('language_change', {
                session_id: `ide_${activity.id}`,
                language: lang
            });
        }
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setStdout('');
        setStderr('');

        const result = await executeCode(language, code);
        
        setStdout(result.stdout);
        setStderr(result.stderr);
        setIsRunning(false);

        // Sync terminal output to all connected users
        if (socket) {
            socket.emit('output_change', {
                session_id: `ide_${activity.id}`,
                output: { stdout: result.stdout, stderr: result.stderr },
                isRunning: false
            });
        }
    };

    const handleReset = () => {
        const starter = ideConfig.starterCode || '';
        handleCodeChange(starter);
        setStdout('');
        setStderr('');
    };

    const handleFinishSession = () => {
        if (!isTeacher && attemptId) {
            onComplete(activity.items?.[0]?.points || 100, 60);
        } else {
            onCancel();
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">
            
            {/* Soft Grid Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
            </div>

            {/* Header */}
            <div className="px-2.5 py-2 sm:px-6 sm:py-3 flex flex-row justify-between items-center gap-1.5 sm:gap-4 bg-saBlue border-b border-saBlue/80 z-20 shadow-xs text-white shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                    <div className="flex items-center shrink-0">
                        <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-5 sm:h-7 w-auto object-contain" />
                    </div>
                    <div className="h-4 sm:h-6 w-px bg-white/25 hidden sm:block" />
                    <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate min-w-0">
                        Collaborative IDE
                    </h2>
                    <span className="hidden xs:inline-block text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold uppercase tracking-wider animate-pulse shrink-0">
                        Live
                    </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
                    <div className="hidden sm:flex items-center bg-white/15 px-2.5 py-1 rounded-lg border border-white/20 font-bold text-xs shrink-0 whitespace-nowrap">
                        <Users className="w-3.5 h-3.5 mr-1.5" />
                        <span>Collaborating</span>
                    </div>
                    {attemptId && (
                        <Button 
                            onClick={handleFinishSession}
                            size="sm"
                            className="bg-saVividOrange hover:bg-orange-600 text-white font-bold h-7 sm:h-8 px-2.5 sm:px-3 text-xs rounded-lg sm:rounded-xl shadow-xs shrink-0"
                        >
                            Complete
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={onCancel} className="hover:bg-white/10 text-white/80 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-lg transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content Dashboard */}
            <div className="flex-1 p-4 sm:p-6 w-full max-w-7xl mx-auto flex flex-col justify-center min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch h-full min-h-0">
                    
                    {/* Left Column: Instructions & Collaborators */}
                    <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                        <Card className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-1 flex flex-col min-h-0">
                            <h3 className="text-xs font-black mb-2 text-saBlue uppercase tracking-wider flex items-center gap-1.5">
                                <Code2 className="w-4 h-4" />
                                Instructions
                              </h3>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium overflow-y-auto pr-1 flex-1">
                                {activity.instructions || "Work together in the shared editor. Write code, select your compiler language, and click 'Run Code' to execute. Real-time updates keep student and teacher code outputs perfectly aligned."}
                            </p>
                        </Card>

                        <Card className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                            <h3 className="text-xs font-black mb-3 text-saVividOrange uppercase tracking-wider flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                Collaborators
                            </h3>
                            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                                <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    <span>Teacher (Host)</span>
                                </div>
                                <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Student (You)</span>
                                </div>
                                {participants.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        <span>{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Center Column: Code Editor */}
                    <div className="lg:col-span-2 flex flex-col gap-4 min-h-0">
                        <Card className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex-1 flex flex-col min-h-0 relative">
                            {/* Editor Header Bar */}
                            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                                    <span className="text-[11px] text-slate-500 font-bold ml-2 font-mono uppercase tracking-wider">
                                        workspace_editor
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
                                    onChange={(e) => handleCodeChange(e.target.value)}
                                    placeholder="Type code here..."
                                    className="flex-1 w-full bg-transparent text-slate-200 font-mono text-xs p-2 leading-relaxed resize-none focus:outline-none overflow-y-auto"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Editor Footer Actions */}
                            <div className="flex justify-end pt-3 border-t border-slate-800 mt-3">
                                <Button 
                                    onClick={handleRunCode}
                                    disabled={isRunning}
                                    className="bg-saBlue hover:bg-saBlueDarkHover text-white font-bold h-9 px-4 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/10 text-xs"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    {isRunning ? 'Running...' : 'Run Code'}
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Terminal Console */}
                    <div className="lg:col-span-1 flex flex-col min-h-0">
                        <Card className="bg-slate-950 border border-slate-900 rounded-2xl p-4 shadow-lg flex-1 flex flex-col min-h-0 text-slate-200">
                            <h3 className="text-xs font-black mb-3 text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2.5">
                                <Terminal className="w-4 h-4" />
                                Output Console
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
                                    <div className="text-slate-600 italic text-center py-10 font-sans">
                                        Console is empty. Click 'Run Code' to execute.
                                    </div>
                                )}
                                {isRunning && (
                                    <div className="flex items-center gap-2 text-saBlue animate-pulse py-4 font-sans text-xs justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                        Compiling and executing code...
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
