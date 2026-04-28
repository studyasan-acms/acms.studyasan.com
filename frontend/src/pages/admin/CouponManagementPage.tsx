import { useEffect, useMemo, useState } from 'react';
import { couponService } from '@/services/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Coupon {
  id: number;
  code: string;
  discount_type: 'PERCENTAGE' | 'FLAT';
  discount_value: number;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
}

interface CouponFormData {
  code: string;
  discount_type: 'PERCENTAGE' | 'FLAT';
  discount_value: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  max_uses: string;
}

const initialFormData: CouponFormData = {
  code: '',
  discount_type: 'PERCENTAGE',
  discount_value: '',
  is_active: true,
  valid_from: '',
  valid_until: '',
  max_uses: '',
};

const toDatetimeLocal = (iso: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) => (value ? new Date(value).toISOString() : null);

export default function CouponManagementPage() {
  usePageTitle('Coupons');

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);

  const activeCoupons = useMemo(() => coupons.filter((coupon) => coupon.is_active).length, [coupons]);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await couponService.getAll();
      setCoupons(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      is_active: coupon.is_active,
      valid_from: toDatetimeLocal(coupon.valid_from),
      valid_until: toDatetimeLocal(coupon.valid_until),
      max_uses: coupon.max_uses !== null ? String(coupon.max_uses) : '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    const parsedDiscount = Number(formData.discount_value);
    if (Number.isNaN(parsedDiscount) || parsedDiscount <= 0) {
      toast.error('Discount value must be greater than 0');
      return;
    }

    if (formData.discount_type === 'PERCENTAGE' && parsedDiscount > 100) {
      toast.error('Percentage discount cannot exceed 100');
      return;
    }

    if (formData.valid_from && formData.valid_until && new Date(formData.valid_from) > new Date(formData.valid_until)) {
      toast.error('Valid until must be after valid from');
      return;
    }

    const parsedMaxUses = formData.max_uses ? Number(formData.max_uses) : null;
    if (parsedMaxUses !== null && (Number.isNaN(parsedMaxUses) || parsedMaxUses <= 0)) {
      toast.error('Max uses must be greater than 0');
      return;
    }

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: parsedDiscount,
      is_active: formData.is_active,
      valid_from: toIsoOrNull(formData.valid_from),
      valid_until: toIsoOrNull(formData.valid_until),
      max_uses: parsedMaxUses,
    };

    try {
      setSaving(true);
      if (editingId) {
        await couponService.update(editingId, payload);
        toast.success('Coupon updated successfully');
      } else {
        await couponService.create(payload);
        toast.success('Coupon created successfully');
      }
      resetForm();
      await loadCoupons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await couponService.delete(id);
      toast.success('Coupon deleted successfully');
      if (editingId === id) resetForm();
      await loadCoupons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete coupon');
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    try {
      await couponService.update(coupon.id, { is_active: !coupon.is_active });
      toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'}`);
      await loadCoupons();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update coupon status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-700">Coupon Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage discount coupons for enquiries</p>
        </div>
        <Button variant="outline" onClick={loadCoupons} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{coupons.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Active Coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeCoupons}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Inactive Coupons</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-500">{coupons.length - activeCoupons}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Coupon' : 'Create Coupon'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="code">Coupon Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="WELCOME10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="discount_type">Discount Type</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: 'PERCENTAGE' | 'FLAT') => setFormData((prev) => ({ ...prev, discount_type: value }))}
                >
                  <SelectTrigger id="discount_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FLAT">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discount_value">Discount Value</Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, discount_value: e.target.value }))}
                  placeholder={formData.discount_type === 'PERCENTAGE' ? '10' : '500'}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valid_from">Valid From</Label>
                <Input
                  id="valid_from"
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData((prev) => ({ ...prev, valid_from: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="valid_until">Valid Until</Label>
                <Input
                  id="valid_until"
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData((prev) => ({ ...prev, valid_until: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="max_uses">Max Uses (Optional)</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData((prev) => ({ ...prev, max_uses: e.target.value }))}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex gap-2 justify-end">
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {editingId ? 'Update Coupon' : 'Create Coupon'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No coupons created yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map((coupon) => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-medium">{coupon.code}</TableCell>
                        <TableCell>
                          {coupon.discount_type === 'PERCENTAGE'
                            ? `${coupon.discount_value}%`
                            : `Flat ${coupon.discount_value}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                            {coupon.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coupon.used_count}
                          {coupon.max_uses !== null ? ` / ${coupon.max_uses}` : ' / Unlimited'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {coupon.valid_from ? new Date(coupon.valid_from).toLocaleDateString() : 'Any'} -{' '}
                          {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiry'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleStatus(coupon)}>
                              {coupon.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => handleEdit(coupon)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={() => handleDelete(coupon.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
