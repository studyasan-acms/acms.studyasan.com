import { useState, useEffect } from 'react';
import type { Activity } from '../../../types/activity';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityAttemptAPI } from '../../../services/activity.service';
import confetti from 'canvas-confetti';
import { X, Trophy, Clock, Star, Volume2, VolumeX, Heart } from 'lucide-react';
import { useSound } from '../../../hooks/useSound';

interface Props {
    activity: Activity;
    attemptId: number | null;
    onComplete: (score: number, timeTaken: number) => void;
    onCancel: () => void;
}

interface HangmanContent {
    word: string;
    hint?: string;
}

export default function HangmanGame({ activity, attemptId, onComplete, onCancel }: Props) {
    const [word, setWord] = useState('');
    const [hint, setHint] = useState('');
    const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
    const [wrongGuesses, setWrongGuesses] = useState(0);
    const [startTime] = useState(Date.now());
    const [score, setScore] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [currentItem, setCurrentItem] = useState(0);
    const maxWrongGuesses = 6;

    const { playSound, stopSound, stopAll } = useSound();

    useEffect(() => {
        const timer = setInterval(() => setTimeElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    useEffect(() => {
        if (!isMuted) {
            playSound('bg-music', { loop: true, volume: 0.3 });
        } else {
            stopSound('bg-music');
        }
        return () => stopAll();
    }, [isMuted]);

    useEffect(() => {
        if (activity.items && activity.items.length > 0 && activity.items[currentItem]) {
            const content = activity.items[currentItem].content as HangmanContent;
            setWord(content.word.toUpperCase());
            setHint(content.hint || '');
            setGuessedLetters(new Set());
            setWrongGuesses(0);
        }
    }, [activity, currentItem]);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const handleLetterClick = (letter: string) => {
        if (guessedLetters.has(letter)) return;

        const newGuessedLetters = new Set(guessedLetters);
        newGuessedLetters.add(letter);
        setGuessedLetters(newGuessedLetters);

        if (word.includes(letter)) {
            playSound('correct');
            const points = activity.items?.[currentItem]?.points || 10;
            setScore(score + points);

            confetti({
                particleCount: 30,
                spread: 50,
                origin: { y: 0.6 }
            });

            // Check if word is complete
            const isComplete = word.split('').every(char => char === ' ' || newGuessedLetters.has(char));
            if (isComplete) {
                submitResponse(letter, true);
                if (currentItem < (activity.items?.length || 1) - 1) {
                    setTimeout(() => {
                        setCurrentItem(currentItem + 1);
                    }, 2000);
                } else {
                    setTimeout(() => {
                        handleComplete(score + points);
                    }, 1000);
                }
            } else {
                submitResponse(letter, true);
            }
        } else {
            playSound('incorrect');
            const newWrongGuesses = wrongGuesses + 1;
            setWrongGuesses(newWrongGuesses);
            submitResponse(letter, false);

            if (newWrongGuesses >= maxWrongGuesses) {
                setTimeout(() => {
                    handleComplete(score);
                }, 1000);
            }
        }
    };

    const handleComplete = (finalScore: number) => {
        const timeTaken = Math.floor((Date.now() - startTime) / 1000);
        setShowCelebration(true);
        stopAll();
        playSound('game-over');

        confetti({
            particleCount: 200,
            spread: 100,
            origin: { y: 0.6 },
        });

        setTimeout(() => {
            onComplete(finalScore, timeTaken);
        }, 4000);
    };

    const submitResponse = async (letter: string, isCorrect: boolean) => {
        if (!attemptId) return;
        try {
            await activityAttemptAPI.submitResponse({
                attempt_id: attemptId,
                item_id: activity.items![currentItem].id,
                response: { letter },
                is_correct: isCorrect,
            });
        } catch (error) {
            console.error('Failed to submit response', error);
        }
    };

    const renderHangman = () => {
        const parts = [
            // Head
            <circle key="head" cx="140" cy="60" r="20" stroke="white" strokeWidth="3" fill="none" className={wrongGuesses >= 1 ? 'opacity-100' : 'opacity-0'} />,
            // Body
            <line key="body" x1="140" y1="80" x2="140" y2="130" stroke="white" strokeWidth="3" className={wrongGuesses >= 2 ? 'opacity-100' : 'opacity-0'} />,
            // Left arm
            <line key="leftarm" x1="140" y1="90" x2="110" y2="110" stroke="white" strokeWidth="3" className={wrongGuesses >= 3 ? 'opacity-100' : 'opacity-0'} />,
            // Right arm
            <line key="rightarm" x1="140" y1="90" x2="170" y2="110" stroke="white" strokeWidth="3" className={wrongGuesses >= 4 ? 'opacity-100' : 'opacity-0'} />,
            // Left leg
            <line key="leftleg" x1="140" y1="130" x2="120" y2="160" stroke="white" strokeWidth="3" className={wrongGuesses >= 5 ? 'opacity-100' : 'opacity-0'} />,
            // Right leg
            <line key="rightleg" x1="140" y1="130" x2="160" y2="160" stroke="white" strokeWidth="3" className={wrongGuesses >= 6 ? 'opacity-100' : 'opacity-0'} />,
        ];

        return (
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-xs mx-auto">
                {/* Gallows */}
                <line x1="20" y1="180" x2="180" y2="180" stroke="white" strokeWidth="4" />
                <line x1="50" y1="180" x2="50" y2="20" stroke="white" strokeWidth="4" />
                <line x1="50" y1="20" x2="140" y2="20" stroke="white" strokeWidth="4" />
                <line x1="140" y1="20" x2="140" y2="40" stroke="white" strokeWidth="4" />

                {/* Person parts */}
                {parts}
            </svg>
        );
    };

    const renderWord = () => {
        return word.split('').map((char, index) => {
            if (char === ' ') {
                return <div key={index} className="w-4" />;
            }
            return (
                <div
                    key={index}
                    className="w-10 h-12 xs:w-12 xs:h-14 sm:w-14 sm:h-16 flex items-center justify-center border-b-4 border-blue-400 text-2xl xs:text-3xl sm:text-4xl font-bold text-white mx-1"
                >
                    {guessedLetters.has(char) ? char : ''}
                </div>
            );
        });
    };

    if (showCelebration) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a] text-white">
                <Card className="gamified-card p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-purple-500/10" />
                    <Trophy className="w-32 h-32 mx-auto text-yellow-500 mb-8 animate-bounce relative z-10" />
                    <h2 className="text-5xl font-black mb-4 relative z-10">
                        {wrongGuesses >= maxWrongGuesses ? 'Game Over!' : 'You Won!'}
                    </h2>
                    <p className="text-3xl text-blue-300 mb-8 font-bold relative z-10">Score: {Math.round(score)}</p>
                    <div className="flex justify-center gap-4">
                        {[...Array(3)].map((_, i) => (
                            <Star key={i} className="w-12 h-12 text-yellow-400 fill-current animate-spin-slow" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#0f172a] text-white flex flex-col font-sans overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-900/40 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-900/40 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-black/20 backdrop-blur-md border-b border-white/5 z-20">
                <div className="flex items-center gap-4 sm:gap-6">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        Hangman
                    </h2>
                    {activity.items && activity.items.length > 1 && (
                        <div className="text-xs sm:text-sm text-gray-400">
                            Word {currentItem + 1} of {activity.items.length}
                        </div>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>
                </div>

                <div className="flex items-center gap-4 sm:gap-8">
                    <div className="flex items-center bg-red-400/10 px-4 sm:px-6 py-2 rounded-full text-red-400 border border-red-400/20">
                        <Heart className="w-5 h-5 sm:w-6 sm:h-6 mr-2 fill-current" />
                        <span className="font-bold text-lg sm:text-xl">{maxWrongGuesses - wrongGuesses}</span>
                    </div>
                    <div className="flex items-center bg-yellow-400/10 px-4 sm:px-6 py-2 rounded-full text-yellow-400 border border-yellow-400/20">
                        <Star className="w-5 h-5 sm:w-6 sm:h-6 mr-2 fill-current" />
                        <span className="font-bold text-lg sm:text-xl">{Math.round(score)}</span>
                    </div>
                    <div className="flex items-center bg-blue-400/10 px-4 sm:px-6 py-2 rounded-full text-blue-400 border border-blue-400/20">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                        <span className="font-bold text-lg sm:text-xl font-mono">{timeElapsed}s</span>
                    </div>
                    <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 transition-colors">
                        <X className="w-6 h-6 sm:w-8 sm:h-8" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 relative z-10 w-full max-w-6xl mx-auto flex flex-col">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                    {/* Hangman Drawing */}
                    <div className="flex flex-col">
                        <Card className="gamified-card p-6 sm:p-8 flex-1 flex items-center justify-center bg-slate-800/50 backdrop-blur-md border-slate-700">
                            {renderHangman()}
                        </Card>
                    </div>

                    {/* Word and Keyboard */}
                    <div className="flex flex-col gap-6">
                        {/* Hint */}
                        {hint && (
                            <Card className="gamified-card p-4 sm:p-6 bg-slate-800/50 backdrop-blur-md border-slate-700">
                                <h3 className="text-base sm:text-lg font-black mb-2 text-blue-300">Hint:</h3>
                                <p className="text-sm sm:text-base text-gray-300">{hint}</p>
                            </Card>
                        )}

                        {/* Word Display */}
                        <Card className="gamified-card p-6 sm:p-8 bg-slate-800/50 backdrop-blur-md border-slate-700">
                            <div className="flex flex-wrap justify-center items-center mb-0 gap-2">
                                {renderWord()}
                            </div>
                        </Card>

                        {/* Keyboard */}
                        <Card className="gamified-card p-4 sm:p-6 bg-slate-800/50 backdrop-blur-md border-slate-700">
                            <h3 className="text-base sm:text-lg font-black mb-4 text-center text-blue-300">Select a Letter</h3>
                            <div className="grid grid-cols-7 gap-2">
                                {alphabet.map((letter) => {
                                    const isGuessed = guessedLetters.has(letter);
                                    const isCorrect = isGuessed && word.includes(letter);
                                    const isWrong = isGuessed && !word.includes(letter);

                                    return (
                                        <button
                                            key={letter}
                                            onClick={() => handleLetterClick(letter)}
                                            disabled={isGuessed}
                                            className={`
                        aspect-square flex items-center justify-center rounded-lg font-bold text-sm sm:text-base
                        transition-all duration-200 border-2
                        ${isCorrect ? 'bg-green-500/20 border-green-400 text-green-300' : ''}
                        ${isWrong ? 'bg-red-500/20 border-red-400 text-red-300 line-through' : ''}
                        ${!isGuessed ? 'bg-slate-800/50 border-slate-600 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500 cursor-pointer' : 'cursor-not-allowed opacity-50'}
                      `}
                                        >
                                            {letter}
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
