import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { studentService, knowYourChildService } from "@/services/api";
import {
  GraduationCap,
  Calendar,
  User,
  BookOpen,
  CheckCircle2,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Filter,
  Eye,
  FileText,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function KnowYourChildPage() {
  const { user } = useAuthStore();
  const [student, setStudent] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [feedbackModalReport, setFeedbackModalReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportsTotal, setReportsTotal] = useState(0);

  // Filter States
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) {
      fetchStudentData(1);
    }
  }, [user]);

  const fetchStudentData = async (
    pageNum = 1,
    subjectId = selectedSubjectFilter,
    month = selectedMonthFilter,
    status = selectedStatusFilter,
    search = searchTerm
  ) => {
    try {
      setLoading(true);
      // Fetch student record by user ID
      const studentRes = await studentService.getAll({ user_id: user?.id, limit: 1 });
      const studentData = studentRes.data.data[0];
      
      if (!studentData) {
        setLoading(false);
        return;
      }
      
      setStudent(studentData);

      const params: any = { page: pageNum, limit: 10 };
      if (subjectId !== "all") params.subject_id = parseInt(subjectId);
      if (month !== "all") params.month = month;
      if (status !== "all") params.feedback_status = status;
      if (search.trim()) params.search = search.trim();

      // Fetch weekly reports with filters
      const reportsRes = await knowYourChildService.getStudentReports(studentData.id, params);
      const reportsList = reportsRes.data.data;
      setReports(reportsList);
      setReportsPage(reportsRes.data.pagination.page);
      setReportsTotalPages(reportsRes.data.pagination.totalPages);
      setReportsTotal(reportsRes.data.pagination.total);
      
      setSelectedReport(null);
      setFeedbackText("");
    } catch (error) {
      console.error("Failed to load student reports data:", error);
      toast.error("Failed to load reports data.");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (pageNum: number) => {
    fetchStudentData(pageNum);
  };

  const handleClearFilters = () => {
    setSelectedSubjectFilter("all");
    setSelectedMonthFilter("all");
    setSelectedStatusFilter("all");
    setSearchTerm("");
    fetchStudentData(1, "all", "all", "all", "");
  };

  const hasActiveFilters =
    selectedSubjectFilter !== "all" ||
    selectedMonthFilter !== "all" ||
    selectedStatusFilter !== "all" ||
    searchTerm.trim() !== "";

  const handleSelectReport = (report: any) => {
    setSelectedReport(report);
  };

  const openFeedbackModal = (report: any) => {
    setFeedbackModalReport(report);
    setFeedbackText(report.parent_feedback || "");
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById("weekly-report-card-print");
    if (!element) return;
    
    try {
      toast.info("Generating PDF...");
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#f0f4ff"
      });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`Weekly_Report_${student?.user?.name || "Student"}_${selectedReport?.month || "Month"}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to download PDF.");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackModalReport) return;
    if (!feedbackText.trim()) {
      toast.error("Feedback text cannot be empty.");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await knowYourChildService.addParentFeedback(feedbackModalReport.id, feedbackText);
      toast.success("Feedback submitted successfully to the teacher!");
      
      // Update local state
      const updatedReports = reports.map(r => 
        r.id === feedbackModalReport.id ? { ...r, parent_feedback: feedbackText } : r
      );
      setReports(updatedReports);
      setFeedbackModalReport(null);
      setFeedbackText("");
    } catch (error) {
      console.error("Failed to submit parent feedback:", error);
      toast.error("Failed to submit feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading && !student) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-saBlue" />
        <p className="text-sm font-medium text-slate-500">Loading student reports...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto h-96">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Student Profile Not Found</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          We were unable to locate your student profile in the system. If you are a teacher, please use the Student Dashboard instead.
        </p>
      </div>
    );
  }

  const enrolledSubjects = student?.enrollments?.filter((e: any) => e.type === 'SUBJECT' && e.subject).map((e: any) => e.subject) || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Simple Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Weekly Performance Reports</h1>
          <Badge variant="outline" className="bg-saBlue/10 text-saBlue border-saBlue/20 font-semibold px-2.5 py-0.5 rounded-full text-xs">
            Know Your Child
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Track weekly progress evaluations, check subject ratings, and share feedback with your child's teachers.
        </p>
      </div>

      <div className="space-y-8 animate-fade-in">
        {/* TABULAR REPORT HISTORY LOG WITH WEBSITES EXISTING STRUCTURE & FILTERS */}
        <Card className="rounded-3xl border-slate-100 shadow-md overflow-hidden bg-white">
          <CardContent className="p-6 md:p-8 space-y-6">
            {/* Header & Filter Controls Bar */}
            <div className="flex flex-col gap-4 border-b pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-xl tracking-tight">Report History Log</h3>
                  <p className="text-xs text-slate-400 mt-0.5">View and download all weekly performance cards</p>
                </div>
                <div className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-fit">
                  Total Cards: <span className="font-bold text-saBlue">{reportsTotal}</span>
                </div>
              </div>

              {/* FILTERS BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search teacher, remarks..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      fetchStudentData(1, selectedSubjectFilter, selectedMonthFilter, selectedStatusFilter, e.target.value);
                    }}
                    className="pl-9 h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>

                {/* Subject Filter */}
                <Select
                  value={selectedSubjectFilter}
                  onValueChange={(val) => {
                    setSelectedSubjectFilter(val);
                    fetchStudentData(1, val, selectedMonthFilter, selectedStatusFilter, searchTerm);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white">
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {enrolledSubjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Month Filter */}
                <Select
                  value={selectedMonthFilter}
                  onValueChange={(val) => {
                    setSelectedMonthFilter(val);
                    fetchStudentData(1, selectedSubjectFilter, val, selectedStatusFilter, searchTerm);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white">
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Feedback Reply Status Filter */}
                <Select
                  value={selectedStatusFilter}
                  onValueChange={(val) => {
                    setSelectedStatusFilter(val);
                    fetchStudentData(1, selectedSubjectFilter, selectedMonthFilter, val, searchTerm);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white">
                    <SelectValue placeholder="All Feedback Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl flex items-center gap-1 font-bold"
                  >
                    <X className="h-3.5 w-3.5" /> Clear All Filters
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <GraduationCap className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                No weekly reports matching your filter criteria.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="border-b border-slate-100 hover:bg-transparent">
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Month</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Week Duration</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Subject</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Teacher In-charge</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5">Feedback Reply</TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 py-3.5 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {reports.map((report) => {
                        const isSelected = selectedReport?.id === report.id;
                        return (
                          <TableRow
                            key={report.id}
                            className={cn(
                              "hover:bg-slate-50/70 transition-colors",
                              isSelected && "bg-blue-50/30"
                            )}
                          >
                            <TableCell className="py-3.5 font-bold uppercase text-xs">
                              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-600 font-extrabold px-2.5 py-0.5 rounded-lg">
                                {report.month}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3.5 font-semibold text-slate-700 text-xs">
                              Week of {format(new Date(report.week_start_date), "MMM d")}
                            </TableCell>

                            <TableCell className="py-3.5 text-xs">
                              {report.subject ? (
                                <Badge variant="secondary" className="bg-blue-50 border-blue-200 text-blue-700 font-bold px-2.5 py-0.5 rounded-lg">
                                  {report.subject.name}
                                </Badge>
                              ) : (
                                <span className="text-slate-400 italic">General</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 text-slate-700 font-medium text-xs">
                              {report.teacher?.user?.name || "Teacher"}
                            </TableCell>

                            <TableCell className="py-3.5 text-xs">
                              <button
                                type="button"
                                onClick={() => openFeedbackModal(report)}
                                className="cursor-pointer group text-left"
                                title="Click to view/submit feedback"
                              >
                                {report.parent_feedback ? (
                                  <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit group-hover:bg-emerald-100 transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    Submitted
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit group-hover:bg-amber-100 transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                    Pending
                                  </Badge>
                                )}
                              </button>
                            </TableCell>

                            <TableCell className="py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleSelectReport(report)}
                                  className={cn(
                                    "rounded-xl px-3 h-8 text-xs font-bold transition-all shadow-xs",
                                    isSelected
                                      ? "bg-saBlue text-white hover:bg-saBlue/90"
                                      : "text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-saBlue"
                                  )}
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1" /> View Card
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openFeedbackModal(report)}
                                  className="rounded-xl px-2.5 h-8 text-xs font-bold text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-saBlue transition-all shadow-xs"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 mr-1 text-saBlue" /> Feedback
                                </Button>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={async () => {
                                    const current = selectedReport;
                                    setSelectedReport(report);
                                    setTimeout(async () => {
                                      const element = document.getElementById("weekly-report-card-print");
                                      if (element) {
                                        try {
                                          toast.info("Generating PDF...");
                                          const canvas = await html2canvas(element, {
                                            scale: 2,
                                            useCORS: true,
                                            logging: false,
                                            backgroundColor: "#f0f4ff"
                                          });
                                          const imgData = canvas.toDataURL("image/png");
                                          const pdf = new jsPDF({
                                            orientation: "portrait",
                                            unit: "px",
                                            format: [canvas.width / 2, canvas.height / 2]
                                          });
                                          pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
                                          pdf.save(`Weekly_Report_${student?.user?.name || "Student"}_${report.month}.pdf`);
                                          toast.success("PDF downloaded successfully!");
                                        } catch (err) {
                                          console.error("PDF error:", err);
                                          toast.error("Failed to download PDF.");
                                        }
                                      }
                                      setSelectedReport(current);
                                    }, 300);
                                  }}
                                  className="rounded-xl border-slate-200 h-8 w-8 text-slate-500 hover:text-saBlue hover:bg-blue-50"
                                  title="Download PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {reportsTotalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-500 font-medium">
                      Showing page <span className="font-bold text-slate-700">{reportsPage}</span> of <span className="font-bold text-slate-700">{reportsTotalPages}</span> ({reportsTotal} reviews)
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-8 px-3 rounded-lg text-xs"
                        disabled={reportsPage <= 1 || loading}
                        onClick={() => handlePageChange(reportsPage - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 px-3 rounded-lg text-xs"
                        disabled={reportsPage >= reportsTotalPages || loading}
                        onClick={() => handlePageChange(reportsPage + 1)}
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

          {/* REPORT PREVIEW MODAL DIALOG POPUP */}
          {selectedReport && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" 
              onClick={() => setSelectedReport(null)}
            >
              <div 
                className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 max-w-md w-full relative animate-in zoom-in-95 duration-200 max-h-[96vh] flex flex-col" 
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedReport(null)}
                  className="absolute top-3 right-3 bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full z-20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Modal Content Scrollable Area */}
                <div className="p-3 sm:p-4 space-y-3 overflow-y-auto max-h-[92vh]">
                  {/* Action Bar */}
                  <div className="flex justify-between items-center bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Evaluation Card</span>
                    <Button
                      onClick={handleDownloadPDF}
                      className="bg-[#002fbe] hover:bg-[#002fbe]/90 text-white font-bold rounded-xl h-8 px-3 flex items-center gap-1 text-[11px] shadow-xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Download PDF Card
                    </Button>
                  </div>

                  {/* PRINT CONTAINER */}
                  <div id="weekly-report-card-print" className="bg-[#f0f4ff] p-3 sm:p-3.5 rounded-2xl">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-slate-100 max-w-sm mx-auto">
                      {/* Top blue bar */}
                      <div className="bg-[#002fbe] px-3.5 py-1.5 flex items-center justify-between">
                        <div className="flex items-center h-5">
                          <img src="/studyasan-logo.png" alt="StudyAsan Logo" className="h-4 w-auto object-contain" />
                        </div>
                        <span className="text-white font-bold text-[8px] tracking-wider">www.studyasan.com</span>
                      </div>

                      {/* Main Orange header */}
                      <div className="bg-[#f06418] px-3.5 py-2.5 flex items-center justify-between border-b border-white/10">
                        <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider leading-none">WEEKLY REPORT</h2>
                        <div className="flex items-center justify-center bg-[#f06418] border border-white/20 p-0.5 rounded-lg w-9 h-9 shadow-inner shrink-0">
                          <img src="/studyasan-logo-lady.png" alt="StudyAsan Lady Logo" className="w-7 h-7 object-contain" />
                        </div>
                      </div>

                      {/* Details capsules */}
                      <div className="p-3 space-y-2.5">
                        <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold">
                          <div className="space-y-0.5">
                            <span className="text-slate-500 block uppercase tracking-wide text-[8px]">Student:</span>
                            <div className="bg-[#1e1e4f] text-white py-1 px-1.5 rounded-md text-center shadow-inner truncate font-extrabold uppercase text-[9px]">
                              {student?.user?.name}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-slate-500 block uppercase tracking-wide text-[8px]">Class:</span>
                            <div className="bg-[#1e1e4f] text-white py-1 px-1.5 rounded-md text-center shadow-inner font-extrabold uppercase text-[9px]">
                              {student?.class?.name || "N/A"}
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-slate-500 block uppercase tracking-wide text-[8px]">Month:</span>
                            <div className="bg-[#1e1e4f] text-white py-1 px-1.5 rounded-md text-center shadow-inner font-extrabold uppercase text-[9px]">
                              {selectedReport.month}
                            </div>
                          </div>
                        </div>

                        {/* Subheader */}
                        <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5 pt-0.5 text-[#002fbe]">
                          <Sparkles className="w-4 h-4 text-[#002fbe] shrink-0" />
                          <span className="text-xs font-black uppercase tracking-wider text-[#002fbe]">REPORT</span>
                        </div>

                        {/* Rating Table */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-[#f06418] text-white">
                                <th className="py-2 px-2 text-left text-[9px] sm:text-[10px] font-black uppercase tracking-wider border-r border-orange-600/10 w-[30%] align-middle">Subject</th>
                                <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-r border-orange-600/10 align-middle">Average</th>
                                <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-r border-orange-600/10 align-middle">Satisfactory</th>
                                <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider border-r border-orange-600/10 align-middle">Good</th>
                                <th className="py-2 px-1 text-center text-[8px] sm:text-[9px] font-black uppercase tracking-wider align-middle">Very Good</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {(() => {
                                const ratingsList = Array.isArray(selectedReport.ratings) 
                                  ? selectedReport.ratings 
                                  : JSON.parse(selectedReport.ratings || "[]");

                                return ratingsList.map((item: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors h-7">
                                    <td className="py-1 px-2 text-[9px] sm:text-[10px] font-bold text-slate-700 border-r border-slate-200 bg-slate-50/20 align-middle">{item.subject}</td>
                                    <td className="py-0.5 px-1 text-center border-r border-slate-200 align-middle">
                                      {item.rating === "AVERAGE" && (
                                        <div className="flex items-center justify-center w-full h-full">
                                          <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-0.5 px-1 text-center border-r border-slate-200 align-middle">
                                      {item.rating === "SATISFACTORY" && (
                                        <div className="flex items-center justify-center w-full h-full">
                                          <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-0.5 px-1 text-center border-r border-slate-200 align-middle">
                                      {item.rating === "GOOD" && (
                                        <div className="flex items-center justify-center w-full h-full">
                                          <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-0.5 px-1 text-center align-middle">
                                      {item.rating === "VERY_GOOD" && (
                                        <div className="flex items-center justify-center w-full h-full">
                                          <span style={{ color: '#dc2626', fontSize: '15px', fontWeight: '900', lineHeight: '1' }}>✔</span>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Remarks */}
                        {selectedReport.teacher_comment && (
                          <div className="flex gap-2 items-center bg-[#002fbe] rounded-xl p-2 text-white border border-[#002fbe]/10 shadow-xs relative overflow-hidden">
                            <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-[#f06418] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                              <img src="/studyasan-logo-lady.png" alt="StudyAsan Lady Logo" className="w-6 h-6 object-contain" />
                            </div>
                            <div className="space-y-0.5 z-10 pr-1">
                              <p className="text-white text-[9px] sm:text-[10px] leading-snug font-semibold">
                                {selectedReport.teacher_comment}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DEDICATED PARENTS & STUDENTS FEEDBACK MODAL DIALOG */}
          {feedbackModalReport && (
            <div 
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setFeedbackModalReport(null)}
            >
              <div 
                className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-saBlue/10 text-saBlue rounded-2xl">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Parents & Students Feedback</h3>
                      <p className="text-xs text-slate-400">
                        Share response with teacher for week of {format(new Date(feedbackModalReport.week_start_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => setFeedbackModalReport(null)}>
                    <X className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                  {/* Report Meta Pill */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-600 font-extrabold">{feedbackModalReport.month}</Badge>
                      {feedbackModalReport.subject && (
                        <Badge variant="secondary" className="bg-blue-50 border-blue-200 text-blue-700 font-bold">{feedbackModalReport.subject.name}</Badge>
                      )}
                    </div>
                    <span className="text-slate-500 font-semibold">Teacher: {feedbackModalReport.teacher?.user?.name || "Teacher"}</span>
                  </div>

                  {/* Previous Submitted Feedback */}
                  {feedbackModalReport.parent_feedback && (
                    <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Current Feedback</span>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Submitted
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs font-medium leading-relaxed">
                        "{feedbackModalReport.parent_feedback}"
                      </p>
                    </div>
                  )}

                  {/* Feedback Form */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      {feedbackModalReport.parent_feedback ? "Edit Your Feedback" : "Leave Your Comment"}
                    </label>
                    <textarea
                      rows={4}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Write your feedback regarding student performance, homework completion, reading skills, or questions for the teacher..."
                      className="w-full rounded-2xl border-slate-200 focus:border-saBlue bg-slate-50/50 p-4 text-xs outline-none transition-colors border focus:ring-1 focus:ring-saBlue leading-relaxed"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => setFeedbackModalReport(null)} className="rounded-xl h-10 text-slate-500 text-xs font-semibold">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFeedbackSubmit}
                    disabled={submittingFeedback || !feedbackText.trim()}
                    className="bg-saBlue hover:bg-saBlue/90 text-white font-bold rounded-xl h-10 px-5 flex items-center gap-1.5 text-xs shadow-md shadow-saBlue/20"
                  >
                    {submittingFeedback ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Submit Response
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
