import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Gamepad2, FileText, GraduationCap } from 'lucide-react';

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
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden group"
            onClick={onClick}
        >
            {/* Cover Image */}
            <div className="relative h-32 md:h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                {item.cover_image ? (
                    <img
                        src={item.cover_image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Icon className="h-10 w-10 md:h-16 md:w-16 text-gray-400" />
                    </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-2 right-2">
                    <Badge className={`${config.color} text-white text-xs`}>
                        {config.label}
                    </Badge>
                </div>
            </div>

            {/* Content */}
            <CardContent className="p-2 md:p-4">
                <h3 className="font-semibold text-sm md:text-lg text-gray-700 line-clamp-2 mb-1 md:mb-2">
                    {item.name}
                </h3>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="truncate">
                        {item.item_count} {item.item_count_label}
                    </span>
                    {item.price !== null && item.currency ? (
                        <span className="font-semibold text-saBlue text-xs md:text-sm">
                            {item.currency.symbol}
                            {item.price}
                        </span>
                    ) : (
                        <span className="text-green-600 font-semibold text-xs md:text-sm">Free</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
