import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/fixtures?status=&sport=&district=
router.get('/', async (req, res) => {
  try {
    const { status, sport, district } = req.query;
    let sql = `
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.color as team_b_color,
        v.name as venue_name, s.name as sport_name
      FROM fixtures f
      JOIN districts a ON f.team_a_id = a.id
      JOIN districts b ON f.team_b_id = b.id
      JOIN venues v ON f.venue_id = v.id
      JOIN sports s ON f.sport_id = s.id
      WHERE f.organization_id = $1
    `;
    const params = [req.orgId];
    let idx = 2;

    if (status) { sql += ` AND f.status = $${idx++}`; params.push(status); }
    if (sport) { sql += ` AND s.name = $${idx++}`; params.push(sport); }
    if (district) { sql += ` AND (a.code = $${idx} OR b.code = $${idx})`; params.push(district); }

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
      SELECT f.*, a.code as team_a_code, b.code as team_b_code, s.name as sport_name, v.name as venue_name
      FROM fixtures f
      JOIN districts a ON f.team_a_id = a.id
      JOIN districts b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      JOIN venues v ON f.venue_id = v.id
      WHERE f.id = $1 AND f.organization_id = $2
    `, [req.params.id, req.orgId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET district schedule
router.get('/district/:code/schedule', async (req, res) => {
  try {
    const result = await query(`
      SELECT f.*, a.code as team_a_code, a.name as team_a_name, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.color as team_b_color,
        s.name as sport_name, v.name as venue_name
      FROM fixtures f
      JOIN districts a ON f.team_a_id = a.id
      JOIN districts b ON f.team_b_id = b.id
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

export default router;
