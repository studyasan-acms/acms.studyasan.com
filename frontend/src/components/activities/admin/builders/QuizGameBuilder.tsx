import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import type { QuizGameContent } from '../../../../types/activity';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function QuizGameBuilder({ items, onItemsChange }: Props) {
  const addQuestion = () => {
    const newItem = {
      content: {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        timeLimit: 30,
      } as QuizGameContent,
      points: 10,
    };
    onItemsChange([...items, newItem]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index].content[field] = value;
    onItemsChange(newItems);
  };

  const updateOption = (itemIndex: number, optionIndex: number, value: string) => {
    const newItems = [...items];
    newItems[itemIndex].content.options[optionIndex] = value;
    onItemsChange(newItems);
  };

  const removeQuestion = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Create multiple-choice questions with a time limit
        </p>
        <Button type="button" onClick={addQuestion} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>

      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Question {itemIndex + 1}</h4>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Points"
                min="1"
                className="w-20 px-2 py-1 border rounded text-sm"
                value={item.points}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[itemIndex].points = Number(e.target.value);
                  onItemsChange(newItems);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(itemIndex)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Question</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={2}
                placeholder="Enter your question"
                value={item.content.question}
                onChange={(e) =>
                  updateQuestion(itemIndex, 'question', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Options</label>
              <div className="space-y-2">
                {item.content.options.map((option: string, optionIndex: number) => (
                  <div key={optionIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${itemIndex}`}
                      checked={item.content.correctAnswer === optionIndex}
                      onChange={() =>
                        updateQuestion(itemIndex, 'correctAnswer', optionIndex)
                      }
                      className="w-4 h-4"
                    />
                    <input
                      type="text"
                      placeholder={`Option ${optionIndex + 1}`}
                      className="flex-1 px-3 py-2 border rounded"
                      value={option}
                      onChange={(e) =>
                        updateOption(itemIndex, optionIndex, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select the correct answer by clicking the radio button
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Time Limit (seconds)
              </label>
              <Input
                type="number"
                min="5"
                max="300"
                className="w-32 px-3 py-2 border rounded"
                value={item.content.timeLimit}
                onChange={(e) =>
                  updateQuestion(itemIndex, 'timeLimit', Number(e.target.value))
                }
              />
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No questions added yet</p>
          <Button type="button" onClick={addQuestion} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Question
          </Button>
        </div>
      )}
    </div>
  );
}
