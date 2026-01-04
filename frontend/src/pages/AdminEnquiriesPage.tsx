import { useState, useEffect } from 'react';
import { enquiryService } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Filter } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePageTitle } from "@/hooks/usePageTitle";

const statusColors = {
    PENDING: 'bg-yellow-500',
    CONTACTED: 'bg-blue-500',
    RESOLVED: 'bg-green-500',
};

const typeLabels = {
    COURSE: 'Course',
    SUBJECT: 'Subject',
    ACTIVITY_GROUP: 'Activity Group',
    TEST_SERIES: 'Test Series',
};

export default function AdminEnquiriesPage() {
    usePageTitle("Enquiries");
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    useEffect(() => {
        fetchEnquiries();
    }, [filterStatus, filterType, page]);

    const fetchEnquiries = async () => {
        try {
            setLoading(true);
            const params: any = { page, limit: 10 };
            if (filterStatus !== 'ALL') params.status = filterStatus;
            if (filterType !== 'ALL') params.item_type = filterType;

            const response = await enquiryService.getAll(params);
            setEnquiries(response.data);
            setPagination(response.pagination);
        } catch (error: any) {
            console.error('Error fetching enquiries:', error);
            toast.error(error.response?.data?.error || 'Failed to fetch enquiries');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, status: string) => {
        try {
            await enquiryService.updateStatus(id, status as any);
            toast.success('Status updated successfully');
            fetchEnquiries();
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error(error.response?.data?.error || 'Failed to update status');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            await enquiryService.delete(deleteId);
            toast.success('Enquiry deleted successfully');
            setDeleteId(null);
            fetchEnquiries();
        } catch (error: any) {
            console.error('Error deleting enquiry:', error);
            toast.error(error.response?.data?.error || 'Failed to delete enquiry');
        }
    };

    if (loading && enquiries.length === 0) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Enquiries</h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">
                    Manage student enquiries for courses, subjects, activities, and test series
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Types</SelectItem>
                        <SelectItem value="COURSE">Courses</SelectItem>
                        <SelectItem value="SUBJECT">Subjects</SelectItem>
                        <SelectItem value="ACTIVITY_GROUP">Activity Groups</SelectItem>
                        <SelectItem value="TEST_SERIES">Test Series</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {enquiries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                                    No enquiries found
                                </TableCell>
                            </TableRow>
                        ) : (
                            enquiries.map((enquiry) => (
                                <TableRow key={enquiry.id}>
                                    <TableCell className="font-medium">{enquiry.student_name}</TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{enquiry.student_email}</div>
                                            <div className="text-gray-500">{enquiry.student_phone}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{enquiry.item_name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{typeLabels[enquiry.item_type as keyof typeof typeLabels]}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">
                                        {enquiry.message || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={enquiry.status}
                                            onValueChange={(value) => handleStatusChange(enquiry.id, value)}
                                        >
                                            <SelectTrigger className="w-[130px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PENDING">
                                                    <Badge className={statusColors.PENDING}>Pending</Badge>
                                                </SelectItem>
                                                <SelectItem value="CONTACTED">
                                                    <Badge className={statusColors.CONTACTED}>Contacted</Badge>
                                                </SelectItem>
                                                <SelectItem value="RESOLVED">
                                                    <Badge className={statusColors.RESOLVED}>Resolved</Badge>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {new Date(enquiry.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteId(enquiry.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={page === pagination.totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Enquiry</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this enquiry? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
