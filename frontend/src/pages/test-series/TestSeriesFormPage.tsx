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
import { testSeriesService } from "@/services/api";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function TestSeriesFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        price: "",
        is_published: false,
    });

    useEffect(() => {
        if (isEditing) {
            fetchTestSeries();
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
        </div>
    );
}
