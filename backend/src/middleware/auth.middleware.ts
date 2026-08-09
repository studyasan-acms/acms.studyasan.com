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

    console.log('🔍 [AUTH] User role:', req.user.role, 'Required roles:', roles);

    // If user's role is directly in the allowed roles list, allow access
    if (roles.includes(req.user.role)) {
      console.log('✅ [AUTH] Role match for:', req.user.role);
      return next();
    }

    // If user is TEACHER but TEACHER is NOT in allowed roles,
    // check if they have elevated permissions for an ADMIN-only route
    if (req.user.role === 'TEACHER' && roles.includes('ADMIN')) {
      console.log('🔍 [AUTH] Teacher escalating to ADMIN route, checking permissions...');
      const hasPermission = await checkTeacherPermission(req);
      if (hasPermission) {
        console.log('✅ [AUTH] Teacher has elevated permission');
        return next();
      }
      console.log('❌ [AUTH] Teacher lacks elevated permission');
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