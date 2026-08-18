import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Trophy, Calendar, Activity, BarChart3, List, MapPin, Upload, Wand2, Settings, Network, Tv, LineChart, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const categories = [
  {
    label: 'Event Setup',
    links: [
      { to: '/teams', label: 'Teams', icon: MapPin },
      { to: '/generate', label: 'Generate', icon: Wand2, adminOnly: true },
      { to: '/upload', label: 'Upload', icon: Upload, adminOnly: true },
    ]
  },
  {
    label: 'Match Center',
    links: [
      { to: '/', label: 'Dashboard', icon: Trophy },
      { to: '/fixtures', label: 'Fixtures', icon: Calendar },
      { to: '/athletics', label: 'Athletics & Novelty', icon: Award },
      { to: '/brackets', label: 'Brackets', icon: Network },
    ]
  },
  {
    label: 'Standings & Logs',
    links: [
      { to: '/live', label: 'Live Scores', icon: Activity },
      { to: '/standings', label: 'Standings', icon: BarChart3 },
      { to: '/log', label: 'Log', icon: List },
      { to: '/analytics', label: 'Analytics', icon: LineChart },
    ]
  },
  {
    label: 'Settings & Displays',
    links: [
      { to: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
      { to: '/tv', label: 'TV Mode', icon: Tv },
    ]
  }
];

export default function Navigation() {
  const { isAdmin } = useAuth();
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
    <nav className="mb-6 relative z-50">
      <div className="flex items-center justify-start gap-1 sm:gap-2 p-1.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-x-auto sm:overflow-x-visible no-scrollbar">
        {categories.map((cat, idx) => {
          // Filter out link options that require admin access
          const visibleLinks = cat.links.filter(link => !link.adminOnly || isAdmin);
          if (visibleLinks.length === 0) return null;

          const isActive = isCategoryActive(cat);
          const isOpen = openDropdown === idx;

          return (
            <div key={idx} className="relative group">
              <button
                type="button"
                onClick={(e) => toggleDropdown(e, idx)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>{cat.label}</span>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-500' : 'group-hover:rotate-180'
                  }`}
                />
              </button>

              <div
                className={`absolute left-0 mt-1.5 w-52 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-55 py-1.5 transition-all duration-150 origin-top-left ${
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
                      `flex items-center gap-2.5 px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all ${
                        isActive && to !== '/tv'
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-55 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                      }`
                    }
                  >
                    <Icon size={16} className="shrink-0 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
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
