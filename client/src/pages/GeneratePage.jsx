import { useState, useEffect } from 'react';
import { generateApi } from '../api.js';
import { Wand2, Save, Clock, Users, MapPin, Calendar, RotateCcw, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useVenues, useSports } from '../hooks/useFixtures.js';
const FORMATS = [
  { value: 'single', label: 'Single Round-Robin', desc: 'Each pair plays once' },
  { value: 'double', label: 'Double Round-Robin', desc: 'Each pair plays twice (home + away)' },
  { value: 'group', label: 'Group Stage', desc: 'Teams split into groups, round-robin within each' },
  { value: 'playoff', label: 'Single Elimination Playoff', desc: 'Knockout tournament (requires 4 or 8 teams)' }
];

export default function GeneratePage() {
  const { isAuthenticated } = useAuth();
  const { data: registeredVenues } = useVenues();
  const { data: sports, isLoading: loadingSports } = useSports();
  const [form, setForm] = useState({
    teams: 'ZAM, BAR, HAL, SHA, TEH, TOW',
    sport: '',
    startDate: '2026-08-01T09:00',
    duration: 10,
    breakTime: 0,
    format: 'single',
    venues: 'BB Court',
    concurrent: 1,
    groupCount: 2,
  });

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (registeredVenues && registeredVenues.length > 0 && form.venues === 'BB Court') {
      setForm(prev => ({ ...prev, venues: registeredVenues.map(v => v.name).join(', ') }));
    }
  }, [registeredVenues]);

  useEffect(() => {
    if (sports && sports.length > 0 && !form.sport) {
      setForm(prev => ({ ...prev, sport: sports[0].name }));
    }
  }, [sports, form.sport]);

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl max-w-lg mx-auto mt-12 shadow-lg">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-red-500 animate-bounce" />
        <h2 className="text-xl font-bold mb-1">Access Denied</h2>
        <p className="text-sm">You must be logged in as an official to access the fixture generation page.</p>
      </div>
    );
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setPreview(null);
    setSaved(false);
    setError(null);
  };

  const parseTeams = () => form.teams.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  const parseVenues = () => form.venues.split(',').map(v => v.trim()).filter(Boolean);

  const validateParams = (teams, venues, concurrent) => {
    if (concurrent > venues.length) {
      throw new Error(`Matches Per Round (${concurrent}) cannot exceed the number of venues (${venues.length}). Please add more venues or reduce Matches Per Round.`);
    }
    if (concurrent * 2 > teams.length) {
      throw new Error(`Matches Per Round (${concurrent}) requires at least ${concurrent * 2} teams playing concurrently, but only ${teams.length} team(s) were provided. Please reduce Matches Per Round or add more teams.`);
    }
  };

  const buildPayload = () => {
    const teams = parseTeams();
    const venues = parseVenues();
    const concurrent = parseInt(form.concurrent);

    if (form.format === 'playoff' && teams.length !== 4 && teams.length !== 8) {
      throw new Error('Playoff format currently requires exactly 4 or 8 teams.');
    }

    validateParams(teams, venues, concurrent);

    const payload = {
      teams,
      sport: form.sport,
      startDate: new Date(form.startDate).toISOString(),
      durationMinutes: parseInt(form.duration),
      breakMinutes: parseInt(form.breakTime),
      format: form.format,
      venues,
      concurrent,
    };

    if (form.format === 'group') {
      // Split teams into groups
      const groupSize = Math.ceil(teams.length / parseInt(form.groupCount));
      payload.groups = [];
      for (let i = 0; i < teams.length; i += groupSize) {
        payload.groups.push(teams.slice(i, i + groupSize));
      }
    }

    return payload;
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateApi.preview(buildPayload());
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateApi.generateAndSave(buildPayload());
      setPreview(res.data);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="k-card">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 size={18} className="text-purple-500" />
          <h2 className="text-lg font-semibold">Fixture Generator</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter your parameters and the algorithm will auto-generate the full schedule using round-robin pairing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Teams */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Teams (comma-separated)</label>
            <div className="relative">
              <Users size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={form.teams}
                onChange={(e) => handleChange('teams', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                placeholder="ZAM, BAR, HAL, SHA, TEH, TOW"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{parseTeams().length} teams detected</p>
          </div>

          {/* Sport */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Sport</label>
            {loadingSports ? (
              <div className="text-xs text-gray-400 py-2.5">Loading sports...</div>
            ) : sports && sports.length === 0 ? (
              <div className="text-xs text-red-500 font-semibold py-2">
                No sports registered. Please add a sport in Settings first.
              </div>
            ) : (
              <select
                value={form.sport}
                onChange={(e) => handleChange('sport', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                {sports?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            )}
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Start Date & Time</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Match Duration (minutes)</label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="number"
                min={1}
                max={120}
                value={form.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          </div>

          {/* Break */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Break Between Rounds (min)</label>
            <input
              type="number"
              min={0}
              max={60}
              value={form.breakTime}
              onChange={(e) => handleChange('breakTime', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Format</label>
            <select
              value={form.format}
              onChange={(e) => handleChange('format', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              {FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>
              ))}
            </select>
          </div>

          {/* Venues */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Venues (comma-separated)</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={form.venues}
                onChange={(e) => handleChange('venues', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                placeholder="BB Court, VB Court 1, VB Court 2"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{parseVenues().length} venues detected</p>

            {registeredVenues && registeredVenues.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <span className="text-xs text-gray-400 block font-medium">Or select from registered venues:</span>
                <div className="flex flex-wrap gap-1.5">
                  {registeredVenues.map(v => {
                    const currentList = parseVenues().map(n => n.toUpperCase());
                    const isSelected = currentList.includes(v.name.toUpperCase());
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          const normalList = parseVenues();
                          let newList;
                          if (isSelected) {
                            newList = normalList.filter(name => name.toUpperCase() !== v.name.toUpperCase());
                          } else {
                            newList = [...normalList, v.name];
                          }
                          handleChange('venues', newList.join(', '));
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {v.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('venues', registeredVenues.map(v => v.name).join(', '));
                    }}
                    className="px-2 py-1 rounded text-xs font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Concurrent */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Matches Per Round</label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.concurrent}
              onChange={(e) => handleChange('concurrent', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">How many matches run simultaneously</p>
          </div>

          {/* Group count (only for group stage) */}
          {form.format === 'group' && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Number of Groups</label>
              <input
                type="number"
                min={2}
                max={4}
                value={form.groupCount}
                onChange={(e) => handleChange('groupCount', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handlePreview}
            disabled={loading}
            className="k-btn flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            {loading ? 'Generating...' : 'Preview Schedule'}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !preview}
            className="k-btn k-btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={14} />
            {saved ? 'Saved!' : 'Save to Database'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-600 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
          </div>
        )}
      </div>

      {/* Preview Results */}
      {preview && (
        <div className="k-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-green-500" />
              <h3 className="font-semibold">Generated Schedule</h3>
            </div>
            <div className="text-xs text-gray-400">
              {preview.summary.totalMatches} matches · Ends {formatTime(preview.summary.estimatedEnd)}
            </div>
          </div>

          {preview.warnings && preview.warnings.length > 0 && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl">
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Scheduling Conflict Warnings ({preview.warnings.length})
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                {preview.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-400">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">#</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Round</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Matchup</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Venue</th>
                  {preview.fixtures[0]?.notes && <th className="text-left py-2 px-3 font-medium text-gray-500">Group</th>}
                </tr>
              </thead>
              <tbody>
                {preview.fixtures.map((f, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">{f.round}</td>
                    <td className="py-2 px-3 text-gray-600">
                      {formatTime(f.scheduled_at)} - {formatTime(f.end_time)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span 
                            style={{ backgroundColor: f.team_a_color || '#6b7280' }}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            title={f.team_a_name}
                          >
                            {f.team_a}
                          </span>
                          <span className="font-medium text-xs md:text-sm">{f.team_a_name || f.team_a}</span>
                        </span>
                        <span className="text-gray-400 text-xs">vs</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span 
                            style={{ backgroundColor: f.team_b_color || '#6b7280' }}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            title={f.team_b_name}
                          >
                            {f.team_b}
                          </span>
                          <span className="font-medium text-xs md:text-sm">{f.team_b_name || f.team_b}</span>
                        </span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-500">{f.venue}</td>
                    {f.notes && <td className="py-2 px-3 text-xs text-gray-400">{f.notes}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
