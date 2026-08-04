import { useFixtures, useUpdateScore } from '../hooks/useFixtures.js';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LiveScores() {
  const { data: fixtures, isLoading } = useFixtures();
  const updateScore = useUpdateScore();
  const { isAuthenticated } = useAuth();

  const liveFixtures = fixtures?.filter(f => f.status === 'upcoming' && f.sport_name !== 'Athletics') || [];

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <p className="text-xs sm:text-sm font-medium">
          {isAuthenticated 
            ? "Enter match results to auto-update standings"
            : "Upcoming live matches. Sign in via Official Access to edit scores."}
        </p>
        <button className="k-btn text-xs shrink-0" onClick={() => window.location.reload()}>Refresh</button>
      </div>
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {liveFixtures.slice(0, 20).map(f => (
          <div key={f.id} className="k-card">
            <div className="flex justify-between items-center mb-3">
              <SportTag sport={f.sport_name} />
              <span className="text-xs text-gray-400">{f.time || f.scheduled_at} · {f.venue_name}</span>
            </div>
            <div className="flex items-center gap-4 justify-center my-4">
              <div className="text-center flex flex-col items-center">
                <TeamPill code={f.team_a_code} name={f.team_a_name} />
                {isAuthenticated && (
                  <input
                    type="number"
                    className="k-score-input mt-2"
                    defaultValue={f.score_a || ''}
                    onChange={(e) => f._scoreA = e.target.value}
                  />
                )}
              </div>
              <span className="text-lg font-semibold text-gray-400">VS</span>
              <div className="text-center flex flex-col items-center">
                <TeamPill code={f.team_b_code} name={f.team_b_name} />
                {isAuthenticated && (
                  <input
                    type="number"
                    className="k-score-input mt-2"
                    defaultValue={f.score_b || ''}
                    onChange={(e) => f._scoreB = e.target.value}
                  />
                )}
              </div>
            </div>
            {isAuthenticated && (
              <div className="flex flex-wrap gap-2 justify-center">
              <button
                className="k-btn k-btn-primary text-xs"
                onClick={() => {
                  const sa = parseInt(f._scoreA || f.score_a || 0);
                  const sb = parseInt(f._scoreB || f.score_b || 0);
                  updateScore.mutate({ id: f.id, score_a: sa, score_b: sb });
                }}
              >
                Save result
              </button>
              <button
                className="k-btn text-xs"
                onClick={() => updateScore.mutate({ id: f.id, score_a: 0, score_b: 20 })}
              >
                Forfeit A (0-20)
              </button>
            </div>
            )}
          </div>
        ))}
        {liveFixtures.length === 0 && (
          <div className="text-center py-12 text-gray-400">No upcoming matches</div>
        )}
      </div>
    </div>
  );
}
