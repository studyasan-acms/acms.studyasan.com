import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { sendSuccess, sendError } from '../utils/response.js';
import { uploadToS3, deleteFromS3 } from '../utils/s3.js';

const prisma = new PrismaClient();

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'User ID not found', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profile_url: true,
        role: true,
        created_at: true,
        updated_at: true,
        student: {
          select: {
            id: true,
            class_id: true,
            board_id: true,
            date_of_birth: true,
            gender: true,
            school: true,
            blood_group: true,
            address: {
              include: {
                country: true,
                state: true,
                city: true,
              },
            },
            class: { select: { id: true, name: true } },
            board: { select: { id: true, name: true } },
          },
        },
        teacher: {
          select: {
            id: true,
            salary: true,
            qualification: true,
            gender: true,
            experience: true,
            address: {
              include: {
                country: true,
                state: true,
                city: true,
              },
            },
            salary_currency: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    sendSuccess(res, user);
  } catch (error: any) {
    console.error('Get Profile Error:', error);
    sendError(res, error.message, 500);
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    let { name, email, phone, password } = req.body;
    if (email) email = email.toLowerCase();
    const profileImage = req.file;

    if (!userId) {
      return sendError(res, 'User ID not found', 401);
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { profile_url: true },
    });

    if (!currentUser) {
      return sendError(res, 'User not found', 404);
    }

    // Prepare update data
    const updateData: any = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;

    // Handle password update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Handle profile image upload
    if (profileImage) {
      // Delete old profile image if exists
      if (currentUser.profile_url) {
        try {
          // Extract key from URL
          const urlParts = currentUser.profile_url.split('/');
          const key = urlParts.slice(-2).join('/'); // folder/filename
          await deleteFromS3(key);
        } catch (deleteError) {
          console.error('Error deleting old profile image:', deleteError);
        }
      }

      // Upload new profile image
      const uploadResult = await uploadToS3(profileImage, 'profiles');
      updateData.profile_url = uploadResult.url;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profile_url: true,
        role: true,
        updated_at: true,
      },
    });

    sendSuccess(res, updatedUser, 'Profile updated successfully');
  } catch (error: any) {
    console.error('Update Profile Error:', error);
    sendError(res, error.message, 500);
  }
};

// Update student-specific details
export const updateStudentDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      date_of_birth,
      gender,
      school,
      blood_group,
      address,
    } = req.body;

    if (!userId) {
      return sendError(res, 'User ID not found', 401);
    }

    // Check if user is a student
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });

    if (!user || !user.student) {
      return sendError(res, 'Student profile not found', 404);
    }

    // Update student details
    const updateData: any = {};
    if (date_of_birth) updateData.date_of_birth = new Date(date_of_birth);
    if (gender) updateData.gender = gender;
    if (school) updateData.school = school;
    if (blood_group) updateData.blood_group = blood_group;

    const updatedStudent = await prisma.student.update({
      where: { id: user.student.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile_url: true,
            role: true,
          },
        },
        class: { select: { id: true, name: true } },
        board: { select: { id: true, name: true } },
        address: {
          include: {
            country: true,
            state: true,
            city: true,
          },
        },
      },
    });

    // Handle address update separately if provided
    if (address) {
      // Implementation would depend on your address structure
      // You might want to update or create address record
    }

    sendSuccess(res, updatedStudent, 'Student details updated successfully');
  } catch (error: any) {
    console.error('Update Student Details Error:', error);
    sendError(res, error.message, 500);
  }
};

// Update teacher-specific details
export const updateTeacherDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      salary,
      salary_currency_id,
      qualification,
      gender,
      experience,
      address,
    } = req.body;

    if (!userId) {
      return sendError(res, 'User ID not found', 401);
    }

    // Check if user is a teacher
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true },
    });

    if (!user || !user.teacher) {
      return sendError(res, 'Teacher profile not found', 404);
    }

    // Update teacher details
    const updateData: any = {};
    if (salary !== undefined) updateData.salary = salary;
    if (salary_currency_id) updateData.salary_currency_id = salary_currency_id;
    if (qualification) updateData.qualification = qualification;
    if (gender) updateData.gender = gender;
    if (experience) updateData.experience = experience;

    const updatedTeacher = await prisma.teacher.update({
      where: { id: user.teacher.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profile_url: true,
            role: true,
          },
        },
        salary_currency: true,
        address: {
          include: {
            country: true,
            state: true,
            city: true,
          },
        },
      },
    });

    // Handle address update separately if provided
    if (address) {
      // Implementation would depend on your address structure
    }

    sendSuccess(res, updatedTeacher, 'Teacher details updated successfully');
  } catch (error: any) {
    console.error('Update Teacher Details Error:', error);
    sendError(res, error.message, 500);
  }
};