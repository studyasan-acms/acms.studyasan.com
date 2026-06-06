import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Users, Trophy, Radio, Presentation, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { activityAPI, activityGroupAPI } from '../../services/activity.service';
import type { Activity, ActivityGroup, ActivityType } from '../../types/activity';
import ActivityForm from '../../components/activities/admin/ActivityForm.tsx';
import ActivityAttemptsModal from '../../components/activities/admin/ActivityAttemptsModal.tsx';
import { useNavigate } from 'react-router-dom';
import TeacherQuizHost from '../../components/activities/admin/TeacherQuizHost.tsx';
import MatchPairsGame from '../../components/activities/games/MatchPairsGame.tsx';
import QuizGameComponent from '../../components/activities/games/QuizGameComponent.tsx';
import WordSearchGame from '../../components/activities/games/WordSearchGame.tsx';
import TrueFalseGame from '../../components/activities/games/TrueFalseGame.tsx';
import ChessGame from '../../components/activities/games/ChessGame.tsx';
import HangmanGame from '../../components/activities/games/HangmanGame.tsx';
import SudokuGame from '../../components/activities/games/SudokuGame.tsx';
import AbacusGame from '../../components/activities/games/AbacusGame';
import { toast } from 'sonner';
import { usePageTitle } from "@/hooks/usePageTitle";
import { resolveImageUrl } from '@/lib/utils';

const getRandomGradient = () => {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-green-500 to-teal-500',
    'from-orange-500 to-yellow-500',
    'from-blue-400 to-indigo-400', // Changed to lighter blue/indigo or just blue
    'from-amber-500 to-orange-500',
    'from-cyan-500 to-blue-500',
    'from-teal-500 to-green-500',
    'from-yellow-400 to-orange-400',
    'from-sky-500 to-blue-600',
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};

export default function ActivitiesPage() {
  usePageTitle("Activities");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [viewingAttempts, setViewingAttempts] = useState<Activity | null>(null);
  const [hostingActivity, setHostingActivity] = useState<Activity | null>(null);
  const [playingActivity, setPlayingActivity] = useState<Activity | null>(null);
  const [playingActivityData, setPlayingActivityData] = useState<Activity | null>(null);
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
    navigate('/dashboard/activities/create');
  };

  const handleEdit = async (activity: Activity) => {
    try {
      navigate(`/dashboard/activities/${activity.id}/edit`);
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
      CHESS: 'Chess',
      HANGMAN: 'Hangman',
      SUDOKU: 'Sudoku',
      ABACUS: 'Abacus',
    };
    return labels[type];
  };

  const renderPreviewGame = (activity: Activity) => {
    const gameProps = {
      activity: playingActivityData || activity,
      attemptId: null, // No attempt ID for preview (won't save data)
      onComplete: () => {
        setPlayingActivity(null);
        setPlayingActivityData(null);
      }, // Just close on complete
      onCancel: () => {
        setPlayingActivity(null);
        setPlayingActivityData(null);
      },
    };

    switch (activity.activity_type) {
      case 'MATCH_PAIRS':
        return <MatchPairsGame {...gameProps} />;
      case 'QUIZ_GAME':
        return <QuizGameComponent {...gameProps} />;
      case 'WORD_SEARCH':
        return <WordSearchGame {...gameProps} />;
      case 'TRUE_FALSE':
        return <TrueFalseGame {...gameProps} />;
      case 'CHESS':
        return <ChessGame {...gameProps} />;
      case 'HANGMAN':
        return <HangmanGame {...gameProps} />;
      case 'SUDOKU':
        return <SudokuGame {...gameProps} />;
      case 'ABACUS':
        return <AbacusGame {...gameProps} />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">This game type is not available for preview</p>
            <Button onClick={() => setPlayingActivity(null)} className="mt-4">
              Close
            </Button>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Activities</h1>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Activity
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Group</label>
            <select
              className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm"
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
              className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm"
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
              <option value="CHESS">Chess</option>
              <option value="HANGMAN">Hangman</option>
              <option value="SUDOKU">Sudoku</option>
              <option value="ABACUS">Abacus</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm"
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
              className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm"
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



      {hostingActivity && (
        <TeacherQuizHost
          activity={hostingActivity}
          onClose={() => setHostingActivity(null)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {activities.map((activity) => (
          <Card key={activity.id} className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold mb-1 truncate">{activity.title}</h3>
                <p className="text-sm text-gray-500">
                  {getActivityTypeLabel(activity.activity_type)}
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(activity)} className="p-1 sm:p-2">
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(activity.id)}
                  className="p-1 sm:p-2"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                </Button>
              </div>
            </div>

            {activity.cover_image || activity.group?.cover_image ? (
              <div className="w-full h-32 sm:h-40 rounded-md mb-3 overflow-hidden bg-gray-100">
                <img
                  src={resolveImageUrl(activity.cover_image || activity.group?.cover_image) || activity.cover_image || activity.group?.cover_image}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`w-full h-32 sm:h-40 rounded-md mb-3 bg-gradient-to-br ${getRandomGradient()} flex items-center justify-center`}>
                <h3 className="text-lg sm:text-2xl font-bold text-white text-center px-4">
                  {activity.title}
                </h3>
              </div>
            )}

            {activity.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {activity.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {activity.difficulty}
              </span>
              <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                {activity.points} points
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="text-xs sm:text-sm">{activity._count?.enrollments || 0}</span>
              </div>
              <div className="flex items-center">
                <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="text-xs sm:text-sm">{activity._count?.attempts || 0}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 sm:gap-2 pt-3 border-t">
              <Button
                variant={activity.is_published ? 'outline' : 'default'}
                size="sm"
                onClick={() =>
                  handleTogglePublish(activity.id, activity.is_published)
                }
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <span className="hidden sm:inline">{activity.is_published ? 'Unpublish' : 'Publish'}</span>
                <span className="sm:hidden">{activity.is_published ? 'Unpub' : 'Pub'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingAttempts(activity)}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <Trophy className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Scores</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await activityAPI.getById(activity.id);
                    setPlayingActivityData(response.data.data);
                    setPlayingActivity(activity);
                  } catch (error: any) {
                    toast.error('Failed to load activity details');
                  }
                }}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <Play className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Play</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setHostingActivity(activity)}
                className="bg-saVividOrange hover:bg-amber-600 text-white text-xs sm:text-sm px-2 sm:px-3"
              >
                <Presentation className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Host Game</span>
                <span className="sm:hidden">Host</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <Play className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">
            No Activities Yet
          </h3>
          <p className="text-gray-500 mb-4 px-4">
            Create your first activity to get started
          </p>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
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

      {/* Play Activity Modal */}
      {playingActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-3 sm:p-4 border-b">
              <h2 className="text-lg sm:text-xl font-bold truncate pr-2">Preview: {playingActivity.title}</h2>
              <Button variant="ghost" onClick={() => {
                setPlayingActivity(null);
                setPlayingActivityData(null);
              }} className="p-1 sm:p-2">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
            <div className="p-2 sm:p-4 max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)] overflow-auto">
              {renderPreviewGame(playingActivity)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
