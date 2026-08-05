import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const teamMetricsResult = await query(`
      SELECT 
        d.id, d.code, d.name, d.color, d.logo_url,
        COUNT(f.id) as played,
        SUM(CASE WHEN f.winner_id = d.id THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN f.team_a_id = d.id THEN f.score_a ELSE f.score_b END) as pf,
        SUM(CASE WHEN f.team_a_id = d.id THEN f.score_b ELSE f.score_a END) as pa,
        SUM(CASE WHEN f.team_a_id = d.id THEN f.score_a ELSE f.score_b END) - SUM(CASE WHEN f.team_a_id = d.id THEN f.score_b ELSE f.score_a END) as point_diff
      FROM districts d
      LEFT JOIN fixtures f ON (f.team_a_id = d.id OR f.team_b_id = d.id) AND f.status IN ('completed', 'draw') AND f.organization_id = $1
      WHERE d.organization_id = $1
      GROUP BY d.id, d.code, d.name, d.color, d.logo_url
      ORDER BY point_diff DESC NULLS LAST
    `, [req.orgId]);

    const blowoutResult = await query(`
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.logo_url as team_a_logo, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.logo_url as team_b_logo, b.color as team_b_color,
        s.name as sport_name
      FROM fixtures f
      JOIN districts a ON f.team_a_id = a.id
      JOIN districts b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      WHERE f.status = 'completed' AND f.organization_id = $1
      ORDER BY ABS(f.score_a - f.score_b) DESC
      LIMIT 1
    `, [req.orgId]);

    const highestScoringResult = await query(`
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.logo_url as team_a_logo, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.logo_url as team_b_logo, b.color as team_b_color,
        s.name as sport_name
      FROM fixtures f
      JOIN districts a ON f.team_a_id = a.id
      JOIN districts b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      WHERE f.status = 'completed' AND f.organization_id = $1
      ORDER BY (f.score_a + f.score_b) DESC
      LIMIT 1
    `, [req.orgId]);

    const lowestScoringResult = await query(`
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.logo_url as team_a_logo, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.logo_url as team_b_logo, b.color as team_b_color,
        s.name as sport_name
      FROM fixtures f
      JOIN districts a ON f.team_a_id = a.id
      JOIN districts b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      WHERE f.status = 'completed' AND f.organization_id = $1
      ORDER BY (f.score_a + f.score_b) ASC
      LIMIT 1
    `, [req.orgId]);

    res.json({
      teamMetrics: teamMetricsResult.rows,
      records: {
        biggestBlowout: blowoutResult.rows[0] || null,
        highestScoring: highestScoringResult.rows[0] || null,
        lowestScoring: lowestScoringResult.rows[0] || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
