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
import { useVenues, useTeams } from '../hooks/useFixtures.js';
import TeamPill from '../components/TeamPill.jsx';
import SportTag from '../components/SportTag.jsx';
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

const getPlacementLabel = (num) => {
  const suffix = num === 1 ? 'st (Gold)' :
                 num === 2 ? 'nd (Silver)' :
                 num === 3 ? 'rd (Bronze)' : 'th';
  const pts = num === 1 ? 10 :
              num === 2 ? 7 :
              num === 3 ? 5 :
              num === 4 ? 3 :
              num === 5 ? 2 : 1;
  const requiredStar = num === 1 ? '*' : '';
  return `${num}${suffix} (${pts} pts)${requiredStar}`;
};

export default function AthleticsPage() {
  const { isAuthenticated } = useAuth();
  const { data: events, isLoading: eventsLoading } = useAthleticsEvents();
  const { data: sports } = useAthleticsSports();
  const { data: venues } = useVenues();
  const { data: teams } = useTeams();

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
  const [eventScheduledAt, setEventScheduledAt] = useState('');
  const [eventDuration, setEventDuration] = useState(15);
  const [eventStatus, setEventStatus] = useState('upcoming');

  // Form States for Results Logging
  const [placements, setPlacements] = useState([]);

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
      setEventScheduledAt('');
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
        onSuccess: () => setIsEventModalOpen(false)
      });
    } else {
      createEvent.mutate(payload, {
        onSuccess: () => setIsEventModalOpen(false)
      });
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = (id) => {
    if (window.confirm('Are you sure you want to delete this event? This will also remove any saved results.')) {
      deleteEvent.mutate(id);
    }
  };

  // Handle Result Modal Open
  const openResultModal = (event) => {
    setSelectedEventForResults(event);
    
    // Pre-populate if results already exist
    const totalPositions = teams?.length || 6;
    const newPlacements = Array(totalPositions).fill(null).map(() => ({ teamId: '', timeSec: '' }));
    if (event.results && event.results.length > 0) {
      event.results.forEach(r => {
        const index = r.placement - 1;
        if (index >= 0 && index < totalPositions) {
          newPlacements[index] = {
            teamId: r.team_id.toString(),
            timeSec: r.time_ms ? (r.time_ms / 1000).toString() : ''
          };
        }
      });
    }
    setPlacements(newPlacements);
    setIsResultModalOpen(true);
  };

  // Handle Save Results
  const handleSaveResults = (e) => {
    e.preventDefault();

    // Verify that at least 1st place is entered
    if (!placements[0] || !placements[0].teamId) {
      alert('1st place must be assigned to log results.');
      return;
    }

    // Check for duplicate team selections
    const selectedTeamIds = placements.map(p => p.teamId).filter(id => id !== '');
    const uniqueTeamIds = new Set(selectedTeamIds);
    if (selectedTeamIds.length !== uniqueTeamIds.size) {
      alert('A team cannot be selected for multiple placements.');
      return;
    }

    // Format results payload
    const resultsPayload = placements
      .map((p, idx) => {
        if (!p.teamId) return null;
        return {
          teamId: parseInt(p.teamId),
          placement: idx + 1,
          timeMs: p.timeSec ? Math.round(parseFloat(p.timeSec) * 1000) : null
        };
      })
      .filter(r => r !== null);

    saveResults.mutate({ id: selectedEventForResults.id, results: resultsPayload }, {
      onSuccess: () => setIsResultModalOpen(false)
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
            Athletics & Novelty Events
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
                        <div key={r.id} className="flex justify-between items-center py-1 border-b border-gray-100/50 dark:border-gray-800 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                              i === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400' :
                              i === 1 ? 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                              {r.placement}
                            </span>
                            <TeamPill code={r.team_code} name={r.team_name} logoUrl={r.team_logo} />
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium">
                            {r.time_ms && (
                              <span className="font-mono text-gray-400">
                                {(r.time_ms / 1000).toFixed(2)}s
                              </span>
                            )}
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
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 w-full max-w-md p-6 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Log Placements</h2>
              <button onClick={() => setIsResultModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4 uppercase font-semibold">
              Event: {selectedEventForResults?.name} ({selectedEventForResults?.category})
            </p>

            <form onSubmit={handleSaveResults} className="space-y-4">
              <div className="space-y-3">
                {placements.map((p, idx) => {
                  const num = idx + 1;
                  const placeLabel = getPlacementLabel(num);
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
          </div>
        </div>
      )}
    </div>
  );
}
