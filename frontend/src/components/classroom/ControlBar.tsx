/**
 * ControlBar Component
 * 
 * Bottom control bar for classroom with mic, camera, screen share, etc.
 */

import React from 'react';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    Monitor,
    MonitorOff,
    PhoneOff,
    MessageSquare,
    PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ControlBarProps {
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isWhiteboardActive: boolean;
    isChatOpen: boolean;
    isConnected: boolean;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onToggleWhiteboard: () => void;
    onToggleChat: () => void;
    onLeave: () => void;
}

export function ControlBar({
    isMuted,
    isVideoOff,
    isScreenSharing,
    isWhiteboardActive,
    isChatOpen,
    isConnected,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    onToggleWhiteboard,
    onToggleChat,
    onLeave,
}: ControlBarProps) {
    return (
        <div className="flex items-center gap-2 p-2 rounded-full bg-white/90 backdrop-blur-xl border border-slate-200 shadow-lg">
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

            {/* Separator */}
            <div className="w-px h-8 bg-slate-200 mx-1" />

            {/* Screen Share */}
            <Button
                variant={isScreenSharing ? 'default' : 'ghost'}
                size="icon"
                className={`h-10 w-10 rounded-full ${isScreenSharing
                        ? 'bg-green-500 hover:bg-green-600 text-white'
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

            {/* Chat */}
            <Button
                variant={isChatOpen ? 'default' : 'ghost'}
                size="icon"
                className={`h-10 w-10 rounded-full ${isChatOpen
                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                onClick={onToggleChat}
                disabled={!isConnected}
                title="Chat"
            >
                <MessageSquare className="h-4 w-4" />
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
    );
}
