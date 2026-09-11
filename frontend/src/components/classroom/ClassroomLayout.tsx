/**
 * ClassroomLayout Component
 * 
 * Main layout orchestrator for the classroom view, faithfully matching
 * the wireframe designs for Desktop / Tablet and Mobile Phone.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    Clock,
    GraduationCap,
    ChevronLeft,
    ChevronRight,
    Pause,
    Play,
    Users,
    Monitor,
    PenTool,
    Maximize2,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';

import { VideoTile } from './VideoTile';
import { ControlBar } from './ControlBar';
import { Whiteboard } from './Whiteboard';
import { ReactionOverlay } from './ReactionOverlay';
import { RecordingControls } from './RecordingControls';
import type { FloatingReaction } from './ReactionOverlay';
import type { Participant, WhiteboardMessage, LocalUserState } from '@/types/videoRoom';

interface ClassroomLayoutProps {
    // Connection
    isConnected: boolean;

    // Recording (360p / 30-day retention)
    isRecording?: boolean;
    formattedDuration?: string;
    isUploading?: boolean;
    uploadProgress?: number;
    onStartRecording?: () => void;
    onStopRecording?: () => void;

    // Local user
    localStream: MediaStream | null;
    screenStream?: MediaStream | null;
    localUser: LocalUserState;

    // Remote participants
    participants: Map<string | number, Participant>;
    remoteStreams: Map<string | number, MediaStream>;

    // Main view
    mainParticipantId: string | number | null;
    isScreenSharing: boolean;

    // Background
    isBackgroundActive: boolean;
    onToggleBackground: () => void;

    // Reactions & Hand Raise
    reactions: FloatingReaction[];
    onToggleHandRaise: () => void;
    onSendReaction: (emoji: string) => void;

    // Teacher controls
    isTeacher: boolean;
    isAdmin?: boolean;        // Admin observer — NOT pinned as teacher
    teacherName?: string | null;
    onMuteParticipant?: (participantId: string | number) => void;
    onKickParticipant?: (participantId: string | number) => void;
    onToggleWhiteboardAccess?: (participantId: string | number) => void;

    // Actions
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onLeave: () => void;
    onSetMainParticipant: (id: string | number | null) => void;

    // Whiteboard
    sendWhiteboardMessage: (message: WhiteboardMessage) => void;
    setWhiteboardMessageHandler: (handler: (message: WhiteboardMessage) => void) => void;
}

function isBotUser(p: Participant | { displayName?: string } | null | undefined): boolean {
    if (!p || !p.displayName) return false;
    const name = p.displayName.trim().toLowerCase();
    return name === 'recording bot' || name.includes('recording bot') || name.startsWith('[bot]');
}

function RemoteAudioPlayer({ stream }: { stream: MediaStream }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    useEffect(() => {
        const el = audioRef.current;
        if (!el) return;
        if (el.srcObject !== stream) {
            el.srcObject = stream;
        }
        el.play().catch(() => {});
    }, [stream]);

    return <audio ref={audioRef} autoPlay playsInline />;
}

function getStreamForParticipant(
    streams: Map<string | number, MediaStream>,
    participantId: string | number | undefined
): MediaStream | undefined {
    if (participantId === undefined || participantId === null) return undefined;
    if (streams.has(participantId)) return streams.get(participantId);
    const strId = String(participantId);
    for (const [key, stream] of streams.entries()) {
        if (String(key) === strId) return stream;
    }
    return undefined;
}

/**
 * When a participant has joined from multiple devices (same displayName),
 * their entries are stored in `_siblingIds`. This helper checks the winning
 * participant's own stream first, then falls back to any sibling stream that
 * has a live video track — ensuring the tile always shows the active camera.
 */
function getBestStreamForParticipant(
    participant: Participant,
    remoteStreams: Map<string | number, MediaStream>,
    localStream: MediaStream | null
): MediaStream | undefined {
    // Local participant always uses localStream
    if (participant.isLocal) return localStream || undefined;

    // Try the primary id first
    const primary = getStreamForParticipant(remoteStreams, participant.id);

    // If primary has live video, use it
    if (primary && primary.getVideoTracks().some(t => t.enabled && t.readyState !== 'ended')) {
        return primary;
    }

    // Check sibling device entries for a better (camera-on) stream
    const siblings: (string | number)[] = (participant as any)._siblingIds ?? [];
    for (const sibId of siblings) {
        const sib = getStreamForParticipant(remoteStreams, sibId);
        if (sib && sib.getVideoTracks().some(t => t.enabled && t.readyState !== 'ended')) {
            return sib;
        }
    }

    // Fall back to primary stream (audio-only is fine)
    return primary;
}

