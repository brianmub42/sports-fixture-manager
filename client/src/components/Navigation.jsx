import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, FolderKanban, Play, BarChart3, Settings, Trophy, Calendar, Activity, List, MapPin, Upload, Wand2, Network, Tv, LineChart, Award, ShieldCheck, Megaphone, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const categories = [
  {
    type: 'link',
    to: '/',
    label: 'Dashboard',
    icon: Trophy
  },
  {
    type: 'dropdown',
    label: 'Event Setup',
    icon: FolderKanban,
    links: [
      { to: '/teams', label: 'Teams', icon: MapPin },
      { to: '/generate', label: 'Generate', icon: Wand2, adminOnly: true },
      { to: '/upload', label: 'Upload', icon: Upload, adminOnly: true },
    ]
  },
  {
    type: 'dropdown',
    label: 'Match Center',
    icon: Play,
    links: [
      { to: '/live', label: 'Live Scores', icon: Activity },
      { to: '/fixtures', label: 'Tournament Fixtures', icon: Calendar },
      { to: '/athletics', label: 'Athletics & Aquatics', icon: Award },
      { to: '/brackets', label: 'Brackets', icon: Network },
    ]
  },
  {
    type: 'dropdown',
    label: 'Standings & Logs',
    icon: BarChart3,
    links: [
      { to: '/standings', label: 'Standings', icon: BarChart3 },
      { to: '/log', label: 'Log', icon: List },
      { to: '/reports', label: 'Tournament Reports', icon: FileText },
    ]
  },
  {
    type: 'link',
    to: '/analytics',
    label: 'Analytics',
    icon: LineChart
  },
  {
    type: 'dropdown',
    label: 'Displays & Media',
    icon: Tv,
    links: [
      { to: '/tv', label: 'TV Mode', icon: Tv },
      { to: '/media', label: 'Media & Adverts', icon: Megaphone, mediaOnly: true },
      { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
    ]
  }
];

export default function Navigation() {
  const { isAdmin, isMediaManager, user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => setOpenDropdown(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const toggleDropdown = (e, index) => {
    e.stopPropagation();
    setOpenDropdown(openDropdown === index ? null : index);
  };

  const isCategoryActive = (category) => {
    if (category.type === 'link') return false;
    return category.links.some(link => {
      if (link.to === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(link.to);
    });
  };

  return (
    <nav className="mb-6 relative z-30 flex justify-center">
      <div className="flex items-center gap-1.5 sm:gap-2.5 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/80 rounded-2xl shadow-lg shadow-gray-200/5 dark:shadow-black/40 overflow-x-auto sm:overflow-x-visible no-scrollbar max-w-full sm:max-w-max mx-auto">
        {/* Prominent Superadmin Console Button */}
        {isSuperadmin && (
          <button
            type="button"
            onClick={() => navigate('/superadmin')}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-black rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 transition-all cursor-pointer select-none ring-2 ring-purple-400/40 hover:scale-[1.02] active:scale-[0.98]"
            title="Open Superadmin Console"
          >
            <ShieldCheck size={16} className="shrink-0 text-purple-200" />
            <span className="whitespace-nowrap tracking-wide">Superadmin Console</span>
          </button>
        )}

        {categories.map((cat, idx) => {
          if (cat.superadminOnly && !isSuperadmin) return null;

          if (cat.type === 'link') {
            const CatIcon = cat.icon;
            const isActive = cat.to === '/' ? pathname === '/' : pathname.startsWith(cat.to);
            return (
              <NavLink
                key={idx}
                to={cat.to}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <CatIcon size={14} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
                <span className="whitespace-nowrap">{cat.label}</span>
              </NavLink>
            );
          }

          // Filter out link options based on role access
          const visibleLinks = cat.links.filter(link => {
            if (link.adminOnly && !isAdmin && !isSuperadmin) return false;
            if (link.mediaOnly && !isMediaManager && !isAdmin && !isSuperadmin) return false;
            return true;
          });
          if (visibleLinks.length === 0) return null;

          const isActive = isCategoryActive(cat);
          const isOpen = openDropdown === idx;
          const CatIcon = cat.icon;

          return (
            <div key={idx} className="relative group">
              <button
                type="button"
                onClick={(e) => toggleDropdown(e, idx)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <CatIcon size={14} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
                <span className="whitespace-nowrap">{cat.label}</span>
                <ChevronDown
                  size={13}
                  className={`text-gray-400 transition-transform duration-200 shrink-0 ${
                    isOpen ? 'rotate-180 text-blue-500' : 'group-hover:rotate-180'
                  }`}
                />
              </button>

              <div
                className={`absolute left-1/2 -translate-x-1/2 mt-1.5 w-52 bg-white/95 dark:bg-gray-905/95 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-55 py-2 px-1 transition-all duration-150 origin-top ${
                  isOpen
                    ? 'block opacity-100 scale-100'
                    : 'hidden sm:group-hover:block sm:group-hover:opacity-100'
                }`}
              >
                {visibleLinks.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    target={to === '/tv' ? '_blank' : undefined}
                    onClick={() => setOpenDropdown(null)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        isActive && to !== '/tv'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-850 hover:text-gray-900 dark:hover:text-gray-200'
                      }`
                    }
                  >
                    <Icon size={15} className="shrink-0 text-gray-400 dark:text-gray-500" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
