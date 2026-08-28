import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../../services/api';
import {
  getOfflineFixtures,
  initDatabase,
  cacheEventData,
  saveFixtureResultOffline,
  getSyncQueueHistory,
  overwriteLocalFixtureScore,
} from '../../services/database';

// Helper to generate UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ScorekeeperFixtures() {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [queueHistory, setQueueHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Score Entry Modal state
  const [selectedFixture, setSelectedFixture] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);

  const loadLocalData = async () => {
    try {
      const offlineFixes = await getOfflineFixtures();
      setFixtures(offlineFixes);
      
      const history = await getSyncQueueHistory();
      setQueueHistory(history);
    } catch (err) {
      console.error('Failed to load offline database fixtures:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOnlineAndRefreshCache = async () => {
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        setIsOnline(false);
        await loadLocalData();
        return;
      }

      setIsOnline(true);
      console.log('[Sync] Device is online. Downloading latest tournament fixtures...');
      
      const [fixRes, teamsRes, sportsRes] = await Promise.all([
        api.get('/fixtures'),
        api.get('/teams'),
        api.get('/sports'),
      ]);

      await cacheEventData(fixRes.data, teamsRes.data, sportsRes.data);
      await loadLocalData();
    } catch (err) {
      console.error('Failed to sync metadata online:', err);
      // Fallback to local cache on error
      await loadLocalData();
    }
  };

  useEffect(() => {
    async function startDb() {
      await initDatabase();
      await fetchOnlineAndRefreshCache();
    }
    startDb();

    // Listen to network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOnlineAndRefreshCache();
  };

  const openScoringModal = (fixture: any) => {
    // Check if there is an active conflict
    const conflictItem = queueHistory.find(
      (q) => q.fixture_id === fixture.id && q.status === 'conflict'
    );

    setSelectedFixture({
      ...fixture,
      conflict: conflictItem ? JSON.parse(conflictItem.conflict_reason) : null,
      queueId: conflictItem?.id,
    });

    setScoreA(fixture.score_a !== null ? String(fixture.score_a) : '');
    setScoreB(fixture.score_b !== null ? String(fixture.score_b) : '');
    setIsCorrectionMode(fixture.status === 'completed' && !conflictItem);
    setModalVisible(true);
  };

  const handleSaveResult = async () => {
    const sA = parseInt(scoreA, 10);
    const sB = parseInt(scoreB, 10);

    if (isNaN(sA) || isNaN(sB)) {
      Alert.alert('Validation Error', 'Please enter valid integer scores.');
      return;
    }

    try {
      if (isCorrectionMode) {
        // Legitimate corrections bypass the offline sync queue
        // Must hit the backend correction endpoint directly
        if (!isOnline) {
          Alert.alert(
            'Offline Alert',
            'Result corrections must be submitted while online to preserve the audit trail.'
          );
          return;
        }

        Alert.alert(
          'Confirm Correction',
          `Are you sure you want to overwrite this fixture score to ${sA} - ${sB}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Overwrite',
              onPress: async () => {
                try {
                  await api.post(`/scores/${selectedFixture.id}/correct`, {
                    score_a: sA,
                    score_b: sB,
                  });
                  await overwriteLocalFixtureScore(selectedFixture.id, sA, sB);
                  setModalVisible(false);
                  fetchOnlineAndRefreshCache();
                } catch (err: any) {
                  Alert.alert('Correction Failed', err.response?.data?.error || err.message);
                }
              },
            },
          ]
        );
      } else {
        // Standard submission: write optimistically to SQLite
        const clientUUID = generateUUID();
        await saveFixtureResultOffline(clientUUID, selectedFixture.id, sA, sB);
        setModalVisible(false);
        loadLocalData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const getStatusIconBadge = (fixture: any) => {
    const queueItem = queueHistory.find((q) => q.fixture_id === fixture.id);

    if (!queueItem) {
      if (fixture.status === 'completed') {
        return <Text style={styles.badgeSynced}>✓ Synced</Text>;
      }
      return <Text style={styles.badgeUpcoming}>Upcoming</Text>;
    }

    if (queueItem.status === 'pending_sync') {
      return <Text style={styles.badgePending}>☁ Pending Sync</Text>;
    }
    if (queueItem.status === 'conflict') {
      return <Text style={styles.badgeConflict}>⚠️ Conflict</Text>;
    }
    return <Text style={styles.badgeSynced}>✓ Synced</Text>;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Initializing offline database...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Network banner */}
      <View style={[styles.networkBanner, { backgroundColor: isOnline ? '#10b981' : '#f59e0b' }]}>
        <Text style={styles.networkText}>
          {isOnline ? '🟢 Connected Online' : '⚠️ Offline Mode (Results will save locally)'}
        </Text>
      </View>

      <FlatList
        data={fixtures}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.fixtureCard} onPress={() => openScoringModal(item)}>
            <View style={styles.fixtureHeader}>
              <Text style={styles.sportName}>{item.sport_name}</Text>
              {getStatusIconBadge(item)}
            </View>

            <View style={styles.matchup}>
              <Text style={styles.teamText}>{item.team_a_name}</Text>
              <Text style={styles.scoreText}>
                {item.score_a !== null ? `${item.score_a} - ${item.score_b}` : 'vs'}
              </Text>
              <Text style={styles.teamText}>{item.team_b_name}</Text>
            </View>

            <Text style={styles.fixtureFooter}>
              {item.round} • {item.venue_name || 'Main Field'}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Scoring Modal */}
      {selectedFixture && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {isCorrectionMode ? 'Correct Fixture Score' : 'Submit Match Score'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedFixture.team_a_name} vs {selectedFixture.team_b_name}
              </Text>

              {/* Conflict UI Alert Card */}
              {selectedFixture.conflict && (
                <View style={styles.conflictCard}>
                  <Text style={styles.conflictTitle}>⚠️ Score Conflict Detected</Text>
                  <Text style={styles.conflictDetail}>
                    The server already has a record for this match:
                  </Text>
                  <Text style={styles.conflictScore}>
                    Score: {selectedFixture.conflict.score_a} - {selectedFixture.conflict.score_b}
                  </Text>
                  <Text style={styles.conflictSub}>
                    Submitted by {selectedFixture.conflict.submittedBy || 'Unknown'} at{' '}
                    {selectedFixture.conflict.submittedAt?.split('T')[0] || ''}
                  </Text>
                  <Text style={styles.conflictActionNotice}>
                    To overwrite this canonical result, please use the explicit "Correct Score" flow.
                  </Text>
                </View>
              )}

              <View style={styles.scoresRow}>
                <View style={styles.scoreInputContainer}>
                  <Text style={styles.scoreInputLabel}>{selectedFixture.team_a_code || 'T1'}</Text>
                  <TextInput
                    style={styles.scoreInput}
                    keyboardType="number-pad"
                    value={scoreA}
                    onChangeText={setScoreA}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <Text style={styles.scoreDivider}>-</Text>
                <View style={styles.scoreInputContainer}>
                  <Text style={styles.scoreInputLabel}>{selectedFixture.team_b_code || 'T2'}</Text>
                  <TextInput
                    style={styles.scoreInput}
                    keyboardType="number-pad"
                    value={scoreB}
                    onChangeText={setScoreB}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveResult}>
                <Text style={styles.saveButtonText}>
                  {isCorrectionMode ? 'Submit Correction' : 'Save Score'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 15,
  },
  networkBanner: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  networkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  fixtureCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  fixtureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sportName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3b82f6',
    textTransform: 'uppercase',
  },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  teamText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
    textAlign: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  fixtureFooter: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
  },
  badgeUpcoming: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  badgePending: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeConflict: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeSynced: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000a0',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  scoreInputContainer: {
    alignItems: 'center',
  },
  scoreInputLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  scoreInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    width: 70,
    height: 70,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  scoreDivider: {
    fontSize: 24,
    color: '#64748b',
    marginHorizontal: 20,
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  conflictCard: {
    backgroundColor: '#ef444415',
    borderColor: '#ef444430',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  conflictTitle: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  conflictDetail: {
    color: '#94a3b8',
    fontSize: 11,
  },
  conflictScore: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 4,
  },
  conflictSub: {
    color: '#64748b',
    fontSize: 10,
  },
  conflictActionNotice: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
  },
});
