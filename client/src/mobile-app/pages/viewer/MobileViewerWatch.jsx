import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileTheme, MobileThemeToggle } from '../../contexts/MobileThemeContext';

export default function MobileViewerWatch() {
  const navigate = useNavigate();
  const { colors, isDark } = useMobileTheme();
  const [slug, setSlug] = useState('');

  const handleWatch = (e) => {
    if (e) e.preventDefault();
    const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    if (!formattedSlug) {
      alert('Please enter a valid tournament slug or code.');
      return;
    }
    navigate(`/app/viewer/${formattedSlug}`);
  };

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Bar with Theme Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 10,
        }}
      >
        <MobileThemeToggle compact={true} />
      </div>

      <div
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: '1px',
          borderStyle: 'solid',
          borderRadius: '24px',
          padding: '30px 24px',
          boxShadow: isDark ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.06)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', fontSize: '36px', marginBottom: '10px' }}>
          👀
        </div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            textAlign: 'center',
            color: colors.success || '#10b981',
            margin: '0 0 6px',
          }}
        >
          Spectator Watch
        </h1>
        <p
          style={{
            fontSize: '13px',
            textAlign: 'center',
            color: colors.textMuted,
            margin: '0 0 28px',
            lineHeight: 1.5,
          }}
        >
          Enter a tournament slug to view live leaderboards, schedules, and instant results.
        </p>

        <form onSubmit={handleWatch}>
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: colors.textMuted,
                marginBottom: '8px',
              }}
            >
              Tournament Slug
            </label>
            <input
              type="text"
              placeholder="e.g. bible-temple-primary-school"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: `1px solid ${colors.inputBorder || colors.border}`,
                backgroundColor: colors.inputBg || (isDark ? '#0f172a' : '#f8fafc'),
                color: colors.text,
                fontSize: '15px',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              backgroundColor: colors.success || '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
            }}
          >
            Watch Live Leaderboard →
          </button>
        </form>

        <button
          onClick={() => navigate('/app/login')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: '22px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          ← Go Back to Login
        </button>
      </div>
    </div>
  );
}
