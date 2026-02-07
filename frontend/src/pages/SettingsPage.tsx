import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Trash2, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { apiService, deletionService } from '@/services/api';
import NotificationSettings from '@/components/NotificationSettings';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_url?: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  delete_requested: boolean;
  delete_verified: boolean;
  delete_requested_at?: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/profile');
      const userData = response.data.data;
      setProfileData(userData);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const requestAccountDeletion = async () => {
    if (!window.confirm(
      'Are you sure you want to request account deletion? This will send a request to admins for approval.'
    )) {
      return;
    }

    try {
      setUpdating(true);
      await deletionService.requestDeletion();
      await loadProfile();
      toast.success('Account deletion request submitted successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request account deletion');
    } finally {
      setUpdating(false);
    }
  };

  const cancelAccountDeletion = async () => {
    if (!window.confirm('Are you sure you want to cancel the account deletion request?')) {
      return;
    }

    try {
      setUpdating(true);
      await deletionService.cancelDeletion();
      await loadProfile();
      toast.success('Account deletion request cancelled successfully.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel account deletion');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-saBlue"></div>
      </div>
    );
  }

  if (!profileData) {
    return <div>Error loading profile data</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            {profileData?.role !== 'ADMIN' && (
              <TabsTrigger value="danger" className="text-red-600 hover:text-red-700">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delete Account
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          {profileData?.role !== 'ADMIN' && (
            <TabsContent value="danger">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profileData?.delete_requested ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-yellow-800">
                            Account Deletion Requested
                          </h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            You have requested to delete your account on{' '}
                            {profileData.delete_requested_at && 
                              new Date(profileData.delete_requested_at).toLocaleDateString()
                            }.
                            {profileData.delete_verified ? (
                              <span className="block mt-1 font-medium">
                                ✅ This request has been approved by an admin. Your account will be deleted permanently.
                              </span>
                            ) : (
                              <span className="block mt-1">
                                The request is pending admin approval.
                              </span>
                            )}
                          </p>
                          {!profileData.delete_verified && (
                            <Button
                              onClick={cancelAccountDeletion}
                              disabled={updating}
                              variant="outline"
                              className="mt-3 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                            >
                              Cancel Deletion Request
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Trash2 className="h-5 w-5 text-red-600 mt-1" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-red-800">
                            Delete Account
                          </h4>
                          <p className="text-sm text-red-700 mt-1">
                            Once you request account deletion, an admin will need to approve it.
                            This action is irreversible and will permanently delete all your data.
                          </p>
                          <Button
                            onClick={requestAccountDeletion}
                            disabled={updating}
                            variant="destructive"
                            className="mt-3"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {updating ? 'Processing...' : 'Request Account Deletion'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
