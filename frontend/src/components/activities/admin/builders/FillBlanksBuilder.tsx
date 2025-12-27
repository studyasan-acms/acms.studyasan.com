import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function FillBlanksBuilder({ items, onItemsChange }: Props) {
  const addExercise = () => {
    const newItem = {
      content: {
        text: 'The ____ is the largest planet in our solar system.',
        blanks: [{ position: 0, answer: 'Jupiter', options: ['Mars', 'Jupiter', 'Saturn', 'Earth'] }],
      },
      points: 10,
    };
    onItemsChange([...items, newItem]);
  };

  const updateText = (itemIndex: number, value: string) => {
    const newItems = [...items];
    newItems[itemIndex].content.text = value;
    onItemsChange(newItems);
  };

  const updateBlank = (itemIndex: number, blankIndex: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[itemIndex].content.blanks[blankIndex][field] = value;
    onItemsChange(newItems);
  };

  const updateOption = (itemIndex: number, blankIndex: number, optionIndex: number, value: string) => {
    const newItems = [...items];
    newItems[itemIndex].content.blanks[blankIndex].options[optionIndex] = value;
    onItemsChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Create fill-in-the-blank exercises. Use ____ for blanks.
        </p>
        <Button type="button" onClick={addExercise} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Exercise
        </Button>
      </div>

      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Exercise {itemIndex + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onItemsChange(items.filter((_, i) => i !== itemIndex))}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                Text (use ____ for blanks)
              </label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={3}
                placeholder="The ____ is the capital of ____."
                value={item.content.text}
                onChange={(e) => updateText(itemIndex, e.target.value)}
              />
            </div>

            {item.content.blanks?.map((blank: any, blankIndex: number) => (
              <div key={blankIndex} className="p-3 bg-white rounded border">
                <label className="block text-sm font-medium mb-2">
                  Blank {blankIndex + 1}
                </label>
                <input
                  type="text"
                  placeholder="Correct answer"
                  className="w-full px-3 py-2 border rounded mb-2"
                  value={blank.answer}
                  onChange={(e) =>
                    updateBlank(itemIndex, blankIndex, 'answer', e.target.value)
                  }
                />
                <label className="block text-xs text-gray-600 mb-1">
                  Options (optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {blank.options?.map((option: string, optionIndex: number) => (
                    <input
                      key={optionIndex}
                      type="text"
                      placeholder={`Option ${optionIndex + 1}`}
                      className="px-3 py-2 border rounded text-sm"
                      value={option}
                      onChange={(e) =>
                        updateOption(itemIndex, blankIndex, optionIndex, e.target.value)
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No exercises added yet</p>
          <Button type="button" onClick={addExercise} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Exercise
          </Button>
        </div>
      )}
    </div>
  );
}
