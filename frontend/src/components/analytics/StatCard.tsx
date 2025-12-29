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
        <Card className={`hover:shadow-lg transition-shadow ${className}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
                {trend && (
                    <div className={`text-xs mt-2 flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span className="ml-1">{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
