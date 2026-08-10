import { useState } from 'react';
import { useFixtures, useUpdateScore, useSettings } from '../hooks/useFixtures.js';
import { useLineups } from '../hooks/usePlayers.js';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';
import MatchTimerControl from '../components/MatchTimerControl.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Target, ShieldAlert, Award, Check } from 'lucide-react';

export default function LiveScores() {
  const { data: fixtures, isLoading } = useFixtures();
  const { data: settings } = useSettings();
  const { isAuthenticated } = useAuth();

  const [statusFilter, setStatusFilter] = useState('upcoming');
  const [sportFilter, setSportFilter] = useState('All');

  const availableSports = fixtures 
    ? ['All', ...new Set(fixtures
        .filter(f => f.sport_name !== 'Athletics' && f.sport_name !== 'Novelty')
        .map(f => f.sport_name)
      )]
    : ['All'];

  const filteredFixtures = fixtures?.filter(f => {
    // Exclude placement-based sports (Athletics and Novelty) from live match cards
    const isPlacement = f.sport_name === 'Athletics' || f.sport_name === 'Novelty';
    if (isPlacement) return false;
    
    // Status filter
    const statusMatch = statusFilter === 'upcoming' 
      ? f.status === 'upcoming' 
      : (f.status === 'completed' || f.status === 'draw');
      
    if (!statusMatch) return false;
    
    // Sport filter
    if (sportFilter !== 'All' && f.sport_name !== sportFilter) return false;
    
    return true;
  }) || [];

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading live scores...</div>;

  const showLineupsFeature = settings?.enable_player_registration;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {isAuthenticated 
            ? "Log points and manage active match timers in real time."
            : "Sign in via Official Access to update scores and log player points."}
        </p>
        <button className="k-btn text-xs shrink-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700" onClick={() => window.location.reload()}>Refresh List</button>
      </div>

      <div className="flex flex-col gap-4 mb-6 border-b border-gray-100 dark:border-gray-850 pb-4">
        {/* Status Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setStatusFilter('upcoming');
              setSportFilter('All');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'upcoming'
                ? 'bg-blue-600 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            Active & Upcoming ({fixtures?.filter(f => f.status === 'upcoming' && f.sport_name !== 'Athletics' && f.sport_name !== 'Novelty').length || 0})
          </button>
          <button
            onClick={() => {
              setStatusFilter('completed');
              setSportFilter('All');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-blue-600 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
          >
            Completed & Draws ({fixtures?.filter(f => (f.status === 'completed' || f.status === 'draw') && f.sport_name !== 'Athletics' && f.sport_name !== 'Novelty').length || 0})
          </button>
        </div>

        {/* Sport Filters */}
        <div className="flex flex-wrap gap-2">
          {availableSports.map(s => (
            <button
              key={s}
              onClick={() => setSportFilter(s)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                sportFilter === s
                  ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 shadow-sm'
                  : 'border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-h-[700px] overflow-y-auto pr-2">
        {filteredFixtures.map(f => (
          <LiveMatchCard 
            key={f.id} 
            fixture={f} 
            isAuthenticated={isAuthenticated} 
            showLineups={showLineupsFeature} 
          />
        ))}

        {filteredFixtures.length === 0 && (
          <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-800/10 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400">
            <Award className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700 animate-pulse" />
            <h3 className="font-semibold text-sm">No Matches Found</h3>
            <p className="text-xs max-w-xs mx-auto mt-1 leading-relaxed">
              {statusFilter === 'upcoming' 
                ? 'All matches are either completed or have not been generated yet.' 
                : 'No matches have been completed yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveMatchCard({ fixture, isAuthenticated, showLineups }) {
  const updateScore = useUpdateScore();
  
  // Local score states for input bindings
  const [scoreA, setScoreA] = useState(fixture.score_a || 0);
  const [scoreB, setScoreB] = useState(fixture.score_b || 0);
  
  // Selected player for points logging
  const [selectedPlayerA, setSelectedPlayerA] = useState('');
  const [selectedPlayerB, setSelectedPlayerB] = useState('');
  const [logPointsA, setLogPointsA] = useState(1);
  const [logPointsB, setLogPointsB] = useState(1);

  // Load lineup only if enabled
  const { data: lineup } = useLineups(showLineups ? fixture.id : null);
  const [saveStatus, setSaveStatus] = useState(null);

  const activePlayersA = lineup?.filter(l => l.team_id === fixture.team_a_id) || [];
  const activePlayersB = lineup?.filter(l => l.team_id === fixture.team_b_id) || [];

  const handleSaveResult = () => {
    setSaveStatus('saving');
    updateScore.mutate({
      id: fixture.id,
      score_a: scoreA,
      score_b: scoreB
    }, {
      onSuccess: () => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 3000);
      },
      onError: () => {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    });
  };

  const handleLogPlayerPoints = (teamSide) => {
    const isTeamA = teamSide === 'A';
    const playerId = isTeamA ? selectedPlayerA : selectedPlayerB;
    const points = parseInt(isTeamA ? logPointsA : logPointsB) || 1;
    
    if (!playerId) {
      alert('Please select a player to log points.');
      return;
    }

    // Increment local and database score
    const newScoreA = isTeamA ? (scoreA + points) : scoreA;
    const newScoreB = isTeamA ? scoreB : (scoreB + points);

    // Save updated score + attribute points to player
    setSaveStatus('saving');
    updateScore.mutate({
      id: fixture.id,
      score_a: newScoreA,
      score_b: newScoreB,
      playerId,
      pointsScored: points
    }, {
      onSuccess: () => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 3000);
      },
      onError: () => {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    });

    // Update local state
    if (isTeamA) {
      setScoreA(newScoreA);
      setSelectedPlayerA('');
    } else {
      setScoreB(newScoreB);
      setSelectedPlayerB('');
    }
  };

  return (
    <div className="k-card p-4 space-y-4">
      <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <SportTag sport={fixture.sport_name} />
          {fixture.status === 'completed' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-600 dark:text-green-400 animate-in fade-in zoom-in-95 duration-150">Completed</span>
          )}
          {fixture.status === 'draw' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 animate-in fade-in zoom-in-95 duration-150">Draw</span>
          )}
        </div>
        <span className="text-xs text-gray-400 font-mono">{fixture.time || fixture.scheduled_at?.slice(11, 16)} · {fixture.venue_name}</span>
      </div>

      {saveStatus && (
        <div className={`text-xs p-2.5 rounded-lg flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
          saveStatus === 'saved' ? 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400' :
          saveStatus === 'saving' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400' :
          'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          {saveStatus === 'saved' && <Check size={14} />}
          {saveStatus === 'saving' && <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />}
          {saveStatus === 'error' && <ShieldAlert size={14} />}
          <span>
            {saveStatus === 'saved' ? 'Score saved successfully!' :
             saveStatus === 'saving' ? 'Saving score...' :
             'Failed to save score. Please try again.'}
          </span>
        </div>
      )}

      <div className="flex items-center gap-6 justify-center my-4">
        {/* Team A */}
        <div className="text-center flex flex-col items-center flex-1">
          <TeamPill code={fixture.team_a_code} name={fixture.team_a_name} logoUrl={fixture.team_a_logo} />
          {isAuthenticated ? (
            <input
              type="number"
              className="k-score-input mt-2"
              value={scoreA}
              onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
            />
          ) : (
            <span className="text-3xl font-extrabold mt-2 tabular-nums">{fixture.score_a !== null ? fixture.score_a : '—'}</span>
          )}
        </div>

        <span className="text-lg font-bold text-gray-400 font-mono">VS</span>

        {/* Team B */}
        <div className="text-center flex flex-col items-center flex-1">
          <TeamPill code={fixture.team_b_code} name={fixture.team_b_name} logoUrl={fixture.team_b_logo} />
          {isAuthenticated ? (
            <input
              type="number"
              className="k-score-input mt-2"
              value={scoreB}
              onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
            />
          ) : (
            <span className="text-3xl font-extrabold mt-2 tabular-nums">{fixture.score_b !== null ? fixture.score_b : '—'}</span>
          )}
        </div>
      </div>

      {/* Scorer Logging Panels (Visible if player sheets enabled) */}
      {isAuthenticated && showLineups && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50/50 dark:bg-gray-850/20 rounded-xl border border-gray-100 dark:border-gray-800">
          {/* Team A Scorer */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Target size={12} className="text-blue-500" />
              <span>Log {fixture.team_a_name} Scorer</span>
            </div>
            <div className="flex gap-1.5">
              <select
                value={selectedPlayerA}
                onChange={(e) => setSelectedPlayerA(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
              >
                <option value="">Select Scorer...</option>
                {activePlayersA.map(p => (
                  <option key={p.player_id} value={p.player_id}>
                    #{p.jersey_number || '—'} {p.player_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={logPointsA}
                onChange={(e) => setLogPointsA(parseInt(e.target.value) || 1)}
                className="w-12 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-center font-bold"
                placeholder="Pts"
                min="1"
              />
              <button
                onClick={() => handleLogPlayerPoints('A')}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shrink-0 cursor-pointer"
              >
                Log
              </button>
            </div>
          </div>

          {/* Team B Scorer */}
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Target size={12} className="text-red-500" />
              <span>Log {fixture.team_b_name} Scorer</span>
            </div>
            <div className="flex gap-1.5">
              <select
                value={selectedPlayerB}
                onChange={(e) => setSelectedPlayerB(e.target.value)}
                className="flex-1 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
              >
                <option value="">Select Scorer...</option>
                {activePlayersB.map(p => (
                  <option key={p.player_id} value={p.player_id}>
                    #{p.jersey_number || '—'} {p.player_name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={logPointsB}
                onChange={(e) => setLogPointsB(parseInt(e.target.value) || 1)}
                className="w-12 px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-center font-bold"
                placeholder="Pts"
                min="1"
              />
              <button
                onClick={() => handleLogPlayerPoints('B')}
                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold shrink-0 cursor-pointer"
              >
                Log
              </button>
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-gray-100 dark:border-gray-800/60">
          <button
            className="k-btn k-btn-primary text-xs cursor-pointer"
            onClick={handleSaveResult}
          >
            Save final score
          </button>
          <button
            className="k-btn text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => {
              setScoreA(0);
              setScoreB(20);
              setSaveStatus('saving');
              updateScore.mutate({ id: fixture.id, score_a: 0, score_b: 20 }, {
                onSuccess: () => {
                  setSaveStatus('saved');
                  setTimeout(() => setSaveStatus(null), 3000);
                },
                onError: () => {
                  setSaveStatus('error');
                  setTimeout(() => setSaveStatus(null), 3000);
                }
              });
            }}
          >
            Forfeit Team A (0-20)
          </button>
          <button
            className="k-btn text-xs border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => {
              setScoreA(20);
              setScoreB(0);
              setSaveStatus('saving');
              updateScore.mutate({ id: fixture.id, score_a: 20, score_b: 0 }, {
                onSuccess: () => {
                  setSaveStatus('saved');
                  setTimeout(() => setSaveStatus(null), 3000);
                },
                onError: () => {
                  setSaveStatus('error');
                  setTimeout(() => setSaveStatus(null), 3000);
                }
              });
            }}
          >
            Forfeit Team B (20-0)
          </button>
        </div>
      )}

      {isAuthenticated && (
        <MatchTimerControl fixtureId={fixture.id} defaultMinutes={fixture.duration_minutes || 10} />
      )}
    </div>
  );
}
