import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useMobileTheme } from '../../contexts/MobileThemeContext.jsx';
import { useMobileAuth } from '../../contexts/MobileAuthContext.jsx';
import { useMobileOfflineSync } from '../../hooks/useMobileOfflineSync.js';
import {
  initMobileDb,
  cacheEventData,
  getOfflineFixtures,
  getOfflineSports,
  saveFixtureResultOffline,
  overwriteLocalFixtureScore,
} from '../../services/mobileOfflineDb.js';
import { Search, RefreshCw, Plus, Minus, AlertTriangle, CheckCircle2, WifiOff, Clock, ShieldAlert } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function MobileScorekeeperFixtures() {
  const { colors, isDark } = useMobileTheme();
  const { token, activeOrgSlug } = useMobileAuth();
  const { isOnline, syncPendingQueue, queueItems, loadQueueData } = useMobileOfflineSync();

  const [fixtures, setFixtures] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');

  // Scoring Modal
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);
  const [conflictData, setConflictData] = useState(null);

  const loadLocalData = useCallback(async () => {
    try {
      const offlineFixes = await getOfflineFixtures();
      setFixtures(offlineFixes);
      const offlineSports = await getOfflineSports();
      setSports(offlineSports);
    } catch (err) {
      console.error('[Fixtures] Error loading offline fixtures:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchOnlineData = useCallback(async () => {
    if (!navigator.onLine) {
      await loadLocalData();
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Organization-Slug': activeOrgSlug
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      console.log('[Fixtures] Fetching latest tournament data from server...');
      const [fixRes, teamsRes, sportsRes] = await Promise.all([
        axios.get(`${API_BASE}/fixtures`, { headers }),
        axios.get(`${API_BASE}/teams`, { headers }),
        axios.get(`${API_BASE}/sports`, { headers }),
      ]);

      await cacheEventData(fixRes.data, teamsRes.data, sportsRes.data);
      await loadLocalData();
    } catch (err) {
      console.warn('[Fixtures] Online fetch failed, falling back to offline cache:', err.message);
      await loadLocalData();
    }
  }, [activeOrgSlug, token, loadLocalData]);

  useEffect(() => {
    async function init() {
      await initMobileDb();
      await fetchOnlineData();
    }
    init();
  }, [fetchOnlineData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOnlineData();
  };

  // Open Score Entry Modal
  const openScoreModal = (fixture) => {
    // Check if there is an unresolved conflict in sync queue for this fixture
    const conflictItem = queueItems.find(
      (q) => q.fixture_id === fixture.id && q.status === 'conflict'
    );

    let parsedConflict = null;
    if (conflictItem?.conflict_reason) {
      try {
        parsedConflict = JSON.parse(conflictItem.conflict_reason);
      } catch {
        parsedConflict = { message: conflictItem.conflict_reason };
      }
    }

    setSelectedFixture(fixture);
    setConflictData(parsedConflict);
    setScoreA(fixture.score_a !== null ? Number(fixture.score_a) : 0);
    setScoreB(fixture.score_b !== null ? Number(fixture.score_b) : 0);
    setIsCorrectionMode(fixture.status === 'completed' && !conflictItem);
    setModalVisible(true);
  };

  // Submit Score Handler (Online-first with instant offline fallback & optimistic cache update)
  const handleSubmitScore = async () => {
    const sA = Number(scoreA);
    const sB = Number(scoreB);

    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0) {
      alert('Please enter valid positive scores.');
      return;
    }

    setSubmitting(true);
    const uuid = generateUUID();
    const fixtureId = selectedFixture.id;

    const headers = {
      'Content-Type': 'application/json',
      'X-Organization-Slug': activeOrgSlug
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (navigator.onLine) {
      try {
        const endpoint = isCorrectionMode
          ? `${API_BASE}/scores/${fixtureId}/correct`
          : `${API_BASE}/scores/${fixtureId}`;

        const method = isCorrectionMode ? 'post' : 'patch';

        await axios[method](
          endpoint,
          {
            score_a: sA,
            score_b: sB,
            requestId: uuid
          },
          { headers }
        );

        // Update local cache
        await overwriteLocalFixtureScore(fixtureId, sA, sB);
        await loadLocalData();
        setModalVisible(false);
      } catch (err) {
        if (err.response && err.response.status === 409) {
          const existing = err.response.data.existingResult || {};
          setConflictData(existing);
          alert('Conflict Detected: Another scorekeeper already recorded a result for this match. Review the conflict below.');
        } else {
          // Network error: Fallback to saving offline queue
          console.warn('[Fixtures] Network error during submission. Saving offline...');
          await saveFixtureResultOffline(uuid, fixtureId, sA, sB);
          await loadLocalData();
          await loadQueueData();
          setModalVisible(false);
          alert('Saved to Offline Sync Queue. Will sync automatically when connection restores.');
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      // Completely Offline
      await saveFixtureResultOffline(uuid, fixtureId, sA, sB);
      await loadLocalData();
      await loadQueueData();
      setSubmitting(false);
      setModalVisible(false);
      alert('Saved Offline: Stored in Sync Queue for automatic upload.');
    }
  };

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    return fixtures.filter((f) => {
      const matchesSport = selectedSport === 'All' || f.sport_name === selectedSport;
      const matchesSearch =
        !searchQuery.trim() ||
        f.team_a_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.team_b_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.team_a_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.team_b_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.round?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.venue_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSport && matchesSearch;
    });
  }, [fixtures, selectedSport, searchQuery]);

  return (
    <div className="p-4 space-y-4">
      {/* Top Search & Refresh Bar */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: colors.border
          }}
        >
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search fixtures, teams, venues..."
            className="w-full text-xs font-medium bg-transparent focus:outline-none"
            style={{ color: colors.text }}
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: colors.border,
            color: colors.primary
          }}
          title="Refresh Fixtures"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sport Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedSport('All')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
            selectedSport === 'All'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          All Sports ({fixtures.length})
        </button>
        {sports.map((sp) => {
          const count = fixtures.filter(f => f.sport_name === sp.name).length;
          return (
            <button
              key={sp.id}
              onClick={() => setSelectedSport(sp.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedSport === sp.name
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {sp.name} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Fixtures List */}
      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span>Loading tournament fixtures...</span>
        </div>
      ) : filteredFixtures.length === 0 ? (
        <div
          className="p-8 rounded-2xl border text-center my-6"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: colors.border
          }}
        >
          <p className="text-sm font-bold" style={{ color: colors.text }}>No matches found</p>
          <p className="text-xs text-slate-400 mt-1">Try another sport category or search filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFixtures.map((fix) => {
            const isCompleted = fix.status === 'completed' || fix.status === 'draw';
            const isLive = fix.status === 'live';
            const hasConflict = queueItems.some(q => q.fixture_id === fix.id && q.status === 'conflict');

            return (
              <div
                key={fix.id}
                className="p-4 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: hasConflict ? '#ef4444' : colors.border
                }}
              >
                {/* Conflict Flag */}
                {hasConflict && (
                  <div className="mb-2 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] font-black uppercase flex items-center gap-1">
                    <ShieldAlert size={12} />
                    <span>Sync Conflict Pending Review</span>
                  </div>
                )}

                {/* Card Header: Round & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-blue-500 dark:text-sky-400">
                      {fix.sport_name}
                    </span>
                    <span className="text-slate-400 text-xs">·</span>
                    <span className="text-xs font-semibold text-slate-400">
                      {fix.round}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isLive
                        ? 'bg-rose-500 text-white animate-pulse'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {fix.status}
                  </span>
                </div>

                {/* Matchup Teams & Scores */}
                <div className="grid grid-cols-5 items-center gap-2 py-2">
                  {/* Team A */}
                  <div className="col-span-2 flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: fix.team_a_color || '#2563eb' }}
                    />
                    <div className="truncate">
                      <p className="text-sm font-black truncate" style={{ color: colors.text }}>
                        {fix.team_a_name}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {fix.team_a_code}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-1 text-center font-mono font-black text-base">
                    {fix.score_a !== null && fix.score_b !== null ? (
                      <span style={{ color: colors.text }}>
                        {fix.score_a} - {fix.score_b}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">vs</span>
                    )}
                  </div>

                  {/* Team B */}
                  <div className="col-span-2 flex items-center justify-end gap-2 text-right">
                    <div className="truncate">
                      <p className="text-sm font-black truncate" style={{ color: colors.text }}>
                        {fix.team_b_name}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {fix.team_b_code}
                      </span>
                    </div>
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: fix.team_b_color || '#dc2626' }}
                    />
                  </div>
                </div>

                {/* Venue & Action Button */}
                <div className="flex items-center justify-between border-t pt-3 mt-2" style={{ borderColor: isDark ? '#334155' : '#f1f5f9' }}>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={12} />
                    <span>{fix.venue_name}</span>
                  </div>

                  <button
                    onClick={() => openScoreModal(fix)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      hasConflict
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow'
                        : isCompleted
                        ? 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    }`}
                  >
                    {hasConflict ? 'Resolve Conflict' : isCompleted ? 'Edit Score' : 'Record Score'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Score Entry / Counter Modal */}
      {modalVisible && selectedFixture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border flex flex-col space-y-5 animate-scaleUp"
            style={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              color: colors.text
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: isDark ? '#334155' : '#f1f5f9' }}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                  {selectedFixture.sport_name} · {selectedFixture.round}
                </span>
                <h3 className="text-base font-black mt-0.5">
                  {isCorrectionMode ? 'Correct Official Score' : 'Submit Match Result'}
                </h3>
              </div>
              <button
                onClick={() => setModalVisible(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Conflict Warning if present */}
            {conflictData && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-black">
                  <AlertTriangle size={14} />
                  <span>Conflict with Server Record:</span>
                </div>
                <p className="text-[11px] opacity-90">
                  Server has recorded: <strong>{conflictData.score_a} - {conflictData.score_b}</strong> submitted by {conflictData.submittedBy || 'Official'}.
                </p>
                <p className="text-[10px] opacity-75">
                  Submitting will overwrite and resolve this conflict.
                </p>
              </div>
            )}

            {/* Team A Stepper & Counter */}
            <div
              className="p-3 rounded-2xl border"
              style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#e2e8f0'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedFixture.team_a_color || '#2563eb' }}
                  />
                  <span className="text-sm font-black">{selectedFixture.team_a_name}</span>
                </div>
                <span className="text-xs font-bold text-slate-400">Team A</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setScoreA(Math.max(0, scoreA - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => setScoreA(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 h-9 text-center text-lg font-mono font-black rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: colors.border, color: colors.text }}
                  />
                  <button
                    type="button"
                    onClick={() => setScoreA(scoreA + 1)}
                    className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Quick Points Increments */}
                <div className="flex items-center gap-1">
                  {[2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setScoreA(scoreA + num)}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-blue-500/20 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Team B Stepper & Counter */}
            <div
              className="p-3 rounded-2xl border"
              style={{
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderColor: isDark ? '#334155' : '#e2e8f0'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedFixture.team_b_color || '#dc2626' }}
                  />
                  <span className="text-sm font-black">{selectedFixture.team_b_name}</span>
                </div>
                <span className="text-xs font-bold text-slate-400">Team B</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setScoreB(Math.max(0, scoreB - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold transition-all cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => setScoreB(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 h-9 text-center text-lg font-mono font-black rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ borderColor: colors.border, color: colors.text }}
                  />
                  <button
                    type="button"
                    onClick={() => setScoreB(scoreB + 1)}
                    className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-bold transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                {/* Quick Points Increments */}
                <div className="flex items-center gap-1">
                  {[2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setScoreB(scoreB + num)}
                      className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-blue-500/20 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                className="flex-1 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                style={{ borderColor: colors.border }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitScore}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submitting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>{isCorrectionMode ? 'Confirm Correction' : 'Submit Result'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
