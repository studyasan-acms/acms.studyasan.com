import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';
import {
  announcementService,
  boardService,
  classService,
  subjectService,
  activityGroupService,
} from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Megaphone, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multiSelect';
import type { Board, Class, Subject, ActivityGroup } from '@/types';

interface Announcement {
  id: number;
  title: string;
  content: string;
  created_by: number;
  created_at: string;
  creator?: { name: string; email: string };
  target_roles?: string[];
  target_boards?: number[];
  target_classes?: number[];
  target_subjects?: number[];
  target_courses?: number[];
  target_groups?: number[];
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const { permissions } = usePermissions();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Master data states
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<ActivityGroup[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [targetBoards, setTargetBoards] = useState<number[]>([]);
  const [targetClasses, setTargetClasses] = useState<number[]>([]);
  const [targetSubjects, setTargetSubjects] = useState<number[]>([]);
  const [targetGroups, setTargetGroups] = useState<number[]>([]);

  const canManage =
    user?.role === 'ADMIN' ||
    (user?.role === 'TEACHER' && permissions.announcements?.manage);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await announcementService.getAnnouncements();
      setAnnouncements(res.data?.announcements || []);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [boardsRes, classesRes, subjectsRes, groupsRes] = await Promise.all([
          boardService.getAll({ limit: 1000 }),
          classService.getAll({ limit: 1000 }),
          subjectService.getAll({ limit: 1000 }),
          activityGroupService.getAll({ limit: 1000 }),
        ]);

        setBoards(boardsRes.data?.data || []);
        setClasses(classesRes.data?.data || []);
        setSubjects(subjectsRes.data?.data || []);
        setGroups(groupsRes.data?.activityGroups || []);
      } catch (error) {
        console.error('Failed to fetch targeting options data:', error);
      }
    };

    fetchAnnouncements();
    fetchMasterData();
  }, []);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTargetRoles([]);
    setTargetBoards([]);
    setTargetClasses([]);
    setTargetSubjects([]);
    setTargetGroups([]);
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: Announcement) => {
    resetForm();
    setTitle(a.title);
    setContent(a.content);
    setTargetRoles(a.target_roles || []);
    setTargetBoards(a.target_boards || []);
    setTargetClasses(a.target_classes || []);
    setTargetSubjects(a.target_subjects || []);
    setTargetGroups(a.target_groups || []);
    setIsEditing(true);
    setCurrentId(a.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await announcementService.deleteAnnouncement(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast.error('Title and content are required');
      return;
    }

    const payload = {
      title,
      content,
      target_roles: targetRoles.length > 0 ? targetRoles : null,
      target_boards: targetBoards.length > 0 ? targetBoards : null,
      target_classes: targetClasses.length > 0 ? targetClasses : null,
      target_subjects: targetSubjects.length > 0 ? targetSubjects : null,
      target_groups: targetGroups.length > 0 ? targetGroups : null,
    };

    try {
      if (isEditing && currentId) {
        await announcementService.updateAnnouncement(currentId, payload);
        toast.success('Announcement updated');
      } else {
        await announcementService.createAnnouncement(payload);
        toast.success('Announcement created');
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (error) {
      toast.error('Failed to save announcement');
    }
  };

  const toggleRole = (role: string) => {
    if (targetRoles.includes(role)) {
      setTargetRoles(targetRoles.filter((r) => r !== role));
    } else {
      setTargetRoles([...targetRoles, role]);
    }
  };

  if (loading)
    return (
      <div className="p-4 sm:p-8 text-center text-gray-500">
        Loading announcements...
      </div>
    );

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-blue-50 text-blue-600 rounded-lg flex-shrink-0">
            <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Announcements
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
              Stay updated with the latest news and notices
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            onClick={handleOpenCreate}
            className="bg-saVividOrange hover:bg-orange-600 shadow-md w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-3 sm:space-y-4">
        {announcements.length === 0 ? (
          <Card className="border-dashed border-2 bg-gray-50">
            <CardContent className="flex flex-col items-center justify-center h-40 sm:h-48 text-gray-500 px-4 text-center">
              <Megaphone className="w-8 h-8 sm:w-10 sm:h-10 mb-3 text-gray-400" />
              <p className="text-sm sm:text-base">No announcements found.</p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((a) => (
            <Card
              key={a.id}
              className="overflow-hidden hover:shadow-md transition-shadow"
            >
              <CardHeader className="bg-gray-50 border-b border-gray-100 py-3 px-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 space-y-0">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg font-semibold text-gray-800 break-words">
                    {a.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-gray-500">
                    <span className="font-medium text-gray-700 truncate max-w-[150px] sm:max-w-none">
                      {a.creator?.name || 'Admin'}
                    </span>
                    <span className="hidden sm:inline">&bull;</span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex space-x-2 self-end sm:self-auto flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(a)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(a.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-700 leading-relaxed break-words">
                  {a.content}
                </p>

                {canManage &&
                  (a.target_roles?.length ||
                    a.target_boards?.length ||
                    a.target_classes?.length ||
                    a.target_subjects?.length ||
                    a.target_groups?.length) ? (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-1.5 sm:gap-2 text-xs text-gray-500">
                    {a.target_roles?.length ? (
                      <span className="bg-gray-100 px-2 py-1 rounded break-all">
                        Roles: {a.target_roles.join(', ')}
                      </span>
                    ) : null}
                    {a.target_boards?.length ? (
                      <span className="bg-gray-100 px-2 py-1 rounded break-all">
                        Boards: {a.target_boards.map(id => boards.find(b => b.id === id)?.name || id).join(', ')}
                      </span>
                    ) : null}
                    {a.target_classes?.length ? (
                      <span className="bg-gray-100 px-2 py-1 rounded break-all">
                        Classes: {a.target_classes.map(id => classes.find(c => c.id === id)?.name || id).join(', ')}
                      </span>
                    ) : null}
                    {a.target_subjects?.length ? (
                      <span className="bg-gray-100 px-2 py-1 rounded break-all">
                        Subjects: {a.target_subjects.map(id => {
                          const sub = subjects.find(s => s.id === id);
                          return sub ? `${sub.name}${sub.class?.name ? ` (${sub.class.name})` : ''}` : id;
                        }).join(', ')}
                      </span>
                    ) : null}
                    {a.target_groups?.length ? (
                      <span className="bg-gray-100 px-2 py-1 rounded break-all">
                        Groups: {a.target_groups.map(id => groups.find(g => g.id === id)?.name || id).join(', ')}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {isEditing ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-3 sm:mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement Title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement here..."
                className="min-h-[120px] sm:min-h-[150px]"
                required
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-sm text-gray-900 mb-2 sm:mb-3">
                Targeting Options (Optional)
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Leave blank to send to everyone.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target Roles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center space-x-2 text-sm bg-gray-50 px-3 py-1.5 rounded border cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={targetRoles.includes('STUDENT')}
                        onChange={() => toggleRole('STUDENT')}
                      />
                      <span>Students</span>
                    </label>
                    <label className="flex items-center space-x-2 text-sm bg-gray-50 px-3 py-1.5 rounded border cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={targetRoles.includes('TEACHER')}
                        onChange={() => toggleRole('TEACHER')}
                      />
                      <span>Teachers</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Target Boards
                    </label>
                    <MultiSelect
                      options={boards.map((b) => ({ value: b.id, label: b.name }))}
                      selectedValues={targetBoards}
                      onSelectChange={setTargetBoards}
                      placeholder="Select Target Boards"
                      searchPlaceholder="Search boards..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Target Classes
                    </label>
                    <MultiSelect
                      options={classes.map((c) => ({ value: c.id, label: c.name }))}
                      selectedValues={targetClasses}
                      onSelectChange={setTargetClasses}
                      placeholder="Select Target Classes"
                      searchPlaceholder="Search classes..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Target Subjects
                    </label>
                    <MultiSelect
                      options={subjects.map((s) => ({
                        value: s.id,
                        label: `${s.name}${s.class?.name ? ` (${s.class.name})` : ''}`,
                      }))}
                      selectedValues={targetSubjects}
                      onSelectChange={setTargetSubjects}
                      placeholder="Select Target Subjects"
                      searchPlaceholder="Search subjects..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Target Groups
                    </label>
                    <MultiSelect
                      options={groups.map((g) => ({ value: g.id, label: g.name }))}
                      selectedValues={targetGroups}
                      onSelectChange={setTargetGroups}
                      placeholder="Select Target Groups"
                      searchPlaceholder="Search groups..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-saBlue hover:bg-saBlueDark w-full sm:w-auto"
              >
                {isEditing ? 'Save Changes' : 'Publish'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}