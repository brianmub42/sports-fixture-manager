import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  RotateCw, 
  Repeat, 
  Users, 
  GitMerge, 
  Clock, 
  Target, 
  Check, 
  Sparkles, 
  Award, 
  HelpCircle,
  ArrowRight,
  BookOpen
} from 'lucide-react';

export const SCORING_FORMATS = [
  {
    key: 'single',
    title: 'Single Round-Robin',
    category: 'team',
    badge: 'Standard League',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    icon: RotateCw,
    iconColor: 'text-blue-500',
    borderColor: 'hover:border-blue-500/50',
    sports: ['Soccer', 'Basketball', 'Volleyball', 'Netball', 'Rugby'],
    summary: 'Every team plays against every other participating team exactly once.',
    howItWorks: [
      'Generates balanced rounds where each pair of teams meets one time.',
      'Venues and pitches cycle dynamically with clash detection.',
      'Fair, balanced fixture distribution suitable for round-robin tourneys.'
    ],
    pointsFormula: 'Win: 3 pts · Draw: 1 pt · Loss: 0 pts (customizable in Settings)',
    standingsRank: 'Sorted by Total Points → Goal Differential → Goals For → Head-to-Head.',
    requirement: 'Works best with 3 to 8 teams. Formula: N*(N-1)/2 matches total.'
  },
  {
    key: 'double',
    title: 'Double Round-Robin',
    category: 'team',
    badge: 'Home & Away League',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    icon: Repeat,
    iconColor: 'text-indigo-500',
    borderColor: 'hover:border-indigo-500/50',
    sports: ['Soccer Leagues', 'Premier Basketball', 'Long-term Tournaments'],
    summary: 'Every pair of teams plays against each other twice (Home and Away fixtures).',
    howItWorks: [
      'Two full legs of competition so neither team has home advantage.',
      'Rounds are divided into first leg and second leg schedules.',
      'Offers high competitive fairness for premier tournaments.'
    ],
    pointsFormula: 'Win: 3 pts · Draw: 1 pt · Loss: 0 pts',
    standingsRank: 'Points accumulator over both home and away legs.',
    requirement: 'Best for extended events. Generates double the fixtures of single round-robin.'
  },
  {
    key: 'group',
    title: 'Group Stage',
    category: 'team',
    badge: 'Tournament Groups',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: Users,
    iconColor: 'text-emerald-500',
    borderColor: 'hover:border-emerald-500/50',
    sports: ['World Cup Style', 'Schools Championship', 'Multi-District Meets'],
    summary: 'Teams are partitioned into distinct groups (e.g. Group A & B) with internal round-robin.',
    howItWorks: [
      'Teams only play rivals within their assigned group during group phase.',
      'Each group maintains its own separate standings table.',
      'Top seeds advance to crossover semi-finals or championship playoffs.'
    ],
    pointsFormula: 'Standard match points earned per group game (Win / Draw / Loss).',
    standingsRank: 'Separate group leaderboards determine qualified seeds.',
    requirement: 'Requires 6 or more teams (e.g. 2 groups of 3 or 4 teams).'
  },
  {
    key: 'playoff',
    title: 'Single Elimination Playoff',
    category: 'team',
    badge: 'Knockout Tree Bracket',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: GitMerge,
    iconColor: 'text-purple-500',
    borderColor: 'hover:border-purple-500/50',
    sports: ['Knockout Cups', 'Championship Finals', 'Semi-Finals & Final'],
    summary: 'Direct knockout progression. Winners advance to next round; losers are eliminated.',
    howItWorks: [
      'Progresses through Quarter-Finals → Semi-Finals → Grand Finale.',
      'Interactive visual bracket tree displays paths to championship.',
      'Draws can be seeded or randomized across participating districts.'
    ],
    pointsFormula: 'Winner advances; match cannot end in draw (decided by penalties/extra time).',
    standingsRank: 'Championship awarded to final match winner; runner-up to finalist.',
    requirement: 'Requires exactly 4 or 8 teams for a mathematically balanced knockout bracket.'
  },
  {
    key: 'placement',
    title: 'Placement-Based (Athletics & Aquatics)',
    category: 'individual',
    badge: 'Time & Heat Ranking',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Clock,
    iconColor: 'text-amber-500',
    borderColor: 'hover:border-amber-500/50',
    sports: ['100m / 200m Sprint', 'Swimming (Pool)', 'Relays', 'Cross Country', 'Novelty Runs'],
    summary: 'Individual or heat-based ranking where competitors are ranked 1st, 2nd, 3rd, etc.',
    howItWorks: [
      'Two entry modes: "By Time" (stopwatch mm:ss.ss live ranking) or "Manual" placement dropdown.',
      'Official dead-heat tie handling: tied 1st both get 1st (T-1st); next real time skips to 3rd.',
      'Tracks DNS (Did Not Start), DNF (Did Not Finish), and DQ (Disqualified).',
      'Post-event results spotlight card automatically beams on TV mode and public views.'
    ],
    pointsFormula: 'Position points matrix configured in Settings (e.g. 1st: 10 pts, 2nd: 8 pts, 3rd: 6 pts, etc.).',
    standingsRank: 'Event points accumulate directly into overall district championship leaderboard.',
    requirement: 'Configure the positions points matrix in Settings for full automatic leaderboard scoring.'
  },
  {
    key: 'points',
    title: 'Points-Based (Generic / Custom)',
    category: 'team',
    badge: 'Custom Match Rules',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    icon: Target,
    iconColor: 'text-teal-500',
    borderColor: 'hover:border-teal-500/50',
    sports: ['Tug of War', 'Table Tennis', 'Chess', 'Custom Sports'],
    summary: 'Head-to-head match scheduling with custom win/draw points weighting without fixed league rounds.',
    howItWorks: [
      'Admins specify custom points for wins (e.g. 2 or 3) and draws (e.g. 1 or 0).',
      'Direct score updates via match console or scorekeeper mobile app.',
      'Provides maximum flexibility for non-traditional or festival sports.'
    ],
    pointsFormula: 'Configured per sport in Settings (default: Win = 3 pts, Draw = 1 pt, Loss = 0 pts).',
    standingsRank: 'Cumulative match points table with goals/sets scored tracking.',
    requirement: 'Ideal for custom exhibition or supplementary tournament events.'
  }
];

