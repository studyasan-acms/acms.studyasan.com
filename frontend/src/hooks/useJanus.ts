/**
 * useJanus Hook
 * 
 * React hook that wraps the Janus client service and provides
 * state management for WebRTC connections in the classroom.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { JanusClient, destroyJanusClient } from '@/services/janus';
import { useClassroomAPISync } from '@/hooks/useClassroomAPISync';
import type {
    ConnectionState,
    Participant,
    LocalUserState,
    WhiteboardMessage,
    ChatMessage,
    DataChannelMessage,
} from '@/types/videoRoom';

// Default Janus server URL
const JANUS_URL = import.meta.env.VITE_JANUS_URL || 'wss://janus.xdastechnology.com/janus';

interface UseJanusOptions {
    roomCode: string;
    sessionId: number;
    displayName: string;
    isTeacher: boolean;
}

interface UseJanusReturn {
    // Connection state
    connectionState: ConnectionState;
    isConnected: boolean;
    error: string | null;

    // Local user
    localStream: MediaStream | null;
    localUser: LocalUserState;

    // Remote participants
    participants: Map<string | number, Participant>;
    remoteStreams: Map<string | number, MediaStream>;

    // Main view
    mainParticipantId: string | number | null;
    isScreenSharing: boolean;

    // Actions
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    toggleMic: () => void;
    toggleCamera: () => void;
    toggleScreenShare: () => Promise<void>;
    setMainParticipant: (id: string | number | null) => void;

    // Whiteboard
    sendWhiteboardMessage: (message: WhiteboardMessage) => void;
    setWhiteboardMessageHandler: (handler: (message: WhiteboardMessage) => void) => void;

    // Chat
    chatMessages: ChatMessage[];
    sendChatMessage: (text: string) => void;
    isChatOpen: boolean;
    toggleChat: () => void;
}

export function useJanus({ roomCode, sessionId: _sessionId, displayName, isTeacher: _isTeacher }: UseJanusOptions): UseJanusReturn {
    // Connection state
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [error, setError] = useState<string | null>(null);

    // Local state
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [localUser, setLocalUser] = useState<LocalUserState>({
        displayName,
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        isWhiteboardActive: false,
    });

    // Remote participants
    const [participants, setParticipants] = useState<Map<string | number, Participant>>(new Map());
    const [remoteStreams, setRemoteStreams] = useState<Map<string | number, MediaStream>>(new Map());

    // Main view state
    const [mainParticipantId, setMainParticipantId] = useState<string | number | null>(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // Chat state
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Whiteboard message handler
    const whiteboardHandlerRef = useRef<((message: WhiteboardMessage) => void) | null>(null);

    // Janus client reference
    const janusClientRef = useRef<JanusClient | null>(null);

    // Local stream reference
    const localStreamRef = useRef<MediaStream | null>(null);

    // Use API sync for chat and whiteboard
    const apiSync = useClassroomAPISync({
        roomCode,
        displayName,
        enabled: connectionState === 'connected',
    });

    const setWhiteboardMessageHandler = useCallback((handler: (message: WhiteboardMessage) => void) => {
        whiteboardHandlerRef.current = handler;
        apiSync.setWhiteboardMessageHandler(handler);
    }, [apiSync]);

    const sendWhiteboardMessage = useCallback((message: WhiteboardMessage) => {
        apiSync.sendWhiteboardMessage(message);
    }, [apiSync]);

    const sendChatMessage = useCallback((text: string) => {
        apiSync.sendChatMessage(text);
    }, [apiSync]);

    const toggleChat = useCallback(() => {
        setIsChatOpen(prev => !prev);
    }, []);

    const disconnect = useCallback(async () => {
        console.log('[useJanus] Disconnecting...');

        if (janusClientRef.current) {
            await janusClientRef.current.disconnect();
            janusClientRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
            setLocalStream(null);
        }

        setParticipants(new Map());
        setRemoteStreams(new Map());
        setMainParticipantId(null);
        setIsScreenSharing(false);
        setConnectionState('disconnected');

        destroyJanusClient();
    }, []);

    const connect = useCallback(async () => {
        if (janusClientRef.current) {
            console.log('[useJanus] Already connected or connecting');
            return;
        }

        try {
            setError(null);
            setConnectionState('connecting');

            console.log('[useJanus] Getting user media...');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                },
            });

            setLocalStream(stream);
            localStreamRef.current = stream;

            console.log('[useJanus] Creating Janus client...');

            const client = new JanusClient({
                serverUrl: JANUS_URL,
                roomId: roomCode,
                displayName,
                onConnectionStateChange: (state) => {
                    console.log('[useJanus] Connection state:', state);
                    setConnectionState(state);
                },
                onLocalStream: (newStream) => {
                    setLocalStream(newStream);
                    localStreamRef.current = newStream;
                },
                onRemoteStream: (participantId, remoteStream) => {
                    setRemoteStreams(prev => {
                        const next = new Map(prev);
                        next.set(participantId, remoteStream);
                        return next;
                    });

                    setParticipants(prev => {
                        const next = new Map(prev);
                        const participant = next.get(participantId);
                        if (participant) {
                            next.set(participantId, { ...participant, stream: remoteStream });
                        }
                        return next;
                    });
                },
                onParticipantJoined: (participant) => {
                    setParticipants(prev => {
                        const next = new Map(prev);
                        next.set(participant.id, participant);
                        return next;
                    });
                },
                onParticipantLeft: (participantId) => {
                    setParticipants(prev => {
                        const next = new Map(prev);
                        next.delete(participantId);
                        return next;
                    });
                    setRemoteStreams(prev => {
                        const next = new Map(prev);
                        next.delete(participantId);
                        return next;
                    });

                    setMainParticipantId(prevId => prevId === participantId ? null : prevId);
                },
                onDataMessage: (message: DataChannelMessage) => {
                    if (message.type === 'whiteboard' && message.whiteboard) {
                        whiteboardHandlerRef.current?.(message.whiteboard);
                    }
                },
                onError: (err) => {
                    console.error('[useJanus] Error:', err);
                    setError(err.message);
                },
            });

            janusClientRef.current = client;

            console.log('[useJanus] Connecting to Janus...');
            await client.connect();

            console.log('[useJanus] Publishing stream...');
            await client.publish(stream);

            console.log('[useJanus] Successfully connected and publishing!');

        } catch (err) {
            console.error('[useJanus] Connection error:', err);
            const message = err instanceof Error ? err.message : 'Failed to connect';
            setError(message);
            setConnectionState('failed');

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
                setLocalStream(null);
            }
            janusClientRef.current = null;
        }
    }, [roomCode, displayName]);

    const toggleMic = useCallback(() => {
        setLocalUser(prev => {
            const newMuted = !prev.isMuted;
            janusClientRef.current?.toggleMic(newMuted);
            return { ...prev, isMuted: newMuted };
        });
    }, []);

    const toggleCamera = useCallback(() => {
        setLocalUser(prev => {
            const newHidden = !prev.isVideoOff;
            const shouldEnable = !newHidden;

            janusClientRef.current?.toggleCamera(shouldEnable).then(() => {
                if (localStreamRef.current && shouldEnable) {
                    setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
                }
            }).catch(e => {
                console.error('Toggle camera failed:', e);
                setLocalUser(p => ({ ...p, isVideoOff: !newHidden }));
            });

            return { ...prev, isVideoOff: newHidden };
        });
    }, []);

    const toggleScreenShare = useCallback(async () => {
        try {
            if (isScreenSharing) {
                await janusClientRef.current?.stopScreenShare();
                setIsScreenSharing(false);
                setLocalUser(prev => ({ ...prev, isScreenSharing: false }));
            } else {
                await janusClientRef.current?.shareScreen();
                setIsScreenSharing(true);
                setLocalUser(prev => ({ ...prev, isScreenSharing: true }));
            }
        } catch (err) {
            console.error('Screen share error:', err);
        }
    }, [isScreenSharing]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    return {
        connectionState,
        isConnected: connectionState === 'connected',
        error,
        localStream,
        localUser,
        participants,
        remoteStreams,
        mainParticipantId,
        isScreenSharing,
        connect,
        disconnect,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        setMainParticipant: setMainParticipantId,
        sendWhiteboardMessage,
        setWhiteboardMessageHandler,
        chatMessages: apiSync.chatMessages,
        sendChatMessage,
        isChatOpen,
        toggleChat,
    };
}
