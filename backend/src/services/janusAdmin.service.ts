/**
 * Janus Admin Service
 * 
 * Manages communication with Janus Gateway for:
 * - Room creation/destruction via regular Janus API
 * - Participant moderation (kick)
 */

import axios from 'axios';

// Regular Janus API for plugin operations
const JANUS_API_URL = process.env.JANUS_API_URL || 'https://janus.xdastechnology.com/api';

/**
 * Generate a unique transaction ID for Janus requests
 */
function generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Send a request to Janus API and wait for response
 */
async function sendJanusRequest(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
        const transaction = payload.transaction as string || generateTransactionId();
        const response = await axios.post(JANUS_API_URL, {
            ...payload,
            transaction,
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
        });

        if (response.data.janus === 'error') {
            throw new Error(response.data.error?.reason || 'Janus request failed');
        }

        return response.data;
    } catch (error) {
        console.error('[JanusAdmin] API request failed:', error);
        throw error;
    }
}

/**
 * Poll for plugin event response
 */
async function pollForEvent(sessionId: number, maxAttempts: number = 10): Promise<Record<string, unknown> | null> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await axios.get(`${JANUS_API_URL}/${sessionId}?maxev=1`, {
                timeout: 5000,
            });

            if (response.data && response.data.janus === 'event') {
                return response.data;
            }

            // Small delay between polls
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            // Timeout or no events, continue polling
        }
    }
    return null;
}

/**
 * Create a VideoRoom on Janus
 */
export async function createJanusRoom(roomId: string, description?: string): Promise<{ created: boolean; exists: boolean }> {
    console.log(`[JanusAdmin] Creating room: ${roomId}`);

    let sessionId: number | null = null;

    try {
        // Step 1: Create a Janus session
        const createResponse = await sendJanusRequest({
            janus: 'create',
        });

        sessionId = (createResponse.data as { id: number })?.id;
        if (!sessionId) {
            throw new Error('Failed to create Janus session');
        }
        console.log(`[JanusAdmin] Session created: ${sessionId}`);

        // Step 2: Attach to VideoRoom plugin
        const attachResponse = await sendJanusRequest({
            janus: 'attach',
            session_id: sessionId,
            plugin: 'janus.plugin.videoroom',
        });

        const handleId = (attachResponse.data as { id: number })?.id;
        if (!handleId) {
            throw new Error('Failed to attach to VideoRoom plugin');
        }
        console.log(`[JanusAdmin] Plugin attached: ${handleId}`);

        // Step 3: Send create room request
        const createRoomTxn = generateTransactionId();
        await sendJanusRequest({
            janus: 'message',
            session_id: sessionId,
            handle_id: handleId,
            transaction: createRoomTxn,
            body: {
                request: 'create',
                room: roomId,
                permanent: false,
                description: description || `StudyAsan Classroom ${roomId}`,
                publishers: 100,
                bitrate: 512000,
                fir_freq: 10,
                audiocodec: 'opus',
                videocodec: 'vp8,h264',
                record: false,
                is_private: false,
            },
        });

        // Step 4: Poll for the actual response
        const eventResponse = await pollForEvent(sessionId);

        if (eventResponse) {
            const pluginData = (eventResponse.plugindata as { data?: Record<string, unknown> })?.data;

            if (pluginData?.videoroom === 'created') {
                console.log(`[JanusAdmin] Room created successfully: ${roomId}`);
                await cleanupSession(sessionId);
                return { created: true, exists: false };
            } else if (pluginData?.error_code === 427) {
                console.log(`[JanusAdmin] Room already exists: ${roomId}`);
                await cleanupSession(sessionId);
                return { created: false, exists: true };
            } else if (pluginData?.error_code) {
                console.error(`[JanusAdmin] Room creation error:`, pluginData);
                throw new Error(pluginData.error as string || 'Room creation failed');
            }
        }

        // If we got here without a clear response, check if room exists
        const existsResult = await checkRoomExistsWithHandle(sessionId, handleId, roomId);
        await cleanupSession(sessionId);

        if (existsResult) {
            console.log(`[JanusAdmin] Room verified to exist: ${roomId}`);
            return { created: false, exists: true };
        }

        console.log(`[JanusAdmin] Room creation uncertain, assuming success: ${roomId}`);
        return { created: true, exists: false };

    } catch (error) {
        if (sessionId) {
            await cleanupSession(sessionId);
        }
        console.error(`[JanusAdmin] Failed to create room ${roomId}:`, error);
        throw error;
    }
}

/**
 * Check if room exists using an existing handle
 */
