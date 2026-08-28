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
  ScrollView,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { api } from '../../services/api';
import {
  getOfflineFixtures,
  getOfflineSports,
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
  const [sports, setSports] = useState<any[]>([]);
  const [queueHistory, setQueueHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('All');

  // Score Entry Modal state
  const [selectedFixture, setSelectedFixture] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scoreA, setScoreA] = useState('0');
  const [scoreB, setScoreB] = useState('0');
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);

  const loadLocalData = async () => {
    try {
      const offlineFixes = await getOfflineFixtures();
      setFixtures(offlineFixes);
      
      const offlineSports = await getOfflineSports();
      setSports(offlineSports);

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

    setScoreA(fixture.score_a !== null ? String(fixture.score_a) : '0');
    setScoreB(fixture.score_b !== null ? String(fixture.score_b) : '0');
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

  // Score adjustments
  const incrementScore = (team: 'A' | 'B') => {
    if (team === 'A') {
      const current = parseInt(scoreA, 10) || 0;
      setScoreA(String(current + 1));
    } else {
      const current = parseInt(scoreB, 10) || 0;
      setScoreB(String(current + 1));
    }
  };

  const decrementScore = (team: 'A' | 'B') => {
    if (team === 'A') {
      const current = parseInt(scoreA, 10) || 0;
      setScoreA(String(Math.max(0, current - 1)));
    } else {
      const current = parseInt(scoreB, 10) || 0;
      setScoreB(String(Math.max(0, current - 1)));
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
      return <Text style={styles.badgePending}>☁ Pending</Text>;
    }
    if (queueItem.status === 'conflict') {
      return <Text style={styles.badgeConflict}>⚠️ Conflict</Text>;
    }
    return <Text style={styles.badgeSynced}>✓ Synced</Text>;
  };

  // Filter logic
  const filteredFixtures = fixtures.filter((f) => {
    const matchesSport = selectedSport === 'All' || f.sport_name === selectedSport;
    const matchesSearch =
      searchQuery.trim() === '' ||
      f.team_a_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.team_b_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.sport_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.venue_name && f.venue_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSport && matchesSearch;
  });

  // Overview metrics
  const totalMatches = fixtures.length;
  const completedMatches = fixtures.filter((f) => f.status === 'completed').length;
  const pendingSyncs = queueHistory.filter((q) => q.status === 'pending_sync').length;

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
          {isOnline ? '🟢 Online Mode' : '⚠️ Offline Mode (Results cache locally)'}
        </Text>
      </View>

      {/* Hero Overview Panel */}
      <View style={styles.heroCard}>
        <View style={styles.heroItem}>
          <Text style={styles.heroNumber}>{totalMatches}</Text>
          <Text style={styles.heroLabel}>Total Matches</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroItem}>
          <Text style={[styles.heroNumber, { color: '#10b981' }]}>{completedMatches}</Text>
          <Text style={styles.heroLabel}>Completed</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroItem}>
          <Text style={[styles.heroNumber, { color: pendingSyncs > 0 ? '#f59e0b' : '#94a3b8' }]}>
            {pendingSyncs}
          </Text>
          <Text style={styles.heroLabel}>Pending Sync</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search teams, venues, sports..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
      </View>

      {/* Horizontal Sport Selection Pills */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, selectedSport === 'All' && styles.filterPillActive]}
            onPress={() => setSelectedSport('All')}
          >
            <Text style={[styles.filterPillText, selectedSport === 'All' && styles.filterPillTextActive]}>
              🏆 All Sports
            </Text>
          </TouchableOpacity>

          {sports.map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.filterPill, selectedSport === sport.name && styles.filterPillActive]}
              onPress={() => setSelectedSport(sport.name)}
            >
              <Text style={[styles.filterPillText, selectedSport === sport.name && styles.filterPillTextActive]}>
                🏃 {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Fixtures List */}
      <FlatList
        data={filteredFixtures}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No fixtures match your criteria.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.fixtureCard} onPress={() => openScoringModal(item)}>
            <View style={styles.fixtureHeader}>
              <Text style={styles.sportName}>{item.sport_name}</Text>
              {getStatusIconBadge(item)}
            </View>

            <View style={styles.matchup}>
              <Text style={styles.teamText} numberOfLines={2}>
                {item.team_a_name}
              </Text>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreText}>
                  {item.score_a !== null ? `${item.score_a} - ${item.score_b}` : 'VS'}
                </Text>
              </View>
              <Text style={styles.teamText} numberOfLines={2}>
                {item.team_b_name}
              </Text>
            </View>

            <View style={styles.fixtureFooterRow}>
              <Text style={styles.fixtureFooterText}>📍 {item.venue_name || 'Main Field'}</Text>
              <Text style={styles.fixtureFooterText}>⏱️ {item.round}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Scoring Modal */}
      {selectedFixture && (
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {isCorrectionMode ? '✏️ Correct Fixture Score' : '🏆 Submit Match Score'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedFixture.sport_name} • {selectedFixture.round}
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
                    Submitted by {selectedFixture.conflict.submittedBy || 'Unknown'}
                  </Text>
                  <Text style={styles.conflictActionNotice}>
                    To override this canonical score, please use the explicit "Correct Score" flow.
                  </Text>
                </View>
              )}

              {/* Scoring row with adjustment controllers */}
              <View style={styles.scorersContainer}>
                {/* Team A score selector */}
                <View style={styles.scoreController}>
                  <Text style={styles.teamCodeLabel}>{selectedFixture.team_a_code || 'T1'}</Text>
                  <Text style={styles.teamNameLabel} numberOfLines={1}>
                    {selectedFixture.team_a_name}
                  </Text>
                  
                  <View style={styles.adjusterRow}>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => decrementScore('A')}>
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.adjustScoreDisplay}
                      keyboardType="number-pad"
                      value={scoreA}
                      onChangeText={setScoreA}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={styles.adjustButton} onPress={() => incrementScore('A')}>
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.scorersSeparator}>vs</Text>

                {/* Team B score selector */}
                <View style={styles.scoreController}>
                  <Text style={styles.teamCodeLabel}>{selectedFixture.team_b_code || 'T2'}</Text>
                  <Text style={styles.teamNameLabel} numberOfLines={1}>
                    {selectedFixture.team_b_name}
                  </Text>

                  <View style={styles.adjusterRow}>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => decrementScore('B')}>
                      <Text style={styles.adjustButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.adjustScoreDisplay}
                      keyboardType="number-pad"
                      value={scoreB}
                      onChangeText={setScoreB}
                      selectTextOnFocus
                    />
                    <TouchableOpacity style={styles.adjustButton} onPress={() => incrementScore('B')}>
                      <Text style={styles.adjustButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveResult}>
                <Text style={styles.saveButtonText}>
                  {isCorrectionMode ? 'Overwrite Score' : 'Save & Queue Result'}
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
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  networkBanner: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  networkText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  heroItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  heroDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#334155',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#f8fafc',
  },
  filtersContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#3b82f620',
    borderColor: '#3b82f6',
  },
  filterPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#3b82f6',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  fixtureCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fixtureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportName: {
    fontSize: 11,
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
  scoreBadge: {
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  fixtureFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#33415560',
    paddingTop: 8,
  },
  fixtureFooterText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  badgeUpcoming: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  badgePending: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeConflict: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '800',
  },
  badgeSynced: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  scorersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  scoreController: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  teamCodeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  teamNameLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
    textAlign: 'center',
  },
  adjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
  },
  adjustScoreDisplay: {
    fontSize: 26,
    fontWeight: '900',
    color: '#10b981',
    textAlign: 'center',
    width: 44,
    padding: 0,
  },
  scorersSeparator: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748b',
    marginHorizontal: 10,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  closeButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  conflictCard: {
    backgroundColor: '#ef444412',
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
    fontWeight: '800',
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
