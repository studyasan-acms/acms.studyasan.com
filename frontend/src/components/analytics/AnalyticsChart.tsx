import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
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
    type: 'bar' | 'line' | 'pie';
    dataKey?: string;
    xAxisKey?: string;
    colors?: string[];
    className?: string;
}

const DEFAULT_COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7c7c'
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
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    {type === 'bar' && (
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey={dataKey} fill={colors[0]} />
                        </BarChart>
                    )}
                    {type === 'line' && (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey={xAxisKey} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey={dataKey} stroke={colors[0]} strokeWidth={2} />
                        </LineChart>
                    )}
                    {type === 'pie' && (
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry: any) => entry[xAxisKey]}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey={dataKey}
                            >
                                {data.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
