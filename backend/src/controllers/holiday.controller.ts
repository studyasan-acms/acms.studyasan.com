import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import type { AuthRequest } from '../types/index.js';

const prisma = new PrismaClient();

const VALID_HOLIDAY_TYPES = ['NATIONAL', 'FESTIVAL', 'ACADEMIC', 'VACATION', 'GENERAL'];

/**
 * Get all holidays with optional month, year, type, and date range filters
 */
export const getAllHolidays = async (req: Request, res: Response) => {
  try {
    const {
      year,
      month,
      start_date,
      end_date,
      type,
      search,
      upcoming,
      page,
      limit,
    } = req.query;

    const where: any = {
      is_active: true,
    };

    if (type && VALID_HOLIDAY_TYPES.includes((type as string).toUpperCase())) {
      where.type = (type as string).toUpperCase();
    }

    if (search && typeof search === 'string' && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Filter upcoming holidays (from start of today)
    if (upcoming === 'true' || upcoming === '1') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.end_date = { gte: today };
    } else if (start_date && end_date) {
      const sDate = new Date(start_date as string);
      const eDate = new Date(end_date as string);
      where.OR = [
        {
          start_date: { lte: eDate },
          end_date: { gte: sDate },
        },
      ];
    } else if (year) {
      const parsedYear = parseInt(year as string);
      if (!isNaN(parsedYear)) {
        let sDate: Date;
        let eDate: Date;

        if (month) {
          const parsedMonth = parseInt(month as string) - 1; // 0-indexed
          sDate = new Date(Date.UTC(parsedYear, parsedMonth, 1, 0, 0, 0));
          eDate = new Date(Date.UTC(parsedYear, parsedMonth + 1, 0, 23, 59, 59, 999));
        } else {
          sDate = new Date(Date.UTC(parsedYear, 0, 1, 0, 0, 0));
          eDate = new Date(Date.UTC(parsedYear, 11, 31, 23, 59, 59, 999));
        }

        where.OR = [
          {
            start_date: { lte: eDate },
            end_date: { gte: sDate },
          },
        ];
      }
    }

    const pageNum = page ? Math.max(1, parseInt(page as string)) : undefined;
    const limitNum = limit ? Math.max(1, parseInt(limit as string)) : undefined;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : undefined;

    const [holidays, total] = await Promise.all([
      prisma.holiday.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { start_date: 'asc' },
        ...(skip !== undefined && { skip }),
        ...(limitNum !== undefined && { take: limitNum }),
      }),
      prisma.holiday.count({ where }),
    ]);

    if (pageNum && limitNum) {
      return sendSuccess(res, {
        holidays,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      }, 'Holidays fetched successfully');
    }

    return sendSuccess(res, holidays, 'Holidays fetched successfully');
  } catch (error: any) {
    console.error('Error fetching holidays:', error);
    return sendError(res, error.message || 'Failed to fetch holidays', 500);
  }
};

/**
 * Get upcoming holidays (for dashboard widgets)
 */
export const getUpcomingHolidays = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const holidays = await prisma.holiday.findMany({
      where: {
        is_active: true,
        end_date: { gte: today },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { start_date: 'asc' },
      take: 10,
    });

    return sendSuccess(res, holidays, 'Upcoming holidays fetched successfully');
  } catch (error: any) {
    console.error('Error fetching upcoming holidays:', error);
    return sendError(res, error.message || 'Failed to fetch upcoming holidays', 500);
  }
};

/**
 * Get a single holiday by ID
 */
export const getHolidayById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id!);

    if (isNaN(parsedId)) {
      return sendError(res, 'Invalid holiday ID', 400);
    }

    const holiday = await prisma.holiday.findUnique({
      where: { id: parsedId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!holiday) {
      return sendError(res, 'Holiday not found', 404);
    }

    return sendSuccess(res, holiday, 'Holiday fetched successfully');
  } catch (error: any) {
    console.error('Error fetching holiday by ID:', error);
    return sendError(res, error.message || 'Failed to fetch holiday', 500);
  }
};

/**
 * Create a new holiday (Admin only)
 */
export const createHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, start_date, end_date, type } = req.body;
    const userId = req.user!.id;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return sendError(res, 'Holiday title is required', 400);
    }

    if (!start_date || !end_date) {
      return sendError(res, 'Start date and end date are required', 400);
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return sendError(res, 'Invalid start or end date format', 400);
    }

    if (startDate > endDate) {
      return sendError(res, 'End date cannot be earlier than start date', 400);
    }

    let holidayType: any = 'GENERAL';
    if (type && VALID_HOLIDAY_TYPES.includes(type.toUpperCase())) {
      holidayType = type.toUpperCase();
    }

    const holiday = await prisma.holiday.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        start_date: startDate,
        end_date: endDate,
        type: holidayType,
        created_by: userId,
        is_active: true,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(res, holiday, 'Holiday created successfully', 201);
  } catch (error: any) {
    console.error('Error creating holiday:', error);
    return sendError(res, error.message || 'Failed to create holiday', 500);
  }
};

/**
 * Update an existing holiday (Admin only)
 */
export const updateHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, type, is_active } = req.body;
    const parsedId = parseInt(id!);

    if (isNaN(parsedId)) {
      return sendError(res, 'Invalid holiday ID', 400);
    }

    const existing = await prisma.holiday.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return sendError(res, 'Holiday not found', 404);
    }

    const updateData: any = {};

    if (title !== undefined) {
      if (!title || typeof title !== 'string' || !title.trim()) {
        return sendError(res, 'Title cannot be empty', 400);
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }

    if (start_date !== undefined || end_date !== undefined) {
      const newStart = start_date ? new Date(start_date) : existing.start_date;
      const newEnd = end_date ? new Date(end_date) : existing.end_date;

      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        return sendError(res, 'Invalid date format', 400);
      }

      if (newStart > newEnd) {
        return sendError(res, 'End date cannot be earlier than start date', 400);
      }

      updateData.start_date = newStart;
      updateData.end_date = newEnd;
    }

    if (type !== undefined) {
      if (VALID_HOLIDAY_TYPES.includes(type.toUpperCase())) {
        updateData.type = type.toUpperCase();
      }
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    const updated = await prisma.holiday.update({
      where: { id: parsedId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return sendSuccess(res, updated, 'Holiday updated successfully');
  } catch (error: any) {
    console.error('Error updating holiday:', error);
    return sendError(res, error.message || 'Failed to update holiday', 500);
  }
};

/**
 * Delete a holiday (Admin only)
 */
export const deleteHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id!);

    if (isNaN(parsedId)) {
      return sendError(res, 'Invalid holiday ID', 400);
    }

    const existing = await prisma.holiday.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return sendError(res, 'Holiday not found', 404);
    }

    await prisma.holiday.delete({
      where: { id: parsedId },
    });

    return sendSuccess(res, { id: parsedId }, 'Holiday deleted successfully');
  } catch (error: any) {
    console.error('Error deleting holiday:', error);
    return sendError(res, error.message || 'Failed to delete holiday', 500);
  }
};
