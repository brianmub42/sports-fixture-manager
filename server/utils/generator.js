import { query } from '../db.js';

/**
 * Fixture Generation Engine
 * Supports: single round-robin, double round-robin, group stage, concurrent scheduling
 */

/**
 * Generate all pairings for round-robin
 * @param {string[]} teams - Array of team codes
 * @param {boolean} double - Whether to play each pair twice (home/away)
 * @returns {Array<[string,string]>} - Array of [teamA, teamB] pairs
 */
export function generateRoundRobin(teams, double = false) {
  const n = teams.length;
  const pairs = [];

  // Single round-robin using circle method
  const arr = teams.slice();
  if (n % 2 !== 0) arr.push(null); // Add bye if odd number

  const rounds = arr.length - 1;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < arr.length / 2; i++) {
      const a = arr[i];
      const b = arr[arr.length - 1 - i];
      if (a !== null && b !== null) {
        pairs.push([a, b]);
      }
    }
    // Rotate (keep first fixed, rotate rest)
    const last = arr.pop();
    arr.splice(1, 0, last);
  }

  if (double) {
    // Add reverse fixtures
    const reverse = pairs.map(([a, b]) => [b, a]);
    // Interleave: round 1 home, round 1 away, round 2 home, round 2 away...
    const interleaved = [];
    const half = pairs.length;
    for (let i = 0; i < half; i++) {
      interleaved.push(pairs[i]);
      interleaved.push(reverse[i]);
    }
    return interleaved;
  }

  return pairs;
}

/**
 * Generate group stage pairings
 * @param {Object} groups - { groupName: [teamCodes] }
 * @returns {Object} - { groupName: [pairs] }
 */
export function generateGroupStage(groups) {
  const result = {};
  for (const [name, teams] of Object.entries(groups)) {
    result[name] = generateRoundRobin(teams, false);
  }
  return result;
}

/**
 * Schedule fixtures with time slots
 * @param {Array} pairs - Array of [teamA, teamB] 
 * @param {Object} options - Scheduling options
 * @returns {Array} - Scheduled fixtures with times
 */
export function scheduleFixtures(pairs, options) {
  const {
    startDate,           // Date object
    startTimeMinutes,    // Minutes from midnight (e.g., 588 = 09:48)
    durationMinutes,     // Match length (e.g., 10)
    breakMinutes,        // Break between rounds (e.g., 0)
    venues,              // Array of venue names
    concurrent = false,  // Whether all matches in a round run simultaneously
    roundsPerBlock = 1,  // How many rounds before a longer break
    blockBreakMinutes = 0, // Long break between blocks
  } = options;

  const fixtures = [];
  let currentTime = new Date(startDate);
  currentTime.setHours(0, startTimeMinutes, 0, 0);

  const venueCount = venues.length;

  if (concurrent && venueCount > 1) {
    // Group pairs into rounds (each venue gets one match per round)
    let roundIdx = 0;
    for (let i = 0; i < pairs.length; i += venueCount) {
      const roundPairs = pairs.slice(i, i + venueCount);

      roundPairs.forEach(([teamA, teamB], venueIdx) => {
        fixtures.push({
          teamA,
          teamB,
          venue: venues[venueIdx % venueCount],
          scheduledAt: new Date(currentTime),
          duration: durationMinutes,
          round: `R${roundIdx + 1}`,
        });
      });

      currentTime = new Date(currentTime.getTime() + durationMinutes * 60000);

      // Add block break if needed
      if (roundsPerBlock > 0 && (roundIdx + 1) % roundsPerBlock === 0) {
        currentTime = new Date(currentTime.getTime() + blockBreakMinutes * 60000);
      } else {
        currentTime = new Date(currentTime.getTime() + breakMinutes * 60000);
      }

      roundIdx++;
    }
  } else {
    // Sequential scheduling (one match at a time, cycling venues)
    pairs.forEach(([teamA, teamB], idx) => {
      fixtures.push({
        teamA,
        teamB,
        venue: venues[idx % venueCount],
        scheduledAt: new Date(currentTime),
        duration: durationMinutes,
        round: `R${idx + 1}`,
      });

      currentTime = new Date(currentTime.getTime() + durationMinutes * 60000);

      if (roundsPerBlock > 0 && (idx + 1) % roundsPerBlock === 0) {
        currentTime = new Date(currentTime.getTime() + blockBreakMinutes * 60000);
      } else {
        currentTime = new Date(currentTime.getTime() + breakMinutes * 60000);
      }
    });
  }

  return fixtures;
}

/**
 * Full generation pipeline — generates and saves to database
 */
