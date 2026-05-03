import type { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AuthRequest } from '../types/index.js';

const prisma = new PrismaClient();

// Permission resource mapping - maps routes to permission resources
const routeToResource: Record<string, string> = {
    '/students': 'students',
    '/teachers': 'teachers',
    '/subjects': 'subjects',
    '/boards': 'boards',
    '/classes': 'classes',
    '/class-sessions': 'classSessions',
    '/enrollments': 'enrollments',
    '/payments': 'payments',
    '/test-series': 'testSeries',
    '/activity-groups': 'activityGroups',
    '/activities': 'activityGroups', // Activities are part of activity groups
    '/notifications': 'notifications',
    '/enquiries': 'enquiries',
    '/analytics': 'analytics',
    '/admin/deletion-requests': 'accountDeletion',
    '/chats': 'chat',
    '/homework': 'homework',
    '/tests': 'tests',
    '/teacher-roles': 'roles',
};

// Permission action mapping - maps HTTP methods to permission actions
const methodToAction: Record<string, string> = {
    'GET': 'view',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete',
};

/**
 * Infer permission resource and action from the request
 */
export function inferPermissionFromRoute(req: Request): {
    resource: string | null;
    action: string | null;
} {
    const path = req.path;
    const method = req.method;

    console.log('🔍 [INFER] Path:', path, 'Method:', method);

    // Find matching resource
    let resource: string | null = null;
    for (const [routePattern, resourceName] of Object.entries(routeToResource)) {
        if (path.startsWith(routePattern)) {
            resource = resourceName;
            console.log('🔍 [INFER] Matched route pattern:', routePattern, '-> resource:', resourceName);
            break;
        }
    }

    // Get action from HTTP method
    const action = methodToAction[method] || null;

    console.log('🔍 [INFER] Final resource:', resource, 'action:', action);

    return { resource, action };
}

/**
 * Check if a teacher has permission for a specific resource and action
 */
export async function checkTeacherPermission(
    req: AuthRequest
): Promise<boolean> {
    try {
        const userId = req.user!.id;

        // Get teacher with role
        const teacher = await prisma.teacher.findUnique({
            where: { user_id: userId },
            include: { role: true }
        });

        console.log('🔍 [PERMISSION] Teacher found:', teacher?.id, 'Role:', teacher?.role?.name, 'Active:', teacher?.role?.is_active);

        // If teacher has no role, they don't have additional permissions
        if (!teacher?.role || !teacher.role.is_active) {
            console.log('❌ [PERMISSION] No active role found for teacher');
            return false;
        }

        const { resource, action } = inferPermissionFromRoute(req);

        console.log('🔍 [PERMISSION] Checking resource:', resource, 'action:', action);

        if (!resource || !action) {
            console.log('❌ [PERMISSION] Could not infer resource or action from route');
            return false;
        }

        const permissions = teacher.role.permissions as any;
        
        console.log('🔍 [PERMISSION] Full permissions object:', JSON.stringify(permissions));
        console.log('🔍 [PERMISSION] Checking:', permissions[resource]?.[action]);

        // Check if permission exists and is true
        const hasPermission = permissions[resource]?.[action] === true;
        console.log(hasPermission ? '✅ [PERMISSION] Allowed' : '❌ [PERMISSION] Denied');
        return hasPermission;
    } catch (error) {
        console.error('Error checking teacher permission:', error);
        return false;
    }
}

/**
 * Check if teacher has specific permission (for use in controllers)
 */
export async function hasPermission(
    userId: number,
    resource: string,
    action: string
): Promise<boolean> {
    try {
        const teacher = await prisma.teacher.findUnique({
            where: { user_id: userId },
            include: { role: true }
        });

        if (!teacher?.role || !teacher.role.is_active) {
            return false;
        }

        const permissions = teacher.role.permissions as any;
        return permissions[resource]?.[action] === true;
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

/**
 * Get all permissions for a teacher
 */
export async function getTeacherPermissions(userId: number): Promise<any> {
    try {
        const teacher = await prisma.teacher.findUnique({
            where: { user_id: userId },
            include: { role: true }
        });

        if (!teacher?.role || !teacher.role.is_active) {
            return {};
        }

        return teacher.role.permissions;
    } catch (error) {
        console.error('Error getting teacher permissions:', error);
        return {};
    }
}
