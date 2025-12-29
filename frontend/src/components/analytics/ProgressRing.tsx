interface ProgressRingProps {
    progress: number; // 0-100
    size?: number;
    strokeWidth?: number;
    color?: string;
    label?: string;
    showPercentage?: boolean;
}

export function ProgressRing({
    progress,
    size = 120,
    strokeWidth = 8,
    color = 'hsl(var(--primary))',
    label,
    showPercentage = true
}: ProgressRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    className="transform -rotate-90"
                    width={size}
                    height={size}
                >
                    {/* Background circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="hsl(var(--muted))"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Progress circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                </svg>
                {showPercentage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{Math.round(progress)}%</span>
                    </div>
                )}
            </div>
            {label && (
                <p className="text-sm text-muted-foreground mt-2 text-center">{label}</p>
            )}
        </div>
    );
}
