import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  HelpCircle, 
  X, 
  Search, 
  Compass, 
  LayoutDashboard, 
  Calendar, 
  Play, 
  Award, 
  Trophy, 
  BarChart3, 
  Users, 
  Upload, 
  Wand2, 
  Settings, 
  Activity, 
  GitMerge, 
  ShieldAlert,
  ArrowRight,
  BookOpen
} from 'lucide-react';

const PAGE_GUIDES = {
  '/': {
    title: 'Dashboard & Main Hub',
    desc: 'The central dashboard for the tournament workspace. Displays active live scores, overall championship standings log, medal tallies, and upcoming games.',
    icon: LayoutDashboard,
    role: 'Viewers & Admins',
    proTip: 'Hover over the overall points log to see points breakdowns per sport for each district.',
  },
  '/fixtures': {
    title: 'Tournament Fixtures',
    desc: 'Chronological timeline of all sports fixtures. You can filter fixtures by sport or status (upcoming, live, completed, draw).',
    icon: Calendar,
    role: 'Viewers & Admins',
    proTip: 'Use the filter chips at the top to quickly see matches happening today or specific sports.',
  },
  '/live': {
    title: 'Live Scores & Timer Control',
    desc: 'Real-time scoreboard for active games. Referees and administrators update scores, control game timers, and submit final results here.',
    icon: Play,
    role: 'Referees & Admins',
    proTip: 'Timers and score changes are synchronised instantly with all connected users via web sockets.',
  },
  '/standings': {
    title: 'Sport Standings',
    desc: 'View detailed points standings and league tables for individual sports (Soccer, Basketball, Volleyball, Tug of War) and athletics district metrics.',
    icon: Award,
    role: 'Viewers & Admins',
    proTip: 'Switch between sports tabs to review point structures and individual match summaries.',
  },
  '/log': {
    title: 'Overall Championship Log',
    desc: 'The overall tournament leaderboard. Points are allocated based on final rankings of teams in each sport according to the settings table.',
    icon: Trophy,
    role: 'Viewers & Admins',
    proTip: 'Configure the positions points matrix in Settings to compute the overall leaderboard points.',
  },
  '/analytics': {
    title: 'Insights & Analytics',
    desc: 'Deep-dive statistics highlighting highest scoring teams, total goals scored, and records across all points-based sports.',
    icon: BarChart3,
    role: 'Viewers & Admins',
    proTip: 'Use the dropdown filter to see analytical graphs tailored to specific sports.',
  },
  '/teams': {
    title: 'Participating Teams',
    desc: 'Directory of all registered districts. Click any team card to review player lists, coach designations, jersey numbers, and team colors.',
    icon: Users,
    role: 'Viewers & Admins',
    proTip: 'Administrators can add, edit, or remove players directly from a team’s roster card.',
  },
  '/upload': {
    title: 'Excel Bulk Fixtures Importer',
    desc: 'Administrative interface for bulk importing fixtures, district lists, and matches directly from standard Excel (.xlsx) templates.',
    icon: Upload,
    role: 'Admins Only',
    proTip: 'Download the sample Excel template first to ensure the columns match perfectly before uploading.',
  },
  '/generate': {
    title: 'Draw & Schedule Generator',
    desc: 'Generate perfect single/double round-robins, group draws, playoffs, or athletics schedules by entering teams, dates, match durations, and venues.',
    icon: Wand2,
    role: 'Admins Only',
    proTip: 'Preview the schedule before saving to review estimated duration and venue conflict warnings.',
  },
  '/settings': {
    title: 'Workspace Settings',
    desc: 'Manage branding titles, district points mapping, pop receipt files, sponsors carousels, and sports/venues configurations.',
    icon: Settings,
    role: 'Admins Only',
    proTip: 'Upload sponsor logo images to display them in the rotating carousel footer on every page.',
  },
  '/athletics': {
    title: 'Athletics Event Manager',
    desc: 'Log and calculate placements (1st, 2nd, 3rd) and award championship points for individual athletics tracks, novelty runs, and field events.',
    icon: Activity,
    role: 'Admins & Referees',
    proTip: 'Points are allocated automatically based on final rankings and stored in the district results matrix.',
  },
  '/brackets': {
    title: 'Playoff Bracket Viewer',
    desc: 'Visual grid displaying single-elimination tournament progression from Quarter-finals and Semi-finals up to the Grand Finale.',
    icon: GitMerge,
    role: 'Viewers & Admins',
    proTip: 'Playoff draws can be auto-generated in the Generate page with 4 or 8 participating teams.',
  },
  '/superadmin': {
    title: 'Superadmin Dashboard',
    desc: 'System panel for eTechZim administrators to oversee all tenant organizations, credit balances, payment approvals, and database backups.',
    icon: ShieldAlert,
    role: 'Superadmin Only',
    proTip: 'Use this dashboard to review and approve uploaded Proof of Payment documents.',
  }
};