async function checkRoomExistsWithHandle(sessionId: number, handleId: number, roomId: string): Promise<boolean> {
    try {
        await sendJanusRequest({
            janus: 'message',
            session_id: sessionId,
            handle_id: handleId,
            body: {
                request: 'exists',
                room: roomId,
            },
        });

        const eventResponse = await pollForEvent(sessionId);
        if (eventResponse) {
            const pluginData = (eventResponse.plugindata as { data?: { exists?: boolean } })?.data;
            return pluginData?.exists === true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Cleanup a Janus session
 */
async function cleanupSession(sessionId: number): Promise<void> {
    try {
        await sendJanusRequest({
            janus: 'destroy',
            session_id: sessionId,
        });
    } catch {
        // Best effort cleanup
    }
}

/**
 * Destroy a VideoRoom on Janus
 */
export async function destroyJanusRoom(roomId: string): Promise<boolean> {
    console.log(`[JanusAdmin] Destroying room: ${roomId}`);

    let sessionId: number | null = null;

    try {
        const createResponse = await sendJanusRequest({ janus: 'create' });
        sessionId = (createResponse.data as { id: number })?.id;
        if (!sessionId) throw new Error('Failed to create session');

        const attachResponse = await sendJanusRequest({
            janus: 'attach',
            session_id: sessionId,
            plugin: 'janus.plugin.videoroom',
        });
        const handleId = (attachResponse.data as { id: number })?.id;

        await sendJanusRequest({
            janus: 'message',
            session_id: sessionId,
            handle_id: handleId,
            body: {
                request: 'destroy',
                room: roomId,
            },
        });

        await pollForEvent(sessionId);
        console.log(`[JanusAdmin] Room destroyed: ${roomId}`);
        await cleanupSession(sessionId);
        return true;
    } catch (error) {
        if (sessionId) await cleanupSession(sessionId);
        console.error(`[JanusAdmin] Failed to destroy room ${roomId}:`, error);
        return false;
    }
}

/**
 * Kick a participant from a room
 */
export async function kickParticipantFromRoom(roomId: string, participantId: number): Promise<boolean> {
    console.log(`[JanusAdmin] Kicking participant ${participantId} from room ${roomId}`);

    let sessionId: number | null = null;

    try {
        const createResponse = await sendJanusRequest({ janus: 'create' });
        sessionId = (createResponse.data as { id: number })?.id;

        const attachResponse = await sendJanusRequest({
            janus: 'attach',
            session_id: sessionId,
            plugin: 'janus.plugin.videoroom',
        });
        const handleId = (attachResponse.data as { id: number })?.id;

        await sendJanusRequest({
            janus: 'message',
            session_id: sessionId,
            handle_id: handleId,
            body: {
                request: 'kick',
                room: roomId,
                id: participantId,
            },
        });

        await pollForEvent(sessionId);
        console.log(`[JanusAdmin] Kicked participant ${participantId} from room ${roomId}`);
        await cleanupSession(sessionId);
        return true;
    } catch (error) {
        if (sessionId) await cleanupSession(sessionId);
        console.error(`[JanusAdmin] Failed to kick participant:`, error);
        return false;
    }
}

/**
 * Get list of participants in a room
 */
export async function getRoomParticipants(roomId: string): Promise<Array<{ id: number; display: string }>> {
    let sessionId: number | null = null;

    try {
        const createResponse = await sendJanusRequest({ janus: 'create' });
        sessionId = (createResponse.data as { id: number })?.id;

        const attachResponse = await sendJanusRequest({
            janus: 'attach',
            session_id: sessionId,
            plugin: 'janus.plugin.videoroom',
        });
        const handleId = (attachResponse.data as { id: number })?.id;

        await sendJanusRequest({
            janus: 'message',
            session_id: sessionId,
            handle_id: handleId,
            body: {
                request: 'listparticipants',
                room: roomId,
            },
        });

        const eventResponse = await pollForEvent(sessionId);
        await cleanupSession(sessionId);

        if (eventResponse) {
            const pluginData = (eventResponse.plugindata as { data?: { participants?: Array<{ id: number; display: string }> } })?.data;
            return pluginData?.participants || [];
        }
        return [];
    } catch (error) {
        if (sessionId) await cleanupSession(sessionId);
        console.error(`[JanusAdmin] Failed to get participants for room ${roomId}:`, error);
        return [];
    }
}

/**
 * Check if a room exists
 */
export async function checkRoomExists(roomId: string): Promise<boolean> {
    let sessionId: number | null = null;

    try {
        const createResponse = await sendJanusRequest({ janus: 'create' });
        sessionId = (createResponse.data as { id: number })?.id;

        const attachResponse = await sendJanusRequest({
            janus: 'attach',
            session_id: sessionId,
            plugin: 'janus.plugin.videoroom',
        });
        const handleId = (attachResponse.data as { id: number })?.id;

        const result = await checkRoomExistsWithHandle(sessionId, handleId, roomId);
        await cleanupSession(sessionId);
        return result;
    } catch (error) {
        if (sessionId) await cleanupSession(sessionId);
        console.error(`[JanusAdmin] Failed to check room ${roomId}:`, error);
        return false;
    }
}

export default {
    createJanusRoom,
    destroyJanusRoom,
    kickParticipantFromRoom,
    getRoomParticipants,
    checkRoomExists,
};
