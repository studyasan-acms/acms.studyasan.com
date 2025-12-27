import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default (io: Server, socket: Socket) => {
    // Join Session Room
    socket.on('join_session', async ({ join_code, student_id, guest_name }: { join_code: string, student_id?: number | string, guest_name?: string }) => {
        console.log(`[Socket] join_session received: code=${join_code}, student_id=${student_id}, guest_name=${guest_name}`);
        try {
            const session = await prisma.quizSession.findUnique({
                where: { join_code },
                include: {
                    host: { select: { id: true, name: true } },
                    activity: { select: { title: true } }
                }
            });

            if (!session) {
                socket.emit('error', 'Session not found');
                return;
            }

            const roomId = `session_${session.id}`;
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room ${roomId} (Role: ${student_id ? 'Student' : 'Host/Guest'})`);

            // Notify host that a student joined.
            // Priority:
            // 1. student_id -> DB lookup
            // 2. guest_name -> Direct use
            // 3. student_id fallback -> "Student X"

            let displayName = guest_name || '';
            let validStudentId = student_id ? Number(student_id) : 0;

            if (validStudentId > 0) {
                try {
                    const student = await prisma.student.findUnique({
                        where: { id: validStudentId },
                        include: { user: { select: { name: true } } }
                    });

                    if (student) {
                        displayName = student.user.name;
                    }
                } catch (e) {
                    console.error('Error fetching student for socket join:', e);
                }
            }

            // If still no name but we have an ID (or just want to show "Someone joined")
            if (!displayName && validStudentId > 0) {
                displayName = `Student ${validStudentId}`;
            }

            if (displayName) {
                console.log(`Emitting student_joined for ${displayName}`);
                io.to(roomId).emit('student_joined', {
                    student_id: validStudentId,
                    name: displayName
                });
            } else if (guest_name) {
                // Even if it's just a guest name
                io.to(roomId).emit('student_joined', {
                    student_id: 0,
                    name: guest_name
                });
            }

            socket.emit('joined_session', { session });
        } catch (error) {
            console.error('Join session error:', error);
            socket.emit('error', 'Failed to join session');
        }
    });

    // Submit Answer (Real-time update for leaderboard)
    socket.on('submit_answer', async ({ attempt_id, score, student_id }) => {
        try {
            // Fetch updated leaderboard for this session
            // We need to know the session ID. 
            // Option A: Client sends session_id. 
            // Option B: We look up attempt -> session_id.

            const attempt = await prisma.activityAttempt.findUnique({
                where: { id: Number(attempt_id) },
                select: { quiz_session_id: true }
            });

            if (attempt && attempt.quiz_session_id) {
                const leaderboard = await prisma.activityAttempt.findMany({
                    where: {
                        quiz_session_id: attempt.quiz_session_id
                    },
                    select: {
                        student_id: true,
                        score: true,
                        student: { select: { user: { select: { name: true } } } }
                    },
                    orderBy: { score: 'desc' },
                    take: 10
                });

                const formattedLeaderboard = leaderboard.map(l => ({
                    student_id: l.student_id,
                    name: l.student.user.name,
                    score: l.score
                }));

                io.to(`session_${attempt.quiz_session_id}`).emit('leaderboard_update', formattedLeaderboard);
            }
        } catch (e) {
            console.error('Error updating leaderboard:', e);
        }
    });

    // Teacher actions are also handled via API + Broadcast.

    // Teacher: Select a word for students to find
    socket.on('teacher_select_word', ({ join_code, word }: { join_code: string, word: string }) => {
        console.log(`[Socket] teacher_select_word: code=${join_code}, word=${word}`);
        prisma.quizSession.findUnique({ where: { join_code } }).then(session => {
            if (session) {
                console.log(`[Socket] Broadcasting current_word_update to session_${session.id}`);
                io.to(`session_${session.id}`).emit('current_word_update', { word });
            } else {
                console.error(`[Socket] Session not found for code ${join_code}`);
            }
        });
    });

    // Student: Found a specific word
    socket.on('student_found_word', async ({ attempt_id, word, time_taken, score_add }: { attempt_id: number, word: string, time_taken: number, score_add: number }) => {
        console.log(`[Socket] student_found_word: attempt_id=${attempt_id}, word=${word}`);
        try {
            // 1. Update the attempt score
            const attempt = await prisma.activityAttempt.findUnique({
                where: { id: Number(attempt_id) },
                select: { id: true, score: true, quiz_session_id: true, student: { select: { user: { select: { name: true } } } } }
            }) as any; // Cast to any to avoid TS errors regarding optional fields

            if (attempt) {
                const newScore = (attempt.score || 0) + score_add;
                await prisma.activityAttempt.update({
                    where: { id: attempt.id },
                    data: { score: newScore }
                });

                // 2. Broadcast success to teacher (and maybe other students)
                if (attempt.quiz_session_id) {
                    console.log(`[Socket] Broadcasting student success to session_${attempt.quiz_session_id}`);
                    io.to(`session_${attempt.quiz_session_id}`).emit('student_word_success', {
                        student_name: attempt.student.user.name,
                        word,
                        score_added: score_add,
                        total_score: newScore
                    });

                    // 3. Update leaderboard
                    const leaderboard = await prisma.activityAttempt.findMany({
                        where: { quiz_session_id: attempt.quiz_session_id } as any,
                        select: {
                            student_id: true,
                            score: true,
                            student: { select: { user: { select: { name: true } } } }
                        },
                        orderBy: { score: 'desc' },
                        take: 10
                    }) as any[];

                    const formattedLeaderboard = leaderboard.map(l => ({
                        student_id: l.student_id,
                        name: l.student.user.name,
                        score: l.score
                    }));

                    io.to(`session_${attempt.quiz_session_id}`).emit('leaderboard_update', formattedLeaderboard);
                }
            } else {
                console.error(`[Socket] Attempt not found for id ${attempt_id}`);
            }
        } catch (error) {
            console.error('Error in student_found_word:', error);
        }
    });

    socket.on('disconnect', () => {
        // Handle disconnect
    });
};
