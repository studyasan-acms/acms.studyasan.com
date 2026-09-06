import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { uploadToS3, deleteFromS3, extractS3KeyFromUrl } from '../utils/s3.js';

const prisma = new PrismaClient();

// ==================== ADMIN ROUTES ====================

// Get all jobs with filters (Admin & Students)
export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { search, type, status } = req.query;
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (status) where.status = status;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          type: true,
          description: true,
          requirements: true,
          skills: true,
          salary_range: true,
          duration: true,
          application_deadline: true,
          status: true,
          created_at: true,
          updated_at: true,
          _count: { select: { applications: true } },
        },
      }),
      prisma.job.count({ where }),
    ]);

    const response = createPaginatedResponse(jobs, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    console.error('Get all jobs error:', error);
    sendError(res, error.message, 500);
  }
};

// Get single job details
export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id: parseInt(id as string) },
      include: {
        _count: { select: { applications: true } },
      },
    });

    if (!job) {
      return sendError(res, 'Job not found', 404);
    }

    sendSuccess(res, job);
  } catch (error: any) {
    console.error('Get job by ID error:', error);
    sendError(res, error.message, 500);
  }
};

// Create new job/internship (Admin only)
export const createJob = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      company,
      location,
      type,
      description,
      requirements,
      skills,
      salary_range,
      duration,
      application_deadline,
    } = req.body;

    if (!title || !company || !type || !description) {
      return sendError(res, 'Title, company, type, and description are required', 400);
    }

    const job = await prisma.job.create({
      data: {
        title,
        company,
        location,
        type,
        description,
        requirements,
        skills: skills || [],
        salary_range,
        duration,
        application_deadline: application_deadline ? new Date(application_deadline) : null,
        created_by: req.user!.id,
      },
    });

    sendSuccess(res, job, 'Job posted successfully', 201);
  } catch (error: any) {
    console.error('Create job error:', error);
    sendError(res, error.message, 500);
  }
};

// Update job/internship (Admin only)
export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      company,
      location,
      type,
      description,
      requirements,
      skills,
      salary_range,
      duration,
      application_deadline,
      status,
    } = req.body;

    const job = await prisma.job.update({
      where: { id: parseInt(id as string) },
      data: {
        title,
        company,
        location,
        type,
        description,
        requirements,
        skills,
        salary_range,
        duration,
        application_deadline: application_deadline ? new Date(application_deadline) : null,
        status,
      },
    });

    sendSuccess(res, job, 'Job updated successfully');
  } catch (error: any) {
    console.error('Update job error:', error);
    sendError(res, error.message, 500);
  }
};

// Delete job/internship (Admin only)
export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.job.delete({
      where: { id: parseInt(id as string) },
    });

    sendSuccess(res, null, 'Job deleted successfully');
  } catch (error: any) {
    console.error('Delete job error:', error);
    sendError(res, error.message, 500);
  }
};

// ==================== STUDENT ROUTES ====================

// Apply for a job (Student or Teacher)
export const applyForJob = async (req: AuthRequest, res: Response) => {
  try {
    const { job_id, cover_letter } = req.body;
    const file = req.file;
    const userRole = req.user!.role;

    console.log('Apply for job request:', { job_id, has_cover_letter: !!cover_letter, has_file: !!file, role: userRole });

    if (!job_id || !cover_letter) {
      return sendError(res, 'Job ID and cover letter are required', 400);
    }

    if (!file) {
      return sendError(res, 'CV file is required', 400);
    }

    // Check if job exists and is open
    const job = await prisma.job.findUnique({
      where: { id: parseInt(job_id as string) },
    });

    if (!job) {
      return sendError(res, 'Job not found', 404);
    }

    if (job.status !== 'OPEN') {
      return sendError(res, 'This job is no longer accepting applications', 400);
    }

    // Check if deadline has passed
    if (job.application_deadline && new Date() > job.application_deadline) {
      return sendError(res, 'Application deadline has passed', 400);
    }

    let applicationData: any;
    let uploadPath: string;

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: req.user!.id },
      });
      if (!student) return sendError(res, 'Student profile not found', 404);

      // Check if already applied
      const existing = await prisma.jobApplication.findUnique({
        where: { job_id_student_id: { job_id: parseInt(job_id as string), student_id: student.id } },
      });
      if (existing) return sendError(res, 'You have already applied for this job', 400);

      uploadPath = `job-applications/students/${student.id}`;
      const uploadResult = await uploadToS3(file, uploadPath);
      applicationData = { job_id: parseInt(job_id as string), student_id: student.id, cv_url: uploadResult.url, cover_letter };
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: req.user!.id },
      });
      if (!teacher) return sendError(res, 'Teacher profile not found', 404);

      // Check if already applied
      const existing = await prisma.jobApplication.findUnique({
        where: { job_id_teacher_id: { job_id: parseInt(job_id as string), teacher_id: teacher.id } },
      });
      if (existing) return sendError(res, 'You have already applied for this job', 400);

      uploadPath = `job-applications/teachers/${teacher.id}`;
      const uploadResult = await uploadToS3(file, uploadPath);
      applicationData = { job_id: parseInt(job_id as string), teacher_id: teacher.id, cv_url: uploadResult.url, cover_letter };
    } else {
      return sendError(res, 'Only students and teachers can apply for jobs', 403);
    }

    console.log('Uploading CV to S3...');

    // Create application
    const application = await prisma.jobApplication.create({
      data: applicationData,
      include: {
        job: true,
        student: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, profile_url: true } },
          },
        },
        teacher: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true, profile_url: true } },
          },
        },
      },
    });

    sendSuccess(res, application, 'Application submitted successfully', 201);
  } catch (error: any) {
    console.error('Apply for job error:', error);
    sendError(res, error.message, 500);
  }
};

