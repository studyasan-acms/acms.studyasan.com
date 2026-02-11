import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
    BookOpen,
    LayoutDashboard,
    ClipboardList,
    Library,
    FolderOpen,
} from "lucide-react";

// Import existing pages
import SubjectsPage from "../subjects/SubjectsPage";
import ClassesPage from "../classes/ClassesPage";
import BoardsPage from "../boards/BoardsPage";
import TestSeriesPage from "../test-series/TestSeriesPage";
import ActivityGroupsPage from "../activities/ActivityGroupsPage";

export default function CurriculumPage() {
    usePageTitle("Curriculum Hub");
    const { user } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const isAdmin = user?.role === "ADMIN";
    const isTeacher = user?.role === "TEACHER";

    // Default tab
    const defaultTab = searchParams.get("tab") || "subjects";
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Update URL when tab changes
    useEffect(() => {
        setSearchParams({ tab: activeTab });
    }, [activeTab, setSearchParams]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                    Curriculum Management
                </h1>
                <p className="text-muted-foreground text-sm">
                    Manage your educational offerings, including subjects, classes, boards, and test series.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="overflow-x-auto pb-2">
                    <TabsList className="h-auto p-1 bg-muted/50 rounded-xl inline-flex min-w-full sm:min-w-fit">
                        <TabsTrigger
                            value="subjects"
                            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                        >
                            <BookOpen className="h-4 w-4" />
                            Subjects
                        </TabsTrigger>

                        <TabsTrigger
                            value="test-series"
                            className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                        >
                            <Library className="h-4 w-4" />
                            Test Series
                        </TabsTrigger>

                        {isAdmin && (
                            <>
                                <TabsTrigger
                                    value="activity-groups"
                                    className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                                >
                                    <FolderOpen className="h-4 w-4" />
                                    Activity Groups
                                </TabsTrigger>

                                <TabsTrigger
                                    value="classes"
                                    className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    Classes
                                </TabsTrigger>

                                <TabsTrigger
                                    value="boards"
                                    className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-2"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    Boards
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>
                </div>

                <TabsContent value="subjects" className="focus-visible:outline-none focus-visible:ring-0">
                    <SubjectsPage />
                </TabsContent>

                <TabsContent value="test-series" className="focus-visible:outline-none focus-visible:ring-0">
                    <TestSeriesPage />
                </TabsContent>

                {isAdmin && (
                    <>
                        <TabsContent value="activity-groups" className="focus-visible:outline-none focus-visible:ring-0">
                            <ActivityGroupsPage />
                        </TabsContent>

                        <TabsContent value="classes" className="focus-visible:outline-none focus-visible:ring-0">
                            <ClassesPage />
                        </TabsContent>

                        <TabsContent value="boards" className="focus-visible:outline-none focus-visible:ring-0">
                            <BoardsPage />
                        </TabsContent>
                    </>
                )}
            </Tabs>
        </div>
    );
}