export async function generateAndSave(options) {
  const {
    sport,
    teams,
    double = false,
    groups = null,
    startDate,
    startTimeMinutes,
    durationMinutes,
    venues,
    concurrent = false,
    breakMinutes = 0,
    roundsPerBlock = 0,
    blockBreakMinutes = 0,
  } = options;

  // Get sport ID
  const sportRes = await query('SELECT id FROM sports WHERE name = $1', [sport]);
  if (sportRes.rows.length === 0) throw new Error(`Sport not found: ${sport}`);
  const sportId = sportRes.rows[0].id;

  // Get or create venues
  const venueIds = {};
  for (const vName of venues) {
    let vRes = await query('SELECT id FROM venues WHERE name = $1', [vName]);
    if (vRes.rows.length === 0) {
      vRes = await query('INSERT INTO venues (name, type) VALUES ($1, $2) RETURNING id', [vName, 'court']);
    }
    venueIds[vName] = vRes.rows[0].id;
  }

  // Get district IDs
  const districtIds = {};
  for (const code of teams) {
    const dRes = await query('SELECT id FROM districts WHERE code = $1', [code]);
    if (dRes.rows.length === 0) throw new Error(`District not found: ${code}`);
    districtIds[code] = dRes.rows[0].id;
  }

  let pairs;
  let notes = '';

  if (groups) {
    // Group stage
    const groupResults = generateGroupStage(groups);
    pairs = [];
    for (const [groupName, groupPairs] of Object.entries(groupResults)) {
      groupPairs.forEach(([a, b]) => {
        pairs.push({ teams: [a, b], note: groupName });
      });
    }
  } else {
    pairs = generateRoundRobin(teams, double).map(([a, b]) => ({ teams: [a, b], note: '' }));
  }

  // Schedule with times
  const scheduled = scheduleFixtures(
    pairs.map(p => p.teams),
    { startDate, startTimeMinutes, durationMinutes, breakMinutes, venues, concurrent, roundsPerBlock, blockBreakMinutes }
  );

  // Save to database
  const saved = [];
  for (let i = 0; i < scheduled.length; i++) {
    const s = scheduled[i];
    const note = pairs[i]?.note || '';
    const [teamA, teamB] = pairs[i]?.teams || s;

    const result = await query(`
      INSERT INTO fixtures (sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming', $8)
      RETURNING id
    `, [
      sportId,
      venueIds[s.venue],
      s.round,
      districtIds[teamA],
      districtIds[teamB],
      s.scheduledAt,
      s.duration,
      note,
    ]);

    saved.push({
      id: result.rows[0].id,
      teamA,
      teamB,
      venue: s.venue,
      scheduledAt: s.scheduledAt,
      round: s.round,
      note,
    });
  }

  return saved;
}

/**
 * Generate KALIFE 2026 full schedule programmatically
 */
export async function generateKALIFESchedule() {
  const baseDate = new Date('2026-08-01');

  // Phase 1: Athletics (already in seed, skip or handle separately)

  // Phase 2: Basketball + Volleyball (concurrent)
  const bbTeams = ['ZAM', 'BAR', 'HAL', 'SHA', 'TEH', 'TOW'];
  const vbTeams = ['ZAM', 'BAR', 'HAL', 'SHA', 'TEH', 'TOW'];

  // Basketball: single round-robin, 1 court, sequential within BB court
  const bbPairs = generateRoundRobin(bbTeams, false);
  // Custom KALIFE BB order
  const bbCustom = [['ZAM','TOW'],['ZAM','TEH'],['ZAM','SHA'],['ZAM','HAL'],['ZAM','BAR'],['BAR','TEH'],['TOW','SHA'],['TEH','HAL'],['SHA','BAR'],['HAL','TOW'],['HAL','SHA'],['BAR','HAL'],['TOW','BAR'],['TEH','TOW'],['SHA','TEH']];

  await generateAndSave({
    sport: 'Basketball',
    teams: bbTeams,
    double: false,
    startDate: baseDate,
    startTimeMinutes: 588, // 09:48
    durationMinutes: 10,
    venues: ['BB Court'],
    concurrent: false,
    breakMinutes: 0,
  });

  // Volleyball: double round-robin, 2 courts, concurrent
  await generateAndSave({
    sport: 'Volleyball',
    teams: vbTeams,
    double: true,
    startDate: baseDate,
    startTimeMinutes: 588,
    durationMinutes: 10,
    venues: ['VB Court 1', 'VB Court 2'],
    concurrent: true,
    breakMinutes: 0,
  });

  // Phase 3: Soccer (sequential, 2 pitches)
  await generateAndSave({
    sport: 'Soccer',
    teams: ['ZAM', 'BAR', 'HAL', 'SHA', 'TEH', 'TOW'],
    double: true,
    startDate: baseDate,
    startTimeMinutes: 738, // 12:18
    durationMinutes: 10,
    venues: ['Pitch A', 'Pitch B'],
    concurrent: true,
    breakMinutes: 0,
  });

  // Phase 4: Tug of War (group stage)
  await generateAndSave({
    sport: 'Tug of War',
    teams: ['ZAM', 'BAR', 'HAL', 'SHA', 'TEH', 'TOW'],
    groups: {
      'Group A': ['ZAM', 'BAR', 'HAL'],
      'Group B': ['SHA', 'TEH', 'TOW'],
    },
    startDate: baseDate,
    startTimeMinutes: 913, // 15:13
    durationMinutes: 10,
    venues: ['Tug Area 1', 'Tug Area 2'],
    concurrent: true,
    breakMinutes: 0,
  });

  return { success: true, message: 'KALIFE 2026 schedule generated' };
}
