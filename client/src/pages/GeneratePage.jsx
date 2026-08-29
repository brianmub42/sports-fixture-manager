import { useState, useEffect } from 'react';
import { generateApi } from '../api.js';
import { Wand2, Save, Clock, Users, MapPin, Calendar, RotateCcw, CheckCircle, AlertTriangle, ShieldAlert, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useVenues, useSports, useTeams } from '../hooks/useFixtures.js';
import { useToast } from '../contexts/ToastContext.jsx';

const getLocalDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const ALL_FORMATS = [
  { value: 'single', label: 'Single Round-Robin', desc: 'Each pair plays once' },
  { value: 'double', label: 'Double Round-Robin', desc: 'Each pair plays twice (home + away)' },
  { value: 'group', label: 'Group Stage', desc: 'Teams split into groups, round-robin within each' },
  { value: 'playoff', label: 'Single Elimination Playoff', desc: 'Knockout tournament (requires 4 or 8 teams)' },
  { value: 'placement', label: 'Placement-Based (Athletics & Novelty Runs)', desc: 'Schedule all event-category combinations' }
];

const OLYMPIC_EVENTS_GROUPS = [
  {
    group: 'Sprints & Hurdles',
    events: ['100m', '200m', '400m', '110m Hurdles', '400m Hurdles']
  },
  {
    group: 'Middle & Long Distance',
    events: ['800m', '1500m', '5000m', '3000m Steeplechase']
  },
  {
    group: 'Relays',
    events: ['4x100m Relay', '4x400m Relay']
  },
  {
    group: 'Jumps',
    events: ['High Jump', 'Long Jump', 'Triple Jump', 'Pole Vault']
  },
  {
    group: 'Throws',
    events: ['Shot Put', 'Discus Throw', 'Javelin Throw', 'Hammer Throw']
  }
];



