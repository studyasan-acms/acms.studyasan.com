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
    const lastSyncedBoard = useRef<number | null>(null);

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
                    const serverStrokes = (whiteboardRes.data.data.strokes || []) as (Stroke & { updatedAt?: number })[];
                    const serverCurrentBoard = whiteboardRes.data.data.currentBoard;
                    const serverStrokeIds = new Set<string>();

                    for (const stroke of serverStrokes) {
                        serverStrokeIds.add(String(stroke.id));
                    }

                    // 1. Detect deleted/erased strokes: any stroke ID previously tracked but missing on the server
                    const deletedStrokeIds: string[] = [];
                    for (const trackedId of processedStrokeVersions.current.keys()) {
                        if (!serverStrokeIds.has(trackedId)) {
                            // Only count as deleted if not recently created locally in the last 5s
                            const sentAt = locallySentStrokes.current.get(trackedId);
                            if (!sentAt || Date.now() - sentAt >= 5000) {
                                deletedStrokeIds.push(trackedId);
                            }
                        }
                    }

                    if (deletedStrokeIds.length > 0) {
                        deletedStrokeIds.forEach((id) => processedStrokeVersions.current.delete(id));
                        whiteboardHandlersRef.current.forEach((fn) => {
                            try {
                                fn({
                                    type: 'delete-strokes',
                                    strokeIds: deletedStrokeIds,
                                    timestamp: Date.now(),
                                });
                            } catch (e) {
                                console.error('[APISync] Error in delete-strokes handler:', e);
                            }
                        });
                    }

                    // 2. Process new and updated strokes from server
                    for (const stroke of serverStrokes) {
                        const strokeId = String(stroke.id);
                        if (!stroke.board) stroke.board = 1;
                        if (stroke.tool === 'table' && stroke.text && (!stroke.tableRows || !stroke.tableData)) {
                            try {
                                const parsed = JSON.parse(stroke.text);
                                if (parsed.rows) stroke.tableRows = parsed.rows;
                                if (parsed.cols) stroke.tableCols = parsed.cols;
                                if (parsed.data) stroke.tableData = parsed.data;
                            } catch {}
                        }
                        const storedVersion = processedStrokeVersions.current.get(strokeId);
                        const strokeVersion = stroke.updatedAt || stroke.timestamp || 0;

                        if (storedVersion === undefined || storedVersion < strokeVersion) {
                            processedStrokeVersions.current.set(strokeId, strokeVersion);

                            // Skip echo if locally sent within 5 seconds
                            const sentAt = locallySentStrokes.current.get(strokeId);
                            if (sentAt && Date.now() - sentAt < 5000) {
                                continue;
                            }

                            whiteboardHandlersRef.current.forEach((fn) => {
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

                    // 3. Handle active board synchronization
                    if (serverCurrentBoard !== undefined && serverCurrentBoard !== null && lastSyncedBoard.current !== serverCurrentBoard) {
                        lastSyncedBoard.current = serverCurrentBoard;
                        whiteboardHandlersRef.current.forEach((fn) => {
                            try {
                                fn({
                                    type: 'change-board',
                                    board: serverCurrentBoard,
                                    timestamp: Date.now(),
                                });
                            } catch (e) {}
                        });
                    }
                }
            } catch (error) {
                console.error('[APISync] Polling error:', error);
            }
        };

        // Initial poll
        poll();

        // Poll every 800ms for fast cached whiteboard sync
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
            if (message.type === 'sync-strokes') {
                const addStrokes = (message.addedStrokes || (Array.isArray(message.data) ? message.data : [])) as (Stroke | any)[];
                const deleteStrokeIds = message.removedIds || message.strokeIds || [];

                if (deleteStrokeIds.length > 0) {
                    deleteStrokeIds.forEach((id) => processedStrokeVersions.current.delete(String(id)));
                }
                if (addStrokes.length > 0) {
                    addStrokes.forEach((s) => {
                        if (s && s.id) {
                            locallySentStrokes.current.set(String(s.id), Date.now());
                            processedStrokeVersions.current.set(String(s.id), Date.now());
                        }
                    });
                }

                await api.post(`/video-rooms/${roomCode}/whiteboard/sync`, {
                    addStrokes,
                    deleteStrokeIds,
                    currentBoard: message.currentBoard || message.board,
                });
            } else if (message.type === 'stroke' && message.data) {
                const stroke = message.data as Stroke;
                // Mark this stroke as locally sent so the poll won't re-apply it
                locallySentStrokes.current.set(String(stroke.id), Date.now());
                processedStrokeVersions.current.set(String(stroke.id), Date.now());

                await api.post(`/video-rooms/${roomCode}/whiteboard`, { stroke });
            } else if (message.type === 'clear') {
                await api.delete(`/video-rooms/${roomCode}/whiteboard`);
                processedStrokeVersions.current.clear();
            } else if (message.type === 'clear-board') {
                if (message.strokeIds && message.strokeIds.length > 0) {
                    message.strokeIds.forEach((id) => processedStrokeVersions.current.delete(String(id)));
                    await api.post(`/video-rooms/${roomCode}/whiteboard/strokes/delete`, { strokeIds: message.strokeIds })
                        .catch(() => api.delete(`/video-rooms/${roomCode}/whiteboard/strokes`, { data: { strokeIds: message.strokeIds } }));
                }
            } else if (message.type === 'delete-strokes' || message.type === 'delete-stroke') {
                const strokeIds = message.strokeIds || (message.strokeId ? [message.strokeId] : (Array.isArray(message.data) ? message.data as string[] : []));
                if (strokeIds.length > 0) {
                    strokeIds.forEach((id) => processedStrokeVersions.current.delete(String(id)));
                    await api.post(`/video-rooms/${roomCode}/whiteboard/strokes/delete`, { strokeIds })
                        .catch(() => api.delete(`/video-rooms/${roomCode}/whiteboard/strokes`, { data: { strokeIds } }));
                }
            } else if (message.type === 'change-board' && message.board !== undefined) {
                lastSyncedBoard.current = message.board;
                await api.post(`/video-rooms/${roomCode}/whiteboard/board`, { board: message.board }).catch(() => {});
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
