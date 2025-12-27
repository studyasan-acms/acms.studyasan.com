import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient, MessageType } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadToS3 } from '../utils/s3.js';

const prisma = new PrismaClient();

// Start a new chat between users
export const startChat = async (req: AuthRequest, res: Response) => {
  try {
    const { participantIds } = req.body; // Array of user IDs
    const userId = (req as any).user!.id;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return sendError(res, 'Participant IDs are required', 400);
    }

    // Include the current user
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    // Verify all participants exist
    const participants = await prisma.user.findMany({
      where: {
        id: { in: allParticipantIds },
      },
    });

    if (participants.length !== allParticipantIds.length) {
      return sendError(res, 'One or more participants not found', 404);
    }

    // Check if a chat already exists between these exact participants
    const existingChats = await prisma.chat.findMany({
      include: {
        participants: {
          select: { user_id: true },
        },
      },
    });

    const existingChat = existingChats.find(chat => {
      const chatUserIds = chat.participants.map(p => p.user_id).sort();
      const requestedUserIds = allParticipantIds.sort();
      return chatUserIds.length === requestedUserIds.length &&
             chatUserIds.every(id => requestedUserIds.includes(id));
    });

    if (existingChat) {
      // Return existing chat with full participant details
      const fullChat = await prisma.chat.findUnique({
        where: { id: existingChat.id },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
      return sendSuccess(res, fullChat, 'Chat already exists', 200);
    }

    // Create new chat
    const chat = await prisma.chat.create({
      data: {
        participants: {
          create: allParticipantIds.map(userId => ({
            user_id: userId,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return sendSuccess(res, chat, 'Chat started successfully', 201);
  } catch (error) {
    console.error('Error starting chat:', error);
    return sendError(res, 'Failed to start chat');
  }
};

// Send a message in a chat
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      return sendError(res, 'Chat ID is required', 400);
    }
    
    const { content, messageType = 'TEXT' } = req.body;
    const userId = (req as any).user!.id;
    const file = req.file; // Assuming multer is used for file upload

    // Verify user is participant in the chat
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chat_id_user_id: {
          chat_id: parseInt(chatId),
          user_id: userId,
        },
      },
    });

    if (!participant) {
      return sendError(res, 'You are not a participant in this chat', 403);
    }

    let attachmentUrl: string | undefined;
    let finalMessageType = messageType as MessageType;

    // Handle file upload
    if (file) {
      try {
        const uploadResult = await uploadToS3(file, 'chat-attachments');
        attachmentUrl = uploadResult.url;
        finalMessageType = getMessageTypeFromFile(file.originalname);
      } catch (uploadError) {
        console.error('Error uploading file:', uploadError);
        return sendError(res, 'Failed to upload file', 500);
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        chat_id: parseInt(chatId),
        sender_id: userId,
        content: content || null,
        message_type: finalMessageType,
        attachment_url: attachmentUrl || null,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(res, message, 'Message sent successfully', 201);
  } catch (error) {
    console.error('Error sending message:', error);
    return sendError(res, 'Failed to send message');
  }
};

// Get messages for a chat
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      return sendError(res, 'Chat ID is required', 400);
    }
    
    const { page = '1', limit = '50' } = req.query;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    // Verify user is participant in the chat (skip check for admins)
    if (userRole !== 'ADMIN') {
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chat_id_user_id: {
            chat_id: parseInt(chatId),
            user_id: userId,
          },
        },
      });

      if (!participant) {
        return sendError(res, 'You are not a participant in this chat', 403);
      }
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const messages = await prisma.message.findMany({
      where: { chat_id: parseInt(chatId) },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: parseInt(limit as string),
    });

    const totalMessages = await prisma.message.count({
      where: { chat_id: parseInt(chatId) },
    });

    return sendSuccess(res, {
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalMessages,
        pages: Math.ceil(totalMessages / parseInt(limit as string)),
      },
    }, 'Messages fetched successfully');
  } catch (error) {
    console.error('Error fetching messages:', error);
    return sendError(res, 'Failed to fetch messages');
  }
};

// Get all chats for the current user
export const getUserChats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user!.id;

    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: {
            user_id: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1, // Get the latest message
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    return sendSuccess(res, chats, 'Chats fetched successfully');
  } catch (error) {
    console.error('Error fetching chats:', error);
    return sendError(res, 'Failed to fetch chats');
  }
};

// Get all chats (Admin only)
export const getAllChats = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = (req as any).user!.role;

    // Ensure only admins can access this
    if (userRole !== 'ADMIN') {
      return sendError(res, 'Forbidden: Admin access required', 403);
    }

    const chats = await prisma.chat.findMany({
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1, // Get the latest message
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    return sendSuccess(res, chats, 'All chats fetched successfully');
  } catch (error) {
    console.error('Error fetching all chats:', error);
    return sendError(res, 'Failed to fetch all chats');
  }
};

// Helper function to determine message type from file
const getMessageTypeFromFile = (filename: string): MessageType => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return MessageType.IMAGE;
  }
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) {
    return MessageType.VIDEO;
  }
  if (ext === 'pdf') {
    return MessageType.PDF;
  }
  
  return MessageType.FILE;
};