export default function HelpWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Reset search query when wizard is opened or closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const currentPath = location.pathname;
  const currentGuide = PAGE_GUIDES[currentPath] || PAGE_GUIDES['/'];

  // Search filter
  const filteredGuides = Object.entries(PAGE_GUIDES).filter(([path, data]) => {
    const query = searchQuery.toLowerCase();
    return (
      data.title.toLowerCase().includes(query) ||
      data.desc.toLowerCase().includes(query) ||
      data.role.toLowerCase().includes(query) ||
      path.toLowerCase().includes(query)
    );
  });

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] select-none font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-12 h-12 rounded-full text-white shadow-lg bg-gradient-to-tr from-purple-650 via-indigo-650 to-indigo-550 hover:from-purple-550 hover:to-indigo-450 focus:outline-none transition-all duration-300 transform hover:scale-110 active:scale-95 group relative border border-white/10"
          title="Open Help & Navigation Wizard"
        >
          <HelpCircle className="w-6 h-6 animate-pulse" />
          <span className="absolute right-14 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-slate-800 backdrop-blur-sm">
            Help & Navigation
          </span>
        </button>
      )}

      {/* Expanded Wizard Dialog */}
      {isOpen && (
        <div className="w-[350px] sm:w-[380px] max-h-[85vh] rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-purple-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 backdrop-blur-md">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5" />
              <div>
                <h3 className="text-sm font-bold tracking-tight">FixtureGrid Helper</h3>
                <p className="text-[10px] opacity-80 font-medium">Interactive Guide & Navigation</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors focus:outline-none"
              title="Close Wizard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-gray-100 dark:border-slate-800/80 bg-gray-50/55 dark:bg-slate-900/40 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages or features..."
                className="w-full pl-8 pr-4 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:focus:ring-purple-600 transition-all font-medium placeholder-gray-400 dark:placeholder-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-4 flex-1 space-y-4 max-h-[50vh]">
            {!searchQuery ? (
              // Current Page Highlight
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Current Page Guide</span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-50/55 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/20 shadow-sm space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {React.createElement(currentGuide.icon, { className: 'w-4 h-4' })}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">{currentGuide.title}</h4>
                      <span className="inline-block text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded mt-0.5 border border-indigo-100/30">
                        {currentGuide.role}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-550 dark:text-gray-300 leading-relaxed font-normal">
                    {currentGuide.desc}
                  </p>
                  {currentGuide.proTip && (
                    <div className="text-[10px] bg-white dark:bg-slate-950 border border-purple-100/35 dark:border-slate-800/80 p-2.5 rounded-lg text-gray-650 dark:text-gray-400 font-medium">
                      💡 <strong className="text-purple-600 dark:text-purple-400 font-bold">Pro Tip:</strong> {currentGuide.proTip}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Search Results
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Matches Found ({filteredGuides.length})
                </p>
                {filteredGuides.length > 0 ? (
                  <div className="space-y-2">
                    {filteredGuides.map(([path, data]) => (
                      <div
                        key={path}
                        onClick={() => handleNavigate(path)}
                        className="p-3 rounded-xl border border-gray-100 dark:border-slate-800/80 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 cursor-pointer transition-all duration-200 shadow-sm flex items-start gap-3 group"
                      >
                        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 shrink-0 group-hover:bg-purple-100 group-hover:text-purple-600 dark:group-hover:bg-purple-950 dark:group-hover:text-purple-400 transition-colors">
                          {React.createElement(data.icon, { className: 'w-4 h-4' })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-150 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                              {data.title}
                            </h4>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-purple-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 shrink-0" />
                          </div>
                          <p className="text-[10px] text-gray-450 dark:text-gray-450 mt-0.5 leading-relaxed line-clamp-2">
                            {data.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-gray-400 font-medium">
                    No matching pages or guides found.
                  </div>
                )}
              </div>
            )}

            {/* Quick Navigation Panel */}
            <div className="space-y-2.5 pt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PAGE_GUIDES).map(([path, data]) => {
                  const isActive = currentPath === path;
                  return (
                    <button
                      key={path}
                      onClick={() => handleNavigate(path)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left border text-[11px] font-bold transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-500 text-white border-purple-500 shadow-md shadow-purple-500/10'
                          : 'bg-white dark:bg-slate-950 border-gray-150 dark:border-slate-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-900 hover:border-gray-300'
                      }`}
                    >
                      <div className={`p-1 rounded shrink-0 ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-gray-400'
                      }`}>
                        {React.createElement(data.icon, { className: 'w-3 h-3' })}
                      </div>
                      <span className="truncate">{data.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-850/80 bg-gray-50 dark:bg-slate-900/60 text-[9px] text-gray-400 dark:text-gray-500 text-center font-medium shrink-0">
            eTechZim Tournament Engine v1.3.0 · Built with ❤️
          </div>
        </div>
      )}
    </div>
  );
}
