import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Play, Users, Trophy, Radio, 
  Presentation, X, ChevronLeft, ChevronRight, MoreVertical, 
  Loader2, Eye, EyeOff, LayoutGrid, List 
} from 'lucide-react';
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
import CodingIDEGame from '../../components/activities/games/CodingIDEGame.tsx';
import CodingLeetcodeGame from '../../components/activities/games/CodingLeetcodeGame.tsx';
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
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [filters, setFilters] = useState({
    group_id: '',
    activity_type: '',
    difficulty: '',
    is_published: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 12;

  useEffect(() => {
    const handleClose = () => setActiveDropdownId(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  useEffect(() => {
    if (playingActivity) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [playingActivity]);

  const toggleDropdown = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdownId(activeDropdownId === id ? null : id);
  };

  useEffect(() => {
    fetchActivities();
  }, [filters, currentPage]);

  useEffect(() => {
    fetchActivityGroups();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit };
      if (filters.group_id) params.group_id = filters.group_id;
      if (filters.activity_type) params.activity_type = filters.activity_type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.is_published) params.is_published = filters.is_published === 'true';

      const response = await activityAPI.getAll(params);
      setActivities(response.data.data.activities || []);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
      setTotal(response.data.data.pagination?.total || 0);
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
      CODING_IDE: 'Coding IDE',
      CODING_LEETCODE: 'Leetcode Challenge',
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
      case 'CODING_IDE':
        return <CodingIDEGame {...gameProps} />;
      case 'CODING_LEETCODE':
        return <CodingLeetcodeGame {...gameProps} />;
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-saBlue" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading Activities...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10 max-w-7xl space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Activities</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage game content, host live sessions, and track results.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          {/* View Toggle Group */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-saBlue shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-saBlue shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button 
            onClick={handleCreate} 
            className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 px-4 font-bold shadow-md shadow-blue-500/10 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Activity
          </Button>
        </div>
      </div>

      {/* Filters Box */}
      <Card className="p-5 border border-slate-200/80 shadow-xs rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-sm cursor-pointer"
              value={filters.group_id}
              onChange={(e) => {
                setFilters({ ...filters, group_id: e.target.value });
                setCurrentPage(1);
              }}
            >
              <option value="">All Groups</option>
              {activityGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-sm cursor-pointer"
              value={filters.activity_type}
              onChange={(e) => {
                setFilters({ ...filters, activity_type: e.target.value });
                setCurrentPage(1);
              }}
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

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-sm cursor-pointer"
              value={filters.difficulty}
              onChange={(e) => {
                setFilters({ ...filters, difficulty: e.target.value });
                setCurrentPage(1);
              }}
            >
              <option value="">All Levels</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
            <select
              className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-sm cursor-pointer"
              value={filters.is_published}
              onChange={(e) => {
                setFilters({ ...filters, is_published: e.target.value });
                setCurrentPage(1);
              }}
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

      {/* Grid / Table Content Views */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rewards</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Play / Host</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activities.map((activity) => {
                const isDropdownOpen = activeDropdownId === activity.id;
                return (
                  <tr key={activity.id} className="hover:bg-slate-50/40 transition-colors">
                    
                    {/* Activity Title & Group */}
                    <td className="px-5 py-3.5 min-w-[240px]">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-9 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                          {activity.cover_image || activity.group?.cover_image ? (
                            <img
                              src={resolveImageUrl(activity.cover_image || activity.group?.cover_image) || activity.cover_image || activity.group?.cover_image}
                              alt={activity.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getRandomGradient()} flex items-center justify-center`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-800 truncate" title={activity.title}>
                            {activity.title}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 block truncate">
                            {activity.group?.name || 'No Group'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded-lg">
                        {getActivityTypeLabel(activity.activity_type)}
                      </span>
                    </td>

                    {/* Difficulty Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                        activity.difficulty === 'EASY' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/55' 
                          : activity.difficulty === 'HARD'
                          ? 'bg-red-50 text-red-700 border border-red-100/55'
                          : 'bg-blue-50 text-blue-700 border border-blue-100/55'
                      }`}>
                        {activity.difficulty}
                      </span>
                    </td>

                    {/* Rewards */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-bold text-slate-700">
                        {activity.points} EXP
                      </span>
                    </td>

                    {/* Status Dot */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        activity.is_published 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${activity.is_published ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {activity.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>

                    {/* Play/Host buttons */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const response = await activityAPI.getById(activity.id);
                              setPlayingActivityData(response.data.data);
                              setPlayingActivity(activity);
                            } catch (error: any) {
                              toast.error('Failed to load activity details');
                            }
                          }}
                          className="h-8 px-2.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 text-slate-500 fill-current" /> Play
                        </button>
                        <button
                          type="button"
                          onClick={() => setHostingActivity(activity)}
                          className="h-8 px-2.5 rounded-lg bg-saVividOrange hover:bg-orange-600 text-[10px] font-bold text-white transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <Presentation className="w-3.5 h-3.5 mr-1" /> Host
                        </button>
                      </div>
                    </td>

                    {/* Admin settings */}
                    <td className="px-5 py-3.5 text-right relative whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => toggleDropdown(activity.id, e)}
                        className="h-8 w-8 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg inline-flex items-center justify-center transition-colors border border-transparent hover:border-slate-200"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute right-5 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-left animate-in slide-in-from-top-1 duration-100">
                          <button
                            type="button"
                            onClick={() => { handleEdit(activity); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-400" /> Edit Settings
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleTogglePublish(activity.id, activity.is_published); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            {activity.is_published ? (
                              <><EyeOff className="w-3.5 h-3.5 text-slate-400" /> Unpublish</>
                            ) : (
                              <><Eye className="w-3.5 h-3.5 text-slate-400" /> Publish</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setViewingAttempts(activity); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            <Trophy className="w-3.5 h-3.5 text-slate-400" /> Scores & Attempts
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            type="button"
                            onClick={() => { handleDelete(activity.id); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Activity
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity) => {
            const isDropdownOpen = activeDropdownId === activity.id;
            return (
              <Card key={activity.id} className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
                <div className="space-y-4">
                  
                  {/* Visual Cover Asset */}
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    {activity.cover_image || activity.group?.cover_image ? (
                      <img
                        src={resolveImageUrl(activity.cover_image || activity.group?.cover_image) || activity.cover_image || activity.group?.cover_image}
                        alt={activity.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getRandomGradient()} flex items-center justify-center p-4`}>
                        <span className="text-lg font-bold text-white text-center drop-shadow-sm select-none">
                          {activity.title}
                        </span>
                      </div>
                    )}

                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs ${
                        activity.is_published 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-700/80 text-white backdrop-blur-xs'
                      }`}>
                        {activity.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    {/* Actions Dropdown Button Trigger */}
                    <div className="absolute top-3 right-3 z-20">
                      <button
                        type="button"
                        onClick={(e) => toggleDropdown(activity.id, e)}
                        className="h-8 w-8 bg-white/90 hover:bg-white text-slate-600 hover:text-slate-800 rounded-lg flex items-center justify-center shadow-sm backdrop-blur-xs border border-slate-200/50 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Absolute Dropdown Portal Menu */}
                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 animate-in slide-in-from-top-1 duration-100">
                          <button
                            type="button"
                            onClick={() => { handleEdit(activity); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            <Edit className="w-3.5 h-3.5 text-slate-400" /> Edit Settings
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleTogglePublish(activity.id, activity.is_published); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            {activity.is_published ? (
                              <><EyeOff className="w-3.5 h-3.5 text-slate-400" /> Unpublish</>
                            ) : (
                              <><Eye className="w-3.5 h-3.5 text-slate-400" /> Publish</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setViewingAttempts(activity); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                          >
                            <Trophy className="w-3.5 h-3.5 text-slate-400" /> Scores & Attempts
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            type="button"
                            onClick={() => { handleDelete(activity.id); setActiveDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Activity
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text Information block */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {getActivityTypeLabel(activity.activity_type)}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1" title="Enrolled students">
                          <Users className="w-3.5 h-3.5" />
                          <span>{activity._count?.enrollments || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Attempts play count">
                          <Play className="w-3.5 h-3.5" />
                          <span>{activity._count?.attempts || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-base font-bold text-slate-800 line-clamp-1 leading-tight" title={activity.title}>
                      {activity.title}
                    </h3>
                    
                    {activity.description ? (
                      <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed h-8">
                        {activity.description}
                      </p>
                    ) : (
                      <p className="text-slate-400 text-xs italic leading-relaxed h-8">
                        No description provided.
                      </p>
                    )}
                  </div>

                  {/* Score & Reward Badges */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      activity.difficulty === 'EASY' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : activity.difficulty === 'HARD'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                    }`}>
                      {activity.difficulty}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                      {activity.points} EXP Points
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-100">
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
                    className="rounded-xl font-bold text-xs h-9 border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Play className="w-3.5 h-3.5 mr-1 text-slate-500" /> Play Preview
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setHostingActivity(activity)}
                    className="bg-saVividOrange hover:bg-orange-600 text-white rounded-xl font-bold text-xs h-9 shadow-sm shadow-orange-500/10 transition-all flex items-center justify-center animate-none"
                  >
                    <Presentation className="w-3.5 h-3.5 mr-1" /> Host Activity
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activities.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-150 flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Activities Match</h3>
          <p className="text-xs text-slate-500 mb-6">
            There are no activities matching the current filter criteria, or you haven't created any yet.
          </p>
          <Button 
            onClick={handleCreate} 
            className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 px-5 font-bold shadow-md shadow-blue-500/10"
          >
            Create First Activity
          </Button>
        </div>
      )}

      {/* Pagination */}
      {activities.length > 0 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Showing {Math.min((currentPage - 1) * limit + 1, total)} - {Math.min(currentPage * limit, total)} of {total} Activities
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl border border-slate-800/80 flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80 bg-slate-900">
              <h2 className="text-base font-bold text-white truncate pr-4">Play Preview: {playingActivity.title}</h2>
              <Button 
                variant="ghost" 
                onClick={() => {
                  setPlayingActivity(null);
                  setPlayingActivityData(null);
                }} 
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-900/30">
              {renderPreviewGame(playingActivity)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
