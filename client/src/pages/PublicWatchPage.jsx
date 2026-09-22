import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext.jsx';
import { publicApi } from '../api.js';
import Standings from './Standings.jsx';
import Fixtures from './Fixtures.jsx';
import TeamPill from '../components/TeamPill.jsx';
import { Trophy, Calendar, Sparkles, RefreshCw, Share2, Zap, Clock, Medal, Bell, BellRing, BellOff, Check, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications.js';

export default function PublicWatchPage() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const queryClient = useQueryClient();

  const {
    isSupported,
    permissionState,
    followedEntity,
    isLoading: pushLoading,
    feedbackMessage,
    followEntity,
    unfollowEntity,
    clearFeedback
  } = usePushNotifications(eventSlug);

  const [activeTab, setActiveTab] = useState('championship'); // latest, championship, standings, fixtures
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

  // 4. Fetch Latest Event Result (Post-Event Result Beam)
  const { data: latestResult } = useQuery({
    queryKey: ['public-latest-result', eventSlug],
    queryFn: () => publicApi.getLatestResult(eventSlug).then(r => r.data?.latestResult),
    enabled: !!eventSlug,
    refetchInterval: 30000,
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
      queryClient.invalidateQueries({ queryKey: ['public-latest-result', eventSlug] });
    };

    const handleEventResultsPublished = (payload) => {
      console.log('[Socket] Received eventResultsPublished:', payload);
      queryClient.setQueryData(['public-latest-result', eventSlug], payload);
      queryClient.invalidateQueries({ queryKey: ['public-standings', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['public-fixtures', eventSlug] });
    };

    socket.on('score-updated', handleScoreUpdated);
    socket.on('eventResultsPublished', handleEventResultsPublished);

    return () => {
      socket.off('score-updated', handleScoreUpdated);
      socket.off('eventResultsPublished', handleEventResultsPublished);
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
        {/* Opt-In Push Notification Follow Bar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm mb-6 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
                followedEntity 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}>
                {followedEntity ? <BellRing size={18} className="animate-pulse" /> : <Bell size={18} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {followedEntity ? `Following ${followedEntity.name}` : 'Live Score & Result Alerts'}
                  </span>
                  {followedEntity && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {followedEntity 
                    ? "You'll receive instant push notifications when this team scores, finishes a heat, or changes standings."
                    : "Follow your house or team to receive instant push alerts when they score or finish."}
                </p>
              </div>
            </div>

            {/* Actions: Quick Select or Unfollow */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              {followedEntity ? (
                <button
                  onClick={unfollowEntity}
                  disabled={pushLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <BellOff size={13} />
                  <span>{pushLoading ? 'Updating...' : 'Unfollow'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    defaultValue=""
                    disabled={pushLoading || !isSupported}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const team = eventInfo?.teams?.find(t => String(t.id) === val);
                      if (team) {
                        followEntity({ type: 'team', id: team.id, name: team.name });
                      }
                      e.target.value = '';
                    }}
                    className="text-xs font-medium bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>
                      {pushLoading ? 'Enabling push...' : isSupported ? 'Follow a team / house...' : 'Push not supported'}
                    </option>
                    {eventInfo?.teams?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Feedback message banner if present */}
          {feedbackMessage && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 ${
              feedbackMessage.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30'
                : feedbackMessage.type === 'warning'
                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30'
                : feedbackMessage.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30'
            }`}>
              <span>{feedbackMessage.text}</span>
              <button onClick={clearFeedback} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Prominent Post-Event Results Spotlight Card (Persistent above feed) */}
        {latestResult && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-purple-500/10 border-2 border-amber-500/40 dark:border-amber-500/40 p-5 shadow-md relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-amber-500 text-black shadow">
                  <Zap size={16} className="fill-black" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                      ⚡ Latest Event Result
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {latestResult.sportName} · {latestResult.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                    {latestResult.eventName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-mono">
                  <Clock size={12} />
                  {new Date(latestResult.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={() => setActiveTab('latest')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow cursor-pointer transition-all"
                >
                  View Full Card
                </button>
              </div>
            </div>

            {/* Top 3 Quick Badges in Card */}
            {latestResult.results && latestResult.results.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {latestResult.results.slice(0, 3).map((r) => {
                  const medalEmoji = r.placement === 1 ? '🥇 1st' : r.placement === 2 ? '🥈 2nd' : '🥉 3rd';
                  const medalBorder = r.placement === 1
                    ? 'border-yellow-400/80 bg-yellow-50/60 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-200'
                    : r.placement === 2
                    ? 'border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-900/30 text-slate-800 dark:text-slate-200'
                    : 'border-amber-600/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200';
                  return (
                    <div
                      key={r.placement}
                      className={`p-3 rounded-xl border flex items-center justify-between ${medalBorder}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black">{medalEmoji}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: r.teamColor || '#64748b' }}
                        />
                        <span className="font-bold text-sm truncate max-w-[110px]">
                          {r.teamName}
                        </span>
                      </div>
                      <div className="text-right">
                        {r.timeFormatted && (
                          <span className="block text-xs font-mono font-bold">
                            {r.timeFormatted}
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                          +{r.points} pts
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 bg-white dark:bg-gray-900 p-1 rounded-xl shadow-sm border">
          {latestResult && (
            <button
              onClick={() => setActiveTab('latest')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'latest'
                  ? 'bg-amber-500 text-black shadow font-black'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Zap size={14} className={activeTab === 'latest' ? 'fill-black' : ''} />
              <span>⚡ Latest Result</span>
            </button>
          )}

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

        {/* Tab Contents: Latest Result */}
        {activeTab === 'latest' && latestResult && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black">
                      Official Result
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      {latestResult.sportName} · {latestResult.category}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    {latestResult.eventName}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Venue: {latestResult.venueName || 'Main Arena'} · Published {new Date(latestResult.publishedAt).toLocaleTimeString()}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('championship')}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
                >
                  View Championship Standings →
                </button>
              </div>

              {/* Placements Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 text-left w-16">Place</th>
                      <th className="py-3 text-left">Team / House</th>
                      <th className="py-3 text-right">Time</th>
                      <th className="py-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                    {latestResult.results?.map((r) => {
                      const medal = r.placement === 1 ? '🥇 1st' : r.placement === 2 ? '🥈 2nd' : r.placement === 3 ? '🥉 3rd' : `#${r.placement}`;
                      return (
                        <tr key={r.placement} className={r.placement <= 3 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''}>
                          <td className="py-3 font-bold">
                            <span className={r.placement === 1 ? 'text-yellow-600 dark:text-yellow-400 font-black' : ''}>
                              {medal}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: r.teamColor || '#64748b' }}
                              />
                              <span className="font-bold text-gray-900 dark:text-white">
                                {r.teamName}
                              </span>
                              <span className="text-xs text-gray-400 uppercase">
                                ({r.teamCode})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                            {r.timeFormatted || '—'}
                          </td>
                          <td className="py-3 text-right font-black text-amber-600 dark:text-amber-400">
                            +{r.points} pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Contents: Championship */}
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
                        <th className="py-2.5 text-right pr-3">Alerts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                      {standings?.map((team, idx) => {
                        const teamObj = eventInfo?.teams?.find(t => t.code === team.code || String(t.id) === String(team.id)) || team;
                        const isFollowed = followedEntity && (String(followedEntity.id) === String(teamObj.id || team.id));
                        return (
                          <tr key={team.code} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/50 transition-colors">
                            <td className="py-3 font-semibold text-gray-600 dark:text-gray-400">{idx + 1}</td>
                            <td className="text-left py-3">
                              <TeamPill code={team.code} name={team.name} logoUrl={team.logo_url} />
                            </td>
                            <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{team.gold}</td>
                            <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{team.silver}</td>
                            <td className="py-3 text-gray-700 dark:text-gray-300 font-medium">{team.bronze}</td>
                            <td className="py-3 font-black text-blue-600 dark:text-blue-400 text-base">{team.total}</td>
                            <td className="py-3 text-right pr-3">
                              {isFollowed ? (
                                <button
                                  onClick={() => unfollowEntity()}
                                  disabled={pushLoading}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all cursor-pointer"
                                  title={`Following ${team.name}. Click to unfollow.`}
                                >
                                  <BellRing size={12} className="text-blue-600 dark:text-blue-400" />
                                  <span className="hidden sm:inline">Following</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    followEntity({ type: 'team', id: teamObj.id || team.id, name: team.name });
                                  }}
                                  disabled={pushLoading}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all cursor-pointer"
                                  title={`Follow ${team.name} for notifications`}
                                >
                                  <Bell size={12} />
                                  <span className="hidden sm:inline">Follow</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
