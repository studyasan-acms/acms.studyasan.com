import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import axios from 'axios';

export default function NotificationSettings() {
  const { isSupported, permission, fcmToken, isLoading, requestPermission } =
    useNotifications();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const sendTestNotification = async () => {
    setIsSendingTest(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
      
      const response = await axios.post(
        `${apiUrl}/notifications/test`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data?.success !== false) {
        toast.success('Test notification sent! Check your browser for the notification.');
      } else {
        toast.error(response.data?.message || 'Failed to send test notification');
      }
    } catch (error: any) {
      console.error('Failed to send test notification:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          'Failed to send test notification';
      
      // Show user-friendly message
      if (errorMessage.includes('not configured')) {
        toast.error('Push notifications are not configured on the server. Please contact the administrator.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in your browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive real-time notifications about your classes, tests, and updates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              Status:{' '}
              <span
                className={
                  permission === 'granted'
                    ? 'text-green-600'
                    : permission === 'denied'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }
              >
                {permission === 'granted'
                  ? 'Enabled'
                  : permission === 'denied'
                  ? 'Blocked'
                  : 'Not enabled'}
              </span>
            </p>
            {fcmToken && (
              <p className="text-xs text-gray-500 mt-1">
                Device registered for notifications
              </p>
            )}
          </div>

          {permission !== 'granted' && (
            <Button
              onClick={requestPermission}
              disabled={isLoading || permission === 'denied'}
              className="bg-gradient-to-r from-[#0076CE] to-[#0055a3] hover:from-[#0066b8] hover:to-[#004488]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Enable Notifications
                </>
              )}
            </Button>
          )}

          {permission === 'granted' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-green-600">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <Button
                onClick={sendTestNotification}
                disabled={isSendingTest}
                variant="outline"
                size="sm"
                className="ml-2"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Test
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {permission === 'granted' && fcmToken && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>✅ Notifications are active!</strong>
            </p>
            <p className="text-xs text-green-700 mt-1">
              You'll receive notifications for classes, tests, and important updates. 
              Click "Send Test" to verify notifications are working.
            </p>
          </div>
        )}

        {permission === 'denied' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Notifications are blocked.</strong> To enable notifications:
            </p>
            <ol className="text-xs text-red-700 mt-2 space-y-1 ml-4 list-decimal">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Notifications" in the permissions list</li>
              <li>Change the setting to "Allow"</li>
              <li>Refresh this page and try again</li>
            </ol>
          </div>
        )}

        {permission === 'default' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Stay updated!</strong> Enable push notifications to receive:
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
              <li>Class reminders and schedule updates</li>
              <li>Homework and assignment notifications</li>
              <li>Test result announcements</li>
              <li>Important messages from teachers</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
