import { Platform } from 'react-native';
import { api } from './api';
import Constants from 'expo-constants';

let Notifications: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    // Set up the default background notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as any),
    });
  } catch (err) {
    console.warn('[Notifications] Failed to load expo-notifications:', err);
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Push notifications are not supported on web platforms');
    return null;
  }

  if (isExpoGo) {
    console.log('[Notifications] Remote push notifications are disabled in Expo Go (SDK 53+ restriction). Use a custom development build to enable.');
    return null;
  }

  if (!Notifications) {
    return null;
  }

  try {
    // 1. Android Specific Channel Setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
      });
    }

    // 2. Request / Verify Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission to send push notifications was denied');
      return null;
    }

    // 3. Retrieve Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    console.log('[Notifications] Generated Expo Push Token:', token);

    // 4. Register Push Token with the Backend API
    try {
      await api.post('/notifications/register', {
        token: token,
        platform: Platform.OS,
      });
      console.log('[Notifications] Push token successfully registered on server');
    } catch (err: any) {
      console.warn('[Notifications] Failed to upload push token to backend:', err.message);
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Error during push notification registration:', error);
    return null;
  }
}
