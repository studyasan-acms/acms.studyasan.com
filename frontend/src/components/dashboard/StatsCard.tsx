import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;     
  color?: string;         
  bgColor?: string;      
  accentColor?: string;   
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'text-[#0276D3]',
  bgColor = 'bg-white',
  accentColor = 'border-[#0276D3]',
}: StatsCardProps) {
  return (
    <div className={`flex flex-col p-6 rounded-2xl shadow-md border-l-4 ${accentColor} ${bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-gray-600 text-sm`}>{title}</h4>
        {Icon && (
          <div className="p-2 rounded-full bg-gray-100">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
