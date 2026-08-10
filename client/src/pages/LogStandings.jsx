import { useState, useEffect } from 'react';
import { useLogStandings } from '../hooks/useStandings.js';
import TeamPill from '../components/TeamPill.jsx';
import { Maximize2, Play, Pause, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';

const slides = [
  { id: 'overall', title: 'Overall Championship Log', subtitle: 'All Sports Combined Points' },
  { id: 'BB', title: 'Basketball Standings', subtitle: 'Championship Log Points' },
  { id: 'VB', title: 'Volleyball Standings', subtitle: 'Championship Log Points' },
  { id: 'SC', title: 'Soccer Standings', subtitle: 'Championship Log Points' },
  { id: 'TW', title: 'Tug of War Standings', subtitle: 'Championship Log Points' },
  { id: 'AT', title: 'Athletics Standings', subtitle: 'Championship Log Points' },
  { id: 'NV', title: 'Novelty Standings', subtitle: 'Championship Log Points' },
  { id: 'medals', title: 'Medal Leaderboard', subtitle: 'Championship Medal Standings' }
];

export default function LogStandings() {
  const { data: log, isLoading } = useLogStandings();
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

  if (isLoading) return <div className="text-center py-12 text-gray-400">Loading log standings...</div>;

  const maxTotal = Math.max(...(log?.map(d => d.total) || [1]));

  const slide = slides[currentSlideIndex];

  // Dynamic sorting for active slide
  let displayTeams = [];
  if (slide.id === 'overall') {
    displayTeams = log || [];
  } else if (slide.id === 'medals') {
    displayTeams = [...(log || [])].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.name.localeCompare(b.name));
  } else {
    displayTeams = [...(log || [])].sort((a, b) => (b[slide.id] || 0) - (a[slide.id] || 0) || a.name.localeCompare(b.name));
  }

  const renderProjectorMode = () => {
    if (!isProjectorMode) return null;

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

        {/* Content Section (Large, clear tables) */}
        <div className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full">
          {slide.id === 'overall' && (
            <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm">
              <div className="grid grid-cols-10 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-slate-800 text-center mb-4">
                <span>Rank</span>
                <span className="text-left col-span-2">Team</span>
                <span>BB</span><span>VB</span><span>SC</span><span>TOW</span><span>ATH</span><span>NOV</span>
                <span>Total</span>
              </div>
              <div className="space-y-3.5">
                {displayTeams.map((d, idx) => (
                  <div key={d.code} className="grid grid-cols-10 gap-4 items-center text-center text-lg hover:bg-slate-800/20 py-2 rounded-xl transition-all duration-150">
                    <span className={`font-mono font-bold ${idx === 0 ? 'text-yellow-400 text-2xl' : idx === 1 ? 'text-slate-300 text-xl' : idx === 2 ? 'text-amber-600 text-xl' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-left col-span-2">
                      <TeamPill code={d.code} name={d.name} logoUrl={d.logo_url} size="lg" />
                    </span>
                    <span className="font-mono text-slate-300">{d.BB || '—'}</span>
                    <span className="font-mono text-slate-300">{d.VB || '—'}</span>
                    <span className="font-mono text-slate-300">{d.SC || '—'}</span>
                    <span className="font-mono text-slate-300">{d.TW || '—'}</span>
                    <span className="font-mono text-slate-300">{d.AT || '—'}</span>
                    <span className="font-mono text-slate-300">{d.NV || '—'}</span>
                    <span className="font-extrabold text-blue-400 font-mono text-xl">{d.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.id === 'medals' && (
            <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm max-w-3xl mx-auto">
              <div className="grid grid-cols-6 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-slate-800 text-center mb-4">
                <span>Rank</span>
                <span className="text-left col-span-2">Team</span>
                <span className="text-yellow-500">Gold</span>
                <span className="text-slate-300">Silver</span>
                <span className="text-amber-600">Bronze</span>
              </div>
              <div className="space-y-4">
                {displayTeams.map((d, idx) => (
                  <div key={d.code} className="grid grid-cols-6 gap-4 items-center text-center text-xl hover:bg-slate-800/20 py-2 rounded-xl transition-all duration-150">
                    <span className={`font-mono font-bold ${idx === 0 ? 'text-yellow-400 text-2xl' : idx === 1 ? 'text-slate-300 text-xl' : idx === 2 ? 'text-amber-600 text-xl' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-left col-span-2">
                      <TeamPill code={d.code} name={d.name} logoUrl={d.logo_url} size="lg" />
                    </span>
                    <span className="font-extrabold text-yellow-400 font-mono">{d.gold}</span>
                    <span className="font-extrabold text-slate-300 font-mono">{d.silver}</span>
                    <span className="font-extrabold text-amber-600 font-mono">{d.bronze}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.id !== 'overall' && slide.id !== 'medals' && (
            <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm max-w-2xl mx-auto">
              <div className="grid grid-cols-4 gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-slate-800 text-center mb-4">
                <span>Rank</span>
                <span className="text-left col-span-2">Team</span>
                <span>Points</span>
              </div>
              <div className="space-y-4">
                {displayTeams.map((d, idx) => (
                  <div key={d.code} className="grid grid-cols-4 gap-4 items-center text-center text-xl hover:bg-slate-800/20 py-2 rounded-xl transition-all duration-150">
                    <span className={`font-mono font-bold ${idx === 0 ? 'text-yellow-400 text-2xl' : idx === 1 ? 'text-slate-300 text-xl' : idx === 2 ? 'text-amber-600 text-xl' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-left col-span-2">
                      <TeamPill code={d.code} name={d.name} logoUrl={d.logo_url} size="lg" />
                    </span>
                    <span className="font-extrabold text-blue-400 font-mono text-2xl">{d[slide.id] || 0}</span>
                  </div>
                ))}
              </div>
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

      <div className="k-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-gray-150 dark:border-gray-800 pb-3">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Overall Championship Log — All Sports Combined
            </div>
            <div className="text-xs text-gray-400">
              Points per sport: Gold=10 · Silver=7 · Bronze=5 · 4th=3 · 5th=2 · 6th=1
            </div>
          </div>
          <button
            onClick={() => {
              setIsProjectorMode(true);
              setCurrentSlideIndex(0);
              setIsPlaying(true);
            }}
            className="k-btn bg-blue-600 hover:bg-blue-700 text-white border-transparent flex items-center gap-1.5 shadow-sm text-xs font-semibold py-2 px-3.5 cursor-pointer"
          >
            <Maximize2 size={14} />
            <span>Projector Mode</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-10 gap-2 text-xs text-gray-400 font-medium mb-2 text-center">
              <span>#</span>
              <span className="text-left col-span-2">Team</span>
              <span>BB</span><span>VB</span><span>SC</span><span>TOW</span><span>ATH</span><span>NOV</span>
              <span>Total</span>
            </div>
            {log?.map((d, i) => {
              const pct = Math.round((d.total / maxTotal) * 100);
              const barColor = i === 0 ? 'bg-green-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-emerald-500' : 'bg-gray-400';
              return (
                <div key={d.code}>
                  <div className="grid grid-cols-10 gap-2 items-center py-2 text-center text-sm hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded">
                    <span className="font-semibold text-gray-500">{i + 1}</span>
                    <span className="text-left col-span-2">
                      <TeamPill code={d.code} name={d.name} logoUrl={d.logo_url} />
                    </span>
                    <span>{d.BB || '—'}</span>
                    <span>{d.VB || '—'}</span>
                    <span>{d.SC || '—'}</span>
                    <span>{d.TW || '—'}</span>
                    <span>{d.AT || '—'}</span>
                    <span>{d.NV || '—'}</span>
                    <span className="font-semibold">{d.total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Points Distribution</div>
          <div className="space-y-3">
            {log?.map((d, i) => {
              const pct = Math.round((d.total / maxTotal) * 100);
              return (
                <div key={d.code}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-gray-400">{d.total} pts</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="h-full rounded-full bg-gray-900 dark:bg-white" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="k-card">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Medal Breakdown</div>
          <div className="space-y-2">
            {log?.map(d => (
              <div key={d.code} className="flex items-center gap-2 text-sm">
                <TeamPill code={d.code} name={d.name} logoUrl={d.logo_url} />
                <span className="ml-auto flex gap-3">
                  <span className="text-amber-600 font-semibold">{d.gold}G</span>
                  <span className="text-gray-500 font-semibold">{d.silver}S</span>
                  <span className="text-amber-800 font-semibold">{d.bronze}B</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
