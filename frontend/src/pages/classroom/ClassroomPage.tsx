/**
 * ClassroomPage
 * 
 * Main entry point for the integrated video classroom.
 * Validates access, initializes connection, and renders the classroom layout.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassroomLayout } from '@/components/classroom';
import { useJanus } from '@/hooks/useJanus';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import type { VideoRoomInfo } from '@/types/videoRoom';

export function ClassroomPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Room state
    const [roomInfo, setRoomInfo] = useState<VideoRoomInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState<string | null>(null);

    // Janus hook - only initialize after we have room info
    const janus = useJanus({
        roomCode: roomInfo?.janusRoomId || '',
        sessionId: roomInfo?.sessionId || 0,
        displayName: user?.name || 'Guest',
        isTeacher: roomInfo?.isTeacher || false,
    });

    // Fetch room info and validate access
    useEffect(() => {
        const initRoom = async () => {
            if (!sessionId) {
                setAccessError('Invalid session ID');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setAccessError(null);

                // Get or create video room for this session
                const response = await api.get(`/video-rooms/session/${sessionId}`);

                if (!response.data.success) {
                    setAccessError(response.data.message || 'Failed to access room');
                    setLoading(false);
                    return;
                }

                const info: VideoRoomInfo = response.data.data;
                setRoomInfo(info);
                setLoading(false);

            } catch (error: any) {
                console.error('[ClassroomPage] Error:', error);
                const message = error.response?.data?.message || error.message || 'Failed to connect';
                setAccessError(message);
                setLoading(false);
            }
        };

        initRoom();
    }, [sessionId]);

    // Auto-connect when room info is ready
    useEffect(() => {
        if (roomInfo && janus.connectionState === 'disconnected') {
            janus.connect().catch((err) => {
                console.error('[ClassroomPage] Connection error:', err);
            });
        }
    }, [roomInfo, janus.connectionState]);

    // Handle leave
    const handleLeave = async () => {
        await janus.disconnect();
        navigate(-1);
    };

    // Loading state
    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-sky-500 mx-auto mb-4" />
                    <p className="text-slate-600">Connecting to classroom...</p>
                </div>
            </div>
        );
    }

    // Access error state
    if (accessError) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center max-w-md mx-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h1>
                    <p className="text-slate-600 mb-6">{accessError}</p>
                    <Button onClick={() => navigate(-1)} variant="outline">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    // Connection failed state
    if (janus.connectionState === 'failed') {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center max-w-md mx-4">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-800 mb-2">Connection Failed</h1>
                    <p className="text-slate-600 mb-6">
                        {janus.error || 'Could not establish a connection to the classroom. Please check your camera/microphone permissions and try again.'}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Button onClick={() => navigate(-1)} variant="outline">
                            Go Back
                        </Button>
                        <Button onClick={() => janus.connect()} className="bg-sky-500 hover:bg-sky-600">
                            Retry
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Connecting state
    if (janus.connectionState === 'connecting' || janus.connectionState === 'reconnecting') {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Video className="w-8 h-8 text-sky-500" />
                    </div>
                    <Loader2 className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-4" />
                    <p className="text-slate-600">
                        {janus.connectionState === 'reconnecting' ? 'Reconnecting...' : 'Setting up your camera and microphone...'}
                    </p>
                </div>
            </div>
        );
    }

    // Connected - render classroom
    return (
        <div className="h-screen w-screen overflow-hidden">
            <ClassroomLayout
                isConnected={janus.isConnected}
                localStream={janus.localStream}
                localUser={janus.localUser}
                participants={janus.participants}
                remoteStreams={janus.remoteStreams}
                mainParticipantId={janus.mainParticipantId}
                isScreenSharing={janus.isScreenSharing}
                onToggleMic={janus.toggleMic}
                onToggleCamera={janus.toggleCamera}
                onToggleScreenShare={janus.toggleScreenShare}
                onLeave={handleLeave}
                onSetMainParticipant={janus.setMainParticipant}
                sendWhiteboardMessage={janus.sendWhiteboardMessage}
                setWhiteboardMessageHandler={janus.setWhiteboardMessageHandler}
                chatMessages={janus.chatMessages}
                onSendChatMessage={janus.sendChatMessage}
            />
        </div>
    );
}

export default ClassroomPage;
