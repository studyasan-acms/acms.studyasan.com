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
                description: 'Classic 9x9 board logic puzzle with level progression.',
                isInfiniteLevels: true,
                totalLevels: 5,
                pointsPerLevel: 100,
                highlightErrors: true,
                allowHints: true,
                maxHints: 3,
            },
            points: 100,
        };
        onItemsChange([newItem]);
    };

    const hasGame = items.length > 0;
    const gameContent = items[0]?.content || {};

    const updateContent = (updates: any) => {
        const newItems = [...items];
        if (newItems[0]) {
            newItems[0].content = {
                ...newItems[0].content,
                ...updates,
            };
            onItemsChange(newItems);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-505 font-medium">
                    Sudoku Mind Puzzle. Configure level progression parameters and hint assistance settings.
                </p>
            </div>

            {!hasGame ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <p className="text-slate-400 text-sm font-medium mb-3">No Sudoku puzzle added yet</p>
                    <Button 
                        type="button" 
                        onClick={addSudoku} 
                        size="sm"
                        className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl font-bold px-4 h-9 shadow-sm shadow-blue-500/10"
                    >
                        Add Sudoku Puzzle
                    </Button>
                </div>
            ) : (
                <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                            <h4 className="font-bold text-sm text-slate-800">Sudoku Config</h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Select levels structure and assist features.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onItemsChange([])}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg px-2.5 h-8"
                        >
                            Remove Game
                        </Button>
                    </div>

                    <div className="space-y-5 pt-1">
                        
                        {/* Levels configuration */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Levels Setup</label>
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="sudokuLevelsType"
                                            className="mr-2 h-4 w-4 text-saBlue border-slate-300 focus:ring-saBlue"
                                            checked={gameContent.isInfiniteLevels !== false}
                                            onChange={() => updateContent({ isInfiniteLevels: true })}
                                        />
                                        Infinite Levels (No limit)
                                    </label>
                                    <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="sudokuLevelsType"
                                            className="mr-2 h-4 w-4 text-saBlue border-slate-300 focus:ring-saBlue"
                                            checked={gameContent.isInfiniteLevels === false}
                                            onChange={() => updateContent({ isInfiniteLevels: false })}
                                        />
                                        Fixed Number of Levels
                                    </label>
                                </div>
                            </div>

                            {gameContent.isInfiniteLevels === false && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Levels *</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="100"
                                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent text-slate-800 text-sm font-medium h-10"
                                            value={gameContent.totalLevels || 5}
                                            onChange={(e) => updateContent({ totalLevels: Math.max(1, Number(e.target.value)) })}
                                        />
                                        <p className="text-[10px] text-slate-400">Total Sudoku levels the student must complete.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points per Level Clear *</label>
                                    <Input
                                        type="number"
                                        min="10"
                                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent text-slate-800 text-sm font-medium h-10"
                                        value={gameContent.pointsPerLevel || 100}
                                        onChange={(e) => {
                                            const p = Math.max(0, Number(e.target.value));
                                            updateContent({ pointsPerLevel: p });
                                            // Update parent points
                                            const newItems = [...items];
                                            if (newItems[0]) {
                                                newItems[0].points = p;
                                                onItemsChange(newItems);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hint settings */}
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Hint & Assist Assistance</label>
                                <div className="space-y-3">
                                    <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mr-2 h-4 w-4 rounded text-saBlue border-slate-300 focus:ring-saBlue"
                                            checked={gameContent.highlightErrors !== false}
                                            onChange={(e) => updateContent({ highlightErrors: e.target.checked })}
                                        />
                                        Highlight Errors immediately (turns red on wrong entry)
                                    </label>
                                    
                                    <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mr-2 h-4 w-4 rounded text-saBlue border-slate-300 focus:ring-saBlue"
                                            checked={gameContent.allowHints !== false}
                                            onChange={(e) => updateContent({ allowHints: e.target.checked })}
                                        />
                                        Show "Reveal Hint" Button in game
                                    </label>
                                </div>
                            </div>

                            {gameContent.allowHints !== false && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Hints Allowed per Level *</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent text-slate-800 text-sm font-medium h-10"
                                            value={gameContent.maxHints || 3}
                                            onChange={(e) => updateContent({ maxHints: Math.max(1, Number(e.target.value)) })}
                                        />
                                        <p className="text-[10px] text-slate-400">Specify the number of hints a student can use per level (e.g. 3).</p>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
