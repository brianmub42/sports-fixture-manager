import { Router } from 'express';
import { query } from '../db.js';
import { generateSchedule } from '../lib/scheduler.js';
import { authMiddleware } from '../middleware/auth.js';
import { detectConflicts } from '../lib/conflictDetector.js';

const router = Router();

async function getOrCreateDistrict(orgId, identifier) {
  const cleanId = identifier.trim();
  if (!cleanId) return null;

  // 1. Try to find by code (exact match, uppercase) or name (case-insensitive)
  const exactRes = await query(
    'SELECT id, code, name, color FROM districts WHERE (UPPER(code) = $1 OR UPPER(name) = $2) AND organization_id = $3',
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
      const checkRes = await query('SELECT id FROM districts WHERE code = $1 AND organization_id = $2', [candidate, orgId]);
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
    'INSERT INTO districts (organization_id, code, name, color) VALUES ($1, $2, $3, $4) RETURNING id, code, name, color',
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
      saveToDb = false
    } = req.body;

    // Validate
    if (!teams || !Array.isArray(teams) || teams.length < 2) {
      return res.status(400).json({ error: 'At least 2 teams required' });
    }
    if (!sport) return res.status(400).json({ error: 'Sport name required' });
    if (!startDate) return res.status(400).json({ error: 'Start date required' });
    if (!venues || !Array.isArray(venues) || venues.length === 0) {
      return res.status(400).json({ error: 'At least 1 venue required' });
    }

    // Get sport ID (auto-create missing)
    let sportRes = await query('SELECT id, win_points, draw_points FROM sports WHERE name = $1 AND organization_id = $2', [sport, req.orgId]);
    if (sportRes.rows.length === 0) {
      sportRes = await query(
        "INSERT INTO sports (organization_id, name, scoring_type, win_points, draw_points) VALUES ($1, $2, 'points', 3, 1) RETURNING id, win_points, draw_points",
        [req.orgId, sport]
      );
    }
    const sportId = sportRes.rows[0].id;

    // Get venue IDs (auto-create missing)
    const venueIds = [];
    for (const venueName of venues) {
      let vRes = await query('SELECT id FROM venues WHERE name = $1 AND organization_id = $2', [venueName, req.orgId]);
      if (vRes.rows.length === 0) {
        vRes = await query('INSERT INTO venues (organization_id, name, type) VALUES ($1, $2, $3) RETURNING id', [req.orgId, venueName, 'court']);
      }
      venueIds.push({ id: vRes.rows[0].id, name: venueName });
    }

    // Resolve all input team names/codes to district database objects (creating them if missing)
    const districtMap = {}; // Maps input string -> district object
    const allTeamInputs = groups ? groups.flat() : teams;
    for (const input of allTeamInputs) {
      const district = await getOrCreateDistrict(req.orgId, input);
      districtMap[input] = district;
    }

    // Map scheduler input to use unique codes
    const teamsForScheduler = teams.map(t => districtMap[t].code);
    const groupsForScheduler = groups ? groups.map(group => group.map(t => districtMap[t].code)) : null;

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

    // Create a map from code to district object to look up by match.pair codes
    const districtByCode = {};
    Object.values(districtMap).forEach(d => {
      districtByCode[d.code] = d;
    });

    // Build response fixtures
    const fixtures = schedule.map((match, idx) => {
      // For playoff brackets, future-round teams may be null until previous round is played
      const teamA = match.pair[0] ? districtByCode[match.pair[0]] : null;
      const teamB = match.pair[1] ? districtByCode[match.pair[1]] : null;
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
      JOIN districts a ON f.team_a_id = a.id
      JOIN districts b ON f.team_b_id = b.id
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

/**
 * POST /api/generate/preview
 * Same as above but never saves to DB — for preview only
 */
router.post('/preview', async (req, res) => {
  req.body.saveToDb = false;
  // Forward to main handler
  return router.handle(req, res); // Actually we'll just call the logic directly
});

export default router;
