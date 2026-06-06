import { useState } from 'react';
import { Plus, Trash2, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { uploadService } from '../../../../services/api';
import { toast } from 'sonner';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function TrueFalseBuilder({ items, onItemsChange }: Props) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const addStatement = () => {
    const newItem = {
      content: {
        statement: 'The Earth is flat.',
        correctAnswer: false,
      },
      points: 5,
    };
    onItemsChange([...items, newItem]);
    setActiveIndex(items.length); // jump to new statement
  };

  const updateStatement = (itemIndex: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[itemIndex].content[field] = value;
    onItemsChange(newItems);
  };

  const removeStatement = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
    if (activeIndex >= newItems.length && newItems.length > 0) {
      setActiveIndex(newItems.length - 1);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
        <p className="text-gray-500 mb-4">No statements added yet</p>
        <Button type="button" onClick={addStatement} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add First Statement
        </Button>
      </div>
    );
  }

  const activeItem = items[activeIndex];
  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-700">Statements ({items.length})</h3>
        </div>
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 md:max-h-[600px] pr-1">
          {items.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`flex-shrink-0 text-left px-4 py-3 rounded-lg border transition-all ${activeIndex === idx
                  ? 'border-saBlue bg-blue-50 text-saBlue font-semibold shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-600'
                }`}
            >
              Statement {idx + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={addStatement}
            className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:border-saBlue hover:text-saBlue hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="border rounded-xl p-6 bg-white shadow-sm">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-4 pb-4 border-b">
            <h4 className="text-xl font-bold text-gray-800">Statement {activeIndex + 1}</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-600">Points:</label>
                <Input
                  type="number"
                  placeholder="Points"
                  min="1"
                  className="w-24 px-3 py-1 border rounded"
                  value={activeItem.points}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[activeIndex].points = Number(e.target.value);
                    onItemsChange(newItems);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeStatement(activeIndex)}
                className="bg-red-50 hover:bg-red-100 text-red-600 border-none"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Remove
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Statement Text</label>
              <textarea
                className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:bg-white transition-colors mb-3 text-lg resize-y"
                rows={3}
                placeholder="Enter a statement"
                value={activeItem.content.statement}
                onChange={(e) =>
                  updateStatement(activeIndex, 'statement', e.target.value)
                }
              />
              {activeItem.content.statementMedia ? (
                <div className="relative w-full max-w-sm h-48 rounded-lg border-2 overflow-hidden group">
                  <img src={activeItem.content.statementMedia} alt="Statement media" className="w-full h-full object-contain bg-gray-50" />
                  <button
                    type="button"
                    onClick={() => updateStatement(activeIndex, 'statementMedia', '')}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-saBlue hover:text-saBlueDark px-4 py-2 border border-blue-100 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  {uploadingId === `st-${activeIndex}` ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading image...</>
                  ) : (
                    <><ImagePlus className="w-4 h-4" /> Add Reference Image</>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={uploadingId !== null}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setUploadingId(`st-${activeIndex}`);
                        const res = await uploadService.uploadFile(file, 'activities/truefalse');
                        updateStatement(activeIndex, 'statementMedia', res.url);
                      } catch (err) {
                        toast.error('Upload failed');
                      } finally {
                        setUploadingId(null);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <div className="pt-4 border-t">
              <label className="block text-sm font-medium mb-3 text-gray-700">Correct Answer</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${activeItem.content.correctAnswer === true ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
                  <input
                    type="radio"
                    name={`answer-${activeIndex}`}
                    checked={activeItem.content.correctAnswer === true}
                    onChange={() =>
                      updateStatement(activeIndex, 'correctAnswer', true)
                    }
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="font-semibold text-gray-800">True</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${activeItem.content.correctAnswer === false ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}>
                  <input
                    type="radio"
                    name={`answer-${activeIndex}`}
                    checked={activeItem.content.correctAnswer === false}
                    onChange={() =>
                      updateStatement(activeIndex, 'correctAnswer', false)
                    }
                    className="w-4 h-4 text-red-600 focus:ring-red-500"
                  />
                  <span className="font-semibold text-gray-800">False</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4">
              {/* Prev / Next Navigation */}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex(activeIndex - 1)}
                >
                  Previous
                </Button>
                {activeIndex < items.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setActiveIndex(activeIndex + 1)}
                  >
                    Next Statement
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={addStatement}
                    className="bg-saBlue hover:bg-saBlueDark"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Next
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
