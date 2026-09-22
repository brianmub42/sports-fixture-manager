import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  getPendingSyncQueue,
  getSyncQueueHistory,
  updateQueueStatus
} from '../services/mobileOfflineDb.js';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

export function useMobileOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const [queueItems, setQueueItems] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  const loadQueueData = useCallback(async () => {
    try {
      const history = await getSyncQueueHistory(50);
      setQueueItems(history);
      const pending = history.filter(item => item.status === 'pending_sync');
      setPendingCount(pending.length);
    } catch (err) {
      console.error('[Sync Hook] Error loading sync queue history:', err);
    }
  }, []);

  const syncPendingQueue = useCallback(async () => {
    if (!navigator.onLine) {
      alert('Offline: Cannot sync right now. Connect to the internet first.');
      return;
    }

    const pending = await getPendingSyncQueue();
    if (pending.length === 0) return;

    setSyncing(true);
    setSyncProgress(`Starting sync for ${pending.length} pending results...`);

    const token = localStorage.getItem('mobile_token') || localStorage.getItem('token');
    const orgSlug = localStorage.getItem('mobile_org_slug') || localStorage.getItem('organization_slug') || 'demo-tournament';

    const headers = {
      'Content-Type': 'application/json',
      'X-Organization-Slug': orgSlug
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setSyncProgress(`Syncing item ${i + 1} of ${pending.length}...`);

      try {
        const res = await axios.patch(
          `${API_BASE}/scores/${item.fixture_id}`,
          {
            score_a: item.score_a,
            score_b: item.score_b,
            playerId: item.player_id,
            pointsScored: item.points_scored,
            requestId: item.uuid, // Idempotency protection
          },
          { headers }
        );

        if (res.status === 200) {
          await updateQueueStatus(item.id, 'synced');
          console.log(`[Sync Hook] Synced fixture #${item.fixture_id} successfully.`);
        }
      } catch (err) {
        if (err.response && err.response.status === 409) {
          // 409 Conflict: Store existing result detail in IndexedDB
          const existingResult = err.response.data.existingResult || {};
          await updateQueueStatus(item.id, 'conflict', JSON.stringify(existingResult));
          console.log(`[Sync Hook] Conflict on fixture #${item.fixture_id}. Marked as conflict.`);
        } else {
          console.error(`[Sync Hook] Network error syncing fixture #${item.fixture_id}:`, err.message);
          setSyncProgress('Sync paused due to network error. Will retry automatically.');
          break; // Stop and retry later
        }
      }
    }

    setSyncing(false);
    setSyncProgress('');
    await loadQueueData();
  }, [loadQueueData]);

  // Network event listeners and auto-sync
  useEffect(() => {
    loadQueueData();

    const handleOnline = () => {
      console.log('[Sync Hook] Transitioned to ONLINE! Triggering automatic sync...');
      setIsOnline(true);
      syncPendingQueue();
    };

    const handleOffline = () => {
      console.log('[Sync Hook] Transitioned to OFFLINE.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadQueueData, syncPendingQueue]);

  return {
    isOnline,
    syncing,
    syncProgress,
    queueItems,
    pendingCount,
    loadQueueData,
    syncPendingQueue
  };
}
