import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination.js';
import { uploadToS3 } from '../utils/s3.js';
import { sendNotificationToMultipleUsers } from '../services/notification.service.js';

const prisma = new PrismaClient();

// Create homework - Teachers only for their assigned subjects
export const createHomework = async (req: Request, res: Response) => {
  try {
    const { subject_id, title, description, due_date, assigned_student_ids } = req.body;
    const user = (req as any).user;
    const teacher_user_id = user.id;
    const user_role = user.role;

    // For teachers, check if teacher record exists and is assigned to subject
    let teacher = null;
    if (user_role === 'TEACHER') {
      teacher = await prisma.teacher.findUnique({
        where: { user_id: teacher_user_id }
      });

      if (!teacher) {
        // Create teacher record if it doesn't exist
        teacher = await prisma.teacher.create({
          data: {
            user_id: teacher_user_id,
            salary: 0,
            salary_currency_id: 1, // Default currency
            qualification: 'Not specified',
            gender: null,
            experience: '0',
          }
        });
      }

      // Check if teacher is assigned to this subject
      const teacherSubject = await prisma.teacherSubjectJunction.findFirst({
        where: {
          teacher_id: teacher.id,
          subject_id: parseInt(subject_id)
        }
      });

      if (!teacherSubject) {
        return sendError(res, 'You are not assigned to this subject', 403);
      }
    } else if (user_role === 'ADMIN') {
      // For admins, try to find any teacher assigned to this subject
      const teacherSubject = await prisma.teacherSubjectJunction.findFirst({
        where: {
          subject_id: parseInt(subject_id)
        },
        include: {
          teacher: true
        }
      });

      if (teacherSubject) {
        teacher = teacherSubject.teacher;
      } else {
        // If no teacher is assigned, create a dummy teacher record for admin
        // This allows admins to create homework even when no teacher is assigned
        const dummyTeacher = await prisma.teacher.create({
          data: {
            user_id: teacher_user_id, // Use admin's user_id for now
            salary: 0,
            salary_currency_id: 1,
            qualification: 'Admin',
            gender: null,
            experience: '0',
          }
        });
        teacher = dummyTeacher;
      }
    }

    if (!teacher) {
      return sendError(res, 'Teacher not found', 404);
    }

    // Handle document upload if provided
    let document_url = null;
    let document_type = null;

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'homework-documents');
      document_url = uploadResult.url;
      document_type = req.file.mimetype;
    }

    // Get all enrolled students for the subject by default
    const enrollments = await prisma.enrollment.findMany({
      where: { subject_id: parseInt(subject_id) },
      select: { student_id: true }
    });

    let assignedStudents = enrollments.map(e => e.student_id);

    // If specific students are provided, filter the list
    if (assigned_student_ids && Array.isArray(assigned_student_ids)) {
      assignedStudents = assignedStudents.filter(id => assigned_student_ids.includes(id));
    }

    // Create homework
    const homework = await prisma.homework.create({
      data: {
        subject_id: parseInt(subject_id),
        teacher_id: teacher.id,
        title,
        description,
        document_url,
        document_type,
        due_date: due_date ? new Date(due_date) : null,
        assignments: {
          create: assignedStudents.map(student_id => ({
            student_id
          }))
        }
      },
      include: {
        subject: true,
        teacher: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        assignments: {
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        },
        _count: {
          select: { assignments: true, responses: true }
        }
      }
    });

    // Send notifications to all assigned students
    try {
      const studentUserIds = homework.assignments.map(a => a.student.user.id);
      await sendNotificationToMultipleUsers(studentUserIds, {
        type: 'INFO',
        title: `New Homework: ${homework.title}`,
        description: `${homework.teacher.user.name} has assigned new homework in ${homework.subject.name}${homework.due_date ? ` (Due: ${new Date(homework.due_date).toLocaleDateString()})` : ''}`,
      });
      console.log(`✓ Notifications sent to ${studentUserIds.length} students for homework: ${homework.title}`);
    } catch (notifError) {
      console.error('Error sending homework creation notifications:', notifError);
      // Don't fail the request if notifications fail
    }

    sendSuccess(res, homework, 'Homework created successfully');
  } catch (error: any) {
    console.error('Create homework error:', error);
    sendError(res, error.message, 500);
  }
};

