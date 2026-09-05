import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaApi, uploadApi } from '../api.js';
import { useSettings, useFixtures } from '../hooks/useFixtures.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { 
  Megaphone, 
  Tv, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Radio, 
  Sliders, 
  ExternalLink, 
  Clock, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export default function MediaManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isMediaManager, isAdmin } = useAuth();
  const { data: settings } = useSettings();
  const { data: liveFixtures, isLoading: loadingLive } = useFixtures({ status: 'live' });

  const [activeTab, setActiveTab] = useState('adverts'); // 'adverts' | 'announcements'

  // Adverts query
  const { data: adverts, isLoading: loadingAdverts } = useQuery({
    queryKey: ['tv-adverts'],
    queryFn: async () => {
      const res = await mediaApi.getAdverts(false);
      return res.data;
    }
  });

  // Announcements query
  const { data: announcements, isLoading: loadingAnnouncements } = useQuery({
    queryKey: ['tv-announcements'],
    queryFn: async () => {
      const res = await mediaApi.getAnnouncements(false);
      return res.data;
    }
  });

  // Layout Override State
  const currentLayoutMode = settings?.tv_layout_mode || 'auto';
  const [layoutModeLoading, setLayoutModeLoading] = useState(false);

  // New Advert Form State
  const [newAd, setNewAd] = useState({
    title: '',
    tagline: '',
    website_url: '',
    banner_url: '',
    logo_url: '',
    display_duration_seconds: 10,
    display_type: 'both',
    is_active: true
  });
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // New Announcement Form State
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    display_duration_seconds: 15
  });

  // Handle Layout Override Toggle
  const handleSetLayoutMode = async (mode) => {
    try {
      setLayoutModeLoading(true);
      await mediaApi.setLayoutOverride(mode);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      showToast(
        mode === 'force_showcase' 
          ? 'TV displays forced to Full-Screen Showcase mode' 
          : mode === 'force_live'
          ? 'TV displays forced to Live Matches view'
          : 'TV displays returned to Auto (match-driven)',
        'success'
      );
    } catch (err) {
      alert('Failed to update TV display mode: ' + (err.response?.data?.error || err.message));
    } finally {
      setLayoutModeLoading(false);
    }
  };

  // Handle Force Complete Fixture
  const handleForceCompleteFixture = async (fixtureId, matchDesc) => {
    if (!window.confirm(`Force-complete match "${matchDesc}" and clear it from the live TV screen?`)) {
      return;
    }
    try {
      await mediaApi.forceCompleteFixture(fixtureId);
      queryClient.invalidateQueries({ queryKey: ['fixtures'] });
      showToast('Match marked completed and cleared from TV display', 'success');
    } catch (err) {
      alert('Failed to force complete match: ' + (err.response?.data?.error || err.message));
    }
  };

  // Advert Mutations
  const createAdvertMutation = useMutation({
    mutationFn: (data) => mediaApi.createAdvert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-adverts'] });
      setNewAd({
        title: '',
        tagline: '',
        website_url: '',
        banner_url: '',
        logo_url: '',
        display_duration_seconds: 10,
        display_type: 'both',
        is_active: true
      });
      showToast('Advert created and ready for TV Mode!', 'success');
    },
    onError: (err) => alert('Failed to create advert: ' + (err.response?.data?.error || err.message))
  });

  const toggleAdActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => mediaApi.updateAdvert(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-adverts'] });
      showToast('Advert status updated', 'success');
    }
  });

  const deleteAdMutation = useMutation({
    mutationFn: (id) => mediaApi.deleteAdvert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-adverts'] });
      showToast('Advert removed successfully', 'success');
    }
  });

  // Announcement Mutations
  const createAnnouncementMutation = useMutation({
    mutationFn: (data) => mediaApi.createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-announcements'] });
      setAnnouncementForm({
        title: '',
        message: '',
        priority: 'normal',
        display_duration_seconds: 15
      });
      showToast('Live announcement pushed to TV Mode screens!', 'success');
    },
    onError: (err) => alert('Failed to push announcement: ' + (err.response?.data?.error || err.message))
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => mediaApi.deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tv-announcements'] });
      showToast('Announcement dismissed from TV Mode', 'success');
    }
  });

  // Banner Upload
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingBanner(true);
      const res = await uploadApi.uploadAdvertBanner(file);
      setNewAd(prev => ({ ...prev, banner_url: res.data.bannerUrl }));
      showToast('Ad poster image uploaded', 'success');
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingBanner(false);
    }
  };

  // Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingLogo(true);
      const res = await uploadApi.uploadSponsorLogo(file);
      setNewAd(prev => ({ ...prev, logo_url: res.data.logoUrl }));
      showToast('Sponsor logo uploaded', 'success');
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingLogo(false);
    }
  };

  const resolveUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:3010/api').replace(/\/api\/?$/, '');
    return `${base}${url}`;
  };

  if (!isMediaManager && !isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} />
        </div>
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-gray-500 text-sm mt-2">
          You need Media Manager or Administrator permissions to access the Media &amp; Adverts console.
        </p>
      </div>
    );
  }

  const isFeatureEnabled = settings?.enable_tv_adverts !== false;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-500/20">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Media &amp; TV Adverts Hub</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Manage sponsor advertisements, TV carousel slides, and broadcast live alerts
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/tv"
            target="_blank"
            rel="noreferrer"
            className="k-btn bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs flex items-center gap-1.5 py-2 px-3 rounded-xl shadow-sm"
          >
            <Tv size={14} className="text-blue-500" />
            <span>Open TV Screen</span>
            <ExternalLink size={12} className="text-gray-400 ml-1" />
          </a>
        </div>
      </div>

      {/* Feature Inactive Warning Banner */}
      {!isFeatureEnabled && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <h4 className="text-sm font-bold">TV Mode Adverts &amp; Announcements are currently Disabled</h4>
            <p className="text-xs mt-0.5 opacity-90">
              Advert slides and announcements will not appear on the TV display. An Administrator can re-enable this in the 
              <strong> Settings ➔ General Settings</strong> tab.
            </p>
          </div>
        </div>
      )}

      {/* Section: TV Layout Override & Active Matches Safety Net */}
      <div className="k-card p-6 rounded-3xl bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-950 border border-gray-200/80 dark:border-gray-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-purple-500" />
              <h2 className="text-base font-bold text-gray-900 dark:text-white">TV Display Layout Controller</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                Live Override
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
              Controls whether TV displays show the split-screen match scoreboard or the full-screen showcase (standings &amp; sponsor posters). Useful if a scorekeeper forgot to click "End Game".
            </p>
          </div>

          {/* Segmented Controller */}
          <div className="flex items-center p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700/60 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => handleSetLayoutMode('auto')}
              disabled={layoutModeLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentLayoutMode === 'auto'
                  ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/50 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Auto (Match-Driven)
            </button>
            <button
              onClick={() => handleSetLayoutMode('force_showcase')}
              disabled={layoutModeLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentLayoutMode === 'force_showcase'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Force Full Showcase
            </button>
            <button
              onClick={() => handleSetLayoutMode('force_live')}
              disabled={layoutModeLoading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentLayoutMode === 'force_live'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              Force Live Matches
            </button>
          </div>
        </div>

        {/* Lingering Matches Detection */}
        {liveFixtures && liveFixtures.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800/80">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Active Matches Currently Locking TV Split-Screen ({liveFixtures.length}):
              </span>
              <span className="text-[11px] text-gray-400 italic">
                If match is finished, click "Force Complete" below to clear it from TV
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveFixtures.map(f => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-gray-800 dark:text-gray-200 truncate">
                      {f.sport_name}: {f.team_a_code} ({f.score_a || 0}) vs {f.team_b_code} ({f.score_b || 0})
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Venue: {f.venue_name} · Started: {f.time || 'In Progress'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleForceCompleteFixture(f.id, `${f.team_a_code} vs ${f.team_b_code}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[11px] shrink-0 transition-colors"
                  >
                    Force Complete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('adverts')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'adverts'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Layers size={16} />
          <span>Sponsor Adverts &amp; Posters</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-mono">
            {adverts?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 px-2 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'announcements'
              ? 'border-pink-600 text-pink-600 dark:text-pink-400'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Radio size={16} />
          <span>Live TV Push Announcements</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-mono">
            {announcements?.length || 0}
          </span>
        </button>
      </div>

      {/* TAB 1: ADVERTS */}
      {activeTab === 'adverts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Adverts List (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Configured Adverts ({adverts?.length || 0})
              </h3>
            </div>

            {loadingAdverts ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading adverts...</div>
            ) : adverts?.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-8 bg-gray-50/50 dark:bg-gray-900/30">
                <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <h4 className="text-base font-bold text-gray-700 dark:text-gray-300">No Advertisements Configured</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Upload a 16:9 poster banner or sponsor logo using the form to have it automatically cycle on TV Mode.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {adverts.map((ad) => (
                  <div
                    key={ad.id}
                    className={`k-card p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      ad.is_active
                        ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm'
                        : 'border-dashed border-gray-300 dark:border-gray-850 opacity-60 bg-gray-50/50 dark:bg-gray-950/40'
                    }`}
                  >
                    <div>
                      {/* Image Preview Banner */}
                      <div className="h-36 rounded-xl bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 overflow-hidden relative mb-3 flex items-center justify-center">
                        {ad.banner_url ? (
                          <img
                            src={resolveUrl(ad.banner_url)}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                          />
                        ) : ad.logo_url ? (
                          <img
                            src={resolveUrl(ad.logo_url)}
                            alt={ad.title}
                            className="h-16 max-w-[80%] object-contain"
                          />
                        ) : (
                          <div className="text-center p-4 text-gray-400 text-xs">
                            <Sparkles className="w-6 h-6 mx-auto mb-1 text-gray-300 dark:text-gray-700" />
                            <span>Text Only Advert</span>
                          </div>
                        )}

                        <div className="absolute top-2 right-2 flex gap-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white backdrop-blur-md">
                            {ad.display_duration_seconds}s
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{ad.title}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                            {ad.display_type}
                          </span>
                        </div>
                        {ad.tagline && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ad.tagline}</p>
                        )}
                        {ad.website_url && (
                          <p className="text-[11px] text-blue-500 dark:text-blue-400 truncate flex items-center gap-1">
                            <ExternalLink size={10} />
                            <span>{ad.website_url}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100 dark:border-gray-800/80">
                      <button
                        onClick={() => toggleAdActiveMutation.mutate({ id: ad.id, is_active: !ad.is_active })}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                          ad.is_active
                            ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700'
                        }`}
                      >
                        {ad.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{ad.is_active ? 'Active' : 'Disabled'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete advert "${ad.title}"?`)) {
                            deleteAdMutation.mutate(ad.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        title="Delete Advert"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Advert Form (1 Col) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Register New Advert</h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAdvertMutation.mutate(newAd);
              }}
              className="k-card p-5 rounded-3xl space-y-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Advert Title / Sponsor Name *
                </label>
                <input
                  type="text"
                  required
                  value={newAd.title}
                  onChange={(e) => setNewAd(s => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Acme Hydration, Nike Sports"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Tagline / Partnership Title
                </label>
                <input
                  type="text"
                  value={newAd.tagline}
                  onChange={(e) => setNewAd(s => ({ ...s, tagline: e.target.value }))}
                  placeholder="e.g. Official Nutrition Partner"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Website URL (Generates QR Code on TV)
                </label>
                <input
                  type="url"
                  value={newAd.website_url}
                  onChange={(e) => setNewAd(s => ({ ...s, website_url: e.target.value }))}
                  placeholder="https://sponsor.com/promo"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Uploads Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* 16:9 Banner Poster */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                    TV Banner Poster (16:9)
                  </label>
                  {newAd.banner_url ? (
                    <div className="relative h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
                      <img src={resolveUrl(newAd.banner_url)} alt="Banner preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewAd(s => ({ ...s, banner_url: '' }))}
                        className="absolute top-1 right-1 bg-black/80 text-white rounded p-0.5 text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-16 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 rounded-xl cursor-pointer bg-gray-50/50 dark:bg-gray-950/40 text-center p-1">
                      <Upload size={14} className={`text-purple-500 ${uploadingBanner ? 'animate-bounce' : ''}`} />
                      <span className="text-[10px] text-gray-500 mt-1 font-semibold">
                        {uploadingBanner ? 'Uploading...' : 'Upload Poster'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner} />
                    </label>
                  )}
                </div>

                {/* Logo for Ticker */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Sponsor Logo (Ticker)
                  </label>
                  {newAd.logo_url ? (
                    <div className="relative h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 flex items-center justify-center p-1">
                      <img src={resolveUrl(newAd.logo_url)} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setNewAd(s => ({ ...s, logo_url: '' }))}
                        className="absolute top-1 right-1 bg-black/80 text-white rounded p-0.5 text-[10px]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-16 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 rounded-xl cursor-pointer bg-gray-50/50 dark:bg-gray-950/40 text-center p-1">
                      <Upload size={14} className={`text-purple-500 ${uploadingLogo ? 'animate-bounce' : ''}`} />
                      <span className="text-[10px] text-gray-500 mt-1 font-semibold">
                        {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                  )}
                </div>
              </div>

              {/* Timing & Placement */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Display Dwell Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={newAd.display_duration_seconds}
                      onChange={(e) => setNewAd(s => ({ ...s, display_duration_seconds: parseInt(e.target.value) || 10 }))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 font-mono"
                    />
                    <span className="text-xs text-gray-400 font-bold">sec</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                    TV Placement
                  </label>
                  <select
                    value={newAd.display_type}
                    onChange={(e) => setNewAd(s => ({ ...s, display_type: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950"
                  >
                    <option value="both">Both (Slide &amp; Ticker)</option>
                    <option value="slide">Slide Only</option>
                    <option value="ticker">Bottom Ticker Only</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={createAdvertMutation.isLoading || !newAd.title.trim()}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all mt-2"
              >
                <Plus size={14} />
                <span>{createAdvertMutation.isLoading ? 'Adding Advert...' : 'Save & Add to TV'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Active Announcements List (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
              Broadcasted Announcements ({announcements?.length || 0})
            </h3>

            {loadingAnnouncements ? (
              <div className="text-center py-12 text-gray-400 text-sm">Loading announcements...</div>
            ) : announcements?.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-8 bg-gray-50/50 dark:bg-gray-900/30">
                <Radio className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                <h4 className="text-base font-bold text-gray-700 dark:text-gray-300">No Active Announcements</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Use the announcement form to broadcast immediate messages, schedule changes, or presentation alerts to all TV screens.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className={`k-card p-4 rounded-2xl border flex items-start justify-between gap-4 ${
                      item.priority === 'urgent'
                        ? 'border-red-500/30 bg-red-500/5 dark:bg-red-950/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        item.priority === 'urgent'
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        <Megaphone size={16} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                            {item.title || 'Live Broadcast'}
                          </h4>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            item.priority === 'urgent'
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                          }`}>
                            {item.priority === 'urgent' ? '🚨 Urgent Pop-up' : 'Ticker News'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteAnnouncementMutation.mutate(item.id)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                      title="Dismiss from TV"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Push Announcement Form (1 Col) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Broadcast Live Announcement</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createAnnouncementMutation.mutate(announcementForm);
              }}
              className="k-card p-5 rounded-3xl space-y-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Announcement Headline (optional)
                </label>
                <input
                  type="text"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(s => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Schedule Change, Presentation Alert"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Broadcast Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm(s => ({ ...s, message: e.target.value }))}
                  placeholder="e.g. Boys Basketball Semifinal has been relocated to Court 2. All teams report to the scorer's table."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-2 focus:ring-pink-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={announcementForm.priority}
                    onChange={(e) => setAnnouncementForm(s => ({ ...s, priority: e.target.value }))}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950"
                  >
                    <option value="normal">Normal (Scrolling Ticker)</option>
                    <option value="urgent">🚨 Urgent (Screen Pop-up)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                    Pop-up Duration
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={announcementForm.display_duration_seconds}
                      onChange={(e) => setAnnouncementForm(s => ({ ...s, display_duration_seconds: parseInt(e.target.value) || 15 }))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 font-mono"
                    />
                    <span className="text-xs text-gray-400 font-bold">sec</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={createAnnouncementMutation.isLoading || !announcementForm.message.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-600/20 disabled:opacity-50 transition-all mt-2"
              >
                <Radio size={14} className="animate-pulse" />
                <span>{createAnnouncementMutation.isLoading ? 'Pushing...' : 'Broadcast to TV Screens'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
