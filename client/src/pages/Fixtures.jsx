import { useState } from 'react';
import { useFixtures } from '../hooks/useFixtures.js';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';

const sports = ['All', 'Athletics', 'Basketball', 'Volleyball', 'Soccer', 'Tug of War'];

export default function Fixtures() {
  const [filter, setFilter] = useState('All');
  const { data: fixtures, isLoading } = useFixtures(filter === 'All' ? {} : { sport: filter });

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading fixtures...</div>;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {sports.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {/* Desktop table view */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Sport</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Venue</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Matchup</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Score</th>
              <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {fixtures?.map(f => (
              <tr key={f.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{f.time || f.scheduled_at}</td>
                <td className="py-2 px-3"><SportTag sport={f.sport_name} /></td>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{f.venue_name}</td>
                <td className="py-2 px-3">
                  {f.sport_name === 'Athletics' ? (
                    <span className="text-sm">{f.team_a_name}</span>
                  ) : (
                    <span className="flex items-center gap-1 flex-wrap">
                      <TeamPill code={f.team_a_code} name={f.team_a_name} />
                      <span className="text-gray-400 text-xs">vs</span>
                      <TeamPill code={f.team_b_code} name={f.team_b_name} />
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 font-medium tabular-nums">
                  {f.score_a !== null ? `${f.score_a} - ${f.score_b}` : '—'}
                </td>
                <td className="py-2 px-3">
                  {f.status === 'completed' ? (
                    <span className="text-xs font-medium text-green-600">Done</span>
                  ) : (
                    <span className="text-xs text-gray-400">Upcoming</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {fixtures?.map(f => (
          <div key={f.id} className="k-card p-3 space-y-2">
            <div className="flex justify-between items-center">
              <SportTag sport={f.sport_name} />
              <div className="flex items-center gap-2">
                {f.status === 'completed' ? (
                  <span className="text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full">Done</span>
                ) : (
                  <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">Upcoming</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 py-1">
              {f.sport_name === 'Athletics' ? (
                <span className="text-sm font-medium">{f.team_a_name}</span>
              ) : (
                <>
                  <TeamPill code={f.team_a_code} name={f.team_a_name} />
                  <span className="text-xs text-gray-400 font-bold">
                    {f.score_a !== null ? `${f.score_a} - ${f.score_b}` : 'vs'}
                  </span>
                  <TeamPill code={f.team_b_code} name={f.team_b_name} />
                </>
              )}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>{f.time || f.scheduled_at}</span>
              <span>{f.venue_name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
