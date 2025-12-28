import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FolderOpen, Users, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { activityGroupAPI } from '../../services/activity.service';
const getRandomGradient = () => {
  const gradients = [
    'from-purple-500 to-pink-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-indigo-500 to-purple-500',
    'from-pink-500 to-rose-500',
    'from-cyan-500 to-blue-500',
    'from-teal-500 to-green-500',
    'from-yellow-500 to-orange-500',
    'from-fuchsia-500 to-pink-500',
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};
import type { ActivityGroup } from '../../types/activity';
import ActivityGroupForm from '../../components/activities/admin/ActivityGroupForm.tsx';
import EnrollStudentsToGroupModal from '../../components/activities/admin/EnrollStudentsToGroupModal.tsx';
import AssignTeachersToGroupModal from '../../components/activities/admin/AssignTeachersToGroupModal.tsx';
import { toast } from 'sonner';

export default function ActivityGroupsPage() {
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ActivityGroup | null>(null);
  const [enrollingGroup, setEnrollingGroup] = useState<ActivityGroup | null>(null);
  const [managingTeachersGroup, setManagingTeachersGroup] = useState<ActivityGroup | null>(null);

  useEffect(() => {
    fetchActivityGroups();
  }, []);

  const fetchActivityGroups = async () => {
    try {
      setLoading(true);
      const response = await activityGroupAPI.getAll();
      setActivityGroups(response.data.data.activityGroups || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch activity groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGroup(null);
    setShowForm(true);
  };

  const handleEdit = (group: ActivityGroup) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this activity group?')) return;

    try {
      await activityGroupAPI.delete(id);
      toast.success('Activity group deleted successfully');
      fetchActivityGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete activity group');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingGroup(null);
    fetchActivityGroups();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Activity Groups</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {showForm && (
        <ActivityGroupForm
          group={editingGroup}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingGroup(null);
          }}
        />
      )}
      {enrollingGroup && (
        <EnrollStudentsToGroupModal
          group={enrollingGroup}
          onClose={() => setEnrollingGroup(null)}
          onSuccess={() => {
            setEnrollingGroup(null);
            fetchActivityGroups();
          }}
        />
      )}
      {managingTeachersGroup && (
        <AssignTeachersToGroupModal
          group={managingTeachersGroup}
          onClose={() => setManagingTeachersGroup(null)}
          onSuccess={() => {
            setManagingTeachersGroup(null);
            fetchActivityGroups();
          }}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activityGroups.map((group) => (
          <Card key={group.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <FolderOpen className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-xl font-semibold">{group.name}</h3>
                  <p className="text-sm text-gray-500">
                    {group._count?.activities || 0} activities
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(group)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(group.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>
            
            <div className={`w-full h-40 rounded-md mb-3 bg-gradient-to-br ${getRandomGradient()} flex items-center justify-center`}>
              <h3 className="text-3xl font-bold text-white text-center px-4">
                {group.name}
              </h3>
            </div>
            
            {group.description && (
              <p className="text-gray-600 text-sm mb-3">{group.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = `/dashboard/activities?group_id=${group.id}`)}
              >
                <FolderOpen className="w-3 h-3 mr-1" />
                View Activities
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnrollingGroup(group)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Users className="w-3 h-3 mr-1" />
                Enroll Students
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManagingTeachersGroup(group)}
                className="text-green-600 hover:text-green-700"
              >
                <UserCheck className="w-3 h-3 mr-1" />
                Manage Teachers
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  group.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {group.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {activityGroups.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No Activity Groups Yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first activity group to get started
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </div>
      )}
    </div>
  );
}
