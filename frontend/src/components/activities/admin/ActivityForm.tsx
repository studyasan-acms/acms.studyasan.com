import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
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

interface Props {
  activity: Activity | null;
  activityGroups: ActivityGroup[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ActivityForm({
  activity,
  activityGroups,
  onSuccess,
  onCancel,
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
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

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
      default:
        return <div className="text-center py-8 text-gray-500">Builder for {formData.activity_type} is under construction</div>;
    }
  };

  return (
    <Card className="p-6 mb-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {activity ? 'Edit Activity' : 'Create Activity'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Activity Group *
              </label>
              <select
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Activity Type *
              </label>
              <select
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.activity_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    activity_type: e.target.value as ActivityType,
                    items: [], // Reset items when type changes
                  })
                }
              >
                <option value="MATCH_PAIRS">Match Pairs</option>
                <option value="WORD_SEARCH">Word Search</option>
                <option value="QUIZ_GAME">Quiz Game</option>
                <option value="TRUE_FALSE">True/False</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Instructions
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="How to play this activity..."
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Difficulty *
              </label>
              <select
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
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

            <div>
              <label className="block text-sm font-medium mb-2">
                Estimated Time (minutes)
              </label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.estimated_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_time: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Points</label>
              <input
                type="number"
                min="0"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                value={formData.points}
                onChange={(e) =>
                  setFormData({ ...formData, points: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cover Image URL
            </label>
            <input
              type="url"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.cover_image}
              onChange={(e) =>
                setFormData({ ...formData, cover_image: e.target.value })
              }
            />
            {formData.cover_image && (
              <img
                src={formData.cover_image}
                alt="Preview"
                className="mt-2 w-32 h-32 object-cover rounded-lg"
              />
            )}
          </div>

          {/* Activity Builder */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Activity Content</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAIModal(true)}
                className="flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate with AI
              </Button>
            </div>
            {renderActivityBuilder()}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : activity ? 'Update Activity' : 'Create Activity'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </form>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Generate with AI
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Topic or Syllabus
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Enter the topic, syllabus, or specific content you want to generate questions about..."
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
              </div>

              <div className="text-sm text-gray-600">
                <p>Activity Type: <span className="font-medium">{formData.activity_type.replace('_', ' ')}</span></p>
                <p>Difficulty: <span className="font-medium">{formData.difficulty}</span></p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateWithAI}
                  disabled={aiGenerating || !aiTopic.trim()}
                  className="flex-1"
                >
                  {aiGenerating ? 'Generating...' : 'Generate Content'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAIModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
