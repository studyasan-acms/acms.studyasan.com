import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Edit2, Trash2, Users, Save, X, Search, Shield, Key, 
    Check, Lock, Unlock, ArrowRight, ShieldCheck, ClipboardList, 
    BookOpen, DollarSign, MessageSquare, Bell, GraduationCap, BarChart2 
} from 'lucide-react';
import { toast } from 'sonner';

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
    classSessions: { view: false, create: false, update: false, delete: false },
    enrollments: { view: false, create: false, update: false, delete: false },
    payments: { view: false, create: false, update: false, delete: false },
    testSeries: { view: false, create: false, update: false, delete: false },
    activityGroups: { view: false, create: false, update: false, delete: false },
    homework: { view: false, create: false, update: false, delete: false },
    tests: { view: false, create: false, update: false, delete: false },
    notifications: { create: false, sendToRole: false },
    enquiries: { view: false, create: false, update: false, delete: false },
    analytics: { viewAdmin: false },
    accountDeletion: { manage: false },
    chat: { viewAll: false },
    announcements: { manage: false },
};

const permissionLabels: Record<string, string> = {
    students: 'Student Management',
    teachers: 'Teacher Management',
    subjects: 'Subject Management',
    boards: 'Board Management',
    classes: 'Class Management',
    classSessions: 'Class Session Management',
    enrollments: 'Enrollment Management',
    payments: 'Payment Management',
    testSeries: 'Test Series Management',
    activityGroups: 'Activity Group Management',
    homework: 'Homework Management',
    tests: 'Test Management',
    notifications: 'Notification Management',
    enquiries: 'Enquiry Management',
    analytics: 'Analytics & Insights',
    accountDeletion: 'Account Deletion',
    chat: 'Chat Management',
    announcements: 'Announcement Management',
};

const permissionGroups = [
    {
        title: "Core Administration",
        description: "Staff, student and account system controls",
        icon: ShieldCheck,
        color: "text-blue-600 bg-blue-50 border-blue-100",
        resources: ["teachers", "students", "enquiries", "accountDeletion"],
    },
    {
        title: "Academics & Curriculum",
        description: "Classes, boards, subjects and test materials",
        icon: BookOpen,
        color: "text-violet-600 bg-violet-50 border-violet-100",
        resources: ["classes", "boards", "subjects", "classSessions", "homework", "tests", "testSeries", "activityGroups"],
    },
    {
        title: "Financials & Payments",
        description: "Enrollments fee collections and revenue statistics",
        icon: DollarSign,
        color: "text-emerald-600 bg-emerald-50 border-emerald-100",
        resources: ["enrollments", "payments", "analytics"],
    },
    {
        title: "Communications & Activity",
        description: "Chat routes, alerts and global notice boards",
        icon: MessageSquare,
        color: "text-amber-600 bg-amber-50 border-amber-100",
        resources: ["chat", "notifications", "announcements"],
    }
];

const gradients = [
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-pink-500 to-rose-600',
    'from-cyan-500 to-blue-600',
];

const RoleManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
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
        const mergedPermissions = Object.fromEntries(
            Object.entries(defaultPermissions).map(([resource, defaults]) => [
                resource,
                { ...defaults, ...(role.permissions[resource] || {}) },
            ])
        ) as PermissionsType;
        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: mergedPermissions,
        });
        setShowModal(true);
    };

    const handleDeleteRole = async (roleId: number) => {
        if (!confirm('Are you sure you want to delete this role? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}teacher-roles/${roleId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Teacher role deleted successfully!');
            fetchRoles();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete role');
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
                toast.success('Teacher role updated successfully!');
            } else {
                await axios.post(`${API_URL}teacher-roles`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('New teacher role created successfully!');
            }

            setShowModal(false);
            fetchRoles();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save role');
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

    const getActiveCategories = (permissions: Record<string, any>) => {
        return Object.entries(permissions)
            .filter(([_, actions]) => Object.values(actions).some(val => val === true))
            .map(([resource]) => permissionLabels[resource] || resource);
    };

    const getPermissionsStats = (permissions: Record<string, any>) => {
        let granted = 0;
        let total = 0;
        Object.values(permissions).forEach(actions => {
            Object.values(actions).forEach(val => {
                total++;
                if (val === true) granted++;
            });
        });
        return { granted, total };
    };

    const totalRolesCount = roles.length;
    const totalTeachersAssigned = roles.reduce((acc, r) => acc + (r._count?.teachers || 0), 0);
    const mostAssignedRole = roles.length > 0 
        ? roles.reduce((max, r) => (r._count?.teachers || 0) > (max._count?.teachers || 0) ? r : max, roles[0])
        : null;

    const filteredRoles = roles.filter(role => 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (role.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50/70 flex flex-col justify-center items-center space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-100 rounded-full" />
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
                </div>
                <p className="text-slate-500 font-semibold text-sm">Loading staff roles...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/70 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200/60 pb-6">
                    <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Shield className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teacher Role Management</h1>
                            <p className="text-sm text-slate-500 font-medium">Create and manage custom roles with specific permissions</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleCreateRole}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-600/20 transition-all text-sm shrink-0"
                    >
                        <Plus className="w-4 h-4" /> Create New Role
                    </button>
                </div>

                {/* Stats & Search Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search roles by name..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-6 w-full md:w-auto justify-end px-1">
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Roles</span>
                            <span className="text-lg font-black text-slate-800 leading-tight block">{totalRolesCount}</span>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Staff</span>
                            <span className="text-lg font-black text-indigo-600 leading-tight block">{totalTeachersAssigned}</span>
                        </div>
                        {mostAssignedRole && mostAssignedRole._count && mostAssignedRole._count.teachers > 0 && (
                            <>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Most Popular</span>
                                    <span className="text-xs font-bold text-slate-700 block truncate max-w-[120px]" title={mostAssignedRole.name}>
                                        {mostAssignedRole.name}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Empty State */}
                {filteredRoles.length === 0 && (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center max-w-md mx-auto my-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Shield className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No Roles Found</h3>
                        <p className="text-slate-500 text-xs sm:text-sm mb-5">
                            {searchTerm 
                                ? `No roles match your search term "${searchTerm}". Try adjusting your keywords.`
                                : "No roles are currently configured in the system. Create a custom teacher role to begin."}
                        </p>
                        {searchTerm ? (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                            >
                                Clear Search Filter
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateRole}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
                            >
                                Create First Role
                            </button>
                        )}
                    </div>
                )}

                {/* Roles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRoles.map((role, index) => {
                        const activeCategories = getActiveCategories(role.permissions);
                        const { granted, total } = getPermissionsStats(role.permissions);
                        const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;
                        const roleGradient = gradients[index % gradients.length];
                        
                        return (
                            <div 
                                key={role.id} 
                                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between hover:-translate-y-1 group"
                            >
                                {/* Role Card Top Header bar */}
                                <div className={`h-1.5 bg-gradient-to-r ${roleGradient}`} />
                                
                                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${roleGradient} text-white`}>
                                                    <Shield className="w-4 h-4" />
                                                </div>
                                                <h3 className="text-base font-bold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                                                    {role.name}
                                                </h3>
                                            </div>
                                            
                                            <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditRole(role)}
                                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit Role"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRole(role.id)}
                                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Delete Role"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <p className="text-xs text-slate-500 mt-2.5 leading-relaxed min-h-[32px] line-clamp-2">
                                            {role.description || "No description provided for this role."}
                                        </p>
                                        
                                        {/* Assigned Teachers Badge */}
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg mt-3.5 w-fit">
                                            <Users className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="font-bold text-slate-700">{role._count?.teachers || 0}</span>
                                            <span className="text-slate-500">teachers assigned</span>
                                        </div>
                                    </div>
                                    
                                    {/* Privileges/Permissions progress bar */}
                                    <div className="pt-4 border-t border-slate-100 space-y-3">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                <Key className="w-3 h-3 text-slate-400" /> Privileges
                                            </span>
                                            <span className="font-bold text-slate-700">{granted}/{total} active</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full bg-gradient-to-r ${roleGradient} rounded-full transition-all duration-500`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        
                                        {/* Tag list */}
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {activeCategories.slice(0, 3).map((cat, idx) => (
                                                <span key={idx} className="text-[10px] font-extrabold bg-slate-50 text-slate-600 border border-slate-200/60 px-2 py-0.5 rounded-md">
                                                    {cat}
                                                </span>
                                            ))}
                                            {activeCategories.length > 3 && (
                                                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
                                                    +{activeCategories.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 transform transition-all duration-300 scale-100">
                            
                            {/* Sticky Modal Header */}
                            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                                            {editingRole ? 'Edit Role Details' : 'Create New Custom Role'}
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium">Configure authority status and privileges</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowModal(false)} 
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
                                {/* Basic Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                    <div className="md:col-span-1 space-y-1">
                                        <h3 className="font-bold text-sm text-slate-800">Role Basics</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">Give the role a clear, descriptive name and purpose. For example: Coordinator, Content Creator.</p>
                                    </div>
                                    <div className="md:col-span-2 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Name *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-slate-800"
                                                placeholder="e.g. Senior Instructor"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                className="w-full px-3.5 py-2 text-sm border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium text-slate-800"
                                                placeholder="What is this custom role responsible for?"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Permissions Grid */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">Access Control & Privileges</h3>
                                            <p className="text-xs text-slate-500">Toggle operational features that this role has authorization to access.</p>
                                        </div>
                                        {/* Global Select All / None */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => {
                                                        const newPerms = { ...prev.permissions };
                                                        Object.keys(newPerms).forEach(res => {
                                                            Object.keys(newPerms[res]).forEach(act => {
                                                                newPerms[res][act] = true;
                                                            });
                                                        });
                                                        return { ...prev, permissions: newPerms };
                                                    });
                                                }}
                                                className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => {
                                                        const newPerms = { ...prev.permissions };
                                                        Object.keys(newPerms).forEach(res => {
                                                            Object.keys(newPerms[res]).forEach(act => {
                                                                newPerms[res][act] = false;
                                                            });
                                                        });
                                                        return { ...prev, permissions: newPerms };
                                                    });
                                                }}
                                                className="text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:bg-slate-100 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                                            >
                                                Deselect All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grid of grouped cards */}
                                    <div className="grid grid-cols-1 gap-6">
                                        {permissionGroups.map((group, grpIdx) => {
                                            const GroupIcon = group.icon;
                                            return (
                                                <div key={grpIdx} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
                                                    {/* Group Header */}
                                                    <div className="bg-slate-50/50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`p-1.5 rounded-lg border ${group.color}`}>
                                                                <GroupIcon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-sm text-slate-800 tracking-tight">{group.title}</h4>
                                                                <p className="text-[10px] text-slate-400 font-medium">{group.description}</p>
                                                            </div>
                                                        </div>
                                                        {/* Select All inside Group Toggle */}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const allSelectedInGroup = group.resources.every(res => 
                                                                    Object.values(formData.permissions[res] || {}).every(v => v === true)
                                                                );
                                                                setFormData(prev => {
                                                                    const newPerms = { ...prev.permissions };
                                                                    group.resources.forEach(res => {
                                                                        const updatedActions = { ...newPerms[res] };
                                                                        Object.keys(updatedActions).forEach(act => {
                                                                            updatedActions[act] = !allSelectedInGroup;
                                                                        });
                                                                        newPerms[res] = updatedActions;
                                                                    });
                                                                    return { ...prev, permissions: newPerms };
                                                                });
                                                            }}
                                                            className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100/80 hover:bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50 transition-colors"
                                                        >
                                                            Toggle Group
                                                        </button>
                                                    </div>

                                                    {/* Group Grid Content */}
                                                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {group.resources.map(resource => {
                                                            const label = permissionLabels[resource] || resource;
                                                            const actions = formData.permissions[resource] || {};
                                                            if (Object.keys(actions).length === 0) return null;
                                                            
                                                            const allChecked = Object.values(actions).every(v => v === true);
                                                            
                                                            return (
                                                                <div 
                                                                    key={resource} 
                                                                    className="bg-slate-50/40 hover:bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-all space-y-3"
                                                                >
                                                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                                                        <span className="text-xs font-bold text-slate-800 tracking-tight">{label}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFormData(prev => {
                                                                                    const newPerms = { ...prev.permissions };
                                                                                    const updatedActions = { ...newPerms[resource] };
                                                                                    Object.keys(updatedActions).forEach(act => {
                                                                                        updatedActions[act] = !allChecked;
                                                                                    });
                                                                                    newPerms[resource] = updatedActions;
                                                                                    return { ...prev, permissions: newPerms };
                                                                                });
                                                                            }}
                                                                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
                                                                                allChecked 
                                                                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                                                                    : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                                                                            }`}
                                                                        >
                                                                            {allChecked ? 'Clear' : 'All'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                                        {Object.entries(actions).map(([action, isChecked]) => (
                                                                            <button
                                                                                type="button"
                                                                                key={action}
                                                                                onClick={() => togglePermission(resource, action)}
                                                                                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                                                                    isChecked
                                                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-100'
                                                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                                                                }`}
                                                                            >
                                                                                {isChecked ? <Check className="w-3 h-3 shrink-0" /> : null}
                                                                                <span className="capitalize">{action}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Modal Actions Sticky Bottom Footer */}
                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 bg-white sticky bottom-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-6 py-2 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-100 hover:-translate-y-0.5 transition-all text-sm"
                                    >
                                        <Save className="w-4 h-4" /> {editingRole ? 'Update Custom Role' : 'Create Custom Role'}
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
