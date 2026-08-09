import { useState, useEffect, useRef } from 'react';
import { useTeamSchedule, useTeams, useSettings } from '../hooks/useFixtures.js';
import { usePlayers, useAddPlayer, useDeletePlayer } from '../hooks/usePlayers.js';
import TeamPill from '../components/TeamPill.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { uploadApi } from '../api.js';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Calendar, Users, Plus, Trash2, ShieldAlert } from 'lucide-react';

export default function Teams() {
  const { data: teamList, isLoading: teamsLoading } = useTeams();
  const { data: settings } = useSettings();
  const [selected, setSelected] = useState('');
  const { isScorekeeper } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Add Player form state
  const [playerName, setPlayerName] = useState('');
  const [playerJersey, setPlayerJersey] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  // Automatically select the first team when loaded
  useEffect(() => {
    if (teamList && teamList.length > 0 && !selected) {
      setSelected(teamList[0].code);
    }
  }, [teamList, selected]);

  const currentTeam = teamList?.find(t => t.code === selected) || teamList?.[0];
  const teamId = currentTeam?.id;

  const { data: schedule, isLoading: scheduleLoading } = useTeamSchedule(selected);
  const { data: roster, isLoading: rosterLoading } = usePlayers(teamId);

  const addPlayerMutation = useAddPlayer();
  const deletePlayerMutation = useDeletePlayer();

  if (teamsLoading) {
    return <div className="text-center py-8 text-gray-400">Loading teams...</div>;
  }

  if (!teamList || teamList.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No teams found. Go to the Generate page to create fixtures and register teams.
      </div>
    );
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadApi.uploadLogo(currentTeam.code, file);
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['fixtures'] });
      queryClient.invalidateQueries({ queryKey: ['schedule', currentTeam.code] });
    } catch (err) {
      alert('Failed to upload logo: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddPlayerSubmit = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    try {
      setAddingPlayer(true);
      await addPlayerMutation.mutateAsync({
        teamId,
        player: { name: playerName.trim(), jersey_number: playerJersey.trim() }
      });
      setPlayerName('');
      setPlayerJersey('');
    } catch (err) {
      alert('Failed to add player: ' + (err.response?.data?.error || err.message));
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this player from the roster?')) return;

    try {
      await deletePlayerMutation.mutateAsync({ teamId, playerId });
    } catch (err) {
      alert('Failed to delete player: ' + (err.response?.data?.error || err.message));
    }
  };

  const showRoster = settings?.enable_player_registration;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-500"
        >
          {teamList.map(t => (
            <option key={t.code} value={t.code}>{t.name} ({t.code})</option>
          ))}
        </select>
      </div>

      {/* Team Profile */}
      <div className="k-card flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            {currentTeam.logo_url ? (
              <img src={currentTeam.logo_url} alt={currentTeam.name} className="w-16 h-16 rounded-xl object-cover bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm" />
            ) : (
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md"
                style={{ backgroundColor: currentTeam.color || '#2563eb' }}
              >
                {currentTeam.code}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{currentTeam.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Team Profile & Roster</p>
          </div>
        </div>
        
        {isScorekeeper && (
          <div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleLogoUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="k-btn bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Upload size={14} className={uploading ? 'animate-bounce' : ''} />
              <span>{uploading ? 'Uploading...' : 'Change Logo'}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team Schedule */}
        <div className="k-card flex flex-col">
          <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            <span>Match Schedule</span>
          </div>
          {scheduleLoading ? (
            <div className="text-center py-8 text-gray-400 flex-1">Loading schedule...</div>
          ) : (
            <div className="overflow-y-auto pr-1 space-y-2 max-h-[450px] flex-1">
              {schedule?.map(f => {
                const opponentCode = f.team_a_code === selected ? f.team_b_code : f.team_a_code;
                const opponentName = f.team_a_code === selected ? f.team_b_name : f.team_a_name;
                const opponentColor = f.team_a_code === selected ? f.team_b_color : f.team_a_color;
                const opponentLogo = f.team_a_code === selected ? f.team_b_logo : f.team_a_logo;
                const isAll = f.team_b_name === 'All Teams' || f.team_b_name === 'All Districts';
                
                return (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800/50 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400 font-mono">{f.time || new Date(f.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · {f.venue_name}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{f.sport_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">vs</span>
                      {isAll ? (
                        <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs font-semibold">All Teams</span>
                      ) : (
                        <TeamPill code={opponentCode} name={opponentName} color={opponentColor} logoUrl={opponentLogo} />
                      )}
                    </div>
                  </div>
                );
              })}
              {(!schedule || schedule.length === 0) && (
                <div className="text-center py-12 text-gray-400">No scheduled matches for this team.</div>
              )}
            </div>
          )}
        </div>

        {/* Player Roster Section */}
        {showRoster ? (
          <div className="k-card flex flex-col">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users size={16} className="text-purple-500" />
                <span>Roster / Registered Players</span>
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 font-bold tabular-nums">
                {roster?.length || 0} active
              </span>
            </div>

            {rosterLoading ? (
              <div className="text-center py-8 text-gray-400 flex-1">Loading roster...</div>
            ) : (
              <div className="flex flex-col flex-1 space-y-4">
                {/* Roster List */}
                <div className="overflow-y-auto pr-1 space-y-1.5 max-h-[300px] flex-1">
                  {roster?.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800/30 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono font-bold text-xs">
                          {p.jersey_number ? `#${p.jersey_number}` : '—'}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                      </div>
                      {isScorekeeper && (
                        <button
                          onClick={() => handleDeletePlayer(p.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Remove Player"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(!roster || roster.length === 0) && (
                    <div className="text-center py-12 text-gray-400 italic">No players registered on the team roster yet.</div>
                  )}
                </div>

                {/* Add Player Form (Visible to Scorekeeper / Admin) */}
                {isScorekeeper && (
                  <form onSubmit={handleAddPlayerSubmit} className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Register New Player</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Player Full Name"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={playerJersey}
                        onChange={(e) => setPlayerJersey(e.target.value)}
                        placeholder="Jersey #"
                        className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs text-center focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={addingPlayer}
                        className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="k-card flex flex-col justify-center items-center p-6 text-center text-gray-400/80 bg-gray-50/50 dark:bg-gray-800/10 border border-dashed border-gray-200 dark:border-gray-850">
            <Users size={32} className="text-gray-300 dark:text-gray-600 mb-2 animate-pulse" />
            <h3 className="font-semibold text-sm mb-1 text-gray-600 dark:text-gray-400">Rosters Disabled</h3>
            <p className="text-xs max-w-xs leading-relaxed">
              Player registration is currently disabled for this tournament workspace. Turn it on in the Settings tab to manage team sheets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
