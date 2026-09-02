import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    description?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    className?: string;
}

export function StatCard({ title, value, icon: Icon, description, trend, className = '' }: StatCardProps) {
    return (
        <Card className={`rounded-xl border border-slate-200/80 shadow-xs hover:border-saBlue/40 transition-all bg-white p-3.5 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-xl font-black text-slate-900 leading-tight mt-0.5">{value}</h3>
                </div>
                <div className="h-8 w-8 bg-saBlue/10 rounded-lg flex items-center justify-center text-saBlue shrink-0">
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            {description && (
                <p className="text-[10px] text-slate-400 mt-1">{description}</p>
            )}
            {trend && (
                <div className={`text-xs mt-1.5 flex items-center font-bold ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span>{trend.isPositive ? '↑' : '↓'}</span>
                    <span className="ml-1">{Math.abs(trend.value)}%</span>
                </div>
            )}
        </Card>
    );
}
