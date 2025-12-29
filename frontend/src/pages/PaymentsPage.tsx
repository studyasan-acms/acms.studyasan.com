import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, DollarSign, Filter, Search } from 'lucide-react';
import { paymentService } from '@/services/api';
import type { EnrollmentPayment, PaginatedResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [payments, setPayments] = useState<EnrollmentPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [isPaid, setIsPaid] = useState<string>('all');
  const [search, setSearch] = useState('');

  // SUCCESS MODAL
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // ERROR MODAL
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  // ----------------------------
  // Fetch Payments
  // ----------------------------
  const fetchPayments = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        page,
        limit,
      };

      if (isPaid !== 'all') {
        params.is_paid = isPaid;
      }

      if (search) {
        params.search = search;
      }

      const response: PaginatedResponse<EnrollmentPayment> = await paymentService.getAll(params);
      setPayments(response.data.data);
      setTotal(response.data.pagination.total);
    } catch (err: any) {
      setErrorMessage('Failed to load payments.');
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, page, limit, isPaid, search]);

  // ----------------------------
  // useEffect
  // ----------------------------
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchPayments();
  }, [isAdmin, navigate, fetchPayments]);

  // ----------------------------
  // Mark Payment as Paid
  // ----------------------------
  const handleMarkAsPaid = async (paymentId: number) => {
    try {
      await paymentService.markAsPaid(paymentId);
      setSuccessMessage('Payment marked as paid successfully!');
      setSuccessOpen(true);
      fetchPayments(); // Refresh the list
    } catch (err: any) {
      setErrorMessage('Failed to mark payment as paid.');
      setErrorOpen(true);
    }
  };

  // ----------------------------
  // Get Status Badge
  // ----------------------------
  const getStatusBadge = (payment: EnrollmentPayment) => {
    if (payment.is_paid) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }

    const dueDate = new Date(payment.due_date);
    const now = new Date();

    if (dueDate < now) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Overdue
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  // ----------------------------
  // Calculate Stats
  // ----------------------------
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidAmount = payments.filter(p => p.is_paid).reduce((sum, payment) => sum + payment.amount, 0);
  const pendingAmount = totalAmount - paidAmount;
  const overdueCount = payments.filter(p => !p.is_paid && new Date(p.due_date) < new Date()).length;

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Manage student enrollment payments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">₹{pendingAmount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by student name or subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={isPaid} onValueChange={setIsPaid}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="true">Paid</SelectItem>
                <SelectItem value="false">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payments ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payments found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Student</th>
                    <th className="text-left py-3 px-4 font-medium">Subject</th>
                    <th className="text-left py-3 px-4 font-medium">Period</th>
                    <th className="text-left py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Due Date</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{payment.enrollment.student.user.name}</div>
                          <div className="text-xs text-gray-500">{payment.enrollment.student.user.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {payment.enrollment.subject.name}
                      </td>
                      <td className="py-3 px-4">
                        {payment.period}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        ₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {new Date(payment.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(payment)}
                      </td>
                      <td className="py-3 px-4">
                        {!payment.is_paid && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(payment.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} payments
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SUCCESS MODAL */}
      <SuccessModal
        open={successOpen}
        title="Success"
        description={successMessage}
        showButtons={true}
        cancelText=""
        okText="OK"
        onConfirm={() => setSuccessOpen(false)}
        onClose={() => setSuccessOpen(false)}
      />

      {/* ERROR MODAL */}
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        showButtons={true}
        cancelText=""
        okText="OK"
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />
    </div>
  );
};

export default PaymentsPage;