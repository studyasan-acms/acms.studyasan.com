import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../types/index.js';
import { sendError } from '../utils/response.js';
import { checkTeacherPermission } from '../utils/permission.utils.js';

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
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    // If user has one of the allowed roles, proceed
    if (roles.includes(req.user.role)) {
      return next();
    }

    // If TEACHER is trying to access ADMIN-only route, check their custom role permissions
    if (req.user.role === 'TEACHER' && roles.includes('ADMIN')) {
      const hasPermission = await checkTeacherPermission(req);
      if (hasPermission) {
        return next();
      }
    }

    return sendError(res, 'Forbidden', 403);
  };
};

// Strict role-only check without teacher permission escalation.
export const authorizeStrict = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (roles.includes(req.user.role)) {
      return next();
    }

    return sendError(res, 'Forbidden', 403);
  };
};