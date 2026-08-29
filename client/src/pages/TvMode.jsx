import { useEffect, useState } from 'react';
import { useFixtures, useSettings } from '../hooks/useFixtures.js';
import { useLiveUpdates } from '../hooks/useLiveUpdates.js';
import { useLogStandings, useAnalytics } from '../hooks/useStandings.js';
import TeamPill from '../components/TeamPill.jsx';
import MatchTimerDisplay from '../components/MatchTimerDisplay.jsx';
import { Trophy, Clock, Tv, Award, Zap } from 'lucide-react';

export default function TvMode() {
  const { data: liveFixtures, isLoading: loadingLive } = useFixtures({ status: 'live' });
  const { data: upcomingFixtures } = useFixtures({ status: 'upcoming' });
  const { data: completedFixtures } = useFixtures({ status: 'completed' });
  const { data: log } = useLogStandings();
  const { data: analytics } = useAnalytics('All');
  const { data: settings } = useSettings();
  
  // Connect to websockets for auto-refresh
  useLiveUpdates();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    // Add dark mode class to body specifically for TV mode
    document.body.classList.add('dark', 'bg-gray-950', 'text-white');
    
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      document.body.classList.remove('bg-gray-950', 'text-white', 'dark');
      clearInterval(timeTimer);
    };
  }, []);

  // Build dynamic carousel slides (skip cards with no data)
  const slides = [];

  if (log && log.length > 0) {
    slides.push({
      id: 'overall',
      title: 'Championship Points',
      subtitle: 'Current Overall Standings',
      icon: Trophy,
      colorClass: 'text-purple-400',
      data: [...log].sort((a, b) => b.total - a.total).slice(0, 5)
    });
  }

  if (log && log.some(t => (t.gold > 0 || t.silver > 0 || t.bronze > 0))) {
    slides.push({
      id: 'medals',
      title: 'Championship Medals',
      subtitle: 'Medal Tally Leaderboard',
      icon: Award,
      colorClass: 'text-amber-400',
      data: [...log].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze).slice(0, 5)
    });
  }

  if (completedFixtures && completedFixtures.length > 0) {
    slides.push({
      id: 'results',
      title: 'Recent Results',
      subtitle: 'Latest completed matches',
      icon: Trophy,
      colorClass: 'text-green-400',
      data: completedFixtures.slice(0, 5)
    });
  }

  if (upcomingFixtures && upcomingFixtures.length > 0) {
    slides.push({
      id: 'upcoming',
      title: 'Upcoming Matches',
      subtitle: 'Matches scheduled to play next',
      icon: Clock,
      colorClass: 'text-blue-400',
      data: upcomingFixtures.slice(0, 5)
    });
  }

  if (analytics?.topScorers && analytics.topScorers.length > 0) {
    slides.push({
      id: 'scorers',
      title: 'Top Scorers',
      subtitle: 'Individual scoring leaders',
      icon: Trophy,
      colorClass: 'text-red-400',
      data: analytics.topScorers.slice(0, 5)
    });
  }

  if (analytics?.records && (analytics.records.biggestBlowout || analytics.records.highestScoring || analytics.records.lowestScoring)) {
    slides.push({
      id: 'records',
      title: 'Tournament Records',
      subtitle: 'Records and milestones',
      icon: Zap,
      colorClass: 'text-amber-500',
      data: analytics.records
    });
  }

  // Handle slide rotation timer (every 10 seconds)
  useEffect(() => {
    if (slides.length <= 1) return;
    const slideTimer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % slides.length);
    }, 10000);

    return () => clearInterval(slideTimer);
  }, [slides.length]);

  const activeSlide = slides.length > 0 ? slides[currentSlideIndex % slides.length] : null;
  const hasLiveMatches = liveFixtures && liveFixtures.length > 0;

  const renderSlideContent = (slide, isFullScreen = false) => {
    if (!slide) return null;

    switch (slide.id) {
      case 'overall':
        return (
          <div className={`space-y-4 flex-1 flex flex-col justify-center ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {slide.data.map((team, idx) => (
              <div key={team.code} className="flex items-center justify-between p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl hover:border-purple-500/40 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-gray-500 w-8 text-center font-mono">#{idx + 1}</span>
                  <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                </div>
                <span className="text-2xl font-black text-purple-400 font-mono">{team.total || 0} <span className="text-xs uppercase text-gray-400 font-medium">pts</span></span>
              </div>
            ))}
          </div>
        );

      case 'medals':
        return (
          <div className={`space-y-4 flex-1 flex flex-col justify-center ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {slide.data.map((team, idx) => (
              <div key={team.code} className="flex items-center justify-between p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-gray-500 w-8 text-center font-mono">#{idx + 1}</span>
                  <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                </div>
                <div className="flex items-center gap-6 text-base font-black font-mono">
                  <span className="flex items-center gap-1.5 text-yellow-500">🥇 {team.gold || 0}</span>
                  <span className="flex items-center gap-1.5 text-gray-300">🥈 {team.silver || 0}</span>
                  <span className="flex items-center gap-1.5 text-amber-600">🥉 {team.bronze || 0}</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'results':
        return (
          <div className={`space-y-4 flex-1 flex flex-col justify-center ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {slide.data.map(f => (
              <div key={f.id} className="p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl flex flex-col gap-2 hover:border-green-500/40 transition-colors">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span className="bg-gray-900 px-3 py-1 rounded-full">{f.sport_name}</span>
                  <span>{f.venue_name}</span>
                </div>
                {f.scoring_type === 'placement' || f.sport_name === 'Athletics' ? (
                  <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 py-1 flex items-center gap-2">
                    🏆 <span className="truncate">{f.team_a_name}</span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-lg font-black">
                    <span className={f.score_a > f.score_b ? 'text-white' : 'text-gray-400'}>{f.team_a_code} ({f.score_a})</span>
                    <span className="text-gray-700 font-normal text-sm font-mono uppercase tracking-widest px-2">FT</span>
                    <span className={f.score_b > f.score_a ? 'text-white' : 'text-gray-400'}>{f.team_b_code} ({f.score_b})</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'upcoming':
        return (
          <div className={`space-y-4 flex-1 flex flex-col justify-center ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {slide.data.map(f => (
              <div key={f.id} className="p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl flex flex-col gap-2 hover:border-blue-500/40 transition-colors">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span className="bg-gray-900 px-3 py-1 rounded-full">{f.sport_name}</span>
                  <span className="text-blue-400 font-mono">{f.time || new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {f.scoring_type === 'placement' || f.sport_name === 'Athletics' ? (
                  <div className="text-lg font-black text-gray-300 truncate py-1">
                    🏃 {f.team_a_name}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-lg font-black">
                    <span>{f.team_a_code}</span>
                    <span className="text-gray-700 font-normal text-xs uppercase tracking-wider font-mono">VS</span>
                    <span>{f.team_b_code}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'scorers':
        return (
          <div className={`space-y-4 flex-1 flex flex-col justify-center ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {slide.data.map((player, idx) => (
              <div key={player.id} className="flex items-center justify-between p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl hover:border-red-500/40 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-gray-500 w-8 text-center font-mono">#{idx + 1}</span>
                  <div className="flex flex-col">
                    <span className="text-base font-bold">{player.name}</span>
                    <span className="text-xs text-gray-400 font-medium">{player.team_code} · #{player.jersey_number}</span>
                  </div>
                </div>
                <span className="text-2xl font-black text-red-400 font-mono">{player.total_points} <span className="text-xs uppercase text-gray-400 font-medium">pts</span></span>
              </div>
            ))}
          </div>
        );

      case 'records':
        return (
          <div className={`space-y-4 flex-1 flex flex-col justify-center ${isFullScreen ? 'max-w-4xl mx-auto w-full' : ''}`}>
            {slide.data.biggestBlowout && (
              <div className="p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl flex flex-col gap-2 hover:border-amber-500/40 transition-colors">
                <div className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Zap size={14} /> Biggest Blowout
                </div>
                <div className="text-base font-bold text-gray-300">
                  {slide.data.biggestBlowout.team_a_code} ({slide.data.biggestBlowout.score_a}) vs {slide.data.biggestBlowout.team_b_code} ({slide.data.biggestBlowout.score_b})
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Margin: {Math.abs(slide.data.biggestBlowout.score_a - slide.data.biggestBlowout.score_b)} points · {slide.data.biggestBlowout.sport_name}
                </div>
              </div>
            )}
            {slide.data.highestScoring && (
              <div className="p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl flex flex-col gap-2 hover:border-green-500/40 transition-colors">
                <div className="text-xs font-black text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                  🔥 Highest Scoring Match
                </div>
                <div className="text-base font-bold text-gray-300">
                  {slide.data.highestScoring.team_a_code} ({slide.data.highestScoring.score_a}) vs {slide.data.highestScoring.team_b_code} ({slide.data.highestScoring.score_b})
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Total Points: {slide.data.highestScoring.score_a + slide.data.highestScoring.score_b} points · {slide.data.highestScoring.sport_name}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col font-sans bg-gray-950 select-none">
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-slideProgress {
          animation: progress 10s linear forwards;
        }
      `}</style>

      {/* Header */}
      <header className="flex justify-between items-center mb-8 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-4">
            <Tv className="w-10 h-10 text-blue-500" />
            {settings?.event_title || 'Tournament Live Dashboard'}
          </h1>
          <p className="text-xl text-gray-400 mt-2 font-semibold tracking-wider uppercase">
            {settings?.org_name || 'Sports Manager'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-extrabold font-mono tracking-tighter">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="text-lg text-gray-400 mt-2 font-medium">
            {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Main Grid content */}
      <div className="flex-1 flex flex-col">
        {hasLiveMatches ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1">
            
            {/* Live Matches Column (Takes up 2 columns) */}
            <div className="xl:col-span-2 flex flex-col">
              <div className="flex items-center gap-3 mb-6 text-red-500">
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-2xl font-black uppercase tracking-wider font-sans">Live Matches</h2>
              </div>

              <div className="space-y-6 flex-1">
                {loadingLive ? (
                  <div className="text-2xl text-gray-500 text-center py-20 animate-pulse">Loading live action...</div>
                ) : (
                  liveFixtures.map(f => (
                    <div key={f.id} className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                      
                      <div className="flex justify-between items-center mb-6">
                        <span className="bg-gray-800 text-gray-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase">
                          {f.sport_name}
                        </span>
                        <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider">
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
                              <span className="text-gray-655 text-5xl">-</span>
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

            {/* Rotating Stats Sidebar Carousel */}
            <div className="flex flex-col">
              {activeSlide && (
                <>
                  <div className={`flex items-center gap-3 mb-6 ${activeSlide.colorClass}`}>
                    <activeSlide.icon className="w-6 h-6 animate-pulse" />
                    <h2 className="text-2xl font-black uppercase tracking-wider">{activeSlide.title}</h2>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col justify-between relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-slideProgress" key={currentSlideIndex} />
                    
                    <div className="mb-4">
                      <span className="text-xs uppercase font-extrabold tracking-widest text-gray-500">{activeSlide.subtitle}</span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center my-4">
                      {renderSlideContent(activeSlide, false)}
                    </div>

                    <div className="flex justify-center gap-1.5 mt-4">
                      {slides.map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === currentSlideIndex % slides.length ? 'w-6 bg-purple-500' : 'w-1.5 bg-gray-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        ) : (
          /* Full-Screen Showcasing Carousel when NO Live Matches are Active */
          <div className="flex-1 flex flex-col justify-center py-6">
            {activeSlide ? (
              <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-between bg-gray-900 border border-gray-800 rounded-[36px] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-slideProgress" key={currentSlideIndex} />
                
                <div className="flex justify-between items-start border-b border-gray-800 pb-6 mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 bg-gray-950 border border-gray-800 rounded-2xl ${activeSlide.colorClass}`}>
                      <activeSlide.icon className="w-8 h-8 animate-bounce" />
                    </div>
                    <div>
                      <span className="text-xs uppercase font-black tracking-widest text-purple-400">{activeSlide.subtitle}</span>
                      <h2 className="text-3xl font-black uppercase mt-1 tracking-tight text-white">{activeSlide.title}</h2>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase bg-gray-950 text-gray-500 border border-gray-850 px-3 py-1 rounded-full font-bold">
                    Slide {currentSlideIndex % slides.length + 1} of {slides.length}
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center py-6">
                  {renderSlideContent(activeSlide, true)}
                </div>

                <div className="flex justify-center gap-2 mt-6">
                  {slides.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setCurrentSlideIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        i === currentSlideIndex % slides.length ? 'w-8 bg-purple-500' : 'w-2 bg-gray-800 hover:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500 text-2xl border border-dashed border-gray-800 rounded-[36px]">
                No completed or upcoming fixtures registered for this workspace yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
