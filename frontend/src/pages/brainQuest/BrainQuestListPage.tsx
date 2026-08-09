import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Puzzle,
  Plus,
  Search,
  BookOpen,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Trash2,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { brainQuestService, subjectService } from "@/services/api";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function BrainQuestListPage() {
  usePageTitle("Brain Quest");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.role === "ADMIN" || (typeof user?.role === "object" && (user?.role as any)?.name === "ADMIN");
  const isTeacher = user?.role === "TEACHER" || (typeof user?.role === "object" && (user?.role as any)?.name === "TEACHER");
  const isStudent = user?.role === "STUDENT" || (typeof user?.role === "object" && (user?.role as any)?.name === "STUDENT");

  const [quests, setQuests] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchSubjects = async () => {
    try {
      const res = await subjectService.getAll({ limit: 100 });
      setSubjects(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load subjects:", err);
    }
  };

  const fetchBrainQuests = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 9,
        search: searchTerm.trim() || undefined,
        subject_id: subjectFilter !== "all" ? parseInt(subjectFilter) : undefined,
      };

      const res = await brainQuestService.getAll(params);
      const items = res.data?.data || [];
      const pagination = res.data?.pagination || { page: 1, totalPages: 1, total: items.length };

      setQuests(items);
      setTotalPages(pagination.totalPages || 1);
      setTotalItems(pagination.total || items.length);
    } catch (err: any) {
      console.error("Failed to load Brain Quests:", err);
      toast.error("Failed to load Brain Quest tests.");
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, subjectFilter]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchBrainQuests();
  }, [fetchBrainQuests]);

  const handleDeleteQuest = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this Brain Quest test?")) return;
    try {
      await brainQuestService.delete(id);
      toast.success("Brain Quest test deleted successfully!");
      fetchBrainQuests();
    } catch (err: any) {
      console.error("Failed to delete Brain Quest:", err);
      toast.error(err.response?.data?.error || "Failed to delete test.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* KID-FRIENDLY HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0276D3] via-[#025AA3] to-[#eca209] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-8 -bottom-8 opacity-20 pointer-events-none">
          <Puzzle className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-300" />
            Kids Test & Paper Activities
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Brain Quest
          </h1>
          <p className="text-sm sm:text-base text-blue-50 font-medium leading-relaxed">
            Download test paper PDFs directly, write your solutions, and upload photo/PDF answer sheets for teacher evaluation!
          </p>

          {(isTeacher || isAdmin) && (
            <div className="pt-2">
              <Button
                onClick={() => navigate("/dashboard/brain-quest/create")}
                className="bg-[#eca209] hover:bg-[#d49106] text-white font-extrabold rounded-2xl h-11 px-6 shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Plus className="w-5 h-5" />
                Upload New Brain Quest
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search tests or subjects..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
            />
          </div>

          {/* Subject Filter */}
          <Select
            value={subjectFilter}
            onValueChange={(val) => {
              setSubjectFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 w-full sm:w-48">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s: any) => {
                const className = s.class?.name ? ` [${s.class.name}]` : "";
                const boardName = s.board?.name ? ` [${s.board.name}]` : "";
                const label = `${s.name}${className}${boardName}`;
                return (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
          Showing <span className="text-slate-800 font-bold">{quests.length}</span> of{" "}
          <span className="text-slate-800 font-bold">{totalItems}</span> tests
        </div>
      </div>

      {/* BRAIN QUEST CARDS GRID */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#0276D3]" />
        </div>
      ) : quests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-[#eca209] flex items-center justify-center mx-auto shadow-inner">
            <Puzzle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Brain Quest Tests Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are no test paper activities matching your filter criteria. Teachers will post new Brain Quest test papers here soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map((quest) => {
            const studentSub = quest.submissions?.[0];

            return (
              <Card
                key={quest.id}
                onClick={() => navigate(`/dashboard/brain-quest/${quest.id}`)}
                className="group border border-slate-200/80 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden bg-white flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Banner */}
                  <div className="bg-gradient-to-r from-[#0276D3] to-slate-900 p-4 text-white flex items-center justify-between">
                    <Badge variant="secondary" className="bg-[#eca209] text-white font-black px-2.5 py-0.5 rounded-lg text-[10px]">
                      {quest.subject?.name || "General"}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-blue-100 font-bold">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      {quest.total_marks || 100} Marks
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-[#0276D3] transition-colors line-clamp-1">
                        {quest.title}
                      </h3>
                      {quest.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {quest.description}
                        </p>
                      )}
                    </div>

                    {/* Due Date & Teacher Info */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                      {quest.due_date && (
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#0276D3] shrink-0" />
                          <span>Due: {format(new Date(quest.due_date), "PPP")}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-500">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Teacher: {quest.teacher?.user?.name || "Teacher In-charge"}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Card Footer Status & Action */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Status Indicator */}
                  {isStudent ? (
                    studentSub ? (
                      studentSub.is_graded ? (
                        <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold px-2.5 py-1 rounded-xl text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Graded: {studentSub.marks_obtained ?? 0} / {quest.total_marks || 100}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 border-blue-200 text-[#0276D3] font-bold px-2.5 py-1 rounded-xl text-xs">
                          <Clock className="w-3.5 h-3.5 mr-1 text-[#0276D3]" />
                          Submitted (Pending Grade)
                        </Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 font-bold px-2.5 py-1 rounded-xl text-xs">
                        <FileText className="w-3.5 h-3.5 mr-1 text-[#eca209]" />
                        Not Submitted
                      </Badge>
                    )
                  ) : (
                    <span className="text-xs text-slate-500 font-bold">
                      {quest._count?.submissions || 0} Submissions
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/dashboard/brain-quest/${quest.id}`)}
                      className="bg-[#0276D3] hover:bg-[#025AA3] text-white font-bold rounded-xl h-8 text-xs px-3 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View Test
                    </Button>

                    {(isTeacher || isAdmin) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleDeleteQuest(e, quest.id)}
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl"
                        title="Delete Test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">
            Page <span className="font-bold text-slate-700">{page}</span> of{" "}
            <span className="font-bold text-slate-700">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="rounded-xl h-8 text-xs"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="rounded-xl h-8 text-xs"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
