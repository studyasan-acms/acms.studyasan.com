import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { activityGroupAPI } from '../../../services/activity.service';
import { currencyService } from '../../../services/api';
import type { ActivityGroup, CreateActivityGroupInput } from '../../../types/activity';
import type { Currency } from '../../../types';
import { useAuthStore } from '../../../store/authStore';
import { toast } from 'sonner';

interface Props {
  group: ActivityGroup | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ActivityGroupForm({ group, onSuccess, onCancel }: Props) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [formData, setFormData] = useState<CreateActivityGroupInput>({
    name: '',
    description: '',
    cover_image: '',
    price: null,
    currency_id: null,
  });
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description || '',
        cover_image: group.cover_image || '',
        price: group.price || null,
        currency_id: group.currency_id || null,
      });
    }
  }, [group]);

  const fetchCurrencies = async () => {
    try {
      const currencies = await currencyService.getAll();
      setCurrencies(currencies);
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
    }
  };

  const handleChange = (field: keyof CreateActivityGroupInput, value: any) => {
    setFormData((prev: CreateActivityGroupInput) => ({ ...prev, [field]: value }));
  };

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

          {isAdmin && (
            <>
              <div>
                <Label htmlFor="price" className="block text-sm font-medium mb-2">
                  Price
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.price ?? ''}
                  onChange={(e) => handleChange('price', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="currency_id" className="block text-sm font-medium mb-2">
                  Currency
                </Label>
                <Select
                  value={formData.currency_id?.toString() ?? ''}
                  onValueChange={(value) => handleChange('currency_id', value ? parseInt(value) : null)}
                  disabled={loading}
                >
                  <SelectTrigger id="currency_id">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id.toString()}>
                        {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

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
