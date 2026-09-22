import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFixtures, useSettings } from '../hooks/useFixtures.js';
import { useLiveUpdates } from '../hooks/useLiveUpdates.js';
import { useLogStandings, useAnalytics } from '../hooks/useStandings.js';
import { useSocket } from '../contexts/SocketContext.jsx';
import { mediaApi, athleticsApi, publicApi } from '../api.js';
import TeamPill from '../components/TeamPill.jsx';
import MatchTimerDisplay from '../components/MatchTimerDisplay.jsx';
import { Trophy, Clock, Tv, Award, Zap, Sparkles, Megaphone, Timer, Play, X, Flame } from 'lucide-react';

export default function TvMode() {
  const { eventSlug } = useParams();
  const queryClient = useQueryClient();
  const socket = useSocket();

  // If viewing via /watch/:eventSlug/display, ensure tenant slug is in localStorage for Axios
  useEffect(() => {
    if (eventSlug) {
      localStorage.setItem('organization_slug', eventSlug);
    }
  }, [eventSlug]);

  const { data: liveFixtures, isLoading: loadingLive } = useFixtures({ status: 'live' });
  const { data: upcomingFixtures } = useFixtures({ status: 'upcoming' });
  const { data: completedFixtures } = useFixtures({ status: 'completed' });
  const { data: log } = useLogStandings();
  const { data: analytics } = useAnalytics('All');
  const { data: settings } = useSettings();
  
  // Connect to websockets for score updates
  useLiveUpdates();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [urgentAlert, setUrgentAlert] = useState(null);
  const dismissedUrgentRef = useRef(new Set());
  const urgentTimeoutRef = useRef(null);

  // 2-Minute Post-Event Beam states (for placement sports e.g. Athletics / Swimming)
  const [latestResult, setLatestResult] = useState(null);
  const [beamedResult, setBeamedResult] = useState(null);
  const [isBeamActive, setIsBeamActive] = useState(false);
  const [beamTimeRemaining, setBeamTimeRemaining] = useState(120);
  const [tvBeamToggle, setTvBeamToggle] = useState(true); // TV display-level override toggle
  const hasInitialBeamedRef = useRef(false);

  const isFeatureEnabled = settings?.enable_tv_adverts !== false;
  const overrideMode = settings?.tv_layout_mode || 'auto';
  const hasLiveMatches = liveFixtures && liveFixtures.length > 0;

  // Determine whether to show live match split or full showcase
  const showLiveSplit = overrideMode === 'force_live'
    ? true
    : overrideMode === 'force_showcase'
    ? false
    : hasLiveMatches;

  // Active adverts query
  const { data: adverts } = useQuery({
    queryKey: ['tv-adverts-active'],
    queryFn: async () => {
      const res = await mediaApi.getAdverts(true);
      return res.data;
    },
    enabled: isFeatureEnabled,
    refetchInterval: 30000
  });

  // Active announcements query
  const { data: announcements } = useQuery({
    queryKey: ['tv-announcements-active'],
    queryFn: async () => {
      const res = await mediaApi.getAnnouncements(true);
      return res.data;
    },
    enabled: isFeatureEnabled,
    refetchInterval: 15000
  });

  // Fetch latest logged event result (Athletics / Swimming heats)
  const { data: latestResultData } = useQuery({
    queryKey: ['tv-latest-result', eventSlug],
    queryFn: async () => {
      try {
        if (eventSlug) {
          const res = await publicApi.getLatestResult(eventSlug);
          return res.data?.latestResult;
        } else {
          const res = await athleticsApi.getLatestResult();
          return res.data?.latestResult;
        }
      } catch (err) {
        console.error('Failed to load latest result in TvMode:', err);
        return null;
      }
    },
    refetchInterval: 30000,
  });

  // Check if initial latest result was published in the last 2 minutes (120s)
  useEffect(() => {
    if (latestResultData) {
      setLatestResult(latestResultData);
      if (!hasInitialBeamedRef.current) {
        hasInitialBeamedRef.current = true;
        const publishedTime = new Date(latestResultData.publishedAt).getTime();
        const elapsedSec = Math.floor((Date.now() - publishedTime) / 1000);
        const isPlacement = latestResultData.scoringType === 'placement' || latestResultData.sportName === 'Athletics' || latestResultData.sportName === 'Swimming';
        const isBeamEnabled = settings?.enable_tv_post_event_beam !== false && tvBeamToggle !== false;

        if (isPlacement && isBeamEnabled && elapsedSec < 120 && elapsedSec >= 0) {
          setBeamedResult(latestResultData);
          setBeamTimeRemaining(120 - elapsedSec);
          setIsBeamActive(true);
        }
      }
    }
  }, [latestResultData, settings, tvBeamToggle]);

  // 120-second active beam countdown timer
  useEffect(() => {
    if (!isBeamActive) return;
    const timer = setInterval(() => {
      setBeamTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsBeamActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isBeamActive]);

  // Sync active urgent announcement from query when loaded / refetched
  useEffect(() => {
    if (announcements && announcements.length > 0) {
      const activeUrgent = announcements.find(a => a.priority === 'urgent' && a.is_active !== false);
      if (activeUrgent && !dismissedUrgentRef.current.has(activeUrgent.id)) {
        setUrgentAlert(activeUrgent);
        const duration = (activeUrgent.display_duration_seconds || 15) * 1000;
        if (urgentTimeoutRef.current) clearTimeout(urgentTimeoutRef.current);
        urgentTimeoutRef.current = setTimeout(() => {
          dismissedUrgentRef.current.add(activeUrgent.id);
          setUrgentAlert(curr => (curr?.id === activeUrgent.id ? null : curr));
        }, duration);
      }
    }
  }, [announcements]);

  useEffect(() => {
    // Add dark mode class to body specifically for TV mode
    document.body.classList.add('dark', 'bg-gray-950', 'text-white');
    
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      document.body.classList.remove('bg-gray-950', 'text-white', 'dark');
      clearInterval(timeTimer);
      if (urgentTimeoutRef.current) clearTimeout(urgentTimeoutRef.current);
    };
  }, []);

  // Listen to socket events for instant announcements, layout overrides, adverts updates, and event results beam
  useEffect(() => {
    if (!socket) return;

    if (eventSlug) {
      socket.emit('join-tenant', eventSlug);
      socket.emit('join-event', { tenantSlug: eventSlug, eventId: 'all' });
    }

    const handleEventResultsPublished = (payload) => {
      console.log('[TV] Received eventResultsPublished:', payload);
      setLatestResult(payload);
      queryClient.setQueryData(['tv-latest-result', eventSlug], payload);

      const isPlacement = payload?.scoringType === 'placement' || payload?.sportName === 'Athletics' || payload?.sportName === 'Swimming';
      const isBeamEnabled = settings?.enable_tv_post_event_beam !== false && tvBeamToggle !== false;

      if (isPlacement && isBeamEnabled) {
        setBeamedResult(payload);
        setBeamTimeRemaining(120);
        setIsBeamActive(true);
      }
    };

    const handleAnnouncement = (data) => {
      if (data.priority === 'urgent') {
        dismissedUrgentRef.current.delete(data.id);
        setUrgentAlert(data);
        const duration = (data.display_duration_seconds || 15) * 1000;
        if (urgentTimeoutRef.current) clearTimeout(urgentTimeoutRef.current);
        urgentTimeoutRef.current = setTimeout(() => {
          dismissedUrgentRef.current.add(data.id);
          setUrgentAlert(curr => (curr?.id === data.id ? null : curr));
        }, duration);
      }
      queryClient.invalidateQueries({ queryKey: ['tv-announcements-active'] });
    };

    const handleAnnouncementDismissed = (data) => {
      if (data?.id) dismissedUrgentRef.current.add(data.id);
      setUrgentAlert(curr => (curr?.id === data?.id ? null : curr));
      queryClient.invalidateQueries({ queryKey: ['tv-announcements-active'] });
    };

    const handleLayoutOverride = (data) => {
      if (data?.mode) {
        queryClient.setQueryData(['settings'], (old) => (old ? { ...old, tv_layout_mode: data.mode } : old));
      }
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    };

    const handleAdvertsUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['tv-adverts-active'] });
    };

    socket.on('eventResultsPublished', handleEventResultsPublished);
    socket.on('tv-announcement', handleAnnouncement);
    socket.on('tv-announcement-dismissed', handleAnnouncementDismissed);
    socket.on('tv-layout-override', handleLayoutOverride);
    socket.on('tv-adverts-updated', handleAdvertsUpdated);

    return () => {
      socket.off('eventResultsPublished', handleEventResultsPublished);
      socket.off('tv-announcement', handleAnnouncement);
      socket.off('tv-announcement-dismissed', handleAnnouncementDismissed);
      socket.off('tv-layout-override', handleLayoutOverride);
      socket.off('tv-adverts-updated', handleAdvertsUpdated);
    };
  }, [socket, queryClient, eventSlug, settings, tvBeamToggle]);

  const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3010/api').replace(/\/api\/?$/, '');
    return `${base}${url}`;
  };

  // Build dynamic carousel slides
  const slides = [];

  if (log && log.length > 0) {
    slides.push({
      id: 'overall',
      title: 'Championship Points',
      subtitle: 'Current Overall Standings',
      icon: Trophy,
      colorClass: 'text-purple-400',
      duration: 10,
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
      duration: 10,
      data: [...log].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze).slice(0, 5)
    });
  }

  // Inject eligible sponsor advert slides
  if (isFeatureEnabled && adverts && adverts.length > 0) {
    const slideAds = adverts.filter(ad => ad.display_type === 'slide' || ad.display_type === 'both');
    slideAds.forEach(ad => {
      slides.push({
        id: `ad_${ad.id}`,
        isAdvert: true,
        title: ad.title,
        subtitle: ad.tagline || 'Official Sponsor & Partner',
        icon: Sparkles,
        colorClass: 'text-pink-400',
        duration: ad.display_duration_seconds || 10,
        data: ad
      });
    });
  }

  if (completedFixtures && completedFixtures.length > 0) {
    slides.push({
      id: 'results',
      title: 'Recent Results',
      subtitle: 'Latest completed matches',
      icon: Trophy,
      colorClass: 'text-green-400',
      duration: 10,
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
      duration: 10,
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
      duration: 10,
      data: analytics.topScorers.slice(0, 5)
    });
  }

  if (analytics?.records && (analytics.records.biggestBlowout || analytics.records.highestScoring)) {
    slides.push({
      id: 'records',
      title: 'Tournament Records',
      subtitle: 'Records and milestones',
      icon: Zap,
      colorClass: 'text-amber-500',
      duration: 10,
      data: analytics.records
    });
  }

  // Dynamic slide rotation timer respecting custom duration per advert slide
  useEffect(() => {
    if (slides.length <= 1) return;
    const currentDuration = (slides[currentSlideIndex % slides.length]?.duration || 10) * 1000;
    const slideTimer = setTimeout(() => {
      setCurrentSlideIndex(prev => (prev + 1) % slides.length);
    }, currentDuration);

    return () => clearTimeout(slideTimer);
  }, [slides.length, currentSlideIndex, slides]);

  const activeSlide = slides.length > 0 ? slides[currentSlideIndex % slides.length] : null;

  // Compile ticker items: ticker adverts + normal announcements + default partners
  const tickerItems = [];
  if (isFeatureEnabled) {
    if (announcements && announcements.length > 0) {
      // Urgent announcements pop up front-and-center on screen; only normal announcements scroll in the ticker
      const normalAnnouncements = announcements.filter(ann => ann.priority !== 'urgent');
      normalAnnouncements.forEach(ann => {
        tickerItems.push({
          isAnnouncement: true,
          text: ann.title ? `${ann.title}: ${ann.message}` : ann.message
        });
      });
    }

    if (adverts && adverts.length > 0) {
      const tickerAds = adverts.filter(ad => ad.display_type === 'ticker' || ad.display_type === 'both');
      tickerAds.forEach(ad => {
        tickerItems.push({
          isAnnouncement: false,
          title: ad.title,
          tagline: ad.tagline,
          logo_url: ad.logo_url
        });
      });
    }

    // If no adverts or announcements, fallback to settings sponsors
    if (tickerItems.length === 0 && settings?.sponsors && settings.sponsors.length > 0) {
      settings.sponsors.forEach(s => {
        tickerItems.push({
          isAnnouncement: false,
          title: s.name,
          tagline: s.tag,
          logo_url: s.logoUrl
        });
      });
    }
  }

  const renderSlideContent = (slide, isFullScreen = false) => {
    if (!slide) return null;

    // Custom Advert Slide Rendering
    if (slide.isAdvert) {
      const ad = slide.data;
      return (
        <div className={`flex-1 flex flex-col justify-center items-center h-full w-full ${isFullScreen ? 'max-w-5xl mx-auto' : ''}`}>
          {ad.banner_url ? (
            <div className="relative w-full h-full min-h-[300px] max-h-[500px] rounded-3xl overflow-hidden border border-gray-800 shadow-2xl bg-black flex items-center justify-center">
              <img
                src={resolveUrl(ad.banner_url)}
                alt={ad.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-gray-950/95 via-gray-950/80 to-transparent flex items-end justify-between gap-6 backdrop-blur-sm">
                <div className="space-y-1">
                  {ad.tagline && (
                    <span className="text-xs uppercase font-black tracking-widest text-purple-400">
                      {ad.tagline}
                    </span>
                  )}
                  <h3 className="text-3xl font-black text-white tracking-tight">{ad.title}</h3>
                </div>

                {ad.website_url && (
                  <div className="flex items-center gap-3 bg-white/95 p-2 rounded-2xl shadow-xl shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(ad.website_url)}`}
                      alt="Scan QR"
                      className="w-14 h-14 rounded-lg object-contain"
                    />
                    <div className="text-gray-900 pr-1">
                      <div className="text-[10px] font-black uppercase tracking-wider text-purple-700">Scan to Visit</div>
                      <div className="text-[9px] text-gray-500 font-semibold max-w-[110px] truncate">
                        {ad.website_url.replace(/^https?:\/\//, '')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full p-8 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 shadow-2xl flex flex-col items-center text-center justify-center gap-6">
              {ad.logo_url ? (
                <div className="p-4 bg-white/95 rounded-2xl shadow-lg max-w-[240px] max-h-[120px] flex items-center justify-center">
                  <img
                    src={resolveUrl(ad.logo_url)}
                    alt={ad.title}
                    className="max-h-20 object-contain"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                  <Sparkles size={36} />
                </div>
              )}

              <div className="space-y-2 max-w-lg">
                {ad.tagline && (
                  <span className="text-xs uppercase font-black tracking-widest text-purple-400">
                    {ad.tagline}
                  </span>
                )}
                <h3 className="text-3xl font-black text-white">{ad.title}</h3>
                <p className="text-sm text-gray-400 font-medium">Proud official partner of the tournament</p>
              </div>

              {ad.website_url && (
                <div className="flex items-center gap-3 bg-white/95 p-2.5 rounded-2xl shadow-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(ad.website_url)}`}
                    alt="Scan QR"
                    className="w-14 h-14 rounded-lg object-contain"
                  />
                  <div className="text-left text-gray-900 pr-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-purple-700">Scan to Connect</div>
                    <div className="text-xs font-bold text-gray-800 truncate max-w-[150px]">
                      {ad.website_url.replace(/^https?:\/\//, '')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

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
    <div className={`min-h-screen p-8 flex flex-col font-sans bg-gray-950 select-none ${isFeatureEnabled && tickerItems.length > 0 ? 'pb-20' : ''}`}>
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-slideProgress {
          animation: progress 10s linear forwards;
        }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          display: flex;
          width: max-content;
          animation: marquee 35s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Urgent Announcement Pop-up Alert Modal Takeover */}
      {urgentAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 select-none">
          <div className="max-w-3xl w-full bg-gradient-to-br from-red-950 via-gray-900 to-black border-2 border-red-500/80 rounded-3xl p-8 md:p-10 shadow-[0_0_80px_rgba(239,68,68,0.45)] relative overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Top red warning glow bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />
            
            <div className="flex flex-col items-center text-center">
              {/* Badge & Icon */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-black uppercase tracking-widest mb-6">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>Urgent Live Announcement</span>
              </div>

              <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-3xl mb-6 shadow-inner">
                <Megaphone className="w-16 h-16 text-red-500 animate-bounce" />
              </div>

              {/* Title & Message */}
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4 drop-shadow">
                {urgentAlert.title || 'Tournament Alert'}
              </h2>
              
              <p className="text-xl md:text-2xl font-bold text-gray-200 leading-relaxed max-w-2xl">
                {urgentAlert.message}
              </p>

              {/* Bottom broadcast footer */}
              <div className="mt-8 pt-6 border-t border-gray-800/80 w-full flex items-center justify-between text-xs text-gray-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                  Official Broadcast Override
                </span>
                <span>Priority Alert</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-500 flex items-center gap-4">
            <Tv className="w-10 h-10 text-blue-500" />
            {settings?.event_title || 'Tournament Live Dashboard'}
          </h1>
          <p className="text-xl text-gray-400 mt-2 font-semibold tracking-wider uppercase">
            {settings?.org_name || 'Sports Manager'}
          </p>
        </div>

        {/* Center / Controls: Beam indicator & manual trigger */}
        <div className="flex items-center gap-3">
          {latestResult && (
            <button
              onClick={() => {
                setBeamedResult(latestResult);
                setBeamTimeRemaining(120);
                setIsBeamActive(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
              title="Click to spotlight the latest event results"
            >
              <Zap size={14} className="text-amber-400 animate-pulse" />
              <span>Latest: {latestResult.eventName}</span>
            </button>
          )}

          <button
            onClick={() => setTvBeamToggle(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
              tvBeamToggle
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
            title="Toggle 2-minute auto-beam for placement sport results"
          >
            <span>Auto-Beam: {tvBeamToggle ? 'ON' : 'OFF'}</span>
          </button>
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

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col">
        {isBeamActive && beamedResult ? (
          /* Dedicated 2-Minute Post-Event Results Spotlight Card */
          <div className="flex-1 flex flex-col justify-between max-w-6xl mx-auto w-full bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900 border-2 border-amber-500/60 rounded-[36px] p-8 md:p-10 shadow-[0_0_80px_rgba(245,158,11,0.25)] relative overflow-hidden animate-in zoom-in-95 duration-500">
            {/* Top Amber Countdown Progress Line */}
            <div
              className="absolute top-0 left-0 h-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(245,158,11,0.8)]"
              style={{ width: `${Math.max(1, (beamTimeRemaining / 120) * 100)}%` }}
            />

            {/* Header info */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
                    <Trophy className="w-9 h-9 animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black">
                        ⚡ Official Results
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-300 border border-gray-700">
                        {beamedResult.sportName || 'Athletics'}
                      </span>
                      {beamedResult.category && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-900/60 text-blue-300 border border-blue-700/50">
                          {beamedResult.category}
                        </span>
                      )}
                      {beamedResult.venueName && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-800/80 text-gray-400">
                          📍 {beamedResult.venueName}
                        </span>
                      )}
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                      {beamedResult.eventName}
                    </h2>
                  </div>
                </div>

                {/* Countdown & Resume Slideshow Button */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-950/80 border border-gray-800 text-xs font-mono text-amber-300">
                    <Clock size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
                    <span>Auto-resuming in {Math.floor(beamTimeRemaining / 60)}:{String(beamTimeRemaining % 60).padStart(2, '0')}</span>
                  </div>
                  <button
                    onClick={() => setIsBeamActive(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    <Play size={14} fill="white" />
                    <span>Resume Slideshow</span>
                  </button>
                </div>
              </div>

              {/* Placements Cards */}
              <div className="space-y-4 my-4">
                {/* Top 3 Podium Cards */}
                {beamedResult.results && beamedResult.results.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* 1st Place */}
                    {beamedResult.results[0] && (
                      <div className="relative p-6 rounded-2xl bg-gradient-to-b from-yellow-950/40 via-gray-900 to-gray-950 border-2 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)] flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-500 text-black text-xs font-black uppercase rounded-bl-xl tracking-wider flex items-center gap-1">
                          🥇 1st Place
                        </div>
                        <div className="mb-4">
                          <div className="text-3xl font-black text-yellow-400 mb-1">
                            #1 Winner
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                              style={{ backgroundColor: beamedResult.results[0].teamColor || '#eab308' }}
                            />
                            <span className="text-xl font-black text-white">
                              {beamedResult.results[0].teamName}
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase">
                              ({beamedResult.results[0].teamCode})
                            </span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-yellow-500/20 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Time</span>
                            <div className="text-2xl font-mono font-black text-yellow-300">
                              {beamedResult.results[0].timeFormatted || '—'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Points</span>
                            <div className="text-2xl font-bold text-yellow-400">
                              +{beamedResult.results[0].points} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2nd Place */}
                    {beamedResult.results[1] && (
                      <div className="relative p-6 rounded-2xl bg-gradient-to-b from-slate-800/30 via-gray-900 to-gray-950 border-2 border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.15)] flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-slate-300 text-black text-xs font-black uppercase rounded-bl-xl tracking-wider flex items-center gap-1">
                          🥈 2nd Place
                        </div>
                        <div className="mb-4">
                          <div className="text-3xl font-black text-slate-300 mb-1">
                            #2 Runner Up
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                              style={{ backgroundColor: beamedResult.results[1].teamColor || '#94a3b8' }}
                            />
                            <span className="text-xl font-black text-white">
                              {beamedResult.results[1].teamName}
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase">
                              ({beamedResult.results[1].teamCode})
                            </span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Time</span>
                            <div className="text-2xl font-mono font-black text-slate-200">
                              {beamedResult.results[1].timeFormatted || '—'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Points</span>
                            <div className="text-2xl font-bold text-slate-300">
                              +{beamedResult.results[1].points} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 3rd Place */}
                    {beamedResult.results[2] && (
                      <div className="relative p-6 rounded-2xl bg-gradient-to-b from-amber-950/25 via-gray-900 to-gray-950 border-2 border-amber-700/80 shadow-[0_0_20px_rgba(180,83,9,0.15)] flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-amber-600 text-white text-xs font-black uppercase rounded-bl-xl tracking-wider flex items-center gap-1">
                          🥉 3rd Place
                        </div>
                        <div className="mb-4">
                          <div className="text-3xl font-black text-amber-500 mb-1">
                            #3 Bronze
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                              style={{ backgroundColor: beamedResult.results[2].teamColor || '#b45309' }}
                            />
                            <span className="text-xl font-black text-white">
                              {beamedResult.results[2].teamName}
                            </span>
                            <span className="text-xs font-bold text-gray-400 uppercase">
                              ({beamedResult.results[2].teamCode})
                            </span>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-amber-900/50 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Time</span>
                            <div className="text-2xl font-mono font-black text-amber-300">
                              {beamedResult.results[2].timeFormatted || '—'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Points</span>
                            <div className="text-2xl font-bold text-amber-400">
                              +{beamedResult.results[2].points} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4th and beyond list */}
                {beamedResult.results && beamedResult.results.length > 3 && (
                  <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-4">
                    <div className="text-xs uppercase font-extrabold tracking-wider text-gray-400 mb-3">
                      Remaining Participants &amp; Times
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {beamedResult.results.slice(3).map((r) => (
                        <div
                          key={r.placement}
                          className="flex items-center justify-between p-3 bg-gray-900/80 border border-gray-800/80 rounded-xl"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-gray-800 text-gray-300 text-xs font-black flex items-center justify-center">
                              {r.placement}
                            </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: r.teamColor || '#64748b' }}
                            />
                            <span className="font-bold text-white text-sm">
                              {r.teamName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {r.timeFormatted && (
                              <span className="text-xs font-mono font-semibold text-gray-300">
                                {r.timeFormatted}
                              </span>
                            )}
                            <span className="text-xs font-bold text-amber-400">
                              +{r.points} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom info footer */}
            <div className="pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>Spotlight mode active for 2 minutes · All championship scores updated in real time</span>
              <span>Press "Resume Slideshow" to skip back to rotation</span>
            </div>
          </div>
        ) : showLiveSplit ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1">
            
            {/* Live Matches Column (Takes up 2 columns) */}
            <div className="xl:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-red-500">
                  <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="text-2xl font-black uppercase tracking-wider font-sans">Live Matches</h2>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                {loadingLive ? (
                  <div className="text-2xl text-gray-500 text-center py-20 animate-pulse">Loading live action...</div>
                ) : liveFixtures && liveFixtures.length > 0 ? (
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
                        <div className="flex items-center justify-center p-6 bg-gray-950/60 rounded-2xl border border-gray-800/80">
                          <span className="text-2xl font-black text-amber-400">{f.team_a_name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-6 my-4">
                          {/* Team A */}
                          <div className="flex-1 flex flex-col items-center gap-3">
                            <TeamPill code={f.team_a_code} name={f.team_a_name} logoUrl={f.team_a_logo} />
                            <span className="text-6xl font-black font-mono tracking-tight text-white">{f.score_a !== null ? f.score_a : 0}</span>
                          </div>

                          {/* Center Divider / Timer */}
                          <div className="flex flex-col items-center gap-3 shrink-0">
                            <MatchTimerDisplay fixtureId={f.id} initialDurationMinutes={f.duration_minutes || 10} />
                            <span className="text-xs uppercase font-extrabold tracking-widest px-3 py-1 bg-gray-800 rounded-full text-gray-400">
                              {f.round || 'Round'}
                            </span>
                          </div>

                          {/* Team B */}
                          <div className="flex-1 flex flex-col items-center gap-3">
                            <TeamPill code={f.team_b_code} name={f.team_b_name} logoUrl={f.team_b_logo} />
                            <span className="text-6xl font-black font-mono tracking-tight text-white">{f.score_b !== null ? f.score_b : 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-gray-500 text-xl border border-dashed border-gray-800 rounded-3xl">
                    No matches are currently active.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mini Carousel */}
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
          /* Full-Screen Showcasing Carousel when NO Live Matches are Active (or Forced by Admin) */
          <div className="flex-1 flex flex-col justify-center py-4">
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase bg-gray-950 text-gray-500 border border-gray-850 px-3 py-1 rounded-full font-bold">
                      Slide {currentSlideIndex % slides.length + 1} of {slides.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center py-4">
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
                No completed fixtures or adverts registered for this tournament yet.
              </div>
            )}
          </div>
        )}
      </div>


      {/* Persistent Bottom Broadcast Ticker */}
      {isFeatureEnabled && tickerItems.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full z-40 bg-gray-950/95 border-t border-gray-800 backdrop-blur-xl h-11 flex items-center overflow-hidden select-none">
          {/* Left static label */}
          <div className="h-full px-4 bg-gradient-to-r from-purple-900 to-indigo-900 flex items-center gap-2 shrink-0 border-r border-purple-700/50 z-10 shadow-lg">
            <Sparkles size={14} className="text-purple-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span className="text-[11px] font-black tracking-widest text-white uppercase whitespace-nowrap">
              SPONSORS &amp; NEWS
            </span>
          </div>

          {/* Marquee track */}
          <div className="flex-1 overflow-hidden relative flex items-center">
            <div className="animate-ticker items-center gap-8 py-1">
              {[...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 shrink-0 px-2">
                  {item.isAnnouncement ? (
                    <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full text-amber-300 text-xs font-bold">
                      <Megaphone size={12} className="text-amber-400" />
                      <span>{item.text}</span>
                    </div>
                  ) : item.logo_url ? (
                    <div className="flex items-center gap-2">
                      <img src={resolveUrl(item.logo_url)} alt={item.title} className="h-6 max-w-[90px] object-contain" />
                      <span className="text-xs font-bold text-gray-200">{item.title}</span>
                      {item.tagline && <span className="text-[10px] text-purple-400 uppercase tracking-wider font-semibold">({item.tagline})</span>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-yellow-400 text-xs">★</span>
                      <span className="text-xs font-bold text-gray-200">{item.title}</span>
                      {item.tagline && <span className="text-[10px] text-gray-400">· {item.tagline}</span>}
                    </div>
                  )}
                  <span className="text-gray-700 text-xs select-none">✦</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
