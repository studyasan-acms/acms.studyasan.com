import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function MemoryGameBuilder({ items, onItemsChange }: Props) {
  const addGame = () => {
    const newItem = {
      content: {
        pairs: [
          { id: 'pair1', content: 'Cat', image: '' },
          { id: 'pair1', content: 'Cat', image: '' },
          { id: 'pair2', content: 'Dog', image: '' },
          { id: 'pair2', content: 'Dog', image: '' },
        ],
      },
      points: 20,
    };
    onItemsChange([...items, newItem]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Create memory matching card games</p>
        <Button type="button" onClick={addGame} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Game
        </Button>
      </div>

      {items.map((itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Game {itemIndex + 1}</h4>
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
            Configure card pairs through advanced editor
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No games added yet</p>
          <Button type="button" onClick={addGame} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Game
          </Button>
        </div>
      )}
    </div>
  );
}
