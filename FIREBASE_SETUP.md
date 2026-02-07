# Firebase Push Notifications Setup Guide

## 🔥 Firebase Browser Push Notifications Implementation

This guide will help you set up browser push notifications using Firebase Cloud Messaging (FCM) in the StudyAsan application.

---

## 📋 Prerequisites

1. A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
2. Node.js and npm installed
3. A web browser that supports service workers (Chrome, Firefox, Edge, Safari)

---

## 🚀 Frontend Setup

### Step 1: Install Dependencies

✅ Already installed:
- `firebase` - Firebase SDK for web browsers

### Step 2: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click the gear icon ⚙️ > **Project settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app, click **Add app** and select **Web** (</>)
6. Copy the Firebase configuration object

### Step 3: Get VAPID Key

1. In Firebase Console, go to **Project settings**
2. Navigate to the **Cloud Messaging** tab
3. Scroll to **Web Push certificates**
4. If you don't have one, click **Generate key pair**
5. Copy the **Key pair** value (this is your VAPID key)

### Step 4: Configure Environment Variables

Create or update `frontend/.env` file:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Firebase Cloud Messaging VAPID Key
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here

# API URL
VITE_API_URL=http://localhost:3000/api
```

### Step 5: Update Service Worker

Update `frontend/public/firebase-messaging-sw.js` with your Firebase config:

```javascript
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
});
```

---

## 🔧 Backend Setup

### Step 1: Install Dependencies

✅ Already installed:
- `firebase-admin` - Firebase Admin SDK for Node.js

### Step 2: Get Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click the gear icon ⚙️ > **Project settings**
3. Navigate to **Service accounts** tab
4. Click **Generate new private key**
5. Download the JSON file
6. **Important:** Keep this file secure! Never commit it to version control

### Step 3: Configure Environment Variables

Update `backend/.env` file:

```env
# Firebase Admin SDK
# Stringify the entire service account JSON and paste it here
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**To stringify the JSON:**
- Open the downloaded service account JSON file
- Copy all content
- Remove all line breaks to make it a single line
- Wrap it in single quotes

### Step 4: Run Database Migration

```bash
cd backend
npx prisma migrate dev --name add_fcm_token_field
```

This adds the `fcm_token` field to the User model.

---

## 📱 Usage Guide

### For Users

1. **Enable Notifications:**
   - Go to Profile or Settings page
   - Find the "Push Notifications" section
   - Click "Enable Notifications"
   - Allow notifications when prompted by the browser

2. **Test Notifications:**
   - After enabling, click "Send Test Notification"
   - You should receive a test notification

### For Developers

#### Request Notification Permission

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { requestPermission, permission, isSupported } = useNotifications();

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  return (
    <button onClick={handleEnableNotifications}>
      Enable Notifications
    </button>
  );
}
```

#### Send Notification from Backend

```typescript
import { sendPushNotification } from './services/firebase.service.js';

// Send to single user
await sendPushNotification(
  userFcmToken,
  'New Message',
  'You have a new message from John',
  { url: '/messages' }
);

// Send to multiple users
import { sendMulticastNotification } from './services/firebase.service.js';

await sendMulticastNotification(
  [token1, token2, token3],
  'Class Update',
  'Your class has been rescheduled',
  { url: '/dashboard/schedule' }
);
```

---

## 🎯 API Endpoints

### Subscribe to Notifications
```
POST /api/notifications/subscribe
Headers: Authorization: Bearer <token>
Body: { "fcm_token": "<fcm_token>" }
```

### Unsubscribe from Notifications
```
POST /api/notifications/unsubscribe
Headers: Authorization: Bearer <token>
```

### Send Test Notification
```
POST /api/notifications/test
Headers: Authorization: Bearer <token>
```

### Send to Specific Users (Admin/Teacher)
```
POST /api/notifications/send-to-users
Headers: Authorization: Bearer <token>
Body: {
  "user_ids": [1, 2, 3],
  "title": "Class Alert",
  "body": "Your class starts in 10 minutes",
  "url": "/dashboard/classes"
}
```

### Send to Role (Admin Only)
```
POST /api/notifications/send-to-role
Headers: Authorization: Bearer <token>
Body: {
  "role": "STUDENT",
  "title": "Important Update",
  "body": "Check out the new features",
  "url": "/dashboard"
}
```

---

## 🔍 Testing

1. **Test in Browser:**
   - Open your app in a supported browser
   - Enable notifications
   - Use the "Send Test Notification" button
   - Check browser's notification tray

2. **Test from Backend:**
   ```bash
   curl -X POST http://localhost:3000/api/notifications/test \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## 🐛 Troubleshooting

### Notifications not showing?

1. **Check browser permissions:**
   - Click the lock icon in address bar
   - Ensure notifications are allowed

2. **Check service worker:**
   - Open DevTools > Application > Service Workers
   - Ensure `firebase-messaging-sw.js` is registered and active

3. **Check console for errors:**
   - Open DevTools > Console
   - Look for Firebase or notification-related errors

4. **Verify environment variables:**
   - Ensure all Firebase config values are correct
   - Check that VAPID key matches in both frontend and backend

### Service worker issues?

1. **Unregister old service workers:**
   - DevTools > Application > Service Workers
   - Click "Unregister" on any old workers
   - Refresh the page

2. **Clear cache:**
   - DevTools > Application > Storage
   - Click "Clear site data"

---

## 📚 Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://developers.google.com/web/fundamentals/push-notifications)
- [Service Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## ✅ Implementation Checklist

Frontend:
- [x] Install Firebase SDK
- [x] Create Firebase configuration
- [x] Create service worker for FCM
- [x] Create notification hooks and components
- [x] Update environment variables
- [x] Register service worker in main.tsx

Backend:
- [x] Install Firebase Admin SDK
- [x] Create Firebase service
- [x] Create notification controller
- [x] Add API routes
- [x] Update User model with fcm_token field
- [x] Run database migration
- [x] Update environment variables

---

## 🎉 You're All Set!

Your application now supports browser push notifications! Users can enable notifications and receive real-time updates about classes, tests, and important announcements.
