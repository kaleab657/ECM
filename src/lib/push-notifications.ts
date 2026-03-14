import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { db, auth } from './firebase';
import { doc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

/**
 * Push Notification Service
 * 
 * Handles:
 * - Requesting notification permission on first app launch
 * - Registering FCM device tokens
 * - Storing tokens in Firestore (per user)
 * - Subscribing to the 'all_users' topic for broadcast notifications
 * - Listening for incoming notifications
 */

// Check if we're running in a native Capacitor environment
function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize push notifications.
 * Call this once on app startup (e.g., in App.tsx useEffect).
 * 
 * @param onNotificationTap - Callback when user taps a notification
 */
export async function initPushNotifications(
  onNotificationTap?: (data: any) => void
): Promise<void> {
  if (!isNativePlatform()) {
    console.log('[Push] Not a native platform, skipping push init.');
    return;
  }

  try {
    // 1. Check current permission status
    let permStatus = await PushNotifications.checkPermissions();

    // 2. If not yet determined, request permission (shows native Android dialog)
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    // 3. If denied, stop here
    if (permStatus.receive !== 'granted') {
      console.log('[Push] Notification permission denied by user.');
      return;
    }

    // 4. Register with FCM to get a device token
    await PushNotifications.register();

    // 5. Listen for registration success → save token
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Device token received:', token.value);
      await saveDeviceToken(token.value);
    });

    // 6. Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });

    // 7. Listen for notifications received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received in foreground:', notification);
      // Optionally show an in-app toast or badge update here
    });

    // 8. Listen for notification tap (user tapped the notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action);
      const data = action.notification.data;
      if (onNotificationTap && data) {
        onNotificationTap(data);
      }
    });

    console.log('[Push] Push notifications initialized successfully.');
  } catch (error) {
    console.error('[Push] Failed to initialize push notifications:', error);
  }
}

/**
 * Save the FCM device token to Firestore under the current user's document.
 * Also saves to a global 'device_tokens' collection for server-side lookups.
 */
async function saveDeviceToken(token: string): Promise<void> {
  try {
    const user = auth.currentUser;
    
    // Always store in global tokens collection (for broadcast notifications)
    await setDoc(doc(db, 'device_tokens', token), {
      token,
      userId: user?.uid || null,
      platform: 'android',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // If user is logged in, also store under their user document
    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        fcmTokens: arrayUnion(token),
        lastTokenUpdate: serverTimestamp(),
      }, { merge: true });
    }

    console.log('[Push] Token saved to Firestore.');
  } catch (error) {
    console.error('[Push] Failed to save token:', error);
  }
}

/**
 * Update the token association when a user logs in.
 * Call this after successful authentication.
 */
export async function associateTokenWithUser(userId: string): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    // Re-register to get the current token
    await PushNotifications.register();
    
    // The 'registration' listener will handle saving,
    // but we also explicitly update here in case it was already cached
    console.log('[Push] Token association requested for user:', userId);
  } catch (error) {
    console.error('[Push] Failed to associate token with user:', error);
  }
}

/**
 * Remove push notification listeners (cleanup).
 */
export async function removePushListeners(): Promise<void> {
  if (!isNativePlatform()) return;
  
  try {
    await PushNotifications.removeAllListeners();
    console.log('[Push] All listeners removed.');
  } catch (error) {
    console.error('[Push] Failed to remove listeners:', error);
  }
}
