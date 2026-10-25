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
  Image,
  Modal,
  Share,
  Dimensions,
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

  const [activeTab, setActiveTab] = useState<'feed' | 'latest' | 'log' | 'sports' | 'fixtures'>('feed');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [logStandings, setLogStandings] = useState<any[]>([]);
  const [sportsStandings, setSportsStandings] = useState<Record<string, any>>({});
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [latestResult, setLatestResult] = useState<any>(null);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [activeStory, setActiveStory] = useState<any>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, boolean>>({});

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

      // 5. Fetch spectator FanZone feed & stories
      try {
        const feedRes = await axios.get(`${API_URL}/public/events/${eventSlug}/feed`);
        setFeedPosts(feedRes.data?.feed || []);
        setStories(feedRes.data?.stories || []);
      } catch (e) {
        console.log('[Feed API Error]:', e);
      }
    } catch (err) {
      console.error('[Spectator API Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReact = async (postId: number, reaction: string) => {
    const key = `${postId}-${reaction}`;
    if (localReactions[key]) return;
    setLocalReactions(prev => ({ ...prev, [key]: true }));

    try {
      await axios.post(`${API_URL}/public/events/${eventSlug}/feed/${postId}/react`, { reaction });
      setFeedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const r = { ...(p.reactions || { fire: 0, clap: 0, cheer: 0, trophy: 0 }) };
          r[reaction] = (r[reaction] || 0) + 1;
          return { ...p, reactions: r };
        }
        return p;
      }));
    } catch (e) {
      console.warn('React error:', e);
    }
  };

  const handleSharePost = async (post: any) => {
    try {
      await Share.share({
        message: `🏆 Check out "${post.caption || 'Tournament Live Moment'}" on FixtureGrid!`,
      });
      await axios.post(`${API_URL}/public/events/${eventSlug}/feed/${post.id}/share`).catch(() => {});
    } catch (e) {
      console.warn('Share error:', e);
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

    socket.on('spectator-feed-updated', () => {
      console.log('[Socket] Spectator feed updated');
      fetchPublicData();
    });

    socket.on('spectator-reaction-updated', ({ postId, reactions }: any) => {
      setFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions } : p));
      setStories(prev => prev.map(s => s.id === postId ? { ...s, reactions } : s));
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

      {/* 2. LIVE STORIES / HIGHLIGHT REEL STRIP */}
      {stories.length > 0 && (
        <View style={[styles.storiesContainer, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
            {stories.map((story) => (
              <TouchableOpacity
                key={story.id}
                onPress={() => setActiveStory(story)}
                style={styles.storyBubble}
              >
                <View style={styles.storyRing}>
                  {story.media_url ? (
                    <Image source={{ uri: story.thumbnail_url || story.media_url }} style={styles.storyAvatar} />
                  ) : (
                    <View style={[styles.storyAvatar, { backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 16 }}>⭐</Text>
                    </View>
                  )}
                  <View style={styles.storyBadge}>
                    <Text style={{ fontSize: 8 }}>{story.media_type === 'video' ? '▶' : '📷'}</Text>
                  </View>
                </View>
                <Text style={[styles.storyLabel, { color: colors.text }]} numberOfLines={1}>
                  {story.story_title || story.caption?.slice(0, 12) || 'Highlight'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>🔥 FanZone</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'log' && styles.activeTab]}
          onPress={() => setActiveTab('log')}
        >
          <Text style={[styles.tabText, activeTab === 'log' && styles.activeTabText]}>Standings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sports' && styles.activeTab]}
          onPress={() => setActiveTab('sports')}
        >
          <Text style={[styles.tabText, activeTab === 'sports' && styles.activeTabText]}>Sports</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fixtures' && styles.activeTab]}
          onPress={() => setActiveTab('fixtures')}
        >
          <Text style={[styles.tabText, activeTab === 'fixtures' && styles.activeTabText]}>Matches</Text>
        </TouchableOpacity>
        {latestResult && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'latest' && styles.activeTabLatest]}
            onPress={() => setActiveTab('latest')}
          >
            <Text style={[styles.tabText, activeTab === 'latest' && styles.activeTabTextLatest]}>⚡ Result</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />
        }
      >
        {activeTab === 'feed' && (
          <View style={styles.feedContainer}>
            {feedPosts.length === 0 ? (
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
                <Text style={[styles.cardHeader, { textAlign: 'center', borderBottomWidth: 0 }]}>FanZone Feed is Live</Text>
                <Text style={[styles.noDataText, { textAlign: 'center' }]}>
                  Media managers and scorekeepers will publish match action photos and video highlights here.
                </Text>
              </View>
            ) : (
              feedPosts.map((post) => {
                const reactions = post.reactions || { fire: 0, clap: 0, cheer: 0, trophy: 0 };
                const hasReactedFire = localReactions[`${post.id}-fire`];
                const hasReactedClap = localReactions[`${post.id}-clap`];
                const hasReactedTrophy = localReactions[`${post.id}-trophy`];

                return (
                  <View
                    key={post.id}
                    style={[
                      styles.feedCard,
                      { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }
                    ]}
                  >
                    {/* Header */}
                    <View style={styles.feedCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={styles.feedAvatar}>
                          <Text style={styles.feedAvatarText}>
                            {(post.author_name || 'MD').slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.feedAuthor, { color: colors.text }]} numberOfLines={1}>
                            {post.author_name || 'Official Media Desk'}
                          </Text>
                          <Text style={[styles.feedMeta, { color: colors.textMuted }]}>
                            {post.sport_name ? `${post.sport_name} · ` : ''}
                            {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                      {post.is_story_highlight && (
                        <View style={styles.storyPill}>
                          <Text style={styles.storyPillText}>⭐ HIGHLIGHT</Text>
                        </View>
                      )}
                    </View>

                    {/* Caption */}
                    {post.caption ? (
                      <Text style={[styles.feedCaption, { color: colors.text }]}>
                        {post.caption}
                      </Text>
                    ) : null}

                    {/* Media Image / Video Thumbnail */}
                    {post.media_url ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setActiveStory(post)}
                        style={styles.feedMediaContainer}
                      >
                        <Image
                          source={{ uri: post.thumbnail_url || post.media_url }}
                          style={styles.feedMedia}
                          resizeMode="cover"
                        />
                        {(post.media_type === 'video' || post.media_type === 'highlight_clip') && (
                          <View style={styles.playButtonOverlay}>
                            <Text style={styles.playIconText}>▶</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {/* Footer Actions */}
                    <View style={styles.feedActionsRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => handleReact(post.id, 'fire')}
                          style={[styles.reactionBtn, hasReactedFire && styles.reactionBtnActive]}
                        >
                          <Text style={styles.reactionEmoji}>🔥</Text>
                          <Text style={[styles.reactionCount, { color: colors.text }]}>{reactions.fire || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleReact(post.id, 'clap')}
                          style={[styles.reactionBtn, hasReactedClap && styles.reactionBtnActive]}
                        >
                          <Text style={styles.reactionEmoji}>👏</Text>
                          <Text style={[styles.reactionCount, { color: colors.text }]}>{reactions.clap || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleReact(post.id, 'trophy')}
                          style={[styles.reactionBtn, hasReactedTrophy && styles.reactionBtnActive]}
                        >
                          <Text style={styles.reactionEmoji}>🏆</Text>
                          <Text style={[styles.reactionCount, { color: colors.text }]}>{reactions.trophy || 0}</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleSharePost(post)}
                        style={[styles.sharePostBtn, { borderColor: isDark ? '#334155' : '#cbd5e1' }]}
                      >
                        <Text style={{ fontSize: 13, marginRight: 4 }}>🔗</Text>
                        <Text style={[styles.sharePostText, { color: colors.primary }]}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
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

      {/* Full-Screen Story Viewer Modal */}
      {activeStory && (
        <Modal visible={true} transparent={false} animationType="fade" onRequestClose={() => setActiveStory(null)}>
          <SafeAreaView style={[styles.storyViewerContainer, { backgroundColor: '#000000' }]}>
            <View style={styles.storyViewerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.storyRingSmall, { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>
                    {(activeStory.author_name || 'MD').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.storyViewerAuthor}>{activeStory.author_name || 'Official Media Desk'}</Text>
                  <Text style={styles.storyViewerSport}>{activeStory.sport_name || 'Tournament Highlight'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setActiveStory(null)} style={styles.storyCloseBtn}>
                <Text style={styles.storyCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.storyViewerBody}>
              <Image
                source={{ uri: activeStory.thumbnail_url || activeStory.media_url }}
                style={styles.storyViewerImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.storyViewerFooter}>
              {activeStory.caption ? (
                <Text style={styles.storyViewerCaption}>{activeStory.caption}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => handleReact(activeStory.id, 'fire')}
                  style={styles.storyViewerReactBtn}
                >
                  <Text style={{ fontSize: 16 }}>🔥 {activeStory.reactions?.fire || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleReact(activeStory.id, 'trophy')}
                  style={styles.storyViewerReactBtn}
                >
                  <Text style={{ fontSize: 16 }}>🏆 {activeStory.reactions?.trophy || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSharePost(activeStory)}
                  style={[styles.storyViewerReactBtn, { flex: 1, backgroundColor: '#2563eb' }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>🔗 Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}
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
  storiesContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  storiesScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyBubble: {
    alignItems: 'center',
    width: 64,
  },
  storyRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#3b82f6',
    padding: 2,
    position: 'relative',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  storyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#2563eb',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  storyLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  feedContainer: {
    gap: 14,
  },
  feedCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  feedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#3b82f6',
  },
  feedAuthor: {
    fontSize: 13,
    fontWeight: '800',
  },
  feedMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  storyPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  storyPillText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '900',
  },
  feedCaption: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  feedMediaContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedMedia: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  playIconText: {
    color: '#ffffff',
    fontSize: 18,
    marginLeft: 3,
  },
  feedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  sharePostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sharePostText: {
    fontSize: 11,
    fontWeight: '800',
  },
  storyViewerContainer: {
    flex: 1,
  },
  storyViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  storyRingSmall: {
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  storyViewerAuthor: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  storyViewerSport: {
    color: '#94a3b8',
    fontSize: 10,
  },
  storyCloseBtn: {
    padding: 8,
  },
  storyCloseText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  storyViewerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyViewerImage: {
    width: '100%',
    height: '100%',
  },
  storyViewerFooter: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  storyViewerCaption: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  storyViewerReactBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
