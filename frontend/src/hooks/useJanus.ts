/**
 * useJanus Hook
 * 
 * React hook that wraps the Janus client service and provides
 * state management for WebRTC connections in the classroom.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { JanusClient, destroyJanusClient } from '@/services/janus';
import api from '@/services/api';
import type { FloatingReaction } from '@/components/classroom/ReactionOverlay';

function createFallbackMediaStream(): MediaStream {
    const stream = new MediaStream();
    
    // 1. Silent Audio Track
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const dst = ctx.createMediaStreamDestination();
            osc.connect(dst);
            const silentTrack = dst.stream.getAudioTracks()[0];
            if (silentTrack) {
                silentTrack.enabled = false;
                stream.addTrack(silentTrack);
            }
        }
    } catch (e) {
        console.warn('[useJanus] Could not create silent audio track:', e);
    }

    // 2. Canvas-based Dummy Video Track (black 320x240)
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 320, 240);
        }
        const canvasStream = canvas.captureStream(1);
        const videoTrack = canvasStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = false;
            stream.addTrack(videoTrack);
        }
    } catch (e) {
        console.warn('[useJanus] Could not create fallback video track:', e);
    }

    return stream;
}
import { useClassroomAPISync } from '@/hooks/useClassroomAPISync';
import { useBackgroundProcessor } from '@/hooks/useBackgroundProcessor';
import type {
    ConnectionState,
    Participant,
    LocalUserState,
    WhiteboardMessage,
    ChatMessage,
    DataChannelMessage,
} from '@/types/videoRoom';

// Default Janus server URL
const JANUS_URL = import.meta.env.VITE_JANUS_URL;

interface UseJanusOptions {
    roomCode: string;
    sessionId: number;
    displayName: string;
    isTeacher: boolean;
    onKicked?: () => void;
}

interface UseJanusReturn {
    // Connection state
    connectionState: ConnectionState;
    isConnected: boolean;
    error: string | null;

    // Local user
    localStream: MediaStream | null;
    screenStream: MediaStream | null;
    localUser: LocalUserState;

    // Remote participants
    participants: Map<string | number, Participant>;
    remoteStreams: Map<string | number, MediaStream>;

    // Main view
    mainParticipantId: string | number | null;
    isScreenSharing: boolean;

    // Actions
    connect: (forceFallback?: boolean) => Promise<void>;
    disconnect: () => Promise<void>;
    toggleMic: () => void;
    toggleCamera: () => void;
    toggleScreenShare: () => Promise<void>;
    setMainParticipant: (id: string | number | null) => void;

    // Reactions & Hand Raise
    reactions: FloatingReaction[];
    toggleHandRaise: () => void;
    sendReaction: (emoji: string) => void;

    // Whiteboard
    sendWhiteboardMessage: (message: WhiteboardMessage) => void;
    setWhiteboardMessageHandler: (handler: (message: WhiteboardMessage) => void) => (() => void);

    // Background
    isBackgroundActive: boolean;
    toggleBackground: () => void;

    // Teacher controls
    muteParticipant: (participantId: string | number) => void;
    kickParticipant: (participantId: string | number) => void;
    toggleWhiteboardAccess: (participantId: string | number) => void;
}

export function useJanus(options: UseJanusOptions): UseJanusReturn {
    const { roomCode, displayName, isTeacher: _isTeacher, onKicked } = options;
    const onKickedCallbackRef = useRef(onKicked);

    useEffect(() => {
        onKickedCallbackRef.current = onKicked;
    }, [onKicked]);

    // Connection state
    const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
    const [error, setError] = useState<string | null>(null);

    // Local state
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [localUser, setLocalUser] = useState<LocalUserState>({
        displayName,
        isMuted: true,
        isVideoOff: true,
        isScreenSharing: false,
        isWhiteboardActive: false,
        hasWhiteboardAccess: _isTeacher,
        isHandRaised: false,
    });

    // Update whiteboard access if teacher role updates after mount
    useEffect(() => {
        setLocalUser(prev => ({
            ...prev,
            hasWhiteboardAccess: _isTeacher,
        }));
    }, [_isTeacher]);

    // Floating reactions state
    const [reactions, setReactions] = useState<FloatingReaction[]>([]);

    const addFloatingReaction = useCallback((emoji: string, senderName: string) => {
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const xPercent = 15 + Math.random() * 70;
        const newReaction: FloatingReaction = { id, emoji, senderName, xPercent };

        setReactions(prev => [...prev, newReaction]);

        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
        }, 3600);
    }, []);

    // Join sound ref
    const joinSoundRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        joinSoundRef.current = new Audio('/sounds/join.wav');
        joinSoundRef.current.volume = 0.5;
    }, []);

    // Remote participants
    const [participants, setParticipants] = useState<Map<string | number, Participant>>(new Map());
    const [remoteStreams, setRemoteStreams] = useState<Map<string | number, MediaStream>>(new Map());

    // Main view state
    const [mainParticipantId, setMainParticipantId] = useState<string | number | null>(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

    // Local stream reference
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const rawStreamRef = useRef<MediaStream | null>(null);

    // Background processor
    const backgroundProcessor = useBackgroundProcessor();

    // Whiteboard message handlers (Set supports multiple mounted whiteboard instances)
    const whiteboardHandlersRef = useRef<Set<(message: WhiteboardMessage) => void>>(new Set());

    // Janus client reference
    const janusClientRef = useRef<JanusClient | null>(null);

    // Use API sync for chat and whiteboard
    const apiSync = useClassroomAPISync({
        roomCode,
        displayName,
        enabled: connectionState === 'connected',
    });

    const setWhiteboardMessageHandler = useCallback((handler: (message: WhiteboardMessage) => void) => {
        whiteboardHandlersRef.current.add(handler);
        const unregisterApi = apiSync.setWhiteboardMessageHandler(handler);
        return () => {
            whiteboardHandlersRef.current.delete(handler);
            if (typeof unregisterApi === 'function') {
                unregisterApi();
            }
        };
    }, [apiSync]);

    const sendWhiteboardMessage = useCallback((message: WhiteboardMessage) => {
        console.log('[useJanus] sendWhiteboardMessage triggered:', message.type);
        try {
            janusClientRef.current?.sendData({
                type: 'whiteboard',
                whiteboard: message,
            });
        } catch (err) {
            console.error('[useJanus] Error sending whiteboard via dataChannel:', err);
        }

        try {
            apiSync.sendWhiteboardMessage(message);
        } catch (err) {
            console.error('[useJanus] Error sending whiteboard via API:', err);
        }
    }, [apiSync]);

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

        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
            setScreenStream(null);
        }

        setParticipants(new Map());
        setRemoteStreams(new Map());
        setMainParticipantId(null);
        setIsScreenSharing(false);
        setConnectionState('disconnected');

        destroyJanusClient();
    }, []);

    const connect = useCallback(async (forceFallback = false) => {
        if (janusClientRef.current) {
            console.log('[useJanus] Already connected or connecting');
            return;
        }

        try {
            setError(null);
            setConnectionState('connecting');

            let stream: MediaStream;
            let mediaNotice: string | null = null;

            if (forceFallback) {
                console.warn('[useJanus] Force fallback requested. Entering classroom in listener mode...');
                stream = createFallbackMediaStream();
                mediaNotice = 'Joined classroom in listener mode without camera/microphone.';
            } else {
                console.log('[useJanus] Getting user media...');
                try {
                    // Tier 1: Try getting both audio and video
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            facingMode: 'user',
                        },
                    });
                } catch (err1) {
                    console.warn('[useJanus] Audio & video acquisition failed, trying audio-only...', err1);
                    try {
                        // Tier 2: Try audio-only
                        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        mediaNotice = 'Camera unavailable or access denied. Joining with microphone only.';
                    } catch (err2) {
                        console.warn('[useJanus] Audio acquisition failed, trying video-only...', err2);
                        try {
                            // Tier 3: Try video-only
                            stream = await navigator.mediaDevices.getUserMedia({ video: true });
                            mediaNotice = 'Microphone unavailable or access denied. Joining with camera only.';
                        } catch (err3) {
                            // Tier 4: Fall back to dummy stream so user can enter classroom anyway
                            console.warn('[useJanus] No camera or mic available / permission denied. Entering classroom in listener mode...', err3);
                            stream = createFallbackMediaStream();
                            mediaNotice = 'No camera or microphone detected. Joined classroom in listener mode.';
                        }
                    }
                }
            }

            if (mediaNotice) {
                toast.info(mediaNotice, { duration: 5000 });
            }

            rawStreamRef.current = stream;

            // Mute audio by default (video tracks must stay alive for background processor)
            stream.getAudioTracks().forEach(track => { track.enabled = false; });

            // Get processed stream with background replacement
            const processedStream = backgroundProcessor.getProcessedStream(stream);
            const displayStream = processedStream || stream;

            setLocalStream(displayStream);
            localStreamRef.current = displayStream;

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
                    // Don't override if we have a processed stream
                    // The processed stream is based on this raw stream
                    rawStreamRef.current = newStream;
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
                    // Play join notification sound
                    if (joinSoundRef.current) {
                        joinSoundRef.current.currentTime = 0;
                        joinSoundRef.current.play().catch(() => {});
                    }

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
                onKicked: () => {
                    console.warn('[useJanus] onKicked event received from Janus client');
                    toast.error('You have been removed from the classroom by the teacher.', { duration: 5000 });
                    onKickedCallbackRef.current?.();
                },
                onScreenShareEnded: () => {
                    console.log('[useJanus] Screen share ended event');
                    screenStreamRef.current = null;
                    setScreenStream(null);
                    setIsScreenSharing(false);
                    setLocalUser(prev => ({ ...prev, isScreenSharing: false }));
                },
                onDataMessage: (message: DataChannelMessage) => {
                    // Handle screen share broadcast message
                    if (message.type === 'screen-share' && message.participantId) {
                        const targetId = message.participantId;
                        const isSharing = !!message.isSharing;
                        setParticipants(prev => {
                            const next = new Map(prev);
                            for (const [id, p] of next.entries()) {
                                if (String(id) === String(targetId)) {
                                    next.set(id, { ...p, isScreenSharing: isSharing });
                                    break;
                                }
                            }
                            return next;
                        });
                    }

                    // Handle whiteboard messages
                    if (message.type === 'whiteboard' && message.whiteboard) {
                        console.log('[useJanus] ✏️ Received remote whiteboard stroke via data channel:', message.whiteboard);
                        whiteboardHandlersRef.current.forEach(fn => {
                            try {
                                fn(message.whiteboard);
                            } catch (err) {
                                console.error('[useJanus] Error in whiteboard handler:', err);
                            }
                        });
                    }

                    // Handle raise-hand message
                    if (message.type === 'raise-hand' && message.participantId) {
                        const targetId = message.participantId;
                        const isHandRaised = !!message.isHandRaised;
                        const name = message.displayName || 'Participant';

                        setParticipants(prev => {
                            const next = new Map(prev);
                            for (const [id, p] of next.entries()) {
                                if (String(id) === String(targetId)) {
                                    next.set(id, { ...p, isHandRaised });
                                    break;
                                }
                            }
                            return next;
                        });

                        if (isHandRaised) {
                            toast.info(`✋ ${name} raised hand!`, { duration: 4000 });
                            addFloatingReaction('✋', name);
                        }
                    }

                    // Handle reaction message
                    if (message.type === 'reaction' && message.emoji) {
                        const name = message.displayName || 'Participant';
                        addFloatingReaction(message.emoji, name);
                    }

                    // Handle kick message - disconnect if we are the target
                    if (message.type === 'kick' && message.participantId !== undefined) {
                        const myId = janusClientRef.current?.getMyId();
                        console.log(`[useJanus] Received kick message. Target: ${message.participantId}, MyId: ${myId}`);
                        if (myId && String(message.participantId) === String(myId)) {
                            console.warn('[useJanus] 🚨 You have been removed from the call by the teacher');
                            toast.error('You have been removed from the classroom by the teacher.', { duration: 5000 });
                            onKickedCallbackRef.current?.();
                        }
                    }

                    // Handle mute message - mute audio if we are the target
                    if (message.type === 'mute' && message.participantId) {
                        const myId = janusClientRef.current?.getMyId();
                        if (myId && message.participantId === myId) {
                            console.warn('[useJanus] 🔇 You have been muted by the teacher');
                            // Actually mute the local audio
                            if (localStreamRef.current) {
                                localStreamRef.current.getAudioTracks().forEach(track => {
                                    track.enabled = false;
                                });
                            }
                            setLocalUser(prev => ({ ...prev, isMuted: true }));
                        }
                    }

                    // Handle video-off message - update remote participant's video state
                    if (message.type === 'video-off' && (message as any).videoOff !== undefined) {
                        const janusId = (message as any).janusId;
                        if (janusId) {
                            setParticipants(prev => {
                                const next = new Map(prev);
                                const participant = next.get(janusId);
                                if (participant) {
                                    next.set(janusId, { ...participant, isVideoOff: (message as any).videoOff });
                                }
                                return next;
                            });
                        }
                    }

                    // Handle whiteboard-access message
                    if (message.type === 'whiteboard-access' && message.participantId) {
                        const myId = janusClientRef.current?.getMyId();
                        console.log(`[useJanus] Received 'whiteboard-access' targeting: ${message.participantId}, My local ID is: ${myId}, Granted: ${message.whiteboardAccess}`);
                        // If we are the target, update our local permission
                        if (myId && String(message.participantId) === String(myId)) {
                            console.log(`[useJanus] 📝 Whiteboard access ${message.whiteboardAccess ? 'GRANTED' : 'REVOKED'} for ME`);
                            setLocalUser(prev => ({ ...prev, hasWhiteboardAccess: message.whiteboardAccess }));
                        } else {
                            // Update remote participant's permission state
                            setParticipants(prev => {
                                const next = new Map(prev);
                                // Find participant defensively (string vs number)
                                let foundId: string | number | undefined;
                                let participant: Participant | undefined;
                                
                                for (const [id, p] of next.entries()) {
                                    if (String(id) === String(message.participantId)) {
                                        foundId = id;
                                        participant = p;
                                        break;
                                    }
                                }

                                if (foundId && participant) {
                                    console.log(`[useJanus] 📝 Remote Participant ${foundId} whiteboard access updated: ${message.whiteboardAccess}`);
                                    next.set(foundId, { ...participant, hasWhiteboardAccess: message.whiteboardAccess });
                                } else {
                                    console.warn(`[useJanus] 📝 Remote Participant ${message.participantId} not found in participants map to update access!`);
                                }
                                return next;
                            });
                        }
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
            await client.publish(displayStream);

            // Default camera OFF: stop the displayStream video tracks
            // (canvas capture tracks, NOT the raw camera tracks — background processor stays alive)
            displayStream.getVideoTracks().forEach(track => {
                track.enabled = false;
            });

            // Broadcast camera-off state to remote participants once data channel is ready
            setTimeout(() => {
                client.sendData({ type: 'video-off', videoOff: true });
            }, 1000);

            console.log('[useJanus] Successfully connected and publishing (cam/mic off by default)!');

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
    }, [roomCode, displayName, backgroundProcessor]);

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

            // Broadcast camera state to remote participants
            janusClientRef.current?.sendData({
                type: 'video-off',
                videoOff: newHidden,
            });

            return { ...prev, isVideoOff: newHidden };
        });
    }, []);

    const toggleScreenShare = useCallback(async () => {
        try {
            if (isScreenSharing) {
                await janusClientRef.current?.stopScreenShare();
                screenStreamRef.current = null;
                setScreenStream(null);
                setIsScreenSharing(false);
                setLocalUser(prev => ({ ...prev, isScreenSharing: false }));
            } else {
                const stream = await janusClientRef.current?.shareScreen();
                if (stream) {
                    screenStreamRef.current = stream;
                    setScreenStream(stream);
                    setIsScreenSharing(true);
                    setLocalUser(prev => ({ ...prev, isScreenSharing: true }));
                }
            }
        } catch (err) {
            console.error('Screen share error:', err);
        }
    }, [isScreenSharing]);

    // Mute a participant (teacher only)
    const muteParticipant = useCallback((participantId: string | number) => {
        console.log('[useJanus] Muting participant:', participantId);
        janusClientRef.current?.sendData({
            type: 'mute',
            participantId,
            muted: true,
        });

        // Update local participant state
        setParticipants(prev => {
            const next = new Map(prev);
            const participant = next.get(participantId);
            if (participant) {
                next.set(participantId, { ...participant, isMuted: true });
            }
            return next;
        });
    }, []);

    // Kick a participant (teacher only)
    const kickParticipant = useCallback(async (participantId: string | number) => {
        console.log('[useJanus] Kicking participant:', participantId);

        // 1. Broadcast kick event via DataChannel so student disconnects immediately
        janusClientRef.current?.sendData({
            type: 'kick',
            participantId,
        });

        // 2. Call backend kick endpoint to enforce kick on Janus gateway & database
        try {
            const numericId = typeof participantId === 'number' ? participantId : parseInt(String(participantId), 10);
            if (roomCode && !isNaN(numericId)) {
                await api.post(`/video-rooms/${roomCode}/participants/${numericId}/kick`);
            }
        } catch (apiErr) {
            console.warn('[useJanus] Backend kick API call error:', apiErr);
        }

        // 3. Remove from local state
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
    }, [roomCode]);

    // Toggle a participant's whiteboard access (teacher only)
    const toggleWhiteboardAccess = useCallback((participantId: string | number) => {
        setParticipants(prev => {
            const next = new Map(prev);
            const participant = next.get(participantId);
            if (participant) {
                const newAccess = !participant.hasWhiteboardAccess;
                console.log(`[useJanus] Sending 'whiteboard-access' command data channel to group. Target: ${participantId}. Access: ${newAccess}`);
                
                janusClientRef.current?.sendData({
                    type: 'whiteboard-access',
                    participantId,
                    whiteboardAccess: newAccess,
                });

                next.set(participantId, { ...participant, hasWhiteboardAccess: newAccess });
            } else {
                console.warn(`[useJanus] Cannot toggle whiteboard access. Participant ${participantId} not found.`);
            }
            return next;
        });
    }, []);

    const toggleHandRaise = useCallback(() => {
        setLocalUser(prev => {
            const newHandState = !prev.isHandRaised;
            const myId = janusClientRef.current?.getMyId();
            janusClientRef.current?.sendData({
                type: 'raise-hand',
                isHandRaised: newHandState,
                participantId: myId ?? undefined,
                displayName: prev.displayName,
            });
            if (newHandState) {
                addFloatingReaction('✋', `${prev.displayName} (You)`);
            }
            return { ...prev, isHandRaised: newHandState };
        });
    }, [addFloatingReaction]);

    const sendReaction = useCallback((emoji: string) => {
        const myId = janusClientRef.current?.getMyId();
        janusClientRef.current?.sendData({
            type: 'reaction',
            emoji,
            participantId: myId ?? undefined,
            displayName: localUser.displayName,
        });
        addFloatingReaction(emoji, `${localUser.displayName} (You)`);
    }, [localUser.displayName, addFloatingReaction]);

    // Cleanup on unmount ONLY
    const disconnectRef = useRef(disconnect);
    useEffect(() => {
        disconnectRef.current = disconnect;
    }, [disconnect]);

    useEffect(() => {
        return () => {
            disconnectRef.current();
        };
    }, []);

    return {
        connectionState,
        isConnected: connectionState === 'connected',
        error,
        localStream,
        screenStream,
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
        reactions,
        toggleHandRaise,
        sendReaction,
        sendWhiteboardMessage,
        setWhiteboardMessageHandler,
        isBackgroundActive: backgroundProcessor.isBackgroundActive,
        toggleBackground: backgroundProcessor.toggleBackground,
        muteParticipant,
        kickParticipant,
        toggleWhiteboardAccess,
    };
}
