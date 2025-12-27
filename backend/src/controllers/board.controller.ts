import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const prisma = new PrismaClient();

export const getAllBoards = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );
    
    const search = req.query.search as string;
    
    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as any,
          },
        }
      : {};
    
    const [boards, total] = await Promise.all([
      prisma.board.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.board.count({ where }),
    ]);
    
    const response = createPaginatedResponse(boards, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getBoardById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const board = await prisma.board.findUnique({
      where: { id: parseInt(id!) },
      include: {
        _count: {
          select: { students: true, subjects: true },
        },
      },
    });
    
    if (!board) {
      return sendError(res, 'Board not found', 404);
    }
    
    sendSuccess(res, board);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createBoard = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    const board = await prisma.board.create({
      data: { name },
    });
    
    sendSuccess(res, board, 'Board created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateBoard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const board = await prisma.board.update({
      where: { id: parseInt(id!) },
      data: { name },
    });
    
    sendSuccess(res, board, 'Board updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteBoard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.board.delete({
      where: { id: parseInt(id!) },
    });
    
    sendSuccess(res, null, 'Board deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};