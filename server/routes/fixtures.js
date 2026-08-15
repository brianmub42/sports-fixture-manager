import { Router } from 'express';
import { query } from '../db.js';
import { authMiddleware, requireScorekeeperOrAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/fixtures?status=&sport=&team=
router.get('/', async (req, res) => {
  try {
    const { status, sport, team, district } = req.query;
    const teamFilter = team || district;

    let isPlacementSport = false;
    if (sport) {
      const spRes = await query('SELECT scoring_type FROM sports WHERE name = $1 AND organization_id = $2', [sport, req.orgId]);
      if (spRes.rows.length > 0 && spRes.rows[0].scoring_type === 'placement') {
        isPlacementSport = true;
      }
    }
    const isAllSports = !sport;

    let sqlParts = [];
    const params = [req.orgId];
    let idx = 2;

    // 1. Build Fixtures Query (for points-based sports)
    if (isAllSports || (!isPlacementSport && sport)) {
      let fixturesSql = `
        SELECT f.id, f.organization_id, f.sport_id, f.venue_id, f.scheduled_at, f.duration_minutes, f.status,
          a.name as team_a_name, a.code as team_a_code, a.color as team_a_color, a.logo_url as team_a_logo,
          b.name as team_b_name, b.code as team_b_code, b.color as team_b_color, b.logo_url as team_b_logo,
          f.score_a, f.score_b, f.winner_id, f.notes, f.created_at, f.updated_at,
          v.name as venue_name, s.name as sport_name, s.scoring_type as scoring_type
        FROM fixtures f
        JOIN teams a ON f.team_a_id = a.id
        JOIN teams b ON f.team_b_id = b.id
        JOIN venues v ON f.venue_id = v.id
        JOIN sports s ON f.sport_id = s.id
        WHERE f.organization_id = $1
      `;
      let fIdx = idx;
      let fParams = [...params];
      if (status) { fixturesSql += ` AND f.status = $${fIdx++}`; fParams.push(status); }
      if (sport) { fixturesSql += ` AND s.name = $${fIdx++}`; fParams.push(sport); }
      if (teamFilter) { fixturesSql += ` AND (a.code = $${fIdx} OR b.code = $${fIdx})`; fParams.push(teamFilter); }
      sqlParts.push({ sql: fixturesSql, params: fParams });
    }

    // 2. Build Athletics Events Query (for placement-based sports)
    if (isAllSports || isPlacementSport) {
      let athleticsSql = `
        SELECT 
          ae.id,
          ae.organization_id,
          ae.sport_id,
          ae.venue_id,
          ae.scheduled_at,
          ae.duration_minutes,
          ae.status,
          ae.name || ' (' || ae.category || ')' as team_a_name,
          NULL as team_a_code,
          NULL as team_a_color,
          NULL as team_a_logo,
          (
            SELECT string_agg(t.code || ': ' || ar.placement, ', ' ORDER BY ar.placement ASC)
            FROM athletics_results ar
            JOIN teams t ON ar.team_id = t.id
            WHERE ar.event_id = ae.id AND ar.placement <= 3
          ) as team_b_name,
          NULL as team_b_code,
          NULL as team_b_color,
          NULL as team_b_logo,
          NULL as score_a,
          NULL as score_b,
          NULL as winner_id,
          NULL as notes,
          ae.created_at,
          ae.created_at as updated_at,
          v.name as venue_name,
          s.name as sport_name,
          s.scoring_type as scoring_type
        FROM athletics_events ae
        JOIN venues v ON ae.venue_id = v.id
        JOIN sports s ON ae.sport_id = s.id
        WHERE ae.organization_id = $1
      `;
      let aIdx = idx;
      let aParams = [...params];
      if (status) {
        if (status === 'completed') {
          athleticsSql += ` AND ae.status = 'completed'`;
        } else if (status === 'upcoming') {
          athleticsSql += ` AND ae.status = 'upcoming'`;
        } else {
          athleticsSql += ` AND ae.status = $${aIdx++}`;
          aParams.push(status);
        }
      }
      if (sport) {
        athleticsSql += ` AND s.name = $${aIdx++}`;
        aParams.push(sport);
      }
      if (teamFilter) {
        athleticsSql += ` AND EXISTS (
          SELECT 1 FROM athletics_results ar
          JOIN teams t2 ON ar.team_id = t2.id
          WHERE ar.event_id = ae.id AND t2.code = $${aIdx++}
        )`;
        aParams.push(teamFilter);
      }
      sqlParts.push({ sql: athleticsSql, params: aParams });
    }

    // Execute queries and merge results
    let finalRows = [];
    if (sqlParts.length === 1) {
      const queryRes = await query(sqlParts[0].sql + ' ORDER BY scheduled_at ASC', sqlParts[0].params);
      finalRows = queryRes.rows;
    } else {
      // Execute both separately to avoid param index conflicts in union
      const resFixtures = await query(sqlParts[0].sql, sqlParts[0].params);
      const resAthletics = await query(sqlParts[1].sql, sqlParts[1].params);
      finalRows = [...resFixtures.rows, ...resAthletics.rows];
      finalRows.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    }

    res.json(finalRows);
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
      SELECT f.id, f.organization_id, f.sport_id, f.venue_id, f.scheduled_at, f.duration_minutes, f.status,
        a.name as team_a_name, a.code as team_a_code, a.color as team_a_color, a.logo_url as team_a_logo,
        b.name as team_b_name, b.code as team_b_code, b.color as team_b_color, b.logo_url as team_b_logo,
        f.score_a, f.score_b, f.winner_id, f.notes, f.created_at, f.updated_at,
        s.name as sport_name, v.name as venue_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      JOIN venues v ON f.venue_id = v.id
      WHERE (a.code = $1 OR b.code = $1) AND f.organization_id = $2

      UNION ALL

      SELECT 
        ae.id,
        ae.organization_id,
        ae.sport_id,
        ae.venue_id,
        ae.scheduled_at,
        ae.duration_minutes,
        ae.status,
        ae.name || ' (' || ae.category || ')' as team_a_name,
        NULL as team_a_code,
        NULL as team_a_color,
        NULL as team_a_logo,
        (
          SELECT string_agg(t.code || ': ' || ar.placement, ', ' ORDER BY ar.placement ASC)
          FROM athletics_results ar
          JOIN teams t ON ar.team_id = t.id
          WHERE ar.event_id = ae.id AND ar.placement <= 3
        ) as team_b_name,
        NULL as team_b_code,
        NULL as team_b_color,
        NULL as team_b_logo,
        NULL as score_a,
        NULL as score_b,
        NULL as winner_id,
        NULL as notes,
        ae.created_at,
        ae.created_at as updated_at,
        s.name as sport_name,
        v.name as venue_name
      FROM athletics_events ae
      JOIN venues v ON ae.venue_id = v.id
      JOIN sports s ON ae.sport_id = s.id
      WHERE ae.organization_id = $2
        AND EXISTS (
          SELECT 1 FROM athletics_results ar
          JOIN teams t2 ON ar.team_id = t2.id
          WHERE ar.event_id = ae.id AND t2.code = $1
        )

      ORDER BY scheduled_at ASC
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
      SELECT f.id, f.organization_id, f.sport_id, f.venue_id, f.scheduled_at, f.duration_minutes, f.status,
        a.name as team_a_name, a.code as team_a_code, a.color as team_a_color, a.logo_url as team_a_logo,
        b.name as team_b_name, b.code as team_b_code, b.color as team_b_color, b.logo_url as team_b_logo,
        f.score_a, f.score_b, f.winner_id, f.notes, f.created_at, f.updated_at,
        s.name as sport_name, v.name as venue_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      JOIN venues v ON f.venue_id = v.id
      WHERE (a.code = $1 OR b.code = $1) AND f.organization_id = $2

      UNION ALL

      SELECT 
        ae.id,
        ae.organization_id,
        ae.sport_id,
        ae.venue_id,
        ae.scheduled_at,
        ae.duration_minutes,
        ae.status,
        ae.name || ' (' || ae.category || ')' as team_a_name,
        NULL as team_a_code,
        NULL as team_a_color,
        NULL as team_a_logo,
        (
          SELECT string_agg(t.code || ': ' || ar.placement, ', ' ORDER BY ar.placement ASC)
          FROM athletics_results ar
          JOIN teams t ON ar.team_id = t.id
          WHERE ar.event_id = ae.id AND ar.placement <= 3
        ) as team_b_name,
        NULL as team_b_code,
        NULL as team_b_color,
        NULL as team_b_logo,
        NULL as score_a,
        NULL as score_b,
        NULL as winner_id,
        NULL as notes,
        ae.created_at,
        ae.created_at as updated_at,
        s.name as sport_name,
        v.name as venue_name
      FROM athletics_events ae
      JOIN venues v ON ae.venue_id = v.id
      JOIN sports s ON ae.sport_id = s.id
      WHERE ae.organization_id = $2
        AND EXISTS (
          SELECT 1 FROM athletics_results ar
          JOIN teams t2 ON ar.team_id = t2.id
          WHERE ar.event_id = ae.id AND t2.code = $1
        )

      ORDER BY scheduled_at ASC
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

// DELETE /api/fixtures/:id (Scorekeeper/Admin)
router.delete('/:id', authMiddleware, requireScorekeeperOrAdmin, async (req, res) => {
  try {
    const fixtureId = req.params.id;

    // Verify fixture exists and belongs to organization
    const fixtureRes = await query('SELECT id FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);
    if (fixtureRes.rows.length === 0) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Delete the fixture
    await query('DELETE FROM fixtures WHERE id = $1 AND organization_id = $2', [fixtureId, req.orgId]);

    // Broadcast update via Socket.io if available
    if (req.io) {
      req.io.to(`tenant-${req.orgId}`).emit('score-updated', { fixtureId, deleted: true });
    }

    res.json({ success: true, message: 'Fixture deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
