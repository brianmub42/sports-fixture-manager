/**
 * Sport and Venue Classification & Capabilities Engine
 * Zero-hardcoding dynamic categorization for multi-sport fixture scheduling,
 * venue compatibility matching, and rule resolution.
 */

// Universal heuristics for sport-discipline mapping
const DISCIPLINE_KEYWORDS = {
  track: ['track', 'sprint', '100m', '200m', '400m', '800m', '1500m', '3000m', '5000m', 'hurdle', 'relay', 'steeplechase'],
  field: ['field', 'jump', 'high jump', 'long jump', 'triple jump', 'pole vault', 'shot put', 'shotput', 'discus', 'javelin', 'hammer throw', 'throw'],
  pitch: ['soccer', 'football', 'rugby', 'rugby 7s', 'rugby sevens', 'rugby 15s', 'hockey', 'field hockey', 'lacrosse'],
  court: ['basketball', 'volleyball', 'tennis', 'table tennis', 'badminton', 'netball', 'squash', 'pickleball', 'handball', 'padel'],
  oval: ['cricket', 't10', 't20', 'super 8', 'aussie rules', 'afl'],
  pool: ['swimming', 'aquatics', 'water polo', 'diving', 'freestyle', 'backstroke', 'breaststroke', 'butterfly']
};

// Preset rulesets for known scoring paradigms
export const SCORING_PARADIGMS = {
  standard_points: {
    system: 'standard_points',
    name: 'Standard Win/Draw/Loss Points',
    description: 'Traditional points table (e.g. 3 for win, 1 for draw, 0 for loss) with score goals/points.',
    defaultRules: {
      win_points: 3,
      draw_points: 1,
      loss_points: 0
    }
  },
  sets_games: {
    system: 'sets_games',
    name: 'Sets & Games (Tennis, Table Tennis, Volleyball)',
    description: 'Match decided by sets won, with game-by-game breakdown and sets/games differentials.',
    defaultRules: {
      win_points: 2,
      loss_points: 0,
      sets_to_win: 2,
      max_sets: 3,
      games_per_set: 6,
      tiebreak_enabled: true
    }
  },
  bonus_points: {
    system: 'bonus_points',
    name: 'Rugby Bonus Points System',
    description: '4 pts for win, 2 pts for draw, +1 try bonus (for 4+ tries), +1 losing bonus (within 7 pts).',
    defaultRules: {
      win_points: 4,
      draw_points: 2,
      loss_points: 0,
      try_bonus_threshold: 4,
      losing_bonus_margin: 7,
      try_points: 5,
      conversion_points: 2,
      penalty_points: 3,
      drop_goal_points: 3
    }
  },
  cricket_runs: {
    system: 'cricket_runs',
    name: 'Cricket Runs, Wickets & Net Run Rate (NRR)',
    description: 'Runs and wickets per over with Net Run Rate tiebreaker.',
    defaultRules: {
      win_points: 2,
      tie_points: 1,
      loss_points: 0,
      default_overs: 6,
      calculate_nrr: true
    }
  },
  placement: {
    system: 'placement',
    name: 'Athletics & Placement Rankings',
    description: '1st, 2nd, 3rd rankings with medal and points table allocation.',
    defaultRules: {}
  }
};

/**
 * Classifies an event or sport into a discipline (track, field, pitch, court, oval, pool).
 * @param {string} name - Sport name or event name (e.g. "100m", "High Jump", "Cricket", "Rugby")
 * @returns {string} discipline
 */
export function detectDiscipline(name) {
  if (!name || typeof name !== 'string') return 'court';
  const lower = name.toLowerCase().trim();

  // Check explicit keywords
  for (const [discipline, keywords] of Object.entries(DISCIPLINE_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower === kw || lower.includes(kw)) {
        return discipline;
      }
    }
  }

  return 'pitch'; // generic open-field default
}

/**
 * Checks if a specific athletics event is a track event
 */
export function isAthleticsTrack(eventName) {
  if (!eventName) return false;
  const lower = eventName.toLowerCase().trim();
  return DISCIPLINE_KEYWORDS.track.some(kw => lower.includes(kw));
}

/**
 * Checks if a specific athletics event is a field event
 */
export function isAthleticsField(eventName) {
  if (!eventName) return false;
  const lower = eventName.toLowerCase().trim();
  return DISCIPLINE_KEYWORDS.field.some(kw => lower.includes(kw));
}

/**
 * Dynamically resolves a sport profile from name and any existing configuration.
 * @param {string} sportName
 * @param {object} existingRecord
 * @returns {object} resolved sport profile
 */
