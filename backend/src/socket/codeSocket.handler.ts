import { Server, Socket } from 'socket.io';

export default (io: Server, socket: Socket) => {
    // Synchronize code editor contents
    socket.on('code_change', ({ session_id, code }: { session_id: number | string; code: string }) => {
        console.log(`[Socket] code_change in session_${session_id}`);
        socket.to(`session_${session_id}`).emit('code_update', { code });
    });

    // Synchronize chosen coding language
    socket.on('language_change', ({ session_id, language }: { session_id: number | string; language: string }) => {
        console.log(`[Socket] language_change in session_${session_id} to ${language}`);
        socket.to(`session_${session_id}`).emit('language_update', { language });
    });

    // Synchronize console execution outputs
    socket.on('output_change', ({ session_id, output, isRunning }: { session_id: number | string; output: any; isRunning: boolean }) => {
        console.log(`[Socket] output_change in session_${session_id}`);
        socket.to(`session_${session_id}`).emit('output_update', { output, isRunning });
    });
};
