import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Permissions {
    students?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    teachers?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    subjects?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    boards?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    classes?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    enrollments?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    payments?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    testSeries?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    activityGroups?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    notifications?: { create?: boolean; sendToRole?: boolean };
    enquiries?: { view?: boolean; create?: boolean; update?: boolean; delete?: boolean };
    analytics?: { viewAdmin?: boolean };
    accountDeletion?: { manage?: boolean };
    chat?: { viewAll?: boolean };
}

export const usePermissions = () => {
    const [permissions, setPermissions] = useState<Permissions>({});
    const [roleName, setRoleName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const token = localStorage.getItem('token');
                const user = JSON.parse(localStorage.getItem('user') || '{}');

                // Only fetch permissions for teachers
                if (user.role !== 'TEACHER') {
                    setLoading(false);
                    return;
                }

                const response = await axios.get(`${API_URL}my-permissions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.success) {
                    setPermissions(response.data.data.permissions || {});
                    setRoleName(response.data.data.roleName);
                }
            } catch (error) {
                console.error('Error fetching permissions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, []);

    const hasPermission = (resource: string, action: string): boolean => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Admin always has all permissions
        if (user.role === 'ADMIN') {
            return true;
        }

        // Check if teacher has the specific permission
        const resourcePerms = permissions[resource as keyof Permissions] as any;
        return resourcePerms?.[action] === true;
    };

    const canView = (resource: string) => hasPermission(resource, 'view');
    const canCreate = (resource: string) => hasPermission(resource, 'create');
    const canUpdate = (resource: string) => hasPermission(resource, 'update');
    const canDelete = (resource: string) => hasPermission(resource, 'delete');

    return {
        permissions,
        roleName,
        loading,
        hasPermission,
        canView,
        canCreate,
        canUpdate,
        canDelete,
    };
};
