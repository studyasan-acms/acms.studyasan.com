import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { api } from '@/services/api';

// ─── Web-only Firebase imports (tree-shaken on native) ───────────────────────
// We import lazily inside the web branch to avoid crashing on native where
// service workers and the Notification API don't exist.

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
  permission: NotificationPermission | 'native';
  fcmToken: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  sendTokenToServer: (token: string) => Promise<void>;
}

// ─── Shared helper ────────────────────────────────────────────────────────────

const sendTokenToServerImpl = async (token: string): Promise<void> => {
  try {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      console.log('User not authenticated, skipping token sync');
      return;
    }
    await api.post('/notifications/subscribe', { fcm_token: token });
    console.log('FCM token sent to server successfully');
  } catch (error) {
    console.error('Error sending token to server:', error);
  }
};

// ─── Native (Capacitor Android / iOS) hook ────────────────────────────────────

const useNativeNotifications = (): UseNotificationsReturn => {
  const [permission, setPermission] = useState<'native'>('native');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendTokenToServer = useCallback(sendTokenToServerImpl, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        toast.error('Notification permission denied. Please enable it in your device settings.');
        return;
      }

      await PushNotifications.register();
      toast.success('Notifications enabled successfully!');
    } catch (error) {
      console.error('Error requesting native notification permission:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let registered = false;

    const setup = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Token received — register with server
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Native FCM token:', token.value);
          setFcmToken(token.value);
          localStorage.setItem('fcm_token', token.value);
          const authToken = localStorage.getItem('token');
          if (authToken) {
            await sendTokenToServer(token.value);
          }
        });

        // Registration error
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('Push notification registration error:', err.error);
        });

        // Foreground notification — show toast
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Foreground push notification:', notification);
          toast(notification.title || 'New Notification', {
            description: notification.body,
            duration: 5000,
          });
        });

        // Notification tapped (background / quit state)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Push notification action performed:', action);
          // Navigate or handle deep link here if needed
        });

        registered = true;

        // Auto-register if we already have a stored token or permission was previously granted
        const storedToken = localStorage.getItem('fcm_token');
        if (storedToken) {
          setFcmToken(storedToken);
          const authToken = localStorage.getItem('token');
          if (authToken) {
            sendTokenToServer(storedToken).catch(console.error);
          }
        }

        // Check current permission and auto-register
        const permResult = await PushNotifications.checkPermissions();
        if (permResult.receive === 'granted') {
          await PushNotifications.register();
        } else if (permResult.receive === 'prompt') {
          // Auto-request on first launch
          const granted = await PushNotifications.requestPermissions();
          if (granted.receive === 'granted') {
            await PushNotifications.register();
          }
        }
      } catch (error) {
        console.error('Error setting up native push notifications:', error);
      }
    };

    setup();

    return () => {
      if (registered) {
        import('@capacitor/push-notifications').then(({ PushNotifications }) => {
          PushNotifications.removeAllListeners().catch(console.error);
        });
      }
    };
  }, [sendTokenToServer]);

  return {
    isSupported: true,
    permission,
    fcmToken,
    isLoading,
    requestPermission,
    sendTokenToServer,
  };
};

// ─── Web (browser / PWA) hook ─────────────────────────────────────────────────

const useWebNotifications = (): UseNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendTokenToServer = useCallback(sendTokenToServerImpl, []);

  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    try {
      const { requestNotificationPermission, getNotificationPermissionStatus } = await import('@/lib/firebase');
      const token = await requestNotificationPermission();

      if (token) {
        setFcmToken(token);
        setPermission('granted');
        localStorage.setItem('fcm_token', token);
        await sendTokenToServer(token);
        toast.success('Notifications enabled successfully!');
      } else {
        const { getNotificationPermissionStatus: getStatus } = await import('@/lib/firebase');
        const status = getStatus();
        setPermission(status);
        if (status === 'denied') {
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
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (!supported) return;

    setPermission(Notification.permission);

    // Restore cached token
    const existingToken = localStorage.getItem('fcm_token');
    if (existingToken) {
      setFcmToken(existingToken);
      const authToken = localStorage.getItem('token');
      if (authToken) {
        sendTokenToServer(existingToken).catch(console.error);
      }
    }

    // Auto-request if permission not yet decided and no token
    const autoRequest = async () => {
      if (Notification.permission === 'default' && !localStorage.getItem('fcm_token')) {
        console.log('Auto-requesting notification permission...');
        try {
          const { requestNotificationPermission } = await import('@/lib/firebase');
          const token = await requestNotificationPermission();
          if (token) {
            setFcmToken(token);
            setPermission('granted');
            localStorage.setItem('fcm_token', token);
            const authToken = localStorage.getItem('token');
            if (authToken) sendTokenToServer(token);
            console.log('✓ Push notifications enabled automatically');
          }
        } catch (error) {
          console.error('Error auto-requesting notification permission:', error);
        }
      }
    };

    autoRequest();

    // Foreground message listener
    let unsubscribe: (() => void) | null = null;
    import('@/lib/firebase').then(({ setupMessageListener }) => {
      unsubscribe = setupMessageListener((payload: NotificationPayload) => {
        console.log('Foreground notification received:', payload);
        toast(payload.notification?.title || 'New Notification', {
          description: payload.notification?.body,
          duration: 5000,
        });
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'StudyAsan', {
            body: payload.notification?.body,
            icon: '/studyasan-logo.png',
            badge: '/pwa-192x192.png',
            data: payload.data,
          });
        }
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [sendTokenToServer]);

  return {
    isSupported,
    permission: permission as NotificationPermission | 'native',
    fcmToken,
    isLoading,
    requestPermission,
    sendTokenToServer,
  };
};

// ─── Unified export — auto-detects platform ───────────────────────────────────

export const useNotifications = (): UseNotificationsReturn => {
  if (Capacitor.isNativePlatform()) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useNativeNotifications();
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useWebNotifications();
};
