import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { enquiryService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EnquiryFormProps {
    item: {
        id: number;
        type: 'COURSE' | 'SUBJECT' | 'ACTIVITY_GROUP' | 'TEST_SERIES';
        name: string;
    };
    onSuccess: () => void;
    onCancel: () => void;
}

export default function EnquiryForm({ item, onSuccess, onCancel }: EnquiryFormProps) {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        student_name: user?.name || '',
        student_email: user?.email || '',
        student_phone: user?.phone || '',
        message: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.student_name || !formData.student_email || !formData.student_phone) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            await enquiryService.create({
                item_type: item.type,
                item_id: item.id,
                student_name: formData.student_name,
                student_email: formData.student_email,
                student_phone: formData.student_phone,
                message: formData.message || undefined,
            });

            toast.success('Enquiry submitted successfully! We will contact you soon.');
            onSuccess();
        } catch (error: any) {
            console.error('Error submitting enquiry:', error);
            toast.error(error.response?.data?.error || 'Failed to submit enquiry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="student_name">
                    Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="student_name"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                />
            </div>

            <div>
                <Label htmlFor="student_email">
                    Email <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="student_email"
                    type="email"
                    value={formData.student_email}
                    onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                    placeholder="Enter your email"
                    required
                />
            </div>

            <div>
                <Label htmlFor="student_phone">
                    Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="student_phone"
                    type="tel"
                    value={formData.student_phone}
                    onChange={(e) => setFormData({ ...formData, student_phone: e.target.value })}
                    placeholder="Enter your phone number"
                    required
                />
            </div>

            <div>
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Any specific questions or requirements?"
                    rows={4}
                />
            </div>

            <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Enquiry'
                    )}
                </Button>
            </div>
        </form>
    );
}
