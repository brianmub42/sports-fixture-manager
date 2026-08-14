import { NavLink } from 'react-router-dom';
import { Trophy, Calendar, Activity, BarChart3, List, MapPin, Upload, Wand2, Settings, Network, Tv, LineChart, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const links = [
  { to: '/', label: 'Dashboard', icon: Trophy },
  { to: '/fixtures', label: 'Fixtures', icon: Calendar },
  { to: '/athletics', label: 'Athletics & Novelty', icon: Award },
  { to: '/brackets', label: 'Brackets', icon: Network },
  { to: '/live', label: 'Live Scores', icon: Activity },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/log', label: 'Log', icon: List },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
  { to: '/teams', label: 'Teams', icon: MapPin },
  { to: '/generate', label: 'Generate', icon: Wand2 },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/tv', label: 'TV Mode', icon: Tv },
];

export default function Navigation() {
  const { isAdmin } = useAuth();

  const filteredLinks = links.filter(link => {
    if (['/generate', '/upload', '/settings'].includes(link.to)) {
      return isAdmin;
    }
    return true;
  });

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 mb-4 overflow-x-auto nav-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
      <div className="flex flex-nowrap gap-1 sm:gap-2 pb-1">
        {filteredLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            target={to === '/tv' ? '_blank' : undefined}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive && to !== '/tv'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            <Icon size={14} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

