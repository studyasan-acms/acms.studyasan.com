import { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsService } from '@/services/api';
import QuickActions from '@/components/dashboard/QuickActions';
import {
  Users,
  GraduationCap,
  DollarSign,
  TrendingUp,
  UserCheck,
  Activity,
  CreditCard,
  ShieldCheck,
  BookOpen,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalyticsChart } from '@/components/analytics/AnalyticsChart';
import { useAuthStore } from '@/store/authStore';

interface BusinessAnalytics {
  students: {
    total: number;
    newLast30Days: number;
    newLast7Days: number;
    newToday: number;
    byDay: Array<{ date: string; count: number }>;
  };
  payments: {
    totalRevenue: number;
    revenueLast30Days: number;
    paidCount: number;
    pendingCount: number;
    totalCount: number;
    byDay: Array<{ date: string; total: number }>;
  };
  enrollments: {
    total: number;
    last30Days: number;
  };
  activityGroups: {
    totalEnrollments: number;
    enrollmentsLast30Days: number;
    revenueLast30Days: number;
  };
  testSeries: {
    totalEnrollments: number;
    enrollmentsLast30Days: number;
    revenueLast30Days: number;
  };
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [businessAnalytics, setBusinessAnalytics] = useState<BusinessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const hasInitiallyFetched = useRef(false);

