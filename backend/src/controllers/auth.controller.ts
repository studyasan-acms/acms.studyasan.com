import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendSuccess, sendError } from '../utils/response.js';
import { validatePassword } from '../utils/passwordValidator.js';
import { sendOTPEmail } from '../services/email.service.js';

const prisma = new PrismaClient();

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Request OTP for registration
export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return sendError(res, 'All fields are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendError(res, 'Invalid email format', 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, 'An account with this email already exists', 400);
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return sendError(res, passwordValidation.errors.join('. '), 400);
    }

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const hashedPassword = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email
    await prisma.otpVerification.deleteMany({
      where: { email },
    });

    // Create new OTP verification record
    await prisma.otpVerification.create({
      data: {
        email,
        name,
        phone,
        password: hashedPassword,
        otp_hash: hashedOTP,
        expires_at: expiresAt,
      },
    });

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, name);

    if (!emailSent) {
      return sendError(res, 'Failed to send verification email. Please try again.', 500);
    }

    sendSuccess(res, { email }, 'OTP sent successfully. Please check your email.', 200);
  } catch (error: any) {
    console.error('Request OTP error:', error);
    sendError(res, error.message, 500);
  }
};

// Verify OTP and complete registration
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return sendError(res, 'Email and OTP are required', 400);
    }

    // Find the OTP verification record
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        email,
        verified: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!otpRecord) {
      return sendError(res, 'No pending verification found. Please request a new OTP.', 400);
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expires_at) {
      await prisma.otpVerification.delete({
        where: { id: otpRecord.id },
      });
      return sendError(res, 'OTP has expired. Please request a new one.', 400);
    }

    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, otpRecord.otp_hash);
    if (!isValidOTP) {
      return sendError(res, 'Invalid OTP. Please try again.', 400);
    }

    // Check again if user was created in the meantime
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      await prisma.otpVerification.delete({
        where: { id: otpRecord.id },
      });
      return sendError(res, 'An account with this email already exists', 400);
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        name: otpRecord.name,
        email: otpRecord.email,
        phone: otpRecord.phone,
        password: otpRecord.password,
        role: 'STUDENT',
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    // Create student record
    await prisma.student.create({
      data: {
        user_id: user.id,
      },
    });

    // Mark OTP as verified and delete it
    await prisma.otpVerification.delete({
      where: { id: otpRecord.id },
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    sendSuccess(res, { user, token }, 'Registration successful!', 201);
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    sendError(res, error.message, 500);
  }
};

// Resend OTP
export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, 'Email is required', 400);
    }

    // Find existing OTP record
    const existingRecord = await prisma.otpVerification.findFirst({
      where: {
        email,
        verified: false,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!existingRecord) {
      return sendError(res, 'No pending verification found. Please start registration again.', 400);
    }

    // Check cooldown (30 seconds between requests)
    const timeSinceLastRequest = Date.now() - existingRecord.created_at.getTime();
    if (timeSinceLastRequest < 30000) {
      const remainingSeconds = Math.ceil((30000 - timeSinceLastRequest) / 1000);
      return sendError(res, `Please wait ${remainingSeconds} seconds before requesting a new OTP`, 429);
    }

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update the OTP record
    await prisma.otpVerification.update({
      where: { id: existingRecord.id },
      data: {
        otp_hash: hashedOTP,
        expires_at: expiresAt,
        created_at: new Date(),
      },
    });

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, existingRecord.name);

    if (!emailSent) {
      return sendError(res, 'Failed to send verification email. Please try again.', 500);
    }

    sendSuccess(res, { email }, 'OTP resent successfully. Please check your email.', 200);
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    sendError(res, error.message, 500);
  }
};

// Validate password strength (for frontend)
export const checkPasswordStrength = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return sendError(res, 'Password is required', 400);
    }

    const validation = validatePassword(password);
    sendSuccess(res, validation, 'Password validation result');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Legacy register function (now requires OTP verification)
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, 'User already exists', 400);
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return sendError(res, passwordValidation.errors.join('. '), 400);
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

    // Create student record if role is STUDENT
    if (user.role === 'STUDENT') {
      await prisma.student.create({
        data: {
          user_id: user.id,
        },
      });
    }

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

/**
 * Verify JWT token validity
 * Used by frontend on app startup to validate stored token before rendering dashboard
 * Prevents flickering caused by rendering with expired tokens
 */
export const verifyToken = async (req: AuthRequest, res: Response) => {
  try {
    // If we reach here, middleware has already validated the token
    if (!req.user) {
      return sendError(res, 'Invalid token', 401);
    }

    // Fetch fresh user data from database to ensure role is current
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, { user }, 'Token verified successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};