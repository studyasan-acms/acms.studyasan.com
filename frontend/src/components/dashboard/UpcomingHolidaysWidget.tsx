import React, { useEffect, useState } from 'react';
import { holidayService } from '@/services/api';
import type { Holiday, HolidayType } from '@/types';
import { Calendar, Sparkles, Clock, PartyPopper, CalendarDays, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TYPE_CONFIG: Record<HolidayType, { label: string; badgeClass: string; bgClass: string; icon: string }> = {
    NATIONAL: {
        label: 'National Holiday',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        bgClass: 'border-l-emerald-500 bg-emerald-50/40',
        icon: '🇮🇳'
    },
    FESTIVAL: {
        label: 'Festival',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        bgClass: 'border-l-amber-500 bg-amber-50/40',
        icon: '🎉'
    },
    ACADEMIC: {
        label: 'Academic Break',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        bgClass: 'border-l-blue-500 bg-blue-50/40',
        icon: '📚'
    },
    VACATION: {
        label: 'Vacation',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        bgClass: 'border-l-purple-500 bg-purple-50/40',
        icon: '🏖️'
    },
    GENERAL: {
        label: 'General Off',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        bgClass: 'border-l-slate-400 bg-slate-50/40',
        icon: '🗓️'
    }
};

const formatHolidayDate = (startDateStr: string, endDateStr: string) => {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    
    // Format options
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const yearOptions: Intl.DateTimeFormatOptions = { ...options, year: 'numeric' };
    
    if (s.toDateString() === e.toDateString()) {
        return s.toLocaleDateString(undefined, yearOptions);
    }
    
    if (s.getFullYear() === e.getFullYear()) {
        return `${s.toLocaleDateString(undefined, options)} - ${e.toLocaleDateString(undefined, yearOptions)}`;
    }
    
    return `${s.toLocaleDateString(undefined, yearOptions)} - ${e.toLocaleDateString(undefined, yearOptions)}`;
};

const getRelativeDaysLabel = (startDateStr: string, endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    
    if (today >= start && today <= end) {
        return { label: 'Ongoing Today', urgent: true, isOngoing: true };
    }
    
    const diffMs = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return { label: 'Tomorrow', urgent: true, isOngoing: false };
    if (diffDays === 0) return { label: 'Today', urgent: true, isOngoing: true };
    if (diffDays <= 7) return { label: `In ${diffDays} days`, urgent: false, isOngoing: false };
    return { label: `In ${diffDays} days`, urgent: false, isOngoing: false };
};

export default function UpcomingHolidaysWidget() {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUpcomingHolidays();
    }, []);

    const loadUpcomingHolidays = async () => {
        try {
            const res = await holidayService.getUpcoming();
            setHolidays(res.data || []);
        } catch (error) {
            console.error('Failed to load upcoming holidays:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden bg-white">
                <CardHeader className="py-4 px-6 bg-gradient-to-r from-blue-50/50 to-transparent border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-saBlue/10 flex items-center justify-center text-saBlue animate-pulse">
                            <CalendarDays className="w-4 h-4" />
                        </div>
                        <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-3">
                        <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                        <div className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (holidays.length === 0) {
        return null; // Don't take up space if there are no upcoming holidays
    }

    return (
        <Card className="rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <CardHeader className="py-4 px-6 bg-gradient-to-r from-amber-50/60 via-blue-50/40 to-transparent border-b border-slate-100 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#eca209]/15 flex items-center justify-center text-[#eca209]">
                        <PartyPopper className="w-4 h-4" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                            Upcoming Holidays & Breaks
                        </CardTitle>
                        <p className="text-[11px] text-slate-500">Official holidays and academy schedule</p>
                    </div>
                </div>
                <Badge variant="outline" className="bg-white/80 text-xs font-semibold text-slate-700 border-slate-200">
                    {holidays.length} upcoming
                </Badge>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {holidays.slice(0, 6).map((holiday) => {
                        const typeConfig = TYPE_CONFIG[holiday.type] || TYPE_CONFIG.GENERAL;
                        const countdown = getRelativeDaysLabel(holiday.start_date, holiday.end_date);

                        return (
                            <div
                                key={holiday.id}
                                className={`relative p-4 rounded-2xl border border-slate-200/70 ${typeConfig.bgClass} border-l-4 transition-all hover:shadow-sm`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-lg leading-none" role="img" aria-label={typeConfig.label}>
                                        {typeConfig.icon}
                                    </span>
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${typeConfig.badgeClass}`}
                                        >
                                            {typeConfig.label}
                                        </Badge>
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                countdown.isOngoing
                                                    ? 'bg-emerald-600 text-white animate-pulse'
                                                    : countdown.urgent
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-slate-200/80 text-slate-700'
                                            }`}
                                        >
                                            {countdown.label}
                                        </span>
                                    </div>
                                </div>

                                <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                                    {holiday.title}
                                </h4>

                                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-600">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{formatHolidayDate(holiday.start_date, holiday.end_date)}</span>
                                </div>

                                {holiday.description && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5 leading-relaxed font-normal">
                                        {holiday.description}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
