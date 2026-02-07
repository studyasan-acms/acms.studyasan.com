import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// Initialize Firebase Admin SDK
// You need to download your service account key from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
let firebaseAdmin: admin.app.App | null = null;

try {
  // Check if service account credentials are provided
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccount) {
    const serviceAccountJSON: ServiceAccount = JSON.parse(serviceAccount);
    
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJSON),
    });
    
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase service account not configured. Push notifications will not work.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

export { firebaseAdmin };

/**
 * Check if Firebase Admin is initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return firebaseAdmin !== null;
};

/**
 * Send push notification to a single device
 */
export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
): Promise<boolean> => {
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT in your .env file.');
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: fcmToken,
      webpush: {
        notification: {
          icon: '/studyasan-logo.png',
          badge: '/pwa-192x192.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: data?.url || '/',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:', response);
    return true;
  } catch (error: any) {
    console.error('Error sending notification:', error);
    
    // If token is invalid or expired, you might want to remove it from the database
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.log('Invalid FCM token, should be removed from database');
    }
    
    return false;
  }
};

/**
 * Send push notification to multiple devices
 */
export const sendMulticastNotification = async (
  fcmTokens: string[],
  title: string,
  body: string,
  data?: { [key: string]: string }
): Promise<{ successCount: number; failureCount: number }> => {
  if (!firebaseAdmin) {
    console.error('Firebase Admin not initialized');
    return { successCount: 0, failureCount: fcmTokens.length };
  }

  if (fcmTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: fcmTokens,
      webpush: {
        notification: {
          icon: '/studyasan-logo.png',
          badge: '/pwa-192x192.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: data?.url || '/',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications`);
    console.log(`Failed to send ${response.failureCount} notifications`);
    
    // Log failed tokens for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to token ${fcmTokens[idx]}:`, resp.error);
        }
      });
    }
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    return { successCount: 0, failureCount: fcmTokens.length };
  }
};

/**
 * Send notification to a topic
 */
export const sendTopicNotification = async (
  topic: string,
  title: string,
  body: string,
  data?: { [key: string]: string }
): Promise<boolean> => {
  if (!firebaseAdmin) {
    console.error('Firebase Admin not initialized');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      topic,
      webpush: {
        notification: {
          icon: '/studyasan-logo.png',
          badge: '/pwa-192x192.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: data?.url || '/',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent topic notification:', response);
    return true;
  } catch (error) {
    console.error('Error sending topic notification:', error);
    return false;
  }
};

/**
 * Subscribe tokens to a topic
 */
export const subscribeToTopic = async (
  fcmTokens: string[],
  topic: string
): Promise<boolean> => {
  if (!firebaseAdmin) {
    console.error('Firebase Admin not initialized');
    return false;
  }

  try {
    const response = await admin.messaging().subscribeToTopic(fcmTokens, topic);
    console.log(`Successfully subscribed ${response.successCount} tokens to topic ${topic}`);
    return true;
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    return false;
  }
};

/**
 * Unsubscribe tokens from a topic
 */
export const unsubscribeFromTopic = async (
  fcmTokens: string[],
  topic: string
): Promise<boolean> => {
  if (!firebaseAdmin) {
    console.error('Firebase Admin not initialized');
    return false;
  }

  try {
    const response = await admin.messaging().unsubscribeFromTopic(fcmTokens, topic);
    console.log(`Successfully unsubscribed ${response.successCount} tokens from topic ${topic}`);
    return true;
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    return false;
  }
};
