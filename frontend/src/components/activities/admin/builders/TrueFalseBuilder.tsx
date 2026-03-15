import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function TrueFalseBuilder({ items, onItemsChange }: Props) {
  const addStatement = () => {
    const newItem = {
      content: {
        statement: 'The Earth is flat.',
        correctAnswer: false,
      },
      points: 5,
    };
    onItemsChange([...items, newItem]);
  };

  const updateStatement = (itemIndex: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[itemIndex].content[field] = value;
    onItemsChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Create True/False statements</p>
        <Button type="button" onClick={addStatement} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Statement
        </Button>
      </div>

      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Statement {itemIndex + 1}</h4>
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
                onClick={() => onItemsChange(items.filter((_, i) => i !== itemIndex))}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Statement</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                rows={2}
                placeholder="Enter a statement"
                value={item.content.statement}
                onChange={(e) =>
                  updateStatement(itemIndex, 'statement', e.target.value)
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Correct Answer</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`answer-${itemIndex}`}
                    checked={item.content.correctAnswer === true}
                    onChange={() =>
                      updateStatement(itemIndex, 'correctAnswer', true)
                    }
                    className="mr-2"
                  />
                  True
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name={`answer-${itemIndex}`}
                    checked={item.content.correctAnswer === false}
                    onChange={() =>
                      updateStatement(itemIndex, 'correctAnswer', false)
                    }
                    className="mr-2"
                  />
                  False
                </label>
              </div>
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No statements added yet</p>
          <Button type="button" onClick={addStatement} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Statement
          </Button>
        </div>
      )}
    </div>
  );
}
