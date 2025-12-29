import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../types/index.js';
import { sendError } from '../utils/response.js';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check Authorization header first, then query param (for sendBeacon)
    let token = req.headers.authorization?.split(' ')[1];

    // Fallback to query param token (used by sendBeacon for page unload)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return sendError(res, 'No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Invalid token', 401);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden', 403);
    }

    next();
  };
};