import { useLogStandings } from '../hooks/useStandings.js';
import TeamPill from '../components/TeamPill.jsx';

export default function LogStandings() {
  const { data: log, isLoading } = useLogStandings();

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading log standings...</div>;

  const maxTotal = Math.max(...(log?.map(d => d.total) || [1]));

  return (
    <div className="space-y-4">
      <div className="k-card">
        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Overall Championship Log — All Sports Combined
        </div>
        <div className="text-xs text-gray-400 mb-4">
          Points per sport: Gold=10 · Silver=7 · Bronze=5 · 4th=3 · 5th=2 · 6th=1
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-10 gap-2 text-xs text-gray-400 font-medium mb-2 text-center">
              <span>#</span>
              <span className="text-left col-span-2">District</span>
              <span>BB</span><span>VB</span><span>SC</span><span>TOW</span><span>ATH</span><span>NOV</span>
              <span>Total</span>
            </div>
            {log?.map((d, i) => {
              const pct = Math.round((d.total / maxTotal) * 100);
              const barColor = i === 0 ? 'bg-green-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-emerald-500' : 'bg-gray-400';
              return (
                <div key={d.code}>
                  <div className="grid grid-cols-10 gap-2 items-center py-2 text-center text-sm hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded">
                    <span className="font-semibold text-gray-500">{i + 1}</span>
                    <span className="text-left col-span-2">
                      <TeamPill code={d.code} name={d.name} />
                    </span>
                    <span>{d.BB || '—'}</span>
                    <span>{d.VB || '—'}</span>
                    <span>{d.SC || '—'}</span>
                    <span>{d.TW || '—'}</span>
                    <span>{d.AT || '—'}</span>
                    <span>{d.NV || '—'}</span>
                    <span className="font-semibold">{d.total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Points Distribution</div>
          <div className="space-y-3">
            {log?.map((d, i) => {
              const pct = Math.round((d.total / maxTotal) * 100);
              return (
                <div key={d.code}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-gray-400">{d.total} pts</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="h-full rounded-full bg-gray-900 dark:bg-white" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Medal Breakdown</div>
          <div className="space-y-2">
            {log?.map(d => (
              <div key={d.code} className="flex items-center gap-2 text-sm">
                <TeamPill code={d.code} name={d.name} />
                <span className="ml-auto flex gap-3">
                  <span className="text-amber-600 font-semibold">{d.gold}G</span>
                  <span className="text-gray-500 font-semibold">{d.silver}S</span>
                  <span className="text-amber-800 font-semibold">{d.bronze}B</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
