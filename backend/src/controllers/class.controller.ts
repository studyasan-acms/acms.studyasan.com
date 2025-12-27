import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';

const prisma = new PrismaClient();

export const getAllClasses = async (req: Request, res: Response) => {
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
    
    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.class.count({ where }),
    ]);
    
    const response = createPaginatedResponse(classes, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const getClassById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const classData = await prisma.class.findUnique({
      where: { id: parseInt(id!) },
      include: {
        _count: {
          select: { students: true, subjects: true },
        },
      },
    });
    
    if (!classData) {
      return sendError(res, 'Class not found', 404);
    }
    
    sendSuccess(res, classData);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const createClass = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    const classData = await prisma.class.create({
      data: { name },
    });
    
    sendSuccess(res, classData, 'Class created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const updateClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const classData = await prisma.class.update({
      where: { id: parseInt(id!) },
      data: { name },
    });
    
    sendSuccess(res, classData, 'Class updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const deleteClass = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.class.delete({
      where: { id: parseInt(id!) },
    });
    
    sendSuccess(res, null, 'Class deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};  