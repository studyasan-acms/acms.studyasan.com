import { useState, useEffect } from 'react';
import { Play, Trophy, Clock, Star, Users, Gamepad2, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input'; // Assuming Input component exists
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'; // Assuming Dialog components exist
import { activityAPI, activityAttemptAPI, quizSessionAPI } from '../../services/activity.service';
import { resolveImageUrl } from '@/lib/utils';

const getRandomGradient = () => {
  const gradients = [
    'from-saBlue to-saBlueLight',
    'from-saVividOrange to-orange-400',
    'from-saBlueLight to-blue-400',
    'from-orange-500 to-saVividOrange',
    'from-saBlue to-blue-600',
    'from-orange-400 to-saVividOrange',
    'from-blue-500 to-saBlueLight',
    'from-saVividOrange to-orange-500',
    'from-saBlueLight to-saBlue',
    'from-yellow-500 to-saVividOrange',
  ];
  return gradients[Math.floor(Math.random() * gradients.length)];
};
import type { Activity } from '../../types/activity';
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
import { usePageTitle } from "@/hooks/usePageTitle";

export default function StudentActivitiesPage() {
  usePageTitle("Student Activities");
  const [activities, setActivities] = useState<Activity[]>([]);
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

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activityAPI.getForStudent();
      setActivities(response.data.data.activities || []);
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
      await activityAttemptAPI.complete(attemptId, timeTaken);
      toast.success(`Activity completed! Score: ${score}`);
      setSelectedActivity(null);
      setAttemptId(null);
      fetchActivities();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete activity');
    }
  };

  const handleJoinGame = async () => {
    if (joinCode.length < 4) {
      toast.error("Please enter a valid code");
      return;
    }

    // Fetch session type first
    try {
      const res = await quizSessionAPI.join(joinCode);
      const session = res.data.data;

      // Save session logic or just code + type
      // Ideally we pass the session object to the component to avoid double-fetching
      // But for minimal refactor, we can just set the code and let the component fetch again
      // OR we add a state for `activeSession` and pass it.

      setActiveLiveSession(session);
      setShowJoinModal(false);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to join session");
    }
  };

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
          // We can't easily pass initialSession to StudentLiveQuiz without modifying it, 
          // but if we don't, it will just fetch again, which is fine.
          // Or we update StudentLiveQuiz props too.
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
  // Filter activities based on search query
  const filteredActivities = activities.filter((activity) =>
    activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activity.activity_type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  if (activeLiveSession) {
    return renderGame();
  }

  if (selectedActivity) {
    return <div className="min-h-screen bg-[#061a3a]">{renderGame()}</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-saBlue"></div>
        <p className="mt-4 text-saBlue font-bold tracking-widest uppercase text-sm animate-pulse">Loading Games...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-12 relative">
        <div className="inline-block relative">
          <h1 className="text-4xl md:text-5xl font-black text-saBlue mb-4 drop-shadow-sm">
            Learning Games
          </h1>
          <div className="absolute -top-6 -right-8 text-saVividOrange animate-bounce hidden md:block">
            <Gamepad2 className="w-10 h-10 -rotate-12" />
          </div>
        </div>
        <p className="text-gray-600 mb-8 text-lg md:text-xl font-medium max-w-2xl mx-auto">Immerse yourself in fun, interactive activities designed to supercharge your learning.</p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search games by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-base rounded-2xl border-2 border-gray-200 focus:border-saBlue focus:ring-saBlue/20 shadow-sm"
            />
          </div>
          <Button
            onClick={() => setShowJoinModal(true)}
            className="h-14 bg-gradient-to-r from-saVividOrange to-orange-500 hover:from-saVividOrange/90 hover:to-orange-600 text-lg px-8 py-3 rounded-2xl shadow-lg shadow-saVividOrange/20 transition-all hover:-translate-y-1 w-full sm:w-auto font-bold tracking-wide"
          >
            <Gamepad2 className="w-6 h-6 mr-2" />
            Join Live Game
          </Button>
        </div>
      </div>

      {/* Join Game Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="p-8 w-full max-w-md bg-white rounded-3xl shadow-2xl border-0">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-saBlue" />
              </div>
            </div>
            <h3 className="text-2xl font-black mb-2 text-center text-gray-900">Join Live Game</h3>
            <p className="text-gray-500 text-center mb-8">Enter your 6-character code below to join the fun.</p>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="text-center text-3xl font-black tracking-[0.3em] uppercase mb-8 h-16 rounded-xl border-gray-300 focus:border-saBlue focus:ring-saBlue/20"
              maxLength={6}
            />
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 h-12 rounded-xl border-2 hover:bg-gray-50 font-bold" onClick={() => setShowJoinModal(false)}>Cancel</Button>
              <Button className="flex-1 h-12 rounded-xl bg-saVividOrange hover:bg-saVividOrange/90 font-bold shadow-lg shadow-saVividOrange/20" onClick={handleJoinGame}>Join Now</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredActivities.map((activity) => (
          <Card
            key={activity.id}
            className="overflow-hidden bg-white hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 rounded-3xl border border-gray-100 flex flex-col group"
          >
            {activity.cover_image || activity.group?.cover_image ? (
              <div className="w-full h-40 relative overflow-hidden">
                <img
                  src={resolveImageUrl(activity.cover_image || activity.group?.cover_image) || activity.cover_image || activity.group?.cover_image}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <h3 className="text-xl font-bold text-white text-center px-4 drop-shadow-md">
                    {activity.title}
                  </h3>
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-40 bg-gradient-to-br ${getRandomGradient()} flex items-center justify-center p-6 relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-black/10"></div>
                <h3 className="text-2xl font-black text-white text-center drop-shadow-lg relative z-10 leading-tight">
                  {activity.title}
                </h3>
              </div>
            )}
            <div className="px-6 pb-6 pt-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-saVividOrange/10 rounded-lg">
                  <Star className="w-4 h-4 text-saVividOrange fill-saVividOrange" />
                </div>
                <span className="text-sm font-bold text-gray-700 tracking-wide">{activity.activity_type.replace(/_/g, ' ')}</span>
              </div>

              {activity.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {activity.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-5">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold tracking-wide ${activity.difficulty === 'EASY'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : activity.difficulty === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                  }`}>
                  {activity.difficulty}
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold tracking-wide bg-saVividOrange/10 text-saVividOrange ring-1 ring-saVividOrange/20 flex items-center">
                  <Trophy className="w-3.5 h-3.5 mr-1" />
                  {activity.points} pts
                </span>
                {activity.estimated_time && (
                  <span className="px-3 py-1 rounded-xl text-xs font-bold tracking-wide bg-saBlue/10 text-saBlue ring-1 ring-saBlue/20 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {activity.estimated_time}m
                  </span>
                )}
              </div>

              {activity.attempts && activity.attempts.length > 0 && (
                <div className="mb-5 p-3.5 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-green-700 uppercase tracking-widest">Best Score</span>
                  <span className="text-base font-black text-green-600 bg-white px-2.5 py-1 rounded-lg border border-green-100 shadow-sm">
                    {activity.attempts[0].score}/{activity.attempts[0].max_score}
                  </span>
                </div>
              )}

              <div className="mt-auto pt-2">
                <Button
                  onClick={() => handlePlayActivity(activity)}
                  className="w-full h-12 bg-saBlue hover:bg-saBlue/90 text-white rounded-xl font-bold tracking-wide shadow-md shadow-saBlue/20 group-hover:-translate-y-0.5 transition-all"
                >
                  <Play className="w-4 h-4 mr-2" fill="currentColor" />
                  Play Game
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-12">
          <Play className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No Activities Available
          </h3>
          <p className="text-gray-500">Check back later for new activities!</p>
        </div>
      )}

      {activities.length > 0 && filteredActivities.length === 0 && (
        <div className="text-center py-12 col-span-full">
          <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            No games found
          </h3>
          <p className="text-gray-500">Try searching with different keywords</p>
        </div>
      )}
    </div>
  );
}
