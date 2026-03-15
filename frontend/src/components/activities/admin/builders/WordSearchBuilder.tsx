import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function WordSearchBuilder({ items, onItemsChange }: Props) {
  const addPuzzle = () => {
    const newItem = {
      content: {
        words: [''],
        gridSize: 10,
      },
      points: 20,
    };
    onItemsChange([...items, newItem]);
  };

  const updateWords = (itemIndex: number, wordIndex: number, value: string) => {
    const newItems = [...items];
    newItems[itemIndex].content.words[wordIndex] = value.toUpperCase();
    onItemsChange(newItems);
  };

  const addWord = (itemIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].content.words.push('');
    onItemsChange(newItems);
  };

  const removeWord = (itemIndex: number, wordIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].content.words.splice(wordIndex, 1);
    onItemsChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Create word search puzzles</p>
        <Button type="button" onClick={addPuzzle} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Puzzle
        </Button>
      </div>

      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Puzzle {itemIndex + 1}</h4>
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
              <label className="block text-sm font-medium mb-2">Grid Size</label>
              <Input
                type="number"
                min="8"
                max="20"
                className="w-32 px-3 py-2 border rounded"
                value={item.content.gridSize}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[itemIndex].content.gridSize = Number(e.target.value);
                  onItemsChange(newItems);
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Words to Find</label>
              {item.content.words.map((word: string, wordIndex: number) => (
                <div key={wordIndex} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Enter word"
                    className="flex-1 px-3 py-2 border rounded"
                    value={word}
                    onChange={(e) =>
                      updateWords(itemIndex, wordIndex, e.target.value)
                    }
                  />
                  {item.content.words.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWord(itemIndex, wordIndex)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addWord(itemIndex)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Word
              </Button>
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No puzzles added yet</p>
          <Button type="button" onClick={addPuzzle} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Puzzle
          </Button>
        </div>
      )}
    </div>
  );
}
