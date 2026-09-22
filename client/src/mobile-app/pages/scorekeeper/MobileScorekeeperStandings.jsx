import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useMobileTheme } from '../../contexts/MobileThemeContext';
import { getCachedStandings, saveCachedStandings } from '../../services/mobileOfflineDb';
import { useMobileAuth } from '../../contexts/MobileAuthContext';

export default function MobileScorekeeperStandings() {
  const { colors, isDark } = useMobileTheme();
  const { token, orgSlug } = useMobileAuth();

  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStandings = async () => {
    const online = navigator.onLine;
    setIsOnline(online);

    if (!online) {
      const local = await getCachedStandings('overall');
      if (local && local.data) {
        setStandings(local.data);
        setLastUpdated(local.updatedAt);
      }
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await axios.get('/api/standings/log', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: orgSlug ? { orgSlug } : {},
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setStandings(data);
      await saveCachedStandings('overall', data);

      const local = await getCachedStandings('overall');
      if (local && local.updatedAt) {
        setLastUpdated(local.updatedAt);
      }
    } catch (err) {
      console.warn('[Mobile Standings] Network fetch failed, reading offline cache:', err.message);
      const local = await getCachedStandings('overall');
      if (local && local.data) {
        setStandings(local.data);
        setLastUpdated(local.updatedAt);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStandings();

    const handleOnline = () => {
      setIsOnline(true);
      fetchStandings();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStandings();
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Network banner */}
      <div
        style={{
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.04em',
          color: '#ffffff',
          backgroundColor: isOnline ? '#10b981' : '#f59e0b',
        }}
      >
        {isOnline ? '🟢 Live Standings' : '⚠️ Offline Mode (Showing cached rankings)'}
      </div>

      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 18px 10px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: colors.text, margin: 0 }}>
            Leaderboard
          </h2>
          <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0' }}>
            Overall championship medal and point standings
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            color: colors.primary,
            borderRadius: '10px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>🔄</span>
          {refreshing ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textMuted }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading tournament leaderboard...</div>
        </div>
      ) : standings.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            color: colors.textMuted,
            background: colors.card,
            margin: '16px',
            borderRadius: '16px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏆</div>
          <p style={{ fontSize: '14px', margin: '0 0 16px', fontWeight: 600 }}>No standings recorded yet.</p>
          <button
            onClick={handleRefresh}
            style={{
              background: colors.primary,
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tap to Refresh
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 16px' }}>
          {standings.map((item, index) => {
            const rank = index + 1;
            let rankColor = '#94a3b8';
            if (rank === 1) rankColor = '#fbbf24';
            if (rank === 2) rankColor = '#cbd5e1';
            if (rank === 3) rankColor = '#d97706';

            return (
              <div
                key={item.id || item.code || index}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: '16px',
                  padding: '14px',
                  border: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                {/* Rank Badge */}
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${rankColor}20`,
                    color: rankColor,
                    fontSize: '16px',
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {rank}
                </div>

                {/* Team Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: item.color || '#2563eb',
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: colors.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
                    {item.code || 'TEAM'}
                  </div>
                </div>

                {/* Medals Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 700, color: colors.text }}>
                    <span>🥇</span>
                    <span>{item.gold || 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 700, color: colors.text }}>
                    <span>🥈</span>
                    <span>{item.silver || 0}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 700, color: colors.text }}>
                    <span>🥉</span>
                    <span>{item.bronze || 0}</span>
                  </div>
                </div>

                {/* Points */}
                <div
                  style={{
                    backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                    borderRadius: '10px',
                    padding: '6px 10px',
                    textAlign: 'center',
                    minWidth: '52px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 900, color: colors.primary }}>
                    {item.total || 0}
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: colors.textMuted, letterSpacing: '0.04em' }}>
                    PTS
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cache footer */}
      {lastUpdated && (
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '11px', color: colors.textMuted }}>
          Last refreshed: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
}
