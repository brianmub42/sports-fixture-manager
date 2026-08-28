import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext.jsx';
import { publicApi } from '../api.js';
import Standings from './Standings.jsx';
import Fixtures from './Fixtures.jsx';
import TeamPill from '../components/TeamPill.jsx';
import { Trophy, Calendar, Sparkles, RefreshCw, Share2 } from 'lucide-react';

export default function PublicWatchPage() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('championship'); // championship, standings, fixtures
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [fixtureFilter, setFixtureFilter] = useState('All');

  // 1. Fetch Event Info (Includes School Name, Event Title, Teams, and Sports List)
  const { data: eventInfo, isLoading: loadingInfo, error: infoError } = useQuery({
    queryKey: ['public-event', eventSlug],
    queryFn: () => publicApi.getEventInfo(eventSlug).then(r => r.data),
    enabled: !!eventSlug,
  });

  // 2. Fetch Public Standings (Overall Championship if sport is empty/championship, or sport standings)
  const isChampionship = activeTab === 'championship';
  const standingsSportParam = isChampionship ? 'championship' : selectedSport;
  const { data: standings, isLoading: loadingStandings } = useQuery({
    queryKey: ['public-standings', eventSlug, standingsSportParam, selectedEventId],
    queryFn: () => publicApi.getStandings(eventSlug, { sport: standingsSportParam, eventId: selectedEventId }).then(r => r.data),
    enabled: !!eventSlug && (isChampionship || (activeTab === 'standings' && !!selectedSport)),
  });

  // 3. Fetch Public Fixtures
  const { data: fixtures, isLoading: loadingFixtures } = useQuery({
    queryKey: ['public-fixtures', eventSlug, fixtureFilter],
    queryFn: () => publicApi.getFixtures(eventSlug, fixtureFilter === 'All' ? {} : { sport: fixtureFilter }).then(r => r.data),
    enabled: !!eventSlug && activeTab === 'fixtures',
  });

  // Automatically select the first sport when the tabs load
  const sportsList = eventInfo?.sports || [];
  useEffect(() => {
    if (sportsList.length > 0 && !selectedSport) {
      setSelectedSport(sportsList[0].name);
    }
  }, [sportsList, selectedSport]);

  // Real-time updates via Socket.io
  useEffect(() => {
    if (!socket || !eventSlug) return;

    // Join spectator rooms
    socket.emit('join-tenant', eventSlug);
    socket.emit('join-event', { tenantSlug: eventSlug, eventId: 'all' });

    const handleScoreUpdated = () => {
      console.log('[Socket] Live scores updated! Invalidating cache...');
      queryClient.invalidateQueries({ queryKey: ['public-standings', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['public-fixtures', eventSlug] });
    };

    socket.on('score-updated', handleScoreUpdated);

    return () => {
      socket.off('score-updated', handleScoreUpdated);
    };
  }, [socket, eventSlug, queryClient]);

  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-lg font-bold animate-pulse">
          <RefreshCw className="animate-spin" />
          <span>Loading Live Feed...</span>
        </div>
      </div>
    );
  }

  if (infoError || !eventInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
          <Trophy size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Event Workspace Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-6">
          The watch link you entered does not match any active tournament workspace slug.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
        >
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans pb-16">
      {/* Premium Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white py-6 shadow-md border-b border-indigo-900/50">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-rose-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                Live Scores
              </span>
              <span className="bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Spectator Portal
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">{eventInfo.name}</h1>
            <p className="text-xs text-indigo-200 mt-0.5">Hosted by: {eventInfo.school_name}</p>
          </div>
          
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-white text-xs font-semibold rounded-lg self-start md:self-center transition-all cursor-pointer"
          >
            <Share2 size={13} />
            <span>{copied ? 'Copied Link!' : 'Share Live Feed'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border">
          <button
            onClick={() => setActiveTab('championship')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'championship'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Trophy size={14} />
            <span>Championship Log</span>
          </button>
          
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'standings'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Trophy size={14} />
            <span>Sport Standings</span>
          </button>

          <button
            onClick={() => setActiveTab('fixtures')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'fixtures'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Calendar size={14} />
            <span>Fixtures &amp; Schedule</span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'championship' && (
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-100/30 dark:border-blue-900/10 max-w-max">
              <Sparkles size={13} />
              <span>Championship standings update dynamically as results come in.</span>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-500 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                Overall Medal Leaderboard
              </h3>
              
              {loadingStandings ? (
                <div className="text-center py-12 text-gray-400">Loading standings...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-center">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800/80 text-xs font-semibold text-gray-400">
                        <th className="py-2.5">Rank</th>
                        <th className="text-left py-2.5">Team</th>
                        <th>Gold 🥇</th>
                        <th>Silver 🥈</th>
                        <th>Bronze 🥉</th>
                        <th>Total PTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                      {standings?.map((team, idx) => (
                        <tr key={team.code} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/50 transition-colors">
                          <td className="py-3 font-semibold text-gray-600 dark:text-gray-400">{idx + 1}</td>
                          <td className="text-left py-3">
                            <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                          </td>
                          <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{team.gold}</td>
                          <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{team.silver}</td>
                          <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{team.bronze}</td>
                          <td className="py-3 font-black text-blue-600 dark:text-blue-400 text-base">{team.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <Standings
            sportsData={sportsList}
            standings={standings}
            settings={{}}
            eventsList={[]}
            isLoading={loadingStandings}
            selectedSport={selectedSport}
            setSelectedSport={setSelectedSport}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
          />
        )}

        {activeTab === 'fixtures' && (
          <Fixtures
            fixtures={fixtures}
            sportsData={sportsList}
            settings={{ enable_player_registration: false }}
            isLoading={loadingFixtures}
            filter={fixtureFilter}
            setFilter={setFixtureFilter}
          />
        )}
      </div>
    </div>
  );
}
