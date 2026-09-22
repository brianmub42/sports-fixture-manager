import React from 'react';
import { useMobileTheme } from '../../contexts/MobileThemeContext';
import { useMobileOfflineSync } from '../../hooks/useMobileOfflineSync';

export default function MobileScorekeeperSync() {
  const { colors, isDark } = useMobileTheme();
  const {
    isOnline,
    pendingCount,
    isSyncing,
    syncProgress,
    queueHistory,
    triggerSync,
  } = useMobileOfflineSync();

  const conflictCount = queueHistory.filter((q) => q.status === 'conflict').length;
  const syncedCount = queueHistory.filter((q) => q.status === 'synced').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'synced':
        return colors.success || '#10b981';
      case 'conflict':
        return colors.danger || '#ef4444';
      default:
        return colors.warning || '#f59e0b';
    }
  };

  const getConflictDetails = (reasonStr) => {
    try {
      const data = JSON.parse(reasonStr);
      return `Conflict: Server has ${data.score_a || 0}-${data.score_b || 0} by ${data.submittedBy || 'Official'}`;
    } catch {
      return reasonStr || 'Conflict: Record already updated on server';
    }
  };

  return (
    <div style={{ padding: '16px', paddingBottom: '32px' }}>
      {/* Sync Control Header Card */}
      <div
        style={{
          backgroundColor: colors.card,
          borderRadius: '16px',
          padding: '20px',
          border: `1px solid ${colors.border}`,
          marginBottom: '16px',
          textAlign: 'center',
          boxShadow: isDark ? 'none' : '0 2px 6px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>☁️</div>
        <h3 style={{ fontSize: '16px', fontWeight: 800, color: colors.text, margin: '0 0 6px' }}>
          Offline Sync Console
        </h3>
        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 16px' }}>
          Queue status: <strong style={{ color: colors.warning }}>{pendingCount} pending</strong>,{' '}
          <strong style={{ color: colors.danger }}>{conflictCount} conflicted</strong>,{' '}
          <strong style={{ color: colors.success }}>{syncedCount} synced</strong>
        </p>

        {syncProgress && (
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: colors.primary,
              backgroundColor: `${colors.primary}15`,
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '14px',
            }}
          >
            {syncProgress}
          </div>
        )}

        <button
          onClick={triggerSync}
          disabled={isSyncing || !isOnline || pendingCount === 0}
          style={{
            width: '100%',
            backgroundColor: (!isOnline || isSyncing || pendingCount === 0) ? (isDark ? '#334155' : '#e2e8f0') : colors.primary,
            color: (!isOnline || isSyncing || pendingCount === 0) ? colors.textMuted : '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 800,
            cursor: (!isOnline || isSyncing || pendingCount === 0) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          {isSyncing ? (
            <>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
              <span>Syncing with Cloud...</span>
            </>
          ) : !isOnline ? (
            'Cannot Sync (Offline)'
          ) : pendingCount === 0 ? (
            '✓ All Changes Synced'
          ) : (
            `Force Sync Queue (${pendingCount} pending)`
          )}
        </button>
      </div>

      {/* Queue items list */}
      <h4 style={{ fontSize: '13px', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 4px 10px' }}>
        Local Submissions History
      </h4>

      {queueHistory.length === 0 ? (
        <div
          style={{
            backgroundColor: colors.card,
            borderRadius: '14px',
            padding: '40px 20px',
            textAlign: 'center',
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📂</div>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No submission history in local cache.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {queueHistory.map((item) => {
            const statusColor = getStatusColor(item.status);
            return (
              <div
                key={item.id || item.uuid}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: '14px',
                  padding: '14px 16px',
                  border: `1px solid ${colors.border}`,
                  boxShadow: isDark ? 'none' : '0 2px 4px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: colors.text }}>
                    Fixture #{item.fixture_id}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: `${statusColor}20`,
                      color: statusColor,
                    }}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '14px', fontWeight: 700, color: colors.text, marginBottom: '6px' }}>
                  Proposed Score: {item.score_a} - {item.score_b}
                </div>

                {item.status === 'conflict' && item.conflict_reason && (
                  <div
                    style={{
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
                      border: `1px solid ${colors.danger}40`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: colors.danger,
                      fontWeight: 600,
                      margin: '6px 0',
                    }}
                  >
                    {getConflictDetails(item.conflict_reason)}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: colors.textMuted }}>
                  <span style={{ fontFamily: 'monospace' }}>UUID: {String(item.uuid || '').slice(0, 8)}...</span>
                  <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
