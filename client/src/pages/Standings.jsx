import React, { useState, useEffect } from 'react';
import { useStandings, useStandingsEvents } from '../hooks/useStandings.js';
import { useSettings, useSports } from '../hooks/useFixtures.js';
import TeamPill from '../components/TeamPill.jsx';
import { Download, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { exportStandingsToPDF } from '../utils/pdfExport.js';

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
            <Trophy className="text-purple-500" />
            Tournament Standings
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Current rankings and points</p>
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
      ) : (
        <div className="space-y-3">
          {isPlacement && eventId === 'all' && (
            <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5 bg-purple-50/50 dark:bg-purple-950/20 px-3 py-2 rounded-lg max-w-max border border-purple-100/30 dark:border-purple-900/10">
              <span className="animate-pulse">💡</span>
              Click on any team's row to expand and view their individual event breakdown.
            </div>
          )}

          <div className="k-card">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {sport} — {sport === 'Athletics' ? 'Track Events' : 'Round-Robin Standings'}
              </div>
              
              {isPlacement && eventsList && eventsList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Filter by Event:</span>
                  <select
                    value={eventId}
                    onChange={(e) => handleEventChange(e.target.value)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-white dark:bg-gray-800 border border-gray-350 dark:border-gray-700 text-gray-705 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="all">All Events (Combined)</option>
                    {eventsList.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} {ev.category ? `(${ev.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[650px]">
                <div className="grid grid-cols-9 gap-2 text-xs text-gray-400 font-medium mb-2 px-2 text-center pb-2">
                  <span>Rank</span>
                  {isPlacement ? (
                    <>
                      <span className="text-left col-span-3">Team</span>
                      <span title="Events Played">E</span>
                      <span title="1st Place finishes">1st 🥇</span>
                      <span title="2nd Place finishes">2nd 🥈</span>
                      <span title="3rd Place finishes">3rd 🥉</span>
                    </>
                  ) : (
                    <>
                      <span className="text-left col-span-2">Team</span>
                      <span title="Matches Played">P</span>
                      <span title="Matches Won">W</span>
                      <span title="Matches Lost">L</span>
                      <span title="Points For">PF</span>
                      <span title="Points Against">PA</span>
                    </>
                  )}
                  <span>PTS</span>
                </div>
                <div className="space-y-1">
                  {standings?.map((team, i) => (
                    <div key={team.code} className="flex flex-col">
                      <div 
                        onClick={() => {
                          if (isPlacement && eventId === 'all') {
                            setExpandedTeam(expandedTeam === team.code ? null : team.code);
                          }
                        }}
                        className={`grid grid-cols-9 gap-2 items-center py-2.5 px-2 border-b border-gray-150/40 dark:border-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded text-center transition-all ${
                          isPlacement && eventId === 'all' ? 'cursor-pointer select-none' : ''
                        } ${expandedTeam === team.code && eventId === 'all' ? 'bg-purple-50/20 dark:bg-purple-950/10 border-l-2 border-purple-500' : ''}`}
                      >
                        {/* Rank & Trend */}
                        <span className="flex items-center justify-center gap-1.5 font-semibold">
                          <span className="text-gray-900 dark:text-gray-100 text-xs">{i + 1}</span>
                          {team.trend === 'up' && (
                            <span 
                              className="text-green-500 text-[10px] font-bold" 
                              title={team.rank_diff > 0 ? `Moved up by ${team.rank_diff} rank(s)` : 'Moved up'}
                            >
                              ▲
                            </span>
                          )}
                          {team.trend === 'down' && (
                            <span 
                              className="text-red-500 text-[10px] font-bold" 
                              title={team.rank_diff < 0 ? `Moved down by ${Math.abs(team.rank_diff)} rank(s)` : 'Moved down'}
                            >
                              ▼
                            </span>
                          )}
                          {team.trend === 'same' && (
                            <span className="text-gray-300 dark:text-gray-600 text-[10px]" title="No change in rank">
                              —
                            </span>
                          )}
                        </span>

                        {isPlacement ? (
                          <>
                            <span className="text-left col-span-3 truncate flex items-center gap-1">
                              <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                              {isPlacement && eventId === 'all' && (
                                expandedTeam === team.code ? (
                                  <ChevronUp size={14} className="text-gray-400 shrink-0" />
                                ) : (
                                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                                )
                              )}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.played}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.gold || team.won || 0}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.silver || 0}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.bronze || 0}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-left col-span-2 truncate">
                              <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.played}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.won}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.lost}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.pf}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">{team.pa}</span>
                          </>
                        )}
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{team.points}</span>
                      </div>

                      {/* Dropdown breakdown */}
                      {isPlacement && eventId === 'all' && expandedTeam === team.code && (
                        <div className="bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/60 p-4 rounded-lg mt-1 mb-2 mx-2 text-left shadow-inner transition-all animate-fadeIn">
                          <div className="flex items-center justify-between mb-3 border-b border-gray-200/60 dark:border-gray-800 pb-2">
                            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                              <Trophy size={13} className="text-yellow-500" />
                              Event Performance Breakdown: {team.name}
                            </h4>
                            <span className="text-[10px] bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                              Competed in {team.played} event(s)
                            </span>
                          </div>
                          {team.event_breakdown && team.event_breakdown.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {team.event_breakdown.map((eb, idx) => (
                                <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-md bg-white dark:bg-gray-850/60 border border-gray-150/40 dark:border-gray-800/40 shadow-sm">
                                  <span className="text-gray-700 dark:text-gray-300 font-semibold">{eb.event_name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      eb.placement === 1 ? 'bg-yellow-50 text-yellow-700 border border-yellow-250 dark:bg-yellow-950/30 dark:text-yellow-400' :
                                      eb.placement === 2 ? 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800/50 dark:text-gray-300' :
                                      eb.placement === 3 ? 'bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-950/20 dark:text-amber-400' :
                                      'bg-gray-50 text-gray-500 dark:bg-gray-900 text-gray-400'
                                    }`}>
                                      {eb.placement === 1 ? '🥇 1st' : eb.placement === 2 ? '🥈 2nd' : eb.placement === 3 ? '🥉 3rd' : `${eb.placement}th`}
                                    </span>
                                    <span className="text-purple-600 dark:text-purple-400 font-bold">+{eb.points} pts</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 dark:text-gray-500 italic py-2 text-center">
                              No points recorded for any events yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
