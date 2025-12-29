/**
 * VideoTile Component
 * 
 * Displays a participant's video stream with overlay controls.
 * Includes teacher/admin controls for muting and removing students.
 */

import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, User, MoreVertical, UserX, VolumeX } from 'lucide-react';
import type { Participant } from '@/types/videoRoom';

interface VideoTileProps {
    participant: Participant;
    stream?: MediaStream;
    isLocal?: boolean;
    isMain?: boolean;
    showOverflow?: number;
    onClick?: () => void;
    className?: string;
    // Teacher controls
    isTeacher?: boolean;
    onMuteParticipant?: (participantId: string | number) => void;
    onKickParticipant?: (participantId: string | number) => void;
}

export function VideoTile({
    participant,
    stream,
    isLocal = false,
    isMain = false,
    showOverflow,
    onClick,
    className = '',
    isTeacher = false,
    onMuteParticipant,
    onKickParticipant,
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const hasVideo = stream?.getVideoTracks().some(t => t.enabled) ?? false;
    const hasAudio = stream?.getAudioTracks().some(t => t.enabled) ?? false;

    // Show teacher controls only for non-local participants when user is teacher
    const canShowTeacherControls = isTeacher && !isLocal && !participant.isLocal;

    const handleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowControls(false);
        onMuteParticipant?.(participant.id);
    };

    const handleKick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowControls(false);
        onKickParticipant?.(participant.id);
    };

    const handleControlsToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowControls(!showControls);
    };

    return (
        <div
            onClick={onClick}
            className={`
        relative overflow-hidden rounded-xl bg-slate-100 border border-slate-200
        ${isMain ? 'w-full h-full' : 'aspect-video'}
        ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all' : ''}
        ${className}
      `}
        >
            {/* Video element */}
            {stream && hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
                />
            ) : (
                /* Avatar placeholder when no video */
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-sky-100 flex items-center justify-center">
                        <User className="w-8 h-8 md:w-12 md:h-12 text-sky-500" />
                    </div>
                </div>
            )}

            {/* Overflow indicator */}
            {showOverflow && showOverflow > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 text-white">
                    <span className="text-2xl font-bold">+{showOverflow}</span>
                </div>
            )}

            {/* Teacher Controls Button */}
            {canShowTeacherControls && (
                <div className="absolute top-2 right-2 z-10">
                    <button
                        onClick={handleControlsToggle}
                        className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                        title="Participant options"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {showControls && (
                        <div className="absolute top-8 right-0 bg-white rounded-lg shadow-lg py-1 min-w-32 z-20">
                            <button
                                onClick={handleMute}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <VolumeX className="w-4 h-4" />
                                {participant.isMuted ? 'Unmute' : 'Mute'}
                            </button>
                            <button
                                onClick={handleKick}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                <UserX className="w-4 h-4" />
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Click outside to close controls */}
            {showControls && (
                <div
                    className="absolute inset-0 z-5"
                    onClick={(e) => { e.stopPropagation(); setShowControls(false); }}
                />
            )}

            {/* Bottom overlay with name and status */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 md:p-3">
                <div className="flex items-center justify-between">
                    <span className="text-white text-sm font-medium truncate max-w-[70%]">
                        {participant.displayName}
                        {isLocal && ' (You)'}
                    </span>
                    <div className="flex items-center gap-1">
                        {participant.isMuted || !hasAudio ? (
                            <MicOff className="w-4 h-4 text-red-400" />
                        ) : (
                            <Mic className="w-4 h-4 text-white" />
                        )}
                        {participant.isVideoOff || !hasVideo ? (
                            <VideoOff className="w-4 h-4 text-red-400" />
                        ) : (
                            <Video className="w-4 h-4 text-white" />
                        )}
                    </div>
                </div>
            </div>

            {/* Speaking indicator */}
            {participant.isSpeaking && (
                <div className="absolute inset-0 ring-4 ring-sky-400 ring-inset rounded-xl pointer-events-none" />
            )}
        </div>
    );
}
