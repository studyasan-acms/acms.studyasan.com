/**
 * Janus WebRTC Gateway Client Service for Frontend
 * 
 * Manages WebRTC connections with Janus Gateway for video conferencing.
 * Adapted from VCS for Vite/React frontend.
 */

import type {
    JanusConfig,
    ConnectionState,
    Participant,
    Publisher,
    DataChannelMessage,
} from '@/types/videoRoom';

// Transaction timeout in milliseconds
const TRANSACTION_TIMEOUT = 10000;

// Keepalive interval in milliseconds
const KEEPALIVE_INTERVAL = 25000;

// Reconnection settings
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;

/**
 * Generate a random transaction ID for Janus messages
 */
function generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate a unique ID for local identification
 */
function generateUniqueId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

interface PendingTransaction {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
}

/**
 * Isolated Janus publisher connection dedicated strictly to Screen Sharing.
 * Runs on its own separate WebSocket connection to guarantee zero interference
 * with the primary camera/mic publisher and subscriber sessions.
 */
class ScreenJanusPublisher {
    private ws: WebSocket | null = null;
    private sessionId: number | null = null;
    private handleId: number | null = null;
    private pc: RTCPeerConnection | null = null;
    private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
    private pendingTransactions: Map<string, { resolve: (val: any) => void; reject: (err: Error) => void; timeout: ReturnType<typeof setTimeout> }> = new Map();
    private serverUrl: string;
    private roomId: string;
    private displayName: string;
    private iceServers: RTCIceServer[];

    constructor(serverUrl: string, roomId: string, displayName: string, iceServers: RTCIceServer[]) {
        this.serverUrl = serverUrl;
        this.roomId = roomId;
        this.displayName = displayName;
        this.iceServers = iceServers;
    }