/**
 * Deduplicate a participant list by displayName.
 * When multiple entries share the same displayName (same person, multiple devices),
 * pick the single best representative:
 *   1. Prefer the entry whose camera is ON (!isVideoOff)
 *   2. Among those, prefer the entry whose mic is ON (!isMuted)
 *   3. Otherwise first seen
 * Store sibling IDs on the winner as `_siblingIds` so stream resolution can
 * later fall back to another device's stream if the winner's stream is muted/off.
 */
function deduplicateParticipants(list: Participant[]): Participant[] {
    // Group by canonical displayName (trim + lower for comparison)
    const groups = new Map<string, Participant[]>();
    for (const p of list) {
        const key = (p.displayName ?? '').trim().toLowerCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(p);
    }

    const result: Participant[] = [];
    for (const group of groups.values()) {
        if (group.length === 1) {
            result.push(group[0]);
            continue;
        }
        // Multiple devices — pick the best representative
        // Scoring: camera on = 2 pts, mic on = 1 pt
        let best = group[0];
        let bestScore = (best.isVideoOff ? 0 : 2) + (best.isMuted ? 0 : 1);
        for (let i = 1; i < group.length; i++) {
            const p = group[i];
            const score = (p.isVideoOff ? 0 : 2) + (p.isMuted ? 0 : 1);
            if (score > bestScore) {
                bestScore = score;
                best = p;
            }
        }
        // Attach sibling IDs to the winner for stream resolution
        const siblingIds = group.filter(p => String(p.id) !== String(best.id)).map(p => p.id);
        // Derive merged state: camera/mic are ON if ANY device has them on
        const anyVideoOn = group.some(p => !p.isVideoOff);
        const anyMicOn   = group.some(p => !p.isMuted);
        const winner: Participant = {
            ...best,
            isVideoOff: !anyVideoOn,
            isMuted:    !anyMicOn,
            _siblingIds: siblingIds,
        } as Participant & { _siblingIds: (string | number)[] };
        result.push(winner);
    }
    return result;
}

