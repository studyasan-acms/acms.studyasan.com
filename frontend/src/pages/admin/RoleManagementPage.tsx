import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Users, Save, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TeacherRole {
    id: number;
    name: string;
    description: string | null;
    permissions: Record<string, any>;
    is_active: boolean;
    created_at: string;
    _count?: { teachers: number };
}

type PermissionsType = Record<string, Record<string, boolean>>;

const defaultPermissions: PermissionsType = {
    students: { view: false, create: false, update: false, delete: false },
    teachers: { view: false, create: false, update: false, delete: false },
    subjects: { view: false, create: false, update: false, delete: false },
    boards: { view: false, create: false, update: false, delete: false },
    classes: { view: false, create: false, update: false, delete: false },
    enrollments: { view: false, create: false, update: false, delete: false },
    payments: { view: false, create: false, update: false, delete: false },
    testSeries: { view: false, create: false, update: false, delete: false },
    activityGroups: { view: false, create: false, update: false, delete: false },
    notifications: { create: false, sendToRole: false },
    enquiries: { view: false, create: false, update: false, delete: false },
    analytics: { viewAdmin: false },
    accountDeletion: { manage: false },
    chat: { viewAll: false },
};

const permissionLabels: Record<string, string> = {
    students: 'Student Management',
    teachers: 'Teacher Management',
    subjects: 'Subject Management',
    boards: 'Board Management',
    classes: 'Class Management',
    enrollments: 'Enrollment Management',
    payments: 'Payment Management',
    testSeries: 'Test Series Management',
    activityGroups: 'Activity Group Management',
    notifications: 'Notification Management',
    enquiries: 'Enquiry Management',
    analytics: 'Analytics',
    accountDeletion: 'Account Deletion',
    chat: 'Chat Management',
};

const RoleManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRole, setEditingRole] = useState<TeacherRole | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        description: string;
        permissions: PermissionsType;
    }>({
        name: '',
        description: '',
        permissions: defaultPermissions,
    });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}teacher-roles`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setRoles(response.data.data.roles);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            description: '',
            permissions: defaultPermissions,
        });
        setShowModal(true);
    };

    const handleEditRole = (role: TeacherRole) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions,
        });
        setShowModal(true);
    };

    const handleDeleteRole = async (roleId: number) => {
        if (!confirm('Are you sure you want to delete this role?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}teacher-roles/${roleId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchRoles();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to delete role');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem('token');

            if (editingRole) {
                await axios.put(`${API_URL}teacher-roles/${editingRole.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}teacher-roles`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setShowModal(false);
            fetchRoles();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to save role');
        }
    };

    const togglePermission = (resource: string, action: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [resource]: {
                    ...prev.permissions[resource],
                    [action]: !prev.permissions[resource]?.[action],
                },
            },
        }));
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Teacher Role Management</h1>
                        <p className="text-slate-600 mt-2">Create and manage custom roles with specific permissions</p>
                    </div>
                    <button
                        onClick={handleCreateRole}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5" /> Create New Role
                    </button>
                </div>

                {/* Roles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map(role => (
                        <div key={role.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{role.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{role.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditRole(role)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">
                                <Users className="w-4 h-4" />
                                <span>{role._count?.teachers || 0} teacher(s) assigned</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-slate-800">
                                    {editingRole ? 'Edit Role' : 'Create New Role'}
                                </h2>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                {/* Basic Info */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Role Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        rows={3}
                                    />
                                </div>

                                {/* Permissions */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Permissions</h3>
                                    <div className="space-y-4">
                                        {Object.entries(permissionLabels).map(([resource, label]) => (
                                            <div key={resource} className="border border-slate-200 rounded-lg p-4">
                                                <h4 className="font-semibold text-slate-700 mb-3">{label}</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {Object.keys(formData.permissions[resource] || {}).map(action => (
                                                        <label key={action} className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.permissions[resource]?.[action] || false}
                                                                onChange={() => togglePermission(resource, action)}
                                                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm text-slate-600 capitalize">{action}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
                                    >
                                        <Save className="w-4 h-4" /> {editingRole ? 'Update Role' : 'Create Role'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleManagementPage;
