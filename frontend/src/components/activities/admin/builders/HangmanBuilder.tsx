import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface Props {
    items: any[];
    onItemsChange: (items: any[]) => void;
}

export default function HangmanBuilder({ items, onItemsChange }: Props) {
    const addWord = () => {
        const newItem = {
            content: {
                word: '',
                hint: '',
            },
            points: 20,
        };
        onItemsChange([...items, newItem]);
    };

    const updateWord = (index: number, field: string, value: string) => {
        const newItems = [...items];
        newItems[index].content[field] = value;
        onItemsChange(newItems);
    };

    const removeWord = (index: number) => {
        onItemsChange(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">Create hangman word puzzles with hints</p>
                <Button type="button" onClick={addWord} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Word
                </Button>
            </div>

            {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">Word {index + 1}</h4>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWord(index)}
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-2">Word to Guess</label>
                            <input
                                type="text"
                                placeholder="Enter word"
                                className="w-full px-3 py-2 border rounded uppercase"
                                value={item.content.word}
                                onChange={(e) => updateWord(index, 'word', e.target.value.toUpperCase())}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Hint (Optional)</label>
                            <input
                                type="text"
                                placeholder="Enter hint"
                                className="w-full px-3 py-2 border rounded"
                                value={item.content.hint}
                                onChange={(e) => updateWord(index, 'hint', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Points</label>
                            <Input
                                type="number"
                                min="1"
                                className="w-32 px-3 py-2 border rounded"
                                value={item.points}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index].points = Number(e.target.value);
                                    onItemsChange(newItems);
                                }}
                            />
                        </div>
                    </div>
                </div>
            ))}

            {items.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500 mb-3">No words added yet</p>
                    <Button type="button" onClick={addWord} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Word
                    </Button>
                </div>
            )}
        </div>
    );
}
