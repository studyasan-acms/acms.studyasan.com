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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { testSeriesService, teacherService } from "@/services/api";
import type { TestSeriesTeacherJunction } from "@/types";
import { ArrowLeft, Loader2, Save, Users, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

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
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [teachers, setTeachers] = useState<TestSeriesTeacherJunction[]>([]);
    const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
    const [allTeachers, setAllTeachers] = useState<TeacherData[]>([]);
    const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        is_published: false,
    });

    useEffect(() => {
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
                price: data.price?.toString() || "",
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const payload = {
                title: formData.title,
                description: formData.description || undefined,
                price: parseInt(formData.price),
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

                        {/* Price */}
                        <div className="space-y-2">
                            <Label htmlFor="price">Price *</Label>
                            <Input
                                id="price"
                                name="price"
                                type="number"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="Enter price"
                                min="0"
                                required
                            />
                        </div>

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

            {/* Teacher Management - Only for editing */}
            {isEditing && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl text-gray-600">
                                    Assigned Teachers ({teachers.length})
                                </CardTitle>
                                <CardDescription>
                                    Manage teachers assigned to this test series
                                </CardDescription>
                            </div>
                            <Dialog open={isTeacherDialogOpen} onOpenChange={setIsTeacherDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={openTeacherDialog}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Assign Teacher
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Assign Teacher</DialogTitle>
                                        <DialogDescription>
                                            Select a teacher to assign to this test series
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <Input
                                            placeholder="Search teachers..."
                                            value={teacherSearchTerm}
                                            onChange={(e) => setTeacherSearchTerm(e.target.value)}
                                        />
                                        {isLoadingTeachers ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="max-h-64 overflow-y-auto space-y-2">
                                                {availableTeachers.length === 0 ? (
                                                    <p className="text-center text-muted-foreground py-4">
                                                        No teachers available
                                                    </p>
                                                ) : (
                                                    availableTeachers.map((teacher) => (
                                                        <div
                                                            key={teacher.id}
                                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                                        >
                                                            <div>
                                                                <p className="font-medium">{teacher.user?.name}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {teacher.user?.email}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleAssignTeacher(teacher.id)}
                                                            >
                                                                Assign
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {teachers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No teachers assigned yet</p>
                                <p className="text-sm">Click "Assign Teacher" to assign teachers</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {teachers.map((assignment) => (
                                    <div
                                        key={assignment.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{assignment.teacher.user?.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {assignment.teacher.user?.email} • Assigned{" "}
                                                {new Date(assignment.assigned_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-600 hover:text-red-800"
                                            onClick={() => handleRemoveTeacher(assignment.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
