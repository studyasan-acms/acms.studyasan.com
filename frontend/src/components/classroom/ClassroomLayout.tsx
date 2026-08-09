/**
 * ClassroomLayout Component
 * 
 * Main layout orchestrator for the classroom view.
 */

import React, { useState } from 'react';
import { VideoTile } from './VideoTile';
import { ControlBar } from './ControlBar';
import { Whiteboard } from './Whiteboard';
import { ReactionOverlay } from './ReactionOverlay';
import type { FloatingReaction } from './ReactionOverlay';
import type { Participant, WhiteboardMessage, LocalUserState } from '@/types/videoRoom';

interface ClassroomLayoutProps {
    // Connection
    isConnected: boolean;

    // Local user
    localStream: MediaStream | null;
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
    localStream,
    localUser,
    participants,
    remoteStreams,
    mainParticipantId,
    isScreenSharing,
    isBackgroundActive,
    onToggleBackground,
    reactions,
    onToggleHandRaise,
    onSendReaction,
    isTeacher,
    onMuteParticipant,
    onKickParticipant,
    onToggleWhiteboardAccess,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    onLeave,
    onSetMainParticipant,
    sendWhiteboardMessage,
    setWhiteboardMessageHandler,
}: ClassroomLayoutProps) {
    const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);

    // Build participant list including local user
    const localParticipant: Participant = {
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
    };

    const allParticipants = [localParticipant, ...Array.from(participants.values())];

    // Determine main participant (first remote or self if alone)
    const mainParticipant = mainParticipantId
        ? participants.get(mainParticipantId) || localParticipant
        : participants.size > 0
            ? Array.from(participants.values())[0]
            : localParticipant;

    const mainStream = mainParticipant.isLocal
        ? localStream
        : remoteStreams.get(mainParticipant.id);

    // Strip participants (exclude main)
    const stripParticipants = allParticipants.filter((p) => p.id !== mainParticipant.id);

    return (
        <div className="relative w-full h-full bg-slate-100 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-14 bg-blue-700 border-b border-blue-800 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                    <img src="/studyasan-logo.png" alt="StudyAsan" className="h-12" />
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-200">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </header>

            {/* Floating Reactions Animated Overlay */}
            <ReactionOverlay reactions={reactions} />

            {/* Main content area */}
            <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden bg-slate-900">
                {/* Participant strip - Top on mobile, Left on desktop */}
                <div className="w-full h-24 md:w-32 lg:w-40 md:h-full bg-slate-800 md:bg-slate-50 border-b md:border-b-0 md:border-r border-slate-700 md:border-slate-200 p-2 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0">
                    {stripParticipants.length === 0 && localParticipant && (
                        <div className="h-full aspect-video md:w-full md:h-auto md:aspect-video shrink-0">
                            <VideoTile
                                participant={localParticipant}
                                stream={localStream || undefined}
                                isLocal
                                onClick={() => onSetMainParticipant(localParticipant.id)}
                                isTeacher={isTeacher}
                                className="w-full h-full"
                            />
                        </div>
                    )}
                    {stripParticipants.map((participant, index) => {
                        const stream = participant.isLocal
                            ? localStream
                            : remoteStreams.get(participant.id);
                        const maxShow = 5;
                        const overflow = index === maxShow - 1 && stripParticipants.length > maxShow
                            ? stripParticipants.length - maxShow
                            : undefined;

                        if (index >= maxShow) return null;

                        return (
                            <div key={String(participant.id)} className="h-full aspect-video md:w-full md:h-auto md:aspect-video shrink-0">
                                <VideoTile
                                    participant={participant}
                                    stream={stream || undefined}
                                    isLocal={participant.isLocal}
                                    showOverflow={overflow}
                                    onClick={() => onSetMainParticipant(participant.id)}
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

                {/* Main video area */}
                <div className="flex-1 relative p-0 md:p-4 bg-black md:bg-slate-100">
                    <div className="w-full h-full rounded-none md:rounded-2xl overflow-hidden bg-slate-900 shadow-lg relative">
                        <VideoTile
                            participant={mainParticipant}
                            stream={mainStream || undefined}
                            isLocal={mainParticipant.isLocal}
                            isMain
                            isTeacher={isTeacher}
                            onMuteParticipant={onMuteParticipant}
                            onKickParticipant={onKickParticipant}
                            onToggleWhiteboardAccess={onToggleWhiteboardAccess}
                        />
                    </div>

                    {/* Whiteboard overlay */}
                    <Whiteboard
                        isActive={isWhiteboardActive}
                        onClose={() => setIsWhiteboardActive(false)}
                        sendMessage={sendWhiteboardMessage}
                        onRemoteMessage={setWhiteboardMessageHandler}
                        canEdit={localUser.hasWhiteboardAccess ?? false}
                    />
                </div>
            </div>

            {/* Control bar - bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
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
    );
}
