import { useFixtures, useSettings } from '../hooks/useFixtures.js';
import { useLogStandings } from '../hooks/useStandings.js';
import { Link } from 'react-router-dom';
import SportTag from '../components/SportTag.jsx';
import TeamPill from '../components/TeamPill.jsx';

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
  const completedMatches = phaseFixtures.filter(f => f.status === 'completed').length;
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

export default function Dashboard() {
  const { data: fixtures, isLoading } = useFixtures();
  const { data: log } = useLogStandings();
  const { data: settings } = useSettings();

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Loading dashboard...</div>;
  }

  const completed = fixtures?.filter(f => f.status === 'completed').length || 0;
  const total = fixtures?.length || 0;
  const upcoming = total - completed;

  const nextMatches = fixtures?.filter(f => f.status === 'upcoming' && f.sport_name !== 'Athletics').slice(0, 3);
  const phaseInfo = getCurrentPhaseInfo(fixtures);

  const orgName = settings?.org_name || 'FixtureGrid Workspace';

  return (
    <div className="space-y-4">
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
