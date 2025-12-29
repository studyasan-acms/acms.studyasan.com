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
}

/**
 * Publisher info from VideoRoom
 */
export interface Publisher {
    id: string | number;
    display?: string;
    audioCodec?: string;
    videoCodec?: string;
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
    | 'image';

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
}

/**
 * Whiteboard message types for DataChannel sync
 */
export type WhiteboardMessageType = 'stroke' | 'clear' | 'clear-board' | 'undo' | 'sync-request' | 'sync-response';

/**
 * Whiteboard DataChannel message
 */
export interface WhiteboardMessage {
    type: WhiteboardMessageType;
    data?: Stroke | Stroke[];
    board?: number; // Board number for clear-board operations
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
export type DataChannelMessageType = 'chat' | 'whiteboard';

/**
 * Generic DataChannel message
 */
export interface DataChannelMessage {
    type: DataChannelMessageType;
    chat?: ChatMessage;
    whiteboard?: WhiteboardMessage;
}

// ============ Room Types ============

/**
 * Video room information
 */
export interface VideoRoomInfo {
    janusRoomId: string;  // Numeric room ID as string for JS BigInt compatibility
    sessionId: number;
    isTeacher: boolean;
    isCreated: boolean;   // Whether room was already created on Janus
    subject: number;
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
