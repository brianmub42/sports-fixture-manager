import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navigation from './Navigation.jsx';
import SponsorsRibbon from './SponsorsRibbon.jsx';
import { useSettings } from '../hooks/useFixtures.js';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, Key, UserCheck } from 'lucide-react';

export default function Layout() {
  const { data: settings } = useSettings();
  const { clearOrg } = useOrganization();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const orgName = settings?.org_name || 'KALIFE 2026 Sports Day';
  const eventTitle = settings?.event_title || 'Inter-District Championship';
  const districtsCount = settings?.districts_count !== undefined ? settings.districts_count : 6;
  const sportsCount = settings?.sports_count !== undefined ? settings.sports_count : 5;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-16">
      <header className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-gray-200 dark:border-gray-800 flex-wrap gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-semibold truncate">{orgName}</h1>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
            {eventTitle} · {districtsCount} {districtsCount === 1 ? 'Team' : 'Teams'} · {sportsCount} {sportsCount === 1 ? 'Sport' : 'Sports'}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline-flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                Logged in: <strong className="text-gray-800 dark:text-gray-200">{user.name}</strong> ({user.role})
              </span>
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
      <main>
        <Outlet />
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

