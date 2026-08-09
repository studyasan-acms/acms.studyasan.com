import React, { useEffect, useState } from 'react';
import {
    Users,
    Plus,
    DollarSign,
    TrendingUp,
    CheckCircle,
    XCircle,
    Search,
    Edit3,
    Trash2,
    Building2,
    CreditCard,
    Award,
    RefreshCw,
    ExternalLink,
    Check,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';

interface Agency {
    id: number;
    name: string;
    email: string;
    phone: string;
    referral_code: string;
    commission_type: 'PERCENTAGE' | 'FIXED';
    commission_rate: number;
    min_payout_limit: number;
    total_earnings: number;
    paid_earnings: number;
    points_balance: number;
    is_active: boolean;
    created_at: string;
    student_count: number;
    total_revenue: number;
}

interface PayoutRequest {
    id: number;
    agency_id: number;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    payout_method: string;
    account_details?: string;
    notes?: string;
    requested_at: string;
    agency: {
        name: string;
        email: string;
        phone: string;
    };
}

export function AdminAgenciesPage() {
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'agencies' | 'payouts'>('agencies');

    // Create / Edit Agency Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        referral_code: '',
        commission_type: 'PERCENTAGE',
        commission_rate: '10',
        min_payout_limit: '1000',
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchAgencies();
        fetchPayouts();
    }, []);

    const fetchAgencies = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/agencies');
            setAgencies(res.data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load agencies');
        } finally {
            setLoading(false);
        }
    };

    const fetchPayouts = async () => {
        try {
            const res = await api.get('/admin/agency-payouts');
            setPayouts(res.data);
        } catch (error: any) {
            console.error('Error loading payouts:', error);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingAgency(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            referral_code: '',
            commission_type: 'PERCENTAGE',
            commission_rate: '10',
            min_payout_limit: '1000',
            is_active: true,
        });
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (agency: Agency) => {
        setEditingAgency(agency);
        setFormData({
            name: agency.name,
            email: agency.email,
            phone: agency.phone,
            password: '', // Leave blank unless changing password
            referral_code: agency.referral_code,
            commission_type: agency.commission_type,
            commission_rate: String(agency.commission_rate),
            min_payout_limit: String(agency.min_payout_limit),
            is_active: agency.is_active,
        });
        setIsCreateModalOpen(true);
    };

    const handleSubmitAgency = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            if (editingAgency) {
                await api.put(`/admin/agencies/${editingAgency.id}`, formData);
                toast.success('Agency updated successfully');
            } else {
                await api.post('/admin/agencies', formData);
                toast.success('Agency created successfully');
            }
            setIsCreateModalOpen(false);
            fetchAgencies();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save agency');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAgency = async (id: number) => {
        if (!confirm('Are you sure you want to delete this agency? This cannot be undone.')) return;
        try {
            await api.delete(`/admin/agencies/${id}`);
            toast.success('Agency deleted');
            fetchAgencies();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete agency');
        }
    };

    const handleUpdatePayoutStatus = async (payoutId: number, status: 'APPROVED' | 'REJECTED' | 'PAID') => {
        try {
            await api.patch(`/admin/agency-payouts/${payoutId}`, { status });
            toast.success(`Payout marked as ${status}`);
            fetchPayouts();
            fetchAgencies();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update payout status');
        }
    };

    const filteredAgencies = agencies.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.referral_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalAgencies = agencies.length;
    const totalReferredStudents = agencies.reduce((acc, a) => acc + (a.student_count || 0), 0);
    const totalCommissionsEarned = agencies.reduce((acc, a) => acc + (a.total_earnings || 0), 0);
    const totalPendingPayouts = payouts.filter(p => p.status === 'PENDING').length;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="h-7 w-7 text-sky-600" />
                        Referrals & Agency Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Register agencies/referrers, set commissions, and manage reimbursement payouts
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={fetchAgencies} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </Button>
                    <Button onClick={handleOpenCreateModal} className="bg-sky-600 hover:bg-sky-700 text-white">
                        <Plus className="h-4 w-4 mr-2" /> Register New Agency
                    </Button>
                </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-sky-100 rounded-lg text-sky-600">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Agencies</p>
                        <h3 className="text-2xl font-bold text-slate-900">{totalAgencies}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Referred Students</p>
                        <h3 className="text-2xl font-bold text-slate-900">{totalReferredStudents}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Commissions</p>
                        <h3 className="text-2xl font-bold text-slate-900">₹{totalCommissionsEarned.toLocaleString()}</h3>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Pending Payouts</p>
                        <h3 className="text-2xl font-bold text-slate-900">{totalPendingPayouts}</h3>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('agencies')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'agencies'
                            ? 'border-sky-600 text-sky-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Agencies & Referrers ({agencies.length})
                </button>
                <button
                    onClick={() => setActiveTab('payouts')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors relative ${activeTab === 'payouts'
                            ? 'border-sky-600 text-sky-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Reimbursement Payout Requests ({payouts.length})
                    {totalPendingPayouts > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full font-bold animate-pulse">
                            {totalPendingPayouts} Pending
                        </span>
                    )}
                </button>
            </div>

            {/* Tab 1: Agencies Table */}
            {activeTab === 'agencies' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
                    <div className="flex items-center gap-4 max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Agency / Referrer</th>
                                    <th className="p-3">Referral Code</th>
                                    <th className="p-3">Commission Rate</th>
                                    <th className="p-3">Referred Students</th>
                                    <th className="p-3">Earned Commission</th>
                                    <th className="p-3">Points Balance</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="text-center p-8 text-slate-400">Loading agencies...</td>
                                    </tr>
                                ) : filteredAgencies.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center p-8 text-slate-500">No agencies found.</td>
                                    </tr>
                                ) : (
                                    filteredAgencies.map((agency) => (
                                        <tr key={agency.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-900">{agency.name}</div>
                                                <div className="text-xs text-slate-500">{agency.email} • {agency.phone}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-800 rounded-md">
                                                    {agency.referral_code}
                                                </span>
                                            </td>
                                            <td className="p-3 font-medium">
                                                {agency.commission_type === 'PERCENTAGE'
                                                    ? `${agency.commission_rate}% per fee payment`
                                                    : `₹${agency.commission_rate} fixed per payment`}
                                            </td>
                                            <td className="p-3 font-semibold text-slate-800">
                                                {agency.student_count}
                                            </td>
                                            <td className="p-3 font-bold text-emerald-600">
                                                ₹{agency.total_earnings.toLocaleString()}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-bold text-sky-600">₹{agency.points_balance.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-400">Min limit: ₹{agency.min_payout_limit}</div>
                                            </td>
                                            <td className="p-3">
                                                {agency.is_active ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                        <CheckCircle className="h-3.5 w-3.5" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                        <XCircle className="h-3.5 w-3.5" /> Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button onClick={() => handleOpenEditModal(agency)} variant="ghost" size="icon" title="Edit Agency">
                                                        <Edit3 className="h-4 w-4 text-slate-600" />
                                                    </Button>
                                                    <Button onClick={() => handleDeleteAgency(agency.id)} variant="ghost" size="icon" title="Delete Agency">
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Payout Requests */}
            {activeTab === 'payouts' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
                    <h3 className="font-semibold text-slate-800">Reimbursement Payout Requests</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Agency</th>
                                    <th className="p-3">Requested Amount</th>
                                    <th className="p-3">Payment Method</th>
                                    <th className="p-3">Account Details</th>
                                    <th className="p-3">Requested At</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payouts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center p-8 text-slate-500">No payout requests found.</td>
                                    </tr>
                                ) : (
                                    payouts.map((payout) => (
                                        <tr key={payout.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3">
                                                <div className="font-semibold text-slate-900">{payout.agency.name}</div>
                                                <div className="text-xs text-slate-500">{payout.agency.email} • {payout.agency.phone}</div>
                                            </td>
                                            <td className="p-3 font-bold text-emerald-600 text-base">
                                                ₹{payout.amount.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-slate-700 font-medium">
                                                {payout.payout_method || 'Bank Transfer'}
                                            </td>
                                            <td className="p-3 text-xs text-slate-600 max-w-xs truncate">
                                                {payout.account_details || 'N/A'}
                                            </td>
                                            <td className="p-3 text-xs text-slate-500">
                                                {new Date(payout.requested_at).toLocaleDateString()}
                                            </td>
                                            <td className="p-3">
                                                {payout.status === 'PENDING' && (
                                                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Pending</span>
                                                )}
                                                {payout.status === 'APPROVED' && (
                                                    <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">Approved</span>
                                                )}
                                                {payout.status === 'PAID' && (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Paid</span>
                                                )}
                                                {payout.status === 'REJECTED' && (
                                                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Rejected</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {payout.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                onClick={() => handleUpdatePayoutStatus(payout.id, 'APPROVED')}
                                                                size="sm"
                                                                className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8"
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleUpdatePayoutStatus(payout.id, 'REJECTED')}
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8"
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {(payout.status === 'PENDING' || payout.status === 'APPROVED') && (
                                                        <Button
                                                            onClick={() => handleUpdatePayoutStatus(payout.id, 'PAID')}
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                                                        >
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create / Edit Agency Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingAgency ? 'Edit Agency / Referrer' : 'Register New Agency / Referrer'}
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAgency} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Agency / Referrer Name *</label>
                                <Input
                                    required
                                    placeholder="e.g. Acme Educational Consultancy"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Login Email *</label>
                                    <Input
                                        type="email"
                                        required
                                        placeholder="agency@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                                    <Input
                                        required
                                        placeholder="+91 9876543210"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    Password {editingAgency && '(Leave blank to keep unchanged)'} *
                                </label>
                                <Input
                                    type="password"
                                    required={!editingAgency}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Referral Code (Optional)</label>
                                    <Input
                                        placeholder="Auto-generated if empty"
                                        value={formData.referral_code}
                                        onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Commission Type</label>
                                    <select
                                        className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                                        value={formData.commission_type}
                                        onChange={(e) => setFormData({ ...formData, commission_type: e.target.value as any })}
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">
                                        Commission Rate ({formData.commission_type === 'PERCENTAGE' ? '%' : '₹'}) *
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="e.g. 10"
                                        value={formData.commission_rate}
                                        onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Min Payout Limit (₹) *</label>
                                    <Input
                                        type="number"
                                        required
                                        placeholder="e.g. 1000"
                                        value={formData.min_payout_limit}
                                        onChange={(e) => setFormData({ ...formData, min_payout_limit: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="agencyActive"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <label htmlFor="agencyActive" className="text-sm font-medium text-slate-700">
                                    Agency Account Active
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <Button type="button" onClick={() => setIsCreateModalOpen(false)} variant="outline">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting} className="bg-sky-600 hover:bg-sky-700 text-white">
                                    {submitting ? 'Saving...' : editingAgency ? 'Update Agency' : 'Register Agency'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
