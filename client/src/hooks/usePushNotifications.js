import { useState, useEffect, useCallback } from 'react';
import { publicApi } from '../api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('push_device_id');
  if (!id) {
    id = 'web_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('push_device_id', id);
  }
  return id;
}

export function usePushNotifications(eventSlug) {
  const [deviceId] = useState(getOrCreateDeviceId);
  const [followedEntity, setFollowedEntity] = useState(null);
  const [permissionState, setPermissionState] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const storageKey = `followed_entity_${eventSlug}`;

  // Check feature support and load initial local state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }

    // Load persisted followed entity from localStorage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setFollowedEntity(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error reading saved followed entity:', e);
    }
  }, [storageKey]);

  // Optionally verify with server on mount
  useEffect(() => {
    if (!eventSlug || !deviceId) return;
    publicApi.getPushStatus({ eventSlug, deviceId })
      .then(res => {
        if (res.data?.active && res.data?.subscription) {
          const sub = res.data.subscription;
          const entity = {
            type: sub.followed_type || 'team',
            id: sub.followed_id,
            name: sub.followed_name || `Team #${sub.followed_id}`
          };
          setFollowedEntity(entity);
          localStorage.setItem(storageKey, JSON.stringify(entity));
        } else if (!res.data?.active && localStorage.getItem(storageKey)) {
          // If server has no record, clear local storage
          localStorage.removeItem(storageKey);
          setFollowedEntity(null);
        }
      })
      .catch(() => {
        // Silent catch for offline or non-blocking network
      });
  }, [eventSlug, deviceId, storageKey]);

  const followEntity = useCallback(async (entity) => {
    if (!isSupported) {
      setFeedbackMessage({ type: 'error', text: 'Push notifications are not supported in this browser.' });
      return false;
    }

    setIsLoading(true);
    setFeedbackMessage(null);

    try {
      // 1. Request permission ONLY upon explicit user interaction
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        setFeedbackMessage({
          type: 'warning',
          text: permission === 'denied'
            ? 'Notifications were blocked in your browser settings.'
            : 'Notification permission was not granted.'
        });
        setIsLoading(false);
        return false;
      }

      // 2. Register push service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Get VAPID public key
      const { data: vapidData } = await publicApi.getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidData.publicKey);

      // 4. Create or obtain Push Subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      // 5. Send subscription to server
      await publicApi.subscribePush({
        eventSlug,
        deviceId,
        platform: 'web',
        subscriptionJson: JSON.stringify(subscription),
        followedType: entity.type || 'team',
        followedId: entity.id,
        followedName: entity.name
      });

      // 6. Save locally
      localStorage.setItem(storageKey, JSON.stringify(entity));
      setFollowedEntity(entity);
      setFeedbackMessage({
        type: 'success',
        text: `Now following ${entity.name}! You'll receive live score and result updates.`
      });

      return true;
    } catch (err) {
      console.error('Failed to follow entity for notifications:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to enable notifications.'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, eventSlug, deviceId, storageKey]);

  const unfollowEntity = useCallback(async () => {
    setIsLoading(true);
    setFeedbackMessage(null);

    try {
      await publicApi.unsubscribePush({
        eventSlug,
        deviceId
      });

      // Optionally unsubscribe from PushManager
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) {
          const sub = await registration.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
          }
        }
      }

      localStorage.removeItem(storageKey);
      const prevName = followedEntity?.name || 'team';
      setFollowedEntity(null);
      setFeedbackMessage({
        type: 'info',
        text: `Unfollowed ${prevName}. You will no longer receive updates.`
      });
      return true;
    } catch (err) {
      console.error('Failed to unfollow entity:', err);
      // Still clear local state on error
      localStorage.removeItem(storageKey);
      setFollowedEntity(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [eventSlug, deviceId, storageKey, followedEntity]);

  return {
    isSupported,
    permissionState,
    followedEntity,
    isLoading,
    feedbackMessage,
    followEntity,
    unfollowEntity,
    clearFeedback: () => setFeedbackMessage(null)
  };
}
