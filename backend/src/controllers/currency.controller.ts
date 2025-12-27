import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

class CurrencyController {
  /** Get all currencies */
  async getCurrencies(_req: Request, res: Response) {
    try {
      const currencies = await prisma.currency.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, currencies);
    } catch (error: any) {
      return sendError(res, error.message || 'Internal Server Error', 500, error);
    }
  }

  /** Get a single currency by ID */
  async getCurrency(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const currency = await prisma.currency.findUnique({
        where: { id: Number(id) },
      });

      if (!currency) {
        return sendError(res, 'Currency not found', 404);
      }

      return sendSuccess(res, currency);
    } catch (error: any) {
      return sendError(res, error.message || 'Internal Server Error', 500, error);
    }
  }
}

export default new CurrencyController();
