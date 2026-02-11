import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
// Strip /api if present for socket connection
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

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
}

export const socketService = new SocketService();
