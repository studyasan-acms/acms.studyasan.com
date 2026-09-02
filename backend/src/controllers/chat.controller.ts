import type { Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient, MessageType } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadToS3 } from '../utils/s3.js';
import { getIo } from '../socket/socket.js';
import { scheduleUnreadMessageNotifications } from '../services/chatMessageTracker.service.js';

const prisma = new PrismaClient();

const canTeacherMessageStudent = async (teacherUserId: number, studentUserId: number) => {
  const [teacher, student] = await Promise.all([
    prisma.teacher.findUnique({
      where: { user_id: teacherUserId },
      include: {
        role: true,
        teacher_subject_junctions: { select: { subject_id: true } },
      },
    }),
    prisma.student.findUnique({
      where: { user_id: studentUserId },
      include: {
        enrollments: { select: { subject_id: true } },
      },
    }),
  ]);

  if (!teacher || !student) {
    return {
      allowed: false,
      reason: 'Chat is disabled because teacher/student relationship is no longer valid.',
    };
  }

  const hasViewAll = !!teacher.role?.is_active && ((teacher.role.permissions as any)?.students?.view === true);
  if (hasViewAll) {
    return { allowed: true };
  }

  const teacherSubjects = new Set(teacher.teacher_subject_junctions.map((j) => j.subject_id));
  const studentSubjects = new Set(
    student.enrollments
      .map((enrollment) => enrollment.subject_id)
      .filter((subjectId): subjectId is number => subjectId !== null)
  );

  const hasCommonSubject = [...studentSubjects].some((subjectId) => teacherSubjects.has(subjectId));
  if (!hasCommonSubject) {
    return {
      allowed: false,
      reason: 'Chat is disabled because this student is no longer enrolled in your assigned subjects.',
    };
  }

  return { allowed: true };
};

const canStudentMessageTeacher = async (studentUserId: number, teacherUserId: number) => {
  const result = await canTeacherMessageStudent(teacherUserId, studentUserId);
  if (!result.allowed) {
    return {
      allowed: false,
      reason: 'Chat is disabled because this teacher is no longer assigned to your enrolled subjects.',
    };
  }

  return { allowed: true };
};

