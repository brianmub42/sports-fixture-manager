import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useMobileTheme } from '../../contexts/MobileThemeContext';
import { useMobileAuth } from '../../contexts/MobileAuthContext';
import {
  getOfflineDb,
  cacheEventData,
  clearSyncedQueueHistory,
} from '../../services/mobileOfflineDb';

export default function MobileScorekeeperSettings() {
  const { colors, isDark } = useMobileTheme();
  const { user, orgSlug, token, logout } = useMobileAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [dbStats, setDbStats] = useState({
    fixtures: 0,
    teams: 0,
    pending: 0,
    history: 0,
  });

  const loadDbStats = async () => {
    try {
      const db = await getOfflineDb();
      const fixturesCount = await db.count('fixtures');
      const teamsCount = await db.count('teams');
      const allQueue = await db.getAll('sync_queue');
      const pendingCount = allQueue.filter((q) => q.status === 'pending_sync').length;
      const historyCount = allQueue.filter((q) => q.status !== 'pending_sync').length;

      setDbStats({
        fixtures: fixturesCount,
        teams: teamsCount,
        pending: pendingCount,
        history: historyCount,
      });
    } catch (err) {
      console.warn('Failed to load local DB stats:', err);
    }
  };

  useEffect(() => {
    loadDbStats();
  }, []);

  const handleReDownload = async () => {
    if (!navigator.onLine) {
      alert('You must be online to synchronize database metadata with the server.');
      return;
    }

    setLoading(true);
    setFeedbackMsg('');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = orgSlug ? { orgSlug } : {};

      const [fixRes, teamsRes, sportsRes] = await Promise.all([
        axios.get('/api/fixtures', { headers, params }),
        axios.get('/api/teams', { headers, params }),
        axios.get('/api/sports', { headers, params }),
      ]);

      await cacheEventData(
        Array.isArray(fixRes.data) ? fixRes.data : [],
        Array.isArray(teamsRes.data) ? teamsRes.data : [],
        Array.isArray(sportsRes.data) ? sportsRes.data : []
      );

      await loadDbStats();
      setFeedbackMsg('✓ Database metadata successfully refreshed from server!');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      alert('Refresh failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all synced items from local history? Pending items will not be removed.')) {
      try {
        await clearSyncedQueueHistory();
        await loadDbStats();
        setFeedbackMsg('✓ Local sync history cleared.');
        setTimeout(() => setFeedbackMsg(''), 3000);
      } catch (err) {
        alert('Failed to clear sync history: ' + err.message);
      }
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out of this scorekeeper session?')) {
      logout();
      navigate('/app/login');
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '36px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {feedbackMsg && (
        <div
          style={{
            backgroundColor: `${colors.success}20`,
            border: `1px solid ${colors.success}`,
            color: colors.success,
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '13px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {feedbackMsg}
        </div>
      )}

      {/* Authenticated session card */}
      <div
        style={{
          backgroundColor: colors.card,
          borderRadius: '16px',
          padding: '18px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: '10px',
            marginBottom: '12px',
          }}
        >
          👤 Authenticated Session
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}40`, fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Name</span>
          <span style={{ color: colors.text, fontWeight: 700 }}>{user?.name || 'Scorekeeper'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}40`, fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Email</span>
          <span style={{ color: colors.text, fontWeight: 700 }}>{user?.email || 'N/A'}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}40`, fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Role</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: `${colors.primary}20`,
              color: colors.primary,
            }}
          >
            {(user?.role || 'scorekeeper').toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Workspace</span>
          <span style={{ color: colors.text, fontWeight: 700 }}>{orgSlug || 'default'}</span>
        </div>
      </div>

      {/* Database stats card */}
      <div
        style={{
          backgroundColor: colors.card,
          borderRadius: '16px',
          padding: '18px',
          border: `1px solid ${colors.border}`,
          boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: '10px',
            marginBottom: '12px',
          }}
        >
          📊 Offline Storage Stats (IndexedDB)
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}40`, fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Fixtures Cached</span>
          <span style={{ color: colors.text, fontWeight: 800 }}>{dbStats.fixtures}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}40`, fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Teams Cached</span>
          <span style={{ color: colors.text, fontWeight: 800 }}>{dbStats.teams}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colors.border}40`, fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Pending In Sync Queue</span>
          <span style={{ color: dbStats.pending > 0 ? colors.warning : colors.text, fontWeight: 800 }}>
            {dbStats.pending}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>Sync Log History</span>
          <span style={{ color: colors.text, fontWeight: 800 }}>{dbStats.history}</span>
        </div>
      </div>

      {/* Maintenance actions card */}
      <div
        style={{
          backgroundColor: colors.card,
          borderRadius: '16px',
          padding: '18px',
          border: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: colors.primary,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: '10px',
            marginBottom: '4px',
          }}
        >
          🛠️ Cache Maintenance
        </div>

        <button
          onClick={handleReDownload}
          disabled={loading}
          style={{
            backgroundColor: isDark ? '#334155' : '#f1f5f9',
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {loading ? 'Refreshing tournament data...' : '🔄 Re-download Tournament Metadata'}
        </button>

        <button
          onClick={handleClearHistory}
          style={{
            backgroundColor: isDark ? '#334155' : '#f1f5f9',
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          🧹 Clear Synced History
        </button>
      </div>

      {/* Logout button */}
      <button
        onClick={handleLogout}
        style={{
          backgroundColor: isDark ? '#450a0a' : '#fee2e2',
          color: colors.danger,
          border: `1px solid ${colors.danger}40`,
          borderRadius: '14px',
          padding: '14px',
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          marginTop: '6px',
          textAlign: 'center',
        }}
      >
        Sign Out of Console
      </button>
    </div>
  );
}
