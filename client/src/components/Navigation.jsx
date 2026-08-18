import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, FolderKanban, Play, BarChart3, Settings, Trophy, Calendar, Activity, List, MapPin, Upload, Wand2, Network, Tv, LineChart, Award, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const categories = [
  {
    label: 'Event Setup',
    icon: FolderKanban,
    links: [
      { to: '/teams', label: 'Teams', icon: MapPin },
      { to: '/generate', label: 'Generate', icon: Wand2, adminOnly: true },
      { to: '/upload', label: 'Upload', icon: Upload, adminOnly: true },
    ]
  },
  {
    label: 'Match Center',
    icon: Play,
    links: [
      { to: '/', label: 'Dashboard', icon: Trophy },
      { to: '/fixtures', label: 'Fixtures', icon: Calendar },
      { to: '/athletics', label: 'Athletics & Novelty', icon: Award },
      { to: '/brackets', label: 'Brackets', icon: Network },
    ]
  },
  {
    label: 'Standings & Logs',
    icon: BarChart3,
    links: [
      { to: '/live', label: 'Live Scores', icon: Activity },
      { to: '/standings', label: 'Standings', icon: BarChart3 },
      { to: '/log', label: 'Log', icon: List },
      { to: '/analytics', label: 'Analytics', icon: LineChart },
    ]
  },
  {
    label: 'Settings & Displays',
    icon: Settings,
    links: [
      { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
      { to: '/tv', label: 'TV Mode', icon: Tv },
    ]
  },
  {
    label: 'Superadmin',
    icon: ShieldCheck,
    superadminOnly: true,
    links: [
      { to: '/superadmin', label: 'Superadmin Console', icon: ShieldCheck }
    ]
  }
];

export default function Navigation() {
  const { isAdmin, user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const { pathname } = useLocation();
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
    return category.links.some(link => {
      if (link.to === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(link.to);
    });
  };

  return (
    <nav className="mb-6 relative z-50 flex justify-center">
      <div className="flex items-center gap-1.5 sm:gap-2.5 p-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/80 rounded-2xl shadow-lg shadow-gray-200/5 dark:shadow-black/40 overflow-x-auto sm:overflow-x-visible no-scrollbar max-w-full sm:max-w-max mx-auto">
        {categories.map((cat, idx) => {
          if (cat.superadminOnly && !isSuperadmin) return null;

          // Filter out link options that require admin access
          const visibleLinks = cat.links.filter(link => !link.adminOnly || isAdmin || isSuperadmin);
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
