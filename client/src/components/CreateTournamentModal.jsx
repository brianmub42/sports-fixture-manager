import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext.jsx';
import { Trophy, Plus, Layers, Copy, Check, ChevronDown, Loader2, Sparkles, X, AlertCircle } from 'lucide-react';

export default function CreateTournamentModal({ isOpen, onClose }) {
  const { activeOrg, createNextTournament } = useOrganization();

  const [eventTitle, setEventTitle] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [copyTeams, setCopyTeams] = useState(true);
  const [copySports, setCopySports] = useState(true);
  const [copyVenues, setCopyVenues] = useState(true);
  const [copySponsors, setCopySponsors] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate clean slug suggestion based on active school name & new tournament title
  useEffect(() => {
    if (!isSlugManual && eventTitle) {
      const orgPrefix = activeOrg?.name ? activeOrg.name.toLowerCase() : 'school';
      const titlePart = eventTitle.toLowerCase();
      const combined = `${orgPrefix}-${titlePart}`
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setCustomSlug(combined);
    }
  }, [eventTitle, activeOrg?.name, isSlugManual]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      setError('Please enter a tournament or event title');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createNextTournament({
        name: activeOrg?.name || 'Tournament Organization',
        event_title: eventTitle.trim(),
        slug: customSlug.trim() || undefined,
        copyTeams,
        copySports,
        copyVenues,
        copySponsors,
      });
      // createNextTournament reloads window on success into the new workspace
    } catch (err) {
      console.error('Failed to create next tournament:', err);
      setError(err.response?.data?.error || 'Failed to create tournament. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-md">
              <Trophy className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Create Next Tournament</h2>
              <p className="text-xs text-blue-100">
                Workspace for <strong className="text-white underline underline-offset-2">{activeOrg?.name || 'Your School'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Tournament Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Tournament / Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Spring Athletics Championship 2026 or Rugby 7s Derby"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* URL Slug Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Public Spectator URL Slug
              </label>
              {!isSlugManual ? (
                <button
                  type="button"
                  onClick={() => setIsSlugManual(true)}
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Customize Slug
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSlugManual(false)}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  Auto-generate
                </button>
              )}
            </div>
            <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-hidden text-xs text-slate-500 dark:text-slate-400">
              <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 select-none">
                /watch/
              </span>
              <input
                type="text"
                value={customSlug}
                onChange={(e) => {
                  setIsSlugManual(true);
                  setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                }}
                placeholder="st-andrews-athletics-2026"
                className="w-full px-3 py-2 text-xs font-mono bg-transparent text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Rapid Setup / Cloning Options */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Instant Setup (Clone from Current Tournament)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Save time by copying existing school structures into your new tournament workspace:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={copyTeams}
                  onChange={(e) => setCopyTeams(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Participating Teams
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    House codes, colors & logos
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={copySports}
                  onChange={(e) => setCopySports(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Sports & Scoring
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Disciplines & point rules
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={copyVenues}
                  onChange={(e) => setCopyVenues(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Venues & Fields
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Courts, pitches & pools
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={copySponsors}
                  onChange={(e) => setCopySponsors(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Sponsors & TV Branding
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Logos, adverts & points
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !eventTitle.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Tournament...</span>
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  <span>Launch Next Tournament</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
