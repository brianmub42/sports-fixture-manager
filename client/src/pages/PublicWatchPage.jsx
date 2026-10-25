import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../contexts/SocketContext.jsx';
import { publicApi } from '../api.js';
import Standings from './Standings.jsx';
import Fixtures from './Fixtures.jsx';
import TeamPill from '../components/TeamPill.jsx';
import {
  Trophy, Calendar, Sparkles, Share2, Zap,
  Medal, Bell, BellRing, BellOff, X, BarChart2, Users,
  Play, Flame, Heart, Camera, Video, Check, Copy, ExternalLink, ArrowRight
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications.js';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />
);

const RankBadge = ({ rank }) => {
  if (rank === 1) return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-black text-xs border border-amber-300 dark:border-amber-700 shadow-sm">1</span>
  );
  if (rank === 2) return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-black text-xs border border-slate-300 dark:border-slate-600">2</span>
  );
  if (rank === 3) return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400 font-black text-xs border border-orange-300 dark:border-orange-700">3</span>
  );
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-500 font-bold text-xs">{rank}</span>
  );
};

export default function PublicWatchPage() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const queryClient = useQueryClient();

  const {
    isSupported,
    followedEntity,
    isLoading: pushLoading,
    feedbackMessage,
    followEntity,
    unfollowEntity,
    clearFeedback
  } = usePushNotifications(eventSlug);

  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'standings' | 'fixtures' | 'latest'
  const [standingsSport, setStandingsSport] = useState('championship'); // 'championship' or sport.name
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [fixtureFilter, setFixtureFilter] = useState('All');
  const [copied, setCopied] = useState(false);
  
  // Interactive Story Reel Modal State
  const [activeStory, setActiveStory] = useState(null);
  const [storyProgress, setStoryProgress] = useState(0);

  // Social Sharing Dialog State
  const [shareDialog, setShareDialog] = useState(null);

  // Local optimistic reactions tracker: { [postId]: { [type]: count, userReacted: bool } }
  const [localReactions, setLocalReactions] = useState({});

  // 1. Event Info Query
  const { data: eventInfo, isLoading: loadingInfo, error: infoError } = useQuery({
    queryKey: ['public-event', eventSlug],
    queryFn: () => publicApi.getEventInfo(eventSlug).then(r => r.data),
    enabled: !!eventSlug,
  });

  // 2. Spectator FanZone Feed Query (Photos, Videos, Stories)
  const { data: feedData, isLoading: loadingFeed } = useQuery({
    queryKey: ['public-feed', eventSlug],
    queryFn: () => publicApi.getFeed(eventSlug).then(r => r.data),
    enabled: !!eventSlug,
    refetchInterval: 20000,
  });

  // 3. Standings Query
  const isChampionship = standingsSport === 'championship';
  const { data: standings, isLoading: loadingStandings } = useQuery({
    queryKey: ['public-standings', eventSlug, standingsSport, selectedEventId],
    queryFn: () => publicApi.getStandings(eventSlug, { sport: standingsSport, eventId: selectedEventId }).then(r => r.data),
    enabled: !!eventSlug && activeTab === 'standings',
  });

  // 4. Fixtures Query
  const { data: fixtures, isLoading: loadingFixtures } = useQuery({
    queryKey: ['public-fixtures', eventSlug, fixtureFilter],
    queryFn: () => publicApi.getFixtures(eventSlug, fixtureFilter === 'All' ? {} : { sport: fixtureFilter }).then(r => r.data),
    enabled: !!eventSlug && activeTab === 'fixtures',
  });

  // 5. All Fixtures for the Top Horizontal Live Ticker
  const { data: tickerFixtures } = useQuery({
    queryKey: ['public-ticker-fixtures', eventSlug],
    queryFn: () => publicApi.getFixtures(eventSlug, {}).then(r => r.data),
    enabled: !!eventSlug,
    refetchInterval: 15000,
  });

  // 6. Latest Result Spotlight Query
  const { data: latestResult } = useQuery({
    queryKey: ['public-latest-result', eventSlug],
    queryFn: () => publicApi.getLatestResult(eventSlug).then(r => r.data?.latestResult),
    enabled: !!eventSlug,
    refetchInterval: 30000,
  });

  const sportsList = eventInfo?.sports || [];
  useEffect(() => {
    if (sportsList.length > 0 && !selectedSport) setSelectedSport(sportsList[0].name);
  }, [sportsList, selectedSport]);

  // Story Timer Effect with Multi-Story Auto-Advancing
  useEffect(() => {
    if (!activeStory) return;
    setStoryProgress(0);
    const interval = 50; // ms
    const duration = 6000; // 6s per story
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          // Advance to next story if available, or close
          const currentStories = (feedData?.stories && feedData.stories.length > 0) ? feedData.stories : [];
          const currIdx = currentStories.findIndex(st => st.id === activeStory.id);
          if (currIdx >= 0 && currIdx < currentStories.length - 1) {
            setActiveStory(currentStories[currIdx + 1]);
            return 0;
          } else {
            setActiveStory(null);
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeStory, feedData]);

  // WebSocket Live Real-Time Events
  useEffect(() => {
    if (!socket || !eventSlug) return;
    socket.emit('join-tenant', eventSlug);
    socket.emit('join-event', { tenantSlug: eventSlug, eventId: 'all' });

    const onScore = () => {
      queryClient.invalidateQueries({ queryKey: ['public-standings', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['public-fixtures', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['public-ticker-fixtures', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['public-latest-result', eventSlug] });
    };

    const onFeedUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['public-feed', eventSlug] });
    };

    const onReactionUpdate = ({ postId, reactions }) => {
      queryClient.setQueryData(['public-feed', eventSlug], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          feed: (oldData.feed || []).map(p => p.id === postId ? { ...p, reactions } : p),
          stories: (oldData.stories || []).map(s => s.id === postId ? { ...s, reactions } : s)
        };
      });
    };

    const onPublished = (payload) => {
      queryClient.setQueryData(['public-latest-result', eventSlug], payload);
      queryClient.invalidateQueries({ queryKey: ['public-standings', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['public-fixtures', eventSlug] });
      queryClient.invalidateQueries({ queryKey: ['public-ticker-fixtures', eventSlug] });
    };

    socket.on('score-updated', onScore);
    socket.on('spectator-feed-updated', onFeedUpdate);
    socket.on('spectator-reaction-updated', onReactionUpdate);
    socket.on('eventResultsPublished', onPublished);

    return () => {
      socket.off('score-updated', onScore);
      socket.off('spectator-feed-updated', onFeedUpdate);
      socket.off('spectator-reaction-updated', onReactionUpdate);
      socket.off('eventResultsPublished', onPublished);
    };
  }, [socket, eventSlug, queryClient]);

  // Handle Emoji Reaction with Optimistic UI Update
  const handleReact = async (post, type) => {
    const key = `${post.id}-${type}`;
    if (localReactions[key]) return; // prevent duplicate clicks

    // Optimistic state
    setLocalReactions(prev => ({ ...prev, [key]: true }));

    try {
      await publicApi.reactFeed(eventSlug, post.id, type);
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  // Open Social Share Sheet
  const handleOpenShare = async (title, url) => {
    const shareUrl = url || window.location.href;
    const shareTitle = title || eventInfo?.name || 'Live Tournament Update';

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `🏆 Check out "${shareTitle}" live on FixtureGrid!\n${shareUrl}`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User cancelled
      }
    }

    setShareDialog({
      title: shareTitle,
      url: shareUrl,
    });
  };

  const handleShareToWhatsApp = () => {
    if (!shareDialog) return;
    const text = encodeURIComponent(`🏆 Check out "${shareDialog.title}" live on FixtureGrid!\n${shareDialog.url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShareDialog(null);
  };

  const handleCopyLink = () => {
    if (!shareDialog) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(shareDialog.url).then(() => {
        setCopied(true);
        setTimeout(() => { setCopied(false); setShareDialog(null); }, 1500);
      }).catch(() => {
        fallbackCopy(shareDialog.url);
      });
    } else {
      fallbackCopy(shareDialog.url);
    }
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => { setCopied(false); setShareDialog(null); }, 1500);
    } catch (e) {
      setShareDialog(null);
    }
    document.body.removeChild(ta);
  };

  if (loadingInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col p-4 space-y-4 max-w-2xl mx-auto pt-8">
        <Skeleton className="h-12 w-full bg-slate-800" />
        <Skeleton className="h-20 w-full bg-slate-800" />
        <Skeleton className="h-48 w-full bg-slate-800" />
      </div>
    );
  }

  if (infoError || !eventInfo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center text-white">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-4">
          <Trophy size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-6">The tournament link "{eventSlug}" did not match any active workspace.</p>
        <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer">
          Go to Home
        </button>
      </div>
    );
  }

  // Fallback Stories if none posted yet
  const storiesList = (feedData?.stories && feedData.stories.length > 0) ? feedData.stories : [
    {
      id: 'default-1',
      story_title: 'Match Day 🔥',
      media_type: 'image',
      caption: 'Welcome to the tournament! Official fixtures & live moments updated in real-time.',
      media_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80',
      author_name: 'Media Desk'
    },
    {
      id: 'default-2',
      story_title: 'Championship 🏆',
      media_type: 'image',
      caption: 'House rivalry heats up on the track and courts! Who will take the Aggregate Shield?',
      media_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&q=80',
      author_name: 'Official Broadcast'
    }
  ];

  // Horizontal Ticker: prioritize live, then completed, then upcoming
  const allTickerItems = tickerFixtures || [];
  const liveItems = allTickerItems.filter(f => f.status === 'live' || f.status === 'in_progress');
  const completedItems = allTickerItems.filter(f => f.status === 'completed');
  const upcomingItems = allTickerItems.filter(f => f.status === 'upcoming');
  const tickerCards = [...liveItems, ...completedItems.slice(0, 3), ...upcomingItems.slice(0, 3)].slice(0, 8);

  const top3 = (standings || []).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-blue-500 selection:text-white">
      
      {/* 1. COMPACT STICKY HEADER (Saves 150px of vertical height compared to old design) */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> LIVE
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-white truncate leading-tight">{eventInfo.name}</h1>
              <p className="text-[11px] text-slate-400 truncate">{eventInfo.school_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {followedEntity && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                <BellRing size={11} className="animate-pulse" /> {followedEntity.name}
              </span>
            )}
            <button
              onClick={() => handleOpenShare(eventInfo.name, window.location.href)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-full transition-all cursor-pointer"
            >
              <Share2 size={12} />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. LIVE STORIES / REELS CAROUSEL (Instagram-style tap-to-view highlight clips) */}
      <section className="border-b border-slate-800/60 bg-slate-900/40 py-2.5">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center gap-3.5 overflow-x-auto scrollbar-none py-1">
            {storiesList.map((story, idx) => (
              <button
                key={story.id || idx}
                onClick={() => setActiveStory(story)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer focus:outline-none"
              >
                <div className={`w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-blue-500 group-hover:scale-105 transition-transform relative ${story.media_type === 'video' ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <img
                    src={story.thumbnail_url || story.media_url}
                    alt={story.story_title || 'Story'}
                    className="w-full h-full object-cover rounded-full border-2 border-slate-900 bg-slate-800"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=100&q=80'; }}
                  />
                  {story.media_type === 'video' && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 border border-slate-900 rounded-full flex items-center justify-center text-[8px] text-white">
                      ▶
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-300 max-w-[64px] truncate text-center group-hover:text-white">
                  {story.story_title || story.caption?.slice(0, 10) || 'Moment'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HORIZONTAL LIVE MATCH TICKER (Glanceable Scores - No Vertical Scrolling) */}
      {tickerCards.length > 0 && (
        <section className="bg-slate-900/20 border-b border-slate-800/60 py-2.5">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none py-0.5">
              {tickerCards.map((f) => {
                const isLive = f.status === 'live' || f.status === 'in_progress';
                const isFinal = f.status === 'completed';
                return (
                  <div
                    key={f.id}
                    onClick={() => setActiveTab('fixtures')}
                    className="min-w-[175px] max-w-[200px] shrink-0 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-2.5 shadow-sm transition-all cursor-pointer hover:bg-slate-800/80"
                  >
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      <span className="truncate">{f.sport_name || 'Match'}</span>
                      {isLive ? (
                        <span className="text-rose-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" /> LIVE
                        </span>
                      ) : isFinal ? (
                        <span className="text-slate-500">FINAL</span>
                      ) : (
                        <span className="text-blue-400">UPCOMING</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white truncate max-w-[110px]">{f.team_a_name}</span>
                        <span className="font-mono text-slate-200">{f.score_a ?? '—'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white truncate max-w-[110px]">{f.team_b_name}</span>
                        <span className="font-mono text-slate-200">{f.score_b ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. MAIN CONTAINER & SEGMENTED TABS */}
      <main className="max-w-2xl mx-auto px-4 pt-3.5 space-y-3.5">

        {/* Tab Selector Bar */}
        <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-2xl flex gap-1 shadow-md">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Camera size={13} />
            <span>Fan Feed</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </button>

          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'standings'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Trophy size={13} />
            <span>Standings</span>
          </button>

          <button
            onClick={() => setActiveTab('fixtures')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'fixtures'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Calendar size={13} />
            <span>Matches</span>
          </button>
        </div>

        {/* Quick Follow Team Box */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg ${followedEntity ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Bell size={13} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">
                {followedEntity ? `Following ${followedEntity.name}` : 'Live Score Alerts'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {followedEntity ? 'Receiving real-time push score alerts' : 'Select your team to get instant score alerts'}
              </p>
            </div>
          </div>
          <div>
            {followedEntity ? (
              <button
                onClick={unfollowEntity}
                disabled={pushLoading}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 transition-colors"
              >
                Unfollow
              </button>
            ) : (
              <select
                defaultValue=""
                disabled={pushLoading || !isSupported}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const t = eventInfo?.teams?.find(team => String(team.id) === val);
                  if (t) followEntity({ type: 'team', id: t.id, name: t.name });
                  e.target.value = '';
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="" disabled>Follow Team...</option>
                {eventInfo?.teams?.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* LATEST RESULT SPOTLIGHT (If available) */}
        {latestResult && activeTab !== 'latest' && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 p-3.5 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 rounded-xl bg-amber-500 text-slate-950 font-black">
                <Zap size={14} className="fill-slate-950" />
              </span>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">⚡ Official Result</span>
                <p className="text-xs font-black text-white truncate">{latestResult.eventName}</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('latest')}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer shrink-0"
            >
              View Podium →
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: FANZONE & MULTIMEDIA FEED */}
        {/* ============================================================ */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {loadingFeed ? (
              <div className="space-y-3">
                <Skeleton className="h-44 w-full bg-slate-900" />
                <Skeleton className="h-44 w-full bg-slate-900" />
              </div>
            ) : (!feedData?.feed || feedData.feed.length === 0) ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                <Camera size={36} className="mx-auto mb-3 opacity-30 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-200 mb-1">FanZone Feed is Live</h3>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  Media managers and scorekeepers will publish match action photos and short video clips here throughout the tournament.
                </p>
              </div>
            ) : (
              feedData.feed.map((post) => {
                const reactions = post.reactions || { fire: 0, clap: 0, cheer: 0, trophy: 0 };
                const isVideo = post.media_type === 'video' || post.media_type === 'highlight_clip';
                const hasReactedFire = localReactions[`${post.id}-fire`];
                const hasReactedClap = localReactions[`${post.id}-clap`];
                const hasReactedTrophy = localReactions[`${post.id}-trophy`];

                return (
                  <article key={post.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all">
                    {/* Post Header */}
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 font-black text-xs flex items-center justify-center shrink-0">
                          {post.author_name?.slice(0, 2).toUpperCase() || 'MD'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{post.author_name || 'Official Media Desk'}</p>
                          <p className="text-[10px] text-slate-400">
                            {post.sport_name ? `${post.sport_name} · ` : ''}
                            {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {post.is_story_highlight && (
                        <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                          ⭐ Highlight
                        </span>
                      )}
                    </div>

                    {/* Post Caption */}
                    {post.caption && (
                      <p className="px-3.5 pb-2.5 text-xs text-slate-200 leading-relaxed font-normal">
                        {post.caption}
                      </p>
                    )}

                    {/* Media Body (Photo or Short Video) */}
                    <div className="relative bg-black flex items-center justify-center max-h-[360px] overflow-hidden">
                      {isVideo ? (
                        <div className="relative w-full aspect-video flex items-center justify-center group">
                          <video
                            src={post.media_url}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                            poster={post.thumbnail_url}
                          />
                          {post.duration_seconds > 0 && (
                            <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                              0:{post.duration_seconds < 10 ? `0${post.duration_seconds}` : post.duration_seconds}
                            </span>
                          )}
                        </div>
                      ) : (
                        <img
                          src={post.media_url}
                          alt="Match moment"
                          className="w-full h-auto max-h-[360px] object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => setActiveStory(post)}
                          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80'; }}
                        />
                      )}
                    </div>

                    {/* Action Bar: Reactions & Share Button */}
                    <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-800/80 bg-slate-900/40">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleReact(post, 'fire')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            hasReactedFire
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 scale-105'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>🔥</span>
                          <span>{(reactions.fire || 0) + (hasReactedFire ? 1 : 0)}</span>
                        </button>

                        <button
                          onClick={() => handleReact(post, 'clap')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            hasReactedClap
                              ? 'bg-blue-500/20 border-blue-500 text-blue-300 scale-105'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>👏</span>
                          <span>{(reactions.clap || 0) + (hasReactedClap ? 1 : 0)}</span>
                        </button>

                        <button
                          onClick={() => handleReact(post, 'trophy')}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            hasReactedTrophy
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300 scale-105'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>🏆</span>
                          <span>{(reactions.trophy || 0) + (hasReactedTrophy ? 1 : 0)}</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleOpenShare(post.caption || 'Tournament Highlight', window.location.href)}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-sm"
                      >
                        <Share2 size={12} />
                        <span>Share</span>
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: COMPACT STANDINGS (Zero Endless Scroll + Sport Filter) */}
        {/* ============================================================ */}
        {activeTab === 'standings' && (() => {
          const isPlacement = standingsSport === 'championship' || (standings && standings[0] && (standings[0].gold !== undefined || standings[0].gold_count !== undefined));
          const currentSportTitle = standingsSport === 'championship' ? 'Aggregate Shield Standings' : `${standingsSport} Standings`;

          return (
            <div className="space-y-3.5">
              {/* Sport-by-Sport Quick Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                <button
                  onClick={() => setStandingsSport('championship')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    standingsSport === 'championship'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy size={11} className={standingsSport === 'championship' ? 'text-slate-950' : 'text-amber-400'} />
                  <span>Overall Shield</span>
                </button>
                {sportsList.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setStandingsSport(s.name)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      standingsSport === s.name
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>

              {/* Micro-Podium Strip (Saves 250px vertical height compared to old design) */}
              {top3.length > 0 && !loadingStandings && (
                <div className="grid grid-cols-3 gap-2 items-end pt-2">
                  {/* 2nd Place */}
                  {top3[1] && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col items-center text-center">
                      <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full mb-1">🥈 2nd</span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white mb-1 shadow-sm" style={{ backgroundColor: top3[1].color || '#64748b' }}>
                        {(top3[1].code || top3[1].name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-xs font-bold text-white truncate w-full">{top3[1].name}</p>
                      <p className="text-sm font-black text-slate-300">{top3[1].total ?? top3[1].total_points ?? top3[1].points ?? 0} <span className="text-[10px] font-normal text-slate-500">pts</span></p>
                    </div>
                  )}

                  {/* 1st Place */}
                  {top3[0] && (
                    <div className="bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-3 flex flex-col items-center text-center shadow-md">
                      <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 rounded-full mb-1">👑 1st Place</span>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white mb-1 shadow-md border-2 border-amber-400" style={{ backgroundColor: top3[0].color || '#2563eb' }}>
                        {(top3[0].code || top3[0].name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-xs font-black text-white truncate w-full">{top3[0].name}</p>
                      <p className="text-base font-black text-amber-400">{top3[0].total ?? top3[0].total_points ?? top3[0].points ?? 0} <span className="text-[10px] font-normal text-slate-400">pts</span></p>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {top3[2] && (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-col items-center text-center">
                      <span className="text-[9px] font-black uppercase text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-full mb-1">🥉 3rd</span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white mb-1 shadow-sm" style={{ backgroundColor: top3[2].color || '#ea580c' }}>
                        {(top3[2].code || top3[2].name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-xs font-bold text-white truncate w-full">{top3[2].name}</p>
                      <p className="text-sm font-black text-slate-300">{top3[2].total ?? top3[2].total_points ?? top3[2].points ?? 0} <span className="text-[10px] font-normal text-slate-500">pts</span></p>
                    </div>
                  )}
                </div>
              )}

              {/* High-Density Compact Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
                <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{currentSportTitle}</h3>
                    {standingsSport === 'championship' && <Sparkles size={12} className="text-amber-400" />}
                  </div>
                  <button
                    onClick={() => handleOpenShare(currentSportTitle, window.location.href)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 size={11} /> Share
                  </button>
                </div>

                {loadingStandings ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-8 w-full bg-slate-800" />
                    <Skeleton className="h-8 w-full bg-slate-800" />
                    <Skeleton className="h-8 w-full bg-slate-800" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-md z-10">
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-3 text-left">Team</th>
                          {isPlacement ? (
                            <>
                              <th className="py-2.5 px-2 text-center">🥇</th>
                              <th className="py-2.5 px-2 text-center">🥈</th>
                              <th className="py-2.5 px-2 text-center">🥉</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2.5 px-2 text-center">P</th>
                              <th className="py-2.5 px-2 text-center">W</th>
                              <th className="py-2.5 px-2 text-center">D</th>
                              <th className="py-2.5 px-2 text-center">L</th>
                              <th className="py-2.5 px-2 text-center">+/-</th>
                            </>
                          )}
                          <th className="py-2.5 px-3 text-right text-blue-400">PTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {standings?.map((team, idx) => {
                          const rank = idx + 1;
                          const teamObj = eventInfo?.teams?.find(t => t.code === team.code || String(t.id) === String(team.id)) || team;
                          const isFollowed = followedEntity && (String(followedEntity.id) === String(teamObj.id || team.id));
                          const pointsVal = team.total ?? team.total_points ?? team.points ?? 0;
                          const gd = team.gd !== undefined ? team.gd : ((team.pf != null && team.pa != null) ? (team.pf - team.pa) : (team.goal_diff ?? 0));

                          return (
                            <tr
                              key={team.code || team.id || idx}
                              className={`transition-colors ${isFollowed ? 'bg-blue-600/15' : 'hover:bg-slate-800/40'}`}
                            >
                              <td className="py-2 px-3 text-center"><RankBadge rank={rank} /></td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.color || '#3b82f6' }} />
                                  <span className="font-bold text-white truncate max-w-[130px]">{team.name}</span>
                                  {isFollowed && (
                                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded shrink-0">★</span>
                                  )}
                                </div>
                              </td>
                              {isPlacement ? (
                                <>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-300">{team.gold ?? team.gold_count ?? 0}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-300">{team.silver ?? team.silver_count ?? 0}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-300">{team.bronze ?? team.bronze_count ?? 0}</td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-300">{team.played ?? 0}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-300">{team.won ?? 0}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-300">{team.drawn ?? 0}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-300">{team.lost ?? 0}</td>
                                  <td className="py-2 px-2 text-center font-semibold text-slate-400 font-mono">{gd > 0 ? `+${gd}` : gd}</td>
                                </>
                              )}
                              <td className="py-2 px-3 text-right font-black font-mono text-sm text-blue-400">
                                {pointsVal}
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
          );
        })()}

        {/* ============================================================ */}
        {/* TAB 3: MATCHES & FIXTURES */}
        {/* ============================================================ */}
        {activeTab === 'fixtures' && (
          <div className="space-y-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              <button
                onClick={() => setFixtureFilter('All')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  fixtureFilter === 'All' ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Sports
              </button>
              {sportsList.map(s => (
                <button
                  key={s.id}
                  onClick={() => setFixtureFilter(s.name)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    fixtureFilter === s.name ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Fixtures List */}
            {loadingFixtures ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full bg-slate-900" />
                <Skeleton className="h-16 w-full bg-slate-900" />
              </div>
            ) : (!fixtures || fixtures.length === 0) ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
                No fixtures scheduled for this filter.
              </div>
            ) : (
              <div className="space-y-2">
                {fixtures.map((f) => (
                  <div
                    key={f.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-sm hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                      <span>{f.sport_name} · {f.venue_name || 'Main Field'}</span>
                      <span className={f.status === 'live' ? 'text-rose-400 font-black' : f.status === 'completed' ? 'text-slate-400' : 'text-blue-400 font-semibold'}>
                        {f.status === 'live' ? '🔴 LIVE' : f.status === 'completed' ? 'FINAL' : f.scheduled_at ? new Date(f.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'UPCOMING'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.team_a_color || '#3b82f6' }} />
                        <span className="font-bold text-xs text-white">{f.team_a_name}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-white">{f.score_a ?? '—'}</span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.team_b_color || '#ef4444' }} />
                        <span className="font-bold text-xs text-white">{f.team_b_name}</span>
                      </div>
                      <span className="font-mono text-sm font-black text-white">{f.score_b ?? '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: LATEST OFFICIAL RESULT DETAILS */}
        {/* ============================================================ */}
        {activeTab === 'latest' && latestResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-slate-950 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">Official Result</span>
                <h2 className="text-base font-black leading-tight text-slate-950">{latestResult.eventName}</h2>
                <p className="text-xs text-amber-950 font-medium">{latestResult.sportName} · {latestResult.category}</p>
              </div>
              <button
                onClick={() => setActiveTab('standings')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-950 text-white cursor-pointer"
              >
                Standings →
              </button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-950/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <th className="py-2.5 px-3 text-left">Place</th>
                  <th className="py-2.5 px-3 text-left">Team</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                  <th className="py-2.5 px-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {latestResult.results?.map((r) => (
                  <tr key={r.placement} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-bold text-white">
                      {r.placement === 1 ? '🥇 1st' : r.placement === 2 ? '🥈 2nd' : r.placement === 3 ? '🥉 3rd' : `#${r.placement}`}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.teamColor || '#64748b' }} />
                        <span className="font-bold text-white">{r.teamName}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-400">{r.timeFormatted || '—'}</td>
                    <td className="py-2 px-3 text-right font-black text-amber-400">+{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* 5. FULL-SCREEN STORY REEL MODAL (Instagram-style tap-nav & segmented progress) */}
      {activeStory && (() => {
        const currentIdx = storiesList.findIndex(st => st.id === activeStory.id);
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx < storiesList.length - 1;

        return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none">
            {/* Multi-story Segmented Progress Bars */}
            <div className="absolute top-2.5 left-3 right-3 z-30 flex items-center gap-1.5">
              {storiesList.map((s, idx) => {
                const isPast = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={s.id || idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-white rounded-full transition-all duration-75 ${
                        isPast ? 'w-full' : isCurrent ? '' : 'w-0'
                      }`}
                      style={isCurrent ? { width: `${storyProgress}%` } : {}}
                    />
                  </div>
                );
              })}
            </div>

            {/* Modal Header */}
            <div className="absolute top-5 left-4 right-4 z-30 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 border border-white/20 flex items-center justify-center font-bold text-xs shadow-md">
                  {activeStory.author_name?.slice(0, 2).toUpperCase() || 'MD'}
                </div>
                <div>
                  <span className="text-xs font-black drop-shadow text-white block leading-tight">
                    {activeStory.story_title || activeStory.author_name || 'Live Moment'}
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium">
                    {activeStory.sport_name ? `${activeStory.sport_name} · ` : ''}Story {currentIdx + 1} of {storiesList.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenShare(activeStory.caption || 'Tournament Live Moment', window.location.href)}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white cursor-pointer border border-white/10"
                  aria-label="Share story"
                >
                  <Share2 size={13} />
                </button>
                <button
                  onClick={() => setActiveStory(null)}
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white cursor-pointer border border-white/10 text-sm font-bold"
                  aria-label="Close story"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Left / Right Interactive Tap Zones for Story Navigation */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasPrev) {
                  setActiveStory(storiesList[currentIdx - 1]);
                  setStoryProgress(0);
                }
              }}
              className="absolute left-0 top-16 bottom-24 w-1/3 z-20 cursor-pointer focus:outline-none"
              aria-label="Previous story"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasNext) {
                  setActiveStory(storiesList[currentIdx + 1]);
                  setStoryProgress(0);
                } else {
                  setActiveStory(null);
                }
              }}
              className="absolute right-0 top-16 bottom-24 w-1/3 z-20 cursor-pointer focus:outline-none"
              aria-label="Next story"
            />

            {/* Story Media (Photo or Looping Video) */}
            <div className="flex-1 flex items-center justify-center relative bg-black">
              {activeStory.media_type === 'video' ? (
                <video
                  key={activeStory.media_url}
                  src={activeStory.media_url}
                  autoPlay
                  playsInline
                  loop
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  key={activeStory.media_url}
                  src={activeStory.media_url}
                  alt="Story"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80'; }}
                />
              )}

              {/* Story Caption Overlay */}
              {activeStory.caption && (
                <div className="absolute bottom-6 left-4 right-4 z-30 bg-slate-950/85 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl shadow-xl">
                  <p className="text-xs font-semibold text-white mb-2 leading-relaxed">{activeStory.caption}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Zap size={11} className="text-amber-400 fill-amber-400" /> FixtureGrid Live Pulse
                    </span>
                    <span className="text-[10px] text-slate-400">Tap sides to skip</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 6. 1-TAP SOCIAL SHARING MODAL SHEET */}
      {shareDialog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Share Live Moment 📤</h3>
              <button onClick={() => setShareDialog(null)} className="text-slate-400 hover:text-white text-base">✕</button>
            </div>
            <p className="text-xs text-slate-300 font-medium line-clamp-2">
              "{shareDialog.title}"
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleShareToWhatsApp}
                className="p-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold text-emerald-300 cursor-pointer transition-all active:scale-95"
              >
                <span className="text-xl">💬</span>
                <span>WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold text-blue-300 cursor-pointer transition-all active:scale-95"
              >
                <span className="text-xl">{copied ? '✓' : '🔗'}</span>
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. FLOATING MOBILE-FIRST THUMB DOCK (Visible on mobile viewports < 640px) */}
      <nav className="sm:hidden fixed bottom-3 left-4 right-4 z-40 max-w-sm mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-1.5 shadow-2xl flex items-center justify-around">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-90 ${
            activeTab === 'feed'
              ? 'text-blue-400 font-black'
              : 'text-slate-400 font-semibold hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Camera size={17} />
            <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-[10px] tracking-tight">FanZone</span>
        </button>

        <button
          onClick={() => setActiveTab('standings')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-90 ${
            activeTab === 'standings'
              ? 'text-blue-400 font-black'
              : 'text-slate-400 font-semibold hover:text-slate-200'
          }`}
        >
          <Trophy size={17} />
          <span className="text-[10px] tracking-tight">Standings</span>
        </button>

        <button
          onClick={() => setActiveTab('fixtures')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-90 ${
            activeTab === 'fixtures'
              ? 'text-blue-400 font-black'
              : 'text-slate-400 font-semibold hover:text-slate-200'
          }`}
        >
          <Calendar size={17} />
          <span className="text-[10px] tracking-tight">Matches</span>
        </button>

        {latestResult && (
          <button
            onClick={() => setActiveTab('latest')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 transition-all cursor-pointer active:scale-90 ${
              activeTab === 'latest'
                ? 'text-amber-400 font-black'
                : 'text-amber-400/70 font-semibold hover:text-amber-300'
            }`}
          >
            <Zap size={17} className="fill-amber-400/20" />
            <span className="text-[10px] tracking-tight">Result</span>
          </button>
        )}
      </nav>

      {/* Footer Branding */}
      <footer className="mt-8 mb-16 sm:mb-6 text-center text-xs text-slate-500">
        <p>FixtureGrid Live FanZone · Real-Time Tournament Broadcast</p>
      </footer>
    </div>
  );
}
