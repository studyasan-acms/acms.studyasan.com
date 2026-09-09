import { useState, useEffect } from 'react';
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
import { BookOpen, Gamepad2, FileText, GraduationCap, X, FileCheck, Clock, CreditCard } from 'lucide-react';
import { resolveImageUrl, normalizeSyllabus } from '@/lib/utils';
import EnquiryForm from './EnquiryForm';
import ExploreCheckoutModal from './ExploreCheckoutModal';
import { paymentGatewayService } from '@/services/api';
import type { PublicPaymentGatewayConfig } from '@/types';

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
    COURSE: { icon: GraduationCap, color: 'bg-[#0276D3]', label: 'Course' },
    SUBJECT: { icon: BookOpen, color: 'bg-[#0276D3]', label: 'Subject' },
    ACTIVITY_GROUP: { icon: Gamepad2, color: 'bg-[#eca209]', label: 'Activity Group' },
    TEST_SERIES: { icon: FileText, color: 'bg-[#eca209]', label: 'Test Series' },
};

export default function ItemDetailModal({ item, isOpen, onClose }: ItemDetailModalProps) {
    const [showEnquiryForm, setShowEnquiryForm] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [gatewayConfig, setGatewayConfig] = useState<PublicPaymentGatewayConfig | null>(null);

    const config = typeConfig[item.type];
    const Icon = config.icon;

    useEffect(() => {
        if (isOpen) {
            paymentGatewayService.getPublicConfig()
                .then((res) => {
                    setGatewayConfig(res.data);
                })
                .catch(() => {
                    setGatewayConfig(null);
                });
        }
    }, [isOpen]);

    const isGatewayEnabledForItem = () => {
        if (!gatewayConfig || !gatewayConfig.is_enabled || !gatewayConfig.key_id) return false;
        if (item.type === 'COURSE' || item.type === 'SUBJECT') return !!gatewayConfig.enable_for_courses;
        if (item.type === 'TEST_SERIES') return !!gatewayConfig.enable_for_test_series;
        if (item.type === 'ACTIVITY_GROUP') return !!gatewayConfig.enable_for_activities;
        return false;
    };

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

    const canBuyOnline = isGatewayEnabledForItem() && item.price !== null && item.price > 0;

    return (
        <>
            <Dialog open={isOpen && !showCheckoutModal} onOpenChange={onClose}>
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
                                src={resolveImageUrl(item.cover_image) || item.cover_image}
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
                        {item.type === 'SUBJECT' || item.type === 'COURSE' ? (() => {
                            const norm = normalizeSyllabus(item.syllabus);
                            return (
                                <div>
                                    <h3 className="font-semibold text-gray-700 mb-2">Syllabus</h3>
                                    {norm.units.length > 0 ? (
                                        <div className="space-y-3">
                                            {norm.units.map((unit: any, index: number) => (
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
                                            No syllabus defined yet
                                        </div>
                                    )}
                                </div>
                            );
                        })() : null}

                        <Separator />

                        {/* Price and Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                {item.price !== null && item.currency ? (
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Official Fee</p>
                                        <p className="text-2xl font-bold text-saBlue font-mono">
                                            {item.currency.symbol}
                                            {item.price}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-xs text-gray-500 font-medium">Official Fee</p>
                                        <p className="text-2xl font-bold text-saBlue font-mono">Free</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowEnquiryForm(true)}
                                    size="lg"
                                    className="font-semibold rounded-xl text-xs sm:text-sm border-slate-300"
                                >
                                    Enquire Now
                                </Button>

                                {canBuyOnline && (
                                    <Button
                                        onClick={() => setShowCheckoutModal(true)}
                                        size="lg"
                                        className="bg-saBlue hover:bg-saBlueDarkHover text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-saBlue/20 flex items-center gap-1.5"
                                    >
                                        <CreditCard className="w-4 h-4" /> Pay & Enroll Online
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Explore Checkout & Payment Gateway Modal */}
            {showCheckoutModal && (
                <ExploreCheckoutModal
                    item={item}
                    isOpen={showCheckoutModal}
                    onClose={() => setShowCheckoutModal(false)}
                    onSuccess={() => {
                        setShowCheckoutModal(false);
                        onClose();
                    }}
                />
            )}
        </>
    );
}
