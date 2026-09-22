import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import axios from 'axios';
import { API_URL } from '../services/api';

let Notifications: any = null;
const isExpoGo = Constants.appOwnership === 'expo';

if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      } as any),
    });
  } catch (err) {
    console.warn('[Push Hook] Failed to load expo-notifications:', err);
  }
}

export interface FollowedEntity {
  type: 'team' | 'house' | 'individual';
  id: number;
  name: string;
}

export function useMobilePush(eventSlug: string) {
  const [deviceId, setDeviceId] = useState<string>('');
  const [followedEntity, setFollowedEntity] = useState<FollowedEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const storageKey = `followed_entity_${eventSlug}`;

  // 1. Initialize anonymous device ID and load persisted follow
  useEffect(() => {
    let isMounted = true;

    async function initDevice() {
      try {
        let id = await SecureStore.getItemAsync('push_device_id');
        if (!id) {
          id = `mob_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
          await SecureStore.setItemAsync('push_device_id', id);
        }
        if (isMounted) setDeviceId(id);

        const saved = await SecureStore.getItemAsync(storageKey);
        if (saved && isMounted) {
          try {
            setFollowedEntity(JSON.parse(saved));
          } catch (e) {
            console.error('Error parsing stored followed entity:', e);
          }
        }

        // Verify status with server
        if (eventSlug && id) {
          try {
            const res = await axios.get(`${API_URL}/public/push/status`, {
              params: { eventSlug, deviceId: id },
            });
            if (res.data?.active && res.data?.subscription && isMounted) {
              const sub = res.data.subscription;
              const entity: FollowedEntity = {
                type: sub.followed_type || 'team',
                id: sub.followed_id,
                name: sub.followed_name || `Team #${sub.followed_id}`,
              };
              setFollowedEntity(entity);
              await SecureStore.setItemAsync(storageKey, JSON.stringify(entity));
            } else if (!res.data?.active && isMounted) {
              await SecureStore.deleteItemAsync(storageKey);
              setFollowedEntity(null);
            }
          } catch (apiErr) {
            // Non-blocking
          }
        }
      } catch (err) {
        console.error('[Push Hook] Init error:', err);
      }
    }

    initDevice();

    return () => {
      isMounted = false;
    };
  }, [eventSlug, storageKey]);

  // 2. Opt-in Follow Entity (prompts permission ONLY when called)
  const followEntity = useCallback(
    async (entity: FollowedEntity): Promise<boolean> => {
      setLoading(true);
      setStatusMessage(null);

      try {
        let pushToken: string | null = null;

        // Setup notification channel on Android
        if (Platform.OS === 'android' && Notifications) {
          await Notifications.setNotificationChannelAsync('scores', {
            name: 'Live Scores & Results',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3b82f6',
            sound: 'default',
          });
        }

        // Request permission
        if (Notifications) {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus !== 'granted') {
            const msg = 'Notification permissions were denied in device settings.';
            setStatusMessage({ type: 'error', text: msg });
            Alert.alert('Notifications Disabled', 'To receive score alerts, enable notifications in device settings.');
            setLoading(false);
            return false;
          }

          try {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            pushToken = tokenData.data;
          } catch (tokenErr) {
            console.warn('[Push Hook] Unable to generate Expo token:', tokenErr);
          }
        }

        // Register subscription with backend
        await axios.post(`${API_URL}/public/push/subscribe`, {
          eventSlug,
          deviceId,
          platform: 'mobile',
          expoPushToken: pushToken,
          followedType: entity.type || 'team',
          followedId: entity.id,
          followedName: entity.name,
        });

        // Persist locally
        await SecureStore.setItemAsync(storageKey, JSON.stringify(entity));
        setFollowedEntity(entity);
        setStatusMessage({
          type: 'success',
          text: `Now following ${entity.name}! You'll receive live score alerts.`,
        });

        return true;
      } catch (err: any) {
        console.error('[Push Hook] followEntity error:', err);
        const errMsg = err.response?.data?.error || err.message || 'Failed to enable notifications';
        setStatusMessage({ type: 'error', text: errMsg });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [eventSlug, deviceId, storageKey]
  );

  // 3. Unfollow Entity
  const unfollowEntity = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setStatusMessage(null);

    try {
      await axios.post(`${API_URL}/public/push/unsubscribe`, {
        eventSlug,
        deviceId,
      });

      await SecureStore.deleteItemAsync(storageKey);
      const prevName = followedEntity?.name || 'team';
      setFollowedEntity(null);
      setStatusMessage({
        type: 'info',
        text: `Unfollowed ${prevName}.`,
      });

      return true;
    } catch (err: any) {
      console.error('[Push Hook] unfollowEntity error:', err);
      await SecureStore.deleteItemAsync(storageKey);
      setFollowedEntity(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, [eventSlug, deviceId, storageKey, followedEntity]);

  return {
    deviceId,
    followedEntity,
    loading,
    statusMessage,
    followEntity,
    unfollowEntity,
    clearStatusMessage: () => setStatusMessage(null),
  };
}
