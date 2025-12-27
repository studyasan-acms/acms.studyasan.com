import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityGroupAPI } from '../../../services/activity.service';
import type { ActivityGroup, CreateActivityGroupInput } from '../../../types/activity';
import { toast } from 'sonner';

interface Props {
  group: ActivityGroup | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ActivityGroupForm({ group, onSuccess, onCancel }: Props) {
  const [formData, setFormData] = useState<CreateActivityGroupInput>({
    name: '',
    description: '',
    cover_image: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description || '',
        cover_image: group.cover_image || '',
      });
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (group) {
        await activityGroupAPI.update(group.id, formData);
        toast.success('Activity group updated successfully');
      } else {
        await activityGroupAPI.create(formData);
        toast.success('Activity group created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save activity group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {group ? 'Edit Activity Group' : 'Create Activity Group'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Cover Image URL</label>
            <input
              type="url"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              value={formData.cover_image}
              onChange={(e) =>
                setFormData({ ...formData, cover_image: e.target.value })
              }
            />
            {formData.cover_image && (
              <img
                src={formData.cover_image}
                alt="Preview"
                className="mt-2 w-32 h-32 object-cover rounded-lg"
              />
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : group ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
