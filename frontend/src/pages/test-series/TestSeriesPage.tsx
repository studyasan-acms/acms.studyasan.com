import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { testSeriesService, currencyService } from "@/services/api";
import type { TestSeries, Currency } from "@/types";
import { useAuthStore } from "@/store/authStore";
import {
    Plus,
    Search,
    Library,
    Eye,
    Edit,
    Trash2,
    Users,
    FileText,
    CheckCircle,
    XCircle,
    MoreVertical,
    Loader2,
    Save,
    IndianRupee,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/usePageTitle";
import ConfirmModal from "@/components/ui/confirmationModal";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import { toast } from "sonner";

export default function TestSeriesPage() {
    usePageTitle("Test Series");
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === "ADMIN";
    const isTeacher = user?.role === "TEACHER";

    const [testSeriesList, setTestSeriesList] = useState<TestSeries[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 12;

    // Modal states
    const [formOpen, setFormOpen] = useState(false);
    const [editingSeries, setEditingSeries] = useState<TestSeries | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deletingTitle, setDeletingTitle] = useState("");
    const [successOpen, setSuccessOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [currencies, setCurrencies] = useState<Currency[]>([]);

    // Form data
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        currency_id: "",
        is_published: false,
    });

    const fetchTestSeries = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: any = { page: currentPage, limit };
            if (searchTerm) params.search = searchTerm;

            const response = await testSeriesService.getAll(params);
            setTestSeriesList(response.data.data);
            setTotalPages(response.data.pagination.totalPages);
            setTotal(response.data.pagination.total);
        } catch (error) {
            console.error("Failed to fetch test series:", error);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchTerm]);

    useEffect(() => {
        fetchTestSeries();
    }, [fetchTestSeries]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    useEffect(() => {
        if (isAdmin) {
            currencyService.getAll().then(setCurrencies).catch(console.error);
        }
    }, [isAdmin]);

    const resetForm = () => {
        setFormData({ title: "", description: "", price: "", currency_id: "", is_published: false });
        setEditingSeries(null);
    };

    const openCreateModal = () => {
        resetForm();
        setFormOpen(true);
    };

    const openEditModal = (series: TestSeries) => {
        setEditingSeries(series);
        setFormData({
            title: series.title || "",
            description: series.description || "",
            price: series.price?.toString() || "",
            currency_id: series.currency_id?.toString() || "",
            is_published: series.is_published || false,
        });
        setFormOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;
        setIsSaving(true);

        try {
            const payload = {
                title: formData.title,
                description: formData.description || undefined,
                price: formData.price ? parseInt(formData.price) : undefined,
                currency_id: formData.currency_id ? parseInt(formData.currency_id) : undefined,
                is_published: formData.is_published,
            };

            if (editingSeries) {
                await testSeriesService.update(editingSeries.id, payload);
                setSuccessMessage("Test series updated successfully!");
            } else {
                await testSeriesService.create(payload);
                setSuccessMessage("Test series created successfully!");
            }
            setFormOpen(false);
            resetForm();
            setSuccessOpen(true);
            fetchTestSeries();
        } catch (error) {
            console.error("Failed to save test series:", error);
            setErrorMessage("Failed to save test series. Please try again.");
            setErrorOpen(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const confirmDelete = (id: number, title: string) => {
        setDeletingId(id);
        setDeletingTitle(title);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await testSeriesService.delete(deletingId);
            setDeleteConfirmOpen(false);
            toast.success("Test series deleted");
            fetchTestSeries();
        } catch (error) {
            console.error("Failed to delete test series:", error);
            setErrorMessage("Failed to delete test series.");
            setErrorOpen(true);
        }
    };

    // Stats
    const published = testSeriesList.filter((s) => s.is_published).length;
    const drafts = testSeriesList.filter((s) => !s.is_published).length;

    return (
        <div className="space-y-5">
            {/* Modals */}
            <ConfirmModal
                open={deleteConfirmOpen}
                title="Delete Test Series"
                description={`Are you sure you want to delete "${deletingTitle}"? This action cannot be undone. All tests and enrollments in this series will also be affected.`}
                onConfirm={handleDelete}
                onClose={() => setDeleteConfirmOpen(false)}
                confirmText="Delete"
                cancelText="Cancel"
            />
            <SuccessModal
                open={successOpen}
                title="Success"
                description={successMessage}
                onConfirm={() => setSuccessOpen(false)}
                onClose={() => setSuccessOpen(false)}
            />
            <ErrorModal
                open={errorOpen}
                title="Error"
                description={errorMessage}
                onConfirm={() => setErrorOpen(false)}
                onClose={() => setErrorOpen(false)}
            />

            {/* Create / Edit Dialog */}
            <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-gray-800">
                            {editingSeries ? "Edit Test Series" : "Create Test Series"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSeries
                                ? "Update the details of this test series."
                                : "Fill in the details to create a new test series."}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. NEET 2024 Prep Series"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Brief description of this test series"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="price">Price</Label>
                                <Input
                                    id="price"
                                    name="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>
                            {isAdmin && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="currency_id">Currency</Label>
                                    <Select
                                        value={formData.currency_id}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, currency_id: value }))
                                        }
                                    >
                                        <SelectTrigger id="currency_id">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencies.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.name} ({c.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_published" className="font-medium">Publish</Label>
                                <p className="text-xs text-muted-foreground">
                                    Make visible to students
                                </p>
                            </div>
                            <Switch
                                id="is_published"
                                checked={formData.is_published}
                                onCheckedChange={(checked) =>
                                    setFormData((prev) => ({ ...prev, is_published: checked }))
                                }
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving} className="bg-saBlue hover:bg-saBlueDarkHover text-white min-w-[100px]">
                                {isSaving ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="mr-2 h-4 w-4" /> {editingSeries ? "Update" : "Create"}</>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Test Series</h2>
                    <p className="text-muted-foreground text-sm">
                        {isAdmin || isTeacher ? "Create and manage test series" : "Browse available test series"}
                    </p>
                </div>
                {(isAdmin || isTeacher) && (
                    <Button onClick={openCreateModal} className="bg-saBlue hover:bg-saBlueDarkHover text-white w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> Create Test Series
                    </Button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg hidden sm:flex">
                        <Library className="h-5 w-5 text-saBlue" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Total</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-800">{total}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg hidden sm:flex">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Published</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-800">{published}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg hidden sm:flex">
                        <XCircle className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-gray-500">Drafts</p>
                        <p className="text-lg sm:text-xl font-bold text-gray-800">{drafts}</p>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search test series..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10"
                    />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Loading test series...</p>
                </div>
            ) : testSeriesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white rounded-xl shadow-sm border border-gray-100">
                    <Library className="h-14 w-14 text-gray-300" />
                    <p className="text-lg font-semibold text-gray-600">No test series found</p>
                    <p className="text-sm text-gray-400">
                        {searchTerm
                            ? "Try a different search term"
                            : isAdmin || isTeacher
                                ? "Create your first test series to get started"
                                : "Check back later for new test series"}
                    </p>
                    {(isAdmin || isTeacher) && !searchTerm && (
                        <Button onClick={openCreateModal} className="mt-2 bg-saBlue hover:bg-saBlueDarkHover text-white">
                            <Plus className="mr-2 h-4 w-4" /> Create Test Series
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {testSeriesList.map((series) => (
                        <Card
                            key={series.id}
                            className="group hover:shadow-md transition-all duration-200 border border-gray-100 rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => navigate(`/dashboard/test-series/${series.id}`)}
                        >
                            {/* Status bar */}
                            <div className={`h-1 ${series.is_published ? 'bg-green-500' : 'bg-orange-400'}`} />

                            <CardContent className="p-4 sm:p-5">
                                {/* Top row: title + actions */}
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-gray-800 truncate group-hover:text-saBlue transition-colors">
                                            {series.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                            {series.description || "No description"}
                                        </p>
                                    </div>

                                    {(isAdmin || isTeacher) && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 shrink-0">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem onClick={() => navigate(`/dashboard/test-series/${series.id}`)}>
                                                        <Eye className="h-4 w-4 mr-2" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditModal(series)}>
                                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {isAdmin && (
                                                        <DropdownMenuItem
                                                            onClick={() => confirmDelete(series.id, series.title)}
                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                <div className="flex items-center flex-wrap gap-2 mb-3">
                                    <Badge className={`text-[11px] px-2 py-0.5 ${series.is_published ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-orange-100 text-orange-700 hover:bg-orange-100'}`}>
                                        {series.is_published ? <><CheckCircle className="h-3 w-3 mr-1" /> Published</> : <><XCircle className="h-3 w-3 mr-1" /> Draft</>}
                                    </Badge>
                                    {series.price !== undefined && series.price !== null && (
                                        <Badge className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-50">
                                            <IndianRupee className="h-3 w-3 mr-0.5" />{series.price}
                                        </Badge>
                                    )}
                                </div>

                                {/* Stats row */}
                                <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5" />
                                        <span>{series._count?.tests || 0} Tests</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>{series._count?.enrollments || 0} Enrolled</span>
                                    </div>
                                    {(isAdmin || isTeacher) && (
                                        <div className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>{series.teacher_junctions?.length || 0} Teachers</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * limit + 1} to{" "}
                        {Math.min(currentPage * limit, total)} of {total}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
