// Fixture Generation Algorithm
// Supports: single round-robin, double round-robin, group stage, dual-stream athletics, and multi-sport sports days
import { 
  classifyVenue, 
  isAthleticsTrack, 
  isAthleticsField, 
  isVenueCompatible,
  detectDiscipline,
  classifySport 
} from './sportClassifier.js';

/**
 * Generate round-robin pairings using circle method
 * @param {string[]} teams - array of team codes
 * @returns {Array<[string,string]>} - array of [home, away] pairs
 */
export function roundRobin(teams) {
  const list = [...teams];
  const n = list.length;
  if (n % 2 !== 0) {
    list.push('BYE');
  }

  const numTeams = list.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;
  const schedule = [];

  for (let round = 0; round < numRounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[numTeams - 1 - i];
      if (home !== 'BYE' && away !== 'BYE') {
        schedule.push([home, away]);
      }
    }
    // Rotate list (keep first fixed, rotate rest)
    list.splice(1, 0, list.pop());
  }

  return schedule;
}

/**
 * Generate double round-robin (home + away reversed)
 */
export function doubleRoundRobin(teams) {
  const first = roundRobin(teams);
  const second = first.map(([a, b]) => [b, a]);
  return [...first, ...second];
}

/**
 * Generate group stage pairings
 * @param {string[][]} groups - array of groups, each group is array of team codes
 */
export function groupStage(groups) {
  const allPairs = [];
  groups.forEach((group, groupIdx) => {
    const pairs = roundRobin(group);
    pairs.forEach(p => {
      allPairs.push({ pair: p, group: groupIdx + 1 });
    });
  });
  return allPairs;
}

/**
 * Assign venues in round-robin fashion
 */
export function assignVenues(pairs, venues, concurrent = 1) {
  const rounds = [];
  const venueCount = venues.length;

  for (let i = 0; i < pairs.length; i += concurrent) {
    const round = [];
    for (let j = 0; j < concurrent && i + j < pairs.length; j++) {
      const pair = Array.isArray(pairs[i + j]) ? pairs[i + j] : pairs[i + j].pair;
      const groupInfo = pairs[i + j].group ? `Group ${pairs[i + j].group}` : null;
      round.push({
        pair,
        venue: venues[j % venueCount],
        group: groupInfo
      });
    }
    rounds.push(round);
  }

  return rounds;
}

export function parseSafeLocalDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, y, m, d, h, min, s] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s || 0));
  }
  return new Date(dateStr);
}

