import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import { 
  uploadToS3, 
  uploadMultipleToS3, 
  deleteFromS3, 
  extractS3KeyFromUrl,
  getFileType 
} from '../utils/s3.js';

const prisma = new PrismaClient();

interface ModuleContent {
  content_id: number;
  type: 'pdf' | 'video' | 'image' | 'text' | 'docx' | 'pptx' | 'audio' | 'zip' | 'other';
  url?: string;
  text_content?: string;
  filename?: string;
  s3_key?: string;
}

interface Module {
  module_id: number;
  title: string;
  description: string;
  order: number;
  content: ModuleContent[];
  estimated_time_minutes: number;
}

interface Syllabus {
  modules: Module[];
}

// Get all modules for a subject
export const getModulesBySubject = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { id: true, name: true, syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    let modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];

    // If modules is empty but syllabus has units (from subject creation/editing), convert them to modules
    if (modules.length === 0 && Array.isArray(syllabus?.units) && syllabus.units.length > 0) {
      modules = syllabus.units.map((unit: any, index: number) => ({
        module_id: index + 1,
        title: unit.name || `Unit ${index + 1}`,
        description: unit.content || unit.name || '',
        order: index + 1,
        content: [],
        estimated_time_minutes: 0,
      }));

      // Persist modules alongside existing units
      await prisma.subject.update({
        where: { id: subject.id },
        data: {
          syllabus: {
            ...syllabus,
            modules,
          },
        },
      });
    }

    sendSuccess(res, {
      subject_id: subject.id,
      subject_name: subject.name,
      modules: modules.sort((a, b) => a.order - b.order),
    });
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Get a single module by ID
export const getModuleById = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { id: true, syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    let modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];

    // If modules is empty but syllabus has units, auto-convert
    if (modules.length === 0 && Array.isArray(syllabus?.units) && syllabus.units.length > 0) {
      modules = syllabus.units.map((unit: any, index: number) => ({
        module_id: index + 1,
        title: unit.name || `Unit ${index + 1}`,
        description: unit.content || unit.name || '',
        order: index + 1,
        content: [],
        estimated_time_minutes: 0,
      }));

      await prisma.subject.update({
        where: { id: subject.id },
        data: {
          syllabus: {
            ...syllabus,
            modules,
          },
        },
      });
    }

    const module = modules.find((m) => m.module_id === parseInt(moduleId!));

    if (!module) {
      return sendError(res, 'Module not found', 404);
    }

    sendSuccess(res, module);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Create a new module (no files initially)
