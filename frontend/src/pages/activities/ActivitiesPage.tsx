import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Users, Trophy, Radio, Presentation } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { activityAPI, activityGroupAPI } from '../../services/activity.service';
import type { Activity, ActivityGroup, ActivityType } from '../../types/activity';
import ActivityForm from '../../components/activities/admin/ActivityForm.tsx';
import ActivityAttemptsModal from '../../components/activities/admin/ActivityAttemptsModal.tsx';
import TeacherQuizHost from '../../components/activities/admin/TeacherQuizHost.tsx';
import { toast } from 'sonner';

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

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [viewingAttempts, setViewingAttempts] = useState<Activity | null>(null);
  const [hostingActivity, setHostingActivity] = useState<Activity | null>(null);
  const [filters, setFilters] = useState({
    group_id: '',
    activity_type: '',
    difficulty: '',
    is_published: '',
  });

  useEffect(() => {
    fetchActivities();
    fetchActivityGroups();
  }, [filters]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.group_id) params.group_id = filters.group_id;
      if (filters.activity_type) params.activity_type = filters.activity_type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.is_published) params.is_published = filters.is_published === 'true';

      const response = await activityAPI.getAll(params);
      setActivities(response.data.data.activities || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityGroups = async () => {
    try {
      const response = await activityGroupAPI.getAll();
      setActivityGroups(response.data.data.activityGroups || []);
    } catch (error: any) {
      console.error('Failed to fetch activity groups', error);
    }
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setShowForm(true);
  };

  const handleEdit = async (activity: Activity) => {
    try {
      // Fetch the full activity with items
      const response = await activityAPI.getById(activity.id);
      setEditingActivity(response.data.data);
      setShowForm(true);
    } catch (error: any) {
      toast.error('Failed to load activity details');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      await activityAPI.delete(id);
      toast.success('Activity deleted successfully');
      fetchActivities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete activity');
    }
  };

  const handleTogglePublish = async (id: number, currentStatus: boolean) => {
    try {
      await activityAPI.togglePublish(id, !currentStatus);
      toast.success(`Activity ${!currentStatus ? 'published' : 'unpublished'} successfully`);
      fetchActivities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update activity');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingActivity(null);
    fetchActivities();
  };

  const getActivityTypeLabel = (type: ActivityType) => {
    const labels: Record<ActivityType, string> = {
      MATCH_PAIRS: 'Match Pairs',
      WORD_SEARCH: 'Word Search',
      CROSSWORD: 'Crossword',
      FILL_BLANKS: 'Fill in the Blanks',
      DRAG_DROP: 'Drag & Drop',
      MEMORY_GAME: 'Memory Game',
      QUIZ_GAME: 'Quiz Game',
      SEQUENCE_ORDER: 'Sequence Order',
      TRUE_FALSE: 'True/False',
      PICTURE_REVEAL: 'Picture Reveal',
    };
    return labels[type];
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
        <h1 className="text-3xl font-bold">Activities</h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Activity
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Group</label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              value={filters.group_id}
              onChange={(e) => setFilters({ ...filters, group_id: e.target.value })}
            >
              <option value="">All Groups</option>
              {activityGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              value={filters.activity_type}
              onChange={(e) =>
                setFilters({ ...filters, activity_type: e.target.value })
              }
            >
              <option value="">All Types</option>
              <option value="MATCH_PAIRS">Match Pairs</option>
              <option value="WORD_SEARCH">Word Search</option>
              <option value="QUIZ_GAME">Quiz Game</option>
              <option value="TRUE_FALSE">True/False</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              value={filters.difficulty}
              onChange={(e) =>
                setFilters({ ...filters, difficulty: e.target.value })
              }
            >
              <option value="">All Levels</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              className="w-full px-4 py-2 border rounded-lg"
              value={filters.is_published}
              onChange={(e) =>
                setFilters({ ...filters, is_published: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>
        </div>
      </Card>

      {showForm && (
        <ActivityForm
          activity={editingActivity}
          activityGroups={activityGroups}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingActivity(null);
          }}
        />
      )}

      {hostingActivity && (
        <TeacherQuizHost
          activity={hostingActivity}
          onClose={() => setHostingActivity(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity) => (
          <Card key={activity.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">{activity.title}</h3>
                <p className="text-sm text-gray-500">
                  {getActivityTypeLabel(activity.activity_type)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(activity)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(activity.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            </div>

            <div className={`w-full h-40 rounded-md mb-3 bg-gradient-to-br ${getRandomGradient()} flex items-center justify-center`}>
              <h3 className="text-2xl font-bold text-white text-center px-4">
                {activity.title}
              </h3>
            </div>

            {activity.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {activity.description}
              </p>
            )}

            <div className="flex gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {activity.difficulty}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {activity.points} points
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {activity._count?.enrollments || 0}
              </div>
              <div className="flex items-center">
                <Play className="w-4 h-4 mr-1" />
                {activity._count?.attempts || 0}
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant={activity.is_published ? 'outline' : 'default'}
                size="sm"
                onClick={() =>
                  handleTogglePublish(activity.id, activity.is_published)
                }
              >
                {activity.is_published ? 'Unpublish' : 'Publish'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAttempts(activity)}
              >
                <Trophy className="w-3 h-3 mr-1" />
                Scores
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setHostingActivity(activity)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Presentation className="w-3 h-3 mr-1" />
                Host Game
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12">
          <Play className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No Activities Yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first activity to get started
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create Activity
          </Button>
        </div>
      )}

      {/* Activity Attempts Modal */}
      {viewingAttempts && (
        <ActivityAttemptsModal
          activity={viewingAttempts}
          onClose={() => setViewingAttempts(null)}
        />
      )}
    </div>
  );
}
