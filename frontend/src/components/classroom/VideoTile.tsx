/**
 * VideoTile Component
 * 
 * Displays a participant's video stream with overlay controls.
 * Includes teacher/admin controls for muting and removing students.
 */

import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, User, MoreVertical, UserX, VolumeX, PenTool } from 'lucide-react';
import type { Participant } from '@/types/videoRoom';

interface VideoTileProps {
    participant: Participant;
    stream?: MediaStream;
    isLocal?: boolean;
    isMain?: boolean;
    isScreenShare?: boolean;
    showOverflow?: number;
    onClick?: () => void;
    className?: string;
    // Teacher controls
    isTeacher?: boolean;
    onMuteParticipant?: (participantId: string | number) => void;
    onKickParticipant?: (participantId: string | number) => void;
    onToggleWhiteboardAccess?: (participantId: string | number) => void;
}

export function VideoTile({
    participant,
    stream,
    isLocal = false,
    isMain = false,
    isScreenShare = false,
    showOverflow,
    onClick,
    className = '',
    isTeacher = false,
    onMuteParticipant,
    onKickParticipant,
    onToggleWhiteboardAccess,
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [showControls, setShowControls] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (stream) {
            // Only update if stream reference actually changed
            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }
            // Force play in case autoPlay didn't fire (e.g. stream set before mount)
            video.play().catch(() => {}); // Ignore NotAllowedError (autoplay policy)
        } else {
            video.srcObject = null;
        }
    }, [stream]);

    // Force srcObject on mount in case stream is already set
    useEffect(() => {
        const video = videoRef.current;
        if (video && stream && video.srcObject !== stream) {
            video.srcObject = stream;
            video.play().catch(() => {});
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const hasVideo = (stream?.getVideoTracks().length ?? 0) > 0 && stream!.getVideoTracks().some(t => t.readyState !== 'ended');
    const isScreenStream = isScreenShare || participant.displayName?.endsWith(' (Screen)');
    const shouldShowVideo = isScreenStream ? !!stream : (!participant.isVideoOff && !!stream && hasVideo);
    const isScreen = isScreenShare || isMain || participant.displayName?.endsWith(' (Screen)');
    const shouldMirror = isLocal && !isScreen;

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

    const handleWhiteboardToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowControls(false);
        console.log(`[VideoTile] Toggling whiteboard access for participant: ${participant.id}, current state:`, participant.hasWhiteboardAccess);
        if (onToggleWhiteboardAccess) {
            onToggleWhiteboardAccess(participant.id);
        } else {
            console.warn('[VideoTile] onToggleWhiteboardAccess is undefined!');
        }
    };

    const handleControlsToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowControls(!showControls);
    };

    return (
        <div
            onClick={onClick}
            className={`
        relative rounded-xl border border-slate-200
        ${isMain ? 'w-full h-full bg-slate-900' : 'bg-slate-900'}
        ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all' : ''}
        ${className}
      `}
        >
            {/* Inner clipping wrapper for content */}
            <div className="absolute inset-0 overflow-hidden rounded-xl">
                {/* Video element */}
                {shouldShowVideo ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isLocal}
                        className={`w-full h-full bg-slate-900 ${isScreen ? 'object-contain' : 'object-cover'} ${shouldMirror ? 'scale-x-[-1]' : ''}`}
                    />
                ) : (
                    /* Avatar placeholder when no video */
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                        <div className="w-10 h-10 xs:w-12 xs:h-12 md:w-14 md:h-14 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center shadow-inner">
                            <User className="w-5 h-5 xs:w-6 xs:h-6 md:w-7 md:h-7 text-sky-400" />
                        </div>
                    </div>
                )}

                {/* Overflow indicator */}
                {showOverflow && showOverflow > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 text-white">
                        <span className="text-2xl font-bold">+{showOverflow}</span>
                    </div>
                )}

                {/* Hand Raised Badge */}
                {participant.isHandRaised && (
                    <div className="absolute top-1 left-1 md:top-1.5 md:left-1.5 z-20 flex items-center gap-0.5 md:gap-1 bg-amber-500/95 backdrop-blur-md text-white px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold shadow-md border border-amber-300/40 animate-bounce pointer-events-none">
                        <span>✋ Raised</span>
                    </div>
                )}

                {/* Bottom overlay with name and status (hidden in screen share stage for unobstructed view) */}
                {!isScreenShare && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-1.5 md:p-2 pointer-events-none">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-white text-[10px] xs:text-[11px] md:text-xs font-semibold truncate flex-1">
                                {participant.displayName}
                                {isLocal && ' (You)'}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0">
                                {participant.isMuted ? (
                                    <MicOff className="w-3 h-3 md:w-3.5 md:h-3.5 text-rose-400" />
                                ) : (
                                    <Mic className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-400" />
                                )}
                                {participant.isVideoOff ? (
                                    <VideoOff className="w-3 h-3 md:w-3.5 md:h-3.5 text-rose-400" />
                                ) : (
                                    <Video className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Speaking indicator */}
                {participant.isSpeaking && (
                    <div className="absolute inset-0 ring-4 ring-sky-400 ring-inset rounded-xl pointer-events-none" />
                )}
            </div>

            {/* Click outside to close controls */}
            {showControls && (
                <div
                    className="absolute inset-0 z-10"
                    onClick={(e) => { e.stopPropagation(); setShowControls(false); }}
                />
            )}

            {/* Teacher Controls Button (Outside overflow-hidden so dropdown isn't clipped) */}
            {canShowTeacherControls && (
                <div className="absolute top-2 right-2 z-20">
                    <button
                        onClick={handleControlsToggle}
                        className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                        title="Participant options"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {showControls && (
                        <div className="absolute top-8 right-0 bg-white rounded-lg shadow-lg py-1 min-w-40 z-30 ring-1 ring-black/5">
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
                            <button
                                onClick={handleWhiteboardToggle}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sky-600 hover:bg-sky-50"
                            >
                                <PenTool className="w-4 h-4" />
                                {participant.hasWhiteboardAccess ? 'Revoke Whiteboard' : 'Allow Whiteboard'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
