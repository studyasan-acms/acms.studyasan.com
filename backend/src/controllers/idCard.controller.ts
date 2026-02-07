import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../services/email.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

export const sendIDCardEmail = async (req: Request, res: Response) => {
    try {
        const { userId, userType, imageData } = req.body;

        if (!userId || !userType || !imageData) {
            return sendError(res, 'Missing required fields: userId, userType, imageData', 400);
        }

        let email = '';
        let name = '';

        if (userType === 'STUDENT') {
            const student = await prisma.student.findUnique({
                where: { id: parseInt(userId) },
                include: { user: true },
            });
            if (!student || !student.user) {
                return sendError(res, 'Student not found', 404);
            }
            email = student.user.email;
            name = student.user.name;
        } else if (userType === 'TEACHER') {
            const teacher = await prisma.teacher.findUnique({
                where: { id: parseInt(userId) },
                include: { user: true },
            });
            if (!teacher || !teacher.user) {
                return sendError(res, 'Teacher not found', 404);
            }
            email = teacher.user.email;
            name = teacher.user.name;
        } else {
            return sendError(res, 'Invalid userType. Must be STUDENT or TEACHER', 400);
        }

        // Convert base64 to buffer
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Hello ${name},</h2>
        <p>Please find attached your StudyAsan Identity Card.</p>
        <p>Best regards,<br>StudyAsan Team</p>
      </div>
    `;

        const success = await sendEmail({
            to: email,
            subject: 'Your StudyAsan Identity Card',
            html: emailHtml,
            attachments: [
                {
                    filename: `id-card-${name.replace(/\s+/g, '-').toLowerCase()}.png`,
                    content: buffer,
                    contentType: 'image/png',
                },
            ],
        });

        if (success) {
            return sendSuccess(res, null, 'ID Card sent successfully');
        } else {
            return sendError(res, 'Failed to send email', 500);
        }
    } catch (error: any) {
        console.error('Error sending ID card:', error);
        return sendError(res, error.message || 'Internal server error', 500);
    }
};
