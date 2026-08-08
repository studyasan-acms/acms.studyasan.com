import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    AreaChart,
    Area,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface AnalyticsChartProps {
    title: string;
    data: any[];
    type: 'bar' | 'line' | 'pie' | 'area';
    dataKey?: string;
    xAxisKey?: string;
    colors?: string[];
    className?: string;
}

const DEFAULT_COLORS = [
    '#0276D3',
    '#5BAEF0',
    '#eca209',
    '#025AA3',
    '#38bdf8',
    '#818cf8'
];

export function AnalyticsChart({
    title,
    data,
    type,
    dataKey = 'value',
    xAxisKey = 'name',
    colors = DEFAULT_COLORS,
    className = ''
}: AnalyticsChartProps) {
    const renderChart = () => {
        // Fallback for empty data array
        const hasData = Array.isArray(data) && data.length > 0;

        switch (type) {
            case 'bar':
                return (
                    <BarChart data={hasData ? data : []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        />
                        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill || colors[index % colors.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                );
            case 'line':
                return (
                    <LineChart data={hasData ? data : []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Line type="monotone" dataKey={dataKey} stroke={colors[0]} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#0276D3' }} activeDot={{ r: 6 }} />
                    </LineChart>
                );
            case 'area':
                return (
                    <AreaChart data={hasData ? data : []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="saBlueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors[0]} stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey={xAxisKey} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                        />
                        <Area
                            type="monotone"
                            dataKey={dataKey}
                            stroke={colors[0]}
                            fillOpacity={1}
                            fill="url(#saBlueGradient)"
                            strokeWidth={3}
                            dot={{ r: 3, fill: colors[0], strokeWidth: 2, stroke: '#ffffff' }}
                            activeDot={{ r: 6, fill: colors[0] }}
                        />
                    </AreaChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={hasData ? data : []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey={dataKey}
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Legend iconType="circle" />
                    </PieChart>
                );
            default:
                return null;
        }
    };

    return (
        <Card className={`border-none shadow-none bg-transparent ${className}`}>
            {title && (
                <CardHeader className="pb-2 px-0">
                    <CardTitle className="text-sm font-bold text-slate-700">{title}</CardTitle>
                </CardHeader>
            )}
            <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={260}>
                    {renderChart()}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
