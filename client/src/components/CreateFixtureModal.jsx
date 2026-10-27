import React, { useState } from 'react';
import { X, Calendar, Plus, Clock, MapPin, AlertCircle, ShieldAlert } from 'lucide-react';
import { useCreateFixture, useSports, useTeams, useVenues } from '../hooks/useFixtures.js';
import { useToast } from '../contexts/ToastContext.jsx';

export default function CreateFixtureModal({ isOpen, onClose }) {
  const { data: sportsData } = useSports();
  const { data: teamsData } = useTeams();
  const { data: venuesData } = useVenues();
  const createFixture = useCreateFixture();
  const { showToast } = useToast();

  const [sportId, setSportId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [round, setRound] = useState('Round 1');
  const [notes, setNotes] = useState('');
  const [conflictWarning, setConflictWarning] = useState(null);

  if (!isOpen) return null;

  const validSports = (sportsData || []).filter(s => s.scoring_type !== 'placement');
  const validTeams = teamsData || [];
  const validVenues = venuesData || [];

  const handleSubmit = async (force = false) => {
    if (!sportId || !venueId || !teamAId || !teamBId || !scheduledAt) {
      alert('Please fill in all required fields: Sport, Venue, Team A, Team B, and Scheduled Time.');
      return;
    }

    if (String(teamAId) === String(teamBId)) {
      alert('Team A and Team B must be different teams.');
      return;
    }

    setConflictWarning(null);

    try {
      await createFixture.mutateAsync({
        sport_id: Number(sportId),
        venue_id: Number(venueId),
        team_a_id: Number(teamAId),
        team_b_id: Number(teamBId),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: Number(durationMinutes),
        round,
        notes,
        force
      });

      showToast('Fixture created and published successfully!', 'success');
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === 'SCHEDULE_CONFLICT') {
        setConflictWarning(resp.error);
      } else {
        alert(err.response?.data?.error || err.message || 'Failed to create fixture');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Schedule New Match</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Add an exhibition, playoff, or custom fixture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {conflictWarning && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 font-medium leading-relaxed">{conflictWarning}</div>
              </div>
              <div className="flex justify-end gap-2 pt-1 border-t border-amber-200/50 dark:border-amber-900/40">
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={createFixture.isLoading}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] cursor-pointer shadow-xs"
                >
                  Schedule Anyway (Force Override)
                </button>
              </div>
            </div>
          )}

          {/* Sport & Venue Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Discipline / Sport *
              </label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Sport...</option>
                {validSports.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Court / Pitch / Venue *
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Venue...</option>
                {validVenues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Team A vs Team B */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-850/40 p-3.5 rounded-xl border border-gray-150 dark:border-gray-800">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Team A (Home) *
              </label>
              <select
                value={teamAId}
                onChange={(e) => setTeamAId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Team A...</option>
                {validTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Team B (Away) *
              </label>
              <select
                value={teamBId}
                onChange={(e) => setTeamBId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Team B...</option>
                {validTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Date & Scheduled Time *
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Match Duration (minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>
          </div>

          {/* Round & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Round / Stage
              </label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="e.g. Round 1, Semi-Final, Final"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Broadcast table 1, Trophy presentation"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-850/30 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={createFixture.isLoading}
            className="k-btn k-btn-primary text-xs flex items-center gap-1.5 font-bold"
          >
            {createFixture.isLoading ? (
              <span>Scheduling...</span>
            ) : (
              <>
                <Plus size={14} />
                <span>Save Match Fixture</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
