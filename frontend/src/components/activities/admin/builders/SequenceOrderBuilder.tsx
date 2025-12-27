import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function SequenceOrderBuilder({ items, onItemsChange }: Props) {
  const addSequence = () => {
    const newItem = {
      content: {
        items: [
          { id: '1', content: 'First step', image: '', correctOrder: 1 },
          { id: '2', content: 'Second step', image: '', correctOrder: 2 },
          { id: '3', content: 'Third step', image: '', correctOrder: 3 },
        ],
      },
      points: 15,
    };
    onItemsChange([...items, newItem]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Create sequence ordering activities
        </p>
        <Button type="button" onClick={addSequence} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Sequence
        </Button>
      </div>

      {items.map((itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Sequence {itemIndex + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onItemsChange(items.filter((_, i) => i !== itemIndex))}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            Configure sequence items through advanced editor
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No sequences added yet</p>
          <Button type="button" onClick={addSequence} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Sequence
          </Button>
        </div>
      )}
    </div>
  );
}
