/**
 * useClassroomAPISync Hook
 * 
 * Syncs chat and whiteboard via backend REST API with polling.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, WhiteboardMessage, Stroke } from '@/types/videoRoom';
import api from '@/services/api';

interface UseClassroomAPISyncOptions {
    roomCode: string;
    displayName: string;
    enabled: boolean;
}

interface UseClassroomAPISyncReturn {
    chatMessages: ChatMessage[];
    sendChatMessage: (text: string) => void;
    sendWhiteboardMessage: (message: WhiteboardMessage) => void;
    setWhiteboardMessageHandler: (handler: (message: WhiteboardMessage) => void) => void;
}

export function useClassroomAPISync({
    roomCode,
    displayName,
    enabled
}: UseClassroomAPISyncOptions): UseClassroomAPISyncReturn {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const whiteboardHandlerRef = useRef<((message: WhiteboardMessage) => void) | null>(null);
    const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const processedChatIds = useRef<Set<string>>(new Set());
    const processedStrokeIds = useRef<Set<string>>(new Set());

    // Poll for new messages
    useEffect(() => {
        if (!enabled || !roomCode) {
            console.log('[APISync] Disabled or no room code');
            return;
        }

        console.log('[APISync] Starting polling for room:', roomCode);

        const poll = async () => {
            try {
                // Poll chat messages
                const chatRes = await api.get(`/video-rooms/${roomCode}/chat`);
                if (chatRes.data.success) {
                    const messages = chatRes.data.data.messages as ChatMessage[];

                    const newMessages = messages.filter((msg) =>
                        !processedChatIds.current.has(msg.id)
                    );

                    if (newMessages.length > 0) {
                        newMessages.forEach((msg) => processedChatIds.current.add(msg.id));
                        setChatMessages(prev => [...prev, ...newMessages]);
                    }
                }

                // Poll whiteboard strokes
                const whiteboardRes = await api.get(`/video-rooms/${roomCode}/whiteboard`);
                if (whiteboardRes.data.success) {
                    const strokes = whiteboardRes.data.data.strokes as Stroke[];

                    // Detect if whiteboard was cleared
                    if (strokes.length === 0 && processedStrokeIds.current.size > 0) {
                        console.log('[APISync] Whiteboard was cleared');
                        processedStrokeIds.current.clear();
                        whiteboardHandlerRef.current?.({
                            type: 'clear',
                            timestamp: Date.now(),
                        });
                    } else {
                        // Detect deleted strokes that were previously present in client state
                        const serverStrokeIds = new Set(strokes.map((s) => s.id));
                        const deletedIds: string[] = [];
                        for (const id of processedStrokeIds.current) {
                            if (!serverStrokeIds.has(id)) {
                                deletedIds.push(id);
                            }
                        }
                        if (deletedIds.length > 0) {
                            deletedIds.forEach((id) => processedStrokeIds.current.delete(id));
                            whiteboardHandlerRef.current?.({
                                type: 'delete-strokes',
                                strokeIds: deletedIds,
                                timestamp: Date.now(),
                            });
                        }

                        // Process new strokes
                        const newStrokes = strokes.filter((stroke) =>
                            !processedStrokeIds.current.has(stroke.id)
                        );

                        if (newStrokes.length > 0) {
                            newStrokes.forEach((stroke) => {
                                processedStrokeIds.current.add(stroke.id);
                                whiteboardHandlerRef.current?.({
                                    type: 'stroke',
                                    data: stroke,
                                    timestamp: Date.now(),
                                });
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('[APISync] Polling error:', error);
            }
        };

        // Initial poll
        poll();

        // Poll every 2 seconds
        pollingInterval.current = setInterval(poll, 2000);

        return () => {
            console.log('[APISync] Stopping polling');
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, [roomCode, enabled]);

    const sendChatMessage = useCallback(async (text: string) => {
        if (!roomCode) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add optimistically to local state
        const optimisticMsg: ChatMessage = {
            id: tempId,
            sender: displayName,
            text,
            timestamp: Date.now(),
        };
        processedChatIds.current.add(tempId);
        setChatMessages(prev => [...prev, optimisticMsg]);

        try {
            const response = await api.post(`/video-rooms/${roomCode}/chat`, { content: text });
            if (response.data.success) {
                // Mark the real ID as processed so we don't duplicate
                processedChatIds.current.add(response.data.data.id);
            }
        } catch (error) {
            console.error('[APISync] Error sending chat:', error);
        }
    }, [roomCode, displayName]);

    const sendWhiteboardMessage = useCallback(async (message: WhiteboardMessage) => {
        if (!roomCode) return;

        try {
            if (message.type === 'stroke' && message.data) {
                const stroke = message.data as Stroke;
                processedStrokeIds.current.add(stroke.id);

                await api.post(`/video-rooms/${roomCode}/whiteboard`, { stroke });
            } else if (message.type === 'clear') {
                await api.delete(`/video-rooms/${roomCode}/whiteboard`);
                processedStrokeIds.current.clear();
            } else if (message.type === 'clear-board') {
                if (message.strokeIds && message.strokeIds.length > 0) {
                    message.strokeIds.forEach((id) => processedStrokeIds.current.delete(id));
                    await api.delete(`/video-rooms/${roomCode}/whiteboard/strokes`, { data: { strokeIds: message.strokeIds } });
                }
            } else if (message.type === 'delete-strokes' || message.type === 'delete-stroke') {
                const strokeIds = message.strokeIds || (message.strokeId ? [message.strokeId] : (Array.isArray(message.data) ? message.data as string[] : []));
                if (strokeIds.length > 0) {
                    strokeIds.forEach((id) => processedStrokeIds.current.delete(id));
                    await api.delete(`/video-rooms/${roomCode}/whiteboard/strokes`, { data: { strokeIds } });
                }
            }
        } catch (error) {
            console.error('[APISync] Error sending whiteboard:', error);
        }
    }, [roomCode]);

    const setWhiteboardMessageHandler = useCallback((handler: (message: WhiteboardMessage) => void) => {
        whiteboardHandlerRef.current = handler;
    }, []);

    return {
        chatMessages,
        sendChatMessage,
        sendWhiteboardMessage,
        setWhiteboardMessageHandler,
    };
}
