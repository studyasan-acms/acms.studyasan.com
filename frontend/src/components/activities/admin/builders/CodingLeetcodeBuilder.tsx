import { useState } from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
    items: any[];
    onItemsChange: (items: any[]) => void;
}

interface TestCase {
    input: string;
    expectedOutput: string;
}

export default function CodingLeetcodeBuilder({ items, onItemsChange }: Props) {
    const addLeetcodeGame = () => {
        const newItem = {
            content: {
                type: 'coding_leetcode',
                problemTitle: 'Two Sum',
                problemDescription: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
                defaultLanguage: 'python',
                templates: {
                    python: 'def twoSum(nums, target):\n    # Write your code here\n    pass\n',
                    javascript: 'function twoSum(nums, target) {\n    // Write your code here\n}\n',
                    java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n        return new int[0];\n    }\n}\n',
                    cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your code here\n        return {};\n    }\n};\n',
                },
                testCases: [
                    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]' },
                    { input: '[3,2,4]\n6', expectedOutput: '[1,2]' }
                ] as TestCase[],
            },
            points: 120,
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

    const handleTestCaseChange = (index: number, field: keyof TestCase, value: string) => {
        const testCases = [...(gameContent.testCases || [])];
        testCases[index] = {
            ...testCases[index],
            [field]: value
        };
        updateContent({ testCases });
    };

    const addTestCase = () => {
        const testCases = [...(gameContent.testCases || [])];
        testCases.push({ input: '', expectedOutput: '' });
        updateContent({ testCases });
    };

    const removeTestCase = (index: number) => {
        const testCases = (gameContent.testCases || []).filter((_: any, i: number) => i !== index);
        updateContent({ testCases });
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
                <p className="text-xs text-slate-505 font-medium">
                    Leetcode activity. Create algorithmic challenges with descriptions and verification test cases.
                </p>
            </div>

            {!hasGame ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <p className="text-slate-400 text-sm font-medium mb-3">No Leetcode problem added yet</p>
                    <Button 
                        type="button" 
                        onClick={addLeetcodeGame} 
                        size="sm"
                        className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl font-bold px-4 h-9 shadow-sm shadow-blue-500/10"
                    >
                        Add Leetcode Challenge
                    </Button>
                </div>
            ) : (
                <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 space-y-5">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <div>
                            <h4 className="font-bold text-sm text-slate-800">Challenge Details</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Write details, starter templates, and test cases.</p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onItemsChange([])}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg px-2.5 h-8"
                        >
                            Remove Challenge
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 col-span-1 sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem Title *</label>
                                <Input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent text-slate-800 text-sm font-medium h-10"
                                    value={gameContent.problemTitle || ''}
                                    onChange={(e) => updateContent({ problemTitle: e.target.value })}
                                    placeholder="e.g. Reverse a String"
                                />
                            </div>

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
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">EXP Points Reward</label>
                                <Input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-saBlue focus:border-transparent text-slate-800 text-sm font-medium h-10"
                                    value={items[0]?.points || 120}
                                    onChange={handlePointsChange}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem Description *</label>
                            <textarea
                                value={gameContent.problemDescription || ''}
                                onChange={(e) => updateContent({ problemDescription: e.target.value })}
                                placeholder="Explain the problem constraints, examples and description..."
                                className="w-full min-h-[100px] p-3 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-saBlue focus:border-transparent resize-y"
                            />
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-4">
                            <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Boilerplate Templates</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Python Boilerplate</label>
                                    <textarea
                                        value={gameContent.templates?.python || ''}
                                        onChange={(e) => {
                                            const templates = { ...(gameContent.templates || {}), python: e.target.value };
                                            updateContent({ templates });
                                        }}
                                        className="w-full h-24 p-2 border border-slate-200 rounded-xl text-xs font-mono resize-y"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">JS Boilerplate</label>
                                    <textarea
                                        value={gameContent.templates?.javascript || ''}
                                        onChange={(e) => {
                                            const templates = { ...(gameContent.templates || {}), javascript: e.target.value };
                                            updateContent({ templates });
                                        }}
                                        className="w-full h-24 p-2 border border-slate-200 rounded-xl text-xs font-mono resize-y"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Java Boilerplate</label>
                                    <textarea
                                        value={gameContent.templates?.java || ''}
                                        onChange={(e) => {
                                            const templates = { ...(gameContent.templates || {}), java: e.target.value };
                                            updateContent({ templates });
                                        }}
                                        className="w-full h-24 p-2 border border-slate-200 rounded-xl text-xs font-mono resize-y"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">C++ Boilerplate</label>
                                    <textarea
                                        value={gameContent.templates?.cpp || ''}
                                        onChange={(e) => {
                                            const templates = { ...(gameContent.templates || {}), cpp: e.target.value };
                                            updateContent({ templates });
                                        }}
                                        className="w-full h-24 p-2 border border-slate-200 rounded-xl text-xs font-mono resize-y"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Test Cases Validation</h5>
                                <Button type="button" size="sm" onClick={addTestCase} className="bg-saBlue text-white h-7 px-2.5 rounded-lg text-xs font-bold">
                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Case
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {(gameContent.testCases || []).map((tc: TestCase, idx: number) => (
                                    <div key={idx} className="flex gap-3 items-start p-3 bg-white border border-slate-200 rounded-xl">
                                        <div className="flex-1 space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Input Params (e.g. nums & target values)</label>
                                                    <textarea
                                                        value={tc.input}
                                                        onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                                                        placeholder="Input variables..."
                                                        className="w-full h-12 p-2 border border-slate-200 rounded-lg text-xs font-mono resize-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Expected Output (stdout print / return)</label>
                                                    <textarea
                                                        value={tc.expectedOutput}
                                                        onChange={(e) => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                                                        placeholder="Expected output..."
                                                        className="w-full h-12 p-2 border border-slate-200 rounded-lg text-xs font-mono resize-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => removeTestCase(idx)}
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-700 p-2 h-8 w-8 hover:bg-red-50 rounded-lg shrink-0 mt-3"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
