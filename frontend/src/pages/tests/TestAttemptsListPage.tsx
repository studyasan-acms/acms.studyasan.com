import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Search, Clock, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { testService, testAttemptService } from '@/services/api';
import type { Test, TestAttempt } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePageTitle } from "@/hooks/usePageTitle";

export default function TestAttemptsListPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  usePageTitle(test ? `Test Attempts: ${test.title}` : "Test Attempts");
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<'real' | 'practice' | 'all'>('real');

  useEffect(() => {
    if (testId) {
      fetchTest();
      fetchAttempts();
    }
  }, [testId]);

  const fetchTest = async () => {
    try {
      const response = await testService.getById(parseInt(testId!));
      setTest(response.data);
    } catch (error) {
      console.error('Error fetching test:', error);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await testAttemptService.getTestAttempts(parseInt(testId!));
      setAttempts(response.data);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttempts = attempts.filter(a => {
    const matchesSearch = a.student?.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.student?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' ? true : typeFilter === 'practice' ? a.is_practice : !a.is_practice;
    return matchesSearch && matchesType;
  });

  const realAttempts = attempts.filter(a => !a.is_practice);
  const practiceAttempts = attempts.filter(a => a.is_practice);
  const statsSource = typeFilter === 'practice' ? practiceAttempts : typeFilter === 'all' ? attempts : realAttempts;
  const totalAttempts = statsSource.length;
  const graded = statsSource.filter(a => a.is_graded).length;
  const pending = statsSource.filter(a => a.submitted_at && !a.is_graded).length;

  return (
    <div className="space-y-6 p-1 sm:p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/tests/${testId}`)} className="text-gray-500 hover:text-saBlue">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Test Attempts</h1>
            <p className="text-gray-500 text-sm mt-0.5">{test?.title || 'Loading...'}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg"><User className="h-5 w-5 text-saBlue" /></div>
          <div>
            <p className="text-xs text-gray-500">Total Shown</p>
            <p className="text-xl font-bold text-gray-800">{totalAttempts}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg"><BookOpen className="h-5 w-5 text-purple-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Practice Attempts</p>
            <p className="text-xl font-bold text-gray-800">{practiceAttempts.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Graded</p>
            <p className="text-xl font-bold text-gray-800">{graded}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
          <div className="p-2 bg-yellow-50 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Pending Grading</p>
            <p className="text-xl font-bold text-gray-800">{pending}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by student name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'real' | 'practice' | 'all')}>
            <SelectTrigger className="h-10 w-full">
              <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real">Real Attempts</SelectItem>
              <SelectItem value="practice">Practice Attempts</SelectItem>
              <SelectItem value="all">All Attempts</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Attempts Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-12 h-12 border-4 border-saBlue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Loading attempts...</p>
        </div>
      ) : filteredAttempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No attempts found</h3>
          <p className="text-gray-500 mt-1 max-w-sm text-center">
            {searchQuery ? "Try adjusting your search." : "No students have attempted this test yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="font-semibold text-gray-700">Student</TableHead>
                  <TableHead className="font-semibold text-gray-700 hidden md:table-cell">Email</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700">Score</TableHead>
                  <TableHead className="font-semibold text-gray-700 hidden md:table-cell">Submitted</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttempts.map((attempt) => (
                  <TableRow key={attempt.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-saBlue/10 flex items-center justify-center">
                          <span className="text-sm font-bold text-saBlue">
                            {attempt.student?.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{attempt.student?.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm">
                      {attempt.student?.user.email}
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
                      {attempt.is_graded ? (
                        <Badge className={`${attempt.is_passed ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white border-none`}>
                          {attempt.is_passed ? 'Passed' : 'Failed'}
                        </Badge>
                      ) : attempt.submitted_at ? (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white border-none">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">In Progress</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {attempt.is_graded ? (
                        <span className="font-semibold text-gray-800">{attempt.score} / {test?.total_marks ?? attempt.total_marks}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                      {attempt.submitted_at
                        ? new Date(attempt.submitted_at).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={attempt.is_graded ? "outline" : "default"}
                        className={!attempt.is_graded && attempt.submitted_at ? "bg-saBlue hover:bg-saBlueDarkHover text-white" : ""}
                        onClick={() => navigate(`/test-attempts/${attempt.id}/grade`)}
                        disabled={!attempt.submitted_at}
                      >
                        {attempt.is_graded ? 'View' : 'Grade'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
