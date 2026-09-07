/**
 * Video Room Types
 * TypeScript interfaces for the integrated classroom system
 */

// ============ Connection Types ============

/**
 * WebSocket connection states
 */
export type ConnectionState =
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'reconnecting'
    | 'failed';

/**
 * Janus configuration for connection
 */
export interface JanusConfig {
    serverUrl: string;
    roomId: string | number;
    displayName: string;
    onLocalStream?: (stream: MediaStream) => void;
    onRemoteStream?: (participantId: string | number, stream: MediaStream) => void;
    onParticipantJoined?: (participant: Participant) => void;
    onParticipantLeft?: (participantId: string | number) => void;
    onConnectionStateChange?: (state: ConnectionState) => void;
    onDataMessage?: (message: DataChannelMessage) => void;
    onScreenShareEnded?: () => void;
    onKicked?: () => void;
    onError?: (error: Error) => void;
}

// ============ Participant Types ============

/**
 * Participant in the classroom
 */
export interface Participant {
    id: string | number;
    displayName: string;
    stream?: MediaStream;
    isLocal: boolean;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isSpeaking: boolean;
    hasWhiteboardAccess?: boolean;
    isHandRaised?: boolean;
    isTeacher?: boolean;
}

/**
 * Local user state
 */
export interface LocalUserState {
    displayName: string;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isWhiteboardActive: boolean;
    hasWhiteboardAccess?: boolean;
    isHandRaised?: boolean;
}

/**
 * Publisher info from VideoRoom
 */
export interface Publisher {
    id: string | number;
    display?: string;
    audioCodec?: string;
    videoCodec?: string;
    audio_codec?: string;
    video_codec?: string;
    talking?: boolean;
}

// ============ Whiteboard Types ============

/**
 * Drawing tool types
 */
export type DrawingTool =
    | 'select'
    | 'move'
    | 'pen'
    | 'eraser'
    | 'rainbow'
    | 'rect'
    | 'circle'
    | 'line'
    | 'arrow'
    | 'triangle'
    | 'star'
    | 'text'
    | 'highlight'
    | 'image'
    | 'table';

/**
 * Eraser modes: 'object' erases whole stroke/object on touch, 'pixel' precision trims intersecting segments.
 */
export type EraserType = 'object' | 'pixel';

/**
 * A single point on the canvas
 */
export interface Point {
    x: number;
    y: number;
}

/**
 * A complete stroke on the whiteboard
 */
export interface Stroke {
    id: string;
    tool: DrawingTool;
    color: string;
    size: number;
    points: Point[];
    timestamp: number;
    board?: number; // Board number (1-5)
    text?: string;
    imageUrl?: string;
    rotation?: number; // Optional rotation in degrees (0, 90, 180, 270)
    tableRows?: number; // Number of rows for table tool
    tableCols?: number; // Number of columns for table tool
    tableData?: string[][]; // 2D matrix of cell text contents
}

/**
 * Whiteboard message types for DataChannel sync
 */
export type WhiteboardMessageType =
    | 'stroke'
    | 'clear'
    | 'clear-board'
    | 'undo'
    | 'delete-stroke'
    | 'delete-strokes'
    | 'change-board'
    | 'sync-request'
    | 'sync-response';

/**
 * Whiteboard DataChannel message
 */
export interface WhiteboardMessage {
    type: WhiteboardMessageType;
    data?: Stroke | Stroke[] | string | string[];
    board?: number; // Board number for clear-board or change-board operations
    strokeId?: string;
    strokeIds?: string[];
    senderId?: string;
    timestamp: number;
}

/**
 * Whiteboard state
 */
export interface WhiteboardState {
    isActive: boolean;
    currentTool: DrawingTool;
    currentColor: string;
    currentSize: number;
    strokes: Stroke[];
}

// ============ Chat Types ============

/**
 * Chat message
 */
export interface ChatMessage {
    id: string;
    sender: string;
    senderId?: number;
    text: string;
    timestamp: number;
}

/**
 * DataChannel message type (supports both chat and whiteboard)
 */
export type DataChannelMessageType = 'chat' | 'whiteboard' | 'mute' | 'kick' | 'video-off' | 'whiteboard-access' | 'raise-hand' | 'reaction' | 'screen-share' | 'leave' | 'state-sync';

/**
 * Generic DataChannel message
 */
export interface DataChannelMessage {
    type: DataChannelMessageType;
    chat?: ChatMessage;
    whiteboard?: WhiteboardMessage;
    // Control & status properties
    participantId?: string | number;
    displayName?: string;
    muted?: boolean;
    videoOff?: boolean;
    whiteboardAccess?: boolean;
    isHandRaised?: boolean;
    emoji?: string;
    isSharing?: boolean;
    screenFeedId?: string | number;
    // Full state sync payload (sent when new participant joins so they can immediately
    // know the correct mic/camera/hand state of the sender)
    stateMuted?: boolean;
    stateVideoOff?: boolean;
    stateHandRaised?: boolean;
}

// ============ Room Types ============

/**
 * Video room information
 */
export interface VideoRoomInfo {
    janusRoomId: string;  // Numeric room ID as string for JS BigInt compatibility
    sessionId: number;
    isTeacher: boolean;
    isAdmin: boolean;     // True if user is admin (observer) — should NOT be pinned as teacher
    isCreated: boolean;   // Whether room was already created on Janus
    subject: number;
    teacherName?: string | null;
    teacherUserId?: number | null;
}

/**
 * Room access validation response
 */
export interface RoomAccessResponse {
    hasAccess: boolean;
    reason?: string;
    isTeacher?: boolean;
    janusRoomId: string;
    isCreated: boolean;
}

// ============ UI Types ============

/**
 * Video tile props
 */
export interface VideoTileProps {
    participant: Participant;
    isMain?: boolean;
    showOverflow?: number;
}

/**
 * Room state
 */
export interface RoomState {
    roomId: string | null;
    isConnected: boolean;
    connectionState: ConnectionState;
    localUser: LocalUserState;
    participants: Participant[];
    mainParticipantId: string | number | null;
    isScreenSharing: boolean;
    screenShareStream: MediaStream | null;
}
