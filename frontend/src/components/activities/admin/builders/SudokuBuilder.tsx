import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface Props {
    items: any[];
    onItemsChange: (items: any[]) => void;
}

export default function SudokuBuilder({ items, onItemsChange }: Props) {
    const addSudoku = () => {
        const newItem = {
            content: {
                type: 'sudoku',
                difficulty: 'medium',
            },
            points: 100,
        };
        onItemsChange([...items, newItem]);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                    Sudoku puzzles are automatically generated. Players earn points for correct placements.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500 mb-3">No Sudoku puzzle added yet</p>
                    <Button type="button" onClick={addSudoku} size="sm">
                        Add Sudoku Puzzle
                    </Button>
                </div>
            ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold">Sudoku Puzzle</h4>
                            <p className="text-sm text-gray-600 mt-1">
                                9x9 grid number puzzle
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onItemsChange([])}
                        >
                            Remove
                        </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="block text-sm font-medium mb-2">Difficulty</label>
                            <select
                                className="w-full px-3 py-2 border rounded"
                                value={items[0]?.content?.difficulty || 'medium'}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[0].content.difficulty = e.target.value;
                                    onItemsChange(newItems);
                                }}
                            >
                                <option value="easy">Easy (30 cells removed)</option>
                                <option value="medium">Medium (40 cells removed)</option>
                                <option value="hard">Hard (50 cells removed)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Points per Correct Number</label>
                            <Input
                                type="number"
                                min="1"
                                className="w-32 px-3 py-2 border rounded"
                                value={items[0]?.points || 100}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[0].points = Number(e.target.value);
                                    onItemsChange(newItems);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
