import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricItem {
    label: string;
    value: string | number;
    icon?: LucideIcon;
    subtext?: string;
}

interface MetricsListProps {
    title: string;
    metrics: MetricItem[];
    className?: string;
}

export function MetricsList({ title, metrics, className = '' }: MetricsListProps) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {metrics.map((metric, index) => (
                        <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                            <div className="flex items-center gap-3">
                                {metric.icon && <metric.icon className="h-5 w-5 text-primary" />}
                                <div>
                                    <p className="font-medium">{metric.label}</p>
                                    {metric.subtext && (
                                        <p className="text-xs text-muted-foreground">{metric.subtext}</p>
                                    )}
                                </div>
                            </div>
                            <span className="text-lg font-bold">{metric.value}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
