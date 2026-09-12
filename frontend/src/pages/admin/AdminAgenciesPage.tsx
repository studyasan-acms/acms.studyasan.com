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
    AlertCircle,
    Landmark,
    Copy,
    QrCode,
    ShieldCheck
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
    account_holder_name?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
    branch_name?: string | null;
    account_type?: string | null;
    upi_id?: string | null;
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
        id?: number;
        name: string;
        email: string;
        phone: string;
        account_holder_name?: string | null;
        bank_name?: string | null;
        account_number?: string | null;
        ifsc_code?: string | null;
        branch_name?: string | null;
        account_type?: string | null;
        upi_id?: string | null;
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
    const [activeModalTab, setActiveModalTab] = useState<'general' | 'payout'>('general');
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
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        account_type: 'SAVINGS',
        upi_id: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // View Agency Payout Details Modal State
    const [viewingPayoutDetails, setViewingPayoutDetails] = useState<{
        name: string;
        email: string;
        phone: string;
        account_holder_name?: string | null;
        bank_name?: string | null;
        account_number?: string | null;
        ifsc_code?: string | null;
        branch_name?: string | null;
        account_type?: string | null;
        upi_id?: string | null;
        snapshot_details?: string | null;
    } | null>(null);

    const [copiedField, setCopiedField] = useState<string | null>(null);

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

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        toast.success(`${label} copied to clipboard!`);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleOpenCreateModal = () => {
        setEditingAgency(null);
        setActiveModalTab('general');
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
            account_holder_name: '',
            bank_name: '',
            account_number: '',
            ifsc_code: '',
            branch_name: '',
            account_type: 'SAVINGS',
            upi_id: '',
        });
        setIsCreateModalOpen(true);
    };

    const handleOpenEditModal = (agency: Agency) => {
        setEditingAgency(agency);
        setActiveModalTab('general');
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
            account_holder_name: agency.account_holder_name || '',
            bank_name: agency.bank_name || '',
            account_number: agency.account_number || '',
            ifsc_code: agency.ifsc_code || '',
            branch_name: agency.branch_name || '',
            account_type: agency.account_type || 'SAVINGS',
            upi_id: agency.upi_id || '',
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
                toast.success('Agency registered successfully');
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
        <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-900">
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
                        <Award className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Pending Payouts</p>
                        <h3 className="text-2xl font-bold text-amber-600">{totalPendingPayouts}</h3>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 space-x-4">
                <button
                    onClick={() => setActiveTab('agencies')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'agencies'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Building2 className="h-4 w-4" /> Registered Agencies ({agencies.length})
                </button>
                <button
                    onClick={() => setActiveTab('payouts')}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'payouts'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <CreditCard className="h-4 w-4" /> Reimbursement Payouts
                    {totalPendingPayouts > 0 && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full font-bold">
                            {totalPendingPayouts}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab 1: Agencies List */}
            {activeTab === 'agencies' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
                    {/* Search & Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 text-sm"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Agency Name</th>
                                    <th className="p-3">Referral Code</th>
                                    <th className="p-3">Commission Model</th>
                                    <th className="p-3">Students</th>
                                    <th className="p-3">Total Earned</th>
                                    <th className="p-3">Redeemable Balance</th>
                                    <th className="p-3">Payout Account</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAgencies.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center p-8 text-slate-500">
                                            No agencies found matching your query.
                                        </td>
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
                                                {agency.account_number || agency.upi_id ? (
                                                    <button
                                                        onClick={() => setViewingPayoutDetails({
                                                            name: agency.name,
                                                            email: agency.email,
                                                            phone: agency.phone,
                                                            account_holder_name: agency.account_holder_name,
                                                            bank_name: agency.bank_name,
                                                            account_number: agency.account_number,
                                                            ifsc_code: agency.ifsc_code,
                                                            branch_name: agency.branch_name,
                                                            account_type: agency.account_type,
                                                            upi_id: agency.upi_id,
                                                        })}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                                    >
                                                        <Landmark className="w-3.5 h-3.5" />
                                                        {agency.bank_name || 'Bank Set'}
                                                    </button>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Not Set
                                                    </span>
                                                )}
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-800">Reimbursement Payout Requests</h3>
                            <p className="text-xs text-slate-500">Transfer approved funds to the agency's registered bank account or UPI ID below</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Agency</th>
                                    <th className="p-3">Requested Amount</th>
                                    <th className="p-3">Payment Method</th>
                                    <th className="p-3">Bank / UPI Transfer Details</th>
                                    <th className="p-3">Requested Date</th>
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
                                                <span className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-800">
                                                    {payout.payout_method || 'Bank Transfer'}
                                                </span>
                                            </td>
                                            <td className="p-3 max-w-xs">
                                                <div className="space-y-1.5">
                                                    {payout.agency.account_number || payout.agency.bank_name ? (
                                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs space-y-1">
                                                            <div className="font-semibold text-slate-900 flex items-center justify-between">
                                                                <span>{payout.agency.bank_name || 'Bank Account'}</span>
                                                                <button
                                                                    onClick={() => setViewingPayoutDetails({
                                                                        name: payout.agency.name,
                                                                        email: payout.agency.email,
                                                                        phone: payout.agency.phone,
                                                                        account_holder_name: payout.agency.account_holder_name,
                                                                        bank_name: payout.agency.bank_name,
                                                                        account_number: payout.agency.account_number,
                                                                        ifsc_code: payout.agency.ifsc_code,
                                                                        branch_name: payout.agency.branch_name,
                                                                        account_type: payout.agency.account_type,
                                                                        upi_id: payout.agency.upi_id,
                                                                        snapshot_details: payout.account_details,
                                                                    })}
                                                                    className="text-[11px] text-sky-600 hover:underline font-medium"
                                                                >
                                                                    Full Details
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center justify-between font-mono text-slate-700">
                                                                <span>A/C: {payout.agency.account_number}</span>
                                                                <button
                                                                    onClick={() => copyToClipboard(payout.agency.account_number || '', 'Account Number')}
                                                                    className="text-slate-400 hover:text-slate-700 p-0.5"
                                                                    title="Copy Account Number"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                            {payout.agency.ifsc_code && (
                                                                <div className="flex items-center justify-between font-mono text-slate-600">
                                                                    <span>IFSC: {payout.agency.ifsc_code}</span>
                                                                    <button
                                                                        onClick={() => copyToClipboard(payout.agency.ifsc_code || '', 'IFSC Code')}
                                                                        className="text-slate-400 hover:text-slate-700 p-0.5"
                                                                        title="Copy IFSC Code"
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {payout.agency.upi_id && (
                                                                <div className="flex items-center justify-between text-indigo-700 font-mono">
                                                                    <span className="truncate">UPI: {payout.agency.upi_id}</span>
                                                                    <button
                                                                        onClick={() => copyToClipboard(payout.agency.upi_id || '', 'UPI ID')}
                                                                        className="text-indigo-400 hover:text-indigo-700 p-0.5"
                                                                        title="Copy UPI ID"
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-600 break-words">
                                                            {payout.account_details || 'No saved details'}
                                                        </div>
                                                    )}
                                                </div>
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

            {/* View Payout / Bank Account Details Modal */}
            {viewingPayoutDetails && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 text-slate-900">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Landmark className="w-5 h-5 text-sky-600" /> Agency Payout Account
                            </h3>
                            <button onClick={() => setViewingPayoutDetails(null)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-slate-900">{viewingPayoutDetails.name}</h4>
                                <p className="text-xs text-slate-500">{viewingPayoutDetails.email} • {viewingPayoutDetails.phone}</p>
                            </div>

                            {/* Bank Details Card */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bank Details</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">
                                        {viewingPayoutDetails.account_type || 'SAVINGS'}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Account Holder:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900">{viewingPayoutDetails.account_holder_name || viewingPayoutDetails.name}</span>
                                            <button
                                                onClick={() => copyToClipboard(viewingPayoutDetails.account_holder_name || viewingPayoutDetails.name, 'Account Holder Name')}
                                                className="text-slate-400 hover:text-slate-700"
                                                title="Copy Name"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Bank Name:</span>
                                        <span className="font-semibold text-slate-800">{viewingPayoutDetails.bank_name || 'N/A'}</span>
                                    </div>

                                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                                        <span className="text-xs text-slate-500 font-medium">Account Number:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-slate-900 text-base">{viewingPayoutDetails.account_number || 'N/A'}</span>
                                            {viewingPayoutDetails.account_number && (
                                                <button
                                                    onClick={() => copyToClipboard(viewingPayoutDetails.account_number || '', 'Account Number')}
                                                    className="p-1 bg-sky-50 text-sky-600 rounded hover:bg-sky-100"
                                                    title="Copy Account Number"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                                        <span className="text-xs text-slate-500 font-medium">IFSC Code:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-slate-900">{viewingPayoutDetails.ifsc_code || 'N/A'}</span>
                                            {viewingPayoutDetails.ifsc_code && (
                                                <button
                                                    onClick={() => copyToClipboard(viewingPayoutDetails.ifsc_code || '', 'IFSC Code')}
                                                    className="p-1 bg-sky-50 text-sky-600 rounded hover:bg-sky-100"
                                                    title="Copy IFSC Code"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {viewingPayoutDetails.branch_name && (
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Branch:</span>
                                            <span className="text-slate-700">{viewingPayoutDetails.branch_name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* UPI Details Card */}
                            {viewingPayoutDetails.upi_id && (
                                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <span className="text-[11px] uppercase font-bold text-indigo-800 tracking-wider flex items-center gap-1">
                                            <QrCode className="w-3.5 h-3.5" /> UPI ID / VPA
                                        </span>
                                        <div className="font-mono font-bold text-indigo-950">{viewingPayoutDetails.upi_id}</div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => copyToClipboard(viewingPayoutDetails.upi_id || '', 'UPI ID')}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy UPI
                                    </Button>
                                </div>
                            )}

                            {viewingPayoutDetails.snapshot_details && (
                                <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                                    <span className="font-semibold block text-slate-700 mb-0.5">Request Snapshot:</span>
                                    {viewingPayoutDetails.snapshot_details}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setViewingPayoutDetails(null)} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create / Edit Agency Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingAgency ? 'Edit Agency / Referrer' : 'Register New Agency / Referrer'}
                            </h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        {/* Modal Tab Toggle */}
                        <div className="flex border-b border-slate-200">
                            <button
                                type="button"
                                onClick={() => setActiveModalTab('general')}
                                className={`pb-2 text-xs font-bold border-b-2 mr-4 transition-colors flex items-center gap-1.5 ${activeModalTab === 'general'
                                    ? 'border-sky-600 text-sky-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <Building2 className="w-3.5 h-3.5" /> General Information
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveModalTab('payout')}
                                className={`pb-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeModalTab === 'payout'
                                    ? 'border-sky-600 text-sky-600'
                                    : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <Landmark className="w-3.5 h-3.5" /> Payout & Bank Account Details
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAgency} className="space-y-4">
                            {activeModalTab === 'general' ? (
                                <div className="space-y-4">
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
                                                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
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
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2">
                                        <Landmark className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
                                        <span>
                                            Enter the agency's bank account or UPI details for direct reimbursement payout transfers.
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700">Account Holder Name</label>
                                            <Input
                                                placeholder="e.g. John Doe / Apex Edu"
                                                value={formData.account_holder_name}
                                                onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700">Bank Name</label>
                                            <Input
                                                placeholder="e.g. HDFC Bank, SBI"
                                                value={formData.bank_name}
                                                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700">Account Number</label>
                                            <Input
                                                placeholder="Bank Account Number"
                                                value={formData.account_number}
                                                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700">IFSC Code</label>
                                            <Input
                                                placeholder="e.g. HDFC0001234"
                                                value={formData.ifsc_code}
                                                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                                                className="font-mono uppercase"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700">Account Type</label>
                                            <select
                                                className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                                                value={formData.account_type}
                                                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                                            >
                                                <option value="SAVINGS">Savings Account</option>
                                                <option value="CURRENT">Current Account</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-700">Branch Name</label>
                                            <Input
                                                placeholder="e.g. Connaught Place"
                                                value={formData.branch_name}
                                                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-3">
                                        <label className="text-xs font-semibold text-slate-700">UPI ID / VPA</label>
                                        <Input
                                            placeholder="e.g. agency@okhdfcbank"
                                            value={formData.upi_id}
                                            onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

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
