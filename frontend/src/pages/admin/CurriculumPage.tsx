import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    const { hasPermission } = usePermissions();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const isAdmin = user?.role === "ADMIN";
    const isTeacher = user?.role === "TEACHER";

    // Permission-aware visibility: Admin always sees everything,
    // teachers see tabs based on their assigned role permissions
    const canSeeSubjects = isAdmin || hasPermission("subjects", "view");
    const canSeeTestSeries = isAdmin || hasPermission("testSeries", "view");
    const canSeeActivities = isAdmin || hasPermission("activityGroups", "view");
    const canSeeClasses = isAdmin || hasPermission("classes", "view");
    const canSeeBoards = isAdmin || hasPermission("boards", "view");

    // Default tab
    let fallbackTab = "subjects";
    if (!canSeeSubjects) {
        if (canSeeTestSeries) fallbackTab = "test-series";
        else if (canSeeActivities) fallbackTab = "activity-groups";
        else if (canSeeClasses) fallbackTab = "classes";
        else if (canSeeBoards) fallbackTab = "boards";
    }

    const defaultTab = searchParams.get("tab") || fallbackTab;
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Update URL when tab changes
    useEffect(() => {
        setSearchParams({ tab: activeTab });
    }, [activeTab, setSearchParams]);

    // If they have literally zero curriculum permissions, show a fallback message
    if (!canSeeSubjects && !canSeeTestSeries && !canSeeActivities && !canSeeClasses && !canSeeBoards) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Curriculum Access</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                    You don't have permission to view any curriculum resources. Please contact your administrator.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1.5 sm:gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                    Curriculum Management
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm">
                    Manage your educational offerings, including subjects, classes, boards, and test series.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="w-full">
                    <TabsList className="h-auto p-1 bg-muted/50 rounded-xl flex flex-wrap gap-1 w-full sm:w-auto sm:inline-flex">
                        {canSeeSubjects && (
                            <TabsTrigger
                                value="subjects"
                                className="rounded-lg px-3 sm:px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                            >
                                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Subjects
                            </TabsTrigger>
                        )}

                        {canSeeTestSeries && (
                            <TabsTrigger
                                value="test-series"
                                className="rounded-lg px-3 sm:px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                            >
                                <Library className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Test Series
                            </TabsTrigger>
                        )}

                        {canSeeActivities && (
                            <TabsTrigger
                                value="activity-groups"
                                className="rounded-lg px-3 sm:px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                            >
                                <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Activities
                            </TabsTrigger>
                        )}

                        {canSeeClasses && (
                            <TabsTrigger
                                value="classes"
                                className="rounded-lg px-3 sm:px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                            >
                                <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Classes
                            </TabsTrigger>
                        )}

                        {canSeeBoards && (
                            <TabsTrigger
                                value="boards"
                                className="rounded-lg px-3 sm:px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                            >
                                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Boards
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                {canSeeSubjects && (
                    <TabsContent value="subjects" className="focus-visible:outline-none focus-visible:ring-0">
                        <SubjectsPage embedded={true} />
                    </TabsContent>
                )}

                {canSeeTestSeries && (
                    <TabsContent value="test-series" className="focus-visible:outline-none focus-visible:ring-0">
                        <TestSeriesPage />
                    </TabsContent>
                )}

                {canSeeActivities && (
                    <TabsContent value="activity-groups" className="focus-visible:outline-none focus-visible:ring-0">
                        <ActivityGroupsPage />
                    </TabsContent>
                )}

                {canSeeClasses && (
                    <TabsContent value="classes" className="focus-visible:outline-none focus-visible:ring-0">
                        <ClassesPage />
                    </TabsContent>
                )}

                {canSeeBoards && (
                    <TabsContent value="boards" className="focus-visible:outline-none focus-visible:ring-0">
                        <BoardsPage />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
