import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    DollarSign,
    Users,
    Gift,
    Copy,
    Check,
    Plus,
    CreditCard,
    LogOut,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    UserPlus,
    Share2,
    ChevronRight,
    Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';

interface AgencyInfo {
    id: number;
    name: string;
    email: string;
    phone: string;
    referral_code: string;
    commission_type: 'PERCENTAGE' | 'FIXED';
    commission_rate: number;
    min_payout_limit: number;
    points_balance: number;
    total_earnings: number;
    paid_earnings: number;
    total_students: number;
    total_revenue: number;
    progress_percent: number;
    can_request_payout: boolean;
}

interface StudentItem {
    id: number;
    name: string;
    email: string;
    phone: string;
    class_name: string;
    board_name: string;
    created_at: string;
    total_paid: number;
    total_commission: number;
}

interface EarningItem {
    id: number;
    amount_paid: number;
    commission_amount: number;
    status: string;
    notes?: string;
    created_at: string;
    student: {
        user: {
            name: string;
            email: string;
        }
    }
}

interface PayoutItem {
    id: number;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    payout_method: string;
    account_details?: string;
    requested_at: string;
}

export function AgencyDashboardPage() {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState<{
        agency: AgencyInfo;
        recentEarnings: EarningItem[];
        recentPayouts: PayoutItem[];
    } | null>(null);
    const [students, setStudents] = useState<StudentItem[]>([]);
    const [allEarnings, setAllEarnings] = useState<EarningItem[]>([]);
    const [allPayouts, setAllPayouts] = useState<PayoutItem[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [boards, setBoards] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'earnings' | 'payouts'>('students');
    const [copied, setCopied] = useState(false);

    // Add Student Modal State
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const [studentForm, setStudentForm] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        class_id: '',
        board_id: '',
        gender: '',
        school: '',
    });
    const [submittingStudent, setSubmittingStudent] = useState(false);

    // Request Payout Modal State
    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [payoutForm, setPayoutForm] = useState({
        amount: '',
        payout_method: 'UPI / Bank Transfer',
        account_details: '',
        notes: '',
    });
    const [submittingPayout, setSubmittingPayout] = useState(false);

    useEffect(() => {
        fetchDashboard();
        fetchStudents();
        fetchEarnings();
        fetchPayouts();
        fetchClassesAndBoards();
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const res = await api.get('/agency/dashboard');
            setDashboardData(res.data);
            if (res.data.agency) {
                setPayoutForm(prev => ({
                    ...prev,
                    amount: String(res.data.agency.points_balance),
                }));
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load agency dashboard');
            if (error.response?.status === 401) {
                navigate('/agency/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await api.get('/agency/students');
            setStudents(res.data);
        } catch (error: any) {
            console.error('Error loading agency students:', error);
        }
    };

    const fetchEarnings = async () => {
        try {
            const res = await api.get('/agency/earnings');
            setAllEarnings(res.data);
        } catch (error: any) {
            console.error('Error loading agency earnings:', error);
        }
    };

    const fetchPayouts = async () => {
        try {
            const res = await api.get('/agency/payouts');
            setAllPayouts(res.data);
        } catch (error: any) {
            console.error('Error loading agency payouts:', error);
        }
    };

    const fetchClassesAndBoards = async () => {
        try {
            const [cRes, bRes] = await Promise.all([
                api.get('/classes'),
                api.get('/boards')
            ]);
            setClasses(cRes.data || []);
            setBoards(bRes.data || []);
        } catch (e) {
            console.error('Error loading classes/boards:', e);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('agency');
        toast.info('Logged out from Agency Portal');
        navigate('/agency/login');
    };

    const handleCopyReferralCode = () => {
        if (!dashboardData?.agency.referral_code) return;
        navigator.clipboard.writeText(dashboardData.agency.referral_code);
        setCopied(true);
        toast.success('Referral Code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmittingStudent(true);
            await api.post('/agency/students', studentForm);
            toast.success('Student profile created and associated with your agency!');
            setIsAddStudentOpen(false);
            setStudentForm({
                name: '',
                email: '',
                phone: '',
                password: '',
                class_id: '',
                board_id: '',
                gender: '',
                school: '',
            });
            fetchDashboard();
            fetchStudents();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create student');
        } finally {
            setSubmittingStudent(false);
        }
    };

    const handleRequestPayout = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmittingPayout(true);
            await api.post('/agency/payout-request', payoutForm);
            toast.success('Reimbursement payout request submitted to Admin!');
            setIsPayoutModalOpen(false);
            fetchDashboard();
            fetchPayouts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit payout request');
        } finally {
            setSubmittingPayout(false);
        }
    };

    if (loading || !dashboardData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center space-y-3">
                    <img src="/studyasan-logo-lady.png" alt="Loading" className="w-12 h-12 animate-bounce mx-auto object-contain" />
                    <p className="text-slate-600 font-medium">Loading Agency Portal...</p>
                </div>
            </div>
        );
    }

    const { agency } = dashboardData;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
            {/* Header / Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-[#0076CE] px-3.5 py-1.5 rounded-xl flex items-center shadow-sm">
                        <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-7 object-contain" />
                    </div>
                    <div className="border-l border-slate-200 pl-3">
                        <h1 className="font-bold text-base text-slate-900 leading-tight">{agency.name}</h1>
                        <p className="text-xs text-slate-500">Agency ID #{agency.id} • Partner Dashboard</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button onClick={handleLogout} variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                        <LogOut className="w-4 h-4 mr-1.5 text-slate-500" /> Logout
                    </Button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
                {/* Top Banner & Referral Code Share Card */}
                <div className="bg-gradient-to-r from-[#0076CE] to-[#0055a3] rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white">
                    <div className="space-y-2 max-w-xl z-10">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full uppercase tracking-wider">
                            Agency Partner Program
                        </span>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                            Earn {agency.commission_type === 'PERCENTAGE' ? `${agency.commission_rate}% Commission` : `₹${agency.commission_rate} Fixed`} Per Student Fee Payment
                        </h2>
                        <p className="text-sky-100 text-sm">
                            Share your unique Agency Referral Code or register students directly to earn redeemable cash rewards on every student payment.
                        </p>
                    </div>

                    <div className="bg-white/15 backdrop-blur-xl border border-white/25 p-5 rounded-2xl w-full md:w-auto shrink-0 space-y-2.5 z-10">
                        <div className="text-xs text-white font-bold tracking-wide">Your Unique Agency Referral Code</div>
                        <div className="flex items-center gap-2">
                            <span className="px-4 py-2 bg-white text-[#0076CE] font-mono text-xl font-extrabold rounded-xl tracking-wider shadow-inner">
                                {agency.referral_code}
                            </span>
                            <Button onClick={handleCopyReferralCode} className="bg-slate-900 text-white hover:bg-slate-800 font-bold shadow-md">
                                {copied ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
                                {copied ? 'Copied!' : 'Copy Code'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Earning Overview Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Redeemable Balance */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Redeemable Balance</span>
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                                <Award className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-[#0076CE]">₹{agency.points_balance.toLocaleString()}</h3>
                            <p className="text-xs text-slate-500 mt-1">Available for payout reimbursement</p>
                        </div>
                        <Button
                            onClick={() => setIsPayoutModalOpen(true)}
                            disabled={!agency.can_request_payout}
                            className={`w-full text-xs font-bold ${agency.can_request_payout
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                }`}
                        >
                            {agency.can_request_payout ? 'Request Reimbursement' : `Reach ₹${agency.min_payout_limit} to Redeem`}
                        </Button>
                    </div>

                    {/* Total Commission Earned */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Earnings</span>
                            <div className="p-2 bg-sky-100 text-[#0076CE] rounded-xl">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-slate-900">₹{agency.total_earnings.toLocaleString()}</h3>
                            <p className="text-xs text-slate-500 mt-1">Total accumulated commission</p>
                        </div>
                    </div>

                    {/* Total Reimbursed Paid */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Paid Out</span>
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                <CreditCard className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-slate-900">₹{agency.paid_earnings.toLocaleString()}</h3>
                            <p className="text-xs text-slate-500 mt-1">Reimbursed cash payouts</p>
                        </div>
                    </div>

                    {/* Referred Students */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Referred Students</span>
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-3xl font-extrabold text-slate-900">{agency.total_students}</h3>
                            <p className="text-xs text-slate-500 mt-1">Students admitted via your agency</p>
                        </div>
                    </div>
                </div>

                {/* Reimbursement Threshold Progress Bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <TrendingUp className="w-4 h-4 text-[#0076CE]" /> Reimbursement Threshold Progress
                        </div>
                        <div className="text-xs text-slate-600 font-mono font-medium">
                            ₹{agency.points_balance} / ₹{agency.min_payout_limit} min limit ({agency.progress_percent}%)
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                            className="bg-gradient-to-r from-[#0076CE] to-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${agency.progress_percent}%` }}
                        />
                    </div>
                </div>

                {/* Main Content Area: Tabs & Actions */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('students')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'students'
                                        ? 'bg-[#0076CE] text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                Referred Students ({students.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('earnings')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'earnings'
                                        ? 'bg-[#0076CE] text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                Commission Log ({allEarnings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('payouts')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === 'payouts'
                                        ? 'bg-[#0076CE] text-white shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                Payout History ({allPayouts.length})
                            </button>
                        </div>
                    </div>

                    {/* Tab 1: Referred Students Table */}
                    {activeTab === 'students' && (
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Student Name</th>
                                        <th className="p-3">Contact Email</th>
                                        <th className="p-3">Phone</th>
                                        <th className="p-3">Class / Board</th>
                                        <th className="p-3">Admission Date</th>
                                        <th className="p-3 font-semibold text-emerald-600">Commission Earned</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center p-8 text-slate-500">
                                                No students registered yet. Click <strong>Add Student Profile</strong> to register your first student!
                                            </td>
                                        </tr>
                                    ) : (
                                        students.map((student) => (
                                            <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3 font-semibold text-slate-900">{student.name}</td>
                                                <td className="p-3 text-slate-600">{student.email}</td>
                                                <td className="p-3 text-slate-600">{student.phone}</td>
                                                <td className="p-3 text-slate-600">{student.class_name} • {student.board_name}</td>
                                                <td className="p-3 text-slate-500 text-xs">{new Date(student.created_at).toLocaleDateString()}</td>
                                                <td className="p-3 font-bold text-emerald-600">₹{student.total_commission.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab 2: Commission Earnings Log */}
                    {activeTab === 'earnings' && (
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Referred Student</th>
                                        <th className="p-3">Fee Amount Paid</th>
                                        <th className="p-3">Commission Earned</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allEarnings.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-slate-500">
                                                No commission transactions recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        allEarnings.map((earning) => (
                                            <tr key={earning.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3 text-slate-500 text-xs">{new Date(earning.created_at).toLocaleDateString()}</td>
                                                <td className="p-3 font-medium text-slate-900">{earning.student?.user?.name || 'N/A'}</td>
                                                <td className="p-3 text-slate-700">₹{earning.amount_paid.toLocaleString()}</td>
                                                <td className="p-3 font-bold text-emerald-600">₹{earning.commission_amount.toLocaleString()}</td>
                                                <td className="p-3">
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                                                        {earning.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab 3: Payout History */}
                    {activeTab === 'payouts' && (
                        <div className="p-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Requested Date</th>
                                        <th className="p-3">Amount</th>
                                        <th className="p-3">Method</th>
                                        <th className="p-3">Account Details</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allPayouts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-slate-500">
                                                No payout reimbursement requests submitted yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        allPayouts.map((payout) => (
                                            <tr key={payout.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3 text-slate-500 text-xs">{new Date(payout.requested_at).toLocaleDateString()}</td>
                                                <td className="p-3 font-bold text-emerald-600">₹{payout.amount.toLocaleString()}</td>
                                                <td className="p-3 text-slate-700">{payout.payout_method}</td>
                                                <td className="p-3 text-xs text-slate-600">{payout.account_details || 'N/A'}</td>
                                                <td className="p-3">
                                                    {payout.status === 'PENDING' && (
                                                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">Pending Review</span>
                                                    )}
                                                    {payout.status === 'PAID' && (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Paid Out</span>
                                                    )}
                                                    {payout.status === 'APPROVED' && (
                                                        <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-bold">Approved</span>
                                                    )}
                                                    {payout.status === 'REJECTED' && (
                                                        <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">Rejected</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Request Reimbursement Modal */}
            {isPayoutModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Award className="w-5 h-5 text-[#0076CE]" /> Request Reimbursement Payout
                            </h3>
                            <button onClick={() => setIsPayoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRequestPayout} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Requested Amount (₹) *</label>
                                <Input
                                    type="number"
                                    required
                                    placeholder="Amount"
                                    value={payoutForm.amount}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                                    className="text-lg font-bold"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">Available balance: ₹{agency.points_balance}</p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700">Payout Method *</label>
                                <Input
                                    required
                                    placeholder="e.g. Bank Transfer / UPI / GPay"
                                    value={payoutForm.payout_method}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, payout_method: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700">Bank / Account Details *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Enter UPI ID or Bank Account Number, IFSC, Name"
                                    value={payoutForm.account_details}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, account_details: e.target.value })}
                                    className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076CE]"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <Button type="button" onClick={() => setIsPayoutModalOpen(false)} variant="outline">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submittingPayout} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                                    {submittingPayout ? 'Submitting...' : 'Submit Request'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
