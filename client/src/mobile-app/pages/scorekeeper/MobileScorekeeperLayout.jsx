import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useMobileTheme, MobileThemeToggle } from '../../contexts/MobileThemeContext.jsx';
import { useMobileOfflineSync } from '../../hooks/useMobileOfflineSync.js';
import { useMobileAuth } from '../../contexts/MobileAuthContext.jsx';

export default function MobileScorekeeperLayout() {
  const { colors, isDark } = useMobileTheme();
  const { isOnline, pendingCount } = useMobileOfflineSync();
  const { user } = useMobileAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navTabs = [
    {
      key: 'fixtures',
      path: '/app/scorekeeper/fixtures',
      label: 'Fixtures',
      icon: '📋'
    },
    {
      key: 'standings',
      path: '/app/scorekeeper/standings',
      label: 'Leaderboard',
      icon: '🏆',
      hide: user?.role === 'scorekeeper' // matches mobile rule where pure scorekeeper focus is fixtures
    },
    {
      key: 'sync',
      path: '/app/scorekeeper/sync',
      label: 'Sync Queue',
      icon: '☁',
      badge: pendingCount > 0 ? pendingCount : null
    },
    {
      key: 'settings',
      path: '/app/scorekeeper/settings',
      label: 'Settings',
      icon: '⚙'
    }
  ].filter(tab => !tab.hide);

  // Dynamic header title based on active tab
  const getHeaderTitle = () => {
    if (location.pathname.includes('/standings')) return 'Overall Standings';
    if (location.pathname.includes('/sync')) return 'Offline Sync Queue';
    if (location.pathname.includes('/settings')) return 'Settings & Diagnostics';
    return 'Scorekeeper Console';
  };

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-screen relative"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* Top Header */}
      <header
        className="px-4 py-3 flex items-center justify-between border-b shrink-0 sticky top-0 z-40 backdrop-blur-md"
        style={{
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: colors.headerBorder
        }}
      >
        <div>
          <h1 className="text-sm font-black tracking-tight" style={{ color: colors.headerTint }}>
            {getHeaderTitle()}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
            />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: isOnline ? '#10b981' : '#ef4444' }}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MobileThemeToggle compact={true} />
        </div>
      </header>

      {/* Main Screen Outlet (scrollable area with bottom padding for fixed tab bar) */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Mobile Tab Bar */}
      <nav
        className="fixed bottom-0 inset-x-0 mx-auto max-w-md w-full border-t flex items-center justify-around z-40 px-2 py-1 shadow-lg"
        style={{
          backgroundColor: colors.tabBg,
          borderColor: colors.tabBorder,
          height: '54px'
        }}
      >
        {navTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-all relative cursor-pointer"
              style={{
                color: isActive ? colors.tabIconSelected : colors.tabIconDefault
              }}
            >
              <div className="relative text-base leading-none">
                <span>{tab.icon}</span>
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full px-1 min-w-[14px] text-center shadow">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 ${isActive ? 'font-black' : 'font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
