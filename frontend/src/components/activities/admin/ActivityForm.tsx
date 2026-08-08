import { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Sparkles, Loader2, ImagePlus,
  Link, Search, HelpCircle, ToggleLeft, ShieldAlert,
  Layers, Shield, ClipboardList, BarChart2 
} from 'lucide-react';
import { uploadService } from '../../../services/api';

const activityTypeCards = [
  { type: 'MATCH_PAIRS', label: 'Match Pairs', icon: Link, description: 'Connect items from matching columns' },
  { type: 'WORD_SEARCH', label: 'Word Search', icon: Search, description: 'Find hidden words in a letter grid' },
  { type: 'QUIZ_GAME', label: 'Quiz Game', icon: HelpCircle, description: 'Multiple choice trivia questions' },
  { type: 'TRUE_FALSE', label: 'True/False', icon: ToggleLeft, description: 'Identify true or false claims' },
  { type: 'CHESS', label: 'Chess Game', icon: Shield, description: 'Play chess against AI or pass-and-play' },
  { type: 'HANGMAN', label: 'Hangman', icon: ShieldAlert, description: 'Guess the hidden word letter by letter' },
  { type: 'SUDOKU', label: 'Sudoku', icon: Layers, description: 'Classic 9x9 board logic puzzle' },
  { type: 'ABACUS', label: 'Abacus Math', icon: BarChart2, description: 'Place-value abacus arithmetic practice' },
] as const;
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { activityAPI } from '../../../services/activity.service';
import type {
  Activity,
  ActivityGroup,
  ActivityType,
  Difficulty,
  CreateActivityInput,
} from '../../../types/activity';
import { toast } from 'sonner';
import MatchPairsBuilder from './builders/MatchPairsBuilder.tsx';
import WordSearchBuilder from './builders/WordSearchBuilder.tsx';
import FillBlanksBuilder from './builders/FillBlanksBuilder.tsx';
import DragDropBuilder from './builders/DragDropBuilder.tsx';
import MemoryGameBuilder from './builders/MemoryGameBuilder.tsx';
import QuizGameBuilder from './builders/QuizGameBuilder.tsx';
import SequenceOrderBuilder from './builders/SequenceOrderBuilder.tsx';
import TrueFalseBuilder from './builders/TrueFalseBuilder.tsx';
import ChessBuilder from './builders/ChessBuilder.tsx';
import HangmanBuilder from './builders/HangmanBuilder.tsx';
import SudokuBuilder from './builders/SudokuBuilder.tsx';
import AbacusBuilder from './builders/AbacusBuilder';

interface Props {
  activity: Activity | null;
  activityGroups: ActivityGroup[];
  onSuccess: () => void;
  onCancel: () => void;
  isStandalone?: boolean;
}

