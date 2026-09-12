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
    Award,
    Landmark,
    Wallet,
    AlertCircle,
    ShieldCheck,
    ArrowUpRight,
    Save,
    QrCode
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
    account_holder_name?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    ifsc_code?: string | null;
    branch_name?: string | null;
    account_type?: string | null;
    upi_id?: string | null;
    has_payout_details?: boolean;
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
    const [activeTab, setActiveTab] = useState<'students' | 'earnings' | 'payouts' | 'payout-settings'>('students');
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
        payout_method: 'Bank Transfer',
        account_details: '',
        notes: '',
    });
    const [submittingPayout, setSubmittingPayout] = useState(false);

    // Payout / Bank Details Form State
    const [payoutDetailsForm, setPayoutDetailsForm] = useState({
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        confirm_account_number: '',
        ifsc_code: '',
        branch_name: '',
        account_type: 'SAVINGS',
        upi_id: '',
    });
    const [savingPayoutDetails, setSavingPayoutDetails] = useState(false);

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
                const ag = res.data.agency;
                setPayoutForm(prev => ({
                    ...prev,
                    amount: String(ag.points_balance),
                    payout_method: ag.upi_id && !ag.account_number ? 'UPI' : 'Bank Transfer',
                }));
                setPayoutDetailsForm({
                    account_holder_name: ag.account_holder_name || '',
                    bank_name: ag.bank_name || '',
                    account_number: ag.account_number || '',
                    confirm_account_number: ag.account_number || '',
                    ifsc_code: ag.ifsc_code || '',
                    branch_name: ag.branch_name || '',
                    account_type: ag.account_type || 'SAVINGS',
                    upi_id: ag.upi_id || '',
                });
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

    const handleSavePayoutDetails = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate account number matching if provided
        if (payoutDetailsForm.account_number && payoutDetailsForm.confirm_account_number) {
            if (payoutDetailsForm.account_number !== payoutDetailsForm.confirm_account_number) {
                toast.error('Bank account numbers do not match. Please verify.');
                return;
            }
        }

        if (!payoutDetailsForm.account_number && !payoutDetailsForm.upi_id) {
            toast.error('Please provide at least a Bank Account Number or a UPI ID.');
            return;
        }

        try {
            setSavingPayoutDetails(true);
            const res = await api.put('/agency/payout-details', payoutDetailsForm);
            toast.success('Payout & bank account details saved successfully!');
            if (res.data.agency) {
                setDashboardData(prev => prev ? {
                    ...prev,
                    agency: {
                        ...prev.agency,
                        ...res.data.agency,
                        has_payout_details: Boolean(res.data.agency.account_number || res.data.agency.upi_id),
                    }
                } : null);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save payout details');
        } finally {
            setSavingPayoutDetails(false);
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
    const hasPayoutConfigured = Boolean(agency.account_number || agency.upi_id);

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
                    <Button
                        onClick={() => setActiveTab('payout-settings')}
                        variant="outline"
                        size="sm"
                        className={`text-xs font-semibold ${hasPayoutConfigured ? 'text-emerald-700 border-emerald-300 bg-emerald-50/50' : 'text-amber-700 border-amber-300 bg-amber-50'}`}
                    >
                        <Landmark className="w-4 h-4 mr-1.5" />
                        {hasPayoutConfigured ? 'Payout Account Set' : 'Setup Payout Account'}
                    </Button>
                    <Button onClick={handleLogout} variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                        <LogOut className="w-4 h-4 mr-1.5 text-slate-500" /> Logout
                    </Button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
                {/* Warning / Setup Notice Banner if Payout details not configured */}
                {!hasPayoutConfigured && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-300 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm shrink-0 mt-0.5">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm md:text-base">Payout Bank / UPI Account Not Configured</h4>
                                <p className="text-xs md:text-sm text-slate-600 mt-0.5">
                                    Please add your Bank Account or UPI ID so the administration can directly transfer your commission reimbursements.
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setActiveTab('payout-settings')}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-sm"
                        >
                            <Landmark className="w-4 h-4 mr-1.5" /> Add Payout Details Now
                        </Button>
                    </div>
                )}

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
                            onClick={() => {
                                if (!hasPayoutConfigured) {
                                    toast.info('Please enter your payout bank details first');
                                    setActiveTab('payout-settings');
                                } else {
                                    setIsPayoutModalOpen(true);
                                }
                            }}
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => setActiveTab('students')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'students'
                                    ? 'bg-[#0076CE] text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Referred Students ({students.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('earnings')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'earnings'
                                    ? 'bg-[#0076CE] text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <DollarSign className="w-4 h-4" />
                                Commission Log ({allEarnings.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('payouts')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'payouts'
                                    ? 'bg-[#0076CE] text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Payout History ({allPayouts.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('payout-settings')}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'payout-settings'
                                    ? 'bg-[#0076CE] text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                            >
                                <Landmark className="w-4 h-4" />
                                Payout & Bank Details
                                {hasPayoutConfigured ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                ) : (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">Required</span>
                                )}
                            </button>
                        </div>

                        {activeTab === 'students' && (
                            <Button
                                onClick={() => setIsAddStudentOpen(true)}
                                className="bg-[#0076CE] hover:bg-[#0055a3] text-white text-xs font-bold shadow-sm"
                            >
                                <UserPlus className="w-4 h-4 mr-1.5" /> Register Student
                            </Button>
                        )}
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
                                                No students registered yet. Click <strong>Register Student</strong> to register your first student!
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
                                        <th className="p-3">Destination Account</th>
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
                                                <td className="p-3 text-slate-700 font-medium">{payout.payout_method}</td>
                                                <td className="p-3 text-xs text-slate-600 max-w-sm break-words">{payout.account_details || 'N/A'}</td>
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

                    {/* Tab 4: Payout & Bank Account Details */}
                    {activeTab === 'payout-settings' && (
                        <div className="p-6 space-y-8 max-w-4xl mx-auto">
                            {/* Visual Account Card */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden border border-slate-700 min-h-[220px]">
                                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>
                                    <div className="flex items-center justify-between z-10">
                                        <span className="text-[11px] uppercase tracking-widest text-sky-300 font-bold">Payout Account</span>
                                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="z-10 my-4 space-y-1">
                                        <div className="text-xs text-slate-400 uppercase tracking-wider">Bank Name</div>
                                        <div className="font-bold text-lg text-white tracking-wide">
                                            {agency.bank_name || 'Not Configured'}
                                        </div>
                                        <div className="font-mono text-sm text-sky-200 mt-2">
                                            {agency.account_number
                                                ? `•••• •••• ${agency.account_number.slice(-4)}`
                                                : 'No A/C Added'}
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between z-10 text-xs border-t border-white/10 pt-3">
                                        <div>
                                            <span className="text-[10px] text-slate-400 block uppercase">Account Holder</span>
                                            <span className="font-medium text-slate-200">{agency.account_holder_name || agency.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-slate-400 block uppercase">IFSC</span>
                                            <span className="font-mono font-bold text-sky-300">{agency.ifsc_code || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col justify-center space-y-3">
                                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                        <Landmark className="w-5 h-5 text-[#0076CE]" /> Commission Reimbursement Destination
                                    </h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        When you submit a payout reimbursement request, the administration will transfer your accumulated referral earnings directly into the account details below.
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${hasPayoutConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {hasPayoutConfigured ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                            {hasPayoutConfigured ? 'Payout Details Configured' : 'Setup Required'}
                                        </span>
                                        {agency.upi_id && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-xs">
                                                <QrCode className="w-3.5 h-3.5" /> UPI: {agency.upi_id}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Payout Details Edit Form */}
                            <form onSubmit={handleSavePayoutDetails} className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Landmark className="w-5 h-5 text-[#0076CE]" /> Bank Account Details (NEFT / IMPS / RTGS)
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Provide accurate bank credentials as registered with your banking institution.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Account Holder Name *</label>
                                        <Input
                                            placeholder="e.g. John Doe / Apex Edu Services"
                                            value={payoutDetailsForm.account_holder_name}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, account_holder_name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Bank Name *</label>
                                        <Input
                                            placeholder="e.g. State Bank of India, HDFC Bank, ICICI"
                                            value={payoutDetailsForm.bank_name}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, bank_name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Account Number *</label>
                                        <Input
                                            placeholder="Enter Bank Account Number"
                                            value={payoutDetailsForm.account_number}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, account_number: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Confirm Account Number *</label>
                                        <Input
                                            placeholder="Re-enter Bank Account Number"
                                            value={payoutDetailsForm.confirm_account_number}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, confirm_account_number: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">IFSC Code *</label>
                                        <Input
                                            placeholder="e.g. SBIN0001234"
                                            value={payoutDetailsForm.ifsc_code}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, ifsc_code: e.target.value.toUpperCase() })}
                                            className="font-mono uppercase"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Account Type</label>
                                        <select
                                            value={payoutDetailsForm.account_type}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, account_type: e.target.value })}
                                            className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076CE] h-10"
                                        >
                                            <option value="SAVINGS">Savings Account</option>
                                            <option value="CURRENT">Current Account</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-2">
                                        <label className="text-xs font-semibold text-slate-700">Bank Branch Name (Optional)</label>
                                        <Input
                                            placeholder="e.g. Connaught Place, New Delhi"
                                            value={payoutDetailsForm.branch_name}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, branch_name: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-6 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <QrCode className="w-5 h-5 text-[#0076CE]" /> UPI ID (Optional / Fast Payout)
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Add your Virtual Payment Address (UPI) for instant direct UPI reimbursement.
                                        </p>
                                    </div>

                                    <div className="space-y-1.5 max-w-md">
                                        <label className="text-xs font-semibold text-slate-700">UPI ID / VPA</label>
                                        <Input
                                            placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                                            value={payoutDetailsForm.upi_id}
                                            onChange={(e) => setPayoutDetailsForm({ ...payoutDetailsForm, upi_id: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-100">
                                    <Button
                                        type="submit"
                                        disabled={savingPayoutDetails}
                                        className="bg-[#0076CE] hover:bg-[#0055a3] text-white font-bold px-6 shadow-md"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {savingPayoutDetails ? 'Saving Payout Details...' : 'Save Payout Details'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </main>

            {/* Request Reimbursement Modal */}
            {isPayoutModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Award className="w-5 h-5 text-[#0076CE]" /> Request Reimbursement Payout
                            </h3>
                            <button onClick={() => setIsPayoutModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        {/* Saved Payout Destination Preview */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Landmark className="w-4 h-4 text-[#0076CE]" /> Transfer Destination Account
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPayoutModalOpen(false);
                                        setActiveTab('payout-settings');
                                    }}
                                    className="text-xs text-[#0076CE] font-semibold hover:underline"
                                >
                                    Edit Details
                                </button>
                            </div>
                            {hasPayoutConfigured ? (
                                <div className="text-xs space-y-1 text-slate-600">
                                    {agency.bank_name && (
                                        <div className="font-semibold text-slate-800">
                                            {agency.bank_name} • A/C: •••• {agency.account_number?.slice(-4) || agency.account_number}
                                        </div>
                                    )}
                                    {agency.ifsc_code && <div>IFSC: <span className="font-mono font-bold text-slate-700">{agency.ifsc_code}</span></div>}
                                    {agency.account_holder_name && <div>Holder: <span className="font-medium text-slate-800">{agency.account_holder_name}</span></div>}
                                    {agency.upi_id && <div>UPI: <span className="font-mono text-indigo-700 font-semibold">{agency.upi_id}</span></div>}
                                </div>
                            ) : (
                                <div className="text-xs text-amber-700 font-medium">
                                    No bank details saved yet. Please configure your payout details first.
                                </div>
                            )}
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
                                <select
                                    value={payoutForm.payout_method}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, payout_method: e.target.value })}
                                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076CE] h-10"
                                >
                                    <option value="Bank Transfer">Bank Transfer (IMPS / NEFT)</option>
                                    <option value="UPI">UPI Transfer</option>
                                    <option value="Cheque / Cash">Direct / Cheque</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700">Notes / Instructions (Optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Any specific instructions for this transfer..."
                                    value={payoutForm.notes}
                                    onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                                    className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076CE]"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <Button type="button" onClick={() => setIsPayoutModalOpen(false)} variant="outline">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submittingPayout || !hasPayoutConfigured}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                    {submittingPayout ? 'Submitting...' : 'Submit Reimbursement'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {isAddStudentOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-[#0076CE]" /> Register Student Under Agency
                            </h3>
                            <button onClick={() => setIsAddStudentOpen(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateStudent} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Student Full Name *</label>
                                <Input
                                    required
                                    placeholder="e.g. Rahul Sharma"
                                    value={studentForm.name}
                                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Email Address *</label>
                                    <Input
                                        type="email"
                                        required
                                        placeholder="rahul@example.com"
                                        value={studentForm.email}
                                        onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                                    <Input
                                        required
                                        placeholder="9876543210"
                                        value={studentForm.phone}
                                        onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700">Student Login Password *</label>
                                <Input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={studentForm.password}
                                    onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Class *</label>
                                    <select
                                        required
                                        value={studentForm.class_id}
                                        onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })}
                                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076CE]"
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Board *</label>
                                    <select
                                        required
                                        value={studentForm.board_id}
                                        onChange={(e) => setStudentForm({ ...studentForm, board_id: e.target.value })}
                                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076CE]"
                                    >
                                        <option value="">Select Board</option>
                                        {boards.map((b) => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">Gender</label>
                                    <select
                                        value={studentForm.gender}
                                        onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                                        className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0076CE]"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700">School / College</label>
                                    <Input
                                        placeholder="School name"
                                        value={studentForm.school}
                                        onChange={(e) => setStudentForm({ ...studentForm, school: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <Button type="button" onClick={() => setIsAddStudentOpen(false)} variant="outline">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submittingStudent} className="bg-[#0076CE] hover:bg-[#0055a3] text-white font-semibold">
                                    {submittingStudent ? 'Creating...' : 'Register Student'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
