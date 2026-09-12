import { useState, useEffect, useMemo } from 'react';
import { 
  Play, Trophy, Clock, Star, Gamepad2, Search, Layers, Folder, Filter, 
  CheckCircle2, X, LayoutGrid, List, ChevronLeft, ChevronRight, 
  ArrowUpDown, Sparkles, Award, Target, Flame, HelpCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { activityAPI, activityAttemptAPI, quizSessionAPI } from '../../services/activity.service';
import { resolveImageUrl } from '@/lib/utils';
import type { Activity, ActivityGroup } from '../../types/activity';
import { toast } from 'sonner';
import MatchPairsGame from '../../components/activities/games/MatchPairsGame.tsx';
import QuizGameComponent from '../../components/activities/games/QuizGameComponent.tsx';
import WordSearchGame from '../../components/activities/games/WordSearchGame.tsx';
import TrueFalseGame from '../../components/activities/games/TrueFalseGame.tsx';
import ChessGame from '../../components/activities/games/ChessGame.tsx';
import HangmanGame from '../../components/activities/games/HangmanGame.tsx';
import SudokuGame from '../../components/activities/games/SudokuGame.tsx';
import AbacusGame from '../../components/activities/games/AbacusGame';
import StudentLiveQuiz from '../../components/activities/games/StudentLiveQuiz.tsx';
import StudentLiveMatchPairs from '../../components/activities/games/StudentLiveMatchPairs.tsx';
import StudentLiveWordSearch from '../../components/activities/games/StudentLiveWordSearch.tsx';
import StudentLiveTrueFalse from '../../components/activities/games/StudentLiveTrueFalse.tsx';
import StudentLiveGameWrapper from '../../components/activities/games/StudentLiveGameWrapper.tsx';
import CodingIDEGame from '../../components/activities/games/CodingIDEGame.tsx';
import CodingLeetcodeGame from '../../components/activities/games/CodingLeetcodeGame.tsx';
import { usePageTitle } from "@/hooks/usePageTitle";

const getRandomGradient = (seed: number = 0) => {
  const gradients = [
    'from-blue-600 to-indigo-600',
    'from-indigo-600 to-purple-600',
    'from-teal-600 to-emerald-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-sky-500 to-blue-600',
    'from-violet-600 to-indigo-600',
    'from-cyan-600 to-blue-600',
  ];
  return gradients[seed % gradients.length];
};

export default function StudentActivitiesPage() {
  usePageTitle("Learning Games");

  // Main Data States
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortOption, setSortOption] = useState<string>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Active Game / Play State
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  // Live Session State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [activeLiveSession, setActiveLiveSession] = useState<any | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 whenever filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedGroupId, selectedType, selectedDifficulty, sortOption, itemsPerPage]);

  // Fetch student activities & enrolled groups
  useEffect(() => {
    fetchActivities();
  }, []);

  // Lock scroll when playing
  useEffect(() => {
    if (selectedActivity || activeLiveSession) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedActivity, activeLiveSession]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getForStudent({ limit: 1000 });
      const data = response.data.data;
      setActivities(data.activities || []);
      if (data.activityGroups) {
        setActivityGroups(data.activityGroups);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayActivity = async (activity: Activity) => {
    try {
      const response = await activityAttemptAPI.start(activity.id);
      setAttemptId(response.data.data.id);
      setSelectedActivity(activity);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start activity');
    }
  };

  const handleCompleteActivity = async (score: number, timeTaken: number) => {
    if (!attemptId) return;

    try {
      await activityAttemptAPI.complete(attemptId, timeTaken, score);
      toast.success(`Activity completed! Score: ${score}`);
      setSelectedActivity(null);
      setAttemptId(null);
      fetchActivities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete activity');
    }
  };

  const handleJoinGame = async () => {
    if (joinCode.trim().length < 4) {
      toast.error("Please enter a valid game code");
      return;
    }

    try {
      const res = await quizSessionAPI.join(joinCode.trim());
      const session = res.data.data;
      if (session.activity_id) {
        try {
          const attemptRes = await activityAttemptAPI.start(session.activity_id, session.id);
          setAttemptId(attemptRes.data.data.id);
        } catch (e) {
          console.warn('Could not pre-start session attempt', e);
        }
      }
      setActiveLiveSession(session);
      setShowJoinModal(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to join session");
    }
  };

  // Filtered & Sorted Activities
  const filteredAndSortedActivities = useMemo(() => {
    const list = activities.filter((activity) => {
      // Group Filter
      if (selectedGroupId !== 'all' && String(activity.group_id) !== selectedGroupId) {
        return false;
      }

      // Type Filter
      if (selectedType !== 'all' && activity.activity_type !== selectedType) {
        return false;
      }

      // Difficulty Filter
      if (selectedDifficulty !== 'all' && activity.difficulty !== selectedDifficulty) {
        return false;
      }

      // Search Query
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchesTitle = activity.title?.toLowerCase().includes(q);
        const matchesDesc = activity.description?.toLowerCase().includes(q);
        const matchesType = activity.activity_type?.toLowerCase().includes(q);
        const matchesGroup = activity.group?.name?.toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesType || matchesGroup;
      }

      return true;
    });

    // Sort
    return list.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'points_desc':
          return (b.points || 0) - (a.points || 0);
        case 'points_asc':
          return (a.points || 0) - (b.points || 0);
        case 'time_asc':
          return (a.estimated_time || 999) - (b.estimated_time || 999);
        case 'time_desc':
          return (b.estimated_time || 0) - (a.estimated_time || 0);
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title_desc':
          return (b.title || '').localeCompare(a.title || '');
        default:
          return 0;
      }
    });
  }, [activities, selectedGroupId, selectedType, selectedDifficulty, debouncedSearch, sortOption]);

  // Pagination Calculations
  const totalItems = filteredAndSortedActivities.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedActivities = useMemo(() => {
    return filteredAndSortedActivities.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedActivities, startIndex, itemsPerPage]);

  // Overall Stats
  const completedGamesCount = useMemo(() => {
    return activities.filter((a) => a.attempts && a.attempts.length > 0).length;
  }, [activities]);

  const totalPointsEarned = useMemo(() => {
    return activities.reduce((acc, a) => acc + (a.attempts?.[0]?.score || 0), 0);
  }, [activities]);

  const isFiltered = selectedGroupId !== 'all' || selectedType !== 'all' || selectedDifficulty !== 'all' || debouncedSearch !== '' || sortOption !== 'newest';

  const resetAllFilters = () => {
    setSelectedGroupId('all');
    setSelectedType('all');
    setSelectedDifficulty('all');
    setSortOption('newest');
    setSearchTerm('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  // Render Full Screen Active Game / Live Session
  const renderGame = () => {
    if (activeLiveSession) {
      const liveActType = activeLiveSession.activity?.activity_type;
      if (liveActType === 'MATCH_PAIRS') {
        return (
          <StudentLiveMatchPairs
            joinCode={activeLiveSession.join_code}
            initialSession={activeLiveSession}
            onExit={() => setActiveLiveSession(null)}
          />
        );
      } else if (liveActType === 'WORD_SEARCH') {
        return (
          <StudentLiveWordSearch
            joinCode={activeLiveSession.join_code}
            initialSession={activeLiveSession}
            onExit={() => setActiveLiveSession(null)}
          />
        );
      } else if (liveActType === 'TRUE_FALSE') {
        return (
          <StudentLiveTrueFalse
            joinCode={activeLiveSession.join_code}
            initialSession={activeLiveSession}
            onExit={() => setActiveLiveSession(null)}
          />
        );
      } else if (liveActType === 'QUIZ_GAME') {
        return (
          <StudentLiveQuiz
            joinCode={activeLiveSession.join_code}
            initialSession={activeLiveSession}
            onExit={() => setActiveLiveSession(null)}
          />
        );
      }
      return (
        <StudentLiveGameWrapper
          joinCode={activeLiveSession.join_code}
          initialSession={activeLiveSession}
          onExit={() => setActiveLiveSession(null)}
        />
      );
    }

    if (!selectedActivity || !attemptId) return null;

    const gameProps = {
      activity: selectedActivity,
      attemptId,
      onComplete: handleCompleteActivity,
      onCancel: () => {
        setSelectedActivity(null);
        setAttemptId(null);
      },
    };

    switch (selectedActivity.activity_type) {
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
            <p className="text-slate-500">This game type is currently unavailable</p>
            <Button onClick={() => setSelectedActivity(null)} className="mt-4">
              Back to Activities
            </Button>
          </div>
        );
    }
  };

  if (activeLiveSession) {
    return renderGame();
  }

  if (selectedActivity) {
    return <div className="min-h-screen bg-[#061a3a]">{renderGame()}</div>;
  }

  if (loading && activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-saBlue"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Activities...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Learning Games</h1>
          <p className="text-xs sm:text-sm text-slate-500">Play interactive educational games and activities from your enrolled groups.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          {/* View Toggle */}
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
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => setShowJoinModal(true)}
            className="bg-saVividOrange hover:bg-orange-600 text-white rounded-xl h-10 px-5 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Gamepad2 className="w-4 h-4" />
            Join Live Game
          </Button>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-slate-200/80 shadow-xs rounded-2xl bg-white flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Available Games</div>
            <div className="text-xl font-black text-slate-900">{activities.length}</div>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 shadow-xs rounded-2xl bg-white flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Activity Groups</div>
            <div className="text-xl font-black text-slate-900">{activityGroups.length}</div>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 shadow-xs rounded-2xl bg-white flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Completed</div>
            <div className="text-xl font-black text-slate-900">{completedGamesCount}</div>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 shadow-xs rounded-2xl bg-white flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Points Earned</div>
            <div className="text-xl font-black text-slate-900">{totalPointsEarned}</div>
          </div>
        </Card>
      </div>

      {/* 3. ACTIVITY GROUPS TABS */}
      {activityGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Folder className="w-3.5 h-3.5 text-saBlue" />
              <span>Enrolled Activity Groups</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {activityGroups.length} {activityGroups.length === 1 ? 'Group' : 'Groups'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200">
            {/* All Activities Chip */}
            <button
              type="button"
              onClick={() => setSelectedGroupId('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                selectedGroupId === 'all'
                  ? 'bg-saBlue text-white border-saBlue shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Activities</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                selectedGroupId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {activities.length}
              </span>
            </button>

            {/* Individual Group Chips */}
            {activityGroups.map((group) => {
              const count = activities.filter((a) => a.group_id === group.id).length;
              const isSelected = selectedGroupId === String(group.id);

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedGroupId(String(group.id))}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-saBlue text-white border-saBlue shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5 text-saVividOrange" />
                  <span className="truncate max-w-[200px]" title={group.name}>{group.name}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. SEARCH & FILTER TOOLBAR */}
      <Card className="p-4 sm:p-5 border border-slate-200/80 shadow-xs rounded-2xl bg-white space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2 lg:col-span-1 space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 h-10 text-xs rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white focus:border-saBlue"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Group Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Group</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full h-10 px-3 py-2 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-xs cursor-pointer"
            >
              <option value="all">All Groups</option>
              {activityGroups.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Game Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-10 px-3 py-2 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-xs cursor-pointer"
            >
              <option value="all">All Game Types</option>
              <option value="MATCH_PAIRS">Match Pairs</option>
              <option value="QUIZ_GAME">Quiz Game</option>
              <option value="WORD_SEARCH">Word Search</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="CHESS">Chess</option>
              <option value="SUDOKU">Sudoku</option>
              <option value="HANGMAN">Hangman</option>
              <option value="ABACUS">Abacus</option>
              <option value="CODING_IDE">Coding IDE</option>
              <option value="CODING_LEETCODE">LeetCode</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full h-10 px-3 py-2 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-xs cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          {/* Sort Option */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort By</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full h-10 px-3 py-2 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-700 text-xs cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="points_desc">Highest Points</option>
              <option value="points_asc">Lowest Points</option>
              <option value="time_asc">Shortest Time</option>
              <option value="title_asc">Title A-Z</option>
              <option value="title_desc">Title Z-A</option>
            </select>
          </div>
        </div>

        {/* Active Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>Showing <strong className="text-slate-800">{totalItems}</strong> matching {totalItems === 1 ? 'activity' : 'activities'}</span>
            {isFiltered && (
              <span className="text-[10px] font-bold bg-saBlue/10 text-saBlue px-2 py-0.5 rounded-full">Filtered</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Items Per Page */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="h-8 px-2 py-1 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
              </select>
            </div>

            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-8 px-2.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 5. MAIN CONTENT (GRID OR TABLE) */}
      {paginatedActivities.length > 0 ? (
        viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedActivities.map((activity, idx) => (
              <Card
                key={activity.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-md hover:border-slate-300 transition-all duration-200 group"
              >
                <div className="space-y-4 p-5 pb-0">
                  {/* Visual Cover Header */}
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    {activity.cover_image || activity.group?.cover_image ? (
                      <img
                        src={resolveImageUrl(activity.cover_image || activity.group?.cover_image) || activity.cover_image || activity.group?.cover_image}
                        alt={activity.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getRandomGradient(idx)} flex flex-col justify-center items-center p-4 text-center`}>
                        <Gamepad2 className="w-8 h-8 text-white/80 mb-1" />
                        <span className="text-sm font-black text-white line-clamp-1 drop-shadow-xs">
                          {activity.title}
                        </span>
                      </div>
                    )}

                    {/* Overlay Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-10 pointer-events-none">
                      {activity.group?.name && (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs border border-white/20 backdrop-blur-xs truncate max-w-[150px] flex items-center gap-1">
                          <Folder className="w-3 h-3 text-saVividOrange shrink-0" />
                          <span className="truncate">{activity.group.name}</span>
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-white shadow-xs backdrop-blur-xs ml-auto">
                        {activity.activity_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-slate-900 tracking-tight line-clamp-1 group-hover:text-saBlue transition-colors" title={activity.title}>
                      {activity.title}
                    </h3>
                    {activity.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[32px]">
                        {activity.description}
                      </p>
                    )}
                  </div>

                  {/* Attributes Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide ${
                      activity.difficulty === 'EASY'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : activity.difficulty === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                    }`}>
                      {activity.difficulty}
                    </span>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-saVividOrange/10 text-saVividOrange ring-1 ring-saVividOrange/20 flex items-center">
                      <Trophy className="w-3 h-3 mr-1" />
                      {activity.points} pts
                    </span>

                    {activity.estimated_time && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-saBlue/10 text-saBlue ring-1 ring-saBlue/20 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {activity.estimated_time}m
                      </span>
                    )}
                  </div>

                  {/* Best Score Pill */}
                  {activity.attempts && activity.attempts.length > 0 && (
                    <div className="p-2 bg-emerald-50/80 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Best Score</span>
                      </div>
                      <span className="font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-100 shadow-xs text-xs">
                        {activity.attempts[0].score}/{activity.attempts[0].max_score}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-4 mt-3 border-t border-slate-100">
                  <Button
                    onClick={() => handlePlayActivity(activity)}
                    className="w-full bg-saBlue hover:bg-saBlue/90 text-white rounded-xl font-bold text-xs h-10 shadow-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Game
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Game</th>
                    <th className="py-3 px-4">Activity Group</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Difficulty</th>
                    <th className="py-3 px-4">Points / Time</th>
                    <th className="py-3 px-4">Best Score</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedActivities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Game Title */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-saBlue/10 text-saBlue flex items-center justify-center shrink-0">
                            <Gamepad2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate max-w-xs font-bold text-slate-900">{activity.title}</div>
                            {activity.description && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">{activity.description}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Group */}
                      <td className="py-3.5 px-4">
                        {activity.group?.name ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                            <Folder className="w-3 h-3 text-saVividOrange" />
                            {activity.group.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">General</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <Badge className="bg-slate-100 text-slate-700 font-semibold text-[10px] border-slate-200">
                          {activity.activity_type.replace(/_/g, ' ')}
                        </Badge>
                      </td>

                      {/* Difficulty */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          activity.difficulty === 'EASY'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                            : activity.difficulty === 'MEDIUM'
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        }`}>
                          {activity.difficulty}
                        </span>
                      </td>

                      {/* Points / Time */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-saVividOrange font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> {activity.points} pts
                          </span>
                          {activity.estimated_time && (
                            <span className="text-slate-400">• {activity.estimated_time}m</span>
                          )}
                        </div>
                      </td>

                      {/* Best Score */}
                      <td className="py-3.5 px-4">
                        {activity.attempts && activity.attempts.length > 0 ? (
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {activity.attempts[0].score}/{activity.attempts[0].max_score}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handlePlayActivity(activity)}
                          className="bg-saBlue hover:bg-saBlue/90 text-white rounded-xl font-bold text-xs h-8 px-3.5 shadow-xs"
                        >
                          <Play className="w-3 h-3 mr-1 fill-current" />
                          Play
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* EMPTY STATE */
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 max-w-md mx-auto shadow-xs">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No activities found</h3>
          <p className="text-xs text-slate-500 mb-6">
            {isFiltered
              ? 'No games match your current filter or search criteria. Try resetting filters to see all available games.'
              : 'You are not enrolled in any published activity groups yet. Check back soon!'}
          </p>
          {isFiltered && (
            <Button
              onClick={resetAllFilters}
              className="bg-saBlue hover:bg-saBlue/90 text-white rounded-xl h-9 px-4 text-xs font-bold shadow-xs"
            >
              Reset All Filters
            </Button>
          )}
        </div>
      )}

      {/* 6. PAGINATION FOOTER */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{' '}
            <span className="font-bold text-slate-800">{totalItems}</span> activities
          </p>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage((p) => p - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // Only show current page, +/- 2 pages, and first/last page
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => {
                          setCurrentPage(pageNum);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-saBlue text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return (
                      <span key={pageNum} className="px-1 text-slate-400 text-xs font-bold">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="h-9 px-3 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 7. JOIN LIVE GAME MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="p-6 sm:p-8 w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200">
            <div className="w-14 h-14 bg-saBlue/10 text-saBlue rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-1">Join Live Game</h3>
            <p className="text-xs text-slate-500 text-center mb-6">
              Enter the 6-character room code shared by your teacher.
            </p>

            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="GAME CODE"
              className="text-center text-2xl font-black tracking-[0.25em] uppercase mb-6 h-14 rounded-2xl border-2 border-slate-200 focus:border-saBlue focus:ring-saBlue/20"
              maxLength={8}
              autoFocus
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl border-slate-200 font-bold text-xs hover:bg-slate-50"
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl bg-saVividOrange hover:bg-orange-600 font-bold text-xs shadow-xs text-white"
                onClick={handleJoinGame}
              >
                Join Game
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
