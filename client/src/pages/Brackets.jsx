import { useState } from 'react';
import { useFixtures } from '../hooks/useFixtures.js';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';
import { Network, Trophy, HelpCircle, GitFork } from 'lucide-react';

export default function Brackets() {
  const { data: fixtures, isLoading } = useFixtures();
  const [selectedSport, setSelectedSport] = useState('Basketball');

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading bracket details...</div>;

  // Get list of sports that have playoff matches
  const sportsWithPlayoffs = Array.from(
    new Set(
      fixtures
        ?.filter(f => f.round && (f.round.includes('Quarter-final') || f.round.includes('Semi-final') || f.round === 'Final'))
        .map(f => f.sport_name)
    )
  );

  const activeSport = selectedSport || sportsWithPlayoffs[0] || 'Basketball';
  const sportFixtures = fixtures?.filter(f => f.sport_name === activeSport) || [];

  // Group by round
  const quarters = sportFixtures.filter(f => f.round.includes('Quarter-final')).sort((a, b) => a.round.localeCompare(b.round));
  const semis = sportFixtures.filter(f => f.round.includes('Semi-final')).sort((a, b) => a.round.localeCompare(b.round));
  const final = sportFixtures.find(f => f.round === 'Final');

  const renderPlaceholder = (notes, pos) => {
    if (!notes) return <span className="text-xs text-gray-500 italic">Undecided</span>;
    // Extract e.g. team_a=Quarter-final 1
    const parts = notes.split(',');
    const part = parts.find(p => p.includes(pos));
    if (part) {
      const source = part.split('=')[1];
      return <span className="text-xs text-gray-500 italic">{source || 'Undecided'}</span>;
    }
    return <span className="text-xs text-gray-500 italic">Undecided</span>;
  };

  const MatchCard = ({ match }) => {
    if (!match) return (
      <div className="border border-dashed border-gray-300 dark:border-gray-800 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/20 text-center text-xs text-gray-500">
        TBD Match
      </div>
    );

    const isWinnerA = (match.status === 'completed' || match.status === 'draw') && match.winner_id === match.team_a_id;
    const isWinnerB = (match.status === 'completed' || match.status === 'draw') && match.winner_id === match.team_b_id;

    return (
      <div className="k-card relative hover:shadow-md transition-shadow flex flex-col justify-between h-[120px]">
        {/* Header info */}
        <div className="flex justify-between items-center text-[10px] text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-1.5 mb-2">
          <span className="font-bold uppercase tracking-wider">{match.round}</span>
          <span>{match.venue_name}</span>
        </div>

        {/* Team A */}
        <div className="flex justify-between items-center my-0.5">
          {match.team_a_id ? (
            <div className="flex items-center gap-1.5">
              <TeamPill code={match.team_a} name={match.team_a_name} />
              {isWinnerA && <Trophy className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            </div>
          ) : (
            renderPlaceholder(match.notes, 'team_a')
          )}
          <span className={`text-sm font-bold ${isWinnerA ? 'text-green-500' : 'text-gray-400'}`}>
            {match.status === 'completed' || match.status === 'draw' ? match.score_a : '-'}
          </span>
        </div>

        {/* Team B */}
        <div className="flex justify-between items-center my-0.5">
          {match.team_b_id ? (
            <div className="flex items-center gap-1.5">
              <TeamPill code={match.team_b} name={match.team_b_name} />
              {isWinnerB && <Trophy className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            </div>
          ) : (
            renderPlaceholder(match.notes, 'team_b')
          )}
          <span className={`text-sm font-bold ${isWinnerB ? 'text-green-500' : 'text-gray-400'}`}>
            {match.status === 'completed' || match.status === 'draw' ? match.score_b : '-'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitFork className="w-6 h-6 text-blue-500" /> Playoff Brackets
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Visual progression of single elimination tournament brackets.
          </p>
        </div>

        {/* Sport selector */}
        <div className="flex gap-2">
          {sportsWithPlayoffs.length > 0 ? (
            sportsWithPlayoffs.map(sport => (
              <button
                key={sport}
                onClick={() => setSelectedSport(sport)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  activeSport === sport
                    ? 'bg-blue-600 border-transparent text-white shadow-md shadow-blue-500/10'
                    : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {sport}
              </button>
            ))
          ) : (
            <div className="text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 px-3 py-2 rounded-lg">
              No playoff brackets configured yet. Generate a "playoff" format to begin.
            </div>
          )}
        </div>
      </div>

      {sportFixtures.length > 0 && (quarters.length > 0 || semis.length > 0 || final) ? (
        <div className="overflow-x-auto pb-6">
          <div className="flex items-center gap-8 md:gap-16 min-w-[800px] py-4">
            
            {/* Quarter-finals Column */}
            {quarters.length > 0 && (
              <div className="flex flex-col justify-around h-[520px] w-[240px] shrink-0">
                <div className="text-center font-bold text-xs uppercase tracking-widest text-gray-400 mb-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                  Quarter-finals
                </div>
                {quarters.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}

            {/* Connector Line 1 */}
            {quarters.length > 0 && semis.length > 0 && (
              <div className="w-8 shrink-0 flex flex-col justify-around h-[520px] text-gray-300 dark:text-gray-800">
                {/* Visual connectors drawn via Tailwind styling */}
                <div className="h-full flex flex-col justify-around py-12">
                  <div className="border-y-2 border-r-2 h-[120px] rounded-r-lg" />
                  <div className="border-y-2 border-r-2 h-[120px] rounded-r-lg" />
                </div>
              </div>
            )}

            {/* Semi-finals Column */}
            {semis.length > 0 && (
              <div className="flex flex-col justify-around h-[520px] w-[240px] shrink-0">
                <div className="text-center font-bold text-xs uppercase tracking-widest text-gray-400 mb-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                  Semi-finals
                </div>
                <MatchCard match={semis[0]} />
                <MatchCard match={semis[1]} />
              </div>
            )}

            {/* Connector Line 2 */}
            {semis.length > 0 && final && (
              <div className="w-8 shrink-0 flex flex-col justify-around h-[520px] text-gray-300 dark:text-gray-800">
                <div className="h-full flex flex-col justify-center py-24">
                  <div className="border-y-2 border-r-2 h-[240px] rounded-r-lg" />
                </div>
              </div>
            )}

            {/* Final Column */}
            {final && (
              <div className="flex flex-col justify-center h-[520px] w-[240px] shrink-0">
                <div className="text-center font-bold text-xs uppercase tracking-widest text-gray-400 mb-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                  Championship Final
                </div>
                <MatchCard match={final} />
              </div>
            )}

          </div>
        </div>
      ) : (
        sportFixtures.length > 0 && (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg mx-auto">
            <HelpCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-base font-bold">No Knockout Bracket Found</h3>
            <p className="text-xs text-gray-500 mt-1">
              There are fixtures for {activeSport}, but they do not match a knockout round robin tournament layout.
            </p>
          </div>
        )
      )}
    </div>
  );
}
