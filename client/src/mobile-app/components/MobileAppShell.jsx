import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useMobileTheme } from '../contexts/MobileThemeContext.jsx';
import { useMobileOfflineSync } from '../hooks/useMobileOfflineSync.js';
import { WifiOff, Maximize2, Minimize2 } from 'lucide-react';

export default function MobileAppShell({ children }) {
  const { colors, isDark } = useMobileTheme();
  const { isOnline, pendingCount } = useMobileOfflineSync();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-start font-sans transition-colors duration-200"
      style={{ backgroundColor: isDark ? '#090d16' : '#e2e8f0' }}
    >
      {/* Desktop/Tablet Header Bar with Viewport Mode Switcher */}
      <div className="w-full max-w-md hidden sm:flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          FixtureGrid Mobile Web App
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
          title={isExpanded ? 'Switch to Phone View' : 'Expand to Full Screen'}
        >
          {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          <span>{isExpanded ? 'Phone Frame' : 'Full Screen'}</span>
        </button>
      </div>

      {/* Main Container: Phone Proportions or Expanded */}
      <div
        className={`w-full flex-1 flex flex-col relative overflow-hidden transition-all duration-300 ${
          isExpanded
            ? 'max-w-5xl my-0 sm:my-4 sm:rounded-2xl sm:shadow-2xl sm:border'
            : 'max-w-md my-0 sm:my-3 sm:rounded-3xl sm:shadow-2xl sm:border'
        }`}
        style={{
          backgroundColor: colors.background,
          borderColor: isDark ? '#334155' : '#cbd5e1',
          minHeight: '100vh',
          maxHeight: isExpanded ? 'none' : '100vh'
        }}
      >
        {/* Offline Alert Strip */}
        {!isOnline && (
          <div className="bg-rose-600 text-white text-xs font-bold py-1 px-3 flex items-center justify-between shadow-md z-50">
            <span className="flex items-center gap-1.5">
              <WifiOff size={13} />
              <span>Offline Mode Active — Changes queued locally</span>
            </span>
            {pendingCount > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                {pendingCount} Pending
              </span>
            )}
          </div>
        )}

        {/* Screen Content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
}
