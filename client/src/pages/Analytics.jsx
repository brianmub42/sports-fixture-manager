import { useState } from 'react';
import { useAnalytics } from '../hooks/useStandings.js';
import TeamPill from '../components/TeamPill.jsx';
import SportTag from '../components/SportTag.jsx';
import { Activity, ArrowUpRight, ArrowDownRight, Zap, Target, Award, Info } from 'lucide-react';

const sports = ['All', 'Basketball', 'Volleyball', 'Soccer', 'Tug of War'];

export default function Analytics() {
  const [filter, setFilter] = useState('All');
  const { data, isLoading, error } = useAnalytics(filter);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load analytics</div>;

  const { teamMetrics, records, topScorers } = data;

  const RecordCard = ({ title, fixture, icon: Icon, colorClass }) => {
    if (!fixture) return (
      <div className="k-card flex flex-col justify-center items-center py-8 text-xs text-gray-400">
        <Icon size={20} className={`mb-2 ${colorClass}`} />
        <span className="font-semibold text-center">{title}</span>
        <span className="mt-1 text-center">No completed matches</span>
      </div>
    );
    return (
      <div className="k-card">
        <div className={`flex items-center gap-2 mb-4 ${colorClass}`}>
          <Icon size={18} />
          <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase">{fixture.sport_name}</span>
            <span className="text-xs font-medium text-gray-400">{new Date(fixture.scheduled_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col items-center gap-2">
              <TeamPill code={fixture.team_a_code} name={fixture.team_a_name} logoUrl={fixture.team_a_logo} />
              <span className="text-2xl font-bold">{fixture.score_a}</span>
            </div>
            <span className="text-gray-400 font-mono text-sm">VS</span>
            <div className="flex flex-col items-center gap-2">
              <TeamPill code={fixture.team_b_code} name={fixture.team_b_name} logoUrl={fixture.team_b_logo} />
              <span className="text-2xl font-bold">{fixture.score_b}</span>
            </div>
          </div>
          {title === 'Biggest Blowout' && (
            <div className="text-center text-sm font-medium text-gray-500 mt-1">
              Margin: <span className="font-bold text-gray-900 dark:text-white">{Math.abs(fixture.score_a - fixture.score_b)} pts</span>
            </div>
          )}
          {title === 'Highest Scoring' && (
            <div className="text-center text-sm font-medium text-gray-500 mt-1">
              Total Points: <span className="font-bold text-gray-900 dark:text-white">{fixture.score_a + fixture.score_b} pts</span>
            </div>
          )}
          {title === 'Lowest Scoring' && (
            <div className="text-center text-sm font-medium text-gray-500 mt-1">
              Total Points: <span className="font-bold text-gray-900 dark:text-white">{fixture.score_a + fixture.score_b} pts</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  let scoreForLabel = 'PF (Points For)';
  let scoreAgainstLabel = 'PA (Points Against)';
  let scoreDiffLabel = 'Point Diff';

  if (filter === 'Soccer') {
    scoreForLabel = 'GF (Goals For)';
    scoreAgainstLabel = 'GA (Goals Against)';
    scoreDiffLabel = 'Goal Diff';
  } else if (filter === 'Volleyball') {
    scoreForLabel = 'SF (Sets For)';
    scoreAgainstLabel = 'SA (Sets Against)';
    scoreDiffLabel = 'Set Diff';
  } else if (filter === 'Tug of War') {
    scoreForLabel = 'PF (Pulls For)';
    scoreAgainstLabel = 'PA (Pulls Against)';
    scoreDiffLabel = 'Pull Diff';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Deep dive into team performance and match records</p>
        </div>
      </div>

      {/* Sport Selector Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {sports.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filter === s
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                : 'border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Information Banner for All Sports selection */}
      {filter === 'All' && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-400 p-3.5 rounded-lg flex items-start gap-2.5 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            When <strong>All Sports</strong> is selected, Points For (PF) and Points Against (PA) show the sum of raw scores across all sports (e.g. basketball points + soccer goals). Use the sport filters above to view accurate, sport-specific metrics.
          </span>
        </div>
      )}

      {/* Records Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RecordCard title="Biggest Blowout" fixture={records.biggestBlowout} icon={Zap} colorClass="text-amber-500" />
        <RecordCard title="Highest Scoring" fixture={records.highestScoring} icon={ArrowUpRight} colorClass="text-green-500" />
        <RecordCard title="Lowest Scoring" fixture={records.lowestScoring} icon={ArrowDownRight} colorClass="text-blue-500" />
      </div>

      {/* Dashboard Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Metrics */}
        <div className="k-card lg:col-span-2 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-purple-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wide">Team Performance Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Team</th>
                  <th className="px-4 py-3 font-semibold text-center">Played</th>
                  <th className="px-4 py-3 font-semibold text-center">Win Rate</th>
                  <th className="px-4 py-3 font-semibold text-center">{scoreForLabel}</th>
                  <th className="px-4 py-3 font-semibold text-center">{scoreAgainstLabel}</th>
                  <th className="px-4 py-3 font-semibold text-center">{scoreDiffLabel}</th>
                </tr>
              </thead>
              <tbody>
                {teamMetrics?.map((team, idx) => {
                  const winRate = team.played > 0 ? Math.round((team.won / team.played) * 100) : 0;
                  return (
                    <tr key={team.code} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <td className="px-4 py-3">
                        <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{team.played}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-semibold">{winRate}%</span>
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full" 
                              style={{ width: `${winRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-mono">{team.pf || 0}</td>
                      <td className="px-4 py-3 text-center text-red-600 dark:text-red-400 font-mono">{team.pa || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-mono font-bold text-xs ${team.point_diff > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : team.point_diff < 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {team.point_diff > 0 ? '+' : ''}{team.point_diff || 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Scorers */}
        <div className="k-card overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-amber-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wide">Top Scorers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-semibold">Player</th>
                  <th className="px-4 py-3 font-semibold text-center">Points</th>
                </tr>
              </thead>
              <tbody>
                {topScorers?.map((player, idx) => (
                  <tr key={player.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 font-mono w-4">#{idx + 1}</span>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                        <span className="text-[10px] text-gray-400">{player.team_code} · #{player.jersey_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400 font-mono">{player.total_points}</td>
                  </tr>
                ))}
                {(!topScorers || topScorers.length === 0) && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-xs text-gray-400">No scorer data recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
