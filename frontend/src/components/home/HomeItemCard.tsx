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
    COURSE: { icon: GraduationCap, color: 'bg-blue-500', label: 'Course' },
    SUBJECT: { icon: BookOpen, color: 'bg-green-500', label: 'Subject' },
    ACTIVITY_GROUP: { icon: Gamepad2, color: 'bg-purple-500', label: 'Activity Group' },
    TEST_SERIES: { icon: FileText, color: 'bg-orange-500', label: 'Test Series' },
};

export default function HomeItemCard({ item, onClick }: HomeItemCardProps) {
    const config = typeConfig[item.type];
    const Icon = config.icon;

    return (
        <Card
            className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group border-gray-200 rounded-2xl"
            onClick={onClick}
        >
            {/* Cover Image */}
            <div className="relative h-40 md:h-48 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-hidden">
                {item.cover_image ? (
                    <img
                        src={resolveImageUrl(item.cover_image) || item.cover_image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="p-4 rounded-full bg-white/80 backdrop-blur-sm shadow-lg">
                            <Icon className="h-12 w-12 md:h-16 md:w-16 text-gray-400" />
                        </div>
                    </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-3 right-3">
                    <Badge className={`${config.color} text-white text-xs font-semibold px-3 py-1 shadow-md`}>
                        {config.label}
                    </Badge>
                </div>
            </div>

            {/* Content */}
            <CardContent className="p-4 md:p-5">
                <h3 className="font-bold text-base md:text-lg text-gray-900 line-clamp-2 mb-3 group-hover:text-saBlue transition-colors">
                    {item.name}
                </h3>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-medium">
                        {item.item_count} {item.item_count_label}
                    </span>
                    {item.price !== null && item.currency ? (
                        <span className="font-bold text-saBlue text-base">
                            {item.currency.symbol}{item.price}
                        </span>
                    ) : (
                        <span className="text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full">Free</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
