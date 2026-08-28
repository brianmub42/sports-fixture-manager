import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import io, { Socket } from 'socket.io-client';
import axios from 'axios';
import { API_URL } from '../../services/api';

export default function PublicEventScoreboard() {
  const { eventSlug } = useLocalSearchParams<{ eventSlug: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'log' | 'sports' | 'fixtures'>('log');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [logStandings, setLogStandings] = useState<any[]>([]);
  const [sportsStandings, setSportsStandings] = useState<Record<string, any>>({});
  const [fixtures, setFixtures] = useState<any[]>([]);

  const fetchPublicData = async () => {
    try {
      // 1. Fetch info
      const infoRes = await axios.get(`${API_URL}/public/events/${eventSlug}`);
      setEventDetails(infoRes.data);

      // 2. Fetch log standings
      const logRes = await axios.get(`${API_URL}/public/events/${eventSlug}/standings`);
      setLogStandings(logRes.data?.log || logRes.data || []);
      setSportsStandings(logRes.data?.sports || []);

      // 3. Fetch fixtures
      const fixRes = await axios.get(`${API_URL}/public/events/${eventSlug}/fixtures`);
      setFixtures(fixRes.data || []);
    } catch (err) {
      console.error('[Spectator API Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPublicData();
  };

  useEffect(() => {
    fetchPublicData();

    // Establish WebSocket Connection
    const socketUrl = API_URL.replace('/api', '');
    const socket: Socket = io(socketUrl, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Spectator connected to socket.io');
      socket.emit('join-tenant', eventSlug);
    });

    socket.on('score-updated', (data) => {
      console.log('[Socket] Score update received, invalidating cache...');
      fetchPublicData();
    });

    return () => {
      socket.disconnect();
    };
  }, [eventSlug]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Fetching live standings...</Text>
      </View>
    );
  }

  if (!eventDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Event Not Found</Text>
        <Text style={styles.errorSubtext}>The code "{eventSlug}" did not resolve to any active tournament.</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.replace('/unauthenticated/watch')}>
          <Text style={styles.errorButtonText}>Try Another Code</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.exitText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.eventTitle}>{eventDetails.name || 'Tournament Scoreboard'}</Text>
          <Text style={styles.schoolTitle}>Hosted by {eventDetails.school_name}</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>● LIVE</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'log' && styles.activeTab]}
          onPress={() => setActiveTab('log')}
        >
          <Text style={[styles.tabText, activeTab === 'log' && styles.activeTabText]}>Championship</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sports' && styles.activeTab]}
          onPress={() => setActiveTab('sports')}
        >
          <Text style={[styles.tabText, activeTab === 'sports' && styles.activeTabText]}>Sports Table</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fixtures' && styles.activeTab]}
          onPress={() => setActiveTab('fixtures')}
        >
          <Text style={[styles.tabText, activeTab === 'fixtures' && styles.activeTabText]}>Schedules</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />
        }
      >
        {activeTab === 'log' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Combined Championship Standings</Text>
            {logStandings.length === 0 ? (
              <Text style={styles.noDataText}>No standings computed yet.</Text>
            ) : (
              logStandings.map((team, idx) => (
                <View key={team.id || idx} style={styles.row}>
                  <Text style={styles.rank}>{idx + 1}</Text>
                  <View style={styles.teamContainer}>
                    <View style={[styles.colorIndicator, { backgroundColor: team.color || '#2563eb' }]} />
                    <Text style={styles.teamName}>{team.name}</Text>
                  </View>
                  <Text style={styles.points}>{team.points || team.total || 0} pts</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'sports' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Sport Category Standings</Text>
            {Object.keys(sportsStandings).length === 0 ? (
              <Text style={styles.noDataText}>No category standings uploaded.</Text>
            ) : (
              Object.keys(sportsStandings).map((sportKey) => (
                <View key={sportKey} style={styles.sportBlock}>
                  <Text style={styles.sportNameTitle}>{sportKey}</Text>
                  {(sportsStandings[sportKey] || []).map((team: any, idx: number) => (
                    <View key={team.team_id || idx} style={styles.subRow}>
                      <Text style={styles.subRank}>{idx + 1}</Text>
                      <Text style={styles.subTeamName}>{team.team_name}</Text>
                      <Text style={styles.subPoints}>{team.points || team.total || 0} pts</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'fixtures' && (
          <View style={styles.fixturesList}>
            {fixtures.length === 0 ? (
              <Text style={styles.noDataText}>No fixtures scheduled.</Text>
            ) : (
              fixtures.map((f) => (
                <View key={f.id} style={styles.fixtureCard}>
                  <View style={styles.fixtureMeta}>
                    <Text style={styles.fixtureSport}>{f.sport_name}</Text>
                    <Text style={styles.fixtureRound}>{f.round}</Text>
                  </View>
                  
                  <View style={styles.matchup}>
                    <Text style={[styles.teamLabel, f.winner_id === f.team_a_id && styles.boldText]}>
                      {f.team_a_name}
                    </Text>
                    <Text style={styles.score}>
                      {f.status === 'completed' || f.status === 'draw'
                        ? `${f.score_a} - ${f.score_b}`
                        : 'vs'}
                    </Text>
                    <Text style={[styles.teamLabel, f.winner_id === f.team_b_id && styles.boldText]}>
                      {f.team_b_name}
                    </Text>
                  </View>

                  <Text style={styles.fixtureVenue}>{f.venue_name || 'Main Arena'}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ef4444',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  exitText: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 15,
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
  },
  schoolTitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: 6,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#0f172a',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13,
  },
  activeTabText: {
    color: '#10b981',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#334155',
    paddingBottom: 8,
  },
  noDataText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  rank: {
    fontSize: 15,
    fontWeight: '800',
    color: '#94a3b8',
    width: 28,
  },
  teamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
  },
  points: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
  },
  sportBlock: {
    marginBottom: 20,
  },
  sportNameTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#334155/50',
  },
  subRank: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    width: 24,
  },
  subTeamName: {
    fontSize: 14,
    color: '#f8fafc',
    flex: 1,
  },
  subPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  fixturesList: {
    gap: 12,
  },
  fixtureCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  fixtureMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fixtureSport: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3b82f6',
    textTransform: 'uppercase',
  },
  fixtureRound: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  teamLabel: {
    fontSize: 15,
    color: '#f8fafc',
    flex: 1,
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '800',
    color: '#3b82f6',
  },
  score: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
    width: 80,
    textAlign: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  fixtureVenue: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});
