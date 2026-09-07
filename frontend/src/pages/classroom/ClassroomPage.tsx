/**
 * ClassroomPage
 * 
 * Main entry point for the integrated video classroom.
 * Validates access, initializes connection, and renders the classroom layout.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassroomLayout } from '@/components/classroom';
import { useJanus } from '@/hooks/useJanus';
import { useClassroomRecorder } from '@/hooks/useClassroomRecorder';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import type { VideoRoomInfo } from '@/types/videoRoom';
import { usePageTitle } from "@/hooks/usePageTitle";

export function ClassroomPage() {
    usePageTitle("Classroom");
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Room state
    const [roomInfo, setRoomInfo] = useState<VideoRoomInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessError, setAccessError] = useState<string | null>(null);
    const [emergencyMeetLink, setEmergencyMeetLink] = useState<string | null>(null);
    const hasLeftIntentionally = useRef(false); // Prevent auto-reconnect after leave

    // Janus hook - only initialize after we have room info
    const janus = useJanus({
        roomCode: roomInfo?.janusRoomId || '',
        sessionId: roomInfo?.sessionId || 0,
        displayName: user?.name || 'Guest',
        isTeacher: roomInfo?.isTeacher || false,
        onKicked: () => handleLeave(),
    });

    // 360p Classroom Recorder hook (captures whiteboard, screen share, mic & audio)
    const sessionIdNum = parseInt(sessionId || '0', 10);
    const recorder = useClassroomRecorder({
        sessionId: sessionIdNum,
        autoUpload: true,
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

                // Load session fallback meeting link for emergency access.
                const sessionResponse = await api.get(`/class-sessions/${sessionId}`);
                if (sessionResponse.data?.success) {
                    setEmergencyMeetLink(sessionResponse.data.data?.emergency_meeting_link || null);
                }

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

    // Auto-connect when room info is ready (but not after intentional leave)
    useEffect(() => {
        if (roomInfo && janus.connectionState === 'disconnected' && !hasLeftIntentionally.current) {
            janus.connect().catch((err) => {
                console.error('[ClassroomPage] Connection error:', err);
            });
        }
    }, [roomInfo, janus.connectionState]);

    // Handle leave
    const handleLeave = async () => {
        hasLeftIntentionally.current = true; // Prevent auto-reconnect

        // Stop active recording if running
        if (recorder.isRecording) {
            try {
                await recorder.stopRecording();
            } catch (recErr) {
                console.warn('[ClassroomPage] Error stopping recording on leave:', recErr);
            }
        }

        try {
            await janus.disconnect();
        } catch (err) {
            console.error('[ClassroomPage] Disconnect error:', err);
        }
        
        // If opened as standalone tab/window, close tab; fallback to navigate/history back
        if (window.history.length <= 1) {
            window.close();
        } else {
            // Attempt to close tab, fallback to back/dashboard
            window.close();
            setTimeout(() => {
                navigate('/dashboard/class-sessions');
            }, 100);
        }
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
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Button onClick={() => navigate(-1)} variant="outline">
                            Go Back
                        </Button>
                        <Button onClick={() => janus.connect(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Join Classroom Anyway
                        </Button>
                        {emergencyMeetLink && (
                            <Button
                                variant="outline"
                                onClick={() => window.open(emergencyMeetLink, '_blank', 'noopener,noreferrer')}
                            >
                                Join via Google Meet
                            </Button>
                        )}
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
        <div className="h-[100dvh] w-screen overflow-hidden">
            <ClassroomLayout
                isConnected={janus.isConnected}
                isRecording={recorder.isRecording}
                formattedDuration={recorder.formattedDuration}
                isUploading={recorder.isUploading}
                uploadProgress={recorder.uploadProgress}
                onStartRecording={recorder.startRecording}
                onStopRecording={recorder.stopRecording}
                localStream={janus.localStream}
                screenStream={janus.screenStream}
                localUser={janus.localUser}
                participants={janus.participants}
                remoteStreams={janus.remoteStreams}
                mainParticipantId={janus.mainParticipantId}
                isScreenSharing={janus.isScreenSharing}
                isBackgroundActive={janus.isBackgroundActive}
                onToggleBackground={janus.toggleBackground}
                reactions={janus.reactions}
                onToggleHandRaise={janus.toggleHandRaise}
                onSendReaction={janus.sendReaction}
                isTeacher={roomInfo?.isTeacher || false}
                isAdmin={roomInfo?.isAdmin || false}
                teacherName={roomInfo?.teacherName || null}
                onMuteParticipant={janus.muteParticipant}
                onKickParticipant={janus.kickParticipant}
                onToggleWhiteboardAccess={janus.toggleWhiteboardAccess}
                onToggleMic={janus.toggleMic}
                onToggleCamera={janus.toggleCamera}
                onToggleScreenShare={janus.toggleScreenShare}
                onLeave={handleLeave}
                onSetMainParticipant={janus.setMainParticipant}
                sendWhiteboardMessage={janus.sendWhiteboardMessage}
                setWhiteboardMessageHandler={janus.setWhiteboardMessageHandler}
            />
        </div>
    );
}

export default ClassroomPage;
