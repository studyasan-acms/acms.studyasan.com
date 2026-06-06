import { useState } from 'react';
import { Plus, Trash2, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { uploadService } from '../../../../services/api';
import { toast } from 'sonner';
import type { MatchPairsContent } from '../../../../types/activity';

interface Props {
  items: any[];
  onItemsChange: (items: any[]) => void;
}

export default function MatchPairsBuilder({ items, onItemsChange }: Props) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const addPair = () => {
    const newItem = {
      content: {
        pairs: [{ left: '', right: '', imageLeft: '', imageRight: '' }],
      } as MatchPairsContent,
      points: 10,
    };
    onItemsChange([...items, newItem]);
  };

  const updatePair = (itemIndex: number, pairIndex: number, field: string, value: string) => {
    const newItems = [...items];
    if (!newItems[itemIndex].content.pairs) {
      newItems[itemIndex].content.pairs = [];
    }
    newItems[itemIndex].content.pairs[pairIndex] = {
      ...newItems[itemIndex].content.pairs[pairIndex],
      [field]: value,
    };
    onItemsChange(newItems);
  };

  const addPairToItem = (itemIndex: number) => {
    const newItems = [...items];
    if (!newItems[itemIndex].content.pairs) {
      newItems[itemIndex].content.pairs = [];
    }
    newItems[itemIndex].content.pairs.push({
      left: '',
      right: '',
      imageLeft: '',
      imageRight: '',
    });
    onItemsChange(newItems);
  };

  const removePair = (itemIndex: number, pairIndex: number) => {
    const newItems = [...items];
    newItems[itemIndex].content.pairs.splice(pairIndex, 1);
    onItemsChange(newItems);
  };

  const removeItem = (itemIndex: number) => {
    const newItems = items.filter((_, i) => i !== itemIndex);
    onItemsChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Create matching pairs for students to connect
        </p>
        <Button type="button" onClick={addPair} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Set
        </Button>
      </div>

      {items.map((item, itemIndex) => (
        <div key={itemIndex} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Set {itemIndex + 1}</h4>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Points"
                min="1"
                className="w-20 px-2 py-1 border rounded text-sm"
                value={item.points}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[itemIndex].points = Number(e.target.value);
                  onItemsChange(newItems);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(itemIndex)}
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {item.content.pairs?.map((pair: any, pairIndex: number) => (
              <div key={pairIndex} className="grid grid-cols-2 gap-4 p-3 bg-white rounded border">
                <div>
                  <label className="block text-xs font-medium mb-1">Left Item</label>
                  <input
                    type="text"
                    placeholder="Text for left side"
                    className="w-full px-3 py-2 border rounded text-sm"
                    value={pair.left}
                    onChange={(e) =>
                      updatePair(itemIndex, pairIndex, 'left', e.target.value)
                    }
                  />
                  {pair.imageLeft ? (
                    <div className="relative w-full h-24 mt-2 rounded border overflow-hidden">
                      <img src={pair.imageLeft} alt="Left media" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => updatePair(itemIndex, pairIndex, 'imageLeft', '')}
                        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-blue-600 w-full h-24 mt-2 border-2 border-dashed rounded bg-gray-50 hover:bg-gray-100">
                      {uploadingId === `left-${itemIndex}-${pairIndex}` ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><ImagePlus className="w-4 h-4" /> Add Image</>
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
                            setUploadingId(`left-${itemIndex}-${pairIndex}`);
                            const res = await uploadService.uploadFile(file, 'activities/matchpairs');
                            updatePair(itemIndex, pairIndex, 'imageLeft', res.url);
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
                <div>
                  <label className="block text-xs font-medium mb-1">Right Item</label>
                  <input
                    type="text"
                    placeholder="Text for right side"
                    className="w-full px-3 py-2 border rounded text-sm"
                    value={pair.right}
                    onChange={(e) =>
                      updatePair(itemIndex, pairIndex, 'right', e.target.value)
                    }
                  />
                  {pair.imageRight ? (
                    <div className="relative w-full h-24 mt-2 rounded border overflow-hidden">
                      <img src={pair.imageRight} alt="Right media" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => updatePair(itemIndex, pairIndex, 'imageRight', '')}
                        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-blue-600 w-full h-24 mt-2 border-2 border-dashed rounded bg-gray-50 hover:bg-gray-100">
                      {uploadingId === `right-${itemIndex}-${pairIndex}` ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><ImagePlus className="w-4 h-4" /> Add Image</>
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
                            setUploadingId(`right-${itemIndex}-${pairIndex}`);
                            const res = await uploadService.uploadFile(file, 'activities/matchpairs');
                            updatePair(itemIndex, pairIndex, 'imageRight', res.url);
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
                {item.content.pairs.length > 1 && (
                  <div className="col-span-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePair(itemIndex, pairIndex)}
                    >
                      <Trash2 className="w-3 h-3 text-red-600 mr-1" />
                      Remove Pair
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPairToItem(itemIndex)}
            className="mt-3"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Pair
          </Button>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-gray-500 mb-3">No matching pairs added yet</p>
          <Button type="button" onClick={addPair} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add First Set
          </Button>
        </div>
      )}
    </div>
  );
}
