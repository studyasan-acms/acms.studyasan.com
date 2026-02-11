import { Server, Socket } from 'socket.io';

export const chatSocketHandler = (io: Server, socket: Socket) => {
    socket.on('join_chat', (chatId: string | number) => {
        const room = `chat_${chatId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on('leave_chat', (chatId: string | number) => {
        const room = `chat_${chatId}`;
        socket.leave(room);
        console.log(`Socket ${socket.id} left ${room}`);
    });

    socket.on('typing', (data: { chatId: string | number; userId: number; userName: string }) => {
        socket.to(`chat_${data.chatId}`).emit('typing', data);
    });

    socket.on('stop_typing', (data: { chatId: string | number }) => {
        socket.to(`chat_${data.chatId}`).emit('stop_typing', data);
    });
};
