import React, { useState, useEffect } from 'react';
import { useStandings, useStandingsEvents } from '../hooks/useStandings.js';
import { useSettings, useSports, useTeamSchedule } from '../hooks/useFixtures.js';
import TeamPill from '../components/TeamPill.jsx';
import { Download, Trophy, ChevronDown, ChevronUp, BookOpen, Medal, Star, Filter } from 'lucide-react';
import { exportStandingsToPDF } from '../utils/pdfExport.js';
import ScoringFormatsModal from '../components/ScoringFormatsModal.jsx';

function TeamResultsBreakdown({ teamCode, teamName, sportName }) {
  const { data: fixtures, isLoading } = useTeamSchedule(teamCode);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 bg-gray-50/30 dark:bg-gray-900/20 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg mx-2 my-1 animate-pulse">
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading match results...</span>
      </div>
    );
  }

  // Filter completed and draw fixtures for this specific sport
  const filtered = fixtures?.filter(f => 
    f.sport_name === sportName && 
    (f.status === 'completed' || f.status === 'draw')
  ) || [];

  return (
    <div className="bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/60 p-4 rounded-lg mt-1 mb-2 mx-2 text-left shadow-inner transition-all animate-fadeIn">
      <div className="flex items-center justify-between mb-3 border-b border-gray-200/60 dark:border-gray-800 pb-2">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <Trophy size={13} className="text-yellow-500" />
          Match Performance Breakdown: {teamName}
        </h4>
        <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
          Played {filtered.length} match(es)
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-650 dark:text-gray-300">
            <thead>
              <tr className="border-b border-gray-250 dark:border-gray-800 text-[10px] text-gray-450 uppercase tracking-wider">
                <th className="py-1.5 px-2 text-left font-medium">Round</th>
                <th className="py-1.5 px-2 text-left font-medium">Matchup</th>
                <th className="py-1.5 px-2 text-center font-medium">Result</th>
                <th className="py-1.5 px-2 text-left font-medium">Venue</th>
                <th className="py-1.5 px-2 text-right font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150/30 dark:divide-gray-800/40">
              {filtered?.filter(Boolean).map((f) => {
                const isTeamA = f.team_a_code === teamCode;
                const ownScore = isTeamA ? f.score_a : f.score_b;
                const opponentScore = isTeamA ? f.score_b : f.score_a;
                const opponentName = isTeamA ? f.team_b_name : f.team_a_name;
                const opponentCode = isTeamA ? f.team_b_code : f.team_a_code;

                let outcome = 'Draw';
                let outcomeClass = 'bg-gray-100 text-gray-750 dark:bg-gray-800 dark:text-gray-305';
                let ptsText = '+1';

                if (f.status === 'completed') {
                  const won = isTeamA ? f.score_a > f.score_b : f.score_b > f.score_a;
                  if (won) {
                    outcome = 'Win';
                    outcomeClass = 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400';
                    ptsText = '+3';
                  } else {
                    outcome = 'Loss';
                    outcomeClass = 'bg-red-50 text-red-750 border border-red-200 dark:bg-red-950/20 dark:text-red-450';
                    ptsText = '+0';
                  }
                }

                return (
                  <tr key={f?.id || f?.round || Math.random()} className="hover:bg-white/40 dark:hover:bg-gray-800/10">
                    <td className="py-2 px-2 font-medium text-gray-500">{f.round}</td>
                    <td className="py-2 px-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{ownScore} - {opponentScore}</span> vs <span className="font-medium text-gray-655 dark:text-gray-300">{opponentName} ({opponentCode})</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${outcomeClass}`}>
                        {outcome}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-500">{f.venue_name || f.venue}</td>
                    <td className="py-2 px-2 text-right font-bold text-purple-600 dark:text-purple-400">{ptsText} pts</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-xs text-gray-400 dark:text-gray-500 italic py-2 text-center">
          No matches recorded for this sport yet.
        </div>
      )}
    </div>
  );
}

// ─── Placement Podium: top 3 visual cards ─────────────────────────────────────
function PlacementPodium({ teams }) {
  if (!teams || teams.length === 0) return null;
  const [first, second, third] = teams;
  const podiumOrder = [second, first, third].filter(Boolean);
  const heights = ['h-20', 'h-28', 'h-16'];
  const borderColors = [
    'border-gray-400 dark:border-gray-500',
    'border-yellow-400 dark:border-yellow-500',
    'border-amber-600 dark:border-amber-700'
  ];
  const bgColors = [
    'bg-gray-100 dark:bg-gray-800/60',
    'bg-yellow-50 dark:bg-yellow-950/30',
    'bg-amber-50 dark:bg-amber-950/20'
  ];
  const medals = ['🥈', '🥇', '🥉'];
  const ranks = [2, 1, 3];

  return (
    <div className="flex items-end justify-center gap-3 pt-6 pb-2">
      {podiumOrder.map((team, i) => {
        if (!team) return null;
        const rank = ranks[i];
        return (
          <div key={team.code} className="flex flex-col items-center gap-2" style={{ minWidth: 100 }}>
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 truncate max-w-[96px]">
                {team.name}
              </div>
              <div className="flex items-center justify-center gap-1 text-[11px]">
                <span className="font-bold text-purple-600 dark:text-purple-400">{team.points} pts</span>
              </div>
              <div className="flex justify-center gap-1 mt-1 text-[10px]">
                {team.gold > 0 && <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">🥇{team.gold}</span>}
                {team.silver > 0 && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full font-bold">🥈{team.silver}</span>}
                {team.bronze > 0 && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded-full font-bold">🥉{team.bronze}</span>}
              </div>
            </div>
            <div className={`w-full ${heights[i]} rounded-t-lg border-t-4 ${borderColors[rank - 1]} ${bgColors[rank - 1]} flex flex-col items-center justify-center gap-0.5 shadow-sm`}>
              <span className="text-2xl">{medals[i]}</span>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200">#{rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Placement Medal Table ────────────────────────────────────────────────────
function PlacementMedalTable({ standings, eventsList, eventId, onEventChange }) {
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [sortCol, setSortCol] = useState('points');

  const sorted = [...(standings || [])].sort((a, b) => {
    if (b[sortCol] !== a[sortCol]) return b[sortCol] - a[sortCol];
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    return 0;
  });

  const SortBtn = ({ col, label, title }) => (
    <button
      onClick={() => setSortCol(col)}
      title={title}
      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
        sortCol === col
          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-2">
      {/* Sort controls + event filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Sort by:</span>
          <SortBtn col="points" label="Points" title="Sort by total points" />
          <SortBtn col="gold" label="🥇 Gold" title="Sort by gold medals" />
          <SortBtn col="silver" label="🥈 Silver" title="Sort by silver medals" />
          <SortBtn col="bronze" label="🥉 Bronze" title="Sort by bronze medals" />
        </div>
        {eventsList && eventsList.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Event:</span>
            <select
              value={eventId}
              onChange={e => onEventChange(e.target.value)}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">All Events (Combined)</option>
              {eventsList.filter(Boolean).map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}{ev.category ? ` (${ev.category})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Medal table header */}
      <div className="grid grid-cols-10 gap-2 text-[10px] text-gray-400 font-medium uppercase tracking-wider px-3 py-2 border-b border-gray-200 dark:border-gray-800">
        <span className="col-span-1 text-center">#</span>
        <span className="col-span-4 text-left">Team / School</span>
        <span className="col-span-1 text-center" title="Events entered">Evts</span>
        <span className="col-span-1 text-center">🥇</span>
        <span className="col-span-1 text-center">🥈</span>
        <span className="col-span-1 text-center">🥉</span>
        <span className="col-span-1 text-center font-bold text-gray-600 dark:text-gray-300">PTS</span>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm italic">
          No results recorded yet for this sport.
        </div>
      )}

      <div className="space-y-px">
        {sorted.map((team, i) => {
          const rank = i + 1;
          const isExpanded = expandedTeam === team.code && eventId === 'all';
          const medalHighlight =
            rank === 1 ? 'border-l-4 border-yellow-400 bg-yellow-50/30 dark:bg-yellow-950/10' :
            rank === 2 ? 'border-l-4 border-gray-400 bg-gray-50/50 dark:bg-gray-900/20' :
            rank === 3 ? 'border-l-4 border-amber-500 bg-amber-50/20 dark:bg-amber-950/10' :
            'border-l-4 border-transparent';

          return (
            <div key={team.code}>
              <div
                onClick={() => eventId === 'all' && setExpandedTeam(isExpanded ? null : team.code)}
                className={`grid grid-cols-10 gap-2 items-center py-3 px-3 rounded-lg transition-all ${
                  eventId === 'all' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40' : ''
                } ${medalHighlight} ${isExpanded ? 'rounded-b-none' : ''}`}
              >
                <span className="col-span-1 text-center">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold ${
                    rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                    rank === 2 ? 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-100' :
                    rank === 3 ? 'bg-amber-500 text-white' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>{rank}</span>
                </span>
                <span className="col-span-4 flex items-center gap-2 min-w-0">
                  <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                  {eventId === 'all' && (
                    isExpanded
                      ? <ChevronUp size={13} className="text-purple-400 shrink-0" />
                      : <ChevronDown size={13} className="text-purple-400 shrink-0" />
                  )}
                </span>
                <span className="col-span-1 text-center text-sm text-gray-500 dark:text-gray-400">{team.played}</span>
                <span className={`col-span-1 text-center text-sm font-semibold ${
                  team.gold > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-700'
                }`}>{team.gold ?? 0}</span>
                <span className={`col-span-1 text-center text-sm font-semibold ${
                  team.silver > 0 ? 'text-gray-500 dark:text-gray-300' : 'text-gray-300 dark:text-gray-700'
                }`}>{team.silver ?? 0}</span>
                <span className={`col-span-1 text-center text-sm font-semibold ${
                  team.bronze > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-gray-300 dark:text-gray-700'
                }`}>{team.bronze ?? 0}</span>
                <span className="col-span-1 text-center text-sm font-bold text-purple-700 dark:text-purple-400">{team.points}</span>
              </div>

              {/* Expandable event breakdown */}
              {isExpanded && team.event_breakdown && (
                <div className="mx-2 mb-2 rounded-b-lg bg-gray-50/70 dark:bg-gray-900/40 border border-t-0 border-gray-200 dark:border-gray-800 p-4">
                  <h5 className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Trophy size={12} className="text-yellow-500" />
                    Event Results — {team.name}
                  </h5>
                  {team.event_breakdown.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {team.event_breakdown.map((eb, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-md bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 shadow-sm">
                          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{eb.event_name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              eb.placement === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' :
                              eb.placement === 2 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                              eb.placement === 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-500'
                            }`}>
                              {eb.placement === 1 ? '🥇 1st' : eb.placement === 2 ? '🥈 2nd' : eb.placement === 3 ? '🥉 3rd' : `${eb.placement}th`}
                            </span>
                            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">+{eb.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-600 italic">No events recorded yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Standings({
  sportsData: propSportsData,
  standings: propStandings,
  settings: propSettings,
  eventsList: propEventsList,
  isLoading: propIsLoading,
  selectedSport: propSelectedSport,
  setSelectedSport: propSetSelectedSport,
  selectedEventId: propSelectedEventId,
  setSelectedEventId: propSetSelectedEventId
} = {}) {
  const isCustom = propStandings !== undefined;

  const [sport, setSport] = useState('');
  const [eventId, setEventId] = useState('all');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);

  const { data: hookSportsData, isLoading: loadingSports } = useSports({ enabled: !isCustom });
  const { data: hookStandings, isLoading: loadingStandings } = useStandings(sport, eventId, { enabled: !isCustom && !!sport });
  const { data: hookSettings } = useSettings({ enabled: !isCustom });
  const { data: hookEventsList } = useStandingsEvents(sport, { enabled: !isCustom && !!sport });

  const sportsData = isCustom ? propSportsData : hookSportsData;
  const standings = isCustom ? propStandings : hookStandings;
  const settings = isCustom ? propSettings : hookSettings;
  const eventsList = isCustom ? propEventsList : hookEventsList;
  const isLoading = isCustom ? propIsLoading : (loadingStandings || loadingSports);

  const sports = sportsData?.map(s => s.name) || [];
  const selectedSportObj = sportsData?.find(s => s.name === sport);
  const isPlacement = selectedSportObj?.scoring_type === 'placement';

  useEffect(() => {
    if (sports.length > 0 && !sport) {
      setSport(sports[0]);
    }
  }, [sports, sport]);

  useEffect(() => {
    if (propSelectedSport) {
      setSport(propSelectedSport);
    }
  }, [propSelectedSport]);

  useEffect(() => {
    if (propSelectedEventId) {
      setEventId(propSelectedEventId);
    }
  }, [propSelectedEventId]);

  const handleSportChange = (s) => {
    setSport(s);
    if (propSetSelectedSport) propSetSelectedSport(s);
  };

  const handleEventChange = (evId) => {
    setEventId(evId);
    if (propSetSelectedEventId) propSetSelectedEventId(evId);
  };

  useEffect(() => {
    setEventId('all');
    setExpandedTeam(null);
  }, [sport]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {isPlacement ? <Medal className="text-yellow-500" /> : <Trophy className="text-purple-500" />}
            {isPlacement ? 'Medal Leaderboard' : 'Tournament Standings'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isPlacement
              ? 'Points accumulated from event placements — Gold, Silver & Bronze'
              : 'Current rankings and points'}
          </p>
        </div>
        
        <button 
          onClick={() => exportStandingsToPDF(standings, settings, sport)}
          disabled={!standings?.length}
          className="k-btn bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Download PDF</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {sports.map(s => (
          <button
            key={s}
            onClick={() => handleSportChange(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              sport === s
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading standings...</div>
      ) : isPlacement ? (
        /* ── PLACEMENT / ATHLETICS / SWIMMING MODE ───────────────────────── */
        <div className="space-y-4">
          {/* Scoring key banner */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-gradient-to-r from-yellow-50 to-purple-50 dark:from-yellow-950/20 dark:to-purple-950/20 border border-yellow-200/60 dark:border-yellow-900/30 rounded-xl px-4 py-3">
            <Star size={14} className="text-yellow-500 shrink-0" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">Scoring:</span>
            <span className="flex items-center gap-1"><span className="font-bold text-yellow-600 dark:text-yellow-400">🥇 1st</span><span className="text-gray-500">= most points</span></span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span className="flex items-center gap-1"><span className="font-bold text-gray-500 dark:text-gray-400">🥈 2nd</span><span className="text-gray-500">= 2nd most</span></span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span className="flex items-center gap-1"><span className="font-bold text-amber-600 dark:text-amber-500">🥉 3rd</span><span className="text-gray-500">= 3rd most</span></span>
            <span className="ml-auto text-gray-400 italic hidden sm:block">Click a row to see event breakdown</span>
          </div>

          {/* Podium (top 3) */}
          {standings && standings.length > 0 && (
            <div className="k-card overflow-hidden">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-3 mb-1">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Trophy size={15} className="text-yellow-500" />
                  Top Performers — {sport}
                </span>
              </div>
              <PlacementPodium teams={standings.slice(0, 3)} />
            </div>
          )}

          {/* Full medal table */}
          <div className="k-card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Medal size={15} className="text-purple-500" />
                {sport} Medal Table
              </span>
              <button
                type="button"
                onClick={() => setIsFormatModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                <BookOpen size={12} />
                Scoring Rules
              </button>
            </div>
            <PlacementMedalTable
              standings={standings}
              eventsList={eventsList}
              eventId={eventId}
              onEventChange={handleEventChange}
            />
          </div>
        </div>
      ) : (
        /* ── STANDARD / MATCH-BASED MODE ────────────────────────────────── */
        <div className="space-y-3">
          {eventId === 'all' && (
            <div className="text-xs text-purple-655 dark:text-purple-400 font-semibold flex items-center gap-1.5 bg-purple-50/50 dark:bg-purple-950/20 px-3 py-2 rounded-lg max-w-max border border-purple-100/30 dark:border-purple-900/10 shadow-sm animate-in slide-in-from-top duration-200">
              <span className="animate-pulse">💡</span>
              Click on any team's row to expand and view the list of results making up their points.
            </div>
          )}

          <div className="k-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {sport} — Round-Robin Standings
                </span>
                <button
                  type="button"
                  onClick={() => setIsFormatModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                  title="View scoring rules and standings calculation breakdown"
                >
                  <BookOpen size={12} />
                  <span>Scoring Rules</span>
                </button>
              </div>
              
              {eventsList && eventsList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Filter by Event:</span>
                  <select
                    value={eventId}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 border border-gray-350 dark:border-gray-700 text-gray-705 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="all">All Events (Combined)</option>
                    {eventsList?.filter(Boolean).map(ev => (
                      <option key={ev?.id} value={ev?.id}>
                        {ev?.name} {ev?.category ? `(${ev?.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[650px]">
                {(() => {
                  const scoringSystem = selectedSportObj?.scoring_system || 'standard_points';

                  return (
                    <>
                      {/* Dynamic Table Header */}
                      <div className="grid grid-cols-10 gap-2 text-xs text-gray-400 font-medium mb-2 px-2 text-center pb-2 border-b border-gray-150/60 dark:border-gray-800">
                        <span>Rank</span>
                        {scoringSystem === 'sets_games' ? (
                          <>
                            <span className="text-left col-span-3">Team</span>
                            <span title="Matches Played">P</span>
                            <span title="Matches Won">W</span>
                            <span title="Matches Lost">L</span>
                            <span title="Sets Won">SW</span>
                            <span title="Sets Lost">SL</span>
                            <span title="Sets Differential">S+/-</span>
                          </>
                        ) : scoringSystem === 'bonus_points' ? (
                          <>
                            <span className="text-left col-span-3">Team</span>
                            <span title="Matches Played">P</span>
                            <span title="Matches Won">W</span>
                            <span title="Matches Drawn">D</span>
                            <span title="Matches Lost">L</span>
                            <span title="Tries For">Tries</span>
                            <span title="Bonus Points">BP</span>
                          </>
                        ) : scoringSystem === 'cricket_runs' ? (
                          <>
                            <span className="text-left col-span-3">Team</span>
                            <span title="Matches Played">P</span>
                            <span title="Matches Won">W</span>
                            <span title="Matches Tied">T</span>
                            <span title="Matches Lost">L</span>
                            <span title="Runs Scored">Runs</span>
                            <span title="Net Run Rate">NRR</span>
                          </>
                        ) : (
                          <>
                            <span className="text-left col-span-3">Team</span>
                            <span title="Matches Played">P</span>
                            <span title="Matches Won">W</span>
                            <span title="Matches Drawn">D</span>
                            <span title="Matches Lost">L</span>
                            <span title="Points For">PF</span>
                            <span title="Points Against">PA</span>
                          </>
                        )}
                        <span className="font-bold text-gray-700 dark:text-gray-200">PTS</span>
                      </div>

                      {/* Standings Rows */}
                      <div className="space-y-1">
                        {standings?.map((team, i) => (
                          <div key={team.code} className="flex flex-col">
                            <div 
                              onClick={() => {
                                if (eventId === 'all') {
                                  setExpandedTeam(expandedTeam === team.code ? null : team.code);
                                }
                              }}
                              className={`grid grid-cols-10 gap-2 items-center py-2.5 px-2 border-b border-gray-150/40 dark:border-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded text-center transition-all ${
                                eventId === 'all' ? 'cursor-pointer select-none' : ''
                              } ${expandedTeam === team.code && eventId === 'all' ? 'bg-purple-50/20 dark:bg-purple-950/10 border-l-2 border-purple-500' : ''}`}
                            >
                              {/* Rank & Trend */}
                              <span className="flex items-center justify-center gap-1.5 font-semibold">
                                <span className="text-gray-900 dark:text-gray-100 text-xs">{i + 1}</span>
                                {team.trend === 'up' && (
                                  <span className="text-green-500 text-[10px] font-bold" title={team.rank_diff > 0 ? `Moved up by ${team.rank_diff} rank(s)` : 'Moved up'}>▲</span>
                                )}
                                {team.trend === 'down' && (
                                  <span className="text-red-500 text-[10px] font-bold" title={team.rank_diff < 0 ? `Moved down by ${Math.abs(team.rank_diff)} rank(s)` : 'Moved down'}>▼</span>
                                )}
                                {team.trend === 'same' && (
                                  <span className="text-gray-300 dark:text-gray-600 text-[10px]" title="No change in rank">—</span>
                                )}
                              </span>

                              {scoringSystem === 'sets_games' ? (
                                <>
                                  <span className="text-left col-span-3 truncate flex items-center gap-1">
                                    <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                                    {eventId === 'all' && (
                                      expandedTeam === team.code ? (
                                        <ChevronUp size={14} className="text-purple-400 shrink-0" />
                                      ) : (
                                        <ChevronDown size={14} className="text-purple-400 shrink-0" />
                                      )
                                    )}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.played}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.won}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.lost}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.sets_won || 0}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.sets_lost || 0}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.sets_diff > 0 ? `+${team.sets_diff}` : team.sets_diff || 0}</span>
                                </>
                              ) : scoringSystem === 'bonus_points' ? (
                                <>
                                  <span className="text-left col-span-3 truncate flex items-center gap-1">
                                    <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                                    {eventId === 'all' && (
                                      expandedTeam === team.code ? (
                                        <ChevronUp size={14} className="text-purple-400 shrink-0" />
                                      ) : (
                                        <ChevronDown size={14} className="text-purple-400 shrink-0" />
                                      )
                                    )}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.played}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.won}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.drawn}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.lost}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.tries_for || 0}</span>
                                  <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">+{team.bonus_points || 0}</span>
                                </>
                              ) : scoringSystem === 'cricket_runs' ? (
                                <>
                                  <span className="text-left col-span-3 truncate flex items-center gap-1">
                                    <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                                    {eventId === 'all' && (
                                      expandedTeam === team.code ? (
                                        <ChevronUp size={14} className="text-purple-400 shrink-0" />
                                      ) : (
                                        <ChevronDown size={14} className="text-purple-400 shrink-0" />
                                      )
                                    )}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.played}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.won}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.tied}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.lost}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.runs_for || 0}</span>
                                  <span className="text-sm font-mono text-xs text-blue-600 dark:text-blue-400">{team.nrr_formatted || team.nrr || '0.000'}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-left col-span-3 truncate flex items-center gap-1">
                                    <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                                    {eventId === 'all' && (
                                      expandedTeam === team.code ? (
                                        <ChevronUp size={14} className="text-purple-400 shrink-0" />
                                      ) : (
                                        <ChevronDown size={14} className="text-purple-400 shrink-0" />
                                      )
                                    )}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.played}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.won}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.drawn}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.lost}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.pf}</span>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">{team.pa}</span>
                                </>
                              )}
                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{team.points}</span>
                            </div>

                      {/* Dropdown breakdown */}
                      {eventId === 'all' && expandedTeam === team.code && (
                        <TeamResultsBreakdown teamCode={team.code} teamName={team.name} sportName={sport} />
                      )}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <ScoringFormatsModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        currentFormat={isPlacement ? 'placement' : (selectedSportObj?.scoring_type || 'single')}
      />
    </div>
  );
}
