import { useEffect } from 'react';
import { Trophy, Star, Clock, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import confetti from 'canvas-confetti';

interface VictoryCelebrationModalProps {
  title?: string;
  activityTitle?: string;
  score: number;
  maxScore?: number;
  timeTaken?: number; // in seconds
  accuracy?: number; // percentage 0 - 100
  totalQuestions?: number;
  correctAnswers?: number;
  onContinue: () => void;
  continueText?: string;
}

/**
 * Animated Scholar Mascot Character SVG
 * Features joyful blinking eyes, graduation cap, swinging tassel, golden trophy, and celebratory wings.
 */
function ScholarMascot() {
  return (
    <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto flex items-center justify-center">
      {/* Background Pulsing Halo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/25 via-blue-500/20 to-saVividOrange/25 rounded-full blur-2xl animate-pulse" />

      {/* Orbiting Twinkling Stars */}
      <div className="absolute inset-0 pointer-events-none animate-spin-slow">
        <Star className="absolute top-2 left-4 w-5 h-5 text-amber-400 fill-amber-400 animate-bounce" style={{ animationDuration: '2s' }} />
        <Star className="absolute bottom-4 right-3 w-6 h-6 text-amber-400 fill-amber-400 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.4s' }} />
        <Sparkles className="absolute top-6 right-6 w-5 h-5 text-saBlueLight animate-pulse" />
        <Sparkles className="absolute bottom-6 left-6 w-4 h-4 text-saVividOrange animate-pulse" style={{ animationDelay: '0.7s' }} />
      </div>

      {/* Mascot Vector */}
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full relative z-10 drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="owlBody" x1="60" y1="40" x2="180" y2="210" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="0.5" stopColor="#1D4ED8" />
            <stop offset="1" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="owlBelly" x1="120" y1="110" x2="120" y2="200" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#DBEAFE" />
          </linearGradient>
          <linearGradient id="trophyGold" x1="150" y1="70" x2="210" y2="150" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FDE047" />
            <stop offset="0.4" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="capGrad" x1="80" y1="20" x2="160" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1E293B" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floating Animation Group */}
        <g className="animate-float-slow">
          {/* Owl Feet */}
          <path d="M85 205 C85 215, 100 215, 100 205" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" />
          <path d="M140 205 C140 215, 155 215, 155 205" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" />

          {/* Left Wing (Waving Joyfully) */}
          <path
            d="M58 135 C35 110, 25 145, 52 165 C58 152, 60 142, 58 135 Z"
            fill="#1D4ED8"
            stroke="#1E3A8A"
            strokeWidth="3"
            className="origin-[58px_135px] animate-bounce"
            style={{ animationDuration: '1.4s' }}
          />

          {/* Body */}
          <path
            d="M65 115 C65 65, 175 65, 175 115 C175 165, 165 205, 120 205 C75 205, 65 165, 65 115 Z"
            fill="url(#owlBody)"
            stroke="#1E3A8A"
            strokeWidth="3"
          />

          {/* Belly */}
          <ellipse cx="120" cy="155" rx="38" ry="42" fill="url(#owlBelly)" />

          {/* Belly Pattern Feathers */}
          <path d="M106 142 Q112 148 118 142" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M122 142 Q128 148 134 142" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M114 158 Q120 164 126 158" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M106 172 Q112 178 118 172" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M122 172 Q128 178 134 172" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Eye Left */}
          <circle cx="95" cy="100" r="21" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="3" />
          <circle cx="97" cy="100" r="11" fill="#0F172A" />
          <circle cx="94" cy="96" r="4.5" fill="#FFFFFF" />
          <circle cx="102" cy="103" r="2" fill="#FFFFFF" />

          {/* Eye Right */}
          <circle cx="145" cy="100" r="21" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="3" />
          <circle cx="143" cy="100" r="11" fill="#0F172A" />
          <circle cx="140" cy="96" r="4.5" fill="#FFFFFF" />
          <circle cx="148" cy="103" r="2" fill="#FFFFFF" />

          {/* Cute Rosy Cheeks */}
          <circle cx="75" cy="118" r="8" fill="#F472B6" opacity="0.6" />
          <circle cx="165" cy="118" r="8" fill="#F472B6" opacity="0.6" />

          {/* Cheerful Beak */}
          <polygon points="120,118 110,105 130,105" fill="#F59E0B" stroke="#D97706" strokeWidth="2" strokeLinejoin="round" />

          {/* Right Wing (Holding the Trophy) */}
          <path
            d="M172 132 C188 128, 202 142, 185 160 C175 155, 172 145, 172 132 Z"
            fill="#1D4ED8"
            stroke="#1E3A8A"
            strokeWidth="3"
          />

          {/* Golden Trophy Cup Held by Mascot */}
          <g transform="translate(162, 102) scale(0.72)">
            {/* Trophy Handles */}
            <path d="M12 25 C-8 25, -8 50, 14 55" stroke="url(#trophyGold)" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M58 25 C78 25, 78 50, 56 55" stroke="url(#trophyGold)" strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* Trophy Cup */}
            <path d="M10 15 L60 15 C60 45, 45 65, 35 68 C25 65, 10 45, 10 15 Z" fill="url(#trophyGold)" stroke="#B45309" strokeWidth="2" />
            {/* Star on Cup */}
            <polygon points="35,32 38,40 46,40 40,45 42,53 35,48 28,53 30,45 24,40 32,40" fill="#FFFFFF" opacity="0.9" />
            {/* Trophy Stem & Base */}
            <path d="M30 68 L40 68 L40 80 L30 80 Z" fill="url(#trophyGold)" />
            <rect x="20" y="80" width="30" height="10" rx="3" fill="#D97706" stroke="#92400E" strokeWidth="1.5" />
          </g>

          {/* Scholar Graduation Cap */}
          <g transform="translate(0, -6)">
            {/* Cap Skull Base */}
            <ellipse cx="120" cy="52" rx="30" ry="12" fill="#0F172A" />
            {/* Diamond Board */}
            <polygon points="120,24 184,42 120,60 56,42" fill="url(#capGrad)" stroke="#334155" strokeWidth="2" filter="url(#softGlow)" />
            {/* Golden Button */}
            <circle cx="120" cy="42" r="4" fill="#F59E0B" />
            {/* Swinging Golden Tassel */}
            <path d="M120 42 C145 44, 160 55, 162 76" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="162" cy="78" r="4.5" fill="#F59E0B" />
          </g>

          {/* Winner Ribbon Medal on Chest */}
          <g transform="translate(120, 185) scale(0.8)">
            <path d="M-8 0 L-14 18 L-5 14 L0 18 L0 0 Z" fill="#EF4444" />
            <path d="M8 0 L14 18 L5 14 L0 18 L0 0 Z" fill="#EF4444" />
            <circle cx="0" cy="0" r="10" fill="#F59E0B" stroke="#FDE047" strokeWidth="2" />
            <polygon points="0,-5 1.5,-1 5.5,-1 2.5,1.5 3.5,5.5 0,3 -3.5,5.5 -2.5,1.5 -5.5,-1 -1.5,-1" fill="#FFFFFF" />
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function VictoryCelebrationModal({
  title = 'Outstanding Work!',
  activityTitle = 'Activity Completed',
  score,
  maxScore,
  timeTaken,
  accuracy,
  totalQuestions,
  correctAnswers,
  onContinue,
  continueText = 'Claim Rewards & Continue',
}: VictoryCelebrationModalProps) {
  // Fire celebratory multi-stage confetti on mount
  useEffect(() => {
    const count = 200;
    const defaults = { origin: { y: 0.65 } };

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  // Compute number of stars earned (1 - 3 stars)
  let starCount = 3;
  if (accuracy !== undefined) {
    if (accuracy >= 85) starCount = 3;
    else if (accuracy >= 55) starCount = 2;
    else starCount = 1;
  } else if (maxScore && maxScore > 0) {
    const ratio = score / maxScore;
    if (ratio >= 0.8) starCount = 3;
    else if (ratio >= 0.5) starCount = 2;
    else starCount = 1;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-2xl p-6 sm:p-8 text-center overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Subtle Decorative Background Glows */}
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-blue-400/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-saVividOrange/15 blur-3xl pointer-events-none" />

        {/* Animated Mascot Character */}
        <ScholarMascot />

        {/* 3 Animated Trophy Stars */}
        <div className="flex items-center justify-center gap-3 my-2">
          {[1, 2, 3].map((starIndex) => {
            const isFilled = starIndex <= starCount;
            return (
              <div
                key={starIndex}
                className={`transform transition-all duration-500 ${
                  isFilled ? 'scale-100 animate-bounce' : 'scale-75 opacity-30 grayscale'
                }`}
                style={{ animationDelay: `${starIndex * 0.18}s`, animationDuration: '1.8s' }}
              >
                <div className="relative">
                  <Star
                    className={`w-9 h-9 sm:w-11 sm:h-11 ${
                      isFilled ? 'text-amber-400 fill-amber-400 drop-shadow-[0_4px_8px_rgba(245,158,11,0.4)]' : 'text-slate-300'
                    }`}
                  />
                  {isFilled && (
                    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-200 animate-spin-slow" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Headline & Activity Title */}
        <div className="mt-2 mb-5">
          <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-200/80 rounded-full text-[11px] font-black uppercase tracking-widest text-saBlue mb-2">
            {activityTitle}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Fantastic effort! You completed this challenge with flying colors.
          </p>
        </div>

        {/* Performance Metrics Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-6">
          {/* EXP Score */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 text-amber-600 mb-0.5">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-wider">Earned</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-amber-900 leading-tight">
              +{score} <span className="text-xs font-bold text-amber-700">EXP</span>
            </span>
          </div>

          {/* Time Taken */}
          {timeTaken !== undefined && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-slate-500 mb-0.5">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Time</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-800 leading-tight font-mono">
                {timeTaken}s
              </span>
            </div>
          )}

          {/* Accuracy / Questions cleared */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex flex-col items-center justify-center col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                {accuracy !== undefined ? 'Accuracy' : 'Cleared'}
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-emerald-800 leading-tight">
              {accuracy !== undefined
                ? `${Math.round(accuracy)}%`
                : correctAnswers !== undefined && totalQuestions !== undefined
                ? `${correctAnswers}/${totalQuestions}`
                : '100%'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full h-13 bg-gradient-to-r from-saBlue via-blue-600 to-saBlue hover:from-blue-700 hover:to-blue-800 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <span>{continueText}</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </Card>
    </div>
  );
}
