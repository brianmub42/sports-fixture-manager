import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateApi } from '../api.js';
import { Wand2, Save, Clock, Users, MapPin, Calendar, RotateCcw, CheckCircle, AlertTriangle, ShieldAlert, Trophy, HelpCircle, BookOpen, Zap, Layers, Lightbulb, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useVenues, useSports, useTeams } from '../hooks/useFixtures.js';
import { useToast } from '../contexts/ToastContext.jsx';
import ScoringFormatsModal from '../components/ScoringFormatsModal.jsx';

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
  { value: 'placement', label: 'Placement-Based (Athletics & Aquatics)', desc: 'Schedule all event-category combinations' }
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

const SWIMMING_EVENTS_GROUPS = [
  {
    group: 'Butterfly',
    events: ['Butterfly 25m', 'Butterfly 50m', 'Butterfly 100m']
  },
  {
    group: 'Freestyle',
    events: ['Freestyle 25m', 'Freestyle 50m', 'Freestyle 100m', 'Freestyle 200m']
  },
  {
    group: 'Backstroke',
    events: ['Backstroke 25m', 'Backstroke 50m', 'Backstroke 100m']
  },
  {
    group: 'Breaststroke',
    events: ['Breaststroke 25m', 'Breaststroke 50m', 'Breaststroke 100m']
  },
  {
    group: 'Medley & Relays',
    events: ['Individual Medley 100m', 'Medley Relay 4x25m', 'Freestyle Relay 4x25m', 'Medley Relay 4x50m']
  }
];

const GENDER_GROUPS = [
  {
    group: 'General Genders',
    categories: ['Boys', 'Girls', 'Mixed', 'Men', 'Women']
  }
];

const AGE_GROUPS = [
  {
    group: 'Junior Age Groups (Primary)',
    categories: ['Under 9 (U9)', 'Under 10 (U10)', 'Under 11 (U11)', 'Under 12 (U12)']
  },
  {
    group: 'Senior Age Groups (High School)',
    categories: ['Under 13 (U13)', 'Under 14 (U14)', 'Under 15 (U15)', 'Under 16 (U16)', 'Under 17 (U17)', 'Under 18 (U18)', 'Under 20 (U20)']
  },
  {
    group: 'Divisions & Open',
    categories: ['Sub-Juniors', 'Juniors', 'Seniors', 'Open']
  }
];

const STANDARD_GENDERS = ['Boys', 'Girls', 'Mixed', 'Men', 'Women'];
const STANDARD_AGE_GROUPS = [
  'Under 9 (U9)', 'Under 10 (U10)', 'Under 11 (U11)', 'Under 12 (U12)',
  'Under 13 (U13)', 'Under 14 (U14)', 'Under 15 (U15)', 'Under 16 (U16)',
  'Under 17 (U17)', 'Under 18 (U18)', 'Under 20 (U20)', 'Seniors', 'Open'
];