const canUserSendInChat = async (chatId: number, userId: number, userRole: string) => {
  if (userRole === 'ADMIN') {
    return { allowed: true };
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!chat) {
    return { allowed: false, reason: 'Chat not found.' };
  }

  const isParticipant = chat.participants.some((participant) => participant.user_id === userId);
  if (!isParticipant) {
    return { allowed: false, reason: 'You are not a participant in this chat.' };
  }

  // For group chats or non-student/teacher combinations, keep chat enabled.
  if (chat.participants.length !== 2) {
    return { allowed: true };
  }

  const otherParticipant = chat.participants.find((participant) => participant.user_id !== userId);
  if (!otherParticipant) {
    return { allowed: true };
  }

  if (userRole === 'TEACHER' && otherParticipant.user.role === 'STUDENT') {
    return canTeacherMessageStudent(userId, otherParticipant.user_id);
  }

  if (userRole === 'STUDENT' && otherParticipant.user.role === 'TEACHER') {
    return canStudentMessageTeacher(userId, otherParticipant.user_id);
  }

  return { allowed: true };
};

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
                  role: true,
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
                role: true,
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

    const parsedChatId = parseInt(chatId);
    if (isNaN(parsedChatId)) {
      return sendError(res, 'Valid Chat ID is required', 400);
    }

    const { content, messageType = 'TEXT' } = req.body;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    const chat = await prisma.chat.findUnique({
      where: { id: parsedChatId },
    });

    if (!chat) {
      return sendError(res, 'Chat not found', 404);
    }

    // Verify user is participant in the chat (Admins can send in any chat)
    if (userRole !== 'ADMIN') {
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          chat_id_user_id: {
            chat_id: parsedChatId,
            user_id: userId,
          },
        },
      });

      if (!participant) {
        return sendError(res, 'You are not a participant in this chat', 403);
      }
    }

    const chatPermission = await canUserSendInChat(parsedChatId, userId, userRole);
    if (!chatPermission.allowed) {
      return sendError(res, chatPermission.reason || 'You can no longer send messages in this chat.', 403);
    }

    const rawFiles = (req.files as Express.Multer.File[]) || [];
    const singleFile = req.file;
    const filesToProcess: Express.Multer.File[] = [];

    if (rawFiles && Array.isArray(rawFiles) && rawFiles.length > 0) {
      const seen = new Set<string>();
      for (const f of rawFiles) {
        const key = `${f.originalname}_${f.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          filesToProcess.push(f);
        }
      }
    } else if (singleFile) {
      filesToProcess.push(singleFile);
    }

    // Parse any pre-uploaded attachments if supplied
    let preUploadedAttachments: { url: string; messageType?: MessageType }[] = [];
    if (req.body.attachments) {
      try {
        if (typeof req.body.attachments === 'string') {
          preUploadedAttachments = JSON.parse(req.body.attachments);
        } else if (Array.isArray(req.body.attachments)) {
          preUploadedAttachments = req.body.attachments;
        }
      } catch (e) {
        console.error('Failed to parse pre-uploaded attachments:', e);
      }
    }

    const chatParticipants = await prisma.chatParticipant.findMany({
      where: { chat_id: parsedChatId },
      select: { user_id: true },
    });
    const io = getIo();

    // 1. If pre-uploaded attachments are provided
    if (preUploadedAttachments.length > 0) {
      const createdMessages: any[] = [];
      for (let i = 0; i < preUploadedAttachments.length; i++) {
        const item = preUploadedAttachments[i];
        if (!item || !item.url) continue;
        const msgContent = i === 0 ? (content || null) : null;
        const msgType = item.messageType || getMessageTypeFromFile(item.url);

        const createdMsg = await prisma.message.create({
          data: {
            chat_id: parsedChatId,
            sender_id: userId,
            content: msgContent,
            message_type: msgType,
            attachment_url: item.url,
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

        createdMessages.push(createdMsg);

        try {
          io.to(`chat_${chatId}`).emit('receive_message', createdMsg);
        } catch (error) {
          console.error('Socket error:', error);
        }

        scheduleUnreadMessageNotifications({
          messageId: createdMsg.id,
          senderId: userId,
          senderName: createdMsg.sender.name,
          content: createdMsg.content,
          messageType: createdMsg.message_type,
          recipientIds: chatParticipants.map((p) => p.user_id),
        });
      }

      return sendSuccess(
        res,
        createdMessages.length === 1 ? createdMessages[0] : createdMessages[createdMessages.length - 1],
        'Message(s) sent successfully',
        201
      );
    }

    // 2. If no multipart files and no pre-uploaded attachments, create text message
    if (filesToProcess.length === 0) {
      const message = await prisma.message.create({
        data: {
          chat_id: parsedChatId,
          sender_id: userId,
          content: content || null,
          message_type: (messageType as MessageType) || 'TEXT',
          attachment_url: null,
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

      try {
        io.to(`chat_${chatId}`).emit('receive_message', message);
      } catch (error) {
        console.error('Socket error:', error);
      }

      scheduleUnreadMessageNotifications({
        messageId: message.id,
        senderId: userId,
        senderName: message.sender.name,
        content: message.content,
        messageType: message.message_type,
        recipientIds: chatParticipants.map((participantItem) => participantItem.user_id),
      });

      return sendSuccess(res, message, 'Message sent successfully', 201);
    }

    // 3. Process multipart file uploads
    let uploadResults: { file: Express.Multer.File; url: string; messageType: MessageType }[] = [];
    try {
      uploadResults = await Promise.all(
        filesToProcess.map(async (f) => {
          const uploadResult = await uploadToS3(f, 'chat-attachments');
          return {
            file: f,
            url: uploadResult.url,
            messageType: getMessageTypeFromFile(f.originalname),
          };
        })
      );
    } catch (uploadError) {
      console.error('Error uploading file(s):', uploadError);
      return sendError(res, 'Failed to upload attachments', 500);
    }

    const createdMessages: any[] = [];

    for (let i = 0; i < uploadResults.length; i++) {
      const item = uploadResults[i];
      if (!item) continue;
      // Attach text content to the first message if provided
      const msgContent = i === 0 ? (content || null) : null;

      const createdMsg = await prisma.message.create({
        data: {
          chat_id: parsedChatId,
          sender_id: userId,
          content: msgContent,
          message_type: item.messageType,
          attachment_url: item.url,
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

      createdMessages.push(createdMsg);

      try {
        io.to(`chat_${chatId}`).emit('receive_message', createdMsg);
      } catch (error) {
        console.error('Socket error:', error);
      }

      scheduleUnreadMessageNotifications({
        messageId: createdMsg.id,
        senderId: userId,
        senderName: createdMsg.sender.name,
        content: createdMsg.content,
        messageType: createdMsg.message_type,
        recipientIds: chatParticipants.map((participantItem) => participantItem.user_id),
      });
    }

    return sendSuccess(
      res,
      createdMessages.length === 1 ? createdMessages[0] : createdMessages[createdMessages.length - 1],
      'Message(s) sent successfully',
      201
    );
  } catch (error) {
    console.error('Error sending message:', error);
    return sendError(res, 'Failed to send message');
  }
};

// Dedicated chat attachment uploader
export const uploadChatAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const rawFiles = (req.files as Express.Multer.File[]) || [];
    const singleFile = req.file;
    const filesToProcess: Express.Multer.File[] = [];

    if (rawFiles && Array.isArray(rawFiles) && rawFiles.length > 0) {
      const seen = new Set<string>();
      for (const f of rawFiles) {
        const key = `${f.originalname}_${f.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          filesToProcess.push(f);
        }
      }
    } else if (singleFile) {
      filesToProcess.push(singleFile);
    }

    if (filesToProcess.length === 0) {
      return sendError(res, 'No files provided for upload', 400);
    }

    const uploadResults = await Promise.all(
      filesToProcess.map(async (f) => {
        const uploadResult = await uploadToS3(f, 'chat-attachments');
        return {
          originalName: f.originalname,
          filename: uploadResult.filename,
          url: uploadResult.url,
          key: uploadResult.key,
          size: f.size,
          messageType: getMessageTypeFromFile(f.originalname),
        };
      })
    );

    return sendSuccess(res, { attachments: uploadResults }, 'Attachments uploaded successfully');
  } catch (error) {
    console.error('Error uploading chat attachments:', error);
    return sendError(res, 'Failed to upload attachments', 500);
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

    const chatPermission = await canUserSendInChat(parseInt(chatId), userId, userRole);

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
      can_send: chatPermission.allowed,
      can_send_reason: chatPermission.allowed ? null : (chatPermission.reason || 'You can no longer send messages in this chat.'),
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

// Delete a message in a chat
export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { chatId, messageId } = req.params;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    if (!messageId) {
      return sendError(res, 'Message ID is required', 400);
    }

    const parsedMessageId = parseInt(messageId);
    if (isNaN(parsedMessageId)) {
      return sendError(res, 'Valid Message ID is required', 400);
    }

    const message = await prisma.message.findUnique({
      where: { id: parsedMessageId },
    });

    if (!message) {
      return sendError(res, 'Message not found', 404);
    }

    if (chatId && message.chat_id !== parseInt(chatId)) {
      return sendError(res, 'Message does not belong to this chat', 400);
    }

    // Admins can delete any message. Senders can delete their own messages.
    if (userRole !== 'ADMIN' && message.sender_id !== userId) {
      return sendError(res, 'You are not authorized to delete this message', 403);
    }

    await prisma.message.delete({
      where: { id: parsedMessageId },
    });

    try {
      const io = getIo();
      io.to(`chat_${message.chat_id}`).emit('message_deleted', {
        messageId: message.id,
        chatId: message.chat_id,
      });
    } catch (socketError) {
      console.error('Socket error on message deletion:', socketError);
    }

    return sendSuccess(res, { messageId: message.id, chatId: message.chat_id }, 'Message deleted successfully');
  } catch (error) {
    console.error('Error deleting message:', error);
    return sendError(res, 'Failed to delete message');
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