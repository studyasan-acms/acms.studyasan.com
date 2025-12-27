import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, 'User already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role || 'STUDENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    sendSuccess(res, { user, token }, 'User registered successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return sendError(res, 'Email/Phone and password are required', 400);
    }

    // Check if the input is an email or phone number
    const isEmail = email && email.includes('@');

    let user;
    if (isEmail) {
      // Search by email
      user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return sendError(res, 'No account found with this email address', 404);
      }
    } else {
      // Search by phone number
      user = await prisma.user.findFirst({
        where: { phone: email },
      });

      if (!user) {
        return sendError(res, 'No account found with this phone number', 404);
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return sendError(res, 'Incorrect password', 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;

    sendSuccess(res, { user: userWithoutPassword, token }, 'Login successful');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};