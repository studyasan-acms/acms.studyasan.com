import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';

export function AgencyLoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await api.post('/agency/login', { email, password });
            
            // Save token and user details in localStorage
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('agency', JSON.stringify(res.data.agency));
            
            toast.success(`Welcome back, ${res.data.agency.name}!`);
            navigate('/agency/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Invalid agency email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-200/80 space-y-6">
                {/* Branding */}
                <div className="text-center space-y-3">
                    <div className="bg-[#0076CE] px-4 py-2 rounded-2xl inline-flex items-center justify-center shadow-md mb-1">
                        <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-8 object-contain" />
                    </div>
                    <div>
                        <span className="inline-block px-3 py-1 bg-sky-50 text-[#0076CE] border border-sky-100 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                            Agency Partner Portal
                        </span>
                        <h1 className="text-2xl font-bold text-slate-900">Partner Login</h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Access your referral dashboard, track referred students & redeem commissions
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Agency Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="email"
                                required
                                placeholder="agency@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 h-11 border-slate-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE] rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 h-11 border-slate-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE] rounded-xl"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-[#0076CE] hover:bg-[#0055a3] text-white font-semibold rounded-xl text-base shadow-md shadow-sky-600/20 transition-all"
                    >
                        {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>

                <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Authorized Agency Partner Portal
                </div>
            </div>
        </div>
    );
}
