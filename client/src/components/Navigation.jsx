import { NavLink } from 'react-router-dom';
import { Trophy, Calendar, Activity, BarChart3, List, MapPin, Upload, Wand2, Settings, Network } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: Trophy },
  { to: '/fixtures', label: 'Fixtures', icon: Calendar },
  { to: '/brackets', label: 'Brackets', icon: Network },
  { to: '/live', label: 'Live Scores', icon: Activity },
  { to: '/standings', label: 'Standings', icon: BarChart3 },
  { to: '/log', label: 'Log', icon: List },
  { to: '/districts', label: 'Districts', icon: MapPin },
  { to: '/generate', label: 'Generate', icon: Wand2 },
  { to: '/upload', label: 'Upload', icon: Upload },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Navigation() {
  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 mb-4 overflow-x-auto nav-scroll">
      <div className="flex gap-0.5 sm:gap-1 min-w-max">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`
            }
          >
            <Icon size={14} className="shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

