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
    setWhiteboardMessageHandler: (handler: (message: WhiteboardMessage) => void) => (() => void);
}

export function useClassroomAPISync({
    roomCode,
    displayName,
    enabled
}: UseClassroomAPISyncOptions): UseClassroomAPISyncReturn {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const whiteboardHandlersRef = useRef<Set<(message: WhiteboardMessage) => void>>(new Set());
    const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const processedChatIds = useRef<Set<string>>(new Set());
    const processedStrokeVersions = useRef<Map<string, number>>(new Map());
    // Track strokes we sent locally so the poll doesn't re-apply them (prevents canvas flicker)
    // Maps strokeId -> timestamp when we sent it. Entries expire after 5 seconds.
    const locallySentStrokes = useRef<Map<string, number>>(new Map());

    // Prune expired locally-sent stroke records every 10 seconds
    useEffect(() => {
        if (!enabled) return;
        const prune = setInterval(() => {
            const now = Date.now();
            for (const [id, sentAt] of locallySentStrokes.current.entries()) {
                if (now - sentAt > 5000) locallySentStrokes.current.delete(id);
            }
        }, 10000);
        return () => clearInterval(prune);
    }, [enabled]);

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
                    const strokes = whiteboardRes.data.data.strokes as (Stroke & { updatedAt?: number })[];

                    // Process new and updated strokes from server
                    for (const stroke of strokes) {
                        if (!stroke.board) stroke.board = 1;
                        if (stroke.tool === 'table' && stroke.text && (!stroke.tableRows || !stroke.tableData)) {
                            try {
                                const parsed = JSON.parse(stroke.text);
                                if (parsed.rows) stroke.tableRows = parsed.rows;
                                if (parsed.cols) stroke.tableCols = parsed.cols;
                                if (parsed.data) stroke.tableData = parsed.data;
                            } catch {}
                        }
                        const storedVersion = processedStrokeVersions.current.get(stroke.id);
                        const strokeVersion = stroke.updatedAt || stroke.timestamp || 0;

                        if (storedVersion === undefined || storedVersion < strokeVersion) {
                            // New stroke or updated stroke
                            processedStrokeVersions.current.set(stroke.id, strokeVersion);

                            // Flicker fix: skip strokes we sent ourselves within the last 5 seconds.
                            // DataChannel already applied them instantly; the API poll is just echo.
                            const sentAt = locallySentStrokes.current.get(stroke.id);
                            if (sentAt && Date.now() - sentAt < 5000) {
                                // Still in dedup window — don't re-notify handlers
                                continue;
                            }

                            whiteboardHandlersRef.current.forEach(fn => {
                                try {
                                    fn({
                                        type: 'stroke',
                                        data: stroke,
                                        timestamp: Date.now(),
                                    });
                                } catch (e) {
                                    console.error('[APISync] Error in whiteboard handler:', e);
                                }
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

        // Poll every 800ms for fast cached whiteboard sync (DataChannel handles 0ms instants)
        pollingInterval.current = setInterval(poll, 800);

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
                // Mark this stroke as locally sent so the poll won't re-apply it
                locallySentStrokes.current.set(stroke.id, Date.now());
                processedStrokeVersions.current.set(stroke.id, Date.now());

                await api.post(`/video-rooms/${roomCode}/whiteboard`, { stroke });
            } else if (message.type === 'clear') {
                await api.delete(`/video-rooms/${roomCode}/whiteboard`);
                processedStrokeVersions.current.clear();
            } else if (message.type === 'clear-board') {
                if (message.strokeIds && message.strokeIds.length > 0) {
                    message.strokeIds.forEach((id) => processedStrokeVersions.current.delete(id));
                    await api.delete(`/video-rooms/${roomCode}/whiteboard/strokes`, { data: { strokeIds: message.strokeIds } });
                }
            } else if (message.type === 'delete-strokes' || message.type === 'delete-stroke') {
                const strokeIds = message.strokeIds || (message.strokeId ? [message.strokeId] : (Array.isArray(message.data) ? message.data as string[] : []));
                if (strokeIds.length > 0) {
                    strokeIds.forEach((id) => processedStrokeVersions.current.delete(id));
                    await api.delete(`/video-rooms/${roomCode}/whiteboard/strokes`, { data: { strokeIds } });
                }
            } else if (message.type === 'change-board') {
                // Board changes are transmitted instantly via WebRTC DataChannel
            }
        } catch (error) {
            console.error('[APISync] Error sending whiteboard:', error);
        }
    }, [roomCode]);

    const setWhiteboardMessageHandler = useCallback((handler: (message: WhiteboardMessage) => void) => {
        whiteboardHandlersRef.current.add(handler);
        return () => {
            whiteboardHandlersRef.current.delete(handler);
        };
    }, []);

    return {
        chatMessages,
        sendChatMessage,
        sendWhiteboardMessage,
        setWhiteboardMessageHandler,
    };
}
