import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { testSeriesService, teacherService, currencyService } from "@/services/api";
import type { TestSeriesTeacherJunction, Currency } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { ArrowLeft, Loader2, Save, Users, UserPlus, X, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

interface TeacherData {
    id: number;
    user?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
    };
}

export default function TestSeriesFormPage() {
    usePageTitle("Test Series");
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const user = useAuthStore((state) => state.user);
    const isAdmin = user?.role === 'ADMIN';

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [teachers, setTeachers] = useState<TestSeriesTeacherJunction[]>([]);
    const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
    const [allTeachers, setAllTeachers] = useState<TeacherData[]>([]);
    const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        actual_price: "",
        currency_id: "",
        is_published: false,
    });

    useEffect(() => {
        fetchCurrencies();
        if (isEditing) {
            fetchTestSeries();
            fetchTeachers();
        }
    }, [id]);

    const fetchTestSeries = async () => {
        setIsLoading(true);
        try {
            const response = await testSeriesService.getById(parseInt(id!));
            const data = response.data;
            setFormData({
                title: data.title || "",
                description: data.description || "",
                price: data.price !== undefined && data.price !== null ? data.price.toString() : "",
                actual_price: data.actual_price !== undefined && data.actual_price !== null ? data.actual_price.toString() : "",
                currency_id: data.currency_id?.toString() || "",
                is_published: data.is_published || false,
            });
        } catch (error) {
            console.error("Failed to fetch test series:", error);
            toast.error("Failed to load test series");
            navigate("/dashboard/test-series");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTeachers = async () => {
        if (!isEditing) return;
        try {
            const response = await testSeriesService.getTeachers(parseInt(id!));
            setTeachers(response.data);
        } catch (error) {
            console.error("Failed to fetch teachers:", error);
        }
    };

    const fetchAllTeachers = async () => {
        setIsLoadingTeachers(true);
        try {
            const response = await teacherService.getAll({ limit: 100 });
            setAllTeachers(response.data.data);
        } catch (error) {
            console.error("Failed to fetch teachers:", error);
        } finally {
            setIsLoadingTeachers(false);
        }
    };

    const fetchCurrencies = async () => {
        try {
            const currencies = await currencyService.getAll();
            setCurrencies(currencies);
        } catch (err) {
            console.error('Failed to fetch currencies:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const payload = {
                title: formData.title,
                description: formData.description || undefined,
                price: formData.price !== "" ? parseFloat(formData.price) : null,
                actual_price: formData.actual_price !== "" ? parseFloat(formData.actual_price) : null,
                currency_id: formData.currency_id ? parseInt(formData.currency_id) : undefined,
                is_published: formData.is_published,
            };

            if (isEditing) {
                await testSeriesService.update(parseInt(id!), payload);
                toast.success("Test series updated successfully");
            } else {
                await testSeriesService.create(payload);
                toast.success("Test series created successfully");
            }
            navigate("/dashboard/test-series");
        } catch (error) {
            console.error("Failed to save test series:", error);
            toast.error("Failed to save test series");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAssignTeacher = async (teacherId: number) => {
        if (!isEditing) return;
        try {
            await testSeriesService.assignTeacher({ test_series_id: parseInt(id!), teacher_id: teacherId });
            toast.success("Teacher assigned successfully");
            fetchTeachers();
            setIsTeacherDialogOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to assign teacher");
        }
    };

    const handleRemoveTeacher = async (junctionId: number) => {
        if (!confirm("Are you sure you want to remove this teacher?")) return;
        try {
            await testSeriesService.removeTeacher(junctionId);
            toast.success("Teacher removed successfully");
            fetchTeachers();
        } catch (error) {
            toast.error("Failed to remove teacher");
        }
    };

    const openTeacherDialog = () => {
        fetchAllTeachers();
        setIsTeacherDialogOpen(true);
    };

    const assignedTeacherIds = teachers.map((t) => t.teacher.id);
    const availableTeachers = allTeachers.filter(
        (t) =>
            !assignedTeacherIds.includes(t.id) &&
            (teacherSearchTerm === "" ||
                t.user?.name.toLowerCase().includes(teacherSearchTerm.toLowerCase()) ||
                t.user?.email.toLowerCase().includes(teacherSearchTerm.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard/test-series")}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-600">
                        {isEditing ? "Edit Test Series" : "Create Test Series"}
                    </h1>
                    <p className="text-muted-foreground">
                        {isEditing
                            ? "Update test series details"
                            : "Create a new test series for students"}
                    </p>
                </div>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-gray-600">
                        Test Series Details
                    </CardTitle>
                    <CardDescription>
                        Fill in the information for the test series
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Enter test series title"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Enter test series description"
                                rows={4}
                            />
                        </div>

                        {/* Pricing Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="actual_price" className="flex items-center gap-1.5 font-medium text-sm text-gray-700">
                                    <Coins className="w-4 h-4 text-slate-500" />
                                    Actual Price (MRP)
                                </Label>
                                <Input
                                    id="actual_price"
                                    name="actual_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.actual_price}
                                    onChange={handleChange}
                                    placeholder="e.g. 500"
                                    className="h-10 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                                />
                                <p className="text-[11px] text-slate-400">Original price (shown with strike-through)</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="price" className="flex items-center gap-1.5 font-medium text-sm text-gray-700">
                                    <Coins className="w-4 h-4 text-slate-500" />
                                    Discounted Price (Selling Price)
                                </Label>
                                <Input
                                    id="price"
                                    name="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="e.g. 299"
                                    className="h-10 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                                />
                                <p className="text-[11px] text-slate-400">Actual price student will pay</p>
                            </div>
                        </div>

                        {/* Live Discount Calculation Badge */}
                        {formData.actual_price !== "" && formData.price !== "" && parseFloat(formData.actual_price) > parseFloat(formData.price) && (
                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs animate-in fade-in">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400 line-through font-semibold">
                                        ₹{parseFloat(formData.actual_price).toLocaleString()}
                                    </span>
                                    <span className="text-sm font-black text-slate-900">
                                        ₹{parseFloat(formData.price).toLocaleString()}
                                    </span>
                                </div>
                                <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 border-none">
                                    {Math.round(((parseFloat(formData.actual_price) - parseFloat(formData.price)) / parseFloat(formData.actual_price)) * 100)}% DISCOUNT
                                </Badge>
                            </div>
                        )}

                        {isAdmin && (
                            <div className="space-y-2">
                                <Label htmlFor="currency_id">Currency</Label>
                                <Select
                                    value={formData.currency_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, currency_id: value }))
                                    }
                                >
                                    <SelectTrigger id="currency_id" className="h-10 rounded-xl bg-gray-50 border-gray-200 text-sm">
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencies.map((currency) => (
                                            <SelectItem key={currency.id} value={currency.id.toString()}>
                                                {currency.name} ({currency.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Published */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="is_published">Published</Label>
                                <p className="text-sm text-muted-foreground">
                                    Make this test series visible to students
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

                        {/* Actions */}
                        <div className="flex justify-end gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate("/dashboard/test-series")}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {isEditing ? "Update" : "Create"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
