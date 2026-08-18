import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navigation from './Navigation.jsx';
import SponsorsRibbon from './SponsorsRibbon.jsx';
import { useSettings } from '../hooks/useFixtures.js';
import { useLiveUpdates } from '../hooks/useLiveUpdates.js';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, Key, UserCheck, Settings as SettingsIcon } from 'lucide-react';

export default function Layout() {
  const { data: settings } = useSettings();
  const { clearOrg } = useOrganization();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Enable global real-time updates for all pages within the layout
  useLiveUpdates();

  const orgName = settings?.org_name || 'FixtureGrid Workspace';
  const eventTitle = settings?.event_title || 'Tournament Championship';
  const teamsCount = settings?.teams_count !== undefined ? settings.teams_count : (settings?.districts_count !== undefined ? settings.districts_count : 6);
  const sportsCount = settings?.sports_count !== undefined ? settings.sports_count : 5;

  const isBypassed = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('bypass_billing') === 'true';
  const isSuspended = settings?.billing?.status === 'suspended' && !isBypassed;
  const isBillingLow = settings?.billing?.is_low_credit && !isBypassed && settings?.billing?.status !== 'suspended';

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-16">
      <header className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-gray-200 dark:border-gray-800 flex-wrap gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{orgName}</h1>
          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 truncate">
            {eventTitle} · {teamsCount} {teamsCount === 1 ? 'Team' : 'Teams'} · {sportsCount} {sportsCount === 1 ? 'Sport' : 'Sports'}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                Logged in: <strong className="text-gray-800 dark:text-gray-200">{user.name}</strong> ({user.role})
              </span>
              {user.role === 'admin' && (
                <button 
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  title="Workspace Settings"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              )}
              <button 
                onClick={logout} 
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-950/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              Official Access
            </button>
          )}

          <button 
            onClick={clearOrg} 
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            title="Switch Workspace"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Switch Workspace</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <LiveClock />
          </div>
        </div>
      </header>
      <Navigation />

      {user?.role === 'admin' && isBillingLow && (
        <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-400 rounded-xl flex items-center justify-between gap-4 flex-wrap mt-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span>
              <strong>Billing Alert:</strong> Workspace term subscription is expiring in {settings?.billing?.minutes_remaining} minute{settings?.billing?.minutes_remaining !== 1 ? 's' : ''}. Please renew to prevent lockout.
            </span>
          </div>
        </div>
      )}

      {user?.role === 'admin' && !settings?.points_allocation && (
        <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 rounded-xl flex items-center justify-between gap-4 flex-wrap mt-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-bounce"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span>
              <strong>Attention Required:</strong> Points allocation and positions have not been configured yet. Please configure them from the onset before fixtures kick off.
            </span>
          </div>
          <button 
            onClick={() => navigate('/settings')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer shadow transition-all duration-200"
          >
            Configure Now
          </button>
        </div>
      )}

      <main className="mt-4">
        {isSuspended ? (
          <div className="my-12 bg-slate-900/50 dark:bg-gray-900 border border-slate-800 dark:border-gray-800 p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6 text-center max-w-lg mx-auto animate-pulse">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center animate-bounce">
              <SettingsIcon className="w-8 h-8" />
            </div>
            
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Workspace Suspended</h2>
              <p className="text-slate-500 dark:text-gray-400 text-sm leading-relaxed">
                Your tournament workspace subscription has expired (expired {Math.abs(settings?.billing?.minutes_remaining || 0)} minutes ago). Operational read/write capabilities are locked.
              </p>
            </div>
            
            <div className="w-full flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  sessionStorage.setItem('bypass_billing', 'true');
                  window.location.search = '?bypassBilling=true';
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/35 cursor-pointer text-sm"
              >
                Bypass Lock (Test Mode)
              </button>
              <button
                onClick={clearOrg}
                className="px-6 py-3 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all cursor-pointer text-sm"
              >
                Switch Workspace
              </button>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <SponsorsRibbon />
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
}