export function classifySport(sportName, existingRecord = null) {
  const name = (sportName || '').trim();
  const lower = name.toLowerCase();

  // If already configured in database, respect database settings
  if (existingRecord?.scoring_system && existingRecord.scoring_system !== 'standard_points') {
    return {
      name,
      discipline: existingRecord.discipline || detectDiscipline(name),
      scoring_system: existingRecord.scoring_system,
      scoring_rules: existingRecord.scoring_rules || SCORING_PARADIGMS[existingRecord.scoring_system]?.defaultRules || {},
      scoring_type: existingRecord.scoring_type || (existingRecord.scoring_system === 'placement' ? 'placement' : 'points'),
      default_duration: existingRecord.default_duration || getDefaultDuration(name)
    };
  }

  // Auto-detect based on sport name
  let scoring_system = 'standard_points';
  let scoring_type = 'points';
  let discipline = detectDiscipline(name);

  if (lower.includes('tennis') || lower.includes('table tennis') || lower.includes('badminton')) {
    scoring_system = 'sets_games';
  } else if (lower.includes('rugby')) {
    scoring_system = 'bonus_points';
    discipline = 'pitch';
  } else if (lower.includes('cricket') || lower.includes('t10') || lower.includes('t20')) {
    scoring_system = 'cricket_runs';
    discipline = 'oval';
  } else if (lower.includes('athletics') || lower.includes('swimming') || lower.includes('aquatics') || lower.includes('cross country')) {
    scoring_system = 'placement';
    scoring_type = 'placement';
    discipline = lower.includes('field') ? 'field' : (lower.includes('swimming') || lower.includes('aquatics') || lower.includes('pool') ? 'pool' : 'track');
  }

  // Preserve existing DB scoring_type if explicitly set
  if (existingRecord?.scoring_type) {
    scoring_type = existingRecord.scoring_type;
    if (scoring_type === 'placement') scoring_system = 'placement';
  }

  const defaultRules = SCORING_PARADIGMS[scoring_system]?.defaultRules || {};
  const mergedRules = { ...defaultRules, ...(existingRecord?.scoring_rules || {}) };

  return {
    name,
    discipline,
    scoring_system,
    scoring_type,
    scoring_rules: mergedRules,
    default_duration: getDefaultDuration(name, discipline)
  };
}

/**
 * Returns sensible default match duration in minutes based on discipline/sport
 */
export function getDefaultDuration(sportName, discipline = null) {
  const lower = (sportName || '').toLowerCase();
  const disc = discipline || detectDiscipline(sportName);

  if (lower.includes('100m') || lower.includes('200m') || lower.includes('relay')) return 5;
  if (disc === 'track') return 10;
  if (disc === 'field') return 15;
  if (lower.includes('rugby 7s') || lower.includes('rugby sevens')) return 20;
  if (lower.includes('rugby')) return 30;
  if (lower.includes('cricket')) return 35;
  if (lower.includes('tennis')) return 30;
  if (lower.includes('basketball')) return 20;
  if (lower.includes('volleyball')) return 20;
  if (lower.includes('soccer')) return 30;
  return 20;
}

/**
 * Classifies a venue into supported disciplines.
 * @param {string|object} venue
 * @returns {string[]} array of supported disciplines
 */
export function classifyVenue(venue) {
  if (!venue) return ['court', 'pitch', 'field', 'track', 'oval'];

  const name = typeof venue === 'string' ? venue : venue.name || '';
  const type = typeof venue === 'object' ? venue.type : null;
  const supported = typeof venue === 'object' && Array.isArray(venue.supported_disciplines) && venue.supported_disciplines.length > 0
    ? venue.supported_disciplines
    : null;

  if (supported) return supported;

  const lower = name.toLowerCase().trim();

  // Check venue type if set
  if (type) {
    const t = type.toLowerCase();
    if (t === 'track') return ['track'];
    if (t === 'field') return ['field'];
    if (t === 'oval') return ['oval', 'pitch'];
    if (t === 'pitch') return ['pitch'];
    if (t === 'court') return ['court'];
    if (t === 'pool') return ['pool'];
  }

  // Name heuristic matching
  if (lower.includes('track') || lower.includes('lane') || lower.includes('straight')) return ['track'];
  if (lower.includes('shot put') || lower.includes('shotput') || lower.includes('high jump') || lower.includes('long jump') || lower.includes('pit') || lower.includes('discus') || lower.includes('javelin')) return ['field'];
  if (lower.includes('cricket') || lower.includes('oval') || lower.includes('wicket')) return ['oval'];
  if (lower.includes('rugby') || lower.includes('soccer') || lower.includes('pitch') || lower.includes('turf') || lower.includes('football')) return ['pitch'];
  if (lower.includes('tennis') || lower.includes('basketball') || lower.includes('volleyball') || lower.includes('court') || lower.includes('gym') || lower.includes('arena')) return ['court'];
  if (lower.includes('pool') || lower.includes('aquatic') || lower.includes('swimming')) return ['pool'];

  // Default: if it says "field", allow field and pitch
  if (lower.includes('field') || lower.includes('filed')) return ['field', 'pitch'];
  if (lower.includes('athletics')) return ['track', 'field'];

  return ['court', 'pitch', 'field', 'track', 'oval'];
}

/**
 * Checks if a venue is compatible with a sport or event
 * @param {string|object} venue
 * @param {string} sportOrEvent
 * @returns {boolean}
 */
export function isVenueCompatible(venue, sportOrEvent) {
  if (!venue || !sportOrEvent) return false;

  const venueDisciplines = classifyVenue(venue);
  const eventDiscipline = detectDiscipline(sportOrEvent);

  // Exact match
  if (venueDisciplines.includes(eventDiscipline)) return true;

  // Cross-compatibility fallbacks
  // Cricket can be played on an open pitch
  if (eventDiscipline === 'oval' && venueDisciplines.includes('pitch')) return true;
  // Field events can sometimes share an open grass pitch if specifically designated
  if (eventDiscipline === 'field' && venueDisciplines.includes('pitch')) return true;

  return false;
}
