/**
 * ClassroomLayout Component
 * 
 * Main layout orchestrator for the classroom view, faithfully matching
 * the wireframe designs for Desktop / Tablet and Mobile Phone.
 */

import React, { useState, useEffect, useMemo } from 'react';
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

    // Build complete participant list including local user
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
        return [localParticipant, ...Array.from(participants.values())];
    }, [localParticipant, participants]);

    // Identify Teacher Participant:
    // - If local user is the actual teacher (isTeacher=true AND not admin), pin local user.
    // - Admin (isAdmin=true) is NEVER pinned as teacher even if they have elevated permissions.
    // - Otherwise, find remote participant whose displayName matches teacherName.
    const teacherParticipant = useMemo<Participant | null>(() => {
        // Only pin local as teacher if they are the actual teacher (not an admin observer)
        if (isTeacher && !isAdmin) {
            return localParticipant;
        }
        if (teacherName) {
            const match = allParticipants.find(
                p => !p.isLocal && p.displayName?.trim().toLowerCase() === teacherName.trim().toLowerCase()
            );
            if (match) return match;
        }
        const roleMatch = allParticipants.find(
            p => !p.isLocal && (
                p.displayName?.toLowerCase().includes('teacher') ||
                p.displayName?.toLowerCase().includes('instructor') ||
                p.hasWhiteboardAccess
            )
        );
        if (roleMatch) return roleMatch;

        // Fallback to first remote participant if not explicitly found
        const firstRemote = Array.from(participants.values()).find(
            p => !p.displayName?.endsWith(' (Screen)')
        );
        return firstRemote || null;
    }, [isTeacher, isAdmin, teacherName, localParticipant, allParticipants, participants]);

    // Student participants: all participants except the pinned teacher and separate screen feeds
    const studentParticipants = useMemo(() => {
        return allParticipants.filter(p => 
            (!teacherParticipant || p.id !== teacherParticipant.id) &&
            !p.displayName?.endsWith(' (Screen)')
        );
    }, [allParticipants, teacherParticipant]);

    // Active Screen Share detection (local or any remote participant)
    const screenShareParticipant = useMemo(() => {
        if (isScreenSharing && localParticipant.isScreenSharing) {
            return localParticipant;
        }
        return allParticipants.find(p => p.displayName?.endsWith(' (Screen)') || p.isScreenSharing) || null;
    }, [isScreenSharing, localParticipant, allParticipants]);

    const isScreenShareActive = !!screenShareParticipant;

    // Automatically switch stage to screen share when screen sharing begins
    useEffect(() => {
        if (isScreenShareActive) {
            setStageView('screen');
        } else {
            setStageView('whiteboard');
        }
    }, [isScreenShareActive]);



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
                            <div className="w-full h-full relative bg-slate-950 flex flex-col items-center justify-center">
                                <VideoTile
                                    participant={screenShareParticipant}
                                    stream={screenShareParticipant.isLocal ? (screenStream || undefined) : (remoteStreams.get(screenShareParticipant.id) || screenShareParticipant.stream)}
                                    isLocal={screenShareParticipant.isLocal}
                                    isMain
                                    isScreenShare
                                    isTeacher={isTeacher}
                                    className="w-full h-full"
                                />

                                {/* Top switcher floating pill */}
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-full text-white text-xs shadow-lg">
                                    <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>
                                        Screen Share: <strong>{screenShareParticipant.displayName?.replace(' (Screen)', '')}</strong>
                                    </span>
                                    <button
                                        onClick={() => setStageView('whiteboard')}
                                        className="ml-2 px-2.5 py-0.5 bg-sky-500 hover:bg-sky-600 rounded-full text-[11px] font-semibold transition-colors shadow-xs"
                                    >
                                        View Whiteboard
                                    </button>
                                </div>

                                {/* PiP Camera: Show screen sharer's camera in bottom-right corner */}
                                {(() => {
                                    // The camera participant is the same person sharing screen (without " (Screen)" suffix)
                                    const cameraParticipant = screenShareParticipant.isLocal
                                        ? null // Local PiP not needed — they see themselves in sidebar
                                        : allParticipants.find(p =>
                                            !p.displayName?.endsWith(' (Screen)') &&
                                            p.displayName === screenShareParticipant.displayName?.replace(' (Screen)', '')
                                          );
                                    const cameraStream = cameraParticipant
                                        ? remoteStreams.get(cameraParticipant.id)
                                        : undefined;
                                    if (!cameraParticipant || !cameraStream) return null;
                                    return (
                                        <div className="absolute bottom-4 right-4 z-40 w-44 aspect-video rounded-xl overflow-hidden border-2 border-sky-400/80 shadow-2xl bg-slate-900">
                                            <VideoTile
                                                participant={cameraParticipant}
                                                stream={cameraStream}
                                                isLocal={false}
                                                isTeacher={isTeacher}
                                                className="w-full h-full"
                                            />
                                            <div className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 bg-black/70 rounded-full text-[9px] text-white font-semibold">
                                                Camera
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : isWhiteboardActive ? (
                            /* 2. Whiteboard Stage (Open by default) */
                            <div className="w-full h-full relative">
                                <Whiteboard
                                    isActive={isWhiteboardActive}
                                    onClose={() => setIsWhiteboardActive(false)}
                                    sendMessage={sendWhiteboardMessage}
                                    onRemoteMessage={setWhiteboardMessageHandler}
                                    canEdit={localUser.hasWhiteboardAccess ?? false}
                                />

                                {/* Switch to active screen share if one is ongoing */}
                                {isScreenShareActive && screenShareParticipant && (
                                    <div className="absolute top-3 right-16 z-30 flex items-center gap-1.5 px-3 py-1 bg-slate-900/85 backdrop-blur-md border border-white/20 rounded-full text-white text-xs shadow-lg">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                        <span>Screen Share Active</span>
                                        <button
                                            onClick={() => setStageView('screen')}
                                            className="ml-1.5 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 rounded-full text-[11px] font-semibold transition-colors"
                                        >
                                            View Screen
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* 3. Whiteboard Minimized Placeholder Stage */
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 p-6">
                                <div className="w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center mb-3">
                                    <PenTool className="w-7 h-7 text-sky-600" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-800 mb-1">Whiteboard is Hidden</h3>
                                <p className="text-xs text-slate-500 mb-4 text-center max-w-sm">
                                    Open the interactive whiteboard to draw, collaborate, or take notes.
                                </p>
                                <button
                                    onClick={() => setIsWhiteboardActive(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                                >
                                    <PenTool className="w-3.5 h-3.5" />
                                    <span>Open Whiteboard</span>
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
                <div className="w-72 lg:w-80 xl:w-96 flex flex-col gap-2 h-full shrink-0 min-h-0">
                    {/* Top Card: Teacher always pinned */}
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 border-2 border-sky-400/80 shadow-md relative shrink-0">
                        {teacherParticipant ? (
                            <VideoTile
                                participant={teacherParticipant}
                                stream={teacherParticipant.isLocal ? (localStream || undefined) : remoteStreams.get(teacherParticipant.id)}
                                isLocal={teacherParticipant.isLocal}
                                isMain={false}
                                isTeacher={isTeacher}
                                onMuteParticipant={onMuteParticipant}
                                onKickParticipant={onKickParticipant}
                                onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                className="w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4">
                                <GraduationCap className="w-10 h-10 text-sky-400/70 mb-2 animate-pulse" />
                                <span className="text-xs font-semibold text-slate-300">Teacher</span>
                                <span className="text-[11px] text-slate-400">Waiting to join...</span>
                            </div>
                        )}

                        {/* Pinned Teacher Badge */}
                        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 px-2 py-0.5 bg-sky-600/90 backdrop-blur-md text-white rounded-full text-[10px] font-bold shadow-md border border-sky-300/40 pointer-events-none">
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
                    <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto pr-0.5 content-start scrollbar-thin">
                        {studentParticipants.map((participant) => {
                            const stream = participant.isLocal ? localStream : remoteStreams.get(participant.id);
                            return (
                                <div key={String(participant.id)} className="aspect-square w-full rounded-xl overflow-hidden shadow-xs bg-slate-900 border border-slate-200">
                                    <VideoTile
                                        participant={participant}
                                        stream={stream || undefined}
                                        isLocal={participant.isLocal}
                                        isTeacher={isTeacher}
                                        onMuteParticipant={onMuteParticipant}
                                        onKickParticipant={onKickParticipant}
                                        onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                        className="w-full h-full aspect-square"
                                    />
                                </div>
                            );
                        })}

                        {studentParticipants.length === 0 && (
                            <div className="col-span-2 py-8 flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                                <Users className="w-8 h-8 text-slate-300 mb-1.5" />
                                <span className="text-xs font-semibold text-slate-500">No Students Yet</span>
                                <span className="text-[11px] text-slate-400">Waiting for participants to join...</span>
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
                        <div className="w-full h-full relative bg-slate-950 flex flex-col items-center justify-center">
                            <VideoTile
                                participant={screenShareParticipant}
                                stream={screenShareParticipant.isLocal ? (screenStream || undefined) : (remoteStreams.get(screenShareParticipant.id) || screenShareParticipant.stream)}
                                isLocal={screenShareParticipant.isLocal}
                                isMain
                                isScreenShare
                                isTeacher={isTeacher}
                                className="w-full h-full"
                            />
                            {/* Switcher pill on top of screen share on mobile */}
                            <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-full text-white text-xs shadow-md">
                                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="font-medium">Screen Share</span>
                                <button
                                    onClick={() => setStageView('whiteboard')}
                                    className="ml-1 px-2 py-0.5 bg-sky-500 hover:bg-sky-600 rounded-full text-[10px] font-bold text-white transition-colors"
                                >
                                    View Board
                                </button>
                            </div>

                            {/* PiP Camera: Show screen sharer's camera bottom-right on mobile */}
                            {(() => {
                                const cameraParticipant = screenShareParticipant.isLocal
                                    ? null
                                    : allParticipants.find(p =>
                                        !p.displayName?.endsWith(' (Screen)') &&
                                        p.displayName === screenShareParticipant.displayName?.replace(' (Screen)', '')
                                      );
                                const cameraStream = cameraParticipant
                                    ? remoteStreams.get(cameraParticipant.id)
                                    : undefined;
                                if (!cameraParticipant || !cameraStream) return null;
                                return (
                                    <div className="absolute bottom-3 right-3 z-40 w-28 aspect-video rounded-lg overflow-hidden border-2 border-sky-400/80 shadow-2xl bg-slate-900">
                                        <VideoTile
                                            participant={cameraParticipant}
                                            stream={cameraStream}
                                            isLocal={false}
                                            isTeacher={isTeacher}
                                            className="w-full h-full"
                                        />
                                        <div className="absolute top-1 left-1 z-10 px-1 py-0.5 bg-black/70 rounded-full text-[8px] text-white font-semibold">
                                            Cam
                                        </div>
                                    </div>
                                );
                            })()}
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
                            <span>Participants ({allParticipants.length})</span>
                        </span>
                        {allParticipants.length > 4 && (
                            <span className="text-[10px] text-slate-400">Scroll right for more →</span>
                        )}
                    </div>

                    {allParticipants.length <= 2 ? (
                        /* Case 1: 1 or 2 participants - 1 row side-by-side (no empty slots) */
                        <div className={`grid ${allParticipants.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2'} gap-1.5 w-full`}>
                            {teacherParticipant && (
                                <div className="h-[150px] xs:h-[175px] sm:h-[200px] w-full rounded-xl overflow-hidden bg-slate-900 border-2 border-sky-400 shadow-xs relative">
                                    <VideoTile
                                        participant={teacherParticipant}
                                        stream={teacherParticipant.isLocal ? (localStream || undefined) : remoteStreams.get(teacherParticipant.id)}
                                        isLocal={teacherParticipant.isLocal}
                                        isTeacher={isTeacher}
                                        onMuteParticipant={onMuteParticipant}
                                        onKickParticipant={onKickParticipant}
                                        onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                        className="w-full h-full"
                                    />
                                    <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-600/90 text-white rounded-full text-[8px] font-bold shadow-xs pointer-events-none">
                                        <GraduationCap className="w-2.5 h-2.5" />
                                        <span>Teacher</span>
                                    </div>
                                </div>
                            )}

                            {studentParticipants.map((participant) => {
                                const stream = participant.isLocal ? localStream : remoteStreams.get(participant.id);
                                return (
                                    <div
                                        key={`mobile-${participant.id}`}
                                        className="h-[150px] xs:h-[175px] sm:h-[200px] w-full rounded-xl overflow-hidden shadow-xs bg-slate-900 border border-slate-200"
                                    >
                                        <VideoTile
                                            participant={participant}
                                            stream={stream || undefined}
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
                                <div className="h-[130px] xs:h-[150px] sm:h-[170px] w-full rounded-xl overflow-hidden bg-slate-900 border-2 border-sky-400 shadow-xs relative snap-start">
                                    <VideoTile
                                        participant={teacherParticipant}
                                        stream={teacherParticipant.isLocal ? (localStream || undefined) : remoteStreams.get(teacherParticipant.id)}
                                        isLocal={teacherParticipant.isLocal}
                                        isTeacher={isTeacher}
                                        onMuteParticipant={onMuteParticipant}
                                        onKickParticipant={onKickParticipant}
                                        onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                                        className="w-full h-full"
                                    />
                                    <div className="absolute top-1 left-1 z-20 flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-600/90 text-white rounded-full text-[8px] font-bold shadow-xs pointer-events-none">
                                        <GraduationCap className="w-2.5 h-2.5" />
                                        <span>Teacher</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[130px] xs:h-[150px] sm:h-[170px] w-full rounded-xl bg-slate-800 border-2 border-dashed border-sky-400/50 flex flex-col items-center justify-center text-slate-400 text-[9px] snap-start">
                                    <GraduationCap className="w-3.5 h-3.5 text-sky-400 mb-0.5" />
                                    <span>Teacher</span>
                                </div>
                            )}

                            {/* Student Participants */}
                            {studentParticipants.map((participant) => {
                                const stream = participant.isLocal ? localStream : remoteStreams.get(participant.id);
                                return (
                                    <div
                                        key={`mobile-${participant.id}`}
                                        className="h-[130px] xs:h-[150px] sm:h-[170px] w-full rounded-xl overflow-hidden shadow-xs bg-slate-900 border border-slate-200 snap-start"
                                    >
                                        <VideoTile
                                            participant={participant}
                                            stream={stream || undefined}
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
            </div>
        </div>
    );
}
