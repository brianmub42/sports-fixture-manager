import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const { sport } = req.query;
    const params = [req.orgId];
    let idx = 2;

    // 1. Team Metrics Query
    let teamMetricsSql = `
      SELECT 
        t.id, t.code, t.name, t.color, t.logo_url,
        COUNT(f.id) as played,
        SUM(CASE WHEN f.winner_id = t.id THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN f.status = 'draw' THEN 1 ELSE 0 END) as drawn,
        SUM(CASE WHEN (f.status = 'completed' AND f.winner_id != t.id) THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END) as pf,
        SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END) as pa,
        SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END) - SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END) as point_diff
      FROM teams t
    `;
    if (sport && sport !== 'All') {
      teamMetricsSql += `
        LEFT JOIN fixtures f ON (f.team_a_id = t.id OR f.team_b_id = t.id) 
          AND f.status IN ('completed', 'draw') 
          AND f.organization_id = $1
          AND f.sport_id = (SELECT id FROM sports WHERE name = $2 AND organization_id = $1)
      `;
    } else {
      teamMetricsSql += `
        LEFT JOIN fixtures f ON (f.team_a_id = t.id OR f.team_b_id = t.id) 
          AND f.status IN ('completed', 'draw') 
          AND f.organization_id = $1
      `;
    }
    teamMetricsSql += `
      WHERE t.organization_id = $1
      GROUP BY t.id, t.code, t.name, t.color, t.logo_url
      ORDER BY won DESC, point_diff DESC NULLS LAST
    `;

    // 2. Records Queries (Blowout, Highest, Lowest Scoring)
    let recordsFilter = ` WHERE f.status IN ('completed', 'draw') AND f.organization_id = $1`;
    if (sport && sport !== 'All') {
      recordsFilter += ` AND s.name = $2`;
    }

    const blowoutSql = `
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.logo_url as team_a_logo, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.logo_url as team_b_logo, b.color as team_b_color,
        s.name as sport_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      ${recordsFilter}
      ORDER BY ABS(f.score_a - f.score_b) DESC NULLS LAST
      LIMIT 1
    `;

    const highestScoringSql = `
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.logo_url as team_a_logo, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.logo_url as team_b_logo, b.color as team_b_color,
        s.name as sport_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      ${recordsFilter}
      ORDER BY (f.score_a + f.score_b) DESC NULLS LAST
      LIMIT 1
    `;

    const lowestScoringSql = `
      SELECT f.*, 
        a.code as team_a_code, a.name as team_a_name, a.logo_url as team_a_logo, a.color as team_a_color,
        b.code as team_b_code, b.name as team_b_name, b.logo_url as team_b_logo, b.color as team_b_color,
        s.name as sport_name
      FROM fixtures f
      JOIN teams a ON f.team_a_id = a.id
      JOIN teams b ON f.team_b_id = b.id
      JOIN sports s ON f.sport_id = s.id
      ${recordsFilter}
      ORDER BY (f.score_a + f.score_b) ASC NULLS LAST
      LIMIT 1
    `;

    // 3. Top Scorers Query
    let topScorersSql = `
      SELECT p.id, p.name, p.jersey_number, t.name as team_name, t.code as team_code, t.color as team_color, t.logo_url as team_logo, SUM(ps.points_scored) as total_points
      FROM players p
      JOIN player_stats ps ON p.id = ps.player_id
      JOIN fixtures f ON ps.fixture_id = f.id
      JOIN sports s ON f.sport_id = s.id
      JOIN teams t ON p.team_id = t.id
      WHERE t.organization_id = $1
    `;
    if (sport && sport !== 'All') {
      topScorersSql += ` AND s.name = $2`;
    }
    topScorersSql += `
      GROUP BY p.id, p.name, p.jersey_number, t.name, t.code, t.color, t.logo_url
      ORDER BY total_points DESC
      LIMIT 10
    `;

    if (sport && sport !== 'All') {
      params.push(sport);
    }

    const [teamMetricsResult, blowoutResult, highestScoringResult, lowestScoringResult, topScorersResult] = await Promise.all([
      query(teamMetricsSql, params),
      query(blowoutSql, params),
      query(highestScoringSql, params),
      query(lowestScoringSql, params),
      query(topScorersSql, params)
    ]);

    res.json({
      teamMetrics: teamMetricsResult.rows,
      topScorers: topScorersResult.rows,
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
