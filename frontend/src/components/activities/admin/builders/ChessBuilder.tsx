import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface Props {
    items: any[];
    onItemsChange: (items: any[]) => void;
}

export default function ChessBuilder({ items, onItemsChange }: Props) {
    const addChessGame = () => {
        const newItem = {
            content: {
                type: 'chess',
                description: 'Play a game of chess',
            },
            points: 100,
        };
        onItemsChange([...items, newItem]);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                    Chess is a strategic board game. Players earn points by capturing opponent pieces.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-gray-500 mb-3">No chess game added yet</p>
                    <Button type="button" onClick={addChessGame} size="sm">
                        Add Chess Game
                    </Button>
                </div>
            ) : (
                <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold">Chess Game</h4>
                            <p className="text-sm text-gray-600 mt-1">
                                Standard chess game with move validation
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

                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Game Mode</label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        className="mr-2"
                                        checked={items[0]?.content?.vsComputer !== false}
                                        onChange={() => {
                                            const newItems = [...items];
                                            newItems[0].content = { ...newItems[0].content, vsComputer: true };
                                            onItemsChange(newItems);
                                        }}
                                    />
                                    vs Computer
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        className="mr-2"
                                        checked={items[0]?.content?.vsComputer === false}
                                        onChange={() => {
                                            const newItems = [...items];
                                            newItems[0].content = { ...newItems[0].content, vsComputer: false };
                                            onItemsChange(newItems);
                                        }}
                                    />
                                    vs Player (Pass & Play)
                                </label>
                            </div>
                        </div>

                        {items[0]?.content?.vsComputer !== false && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Computer Difficulty</label>
                                <select
                                    className="w-full px-3 py-2 border rounded"
                                    value={items[0]?.content?.difficulty || 'easy'}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[0].content = { ...newItems[0].content, difficulty: e.target.value };
                                        onItemsChange(newItems);
                                    }}
                                >
                                    <option value="easy">Easy (Random Moves)</option>
                                    <option value="medium">Medium (Basic Strategy)</option>
                                    <option value="hard">Hard (Advanced)</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-2">Points per Captured Piece</label>
                            <p className="text-xs text-gray-500 mb-2">
                                Pawn: 10, Knight/Bishop: 30, Rook: 50, Queen: 90, King: 1000
                            </p>
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
