import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import quizSocketHandler from './quizSocket.handler.js';
import { chatSocketHandler } from './chatSocket.handler.js';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*', // Allow all origins for development
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        },
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
        quizSocketHandler(io, socket);
        chatSocketHandler(io, socket);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
        });
    });

    console.log('🔌 Socket.IO initialized');
    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