    private sendMessage(message: Record<string, unknown>): Promise<any> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return Promise.reject(new Error('Screen WebSocket not connected'));
        }
        const transaction = generateTransactionId();
        const fullMessage = { ...message, transaction };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingTransactions.delete(transaction);
                reject(new Error(`Screen transaction ${transaction} timed out`));
            }, TRANSACTION_TIMEOUT);

            this.pendingTransactions.set(transaction, { resolve, reject, timeout });
            this.ws!.send(JSON.stringify(fullMessage));
        });
    }

    async start(stream: MediaStream): Promise<void> {
        return new Promise((resolve) => {
            try {
                this.ws = new WebSocket(this.serverUrl, 'janus-protocol');

                this.ws.onopen = async () => {
                    try {
                        // 1. Create session
                        const sessionRes = await this.sendMessage({ janus: 'create' });
                        this.sessionId = sessionRes.data.id;

                        // Start keepalive
                        this.keepaliveInterval = setInterval(() => {
                            if (this.sessionId && this.ws?.readyState === WebSocket.OPEN) {
                                this.ws.send(JSON.stringify({
                                    janus: 'keepalive',
                                    session_id: this.sessionId,
                                    transaction: generateTransactionId(),
                                }));
                            }
                        }, KEEPALIVE_INTERVAL);

                        // 2. Attach plugin
                        const attachRes = await this.sendMessage({
                            janus: 'attach',
                            session_id: this.sessionId,
                            plugin: 'janus.plugin.videoroom',
                        });
                        this.handleId = attachRes.data.id;

                        // 3. Create PeerConnection
                        this.pc = new RTCPeerConnection({ iceServers: this.iceServers });
                        this.pc.onicecandidate = (event) => {
                            if (event.candidate && this.sessionId && this.handleId && this.ws?.readyState === WebSocket.OPEN) {
                                this.ws.send(JSON.stringify({
                                    janus: 'trickle',
                                    session_id: this.sessionId,
                                    handle_id: this.handleId,
                                    transaction: generateTransactionId(),
                                    candidate: event.candidate,
                                }));
                            }
                        };

                        stream.getTracks().forEach(track => this.pc!.addTrack(track, stream));

                        const offer = await this.pc.createOffer({
                            offerToReceiveAudio: false,
                            offerToReceiveVideo: false,
                        });
                        await this.pc.setLocalDescription(offer);

                        // 4. Join and configure
                        try {
                            await this.sendMessage({
                                janus: 'message',
                                session_id: this.sessionId,
                                handle_id: this.handleId,
                                body: {
                                    request: 'joinandconfigure',
                                    ptype: 'publisher',
                                    room: this.roomId,
                                    display: `${this.displayName} (Screen)`,
                                    audio: false,
                                    video: true,
                                },
                                jsep: offer,
                            });
                        } catch (e) {
                            await this.sendMessage({
                                janus: 'message',
                                session_id: this.sessionId,
                                handle_id: this.handleId,
                                body: {
                                    request: 'join',
                                    ptype: 'publisher',
                                    room: this.roomId,
                                    display: `${this.displayName} (Screen)`,
                                },
                            });
                            await this.sendMessage({
                                janus: 'message',
                                session_id: this.sessionId,
                                handle_id: this.handleId,
                                body: {
                                    request: 'configure',
                                    audio: false,
                                    video: true,
                                },
                                jsep: offer,
                            });
                        }

                        console.log('[ScreenJanusPublisher] Screen share published successfully');
                        resolve();
                    } catch (err: any) {
                        console.warn('[ScreenJanusPublisher] Error establishing screen publisher:', err);
                        resolve(); // Non-blocking
                    }
                };

                this.ws.onmessage = async (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        const { transaction, janus } = message;

                        if (transaction && this.pendingTransactions.has(transaction)) {
                            const pending = this.pendingTransactions.get(transaction)!;
                            clearTimeout(pending.timeout);
                            this.pendingTransactions.delete(transaction);
                            if (janus === 'error') {
                                pending.reject(new Error(message.error?.reason || 'Janus error'));
                            } else {
                                pending.resolve(message);
                            }
                            return;
                        }

                        const jsep = message.jsep as RTCSessionDescriptionInit | undefined;
                        if (jsep && jsep.type === 'answer' && this.pc) {
                            console.log('[ScreenJanusPublisher] Setting remote answer on screen PC');
                            await this.pc.setRemoteDescription(new RTCSessionDescription(jsep));
                        }
                    } catch (e) {
                        console.warn('[ScreenJanusPublisher] Error processing message:', e);
                    }
                };

                this.ws.onerror = (e) => {
                    console.warn('[ScreenJanusPublisher] WebSocket error (non-fatal):', e);
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('[ScreenJanusPublisher] WebSocket closed');
                };
            } catch (outerErr) {
                console.warn('[ScreenJanusPublisher] Outer error starting screen publisher:', outerErr);
                resolve();
            }
        });
    }

    stop(): void {
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }

        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }

        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                try {
                    if (this.sessionId) {
                        this.ws.send(JSON.stringify({
                            janus: 'destroy',
                            session_id: this.sessionId,
                            transaction: generateTransactionId(),
                        }));
                    }
                } catch (e) {}
                this.ws.close();
            }
            this.ws = null;
        }

        this.pendingTransactions.forEach(({ timeout, reject }) => {
            clearTimeout(timeout);
            reject(new Error('Screen publisher stopped'));
        });
        this.pendingTransactions.clear();
        this.sessionId = null;
        this.handleId = null;
    }
}

/**
 * JanusClient class - manages connection and communication with Janus Gateway
 */
export class JanusClient {
    private config: JanusConfig;
    private ws: WebSocket | null = null;
    private sessionId: number | null = null;
    private publisherHandleId: number | null = null;
    private subscriberHandles: Map<string | number, number> = new Map();
    private connectionState: ConnectionState = 'disconnected';
    private pendingTransactions: Map<string, PendingTransaction> = new Map();
    private keepaliveInterval: ReturnType<typeof setInterval> | null = null;
    private reconnectAttempts = 0;
    private localStream: MediaStream | null = null;
    private screenStream: MediaStream | null = null;
    private screenPublisher: ScreenJanusPublisher | null = null;
    private peerConnections: Map<string | number, RTCPeerConnection> = new Map();
    private publisherPc: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private myId: string | number | null = null;
    private localUniqueId = generateUniqueId();
    private attendanceTracked = false; // Track if we've recorded join