  const fetchAllAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const businessData = await analyticsService.getAdminBusinessAnalytics();
      setBusinessAnalytics(businessData || null);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true;
      fetchAllAnalytics();
    }
  }, [fetchAllAnalytics]);

  if (loading && !businessAnalytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100" />
          ))}
        </div>
        <div className="h-96 bg-white rounded-2xl animate-pulse border border-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card className="bg-white border border-slate-200/80 shadow-xs hover:border-saBlue/40 hover:shadow-md transition-all rounded-2xl sm:rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {businessAnalytics?.students.total || 0}
              </h3>
            </div>
            <div className="h-12 w-12 bg-saBlue/10 rounded-2xl flex items-center justify-center text-saBlue shrink-0">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-saBlue">+{businessAnalytics?.students.newLast30Days || 0}</span>
            <span className="text-slate-400 font-medium">new this month</span>
          </div>
        </Card>

        {/* Revenue */}
        <Card className="bg-white border border-slate-200/80 shadow-xs hover:border-saVividOrange/40 hover:shadow-md transition-all rounded-2xl sm:rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                ₹{(businessAnalytics?.payments.totalRevenue || 0).toLocaleString()}
              </h3>
            </div>
            <div className="h-12 w-12 bg-saVividOrange/10 rounded-2xl flex items-center justify-center text-saVividOrange shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-saOrangeDark">
              ₹{(businessAnalytics?.payments.revenueLast30Days || 0).toLocaleString()}
            </span>
            <span className="text-slate-400 font-medium">in last 30 days</span>
          </div>
        </Card>

        {/* Course Enrollments */}
        <Card className="bg-white border border-slate-200/80 shadow-xs hover:border-saBlue/40 hover:shadow-md transition-all rounded-2xl sm:rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Course Admissions</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {businessAnalytics?.enrollments.total || 0}
              </h3>
            </div>
            <div className="h-12 w-12 bg-saBlue/10 rounded-2xl flex items-center justify-center text-saBlue shrink-0">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-saBlue">+{businessAnalytics?.enrollments.last30Days || 0}</span>
            <span className="text-slate-400 font-medium">this month</span>
          </div>
        </Card>

        {/* Health Score / Paid Ratio */}
        <Card className="bg-white border border-slate-200/80 shadow-xs hover:border-saVividOrange/40 hover:shadow-md transition-all rounded-2xl sm:rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collection Ratio</p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {businessAnalytics && businessAnalytics.payments.totalCount > 0
                  ? Math.round(
                      (businessAnalytics.payments.paidCount / businessAnalytics.payments.totalCount) * 100
                    )
                  : 100}
                %
              </h3>
            </div>
            <div className="h-12 w-12 bg-saVividOrange/10 rounded-2xl flex items-center justify-center text-saVividOrange shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-saOrangeDark">{businessAnalytics?.payments.paidCount || 0}</span>
            <span className="text-slate-400 font-medium">paid / {businessAnalytics?.payments.totalCount || 0} invoices</span>
          </div>
        </Card>
      </div>

      {/* CHARTS & ACTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT TWO COLUMNS: CHART */}
        <div className="lg:col-span-2 space-y-6">
          {/* REVENUE & GROWTH CHART CARD */}
          {businessAnalytics && (
            <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden bg-white">
              <CardHeader className="p-4 sm:p-5 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Revenue & Growth Trend
                  </CardTitle>
                  <p className="text-xs text-slate-500 font-medium">Daily payment collection insights</p>
                </div>
                <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30">
                  Last 30 Days
                </span>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="h-[280px]">
                  <AnalyticsChart
                    title=""
                    data={businessAnalytics.payments.byDay.map((d) => ({
                      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      revenue: d.total,
                    }))}
                    type="area"
                    dataKey="revenue"
                    xAxisKey="date"
                    seriesName="Revenue"
                    valuePrefix="₹"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS & PENDING ACTIONS */}
        <div className="space-y-4">
          <QuickActions />

          {/* PENDING ACTIONS CARD */}
          <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <CardHeader className="p-4 sm:p-5 pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-4 w-4 text-saVividOrange" />
                Pending Actions & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-2.5">
              {businessAnalytics && (
                <>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-saVividOrange/10 text-saVividOrange flex items-center justify-center font-bold text-xs">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">Pending Payments</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30">
                      {businessAnalytics.payments.pendingCount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-saBlue/10 text-saBlue flex items-center justify-center font-bold text-xs">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">New Students (Today)</span>
                    </div>
                    <Badge className="bg-saBlue text-white font-bold text-xs px-2.5">
                      +{businessAnalytics.students.newToday}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BUSINESS HEALTH SECTION */}
      {businessAnalytics && (
        <div className="space-y-4 pt-2">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-saVividOrange/10 text-saVividOrange flex items-center justify-center font-bold shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Business Health</h2>
                <p className="text-xs text-slate-500 mt-0.5">Institutional enrolment trajectory, revenue breakdown, and cohort performance</p>
              </div>
            </div>
            <span className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full bg-saOrangeSubtle text-saOrangeDark border border-saVividOrange/30 w-fit">
              Live Metrics
            </span>
          </div>

          {/* Grid of Business Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Student Enrolment Growth */}
            <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs bg-white overflow-hidden">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-saBlue" />
                  Student Enrolment Growth
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">New Students (Last 7 Days)</span>
                  <span className="font-bold text-slate-900 text-sm">+{businessAnalytics.students.newLast7Days}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">New Students (Last 30 Days)</span>
                  <span className="font-bold text-slate-900 text-sm">+{businessAnalytics.students.newLast30Days}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500 font-medium">Total Registered Cohort</span>
                  <span className="font-bold text-saBlue text-sm">{businessAnalytics.students.total}</span>
                </div>
              </CardContent>
            </Card>

            {/* Financial Breakdown */}
            <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs bg-white overflow-hidden">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-saVividOrange" />
                  Financial Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Total Lifetime Revenue</span>
                  <span className="font-bold text-saOrangeDark text-sm">₹{businessAnalytics.payments.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Paid Invoices</span>
                  <span className="font-bold text-slate-900 text-sm">{businessAnalytics.payments.paidCount}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500 font-medium">Pending Invoices</span>
                  <span className="font-bold text-saOrangeDark text-sm">{businessAnalytics.payments.pendingCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Programs & Enrollments Breakdown */}
            <Card className="rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs bg-white overflow-hidden md:col-span-2 lg:col-span-1">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-saBlue" />
                  Program Engagements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Course Admissions</span>
                  <span className="font-bold text-slate-900 text-sm">{businessAnalytics.enrollments.total}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Activity Group Enrollments</span>
                  <span className="font-bold text-slate-900 text-sm">{businessAnalytics.activityGroups?.totalEnrollments || 0}</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500 font-medium">Test Series Enrollments</span>
                  <span className="font-bold text-saBlue text-sm">{businessAnalytics.testSeries?.totalEnrollments || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
