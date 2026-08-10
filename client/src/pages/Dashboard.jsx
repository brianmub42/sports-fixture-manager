import { useState, useEffect } from 'react';
import { useFixtures, useSettings } from '../hooks/useFixtures.js';
import { useLogStandings } from '../hooks/useStandings.js';
import { Link } from 'react-router-dom';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';
import { Maximize2, Play, Pause, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';

function getCurrentPhaseInfo(fixtures) {
  if (!fixtures || fixtures.length === 0) {
    return {
      title: 'No fixtures generated yet',
      subtext: 'Go to the Generate page to create fixtures.',
      sports: [],
      venuesText: '',
      roundsText: '0 rounds',
      timeText: '',
      teamsText: 'No teams'
    };
  }

  // Find all upcoming matches
  const upcomingFixtures = fixtures.filter(f => f.status === 'upcoming');

  if (upcomingFixtures.length === 0) {
    return {
      title: 'Tournament Completed',
      subtext: 'All matches have been completed.',
      sports: [],
      venuesText: '',
      roundsText: 'Completed',
      timeText: '',
      teamsText: ''
    };
  }

  // Find the earliest starting time among upcoming matches
  const sortedUpcoming = [...upcomingFixtures].sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  const minUpcomingTime = sortedUpcoming[0].scheduled_at;

  // Find all sports that have upcoming matches starting at this earliest time
  const minTimeDateStr = new Date(minUpcomingTime).toISOString();
  const fixturesAtMinTime = sortedUpcoming.filter(f => new Date(f.scheduled_at).toISOString() === minTimeDateStr);
  const activeSports = [...new Set(fixturesAtMinTime.map(f => f.sport_name))];

  // Get all fixtures for these active sports in the current tournament
  const phaseFixtures = fixtures.filter(f => activeSports.includes(f.sport_name));

  // Determine rounds info
  const uniqueRounds = [...new Set(phaseFixtures.map(f => f.round))];
  const roundsCount = uniqueRounds.length;
  const roundsText = `${roundsCount} round${roundsCount !== 1 ? 's' : ''}`;

  // Helper to format/pluralize venues
  const getVenueText = (venuesList) => {
    if (venuesList.length === 0) return '';
    if (venuesList.length === 1) return `1 ${venuesList[0]}`;
    const first = venuesList[0];
    let base = first.replace(/\s+\d+$/, '').replace(/\s+[A-Z]$/, '');
    const pluralize = (word) => {
      if (word.endsWith('ch') || word.endsWith('sh') || word.endsWith('x') || word.endsWith('s')) {
        return `${word}es`;
      }
      return `${word}s`;
    };
    let plural = base.endsWith('s') ? base : pluralize(base);
    return `${venuesList.length} ${plural}`;
  };

  // Group venues by sport
  const venuesBySport = activeSports.map(sport => {
    const sportVenues = [...new Set(phaseFixtures.filter(f => f.sport_name === sport).map(f => f.venue_name))];
    return getVenueText(sportVenues);
  }).filter(Boolean);

  const venuesText = venuesBySport.join(' + ');

  // Calculate total time range for this phase
  const times = phaseFixtures.map(f => new Date(f.scheduled_at).getTime());
  const minTime = new Date(Math.min(...times));
  
  // Find max end time based on duration
  const endTimes = phaseFixtures.map(f => {
    const start = new Date(f.scheduled_at).getTime();
    const duration = f.duration_minutes || 10;
    return start + duration * 60 * 1000;
  });
  const maxTime = new Date(Math.max(...endTimes));

  // Format time range
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const durationTotal = Math.round((maxTime - minTime) / 60000);
  const timeText = `Time: ${formatTime(minTime)} – ${formatTime(maxTime)} (${durationTotal} min)`;

  // Check concurrency
  const isConcurrent = activeSports.length > 1;
  const title = activeSports.join(' + ') + (isConcurrent ? ' (Concurrent)' : '');

  // Calculate teams playing status
  const teamsInPhase = [...new Set(phaseFixtures.flatMap(f => [f.team_a_code, f.team_b_code]))];
  const maxMatchesAtOnce = Math.max(...Object.values(
    phaseFixtures.reduce((acc, f) => {
      const t = new Date(f.scheduled_at).getTime();
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {})
  ));
  const playsSimultaneously = maxMatchesAtOnce >= Math.floor(teamsInPhase.length / 2);
  const teamsText = playsSimultaneously 
    ? `All ${teamsInPhase.length} teams play simultaneously`
    : `${teamsInPhase.length} teams participating`;

  // Subtext
  const totalMatches = phaseFixtures.length;
  const completedMatches = phaseFixtures.filter(f => f.status === 'completed' || f.status === 'draw').length;
  const subtext = `${completedMatches}/${totalMatches} matches completed`;

  return {
    title,
    subtext,
    sports: activeSports,
    venuesText,
    roundsText,
    timeText,
    teamsText
  };
}

const slides = [
  { id: 'overview', title: 'Tournament Overview', subtitle: 'Live event progress and status' },
  { id: 'log', title: 'Championship Log Standings', subtitle: 'Overall combined sports points' },
  { id: 'medals', title: 'Medal Leaderboard', subtitle: 'Championship medal standings' },
  { id: 'nextUp', title: 'Next Up Fixtures', subtitle: 'Upcoming matches schedule' }
];

export default function Dashboard() {
  const { data: fixtures, isLoading } = useFixtures();
  const { data: log } = useLogStandings();
  const { data: settings } = useSettings();

  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideDuration, setSlideDuration] = useState(5); // in seconds

  // Auto cycle effect
  useEffect(() => {
    if (!isProjectorMode || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % slides.length);
    }, slideDuration * 1000);
    return () => clearInterval(interval);
  }, [isProjectorMode, isPlaying, slideDuration]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isProjectorMode) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentSlideIndex(prev => (prev + 1) % slides.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.key === 'Escape') {
        setIsProjectorMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectorMode]);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading dashboard...</div>;
  }

  const completed = fixtures?.filter(f => f.status === 'completed' || f.status === 'draw').length || 0;
  const total = fixtures?.length || 0;
  const upcoming = total - completed;

  const nextMatches = fixtures?.filter(f => f.status === 'upcoming' && f.sport_name !== 'Athletics').slice(0, 3);
  const phaseInfo = getCurrentPhaseInfo(fixtures);

  const orgName = settings?.org_name || 'FixtureGrid Workspace';

  const renderProjectorMode = () => {
    if (!isProjectorMode) return null;
    const slide = slides[currentSlideIndex];

    return (
      <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col p-8 overflow-hidden select-none font-sans">
        {/* Progress Bar Timer */}
        {isPlaying && (
          <div 
            key={currentSlideIndex}
            className="absolute top-0 left-0 h-1 bg-blue-500 origin-left animate-projector-timer w-full"
            style={{ '--timer-duration': `${slideDuration}s` }}
          />
        )}

        {/* Header section */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-xl border border-blue-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500">Live Projector Mode</span>
              <h2 className="text-2xl font-extrabold tracking-tight mt-0.5">{slide.title}</h2>
              <p className="text-xs text-slate-400">{slide.subtitle}</p>
            </div>
          </div>

          {/* Controller buttons */}
          <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-md">
            {/* Speed duration selector */}
            <div className="flex items-center gap-1.5 border-r border-slate-800 pr-4">
              <span className="text-[10px] uppercase text-slate-500 font-bold">Speed:</span>
              <select
                value={slideDuration}
                onChange={(e) => setSlideDuration(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
              </select>
            </div>

            {/* Previous slide */}
            <button 
              onClick={() => setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer"
              title="Previous Slide (Left Arrow)"
            >
              <ChevronLeft size={18} />
            </button>

            {/* Play/Pause */}
            <button 
              onClick={() => setIsPlaying(prev => !prev)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer"
              title={isPlaying ? "Pause Slideshow (Spacebar)" : "Start Slideshow (Spacebar)"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Next slide */}
            <button 
              onClick={() => setCurrentSlideIndex(prev => (prev + 1) % slides.length)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white cursor-pointer"
              title="Next Slide (Right Arrow)"
            >
              <ChevronRight size={18} />
            </button>

            {/* Exit Projector Mode */}
            <button 
              onClick={() => setIsProjectorMode(false)}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400 hover:text-red-400 cursor-pointer border border-transparent hover:border-red-500/30"
              title="Exit Fullscreen (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">
          {slide.id === 'overview' && (
            <div className="space-y-8 w-full">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl text-center">
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Total Matches</div>
                  <div className="text-5xl font-extrabold text-blue-400 font-mono">{total}</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl text-center">
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Completed</div>
                  <div className="text-5xl font-extrabold text-green-400 font-mono">{completed}</div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-6 rounded-2xl text-center">
                  <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Upcoming</div>
                  <div className="text-5xl font-extrabold text-slate-400 font-mono">{upcoming}</div>
                </div>
              </div>

              {/* Phase widget */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center backdrop-blur-sm max-w-3xl mx-auto w-full">
                <div className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Current Phase info</div>
                <h3 className="text-3xl font-extrabold mb-4">{phaseInfo.title}</h3>
                <p className="text-lg text-slate-300 leading-relaxed">
                  {phaseInfo.venuesText ? `${phaseInfo.roundsText} · ${phaseInfo.venuesText}` : phaseInfo.roundsText}
                  {phaseInfo.teamsText && <><br />{phaseInfo.teamsText}</>}
                  {phaseInfo.timeText && <><br />{phaseInfo.timeText}</>}
                  <br />
                  <span className="text-blue-400 font-bold">{phaseInfo.subtext}</span>
                </p>
                <div className="flex gap-3 justify-center mt-6">
                  {phaseInfo.sports.map(sport => (
                    <SportTag key={sport} sport={sport} size="lg" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {slide.id === 'log' && (
            <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm max-w-2xl mx-auto">
              <div className="grid grid-cols-4 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-slate-800 text-center mb-4">
                <span>Rank</span>
                <span className="text-left col-span-2">Team</span>
                <span>Total Points</span>
              </div>
              <div className="space-y-4">
                {log?.map((d, idx) => (
                  <div key={d.code} className="grid grid-cols-4 gap-4 items-center text-center text-xl hover:bg-slate-800/20 py-2 rounded-xl transition-all duration-150">
                    <span className={`font-mono font-bold ${idx === 0 ? 'text-yellow-400 text-2xl' : idx === 1 ? 'text-slate-300 text-xl' : idx === 2 ? 'text-amber-600 text-xl' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-left col-span-2">
                      <TeamPill code={d.code} name={d.name} logoUrl={d.logo_url} size="lg" />
                    </span>
                    <span className="font-extrabold text-blue-400 font-mono text-2xl">{d.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.id === 'medals' && (
            <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm max-w-3xl mx-auto">
              <div className="grid grid-cols-7 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-slate-800 text-center mb-4">
                <span>Rank</span>
                <span className="text-left col-span-2">Team</span>
                <span className="text-yellow-500">Gold</span>
                <span className="text-slate-300">Silver</span>
                <span className="text-amber-600">Bronze</span>
                <span>Total</span>
              </div>
              <div className="space-y-4">
                {log?.map((d, idx) => (
                  <div key={d.code} className="grid grid-cols-7 gap-4 items-center text-center text-xl hover:bg-slate-800/20 py-2 rounded-xl transition-all duration-150">
                    <span className={`font-mono font-bold ${idx === 0 ? 'text-yellow-400 text-2xl' : idx === 1 ? 'text-slate-300 text-xl' : idx === 2 ? 'text-amber-600 text-xl' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-left col-span-2">
                      <TeamPill code={d.code} name={d.name} logoUrl={d.logo_url} size="lg" />
                    </span>
                    <span className="font-extrabold text-yellow-400 font-mono">{d.gold}</span>
                    <span className="font-extrabold text-slate-300 font-mono">{d.silver}</span>
                    <span className="font-extrabold text-amber-600 font-mono">{d.bronze}</span>
                    <span className="font-bold text-blue-400 font-mono">{d.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.id === 'nextUp' && (
            <div className="w-full max-w-4xl mx-auto space-y-4">
              {nextMatches?.length ? (
                nextMatches.map(f => (
                  <div key={f.id} className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between gap-6 hover:bg-slate-900/70 transition-all duration-150">
                    <div className="flex flex-col gap-1 w-32">
                      <span className="text-xs text-slate-500 font-mono font-bold">{f.time?.split('-')[0]}</span>
                      <SportTag sport={f.sport_name} size="lg" />
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-6">
                      <TeamPill code={f.team_a_code} name={f.team_a_name} logoUrl={f.team_a_logo} size="lg" />
                      <span className="text-slate-500 font-extrabold font-mono text-sm">VS</span>
                      <TeamPill code={f.team_b_code} name={f.team_b_name} logoUrl={f.team_b_logo} size="lg" />
                    </div>
                    <div className="w-40 text-right text-sm font-semibold text-slate-400">
                      {f.venue_name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">No upcoming matches scheduled.</div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls guide */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800 pt-4 mt-8">
          <div className="flex gap-4">
            <span><strong>Space</strong>: Play/Pause</span>
            <span><strong>Arrows</strong>: Previous / Next</span>
            <span><strong>ESC</strong>: Exit</span>
          </div>
          <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Projector Screen Overlay */}
      {renderProjectorMode()}

      {/* Header with Projector Trigger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-150 dark:border-gray-800 pb-3">
        <div>
          <h1 className="text-2xl font-bold">{orgName} Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Live tournament overview and statistics</p>
        </div>
        <button
          onClick={() => {
            setIsProjectorMode(true);
            setCurrentSlideIndex(0);
            setIsPlaying(true);
          }}
          className="k-btn bg-blue-600 hover:bg-blue-700 text-white border-transparent flex items-center gap-1.5 shadow-sm text-xs font-semibold py-2 px-3.5 cursor-pointer animate-in fade-in"
        >
          <Maximize2 size={14} />
          <span>Projector Mode</span>
        </button>
      </div>

      {/* Setup Call-To-Action Banner */}
      {settings && !settings.has_users && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold mb-1">Welcome to {orgName}!</h2>
            <p className="text-sm text-blue-100 max-w-xl">
              This tournament workspace is empty. If you are the organizer, register or sign in as the administrator to configure teams, venues, and generate your matches.
            </p>
          </div>
          <Link
            to="/login?register=true"
            className="px-5 py-2.5 bg-white text-blue-600 hover:bg-blue-50 transition-colors font-bold rounded-xl text-sm shadow-md shrink-0 text-center cursor-pointer"
          >
            Register & Setup Workspace
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Matches</div>
          <div className="text-3xl font-semibold">{total}</div>
          <div className="text-xs text-gray-400 mt-1">Across all sports</div>
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded mt-3">
            <div className="h-full bg-gray-900 dark:bg-white rounded" style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }} />
          </div>
        </div>
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Completed</div>
          <div className="text-3xl font-semibold">{completed}</div>
          <div className="text-xs text-gray-400 mt-1">Matches finished</div>
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded mt-3">
            <div className="h-full bg-green-500 rounded" style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }} />
          </div>
        </div>
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Upcoming</div>
          <div className="text-3xl font-semibold">{upcoming}</div>
          <div className="text-xs text-gray-400 mt-1">Remaining fixtures</div>
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded mt-3">
            <div className="h-full bg-gray-400 rounded" style={{ width: total > 0 ? `${(upcoming / total) * 100}%` : '0%' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Current Phase</div>
          <div className="font-medium text-lg">{phaseInfo.title}</div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
            {phaseInfo.venuesText ? `${phaseInfo.roundsText} · ${phaseInfo.venuesText}` : phaseInfo.roundsText}<br />
            {phaseInfo.teamsText && <>{phaseInfo.teamsText}<br /></>}
            {phaseInfo.timeText && <>{phaseInfo.timeText}<br /></>}
            {phaseInfo.subtext}
          </p>
          <div className="flex gap-2 mt-3">
            {phaseInfo.sports.map(sport => (
              <SportTag key={sport} sport={sport} />
            ))}
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
                <TeamPill code={f.team_a_code} name={f.team_a_name} logoUrl={f.team_a_logo} />
                <span className="text-gray-400 text-xs">vs</span>
                <TeamPill code={f.team_b_code} name={f.team_b_name} logoUrl={f.team_b_logo} />
              </span>
              <span className="text-xs text-gray-400">{f.venue_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
