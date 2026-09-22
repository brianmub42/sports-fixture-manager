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
import { useTheme } from '../../contexts/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import { useMobilePush } from '../../hooks/useMobilePush';

export default function PublicEventScoreboard() {
  const { eventSlug } = useLocalSearchParams<{ eventSlug: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    followedEntity,
    loading: pushLoading,
    statusMessage,
    followEntity,
    unfollowEntity,
  } = useMobilePush(eventSlug || '');

  const [activeTab, setActiveTab] = useState<'latest' | 'log' | 'sports' | 'fixtures'>('log');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [logStandings, setLogStandings] = useState<any[]>([]);
  const [sportsStandings, setSportsStandings] = useState<Record<string, any>>({});
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [latestResult, setLatestResult] = useState<any>(null);

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

      // 4. Fetch latest event result
      try {
        const latestRes = await axios.get(`${API_URL}/public/events/${eventSlug}/latest-result`);
        if (latestRes.data?.latestResult) {
          setLatestResult(latestRes.data.latestResult);
        }
      } catch (e) {
        console.log('[Latest Result Error]:', e);
      }
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
      socket.emit('join-event', { tenantSlug: eventSlug, eventId: 'all' });
    });

    socket.on('score-updated', (data) => {
      console.log('[Socket] Score update received, invalidating cache...');
      fetchPublicData();
    });

    socket.on('eventResultsPublished', (payload) => {
      console.log('[Socket] Received eventResultsPublished on mobile:', payload);
      setLatestResult(payload);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderColor: colors.headerBorder }]}>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={[styles.exitText, { color: colors.primary }]}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>{eventDetails.name || 'Tournament Scoreboard'}</Text>
          <Text style={[styles.schoolTitle, { color: colors.textMuted }]}>Hosted by {eventDetails.school_name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ThemeToggle compact={true} />
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>● LIVE</Text>
          </View>
        </View>
      </View>

      {/* Opt-In Notification Follow Bar */}
      <View style={[styles.followBanner, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
        <View style={styles.followBannerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={[styles.bellCircle, { backgroundColor: followedEntity ? '#2563eb' : (isDark ? '#334155' : '#e2e8f0') }]}>
              <Text style={{ fontSize: 13 }}>{followedEntity ? '🔔' : '🔕'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.followBannerTitle, { color: colors.text }]} numberOfLines={1}>
                  {followedEntity ? `Following ${followedEntity.name}` : 'Live Alerts'}
                </Text>
                {followedEntity && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.followBannerSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {followedEntity
                  ? 'Push alerts enabled for live scores'
                  : 'Follow a house or team for score alerts'}
              </Text>
            </View>
          </View>

          {followedEntity && (
            <TouchableOpacity
              onPress={unfollowEntity}
              disabled={pushLoading}
              style={[styles.unfollowBtn, { borderColor: isDark ? '#475569' : '#cbd5e1' }]}
            >
              <Text style={[styles.unfollowBtnText, { color: colors.textMuted }]}>
                {pushLoading ? '...' : 'Unfollow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!followedEntity && eventDetails?.teams && eventDetails.teams.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamPillsScroll}>
            {eventDetails.teams.map((t: any) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => followEntity({ type: 'team', id: t.id, name: t.name })}
                disabled={pushLoading}
                style={[
                  styles.teamFollowPill,
                  { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }
                ]}
              >
                <View style={[styles.teamFollowDot, { backgroundColor: t.color || '#3b82f6' }]} />
                <Text style={[styles.teamFollowName, { color: colors.text }]}>+ {t.code || t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Prominent Post-Event Results Spotlight Banner (Persistent above feed) */}
      {latestResult && (
        <View style={[styles.spotlightBanner, { backgroundColor: isDark ? '#1e1b4b' : '#fffbeb', borderColor: '#f59e0b' }]}>
          <View style={styles.spotlightHeader}>
            <View style={styles.spotlightBadgeRow}>
              <View style={styles.spotlightPulseBadge}>
                <Text style={styles.spotlightPulseText}>⚡ LATEST RESULT</Text>
              </View>
              <Text style={[styles.spotlightSportText, { color: isDark ? '#cbd5e1' : '#78350f' }]} numberOfLines={1}>
                {latestResult.sportName} · {latestResult.category}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setActiveTab(activeTab === 'latest' ? 'log' : 'latest')}
              style={styles.spotlightToggleBtn}
            >
              <Text style={styles.spotlightToggleText}>
                {activeTab === 'latest' ? 'View Log' : 'View Card'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.spotlightTitle, { color: colors.text }]}>
            {latestResult.eventName}
          </Text>

          {/* Quick Podium Top 3 */}
          {latestResult.results && latestResult.results.length > 0 && (
            <View style={styles.spotlightPodium}>
              {latestResult.results.slice(0, 3).map((r: any) => {
                const medal = r.placement === 1 ? '🥇' : r.placement === 2 ? '🥈' : '🥉';
                return (
                  <View
                    key={r.placement}
                    style={[
                      styles.podiumItem,
                      { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#fde68a' }
                    ]}
                  >
                    <View style={styles.podiumRankRow}>
                      <Text style={styles.podiumMedal}>{medal}</Text>
                      <View style={[styles.colorIndicatorSmall, { backgroundColor: r.teamColor || '#3b82f6' }]} />
                      <Text style={[styles.podiumTeam, { color: colors.text }]} numberOfLines={1}>
                        {r.teamName}
                      </Text>
                    </View>
                    <View style={styles.podiumTimeRow}>
                      {r.timeFormatted ? (
                        <Text style={[styles.podiumTime, { color: colors.primary }]}>{r.timeFormatted}</Text>
                      ) : null}
                      <Text style={styles.podiumPts}>+{r.points} pts</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        {latestResult && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'latest' && styles.activeTabLatest]}
            onPress={() => setActiveTab('latest')}
          >
            <Text style={[styles.tabText, activeTab === 'latest' && styles.activeTabTextLatest]}>⚡ Result</Text>
          </TouchableOpacity>
        )}
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
        {activeTab === 'latest' && latestResult && (
          <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <View style={styles.latestFullHeader}>
              <View style={styles.latestBadgeRow}>
                <View style={styles.latestOfficialBadge}>
                  <Text style={styles.latestOfficialText}>OFFICIAL RESULT</Text>
                </View>
                <Text style={[styles.latestSportCat, { color: colors.primary }]}>
                  {latestResult.sportName} · {latestResult.category}
                </Text>
              </View>
              <Text style={[styles.latestEventName, { color: colors.text }]}>
                {latestResult.eventName}
              </Text>
              {latestResult.venueName && (
                <Text style={[styles.latestVenue, { color: colors.textMuted }]}>
                  📍 {latestResult.venueName}
                </Text>
              )}
            </View>

            {latestResult.results && latestResult.results.map((r: any) => {
              const medal = r.placement === 1 ? '🥇 1st' : r.placement === 2 ? '🥈 2nd' : r.placement === 3 ? '🥉 3rd' : `#${r.placement}`;
              const isPodium = r.placement <= 3;
              return (
                <View
                  key={r.placement}
                  style={[
                    styles.row,
                    { borderColor: isDark ? '#334155' : '#f1f5f9' },
                    isPodium && { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)' }
                  ]}
                >
                  <Text style={[styles.rank, isPodium && { color: '#f59e0b', fontWeight: '900' }]}>
                    {medal}
                  </Text>
                  <View style={styles.teamContainer}>
                    <View style={[styles.colorIndicator, { backgroundColor: r.teamColor || '#2563eb' }]} />
                    <View>
                      <Text style={[styles.teamName, { color: colors.text }]}>{r.teamName}</Text>
                      {r.teamCode && (
                        <Text style={[styles.teamCodeSmall, { color: colors.textMuted }]}>({r.teamCode})</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {r.timeFormatted ? (
                      <Text style={[styles.timeText, { color: colors.text }]}>{r.timeFormatted}</Text>
                    ) : null}
                    <Text style={[styles.points, { color: colors.primary }]}>+{r.points} pts</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'log' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Combined Championship Standings</Text>
            {logStandings.length === 0 ? (
              <Text style={styles.noDataText}>No standings computed yet.</Text>
            ) : (
              logStandings.map((team, idx) => {
                const teamId = team.id || eventDetails?.teams?.find((t: any) => t.code === team.code)?.id;
                const isFollowed = followedEntity && (String(followedEntity.id) === String(teamId));
                return (
                  <View key={team.id || idx} style={styles.row}>
                    <Text style={styles.rank}>{idx + 1}</Text>
                    <View style={styles.teamContainer}>
                      <View style={[styles.colorIndicator, { backgroundColor: team.color || '#2563eb' }]} />
                      <Text style={styles.teamName}>{team.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.points}>{team.points || team.total || 0} pts</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (isFollowed) {
                            unfollowEntity();
                          } else if (teamId) {
                            followEntity({ type: 'team', id: teamId, name: team.name });
                          }
                        }}
                        disabled={pushLoading}
                        style={[styles.followBtn, isFollowed && styles.followBtnActive]}
                      >
                        <Text style={[styles.followBtnText, isFollowed && styles.followBtnTextActive]}>
                          {isFollowed ? 'Following' : '+ Follow'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
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
  spotlightBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  spotlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  spotlightBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  spotlightPulseBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  spotlightPulseText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  spotlightSportText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  spotlightToggleBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  spotlightToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f59e0b',
  },
  spotlightTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  spotlightPodium: {
    gap: 6,
  },
  podiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  podiumRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  podiumMedal: {
    fontSize: 13,
  },
  colorIndicatorSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  podiumTeam: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  podiumTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  podiumTime: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  podiumPts: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f59e0b',
  },
  activeTabLatest: {
    backgroundColor: '#f59e0b',
  },
  activeTabTextLatest: {
    color: '#000000',
    fontWeight: '900',
  },
  latestFullHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  latestBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  latestOfficialBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latestOfficialText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  latestSportCat: {
    fontSize: 12,
    fontWeight: '700',
  },
  latestEventName: {
    fontSize: 18,
    fontWeight: '800',
  },
  latestVenue: {
    fontSize: 12,
    marginTop: 4,
  },
  teamCodeSmall: {
    fontSize: 11,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  followBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  followBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bellCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  activePill: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  activePillText: {
    color: '#22c55e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  followBannerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  unfollowBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  unfollowBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  teamPillsScroll: {
    marginTop: 10,
    flexDirection: 'row',
  },
  teamFollowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    gap: 5,
  },
  teamFollowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  teamFollowName: {
    fontSize: 11,
    fontWeight: '700',
  },
  followBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginLeft: 8,
  },
  followBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  followBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  followBtnTextActive: {
    color: '#ffffff',
  },
});
