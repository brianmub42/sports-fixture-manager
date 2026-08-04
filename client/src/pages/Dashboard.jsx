import { useFixtures } from '../hooks/useFixtures.js';
import { useLogStandings } from '../hooks/useStandings.js';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';

export default function Dashboard() {
  const { data: fixtures } = useFixtures();
  const { data: log } = useLogStandings();

  const completed = fixtures?.filter(f => f.status === 'completed').length || 0;
  const total = fixtures?.length || 87;
  const upcoming = total - completed;

  const nextMatches = fixtures?.filter(f => f.status === 'upcoming' && f.sport_name !== 'Athletics').slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Matches</div>
          <div className="text-3xl font-semibold">{total}</div>
          <div className="text-xs text-gray-400 mt-1">Across all sports</div>
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded mt-3">
            <div className="h-full bg-gray-900 dark:bg-white rounded" style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed</div>
          <div className="text-3xl font-semibold">{completed}</div>
          <div className="text-xs text-gray-400 mt-1">Matches finished</div>
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded mt-3">
            <div className="h-full bg-green-500 rounded" style={{ width: `${(completed / total) * 100}%` }} />
          </div>
        </div>
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Upcoming</div>
          <div className="text-3xl font-semibold">{upcoming}</div>
          <div className="text-xs text-gray-400 mt-1">Remaining fixtures</div>
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded mt-3">
            <div className="h-full bg-gray-400 rounded" style={{ width: `${(upcoming / total) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Current Phase</div>
          <div className="font-medium text-lg">Basketball + Volleyball (Concurrent)</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            15 rounds · 1 BB Court + 2 VB Courts<br />
            All 6 districts play simultaneously<br />
            Time: 09:48 – 12:18 (150 min)
          </p>
          <div className="flex gap-2 mt-3">
            <SportTag sport="Basketball" />
            <SportTag sport="Volleyball" />
          </div>
        </div>
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Medal Tally</div>
          <div className="space-y-2">
            {log?.map(d => (
              <div key={d.code} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-medium">{d.name} ({d.code})</span>
                <span className="w-6 text-center text-amber-600 font-semibold">{d.gold}</span>
                <span className="w-6 text-center text-gray-500 font-semibold">{d.silver}</span>
                <span className="w-6 text-center text-amber-800 font-semibold">{d.bronze}</span>
                <span className="w-8 text-right font-semibold">{d.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="k-card">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Next Up</div>
        <div className="space-y-2">
          {nextMatches?.map(f => (
            <div key={f.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
              <div className="flex items-center gap-2 sm:w-auto">
                <span className="text-xs text-gray-400 shrink-0">{f.time?.split('-')[0]}</span>
                <SportTag sport={f.sport_name} />
              </div>
              <span className="flex-1 flex items-center gap-2 text-sm font-medium flex-wrap">
                <TeamPill code={f.team_a_code} name={f.team_a_name} />
                <span className="text-gray-400 text-xs">vs</span>
                <TeamPill code={f.team_b_code} name={f.team_b_name} />
              </span>
              <span className="text-xs text-gray-400">{f.venue_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
