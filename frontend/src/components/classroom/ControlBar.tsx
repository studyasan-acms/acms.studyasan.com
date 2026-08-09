/**
 * ControlBar Component
 * 
 * Bottom control bar for classroom with mic, camera, screen share, hand raise, reactions, etc.
 */

import React, { useState } from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    MonitorOff,
    PhoneOff,
    PenTool,
    PersonStanding,
    Hand,
    Smile,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const EMOJI_LIST = ['💖', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔', '👎'];

interface ControlBarProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isWhiteboardActive: boolean;
    isHandRaised: boolean;
    isBackgroundActive: boolean;
    isConnected: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onToggleWhiteboard: () => void;
    onToggleHandRaise: () => void;
    onSendReaction: (emoji: string) => void;
    onToggleBackground: () => void;
    onLeave: () => void;
}

export function ControlBar({
    isMuted,
    isVideoOff,
    isScreenSharing,
    isWhiteboardActive,
    isHandRaised,
    isBackgroundActive,
    isConnected,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    onToggleWhiteboard,
    onToggleHandRaise,
    onSendReaction,
    onToggleBackground,
    onLeave,
}: ControlBarProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleReactionClick = (emoji: string) => {
        onSendReaction(emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="relative flex flex-col items-center">
            {/* Horizontal Floating Emoji Reactions Bar (matching user's uploaded screenshot 1) */}
            {showEmojiPicker && (
                <div className="absolute -top-16 mb-2 flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
                    {EMOJI_LIST.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={() => handleReactionClick(emoji)}
                            className="p-1.5 text-2xl hover:scale-130 transition-transform duration-150 active:scale-95 rounded-full hover:bg-white/20"
                            title={`Send ${emoji}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-1 md:gap-2 p-2 rounded-2xl md:rounded-full bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl max-w-[95vw] overflow-x-auto scrollbar-hide no-scrollbar">
                {/* Microphone Toggle */}
                <Button
                    variant={isMuted ? 'destructive' : 'outline'}
                    size="icon"
                    className={`h-10 w-10 rounded-full transition-all ${!isMuted
                        ? 'hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-red-500 hover:bg-red-600 border-red-500'
                        }`}
                    onClick={onToggleMic}
                    disabled={!isConnected}
                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>

                {/* Camera Toggle */}
                <Button
                    variant={isVideoOff ? 'destructive' : 'outline'}
                    size="icon"
                    className={`h-10 w-10 rounded-full transition-all ${!isVideoOff
                        ? 'hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-red-500 hover:bg-red-600 border-red-500'
                        }`}
                    onClick={onToggleCamera}
                    disabled={!isConnected}
                    title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
                >
                    {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                </Button>

                {/* Background Toggle */}
                <Button
                    variant={isBackgroundActive ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full ${isBackgroundActive
                        ? 'bg-gray-700 hover:bg-gray-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={onToggleBackground}
                    disabled={!isConnected}
                    title={isBackgroundActive ? 'Remove Background' : 'Gray Background'}
                >
                    <PersonStanding className="h-4 w-4" />
                </Button>

                {/* Separator */}
                <div className="w-px h-8 bg-slate-200 mx-1" />

                {/* Screen Share */}
                <Button
                    variant={isScreenSharing ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full ${isScreenSharing
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={onToggleScreenShare}
                    disabled={!isConnected}
                    title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                >
                    {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                </Button>

                {/* Whiteboard */}
                <Button
                    variant={isWhiteboardActive ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full relative ${isWhiteboardActive
                        ? 'bg-sky-500 hover:bg-sky-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={onToggleWhiteboard}
                    disabled={!isConnected}
                    title="Toggle Whiteboard"
                >
                    <PenTool className="h-4 w-4" />
                    {isWhiteboardActive && (
                        <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-white border-2 border-sky-500 rounded-full animate-pulse" />
                    )}
                </Button>

                {/* Separator */}
                <div className="w-px h-8 bg-slate-200 mx-1" />

                {/* Hand Raise Button */}
                <Button
                    variant={isHandRaised ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full relative transition-all ${isHandRaised
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30 animate-pulse'
                        : 'text-slate-700 hover:bg-slate-100'
                        }`}
                    onClick={onToggleHandRaise}
                    disabled={!isConnected}
                    title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
                >
                    <Hand className="h-5 w-5" />
                    {isHandRaised && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-amber-400 border-2 border-white rounded-full" />
                    )}
                </Button>

                {/* Quick Clap Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-xl hover:bg-slate-100 hover:scale-110 transition-transform"
                    onClick={() => onSendReaction('👏')}
                    disabled={!isConnected}
                    title="Clap 👏"
                >
                    👏
                </Button>

                {/* Emoji Reactions Picker Toggle Button */}
                <Button
                    variant={showEmojiPicker ? 'default' : 'ghost'}
                    size="icon"
                    className={`h-10 w-10 rounded-full ${showEmojiPicker
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={!isConnected}
                    title="Reactions 😊"
                >
                    <Smile className="h-5 w-5" />
                </Button>

                {/* Separator */}
                <div className="w-px h-8 bg-slate-200 mx-1" />

                {/* End Call */}
                <Button
                    variant="destructive"
                    size="icon"
                    className="h-10 w-14 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
                    onClick={onLeave}
                    title="Leave Classroom"
                >
                    <PhoneOff className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
