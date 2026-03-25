import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, FileText, Calendar, Search, Filter, ArrowLeft, Trophy, TrendingUp, BookOpen } from 'lucide-react';
import { testAttemptService, subjectService } from '@/services/api';
import type { TestAttempt, Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from "@/hooks/usePageTitle";

export default function MyResultsPage() {
  usePageTitle("My Results");
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const formatSubjectFilterLabel = (subject: Subject) => {
    const classPart = subject.class?.name ? ` (${subject.class.name})` : '';
    const boardPart = subject.board?.name ? ` [${subject.board.name}]` : '';
    return `${subject.name}${classPart}${boardPart}`;
  };

  useEffect(() => {
    fetchSubjects();
    fetchAttempts();
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      const params: any = {};
      if (user?.role === 'STUDENT' && user?.id) {
        params.user_id = user.id;
        params.role = user.role;
      }
      const response = await subjectService.getAll(params);
      setSubjects(response.data.data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedSubject && selectedSubject !== "ALL") params.subject_id = parseInt(selectedSubject);
      const response = await testAttemptService.getMyAttempts(params);
      setAttempts(response.data);
    } catch (error) {
      console.error('Error fetching test attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (attempt: TestAttempt) => {
    return attempt.score ? ((attempt.score / attempt.total_marks) * 100).toFixed(1) : '0.0';
  };

  const filteredAttempts = attempts.filter(a =>
    a.test?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalTests = attempts.length;
  const passed = attempts.filter(a => a.is_graded && a.is_passed).length;
  const avgScore = attempts.length > 0
    ? (attempts.filter(a => a.is_graded).reduce((sum, a) => sum + parseFloat(getPercentage(a)), 0) / Math.max(attempts.filter(a => a.is_graded).length, 1)).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tests")} className="text-gray-500 hover:text-saBlue">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">My Test Results</h1>
            <p className="text-gray-500 text-sm mt-0.5">Track your performance across all tests</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate("/tests")} className="border-saBlue text-saBlue hover:bg-blue-50">
          <FileText className="w-4 h-4 mr-2" /> Browse Tests
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><FileText className="h-5 w-5 text-saBlue" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Attempts</p>
            <p className="text-xl font-bold text-gray-800">{totalTests}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><Trophy className="h-5 w-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Tests Passed</p>
            <p className="text-xl font-bold text-gray-800">{passed} / {totalTests}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg"><TrendingUp className="h-5 w-5 text-orange-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Average Score</p>
            <p className="text-xl font-bold text-gray-800">{avgScore}%</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full"
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="h-10 w-full">
              <Filter className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by Subject" />
            </SelectTrigger>
            <SelectContent>
              <SearchablePaginatedSelect
                searchPlaceholder="Search subject..."
                options={[
                  { value: 'ALL', label: 'All Subjects' },
                  ...subjects.map((subject) => ({
                    value: subject.id.toString(),
                    label: formatSubjectFilterLabel(subject),
                    searchText: `${subject.name} ${subject.class?.name || ''} ${subject.board?.name || ''}`,
                  })),
                ]}
              />
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading your results...</p>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No test results found</h3>
          <p className="text-gray-500 mt-1 max-w-sm text-center">
            {searchQuery ? "Try adjusting your search." : "You haven't taken any tests yet."}
          </p>
          <Button variant="link" className="text-saBlue mt-2" onClick={() => navigate("/tests")}>
            Browse available tests
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="font-semibold text-gray-700">Test Name</TableHead>
                  <TableHead className="font-semibold text-gray-700">Subject</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700">Score</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700">Percentage</TableHead>
                  <TableHead className="font-semibold text-gray-700 hidden md:table-cell">Submitted</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.map((attempt) => {
                  const pct = parseFloat(getPercentage(attempt));
                  return (
                    <TableRow
                      key={attempt.id}
                      className="cursor-pointer hover:bg-blue-50/30 transition-colors"
                      onClick={() => navigate(`/test-attempts/${attempt.id}/results`)}
                    >
                      <TableCell className="font-medium">
                        <span className="text-base font-semibold text-gray-900">{attempt.test?.title}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal bg-gray-100 text-gray-700">
                          {attempt.test?.subject?.name || 'General'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attempt.is_practice ? (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                            <BookOpen className="w-3 h-3 mr-1" /> Practice
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                            Real
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!attempt.is_graded ? (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-none">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </Badge>
                        ) : attempt.is_passed ? (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white border-none">
                            <CheckCircle className="w-3 h-3 mr-1" /> Passed
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500 hover:bg-red-600 text-white border-none">
                            <XCircle className="w-3 h-3 mr-1" /> Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {attempt.is_graded ? (
                          <span className="font-semibold text-gray-800">{attempt.score || 0} / {attempt.total_marks}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {attempt.is_graded ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${attempt.is_passed ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{pct}%</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {attempt.submitted_at
                          ? new Date(attempt.submitted_at).toLocaleDateString()
                          : 'In Progress'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/test-attempts/${attempt.id}/results`); }}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
