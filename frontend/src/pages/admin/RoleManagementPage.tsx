import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Save,
  Shield,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Lock,
  Layers,
  Key,
  CheckSquare,
  Square,
  BookOpen,
  Video,
  FileCheck2,
  FileText,
  CreditCard,
  MessageSquare,
  Bell,
  BarChart3,
  HelpCircle,
  CheckCircle2,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { teacherRoleService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DeleteConfirmationModal from '@/components/ui/deleteConfirmationModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  sections: { view: false, create: false, update: false, delete: false },
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

const permissionModules: Array<{
  key: string;
  label: string;
  category: 'Academics' | 'Assessments' | 'Communication' | 'Administration';
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'students', label: 'Students', category: 'Academics', icon: Users },
  { key: 'teachers', label: 'Faculty & Teachers', category: 'Administration', icon: Shield },
  { key: 'subjects', label: 'Subjects & Curriculum', category: 'Academics', icon: BookOpen },
  { key: 'sections', label: 'Sections', category: 'Academics', icon: Users },
  { key: 'boards', label: 'Boards', category: 'Academics', icon: Layers },
  { key: 'classes', label: 'Classes / Grades', category: 'Academics', icon: Layers },
  { key: 'classSessions', label: 'Class Sessions & Live', category: 'Academics', icon: Video },
  { key: 'tests', label: 'Tests & Quizzes', category: 'Assessments', icon: FileCheck2 },
  { key: 'homework', label: 'Homework & Assignments', category: 'Assessments', icon: FileText },
  { key: 'testSeries', label: 'Test Series', category: 'Assessments', icon: FileCheck2 },
  { key: 'activityGroups', label: 'Activity Groups', category: 'Academics', icon: Users },
  { key: 'enrollments', label: 'Enrollments', category: 'Administration', icon: CheckCircle2 },
  { key: 'payments', label: 'Payments & Invoices', category: 'Administration', icon: CreditCard },
  { key: 'announcements', label: 'Announcements', category: 'Communication', icon: Bell },
  { key: 'chat', label: 'Chat & Messaging', category: 'Communication', icon: MessageSquare },
  { key: 'notifications', label: 'Push Notifications', category: 'Communication', icon: Bell },
  { key: 'enquiries', label: 'Student Enquiries', category: 'Communication', icon: HelpCircle },
  { key: 'analytics', label: 'Reports & Analytics', category: 'Administration', icon: BarChart3 },
  { key: 'accountDeletion', label: 'Account Deletion', category: 'Administration', icon: Lock },
];

const categoryTabs = ['All', 'Academics', 'Assessments', 'Communication', 'Administration'] as const;