function EventAgeGroupManager({ events, eventConfigs, onChange }) {
  if (!events || events.length === 0) return null;

  const [customCatInput, setCustomCatInput] = useState({});
  const [customGenderInput, setCustomGenderInput] = useState({});
  const [customAgeInput, setCustomAgeInput] = useState({});

  const getEventGenders = (eventName) => {
    return eventConfigs[eventName]?.genders || [];
  };

  const getEventAgeGroups = (eventName) => {
    return eventConfigs[eventName]?.ageGroups || [];
  };

  const getActiveCategories = (eventName) => {
    if (eventConfigs[eventName]?.categories !== undefined) {
      return eventConfigs[eventName].categories;
    }
    const genders = getEventGenders(eventName);
    const ages = getEventAgeGroups(eventName);
    if (genders.length > 0 && ages.length > 0) {
      return genders.flatMap(g => ages.map(a => `${g} ${a}`));
    }
    return [];
  };

  const updateConfig = (eventName, patch) => {
    onChange({
      ...eventConfigs,
      [eventName]: {
        ...(eventConfigs[eventName] || {}),
        ...patch
      }
    });
  };

  const handleToggleGender = (eventName, gender) => {
    const current = getEventGenders(eventName);
    const activeCats = getActiveCategories(eventName);
    const ages = getEventAgeGroups(eventName);
    const exists = current.includes(gender);

    let nextGenders;
    let nextCats;
    if (exists) {
      nextGenders = current.filter(g => g !== gender);
      nextCats = activeCats.filter(c => !c.startsWith(`${gender} `));
    } else {
      nextGenders = [...current, gender];
      const newPermutations = ages.map(a => `${gender} ${a}`).filter(c => !activeCats.includes(c));
      nextCats = [...activeCats, ...newPermutations];
    }

    updateConfig(eventName, { genders: nextGenders, categories: nextCats });
  };

  const handleAddCustomGender = (eventName) => {
    const val = (customGenderInput[eventName] || '').trim();
    if (!val) return;
    const current = getEventGenders(eventName);
    if (!current.includes(val)) {
      handleToggleGender(eventName, val);
    }
    setCustomGenderInput(prev => ({ ...prev, [eventName]: '' }));
  };

  const handleSetGenderPreset = (eventName, preset) => {
    const ages = getEventAgeGroups(eventName);
    let nextGenders = [];

    if (preset === 'mixed-only') {
      nextGenders = ['Mixed'];
    } else if (preset === 'boys-girls') {
      nextGenders = ['Boys', 'Girls'];
    } else if (preset === 'all') {
      nextGenders = ['Boys', 'Girls', 'Mixed'];
    } else if (preset === 'clear') {
      nextGenders = [];
    }

    const nextCats = nextGenders.flatMap(g => ages.map(a => `${g} ${a}`));
    updateConfig(eventName, { genders: nextGenders, categories: nextCats });
  };

  const handleToggleAgeGroup = (eventName, ageGroup) => {
    const genders = getEventGenders(eventName);
    const currentAges = getEventAgeGroups(eventName);
    const activeCats = getActiveCategories(eventName);
    const exists = currentAges.includes(ageGroup);

    let nextAges;
    let nextCats;
    if (exists) {
      nextAges = currentAges.filter(a => a !== ageGroup);
      nextCats = activeCats.filter(c => !c.endsWith(` ${ageGroup}`));
    } else {
      nextAges = [...currentAges, ageGroup];
      const newPermutations = genders.map(g => `${g} ${ageGroup}`).filter(c => !activeCats.includes(c));
      nextCats = [...activeCats, ...newPermutations];
    }

    updateConfig(eventName, { ageGroups: nextAges, categories: nextCats });
  };

  const handleAddCustomAge = (eventName) => {
    const val = (customAgeInput[eventName] || '').trim();
    if (!val) return;
    const current = getEventAgeGroups(eventName);
    if (!current.includes(val)) {
      handleToggleAgeGroup(eventName, val);
    }
    setCustomAgeInput(prev => ({ ...prev, [eventName]: '' }));
  };

  const handleSetAgePreset = (eventName, preset) => {
    const genders = getEventGenders(eventName);
    let nextAges = [];

    if (preset === 'u9-u10') {
      nextAges = ['Under 9 (U9)', 'Under 10 (U10)'];
    } else if (preset === 'juniors') {
      nextAges = ['Under 9 (U9)', 'Under 10 (U10)', 'Under 11 (U11)', 'Under 12 (U12)'];
    } else if (preset === 'seniors') {
      nextAges = ['Under 13 (U13)', 'Under 14 (U14)', 'Under 15 (U15)', 'Under 16 (U16)', 'Under 17 (U17)'];
    } else if (preset === 'all') {
      nextAges = [...STANDARD_AGE_GROUPS];
    } else if (preset === 'none') {
      nextAges = [];
    }

    const nextCats = genders.flatMap(g => nextAges.map(a => `${g} ${a}`));
    updateConfig(eventName, { ageGroups: nextAges, categories: nextCats });
  };

  const handleToggleCategory = (eventName, category) => {
    const activeCats = getActiveCategories(eventName);
    const exists = activeCats.includes(category);
    const nextCats = exists 
      ? activeCats.filter(c => c !== category)
      : [...activeCats, category];

    updateConfig(eventName, { categories: nextCats });
  };

  const handlePresetMedleyJuniorMixed = (eventName) => {
    const effectiveAges = ['Under 9 (U9)', 'Under 10 (U10)'];
    const nextCats = effectiveAges.map(a => `Mixed ${a}`);

    updateConfig(eventName, {
      genders: ['Mixed'],
      ageGroups: effectiveAges,
      categories: nextCats
    });
  };

  const handleAddCustomCategory = (eventName) => {
    const inputVal = (customCatInput[eventName] || '').trim();
    if (!inputVal) return;
    const activeCats = getActiveCategories(eventName);
    if (!activeCats.includes(inputVal)) {
      updateConfig(eventName, { categories: [...activeCats, inputVal] });
    }
    setCustomCatInput(prev => ({ ...prev, [eventName]: '' }));
  };

  return (
    <div className="col-span-1 md:col-span-2 p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/15 dark:bg-purple-950/10 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/30 pb-2.5">
        <div>
          <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
            🎯 Event Heats, Genders &amp; Age Groups ({events.length} {events.length === 1 ? 'Event' : 'Events'})
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Select genders and age groups individually for each event below, or use quick presets.
          </p>
        </div>
      </div>

      <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
        {events.map((eventName) => {
          const isMedleyOrMixedRelay = /medley(\s+relay)?/i.test(eventName) || /mixed(\s+relay)?/i.test(eventName);
          const activeGenders = getEventGenders(eventName);
          const activeAges = getEventAgeGroups(eventName);
          const activeCats = getActiveCategories(eventName);

          // All permutations currently possible given active genders & ages
          const allPermutations = (activeGenders.length > 0 && activeAges.length > 0)
            ? activeGenders.flatMap(g => activeAges.map(a => `${g} ${a}`))
            : [];

          // Combined unique genders and age groups to display (standard + custom added)
          const displayedGenders = Array.from(new Set([...STANDARD_GENDERS, ...activeGenders]));
          const displayedAges = Array.from(new Set([...STANDARD_AGE_GROUPS, ...activeAges]));

          return (
            <div
              key={eventName}
              className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 space-y-2.5 shadow-xs"
            >
              {/* Event Header & Quick Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-900 dark:text-gray-100">
                    {eventName}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    activeCats.length > 0
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/40'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  }`}>
                    {activeCats.length} {activeCats.length === 1 ? 'Heat' : 'Heats'} Configured
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  {isMedleyOrMixedRelay && (
                    <button
                      type="button"
                      onClick={() => handlePresetMedleyJuniorMixed(eventName)}
                      className="px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 font-bold transition-all cursor-pointer"
                      title="Quickly configure this relay for Mixed Under 9 and Mixed Under 10 only"
                    >
                      ⚡ Mixed U9 &amp; U10 Only
                    </button>
                  )}
                  {allPermutations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => updateConfig(eventName, { categories: allPermutations })}
                      className="px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold cursor-pointer"
                    >
                      Reset Heats
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Genders Configuration Row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    👥 Genders:
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-gray-400">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleSetGenderPreset(eventName, 'mixed-only')}
                      className="px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold cursor-pointer"
                    >
                      Mixed Only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetGenderPreset(eventName, 'boys-girls')}
                      className="px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold cursor-pointer"
                    >
                      Boys &amp; Girls
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetGenderPreset(eventName, 'all')}
                      className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetGenderPreset(eventName, 'clear')}
                      className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-400 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {displayedGenders.map(g => {
                    const isSelected = activeGenders.includes(g);
                    const isMixed = g.toLowerCase() === 'mixed';
                    const isBoy = g.toLowerCase() === 'boys' || g.toLowerCase() === 'men';
                    const isGirl = g.toLowerCase() === 'girls' || g.toLowerCase() === 'women';

                    const activeStyle = isMixed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                      : isBoy
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                        : isGirl
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 border-purple-300 dark:border-purple-700';

                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleToggleGender(eventName, g)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-md transition-all font-semibold border cursor-pointer ${
                          isSelected
                            ? `${activeStyle} shadow-2xs`
                            : 'bg-gray-50 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {isSelected ? `✓ ${g}` : `+ ${g}`}
                      </button>
                    );
                  })}

                  {/* Inline add custom gender */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customGenderInput[eventName] || ''}
                      onChange={e => setCustomGenderInput({ ...customGenderInput, [eventName]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomGender(eventName);
                        }
                      }}
                      placeholder="+ Custom..."
                      className="w-20 px-1.5 py-0.5 text-[11px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    {customGenderInput[eventName] && (
                      <button
                        type="button"
                        onClick={() => handleAddCustomGender(eventName)}
                        className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Age Groups Configuration Row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                    🎂 Age Groups:
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-gray-400">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleSetAgePreset(eventName, 'u9-u10')}
                      className="px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold cursor-pointer"
                    >
                      U9 &amp; U10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAgePreset(eventName, 'juniors')}
                      className="px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold cursor-pointer"
                    >
                      U9-U12
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAgePreset(eventName, 'seniors')}
                      className="px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold cursor-pointer"
                    >
                      U13-U17
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAgePreset(eventName, 'all')}
                      className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-semibold cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetAgePreset(eventName, 'none')}
                      className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-semibold text-gray-400 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {displayedAges.map(ag => {
                    const isSelected = activeAges.includes(ag);
                    return (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => handleToggleAgeGroup(eventName, ag)}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-all font-medium border cursor-pointer ${
                          isSelected
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-semibold shadow-2xs'
                            : 'bg-gray-50 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {isSelected ? `✓ ${ag}` : `+ ${ag}`}
                      </button>
                    );
                  })}

                  {/* Inline add custom age */}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={customAgeInput[eventName] || ''}
                      onChange={e => setCustomAgeInput({ ...customAgeInput, [eventName]: e.target.value })}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomAge(eventName);
                        }
                      }}
                      placeholder="+ Custom..."
                      className="w-20 px-1.5 py-0.5 text-[11px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    {customAgeInput[eventName] && (
                      <button
                        type="button"
                        onClick={() => handleAddCustomAge(eventName)}
                        className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Granular Active Categories Matrix & Custom Heats */}
              <div className="pt-1.5 border-t border-gray-100 dark:border-gray-800/50 space-y-1.5 bg-gray-50/50 dark:bg-gray-950/20 p-2.5 rounded-lg">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    🏊 Active Heats for this Event ({activeCats.length}):
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    {allPermutations.length > 0 && (
                      <button
                        type="button"
                        onClick={() => updateConfig(eventName, { categories: allPermutations })}
                        className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-600 dark:text-gray-300 font-semibold cursor-pointer"
                      >
                        All ({allPermutations.length})
                      </button>
                    )}
                    {activeCats.length > 0 && (
                      <button
                        type="button"
                        onClick={() => updateConfig(eventName, { categories: [] })}
                        className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-400 font-semibold cursor-pointer"
                      >
                        Clear Heats
                      </button>
                    )}
                  </div>
                </div>

                {/* Categories toggle chips */}
                <div className="flex flex-wrap gap-1.5">
                  {activeCats.length === 0 ? (
                    <span className="text-[11px] text-gray-400 italic">
                      No heats selected yet. Click Genders and Age Groups above to add heats, or enter custom heats below.
                    </span>
                  ) : (
                    activeCats.map(cat => {
                      const isMixed = cat.toLowerCase().includes('mixed');
                      const isBoy = cat.toLowerCase().includes('boys') || cat.toLowerCase().includes('men');
                      const isGirl = cat.toLowerCase().includes('girls') || cat.toLowerCase().includes('women');

                      const chipActiveStyle = isMixed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700 font-bold'
                        : isBoy
                          ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700 font-semibold'
                          : isGirl
                            ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700 font-semibold'
                            : 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700 font-semibold';

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(eventName, cat)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${chipActiveStyle}`}
                          title={`Click to remove heat: ${cat}`}
                        >
                          <span>{cat}</span>
                          <span className="text-gray-400 hover:text-red-500 font-bold ml-0.5">×</span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Inline custom category adder */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={customCatInput[eventName] || ''}
                    onChange={e => setCustomCatInput({ ...customCatInput, [eventName]: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCategory(eventName);
                      }
                    }}
                    placeholder="Add custom heat (e.g. Mixed U9, Staff Relay)..."
                    className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-[11px] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomCategory(eventName)}
                    className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer"
                  >
                    + Add Heat
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT QUEUE BUILDER — Option A implementation
// Lets users pick one event → configure → add to queue → repeat, then
// Preview & Generate everything in one shot.
// ─────────────────────────────────────────────────────────────────────────────
function EventQueueBuilder({ queue, onQueueChange, sportName }) {
  const isSwimsport = sportName?.toLowerCase().includes('swim') || sportName?.toLowerCase().includes('pool');
  const suggestionGroups = isSwimsport
    ? [...SWIMMING_EVENTS_GROUPS, ...OLYMPIC_EVENTS_GROUPS]
    : [...OLYMPIC_EVENTS_GROUPS, ...SWIMMING_EVENTS_GROUPS];

  const [draftName, setDraftName] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [customGenderInput, setCustomGenderInput] = useState({});
  const [customAgeInput, setCustomAgeInput] = useState({});
  const [customCatInput, setCustomCatInput] = useState({});

  // ---- helpers ----
  const getItem = (idx) => queue[idx] || {};

  const updateItem = (idx, patch) => {
    const next = queue.map((item, i) => i === idx ? { ...item, ...patch } : item);
    onQueueChange(next);
  };

  const getActiveCategories = (idx) => {
    const item = getItem(idx);
    if (item.categories !== undefined) return item.categories;
    const g = item.genders || [];
    const a = item.ageGroups || [];
    if (g.length > 0 && a.length > 0) return g.flatMap(gn => a.map(an => `${gn} ${an}`));
    return [];
  };

  const allPermutations = (idx) => {
    const item = getItem(idx);
    const g = item.genders || [];
    const a = item.ageGroups || [];
    return (g.length > 0 && a.length > 0) ? g.flatMap(gn => a.map(an => `${gn} ${an}`)) : [];
  };

  // ---- gender toggles ----
  const toggleGender = (idx, gender) => {
    const item = getItem(idx);
    const cur = item.genders || [];
    const ages = item.ageGroups || [];
    const activeCats = getActiveCategories(idx);
    const exists = cur.includes(gender);
    let nextG, nextC;
    if (exists) {
      nextG = cur.filter(g => g !== gender);
      nextC = activeCats.filter(c => !c.startsWith(`${gender} `));
    } else {
      nextG = [...cur, gender];
      const newPerms = ages.map(a => `${gender} ${a}`).filter(c => !activeCats.includes(c));
      nextC = [...activeCats, ...newPerms];
    }
    updateItem(idx, { genders: nextG, categories: nextC });
  };

  const setGenderPreset = (idx, preset) => {
    const item = getItem(idx);
    const ages = item.ageGroups || [];
    let nextG = [];
    if (preset === 'mixed-only') nextG = ['Mixed'];
    else if (preset === 'boys-girls') nextG = ['Boys', 'Girls'];
    else if (preset === 'all') nextG = ['Boys', 'Girls', 'Mixed'];
    const nextC = nextG.flatMap(g => ages.map(a => `${g} ${a}`));
    updateItem(idx, { genders: nextG, categories: nextC });
  };

  const addCustomGender = (idx) => {
    const val = (customGenderInput[idx] || '').trim();
    if (!val) return;
    const item = getItem(idx);
    if (!(item.genders || []).includes(val)) toggleGender(idx, val);
    setCustomGenderInput(p => ({ ...p, [idx]: '' }));
  };

  // ---- age group toggles ----
  const toggleAge = (idx, age) => {
    const item = getItem(idx);
    const curAges = item.ageGroups || [];
    const genders = item.genders || [];
    const activeCats = getActiveCategories(idx);
    const exists = curAges.includes(age);
    let nextA, nextC;
    if (exists) {
      nextA = curAges.filter(a => a !== age);
      nextC = activeCats.filter(c => !c.endsWith(` ${age}`));
    } else {
      nextA = [...curAges, age];
      const newPerms = genders.map(g => `${g} ${age}`).filter(c => !activeCats.includes(c));
      nextC = [...activeCats, ...newPerms];
    }
    updateItem(idx, { ageGroups: nextA, categories: nextC });
  };

  const setAgePreset = (idx, preset) => {
    const item = getItem(idx);
    const genders = item.genders || [];
    let nextA = [];
    if (preset === 'u9-u10') nextA = ['Under 9 (U9)', 'Under 10 (U10)'];
    else if (preset === 'juniors') nextA = ['Under 9 (U9)', 'Under 10 (U10)', 'Under 11 (U11)', 'Under 12 (U12)'];
    else if (preset === 'seniors') nextA = ['Under 13 (U13)', 'Under 14 (U14)', 'Under 15 (U15)', 'Under 16 (U16)', 'Under 17 (U17)'];
    else if (preset === 'all') nextA = [...STANDARD_AGE_GROUPS];
    const nextC = genders.flatMap(g => nextA.map(a => `${g} ${a}`));
    updateItem(idx, { ageGroups: nextA, categories: nextC });
  };

  const addCustomAge = (idx) => {
    const val = (customAgeInput[idx] || '').trim();
    if (!val) return;
    const item = getItem(idx);
    if (!(item.ageGroups || []).includes(val)) toggleAge(idx, val);
    setCustomAgeInput(p => ({ ...p, [idx]: '' }));
  };

  // ---- category toggles ----
  const toggleCategory = (idx, cat) => {
    const activeCats = getActiveCategories(idx);
    const next = activeCats.includes(cat) ? activeCats.filter(c => c !== cat) : [...activeCats, cat];
    updateItem(idx, { categories: next });
  };

  const addCustomCategory = (idx) => {
    const val = (customCatInput[idx] || '').trim();
    if (!val) return;
    const activeCats = getActiveCategories(idx);
    if (!activeCats.includes(val)) updateItem(idx, { categories: [...activeCats, val] });
    setCustomCatInput(p => ({ ...p, [idx]: '' }));
  };

  // ---- add event to queue ----
  const addEvent = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const already = queue.findIndex(q => q.name.toLowerCase() === trimmed.toLowerCase());
    if (already !== -1) {
      setExpandedIdx(already);
      setDraftName('');
      return;
    }
    const newIdx = queue.length;
    onQueueChange([...queue, { name: trimmed, genders: [], ageGroups: [], categories: [] }]);
    setExpandedIdx(newIdx);
    setDraftName('');
  };

  const removeEvent = (idx) => {
    const next = queue.filter((_, i) => i !== idx);
    onQueueChange(next);
    if (expandedIdx === idx) setExpandedIdx(null);
    else if (expandedIdx > idx) setExpandedIdx(prev => prev - 1);
  };

  const configuredCount = queue.filter((item, idx) => getActiveCategories(idx).length > 0).length;

  return (
    <div className="col-span-1 md:col-span-2 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            📋 Event Queue
            {queue.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                configuredCount === queue.length
                  ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800'
                  : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
              }`}>
                {configuredCount}/{queue.length} Configured
              </span>
            )}
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Add events one at a time, configure genders &amp; age groups for each, then generate everything at once.
          </p>
        </div>
        {queue.length > 0 && (
          <button
            type="button"
            onClick={() => onQueueChange([])}
            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-semibold cursor-pointer whitespace-nowrap"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Add Event Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Trophy size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEvent(draftName); } }}
            placeholder={isSwimsport ? 'Type event e.g. Freestyle 50m, Butterfly 100m...' : 'Type event e.g. 100m, High Jump, Shot Put...'}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <button
          type="button"
          onClick={() => addEvent(draftName)}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          + Add Event
        </button>
      </div>

      {/* Quick-Select Suggestions */}
      <div className="border border-gray-150 dark:border-gray-800 rounded-lg p-3 bg-gray-50/20 dark:bg-gray-900/10 space-y-2.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Quick Select Events</span>
        <div className="space-y-2">
          {suggestionGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">{group.group}</span>
              <div className="flex flex-wrap gap-1">
                {(group.events || []).map((sug, sIdx) => {
                  const alreadyQueued = queue.some(q => q.name.toLowerCase() === sug.toLowerCase());
                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => addEvent(sug)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                        alreadyQueued
                          ? 'bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {alreadyQueued ? `✓ ${sug}` : `+ ${sug}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-purple-200 dark:border-purple-800/60 bg-purple-50/10 dark:bg-purple-950/10 text-center">
          <Trophy className="w-7 h-7 mx-auto text-purple-400 mb-2 opacity-60" />
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">No events queued yet</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Type an event name above or click a suggestion. Each event gets its own gender &amp; age group configuration.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((item, idx) => {
            const activeCats = getActiveCategories(idx);
            const perms = allPermutations(idx);
            const isExpanded = expandedIdx === idx;
            const isConfigured = activeCats.length > 0;
            const isMedleyOrRelay = /medley(\s+relay)?/i.test(item.name) || /mixed(\s+relay)?/i.test(item.name);
            const displayedGenders = Array.from(new Set([...STANDARD_GENDERS, ...(item.genders || [])]));
            const displayedAges = Array.from(new Set([...STANDARD_AGE_GROUPS, ...(item.ageGroups || [])]));

            return (
              <div
                key={`${item.name}-${idx}`}
                className={`rounded-xl border transition-all duration-200 ${
                  isConfigured
                    ? 'border-purple-200 dark:border-purple-800/50 bg-purple-50/10 dark:bg-purple-950/10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                }`}
              >
                {/* Row header */}
                <div className="flex items-center gap-2 px-3.5 py-2.5">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isConfigured ? 'bg-green-500' : 'bg-amber-400'}`} />

                  {/* Event name + heat count */}
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="flex-1 text-left flex items-center gap-2 group cursor-pointer"
                  >
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {item.name}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isConfigured
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {activeCats.length} {activeCats.length === 1 ? 'Heat' : 'Heats'}
                    </span>
                    {!isConfigured && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">⚠ Not configured</span>
                    )}
                  </button>

                  {/* Configured heats preview (collapsed) */}
                  {isConfigured && !isExpanded && (
                    <div className="hidden sm:flex flex-wrap gap-1 max-w-[280px] overflow-hidden">
                      {activeCats.slice(0, 3).map(cat => (
                        <span key={cat} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium">{cat}</span>
                      ))}
                      {activeCats.length > 3 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-medium">+{activeCats.length - 3} more</span>
                      )}
                    </div>
                  )}

                  {/* Expand / Delete buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="text-[11px] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold cursor-pointer transition-colors"
                    >
                      {isExpanded ? '▲ Close' : '✏ Configure'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEvent(idx)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 cursor-pointer transition-colors text-sm font-bold"
                      title={`Remove ${item.name} from queue`}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Expanded configuration panel */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 border-t border-gray-100 dark:border-gray-800 space-y-3 pt-3">

                    {/* Genders row */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-600 dark:text-gray-300">👥 Genders:</span>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-gray-400">Quick:</span>
                          {isMedleyOrRelay ? (
                            <button type="button" onClick={() => setGenderPreset(idx, 'mixed-only')} className="px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold cursor-pointer">Mixed Only</button>
                          ) : (
                            <>
                              <button type="button" onClick={() => setGenderPreset(idx, 'boys-girls')} className="px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold cursor-pointer">Boys &amp; Girls</button>
                              <button type="button" onClick={() => setGenderPreset(idx, 'all')} className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-semibold cursor-pointer">All</button>
                            </>
                          )}
                          <button type="button" onClick={() => updateItem(idx, { genders: [], categories: [] })} className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-400 font-semibold cursor-pointer">Clear</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {displayedGenders.map(g => {
                          const isSel = (item.genders || []).includes(g);
                          const isMixed = g.toLowerCase() === 'mixed';
                          const isBoy = g.toLowerCase() === 'boys' || g.toLowerCase() === 'men';
                          const isGirl = g.toLowerCase() === 'girls' || g.toLowerCase() === 'women';
                          const activeStyle = isMixed
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                            : isBoy ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                            : isGirl ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200 border-purple-300 dark:border-purple-700';
                          return (
                            <button key={g} type="button" onClick={() => toggleGender(idx, g)}
                              className={`text-[11px] px-2.5 py-0.5 rounded-md transition-all font-semibold border cursor-pointer ${
                                isSel ? `${activeStyle} shadow-2xs` : 'bg-gray-50 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                              }`}
                            >
                              {isSel ? `✓ ${g}` : `+ ${g}`}
                            </button>
                          );
                        })}
                        <div className="flex items-center gap-1">
                          <input type="text" value={customGenderInput[idx] || ''}
                            onChange={e => setCustomGenderInput(p => ({ ...p, [idx]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomGender(idx); } }}
                            placeholder="+ Custom..."
                            className="w-20 px-1.5 py-0.5 text-[11px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          {customGenderInput[idx] && (
                            <button type="button" onClick={() => addCustomGender(idx)} className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold cursor-pointer">Add</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Age Groups row */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-600 dark:text-gray-300">🎂 Age Groups:</span>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-gray-400">Quick:</span>
                          <button type="button" onClick={() => setAgePreset(idx, 'u9-u10')} className="px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold cursor-pointer">U9 &amp; U10</button>
                          <button type="button" onClick={() => setAgePreset(idx, 'juniors')} className="px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold cursor-pointer">U9–U12</button>
                          <button type="button" onClick={() => setAgePreset(idx, 'seniors')} className="px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold cursor-pointer">U13–U17</button>
                          <button type="button" onClick={() => setAgePreset(idx, 'all')} className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-semibold cursor-pointer">All</button>
                          <button type="button" onClick={() => updateItem(idx, { ageGroups: [], categories: [] })} className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-400 font-semibold cursor-pointer">Clear</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {displayedAges.map(ag => {
                          const isSel = (item.ageGroups || []).includes(ag);
                          return (
                            <button key={ag} type="button" onClick={() => toggleAge(idx, ag)}
                              className={`text-[11px] px-2 py-0.5 rounded-md transition-all font-medium border cursor-pointer ${
                                isSel
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-semibold shadow-2xs'
                                  : 'bg-gray-50 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                              }`}
                            >
                              {isSel ? `✓ ${ag}` : `+ ${ag}`}
                            </button>
                          );
                        })}
                        <div className="flex items-center gap-1">
                          <input type="text" value={customAgeInput[idx] || ''}
                            onChange={e => setCustomAgeInput(p => ({ ...p, [idx]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAge(idx); } }}
                            placeholder="+ Custom..."
                            className="w-20 px-1.5 py-0.5 text-[11px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          {customAgeInput[idx] && (
                            <button type="button" onClick={() => addCustomAge(idx)} className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold cursor-pointer">Add</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Active Heats matrix */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/50 space-y-1.5 bg-gray-50/50 dark:bg-gray-950/20 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-700 dark:text-gray-300">🏊 Active Heats ({activeCats.length}):</span>
                        <div className="flex items-center gap-1 text-[10px]">
                          {perms.length > 0 && (
                            <button type="button" onClick={() => updateItem(idx, { categories: perms })} className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-600 dark:text-gray-300 font-semibold cursor-pointer">All ({perms.length})</button>
                          )}
                          {activeCats.length > 0 && (
                            <button type="button" onClick={() => updateItem(idx, { categories: [] })} className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-400 font-semibold cursor-pointer">Clear Heats</button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCats.length === 0 ? (
                          <span className="text-[11px] text-gray-400 italic">Select Genders and Age Groups above to auto-generate heats, or add custom heats below.</span>
                        ) : (
                          activeCats.map(cat => {
                            const isMixedC = cat.toLowerCase().includes('mixed');
                            const isBoyC = cat.toLowerCase().includes('boys') || cat.toLowerCase().includes('men');
                            const isGirlC = cat.toLowerCase().includes('girls') || cat.toLowerCase().includes('women');
                            const chipStyle = isMixedC
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700'
                              : isBoyC ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700'
                              : isGirlC ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700'
                              : 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700';
                            return (
                              <button key={cat} type="button" onClick={() => toggleCategory(idx, cat)}
                                className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 font-semibold ${chipStyle}`}
                                title={`Click to remove: ${cat}`}
                              >
                                {cat} <span className="text-gray-400 hover:text-red-500 font-bold ml-0.5">×</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                      {/* Custom heat adder */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <input type="text" value={customCatInput[idx] || ''}
                          onChange={e => setCustomCatInput(p => ({ ...p, [idx]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(idx); } }}
                          placeholder="Add custom heat (e.g. Mixed U9, Staff Relay)..."
                          className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                        <button type="button" onClick={() => addCustomCategory(idx)} className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors cursor-pointer">+ Add Heat</button>
                      </div>
                    </div>

                    {/* Done CTA */}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`text-[11px] font-semibold ${
                        isConfigured ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {isConfigured
                          ? `✓ ${activeCats.length} heat${activeCats.length !== 1 ? 's' : ''} configured`
                          : '⚠ Configure at least one heat to include this event in generation'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(null)}
                        className="text-xs px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer transition-colors"
                      >
                        Done ✓
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Queue summary status strip */}
      {queue.length > 0 && (
        <div className={`p-3 rounded-xl border text-xs font-medium ${
          configuredCount === queue.length
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300'
            : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300'
        }`}>
          {configuredCount === queue.length
            ? `✅ All ${queue.length} event${queue.length !== 1 ? 's' : ''} fully configured — ready to Preview & Generate!`
            : `⚠ ${queue.length - configuredCount} event${queue.length - configuredCount !== 1 ? 's' : ''} still need gender/age group configuration before generating.`
          }
        </div>
      )}
    </div>
  );
}

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

function parseErrorDetails(error, context) {
  const err = String(error || '').toLowerCase();

  // 1. Missing events (Placement sport)
  if (err.includes('event') && (err.includes('least 1') || err.includes('enter') || err.includes('select') || err.includes('required'))) {
    return {
      type: 'missing_events',
      badge: 'Events Needed',
      title: 'No Events Selected or Added',
      explanation: 'You are scheduling a placement sport (such as Swimming or Athletics), but no race or event names were entered.',
      guidance: 'Type or click events in the Events box above (e.g. "Freestyle 25m", "Medley Relay 4x25m", "100m") so the system knows what to schedule.',
      actions: [
        {
          label: 'Focus Events Input',
          primary: true,
          onClick: () => {
            const el = document.getElementById('step-format-events');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const input = el?.querySelector('input');
            if (input) input.focus();
          }
        }
      ]
    };
  }

  // 2. Events added, but no heats / genders / age groups selected
  if (err.includes('genders and age groups') || err.includes('heats') || (err.includes('gender') && err.includes('age'))) {
    return {
      type: 'missing_heats',
      badge: 'Heats Required',
      title: 'No Genders or Age Groups Selected for Events',
      explanation: 'The events you added do not have any active heats yet. The scheduler needs to know which categories or age groups each event runs.',
      guidance: 'For each event card above, select at least one Gender (Boys, Girls, Mixed) and Age Group (U9, U10), or use one of the quick 1-click presets.',
      actions: [
        {
          label: '⚡ Auto-Configure Junior Heats (U9-U12)',
          primary: true,
          onClick: () => {
            const events = context.parseEvents();
            const newConfigs = { ...context.eventConfigs };
            const defaultAges = ['Under 9 (U9)', 'Under 10 (U10)', 'Under 11 (U11)', 'Under 12 (U12)'];
            events.forEach(ev => {
              const isRelay = /medley|relay|mixed/i.test(ev);
              const genders = isRelay ? ['Mixed'] : ['Boys', 'Girls'];
              newConfigs[ev] = {
                genders,
                ageGroups: defaultAges,
                categories: genders.flatMap(g => defaultAges.map(a => `${g} ${a}`))
              };
            });
            context.setEventConfigs(newConfigs);
            context.onDismiss();
          }
        },
        {
          label: 'Scroll to Events',
          onClick: () => {
            const el = document.getElementById('step-format-events');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      ]
    };
  }

  // 3. Concurrency exceeds venue count
  if (err.includes('cannot exceed the number of venues') || (err.includes('exceed') && err.includes('venues'))) {
    const venuesCount = Math.max(1, context.parseVenues().length);
    return {
      type: 'concurrency_exceeds_venues',
      badge: 'Capacity Exceeded',
      title: 'Simultaneous Events Exceed Venue Count',
      explanation: `You configured ${context.form.concurrent} events/matches per round, but only ${venuesCount} venue(s) are allocated.`,
      guidance: `Venues represent physical grounds. You cannot run ${context.form.concurrent} events at the exact same time with only ${venuesCount} venue(s). Either reduce Events Per Round to match your venues, or add more venues.`,
      actions: [
        {
          label: `Set to ${venuesCount} Event${venuesCount > 1 ? 's' : ''} Per Round (Recommended)`,
          primary: true,
          onClick: () => {
            context.handleChange('concurrent', venuesCount);
            context.onDismiss();
          }
        },
        ...(context.registeredVenues && context.registeredVenues.length > venuesCount ? [{
          label: `Select All Registered Venues (${context.registeredVenues.length})`,
          onClick: () => {
            context.handleChange('venues', context.registeredVenues.map(v => v.name).join(', '));
            context.onDismiss();
          }
        }] : [])
      ]
    };
  }

  // 4. Not enough teams for concurrent matches
  if (err.includes('requires at least') && err.includes('teams')) {
    const teamsCount = context.parseTeams().length;
    const concurrentNum = parseInt(context.form.concurrent) || 1;
    const needed = concurrentNum * 2;
    const maxPossibleConcurrent = Math.max(1, Math.floor(teamsCount / 2));
    return {
      type: 'insufficient_teams',
      badge: 'Team Capacity',
      title: 'Not Enough Teams for Concurrency',
      explanation: `Running ${concurrentNum} simultaneous matches requires at least ${needed} teams playing at the same time, but only ${teamsCount} team(s) were found.`,
      guidance: `Add at least ${needed} teams in the Teams selector above, or lower Matches Per Round to ${maxPossibleConcurrent}.`,
      actions: [
        ...(context.registeredTeams && context.registeredTeams.length >= needed ? [{
          label: `Use All Registered Teams (${context.registeredTeams.length})`,
          primary: true,
          onClick: () => {
            context.handleChange('teams', context.registeredTeams.map(t => t.code).join(', '));
            context.onDismiss();
          }
        }] : []),
        {
          label: `Set to ${maxPossibleConcurrent} Match${maxPossibleConcurrent > 1 ? 'es' : ''} Per Round`,
          primary: true,
          onClick: () => {
            context.handleChange('concurrent', maxPossibleConcurrent);
            context.onDismiss();
          }
        }
      ]
    };
  }

  // 5. Missing venues
  if (err.includes('venue') && (err.includes('least 1') || err.includes('required') || err.includes('allocate'))) {
    return {
      type: 'missing_venues',
      badge: 'Venue Required',
      title: 'No Venues Allocated',
      explanation: 'Every schedule requires at least one designated venue (pool, pitch, court, or track) where fixtures take place.',
      guidance: 'Enter a venue name (e.g. "Main Pool", "Track 1") in the Venues box or choose from registered venues.',
      actions: [
        ...(context.registeredVenues && context.registeredVenues.length > 0 ? [{
          label: `Select Registered Venue (${context.registeredVenues[0].name})`,
          primary: true,
          onClick: () => {
            context.handleChange('venues', context.registeredVenues.map(v => v.name).join(', '));
            context.onDismiss();
          }
        }] : [{
          label: 'Set Default Venue ("Main Arena")',
          primary: true,
          onClick: () => {
            context.handleChange('venues', 'Main Arena');
            context.onDismiss();
          }
        }])
      ]
    };
  }

  // 6. Missing sport
  if (err.includes('sport') && err.includes('required')) {
    return {
      type: 'missing_sport',
      badge: 'Sport Required',
      title: 'Sport Name Missing',
      explanation: 'Please select an existing sport or enter a sport name above.',
      guidance: 'Selecting a sport allows the system to determine match durations, rules, and appropriate ground assignments.',
      actions: [
        ...(context.sports && context.sports.length > 0 ? [{
          label: `Select "${context.sports[0].name}"`,
          primary: true,
          onClick: () => {
            context.handleChange('sport', context.sports[0].name);
            context.onDismiss();
          }
        }] : [])
      ]
    };
  }

  // 7. General fallback
  return {
    type: 'general',
    badge: 'Configuration Check',
    title: 'Scheduling Parameters Need Attention',
    explanation: error,
    guidance: 'Please review your parameters above. Ensure sport, venues, and team/event details are complete and consistent.',
    actions: [
      {
        label: 'Dismiss & Review',
        primary: false,
        onClick: context.onDismiss
      }
    ]
  };
}

function ScheduleErrorGuide({
  error,
  onDismiss,
  form,
  handleChange,
  eventConfigs,
  setEventConfigs,
  registeredTeams,
  registeredVenues,
  sports,
  parseEvents,
  parseVenues,
  parseTeams,
  isPlacementSport,
  schedulerMode
}) {
  if (!error) return null;

  const details = parseErrorDetails(error, {
    form,
    handleChange,
    eventConfigs,
    setEventConfigs,
    registeredTeams,
    registeredVenues,
    sports,
    parseEvents,
    parseVenues,
    parseTeams,
    isPlacementSport,
    schedulerMode,
    onDismiss
  });

  return (
    <div className="mt-5 p-4 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/25 shadow-xs space-y-3 animate-in fade-in duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/70 text-red-700 dark:text-red-300">
                {details.badge}
              </span>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                {details.title}
              </h4>
            </div>
            <p className="text-xs text-red-700/90 dark:text-red-300/90 font-medium leading-relaxed">
              {details.explanation}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-2 py-1 rounded cursor-pointer font-bold shrink-0"
          title="Dismiss guidance"
        >
          ✕
        </button>
      </div>

      {/* Suggested Way Forward Box */}
      <div className="p-3 rounded-lg bg-white/90 dark:bg-gray-900/90 border border-red-100 dark:border-red-900/40 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Recommended Next Steps:</span>
        </div>
        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed pl-5.5">
          {details.guidance}
        </p>

        {/* Actionable Solution Buttons */}
        {details.actions && details.actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 pl-5.5">
            {details.actions.map((act, idx) => (
              <button
                key={idx}
                type="button"
                onClick={act.onClick}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  act.primary
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700'
                }`}
              >
                <span>{act.label}</span>
                <ArrowRight className="w-3 h-3 opacity-70" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GeneratePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { data: registeredVenues } = useVenues();
  const { data: sports, isLoading: loadingSports } = useSports();
  const { data: registeredTeams } = useTeams();
  const [initializedTeams, setInitializedTeams] = useState(false);
  const [showNextSportModal, setShowNextSportModal] = useState(false);
  const [form, setForm] = useState({
    teams: '',
    events: '',
    genders: '',
    ageGroups: '',
    sport: '',
    startDate: getLocalDateTimeString(),
    duration: 10,
    breakTime: 0,
    format: 'single',
    venues: 'BB Court',
    concurrent: 1,
    groupCount: 2,
  });
  const [eventConfigs, setEventConfigs] = useState({});

  // ── Event Queue (Option A) ──
  // Array of { name, genders, ageGroups, categories } — one entry per event
  const [eventQueue, setEventQueue] = useState([]);

  // Keep eventQueue and legacy eventConfigs in sync so existing logic keeps working
  const syncEventQueueToConfigs = (queue) => {
    const configs = {};
    queue.forEach(item => {
      configs[item.name] = {
        genders: item.genders || [],
        ageGroups: item.ageGroups || [],
        categories: item.categories || []
      };
    });
    setEventConfigs(configs);
  };

  const handleEventQueueChange = (newQueue) => {
    setEventQueue(newQueue);
    syncEventQueueToConfigs(newQueue);
    setPreview(null);
    setSaved(false);
    setError(null);
  };

  // Multi-Sport Day master teams state
  const [multiTeams, setMultiTeams] = useState('');
  const [customizingSport, setCustomizingSport] = useState(null);

  useEffect(() => {
    if (registeredTeams && registeredTeams.length > 0 && !initializedTeams) {
      const userTeamsStr = registeredTeams.map(t => t.code).join(', ');
      setForm(prev => ({ ...prev, teams: userTeamsStr }));
      setMultiTeams(userTeamsStr);
      setInitializedTeams(true);
    }
  }, [registeredTeams, initializedTeams]);

  // Scheduler Modes: 'single' | 'dual_athletics' | 'multi_sport'
  const [schedulerMode, setSchedulerMode] = useState('single');

  // Dual-Stream Athletics dedicated venue inputs
  const [trackVenues, setTrackVenues] = useState('Athletics Track 1, Athletics Track 2');
  const [fieldVenues, setFieldVenues] = useState('Field Pit 1');

  // Multi-Sport Day states (do not populate dummy teams not added by user)
  const [multiSports, setMultiSports] = useState([
    { name: 'Athletics', enabled: true, duration: 15, events: '100m, 200m, High Jump, Shot Put', genders: 'Boys, Girls', ageGroups: 'Under 13 (U13), Under 15 (U15)' },
    { name: 'Soccer', enabled: true, duration: 30, teams: '' },
    { name: 'Basketball', enabled: true, duration: 20, teams: '' },
    { name: 'Cricket', enabled: true, duration: 35, teams: '' },
    { name: 'Rugby', enabled: true, duration: 25, teams: '' },
    { name: 'Tennis', enabled: true, duration: 25, teams: '' },
    { name: 'Volleyball', enabled: false, duration: 20, teams: '' }
  ]);
  const [multiVenues, setMultiVenues] = useState('Athletics Track 1, Field Pit 1, Soccer Pitch A, Basketball Court 1, Cricket Oval, Rugby Pitch, Tennis Court 1');
  const [multiFormat, setMultiFormat] = useState('single');
  const [multiConcurrent, setMultiConcurrent] = useState(1);

  const parseMultiVenues = () => multiVenues ? multiVenues.split(',').map(v => v.trim()).filter(Boolean) : [];

  const handleToggleMultiVenue = (venueName) => {
    const list = parseMultiVenues();
    const isSelected = list.some(v => v.toUpperCase() === venueName.toUpperCase());
    let updated;
    if (isSelected) {
      updated = list.filter(v => v.toUpperCase() !== venueName.toUpperCase());
    } else {
      updated = [...list, venueName];
    }
    setMultiVenues(updated.join(', '));
  };

  const handleSelectAllRegisteredVenuesMulti = () => {
    if (registeredVenues && registeredVenues.length > 0) {
      setMultiVenues(registeredVenues.map(v => v.name).join(', '));
    }
  };

  const handleClearMultiVenues = () => {
    setMultiVenues('');
  };

  const loadDualStreamScenario = () => {
    setSchedulerMode('dual_athletics');
    const athSport = sports?.find(s => s.scoring_type === 'placement' || s.name.toLowerCase().includes('athletics')) || { name: 'Athletics' };
    setTrackVenues('Athletics Track 1, Athletics Track 2');
    setFieldVenues('Field Pit 1');
    const teamsToUse = form.teams || (registeredTeams && registeredTeams.length > 0 ? registeredTeams.map(t => t.code).join(', ') : '');
    setForm(prev => ({
      ...prev,
      teams: teamsToUse,
      sport: athSport.name,
      format: 'placement',
      events: '100m, 200m, 400m, High Jump, Shot Put, Long Jump',
      genders: 'Boys, Girls',
      ageGroups: 'Under 13 (U13), Under 15 (U15)',
      venues: 'Athletics Track 1, Athletics Track 2, Field Pit 1',
      concurrent: 3,
      duration: 15,
      breakTime: 5
    }));
    showToast('Loaded 2 Track + 1 Field Dual-Stream Scenario! Click Preview Schedule to test.', 'info');
  };

  const loadMultiSportScenario = () => {
    setSchedulerMode('multi_sport');
    setMultiSports([
      { name: 'Athletics', enabled: true, duration: 15, events: '100m, 200m, High Jump, Shot Put', genders: 'Boys, Girls', ageGroups: 'Under 13 (U13), Under 15 (U15)' },
      { name: 'Soccer', enabled: true, duration: 30, teams: '' },
      { name: 'Basketball', enabled: true, duration: 20, teams: '' },
      { name: 'Cricket', enabled: true, duration: 35, teams: '' },
      { name: 'Rugby', enabled: true, duration: 25, teams: '' },
      { name: 'Tennis', enabled: true, duration: 25, teams: '' },
      { name: 'Volleyball', enabled: false, duration: 20, teams: '' }
    ]);
    const teamsToUse = registeredTeams && registeredTeams.length > 0 ? registeredTeams.map(t => t.code).join(', ') : '';
    setMultiTeams(teamsToUse);
    const userVenues = registeredVenues && registeredVenues.length > 0
      ? registeredVenues.map(v => v.name).join(', ')
      : 'Athletics Track 1, Field Pit 1, Soccer Pitch A, Basketball Court 1, Cricket Oval, Rugby Pitch, Tennis Court 1';
    setMultiVenues(userVenues);
    setMultiFormat('single');
    setMultiConcurrent(1);
    showToast('Loaded Multi-Sport Day with your registered teams! Click Preview Schedule to test.', 'info');
  };

  const selectedSportObj = sports?.find(s => s.name === form.sport);
  const isPlacementSport = selectedSportObj?.scoring_type === 'placement' || schedulerMode === 'dual_athletics';

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);

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
    const effectiveSport = form.sport || (isPlacementSport || schedulerMode === 'dual_athletics' ? 'Athletics' : (sports?.[0]?.name || ''));

    if (!effectiveSport) {
      throw new Error('Sport name is required. Please select a sport from the dropdown, type a custom sport name, or add a sport in Settings > Sports & Venues.');
    }

    if (isPlacementSport) {
      // Use eventQueue (Option A) as the source of truth when it has items;
      // fall back to the legacy form.events + eventConfigs for Dual-Stream mode
      const usesQueue = schedulerMode === 'single' && eventQueue.length > 0;

      let events, resolvedEventConfigs;
      if (usesQueue) {
        // Validate queue has at least one configured event
        const configuredItems = eventQueue.filter(item => (item.categories || []).length > 0);
        if (eventQueue.length === 0) {
          throw new Error('Please add at least one event to the queue.');
        }
        if (configuredItems.length === 0) {
          throw new Error('Please configure genders and age groups (or add heats) for at least one queued event.');
        }
        events = eventQueue.map(item => item.name);
        resolvedEventConfigs = {};
        eventQueue.forEach(item => {
          resolvedEventConfigs[item.name] = {
            genders: item.genders || [],
            ageGroups: item.ageGroups || [],
            categories: item.categories || []
          };
        });
      } else {
        // Legacy path (dual_athletics mode or fallback)
        events = parseEvents();
        resolvedEventConfigs = eventConfigs;
        if (events.length === 0) {
          throw new Error('Please select or add at least one event.');
        }
      }

      // Aggregate genders & age groups across all events for the summary fields
      let totalCategoriesCount = 0;
      const allGendersSet = new Set();
      const allAgeGroupsSet = new Set();

      events.forEach(ev => {
        const cfg = resolvedEventConfigs[ev];
        if (cfg?.categories && Array.isArray(cfg.categories) && cfg.categories.length > 0) {
          totalCategoriesCount += cfg.categories.length;
        } else if (cfg?.genders?.length > 0 && cfg?.ageGroups?.length > 0) {
          totalCategoriesCount += cfg.genders.length * cfg.ageGroups.length;
        }
        (cfg?.genders || []).forEach(g => allGendersSet.add(g));
        (cfg?.ageGroups || []).forEach(a => allAgeGroupsSet.add(a));
      });

      if (totalCategoriesCount === 0) {
        throw new Error('Please select genders and age groups (or add heats) for at least one event.');
      }

      const effectiveGenders = allGendersSet.size > 0 ? Array.from(allGendersSet) : ['Open'];
      const effectiveAgeGroups = allAgeGroupsSet.size > 0 ? Array.from(allAgeGroupsSet) : ['Open'];

      if (venues.length === 0) {
        throw new Error('Please enter at least one venue.');
      }
      if (concurrent > venues.length) {
        throw new Error(`Events Per Round (${concurrent}) cannot exceed the number of venues (${venues.length}).`);
      }

      return {
        events,
        genders: effectiveGenders,
        ageGroups: effectiveAgeGroups,
        eventConfigs: resolvedEventConfigs,
        sport: effectiveSport,
        startDate: form.startDate,
        durationMinutes: parseInt(form.duration),
        breakMinutes: parseInt(form.breakTime),
        format: form.format,
        venues,
        concurrent,
        teams: parseTeams()
      };
    }

    const teams = parseTeams();
    if (form.format === 'playoff' && teams.length !== 4 && teams.length !== 8) {
      throw new Error('Playoff format currently requires exactly 4 or 8 teams.');
    }

    validateParams(teams, venues, concurrent);

    const payload = {
      teams,
      sport: effectiveSport,
      startDate: form.startDate,
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
      if (schedulerMode === 'multi_sport') {
        const activeSports = multiSports.filter(s => s.enabled).map(s => {
          if (s.name === 'Athletics') {
            return {
              name: s.name,
              format: 'placement',
              durationMinutes: parseInt(s.duration) || 15,
              concurrent: parseInt(s.concurrent) || parseInt(multiConcurrent) || 2,
              events: s.events.split(',').map(x => x.trim()).filter(Boolean),
              genders: s.genders.split(',').map(x => x.trim()).filter(Boolean),
              ageGroups: s.ageGroups.split(',').map(x => x.trim()).filter(Boolean)
            };
          }
          const effectiveTeamsStr = (s.teams && s.teams.trim().length > 0) ? s.teams : multiTeams;
          const parsedTeams = effectiveTeamsStr.split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
          return {
            name: s.name,
            format: s.format || multiFormat || 'single',
            concurrent: parseInt(s.concurrent) || parseInt(multiConcurrent) || 1,
            durationMinutes: parseInt(s.duration) || 25,
            teams: parsedTeams
          };
        });

        const missingTeamsSport = activeSports.find(s => s.name !== 'Athletics' && (!s.teams || s.teams.length < 2));
        if (missingTeamsSport) {
          throw new Error(`Sport "${missingTeamsSport.name}" requires at least 2 participating teams. Please select teams in the Master Teams selector above or customize this sport.`);
        }
        const vList = multiVenues.split(',').map(x => x.trim()).filter(Boolean);
        if (vList.length === 0) {
          throw new Error('Please allocate at least one venue for Multi-Sport Day.');
        }
        const res = await generateApi.previewMultiSport({
          sports: activeSports,
          venues: vList,
          startDate: form.startDate,
          breakMinutes: parseInt(form.breakTime) || 5,
          format: multiFormat || 'single',
          concurrent: parseInt(multiConcurrent) || 1
        });
        setPreview(res.data);
      } else if (schedulerMode === 'dual_athletics') {
        const tVenues = trackVenues.split(',').map(x => x.trim()).filter(Boolean);
        const fVenues = fieldVenues.split(',').map(x => x.trim()).filter(Boolean);
        const combinedVenues = [...tVenues, ...fVenues];
        if (combinedVenues.length === 0) {
          throw new Error('Please configure at least 1 Track or Field venue.');
        }
        const payload = buildPayload();
        const res = await generateApi.preview({
          ...payload,
          venues: combinedVenues,
          concurrent: combinedVenues.length
        });
        setPreview(res.data);
      } else {
        const res = await generateApi.preview(buildPayload());
        setPreview(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFixture = (index, field, value) => {
    setPreview(prev => {
      if (!prev) return prev;
      const updatedFixtures = [...prev.fixtures];
      const fix = { ...updatedFixtures[index] };

      if (field === 'scheduled_at') {
        fix.scheduled_at = value;
        const duration = fix.duration || form.duration || 10;
        const start = new Date(value);
        const end = new Date(start.getTime() + duration * 60 * 1000);
        const pad = (n) => String(n).padStart(2, '0');
        fix.end_time = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}:00`;
      } else if (field === 'venue') {
        const vObj = registeredVenues.find(v => String(v.id) === String(value));
        if (vObj) {
          fix.venue_id = vObj.id;
          fix.venue = vObj.name;
        }
      } else if (field === 'round') {
        fix.round = value;
      } else if (field === 'notes') {
        fix.notes = value;
      }

      updatedFixtures[index] = fix;
      return { ...prev, fixtures: updatedFixtures };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      if (schedulerMode === 'multi_sport') {
        const activeSports = multiSports.filter(s => s.enabled).map(s => {
          if (s.name === 'Athletics') {
            return {
              name: s.name,
              format: 'placement',
              durationMinutes: parseInt(s.duration) || 15,
              concurrent: parseInt(s.concurrent) || parseInt(multiConcurrent) || 2,
              events: s.events.split(',').map(x => x.trim()).filter(Boolean),
              genders: s.genders.split(',').map(x => x.trim()).filter(Boolean),
              ageGroups: s.ageGroups.split(',').map(x => x.trim()).filter(Boolean)
            };
          }
          const effectiveTeamsStr = (s.teams && s.teams.trim().length > 0) ? s.teams : multiTeams;
          const parsedTeams = effectiveTeamsStr.split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
          return {
            name: s.name,
            format: s.format || multiFormat || 'single',
            concurrent: parseInt(s.concurrent) || parseInt(multiConcurrent) || 1,
            durationMinutes: parseInt(s.duration) || 25,
            teams: parsedTeams
          };
        });

        const missingTeamsSport = activeSports.find(s => s.name !== 'Athletics' && (!s.teams || s.teams.length < 2));
        if (missingTeamsSport) {
          throw new Error(`Sport "${missingTeamsSport.name}" requires at least 2 participating teams. Please select teams in the Master Teams selector above or customize this sport.`);
        }
        const vList = multiVenues.split(',').map(x => x.trim()).filter(Boolean);
        if (vList.length === 0) {
          throw new Error('Please allocate at least one venue for Multi-Sport Day.');
        }
        await generateApi.generateAndSaveMultiSport({
          sports: activeSports,
          venues: vList,
          startDate: form.startDate,
          breakMinutes: parseInt(form.breakTime) || 5,
          format: multiFormat || 'single',
          concurrent: parseInt(multiConcurrent) || 1
        });
        setSaved(true);
        showToast('Multi-sport day schedule saved to database successfully!', 'success');
      } else {
        const effectiveSport = form.sport || (isPlacementSport || schedulerMode === 'dual_athletics' ? 'Athletics' : (sports?.[0]?.name || ''));
        if (!effectiveSport) {
          throw new Error('Sport name is required to save fixtures. Please select or add a sport.');
        }
        const res = await generateApi.saveCustom({
          fixtures: preview.fixtures,
          sport: effectiveSport,
        });
        setSaved(true);
        showToast('Generated fixtures saved to database successfully!', 'success');
        setShowNextSportModal(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFormForNextSport = () => {
    // HOTFIX: Do NOT reset events/eventQueue/eventConfigs — those belong to the
    // previous sport's fixtures that have already been saved. Only reset the
    // sport selection, preview state and status flags so the user can configure
    // a fresh sport without losing previously-saved data.
    setForm(prev => ({
      ...prev,
      sport: '',
      format: 'single',
      // Keep: teams, venues, startDate, duration, breakTime, concurrent
      // Keep: events (legacy field) — do not overwrite with hardcoded defaults
    }));
    // Clear the event queue so user starts fresh for the new sport
    setEventQueue([]);
    setEventConfigs({});
    setPreview(null);
    setSaved(false);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return typeof iso === 'string' ? iso.slice(11, 16) : '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatForDateTimeLocal = (val) => {
    if (!val) return '';
    if (typeof val === 'string' && val.length >= 16 && !val.includes('Z')) {
      return val.substring(0, 16);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return typeof val === 'string' ? val.substring(0, 16) : '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose a scheduling mode below to generate single sport round-robin fixtures, synchronized dual-stream track &amp; field, or a master multi-sport day timeline.
        </p>

        {/* Scheduler Mode Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 mb-6">
          <button
            type="button"
            onClick={() => setSchedulerMode('single')}
            className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              schedulerMode === 'single'
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Wand2 size={16} className={schedulerMode === 'single' ? 'text-purple-600 dark:text-purple-400' : ''} />
            <span>Single Sport Generator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSchedulerMode('dual_athletics');
              const athSport = sports?.find(s => s.scoring_type === 'placement' || s.name.toLowerCase().includes('athletics'))?.name || 'Athletics';
              setForm(prev => ({
                ...prev,
                sport: athSport,
                format: 'placement',
                duration: 15,
                breakTime: 5
              }));
            }}
            className={`flex-1 min-w-[230px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              schedulerMode === 'dual_athletics'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Trophy size={16} />
            <span>Dual-Stream Athletics</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider ${
              schedulerMode === 'dual_athletics' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}>
              Track + Field
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSchedulerMode('multi_sport')}
            className={`flex-1 min-w-[230px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              schedulerMode === 'multi_sport'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Calendar size={16} />
            <span>Multi-Sport Day</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-wider ${
              schedulerMode === 'multi_sport' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
            }`}>
              All Codes
            </span>
          </button>
        </div>

        {/* -------------------- DUAL-STREAM ATHLETICS MODE -------------------- */}
        {schedulerMode === 'dual_athletics' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-amber-900 dark:text-amber-300 flex items-center gap-2">
                  <Trophy size={16} className="text-amber-500" />
                  Dual-Stream Parallel Athletics Engine
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed max-w-xl">
                  Automatically separates Track sprint/distance heats from Field jumps/throws. With 2 Track venues and 1 Field venue, Round 1 runs 2 Track events and 1 Field event at the exact same start time with zero cross-venue clash!
                </p>
              </div>
              <button
                type="button"
                onClick={loadDualStreamScenario}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Zap size={14} />
                Load 2 Track + 1 Field Scenario
              </button>
            </div>

            {/* Active Sport Card for Dual-Stream Athletics */}
            <div className="flex items-center justify-between p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Active Sport:</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{form.sport || 'Athletics'}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">(Track &amp; Field)</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                Placement-Based
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Participating Teams / Houses */}
              <div className="col-span-1 md:col-span-2 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
                <TeamsSelector
                  value={form.teams}
                  onChange={(val) => handleChange('teams', val)}
                  registeredTeams={registeredTeams}
                />
              </div>

              {/* Track Venues */}
              <div className="col-span-1 p-3.5 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-200/70 dark:border-blue-900/30 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    🏃 Track Venues ({trackVenues.split(',').filter(x => x.trim()).length})
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Track heats only</span>
                </div>
                <input
                  type="text"
                  value={trackVenues}
                  onChange={e => setTrackVenues(e.target.value)}
                  placeholder="e.g. Athletics Track 1, Athletics Track 2"
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 text-xs font-medium"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Comma-separated sprint straights or 400m track rings.</p>
              </div>

              {/* Field Venues */}
              <div className="col-span-1 p-3.5 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/70 dark:border-emerald-900/30 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    🎯 Field Venues ({fieldVenues.split(',').filter(x => x.trim()).length})
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Jumps &amp; Throws only</span>
                </div>
                <input
                  type="text"
                  value={fieldVenues}
                  onChange={e => setFieldVenues(e.target.value)}
                  placeholder="e.g. Field Pit 1, High Jump Area, Shot Put Circle"
                  className="w-full px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-900 text-xs font-medium"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Comma-separated sand pits, high jump mats, or throwing cages.</p>
              </div>

              {/* Events */}
              <div className="col-span-1 md:col-span-2">
                <BulkInputManager
                  label="Events (Swimming Strokes or Athletics)"
                  value={form.events}
                  onChange={(val) => handleChange('events', val)}
                  placeholder="Type or click events to add (e.g. 100m, Butterfly 25m, High Jump)..."
                  suggestionGroups={form.sport?.toLowerCase().includes('swim') || form.sport?.toLowerCase().includes('pool') ? [...SWIMMING_EVENTS_GROUPS, ...OLYMPIC_EVENTS_GROUPS] : [...OLYMPIC_EVENTS_GROUPS, ...SWIMMING_EVENTS_GROUPS]}
                  icon={Trophy}
                />
              </div>

              {/* Genders */}
              <div className="col-span-1">
                <BulkInputManager
                  label="Genders"
                  value={form.genders}
                  onChange={(val) => handleChange('genders', val)}
                  placeholder="Boys, Girls, Mixed..."
                  suggestionGroups={GENDER_GROUPS}
                  icon={Users}
                />
              </div>

              {/* Age Groups */}
              <div className="col-span-1">
                <BulkInputManager
                  label="Age Groups"
                  value={form.ageGroups}
                  onChange={(val) => handleChange('ageGroups', val)}
                  placeholder="Under 10 (U10), Under 12 (U12)..."
                  suggestionGroups={AGE_GROUPS}
                  icon={Users}
                />
              </div>

              {/* Event-specific Age Group & Gender Customizer */}
              <EventAgeGroupManager
                events={parseEvents()}
                globalAgeGroups={parseAgeGroups()}
                globalGenders={parseGenders()}
                eventConfigs={eventConfigs}
                onChange={setEventConfigs}
              />

              {/* Start Date & Times */}
              <div className="col-span-1">
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Start Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                />
              </div>

              <div className="col-span-1 flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Duration (mins)</label>
                  <input
                    type="number"
                    min={5}
                    value={form.duration}
                    onChange={(e) => handleChange('duration', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Break (mins)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.breakTime}
                    onChange={(e) => handleChange('breakTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="k-btn bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
              >
                <RotateCcw size={14} />
                {loading ? 'Generating...' : 'Preview Dual-Stream Schedule'}
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
          </div>
        )}

        {/* -------------------- MULTI-SPORT DAY MODE -------------------- */}
        {schedulerMode === 'multi_sport' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-purple-900 dark:text-purple-300 flex items-center gap-2">
                  <Calendar size={16} className="text-purple-500" />
                  Multi-Sport Day Master Scheduler
                </h3>
                <p className="text-xs text-purple-800/80 dark:text-purple-400/80 leading-relaxed max-w-xl">
                  Coordinates multiple sporting codes (Athletics, Soccer, Basketball, Cricket, Rugby, Tennis, Volleyball) on a unified master timeline without venue clashes or team scheduling conflicts.
                </p>
              </div>
              <button
                type="button"
                onClick={loadMultiSportScenario}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Zap size={14} />
                Load All-Sports Day Scenario
              </button>
            </div>

            {/* Master Participating Teams / Houses for Multi-Sport Day */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-3">
              <TeamsSelector
                value={multiTeams}
                onChange={setMultiTeams}
                registeredTeams={registeredTeams}
              />
            </div>

            {/* Included Sports Checklist */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                Select Sports to Include in Master Schedule
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {multiSports.map((s, idx) => (
                  <div
                    key={s.name}
                    className={`p-3 rounded-xl border transition-all ${
                      s.enabled
                        ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800'
                        : 'bg-gray-50 dark:bg-gray-850/50 border-gray-200 dark:border-gray-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 dark:text-gray-200">
                        <input
                          type="checkbox"
                          checked={s.enabled}
                          onChange={e => {
                            const updated = [...multiSports];
                            updated[idx].enabled = e.target.checked;
                            setMultiSports(updated);
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span>
                          {s.name === 'Soccer' ? '⚽ Soccer' :
                           s.name === 'Basketball' ? '🏀 Basketball' :
                           s.name === 'Volleyball' ? '🏐 Volleyball' :
                           s.name === 'Cricket' ? '🏏 Cricket' :
                           s.name === 'Rugby' ? '🏉 Rugby' :
                           s.name === 'Tennis' ? '🎾 Tennis' :
                           '🏃 Athletics (Track & Field)'}
                        </span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={s.duration}
                          onChange={e => {
                            const updated = [...multiSports];
                            updated[idx].duration = parseInt(e.target.value) || 20;
                            setMultiSports(updated);
                          }}
                          className="w-14 px-1.5 py-0.5 text-[11px] font-mono rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-right"
                        />
                        <span className="text-[10px] text-gray-400">min</span>
                      </div>
                    </div>

                    {s.enabled && s.name !== 'Athletics' && (() => {
                      const sportTeamsStr = (s.teams && s.teams.trim().length > 0) ? s.teams : multiTeams;
                      const sportTeamsList = sportTeamsStr ? sportTeamsStr.split(',').map(x => x.trim().toUpperCase()).filter(Boolean) : [];
                      const isCustom = Boolean(s.teams && s.teams.trim().length > 0 && s.teams.trim() !== multiTeams.trim());

                      return (
                        <div className="space-y-2 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-800">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <Users size={11} className="text-purple-500" />
                                <span>Teams ({sportTeamsList.length})</span>
                              </label>
                              <div className="flex items-center gap-1 text-[10px]">
                                {isCustom ? (
                                  <>
                                    <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                                      Customized
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...multiSports];
                                        updated[idx].teams = '';
                                        setMultiSports(updated);
                                      }}
                                      className="text-gray-400 hover:text-red-500 hover:underline cursor-pointer ml-1"
                                      title="Reset to Master Teams"
                                    >
                                      Reset
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-gray-400">Master</span>
                                )}
                                <span className="text-gray-300 dark:text-gray-700">|</span>
                                <button
                                  type="button"
                                  onClick={() => setCustomizingSport(customizingSport === s.name ? null : s.name)}
                                  className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline cursor-pointer"
                                >
                                  {customizingSport === s.name ? 'Hide' : 'Customize'}
                                </button>
                              </div>
                            </div>

                            {/* Badges preview */}
                            <div className="flex flex-wrap gap-1 p-1 rounded bg-gray-50/60 dark:bg-gray-850/40 border border-gray-150 dark:border-gray-800 max-h-14 overflow-y-auto">
                              {sportTeamsList.length === 0 ? (
                                <span className="text-[10px] text-red-500 italic p-0.5">
                                  No teams selected
                                </span>
                              ) : (
                                sportTeamsList.map((tm, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-2xs"
                                  >
                                    {tm}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Expandable Custom TeamsSelector */}
                          {customizingSport === s.name && (
                            <div className="p-3 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/20 dark:bg-purple-950/20 space-y-2 mt-2">
                              <div className="flex items-center justify-between pb-1 border-b border-purple-200/50 dark:border-purple-900/50">
                                <span className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                                  Select Teams for {s.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCustomizingSport(null)}
                                  className="text-[10px] font-bold text-purple-600 hover:text-purple-800 dark:text-purple-400"
                                >
                                  Done ✕
                                </button>
                              </div>
                              <TeamsSelector
                                value={s.teams || multiTeams}
                                onChange={(val) => {
                                  const updated = [...multiSports];
                                  updated[idx].teams = val;
                                  setMultiSports(updated);
                                }}
                                registeredTeams={registeredTeams}
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Format</label>
                              <select
                                value={s.format || ''}
                                onChange={e => {
                                  const updated = [...multiSports];
                                  updated[idx].format = e.target.value;
                                  setMultiSports(updated);
                                }}
                                className="w-full px-1.5 py-1 rounded text-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer"
                              >
                                <option value="">Master ({ALL_FORMATS.find(f => f.value === multiFormat)?.label.split(' ')[0] || 'Single'})</option>
                                <option value="single">Single Round-Robin</option>
                                <option value="double">Double Round-Robin</option>
                                <option value="group">Group Stage</option>
                                <option value="playoff">Playoff Bracket</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Matches/Round</label>
                              <input
                                type="number"
                                min={1}
                                max={6}
                                value={s.concurrent || ''}
                                placeholder={`Master (${multiConcurrent})`}
                                onChange={e => {
                                  const updated = [...multiSports];
                                  updated[idx].concurrent = e.target.value;
                                  setMultiSports(updated);
                                }}
                                className="w-full px-1.5 py-1 rounded text-[11px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {s.enabled && s.name === 'Athletics' && (
                      <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-800">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-500 font-medium flex items-center gap-1">
                            <Users size={11} className="text-purple-500" />
                            <span>Teams ({multiTeams ? multiTeams.split(',').filter(x => x.trim()).length : 0} competing)</span>
                          </span>
                          <span className="text-gray-400">All Master Teams</span>
                        </div>
                        <p className="text-[10px] text-gray-500 truncate">
                          {s.events} ({s.ageGroups})
                        </p>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            Format: Placement-based
                          </span>
                          <span className="text-gray-400">
                            Simultaneous: {s.concurrent || multiConcurrent || 2} events
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Master Schedule Format & Concurrency Controls */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Trophy size={14} className="text-purple-500" />
                  Master Schedule Format &amp; Concurrency
                </h4>
                <button
                  type="button"
                  onClick={() => setIsFormatModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                >
                  <HelpCircle size={12} />
                  <span>Explain Formats</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Format Selector */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Tournament Format
                  </label>
                  <select
                    value={multiFormat}
                    onChange={(e) => setMultiFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium cursor-pointer"
                  >
                    <option value="single">Single Round-Robin</option>
                    <option value="double">Double Round-Robin (Home &amp; Away)</option>
                    <option value="group">Group Stage (Sub-groups)</option>
                    <option value="playoff">Knockout / Playoff Bracket</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Default for all head-to-head codes</p>
                </div>

                {/* Matches Per Round (Concurrency) */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Matches Per Round
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={multiConcurrent}
                    onChange={(e) => setMultiConcurrent(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Simultaneous matches per round</p>
                </div>

                {/* Sports Day Start Time */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Sports Day Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => handleChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">First match kickoff / start time</p>
                </div>

                {/* Break Between Rounds */}
                <div>
                  <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                    Break Between Rounds (mins)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={form.breakTime}
                    onChange={(e) => handleChange('breakTime', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Buffer between consecutive rounds</p>
                </div>
              </div>
            </div>

            {/* Allocated Venues Pool */}
            <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <MapPin size={14} className="text-purple-500" />
                    Allocated Venues (Tracks, Fields, Pitches, Courts, Ovals)
                  </label>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Each sport routes to its compatible ground (Pitch for Soccer/Rugby, Oval for Cricket, Court for Basketball/Tennis, Track &amp; Field for Athletics).
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                    {parseMultiVenues().length} allocated
                  </span>
                  {registeredVenues && registeredVenues.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectAllRegisteredVenuesMulti}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-colors shadow-sm"
                    >
                      Select All Registered ({registeredVenues.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearMultiVenues}
                    className="text-[11px] font-medium px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Text Input for Comma-Separated Venues */}
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={multiVenues}
                  onChange={e => setMultiVenues(e.target.value)}
                  placeholder="e.g. Athletics Track 1, Field Pit 1, Soccer Pitch A, Basketball Court 1, Cricket Oval, Rugby Pitch, Tennis Court 1"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                />
              </div>

              {/* Clickable Registered Venues Chips */}
              {registeredVenues && registeredVenues.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-gray-400 font-medium block">
                    Click to toggle registered venues:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-gray-100 dark:border-gray-800/60 rounded-lg bg-gray-50/50 dark:bg-gray-950/30">
                    {registeredVenues.filter(Boolean).map(v => {
                      const currentList = parseMultiVenues().map(n => n.toUpperCase());
                      const isSelected = currentList.includes(v.name.toUpperCase());
                      return (
                        <button
                          key={v.id || v.name}
                          type="button"
                          onClick={() => handleToggleMultiVenue(v.name)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 font-semibold shadow-sm'
                              : 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-600'
                          }`}
                        >
                          <span className="font-bold text-[10px]">{isSelected ? '✓' : '+'}</span>
                          <span>{v.name}</span>
                          {v.type && (
                            <span className="text-[9px] uppercase px-1 rounded bg-black/5 dark:bg-white/10 opacity-70">
                              {v.type}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePreview}
                disabled={loading}
                className="k-btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 cursor-pointer font-bold disabled:opacity-50"
              >
                <RotateCcw size={14} />
                {loading ? 'Generating...' : 'Preview Master Multi-Sport Schedule'}
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !preview}
                className="k-btn k-btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={14} />
                {saved ? 'Saved!' : 'Save Master Schedule to Database'}
              </button>
            </div>
          </div>
        )}

        {/* -------------------- SINGLE SPORT MODE -------------------- */}
        {schedulerMode === 'single' && (
          <div className="space-y-4 animate-in fade-in duration-200">
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
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold">Sport</label>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                Manage Sports in Settings ↗
              </button>
            </div>
            {loadingSports ? (
              <div className="text-xs text-gray-400 py-2.5">Loading sports...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={sports?.some(s => s.name === form.sport) ? form.sport : '__custom__'}
                    onChange={(e) => {
                      if (e.target.value !== '__custom__') {
                        handleChange('sport', e.target.value);
                      } else {
                        handleChange('sport', '');
                      }
                    }}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium"
                  >
                    {sports && sports.length > 0 ? (
                      sports.filter(Boolean).map(s => <option key={s?.id || s?.name} value={s?.name}>{s?.name}</option>)
                    ) : (
                      <option value="">No registered sports found</option>
                    )}
                    <option value="__custom__">+ Enter Custom Sport Name...</option>
                  </select>
                </div>

                {(!sports || sports.length === 0 || !sports.some(s => s.name === form.sport)) && (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1">
                      Type Custom Sport Name (Auto-created):
                    </label>
                    <input
                      type="text"
                      value={form.sport}
                      onChange={(e) => handleChange('sport', e.target.value)}
                      placeholder="e.g. Netball, Cricket, Rugby, Handball..."
                      className="w-full px-3 py-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 text-sm font-medium placeholder-gray-400 focus:ring-1 focus:ring-purple-500"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      New sports typed here are automatically recognized and classified with proper scoring rules upon generation.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Queue Builder — Option A (placement sports only, Single Sport mode) */}
          {isPlacementSport && (
            <div
              id="step-format-events"
              className={`col-span-1 md:col-span-2 p-3 rounded-xl transition-all duration-300 ${
                guideActive && guideStep === 3
                  ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-gray-950 bg-purple-50/5 dark:bg-purple-950/5 shadow-[0_0_15px_rgba(147,51,234,0.15)]'
                  : ''
              }`}
            >
              <EventQueueBuilder
                queue={eventQueue}
                onQueueChange={handleEventQueueChange}
                sportName={form.sport}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium">Format</label>
              <button
                type="button"
                onClick={() => setIsFormatModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium cursor-pointer"
              >
                <HelpCircle size={13} />
                <span>Explain Formats</span>
              </button>
            </div>
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

            {isPlacementSport && (
              <div className="mt-2 p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-750 dark:text-blue-300 leading-relaxed">
                💡 <strong>Dual-Stream Concurrency:</strong> Include both your Track venues (e.g. <em>Track 1, Track 2</em>) and Field venues (e.g. <em>High Jump Area, Shot Put Circle</em>). The scheduler will automatically run track heats and field events concurrently in each round without mixing venues!
              </div>
            )}

            {registeredVenues && registeredVenues.length > 0 && (
              <div className="mt-2 space-y-1.5">
                <span className="text-xs text-gray-400 block font-medium">Or select from registered venues:</span>
                <div className="flex flex-wrap gap-1.5">
                  {registeredVenues?.filter(Boolean).map(v => {
                    const currentList = parseVenues().map(n => n.toUpperCase());
                    const isSelected = currentList.includes(v.name.toUpperCase());
                    return (
                      <button
                        key={v?.id || v?.name}
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
        </div>
      )}

      {error && (
        <ScheduleErrorGuide
          error={error}
          onDismiss={() => setError(null)}
          form={form}
          handleChange={handleChange}
          eventConfigs={eventConfigs}
          setEventConfigs={setEventConfigs}
          registeredTeams={registeredTeams}
          registeredVenues={registeredVenues}
          sports={sports}
          parseEvents={parseEvents}
          parseVenues={parseVenues}
          parseTeams={parseTeams}
          isPlacementSport={isPlacementSport}
          schedulerMode={schedulerMode}
        />
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
                  {(schedulerMode === 'multi_sport' || preview.fixtures?.some(f => f.sport)) && (
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Sport</th>
                  )}
                  <th className="text-left py-2 px-3 font-medium text-gray-500">{isPlacementSport ? 'Round / Slot' : 'Round'}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">{isPlacementSport ? 'Event Name & Category' : 'Matchup / Event'}</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Venue</th>
                  {preview.fixtures[0]?.notes && <th className="text-left py-2 px-3 font-medium text-gray-500">Group</th>}
                </tr>
              </thead>
              <tbody>
                {preview.fixtures.map((f, i) => {
                  const isAthleticsEvent = f.discipline || isPlacementSport || f.sport === 'Athletics';
                  return (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 animate-in fade-in duration-150">
                      <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                      {(schedulerMode === 'multi_sport' || preview.fixtures?.some(fx => fx.sport)) && (
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {f.sport === 'Soccer' ? '⚽ Soccer' :
                             f.sport === 'Basketball' ? '🏀 Basketball' :
                             f.sport === 'Volleyball' ? '🏐 Volleyball' :
                             f.sport === 'Cricket' ? '🏏 Cricket' :
                             f.sport === 'Rugby' ? '🏉 Rugby' :
                             f.sport === 'Tennis' ? '🎾 Tennis' :
                             f.sport === 'Athletics' ? '🏃 Athletics' : (f.sport || form.sport || 'Sport')}
                          </span>
                        </td>
                      )}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={f.round || ''}
                          onChange={(e) => handleUpdateFixture(i, 'round', e.target.value)}
                          className="w-16 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-850 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-semibold"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="datetime-local"
                          value={formatForDateTimeLocal(f.scheduled_at)}
                          onChange={(e) => handleUpdateFixture(i, 'scheduled_at', e.target.value)}
                          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-850 dark:text-gray-250 focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-[190px]"
                        />
                      </td>
                      <td className="py-2 px-3">
                        {isAthleticsEvent ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {Boolean(
                              (f.sport?.toLowerCase().includes('athletic') || f.sport?.toLowerCase().includes('track')) &&
                              (f.discipline === 'track' || f.discipline === 'field')
                            ) && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                f.discipline === 'track' 
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40' 
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                              }`}>
                                {f.discipline === 'track' ? '🏃 Track' : '🎯 Field'}
                              </span>
                            )}
                            <span className="font-semibold text-xs md:text-sm text-gray-800 dark:text-gray-200">
                              {f.team_a_name || f.event_name}
                            </span>
                          </div>
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
                      <td className="py-2 px-3">
                        <select
                          value={f.venue_id || ''}
                          onChange={(e) => handleUpdateFixture(i, 'venue', e.target.value)}
                          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-850 dark:text-gray-250 focus:outline-none focus:ring-1 focus:ring-purple-500 max-w-[150px]"
                        >
                          {f.venue && !registeredVenues?.some(v => String(v?.id) === String(f.venue_id)) && (
                            <option value="">{f.venue}</option>
                          )}
                          {registeredVenues?.filter(Boolean).map(v => (
                            <option key={v?.id} value={v?.id}>{v?.name}</option>
                          ))}
                        </select>
                      </td>
                      {preview.fixtures[0]?.notes !== undefined && (
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={f.notes || ''}
                            onChange={(e) => handleUpdateFixture(i, 'notes', e.target.value)}
                            className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-850 dark:text-gray-250 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
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
                : (
                  <span>
                    Choose your desired match schedule format: Single Round-Robin, Double Round-Robin, Group Stage, or Playoffs.{' '}
                    <button
                      type="button"
                      onClick={() => setIsFormatModalOpen(true)}
                      className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      <BookOpen size={11} /> Explain Formats
                    </button>
                  </span>
                ))}
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

      {/* Next Sport Modal Overlay */}
      {showNextSportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
              <Wand2 size={24} className="animate-pulse" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fixtures Saved Successfully!</h3>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Would you like to proceed and generate fixtures for another sporting discipline?
            </p>
            
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowNextSportModal(false);
                  navigate('/fixtures');
                }}
                className="px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              >
                No, View Fixtures
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowNextSportModal(false);
                  resetFormForNextSport();
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md shadow-purple-500/10 transition-colors"
              >
                Yes, Generate Another
              </button>
            </div>
          </div>
        </div>
      )}

      <ScoringFormatsModal
        isOpen={isFormatModalOpen}
        onClose={() => setIsFormatModalOpen(false)}
        currentFormat={form.format}
        onSelectFormat={(fKey) => handleChange('format', fKey)}
      />
    </div>
  );
}
