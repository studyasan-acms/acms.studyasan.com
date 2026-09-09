import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';

const prisma = new PrismaClient();

// Get student's progress for all modules in a subject
export const getStudentProgressBySubject = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId } = req.params;

    const progress = await prisma.studentModuleProgress.findMany({
      where: {
        student_id: parseInt(studentId!),
        subject_id: parseInt(subjectId!),
      },
      orderBy: { module_id: 'asc' },
    });

    // Calculate overall progress
    const totalProgress = progress.reduce((sum, p) => sum + p.progress_percent, 0);
    const avgProgress = progress.length > 0 ? totalProgress / progress.length : 0;
    const completedModules = progress.filter((p) => p.is_completed).length;
    const totalTimeSpent = progress.reduce((sum, p) => sum + p.time_spent_minutes, 0);

    sendSuccess(res, {
      student_id: parseInt(studentId!),
      subject_id: parseInt(subjectId!),
      modules_progress: progress,
      summary: {
        total_modules: progress.length,
        completed_modules: completedModules,
        average_progress: Math.round(avgProgress),
        total_time_spent_minutes: totalTimeSpent,
      },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get student's progress for a specific module
export const getStudentModuleProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, moduleId } = req.params;

    const progress = await prisma.studentModuleProgress.findUnique({
      where: {
        student_id_subject_id_module_id: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
          module_id: parseInt(moduleId!),
        },
      },
    });

    if (!progress) {
      return sendError(res, 'Progress record not found', 404);
    }

    sendSuccess(res, progress);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Update or create student's module progress
export const updateModuleProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, moduleId } = req.params;
    const { progress_percent, time_spent_minutes, is_completed } = req.body;

    console.log('🔍 [UPDATE_MODULE_PROGRESS] Request params:', { studentId, subjectId, moduleId });
    console.log('🔍 [UPDATE_MODULE_PROGRESS] Request body:', { progress_percent, time_spent_minutes, is_completed });

    // Validation
    if (progress_percent !== undefined && (progress_percent < 0 || progress_percent > 100)) {
      console.log('❌ [UPDATE_MODULE_PROGRESS] Validation failed: Invalid progress_percent');
      return sendError(res, 'Progress percent must be between 0 and 100', 400);
    }

    // Check if student is enrolled in the subject
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        student_id_subject_id: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
        },
      },
    });

    console.log('🔍 [UPDATE_MODULE_PROGRESS] Enrollment check:', enrollment ? 'Found' : 'Not found');

    if (!enrollment) {
      console.log('❌ [UPDATE_MODULE_PROGRESS] Student not enrolled in subject');
      return sendError(res, 'Student is not enrolled in this subject', 403);
    }

    const updateData: any = {};
    if (progress_percent !== undefined) updateData.progress_percent = progress_percent;
    if (time_spent_minutes !== undefined) updateData.time_spent_minutes = time_spent_minutes;
    
    // Auto-complete if progress is 100%
    if (progress_percent === 100 || is_completed === true) {
      updateData.is_completed = true;
      updateData.completed_on = new Date();
      updateData.progress_percent = 100;
    } else if (is_completed === false) {
      updateData.is_completed = false;
      updateData.completed_on = null;
    }

    console.log('🔍 [UPDATE_MODULE_PROGRESS] Update data prepared:', updateData);

    // Ensure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      console.log('❌ [UPDATE_MODULE_PROGRESS] No update fields provided');
      return sendError(res, 'No update fields provided', 400);
    }

    debugger;
    const progress = await prisma.studentModuleProgress.upsert({
      where: {
        student_id_subject_id_module_id: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
          module_id: parseInt(moduleId!),
        },
      },
      update: updateData,
      create: {
        student_id: parseInt(studentId!),
        subject_id: parseInt(subjectId!),
        module_id: parseInt(moduleId!),
        progress_percent: progress_percent ?? 0,
        time_spent_minutes: time_spent_minutes ?? 0,
        is_completed: is_completed ?? false,
        completed_on: (progress_percent === 100 || is_completed) ? new Date() : null,
      },
    });

    console.log('✅ [UPDATE_MODULE_PROGRESS] Progress upserted successfully:', progress);
    sendSuccess(res, progress, 'Progress updated successfully');
  } catch (error: any) {
    console.error('❌ [UPDATE_MODULE_PROGRESS] Error:', error);
    sendError(res, error.message, 500);
  }
};