export default function RoleManagementPage() {
  usePageTitle('Teacher Role Management');
  const [roles, setRoles] = useState<TeacherRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<TeacherRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<typeof categoryTabs[number]>('All');

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<TeacherRole | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    permissions: PermissionsType;
  }>({
    name: '',
    description: '',
    permissions: defaultPermissions,
  });

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherRoleService.getAll();
      if (res.success) {
        setRoles(res.data?.roles || []);
      }
    } catch (error) {
      console.error('Error fetching teacher roles:', error);
      toast.error('Failed to load teacher roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setSelectedCategory('All');
    setFormData({
      name: '',
      description: '',
      permissions: defaultPermissions,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (role: TeacherRole) => {
    setEditingRole(role);
    setSelectedCategory('All');
    const mergedPermissions = Object.fromEntries(
      Object.entries(defaultPermissions).map(([resource, defaults]) => [
        resource,
        { ...defaults, ...(role.permissions?.[resource] || {}) },
      ])
    ) as PermissionsType;

    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: mergedPermissions,
    });
    setShowModal(true);
  };

  const handleDeleteClick = (role: TeacherRole) => {
    setRoleToDelete(role);
    setDeleteModalOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    try {
      await teacherRoleService.delete(roleToDelete.id);
      setRoles(roles.filter((r) => r.id !== roleToDelete.id));
      setDeleteModalOpen(false);
      setRoleToDelete(null);
      toast.success('Role deleted successfully');
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingRole) {
        await teacherRoleService.update(editingRole.id, formData);
        toast.success(`Role "${formData.name}" updated successfully`);
      } else {
        await teacherRoleService.create(formData);
        toast.success(`Role "${formData.name}" created successfully`);
      }
      setShowModal(false);
      fetchRoles();
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.error(error.response?.data?.message || 'Failed to save role');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = (resource: string, action: string) => {
    setFormData((prev) => ({
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

  const toggleModuleAll = (resource: string) => {
    const currentActions = formData.permissions[resource] || {};
    const actionKeys = Object.keys(defaultPermissions[resource] || {});
    const allChecked = actionKeys.every((a) => currentActions[a]);

    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: Object.fromEntries(actionKeys.map((a) => [a, !allChecked])),
      },
    }));
  };

  const handleSelectAll = () => {
    const updated: PermissionsType = {};
    Object.keys(defaultPermissions).forEach((resource) => {
      updated[resource] = {};
      Object.keys(defaultPermissions[resource]).forEach((action) => {
        updated[resource][action] = true;
      });
    });
    setFormData((prev) => ({ ...prev, permissions: updated }));
  };

  const handleDeselectAll = () => {
    setFormData((prev) => ({ ...prev, permissions: defaultPermissions }));
  };

  const handleSelectReadOnly = () => {
    const updated: PermissionsType = {};
    Object.keys(defaultPermissions).forEach((resource) => {
      updated[resource] = {};
      Object.keys(defaultPermissions[resource]).forEach((action) => {
        updated[resource][action] = action === 'view' || action === 'viewAdmin' || action === 'viewAll';
      });
    });
    setFormData((prev) => ({ ...prev, permissions: updated }));
  };

  // Helper to count active modules for a role
  const countActiveModules = (permissions: Record<string, any>) => {
    if (!permissions) return 0;
    return Object.values(permissions).filter((actions) =>
      typeof actions === 'object' && actions !== null && Object.values(actions).some(Boolean)
    ).length;
  };

  // Total assigned faculty count
  const totalAssignedFaculty = useMemo(() => {
    return roles.reduce((acc, r) => acc + (r._count?.teachers || 0), 0);
  }, [roles]);

  // Filtered roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchQuery]);

  // Filtered modules inside modal
  const filteredPermissionModules = useMemo(() => {
    if (selectedCategory === 'All') return permissionModules;
    return permissionModules.filter((m) => m.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 pb-20 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-saBlue/10 text-saBlue flex items-center justify-center font-bold shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                Teacher Role Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Create and manage custom roles with specific granular permissions for faculty.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-saBlue hover:bg-saBlueDark text-white flex items-center justify-center shadow-md shadow-saBlue/20 rounded-xl h-10 sm:h-11 px-4 sm:px-5 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Role
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Roles</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{roles.length}</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">Custom faculty roles</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Faculty</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalAssignedFaculty}</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">Teachers assigned</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Security Modules</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{permissionModules.length}</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
              <Key className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">System features</p>
        </Card>

        <Card className="bg-white border border-slate-200/80 shadow-xs rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">Access Model</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">RBAC</h3>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1.5 sm:mt-2">Role-based control</p>
        </Card>
      </div>

      {/* SEARCH AND VIEW MODE TOOLBAR */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-center justify-between">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search roles by name or description..."
            className="pl-10 h-10 sm:h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white text-xs sm:text-sm focus-visible:ring-saBlue"
          />
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
              viewMode === 'list'
                ? 'bg-white text-saBlue shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <List className="w-3.5 h-3.5" />
            <span>Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              'flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
              viewMode === 'grid'
                ? 'bg-white text-saBlue shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* ROLES CONTENT AREA */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-200/80">
          <div className="w-10 h-10 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading roles...</p>
        </div>
      ) : filteredRoles.length === 0 ? (
        <Card className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-700">No roles found</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No teacher roles match your search term.' : 'Create your first teacher role to get started.'}
          </p>
          <Button
            onClick={handleOpenCreate}
            className="bg-saBlue text-white hover:bg-saBlueDark font-semibold rounded-xl text-xs mt-4"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create New Role
          </Button>
        </Card>
      ) : viewMode === 'list' ? (
        /* LIST TABLE VIEW */
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 border-b border-slate-200">
                  <TableHead className="w-[240px] font-bold text-xs uppercase tracking-wider text-slate-700 pl-4 sm:pl-6">
                    Role Title
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 min-w-[180px] hidden sm:table-cell">
                    Description
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Assigned Faculty
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 hidden md:table-cell">
                    Permissions
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-700 hidden lg:table-cell">
                    Created On
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-slate-700 pr-4 sm:pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => {
                  const activeModules = countActiveModules(role.permissions);
                  const teacherCount = role._count?.teachers || 0;

                  return (
                    <TableRow
                      key={role.id}
                      className="hover:bg-slate-50/70 transition-colors border-b border-slate-100"
                    >
                      <TableCell className="pl-4 sm:pl-6 py-3.5 sm:py-4">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-saBlue/10 text-saBlue border border-saBlue/20 flex items-center justify-center font-bold shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs sm:text-sm">{role.name}</p>
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] bg-blue-50/80 text-saBlue border-blue-200 mt-0.5">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
                        <p className="text-xs text-slate-600 line-clamp-2 max-w-sm">
                          {role.description || <span className="text-slate-400 italic">No description provided</span>}
                        </p>
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold">
                          <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500" />
                          <span>{teacherCount} Teacher{teacherCount === 1 ? '' : 's'}</span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold">
                          <Key className="w-3.5 h-3.5 text-saBlue" />
                          <span>{activeModules} / {permissionModules.length} Modules</span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(role.created_at).toLocaleDateString()}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-4 sm:pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(role)}
                            className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-xl"
                            title="Edit role permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(role)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                            title="Delete role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {filteredRoles.map((role) => {
            const activeModules = countActiveModules(role.permissions);
            const teacherCount = role._count?.teachers || 0;

            return (
              <Card
                key={role.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-saBlue/10 text-saBlue border border-saBlue/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">{role.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {role.description || 'No description provided'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(role)}
                        className="h-8 w-8 text-slate-400 hover:text-saBlue hover:bg-saBlue/10 rounded-xl"
                        title="Edit role"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(role)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        title="Delete role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Card Body Stats */}
                  <div className="p-3.5 sm:p-5 space-y-2.5 sm:space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>Assigned Faculty</span>
                      </div>
                      <span className="font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                        {teacherCount} Teacher{teacherCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        <Key className="w-4 h-4 text-saBlue" />
                        <span>Granted Modules</span>
                      </div>
                      <span className="font-bold text-saBlue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md text-[11px]">
                        {activeModules} / {permissionModules.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Created {new Date(role.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="font-bold text-saBlue hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Configure Permissions →
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ROLE DIALOG - Mobile First & Responsive */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="w-[96vw] sm:max-w-4xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-slate-200">
          {/* Header */}
          <DialogHeader className="p-3.5 sm:p-5 bg-white border-b border-slate-200/80 shrink-0">
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 leading-tight">
                  {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Teacher Role'}
                </DialogTitle>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Define the role name, description, and module access permissions.
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Form Body with Smooth Touch Scroll */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Role Title *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Senior Faculty, Evaluator"
                    className="h-10 sm:h-11 rounded-xl border-slate-200 text-xs sm:text-sm focus-visible:ring-saBlue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of responsibilities..."
                    className="h-10 sm:h-11 rounded-xl border-slate-200 text-xs sm:text-sm focus-visible:ring-saBlue"
                  />
                </div>
              </div>

              {/* Permissions Section Header & Action Toolbar */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Module Permissions
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Configure granular action privileges for this role.
                    </p>
                  </div>

                  {/* Preset Quick Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="rounded-lg text-[11px] h-7.5 px-2.5 text-saBlue border-blue-200 hover:bg-blue-50 font-semibold"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" /> Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectReadOnly}
                      className="rounded-lg text-[11px] h-7.5 px-2.5 text-slate-700 border-slate-200 hover:bg-slate-50 font-semibold"
                    >
                      Read Only
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="rounded-lg text-[11px] h-7.5 px-2.5 text-slate-600 border-slate-200 hover:bg-slate-100 font-semibold"
                    >
                      <Square className="w-3 h-3 mr-1" /> Clear All
                    </Button>
                  </div>
                </div>

                {/* Category Filter Pills (Mobile Friendly) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
                  {categoryTabs.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all border',
                        selectedCategory === cat
                          ? 'bg-saBlue text-white border-saBlue shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Permissions Grid Grouped by Module */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                  {filteredPermissionModules.map(({ key, label, icon: Icon, category }) => {
                    const currentActions = formData.permissions[key] || {};
                    const actionKeys = Object.keys(currentActions);
                    const allSelected = actionKeys.length > 0 && actionKeys.every((a) => currentActions[a]);

                    return (
                      <div
                        key={key}
                        className={cn(
                          'p-3 rounded-2xl border transition-all',
                          allSelected
                            ? 'bg-blue-50/30 border-blue-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        )}
                      >
                        {/* Module Card Top Header */}
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-900 leading-none">{label}</span>
                              <span className="text-[9px] text-slate-400 block mt-0.5">{category}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleModuleAll(key)}
                            className="text-[10px] font-bold text-saBlue hover:underline px-1 py-0.5"
                          >
                            {allSelected ? 'Deselect' : 'All'}
                          </button>
                        </div>

                        {/* Action Checkboxes */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {actionKeys.map((action) => {
                            const isChecked = !!currentActions[action];
                            return (
                              <label
                                key={action}
                                className={cn(
                                  'flex items-center gap-2 p-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all',
                                  isChecked
                                    ? 'bg-white border-saBlue/40 text-saBlue shadow-2xs'
                                    : 'bg-slate-50/60 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePermission(key, action)}
                                  className="rounded text-saBlue focus:ring-saBlue h-3.5 w-3.5 shrink-0"
                                />
                                <span className="capitalize truncate">
                                  {action.replace(/([A-Z])/g, ' $1')}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile First Horizontal Actions Footer */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 flex flex-row items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="flex-1 sm:flex-none rounded-xl text-xs font-semibold h-10 px-4 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none bg-saBlue hover:bg-saBlueDark text-white font-bold rounded-xl text-xs h-10 px-5 shadow-md shadow-saBlue/20"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {editingRole ? 'Save Changes' : 'Create Role'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onCancel={() => setDeleteModalOpen(false)}
        title="Delete Teacher Role"
        message={
          roleToDelete ? (
            <span className="text-sm text-slate-600">
              Are you sure you want to delete the role{' '}
              <strong className="text-slate-900">{roleToDelete.name}</strong>? Faculty members with this role will lose their assigned role permissions.
            </span>
          ) : undefined
        }
        footer={
          <div className="flex flex-row items-center justify-end gap-2 mt-4 w-full">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1 sm:flex-none rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 rounded-xl text-xs font-semibold"
            >
              Delete Role
            </Button>
          </div>
        }
      />
    </div>
  );
}
