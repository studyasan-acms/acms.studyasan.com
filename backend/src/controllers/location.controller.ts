import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

/**
 * Get all countries
 */
export const getCountries = async (_req: Request, res: Response): Promise<void> => {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    sendSuccess(res, countries);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Get all states for a country
 */
export const getStatesByCountry = async (req: Request<{ countryId: string }>, res: Response): Promise<void> => {
  try {
    const countryId = parseInt(req.params.countryId, 10);
    if (isNaN(countryId)) {
      sendError(res, 'Invalid countryId', 400);
      return;
    }

    const states = await prisma.state.findMany({
      where: { countryId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    sendSuccess(res, states);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

/**
 * Get all cities for a state
 */
export const getCitiesByState = async (req: Request<{ stateId: string }>, res: Response): Promise<void> => {
  try {
    const stateId = parseInt(req.params.stateId, 10);
    if (isNaN(stateId)) {
      sendError(res, 'Invalid stateId', 400);
      return;
    }

    const cities = await prisma.city.findMany({
      where: { stateId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    sendSuccess(res, cities);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};
