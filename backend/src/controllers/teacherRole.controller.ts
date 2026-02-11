import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.js';
import type { AuthRequest } from '../types/index.js';

const prisma = new PrismaClient();

// Get all teacher roles
export const getAllRoles = async (req: Request, res: Response) => {
    try {
        const roles = await prisma.teacherRole.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { teachers: true }
                }
            }
        });

        return sendSuccess(res, { roles }, 'Teacher roles retrieved successfully');
    } catch (error) {
        console.error('Error fetching teacher roles:', error);
        return sendError(res, 'Failed to fetch teacher roles');
    }
};

// Get role by ID
export const getRoleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return sendError(res, 'Role ID is required', 400);
        }

        const role = await prisma.teacherRole.findUnique({
            where: { id: parseInt(id) },
            include: {
                teachers: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!role) {
            return sendError(res, 'Role not found', 404);
        }

        return sendSuccess(res, { role }, 'Role retrieved successfully');
    } catch (error) {
        console.error('Error fetching role:', error);
        return sendError(res, 'Failed to fetch role');
    }
};

// Create new role
export const createRole = async (req: Request, res: Response) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name || !permissions) {
            return sendError(res, 'Name and permissions are required', 400);
        }

        // Check if role with same name already exists
        const existingRole = await prisma.teacherRole.findUnique({
            where: { name }
        });

        if (existingRole) {
            return sendError(res, 'Role with this name already exists', 400);
        }

        const role = await prisma.teacherRole.create({
            data: {
                name,
                description,
                permissions
            }
        });

        return sendSuccess(res, { role }, 'Role created successfully', 201);
    } catch (error) {
        console.error('Error creating role:', error);
        return sendError(res, 'Failed to create role');
    }
};

// Update role
export const updateRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return sendError(res, 'Role ID is required', 400);
        }
        const { name, description, permissions, is_active } = req.body;

        const role = await prisma.teacherRole.findUnique({
            where: { id: parseInt(id) }
        });

        if (!role) {
            return sendError(res, 'Role not found', 404);
        }

        const updatedRole = await prisma.teacherRole.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(permissions && { permissions }),
                ...(is_active !== undefined && { is_active })
            }
        });

        return sendSuccess(res, { role: updatedRole }, 'Role updated successfully');
    } catch (error) {
        console.error('Error updating role:', error);
        return sendError(res, 'Failed to update role');
    }
};

// Delete role
export const deleteRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!id) {
            return sendError(res, 'Role ID is required', 400);
        }

        const role = await prisma.teacherRole.findUnique({
            where: { id: parseInt(id) },
            include: {
                _count: {
                    select: { teachers: true }
                }
            }
        });

        if (!role) {
            return sendError(res, 'Role not found', 404);
        }

        if (role._count.teachers > 0) {
            return sendError(res, `Cannot delete role. ${role._count.teachers} teacher(s) are assigned to this role.`, 400);
        }

        await prisma.teacherRole.delete({
            where: { id: parseInt(id) }
        });

        return sendSuccess(res, null, 'Role deleted successfully');
    } catch (error) {
        console.error('Error deleting role:', error);
        return sendError(res, 'Failed to delete role');
    }
};

// Assign role to teacher
export const assignRoleToTeacher = async (req: Request, res: Response) => {
    try {
        const { teacherId, roleId } = req.body;

        if (!teacherId) {
            return sendError(res, 'Teacher ID is required', 400);
        }

        // roleId can be null to remove role
        if (roleId !== null && roleId !== undefined) {
            const role = await prisma.teacherRole.findUnique({
                where: { id: roleId }
            });

            if (!role) {
                return sendError(res, 'Role not found', 404);
            }

            if (!role.is_active) {
                return sendError(res, 'Cannot assign inactive role', 400);
            }
        }

        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId }
        });

        if (!teacher) {
            return sendError(res, 'Teacher not found', 404);
        }

        const updatedTeacher = await prisma.teacher.update({
            where: { id: teacherId },
            data: { role_id: roleId || null },
            include: {
                role: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return sendSuccess(res, { teacher: updatedTeacher }, roleId ? 'Role assigned successfully' : 'Role removed successfully');
    } catch (error) {
        console.error('Error assigning role:', error);
        return sendError(res, 'Failed to assign role');
    }
};

// Get teacher's permissions (for frontend use)
export const getTeacherPermissions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const teacher = await prisma.teacher.findUnique({
            where: { user_id: userId },
            include: { role: true }
        });

        if (!teacher) {
            return sendError(res, 'Teacher not found', 404);
        }

        const permissions = teacher.role?.permissions || {};
        const roleName = teacher.role?.name || null;

        return sendSuccess(res, {
            permissions: permissions as Record<string, any>,
            roleName
        }, 'Permissions retrieved successfully');
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return sendError(res, 'Failed to fetch permissions');
    }
};
