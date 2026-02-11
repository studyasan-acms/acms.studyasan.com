import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Gamepad2, FileText, GraduationCap, X, FileCheck, Clock } from 'lucide-react';
import EnquiryForm from './EnquiryForm';

interface ItemDetailModalProps {
    item: {
        id: number;
        type: 'COURSE' | 'SUBJECT' | 'ACTIVITY_GROUP' | 'TEST_SERIES';
        name: string;
        description: string | null;
        cover_image: string | null;
        price: number | null;
        currency: { symbol: string; code: string } | null;
        syllabus: any;
        class: string | null;
        board: string | null;
        item_count: number;
        item_count_label: string;
    };
    isOpen: boolean;
    onClose: () => void;
}

const typeConfig = {
    COURSE: { icon: GraduationCap, color: 'bg-blue-500', label: 'Course' },
    SUBJECT: { icon: BookOpen, color: 'bg-green-500', label: 'Subject' },
    ACTIVITY_GROUP: { icon: Gamepad2, color: 'bg-amber-500', label: 'Activity Group' },
    TEST_SERIES: { icon: FileText, color: 'bg-orange-500', label: 'Test Series' },
};

export default function ItemDetailModal({ item, isOpen, onClose }: ItemDetailModalProps) {
    const [showEnquiryForm, setShowEnquiryForm] = useState(false);
    const config = typeConfig[item.type];
    const Icon = config.icon;

    const handleEnquirySuccess = () => {
        setShowEnquiryForm(false);
        onClose();
    };

    if (showEnquiryForm) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Enquire About {item.name}</DialogTitle>
                        <DialogDescription>
                            Fill in your details and we'll get back to you soon
                        </DialogDescription>
                    </DialogHeader>
                    <EnquiryForm
                        item={item}
                        onSuccess={handleEnquirySuccess}
                        onCancel={() => setShowEnquiryForm(false)}
                    />
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl">{item.name}</DialogTitle>
                            <div className="mt-2">
                                <Badge className={`${config.color} text-white`}>
                                    <Icon className="h-3 w-3 mr-1" />
                                    {config.label}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* Cover Image */}
                {item.cover_image && (
                    <div className="w-full h-64 rounded-lg overflow-hidden">
                        <img
                            src={item.cover_image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Details */}
                <div className="space-y-4">
                    {/* Description */}
                    {item.description && (
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                            <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                    )}

                    {/* Class and Board */}
                    {(item.class || item.board) && (
                        <div className="grid grid-cols-2 gap-4">
                            {item.class && (
                                <div>
                                    <h3 className="font-semibold text-gray-700 mb-1 text-sm">Class</h3>
                                    <p className="text-gray-600 text-sm">{item.class}</p>
                                </div>
                            )}
                            {item.board && (
                                <div>
                                    <h3 className="font-semibold text-gray-700 mb-1 text-sm">Board</h3>
                                    <p className="text-gray-600 text-sm">{item.board}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Item Count */}
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-1 text-sm">Content</h3>
                        <p className="text-gray-600 text-sm">
                            {item.item_count} {item.item_count_label}
                        </p>
                    </div>

                    {/* Syllabus */}
                    {item.syllabus && (
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Syllabus</h3>
                            {item.syllabus.units && Array.isArray(item.syllabus.units) && item.syllabus.units.length > 0 ? (
                                <div className="space-y-3">
                                    {item.syllabus.units.map((unit: any, index: number) => (
                                        <div
                                            key={index}
                                            className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                                        >
                                            <h4 className="font-semibold text-gray-800 text-sm mb-2">
                                                {unit.name}
                                            </h4>
                                            {unit.content && (
                                                <p className="text-xs text-gray-600">
                                                    {unit.content}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 text-center">
                                    No syllabus units available
                                </div>
                            )}
                        </div>
                    )}

                    <Separator />

                    {/* Price and Enquiry Button */}
                    <div className="flex items-center justify-between">
                        <div>
                            {item.price !== null && item.currency ? (
                                <div>
                                    <p className="text-sm text-gray-500">Price</p>
                                    <p className="text-2xl font-bold text-saBlue">
                                        {item.currency.symbol}
                                        {item.price}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-500">Price</p>
                                    <p className="text-2xl font-bold text-green-600">Free</p>
                                </div>
                            )}
                        </div>
                        <Button onClick={() => setShowEnquiryForm(true)} size="lg">
                            Enquire Now
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
