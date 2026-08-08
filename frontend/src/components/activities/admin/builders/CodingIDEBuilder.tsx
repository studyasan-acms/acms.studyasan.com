import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';

interface Props {
    items: any[];
    onItemsChange: (items: any[]) => void;
}

export default function CodingIDEBuilder({ items, onItemsChange }: Props) {
    const addCodingIDE = () => {
        const newItem = {
            content: {
                type: 'coding_ide',
                description: 'Collaborative live IDE session for coding practice.',
                defaultLanguage: 'python',
                starterCode: '# Type your collaborative code here\nprint("Hello World!")\n',
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

    const handlePointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const p = Math.max(0, Number(e.target.value));
        const newItems = [...items];
        if (newItems[0]) {
            newItems[0].points = p;
            onItemsChange(newItems);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500 font-medium">
                    Collaborative IDE activity. Students and teacher edit and run code together in real time.
                </p>
            </div>

            {!hasGame ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <p className="text-slate-400 text-sm font-medium mb-3">No IDE setup added yet</p>
                    <Button 
                        type="button" 
                        onClick={addCodingIDE} 
                        size="sm"
                        className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl font-bold px-4 h-9 shadow-sm shadow-blue-500/10"
                    >
                        Add Coding IDE
                    </Button>
                </div>
            ) : (
                <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                            <h4 className="font-bold text-sm text-slate-800">IDE Configuration</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Define standard options for the coding environment.</p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onItemsChange([])}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg px-2.5 h-8"
                        >
                            Remove Activity
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default Language</label>
                                <select
                                    value={gameContent.defaultLanguage || 'python'}
                                    onChange={(e) => updateContent({ defaultLanguage: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent text-slate-800 text-sm font-medium h-10"
                                >
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript / TypeScript</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C / C++</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clear Points reward</label>
                                <Input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent text-slate-800 text-sm font-medium h-10"
                                    value={items[0]?.points || 100}
                                    onChange={handlePointsChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starter Boilerplate Code</label>
                            <textarea
                                value={gameContent.starterCode || ''}
                                onChange={(e) => updateContent({ starterCode: e.target.value })}
                                placeholder="Write the default code snippet for students..."
                                className="w-full min-h-[120px] p-3 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-mono focus:ring-2 focus:ring-saBlue focus:border-transparent resize-y"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