export function ClassroomLayout({
    isConnected,
    isRecording = false,
    formattedDuration = '00:00',
    isUploading = false,
    uploadProgress = 0,
    onStartRecording,
    onStopRecording,
    localStream,
    screenStream,
    localUser,
    participants,
    remoteStreams,
    isScreenSharing,
    isBackgroundActive,
    onToggleBackground,
    reactions,
    onToggleHandRaise,
    onSendReaction,
    isTeacher,
    isAdmin = false,
    teacherName,
    onMuteParticipant,
    onKickParticipant,
    onToggleWhiteboardAccess,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    onLeave,
    sendWhiteboardMessage,
    setWhiteboardMessageHandler,
}: ClassroomLayoutProps) {
    // Whiteboard is open by default per wireframe design
    const [isWhiteboardActive, setIsWhiteboardActive] = useState(true);
    const [stageView, setStageView] = useState<'whiteboard' | 'screen'>('whiteboard');

    // Real-time digital clock for header
    const [currentTime, setCurrentTime] = useState<string>('');
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    const isLocalBot = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('bot') === 'true') || isBotUser(localUser);

    // Build complete participant list including local user (excluding bot)
    const localParticipant: Participant = useMemo(() => ({
        id: 'local',
        displayName: localUser.displayName,
        stream: localStream || undefined,
        isLocal: true,
        isMuted: localUser.isMuted,
        isVideoOff: localUser.isVideoOff,
        isScreenSharing: localUser.isScreenSharing,
        isSpeaking: false,
        hasWhiteboardAccess: localUser.hasWhiteboardAccess,
        isHandRaised: localUser.isHandRaised,
        isTeacher: isTeacher,
    }), [localUser, localStream, isTeacher]);

    const allParticipants = useMemo(() => {
        const list: Participant[] = [];
        if (!isLocalBot) {
            list.push(localParticipant);
        }
        const seenIds = new Set<string>(list.map(p => String(p.id)));

        for (const p of participants.values()) {
            if (isBotUser(p)) continue;
            const strId = String(p.id);
            if (seenIds.has(strId)) continue;
            seenIds.add(strId);
            list.push(p);
        }
        // Deduplicate participants who joined from multiple devices (same displayName).
        // This prevents avatar<->video blinking caused by competing state-sync messages
        // from each device updating the same rendered tile back and forth.
        return deduplicateParticipants(list);
    }, [localParticipant, participants, isLocalBot]);

    // Identify Teacher Participant:
    // - If local user is the actual teacher (isTeacher=true AND not admin), pin local user.
    // - Admin (isAdmin=true) is NEVER pinned as teacher even if they have elevated permissions.
    // - Otherwise, find remote participant whose displayName matches teacherName.
    const teacherParticipant = useMemo<Participant | null>(() => {
        // Only pin local as teacher if they are the actual teacher (not an admin observer and not bot)
        if (isTeacher && !isAdmin && !isLocalBot) {
            return localParticipant;
        }
        if (teacherName) {
            const match = allParticipants.find(
                p => !p.isLocal && !isBotUser(p) && p.displayName?.trim().toLowerCase() === teacherName.trim().toLowerCase()
            );
            if (match) return match;
        }
        const roleMatch = allParticipants.find(
            p => !p.isLocal && !isBotUser(p) && (
                p.displayName?.toLowerCase().includes('teacher') ||
                p.displayName?.toLowerCase().includes('instructor')
            )
        );
        if (roleMatch) return roleMatch;

        // Fallback to first remote participant if not explicitly found
        const firstRemote = allParticipants.find(
            p => !p.isLocal && !isBotUser(p) && !p.displayName?.endsWith(' (Screen)')
        );
        return firstRemote || null;
    }, [isTeacher, isAdmin, teacherName, localParticipant, allParticipants, isLocalBot]);

    // Human participants only (excluding any separate screen publishers and bots)
    const humanParticipants = useMemo(() => {
        return allParticipants.filter(p => !isBotUser(p) && !p.displayName?.endsWith(' (Screen)'));
    }, [allParticipants]);

    // Student participants: all participants except the pinned teacher and separate screen feeds
    const studentParticipants = useMemo(() => {
        return allParticipants.filter(p => {
            if (isBotUser(p)) return false;
            if (p.displayName?.endsWith(' (Screen)')) return false;
            if (teacherParticipant) {
                if (String(p.id) === String(teacherParticipant.id)) return false;
                if (teacherParticipant.isLocal && p.isLocal) return false;
                if (!teacherParticipant.isLocal && !p.isLocal && teacherParticipant.displayName && p.displayName?.trim().toLowerCase() === teacherParticipant.displayName.trim().toLowerCase()) {
                    return false;
                }
            }
            return true;
        });
    }, [allParticipants, teacherParticipant]);

    // Active Screen Share detection:
    // Priority 1: If local user is screen sharing and has screenStream, use localParticipant immediately
    // Priority 2: Dedicated remote screen publisher (has " (Screen)" suffix)
    // Priority 3: Any remote participant with isScreenSharing: true
    const screenShareParticipant = useMemo(() => {
        if (isScreenSharing && screenStream) {
            return localParticipant;
        }

        // First, look for the dedicated screen publisher (has " (Screen)" suffix)
        const screenPublisher = allParticipants.find(
            p => !p.isLocal && p.displayName?.endsWith(' (Screen)')
        );
        if (screenPublisher) return screenPublisher;

        // Fallback: check remote participant with isScreenSharing flag
        const remoteSharing = allParticipants.find(
            p => !p.isLocal && p.isScreenSharing && !p.displayName?.endsWith(' (Screen)')
        );
        if (remoteSharing) return remoteSharing;

        return null;
    }, [isScreenSharing, screenStream, localParticipant, allParticipants]);

    const isScreenShareActive = !!screenShareParticipant;

    // Automatically switch stage to screen share when screen sharing begins
    useEffect(() => {
        if (isScreenShareActive) {
            setStageView('screen');
        } else {
            setStageView('whiteboard');
        }
    }, [isScreenShareActive]);

    // Screen share zoom & pan state
    const [screenZoom, setScreenZoom] = useState(1);
    const [screenPan, setScreenPan] = useState({ x: 0, y: 0 });
    const screenPanStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
    const screenContainerRef = useRef<HTMLDivElement>(null);

    const handleScreenWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        setScreenZoom(prev => Math.min(4, Math.max(1, prev - e.deltaY * 0.001)));
    }, []);

    const handleScreenMouseDown = useCallback((e: React.MouseEvent) => {
        if (screenZoom <= 1) return;
        screenPanStart.current = { mx: e.clientX, my: e.clientY, px: screenPan.x, py: screenPan.y };
    }, [screenZoom, screenPan]);

    const handleScreenMouseMove = useCallback((e: React.MouseEvent) => {
        if (!screenPanStart.current) return;
        setScreenPan({
            x: screenPanStart.current.px + (e.clientX - screenPanStart.current.mx),
            y: screenPanStart.current.py + (e.clientY - screenPanStart.current.my),
        });
    }, []);

    const handleScreenMouseUp = useCallback(() => { screenPanStart.current = null; }, []);

    // Reset pan when zoom returns to 1
    useEffect(() => { if (screenZoom <= 1) setScreenPan({ x: 0, y: 0 }); }, [screenZoom]);

    // Reset zoom/pan when screen share ends
    useEffect(() => { if (!isScreenShareActive) { setScreenZoom(1); setScreenPan({ x: 0, y: 0 }); } }, [isScreenShareActive]);

    const handleScreenFullscreen = useCallback(() => {
        if (!screenContainerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else {
            screenContainerRef.current.requestFullscreen().catch(() => {});
        }
    }, []);


    return (
        <div className="relative w-full h-full bg-slate-100 flex flex-col overflow-hidden select-none">
            {/* ========================================================= */}
            {/* TOP HEADER: Logo | TIME & Recording Status               */}
            {/* ========================================================= */}
            <header className="h-14 bg-blue-700 border-b border-blue-800 px-4 flex items-center justify-between shrink-0 shadow-md z-20">
                {/* Logo (Left) */}
                <div className="flex items-center gap-2">
                    <img
                        src="/studyasan-logo.png"
                        alt="StudyAsan Logo"
                        className="h-10 md:h-11 object-contain"
                        onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                        }}
                    />
                </div>

                {/* Right: TIME & Recording Status */}
                <div className="flex items-center gap-2 md:gap-3">
                    {/* Real-time Clock */}
                    {currentTime && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-800/80 border border-blue-600/60 rounded-lg text-white text-xs font-semibold shadow-xs">
                            <Clock className="w-3.5 h-3.5 text-blue-200" />
                            <span>{currentTime}</span>
                        </div>
                    )}

                    <div className="hidden sm:block w-px h-4 bg-blue-600/60 my-auto" />

                    {/* Universal Recording Indicator */}
                    <RecordingControls
                        isTeacher={isTeacher}
                        isRecording={isRecording}
                        formattedDuration={formattedDuration}
                        isUploading={isUploading}
                        uploadProgress={uploadProgress}
                        onStartRecording={onStartRecording || (() => { })}
                        onStopRecording={onStopRecording || (() => { })}
                    />

                    {/* Connection status indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-blue-100 pl-1 border-l border-blue-600/60">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span className="hidden lg:inline font-medium">{isConnected ? 'Connected' : 'Offline'}</span>
                    </div>
                </div>
            </header>

            {/* Floating Animated Reaction Emojis */}
            <ReactionOverlay reactions={reactions} />

            {/* ========================================================= */}
            {/* DESKTOP / TABLET LAYOUT (`computer / tablet`)            */}
            {/* ========================================================= */}
            <div className="hidden md:flex flex-1 flex-row p-3 gap-3 overflow-hidden bg-slate-100 min-h-0">
                {/* LEFT SECTION: Main Stage (Whiteboard / Screen Share) + Controls */}
                <div className="flex-1 flex flex-col gap-2.5 min-w-0 h-full">
                    {/* Main Stage */}
                    <div className="flex-1 relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm min-h-0">
                        {/* 1. Active Screen Share Stage */}
                        {stageView === 'screen' && screenShareParticipant ? (
                            <div
                                ref={screenContainerRef}
                                className="w-full h-full relative bg-slate-950 overflow-hidden select-none"
                                onWheel={handleScreenWheel}
                                onMouseDown={handleScreenMouseDown}
                                onMouseMove={handleScreenMouseMove}
                                onMouseUp={handleScreenMouseUp}
                                onMouseLeave={handleScreenMouseUp}
                                style={{ cursor: screenZoom > 1 ? (screenPanStart.current ? 'grabbing' : 'grab') : 'default' }}
                            >
                                {/* Zoomable/pannable screen content */}
                                <div
                                    className="w-full h-full transition-none"
                                    style={{
                                        transform: `scale(${screenZoom}) translate(${screenPan.x / screenZoom}px, ${screenPan.y / screenZoom}px)`,
                                        transformOrigin: 'center center',
                                    }}
                                >
                                    {(() => {
                                        const localUserIsSharing = isScreenSharing && (
                                            screenShareParticipant.isLocal ||
                                            screenShareParticipant.displayName?.replace(' (Screen)', '') === localUser.displayName
                                        );
                                        const screenStream_ = localUserIsSharing
                                            ? (screenStream || undefined)
                                            : (getStreamForParticipant(remoteStreams, screenShareParticipant.id) || screenShareParticipant.stream);
                                        return (
                                            <VideoTile
                                                participant={screenShareParticipant}
                                                stream={screenStream_}
                                                isLocal={localUserIsSharing}
                                                isMain
                                                isScreenShare
                                                isTeacher={isTeacher}
                                                className="w-full h-full"
                                            />
                                        );
                                    })()}
                                </div>

                                {/* Top control bar */}
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-full text-white text-xs shadow-lg">
                                    <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>
                                        <strong>{screenShareParticipant.displayName?.replace(' (Screen)', '')}</strong>'s Screen
                                    </span>
                                    <div className="w-px h-3.5 bg-white/30" />
                                    <button
                                        onClick={() => setScreenZoom(z => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title="Zoom in"
                                    >
                                        <ZoomIn className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[11px] font-mono w-9 text-center">{Math.round(screenZoom * 100)}%</span>
                                    <button
                                        onClick={() => setScreenZoom(z => Math.max(1, Math.round((z - 0.25) * 100) / 100))}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title="Zoom out"
                                    >
                                        <ZoomOut className="w-3.5 h-3.5" />
                                    </button>
                                    {screenZoom > 1 && (
                                        <button
                                            onClick={() => { setScreenZoom(1); setScreenPan({ x: 0, y: 0 }); }}
                                            className="px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-[10px] font-medium transition-colors"
                                            title="Reset zoom"
                                        >
                                            Reset
                                        </button>
                                    )}
                                    <div className="w-px h-3.5 bg-white/30" />
                                    <button
                                        onClick={handleScreenFullscreen}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title="Fullscreen"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="w-px h-3.5 bg-white/30" />
                                    <button
                                        onClick={() => setStageView('whiteboard')}
                                        className="px-2.5 py-0.5 bg-sky-500 hover:bg-sky-600 rounded-full text-[11px] font-semibold transition-colors"
                                    >
                                        Whiteboard
                                    </button>
                                </div>
                            </div>

                        ) : isWhiteboardActive ? (
                            <Whiteboard
                                isActive={isWhiteboardActive}
                                onClose={() => setIsWhiteboardActive(false)}
                                sendMessage={sendWhiteboardMessage}
                                onRemoteMessage={setWhiteboardMessageHandler}
                                canEdit={localUser.hasWhiteboardAccess ?? false}
                                showCloseButton={false}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600">
                                <PenTool className="w-10 h-10 text-sky-600 mb-2" />
                                <span className="text-sm font-semibold text-slate-800">Whiteboard is Closed</span>
                                <span className="text-xs text-slate-600 mb-4">Click below to open the collaborative whiteboard</span>
                                <button
                                    onClick={() => setIsWhiteboardActive(true)}
                                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                >
                                    Open Whiteboard
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Controls (Positioned directly below whiteboard in left column) */}
                    <div className="w-full flex items-center justify-center shrink-0">
                        <ControlBar
                            isMuted={localUser.isMuted}
                            isVideoOff={localUser.isVideoOff}
                            isScreenSharing={isScreenSharing}
                            isWhiteboardActive={isWhiteboardActive}
                            isHandRaised={localUser.isHandRaised ?? false}
                            isBackgroundActive={isBackgroundActive}
                            isConnected={isConnected}
                            onToggleMic={onToggleMic}
                            onToggleCamera={onToggleCamera}
                            onToggleScreenShare={onToggleScreenShare}
                            onToggleWhiteboard={() => setIsWhiteboardActive(!isWhiteboardActive)}
                            onToggleHandRaise={onToggleHandRaise}
                            onSendReaction={onSendReaction}
                            onToggleBackground={onToggleBackground}
                            onLeave={onLeave}
                        />
                    </div>
                </div>

                {/* RIGHT SECTION: Video Gallery (Teacher Pinned + Scrollable Square Student Grid) */}
                <div className="w-72 lg:w-80 xl:w-96 flex flex-col gap-2.5 h-full shrink-0 min-h-0 bg-slate-200/50 p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
                    {/* Top Card: Teacher always pinned */}
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border-2 border-sky-400/90 shadow-md shrink-0 isolate">
                        {teacherParticipant ? (
                            <VideoTile
                                participant={teacherParticipant}
                                stream={getBestStreamForParticipant(teacherParticipant, remoteStreams, localStream)}
                                isLocal={teacherParticipant.isLocal}
                                isMain={false}
                                isTeacher={isTeacher}
                                onMuteParticipant={onMuteParticipant}
                                onKickParticipant={onKickParticipant}
                                onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                className="w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 p-4">
                                <GraduationCap className="w-10 h-10 text-sky-400/70 mb-2 animate-pulse" />
                                <span className="text-xs font-semibold text-slate-300">Teacher</span>
                                <span className="text-[11px] text-slate-400">Waiting to join...</span>
                            </div>
                        )}

                        {/* Pinned Teacher Badge */}
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-0.5 bg-gradient-to-r from-sky-600 to-blue-600 backdrop-blur-md text-white rounded-full text-[10px] font-bold shadow-md border border-sky-300/30 pointer-events-none">
                            <GraduationCap className="w-3 h-3" />
                            <span>Teacher (Pinned)</span>
                        </div>
                    </div>

                    {/* Middle Header: Student Count & Scroll Info */}
                    <div className="flex items-center justify-between px-1 text-xs text-slate-600 font-semibold shrink-0">
                        <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-sky-500" />
                            <span>Students ({studentParticipants.length})</span>
                        </span>
                        {studentParticipants.length > 4 && (
                            <span className="text-[10px] font-normal text-slate-400">Scroll for more ↓</span>
                        )}
                    </div>

                    {/* Middle Grid: Square Student Grid (Scrollable) */}
                    <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 scrollbar-thin">
                        {studentParticipants.length === 0 ? (
                            <div className="w-full h-36 flex flex-col items-center justify-center bg-white/60 rounded-xl border border-dashed border-slate-300 text-slate-400 p-4">
                                <Users className="w-8 h-8 text-slate-300 mb-1.5" />
                                <span className="text-xs font-semibold text-slate-600">No Students Yet</span>
                                <span className="text-[11px] text-slate-400">Waiting for participants to join...</span>
                            </div>
                        ) : studentParticipants.length === 1 ? (
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xs isolate">
                                <VideoTile
                                    participant={studentParticipants[0]}
                                    stream={getBestStreamForParticipant(studentParticipants[0], remoteStreams, localStream)}
                                    isLocal={studentParticipants[0].isLocal}
                                    isTeacher={isTeacher}
                                    onMuteParticipant={onMuteParticipant}
                                    onKickParticipant={onKickParticipant}
                                    onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                    className="w-full h-full"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 auto-rows-min">
                                {studentParticipants.map((participant) => {
                                    const stream = getBestStreamForParticipant(participant, remoteStreams, localStream);
                                    return (
                                        <div
                                            key={String(participant.id)}
                                            className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xs isolate"
                                        >
                                            <VideoTile
                                                participant={participant}
                                                stream={stream}
                                                isLocal={participant.isLocal}
                                                isTeacher={isTeacher}
                                                onMuteParticipant={onMuteParticipant}
                                                onKickParticipant={onKickParticipant}
                                                onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                                className="w-full h-full"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ========================================================= */}
            {/* MOBILE PHONE LAYOUT (`mobile phone`)                     */}
            {/* ========================================================= */}
            <div className="flex md:hidden flex-1 flex-col p-1.5 gap-1.5 overflow-hidden bg-slate-100 min-h-0">
                {/* Top Stage: Whiteboard / Screen Share (Fills remaining height) */}
                <div className="w-full rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs relative flex flex-col flex-1 min-h-[220px]">
                    {stageView === 'screen' && screenShareParticipant ? (
                        <div className="w-full h-full relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                            {/* Local / Remote screen stream resolution for mobile */}
                            {(() => {
                                const localUserIsSharing = isScreenSharing && (
                                    screenShareParticipant.isLocal ||
                                    screenShareParticipant.displayName?.replace(' (Screen)', '') === localUser.displayName
                                );
                                const screenStream_ = localUserIsSharing
                                    ? (screenStream || undefined)
                                    : (getStreamForParticipant(remoteStreams, screenShareParticipant.id) || screenShareParticipant.stream);
                                return (
                                    <VideoTile
                                        participant={screenShareParticipant}
                                        stream={screenStream_}
                                        isLocal={localUserIsSharing}
                                        isMain
                                        isScreenShare
                                        isTeacher={isTeacher}
                                        className="w-full h-full"
                                    />
                                );
                            })()}

                            {/* Top info/switcher pill on mobile */}
                            <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between px-2.5 py-1 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-full text-white text-xs shadow-md">
                                <div className="flex items-center gap-1.5 truncate">
                                    <Monitor className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="font-medium truncate">{screenShareParticipant.displayName?.replace(' (Screen)', '')}'s Screen</span>
                                </div>
                                <button
                                    onClick={() => setStageView('whiteboard')}
                                    className="shrink-0 ml-1 px-2.5 py-0.5 bg-sky-500 hover:bg-sky-600 rounded-full text-[10px] font-bold text-white transition-colors"
                                >
                                    View Board
                                </button>
                            </div>
                        </div>

                    ) : isWhiteboardActive ? (
                        <div className="w-full h-full relative flex-1 min-h-0">
                            <Whiteboard
                                isActive={isWhiteboardActive}
                                onClose={() => setIsWhiteboardActive(false)}
                                sendMessage={sendWhiteboardMessage}
                                onRemoteMessage={setWhiteboardMessageHandler}
                                canEdit={localUser.hasWhiteboardAccess ?? false}
                                showCloseButton={false}
                            />

                            {/* Switch to active screen share pill on mobile */}
                            {isScreenShareActive && screenShareParticipant && (
                                <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-full text-white text-xs shadow-lg">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                    <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="font-medium">Screen Active</span>
                                    <button
                                        onClick={() => setStageView('screen')}
                                        className="ml-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 rounded-full text-[10px] font-bold text-white transition-colors"
                                    >
                                        View Screen
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 p-4">
                            <PenTool className="w-6 h-6 text-sky-600 mb-1" />
                            <button
                                onClick={() => setIsWhiteboardActive(true)}
                                className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-semibold"
                            >
                                Open Whiteboard
                            </button>
                        </div>
                    )}
                </div>

                {/* Middle: Video Grid (1-row for <= 2 participants, 2-row max 4 visible with scroll for 3+) */}
                <div className="shrink-0 w-full">
                    <div className="flex items-center justify-between px-1 mb-1 text-[11px] text-slate-600 font-medium">
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-sky-500" />
                            <span>Participants ({humanParticipants.length})</span>
                        </span>
                        {humanParticipants.length > 4 && (
                            <span className="text-[10px] text-slate-400">Scroll right for more →</span>
                        )}
                    </div>

                    {humanParticipants.length <= 2 ? (
                        /* Case 1: 1 or 2 participants - 1 row side-by-side (no empty slots) */
                        <div className={`grid ${humanParticipants.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2'} gap-1.5 w-full`}>
                            {teacherParticipant && (
                                <div className="h-[140px] xs:h-[160px] sm:h-[180px] w-full rounded-xl overflow-hidden bg-slate-950 border-2 border-sky-400 shadow-xs relative isolate">
                                    <VideoTile
                                        participant={teacherParticipant}
                                        stream={getBestStreamForParticipant(teacherParticipant, remoteStreams, localStream)}
                                        isLocal={teacherParticipant.isLocal}
                                        isTeacher={isTeacher}
                                        onMuteParticipant={onMuteParticipant}
                                        onKickParticipant={onKickParticipant}
                                        onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                        className="w-full h-full"
                                    />
                                    <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-full text-[9px] font-bold shadow-xs pointer-events-none">
                                        <GraduationCap className="w-3 h-3" />
                                        <span>Teacher</span>
                                    </div>
                                </div>
                            )}

                            {studentParticipants.map((participant) => {
                                const stream = getBestStreamForParticipant(participant, remoteStreams, localStream);
                                return (
                                    <div
                                        key={`mobile-${participant.id}`}
                                        className="h-[140px] xs:h-[160px] sm:h-[180px] w-full rounded-xl overflow-hidden shadow-xs bg-slate-950 border border-slate-800 isolate"
                                    >
                                        <VideoTile
                                            participant={participant}
                                            stream={stream}
                                            isLocal={participant.isLocal}
                                            isTeacher={isTeacher}
                                            onMuteParticipant={onMuteParticipant}
                                            onKickParticipant={onKickParticipant}
                                            onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                            className="w-full h-full"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Case 2: 3+ participants - 2-row horizontal-scrolling grid with max 4 visible at a time */
                        <div className="grid grid-rows-2 grid-flow-col auto-cols-[calc(50%-3px)] gap-1.5 overflow-x-auto scrollbar-hide no-scrollbar pb-0.5 px-0.5 snap-x">
                            {/* Teacher Tile */}
                            {teacherParticipant ? (
                                <div className="h-[125px] xs:h-[140px] sm:h-[160px] w-full rounded-xl overflow-hidden bg-slate-950 border-2 border-sky-400 shadow-xs relative snap-start isolate">
                                    <VideoTile
                                        participant={teacherParticipant}
                                        stream={getBestStreamForParticipant(teacherParticipant, remoteStreams, localStream)}
                                        isLocal={teacherParticipant.isLocal}
                                        isTeacher={isTeacher}
                                        onMuteParticipant={onMuteParticipant}
                                        onKickParticipant={onKickParticipant}
                                        onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                        className="w-full h-full"
                                    />
                                    <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-full text-[9px] font-bold shadow-xs pointer-events-none">
                                        <GraduationCap className="w-3 h-3" />
                                        <span>Teacher</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[125px] xs:h-[140px] sm:h-[160px] w-full rounded-xl bg-slate-900 border-2 border-dashed border-sky-400/50 flex flex-col items-center justify-center text-slate-400 text-[10px] snap-start">
                                    <GraduationCap className="w-4 h-4 text-sky-400 mb-0.5" />
                                    <span>Teacher</span>
                                </div>
                            )}

                            {/* Student Participants */}
                            {studentParticipants.map((participant) => {
                                const stream = getBestStreamForParticipant(participant, remoteStreams, localStream);
                                return (
                                    <div
                                        key={`mobile-${participant.id}`}
                                        className="h-[125px] xs:h-[140px] sm:h-[160px] w-full rounded-xl overflow-hidden shadow-xs bg-slate-950 border border-slate-800 snap-start isolate"
                                    >
                                        <VideoTile
                                            participant={participant}
                                            stream={stream}
                                            isLocal={participant.isLocal}
                                            isTeacher={isTeacher}
                                            onMuteParticipant={onMuteParticipant}
                                            onKickParticipant={onKickParticipant}
                                            onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                            className="w-full h-full"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Docked ControlBar at the bottom */}
                <div className="shrink-0 flex justify-center items-center">
                    <ControlBar
                        isMuted={localUser.isMuted}
                        isVideoOff={localUser.isVideoOff}
                        isScreenSharing={isScreenSharing}
                        isWhiteboardActive={isWhiteboardActive}
                        isHandRaised={localUser.isHandRaised ?? false}
                        isBackgroundActive={isBackgroundActive}
                        isConnected={isConnected}
                        onToggleMic={onToggleMic}
                        onToggleCamera={onToggleCamera}
                        onToggleScreenShare={onToggleScreenShare}
                        onToggleWhiteboard={() => setIsWhiteboardActive(!isWhiteboardActive)}
                        onToggleHandRaise={onToggleHandRaise}
                        onSendReaction={onSendReaction}
                        onToggleBackground={onToggleBackground}
                        onLeave={onLeave}
                    />
                </div>

                {/* Hidden background audio elements to guarantee continuous audio from all remote participants */}
                <div className="hidden pointer-events-none" aria-hidden="true">
                    {Array.from(remoteStreams.entries()).map(([id, stream]) => (
                        <RemoteAudioPlayer key={String(id)} stream={stream} />
                    ))}
                </div>
            </div>
        </div>
    );
}