export function formatLocalISO(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Calculate times for each round
 */
export function calculateTimes(rounds, startDate, durationMinutes, breakMinutes = 0) {
  let currentTime = parseSafeLocalDate(startDate);
  const result = [];

  rounds.forEach((round, roundIdx) => {
    const roundResult = [];

    round.forEach(match => {
      const endTime = new Date(currentTime.getTime() + durationMinutes * 60000);

      roundResult.push({
        ...match,
        round: `R${roundIdx + 1}`,
        startTime: formatLocalISO(currentTime),
        endTime: formatLocalISO(endTime),
        duration: durationMinutes
      });
    });

    result.push(...roundResult);

    // Advance time for next round
    currentTime = new Date(currentTime.getTime() + (durationMinutes + breakMinutes) * 60000);
  });

  return result;
}

/**
 * Generate playoff / knockout bracket schedule
 */
export function generatePlayoff({
  teams,
  startDate,
  durationMinutes,
  breakMinutes = 0,
  venues,
  concurrent = 1
}) {
  const count = teams.length;
  const venueCount = venues.length;
  const matches = [];

  const addMinutes = (date, mins) => new Date(new Date(date).getTime() + mins * 60000);

  if (count <= 4) {
    // 4 teams: Semi-finals + Final
    // Pad to 4 if needed
    const t = [...teams];
    while (t.length < 4) t.push(null);

    const semi1 = {
      pair: [t[0], t[3]],
      round: 'Semi-final 1',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Semi-final 1, team_b=' // placeholder
    };
    const semi2 = {
      pair: [t[1], t[2]],
      round: 'Semi-final 2',
      venue: venues[1 % venueCount],
      notes: 'source: team_a=Semi-final 2, team_b='
    };

    const finalMatch = {
      pair: [null, null],
      round: 'Final',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Semi-final 1, team_b=Semi-final 2'
    };

    // Schedule Semis (Round 1)
    let currentTime = parseSafeLocalDate(startDate);
    const semis = [semi1, semi2];
    semis.forEach((match, idx) => {
      const offset = Math.floor(idx / concurrent);
      const matchTime = addMinutes(currentTime, offset * (durationMinutes + breakMinutes));
      matches.push({
        ...match,
        startTime: formatLocalISO(matchTime),
        endTime: formatLocalISO(addMinutes(matchTime, durationMinutes)),
        duration: durationMinutes
      });
    });

    // Schedule Final (Round 2) after Semis complete
    const maxSemiEnd = new Date(Math.max(...matches.map(m => new Date(m.endTime).getTime())));
    const finalTime = addMinutes(maxSemiEnd, breakMinutes);
    matches.push({
      ...finalMatch,
      startTime: formatLocalISO(finalTime),
      endTime: formatLocalISO(addMinutes(finalTime, durationMinutes)),
      duration: durationMinutes
    });

  } else {
    // 8 teams: Quarter-finals + Semi-finals + Final
    const t = [...teams];
    while (t.length < 8) t.push(null);

    const qf1 = { pair: [t[0], t[7]], round: 'Quarter-final 1', venue: venues[0 % venueCount] };
    const qf2 = { pair: [t[3], t[4]], round: 'Quarter-final 2', venue: venues[1 % venueCount] };
    const qf3 = { pair: [t[1], t[6]], round: 'Quarter-final 3', venue: venues[2 % venueCount] };
    const qf4 = { pair: [t[2], t[5]], round: 'Quarter-final 4', venue: venues[3 % venueCount] };

    const semi1 = {
      pair: [null, null],
      round: 'Semi-final 1',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Quarter-final 1, team_b=Quarter-final 2'
    };
    const semi2 = {
      pair: [null, null],
      round: 'Semi-final 2',
      venue: venues[1 % venueCount],
      notes: 'source: team_a=Quarter-final 3, team_b=Quarter-final 4'
    };

    const finalMatch = {
      pair: [null, null],
      round: 'Final',
      venue: venues[0 % venueCount],
      notes: 'source: team_a=Semi-final 1, team_b=Semi-final 2'
    };

    // Schedule Quarters (Round 1)
    let currentTime = parseSafeLocalDate(startDate);
    const quarters = [qf1, qf2, qf3, qf4];
    quarters.forEach((match, idx) => {
      const offset = Math.floor(idx / concurrent);
      const matchTime = addMinutes(currentTime, offset * (durationMinutes + breakMinutes));
      matches.push({
        ...match,
        startTime: formatLocalISO(matchTime),
        endTime: formatLocalISO(addMinutes(matchTime, durationMinutes)),
        duration: durationMinutes
      });
    });

    // Schedule Semis (Round 2)
    const maxQfEnd = new Date(Math.max(...matches.map(m => new Date(m.endTime).getTime())));
    const semiTimeBase = addMinutes(maxQfEnd, breakMinutes);
    const semis = [semi1, semi2];
    const semiMatches = [];
    semis.forEach((match, idx) => {
      const offset = Math.floor(idx / concurrent);
      const matchTime = addMinutes(semiTimeBase, offset * (durationMinutes + breakMinutes));
      semiMatches.push({
        ...match,
        startTime: formatLocalISO(matchTime),
        endTime: formatLocalISO(addMinutes(matchTime, durationMinutes)),
        duration: durationMinutes
      });
    });
    matches.push(...semiMatches);

    // Schedule Final (Round 3)
    const maxSemiEnd = new Date(Math.max(...semiMatches.map(m => new Date(m.endTime).getTime())));
    const finalTime = addMinutes(maxSemiEnd, breakMinutes);
    matches.push({
      ...finalMatch,
      startTime: formatLocalISO(finalTime),
      endTime: formatLocalISO(addMinutes(finalTime, durationMinutes)),
      duration: durationMinutes
    });
  }

  return matches;
}


/**
 * Generate athletics events sequentially/concurrently
 * Supports dual-stream parallel scheduling: running Track and Field events simultaneously
 * without assigning track events to fields or field events to tracks!
 */
export function generateAthleticsSchedule({
  events,
  categories = [],
  genders = [],
  ageGroups = [],
  eventConfigs = {},
  startDate,
  durationMinutes,
  breakMinutes = 0,
  venues,
  concurrent = 1,
  sport = 'Athletics'
}) {
  const sportProfile = classifySport(sport);
  const sportNameLower = String(sport || '').toLowerCase();
  const isAthleticsSport = sportProfile.discipline === 'track' || 
    sportProfile.discipline === 'field' || 
    sportNameLower.includes('athletic') || 
    sportNameLower.includes('track & field');

  const combinations = [];

  for (const rawEvent of events) {
    const isObj = typeof rawEvent === 'object' && rawEvent !== null;
    const eventName = isObj ? rawEvent.name : rawEvent;
    if (!eventName) continue;

    // Resolve age groups for this specific event
    const specificAgeGroups = (isObj && Array.isArray(rawEvent.ageGroups) && rawEvent.ageGroups.length > 0)
      ? rawEvent.ageGroups
      : (eventConfigs[eventName]?.ageGroups?.length > 0
        ? eventConfigs[eventName].ageGroups
        : (ageGroups.length > 0 ? ageGroups : []));

    // Resolve genders for this specific event
    const hasExplicitGenders = (isObj && Array.isArray(rawEvent.genders) && rawEvent.genders.length > 0) ||
      (eventConfigs[eventName]?.genders && Array.isArray(eventConfigs[eventName].genders) && eventConfigs[eventName].genders.length > 0);

    let specificGenders = (isObj && Array.isArray(rawEvent.genders) && rawEvent.genders.length > 0)
      ? rawEvent.genders
      : (eventConfigs[eventName]?.genders?.length > 0
        ? eventConfigs[eventName].genders
        : (genders.length > 0 ? genders : []));

    // If genders were not explicitly configured for this event, default Mixed only to relays / medley
    if (!hasExplicitGenders && specificGenders.some(g => String(g).toLowerCase() === 'mixed')) {
      const isRelay = /medley/i.test(eventName) || /relay/i.test(eventName) || /mixed/i.test(eventName);
      if (!isRelay) {
        specificGenders = specificGenders.filter(g => String(g).toLowerCase() !== 'mixed');
      }
    }

    let eventCategories = [];
    // 1. If explicit categories are customized for this event, use them directly!
    if (eventConfigs[eventName]?.categories !== undefined && Array.isArray(eventConfigs[eventName].categories)) {
      eventCategories = [...eventConfigs[eventName].categories];
    } else if (specificGenders.length > 0 && specificAgeGroups.length > 0) {
      for (const gender of specificGenders) {
        for (const ageGroup of specificAgeGroups) {
          eventCategories.push(`${gender} ${ageGroup}`);
        }
      }
    } else if (categories.length > 0) {
      eventCategories = [...categories];
    } else {
      eventCategories = [];
    }

    const eventDiscipline = isAthleticsSport
      ? (isAthleticsTrack(eventName) ? 'track' : (isAthleticsField(eventName) ? 'field' : 'general'))
      : (sportProfile.discipline || 'pool');

    for (const category of eventCategories) {
      combinations.push({
        name: eventName,
        category: category,
        isTrack: isAthleticsSport && isAthleticsTrack(eventName),
        isField: isAthleticsSport && isAthleticsField(eventName),
        discipline: eventDiscipline
      });
    }
  }

  const addMinutes = (date, mins) => new Date(new Date(date).getTime() + mins * 60000);
  const effConcurrent = Math.max(1, parseInt(concurrent) || 1);
  const currentTime = parseSafeLocalDate(startDate);
  const matches = [];

  // Separate venues into Track, Field, and General
  const trackVenues = venues.filter(v => classifyVenue(v).includes('track'));
  const fieldVenues = venues.filter(v => classifyVenue(v).includes('field'));
  const generalVenues = venues.filter(v => !trackVenues.includes(v) && !fieldVenues.includes(v));

  // Determine if we have both track and field events to schedule concurrently (only for Athletics)
  const trackEventsQueue = isAthleticsSport ? combinations.filter(c => c.isTrack) : [];
  const fieldEventsQueue = isAthleticsSport ? combinations.filter(c => c.isField || !c.isTrack) : [];

  const hasTrack = trackEventsQueue.length > 0;
  const hasField = fieldEventsQueue.length > 0;

  // Dual-Stream Mode: ONLY if athletics, both track and field exist, concurrent > 1, AND at least 2 venues available
  if (isAthleticsSport && hasTrack && hasField && effConcurrent > 1 && venues.length > 1) {
    // Determine effective track and field venue pools
    let effTrackVenues = [...trackVenues];
    let effFieldVenues = [...fieldVenues];

    // If no explicit track/field distinction among venues, divide general venues
    if (effTrackVenues.length === 0 && effFieldVenues.length === 0) {
      const half = Math.max(1, Math.floor(venues.length / 2));
      effTrackVenues = venues.slice(0, half);
      effFieldVenues = venues.slice(half);
    } else if (effTrackVenues.length === 0 && generalVenues.length > 0) {
      effTrackVenues.push(generalVenues[0]);
    } else if (effFieldVenues.length === 0 && generalVenues.length > 0) {
      effFieldVenues.push(generalVenues[0]);
    }

    let roundIdx = 0;
    while (trackEventsQueue.length > 0 || fieldEventsQueue.length > 0) {
      const roundTime = addMinutes(currentTime, roundIdx * (durationMinutes + breakMinutes));
      const roundEndTime = addMinutes(roundTime, durationMinutes);
      const roundName = `Round ${roundIdx + 1}`;

      let remainingSlots = effConcurrent;

      // 1. Assign Track events to Track venues for this round
      const maxTrack = Math.min(effTrackVenues.length > 0 ? effTrackVenues.length : 1, remainingSlots);
      const trackSlots = (fieldEventsQueue.length > 0 && remainingSlots > 1)
        ? Math.min(maxTrack, Math.ceil(remainingSlots / 2))
        : maxTrack;

      for (let t = 0; t < trackSlots && trackEventsQueue.length > 0 && remainingSlots > 0; t++) {
        const item = trackEventsQueue.shift();
        matches.push({
          name: item.name,
          category: item.category,
          venue: effTrackVenues[t % effTrackVenues.length],
          startTime: formatLocalISO(roundTime),
          endTime: formatLocalISO(roundEndTime),
          duration: durationMinutes,
          round: roundName,
          discipline: 'track'
        });
        remainingSlots--;
      }

      // 2. Assign Field events to Field venues for this round (running concurrently within remaining capacity)
      const fieldSlots = Math.min(effFieldVenues.length > 0 ? effFieldVenues.length : 1, remainingSlots);
      for (let f = 0; f < fieldSlots && fieldEventsQueue.length > 0 && remainingSlots > 0; f++) {
        const item = fieldEventsQueue.shift();
        matches.push({
          name: item.name,
          category: item.category,
          venue: effFieldVenues[f % effFieldVenues.length],
          startTime: formatLocalISO(roundTime),
          endTime: formatLocalISO(roundEndTime),
          duration: durationMinutes,
          round: roundName,
          discipline: 'field'
        });
        remainingSlots--;
      }

      roundIdx++;
    }

    return matches;
  }

  // Single-Stream Mode: When all events are either Track-only or Field-only, or effConcurrent === 1, or single venue
  const suitableVenues = hasTrack && trackVenues.length > 0 
    ? trackVenues 
    : (hasField && fieldVenues.length > 0 ? fieldVenues : venues);

  const venueCount = Math.max(1, suitableVenues.length);
  const queue = [...combinations];

  for (let i = 0; i < queue.length; i += effConcurrent) {
    const roundIdx = Math.floor(i / effConcurrent);
    const roundTime = addMinutes(currentTime, roundIdx * (durationMinutes + breakMinutes));
    
    for (let j = 0; j < effConcurrent && i + j < queue.length; j++) {
      const combo = queue[i + j];
      matches.push({
        name: combo.name,
        category: combo.category,
        venue: suitableVenues[j % venueCount],
        startTime: formatLocalISO(roundTime),
        endTime: formatLocalISO(addMinutes(roundTime, durationMinutes)),
        duration: durationMinutes,
        round: `Round ${roundIdx + 1}`,
        discipline: combo.discipline || (combo.isTrack ? 'track' : (combo.isField ? 'field' : 'general'))
      });
    }
  }

  return matches;
}

/**
 * Main generation function
 */
export function generateSchedule({
  teams,
  startDate,
  durationMinutes,
  breakMinutes = 0,
  format = 'single', // 'single', 'double', 'group', 'playoff'
  venues,
  concurrent = 1,
  groups = null // for group stage: [['ZAM','BAR','HAL'], ['SHA','TEH','TOW']]
}) {
  let scheduled;

  if (format === 'playoff') {
    scheduled = generatePlayoff({
      teams,
      startDate,
      durationMinutes,
      breakMinutes,
      venues,
      concurrent
    });
  } else {
    let pairs;
    if (format === 'group') {
      let activeGroups = groups;
      if (!activeGroups && teams && teams.length >= 4) {
        const half = Math.ceil(teams.length / 2);
        activeGroups = [teams.slice(0, half), teams.slice(half)];
      }
      pairs = activeGroups ? groupStage(activeGroups) : roundRobin(teams);
    } else if (format === 'double') {
      pairs = doubleRoundRobin(teams);
    } else {
      pairs = roundRobin(teams);
    }

    const rounds = assignVenues(pairs, venues, concurrent);
    scheduled = calculateTimes(rounds, startDate, durationMinutes, breakMinutes);
  }

  return scheduled;
}

/**
 * Master Multi-Sport Day Generator
 * Coordinates concurrent multi-discipline sports days (e.g. Track, Field, Soccer,
 * Basketball, Volleyball, Cricket, Rugby, Tennis) across appropriate venues with team clash avoidance.
 */
export function generateMultiSportSchedule({
  sports, // array of { name, sportId, format, teams, events, categories, genders, ageGroups, durationMinutes }
  venues, // array of venues
  startDate,
  breakMinutes = 0,
  concurrent = 1,
  avoidTeamClashes = true
}) {
  const allScheduled = [];
  const addMinutes = (date, mins) => new Date(new Date(date).getTime() + mins * 60000);

  // Group venues by discipline
  const venuePools = {
    track: venues.filter(v => classifyVenue(v).includes('track')),
    field: venues.filter(v => classifyVenue(v).includes('field')),
    pitch: venues.filter(v => classifyVenue(v).includes('pitch')),
    court: venues.filter(v => classifyVenue(v).includes('court')),
    oval: venues.filter(v => classifyVenue(v).includes('oval') || classifyVenue(v).includes('pitch')),
    pool: venues.filter(v => classifyVenue(v).includes('pool')),
    general: venues
  };

  // Process each sport
  for (const sportConfig of sports) {
    const sportProfile = classifySport(sportConfig.name);
    const duration = sportConfig.durationMinutes || sportProfile.default_duration || 20;

    if (sportProfile.scoring_system === 'placement' || sportConfig.format === 'placement') {
      // Athletics / Placement
      const athleticsScheduled = generateAthleticsSchedule({
        events: sportConfig.events || [],
        categories: sportConfig.categories || [],
        genders: sportConfig.genders || [],
        ageGroups: sportConfig.ageGroups || [],
        eventConfigs: sportConfig.eventConfigs || {},
        startDate,
        durationMinutes: duration,
        breakMinutes,
        venues: venues,
        concurrent: sportConfig.concurrent || concurrent
      });

      athleticsScheduled.forEach(item => {
        allScheduled.push({
          ...item,
          sport: sportConfig.name,
          sport_id: sportConfig.sportId,
          is_athletics: true
        });
      });
    } else {
      // Head-to-Head (Soccer, Basketball, Volleyball, Cricket, Rugby, Tennis)
      const discipline = sportProfile.discipline;
      const suitableVenues = venuePools[discipline]?.length > 0 
        ? venuePools[discipline] 
        : venues;

      const schedule = generateSchedule({
        teams: sportConfig.teams || [],
        startDate,
        durationMinutes: duration,
        breakMinutes,
        format: sportConfig.format || 'single',
        venues: suitableVenues.map(v => typeof v === 'object' ? v.name : v),
        concurrent: sportConfig.concurrent || Math.min(concurrent, suitableVenues.length),
        groups: sportConfig.groups || null
      });

      schedule.forEach(match => {
        allScheduled.push({
          ...match,
          sport: sportConfig.name,
          sport_id: sportConfig.sportId,
          discipline,
          is_athletics: false
        });
      });
    }
  }

  // Sort overall master timeline chronologically
  allScheduled.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return allScheduled;
}

