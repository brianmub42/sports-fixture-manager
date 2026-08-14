import { useState, useEffect } from 'react';
import { useStandings } from '../hooks/useStandings.js';
import { useSettings, useSports } from '../hooks/useFixtures.js';
import TeamPill from '../components/TeamPill.jsx';
import { Download, Trophy } from 'lucide-react';
import { exportStandingsToPDF } from '../utils/pdfExport.js';

export default function Standings() {
  const [sport, setSport] = useState('');
  const { data: sportsData, isLoading: loadingSports } = useSports();
  const { data: standings, isLoading } = useStandings(sport);
  const { data: settings } = useSettings();

  const sports = sportsData?.map(s => s.name) || [];

  useEffect(() => {
    if (sports.length > 0 && !sport) {
      setSport(sports[0]);
    }
  }, [sports, sport]);

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
            onClick={() => setSport(s)}
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
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            {sport} — {sport === 'Athletics' ? 'Track Events' : 'Round-Robin Standings'}
          </div>
          <div className="grid grid-cols-8 gap-2 text-xs text-gray-400 font-medium mb-2 px-2">
            <span className="col-span-2">Team</span>
            <span className="text-center">P</span>
            <span className="text-center">W</span>
            <span className="text-center">L</span>
            <span className="text-center">PF</span>
            <span className="text-center">PA</span>
            <span className="text-center">PTS</span>
          </div>
          <div className="space-y-1">
            {standings?.map((team, i) => (
              <div key={team.code} className="grid grid-cols-8 gap-2 items-center py-2 px-2 border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <span className="col-span-1">
                  <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                </span>
                <span className="text-center text-sm text-gray-600">{team.played}</span>
                <span className="text-center text-sm text-gray-600">{team.won}</span>
                <span className="text-center text-sm text-gray-600">{team.lost}</span>
                <span className="text-center text-sm text-gray-600">{team.pf}</span>
                <span className="text-center text-sm text-gray-600">{team.pa}</span>
                <span className="text-center text-sm font-semibold">{team.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
