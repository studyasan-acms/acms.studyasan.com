import { useState } from 'react';
import { Plus, Trash2, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { uploadService } from '../../../../services/api';
import { toast } from 'sonner';
import type { QuizGameContent } from '../../../../types/activity';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function QuizGameBuilder({ items, onItemsChange }: Props) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const addQuestion = () => {
    const newItem = {
      content: {
        question: '',
        options: ['', '', '', ''],
        optionsMedia: ['', '', '', ''],
        correctAnswer: 0,
        timeLimit: 30,
      } as QuizGameContent,
      points: 10,
    };
    onItemsChange([...items, newItem]);
    setActiveIndex(items.length); // jump to new question
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index].content[field] = value;
    onItemsChange(newItems);
  };

  const updateOption = (itemIndex: number, optionIndex: number, value: string) => {
    const newItems = [...items];
    newItems[itemIndex].content.options[optionIndex] = value;
    onItemsChange(newItems);
  };

  const updateOptionMedia = (itemIndex: number, optionIndex: number, value: string) => {
    const newItems = [...items];
    if (!newItems[itemIndex].content.optionsMedia) {
      newItems[itemIndex].content.optionsMedia = ['', '', '', ''];
    }
    newItems[itemIndex].content.optionsMedia[optionIndex] = value;
    onItemsChange(newItems);
  };

  const removeQuestion = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onItemsChange(newItems);
    if (activeIndex >= newItems.length && newItems.length > 0) {
      setActiveIndex(newItems.length - 1);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50">
        <p className="text-gray-500 mb-4">No questions added yet</p>
        <Button type="button" onClick={addQuestion} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Add First Question
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
          <h3 className="font-semibold text-gray-700">Questions ({items.length})</h3>
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
              Question {idx + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={addQuestion}
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
            <h4 className="text-xl font-bold text-gray-800">Question {activeIndex + 1}</h4>
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
                onClick={() => removeQuestion(activeIndex)}
                className="bg-red-50 hover:bg-red-100 text-red-600 border-none"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Remove
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Question Text</label>
              <textarea
                className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:bg-white transition-colors mb-3 text-lg resize-y"
                rows={3}
                placeholder="Enter your question"
                value={activeItem.content.question}
                onChange={(e) =>
                  updateQuestion(activeIndex, 'question', e.target.value)
                }
              />
              {activeItem.content.questionMedia ? (
                <div className="relative w-full max-w-sm h-48 rounded-lg border-2 overflow-hidden group">
                  <img src={activeItem.content.questionMedia} alt="Question media" className="w-full h-full object-contain bg-gray-50" />
                  <button
                    type="button"
                    onClick={() => updateQuestion(activeIndex, 'questionMedia', '')}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-saBlue hover:text-saBlueDark px-4 py-2 border border-blue-100 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  {uploadingId === `q-${activeIndex}` ? (
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
                        setUploadingId(`q-${activeIndex}`);
                        const res = await uploadService.uploadFile(file, 'activities/quiz');
                        updateQuestion(activeIndex, 'questionMedia', res.url);
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
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700">Answer Options</label>
                <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-gray-100 rounded">Select the radio button to mark the correct answer</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeItem.content.options.map((option: string, optionIndex: number) => {
                  const optMedia = activeItem.content.optionsMedia?.[optionIndex];
                  const isCorrect = activeItem.content.correctAnswer === optionIndex;
                  return (
                    <div key={optionIndex} className={`flex flex-col gap-3 p-4 border-2 rounded-xl transition-all ${isCorrect ? 'border-green-500 bg-green-50/30 shadow-sm' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <input
                            type="radio"
                            name={`correct-${activeIndex}`}
                            checked={isCorrect}
                            onChange={() =>
                              updateQuestion(activeIndex, 'correctAnswer', optionIndex)
                            }
                            className="w-5 h-5 text-green-600 focus:ring-green-500 cursor-pointer"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder={`Option ${optionIndex + 1}`}
                          className="flex-1 px-3 py-2 border rounded-lg bg-white"
                          value={option}
                          onChange={(e) =>
                            updateOption(activeIndex, optionIndex, e.target.value)
                          }
                        />
                      </div>

                      {/* Option Image Upload */}
                      <div className="pl-8">
                        {optMedia ? (
                          <div className="relative w-full h-32 border-2 rounded-lg overflow-hidden group">
                            <img src={optMedia} alt={`Option ${optionIndex + 1}`} className="w-full h-full object-contain bg-white" />
                            <button
                              type="button"
                              onClick={() => updateOptionMedia(activeIndex, optionIndex, '')}
                              className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-saBlue w-full py-2 border border-dashed rounded-lg bg-white hover:bg-blue-50 transition-colors">
                            {uploadingId === `o-${activeIndex}-${optionIndex}` ? (
                              <Loader2 className="w-4 h-4 animate-spin text-saBlue" />
                            ) : (
                              <ImagePlus className="w-4 h-4" />
                            )}
                            <span>Add Image</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              disabled={uploadingId !== null}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  setUploadingId(`o-${activeIndex}-${optionIndex}`);
                                  const res = await uploadService.uploadFile(file, 'activities/quiz');
                                  updateOptionMedia(activeIndex, optionIndex, res.url);
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
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-gray-700">Time Limit</label>
                <select
                  className="px-3 py-2 border rounded-lg bg-gray-50"
                  value={activeItem.content.timeLimit || 30}
                  onChange={(e) =>
                    updateQuestion(activeIndex, 'timeLimit', Number(e.target.value))
                  }
                >
                  <option value={10}>10 seconds</option>
                  <option value={20}>20 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={45}>45 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={120}>2 minutes</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>

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
                    Next Question
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={addQuestion}
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
