import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  onMessageListener,
  isNotificationSupported,
  getNotificationPermissionStatus,
} from '@/lib/firebase';
import { toast } from 'sonner';

interface NotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: {
    [key: string]: string;
  };
}

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  fcmToken: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  sendTokenToServer: (token: string) => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendTokenToServer = useCallback(async (token: string) => {
    try {
      // Get auth token
      const authToken = localStorage.getItem('token');
      
      if (!authToken) {
        console.log('User not authenticated, skipping token sync');
        return;
      }

      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

      // Send to your backend API
      const response = await fetch(`${apiUrl}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fcm_token: token }),
      });

      if (!response.ok) {
        throw new Error('Failed to send token to server');
      }

      console.log('FCM token sent to server successfully');
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        setPermission('granted');
        
        // Save token to localStorage
        localStorage.setItem('fcm_token', token);
        
        // Send token to your server
        await sendTokenToServer(token);
        
        toast.success('Notifications enabled successfully!');
      } else {
        setPermission(getNotificationPermissionStatus());
        
        if (getNotificationPermissionStatus() === 'denied') {
          toast.error('Notification permission denied. Please enable it in your browser settings.');
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, [sendTokenToServer]);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermissionStatus());

    // Check for existing token
    const existingToken = localStorage.getItem('fcm_token');
    if (existingToken) {
      setFcmToken(existingToken);
    }

    // Auto-request permission if supported and not yet decided
    const autoRequestPermission = async () => {
      const currentPermission = getNotificationPermissionStatus();
      const hasToken = localStorage.getItem('fcm_token');
      
      // Only auto-request if permission is default (not granted or denied yet) and no token exists
      if (isNotificationSupported() && currentPermission === 'default' && !hasToken) {
        console.log('Auto-requesting notification permission...');
        try {
          const token = await requestNotificationPermission();
          
          if (token) {
            setFcmToken(token);
            setPermission('granted');
            localStorage.setItem('fcm_token', token);
            
            // Send token to server
            const authToken = localStorage.getItem('token');
            if (authToken) {
              sendTokenToServer(token);
            }
            
            toast.success('Notifications enabled successfully!');
          }
        } catch (error) {
          console.error('Error auto-requesting notification permission:', error);
        }
      }
    };
    
    autoRequestPermission();

    // Listen for foreground messages
    if (isNotificationSupported()) {
      onMessageListener()
        .then((payload: NotificationPayload) => {
          console.log('Foreground notification received:', payload);
          
          // Show toast notification
          toast(payload.notification?.title || 'New Notification', {
            description: payload.notification?.body,
            duration: 5000,
          });

          // You can also show a native notification
          if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'StudyAsan', {
              body: payload.notification?.body,
              icon: '/studyasan-logo.png',
              badge: '/pwa-192x192.png',
              data: payload.data,
            });
          }
        })
        .catch((err) => {
          console.error('Failed to listen for messages:', err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return {
    isSupported,
    permission,
    fcmToken,
    isLoading,
    requestPermission,
    sendTokenToServer,
  };
};