export default function ActivityForm({
  activity,
  activityGroups,
  onSuccess,
  onCancel,
  isStandalone = false,
}: Props) {
  const [formData, setFormData] = useState<CreateActivityInput>({
    group_id: 0,
    title: '',
    description: '',
    instructions: '',
    cover_image: '',
    activity_type: 'MATCH_PAIRS' as ActivityType,
    difficulty: 'MEDIUM' as Difficulty,
    estimated_time: 10,
    points: 100,
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Default instructions for each activity type
  const getDefaultInstructions = (activityType: ActivityType): string => {
    const instructionsMap: Record<ActivityType, string> = {
      MATCH_PAIRS: 'Click on a term from the left column, then click on its matching definition from the right column. Match all pairs correctly to complete the activity!',
      WORD_SEARCH: 'Find and select all the hidden words in the grid. Click and drag across letters to highlight words. Words can be placed horizontally, vertically, or diagonally.',
      QUIZ_GAME: 'Read each question carefully and select the correct answer from the given options. You have a limited time for each question. Answer all questions to complete the quiz!',
      TRUE_FALSE: 'Read each statement and decide whether it is true or false. Click on the True or False button to submit your answer.',
      FILL_BLANKS: 'Read the sentence and fill in the missing word(s) by typing your answer in the blank space provided.',
      DRAG_DROP: 'Drag items from the left and drop them into their correct positions on the right. Complete all matches to finish the activity.',
      MEMORY_GAME: 'Click on cards to flip them over and find matching pairs. Remember the positions of cards you\'ve seen. Match all pairs to win!',
      SEQUENCE_ORDER: 'Arrange the items in the correct order by dragging and dropping them. Make sure the sequence is logically correct.',
      CHESS: 'Play chess against the computer. Use strategy to checkmate your opponent\'s king while protecting your own pieces.',
      HANGMAN: 'Guess the hidden word letter by letter. Select letters to reveal the word before the hangman is complete!',
      SUDOKU: 'Fill the 9x9 grid with numbers 1-9 so that each row, column, and 3x3 box contains all digits without repetition.',
      ABACUS: 'Solve arithmetic using an interactive abacus. Move beads by place value and submit the represented number.',
      CROSSWORD: 'Fill in the crossword puzzle by solving the clues. Click on a clue to highlight the corresponding word in the grid, then type your answer.',
      PICTURE_REVEAL: 'Answer questions correctly to reveal parts of the hidden picture. Complete all questions to see the full image!'
    };
    return instructionsMap[activityType] || 'Complete the activity by following the on-screen instructions.';
  };

  useEffect(() => {
    if (activity) {
      setFormData({
        group_id: activity.group_id,
        title: activity.title,
        description: activity.description || '',
        instructions: activity.instructions || '',
        cover_image: activity.cover_image || '',
        activity_type: activity.activity_type,
        difficulty: activity.difficulty,
        estimated_time: activity.estimated_time || 10,
        points: activity.points,
        items: activity.items?.map((item) => ({
          content: item.content,
          points: item.points,
        })) || [],
      });
    }
  }, [activity]);

  const handleActivityTypeChange = (newType: ActivityType) => {
    let presetTitle = formData.title;
    let presetDescription = formData.description;
    let presetInstructions = getDefaultInstructions(newType);
    let presetItems: any[] = [];

    if (newType === 'CHESS') {
      presetTitle = 'Grandmaster Chess Challenge';
      presetDescription = 'Advance through levels of increasing strategic chess difficulty against the computer.';
      presetItems = [
        {
          content: {
            type: 'chess',
            description: 'Play chess levels and test your strategy',
            isInfiniteLevels: true,
            totalLevels: 10,
            pointsPerLevel: 100,
          },
          points: 100,
        }
      ];
    } else if (newType === 'SUDOKU') {
      presetTitle = 'Sudoku Mind Puzzle';
      presetDescription = 'Challenge your mind with a classic 9x9 Sudoku number puzzle.';
      presetItems = [
        {
          content: {
            type: 'sudoku',
            difficulty: 'medium',
          },
          points: 100,
        }
      ];
    } else if (newType === 'ABACUS') {
      presetTitle = 'Interactive Abacus Math';
      presetDescription = 'Practice place values and solve arithmetic equations using the interactive digital abacus.';
      presetItems = [
        {
          content: {
            prompt: '47 + 28',
            answer: 75,
            hint: 'Use place values: ones, tens, hundreds',
          },
          points: 10,
        },
        {
          content: {
            prompt: '15 + 17',
            answer: 32,
            hint: 'Use the abacus beads to represent 15 and then add 17.',
          },
          points: 10,
        },
        {
          content: {
            prompt: '58 - 24',
            answer: 34,
            hint: 'Clear the abacus, bead 58, and subtract 24.',
          },
          points: 10,
        }
      ];
    } else {
      const isPredefined = 
        formData.title === 'Grandmaster Chess Challenge' || 
        formData.title === 'Sudoku Mind Puzzle' || 
        formData.title === 'Interactive Abacus Math';
      
      if (isPredefined) {
        presetTitle = '';
        presetDescription = '';
      }
    }

    setFormData({
      ...formData,
      activity_type: newType,
      title: presetTitle,
      description: presetDescription,
      instructions: presetInstructions,
      items: presetItems,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.group_id) {
      toast.error('Please select an activity group');
      return;
    }

    if (formData.items.length === 0) {
      toast.error('Please add at least one item to the activity');
      return;
    }

    setLoading(true);

    try {
      if (activity) {
        await activityAPI.update(activity.id, formData);
        toast.success('Activity updated successfully');
      } else {
        await activityAPI.create(formData);
        toast.success('Activity created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save activity');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic or syllabus');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await activityAPI.generateContent({
        activity_type: formData.activity_type,
        topic: aiTopic,
        difficulty: formData.difficulty,
        count: 5,
      });

      const generatedItems = response.data.data.items;
      setFormData({ ...formData, items: generatedItems });
      setShowAIModal(false);
      setAiTopic('');
      toast.success('Content generated successfully! You can now edit the questions.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate content');
    } finally {
      setAiGenerating(false);
    }
  };

  const renderActivityBuilder = () => {
    const props = {
      items: formData.items,
      onItemsChange: (items: any[]) => setFormData({ ...formData, items }),
    };

    switch (formData.activity_type) {
      case 'MATCH_PAIRS':
        return <MatchPairsBuilder {...props} />;
      case 'WORD_SEARCH':
        return <WordSearchBuilder {...props} />;
      case 'FILL_BLANKS':
        return <FillBlanksBuilder {...props} />;
      case 'DRAG_DROP':
        return <DragDropBuilder {...props} />;
      case 'MEMORY_GAME':
        return <MemoryGameBuilder {...props} />;
      case 'QUIZ_GAME':
        return <QuizGameBuilder {...props} />;
      case 'SEQUENCE_ORDER':
        return <SequenceOrderBuilder {...props} />;
      case 'TRUE_FALSE':
        return <TrueFalseBuilder {...props} />;
      case 'CHESS':
        return <ChessBuilder {...props} />;
      case 'HANGMAN':
        return <HangmanBuilder {...props} />;
      case 'SUDOKU':
        return <SudokuBuilder {...props} />;
      case 'ABACUS':
        return <AbacusBuilder {...props} />;
      default:
        return <div className="text-center py-8 text-gray-500">Builder for {formData.activity_type} is under construction</div>;
    }
  };

  return (
    <div className="space-y-6 w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sticky Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-saBlue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded uppercase">
                {formData.activity_type.replace('_', ' ')}
              </span>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                {activity ? `Editing "${formData.title}"` : 'New Educational Activity'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Configure game rules and design game content.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="rounded-xl h-10 px-4 font-semibold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 px-5 font-bold shadow-md shadow-blue-500/10 hover:-translate-y-0.5 transition-all"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : activity ? (
                'Save Changes'
              ) : (
                'Publish Activity'
              )}
            </Button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Game Type & Content Builder (8/12 Width) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Card 1: Game / Activity Type Selection */}
            <Card className="p-6 bg-white border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">1. Game Engine Selection</h3>
                <p className="text-xs text-slate-500">Choose the type of game students will play.</p>
              </div>

              {/* Visual Grid of Activity Types */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activityTypeCards.map((card) => {
                  const isSelected = formData.activity_type === card.type;
                  const CardIcon = card.icon;
                  return (
                    <button
                      key={card.type}
                      type="button"
                      onClick={() => handleActivityTypeChange(card.type)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-saBlue bg-blue-50/50 text-saBlue shadow-xs shadow-blue-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/30'
                      }`}
                    >
                      <div className={`p-2 rounded-lg mb-2 border ${
                        isSelected 
                          ? 'bg-saBlue text-white border-saBlue' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        <CardIcon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold tracking-tight block">{card.label}</span>
                      <span className="text-[9px] text-slate-400 leading-tight mt-1 line-clamp-2">{card.description}</span>
                    </button>
                  );
                })}
              </div>

              {/* Group Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Activity Group *
                  </label>
                  <select
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-slate-700 text-sm"
                    value={formData.group_id}
                    onChange={(e) =>
                      setFormData({ ...formData, group_id: Number(e.target.value) })
                    }
                  >
                    <option value="">Select Group</option>
                    {activityGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-saBlue rounded-full animate-ping" />
                    <span>Selected: <strong className="text-slate-700 font-bold">{formData.activity_type.replace('_', ' ')}</strong></span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 2: Interactive Game Builder */}
            <Card className="p-6 bg-white border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800">2. Interactive Game Creator</h3>
                  <p className="text-xs text-slate-500">Design questions, pairs, or parameters for your game.</p>
                </div>
                {/* AI Trigger */}
                {formData.activity_type !== 'CHESS' && formData.activity_type !== 'SUDOKU' && formData.activity_type !== 'ABACUS' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIModal(true)}
                    className="flex items-center gap-1.5 text-xs font-bold border-orange-200 bg-orange-50/30 text-orange-600 hover:bg-orange-50 rounded-xl px-3 h-8 shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate with AI
                  </Button>
                )}
              </div>
              
              <div className="pt-2">
                {renderActivityBuilder()}
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN: Settings & Metadata Sidebar (4/12 Width) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Card 3: Administrative Info */}
            <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Activity Details</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activity Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-slate-800 text-sm"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Short Summary</label>
                  <textarea
                    rows={2}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-slate-800 text-sm"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instructions</label>
                  <textarea
                    rows={3}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-slate-800 text-sm"
                    placeholder="How to play this activity..."
                    value={formData.instructions}
                    onChange={(e) =>
                      setFormData({ ...formData, instructions: e.target.value })
                    }
                  />
                </div>
              </div>
            </Card>

            {/* Card 4: Rewards & Difficulty Settings */}
            <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Rules & Rewards</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Game Difficulty *</label>
                  <select
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-slate-700 text-sm"
                    value={formData.difficulty}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        difficulty: e.target.value as Difficulty,
                      })
                    }
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration (Min)</label>
                    <Input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 text-sm font-medium"
                      value={formData.estimated_time}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_time: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">EXP Points</label>
                    <Input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 text-sm font-medium"
                      value={formData.points}
                      onChange={(e) =>
                        setFormData({ ...formData, points: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 5: Cover Asset Image Card */}
            <Card className="p-5 bg-white border border-slate-200/80 shadow-xs rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500">
                  <ImagePlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Visual Cover</h3>
              </div>

              <div>
                {formData.cover_image ? (
                  <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 group" style={{ aspectRatio: '16/9' }}>
                    <img
                      src={formData.cover_image}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, cover_image: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="activity-cover-upload"
                    className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      isUploading
                        ? 'border-blue-400 bg-blue-50/50'
                        : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/10'
                    }`}
                    style={{ aspectRatio: '16/9' }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-7 w-7 text-saBlue animate-spin mb-1.5" />
                        <span className="text-xs text-saBlue font-semibold">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-8 w-8 text-slate-400 mb-1.5" />
                        <span className="text-xs text-slate-600 font-bold">Upload Cover Image</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP · 16:9 ratio</span>
                      </>
                    )}
                    <input
                      id="activity-cover-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('File size must be under 10 MB');
                          return;
                        }
                        try {
                          setIsUploading(true);
                          const result = await uploadService.uploadFile(file, 'activities');
                          setFormData({ ...formData, cover_image: result.url });
                          toast.success('Image uploaded');
                        } catch {
                          toast.error('Failed to upload image');
                        } finally {
                          setIsUploading(false);
                          e.target.value = '';
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </Card>
          </div>
        </div>
      </form>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <Card className="p-6 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                Generate with AI
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIModal(false)}
                className="p-1 rounded-lg"
              >
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Topic or Syllabus
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent transition-all font-medium text-slate-800"
                  rows={4}
                  placeholder="Enter the topic, syllabus, or specific content you want to generate questions about..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1">
                <p>Activity Type: <span className="font-bold text-slate-700 uppercase">{formData.activity_type.replace('_', ' ')}</span></p>
                <p>Difficulty: <span className="font-bold text-slate-700">{formData.difficulty}</span></p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleGenerateWithAI}
                  disabled={aiGenerating || !aiTopic.trim()}
                  className="flex-1 bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 font-bold"
                >
                  {aiGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    'Generate Content'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAIModal(false)}
                  className="rounded-xl h-10 border-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
