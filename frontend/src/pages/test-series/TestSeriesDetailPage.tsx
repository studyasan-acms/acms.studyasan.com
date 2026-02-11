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
import { testSeriesService, studentService, teacherService } from "@/services/api";
import type { TestSeries, TestSeriesTeacherJunction } from "@/types";
import { useAuthStore } from "@/store/authStore";
import {
    ArrowLeft,
    Loader2,
    Edit,
    Users,
    FileText,
    UserPlus,
    X,
    CheckCircle,
    XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";

interface StudentData {
    id: number;
    user?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
    };
}

interface TeacherData {
    id: number;
    user?: {
        id: number;
        name: string;
        email: string;
        phone?: string;
    };
}

interface EnrolledStudent {
    id: number;
    student_id: number;
    enrolled_at: string;
    student?: StudentData;
}

export default function TestSeriesDetailPage() {
    usePageTitle("Test Series Details");
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuthStore();
    const isAdmin = user?.role === "ADMIN";

    const [testSeries, setTestSeries] = useState<TestSeries | null>(null);
    const [teachers, setTeachers] = useState<TestSeriesTeacherJunction[]>([]);
    const [enrollments, setEnrollments] = useState<EnrolledStudent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
    const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
    const [allStudents, setAllStudents] = useState<StudentData[]>([]);
    const [allTeachers, setAllTeachers] = useState<TeacherData[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [teacherSearchTerm, setTeacherSearchTerm] = useState("");
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isLoadingTeachers, setIsLoadingTeachers] = useState(false);

    useEffect(() => {
        if (id) {
            fetchTestSeries();
            if (isAdmin) {
                fetchEnrollments();
                fetchTeachers();
            }
        }
    }, [id, isAdmin]);

    const fetchTestSeries = async () => {
        setIsLoading(true);
        try {
            const response = await testSeriesService.getById(parseInt(id!));
            setTestSeries(response.data);
        } catch (error) {
            console.error("Failed to fetch test series:", error);
            toast.error("Failed to load test series");
            navigate("/dashboard/test-series");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEnrollments = async () => {
        try {
            const response = await testSeriesService.getEnrollments(parseInt(id!));
            setEnrollments(response.data as EnrolledStudent[]);
        } catch (error) {
            console.error("Failed to fetch enrollments:", error);
        }
    };

    const fetchTeachers = async () => {
        try {
            const response = await testSeriesService.getTeachers(parseInt(id!));
            setTeachers(response.data);
        } catch (error) {
            console.error("Failed to fetch teachers:", error);
        }
    };

    const fetchStudents = async () => {
        setIsLoadingStudents(true);
        try {
            const response = await studentService.getAll({ limit: 100 });
            setAllStudents(response.data.data);
        } catch (error) {
            console.error("Failed to fetch students:", error);
        } finally {
            setIsLoadingStudents(false);
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

    const handleEnrollStudent = async (studentId: number) => {
        try {
            await testSeriesService.enroll(parseInt(id!), { student_id: studentId });
            toast.success("Student enrolled successfully");
            fetchEnrollments();
            setIsEnrollDialogOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to enroll student");
        }
    };

    const handleUnenrollStudent = async (studentId: number) => {
        if (!confirm("Are you sure you want to remove this student?")) return;
        try {
            await testSeriesService.unenroll(parseInt(id!), studentId);
            toast.success("Student removed successfully");
            fetchEnrollments();
        } catch (error) {
            toast.error("Failed to remove student");
        }
    };

    const handleAssignTeacher = async (teacherId: number) => {
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

    const openEnrollDialog = () => {
        fetchStudents();
        setIsEnrollDialogOpen(true);
    };

    const openTeacherDialog = () => {
        fetchAllTeachers();
        setIsTeacherDialogOpen(true);
    };

    const enrolledStudentIds = enrollments.map((e) => e.student?.id).filter((id): id is number => id !== undefined);
    const availableStudents = allStudents.filter(
        (s) =>
            !enrolledStudentIds.includes(s.id) &&
            (searchTerm === "" ||
                s.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.user?.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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

    if (!testSeries) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
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
                            {testSeries.title}
                        </h1>
                        <p className="text-muted-foreground">
                            {testSeries.description || "No description"}
                        </p>
                    </div>
                </div>

                {(isAdmin || user?.role === "TEACHER") && (
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/dashboard/test-series/${id}/edit`)}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                    </Button>
                )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Tests</p>
                                <p className="text-2xl font-bold">
                                    {testSeries._count?.tests || 0}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Enrolled</p>
                                <p className="text-2xl font-bold">{enrollments.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                {testSeries.is_published ? (
                                    <CheckCircle className="h-5 w-5 text-purple-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-purple-600" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="text-lg font-bold">
                                    {testSeries.is_published ? "Published" : "Draft"}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Price */}
            <Card>
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-2xl font-bold">₹{testSeries.price || 0}</p>
                </CardContent>
            </Card>

            {/* Enrolled Students - Admin Only */}
            {isAdmin && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl text-gray-600">
                                    Enrolled Students ({enrollments.length})
                                </CardTitle>
                                <CardDescription>
                                    Manage student enrollments for this test series
                                </CardDescription>
                            </div>
                            <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={openEnrollDialog}>
                                        <UserPlus className="h-4 w-4 mr-2" />
                                        Add Student
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Enroll Student</DialogTitle>
                                        <DialogDescription>
                                            Select a student to enroll in this test series
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <Input
                                            placeholder="Search students..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {isLoadingStudents ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="max-h-64 overflow-y-auto space-y-2">
                                                {availableStudents.length === 0 ? (
                                                    <p className="text-center text-muted-foreground py-4">
                                                        No students available
                                                    </p>
                                                ) : (
                                                    availableStudents.map((student) => (
                                                        <div
                                                            key={student.id}
                                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                                        >
                                                            <div>
                                                                <p className="font-medium">{student.user?.name}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {student.user?.email}
                                                                </p>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleEnrollStudent(student.id)}
                                                            >
                                                                Enroll
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
                        {enrollments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No students enrolled yet</p>
                                <p className="text-sm">Click "Add Student" to enroll students</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {enrollments.map((enrollment) => (
                                    <div
                                        key={enrollment.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{enrollment.student?.user?.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {enrollment.student?.user?.email} • Enrolled{" "}
                                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-600 hover:text-red-800"
                                            onClick={() => enrollment.student && handleUnenrollStudent(enrollment.student.id)}
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

            {/* Assigned Teachers - Admin Only */}
            {isAdmin && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl text-gray-600">
                                    Assigned Teachers ({teachers.length})
                                </CardTitle>
                                <CardDescription>
                                    Manage teacher assignments for this test series
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

            {/* Tests List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl text-gray-600">
                        Tests ({testSeries.tests?.length || 0})
                    </CardTitle>
                    <CardDescription>Tests in this series</CardDescription>
                </CardHeader>
                <CardContent>
                    {!testSeries.tests || testSeries.tests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No tests in this series yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {testSeries.tests.map((test: any) => {
                                // Tests in test series are always available if published (no time restrictions)
                                const canAttempt = test.is_published;

                                return (
                                    <div
                                        key={test.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                    >
                                        <div
                                            className="flex-1 cursor-pointer"
                                            onClick={() => navigate(`/tests/${test.id}`)}
                                        >
                                            <p className="font-medium">{test.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {test._count?.questions || 0} questions • {test.duration_minutes} mins
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={test.is_published ? "default" : "secondary"}>
                                                {test.is_published ? "Published" : "Draft"}
                                            </Badge>
                                            {user?.role === "STUDENT" && canAttempt && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => navigate(`/tests/${test.id}`)}
                                                >
                                                    Start Test
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