// Increment time spent on a module
export const incrementTimeSpent = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, moduleId } = req.params;
    const { minutes } = req.body;

    if (!minutes || minutes <= 0) {
      return sendError(res, 'Valid minutes value is required', 400);
    }

    const progress = await prisma.studentModuleProgress.upsert({
      where: {
        student_id_subject_id_module_id: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
          module_id: parseInt(moduleId!),
        },
      },
      update: {
        time_spent_minutes: {
          increment: minutes,
        },
      },
      create: {
        student_id: parseInt(studentId!),
        subject_id: parseInt(subjectId!),
        module_id: parseInt(moduleId!),
        time_spent_minutes: minutes,
      },
    });

    sendSuccess(res, progress, 'Time updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Mark module as completed
export const markModuleComplete = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, moduleId } = req.params;

    const progress = await prisma.studentModuleProgress.upsert({
      where: {
        student_id_subject_id_module_id: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
          module_id: parseInt(moduleId!),
        },
      },
      update: {
        progress_percent: 100,
        is_completed: true,
        completed_on: new Date(),
      },
      create: {
        student_id: parseInt(studentId!),
        subject_id: parseInt(subjectId!),
        module_id: parseInt(moduleId!),
        progress_percent: 100,
        is_completed: true,
        completed_on: new Date(),
      },
    });

    sendSuccess(res, progress, 'Module marked as completed');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get progress statistics for all students in a subject
export const getSubjectProgressStats = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const userRole = (req as any).user?.role;
    const isTeacher = userRole === 'TEACHER';

    const allProgress = await prisma.studentModuleProgress.findMany({
      where: {
        subject_id: parseInt(subjectId!),
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    // Group by student
    const studentStats = allProgress.reduce((acc: any, progress) => {
      const studentId = progress.student_id;
      if (!acc[studentId]) {
        acc[studentId] = {
          student_id: studentId,
          student_name: progress.student.user.name,
          ...(!isTeacher ? { student_email: progress.student.user.email } : {}),
          modules: [],
          total_modules: 0,
          completed_modules: 0,
          average_progress: 0,
          total_time_spent: 0,
        };
      }
      const sanitizedProgress = isTeacher && progress.student?.user
        ? {
            ...progress,
            student: {
              ...progress.student,
              user: {
                name: progress.student.user.name,
              },
            },
          }
        : progress;

      acc[studentId].modules.push(sanitizedProgress);
      acc[studentId].total_modules++;
      if (progress.is_completed) acc[studentId].completed_modules++;
      acc[studentId].total_time_spent += progress.time_spent_minutes;
      return acc;
    }, {});

    // Calculate averages
    Object.values(studentStats).forEach((stats: any) => {
      const totalProgress = stats.modules.reduce((sum: number, m: any) => sum + m.progress_percent, 0);
      stats.average_progress = stats.total_modules > 0 
        ? Math.round(totalProgress / stats.total_modules) 
        : 0;
    });

    sendSuccess(res, {
      subject_id: parseInt(subjectId!),
      students: Object.values(studentStats),
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Reset module progress
export const resetModuleProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, moduleId } = req.params;

    await prisma.studentModuleProgress.update({
      where: {
        student_id_subject_id_module_id: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
          module_id: parseInt(moduleId!),
        },
      },
      data: {
        progress_percent: 0,
        is_completed: false,
        time_spent_minutes: 0,
        completed_on: null,
      },
    });

    sendSuccess(res, null, 'Module progress reset successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get current user's progress (for authenticated student)
export const getMyProgress = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const userId = (req as any).user?.id; // From auth middleware

    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    });

    if (!student) {
      return sendError(res, 'Student profile not found', 404);
    }

    const progress = await prisma.studentModuleProgress.findMany({
      where: {
        student_id: student.id,
        subject_id: parseInt(subjectId!),
      },
      orderBy: { module_id: 'asc' },
    });

    const totalProgress = progress.reduce((sum, p) => sum + p.progress_percent, 0);
    const avgProgress = progress.length > 0 ? totalProgress / progress.length : 0;
    const completedModules = progress.filter((p) => p.is_completed).length;
    const totalTimeSpent = progress.reduce((sum, p) => sum + p.time_spent_minutes, 0);

    sendSuccess(res, {
      subject_id: parseInt(subjectId!),
      modules_progress: progress,
      summary: {
        total_modules: progress.length,
        completed_modules: completedModules,
        average_progress: Math.round(avgProgress),
        total_time_spent_minutes: totalTimeSpent,
      },
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Update current user's progress
export const updateMyProgress = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId } = req.params;
    const { progress_percent, time_spent_minutes, is_completed } = req.body;
    const userId = (req as any).user?.id;

    console.log('🔍 [UPDATE_MY_PROGRESS] User ID:', userId);
    console.log('🔍 [UPDATE_MY_PROGRESS] Params:', { subjectId, moduleId });
    console.log('🔍 [UPDATE_MY_PROGRESS] Body:', { progress_percent, time_spent_minutes, is_completed });

    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    });

    console.log('🔍 [UPDATE_MY_PROGRESS] Student:', student ? `Found (id: ${student.id})` : 'Not found');

    if (!student) {
      console.log('❌ [UPDATE_MY_PROGRESS] Student profile not found');
      return sendError(res, 'Student profile not found', 404);
    }

    // Validation
    if (progress_percent !== undefined && (progress_percent < 0 || progress_percent > 100)) {
      console.log('❌ [UPDATE_MY_PROGRESS] Invalid progress_percent');
      return sendError(res, 'Progress percent must be between 0 and 100', 400);
    }

    // Check if student is enrolled in the subject
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        student_id_subject_id: {
          student_id: student.id,
          subject_id: parseInt(subjectId!),
        },
      },
    });

    console.log('🔍 [UPDATE_MY_PROGRESS] Enrollment:', enrollment ? 'Found' : 'Not found');

    if (!enrollment) {
      console.log('❌ [UPDATE_MY_PROGRESS] Student not enrolled');
      return sendError(res, 'You are not enrolled in this subject', 403);
    }

    const updateData: any = {};
    if (progress_percent !== undefined) updateData.progress_percent = progress_percent;
    if (time_spent_minutes !== undefined) updateData.time_spent_minutes = time_spent_minutes;
    
    if (progress_percent === 100 || is_completed === true) {
      updateData.is_completed = true;
      updateData.completed_on = new Date();
      updateData.progress_percent = 100;
    } else if (is_completed === false) {
      updateData.is_completed = false;
      updateData.completed_on = null;
    }

    console.log('🔍 [UPDATE_MY_PROGRESS] Update data:', updateData);

    // Ensure we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      console.log('❌ [UPDATE_MY_PROGRESS] No update fields');
      return sendError(res, 'No update fields provided', 400);
    }

    debugger;
    const progress = await prisma.studentModuleProgress.upsert({
      where: {
        student_id_subject_id_module_id: {
          student_id: student.id,
          subject_id: parseInt(subjectId!),
          module_id: parseInt(moduleId!),
        },
      },
      update: updateData,
      create: {
        student_id: student.id,
        subject_id: parseInt(subjectId!),
        module_id: parseInt(moduleId!),
        progress_percent: progress_percent ?? 0,
        time_spent_minutes: time_spent_minutes ?? 0,
        is_completed: is_completed ?? false,
        completed_on: (progress_percent === 100 || is_completed) ? new Date() : null,
      },
    });

    console.log('✅ [UPDATE_MY_PROGRESS] Success:', progress);
    sendSuccess(res, progress, 'Progress updated successfully');
  } catch (error: any) {
    console.error('❌ [UPDATE_MY_PROGRESS] Error:', error);
    sendError(res, error.message, 500);
  }
};