function TeamsSelector({ value, onChange, registeredTeams }) {
  const [search, setSearch] = useState('');
  const [customTeam, setCustomTeam] = useState('');

  const selectedList = value ? value.split(',').map(t => t.trim().toUpperCase()).filter(Boolean) : [];

  const handleToggle = (code) => {
    const upperCode = code.trim().toUpperCase();
    const exists = selectedList.includes(upperCode);
    let newList;
    if (exists) {
      newList = selectedList.filter(t => t !== upperCode);
    } else {
      newList = [...selectedList, upperCode];
    }
    onChange(newList.join(', '));
  };

  const handleSelectAll = () => {
    if (!registeredTeams) return;
    const allCodes = registeredTeams.map(t => t.code.toUpperCase());
    const customOnly = selectedList.filter(t => !allCodes.includes(t));
    const newList = [...allCodes, ...customOnly];
    onChange(newList.join(', '));
  };

  const handleClearAll = () => {
    onChange('');
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    const code = customTeam.trim().toUpperCase();
    if (!code) return;
    if (!selectedList.includes(code)) {
      onChange([...selectedList, code].join(', '));
    }
    setCustomTeam('');
  };

  const filteredTeams = registeredTeams?.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Teams ({selectedList.length} Selected)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            Select All
          </button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-bold text-gray-500 hover:text-gray-600 dark:text-gray-400"
          >
            Clear All
          </button>
        </div>
      </div>

      {selectedList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 max-h-[100px] overflow-y-auto">
          {selectedList.map((team, idx) => {
            const registered = registeredTeams?.find(t => t.code.toUpperCase() === team);
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-100 dark:border-purple-900/30"
              >
                {team}{registered ? ` (${registered.name})` : ''}
                <button
                  type="button"
                  onClick={() => handleToggle(team)}
                  className="hover:text-purple-900 dark:hover:text-purple-100 font-bold focus:outline-none ml-0.5 text-sm"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="p-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850/50">
          <input
            type="text"
            placeholder="Search registered teams by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
        <div className="p-3 max-h-[150px] overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
          {filteredTeams.length === 0 ? (
            <div className="col-span-full text-center text-xs text-gray-400 py-4">
              No matching teams found.
            </div>
          ) : (
            filteredTeams.map((team) => {
              const codeUpper = team.code.toUpperCase();
              const isChecked = selectedList.includes(codeUpper);
              return (
                <label
                  key={team.id}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer select-none transition-colors text-xs ${
                    isChecked
                      ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200'
                      : 'border-gray-150 dark:border-gray-800 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/45'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(team.code)}
                    className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                  />
                  <div className="truncate">
                    <span className="font-bold">{team.code}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-[10px] ml-1">({team.name})</span>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      <form onSubmit={handleAddCustom} className="flex gap-2">
        <input
          type="text"
          placeholder="Add custom team code (e.g. USA)..."
          value={customTeam}
          onChange={(e) => setCustomTeam(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold rounded border border-gray-200 dark:border-gray-750 shrink-0 transition-colors"
        >
          Add Custom
        </button>
      </form>
    </div>
  );
}

function BulkInputManager({ label, value, onChange, placeholder, suggestionGroups, icon: Icon }) {
  const [inputValue, setInputValue] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const items = value ? value.split(',').map(x => x.trim()).filter(Boolean) : [];

  const handleToggle = (item) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const exists = items.some(x => x.toLowerCase() === trimmed.toLowerCase());
    let newItems;
    if (exists) {
      newItems = items.filter(x => x.toLowerCase() !== trimmed.toLowerCase());
    } else {
      newItems = [...items, trimmed];
    }
    onChange(newItems.join(', '));
  };

  const handleAddSingle = (e) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
    const uniqueParts = parts.filter(p => !items.some(x => x.toLowerCase() === p.toLowerCase()));
    if (uniqueParts.length > 0) {
      onChange([...items, ...uniqueParts].join(', '));
    }
    setInputValue('');
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const parsed = bulkText
      .split(/[,\n]/)
      .map(x => x.trim())
      .filter(Boolean);

    const unique = parsed.filter(p => !items.some(x => x.toLowerCase() === p.toLowerCase()));
    if (unique.length > 0) {
      onChange([...items, ...unique].join(', '));
    }
    setBulkText('');
    setShowBulkPaste(false);
  };

  const handleRemove = (index) => {
    const newItems = items.filter((_, idx) => idx !== index);
    onChange(newItems.join(', '));
  };

  const handleClearAll = () => {
    onChange('');
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          {label} ({items.length} Added)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowBulkPaste(!showBulkPaste)}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            {showBulkPaste ? 'Hide Paste' : '+ Bulk Paste'}
          </button>
          {items.length > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs font-bold text-gray-500 hover:text-gray-600 dark:text-gray-400"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 max-h-[120px] overflow-y-auto">
          {items.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-100 dark:border-purple-900/30"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="hover:text-purple-900 dark:hover:text-purple-100 font-bold focus:outline-none text-sm ml-0.5"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {showBulkPaste && (
        <div className="p-3 border border-purple-200 dark:border-purple-900/40 rounded-lg bg-purple-50/10 dark:bg-purple-950/5 space-y-2">
          <label className="block text-[11px] font-bold text-purple-800 dark:text-purple-300">
            Paste list from Excel or text (comma or line separated):
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={3}
            placeholder="Example:&#10;100m&#10;200m&#10;Shot Put, Discus"
            className="w-full p-2 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBulkPaste(false)}
              className="px-2.5 py-1 text-xs rounded border border-gray-350 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkImport}
              className="px-3 py-1 text-xs rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {!showBulkPaste && (
        <form onSubmit={handleAddSingle} className="flex gap-2">
          <div className="relative w-full">
            {Icon && (
              <Icon size={14} className="absolute left-3 top-2.5 text-gray-400" />
            )}
            <input
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={`w-full text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-purple-500 py-2.5 ${
                Icon ? 'pl-9' : 'px-3'
              }`}
            />
          </div>
          <button
            type="submit"
            className="px-3.5 bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold rounded border border-gray-200 dark:border-gray-755 transition-colors shrink-0"
          >
            Add
          </button>
        </form>
      )}

      {suggestionGroups && suggestionGroups.length > 0 && (
        <div className="border border-gray-150 dark:border-gray-800 rounded-lg p-3 bg-gray-50/20 dark:bg-gray-900/10 space-y-2.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Quick Select Suggestions
          </span>
          <div className="space-y-2">
            {suggestionGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">
                  {group.group}
                </span>
                <div className="flex flex-wrap gap-1">
                  {(group.events || group.categories).map((sug, sIdx) => {
                    const isSelected = items.some(x => x.toLowerCase() === sug.toLowerCase());
                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleToggle(sug)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                          isSelected
                            ? 'bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {sug}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { data: registeredVenues } = useVenues();
  const { data: sports, isLoading: loadingSports } = useSports();
  const { data: registeredTeams } = useTeams();
  const [initializedTeams, setInitializedTeams] = useState(false);
  const [form, setForm] = useState({
    teams: '',
    events: '100m, 200m, High Jump, Long Jump',
    genders: 'Boys, Girls, Mixed',
    ageGroups: 'Seniors, Under 13 (U13), Under 15 (U15), Under 17 (U17), Under 20 (U20)',
    sport: '',
    startDate: getLocalDateTimeString(),
    duration: 10,
    breakTime: 0,
    format: 'single',
    venues: 'BB Court',
    concurrent: 1,
    groupCount: 2,
  });

  useEffect(() => {
    if (registeredTeams && registeredTeams.length > 0 && !initializedTeams) {
      setForm(prev => ({ ...prev, teams: registeredTeams.map(t => t.code).join(', ') }));
      setInitializedTeams(true);
    }
  }, [registeredTeams, initializedTeams]);

  const selectedSportObj = sports?.find(s => s.name === form.sport);
  const isPlacementSport = selectedSportObj?.scoring_type === 'placement';

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [guideActive, setGuideActive] = useState(false);
  const [guideStep, setGuideStep] = useState(1);

  useEffect(() => {
    const hasSeen = localStorage.getItem('guide_seen');
    if (!hasSeen) {
      setGuideActive(true);
    }
  }, []);

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

  useEffect(() => {
    if (sports && sports.length > 0) {
      const selected = sports.find(s => s.name === form.sport);
      if (selected) {
        if (selected.scoring_type === 'placement') {
          setForm(prev => ({
            ...prev,
            format: 'placement',
            duration: prev.duration === 10 ? 15 : prev.duration,
            breakTime: prev.breakTime === 0 ? 5 : prev.breakTime,
          }));
        } else {
          setForm(prev => ({
            ...prev,
            format: prev.format === 'placement' ? 'single' : prev.format,
            duration: prev.duration === 15 ? 10 : prev.duration,
            breakTime: prev.breakTime === 5 ? 0 : prev.breakTime,
          }));
        }
      }
    }
  }, [form.sport, sports]);

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
  const parseEvents = () => form.events ? form.events.split(',').map(e => e.trim()).filter(Boolean) : [];
  const parseGenders = () => form.genders ? form.genders.split(',').map(g => g.trim()).filter(Boolean) : [];
  const parseAgeGroups = () => form.ageGroups ? form.ageGroups.split(',').map(a => a.trim()).filter(Boolean) : [];

  const validateParams = (teams, venues, concurrent) => {
    if (concurrent > venues.length) {
      throw new Error(`Matches Per Round (${concurrent}) cannot exceed the number of venues (${venues.length}).`);
    }
    if (concurrent * 2 > teams.length) {
      throw new Error(`Matches Per Round (${concurrent}) requires at least ${concurrent * 2} teams playing concurrently, but only ${teams.length} team(s) were provided.`);
    }
  };

  const buildPayload = () => {
    const venues = parseVenues();
    const concurrent = parseInt(form.concurrent);

    if (isPlacementSport) {
      const events = parseEvents();
      const genders = parseGenders();
      const ageGroups = parseAgeGroups();

      if (events.length === 0) {
        throw new Error('Please enter at least one event.');
      }
      if (genders.length === 0) {
        throw new Error('Please enter at least one gender.');
      }
      if (ageGroups.length === 0) {
        throw new Error('Please enter at least one age group.');
      }
      if (venues.length === 0) {
        throw new Error('Please enter at least one venue.');
      }
      if (concurrent > venues.length) {
        throw new Error(`Events Per Round (${concurrent}) cannot exceed the number of venues (${venues.length}).`);
      }

      return {
        events,
        genders,
        ageGroups,
        sport: form.sport,
        startDate: new Date(form.startDate).toISOString(),
        durationMinutes: parseInt(form.duration),
        breakMinutes: parseInt(form.breakTime),
        format: form.format,
        venues,
        concurrent,
        teams: parseTeams() // fallback to keep schema parsing or generic checks happy
      };
    }

    const teams = parseTeams();
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
      showToast('Generated fixtures saved to database successfully!', 'success');
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wand2 size={18} className="text-purple-500" />
            <h2 className="text-lg font-semibold">Fixture Generator</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setGuideStep(1);
              setGuideActive(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/80 bg-purple-50/5 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all shadow-sm focus:outline-none"
          >
            💡 Tour Guide
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Enter your parameters and the algorithm will auto-generate the full schedule using round-robin pairing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Teams Selector */}
          <div 
            id="step-teams"
            className={`col-span-1 md:col-span-2 p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 2
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}
          >
            <TeamsSelector
              value={form.teams}
              onChange={(val) => handleChange('teams', val)}
              registeredTeams={registeredTeams}
            />
          </div>

          {/* Sport */}
          <div 
            id="step-sport"
            className={`col-span-1 md:col-span-2 p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 1
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}
          >
            <label className="block text-sm font-semibold mb-1.5">Sport</label>
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
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium"
              >
                {sports?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            )}
          </div>

          {/* Events (only for placement sports) */}
          {isPlacementSport && (
            <div 
              id="step-format-events"
              className={`col-span-1 md:col-span-2 p-3 rounded-xl transition-all duration-300 ${
                guideActive && guideStep === 3
                  ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                  : ''
              }`}
            >
              <BulkInputManager
                label="Events"
                value={form.events}
                onChange={(val) => handleChange('events', val)}
                placeholder="Type or click events to add (e.g. 100m)..."
                suggestionGroups={OLYMPIC_EVENTS_GROUPS}
                icon={Trophy}
              />
            </div>
          )}

          {/* Genders (only for placement sports) */}
          {isPlacementSport && (
            <div className={`col-span-1 md:col-span-2 p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 3
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}>
              <BulkInputManager
                label="Genders"
                value={form.genders}
                onChange={(val) => handleChange('genders', val)}
                placeholder="Type or click genders to add (e.g. Boys)..."
                suggestionGroups={[
                  {
                    group: 'General Genders',
                    categories: ['Boys', 'Girls', 'Mixed', 'Men', 'Women']
                  }
                ]}
                icon={Users}
              />
            </div>
          )}

          {/* Age Groups (only for placement sports) */}
          {isPlacementSport && (
            <div className={`col-span-1 md:col-span-2 p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 3
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}>
              <BulkInputManager
                label="Age Groups"
                value={form.ageGroups}
                onChange={(val) => handleChange('ageGroups', val)}
                placeholder="Type or click age groups to add (e.g. Under 13)..."
                suggestionGroups={[
                  {
                    group: 'Divisions',
                    categories: ['Seniors', 'Juniors', 'Sub-Juniors']
                  },
                  {
                    group: 'Age Groups',
                    categories: ['Under 13 (U13)', 'Under 15 (U15)', 'Under 17 (U17)', 'Under 20 (U20)']
                  }
                ]}
                icon={Users}
              />
            </div>
          )}

          {/* Start Date */}
          <div 
            id="step-schedule"
            className={`p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 4
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}
          >
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
          <div className={`p-3 rounded-xl transition-all duration-300 ${
            guideActive && guideStep === 4
              ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
              : ''
          }`}>
            <label className="block text-sm font-medium mb-1.5">
              {isPlacementSport ? 'Event Duration (minutes)' : 'Match Duration (minutes)'}
            </label>
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
          <div className={`p-3 rounded-xl transition-all duration-300 ${
            guideActive && guideStep === 4
              ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
              : ''
          }`}>
            <label className="block text-sm font-medium mb-1.5">
              {isPlacementSport ? 'Break Between Events (min)' : 'Break Between Rounds (min)'}
            </label>
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
          <div 
            id={!isPlacementSport ? "step-format-events" : undefined}
            className={`p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 3 && !isPlacementSport
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}
          >
            <label className="block text-sm font-medium mb-1.5">Format</label>
            <select
              value={form.format}
              onChange={(e) => handleChange('format', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              {ALL_FORMATS.map(f => (
                <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>
              ))}
            </select>
          </div>

          {/* Venues */}
          <div 
            id="step-venues"
            className={`p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 5
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}
          >
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
          <div className={`p-3 rounded-xl transition-all duration-300 ${
            guideActive && guideStep === 5
              ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
              : ''
          }`}>
            <label className="block text-sm font-medium mb-1.5">
              {isPlacementSport ? 'Events Per Round' : 'Matches Per Round'}
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.concurrent}
              onChange={(e) => handleChange('concurrent', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              {isPlacementSport ? 'How many events run simultaneously' : 'How many matches run simultaneously'}
            </p>
          </div>

          {/* Group count (only for group stage) */}
          {form.format === 'group' && (
            <div className={`p-3 rounded-xl transition-all duration-300 ${
              guideActive && guideStep === 5
                ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                : ''
            }`}>
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

        <div 
          id="step-actions"
          className={`flex gap-3 mt-6 p-2 rounded-xl transition-all duration-300 ${
            guideActive && guideStep === 6
              ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)] animate-pulse-slow'
              : ''
          }`}
        >
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
              {preview.summary.totalMatches} {isPlacementSport ? 'events' : 'matches'} · Ends {formatTime(preview.summary.estimatedEnd)}
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

          <div className="overflow-x-auto md:max-h-[500px] md:overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">#</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">{isPlacementSport ? 'Round / Slot' : 'Round'}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">{isPlacementSport ? 'Event Name & Category' : 'Matchup'}</th>
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
                      {isPlacementSport ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-xs md:text-sm text-amber-600 dark:text-amber-400">
                          🏆 {f.team_a_name}
                        </span>
                      ) : (
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
                      )}
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
      {/* Floating Guide Tour Widget */}
      {guideActive && (
        <div className="fixed bottom-6 right-6 w-[340px] z-50 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-purple-200 dark:border-purple-900 shadow-2xl p-4 transition-all duration-300 transform scale-100 flex flex-col gap-3">
          <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-gray-800">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1">
              💡 Tour Guide: Step {guideStep} of 6
            </span>
            <button 
              onClick={() => {
                setGuideActive(false);
                localStorage.setItem('guide_seen', 'true');
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold focus:outline-none"
              title="Close Guide & Don't show again"
            >
              &times;
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {guideStep === 1 && '1. Select Sport'}
              {guideStep === 2 && '2. Manage Participating Teams'}
              {guideStep === 3 && (isPlacementSport ? '3. Setup Events, Genders & Age Groups' : '3. Select Tournament Format')}
              {guideStep === 4 && '4. Configure Schedule Timeline'}
              {guideStep === 5 && '5. Assign Venues & Concurrency'}
              {guideStep === 6 && '6. Preview and Publish'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {guideStep === 1 && 'Choose the sport you want to schedule. The generator will dynamically adapt the form inputs based on whether the sport is points-based (like Soccer) or placement-based (like Athletics).'}
              {guideStep === 2 && 'Select which teams will participate. You can search, select all registered teams, clear selection, or add custom guest teams not in the database.'}
              {guideStep === 3 && (isPlacementSport 
                ? 'For Athletics, select the Events, Genders, and Age Groups to automatically compile all three-way combinations (e.g. 100m Boys U13).'
                : 'Choose your desired match schedule format: Single Round-Robin, Double Round-Robin, Group Stage, or Playoffs.')}
              {guideStep === 4 && 'Define the start date & time, the duration of each event/match slot, and the buffer/break times in between.'}
              {guideStep === 5 && 'Specify where the games will take place (venues) and the number of events or matches that can run simultaneously.'}
              {guideStep === 6 && 'Click "Preview Schedule" to review the times, slots, and matchups. Check for any venue conflict warnings, then click "Save to Database" to publish.'}
            </p>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-150 dark:border-gray-800">
            <button
              onClick={() => {
                setGuideActive(false);
                localStorage.setItem('guide_seen', 'true');
              }}
              className="text-xs text-gray-400 hover:text-gray-300 dark:hover:text-gray-400 font-semibold focus:outline-none"
            >
              Skip Tour
            </button>
            <div className="flex gap-2">
              <button
                disabled={guideStep === 1}
                onClick={() => setGuideStep(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1 text-xs font-semibold rounded border border-gray-250 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
              >
                Back
              </button>
              {guideStep < 6 ? (
                <button
                  onClick={() => setGuideStep(prev => Math.min(6, prev + 1))}
                  className="px-3 py-1 text-xs font-semibold rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors focus:outline-none"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => {
                    setGuideActive(false);
                    localStorage.setItem('guide_seen', 'true');
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded bg-green-600 hover:bg-green-700 text-white transition-colors focus:outline-none"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
