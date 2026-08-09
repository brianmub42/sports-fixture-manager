import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireScorekeeperOrAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/fixtures?status=&sport=&team=
router.get('/', async (req, res) => {
  try {
    const { status, sport, team, district } = req.query;
    const teamFilter = team || district;
    let sql = `
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.color as team_a_color, a.logo_url as team_a_logo,
        b.code as team_b_code, b.name as team_b_name, b.color as team_b_color, b.logo_url as team_b_logo,
        v.name as venue_name, s.name as sport_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN venues v ON f.venue_id = v.id
      JOIN sports s ON f.sport_id = s.id
      WHERE f.organization_id = $1
    `;
    const params = [req.orgId];
    let idx = 2;

    if (status) { sql += ` AND f.status = $${idx++}`; params.push(status); }
    if (sport) { sql += ` AND s.name = $${idx++}`; params.push(sport); }
    if (teamFilter) { sql += ` AND (a.code = $${idx} OR b.code = $${idx})`; params.push(teamFilter); }

    sql += ' ORDER BY f.scheduled_at ASC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fixtures/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*, a.code as team_a_code, a.name as team_a_name, b.code as team_b_code, b.name as team_b_name, s.name as sport_name, v.name as venue_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      JOIN venues v ON f.venue_id = v.id
      WHERE f.id = $1 AND f.organization_id = $2
    `, [req.params.id, req.orgId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET team schedule
router.get('/team/:code/schedule', async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*, a.code as team_a_code, a.name as team_a_name, a.color as team_a_color, a.logo_url as team_a_logo,
        b.code as team_b_code, b.name as team_b_name, b.color as team_b_color, b.logo_url as team_b_logo,
        s.name as sport_name, v.name as venue_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      JOIN venues v ON f.venue_id = v.id
      WHERE (a.code = $1 OR b.code = $1) AND f.organization_id = $2
      ORDER BY f.scheduled_at ASC
    `, [req.params.code, req.orgId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy /district/:code/schedule support
router.get('/district/:code/schedule', async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*, a.code as team_a_code, a.name as team_a_name, a.color as team_a_color, a.logo_url as team_a_logo,
        b.code as team_b_code, b.name as team_b_name, b.color as team_b_color, b.logo_url as team_b_logo,
        s.name as sport_name, v.name as venue_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      JOIN venues v ON f.venue_id = v.id
      WHERE (a.code = $1 OR b.code = $1) AND f.organization_id = $2
      ORDER BY f.scheduled_at ASC
    `, [req.params.code, req.orgId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fixtures/:id/lineups
router.get('/:id/lineups', async (req, res) => {
  try {
    const result = await query(`
      SELECT fl.*, p.name as player_name, p.jersey_number
      FROM fixture_lineups fl
      JOIN players p ON fl.player_id = p.id
      WHERE fl.fixture_id = $1
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fixtures/:id/lineups (Scorekeeper/Admin)
router.post('/:id/lineups', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const { teamId, playerIds } = req.body;
    const fixtureId = req.params.id;

    if (!teamId || !Array.isArray(playerIds)) {
      return res.status(400).json({ error: 'teamId and playerIds (array) are required' });
    }

    // Verify fixture exists
    const fixtureRes = await query('SELECT id FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);
    if (fixtureRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Verify team exists and belongs to organization
    const teamRes = await query('SELECT id FROM teams WHERE id = $1 AND organization_id = $2', [teamId, req.orgId]);
    if (teamRes.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Clear old lineup for this team in this fixture
    await query('DELETE FROM fixture_lineups WHERE fixture_id = $1 AND team_id = $2', [fixtureId, teamId]);

    // Insert new lineup
    for (const playerId of playerIds) {
      await query(
        'INSERT INTO fixture_lineups (fixture_id, team_id, player_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [fixtureId, teamId, playerId]
      );
    }

    res.json({ success: true, message: 'Lineup updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