// Bulk update progress for multiple modules
export const bulkUpdateProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId } = req.params;
    const { modules } = req.body; // Array of { module_id, progress_percent, time_spent_minutes }

    if (!Array.isArray(modules)) {
      return sendError(res, 'modules must be an array', 400);
    }

    // Check if student is enrolled
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        student_id_subject_id: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
        },
      },
    });

    if (!enrollment) {
      return sendError(res, 'Student is not enrolled in this subject', 403);
    }

    const updates = [];
    for (const module of modules) {
      const { module_id, progress_percent, time_spent_minutes } = module;

      const updateData: any = {};
      if (progress_percent !== undefined) updateData.progress_percent = progress_percent;
      if (time_spent_minutes !== undefined) updateData.time_spent_minutes = time_spent_minutes;
      
      if (progress_percent === 100) {
        updateData.is_completed = true;
        updateData.completed_on = new Date();
        updateData.progress_percent = 100;
      }

      const update = prisma.studentModuleProgress.upsert({
        where: {
          student_id_subject_id_module_id: {
            student_id: parseInt(studentId!),
            subject_id: parseInt(subjectId!),
            module_id: module_id,
          },
        },
        update: updateData,
        create: {
          student_id: parseInt(studentId!),
          subject_id: parseInt(subjectId!),
          module_id: module_id,
          progress_percent: progress_percent ?? 0,
          time_spent_minutes: time_spent_minutes ?? 0,
          is_completed: progress_percent === 100,
          completed_on: progress_percent === 100 ? new Date() : null,
        },
      });

      updates.push(update);
    }

    const results = await Promise.all(updates);

    sendSuccess(res, results, 'Progress updated for all modules');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};