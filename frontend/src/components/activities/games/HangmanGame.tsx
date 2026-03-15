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
            <svg viewBox="0 0 200 200" className="w-full h-full max-w-[160px] md:max-w-none mx-auto">
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
                    className="w-7 h-9 md:w-14 md:h-16 flex items-center justify-center border-b-2 md:border-b-4 border-saBlueLight text-lg md:text-3xl font-bold text-white mx-0.5 md:mx-1"
                >
                    {guessedLetters.has(char) ? char : ''}
                </div>
            );
        });
    };

    if (showCelebration) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#061a3a] text-white">
                <Card className="gamified-card p-12 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-saBlue/10 to-saVividOrange/10" />
                    <Trophy className="w-32 h-32 mx-auto text-saVividOrange mb-8 animate-bounce relative z-10" />
                    <h2 className="text-5xl font-black mb-4 relative z-10">
                        {wrongGuesses >= maxWrongGuesses ? 'Game Over!' : 'You Won!'}
                    </h2>
                    <p className="text-3xl text-saBlueLight mb-8 font-bold relative z-10">Score: {Math.round(score)}</p>
                    <div className="flex justify-center gap-4">
                        {[...Array(3)].map((_, i) => (
                            <Star key={i} className="w-12 h-12 text-saVividOrange fill-current animate-spin-slow" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#061a3a] text-white flex flex-col font-sans overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-saVividOrange/25 blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-saBlue/40 blur-[100px] rounded-full" />
            </div>

            {/* Header — single compact row */}
            <div className="px-3 py-2 flex items-center justify-between gap-2 bg-black/20 backdrop-blur-md border-b border-white/5 z-20 flex-wrap">
                <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-saVividOrange">
                        Hangman
                    </h2>
                    {activity.items && activity.items.length > 1 && (
                        <div className="text-xs text-gray-400">
                            Word {currentItem + 1} of {activity.items.length}
                        </div>
                    )}
                    <button onClick={() => setIsMuted(!isMuted)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-red-400/10 px-2 py-1 rounded-full text-red-400 border border-red-400/20 text-sm font-bold">
                        <Heart className="w-3.5 h-3.5 mr-1 fill-current" />
                        {maxWrongGuesses - wrongGuesses}
                    </div>
                    <div className="flex items-center bg-saVividOrange/10 px-2 py-1 rounded-full text-saVividOrange border border-saVividOrange/25 text-sm font-bold">
                        <Star className="w-3.5 h-3.5 mr-1 fill-current" />
                        {Math.round(score)}
                    </div>
                    <div className="flex items-center bg-saBlueLight/10 px-2 py-1 rounded-full text-saBlueLight border border-saBlueLight/20 text-sm font-bold font-mono">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        {timeElapsed}s
                    </div>
                    <Button variant="ghost" onClick={onCancel} className="hover:bg-red-500/20 hover:text-red-400 transition-colors h-7 w-7 p-0">
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row p-2 md:p-4 gap-2 md:gap-4 relative z-10 w-full max-w-6xl mx-auto overflow-hidden">

                {/* ── LEFT: hangman image + instructions + hint ── */}
                <div className="flex flex-row md:flex-col gap-2 md:gap-3 shrink-0 md:w-80 lg:w-96">
                    {/* Hangman Drawing */}
                    <Card className="gamified-card p-2 md:p-5 flex items-center justify-center bg-slate-800/50 backdrop-blur-md border-slate-700 w-[38%] md:w-full md:min-h-[340px] lg:min-h-[400px]">
                        <div className="w-full max-h-[160px] md:max-h-none">
                            {renderHangman()}
                        </div>
                    </Card>

                    {/* Instructions + Hint — always shown in left column */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0 justify-center md:justify-start md:shrink-0">
                        <Card className="gamified-card p-2 md:p-3 bg-saBlue/20 backdrop-blur-md border-saBlueLight/30">
                            <h3 className="text-xs font-black text-saVividOrange mb-0.5">How to play:</h3>
                            <p className="text-xs text-gray-300 leading-snug">Guess the hidden word by selecting letters. You have <span className="text-red-400 font-bold">6</span> wrong guesses!</p>
                        </Card>
                        {hint && (
                            <Card className="gamified-card p-2 md:p-3 bg-slate-800/50 backdrop-blur-md border-slate-700">
                                <h3 className="text-xs font-black text-saBlueLight">Hint:</h3>
                                <p className="text-xs text-gray-300 mt-0.5">{hint}</p>
                            </Card>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: word placeholder on top, keyboard below ── */}
                <div className="flex flex-col gap-2 md:gap-3 flex-1 min-w-0 overflow-hidden">

                    {/* Word Display */}
                    <Card className="gamified-card p-3 md:p-6 bg-slate-800/50 backdrop-blur-md border-slate-700 flex items-center justify-center shrink-0 md:min-h-[120px]">
                        <div className="flex flex-wrap justify-center items-center gap-1 md:gap-4">
                            {renderWord()}
                        </div>
                    </Card>

                    {/* Keyboard */}
                    <Card className="gamified-card p-2 md:p-4 bg-slate-800/50 backdrop-blur-md border-slate-700 flex-1 flex flex-col justify-center">
                        <div className="grid grid-cols-7 gap-1 md:gap-2">
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
                            aspect-square flex items-center justify-center rounded-md font-bold text-xs md:text-base
                            transition-all duration-200 border
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
    );
}
