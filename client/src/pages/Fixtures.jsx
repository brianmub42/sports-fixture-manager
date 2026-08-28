import { useState, useEffect } from 'react';
import { useFixtures, useSettings, useSports } from '../hooks/useFixtures.js';
import { usePlayers, useLineups, useSaveLineup } from '../hooks/usePlayers.js';
import { Calendar, Download, ChevronDown, ChevronUp, Save, Users } from 'lucide-react';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { exportFixturesToPDF } from '../utils/pdfExport.js';
import { useToast } from '../contexts/ToastContext.jsx';

export default function Fixtures({
  fixtures: propFixtures,
  sportsData: propSportsData,
  settings: propSettings,
  isLoading: propIsLoading,
  filter: propFilter,
  setFilter: propSetFilter
} = {}) {
  const isCustom = propFixtures !== undefined;

  const [filter, setFilter] = useState('All');
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  const { data: hookFixtures, isLoading: loadingFixtures } = useFixtures(filter === 'All' ? {} : { sport: filter }, { enabled: !isCustom });
  const { data: hookSettings } = useSettings({ enabled: !isCustom });
  const { data: hookSportsData, isLoading: loadingSports } = useSports({ enabled: !isCustom });

  const fixtures = isCustom ? propFixtures : hookFixtures;
  const settings = isCustom ? propSettings : hookSettings;
  const sportsData = isCustom ? propSportsData : hookSportsData;
  const isLoading = isCustom ? propIsLoading : (loadingFixtures || loadingSports);

  const sports = ['All', ...(sportsData?.map(s => s.name) || [])];

  useEffect(() => {
    if (propFilter) {
      setFilter(propFilter);
    }
  }, [propFilter]);

  const handleFilterChange = (f) => {
    setFilter(f);
    setExpandedMatchId(null);
    if (propSetFilter) propSetFilter(f);
  };

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading fixtures...</div>;

  const toggleExpand = (id) => {
    setExpandedMatchId(expandedMatchId === id ? null : id);
  };

  const showLineupsFeature = settings?.enable_player_registration;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-blue-500" />
            Match Fixtures
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Complete tournament schedule</p>
        </div>
        
        <button 
          onClick={() => exportFixturesToPDF(fixtures, settings)}
          disabled={!fixtures?.length}
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
            onClick={() => handleFilterChange(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filter === s
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Time</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Sport</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Venue</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Matchup</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Score</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500">Status</th>
              {showLineupsFeature && <th className="py-3 px-4"></th>}
            </tr>
          </thead>
          <tbody>
            {fixtures?.map(f => {
              const isExpanded = expandedMatchId === f.id;
              const hasTeams = f.sport_name !== 'Athletics';
              return (
                <>
                  <tr 
                    key={f.id} 
                    onClick={() => showLineupsFeature && hasTeams && toggleExpand(f.id)}
                    className={`border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-850/50 transition-colors ${showLineupsFeature && hasTeams ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-mono text-xs">{f.time || f.scheduled_at?.slice(11, 16)}</td>
                    <td className="py-3 px-4"><SportTag sport={f.sport_name} /></td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{f.venue_name}</td>
                    <td className="py-3 px-4">
                      {f.scoring_type === 'placement' ? (
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{f.team_a_name}</span>
                      ) : (
                        <span className="flex items-center gap-2 flex-wrap">
                          <TeamPill code={f.team_a_code} name={f.team_a_name} logoUrl={f.team_a_logo} />
                          <span className="text-gray-400 text-xs font-bold">vs</span>
                          <TeamPill code={f.team_b_code} name={f.team_b_name} logoUrl={f.team_b_logo} />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold tabular-nums">
                      {f.scoring_type === 'placement' ? (
                        f.status === 'completed' ? (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">{f.team_b_name || 'Done'}</span>
                        ) : '—'
                      ) : (
                        f.score_a !== null ? `${f.score_a} - ${f.score_b}` : '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {f.status === 'completed' || f.status === 'draw' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/20">Done</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-800/40">Upcoming</span>
                      )}
                    </td>
                    {showLineupsFeature && hasTeams && (
                      <td className="py-3 px-4 text-gray-400">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                    )}
                  </tr>
                  {isExpanded && showLineupsFeature && hasTeams && (
                    <tr>
                      <td colSpan={7} className="p-0 border-b border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-850/10">
                        <FixtureDetails fixture={f} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="sm:hidden space-y-2">
        {fixtures?.map(f => {
          const isExpanded = expandedMatchId === f.id;
          const hasTeams = f.scoring_type !== 'placement';
          return (
            <div key={f.id} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div 
                onClick={() => showLineupsFeature && hasTeams && toggleExpand(f.id)}
                className={`p-3 space-y-2 ${showLineupsFeature && hasTeams ? 'cursor-pointer' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <SportTag sport={f.sport_name} />
                  <div className="flex items-center gap-2">
                    {f.status === 'completed' || f.status === 'draw' ? (
                      <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full">Done</span>
                    ) : (
                      <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-850 px-2 py-0.5 rounded-full">Upcoming</span>
                    )}
                    {showLineupsFeature && hasTeams && (
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3 py-1">
                  {f.scoring_type === 'placement' ? (
                    <div className="flex flex-col items-center gap-1 w-full">
                      <span className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100">{f.team_a_name}</span>
                      {f.status === 'completed' && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal text-center">{f.team_b_name}</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <TeamPill code={f.team_a_code} name={f.team_a_name} logoUrl={f.team_a_logo} />
                      <span className="text-xs text-gray-400 font-bold">
                        {f.score_a !== null ? `${f.score_a} - ${f.score_b}` : 'vs'}
                      </span>
                      <TeamPill code={f.team_b_code} name={f.team_b_name} logoUrl={f.team_b_logo} />
                    </>
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{f.time || f.scheduled_at?.slice(11, 16)}</span>
                  <span>{f.venue_name}</span>
                </div>
              </div>
              {isExpanded && showLineupsFeature && hasTeams && (
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-850/10 p-3">
                  <FixtureDetails fixture={f} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FixtureDetails({ fixture }) {
  const { isScorekeeper } = useAuth();
  const { showToast } = useToast();
  
  // Load team sheets
  const { data: lineup, isLoading: lineupLoading } = useLineups(fixture.id);
  const { data: rosterA, isLoading: rosterALoading } = usePlayers(fixture.team_a_id);
  const { data: rosterB, isLoading: rosterBLoading } = usePlayers(fixture.team_b_id);

  const saveLineupMutation = useSaveLineup();

  const [selectedA, setSelectedA] = useState([]);
  const [selectedB, setSelectedB] = useState([]);
  const [saveSuccessA, setSaveSuccessA] = useState(false);
  const [saveSuccessB, setSaveSuccessB] = useState(false);

  // Set active lineup checkboxes when data is loaded
  useState(() => {
    if (lineup) {
      const activeA = lineup.filter(l => l.team_id === fixture.team_a_id).map(l => l.player_id);
      const activeB = lineup.filter(l => l.team_id === fixture.team_b_id).map(l => l.player_id);
      setSelectedA(activeA);
      setSelectedB(activeB);
    }
  });

  // Re-sync selection state when lineup data loads/changes
  useState(() => {
    if (lineup) {
      setSelectedA(lineup.filter(l => l.team_id === fixture.team_a_id).map(l => l.player_id));
      setSelectedB(lineup.filter(l => l.team_id === fixture.team_b_id).map(l => l.player_id));
    }
  }, [lineup]);

  if (lineupLoading || rosterALoading || rosterBLoading) {
    return <div className="text-center py-4 text-xs text-gray-400">Loading lineups & team sheets...</div>;
  }

  const handleTogglePlayer = (teamSide, playerId) => {
    if (fixture.status === 'completed' || fixture.status === 'draw') return; // Read-only once match finishes
    if (teamSide === 'A') {
      setSelectedA(prev => 
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      );
    } else {
      setSelectedB(prev => 
        prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
      );
    }
  };

  const handleSaveLineup = async (teamSide) => {
    const teamId = teamSide === 'A' ? fixture.team_a_id : fixture.team_b_id;
    const playerIds = teamSide === 'A' ? selectedA : selectedB;
    const setSuccess = teamSide === 'A' ? setSaveSuccessA : setSaveSuccessB;

    try {
      await saveLineupMutation.mutateAsync({ fixtureId: fixture.id, teamId, playerIds });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      showToast('Team match lineup saved successfully!', 'success');
    } catch (err) {
      alert('Failed to save team lineup: ' + err.message);
    }
  };

  const renderRosterSelector = (teamSide, teamName, roster, selectedIds, setSuccess) => {
    const isCompleted = fixture.status === 'completed' || fixture.status === 'draw';
    const canEdit = isScorekeeper && !isCompleted;
    
    // Filter active players for display
    const activePlayers = roster.filter(p => selectedIds.includes(p.id));

    return (
      <div className="flex-1 min-w-[200px] p-3 rounded-lg border border-gray-200/60 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>{teamName} Lineup</span>
          <span className="text-[10px] bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold">
            {selectedIds.length} players
          </span>
        </div>

        {canEdit ? (
          <div className="space-y-4">
            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
              {roster.map(p => {
                const isChecked = selectedIds.includes(p.id);
                return (
                  <label 
                    key={p.id} 
                    className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-850 ${isChecked ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePlayer(teamSide, p.id)}
                      className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer"
                    />
                    <span className="font-mono text-gray-400 shrink-0 w-6">#{p.jersey_number || '—'}</span>
                    <span className="font-medium truncate">{p.name}</span>
                  </label>
                );
              })}
              {roster.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400 italic">No players registered on team roster.</div>
              )}
            </div>
            {roster.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveLineup(teamSide)}
                  disabled={saveLineupMutation.isLoading}
                  className="k-btn k-btn-primary py-1.5 text-xs flex items-center justify-center gap-1 w-full"
                >
                  <Save size={12} />
                  <span>Save Team Sheet</span>
                </button>
                {setSuccess && (
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-bold shrink-0">Saved!</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {activePlayers.map(p => (
              <div key={p.id} className="flex items-center gap-2 p-1 bg-gray-50 dark:bg-gray-800/40 rounded text-xs">
                <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-850 flex items-center justify-center font-mono text-[10px] font-bold text-gray-500">
                  {p.jersey_number ? `#${p.jersey_number}` : '—'}
                </span>
                <span className="font-medium text-gray-855 dark:text-gray-200">{p.name}</span>
              </div>
            ))}
            {activePlayers.length === 0 && (
              <div className="text-center py-6 text-xs text-gray-400 italic">No lineup submitted.</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Users size={14} className="text-purple-500" />
        <span>TEAM SHEETS / LINEUPS</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {renderRosterSelector('A', fixture.team_a_name, rosterA || [], selectedA, saveSuccessA)}
        {renderRosterSelector('B', fixture.team_b_name, rosterB || [], selectedB, saveSuccessB)}
      </div>
    </div>
  );
}
