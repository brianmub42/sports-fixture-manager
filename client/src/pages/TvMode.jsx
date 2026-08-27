import { useEffect, useState } from 'react';
import { useFixtures, useSettings } from '../hooks/useFixtures.js';
import { useLiveUpdates } from '../hooks/useLiveUpdates.js';
import TeamPill from '../components/TeamPill.jsx';
import MatchTimerDisplay from '../components/MatchTimerDisplay.jsx';
import { Trophy, Clock, Tv } from 'lucide-react';

export default function TvMode() {
  const { data: liveFixtures, isLoading: loadingLive } = useFixtures({ status: 'live' });
  const { data: upcomingFixtures } = useFixtures({ status: 'upcoming' });
  const { data: settings } = useSettings();
  
  // Connect to websockets for auto-refresh
  useLiveUpdates();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Add dark mode class to body specifically for TV mode
    document.body.classList.add('dark', 'bg-gray-950', 'text-white');
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      document.body.classList.remove('bg-gray-950', 'text-white', 'dark');
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen p-8 flex flex-col font-sans bg-gray-950">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-4">
            <Tv className="w-10 h-10 text-blue-500" />
            {settings?.event_title || 'Tournament Live Dashboard'}
          </h1>
          <p className="text-xl text-gray-400 mt-2 font-medium tracking-wide uppercase">
            {settings?.org_name || 'Sports Manager'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold font-mono tracking-tighter">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="text-xl text-gray-400 mt-2 font-medium">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Live Matches Column (Takes up 2 columns) */}
        <div className="xl:col-span-2 flex flex-col">
          <div className="flex items-center gap-3 mb-6 text-red-500">
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-2xl font-bold uppercase tracking-wider">Live Matches</h2>
          </div>

          <div className="space-y-6 flex-1">
            {loadingLive ? (
              <div className="text-2xl text-gray-500 text-center py-20">Loading live action...</div>
            ) : !liveFixtures?.length ? (
              <div className="text-2xl text-gray-500 text-center py-20 border border-dashed border-gray-800 rounded-3xl h-64 flex items-center justify-center">
                No matches currently live
              </div>
            ) : (
              liveFixtures.map(f => (
                <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                  
                  <div className="flex justify-between items-center mb-6">
                    <span className="bg-gray-800 text-gray-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase">
                      {f.sport_name}
                    </span>
                    <span className="text-gray-400 text-sm font-medium">
                      {f.venue_name}
                    </span>
                  </div>

                  {f.scoring_type === 'placement' || f.sport_name === 'Athletics' ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 text-center px-4 leading-tight mb-4">
                        🏆 {f.team_a_name}
                      </span>
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <span className="text-red-500 font-bold tracking-widest text-sm uppercase animate-pulse">In Progress</span>
                        <MatchTimerDisplay fixtureId={f.id} defaultMinutes={f.duration_minutes || 10} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col items-center gap-4 w-1/3">
                        {f.team_a_logo ? (
                          <img src={f.team_a_logo} alt={f.team_a_name} className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-gray-700" />
                        ) : (
                          <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-lg" style={{ backgroundColor: f.team_a_color || '#3b82f6' }}>
                            {f.team_a_code}
                          </div>
                        )}
                        <span className="text-2xl font-bold text-center leading-tight">{f.team_a_name}</span>
                      </div>

                      <div className="flex flex-col items-center justify-center w-1/3">
                        <div className="text-7xl font-black font-mono tracking-tighter flex items-center gap-6">
                          <span className={f.score_a > f.score_b ? 'text-white' : 'text-gray-400'}>{f.score_a ?? 0}</span>
                          <span className="text-gray-600 text-5xl">-</span>
                          <span className={f.score_b > f.score_a ? 'text-white' : 'text-gray-400'}>{f.score_b ?? 0}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 mt-4">
                          <span className="text-red-500 font-bold tracking-widest text-sm uppercase animate-pulse">Live</span>
                          <MatchTimerDisplay fixtureId={f.id} defaultMinutes={f.duration_minutes || 10} />
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4 w-1/3">
                        {f.team_b_logo ? (
                          <img src={f.team_b_logo} alt={f.team_b_name} className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-gray-700" />
                        ) : (
                          <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-lg" style={{ backgroundColor: f.team_b_color || '#ef4444' }}>
                            {f.team_b_code}
                          </div>
                        )}
                        <span className="text-2xl font-bold text-center leading-tight">{f.team_b_name}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Matches Sidebar */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-6 text-blue-400">
            <Clock className="w-6 h-6" />
            <h2 className="text-2xl font-bold uppercase tracking-wider">Up Next</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col gap-4 overflow-hidden">
            {!upcomingFixtures?.length ? (
              <div className="text-xl text-gray-500 text-center py-10 flex-1 flex items-center justify-center">
                No upcoming matches scheduled
              </div>
            ) : (
              upcomingFixtures.slice(0, 7).map(f => (
                <div key={f.id} className="flex flex-col gap-2 p-4 bg-gray-950 rounded-2xl border border-gray-800/50">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <span>{f.time || new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{f.sport_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    {f.scoring_type === 'placement' || f.sport_name === 'Athletics' ? (
                      <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 truncate py-1">
                        🏆 {f.team_a_name}
                      </span>
                    ) : (
                      <>
                        <TeamPill code={f.team_a_code} name={f.team_a_name} color={f.team_a_color} logoUrl={f.team_a_logo} />
                        <span className="text-gray-600 font-medium text-sm px-2">vs</span>
                        <TeamPill code={f.team_b_code} name={f.team_b_name} color={f.team_b_color} logoUrl={f.team_b_logo} />
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
