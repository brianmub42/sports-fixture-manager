import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { 
  useAthleticsEvents, 
  useAthleticsSports, 
  useCreateAthleticsEvent, 
  useUpdateAthleticsEvent, 
  useDeleteAthleticsEvent, 
  useSaveAthleticsResults 
} from '../hooks/useAthletics.js';
import { useVenues, useTeams, useSettings } from '../hooks/useFixtures.js';
import TeamPill from '../components/TeamPill.jsx';
import SportTag from '../components/SportTag.jsx';
import { useToast } from '../contexts/ToastContext.jsx';
import { 
  Award, 
  Calendar, 
  Clock, 
  Edit2, 
  MapPin, 
  Plus, 
  Trash2, 
  Trophy, 
  X, 
  Check, 
  Timer 
} from 'lucide-react';

const getLocalDateTimeString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getPlacementLabel = (num, pointsAllocation) => {
  const suffix = num === 1 ? 'st (Gold)' :
                 num === 2 ? 'nd (Silver)' :
                 num === 3 ? 'rd (Bronze)' : 'th';
  let pts = 0;
  if (pointsAllocation) {
    if (pointsAllocation[num] !== undefined) {
      pts = Number(pointsAllocation[num]);
    } else if (pointsAllocation[String(num)] !== undefined) {
      pts = Number(pointsAllocation[String(num)]);
    }
  }
  const requiredStar = num === 1 ? '*' : '';
  return `${num}${suffix} (${pts} pts)${requiredStar}`;
};

// -------------------------------------------------------------
// Stopwatch-Style Time Formatting & Parsing Helpers
// Raw 6-digit buffer (MMSSCC), right-to-left typing, auto mm:ss.ss
// -------------------------------------------------------------
function formatTimeBuffer(buffer) {
  if (!buffer || buffer.length === 0) return '';
  const padded = buffer.padStart(6, '0');
  const mm = padded.slice(0, 2);
  const ss = padded.slice(2, 4);
  const cc = padded.slice(4, 6);
  return `${mm}:${ss}.${cc}`;
}

function bufferToTotalSeconds(buffer) {
  if (!buffer || buffer.length === 0) return null;
  const padded = buffer.padStart(6, '0');
  const mm = parseInt(padded.slice(0, 2), 10);
  const ss = parseInt(padded.slice(2, 4), 10);
  const cc = parseInt(padded.slice(4, 6), 10);
  return mm * 60 + ss + cc / 100;
}

function msToTimeBuffer(ms) {
  if (ms == null || isNaN(ms)) return '';
  const totalSec = ms / 1000;
  const mm = Math.floor(totalSec / 60);
  const ss = Math.floor(totalSec % 60);
  const cc = Math.round((totalSec - Math.floor(totalSec)) * 100);
  const raw = `${String(mm).padStart(2, '0')}${String(ss).padStart(2, '0')}${String(cc).padStart(2, '0')}`;
  const stripped = raw.replace(/^0+(?=\d)/, '');
  return stripped === '0' ? '' : stripped;
}

