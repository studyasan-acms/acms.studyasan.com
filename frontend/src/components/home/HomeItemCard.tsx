import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Gamepad2, FileText, GraduationCap } from 'lucide-react';
import { resolveImageUrl } from '@/lib/utils';

interface HomeItemCardProps {
    item: {
        id: number;
        type: 'COURSE' | 'SUBJECT' | 'ACTIVITY_GROUP' | 'TEST_SERIES';
        name: string;
        cover_image: string | null;
        price: number | null;
        currency: { symbol: string; code: string } | null;
        item_count: number;
        item_count_label: string;
    };
    onClick: () => void;
}

const typeConfig = {
    COURSE: { icon: GraduationCap, color: 'bg-[#0276D3]', label: 'Course' },
    SUBJECT: { icon: BookOpen, color: 'bg-emerald-600', label: 'Subject' },
    ACTIVITY_GROUP: { icon: Gamepad2, color: 'bg-indigo-600', label: 'Activity' },
    TEST_SERIES: { icon: FileText, color: 'bg-[#eca209]', label: 'Test Series' },
};

export default function HomeItemCard({ item, onClick }: HomeItemCardProps) {
    const config = typeConfig[item.type] || typeConfig.COURSE;
    const Icon = config.icon;

    return (
        <Card
            className="cursor-pointer hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden group border border-slate-200/80 rounded-3xl bg-white flex flex-col justify-between h-full"
            onClick={onClick}
        >
            <div>
                {/* Cover Image Header */}
                <div className="relative h-44 sm:h-48 bg-gradient-to-br from-blue-50/80 via-slate-50 to-amber-50/30 overflow-hidden flex items-center justify-center">
                    {item.cover_image ? (
                        <img
                            src={resolveImageUrl(item.cover_image) || item.cover_image}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-3xl bg-white/90 backdrop-blur-xs shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#0276D3] group-hover:scale-110 transition-all duration-300">
                            <Icon className="h-10 w-10" />
                        </div>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-3.5 right-3.5">
                        <Badge className={`${config.color} text-white font-extrabold text-[11px] px-3 py-1 rounded-xl shadow-xs border-none`}>
                            {config.label}
                        </Badge>
                    </div>
                </div>

                {/* Content Body */}
                <CardContent className="p-5">
                    <h3 className="font-extrabold text-base text-slate-900 line-clamp-2 mb-2 group-hover:text-[#0276D3] transition-colors leading-snug">
                        {item.name}
                    </h3>
                </CardContent>
            </div>

            {/* Bottom Footer */}
            <div className="px-5 pb-5 pt-0 flex items-center justify-between border-t border-slate-100 mt-auto pt-3">
                <span className="text-xs font-bold text-slate-500">
                    {item.item_count} {item.item_count_label}
                </span>

                {item.price !== null && item.currency ? (
                    <span className="font-black text-[#0276D3] text-base">
                        {item.currency.symbol}{item.price}
                    </span>
                ) : (
                    <span className="text-emerald-700 font-extrabold text-xs bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                        Free
                    </span>
                )}
            </div>
        </Card>
    );
}
