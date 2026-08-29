import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/analytics
router.get('/', async (req, res) => {
  try {
    const { sport } = req.query;
    
    let scoringType = 'points';
    let targetSportId = null;
    if (sport && sport !== 'All') {
      const spRes = await query('SELECT id, scoring_type FROM sports WHERE name = $1 AND organization_id = $2', [sport, req.orgId]);
      if (spRes.rows.length > 0) {
        scoringType = spRes.rows[0].scoring_type;
        targetSportId = spRes.rows[0].id;
      }
    }

    let teamMetrics = [];
    let topScorers = [];
    let records = {
      biggestBlowout: null,
      highestScoring: null,
      lowestScoring: null
    };

    if (scoringType === 'placement') {
      // 1. Placement sport metrics
      const teamMetricsRes = await query(`
        SELECT 
          t.id, t.code, t.name, t.color, t.logo_url,
          COUNT(DISTINCT ae.id)::int as played,
          COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as won,
          0::int as drawn,
          COALESCE(SUM(CASE WHEN ar.placement > 1 THEN 1 ELSE 0 END), 0)::int as lost,
          COALESCE(SUM(ar.points), 0)::int as pf,
          0::int as pa,
          COALESCE(SUM(ar.points), 0)::int as point_diff
        FROM teams t
        LEFT JOIN athletics_results ar ON t.id = ar.team_id
        LEFT JOIN athletics_events ae ON ar.event_id = ae.id 
          AND ae.status = 'completed'
          AND ae.organization_id = $1
          AND ae.sport_id = $2
        WHERE t.organization_id = $1
        GROUP BY t.id, t.code, t.name, t.color, t.logo_url
        ORDER BY pf DESC, won DESC, t.code ASC
      `, [req.orgId, targetSportId]);
      teamMetrics = teamMetricsRes.rows;

      // No individual goals or records exist for placement events
      topScorers = [];
    } else {
      // Points-based or 'All'
      // 1. Query points-based metrics
      let teamMetricsSql = `
        SELECT 
          t.id, t.code, t.name, t.color, t.logo_url,
          COUNT(f.id)::int as played,
          SUM(CASE WHEN f.winner_id = t.id THEN 1 ELSE 0 END)::int as won,
          SUM(CASE WHEN f.status = 'draw' THEN 1 ELSE 0 END)::int as drawn,
          SUM(CASE WHEN (f.status = 'completed' AND f.winner_id != t.id) THEN 1 ELSE 0 END)::int as lost,
          COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END), 0)::int as pf,
          COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END), 0)::int as pa,
          COALESCE(SUM(CASE WHEN f.team_a_id = t.id THEN f.score_a ELSE f.score_b END) - SUM(CASE WHEN f.team_a_id = t.id THEN f.score_b ELSE f.score_a END), 0)::int as point_diff
        FROM teams t
      `;
      if (sport && sport !== 'All') {
        teamMetricsSql += `
          LEFT JOIN fixtures f ON (f.team_a_id = t.id OR f.team_b_id = t.id) 
            AND f.status IN ('completed', 'draw') 
            AND f.organization_id = $1
            AND f.sport_id = $2
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
      `;
      
      const metricsParams = sport && sport !== 'All' ? [req.orgId, targetSportId] : [req.orgId];
      const teamMetricsRes = await query(teamMetricsSql, metricsParams);
      teamMetrics = teamMetricsRes.rows;

      if (!sport || sport === 'All') {
        // Fetch placement-based sport stats to aggregate under 'All'
        const placementMetricsRes = await query(`
          SELECT 
            t.code,
            COUNT(DISTINCT ae.id)::int as played,
            COALESCE(SUM(CASE WHEN ar.placement = 1 THEN 1 ELSE 0 END), 0)::int as won,
            COALESCE(SUM(CASE WHEN ar.placement > 1 THEN 1 ELSE 0 END), 0)::int as lost,
            COALESCE(SUM(ar.points), 0)::int as pf
          FROM teams t
          LEFT JOIN athletics_results ar ON t.id = ar.team_id
          LEFT JOIN athletics_events ae ON ar.event_id = ae.id 
            AND ae.status = 'completed'
            AND ae.organization_id = $1
          WHERE t.organization_id = $1
          GROUP BY t.code
        `, [req.orgId]);

        const placementMap = {};
        placementMetricsRes.rows.forEach(r => {
          placementMap[r.code] = r;
        });

        // Merge points-based and placement-based stats
        teamMetrics = teamMetrics.map(t => {
          const pm = placementMap[t.code];
          if (pm) {
            const played = t.played + pm.played;
            const won = t.won + pm.won;
            const lost = t.lost + pm.lost;
            const pf = t.pf + pm.pf;
            const pa = t.pa;
            const point_diff = pf - pa;
            return {
              ...t,
              played,
              won,
              lost,
              pf,
              pa,
              point_diff
            };
          }
          return t;
        });
      }

      // Sort by wins and point diff
      teamMetrics.sort((a, b) => {
        if (b.won !== a.won) return b.won - a.won;
        return b.point_diff - a.point_diff;
      });

      // Query Records (Biggest Blowout, etc.)
      let recordsFilter = ` WHERE f.status IN ('completed', 'draw') AND f.organization_id = $1`;
      const recordsParams = [req.orgId];
      if (sport && sport !== 'All') {
        recordsFilter += ` AND f.sport_id = $2`;
        recordsParams.push(targetSportId);
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

      const [blowoutRes, highestRes, lowestRes] = await Promise.all([
        query(blowoutSql, recordsParams),
        query(highestScoringSql, recordsParams),
        query(lowestScoringSql, recordsParams)
      ]);

      records = {
        biggestBlowout: blowoutRes.rows[0] || null,
        highestScoring: highestRes.rows[0] || null,
        lowestScoring: lowestRes.rows[0] || null
      };

      // Query Top Scorers
      let topScorersSql = `
        SELECT p.id, p.name, p.jersey_number, t.name as team_name, t.code as team_code, t.color as team_color, t.logo_url as team_logo, SUM(ps.points_scored) as total_points
        FROM players p
        JOIN player_stats ps ON p.id = ps.player_id
        JOIN fixtures f ON ps.fixture_id = f.id
        JOIN sports s ON f.sport_id = s.id
        JOIN teams t ON p.team_id = t.id
        WHERE t.organization_id = $1
      `;
      const scorerParams = [req.orgId];
      if (sport && sport !== 'All') {
        topScorersSql += ` AND f.sport_id = $2`;
        scorerParams.push(targetSportId);
      }
      topScorersSql += `
        GROUP BY p.id, p.name, p.jersey_number, t.name, t.code, t.color, t.logo_url
        ORDER BY total_points DESC
        LIMIT 10
      `;

      const topScorersRes = await query(topScorersSql, scorerParams);
      topScorers = topScorersRes.rows;
    }

    res.json({
      teamMetrics,
      topScorers,
      records
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
