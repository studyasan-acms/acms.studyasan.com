/**
 * ReactionOverlay Component
 * 
 * Google Meet style animated floating emojis and name tags overlay.
 */

import React, { useEffect, useState } from 'react';

export interface FloatingReaction {
    id: string;
    emoji: string;
    senderName: string;
    xPercent: number;
}

interface ReactionOverlayProps {
    reactions: FloatingReaction[];
}

export function ReactionOverlay({ reactions }: ReactionOverlayProps) {
    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {reactions.map((reaction) => (
                <div
                    key={reaction.id}
                    className="absolute bottom-24 flex flex-col items-center select-none"
                    style={{
                        left: `${reaction.xPercent}%`,
                        animation: 'floatUp 3.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    }}
                >
                    {/* Emoji Icon */}
                    <span className="text-4xl md:text-5xl filter drop-shadow-md">
                        {reaction.emoji}
                    </span>

                    {/* Sender Name Tag */}
                    <div className="mt-1 px-3 py-1 bg-slate-900/85 backdrop-blur-md text-white text-xs md:text-sm font-semibold rounded-full shadow-lg border border-white/20 whitespace-nowrap">
                        {reaction.senderName}
                    </div>
                </div>
            ))}

            {/* Float up CSS Keyframe Animation */}
            <style>{`
                @keyframes floatUp {
                    0% {
                        transform: translateY(0) scale(0.6);
                        opacity: 0;
                    }
                    12% {
                        transform: translateY(-40px) scale(1.15);
                        opacity: 1;
                    }
                    75% {
                        transform: translateY(-260px) scale(1);
                        opacity: 0.95;
                    }
                    100% {
                        transform: translateY(-380px) scale(0.85);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