function formatTimeDisplay(ms) {
  if (ms == null || isNaN(ms)) return null;
  const totalSec = ms / 1000;
  const mm = Math.floor(totalSec / 60);
  const ss = Math.floor(totalSec % 60);
  const cc = Math.round((totalSec - Math.floor(totalSec)) * 100);
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cc).padStart(2, '0')}`;
}

// Compute live placements with dead heats / skip-rank convention:
// tied 1st -> both "1st", next real time -> "3rd" (2nd skipped). Points follow shared place.
function computeTimePlacements(lanes, pointsAllocation) {
  const processed = (lanes || []).map((lane, originalIndex) => {
    const isSpecialStatus = ['DNS', 'DNF', 'DQ'].includes(lane.status);
    const hasTime = !isSpecialStatus && !!lane.rawBuffer && lane.rawBuffer.length > 0;
    const totalSeconds = hasTime ? bufferToTotalSeconds(lane.rawBuffer) : null;
    return {
      ...lane,
      originalIndex,
      hasTime,
      totalSeconds,
      timeMs: totalSeconds != null ? Math.round(totalSeconds * 1000) : null,
      placement: null,
      tied: false,
      points: 0
    };
  });

  const timed = processed.filter(l => l.hasTime && l.totalSeconds != null);
  timed.sort((a, b) => a.totalSeconds - b.totalSeconds);

  for (let i = 0; i < timed.length; i++) {
    if (i > 0 && timed[i].totalSeconds === timed[i - 1].totalSeconds) {
      timed[i].placement = timed[i - 1].placement;
      timed[i].tied = true;
      timed[i - 1].tied = true;
    } else {
      timed[i].placement = i + 1; // 0-indexed + 1 skip rank
      timed[i].tied = false;
    }
  }

  for (let i = 0; i < timed.length - 1; i++) {
    if (timed[i].totalSeconds === timed[i + 1].totalSeconds) {
      timed[i].tied = true;
    }
  }

  timed.forEach(l => {
    if (pointsAllocation && l.placement != null) {
      const pts = pointsAllocation[l.placement] ?? pointsAllocation[String(l.placement)] ?? 0;
      l.points = Number(pts);
    }
  });

  const timedMap = new Map(timed.map(t => [t.originalIndex, t]));
  return processed.map(l => timedMap.get(l.originalIndex) || l);
}

function getPlacementBadge(placement, tied, status, points) {
  if (status && status !== 'OK') {
    return {
      label: status,
      pointsText: '0 pts',
      bgClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold'
    };
  }
  if (!placement) {
    return {
      label: '—',
      pointsText: '',
      bgClass: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border-gray-200 dark:border-gray-700'
    };
  }
  const suffix = placement === 1 ? 'st' : placement === 2 ? 'nd' : placement === 3 ? 'rd' : 'th';
  const prefix = tied ? 'T-' : '';
  const label = `${prefix}${placement}${suffix}`;
  const pointsText = points != null ? `+${points} pts` : '';

  let bgClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700 font-semibold';
  if (placement === 1) {
    bgClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 font-black';
  } else if (placement === 2) {
    bgClass = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-bold';
  } else if (placement === 3) {
    bgClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-700 font-bold';
  }

  return { label, pointsText, bgClass };
}

function StopwatchTimeInput({ value = '', onChange, disabled, placeholder = '00:00.00' }) {
  const displayValue = formatTimeBuffer(value);

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'Enter'].includes(e.key)) {
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      onChange(value.slice(0, -1));
      return;
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      onChange('');
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      if (value.length < 6) {
        const next = value === '0' ? e.key : value + e.key;
        if (next.length <= 6) {
          onChange(next);
        }
      }
      return;
    }

    // Ignore non-numeric keys (colon, dot, letter, symbol)
    e.preventDefault();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (disabled) return;
    const text = e.clipboardData.getData('text');
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (digits) onChange(digits);
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => {}}
        className={`w-full py-1.5 px-2 text-center font-mono text-xs rounded-lg border transition-all ${
          disabled
            ? 'bg-gray-100 dark:bg-gray-800/40 text-gray-400 border-gray-200 dark:border-gray-800 cursor-not-allowed'
            : value
            ? 'bg-blue-50/60 dark:bg-blue-950/30 text-blue-600 dark:text-blue-300 font-bold border-blue-400 dark:border-blue-700'
            : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 focus:border-blue-500'
        }`}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 text-[10px]"
          title="Clear time"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function AthleticsPage() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { data: events, isLoading: eventsLoading } = useAthleticsEvents();
  const { data: sports } = useAthleticsSports();
  const { data: venues } = useVenues();
  const { data: teams } = useTeams();
  const { data: settings } = useSettings();

  // Mutations
  const createEvent = useCreateAthleticsEvent();
  const updateEvent = useUpdateAthleticsEvent();
  const deleteEvent = useDeleteAthleticsEvent();
  const saveResults = useSaveAthleticsResults();

  // Filter States
  const [selectedSport, setSelectedSport] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal States
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedEventForResults, setSelectedEventForResults] = useState(null);

  // Form States for Add/Edit Event
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('Mixed');
  const [eventSportId, setEventSportId] = useState('');
  const [eventVenueId, setEventVenueId] = useState('');
  const [eventScheduledAt, setEventScheduledAt] = useState(getLocalDateTimeString());
  const [eventDuration, setEventDuration] = useState(15);
  const [eventStatus, setEventStatus] = useState('upcoming');

  // Form States for Results Logging
  const [entryMode, setEntryMode] = useState('manual'); // 'manual' | 'by_time'
  const [placements, setPlacements] = useState([]);
  const [lanes, setLanes] = useState([]);

  // Handle Event Modal Open
  const openEventModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setEventName(event.name);
      setEventCategory(event.category || 'Mixed');
      setEventSportId(event.sport_id);
      setEventVenueId(event.venue_id || '');
      setEventScheduledAt(event.scheduled_at ? event.scheduled_at.slice(0, 16) : '');
      setEventDuration(event.duration_minutes || 15);
      setEventStatus(event.status || 'upcoming');
    } else {
      setEditingEvent(null);
      setEventName('');
      setEventCategory('Mixed');
      setEventSportId(sports?.[0]?.id || '');
      setEventVenueId(venues?.[0]?.id || '');
      setEventScheduledAt(getLocalDateTimeString());
      setEventDuration(15);
      setEventStatus('upcoming');
    }
    setIsEventModalOpen(true);
  };

  // Handle Save Event
  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!eventName || !eventSportId || !eventVenueId) {
      alert('Please fill out all required fields');
      return;
    }

    const payload = {
      name: eventName,
      category: eventCategory,
      sport_id: parseInt(eventSportId),
      venue_id: parseInt(eventVenueId),
      scheduled_at: eventScheduledAt ? new Date(eventScheduledAt).toISOString() : null,
      duration_minutes: parseInt(eventDuration),
      status: eventStatus
    };

    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...payload }, {
        onSuccess: () => {
          setIsEventModalOpen(false);
          showToast('Athletics event updated successfully!', 'success');
        }
      });
    } else {
      createEvent.mutate(payload, {
        onSuccess: () => {
          setIsEventModalOpen(false);
          showToast('Athletics event created successfully!', 'success');
        }
      });
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = (id) => {
    if (window.confirm('Are you sure you want to delete this event? This will also remove any saved results.')) {
      deleteEvent.mutate(id, {
        onSuccess: () => showToast('Athletics event deleted successfully!', 'success')
      });
    }
  };

  // Handle Lane Management in By Time Mode
  const handleAddLane = () => {
    setLanes(prev => [
      ...prev,
      {
        laneNumber: prev.length + 1,
        teamId: '',
        rawBuffer: '',
        status: 'OK'
      }
    ]);
  };

  const handleRemoveLane = (idxToRemove) => {
    if (lanes.length <= 2) return;
    setLanes(prev => prev.filter((_, i) => i !== idxToRemove).map((l, i) => ({ ...l, laneNumber: i + 1 })));
  };

  // Handle Result Modal Open
  const openResultModal = (event) => {
    setSelectedEventForResults(event);
    
    // 1. Prepare Manual placements array
    const totalPositions = teams?.length || 6;
    const newPlacements = Array(totalPositions).fill(null).map(() => ({ teamId: '', timeSec: '' }));

    // 2. Prepare By Time lanes array with participating teams
    const defaultLanes = (teams || []).map((t, idx) => ({
      laneNumber: idx + 1,
      teamId: t.id.toString(),
      rawBuffer: '',
      status: 'OK'
    }));

    while (defaultLanes.length < Math.max(6, (teams?.length || 6))) {
      defaultLanes.push({
        laneNumber: defaultLanes.length + 1,
        teamId: '',
        rawBuffer: '',
        status: 'OK'
      });
    }

    let hasTimeResults = false;

    if (event.results && event.results.length > 0) {
      event.results.forEach(r => {
        // Manual mode pre-population
        const index = r.placement ? r.placement - 1 : -1;
        if (index >= 0 && index < totalPositions) {
          newPlacements[index] = {
            teamId: r.team_id.toString(),
            timeSec: r.time_ms ? (r.time_ms / 1000).toString() : ''
          };
        }
        if (r.time_ms) {
          hasTimeResults = true;
        }

        // By Time mode pre-population
        const matchingLane = defaultLanes.find(l => l.teamId === r.team_id.toString());
        if (matchingLane) {
          matchingLane.rawBuffer = r.time_ms ? msToTimeBuffer(r.time_ms) : '';
          matchingLane.status = r.status || 'OK';
        } else {
          const emptyLane = defaultLanes.find(l => !l.teamId);
          if (emptyLane) {
            emptyLane.teamId = r.team_id.toString();
            emptyLane.rawBuffer = r.time_ms ? msToTimeBuffer(r.time_ms) : '';
            emptyLane.status = r.status || 'OK';
          }
        }
      });
    }

    setPlacements(newPlacements);
    setLanes(defaultLanes);
    setEntryMode(hasTimeResults ? 'by_time' : 'manual');
    setIsResultModalOpen(true);
  };

  // Handle Save Results (supports both Manual and By Time modes)
  const handleSaveResults = (e) => {
    e.preventDefault();

    if (entryMode === 'by_time') {
      const computedLanes = computeTimePlacements(lanes, settings?.points_allocation);

      // Verify no duplicate teams assigned
      const selectedTeamIds = computedLanes.map(l => l.teamId).filter(id => id !== '');
      const uniqueTeamIds = new Set(selectedTeamIds);
      if (selectedTeamIds.length !== uniqueTeamIds.size) {
        alert('A team cannot be selected for multiple lanes.');
        return;
      }

      // Filter entries with an assigned team and either a valid time or DNS/DNF/DQ status
      const validEntries = computedLanes.filter(l => l.teamId && (l.hasTime || ['DNS', 'DNF', 'DQ'].includes(l.status)));
      if (validEntries.length === 0) {
        alert('Please assign teams and enter at least one participant time or result.');
        return;
      }

      // Verify at least one competitor was timed to determine 1st place
      if (!computedLanes.some(l => l.placement === 1 && l.teamId)) {
        alert('At least one competitor must have a completed time to determine 1st place.');
        return;
      }

      // Verify points allocation is configured in settings
      const unconfiguredPlacements = [];
      computedLanes.forEach(l => {
        if (l.teamId && l.placement) {
          const ptsAllocation = settings?.points_allocation;
          if (!ptsAllocation || (ptsAllocation[l.placement] === undefined && ptsAllocation[String(l.placement)] === undefined)) {
            unconfiguredPlacements.push(l.placement);
          }
        }
      });

      if (unconfiguredPlacements.length > 0) {
        alert(`Point allocation for Position(s) ${[...new Set(unconfiguredPlacements)].join(', ')} is not configured in Settings. Please ask the administrator to configure points for all positions before saving results.`);
        return;
      }

      const resultsPayload = validEntries.map(l => ({
        teamId: parseInt(l.teamId, 10),
        placement: l.placement || null,
        points: l.points || 0,
        timeMs: l.timeMs || null,
        tied: !!l.tied,
        status: l.status || 'OK'
      }));

      saveResults.mutate({ id: selectedEventForResults.id, results: resultsPayload }, {
        onSuccess: () => {
          setIsResultModalOpen(false);
          showToast('Event results logged successfully!', 'success');
        }
      });
      return;
    }

    // Manual Mode
    if (!placements[0] || !placements[0].teamId) {
      alert('1st place must be assigned to log results.');
      return;
    }

    const selectedTeamIds = placements.map(p => p.teamId).filter(id => id !== '');
    const uniqueTeamIds = new Set(selectedTeamIds);
    if (selectedTeamIds.length !== uniqueTeamIds.size) {
      alert('A team cannot be selected for multiple placements.');
      return;
    }

    const unconfiguredPlacements = [];
    placements.forEach((p, idx) => {
      if (p.teamId) {
        const placement = idx + 1;
        const ptsAllocation = settings?.points_allocation;
        if (!ptsAllocation || (ptsAllocation[placement] === undefined && ptsAllocation[String(placement)] === undefined)) {
          unconfiguredPlacements.push(placement);
        }
      }
    });

    if (unconfiguredPlacements.length > 0) {
      alert(`Point allocation for Position(s) ${unconfiguredPlacements.join(', ')} is not configured in Settings. Please ask the administrator to configure points for all positions before saving results.`);
      return;
    }

    const resultsPayload = placements
      .map((p, idx) => {
        if (!p.teamId) return null;
        return {
          teamId: parseInt(p.teamId, 10),
          placement: idx + 1,
          timeMs: p.timeSec ? Math.round(parseFloat(p.timeSec) * 1000) : null,
          tied: false,
          status: 'OK'
        };
      })
      .filter(r => r !== null);

    saveResults.mutate({ id: selectedEventForResults.id, results: resultsPayload }, {
      onSuccess: () => {
        setIsResultModalOpen(false);
        showToast('Event results logged successfully!', 'success');
      }
    });
  };

  // Filter Events
  const filteredEvents = events?.filter(e => {
    const matchesSport = selectedSport === 'All' || e.sport_name === selectedSport;
    const matchesStatus = selectedStatus === 'All' || e.status === selectedStatus;
    return matchesSport && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-orange-500" />
            Athletics & Aquatics Events
          </h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage placement-based sports fixtures and results</p>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => openEventModal()}
            className="k-btn bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            <Plus size={16} />
            Create Event
          </button>
        )}
      </div>

      {/* Filters & Control bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Sport Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Sport</label>
            <div className="flex flex-wrap gap-1.5">
              {['All', ...(sports?.map(s => s.name) || [])].map(sport => (
                <button
                  key={sport}
                  onClick={() => setSelectedSport(sport)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedSport === sport
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-gray-400">Status</label>
            <div className="flex gap-1.5">
              {['All', 'upcoming', 'completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    selectedStatus === status
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {status === 'All' ? 'All' : status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {eventsLoading ? (
        <div className="text-center py-12 text-gray-400">Loading placement events...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map(event => (
            <div 
              key={event.id} 
              className="k-card border border-gray-150/80 dark:border-gray-800 bg-white dark:bg-gray-850/20 p-5 rounded-xl hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Event header info */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <SportTag sport={event.sport_name} />
                    <span className="text-xs font-semibold text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md uppercase">
                      {event.category}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    event.status === 'completed' 
                      ? 'text-green-600 bg-green-50 dark:bg-green-950/20' 
                      : 'text-blue-600 bg-blue-50 dark:bg-blue-950/20'
                  }`}>
                    {event.status === 'completed' ? 'Completed' : 'Upcoming'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">{event.name}</h3>

                {/* Details list */}
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400 mb-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-400 shrink-0" />
                    <span>
                      {event.scheduled_at 
                        ? new Date(event.scheduled_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                        : 'No date set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400 shrink-0" />
                    <span>
                      {event.scheduled_at 
                        ? new Date(event.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                        : 'No time set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">{event.venue_name || 'No venue'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Timer size={14} className="text-gray-400 shrink-0" />
                    <span>{event.duration_minutes} min duration</span>
                  </div>
                </div>

                {/* Results display for completed events */}
                {event.status === 'completed' && event.results && event.results.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/35 border border-gray-100 dark:border-gray-800 p-3 rounded-lg space-y-2 mb-6">
                    <h4 className="text-xs uppercase font-bold text-gray-400 flex items-center gap-1 mb-1">
                      <Award size={13} className="text-yellow-500" /> Placements & Medals
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {event.results.slice(0, 3).map((r, i) => (
                        <div key={r.id || `${r.placement}-${r.team_id}`} className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={`min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${
                              r.placement === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400' :
                              r.placement === 2 ? 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300' :
                              r.placement === 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {r.status && r.status !== 'OK' ? r.status : (r.tied ? `T-${r.placement}` : r.placement)}
                            </span>
                            <TeamPill code={r.team_code} name={r.team_name} logoUrl={r.team_logo} />
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            {r.time_ms ? (
                              <span className="font-mono text-gray-400">
                                {formatTimeDisplay(r.time_ms)}
                              </span>
                            ) : null}
                            <span className="text-gray-500">+{r.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Actions Panel */}
              {isAuthenticated && (
                <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEventModal(event)}
                      className="p-1.5 rounded bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                      title="Edit Event"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1.5 rounded bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => openResultModal(event)}
                    className="k-btn text-xs py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Award size={14} className="text-purple-500" />
                    {event.status === 'completed' ? 'Modify Placements' : 'Log Placements'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {filteredEvents.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center py-16 bg-gray-50/50 dark:bg-gray-800/10 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700 animate-pulse" />
              <h3 className="font-semibold text-sm">No Events Found</h3>
              <p className="text-xs max-w-xs mx-auto mt-1 leading-relaxed">No placement events match your selected filters.</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 w-full max-w-md p-6 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {editingEvent ? 'Edit Placement Event' : 'Create Placement Event'}
              </h2>
              <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-500 uppercase">Event Name*</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100m Sprint, Egg & Spoon Race"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Sport*</label>
                  <select
                    value={eventSportId}
                    onChange={e => setEventSportId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                  >
                    {sports?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Category*</label>
                  <select
                    value={eventCategory}
                    onChange={e => setEventCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                  >
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Mixed">Mixed</option>
                    <option value="U20">U20</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Venue*</label>
                  <select
                    value={eventVenueId}
                    onChange={e => setEventVenueId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                  >
                    {venues?.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Duration (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={eventDuration}
                    onChange={e => setEventDuration(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Scheduled Time</label>
                  <input
                    type="datetime-local"
                    value={eventScheduledAt}
                    onChange={e => setEventScheduledAt(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <select
                    value={eventStatus}
                    onChange={e => setEventStatus(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEvent.isLoading || updateEvent.isLoading}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Check size={16} />
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG RESULTS MODAL */}
      {isResultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 w-full max-w-xl p-6 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Award className="text-yellow-500" size={20} />
                Log Event Results
              </h2>
              <button onClick={() => setIsResultModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 uppercase font-semibold">
              Event: {selectedEventForResults?.name} ({selectedEventForResults?.category})
            </p>

            {/* Mode Switcher: Manual vs By Time */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setEntryMode('manual')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  entryMode === 'manual'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Award size={14} />
                <span>Manual Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setEntryMode('by_time')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  entryMode === 'by_time'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Clock size={14} />
                <span>By Time Mode</span>
              </button>
            </div>

            {!settings?.points_allocation ? (
              <div className="space-y-4 mt-2">
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 rounded-xl text-xs leading-relaxed animate-pulse">
                  <strong>Points Allocation Not Configured:</strong> The workspace administrator has not configured the points allocation and positions yet. Please configure it in <strong>Settings</strong> before logging event results.
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setIsResultModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveResults} className="space-y-4">
                {entryMode === 'by_time' ? (
                  /* BY TIME MODE */
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-xl text-xs flex items-start gap-2 text-blue-800 dark:text-blue-300">
                      <Clock size={16} className="shrink-0 mt-0.5 text-blue-500" />
                      <div>
                        <p className="font-bold">Stopwatch-Style Entry (mm:ss.ss)</p>
                        <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                          Digits type right-to-left automatically. Placements, skip-ranks, dead heats (e.g. T-1st), and points update live.
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50/90 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 font-semibold">
                          <tr>
                            <th className="py-2 px-2 text-left w-12">Lane</th>
                            <th className="py-2 px-2 text-left">Team</th>
                            <th className="py-2 px-2 text-center w-32">Time (mm:ss.ss)</th>
                            <th className="py-2 px-2 text-center w-20">Status</th>
                            <th className="py-2 px-2 text-center w-24">Rank &amp; Pts</th>
                            <th className="py-2 px-1 text-center w-7"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                          {computeTimePlacements(lanes, settings?.points_allocation).map((lane, idx) => {
                            const badge = getPlacementBadge(lane.placement, lane.tied, lane.status, lane.points);
                            return (
                              <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="py-2 px-2 font-bold text-gray-500">
                                  <span className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-mono">
                                    L{lane.laneNumber}
                                  </span>
                                </td>
                                <td className="py-2 px-2">
                                  <select
                                    value={lane.teamId}
                                    onChange={e => {
                                      const updated = [...lanes];
                                      updated[idx].teamId = e.target.value;
                                      setLanes(updated);
                                    }}
                                    className="w-full p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 text-xs"
                                  >
                                    <option value="">-- Unassigned --</option>
                                    {teams?.map(t => (
                                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2 px-2">
                                  <StopwatchTimeInput
                                    value={lane.rawBuffer}
                                    disabled={lane.status !== 'OK'}
                                    onChange={newBuffer => {
                                      const updated = [...lanes];
                                      updated[idx].rawBuffer = newBuffer;
                                      setLanes(updated);
                                    }}
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <select
                                    value={lane.status}
                                    onChange={e => {
                                      const updated = [...lanes];
                                      updated[idx].status = e.target.value;
                                      if (e.target.value !== 'OK') {
                                        updated[idx].rawBuffer = '';
                                      }
                                      setLanes(updated);
                                    }}
                                    className={`w-full p-1.5 rounded-lg border text-xs font-semibold ${
                                      lane.status === 'OK'
                                        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                        : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                                    }`}
                                  >
                                    <option value="OK">OK</option>
                                    <option value="DNS">DNS</option>
                                    <option value="DNF">DNF</option>
                                    <option value="DQ">DQ</option>
                                  </select>
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] border ${badge.bgClass}`}>
                                      {badge.label}
                                    </span>
                                    {badge.pointsText && (
                                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
                                        {badge.pointsText}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-1 text-center">
                                  {lanes.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLane(idx)}
                                      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                      title="Remove Lane"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <button
                        type="button"
                        onClick={handleAddLane}
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Add Lane
                      </button>
                      <span className="text-[11px] text-gray-400">
                        {lanes.filter(l => l.rawBuffer && l.rawBuffer.length > 0).length} of {lanes.length} lanes timed
                      </span>
                    </div>
                  </div>
                ) : (
                  /* MANUAL MODE */
                  <div className="space-y-3">
                    {placements.map((p, idx) => {
                      const num = idx + 1;
                      const placeLabel = getPlacementLabel(num, settings?.points_allocation);
                      return (
                        <div key={num} className="grid grid-cols-3 gap-2 items-center text-xs">
                          <label className="col-span-1 font-bold text-gray-500 uppercase">{placeLabel}</label>
                          <select
                            required={num === 1}
                            value={p.teamId}
                            onChange={e => {
                              const updated = [...placements];
                              updated[idx].teamId = e.target.value;
                              setPlacements(updated);
                            }}
                            className="col-span-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100"
                          >
                            <option value="">-- Select --</option>
                            {teams?.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            placeholder="Time (optional)"
                            value={p.timeSec}
                            onChange={e => {
                              const updated = [...placements];
                              updated[idx].timeSec = e.target.value;
                              setPlacements(updated);
                            }}
                            className="col-span-1 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-100 font-mono"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsResultModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveResults.isLoading}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Award size={14} />
                    Save Results
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
