import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../../services/api';
import {
  getPendingSyncQueue,
  getSyncQueueHistory,
  updateQueueStatus,
} from '../../services/database';

export default function OfflineSyncConsole() {
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [syncProgress, setSyncProgress] = useState('');

  const loadQueueData = async () => {
    try {
      const history = await getSyncQueueHistory();
      setQueueItems(history);
    } catch (err) {
      console.error('Error loading sync queue history:', err);
    }
  };

  const syncPendingQueue = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('Offline', 'Cannot execute sync. Please connect to the internet first.');
      return;
    }

    const pending = await getPendingSyncQueue();
    if (pending.length === 0) {
      return;
    }

    setSyncing(true);
    console.log(`[Sync Manager] Starting sync for ${pending.length} pending results...`);

    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setSyncProgress(`Syncing item ${i + 1} of ${pending.length}...`);

      try {
        const res = await api.patch(`/scores/${item.fixture_id}`, {
          score_a: item.score_a,
          score_b: item.score_b,
          playerId: item.player_id,
          pointsScored: item.points_scored,
          requestId: item.uuid, // Pass UUID for idempotency protection
        });

        if (res.status === 200) {
          await updateQueueStatus(item.id, 'synced');
          console.log(`[Sync Manager] Synced fixture ${item.fixture_id} successfully.`);
        }
      } catch (err: any) {
        if (err.response && err.response.status === 409) {
          // 409 Conflict: Store existing result detail in SQLite
          const existingResult = err.response.data.existingResult || {};
          await updateQueueStatus(
            item.id,
            'conflict',
            JSON.stringify(existingResult)
          );
          console.log(`[Sync Manager] Conflict on fixture ${item.fixture_id}. Record rejected by server.`);
        } else {
          // Server/Network Failure: Halt queue processing and preserve pending_sync state
          console.error(`[Sync Manager] Network error syncing fixture ${item.fixture_id}:`, err.message);
          setSyncProgress('Sync halted due to network/server issue. Retrying later.');
          break; // Halt the loop
        }
      }
    }

    setSyncing(false);
    setSyncProgress('');
    await loadQueueData();
  };

  useEffect(() => {
    loadQueueData();

    // Listen to network status to auto-sync when transition to online occurs
    const unsubscribe = NetInfo.addEventListener((state) => {
      const transitionedToOnline = !isOnline && state.isConnected;
      setIsOnline(!!state.isConnected);

      if (transitionedToOnline) {
        console.log('[Sync Manager] Connectivity restored. Auto-syncing queue...');
        syncPendingQueue();
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return '#10b981';
      case 'conflict':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getConflictDetails = (reasonStr: string) => {
    try {
      const data = JSON.parse(reasonStr);
      return `Conflict: Server has ${data.score_a || 0}-${data.score_b || 0} by ${data.submittedBy || 'Official'}`;
    } catch {
      return 'Conflict: Record already submitted';
    }
  };

  return (
    <View style={styles.container}>
      {/* Sync Control Header */}
      <View style={styles.syncHeaderCard}>
        <Text style={styles.summaryText}>
          Queue status: {queueItems.filter((q) => q.status === 'pending_sync').length} pending,{' '}
          {queueItems.filter((q) => q.status === 'conflict').length} conflicted,{' '}
          {queueItems.filter((q) => q.status === 'synced').length} synced
        </Text>

        {syncProgress ? <Text style={styles.progressText}>{syncProgress}</Text> : null}

        <TouchableOpacity
          style={[styles.syncButton, (syncing || !isOnline) && styles.syncButtonDisabled]}
          onPress={syncPendingQueue}
          disabled={syncing || !isOnline}
        >
          {syncing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>
              {isOnline ? 'Force Sync Queue' : 'Cannot Sync (Offline)'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={queueItems}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No submission history in the local queue.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.queueItemCard}>
            <View style={styles.queueItemHeader}>
              <Text style={styles.fixtureLabel}>Fixture ID: {item.fixture_id}</Text>
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) + '20', color: getStatusColor(item.status) },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.scoreRow}>
              Proposed Score: {item.score_a} - {item.score_b}
            </Text>

            {item.status === 'conflict' && item.conflict_reason && (
              <View style={styles.conflictReasonBox}>
                <Text style={styles.conflictReasonText}>
                  {getConflictDetails(item.conflict_reason)}
                </Text>
              </View>
            )}

            <Text style={styles.uuidText}>UUID: {item.uuid}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  syncHeaderCard: {
    backgroundColor: '#1e293b',
    padding: 20,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  summaryText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  syncButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  syncButtonDisabled: {
    backgroundColor: '#334155',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 14,
  },
  queueItemCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  queueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fixtureLabel: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 14,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '800',
  },
  scoreRow: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  conflictReasonBox: {
    backgroundColor: '#ef444410',
    borderColor: '#ef444430',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  conflictReasonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  uuidText: {
    color: '#475569',
    fontSize: 10,
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
