import type { Request, Response } from 'express';
import { PrismaClient, QuizStatus } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getIo } from '../socket/socket.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Generate a random 6-character code
const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Create Quiz Session (Host Game)
export const createSession = async (req: Request, res: Response) => {
    try {
        const { activity_id } = req.body;
        const userId = (req as any).user.id;

        // Check if activity exists
        const activity = await prisma.activity.findUnique({
            where: { id: Number(activity_id) },
        });

        if (!activity) {
            return sendError(res, 'Activity not found', 404);
        }

        // Create session
        const joinCode = generateJoinCode();
        const session = await prisma.quizSession.create({
            data: {
                activity_id: Number(activity_id),
                host_id: userId,
                join_code: joinCode,
                status: 'LOBBY',
                current_question_index: -1, // Lobby
            },
            include: {
                activity: {
                    select: {
                        items: {
                            orderBy: { order: 'asc' },
                            select: { id: true, content: true, points: true }
                        }
                    }
                }
            }
        });

        return sendSuccess(res, session, 'Quiz session created', 201);
    } catch (error: any) {
        return sendError(res, error.message);
    }
};

// Join Session
export const joinSession = async (req: Request, res: Response) => {
    try {
        const { join_code } = req.body;

        const session = await prisma.quizSession.findUnique({
            where: { join_code },
            include: {
                activity: {
                    select: {
                        title: true,
                        description: true,
                        activity_type: true,
                        items: {
                            orderBy: {
                                order: 'asc'
                            },
                            select: {
                                id: true,
                                content: true,
                                points: true
                            }
                        }
                    },
                },
                host: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!session) {
            return sendError(res, 'Invalid join code', 404);
        }

        if (session.status === 'FINISHED') {
            return sendError(res, 'This session has ended', 400);
        }

        // Sanitize content (remove correct answer)
        const sanitizedItems = session.activity.items.map((item: any) => {
            if (item.content) {
                // Return a new content object without correctAnswer
                const { correctAnswer, ...safeContent } = item.content as any;
                return { ...item, content: safeContent };
            }
            return item;
        });

        const responseData = {
            ...session,
            activity: {
                ...session.activity,
                items: sanitizedItems
            }
        };

        return sendSuccess(res, responseData, 'Joined session successfully');
    } catch (error: any) {
        return sendError(res, error.message);
    }
};

// Start Session (Update status to IN_PROGRESS)
export const startSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const session = await prisma.quizSession.findUnique({
            where: { id: Number(id) },
        });

        if (!session) {
            return sendError(res, 'Session not found', 404);
        }

        if (session.host_id !== userId) {
            return sendError(res, 'Unauthorized', 403);
        }

        const updatedSession = await prisma.quizSession.update({
            where: { id: Number(id) },
            data: {
                status: 'IN_PROGRESS',
                current_question_index: 0, // Start with first question
                start_time: new Date(),
            },
        });

        // Broadcast to room via Socket.IO
        getIo().to(`session_${id}`).emit('session_started', updatedSession);

        return sendSuccess(res, updatedSession, 'Session started');
    } catch (error: any) {
        return sendError(res, error.message);
    }
};

// Next Question
export const nextQuestion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const session = await prisma.quizSession.findUnique({
            where: { id: Number(id) },
        });

        if (!session) return sendError(res, 'Session not found', 404);
        if (session.host_id !== userId) return sendError(res, 'Unauthorized', 403);

        const nextIndex = session.current_question_index + 1;

        // We should check if nextIndex exceeds total items, but for now we just increment.
        // The frontend/socket logic handles "End Game" if no more questions.
        // Or we can query activity items count.

        const updatedSession = await prisma.quizSession.update({
            where: { id: Number(id) },
            data: {
                current_question_index: nextIndex,
            },
        });

        getIo().to(`session_${id}`).emit('next_question', { index: nextIndex });

        return sendSuccess(res, updatedSession, 'Moved to next question');
    } catch (error: any) {
        return sendError(res, error.message);
    }
};

// End Session
export const endSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        const session = await prisma.quizSession.findUnique({
            where: { id: Number(id) },
        });

        if (!session) return sendError(res, 'Session not found', 404);
        if (session.host_id !== userId) return sendError(res, 'Unauthorized', 403);

        const updatedSession = await prisma.quizSession.update({
            where: { id: Number(id) },
            data: {
                status: 'FINISHED',
                end_time: new Date(),
            },
        });

        getIo().to(`session_${id}`).emit('session_ended', updatedSession);

        return sendSuccess(res, updatedSession, 'Session ended');
    } catch (error: any) {
        return sendError(res, error.message);
    }
};

// Get Session by ID
export const getSessionById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const session = await prisma.quizSession.findUnique({
            where: { id: Number(id) },
            include: {
                activity: {
                    select: {
                        title: true,
                        description: true,
                        activity_type: true,
                        items: {
                            orderBy: { order: 'asc' },
                            select: { id: true, content: true, points: true }
                        }
                    }
                },
                host: {
                    select: { name: true, id: true }
                }
            }
        });

        if (!session) {
            return sendError(res, 'Session not found', 404);
        }

        return sendSuccess(res, session, 'Session details');
    } catch (error: any) {
        return sendError(res, error.message);
    }
};
