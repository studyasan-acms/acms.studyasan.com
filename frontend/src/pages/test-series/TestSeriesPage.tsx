import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { testSeriesService } from "@/services/api";
import type { TestSeries } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import {
    Plus,
    Search,
    Loader2,
    Library,
    Eye,
    Edit,
    Trash2,
    Users,
    FileText,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TestSeriesPage() {
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
    const limit = 10;

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

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this test series?")) return;
        try {
            await testSeriesService.delete(id);
            fetchTestSeries();
        } catch (error) {
            console.error("Failed to delete test series:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-600">Test Series</h1>
                    <p className="text-muted-foreground">
                        {isAdmin || isTeacher
                            ? "Manage test series"
                            : "Browse available test series"}
                    </p>
                </div>

                {(isAdmin || isTeacher) && (
                    <Button
                        onClick={() => navigate("/dashboard/test-series/new")}
                        className="w-full md:w-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Test Series
                    </Button>
                )}
            </div>

            {/* Search */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-gray-600">
                        All Test Series ({total})
                    </CardTitle>
                    <CardDescription>
                        {isAdmin || isTeacher
                            ? "View and manage all test series"
                            : "Browse available test series"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search test series..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : testSeriesList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Library className="h-12 w-12 mb-4" />
                            <p className="text-lg font-medium">No test series found</p>
                            <p className="text-sm">
                                {isAdmin || isTeacher
                                    ? "Create your first test series"
                                    : "Check back later for new test series"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {testSeriesList.map((series) => (
                                <Card
                                    key={series.id}
                                    className="hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => navigate(`/dashboard/test-series/${series.id}`)}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg text-gray-700 line-clamp-1">
                                                    {series.title}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2 mt-1">
                                                    {series.description || "No description"}
                                                </CardDescription>
                                            </div>
                                            {series.is_published ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Published
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-4 w-4" />
                                                <span>{series._count?.tests || 0} Tests</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                <span>{series._count?.enrollments || 0} Enrolled</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => navigate(`/dashboard/test-series/${series.id}`)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>

                                            {(isAdmin || isTeacher) && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => navigate(`/dashboard/test-series/${series.id}/edit`)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-800"
                                                            onClick={() => handleDelete(series.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <p className="text-sm text-muted-foreground">
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
                </CardContent>
            </Card>
        </div>
    );
}
