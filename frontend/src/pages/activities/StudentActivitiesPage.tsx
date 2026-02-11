import { useState, useEffect } from 'react';
import { Play, Trophy, Clock, Star, Users, Gamepad2 } from 'lucide-react';
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
import type { Activity } from '../../types/activity';
import { toast } from 'sonner';
import MatchPairsGame from '../../components/activities/games/MatchPairsGame.tsx';
import QuizGameComponent from '../../components/activities/games/QuizGameComponent.tsx';
import WordSearchGame from '../../components/activities/games/WordSearchGame.tsx';
import TrueFalseGame from '../../components/activities/games/TrueFalseGame.tsx';
import ChessGame from '../../components/activities/games/ChessGame.tsx';
import HangmanGame from '../../components/activities/games/HangmanGame.tsx';
import SudokuGame from '../../components/activities/games/SudokuGame.tsx';
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
    return <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">{renderGame()}</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8 relative">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-2">
          Learning Games
        </h1>
        <p className="text-gray-600 mb-6">Choose an activity to play and learn!</p>

        <Button
          onClick={() => setShowJoinModal(true)}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Gamepad2 className="w-6 h-6 mr-2" />
          Join Live Game
        </Button>
      </div>

      {/* Join Game Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 w-full max-w-md bg-white">
            <h3 className="text-2xl font-bold mb-4 text-center">Join with Code</h3>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              className="text-center text-3xl font-mono tracking-widest uppercase mb-6 h-16"
              maxLength={6}
            />
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowJoinModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleJoinGame}>Join!</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activities.map((activity) => (
          <Card
            key={activity.id}
            className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
          >
            {activity.cover_image || activity.group?.cover_image ? (
              <div className="w-full h-32 relative">
                <img
                  src={activity.cover_image || activity.group?.cover_image}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <h3 className="text-2xl font-bold text-white text-center px-4 drop-shadow-md">
                    {activity.title}
                  </h3>
                </div>
              </div>
            ) : (
              <div
                className={`w-full h-32 bg-gradient-to-br ${getRandomGradient()} flex items-center justify-center`}
              >
                <h3 className="text-2xl font-bold text-white text-center px-4">
                  {activity.title}
                </h3>
              </div>
            )}
            <div className="px-6 pb-6 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold text-gray-700">{activity.activity_type}</span>
              </div>

              {activity.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {activity.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${activity.difficulty === 'EASY'
                  ? 'bg-green-100 text-green-800'
                  : activity.difficulty === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                  }`}>
                  {activity.difficulty}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 flex items-center">
                  <Trophy className="w-3 h-3 mr-1" />
                  {activity.points} points
                </span>
                {activity.estimated_time && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {activity.estimated_time} min
                  </span>
                )}
              </div>

              {activity.attempts && activity.attempts.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 font-semibold">
                    Best Score: {activity.attempts[0].score}/{activity.attempts[0].max_score}
                  </p>
                </div>
              )}

              <Button
                onClick={() => handlePlayActivity(activity)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Play Now
              </Button>
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
    </div>
  );
}