export default function ScoringFormatsModal({
  isOpen,
  onClose,
  onSelectFormat,
  currentFormat = ''
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, team, individual

  const filteredFormats = useMemo(() => {
    return SCORING_FORMATS.filter(f => {
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || 
        f.title.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.sports.some(s => s.toLowerCase().includes(q)) ||
        f.badge.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, categoryFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-4xl p-5 sm:p-6 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <BookOpen size={18} />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Competition &amp; Scoring Formats Guide
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Learn how each tournament format schedules matches, calculates standings, and awards championship points.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              All Formats ({SCORING_FORMATS.length})
            </button>
            <button
              onClick={() => setCategoryFilter('team')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                categoryFilter === 'team'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Team / Match Sports
            </button>
            <button
              onClick={() => setCategoryFilter('individual')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                categoryFilter === 'individual'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Races &amp; Placement Events
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px] sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sports or rules..."
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Format Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 pt-1 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFormats.map((f) => {
              const Icon = f.icon;
              const isSelected = currentFormat === f.key;

              return (
                <div 
                  key={f.key}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-500' 
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:shadow-md'
                  } ${f.borderColor}`}
                >
                  <div className="space-y-3">
                    {/* Top line: Icon, Title & Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-800 ${f.iconColor}`}>
                          <Icon size={18} />
                        </span>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                            {f.title}
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500 text-white font-black">
                                Active
                              </span>
                            )}
                          </h3>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border mt-0.5 ${f.badgeColor}`}>
                            {f.badge}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {f.summary}
                    </p>

                    {/* Sports Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">Ideal For:</span>
                      {f.sports.map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* How it works bullets */}
                    <div className="bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl space-y-1.5 text-xs border border-gray-100 dark:border-gray-800/60">
                      <p className="font-bold text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        How It Operates
                      </p>
                      <ul className="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                        {f.howItWorks.map((bullet, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold shrink-0">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Scoring & Standings rules */}
                    <div className="space-y-1 text-[11px]">
                      <div className="text-gray-500 dark:text-gray-400">
                        <strong className="text-gray-700 dark:text-gray-200">Points Formula: </strong>
                        {f.pointsFormula}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        <strong className="text-gray-700 dark:text-gray-200">Rank Criterion: </strong>
                        {f.standingsRank}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer / Action */}
                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 italic">
                      {f.requirement}
                    </span>
                    {onSelectFormat && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectFormat(f.key);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-sm'
                            : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                        }`}
                      >
                        {isSelected ? <Check size={13} /> : <ArrowRight size={13} />}
                        <span>{isSelected ? 'Selected' : 'Use Format'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredFormats.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No scoring formats found matching "{search}".</p>
            </div>
          )}
        </div>

        {/* Modal Bottom Close */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
