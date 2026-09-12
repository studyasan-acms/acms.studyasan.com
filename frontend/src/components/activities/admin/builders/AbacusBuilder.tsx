import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function AbacusBuilder({ items, onItemsChange }: Props) {
  const addProblem = () => {
    const newItem = {
      content: {
        prompt: '47 + 28',
        answer: 75,
        hint: 'Use place values: ones, tens, hundreds',
      },
      points: 10,
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (index: number, updates: any) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      ...updates,
      content: {
        ...next[index].content,
        ...(updates.content || {}),
      },
    };
    onItemsChange(next);
  };

  const removeProblem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Create arithmetic tasks that students solve using an interactive abacus.
        </p>
        <Button type="button" onClick={addProblem} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Problem
        </Button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Problem {index + 1}</h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeProblem(index)}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Prompt</label>
              <Input
                value={item.content?.prompt || ''}
                onChange={(e) => updateItem(index, { content: { prompt: e.target.value } })}
                placeholder="e.g. 326 - 148"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Correct Answer</label>
              <Input
                type="number"
                value={item.content?.answer ?? item.content?.correctAnswer ?? item.content?.targetNumber ?? ''}
                onChange={(e) => updateItem(index, { content: { answer: Number(e.target.value) } })}
                placeholder="e.g. 178"
                min="0"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-2">Hint (optional)</label>
              <Input
                value={item.content?.hint || ''}
                onChange={(e) => updateItem(index, { content: { hint: e.target.value } })}
                placeholder="Optional guidance for students"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Points</label>
              <Input
                type="number"
                value={item.points ?? 10}
                min="1"
                onChange={(e) => updateItem(index, { points: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No abacus problems added yet</p>
          <Button type="button" onClick={addProblem} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Problem
          </Button>
        </div>
      )}
    </div>
  );
}