export const createModule = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { title, description, estimated_time_minutes } = req.body;

    if (!title || !description) {
      return sendError(res, 'Title and description are required', 400);
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus.modules) ? [...syllabus.modules] : [];

    const newModuleId = modules.length > 0 
      ? Math.max(...modules.map((m) => m.module_id)) + 1 
      : 1;

    const newOrder = modules.length > 0 
      ? Math.max(...modules.map((m) => m.order)) + 1 
      : 1;

    const newModule: Module = {
      module_id: newModuleId,
      title,
      description,
      order: newOrder,
      content: [],
      estimated_time_minutes: estimated_time_minutes || 0,
    };

    modules.push(newModule);

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules,
        } as any,
      },
    });

    sendSuccess(res, newModule, 'Module created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Update a module
export const updateModule = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId } = req.params;
    const { title, description, estimated_time_minutes, order } = req.body;

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.module_id === parseInt(moduleId!));

    if (moduleIndex === -1) {
      return sendError(res, 'Module not found', 404);
    }

    const module = modules[moduleIndex];
    if (!module) {
      return sendError(res, 'Module not found', 404);
    }

    if (title !== undefined) module.title = title;
    if (description !== undefined) module.description = description;
    if (estimated_time_minutes !== undefined) module.estimated_time_minutes = estimated_time_minutes;
    if (order !== undefined) module.order = order;

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules,
        } as any,
      },
    });

    sendSuccess(res, modules[moduleIndex], 'Module updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Delete a module (also deletes S3 files)
export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];
    const moduleToDelete = modules.find((m) => m.module_id === parseInt(moduleId!));

    if (!moduleToDelete) {
      return sendError(res, 'Module not found', 404);
    }

    // Delete all S3 files associated with this module
    const s3Keys = moduleToDelete.content
      .filter((c) => c.s3_key)
      .map((c) => c.s3_key!);

    if (s3Keys.length > 0) {
      try {
        await Promise.all(s3Keys.map((key) => deleteFromS3(key)));
      } catch (error) {
        console.error('Error deleting S3 files:', error);
      }
    }

    const filteredModules = modules.filter((m) => m.module_id !== parseInt(moduleId!));

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules: filteredModules,
        } as any,
      },
    });

    // Delete progress records
    await prisma.studentModuleProgress.deleteMany({
      where: {
        subject_id: parseInt(subjectId!),
        module_id: parseInt(moduleId!),
      },
    });

    sendSuccess(res, null, 'Module deleted successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Reorder modules
export const reorderModules = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;
    const { module_orders } = req.body;

    if (!Array.isArray(module_orders)) {
      return sendError(res, 'module_orders must be an array', 400);
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];

    module_orders.forEach(({ module_id, order }) => {
      const moduleIndex = modules.findIndex((m) => m.module_id === module_id);
      if (moduleIndex !== -1) {
        const module = modules[moduleIndex];
        if (module) {
          module.order = order;
        }
      }
    });

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules,
        } as any,
      },
    });

    sendSuccess(res, modules.sort((a, b) => a.order - b.order), 'Modules reordered successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Upload content files to a module (supports multiple files)
export const uploadContentToModule = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return sendError(res, 'No files provided', 400);
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.module_id === parseInt(moduleId!));

    if (moduleIndex === -1) {
      return sendError(res, 'Module not found', 404);
    }

    const module = modules[moduleIndex];
    if (!module) {
      return sendError(res, 'Module not found', 404);
    }

    // Upload files to S3
    const uploadResults = await uploadMultipleToS3(files, `subjects/${subjectId}/modules/${moduleId}`);

    // Add content to module
    const newContents: ModuleContent[] = uploadResults.map((result, index) => {
      const contentId = module.content.length > 0 
        ? Math.max(...module.content.map((c) => c.content_id)) + index + 1 
        : index + 1;

      return {
        content_id: contentId,
        type: getFileType(result.filename) as any,
        url: result.url,
        filename: result.filename,
        s3_key: result.key,
      };
    });

    module.content.push(...newContents);

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules,
        } as any,
      },
    });

    sendSuccess(res, newContents, 'Content uploaded successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Add text content to a module
export const addTextContent = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId } = req.params;
    const { text_content } = req.body;

    if (!text_content) {
      return sendError(res, 'text_content is required', 400);
    }

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.module_id === parseInt(moduleId!));

    if (moduleIndex === -1) {
      return sendError(res, 'Module not found', 404);
    }

    const module = modules[moduleIndex];
    if (!module) {
      return sendError(res, 'Module not found', 404);
    }

    const newContentId = module.content.length > 0 
      ? Math.max(...module.content.map((c) => c.content_id)) + 1 
      : 1;

    const newContent: ModuleContent = {
      content_id: newContentId,
      type: 'text',
      text_content,
    };

    module.content.push(newContent);

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules,
        } as any,
      },
    });

    sendSuccess(res, newContent, 'Text content added successfully', 201);
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Remove content from a module (also deletes from S3)
export const removeContentFromModule = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId, contentId } = req.params;

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.module_id === parseInt(moduleId!));

    if (moduleIndex === -1) {
      return sendError(res, 'Module not found', 404);
    }

    const module = modules[moduleIndex];
    if (!module) {
      return sendError(res, 'Module not found', 404);
    }

    const contentToDelete = module.content.find((c) => c.content_id === parseInt(contentId!));

    if (!contentToDelete) {
      return sendError(res, 'Content not found', 404);
    }

    // Delete from S3 if it has an S3 key
    if (contentToDelete.s3_key) {
      try {
        await deleteFromS3(contentToDelete.s3_key);
      } catch (error) {
        console.error('Error deleting from S3:', error);
      }
    }

    module.content = module.content.filter((c) => c.content_id !== parseInt(contentId!));

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules,
        } as any,
      },
    });

    sendSuccess(res, null, 'Content removed successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};

// Update specific content metadata
export const updateContent = async (req: Request, res: Response) => {
  try {
    const { subjectId, moduleId, contentId } = req.params;
    const { type, text_content } = req.body;

    const subject = await prisma.subject.findUnique({
      where: { id: parseInt(subjectId!) },
      select: { syllabus: true },
    });

    if (!subject) {
      return sendError(res, 'Subject not found', 404);
    }

    const syllabus = (subject.syllabus as any) || {};
    const modules: Module[] = Array.isArray(syllabus?.modules) ? [...syllabus.modules] : [];
    const moduleIndex = modules.findIndex((m) => m.module_id === parseInt(moduleId!));

    if (moduleIndex === -1) {
      return sendError(res, 'Module not found', 404);
    }

    const module = modules[moduleIndex];
    if (!module) {
      return sendError(res, 'Module not found', 404);
    }

    const contentIndex = module.content.findIndex((c) => c.content_id === parseInt(contentId!));

    if (contentIndex === -1) {
      return sendError(res, 'Content not found', 404);
    }

    const content = module.content[contentIndex];
    if (!content) {
      return sendError(res, 'Content not found', 404);
    }

    if (type !== undefined) content.type = type;
    if (text_content !== undefined) content.text_content = text_content;

    await prisma.subject.update({
      where: { id: parseInt(subjectId!) },
      data: {
        syllabus: {
          ...syllabus,
          modules,
        } as any,
      },
    });

    sendSuccess(res, module.content[contentIndex], 'Content updated successfully');
  } catch (error: any) {
    sendError(res, error.message, 500);
  }
};