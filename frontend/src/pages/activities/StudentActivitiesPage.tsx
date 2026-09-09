import { useState, useEffect, useMemo } from 'react';
import { Play, Trophy, Clock, Star, Gamepad2, Search, Layers, Folder, Filter, Sparkles, CheckCircle2, ChevronRight, X } from 'lucide-react';
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
import CodingIDEGame from '../../components/activities/games/CodingIDEGame.tsx';
import CodingLeetcodeGame from '../../components/activities/games/CodingLeetcodeGame.tsx';
import { usePageTitle } from "@/hooks/usePageTitle";

const getRandomGradient = (seed: number = 0) => {
  const gradients = [
    'from-saBlue to-saBlueLight',
    'from-saVividOrange to-orange-400',
    'from-saBlueLight to-blue-400',
    'from-orange-500 to-saVividOrange',
    'from-saBlue to-blue-600',
    'from-indigo-600 to-saBlue',
    'from-teal-500 to-emerald-600',
    'from-purple-600 to-indigo-600',
    'from-amber-500 to-saVividOrange',
    'from-rose-500 to-orange-500',
  ];
  return gradients[seed % gradients.length];
};

export default function StudentActivitiesPage() {
  usePageTitle("Student Activities");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Live Quiz State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [activeLiveSession, setActiveLiveSession] = useState<any | null>(null);

  useEffect(() => {
    fetchActivities();
  }, []);

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

  const fetchActivities = async (groupId?: number) => {
    try {
      setLoading(true);
      const params: any = { limit: 1000 };
      if (groupId && groupId > 0) {
        params.group_id = groupId;
      }
      const response = await activityAPI.getForStudent(params);
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
      fetchActivities(selectedGroupId === 'ALL' ? undefined : selectedGroupId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete activity');
    }
  };

  const handleJoinGame = async () => {
    if (joinCode.length < 4) {
      toast.error("Please enter a valid code");
      return;
    }

    try {
      const res = await quizSessionAPI.join(joinCode);
      const session = res.data.data;
      setActiveLiveSession(session);
      setShowJoinModal(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to join session");
    }
  };

  // Filter activities based on search, group, type, and difficulty
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Group Filter
      if (selectedGroupId !== 'ALL' && activity.group_id !== selectedGroupId) {
        return false;
      }

      // Type Filter
      if (selectedType !== 'ALL' && activity.activity_type !== selectedType) {
        return false;
      }

      // Difficulty Filter
      if (selectedDifficulty !== 'ALL' && activity.difficulty !== selectedDifficulty) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = activity.title?.toLowerCase().includes(q);
        const matchesDesc = activity.description?.toLowerCase().includes(q);
        const matchesType = activity.activity_type?.toLowerCase().includes(q);
        const matchesGroup = activity.group?.name?.toLowerCase().includes(q);
        return matchesTitle || matchesDesc || matchesType || matchesGroup;
      }

      return true;
    });
  }, [activities, selectedGroupId, selectedType, selectedDifficulty, searchQuery]);

  // Unique activity types present in current activities
  const availableTypes = useMemo(() => {
    const types = new Set(activities.map((a) => a.activity_type));
    return Array.from(types);
  }, [activities]);

  const activeGroup = useMemo(() => {
    if (selectedGroupId === 'ALL') return null;
    return activityGroups.find((g) => g.id === selectedGroupId) || null;
  }, [activityGroups, selectedGroupId]);

  const renderGame = () => {
    if (activeLiveSession) {
      if (activeLiveSession.activity?.activity_type === 'MATCH_PAIRS') {
        return (
          <StudentLiveMatchPairs
            joinCode={activeLiveSession.join_code}
            initialSession={activeLiveSession}
            onExit={() => setActiveLiveSession(null)}
          />
        );
      } else if (activeLiveSession.activity?.activity_type === 'WORD_SEARCH') {
        return (
          <StudentLiveWordSearch
            joinCode={activeLiveSession.join_code}
            initialSession={activeLiveSession}
            onExit={() => setActiveLiveSession(null)}
          />
        );
      } else if (activeLiveSession.activity?.activity_type === 'TRUE_FALSE') {
        return (
          <StudentLiveTrueFalse
            joinCode={activeLiveSession.join_code}
            initialSession={activeLiveSession}
            onExit={() => setActiveLiveSession(null)}
          />
        );
      }
      return (
        <StudentLiveQuiz
          joinCode={activeLiveSession.join_code}
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
            <p className="text-gray-500">This game type is under construction</p>
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-saBlue"></div>
        <p className="mt-4 text-saBlue font-bold tracking-widest uppercase text-sm animate-pulse">Loading Games & Activities...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* 1. HERO HEADER */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-saBlueDark to-slate-900 text-white p-8 md:p-10 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-saVividOrange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 bg-saBlueLight/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-extrabold uppercase tracking-widest text-saVividOrange">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Learning Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Learning Games & <span className="text-transparent bg-clip-text bg-gradient-to-r from-saVividOrange to-orange-400">Activity Groups</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed font-medium">
              Explore your enrolled activity groups, play interactive challenges, track your scores, and compete with classmates.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <Button
              onClick={() => setShowJoinModal(true)}
              className="h-12 sm:h-14 bg-gradient-to-r from-saVividOrange to-orange-500 hover:from-saVividOrange/90 hover:to-orange-600 text-white text-sm sm:text-base px-6 sm:px-8 rounded-2xl shadow-lg shadow-saVividOrange/30 font-bold tracking-wide transition-all hover:scale-105 active:scale-95"
            >
              <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              Join Live Game
            </Button>
          </div>
        </div>
      </div>

      {/* 2. ENROLLED ACTIVITY GROUPS SELECTOR */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-saBlue/10 text-saBlue rounded-lg">
              <Folder className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-gray-800 tracking-tight">Your Enrolled Activity Groups</h2>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {activityGroups.length} {activityGroups.length === 1 ? 'Group' : 'Groups'} Enrolled
          </span>
        </div>

        {/* Group Filter Chips */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
          {/* All Activities Option */}
          <button
            type="button"
            onClick={() => setSelectedGroupId('ALL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 shadow-xs ${
              selectedGroupId === 'ALL'
                ? 'bg-saBlue text-white shadow-md shadow-saBlue/20 scale-[1.02]'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Activities</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              selectedGroupId === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {activities.length}
            </span>
          </button>

          {/* Enrolled Activity Group Chips */}
          {activityGroups.map((group) => {
            const groupActivitiesCount = activities.filter((a) => a.group_id === group.id).length;
            const isSelected = selectedGroupId === group.id;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 shadow-xs ${
                  isSelected
                    ? 'bg-gradient-to-r from-saVividOrange to-orange-500 text-white shadow-md shadow-saVividOrange/20 scale-[1.02]'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-saVividOrange'}`} />
                <span className="truncate max-w-[200px]" title={group.name}>{group.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {groupActivitiesCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ACTIVE GROUP BANNER (When a group is selected) */}
      {activeGroup && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-saVividOrange/10 via-orange-50 to-white border border-saVividOrange/20 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-saVividOrange to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-saVividOrange/20">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-saVividOrange text-white text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.2 border-none">
                  Active Activity Group
                </Badge>
                <span className="text-xs text-gray-400 font-bold">• ID #{activeGroup.id}</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">{activeGroup.name}</h3>
              {activeGroup.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2 max-w-2xl">{activeGroup.description}</p>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedGroupId('ALL')}
            className="text-xs font-bold text-gray-500 hover:text-saBlue hover:bg-white/80 rounded-xl shrink-0"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Show All Groups
          </Button>
        </div>
      )}

      {/* 4. SEARCH & QUICK FILTERS BAR */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search games by title, group, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 text-xs rounded-xl bg-gray-50/70 border-gray-200 focus:border-saBlue focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type & Difficulty Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs">
              <span className="text-[10px] font-bold text-gray-400 px-2 uppercase tracking-wider">Difficulty:</span>
              {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    selectedDifficulty === diff
                      ? 'bg-saBlue text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  {diff === 'ALL' ? 'All' : diff}
                </button>
              ))}
            </div>

            {/* Clear All Filters Button */}
            {(selectedGroupId !== 'ALL' || selectedType !== 'ALL' || selectedDifficulty !== 'ALL' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedGroupId('ALL');
                  setSelectedType('ALL');
                  setSelectedDifficulty('ALL');
                  setSearchQuery('');
                }}
                className="h-9 px-3 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        {/* Activity Type Chips */}
        {availableTypes.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-gray-100 scrollbar-thin scrollbar-thumb-gray-200">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">Game Types:</span>
            <button
              type="button"
              onClick={() => setSelectedType('ALL')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                selectedType === 'ALL'
                  ? 'bg-saBlue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Types
            </button>
            {availableTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                  selectedType === type
                    ? 'bg-saBlue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. ACTIVITIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredActivities.map((activity, idx) => (
          <Card
            key={activity.id}
            className="overflow-hidden bg-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 rounded-3xl border border-gray-100 flex flex-col group"
          >
            {/* Card Cover & Header */}
            {activity.cover_image || activity.group?.cover_image ? (
              <div className="w-full h-44 relative overflow-hidden bg-gray-900">
                <img
                  src={resolveImageUrl(activity.cover_image || activity.group?.cover_image) || activity.cover_image || activity.group?.cover_image}
                  alt={activity.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-between p-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    {activity.group?.name && (
                      <Badge className="bg-white/90 backdrop-blur-md text-gray-900 border-none font-bold text-[10px] shadow-sm max-w-[160px] truncate">
                        <Folder className="w-3 h-3 mr-1 text-saVividOrange shrink-0" />
                        <span className="truncate">{activity.group.name}</span>
                      </Badge>
                    )}
                    <Badge className="bg-black/50 backdrop-blur-md text-white border-none font-extrabold text-[10px] uppercase ml-auto">
                      {activity.activity_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {/* Title overlay */}
                  <h3 className="text-lg font-black text-white drop-shadow-md line-clamp-2 leading-tight">
                    {activity.title}
                  </h3>
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-44 bg-gradient-to-br ${getRandomGradient(idx)} flex flex-col justify-between p-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500`}
              >
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="flex items-center justify-between gap-2 relative z-10">
                  {activity.group?.name && (
                    <Badge className="bg-white/90 backdrop-blur-md text-gray-900 border-none font-bold text-[10px] shadow-sm max-w-[160px] truncate">
                      <Folder className="w-3 h-3 mr-1 text-saVividOrange shrink-0" />
                      <span className="truncate">{activity.group.name}</span>
                    </Badge>
                  )}
                  <Badge className="bg-black/30 backdrop-blur-md text-white border-none font-extrabold text-[10px] uppercase ml-auto">
                    {activity.activity_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <h3 className="text-xl font-black text-white drop-shadow-lg relative z-10 leading-tight line-clamp-2">
                  {activity.title}
                </h3>
              </div>
            )}

            {/* Card Content Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Activity Group Name Tag (if no cover) */}
                {activity.group?.name && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-saBlue bg-saBlue/5 px-2.5 py-1 rounded-xl w-fit">
                    <Folder className="w-3.5 h-3.5 text-saBlue" />
                    <span className="truncate max-w-[220px]" title={activity.group.name}>
                      {activity.group.name}
                    </span>
                  </div>
                )}

                {/* Description */}
                {activity.description && (
                  <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                    {activity.description}
                  </p>
                )}

                {/* Stats & Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide ${
                    activity.difficulty === 'EASY'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : activity.difficulty === 'MEDIUM'
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  }`}>
                    {activity.difficulty}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-saVividOrange/10 text-saVividOrange ring-1 ring-saVividOrange/20 flex items-center">
                    <Trophy className="w-3 h-3 mr-1" />
                    {activity.points} pts
                  </span>

                  {activity.estimated_time && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-saBlue/10 text-saBlue ring-1 ring-saBlue/20 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.estimated_time}m
                    </span>
                  )}
                </div>

                {/* Best Score Pill */}
                {activity.attempts && activity.attempts.length > 0 && (
                  <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Best Score</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-100 shadow-xs">
                      {activity.attempts[0].score}/{activity.attempts[0].max_score}
                    </span>
                  </div>
                )}
              </div>

              {/* Play Action Button */}
              <div className="pt-2">
                <Button
                  onClick={() => handlePlayActivity(activity)}
                  className="w-full h-11 bg-saBlue hover:bg-saBlue/90 text-white rounded-xl font-bold text-xs tracking-wide shadow-md shadow-saBlue/20 group-hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play Game
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* EMPTY STATES */}
      {activities.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
          <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-gray-800 mb-2">
            No Activities Available Yet
          </h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            You are not enrolled in any published activity groups or no games have been published yet. Please contact your teacher or administrator to get enrolled!
          </p>
        </div>
      )}

      {activities.length > 0 && filteredActivities.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-gray-800 mb-2">
            No games match your current filter
          </h3>
          <p className="text-gray-500 text-xs mb-6 max-w-md mx-auto">
            Try adjusting your search query, changing the difficulty, or selecting a different activity group.
          </p>
          <Button
            onClick={() => {
              setSelectedGroupId('ALL');
              setSelectedType('ALL');
              setSelectedDifficulty('ALL');
              setSearchQuery('');
            }}
            className="rounded-xl bg-saBlue text-xs font-bold text-white px-5"
          >
            Clear All Filters
          </Button>
        </div>
      )}

      {/* JOIN GAME MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="p-8 w-full max-w-md bg-white rounded-3xl shadow-2xl border-0 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-saBlue" />
              </div>
            </div>
            <h3 className="text-2xl font-black mb-2 text-center text-gray-900">Join Live Game</h3>
            <p className="text-gray-500 text-center text-xs mb-8">Enter your 6-character game code below to join your teacher's live session.</p>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="text-center text-3xl font-black tracking-[0.3em] uppercase mb-8 h-16 rounded-2xl border-2 border-gray-200 focus:border-saBlue focus:ring-saBlue/20"
              maxLength={6}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50 font-bold text-xs" onClick={() => setShowJoinModal(false)}>Cancel</Button>
              <Button className="flex-1 h-12 rounded-xl bg-saVividOrange hover:bg-saVividOrange/90 font-bold text-xs shadow-lg shadow-saVividOrange/20 text-white" onClick={handleJoinGame}>Join Now</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

