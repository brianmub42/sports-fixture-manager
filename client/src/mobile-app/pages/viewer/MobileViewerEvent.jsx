import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { useMobileTheme, MobileThemeToggle } from '../../contexts/MobileThemeContext';

export default function MobileViewerEvent() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const { colors, isDark } = useMobileTheme();

  const [activeTab, setActiveTab] = useState('log');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventDetails, setEventDetails] = useState(null);
  const [logStandings, setLogStandings] = useState([]);
  const [sportsStandings, setSportsStandings] = useState({});
  const [fixtures, setFixtures] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [followedEntity, setFollowedEntity] = useState(null);
  const [pushNotice, setPushNotice] = useState('');

  // Load followed entity from localStorage
  useEffect(() => {
    if (!eventSlug) return;
    try {
      const saved = localStorage.getItem(`mobile_follow_${eventSlug}`);
      if (saved) {
        setFollowedEntity(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to read follow preference:', e);
    }
  }, [eventSlug]);

  const followTeam = async (team) => {
    const entity = { type: 'team', id: team.id, name: team.name, color: team.color };
    setFollowedEntity(entity);
    try {
      localStorage.setItem(`mobile_follow_${eventSlug}`, JSON.stringify(entity));
    } catch (e) {}

    // Check browser notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setPushNotice(`🔔 Live push notifications active for ${team.name}`);
            setTimeout(() => setPushNotice(''), 4000);
          }
        } catch (e) {
          console.warn('Notification permission error:', e);
        }
      } else if (Notification.permission === 'granted') {
        setPushNotice(`🔔 Following ${team.name}`);
        setTimeout(() => setPushNotice(''), 3000);
      }
    }
  };

  const unfollowTeam = () => {
    setFollowedEntity(null);
    try {
      localStorage.removeItem(`mobile_follow_${eventSlug}`);
    } catch (e) {}
    setPushNotice('🔕 Alert preference removed');
    setTimeout(() => setPushNotice(''), 3000);
  };

  const fetchPublicData = async () => {
    try {
      const [infoRes, logRes, fixRes] = await Promise.all([
        axios.get(`/api/public/events/${eventSlug}`),
        axios.get(`/api/public/events/${eventSlug}/standings`),
        axios.get(`/api/public/events/${eventSlug}/fixtures`),
      ]);

      setEventDetails(infoRes.data);
      setLogStandings(logRes.data?.log || logRes.data || []);
      setSportsStandings(logRes.data?.sports || {});
      setFixtures(fixRes.data || []);

      // Latest results
      try {
        const latestRes = await axios.get(`/api/public/events/${eventSlug}/latest-result`);
        if (latestRes.data?.latestResult) {
          setLatestResult(latestRes.data.latestResult);
        }
      } catch (e) {}
    } catch (err) {
      console.error('[Spectator API Error]:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPublicData();

    // Establish WebSocket Connection
    const socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('join-tenant', eventSlug);
      socket.emit('join-event', { tenantSlug: eventSlug, eventId: 'all' });
    });

    socket.on('score-updated', (data) => {
      fetchPublicData();
      // Check if followed team is involved in update
      if (followedEntity && data) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`FixtureGrid: Score Update!`, {
            body: `Score update posted in ${eventDetails?.name || 'Tournament'}`,
            icon: '/favicon.ico',
          });
        }
      }
    });

    socket.on('eventResultsPublished', (payload) => {
      setLatestResult(payload);
      fetchPublicData();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`FixtureGrid: Results Published!`, {
          body: `${payload.eventName}: Official results are now in!`,
          icon: '/favicon.ico',
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [eventSlug]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPublicData();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: colors.textMuted }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontSize: '15px', fontWeight: 700 }}>Fetching live tournament standings...</div>
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <h2 style={{ color: colors.danger, fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>
          Event Not Found
        </h2>
        <p style={{ color: colors.textMuted, fontSize: '14px', margin: '0 0 24px' }}>
          The tournament code "{eventSlug}" did not match any active event.
        </p>
        <button
          onClick={() => navigate('/app/viewer')}
          style={{
            backgroundColor: colors.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Try Another Code
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '36px', boxSizing: 'border-box' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 16px',
          backgroundColor: colors.headerBg,
          borderBottom: `1px solid ${colors.headerBorder}`,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <button
          onClick={() => navigate('/app/login')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.primary,
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Exit
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px', minWidth: 0 }}>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: colors.text,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {eventDetails.name || 'Tournament'}
          </h2>
          <div
            style={{
              fontSize: '11px',
              color: colors.textMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Hosted by {eventDetails.school_name}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MobileThemeToggle compact={true} />
          <span
            style={{
              backgroundColor: '#10b98120',
              color: '#10b981',
              fontSize: '10px',
              fontWeight: 900,
              padding: '3px 8px',
              borderRadius: '12px',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            LIVE
          </span>
        </div>
      </div>

      {/* Notification Toast */}
      {pushNotice && (
        <div
          style={{
            backgroundColor: isDark ? '#1e293b' : '#eff6ff',
            border: `1px solid ${colors.primary}60`,
            color: colors.primary,
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'center',
            padding: '8px 16px',
          }}
        >
          {pushNotice}
        </div>
      )}

      {/* Opt-In Notification Follow Bar */}
      <div
        style={{
          margin: '12px 14px',
          padding: '12px 14px',
          borderRadius: '14px',
          backgroundColor: colors.card,
          border: `1px solid ${colors.border}`,
          boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                backgroundColor: followedEntity ? `${colors.primary}25` : (isDark ? '#334155' : '#e2e8f0'),
                flexShrink: 0,
              }}
            >
              {followedEntity ? '🔔' : '🔕'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: colors.text }}>
                  {followedEntity ? `Following ${followedEntity.name}` : 'Live Alerts'}
                </span>
                {followedEntity && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 900,
                      color: '#10b981',
                      backgroundColor: '#10b98120',
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>
              <p style={{ fontSize: '11px', color: colors.textMuted, margin: '2px 0 0' }}>
                {followedEntity ? 'Instant notifications for match scores' : 'Follow a house or team for live score alerts'}
              </p>
            </div>
          </div>

          {followedEntity && (
            <button
              onClick={unfollowTeam}
              style={{
                background: 'none',
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                color: colors.textMuted,
                cursor: 'pointer',
              }}
            >
              Unfollow
            </button>
          )}
        </div>

        {!followedEntity && eventDetails?.teams && eventDetails.teams.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingTop: '10px',
              paddingBottom: '2px',
              scrollbarWidth: 'none',
            }}
          >
            {eventDetails.teams.map((t) => (
              <button
                key={t.id}
                onClick={() => followTeam(t)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: colors.text,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: t.color || colors.primary,
                  }}
                />
                + {t.code || t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Prominent Post-Event Results Spotlight Banner (Persistent) */}
      {latestResult && (
        <div
          style={{
            margin: '0 14px 12px',
            borderRadius: '16px',
            padding: '14px',
            backgroundColor: isDark ? '#1e1b4b' : '#fffbeb',
            border: '1px solid #f59e0b',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  letterSpacing: '0.04em',
                }}
              >
                ⚡ LATEST RESULT
              </span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: isDark ? '#cbd5e1' : '#78350f' }}>
                {latestResult.sportName} · {latestResult.category}
              </span>
            </div>
            <button
              onClick={() => setActiveTab(activeTab === 'latest' ? 'log' : 'latest')}
              style={{
                background: 'none',
                border: 'none',
                color: '#f59e0b',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              {activeTab === 'latest' ? 'View Standings' : 'View Full Card →'}
            </button>
          </div>

          <h3 style={{ fontSize: '15px', fontWeight: 800, color: colors.text, margin: '0 0 10px' }}>
            {latestResult.eventName}
          </h3>

          {latestResult.results && latestResult.results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {latestResult.results.slice(0, 3).map((r) => {
                const medal = r.placement === 1 ? '🥇' : r.placement === 2 ? '🥈' : '🥉';
                return (
                  <div
                    key={r.placement}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      border: `1px solid ${isDark ? '#334155' : '#fde68a'}`,
                      borderRadius: '10px',
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px' }}>{medal}</span>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: r.teamColor || colors.primary,
                        }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: colors.text }}>
                        {r.teamName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      {r.timeFormatted && (
                        <span style={{ color: colors.primary, fontWeight: 700 }}>
                          {r.timeFormatted}
                        </span>
                      )}
                      <span style={{ color: '#f59e0b', fontWeight: 800 }}>+{r.points} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.border}`,
          margin: '0 14px 14px',
          gap: '4px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {latestResult && (
          <button
            onClick={() => setActiveTab('latest')}
            style={{
              flex: 1,
              padding: '10px 8px',
              fontSize: '12px',
              fontWeight: 800,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'latest' ? '3px solid #f59e0b' : '3px solid transparent',
              color: activeTab === 'latest' ? '#f59e0b' : colors.textMuted,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ⚡ Result
          </button>
        )}
        <button
          onClick={() => setActiveTab('log')}
          style={{
            flex: 1,
            padding: '10px 8px',
            fontSize: '12px',
            fontWeight: 800,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'log' ? `3px solid ${colors.primary}` : '3px solid transparent',
            color: activeTab === 'log' ? colors.primary : colors.textMuted,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Championship
        </button>
        <button
          onClick={() => setActiveTab('sports')}
          style={{
            flex: 1,
            padding: '10px 8px',
            fontSize: '12px',
            fontWeight: 800,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sports' ? `3px solid ${colors.primary}` : '3px solid transparent',
            color: activeTab === 'sports' ? colors.primary : colors.textMuted,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Sports Table
        </button>
        <button
          onClick={() => setActiveTab('fixtures')}
          style={{
            flex: 1,
            padding: '10px 8px',
            fontSize: '12px',
            fontWeight: 800,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'fixtures' ? `3px solid ${colors.primary}` : '3px solid transparent',
            color: activeTab === 'fixtures' ? colors.primary : colors.textMuted,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Schedules
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ padding: '0 14px' }}>
        {/* Latest Result Tab */}
        {activeTab === 'latest' && latestResult && (
          <div
            style={{
              backgroundColor: colors.card,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  backgroundColor: '#10b98120',
                  color: '#10b981',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                OFFICIAL HEAT RESULT
              </span>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: colors.text, margin: '8px 0 2px' }}>
                {latestResult.eventName}
              </h2>
              <div style={{ fontSize: '12px', color: colors.textMuted }}>
                {latestResult.sportName} · {latestResult.category} {latestResult.venueName ? `· 📍 ${latestResult.venueName}` : ''}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {latestResult.results && latestResult.results.map((r) => {
                const isPodium = r.placement <= 3;
                const medal = r.placement === 1 ? '🥇 1st' : r.placement === 2 ? '🥈 2nd' : r.placement === 3 ? '🥉 3rd' : `#${r.placement}`;
                return (
                  <div
                    key={r.placement}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '10px',
                      border: `1px solid ${colors.border}`,
                      backgroundColor: isPodium
                        ? (isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb')
                        : (isDark ? '#0f172a' : '#f8fafc'),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: isPodium ? '#f59e0b' : colors.textMuted, minWidth: '46px' }}>
                        {medal}
                      </span>
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: r.teamColor || colors.primary,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: colors.text }}>
                          {r.teamName}
                        </div>
                        {r.teamCode && (
                          <div style={{ fontSize: '11px', color: colors.textMuted }}>{r.teamCode}</div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      {r.timeFormatted && (
                        <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text }}>
                          {r.timeFormatted}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', fontWeight: 800, color: colors.primary }}>
                        +{r.points} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Championship Log Tab */}
        {activeTab === 'log' && (
          <div
            style={{
              backgroundColor: colors.card,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: colors.text, margin: '0 0 14px' }}>
              Combined Championship Standings
            </h3>

            {logStandings.length === 0 ? (
              <p style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
                No championship standings computed yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {logStandings.map((team, idx) => {
                  const teamId = team.id || eventDetails?.teams?.find((t) => t.code === team.code)?.id;
                  const isFollowed = followedEntity && String(followedEntity.id) === String(teamId);
                  return (
                    <div
                      key={team.id || team.code || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: colors.textMuted, minWidth: '22px' }}>
                          {idx + 1}
                        </span>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: team.color || '#2563eb',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: colors.text,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {team.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: colors.primary }}>
                          {team.points || team.total || 0} pts
                        </span>
                        <button
                          onClick={() => (isFollowed ? unfollowTeam() : teamId && followTeam(team))}
                          style={{
                            backgroundColor: isFollowed ? '#10b981' : (isDark ? '#1e293b' : '#ffffff'),
                            color: isFollowed ? '#ffffff' : colors.text,
                            border: `1px solid ${isFollowed ? '#10b981' : colors.border}`,
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isFollowed ? 'Following' : '+ Follow'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Sports Table Tab */}
        {activeTab === 'sports' && (
          <div
            style={{
              backgroundColor: colors.card,
              borderRadius: '16px',
              padding: '16px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: colors.text, margin: '0 0 14px' }}>
              Sport Category Standings
            </h3>

            {Object.keys(sportsStandings).length === 0 ? (
              <p style={{ color: colors.textMuted, fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
                No category breakdown recorded yet.
              </p>
            ) : (
              Object.keys(sportsStandings).map((sportKey) => (
                <div key={sportKey} style={{ marginBottom: '18px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 800, color: colors.primary, margin: '0 0 8px' }}>
                    {sportKey}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(sportsStandings[sportKey] || []).map((t, idx) => (
                      <div
                        key={t.team_id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: colors.textMuted }}>{idx + 1}</span>
                          <span style={{ fontWeight: 700, color: colors.text }}>{t.team_name}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: colors.primary }}>
                          {t.points || t.total || 0} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Schedules / Fixtures Tab */}
        {activeTab === 'fixtures' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {fixtures.length === 0 ? (
              <div
                style={{
                  backgroundColor: colors.card,
                  borderRadius: '14px',
                  padding: '30px',
                  textAlign: 'center',
                  color: colors.textMuted,
                  border: `1px solid ${colors.border}`,
                }}
              >
                No fixtures scheduled yet.
              </div>
            ) : (
              fixtures.map((f) => (
                <div
                  key={f.id}
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: '14px',
                    padding: '14px',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: colors.textMuted, marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, color: colors.primary }}>{f.sport_name}</span>
                    <span>{f.round || 'Regular'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: colors.text, flex: 1 }}>
                      {f.team_a_name}
                    </div>
                    <div
                      style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                        fontWeight: 900,
                        fontSize: '14px',
                        color: colors.text,
                        margin: '0 8px',
                      }}
                    >
                      {f.status === 'completed' || f.status === 'draw'
                        ? `${f.score_a} - ${f.score_b}`
                        : 'vs'}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: colors.text, flex: 1, textAlign: 'right' }}>
                      {f.team_b_name}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '6px' }}>
                    📍 {f.venue_name || 'Main Arena'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