// Get homework for a subject - Teachers and students
export const getHomeworkBySubject = async (req: Request, res: Response) => {
  try {
    const { subject_id } = req.params;
    const user_id = (req as any).user.id;
    const user_role = (req as any).user.role;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );
    if (!subject_id) {
      return sendError(res, 'Subject ID is required', 400);
    }
    let where: any = { subject_id: parseInt(subject_id) };

    // If student, only show assigned homework
    if (user_role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id }
      });
      if (student) {
        where.assignments = {
          some: {
            student_id: student.id
          }
        };
      }
    }
    // If teacher, only show homework they created
    else if (user_role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id }
      });
      if (teacher) {
        where.teacher_id = teacher.id;
      }
    }

    const [homework, total] = await Promise.all([
      prisma.homework.findMany({
        where,
        skip,
        take: limit,
        include: {
          subject: true,
          teacher: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          assignments: {
            include: {
              student: {
                include: {
                  user: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          _count: {
            select: { assignments: true, responses: true }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.homework.count({ where })
    ]);

    const response = createPaginatedResponse(homework, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get homework for a teacher
export const getTeacherHomework = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user.id;
    const user_role = (req as any).user.role;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    let where: any = {};

    if (user_role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id }
      });

      if (!teacher) {
        return sendError(res, 'Teacher not found', 404);
      }

      where.teacher_id = teacher.id;
    }
    // For admin, no where clause to get all homework

    const [homework, total] = await Promise.all([
      prisma.homework.findMany({
        where,
        skip,
        take: limit,
        include: {
          subject: true,
          teacher: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          },
          assignments: {
            include: {
              student: {
                include: {
                  user: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          _count: {
            select: { assignments: true, responses: true }
          }
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.homework.count({
        where
      })
    ]);

    const response = createPaginatedResponse(homework, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get homework for a student
export const getStudentHomework = async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user.id;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    const student = await prisma.student.findUnique({
      where: { user_id }
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    const [assignments, total] = await Promise.all([
      prisma.homeworkAssignment.findMany({
        where: { student_id: student.id },
        skip,
        take: limit,
        include: {
          homework: {
            include: {
              subject: true,
              teacher: {
                include: {
                  user: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          student: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: {
          homework: {
            created_at: 'desc'
          }
        }
      }),
      prisma.homeworkAssignment.count({
        where: { student_id: student.id }
      })
    ]);

    // Get responses for each assignment
    const homeworkWithResponses = await Promise.all(
      assignments.map(async (assignment) => {
        const response = await prisma.homeworkResponse.findUnique({
          where: {
            homework_id_student_id: {
              homework_id: assignment.homework_id,
              student_id: student.id
            }
          }
        });

        return {
          ...assignment,
          response
        };
      })
    );

    const response = createPaginatedResponse(homeworkWithResponses, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Submit homework response
export const submitHomeworkResponse = async (req: Request, res: Response) => {
  try {
    const { homework_id } = req.params;
    if (!homework_id) {
      return sendError(res, 'Homework ID is required', 400);
    }
    const parsedHomeworkId = parseInt(homework_id);
    if (isNaN(parsedHomeworkId)) {
      return sendError(res, 'Invalid homework ID', 400);
    }
    const { response_text } = req.body;
    const user_id = (req as any).user.id;

    const student = await prisma.student.findUnique({
      where: { user_id }
    });

    if (!student) {
      return sendError(res, 'Student not found', 404);
    }

    // Check if student is assigned to this homework
    const assignment = await prisma.homeworkAssignment.findUnique({
      where: {
        homework_id_student_id: {
          homework_id: parsedHomeworkId,
          student_id: student.id
        }
      }
    });

    if (!assignment) {
      return sendError(res, 'You are not assigned to this homework', 403);
    }

    // Handle media upload if provided
    let response_media_url = null;
    let response_media_type = null;

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToS3(file, 'homework-responses')
      );
      const uploadResults = await Promise.all(uploadPromises);
      const mediaUrls = uploadResults.map(result => result.url);
      response_media_url = JSON.stringify(mediaUrls);
      response_media_type = req.files.map(f => f.mimetype).join(',');
    }

    // Create or update response
    const response = await prisma.homeworkResponse.upsert({
      where: {
        homework_id_student_id: {
          homework_id: parsedHomeworkId,
          student_id: student.id
        }
      },
      update: {
        response_text,
        response_media_url,
        response_media_type,
        submitted_at: new Date()
      },
      create: {
        homework_id: parsedHomeworkId,
        student_id: student.id,
        response_text,
        response_media_url,
        response_media_type
      },
      include: {
        homework: {
          include: {
            subject: true,
            teacher: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        student: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Send notification to the teacher
    try {
      const teacherUserId = response.homework.teacher.user.id;
      await sendNotificationToMultipleUsers([teacherUserId], {
        type: 'INFO',
        title: `Homework Submitted: ${response.homework.title}`,
        description: `${response.student.user.name} has submitted their homework for ${response.homework.subject.name}`,
      });
      console.log(`✓ Notification sent to teacher for homework submission: ${response.homework.title}`);
    } catch (notifError) {
      console.error('Error sending homework submission notification:', notifError);
      // Don't fail the request if notifications fail
    }

    sendSuccess(res, response, 'Homework response submitted successfully');
  } catch (error: any) {
    console.error('Submit homework response error:', error);
    sendError(res, error.message, 500);
  }
};

// Get homework responses for a teacher
export const getHomeworkResponses = async (req: Request, res: Response) => {
  try {
    const { homework_id } = req.params;
    const user = (req as any).user;
    const user_id = user.id;
    const user_role = user.role;
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string
    );

    if (!homework_id) {
      return sendError(res, 'Homework ID is required', 400);
    }

    let teacher = null;
    if (user_role === 'TEACHER') {
      teacher = await prisma.teacher.findUnique({
        where: { user_id }
      });

      if (!teacher) {
        return sendError(res, 'Teacher not found', 404);
      }
    }

    // Check if user has access to this homework
    const homework = await prisma.homework.findFirst({
      where: user_role === 'ADMIN'
        ? { id: parseInt(homework_id) }
        : { id: parseInt(homework_id), teacher_id: teacher!.id }
    });

    if (!homework) {
      return sendError(res, 'Homework not found or access denied', 404);
    }

    const [responses, total] = await Promise.all([
      prisma.homeworkResponse.findMany({
        where: { homework_id: parseInt(homework_id) },
        skip,
        take: limit,
        include: {
          student: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            }
          },
          checker: {
            select: { id: true, name: true }
          }
        },
        orderBy: { submitted_at: 'desc' }
      }),
      prisma.homeworkResponse.count({
        where: { homework_id: parseInt(homework_id) }
      })
    ]);

    const response = createPaginatedResponse(responses, total, page, limit);
    sendSuccess(res, response);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Check/mark homework response
export const checkHomeworkResponse = async (req: Request, res: Response) => {
  try {
    const { response_id } = req.params;
    const { feedback, is_checked } = req.body;
    const user = (req as any).user;
    const user_id = user.id;
    const user_role = user.role;

    if (!response_id) {
      return sendError(res, 'Response ID is required', 400);
    }

    const parsedResponseId = parseInt(response_id);
    if (isNaN(parsedResponseId)) {
      return sendError(res, 'Invalid response ID', 400);
    }
    if (isNaN(parsedResponseId)) {
      return sendError(res, 'Invalid response ID', 400);
    }

    let teacher = null;
    if (user_role === 'TEACHER') {
      teacher = await prisma.teacher.findUnique({
        where: { user_id }
      });

      if (!teacher) {
        return sendError(res, 'Teacher not found', 404);
      }
    } else if (user_role === 'ADMIN') {
      // For admins, we don't need a teacher record, but we'll check homework access below
    }

    // Get the response and check if user has access
    const response = await prisma.homeworkResponse.findUnique({
      where: { id: parsedResponseId },
      include: {
        homework: true
      }
    });

    if (!response) {
      return sendError(res, 'Homework response not found', 404);
    }

    // Check access permissions
    if (user_role === 'ADMIN') {
      // Admins have access to all homework
    } else if (user_role === 'TEACHER') {
      if (response.homework.teacher_id !== teacher!.id) {
        return sendError(res, 'Access denied', 403);
      }
    } else {
      return sendError(res, 'Access denied', 403);
    }

    // Handle feedback media upload if provided
    let feedback_media_url = null;
    let feedback_media_type = null;

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadPromises = req.files.map(file => 
        uploadToS3(file, 'homework-feedback')
      );
      const uploadResults = await Promise.all(uploadPromises);
      const mediaUrls = uploadResults.map(result => result.url);
      feedback_media_url = JSON.stringify(mediaUrls);
      feedback_media_type = req.files.map(f => f.mimetype).join(',');
    }

    // Prepare update data
    const updateData: any = {
      is_checked: is_checked !== undefined ? (is_checked === 'true' || is_checked === true) : true,
      checked_by: user_role === 'ADMIN' ? user_id : teacher!.user_id,
      checked_at: new Date(),
    };

    if (feedback !== undefined) {
      updateData.feedback = feedback;
    }

    if (feedback_media_url) {
      updateData.feedback_media_url = feedback_media_url;
      updateData.feedback_media_type = feedback_media_type;
    }

    // Update the response
    const updatedResponse = await prisma.homeworkResponse.update({
      where: { id: parsedResponseId },
      data: updateData,
      include: {
        student: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        checker: {
          select: { id: true, name: true }
        },
        homework: {
          include: {
            subject: true
          }
        }
      }
    });

    // Send notification to the student
    try {
      const studentUserId = updatedResponse.student.user.id;
      const checkerName = updatedResponse.checker?.name || 'Teacher';
      await sendNotificationToMultipleUsers([studentUserId], {
        type: 'INFO',
        title: `Homework Checked: ${updatedResponse.homework.title}`,
        description: `${checkerName} has reviewed your homework for ${updatedResponse.homework.subject.name}${feedback ? ' with feedback' : ''}`,
      });
      console.log(`✓ Notification sent to student for homework check: ${updatedResponse.homework.title}`);
    } catch (notifError) {
      console.error('Error sending homework check notification:', notifError);
      // Don't fail the request if notifications fail
    }

    sendSuccess(res, updatedResponse, 'Homework response checked successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get single homework details
export const getHomeworkById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = (req as any).user.id;
    const user_role = (req as any).user.role;

    if (!id) {
      return sendError(res, 'Homework ID is required', 400);
    }

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return sendError(res, 'Invalid homework ID', 400);
    }

    const homework = await prisma.homework.findUnique({
      where: { id: parsedId },
      include: {
        subject: true,
        teacher: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        },
        assignments: {
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        responses: {
          include: {
            student: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              }
            },
            checker: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: { assignments: true, responses: true }
        }
      }
    });

    if (!homework) {
      return sendError(res, 'Homework not found', 404);
    }

    // Check permissions
    if (user_role === 'ADMIN') {
      // Admins have access to all homework
    } else if (user_role === 'TEACHER') {
      const teacher = await prisma.teacher.findUnique({
        where: { user_id }
      });
      if (teacher?.id !== homework.teacher_id) {
        return sendError(res, 'Access denied', 403);
      }
    } else if (user_role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { user_id }
      });
      const isAssigned = homework.assignments.some(a => a.student_id === student?.id);
      if (!isAssigned) {
        return sendError(res, 'Access denied', 403);
      }
    }

    sendSuccess(res, homework);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Update homework (Teacher/Admin) - Teachers can edit their own homework
export const updateHomework = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return sendError(res, 'Homework ID is required', 400);
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) return sendError(res, 'Invalid homework ID', 400);

    const user = (req as any).user;
    const user_id = user.id;
    const user_role = user.role;

    let teacher = null;
    if (user_role === 'TEACHER') {
      teacher = await prisma.teacher.findUnique({ where: { user_id } });
      if (!teacher) return sendError(res, 'Teacher not found', 404);
    }

    // Find homework and check access
    const homework = await prisma.homework.findUnique({ where: { id: parsedId } });
    if (!homework) return sendError(res, 'Homework not found', 404);

    if (user_role === 'TEACHER' && homework.teacher_id !== teacher!.id) {
      return sendError(res, 'Access denied', 403);
    }

    const { title, description, due_date, assigned_student_ids } = req.body;

    let document_url = homework.document_url;
    let document_type = homework.document_type;

    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'homework-documents');
      document_url = uploadResult.url;
      document_type = req.file.mimetype;
    }

    // Update homework record
    const updatedHomework = await prisma.homework.update({
      where: { id: parsedId },
      data: {
        title: title !== undefined ? title : homework.title,
        description: description !== undefined ? description : homework.description,
        document_url,
        document_type,
        due_date: due_date ? new Date(due_date) : homework.due_date
      },
      include: {
        subject: true,
        teacher: { include: { user: { select: { id: true, name: true } } } },
        assignments: true,
        _count: { select: { assignments: true, responses: true } }
      }
    });

    // Handle re-assigning students if list provided
    if (assigned_student_ids && Array.isArray(assigned_student_ids)) {
      const studentIds = assigned_student_ids.map((s: any) => parseInt(s)).filter((n: number) => !isNaN(n));

      // Simple approach: delete existing assignments and recreate
      await prisma.$transaction([
        prisma.homeworkAssignment.deleteMany({ where: { homework_id: parsedId } }),
        prisma.homeworkAssignment.createMany({
          data: studentIds.map((student_id: number) => ({ homework_id: parsedId, student_id })),
          skipDuplicates: true
        })
      ]);
    }

    sendSuccess(res, updatedHomework, 'Homework updated successfully');
  } catch (error: any) {
    console.error('Update homework error:', error);
    sendError(res, error.message, 500);
  }
};

// Delete homework (Teacher/Admin) - Teachers can delete their own homework
export const deleteHomework = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return sendError(res, 'Homework ID is required', 400);
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) return sendError(res, 'Invalid homework ID', 400);

    const user = (req as any).user;
    const user_id = user.id;
    const user_role = user.role;

    let teacher = null;
    if (user_role === 'TEACHER') {
      teacher = await prisma.teacher.findUnique({ where: { user_id } });
      if (!teacher) return sendError(res, 'Teacher not found', 404);
    }

    // Verify homework exists and permissions
    const homework = await prisma.homework.findUnique({ where: { id: parsedId } });
    if (!homework) return sendError(res, 'Homework not found', 404);
    if (user_role === 'TEACHER' && homework.teacher_id !== teacher!.id) {
      return sendError(res, 'Access denied', 403);
    }

    // Delete responses, assignments then homework
    await prisma.$transaction([
      prisma.homeworkResponse.deleteMany({ where: { homework_id: parsedId } }),
      prisma.homeworkAssignment.deleteMany({ where: { homework_id: parsedId } }),
      prisma.homework.delete({ where: { id: parsedId } })
    ]);

    sendSuccess(res, null, 'Homework deleted successfully');
  } catch (error: any) {
    console.error('Delete homework error:', error);
    sendError(res, error.message, 500);
  }
};