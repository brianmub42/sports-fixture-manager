import { Router } from 'express';
import { query } from '../db.js';
import { generateSchedule, generateAthleticsSchedule } from '../lib/scheduler.js';
import { authMiddleware } from '../middleware/auth.js';
import { detectConflicts } from '../lib/conflictDetector.js';

const router = Router();

async function getOrCreateTeam(orgId, identifier) {
  const cleanId = identifier.trim();
  if (!cleanId) return null;

  // 1. Try to find by code (exact match, uppercase) or name (case-insensitive)
  const exactRes = await query(
    'SELECT id, code, name, color FROM teams WHERE (UPPER(code) = $1 OR UPPER(name) = $2) AND organization_id = $3',
    [cleanId.toUpperCase(), cleanId.toUpperCase(), orgId]
  );

  if (exactRes.rows.length > 0) {
    return exactRes.rows[0];
  }

  // 2. If not found, create a new one!
  let code = '';
  let name = '';

  if (cleanId.length <= 3) {
    code = cleanId.toUpperCase();
    name = cleanId;
  } else {
    // Generate a unique 3-letter code
    const baseCode = cleanId.replace(/[^a-zA-Z]/g, '').toUpperCase();
    let candidate = baseCode.slice(0, 3);
    
    if (candidate.length < 3) {
      candidate = (candidate + 'XXX').slice(0, 3);
    }

    let suffix = 1;
    let isUnique = false;
    while (!isUnique) {
      const checkRes = await query('SELECT id FROM teams WHERE code = $1 AND organization_id = $2', [candidate, orgId]);
      if (checkRes.rows.length === 0) {
        isUnique = true;
      } else {
        if (suffix < 10) {
          candidate = baseCode.slice(0, 2) + suffix;
        } else {
          candidate = Math.random().toString(36).substring(2, 5).toUpperCase();
        }
        suffix++;
      }
    }
    code = candidate;
    name = cleanId;
  }

  const colors = [
    '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', 
    '#0891b2', '#ec4899', '#eab308', '#14b8a6', '#6366f1'
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const insertRes = await query(
    'INSERT INTO teams (organization_id, code, name, color) VALUES ($1, $2, $3, $4) RETURNING id, code, name, color',
    [orgId, code, name, color]
  );
  
  return insertRes.rows[0];
}

/**
 * POST /api/generate
 * Body: {
 *   teams: ['ZAM', 'BAR', 'HAL', 'SHA', 'TEH', 'TOW'],
 *   sport: 'Basketball',
 *   startDate: '2026-08-01T09:48:00',
 *   durationMinutes: 10,
 *   breakMinutes: 0,
 *   format: 'single', // 'single', 'double', 'group'
 *   venues: ['BB Court'],
 *   concurrent: 1,
 *   saveToDb: false // if true, inserts into fixtures table
 * }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      teams,
      sport,
      startDate,
      durationMinutes = 10,
      breakMinutes = 0,
      format = 'single',
      venues,
      concurrent = 1,
      groups = null,
      saveToDb = false,
      saveCustom = false,
      fixtures: customFixtures
    } = req.body;

    if (saveCustom && customFixtures && Array.isArray(customFixtures)) {
      if (!sport) return res.status(400).json({ error: 'Sport name required' });
      
      // Get or create sport ID
      let sportRes = await query('SELECT id, scoring_type FROM sports WHERE name = $1 AND organization_id = $2', [sport, req.orgId]);
      if (sportRes.rows.length === 0) {
        sportRes = await query(
          "INSERT INTO sports (organization_id, name, scoring_type, win_points, draw_points) VALUES ($1, $2, 'points', 3, 1) RETURNING id, scoring_type",
          [req.orgId, sport]
        );
      }
      const sportId = sportRes.rows[0].id;
      const scoringType = sportRes.rows[0].scoring_type;

      if (scoringType === 'placement' || format === 'placement') {
        for (const e of customFixtures) {
          await query(`
            INSERT INTO athletics_events (organization_id, sport_id, venue_id, name, category, scheduled_at, duration_minutes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [req.orgId, sportId, e.venue_id, e.name, e.category, e.scheduled_at, e.duration || 15, e.status || 'upcoming']);
        }
      } else {
        for (const f of customFixtures) {
          await query(`
            INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [req.orgId, sportId, f.venue_id, f.round, f.team_a_id, f.team_b_id, f.scheduled_at, f.duration || 10, f.status || 'upcoming', f.notes]);
        }
      }

      return res.json({
        success: true,
        count: customFixtures.length,
        message: 'Custom edited fixtures saved successfully!'
      });
    }

    if (!sport) return res.status(400).json({ error: 'Sport name required' });
    if (!startDate) return res.status(400).json({ error: 'Start date required' });
    if (!venues || !Array.isArray(venues) || venues.length === 0) {
      return res.status(400).json({ error: 'At least 1 venue required' });
    }

    // Get sport ID (auto-create missing)
    let sportRes = await query('SELECT id, win_points, draw_points, scoring_type FROM sports WHERE name = $1 AND organization_id = $2', [sport, req.orgId]);
    if (sportRes.rows.length === 0) {
      sportRes = await query(
        "INSERT INTO sports (organization_id, name, scoring_type, win_points, draw_points) VALUES ($1, $2, 'points', 3, 1) RETURNING id, win_points, draw_points, scoring_type",
        [req.orgId, sport]
      );
    }
    const sportId = sportRes.rows[0].id;
    const scoringType = sportRes.rows[0].scoring_type;
    console.log('GENERATE DIAGNOSTICS:', { sport, format, orgId: req.orgId, scoringType, sportId, body: req.body });

    if (scoringType === 'placement' || format === 'placement') {
      const { events, categories, genders, ageGroups, teams } = req.body;
      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'At least 1 event required' });
      }

      const hasGenders = genders && Array.isArray(genders) && genders.length > 0;
      const hasAgeGroups = ageGroups && Array.isArray(ageGroups) && ageGroups.length > 0;
      const hasCategories = categories && Array.isArray(categories) && categories.length > 0;

      if (!hasCategories && (!hasGenders || !hasAgeGroups)) {
        return res.status(400).json({ error: 'Please specify Genders and Age Groups (or Categories) for athletics events' });
      }

      const concurrentNum = parseInt(concurrent) || 1;
      if (concurrentNum > venues.length) {
        return res.status(400).json({ error: `Events Per Round (${concurrentNum}) cannot exceed the number of venues (${venues.length}).` });
      }

      // Resolve all input team names/codes to team database objects (creating them if missing)
      if (teams && Array.isArray(teams)) {
        for (const input of teams) {
          await getOrCreateTeam(req.orgId, input);
        }
      }

      // Get venue IDs (auto-create missing)
      const venueIds = [];
      for (const venueName of venues) {
        let vRes = await query('SELECT id FROM venues WHERE name = $1 AND organization_id = $2', [venueName, req.orgId]);
        if (vRes.rows.length === 0) {
          vRes = await query('INSERT INTO venues (organization_id, name, type) VALUES ($1, $2, $3) RETURNING id', [req.orgId, venueName, 'court']);
        }
        venueIds.push({ id: vRes.rows[0].id, name: venueName });
      }

      // Generate schedule
      const schedule = generateAthleticsSchedule({
        events,
        categories,
        genders,
        ageGroups,
        startDate,
        durationMinutes,
        breakMinutes,
        venues: venueIds.map(v => v.name),
        concurrent: concurrentNum
      });

      // Build response events
      const generatedEvents = schedule.map((item, idx) => {
        return {
          id: `gen-${idx}`,
          round: item.round,
          name: item.name,
          category: item.category,
          venue: item.venue,
          venue_id: venueIds.find(v => v.name === item.venue)?.id,
          sport: sport,
          sport_id: sportId,
          scheduled_at: item.startTime,
          end_time: item.endTime,
          duration: item.duration,
          status: 'upcoming'
        };
      });

      // Fetch existing athletics events to check for conflicts
      const existingRes = await query(`
        SELECT ae.id, ae.scheduled_at, ae.duration_minutes, ae.venue_id,
          v.name as venue_name, s.name as sport_name
        FROM athletics_events ae
        JOIN venues v ON ae.venue_id = v.id
        JOIN sports s ON ae.sport_id = s.id
        WHERE ae.organization_id = $1
      `, [req.orgId]);

      // Detect venue conflicts
      const allEvents = [...existingRes.rows, ...generatedEvents];
      const allConflicts = detectConflicts(allEvents);
      const warnings = allConflicts
        .filter(c => 
          (typeof c.matchA.id === 'string' && c.matchA.id.startsWith('gen-')) || 
          (typeof c.matchB.id === 'string' && c.matchB.id.startsWith('gen-'))
        )
        .map(c => c.message);

      // Save to database if requested
      if (saveToDb) {
        for (const e of generatedEvents) {
          await query(`
            INSERT INTO athletics_events (organization_id, sport_id, venue_id, name, category, scheduled_at, duration_minutes, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [req.orgId, e.sport_id, e.venue_id, e.name, e.category, e.scheduled_at, e.duration, e.status]);
        }
      }

      return res.json({
        success: true,
        count: generatedEvents.length,
        fixtures: generatedEvents.map(e => ({
          ...e,
          team_a_name: `${e.name} (${e.category})`,
          team_b_name: 'All Teams compete',
          team_a_color: '#f59e0b',
          team_b_color: '#6b7280'
        })),
        warnings,
        summary: {
          events: events.length,
          genders: genders?.length || 0,
          ageGroups: ageGroups?.length || 0,
          categories: categories?.length || 0,
          sport,
          format: 'placement',
          totalMatches: generatedEvents.length,
          estimatedEnd: generatedEvents[generatedEvents.length - 1]?.end_time,
          savedToDb: saveToDb
        }
      });
    }

    // Points-based sports logic
    if (!teams || !Array.isArray(teams) || teams.length < 2) {
      return res.status(400).json({ error: 'At least 2 teams required' });
    }

    const concurrentNum = parseInt(concurrent) || 1;
    if (concurrentNum > venues.length) {
      return res.status(400).json({ error: `Matches Per Round (${concurrentNum}) cannot exceed the number of venues (${venues.length}).` });
    }
    if (concurrentNum * 2 > teams.length) {
      return res.status(400).json({ error: `Matches Per Round (${concurrentNum}) requires at least ${concurrentNum * 2} active teams, but only ${teams.length} team(s) were provided.` });
    }

    // Get venue IDs (auto-create missing)
    const venueIds = [];
    for (const venueName of venues) {
      let vRes = await query('SELECT id FROM venues WHERE name = $1 AND organization_id = $2', [venueName, req.orgId]);
      if (vRes.rows.length === 0) {
        vRes = await query('INSERT INTO venues (organization_id, name, type) VALUES ($1, $2, $3) RETURNING id', [req.orgId, venueName, 'court']);
      }
      venueIds.push({ id: vRes.rows[0].id, name: venueName });
    }

    // Resolve all input team names/codes to team database objects (creating them if missing)
    const teamMap = {}; // Maps input string -> team object
    const allTeamInputs = groups ? groups.flat() : teams;
    for (const input of allTeamInputs) {
      const teamObj = await getOrCreateTeam(req.orgId, input);
      teamMap[input] = teamObj;
    }

    // Map scheduler input to use unique codes
    const teamsForScheduler = teams.map(t => teamMap[t].code);
    const groupsForScheduler = groups ? groups.map(group => group.map(t => teamMap[t].code)) : null;

    // Generate schedule
    const schedule = generateSchedule({
      teams: teamsForScheduler,
      startDate,
      durationMinutes,
      breakMinutes,
      format,
      venues: venueIds.map(v => v.name),
      concurrent,
      groups: groupsForScheduler
    });

    // Create a map from code to team object to look up by match.pair codes
    const teamByCode = {};
    Object.values(teamMap).forEach(t => {
      teamByCode[t.code] = t;
    });

    // Build response fixtures
    const fixtures = schedule.map((match, idx) => {
      // For playoff brackets, future-round teams may be null until previous round is played
      const teamA = match.pair[0] ? teamByCode[match.pair[0]] : null;
      const teamB = match.pair[1] ? teamByCode[match.pair[1]] : null;
      return {
        id: `gen-${idx}`,
        round: match.round,
        venue: match.venue,
        venue_id: venueIds.find(v => v.name === match.venue)?.id,
        sport: sport,
        sport_id: sportId,
        team_a: teamA?.code || null,
        team_a_name: teamA?.name || 'TBD',
        team_a_color: teamA?.color || '#6b7280',
        team_a_id: teamA?.id || null,
        team_b: teamB?.code || null,
        team_b_name: teamB?.name || 'TBD',
        team_b_color: teamB?.color || '#6b7280',
        team_b_id: teamB?.id || null,
        scheduled_at: match.startTime,
        end_time: match.endTime,
        duration: match.duration,
        status: 'upcoming',
        // Prefer playoff source notes over group stage group label
        notes: match.notes || match.group || null
      };
    });

    // Fetch existing fixtures from database to run overlap checks against
    const existingRes = await query(`
      SELECT f.id, f.scheduled_at, f.duration_minutes, f.venue_id, f.team_a_id, f.team_b_id,
        v.name as venue_name, s.name as sport_name,
        a.code as team_a_code, a.name as team_a_name,
        b.code as team_b_code, b.name as team_b_name
      FROM fixtures f
      JOIN venues v ON f.venue_id = v.id
      JOIN sports s ON f.sport_id = s.id
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      WHERE f.organization_id = $1
    `, [req.orgId]);

    const allFixtures = [...existingRes.rows, ...fixtures];
    const allConflicts = detectConflicts(allFixtures);
    
    // Filter to only include conflicts involving the newly generated fixtures
    const warnings = allConflicts
      .filter(c => 
        (typeof c.matchA.id === 'string' && c.matchA.id.startsWith('gen-')) || 
        (typeof c.matchB.id === 'string' && c.matchB.id.startsWith('gen-'))
      )
      .map(c => c.message);

    // Optionally save to database
    if (saveToDb) {
      for (const f of fixtures) {
        await query(`
          INSERT INTO fixtures (organization_id, sport_id, venue_id, round, team_a_id, team_b_id, scheduled_at, duration_minutes, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [req.orgId, f.sport_id, f.venue_id, f.round, f.team_a_id, f.team_b_id, f.scheduled_at, f.duration, f.status, f.notes]);
      }
    }

    res.json({
      success: true,
      count: fixtures.length,
      fixtures,
      warnings,
      summary: {
        teams: teams.length,
        sport,
        format,
        totalMatches: fixtures.length,
        estimatedEnd: fixtures[fixtures.length - 1]?.end_time,
        savedToDb: saveToDb
      }
    });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
