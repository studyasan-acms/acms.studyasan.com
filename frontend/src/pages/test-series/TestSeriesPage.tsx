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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    ArrowUpDown,
    LayoutGrid,
    List,
    Filter,
    X,
    Star,
    Compass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/usePageTitle";
import ConfirmModal from "@/components/ui/confirmationModal";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TestSeriesPage() {
    usePageTitle("Test Series");
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const isAdmin = user?.role === "ADMIN";
    const isTeacher = user?.role === "TEACHER";

    const [testSeriesList, setTestSeriesList] = useState<TestSeries[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'published' | 'draft'
    const [sortOption, setSortOption] = useState("newest"); // 'newest' | 'oldest' | 'title_asc' | 'title_desc'
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
            if (searchTerm.trim()) params.search = searchTerm.trim();

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
    }, [searchTerm, statusFilter, sortOption]);

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

    // Filter & Sort frontend logic
    const filteredList = testSeriesList
        .filter((s) => {
            if (statusFilter === "published") return s.is_published;
            if (statusFilter === "draft") return !s.is_published;
            return true;
        })
        .sort((a, b) => {
            if (sortOption === "title_asc") return a.title.localeCompare(b.title);
            if (sortOption === "title_desc") return b.title.localeCompare(a.title);
            if (sortOption === "oldest") return a.id - b.id;
            return b.id - a.id; // newest default
        });

    const publishedCount = testSeriesList.filter((s) => s.is_published).length;
    const draftCount = testSeriesList.filter((s) => !s.is_published).length;

    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter("all");
        setSortOption("newest");
    };

    const hasActiveFilters = searchTerm || statusFilter !== "all" || sortOption !== "newest";

    return (
        <div className="space-y-5">
            {/* Modals */}
            <ConfirmModal
                open={deleteConfirmOpen}
                title="Delete Test Series"
                description={`Are you sure you want to delete "${deletingTitle}"? This action cannot be undone.`}
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
                <DialogContent className="sm:max-w-lg rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900">
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
                            <Label htmlFor="title" className="font-semibold text-xs text-slate-700">Title *</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. NEET 2026 Prep Series"
                                className="rounded-xl border-slate-200 focus:ring-saBlue"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="font-semibold text-xs text-slate-700">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Brief description of this test series"
                                className="rounded-xl border-slate-200 focus:ring-saBlue"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="price" className="font-semibold text-xs text-slate-700">Price</Label>
                                <Input
                                    id="price"
                                    name="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="0"
                                    min="0"
                                    className="rounded-xl border-slate-200 focus:ring-saBlue"
                                />
                            </div>
                            {isAdmin && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="currency_id" className="font-semibold text-xs text-slate-700">Currency</Label>
                                    <Select
                                        value={formData.currency_id}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({ ...prev, currency_id: value }))
                                        }
                                    >
                                        <SelectTrigger id="currency_id" className="rounded-xl border-slate-200">
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
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_published" className="font-bold text-slate-800 text-sm">Publish Immediately</Label>
                                <p className="text-xs text-slate-500">
                                    Make this test series visible to enrolled students
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
                            <Button type="button" variant="outline" onClick={() => { setFormOpen(false); resetForm(); }} className="rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl min-w-[100px] font-semibold">
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

            {/* BRAND UNIFIED STATS CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saBlue/40 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Test Series</p>
                            <h3 className="text-2xl font-black text-slate-900 mt-1">{total}</h3>
                        </div>
                        <div className="h-10 w-10 bg-saBlue/10 rounded-xl flex items-center justify-center text-saBlue">
                            <Library className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">Test series created in system</p>
                </Card>

                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-saVividOrange/40 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Published Series</p>
                            <h3 className="text-2xl font-black text-saVividOrange mt-1">{publishedCount}</h3>
                        </div>
                        <div className="h-10 w-10 bg-saVividOrange/10 rounded-xl flex items-center justify-center text-saVividOrange">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">Visible to students</p>
                </Card>

                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 hover:border-slate-300 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Draft Series</p>
                            <h3 className="text-2xl font-black text-slate-700 mt-1">{draftCount}</h3>
                        </div>
                        <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                            <XCircle className="h-5 w-5" />
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">Work in progress</p>
                </Card>
            </div>

            {/* SEARCH, SORTING & TOOLBAR */}
            <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-3.5">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search test series by title..."
                            className="pl-10 h-10 border-slate-200/80 rounded-xl bg-slate-50/50 focus:bg-white text-sm focus:ring-saBlue focus:border-saBlue"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Status Filter */}
                        <div className="min-w-[130px]">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="draft">Drafts</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sort Option */}
                        <div className="flex items-center gap-1.5 min-w-[170px]">
                            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <Select value={sortOption} onValueChange={setSortOption}>
                                <SelectTrigger className="h-10 border-slate-200/80 rounded-xl bg-slate-50/50 text-xs sm:text-sm font-medium focus:ring-saBlue">
                                    <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest First</SelectItem>
                                    <SelectItem value="oldest">Oldest First</SelectItem>
                                    <SelectItem value="title_asc">Title: A → Z</SelectItem>
                                    <SelectItem value="title_desc">Title: Z → A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all text-slate-600",
                                    viewMode === "grid" ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                                )}
                                title="Grid View"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "p-1.5 rounded-lg transition-all text-slate-600",
                                    viewMode === "list" ? "bg-white shadow-sm text-saBlue font-bold" : "hover:text-slate-900"
                                )}
                                title="List View"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Create Action */}
                        {(isAdmin || isTeacher) && (
                            <Button onClick={openCreateModal} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl h-10 font-semibold px-4 shadow-sm">
                                <Plus className="mr-1.5 h-4 w-4" /> Create Test Series
                            </Button>
                        )}
                    </div>
                </div>

                {/* Active Filters Bar */}
                {hasActiveFilters && (
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                                <Filter className="h-3 w-3 text-saBlue" /> Active Filters:
                            </span>
                            {searchTerm && (
                                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">
                                    Search: "{searchTerm}"
                                </Badge>
                            )}
                            {statusFilter !== "all" && (
                                <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-[10px] font-bold">
                                    Status: {statusFilter}
                                </Badge>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="h-6 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 font-semibold"
                        >
                            Clear Filters
                        </Button>
                    </div>
                )}
            </Card>

            {/* Content Display */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-2xl shadow-sm border border-slate-200/80">
                    <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-600 font-medium text-sm">Loading test series...</p>
                </div>
            ) : filteredList.length === 0 ? (
                <Card className="py-16 text-center bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                    <CardContent>
                        <div className="w-16 h-16 bg-saBlue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-saBlue">
                            <Library className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No Test Series Found</h3>
                        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-4">
                            {searchTerm || statusFilter !== "all"
                                ? "Try adjusting your search or filter criteria"
                                : "Create your first test series to get started"}
                        </p>
                        {(isAdmin || isTeacher) && (
                            <Button onClick={openCreateModal} className="bg-saBlue hover:bg-saBlueDarkHover text-white rounded-xl text-xs font-bold">
                                <Plus className="mr-2 h-4 w-4" /> Create Test Series
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : viewMode === "grid" ? (
                /* GRID VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full">
                    {filteredList.map((series) => (
                        <Card
                            key={series.id}
                            className="group hover:shadow-xl transition-all duration-300 overflow-hidden bg-white border border-slate-200/80 hover:border-saBlue/50 cursor-pointer rounded-2xl flex flex-col justify-between"
                            onClick={() => navigate(`/dashboard/test-series/${series.id}`)}
                        >
                            {/* Card Header with Brand Colors */}
                            <div className={cn(
                                "h-24 relative overflow-hidden p-4 flex flex-col justify-between transition-all",
                                series.is_published
                                    ? "bg-gradient-to-br from-saBlue via-saBlueLight to-blue-500"
                                    : "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800"
                            )}>
                                <div className="absolute inset-0 bg-black/10"></div>

                                {/* Top Status */}
                                <div className="relative z-10 flex items-center justify-between">
                                    <Badge className="bg-white/20 backdrop-blur-md text-white border-0 text-[10px] px-2 py-0.5 font-bold tracking-wider">
                                        Test Series
                                    </Badge>
                                    <Badge className={cn(
                                        "text-[10px] px-2 py-0.5 font-bold border-0 shadow-sm",
                                        series.is_published ? "bg-saVividOrange text-white" : "bg-slate-200 text-slate-800"
                                    )}>
                                        {series.is_published ? "Published" : "Draft"}
                                    </Badge>
                                </div>

                                {/* Title */}
                                <div className="relative z-10">
                                    <h3 className="text-lg font-bold text-white drop-shadow-md line-clamp-1">
                                        {series.title}
                                    </h3>
                                </div>

                                {/* Decorative circles */}
                                <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full pointer-events-none"></div>
                            </div>

                            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                                <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                                    {series.description || "No detailed description provided."}
                                </p>

                                {/* Tags & Price */}
                                <div className="flex items-center justify-between pt-1">
                                    {series.price !== undefined && series.price !== null ? (
                                        <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                                            <IndianRupee className="h-3 w-3 mr-0.5" />{series.price}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-lg">
                                            Free
                                        </Badge>
                                    )}

                                    {(isAdmin || isTeacher) && (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-lg">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                                    <DropdownMenuItem onClick={() => navigate(`/dashboard/test-series/${series.id}`)}>
                                                        <Eye className="h-4 w-4 mr-2 text-saBlue" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditModal(series)}>
                                                        <Edit className="h-4 w-4 mr-2 text-saVividOrange" /> Edit
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

                                {/* Stats row */}
                                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 font-medium">
                                    <div className="flex items-center gap-1">
                                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{series._count?.tests || 0} Tests</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                        <span>{series._count?.enrollments || 0} Enrolled</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                /* LIST VIEW */
                <Card className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead className="font-bold text-slate-700">#</TableHead>
                                <TableHead className="font-bold text-slate-700">Test Series Title</TableHead>
                                <TableHead className="font-bold text-slate-700">Status</TableHead>
                                <TableHead className="font-bold text-slate-700">Price</TableHead>
                                <TableHead className="font-bold text-slate-700">Tests Count</TableHead>
                                <TableHead className="font-bold text-slate-700">Enrollments</TableHead>
                                <TableHead className="text-right font-bold text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredList.map((series, index) => (
                                <TableRow
                                    key={series.id}
                                    className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/dashboard/test-series/${series.id}`)}
                                >
                                    <TableCell className="font-bold text-slate-400 text-xs">
                                        {index + 1 + (currentPage - 1) * limit}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-bold text-slate-900">{series.title}</div>
                                        <div className="text-xs text-slate-400 line-clamp-1">{series.description}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={cn(
                                            "text-[10px] font-bold border-0",
                                            series.is_published ? "bg-saVividOrange/15 text-saVividOrange" : "bg-slate-100 text-slate-600"
                                        )}>
                                            {series.is_published ? "Published" : "Draft"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-semibold text-slate-700">
                                        {series.price ? `₹${series.price}` : "Free"}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-600 font-medium">
                                        {series._count?.tests || 0}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-600 font-medium">
                                        {series._count?.enrollments || 0}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs text-saBlue hover:text-saBlueDarkHover hover:bg-saBlue/10 font-semibold"
                                                onClick={() => navigate(`/dashboard/test-series/${series.id}`)}
                                            >
                                                Details
                                            </Button>
                                            {isAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-600 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => confirmDelete(series.id, series.title)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-slate-500 font-medium">
                        Showing {(currentPage - 1) * limit + 1} to{" "}
                        {Math.min(currentPage * limit, total)} of {total} series
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="rounded-xl text-xs"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="rounded-xl text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
