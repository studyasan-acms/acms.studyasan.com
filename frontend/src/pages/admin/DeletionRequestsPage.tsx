import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Calendar,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { deletionService } from '@/services/api';

interface DeletionRequest {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'STUDENT' | 'TEACHER';
  delete_requested: boolean;
  delete_verified: boolean;
  delete_requested_at: string;
  created_at: string;
}

export default function DeletionRequestsPage() {
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const loadDeletionRequests = async () => {
    try {
      setLoading(true);
      const response = await deletionService.getDeletionRequests();
      setDeletionRequests(response.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load deletion requests');
    } finally {
      setLoading(false);
    }
  };

  const verifyDeletion = async (userId: number) => {
    if (!confirm('Are you sure you want to approve this deletion request? This will allow the account to be permanently deleted.')) {
      return;
    }

    try {
      setProcessing(userId);
      await deletionService.verifyDeletion(userId);
      await loadDeletionRequests();
      toast.success('Deletion request approved successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve deletion request');
    } finally {
      setProcessing(null);
    }
  };

  const deleteUserAccount = async (userId: number) => {
    if (!confirm('Are you sure you want to permanently delete this user account? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessing(userId);
      await deletionService.deleteUserAccount(userId);
      await loadDeletionRequests();
      toast.success('User account deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete user account');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    loadDeletionRequests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-saBlue"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Account Deletion Requests</h1>
        <p className="text-gray-600 mt-2">
          Manage account deletion requests from students and teachers
        </p>
      </div>

      {deletionRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Deletion Requests
            </h3>
            <p className="text-gray-600">
              There are currently no pending account deletion requests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletionRequests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-yellow-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {request.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{request.name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {request.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {request.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={request.role === 'STUDENT' ? 'default' : 'secondary'}>
                    {request.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Account created: {new Date(request.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Deletion requested: {new Date(request.delete_requested_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={request.delete_verified ? 'default' : 'secondary'}
                      className={request.delete_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {request.delete_verified ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    {!request.delete_verified ? (
                      <Button
                        onClick={() => verifyDeletion(request.id)}
                        disabled={processing === request.id}
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === request.id ? 'Approving...' : 'Approve'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => deleteUserAccount(request.id)}
                        disabled={processing === request.id}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {processing === request.id ? 'Deleting...' : 'Delete Account'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}