import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function DragDropBuilder({ items, onItemsChange }: Props) {
  const addActivity = () => {
    const newItem = {
      content: {
        zones: [
          { id: 'zone1', label: 'Fruits', correctItems: ['item1', 'item2'] },
          { id: 'zone2', label: 'Vegetables', correctItems: ['item3', 'item4'] },
        ],
        items: [
          { id: 'item1', content: 'Apple', image: '' },
          { id: 'item2', content: 'Banana', image: '' },
          { id: 'item3', content: 'Carrot', image: '' },
          { id: 'item4', content: 'Broccoli', image: '' },
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
          Create drag and drop sorting activities
        </p>
        <Button type="button" onClick={addActivity} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Activity
        </Button>
      </div>

      {items.map((itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Activity {itemIndex + 1}</h4>
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
            Configure zones and items through advanced editor
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No activities added yet</p>
          <Button type="button" onClick={addActivity} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Activity
          </Button>
        </div>
      )}
    </div>
  );
}
