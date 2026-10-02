import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

// Strip /api if present for socket connection
const rawUrl = API_URL.startsWith('/')
    ? (typeof window !== 'undefined' ? window.location.origin : 'https://acms.studyasan.com')
    : API_URL;
const SOCKET_URL = rawUrl.replace(/\/api\/?$/, '');

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) return this.socket;

        this.socket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return this.socket;
    }

    getSocket() {
        if (!this.socket) {
            return this.connect();
        }
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinChat(chatId: string | number) {
        this.socket?.emit('join_chat', chatId);
    }

    leaveChat(chatId: string | number) {
        this.socket?.emit('leave_chat', chatId);
    }

    markMessageSeen(payload: { messageId: number; userId: number; chatId: string | number }) {
        this.socket?.emit('message_seen', payload);
    }
}

export const socketService = new SocketService();
