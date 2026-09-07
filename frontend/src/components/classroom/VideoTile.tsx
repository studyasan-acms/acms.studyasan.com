/**
 * VideoTile Component
 * 
 * Displays a participant's video stream with overlay controls.
 * Includes teacher/admin controls for muting and removing students.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Mic, MicOff, Video, VideoOff, MoreVertical, UserX, VolumeX, PenTool } from 'lucide-react';
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

function getAvatarGradient(name?: string): string {
    const gradients = [
        'from-blue-600 via-blue-800 to-slate-900',
        'from-orange-500 via-orange-700 to-slate-900',
        'from-blue-500 via-indigo-800 to-slate-900',
        'from-amber-500 via-orange-800 to-slate-900',
        'from-sky-500 via-blue-800 to-slate-900',
        'from-orange-600 via-amber-800 to-slate-900',
        'from-blue-700 via-blue-900 to-slate-900',
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
}

function getInitials(name?: string): string {
    if (!name) return 'U';
    const clean = name.replace(/\(You\)|\(Screen\)/gi, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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

    // Keep video element's srcObject synchronized with stream
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (stream) {
            if (video.srcObject !== stream) {
                video.srcObject = stream;
            }
            video.play().catch(() => {});
        } else {
            video.srcObject = null;
        }
    }, [stream]);

    const videoTracks = stream?.getVideoTracks() ?? [];
    const hasVideoTrack = videoTracks.length > 0;
    const isScreenStream = isScreenShare || participant.displayName?.endsWith(' (Screen)');

    // Should display the video (vs avatar placeholder):
    // - Screen share: show whenever there's a stream with video tracks
    // - Local/Remote user: show if participant's camera is NOT off and stream has video tracks
    const shouldShowVideo = isScreenStream
        ? (!!stream && hasVideoTrack)
        : (!participant.isVideoOff && !!stream && hasVideoTrack);

    const isScreen = isScreenShare || isMain || participant.displayName?.endsWith(' (Screen)');
    const shouldMirror = isLocal && !isScreen;

    // Show teacher controls only for non-local participants when user is teacher
    const canShowTeacherControls = isTeacher && !isLocal && !participant.isLocal;

    const avatarGradient = useMemo(() => getAvatarGradient(participant.displayName), [participant.displayName]);
    const initials = useMemo(() => getInitials(participant.displayName), [participant.displayName]);

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
                relative w-full h-full overflow-hidden rounded-xl bg-slate-950 isolate select-none
                ${participant.isSpeaking ? 'ring-2 ring-emerald-400 ring-inset shadow-[0_0_12px_rgba(52,211,153,0.3)]' : ''}
                ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-sky-400/80 transition-all' : ''}
                ${className}
            `}
        >
            {/* 
              Video element: Kept in DOM at all times!
              - For remote participants: plays audio continuously even when camera is off
              - For local participant: muted={true} prevents feedback
              - When camera is off: absolute inset-0 opacity-0 pointer-events-none keeps decoding active without showing black box
            */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full block bg-slate-950 ${isScreen ? 'object-contain' : 'object-cover'} ${shouldMirror ? 'scale-x-[-1]' : ''} ${shouldShowVideo ? 'relative z-10' : 'absolute inset-0 opacity-0 pointer-events-none'}`}
            />

            {/* Avatar placeholder with modern gradient and initials when video is off */}
            {!shouldShowVideo && (
                <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br ${avatarGradient} p-2`}>
                    <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                        <span className="text-white text-base xs:text-lg sm:text-xl font-bold tracking-wider drop-shadow-sm">
                            {initials}
                        </span>
                    </div>
                </div>
            )}

            {/* Overflow indicator */}
            {showOverflow && showOverflow > 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs text-white">
                    <span className="text-2xl font-bold">+{showOverflow}</span>
                </div>
            )}

            {/* Hand Raised Badge */}
            {participant.isHandRaised && (
                <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-amber-500/95 backdrop-blur-md text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md border border-amber-300/40 animate-bounce pointer-events-none">
                    <span>✋ Hand Raised</span>
                </div>
            )}

            {/* Bottom overlay with name and status badge (hidden in screen share stage for unobstructed view) */}
            {!isScreenShare && (
                <div className="absolute bottom-1.5 left-1.5 right-1.5 z-20 pointer-events-none flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-950/75 backdrop-blur-md rounded-lg border border-white/10 text-white shadow-xs">
                    <span className="text-[11px] sm:text-xs font-semibold truncate flex-1 leading-tight">
                        {participant.displayName}
                        {isLocal && ' (You)'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        {participant.isMuted ? (
                            <span className="p-0.5 rounded bg-rose-500/20 text-rose-400" title="Muted">
                                <MicOff className="w-3 h-3" />
                            </span>
                        ) : (
                            <span className="p-0.5 rounded bg-emerald-500/20 text-emerald-400" title="Microphone Active">
                                <Mic className="w-3 h-3" />
                            </span>
                        )}
                        {participant.isVideoOff ? (
                            <span className="p-0.5 rounded bg-rose-500/20 text-rose-400" title="Camera Off">
                                <VideoOff className="w-3 h-3" />
                            </span>
                        ) : (
                            <span className="p-0.5 rounded bg-sky-500/20 text-sky-300" title="Camera On">
                                <Video className="w-3 h-3" />
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Teacher Controls Button */}
            {canShowTeacherControls && (
                <div className="absolute top-2 right-2 z-30">
                    <button
                        onClick={handleControlsToggle}
                        className="p-1 rounded-full bg-slate-950/60 hover:bg-slate-900/90 text-white backdrop-blur-md border border-white/10 transition-colors shadow-sm"
                        title="Participant options"
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown Menu */}
                    {showControls && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => { e.stopPropagation(); setShowControls(false); }}
                            />
                            <div className="absolute top-7 right-0 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 min-w-44 z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md">
                                <button
                                    onClick={handleMute}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                    <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                                    {participant.isMuted ? 'Unmute' : 'Mute Audio'}
                                </button>
                                <button
                                    onClick={handleWhiteboardToggle}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-slate-800 hover:text-sky-200 transition-colors"
                                >
                                    <PenTool className="w-3.5 h-3.5" />
                                    {participant.hasWhiteboardAccess ? 'Revoke Whiteboard' : 'Allow Whiteboard'}
                                </button>
                                <div className="h-px bg-slate-800 my-1" />
                                <button
                                    onClick={handleKick}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                                >
                                    <UserX className="w-3.5 h-3.5" />
                                    Remove Participant
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