// Get my applications (Student or Teacher)
export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { status } = req.query;
    const userRole = req.user!.role;
    let where: any = {};

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: req.user!.id },
      });
      if (!student) return sendError(res, 'Student profile not found', 404);
      where.student_id = student.id;
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: req.user!.id },
      });
      if (!teacher) return sendError(res, 'Teacher profile not found', 404);
      where.teacher_id = teacher.id;
    } else {
      return sendError(res, 'Unauthorized', 403);
    }

    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { applied_at: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
              type: true,
              status: true,
            },
          },
        },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    const response = createPaginatedResponse(applications, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    console.error('Get my applications error:', error);
    sendError(res, error.message, 500);
  }
};

// Withdraw application (Student or Teacher)
export const withdrawApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;

    let applicantId: number;
    let fieldCheck: string;

    if (userRole === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id: req.user!.id },
      });
      if (!student) return sendError(res, 'Student profile not found', 404);
      applicantId = student.id;
      fieldCheck = 'student_id';
    } else if (userRole === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id: req.user!.id },
      });
      if (!teacher) return sendError(res, 'Teacher profile not found', 404);
      applicantId = teacher.id;
      fieldCheck = 'teacher_id';
    } else {
      return sendError(res, 'Unauthorized', 403);
    }

    // Check if application exists and belongs to the applicant
    const application = await prisma.jobApplication.findUnique({
      where: { id: parseInt(id as string) },
    });

    if (!application) {
      return sendError(res, 'Application not found', 404);
    }

    // Verify ownership
    const owns = fieldCheck === 'student_id'
      ? application.student_id === applicantId
      : application.teacher_id === applicantId;

    if (!owns) {
      return sendError(res, 'Unauthorized', 403);
    }

    // Delete CV from S3
    if (application.cv_url) {
      const key = extractS3KeyFromUrl(application.cv_url);
      if (key) {
        await deleteFromS3(key);
      }
    }

    // Delete application
    await prisma.jobApplication.delete({
      where: { id: parseInt(id as string) },
    });

    sendSuccess(res, null, 'Application withdrawn successfully');
  } catch (error: any) {
    console.error('Withdraw application error:', error);
    sendError(res, error.message, 500);
  }
};

// ==================== ADMIN: APPLICATION MANAGEMENT ====================

// Get all applications for a job (Admin only)
export const getJobApplications = async (req: Request, res: Response) => {
  try {
    const { job_id } = req.params;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { status } = req.query;
    const where: any = { job_id: parseInt(job_id as string) };

    if (status) where.status = status;

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { applied_at: 'desc' },
        include: {
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  profile_url: true,
                },
              },
              class: true,
              board: true,
            },
          },
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  profile_url: true,
                },
              },
            },
          },
        },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    const response = createPaginatedResponse(applications, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    console.error('Get job applications error:', error);
    sendError(res, error.message, 500);
  }
};

// Get all applications (Admin only)
export const getAllApplications = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const { status, job_id } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (job_id) where.job_id = parseInt(job_id as string);

    const [applications, total] = await Promise.all([
      prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { applied_at: 'desc' },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              type: true,
            },
          },
          student: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  profile_url: true,
                },
              },
              class: true,
              board: true,
            },
          },
          teacher: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  profile_url: true,
                },
              },
            },
          },
        },
      }),
      prisma.jobApplication.count({ where }),
    ]);

    const response = createPaginatedResponse(applications, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    console.error('Get all applications error:', error);
    sendError(res, error.message, 500);
  }
};

// Review application (Admin only)
export const reviewApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!status || !['REVIEWED', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return sendError(res, 'Valid status (REVIEWED, ACCEPTED, or REJECTED) is required', 400);
    }

    const application = await prisma.jobApplication.update({
      where: { id: parseInt(id as string) },
      data: {
        status,
        feedback,
        reviewed_by: req.user!.id,
        reviewed_at: new Date(),
      },
      include: {
        job: true,
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    sendSuccess(res, application, 'Application reviewed successfully');
  } catch (error: any) {
    console.error('Review application error:', error);
    sendError(res, error.message, 500);
  }
};

// Get single application details (Admin only)
export const getApplicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const application = await prisma.jobApplication.findUnique({
      where: { id: parseInt(id as string) },
      include: {
        job: true,
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profile_url: true,
              },
            },
            class: true,
            board: true,
          },
        },
        teacher: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                profile_url: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return sendError(res, 'Application not found', 404);
    }

    sendSuccess(res, application);
  } catch (error: any) {
    console.error('Get application by ID error:', error);
    sendError(res, error.message, 500);
  }
};