    // ICE servers configuration
    private iceServers: RTCIceServer[] = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Bound event handler for beforeunload
    private boundBeforeUnload: (() => void) | null = null;

    constructor(config: JanusConfig) {
        this.config = config;
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    getMyId(): string | number | null {
        return this.myId;
    }

    getScreenStream(): MediaStream | null {
        return this.screenStream;
    }

    getLocalUniqueId(): string {
        return this.localUniqueId;
    }

    private setConnectionState(state: ConnectionState): void {
        this.connectionState = state;
        this.config.onConnectionStateChange?.(state);
    }

    async connect(): Promise<void> {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('[Janus] Already connected');
            return;
        }

        this.setConnectionState('connecting');

        return new Promise((resolve, reject) => {
            try {
                console.log(`[Janus] Connecting to ${this.config.serverUrl}`);
                this.ws = new WebSocket(this.config.serverUrl, 'janus-protocol');

                this.ws.onopen = async () => {
                    console.log('[Janus] WebSocket connected');
                    try {
                        await this.createSession();
                        await this.attachVideoRoomPlugin();
                        await this.joinRoom();
                        await this.recordJoinAttendance(); // Track attendance
                        this.setupBeforeUnloadHandler(); // Handle tab close
                        this.startKeepalive();
                        this.setConnectionState('connected');
                        this.reconnectAttempts = 0;
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };

                this.ws.onclose = (event) => {
                    console.log(`[Janus] WebSocket closed: ${event.code} - ${event.reason}`);
                    this.handleDisconnection();
                };

                this.ws.onerror = (error) => {
                    console.error('[Janus] WebSocket error:', error);
                    this.config.onError?.(new Error('WebSocket connection error'));
                };

                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
            } catch (error) {
                this.setConnectionState('failed');
                reject(error);
            }
        });
    }

    private handleDisconnection(): void {
        this.stopKeepalive();
        this.cleanup();

        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.setConnectionState('reconnecting');
            const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts);
            this.reconnectAttempts++;
            console.log(`[Janus] Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect().catch(() => { }), delay);
        } else {
            // Max reconnect attempts reached - record leave attendance
            console.log('[Janus] Max reconnect attempts reached, recording leave attendance');
            this.recordLeaveAttendanceSync(); // Use sync version for reliability
            this.setConnectionState('failed');
            this.config.onError?.(new Error('Max reconnection attempts reached'));
        }
    }

    private async sendMessage(message: Record<string, unknown>): Promise<unknown> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }

        const transaction = generateTransactionId();
        const fullMessage = { ...message, transaction };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingTransactions.delete(transaction);
                reject(new Error(`Transaction ${transaction} timed out`));
            }, TRANSACTION_TIMEOUT);

            this.pendingTransactions.set(transaction, { resolve, reject, timeout });
            this.ws!.send(JSON.stringify(fullMessage));
        });
    }

    private handleMessage(message: Record<string, unknown>): void {
        const { transaction, janus } = message;

        if (transaction && this.pendingTransactions.has(transaction as string)) {
            const pending = this.pendingTransactions.get(transaction as string)!;
            clearTimeout(pending.timeout);
            this.pendingTransactions.delete(transaction as string);

            if (janus === 'error') {
                pending.reject(new Error((message.error as { reason?: string })?.reason || 'Unknown error'));
            } else {
                pending.resolve(message);
            }
            return;
        }

        switch (janus) {
            case 'event':
                this.handlePluginEvent(message);
                break;
            case 'webrtcup':
                console.log('[Janus] WebRTC connection established');
                break;
            case 'media':
                console.log(`[Janus] Media ${message.type} is ${message.receiving ? 'flowing' : 'stopped'}`);
                break;
            case 'slowlink':
                console.warn('[Janus] Slow link detected');
                break;
            case 'hangup':
                console.log('[Janus] Hangup received');
                break;
        }
    }

    private handlePluginEvent(message: Record<string, unknown>): void {
        console.log('[Janus] Plugin event received:', JSON.stringify(message, null, 2));

        const plugindata = message.plugindata as { data?: Record<string, unknown> } | undefined;
        const data = plugindata?.data;

        if (!data) {
            console.log('[Janus] No plugindata.data in event');
            return;
        }

        const videoroom = data.videoroom;
        console.log(`[Janus] VideoRoom event type: ${videoroom}`, data);

        switch (videoroom) {
            case 'joined':
                this.myId = data.id as number;
                console.log(`[Janus] Joined room as publisher with ID: ${this.myId}`);

                const publishers = data.publishers as Publisher[] | undefined;
                if (publishers && publishers.length > 0) {
                    this.subscribeToPublishers(publishers);
                }
                break;

            case 'event':
                if (data.publishers) {
                    const newPublishers = data.publishers as Publisher[];
                    console.log(`[Janus] New publishers:`, newPublishers);
                    this.subscribeToPublishers(newPublishers);
                }

                if (data.unpublished && typeof data.unpublished === 'number') {
                    const unpublishedId = data.unpublished as number;
                    console.log(`[Janus] Publisher unpublished: ${unpublishedId}`);
                    this.handlePublisherLeft(unpublishedId);
                }

                if (data.leaving && typeof data.leaving === 'number') {
                    const leavingId = data.leaving as number;
                    console.log(`[Janus] Participant leaving: ${leavingId}`);
                    this.handlePublisherLeft(leavingId);
                }

                if (data.kicked === true) {
                    console.warn('[Janus] Current user kicked from room');
                    this.config.onKicked?.();
                }

                if (data.configured === 'ok') {
                    console.log('[Janus] Publisher stream configured');
                }
                break;

            case 'kicked':
                console.warn('[Janus] Received kicked event from VideoRoom');
                this.config.onKicked?.();
                break;

            case 'destroyed':
                console.warn('[Janus] Room destroyed by admin');
                this.config.onKicked?.();
                break;

            case 'attached':
                console.log('[Janus] Subscriber attached');
                break;
        }

        const jsep = message.jsep as RTCSessionDescriptionInit | undefined;
        if (jsep) {
            this.handleJsep(message, jsep);
        }
    }

    private async handleJsep(message: Record<string, unknown>, jsep: RTCSessionDescriptionInit): Promise<void> {
        const senderId = (message as { sender?: number }).sender;

        if (senderId === this.publisherHandleId) {
            if (jsep.type === 'answer' && this.publisherPc) {
                console.log('[Janus] Setting remote description for publisher');
                await this.publisherPc.setRemoteDescription(new RTCSessionDescription(jsep));
            }
        } else {
            const feedId = this.getFeedIdFromHandle(senderId as number);
            if (feedId !== null) {
                const pc = this.peerConnections.get(feedId);
                if (pc && jsep.type === 'offer') {
                    console.log(`[Janus] Handling offer for subscriber feed ${feedId}`);
                    await pc.setRemoteDescription(new RTCSessionDescription(jsep));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    await this.sendMessage({
                        janus: 'message',
                        session_id: this.sessionId,
                        handle_id: senderId,
                        body: { request: 'start', room: this.getRoomId() },
                        jsep: answer,
                    });
                }
            }
        }
    }

    private getFeedIdFromHandle(handleId: number): string | number | null {
        for (const [feedId, hId] of this.subscriberHandles.entries()) {
            if (hId === handleId) return feedId;
        }
        return null;
    }

    private async createSession(): Promise<void> {
        const response = await this.sendMessage({ janus: 'create' }) as { data: { id: number } };
        this.sessionId = response.data.id;
        console.log(`[Janus] Session created: ${this.sessionId}`);
    }

    private async attachVideoRoomPlugin(): Promise<void> {
        const response = await this.sendMessage({
            janus: 'attach',
            session_id: this.sessionId,
            plugin: 'janus.plugin.videoroom',
        }) as { data: { id: number } };

        this.publisherHandleId = response.data.id;
        console.log(`[Janus] VideoRoom plugin attached: ${this.publisherHandleId}`);
    }

    /**
   * Get room ID as string for Janus
   * The Janus server is configured with string_ids: true
   * We prefix with "room-" to ensure JSON serialization keeps it as a string
   */
    private getRoomId(): string {
        // Add prefix to ensure it stays a string in JSON serialization
        const rawId = this.config.roomId.toString();
        return `room-${rawId}`;
    }

    /**
     * Create room on Janus if it doesn't exist
     * Uses backend API for secure room creation with admin key
     */
    private async createRoomIfNeeded(): Promise<boolean> {
        const roomId = this.getRoomId();
        console.log(`[Janus] Creating room if needed: ${roomId}`);

        try {
            // Use backend API to securely create room with admin key
            const apiUrl = `${import.meta.env.VITE_API_URL || '/api/'}video-rooms/janus/create`;
            console.log(`[Janus] Creating room via backend API: ${apiUrl}`);

            const token = localStorage.getItem('token');
            if (!token) {
                console.error('[Janus] ❌ No authentication token found');
                return false;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    roomId: roomId,
                    description: `StudyAsan Classroom ${roomId}`,
                }),
            });

            const result = await response.json();
            console.log(`[Janus] Backend response:`, result);

            if (result.success) {
                if (result.data?.created) {
                    console.log(`[Janus] ✅ Room created successfully: ${roomId}`);
                } else if (result.data?.exists) {
                    console.log(`[Janus] ✅ Room already exists: ${roomId}`);
                }
                return true;
            } else {
                console.error(`[Janus] ❌ Room creation failed:`, result);
                return false;
            }
        } catch (error) {
            console.error(`[Janus] ❌ Room creation error:`, error);
            return false;
        }
    }

    private async joinRoom(): Promise<void> {
        const roomId = this.getRoomId();

        // First, ensure room exists and wait for confirmation
        const roomReady = await this.createRoomIfNeeded();

        if (!roomReady) {
            console.warn(`[Janus] Room may not be ready, attempting join anyway`);
        }

        // Small delay to ensure room is fully ready
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log(`[Janus] Joining room: ${roomId}`);

        await this.sendMessage({
            janus: 'message',
            session_id: this.sessionId,
            handle_id: this.publisherHandleId,
            body: {
                request: 'join',
                ptype: 'publisher',
                room: roomId,
                display: this.config.displayName,
            },
        });
        console.log(`[Janus] Join request sent for room ${roomId}`);
    }

    private async subscribeToPublishers(publishers: Publisher[]): Promise<void> {
        for (const publisher of publishers) {
            if (publisher.id === this.myId) continue;
            if (publisher.display === `${this.config.displayName} (Screen)`) continue;

            console.log(`[Janus] Subscribing to publisher ${publisher.id} (${publisher.display})`);

            const isScreenFeed = publisher.display?.endsWith(' (Screen)');
            const participant: Participant = {
                id: publisher.id,
                displayName: publisher.display || `User ${publisher.id}`,
                isLocal: false,
                isMuted: false,
                isVideoOff: false,
                isScreenSharing: !!isScreenFeed,
                isSpeaking: false,
            };
            this.config.onParticipantJoined?.(participant);

            const attachResponse = await this.sendMessage({
                janus: 'attach',
                session_id: this.sessionId,
                plugin: 'janus.plugin.videoroom',
            }) as { data: { id: number } };

            const subscriberHandleId = attachResponse.data.id;
            this.subscriberHandles.set(publisher.id, subscriberHandleId);

            const pc = this.createPeerConnection(publisher.id);
            this.peerConnections.set(publisher.id, pc);

            await this.sendMessage({
                janus: 'message',
                session_id: this.sessionId,
                handle_id: subscriberHandleId,
                body: {
                    request: 'join',
                    ptype: 'subscriber',
                    room: this.getRoomId(),
                    feed: publisher.id,
                    offer_data: true,
                },
            });
        }
    }

    private createPeerConnection(feedId?: string | number): RTCPeerConnection {
        const pc = new RTCPeerConnection({ iceServers: this.iceServers });

        // Force the browser backend to initialize SCTP transport explicitly
        // This is crucial for subscribers answering an offer that contains data channels
        try {
            pc.createDataChannel('init-sctp');
        } catch(e) {}

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const handleId = feedId
                    ? this.subscriberHandles.get(feedId)
                    : this.publisherHandleId;

                this.sendMessage({
                    janus: 'trickle',
                    session_id: this.sessionId,
                    handle_id: handleId,
                    candidate: event.candidate,
                }).catch(console.error);
            }
        };

        pc.ontrack = (event) => {
            if (feedId !== undefined && event.streams[0]) {
                console.log(`[Janus] Received remote track from feed ${feedId}`);
                this.config.onRemoteStream?.(feedId, event.streams[0]);
            }
        };

        pc.ondatachannel = (event) => {
            const channel = event.channel;
            console.log(`[Janus] Received data channel: ${channel.label}`);
            this.setupDataChannelHandlers(channel);
        };

        pc.onconnectionstatechange = () => {
            console.log(`[Janus] Peer connection state: ${pc.connectionState}`);
        };

        return pc;
    }

    private setupDataChannelHandlers(channel: RTCDataChannel): void {
        this.dataChannel = channel;

        channel.onopen = () => {
            console.log('[Janus] Data channel opened');
        };

        channel.onclose = () => {
            console.log('[Janus] Data channel closed');
        };

        channel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as DataChannelMessage & { senderId?: string };
                if (message.senderId !== this.localUniqueId) {
                    this.config.onDataMessage?.(message);
                }
            } catch (error) {
                console.error('[Janus] Error parsing data channel message:', error);
            }
        };
    }

    private handlePublisherLeft(publisherId: number): void {
        const pc = this.peerConnections.get(publisherId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(publisherId);
        }

        const handleId = this.subscriberHandles.get(publisherId);
        if (handleId) {
            this.sendMessage({
                janus: 'detach',
                session_id: this.sessionId,
                handle_id: handleId,
            }).catch(console.error);
            this.subscriberHandles.delete(publisherId);
        }

        this.config.onParticipantLeft?.(publisherId);
    }

    async publish(stream: MediaStream): Promise<void> {
        if (!this.sessionId || !this.publisherHandleId) {
            throw new Error('Not connected to Janus');
        }

        this.localStream = stream;
        this.publisherPc = this.createPeerConnection();

        stream.getTracks().forEach(track => {
            this.publisherPc!.addTrack(track, stream);
        });

        this.dataChannel = this.publisherPc.createDataChannel('whiteboard', {
            ordered: true,
        });
        this.setupDataChannelHandlers(this.dataChannel);

        const offer = await this.publisherPc.createOffer({
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
        });
        await this.publisherPc.setLocalDescription(offer);

        await this.sendMessage({
            janus: 'message',
            session_id: this.sessionId,
            handle_id: this.publisherHandleId,
            body: {
                request: 'configure',
                audio: stream.getAudioTracks().length > 0,
                video: stream.getVideoTracks().length > 0,
                data: true,
            },
            jsep: offer,
        });

        console.log('[Janus] Publishing local stream');
        this.config.onLocalStream?.(stream);
    }

    toggleMic(muted: boolean): void {
        if (!this.localStream) return;

        this.localStream.getAudioTracks().forEach((track) => {
            track.enabled = !muted;
        });
        console.log(`[Janus] Microphone ${muted ? 'muted' : 'unmuted'}`);
    }

    async toggleCamera(enabled: boolean): Promise<void> {
        if (!this.localStream || !this.publisherPc) return;

        this.localStream.getVideoTracks().forEach(track => {
            track.enabled = enabled;
        });
        console.log(`[Janus] Camera ${enabled ? 'enabled' : 'disabled'}`);
    }

    async shareScreen(): Promise<MediaStream> {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: { ideal: 30, max: 60 },
                },
                audio: false,
            });

            this.screenStream = screenStream;

            screenStream.getVideoTracks()[0].onended = () => {
                this.stopScreenShare();
            };

            // Publish via isolated ScreenJanusPublisher WebSocket
            try {
                this.screenPublisher = new ScreenJanusPublisher(
                    this.config.serverUrl,
                    this.getRoomId(),
                    this.config.displayName,
                    this.iceServers
                );
                await this.screenPublisher.start(screenStream);
            } catch (screenPubErr) {
                console.warn('[Janus] ScreenJanusPublisher error (using local stream fallback):', screenPubErr);
            }

            // Broadcast screen-share event via main data channel
            this.sendData({
                type: 'screen-share',
                isSharing: true,
                participantId: this.myId ?? undefined,
                displayName: this.config.displayName,
            });

            console.log('[Janus] Screen sharing started');
            return screenStream;
        } catch (error) {
            console.error('[Janus] Error starting screen share:', error);
            throw error;
        }
    }

    async stopScreenShare(): Promise<void> {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        if (this.screenPublisher) {
            this.screenPublisher.stop();
            this.screenPublisher = null;
        }

        // Broadcast screen-share stopped
        this.sendData({
            type: 'screen-share',
            isSharing: false,
            participantId: this.myId ?? undefined,
            displayName: this.config.displayName,
        });

        this.config.onScreenShareEnded?.();
        console.log('[Janus] Screen sharing stopped');
    }

    sendData(message: DataChannelMessage): void {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                const messageWithSender = {
                    ...message,
                    senderId: this.localUniqueId,
                    janusId: this.myId,
                };
                const serialized = JSON.stringify(messageWithSender);
                // Safe WebRTC limit for standard DataChannel packet
                if (serialized.length < 60000) {
                    this.dataChannel.send(serialized);
                } else {
                    console.warn('[Janus] Message size (' + serialized.length + ' bytes) exceeds DataChannel safe packet limit; syncing via API instead');
                }
            } catch (err) {
                console.error('[Janus] Error sending data via DataChannel:', err);
            }
        }
    }

    private startKeepalive(): void {
        this.keepaliveInterval = setInterval(() => {
            if (this.sessionId && this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    janus: 'keepalive',
                    session_id: this.sessionId,
                    transaction: generateTransactionId(),
                }));
            }
        }, KEEPALIVE_INTERVAL);
    }

    private stopKeepalive(): void {
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }
    }

    private cleanup(): void {
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();

        if (this.publisherPc) {
            this.publisherPc.close();
            this.publisherPc = null;
        }

        if (this.screenPublisher) {
            this.screenPublisher.stop();
            this.screenPublisher = null;
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        this.pendingTransactions.forEach(({ timeout, reject }) => {
            clearTimeout(timeout);
            reject(new Error('Connection closed'));
        });
        this.pendingTransactions.clear();

        this.subscriberHandles.clear();
        this.sessionId = null;
        this.publisherHandleId = null;
        this.dataChannel = null;
    }

    /**
     * Record join attendance
     */
    private async recordJoinAttendance(): Promise<void> {
        if (this.attendanceTracked) {
            console.log('[Janus] Attendance already tracked for this session');
            return;
        }

        try {
            const roomId = this.getRoomId();
            const apiUrl = `${import.meta.env.VITE_API_URL || '/api/'}video-rooms/${roomId}/join`;
            const token = localStorage.getItem('token');

            if (!token) {
                console.warn('[Janus] No auth token, skipping attendance tracking');
                return;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const result = await response.json();
            if (result.success) {
                this.attendanceTracked = true;
                console.log('[Janus] ✅ Join attendance recorded');
            } else {
                console.warn('[Janus] Failed to record join:', result.message);
            }
        } catch (error) {
            console.error('[Janus] Error recording join attendance:', error);
        }
    }

    /**
     * Record leave attendance
     */
    private async recordLeaveAttendance(): Promise<void> {
        if (!this.attendanceTracked) {
            console.log('[Janus] No join was tracked, skipping leave');
            return;
        }

        try {
            const roomId = this.getRoomId();
            const apiUrl = `${import.meta.env.VITE_API_URL || '/api/'}video-rooms/${roomId}/leave`;
            const token = localStorage.getItem('token');

            if (!token) {
                console.warn('[Janus] No auth token, skipping attendance tracking');
                return;
            }

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const result = await response.json();
            if (result.success) {
                this.attendanceTracked = false; // Reset for next join
                console.log('[Janus] ✅ Leave attendance recorded:', result.data?.durationMinutes, 'minutes');
            } else {
                console.warn('[Janus] Failed to record leave:', result.message);
            }
        } catch (error) {
            console.error('[Janus] Error recording leave attendance:', error);
        }
    }

    /**
     * Record leave attendance synchronously using sendBeacon (for beforeunload)
     */
    private recordLeaveAttendanceSync(): void {
        if (!this.attendanceTracked) {
            console.log('[Janus] No join was tracked, skipping sync leave');
            return;
        }

        try {
            const roomId = this.getRoomId();
            const apiUrl = `${import.meta.env.VITE_API_URL || '/api/'}video-rooms/${roomId}/leave`;
            const token = localStorage.getItem('token');

            if (!token) {
                console.warn('[Janus] No auth token, skipping sync attendance tracking');
                return;
            }

            // Use sendBeacon for reliable delivery on page unload
            const data = JSON.stringify({});
            const blob = new Blob([data], { type: 'application/json' });

            // Can't send auth headers with sendBeacon, so use query param as fallback
            const urlWithToken = `${apiUrl}?token=${encodeURIComponent(token)}`;
            const sent = navigator.sendBeacon(urlWithToken, blob);

            if (sent) {
                this.attendanceTracked = false;
                console.log('[Janus] ✅ Sync leave attendance sent via beacon');
            } else {
                console.warn('[Janus] sendBeacon failed');
            }
        } catch (error) {
            console.error('[Janus] Error in sync leave attendance:', error);
        }
    }

    /**
     * Setup beforeunload handler to record leave when tab closes
     */
    private setupBeforeUnloadHandler(): void {
        this.boundBeforeUnload = () => {
            console.log('[Janus] Page unloading, recording leave attendance');
            this.recordLeaveAttendanceSync();
        };

        window.addEventListener('beforeunload', this.boundBeforeUnload);
    }

    /**
     * Remove beforeunload handler
     */
    private removeBeforeUnloadHandler(): void {
        if (this.boundBeforeUnload) {
            window.removeEventListener('beforeunload', this.boundBeforeUnload);
            this.boundBeforeUnload = null;
        }
    }

    async disconnect(): Promise<void> {
        console.log('[Janus] Disconnecting...');

        // Record leave before disconnecting
        await this.recordLeaveAttendance();

        // Remove beforeunload handler
        this.removeBeforeUnloadHandler();

        this.stopKeepalive();

        // Send leave message for each subscriber
        for (const [participantId, handleId] of this.subscriberHandles) {
            try {
                await this.sendMessage({
                    janus: 'leave',
                    session_id: this.sessionId,
                    handle_id: handleId,
                });
            } catch (e) {
                // Ignore
            }
        }

        // Send leave for publisher
        if (this.publisherHandleId && this.sessionId) {
            try {
                await this.sendMessage({
                    janus: 'leave',
                    session_id: this.sessionId,
                    handle_id: this.publisherHandleId,
                });
            } catch (e) {
                // Ignore
            }
        }

        // Destroy session
        if (this.sessionId) {
            try {
                await this.sendMessage({
                    janus: 'destroy',
                    session_id: this.sessionId,
                });
            } catch (e) {
                // Ignore
            }
        }

        // Close WebSocket
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                try {
                    await this.sendMessage({
                        janus: 'destroy',
                        session_id: this.sessionId,
                    });
                } catch (e) {
                    // Ignore
                }
            }
            this.ws.close();
            this.ws = null;
        }

        this.cleanup();
        this.setConnectionState('disconnected');
    }
}

// Singleton instance management
let janusClientInstance: JanusClient | null = null;

export function createJanusClient(config: JanusConfig): JanusClient {
    if (janusClientInstance) {
        janusClientInstance.disconnect();
    }
    janusClientInstance = new JanusClient(config);
    return janusClientInstance;
}

export function destroyJanusClient(): void {
    if (janusClientInstance) {
        janusClientInstance.disconnect();
        janusClientInstance = null;
    }
}

export function getJanusClient(): JanusClient | null {
    return janusClientInstance;
}
